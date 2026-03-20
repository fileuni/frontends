import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { useToastStore } from '@/stores/toast';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Pagination } from '@/components/ui/Pagination.tsx';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  HardDrive, Play,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Users,
  Wrench,
} from 'lucide-react';
import { client, extractData, handleApiError } from '@/lib/api.ts';
import { AdminCard, AdminLoadingState, AdminPage, AdminPageHeader } from './admin-ui';

type AdminStorageStats = {
  total_users: number;
  total_used: number;
  total_quota: number;
};

type MaintenanceStatus = {
  locked_users: string[];
  is_global_maintenance: boolean;
};

type WalIssueStatusFilter = 'all' | 'failed' | 'recovering';

type WalIssueEntry = {
  id: number;
  user_id: string;
  operation_type: string;
  operation_data: string;
  status: string;
  failure_reason?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
};

type WalIssueListResponse = {
  items: WalIssueEntry[];
  total: number;
  page: number;
  page_size: number;
  status: string;
  user_id?: string | null;
};

type WalIssueActionResponse = {
  id: number;
  status: string;
  failure_reason?: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isAdminStorageStats = (value: unknown): value is AdminStorageStats => {
  if (!isRecord(value)) return false;
  return (
    typeof value.total_users === 'number' &&
    Number.isFinite(value.total_users) &&
    typeof value.total_used === 'number' &&
    Number.isFinite(value.total_used) &&
    typeof value.total_quota === 'number' &&
    Number.isFinite(value.total_quota)
  );
};

const isMaintenanceStatus = (value: unknown): value is MaintenanceStatus => {
  if (!isRecord(value)) return false;
  if (typeof value.is_global_maintenance !== 'boolean') return false;
  if (!Array.isArray(value.locked_users)) return false;
  return value.locked_users.every((u) => typeof u === 'string');
};

const isWalIssueEntry = (value: unknown): value is WalIssueEntry => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'number' &&
    typeof value.user_id === 'string' &&
    typeof value.operation_type === 'string' &&
    typeof value.operation_data === 'string' &&
    typeof value.status === 'string' &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string'
  );
};

const isWalIssueListResponse = (value: unknown): value is WalIssueListResponse => {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.items) || !value.items.every(isWalIssueEntry)) return false;
  return (
    typeof value.total === 'number' &&
    typeof value.page === 'number' &&
    typeof value.page_size === 'number' &&
    typeof value.status === 'string'
  );
};

const summarizeWalOperation = (raw: string) => {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.path === 'string') {
      return parsed.path;
    }
    if (typeof parsed.src === 'string' && typeof parsed.dst === 'string') {
      return `${parsed.src} -> ${parsed.dst}`;
    }
    if (typeof parsed.old_path === 'string' && typeof parsed.new_path === 'string') {
      return `${parsed.old_path} -> ${parsed.new_path}`;
    }
    if (typeof parsed.path === 'string' && typeof parsed.trash_path === 'string') {
      return `${parsed.path} -> ${parsed.trash_path}`;
    }
    if (typeof parsed.trash_path === 'string' && typeof parsed.original_path === 'string') {
      return `${parsed.trash_path} -> ${parsed.original_path}`;
    }
    return raw;
  } catch {
    return raw;
  }
};

const prettyOperationData = (raw: string) => {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
};

const truncateText = (value: string, max = 280) => {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
};

const formatTime = (value: string | null | undefined, fallback: string) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const normalizeWalStatus = (status: string): WalIssueStatusFilter | 'completed' => {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'failed') return 'failed';
  if (normalized === 'recovering') return 'recovering';
  if (normalized === 'completed') return 'completed';
  return 'all';
};

export const FileSystemAdmin = () => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState(true);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [stats, setStats] = useState<AdminStorageStats | null>(null);
  const [maintenanceStatus, setMaintenanceStatus] = useState<MaintenanceStatus | null>(null);
  const [lockedUsers, setLockedUsers] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncingUserIndex, setSyncingUserIndex] = useState(false);
  const [rebuildingUserIndex, setRebuildingUserIndex] = useState(false);
  const [userIdForIndexSync, setUserIdForIndexSync] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  const [walIssues, setWalIssues] = useState<WalIssueEntry[]>([]);
  const [walTotal, setWalTotal] = useState(0);
  const [walPage, setWalPage] = useState(1);
  const [walPageSize, setWalPageSize] = useState(10);
  const [walStatusFilter, setWalStatusFilter] = useState<WalIssueStatusFilter>('all');
  const [walUserFilterDraft, setWalUserFilterDraft] = useState('');
  const [walUserFilter, setWalUserFilter] = useState('');
  const [walActionId, setWalActionId] = useState<number | null>(null);

  const fetchOverview = async () => {
    const [statsRes, maintenanceRes] = await Promise.allSettled([
      extractData<unknown>(client.GET('/api/v1/file/admin/storage-stats')),
      extractData<unknown>(client.GET('/api/v1/file/admin/maintenance/status')),
    ]);

    if (statsRes.status === 'fulfilled' && isAdminStorageStats(statsRes.value)) {
      setStats(statsRes.value);
    } else {
      setStats(null);
    }

    if (
      maintenanceRes.status === 'fulfilled' &&
      isMaintenanceStatus(maintenanceRes.value)
    ) {
      setMaintenanceStatus(maintenanceRes.value);
      setLockedUsers(maintenanceRes.value.locked_users);
    } else {
      setMaintenanceStatus(null);
      setLockedUsers([]);
    }
  };

  const fetchWalIssues = async () => {
    setIssuesLoading(true);
    try {
      const data = await extractData<unknown>(
        client.GET('/api/v1/file/admin/file-manager/wal/issues', {
          params: {
            query: {
              page: walPage,
              page_size: walPageSize,
              status: walStatusFilter,
              user_id: walUserFilter || undefined,
            },
          },
        }),
      );
      if (isWalIssueListResponse(data)) {
        setWalIssues(data.items);
        setWalTotal(data.total);
      } else {
        setWalIssues([]);
        setWalTotal(0);
      }
    } catch (e) {
      setWalIssues([]);
      setWalTotal(0);
      addToast(handleApiError(e, t), 'error');
    } finally {
      setIssuesLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchOverview(), fetchWalIssues()]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    void fetchWalIssues();
  }, [walPage, walPageSize, walStatusFilter, walUserFilter]);

  const refreshAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchOverview(), fetchWalIssues()]);
    } finally {
      setLoading(false);
    }
  };

  const handleFullSync = async () => {
    setSyncing(true);
    try {
      const data = await extractData<{ task_id: string; total_users: number }>(
        client.POST('/api/v1/file/admin/full-index-sync'),
      );
      addToast(`${t('admin.fs.sync_success')} (task_id=${data.task_id})`, 'success');
    } catch (e) {
      addToast(handleApiError(e, t), 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncIndexForUser = async () => {
    const userId = userIdForIndexSync.trim();
    if (!userId) {
      addToast(t('admin.fs.user_id_required'), 'warning');
      return;
    }

    setSyncingUserIndex(true);
    try {
      const data = await extractData<{ task_id: string; user_id: string; path: string }>(
        client.POST(`/api/v1/file/admin/index-sync/${encodeURIComponent(userId)}`),
      );
      addToast(
        t('admin.fs.sync_user_success', { user_id: data.user_id, task_id: data.task_id }),
        'success',
      );
      setUserIdForIndexSync('');
    } catch (e) {
      addToast(handleApiError(e, t), 'error');
    } finally {
      setSyncingUserIndex(false);
    }
  };

  const handleRebuildIndexForUser = async () => {
    const userId = userIdForIndexSync.trim();
    if (!userId) {
      addToast(t('admin.fs.user_id_required'), 'warning');
      return;
    }
    if (!window.confirm(t('admin.fs.rebuild_user_confirm', { user_id: userId }))) return;

    setRebuildingUserIndex(true);
    try {
      const data = await extractData<{
        task_id: string;
        user_id: string;
        path: string;
        max_directories: number | null;
      }>(
        client.POST(`/api/v1/file/admin/index-rebuild/${encodeURIComponent(userId)}`, {
          body: {
            path: '/',
            max_directories: 200000,
          },
        }),
      );
      addToast(
        t('admin.fs.rebuild_user_success', { user_id: data.user_id, task_id: data.task_id }),
        'success',
      );
      setUserIdForIndexSync('');
    } catch (e) {
      addToast(handleApiError(e, t), 'error');
    } finally {
      setRebuildingUserIndex(false);
    }
  };

  const handleGlobalUnlock = async () => {
    if (!window.confirm(t('admin.fs.unlock_confirm'))) return;
    setUnlocking(true);
    try {
      await extractData(client.POST('/api/v1/file/admin/file-manager/wal/terminate'));
      addToast(t('admin.fs.unlock_success'), 'success');
      await refreshAll();
    } catch (e) {
      addToast(handleApiError(e, t), 'error');
    } finally {
      setUnlocking(false);
    }
  };

  const handleWalSearch = () => {
    setWalPage(1);
    setWalUserFilter(walUserFilterDraft.trim());
  };

  const handleWalReset = () => {
    setWalStatusFilter('all');
    setWalUserFilterDraft('');
    setWalUserFilter('');
    setWalPage(1);
    setWalPageSize(10);
  };

  const handleReplayWalIssue = async (issue: WalIssueEntry) => {
    if (!window.confirm(t('admin.fs.wal_replay_confirm', { id: issue.id }))) return;
    setWalActionId(issue.id);
    try {
      await extractData<WalIssueActionResponse>(
        client.POST(`/api/v1/file/admin/file-manager/wal/${issue.id}/replay`),
      );
      addToast(t('admin.fs.wal_replay_success', { id: issue.id }), 'success');
      await Promise.all([fetchOverview(), fetchWalIssues()]);
    } catch (e) {
      addToast(handleApiError(e, t), 'error');
    } finally {
      setWalActionId(null);
    }
  };

  const handleMarkWalHandled = async (issue: WalIssueEntry) => {
    const note = window.prompt(
      t('admin.fs.wal_mark_handled_prompt'),
      issue.failure_reason ?? '',
    );
    if (note === null) return;
    setWalActionId(issue.id);
    try {
      await extractData<WalIssueActionResponse>(
        client.POST(`/api/v1/file/admin/file-manager/wal/${issue.id}/mark-handled`, {
          body: {
            note: note.trim() || undefined,
          },
        }),
      );
      addToast(t('admin.fs.wal_mark_handled_success', { id: issue.id }), 'success');
      await Promise.all([fetchOverview(), fetchWalIssues()]);
    } catch (e) {
      addToast(handleApiError(e, t), 'error');
    } finally {
      setWalActionId(null);
    }
  };

  const formatSize = (bytes: number | null | undefined) => {
    if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) {
      return t('common.na');
    }
    if (bytes <= 0) return '0 B';
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${['B', 'KB', 'MB', 'GB', 'TB'][i]}`;
  };

  const walStatusButtons = useMemo(
    () => [
      { value: 'all' as const, label: t('admin.fs.wal_status_all') },
      { value: 'failed' as const, label: t('admin.fs.wal_status_failed') },
      { value: 'recovering' as const, label: t('admin.fs.wal_status_recovering') },
    ],
    [t],
  );

  if (loading) {
    return (
      <AdminPage>
        <AdminPageHeader
          icon={<HardDrive size={24} />}
          title={t('admin.fs.title') || 'File System'}
          subtitle={t('admin.fs.subtitle') || 'Storage stats and maintenance'}
          actions={
            <Button variant="outline" className="rounded-xl" onClick={refreshAll}>
              <RefreshCw size={16} className="mr-2" />
              {t('common.refresh')}
            </Button>
          }
        />
        <AdminLoadingState label={t('admin.loading')} />
      </AdminPage>
    );
  }

  const hasStats = stats !== null;
  const hasMaintenance = maintenanceStatus !== null;
  const totalUsed = hasStats ? stats.total_used : null;
  const totalQuota = hasStats ? stats.total_quota : null;
  const totalUsers = hasStats ? stats.total_users : null;
  const quotaPct =
    typeof totalUsed === 'number' && typeof totalQuota === 'number' && totalQuota > 0
      ? Math.min(100, (totalUsed / totalQuota) * 100)
      : null;
  const isGlobalMaintenance = hasMaintenance ? maintenanceStatus.is_global_maintenance : null;

  return (
    <AdminPage>
      <AdminPageHeader
        icon={<HardDrive size={24} />}
        title={t('admin.fs.title') || 'File System'}
        subtitle={t('admin.fs.subtitle') || 'Storage stats and maintenance'}
        actions={
          <Button variant="outline" className="rounded-xl" onClick={refreshAll}>
            <RefreshCw size={16} className="mr-2" />
            {t('common.refresh')}
          </Button>
        }
      />

      <div className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AdminCard variant="glass" className="rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group">
            <Database className="absolute -right-4 -bottom-4 w-32 h-32 opacity-5 -rotate-12 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-black uppercase tracking-widest opacity-40 mb-1">{t('admin.fs.cluster_storage')}</p>
            <h3 className="text-3xl font-black">{formatSize(totalUsed)}</h3>
            <p className="text-sm font-bold mt-4 text-primary uppercase tracking-widest">
              {t('admin.fs.system_status')}: {isGlobalMaintenance === null ? t('common.na') : isGlobalMaintenance ? t('common.on') : t('common.off')}
            </p>
          </AdminCard>

          <AdminCard variant="glass" className="rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group">
            <Activity className="absolute -right-4 -bottom-4 w-32 h-32 opacity-5 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-black uppercase tracking-widest opacity-40 mb-1">{t('admin.fs.usage_efficiency')}</p>
            <h3 className="text-3xl font-black">{quotaPct === null ? t('common.na') : `${quotaPct.toFixed(1)}%`}</h3>
            <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: `${quotaPct ?? 0}%` }} />
            </div>
            <p className="text-sm font-bold mt-4 opacity-40 uppercase tracking-widest">
              {formatSize(totalUsed)} / {formatSize(totalQuota)}
            </p>
          </AdminCard>

          <AdminCard variant="glass" className="rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group">
            <Cpu className="absolute -right-4 -bottom-4 w-32 h-32 opacity-5 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-black uppercase tracking-widest opacity-40 mb-1">{t('admin.fs.total_users')}</p>
            <h3 className="text-3xl font-black tabular-nums">{typeof totalUsers === 'number' ? totalUsers : t('common.na')}</h3>
            <p className="text-sm font-bold mt-4 opacity-40 uppercase tracking-widest">
              {t('admin.fs.locked_users')}: {hasMaintenance ? lockedUsers.length : t('common.na')}
            </p>
          </AdminCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <HardDrive size={18} className="text-primary" />
                <h2 className="text-sm font-black uppercase tracking-widest">{t('admin.fs.global_ops')}</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={refreshAll} className="opacity-50 hover:opacity-100">
                <RefreshCw size={18} className="mr-2" /> {t('common.refresh')}
              </Button>
            </div>

            <AdminCard variant="glass" className="rounded-[2.5rem] p-8 shadow-xl space-y-6">
              <p className="text-sm font-bold opacity-50 italic">{t('admin.fs.global_ops_desc')}</p>
              <div className="grid grid-cols-1 gap-4">
                <Button variant="outline" className="h-16 justify-between group" onClick={handleFullSync} disabled={syncing}>
                  <span className="flex items-center gap-3">
                    <RefreshCw size={20} className={syncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
                    <span className="font-black uppercase tracking-widest text-sm">{t('admin.fs.sync_index')}</span>
                  </span>
                  <span className="text-sm opacity-30 font-bold">RE-INDEX CLUSTER</span>
                </Button>
              </div>

              <div className="pt-5 border-t border-white/5 space-y-3">
                <p className="text-sm font-bold opacity-50 italic">{t('admin.fs.sync_user_index_desc')}</p>
                <div className="flex flex-col gap-3">
                  <Input
                    value={userIdForIndexSync}
                    onChange={(e) => setUserIdForIndexSync(e.target.value)}
                    placeholder={t('admin.fs.user_id_placeholder')}
                    className="h-12 font-mono"
                    disabled={syncingUserIndex || rebuildingUserIndex}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-12 px-5 justify-center"
                      onClick={handleSyncIndexForUser}
                      disabled={syncingUserIndex || rebuildingUserIndex}
                    >
                      <RefreshCw size={18} className={syncingUserIndex ? 'animate-spin mr-2' : 'mr-2'} />
                      <span className="font-black uppercase tracking-widest text-sm">{t('admin.fs.sync_user_index')}</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-12 px-5 justify-center"
                      onClick={handleRebuildIndexForUser}
                      disabled={rebuildingUserIndex || syncingUserIndex}
                    >
                      <RefreshCw size={18} className={rebuildingUserIndex ? 'animate-spin mr-2' : 'mr-2'} />
                      <span className="font-black uppercase tracking-widest text-sm">{t('admin.fs.rebuild_user_index')}</span>
                    </Button>
                  </div>

                  <p className="text-xs font-bold opacity-40 italic">{t('admin.fs.rebuild_user_index_desc')}</p>
                </div>
              </div>
            </AdminCard>

            <div className="flex items-center gap-3 px-4 pt-4">
              <ShieldAlert size={18} className="text-red-500" />
              <h2 className="text-sm font-black uppercase tracking-widest text-red-500">{t('admin.fs.emergency_control')}</h2>
            </div>
            <AdminCard className="bg-red-500/5 border border-red-500/10 rounded-[2.5rem] p-8 shadow-xl space-y-6">
              <p className="text-sm font-bold text-red-400/60 italic">{t('admin.fs.emergency_desc')}</p>
              <Button variant="outline" className="w-full h-16 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white group" onClick={handleGlobalUnlock} disabled={unlocking}>
                <RotateCcw size={20} className="mr-3 group-hover:scale-110 transition-transform" />
                <span className="font-black uppercase tracking-widest text-sm">{t('admin.fs.force_unlock')}</span>
              </Button>
            </AdminCard>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <Users size={18} className="text-orange-500" />
                <h2 className="text-sm font-black uppercase tracking-widest">{t('admin.fs.locked_users')}</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={refreshAll} className="opacity-50 hover:opacity-100">
                <RefreshCw size={18} className="mr-2" /> {t('common.refresh')}
              </Button>
            </div>
            <AdminCard variant="glass" className="rounded-[2.5rem] p-8 shadow-xl min-h-[400px]">
              {!hasMaintenance ? (
                <div className="h-full flex flex-col items-center justify-center py-20 opacity-30 italic text-center">
                  <AlertTriangle size={48} className="mb-4" />
                  <p className="font-black uppercase tracking-widest text-sm">{t('admin.fs.maintenance_status_unavailable')}</p>
                </div>
              ) : lockedUsers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 italic">
                  <CheckCircle2 size={48} className="mb-4" />
                  <p className="font-black uppercase tracking-widest text-sm">{t('admin.fs.no_locked_users')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lockedUsers.map((user) => (
                    <div key={user} className="flex items-center justify-between p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        <span className="font-mono text-sm font-black">{user}</span>
                      </div>
                      <Badge variant="warning">{t('admin.fs.statusRecovering')}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </AdminCard>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between px-4 gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Wrench size={18} className="text-amber-400" />
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest">{t('admin.fs.wal_title')}</h2>
                <p className="text-sm opacity-50 mt-1">{t('admin.fs.wal_desc')}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchWalIssues} className="opacity-50 hover:opacity-100">
              <RefreshCw size={18} className={`mr-2 ${issuesLoading ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
          </div>

          <AdminCard variant="glass" className="rounded-[2.5rem] shadow-xl overflow-hidden">
            <div className="p-6 md:p-8 border-b border-white/5 space-y-5">
              <div className="flex flex-col xl:flex-row gap-4 xl:items-end xl:justify-between">
                <div className="space-y-3 flex-1">
                  <p className="text-sm font-bold opacity-50 italic">{t('admin.fs.wal_scope_hint')}</p>
                  <div className="flex flex-wrap gap-2">
                    {walStatusButtons.map((item) => (
                      <button
                        key={item.value}
                        onClick={() => {
                          setWalStatusFilter(item.value);
                          setWalPage(1);
                        }}
                        className={[
                          'px-4 h-10 rounded-2xl border text-sm font-black uppercase tracking-widest transition-all',
                          walStatusFilter === item.value
                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                            : 'bg-white/5 border-white/10 opacity-60 hover:opacity-100',
                        ].join(' ')}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <form
                  className="flex flex-col sm:flex-row gap-3 xl:w-[32rem]"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleWalSearch();
                  }}
                >
                  <Input
                    value={walUserFilterDraft}
                    onChange={(e) => setWalUserFilterDraft(e.target.value)}
                    placeholder={t('admin.fs.wal_user_filter_placeholder')}
                    className="h-11 font-mono"
                  />
                  <div className="flex gap-3">
                    <Button type="submit" variant="outline" className="h-11 px-4">
                      <Search size={16} className="mr-2" />
                      {t('admin.fs.wal_filter_apply')}
                    </Button>
                    <Button type="button" variant="ghost" className="h-11 px-4" onClick={handleWalReset}>
                      <RotateCcw size={16} className="mr-2" />
                      {t('admin.fs.wal_filter_reset')}
                    </Button>
                  </div>
                </form>
              </div>

              <div className="flex flex-wrap gap-3 text-xs font-bold uppercase tracking-widest opacity-40">
                <span>{t('admin.fs.wal_total', { total: walTotal })}</span>
                <span>{t('admin.fs.wal_filter_status')}: {t(`admin.fs.wal_status_${walStatusFilter}`)}</span>
                <span>
                  {t('admin.fs.wal_filter_user')}: {walUserFilter || t('common.na')}
                </span>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-4 min-h-[22rem]">
              {issuesLoading ? (
                <div className="h-full flex flex-col items-center justify-center py-20 opacity-40 italic text-center">
                  <RefreshCw size={40} className="mb-4 animate-spin" />
                  <p className="font-black uppercase tracking-widest text-sm">{t('admin.fs.wal_loading')}</p>
                </div>
              ) : walIssues.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 italic text-center">
                  <CheckCircle2 size={48} className="mb-4" />
                  <p className="font-black uppercase tracking-widest text-sm">{t('admin.fs.wal_empty')}</p>
                </div>
              ) : (
                walIssues.map((issue) => {
                  const normalizedStatus = normalizeWalStatus(issue.status);
                  const busy = walActionId === issue.id;
                  return (
                    <div key={issue.id} className="rounded-[2rem] border border-white/8 bg-black/20 p-5 md:p-6 space-y-4">
                      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                        <div className="space-y-2 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={normalizedStatus === 'failed' ? 'danger' : 'warning'}>
                              {issue.status.toUpperCase()}
                            </Badge>
                            <Badge variant="ghost">#{issue.id}</Badge>
                            <Badge variant="ghost">{issue.operation_type}</Badge>
                          </div>
                          <div className="text-sm font-black uppercase tracking-widest opacity-60">
                            {t('admin.fs.wal_filter_user')}: <span className="font-mono normal-case tracking-normal opacity-100">{issue.user_id}</span>
                          </div>
                          <div className="text-base font-bold break-all">{summarizeWalOperation(issue.operation_data)}</div>
                        </div>

                        <div className="flex flex-wrap gap-3 xl:justify-end">
                          <Button
                            variant="outline"
                            className="h-11 px-4"
                            onClick={() => handleReplayWalIssue(issue)}
                            disabled={busy}
                          >
                            <Play size={16} className={`mr-2 ${busy ? 'animate-pulse' : ''}`} />
                            {t('admin.fs.wal_replay')}
                          </Button>
                          <Button
                            variant="ghost"
                            className="h-11 px-4 border border-white/10"
                            onClick={() => handleMarkWalHandled(issue)}
                            disabled={busy}
                          >
                            <CheckCircle2 size={16} className="mr-2" />
                            {t('admin.fs.wal_mark_handled')}
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 text-sm">
                        <div className="rounded-2xl bg-white/[0.03] border border-white/6 p-4 space-y-2">
                          <p className="font-black uppercase tracking-widest opacity-40">{t('admin.fs.wal_summary')}</p>
                          <p className="font-bold break-all">{summarizeWalOperation(issue.operation_data)}</p>
                          <p className="text-xs opacity-50">{t('admin.fs.wal_created_at')}: {formatTime(issue.created_at, t('common.na'))}</p>
                          <p className="text-xs opacity-50">{t('admin.fs.wal_updated_at')}: {formatTime(issue.updated_at, t('common.na'))}</p>
                        </div>

                        <div className="rounded-2xl bg-white/[0.03] border border-white/6 p-4 space-y-2 xl:col-span-2">
                          <p className="font-black uppercase tracking-widest opacity-40">{t('admin.fs.wal_failure_reason')}</p>
                          <p className="text-sm leading-6 whitespace-pre-wrap break-words min-h-[3rem]">
                            {issue.failure_reason?.trim() || t('admin.fs.wal_no_failure_reason')}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-zinc-950/60 border border-white/6 p-4">
                        <p className="font-black uppercase tracking-widest opacity-40 text-xs mb-3">{t('admin.fs.wal_operation')}</p>
                        <pre className="text-xs leading-6 whitespace-pre-wrap break-all opacity-80 overflow-x-auto">{truncateText(prettyOperationData(issue.operation_data), 1000)}</pre>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {walTotal > 0 ? (
              <Pagination
                current={walPage}
                total={walTotal}
                pageSize={walPageSize}
                pageSizeOptions={[10, 20, 50, 100]}
                onPageChange={setWalPage}
                onPageSizeChange={(size) => {
                  setWalPageSize(size);
                  setWalPage(1);
                }}
              />
            ) : null}
          </AdminCard>
        </div>
      </div>
    </AdminPage>
  );
};

const Badge = ({
  children,
  variant = 'ghost',
}: {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'ghost';
}) => {
  const styles = {
    success: 'bg-green-500/10 text-green-500 border-green-500/20',
    warning: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    danger: 'bg-red-500/10 text-red-500 border-red-500/20',
    ghost: 'bg-white/5 text-white/40 border-white/10',
  };

  return (
    <span className={`px-2 py-1 rounded-md text-sm font-black border uppercase tracking-tighter ${styles[variant]}`}>
      {children}
    </span>
  );
};
