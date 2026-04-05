import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Download,
  HardDrive,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Stethoscope,
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

type WalScope = 'issues' | 'history';
type WalStatusFilter = 'all' | 'failed' | 'recovering';

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
  scope: string;
  status: string;
  user_id?: string | null;
  operation_type?: string | null;
  updated_from?: string | null;
  updated_to?: string | null;
};

type WalIssueActionResponse = {
  id: number;
  status: string;
  failure_reason?: string | null;
};

type WalIssueBatchActionItemResponse = {
  id: number;
  success: boolean;
  status?: string | null;
  failure_reason?: string | null;
  error?: string | null;
};

type WalIssueBatchActionResponse = {
  total: number;
  succeeded: number;
  failed: number;
  items: WalIssueBatchActionItemResponse[];
};

type WalPathPhysicalState = {
  exists: boolean;
  path: string;
  is_dir?: boolean | null;
  size?: number | null;
  modified_at?: string | null;
  error?: string | null;
};

type WalPathIndexState = {
  exists: boolean;
  path: string;
  is_dir?: boolean | null;
  size?: number | null;
  storage_id?: string | null;
  backend_type?: string | null;
  backend_key?: string | null;
  trashed_at?: string | null;
  original_path?: string | null;
};

type WalPathDiagnostic = {
  role: string;
  logical_path: string;
  physical_path: string;
  physical: WalPathPhysicalState;
  index: WalPathIndexState;
  mismatch_flags: string[];
};

type WalIssueDiagnosticsResponse = {
  issue: WalIssueEntry;
  diagnostics: WalPathDiagnostic[];
  recommended_actions: WalRecommendedAction[];
};

type WalRecommendedAction = {
  action: string;
  reason_code: string;
  signals: string[];
};

const WAL_OPERATION_OPTIONS = [
  'all',
  'WRITE',
  'DELETE',
  'MOVE',
  'RENAME',
  'MOVE_TO_TRASH',
  'CREATE_DIR',
  'RESTORE_TRASH',
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isAdminStorageStats = (value: unknown): value is AdminStorageStats => {
  if (!isRecord(value)) return false;
  return (
    typeof value['total_users'] === 'number' &&
    typeof value['total_used'] === 'number' &&
    typeof value['total_quota'] === 'number'
  );
};

const isMaintenanceStatus = (value: unknown): value is MaintenanceStatus => {
  if (!isRecord(value)) return false;
  return (
    typeof value['is_global_maintenance'] === 'boolean' &&
    Array.isArray(value['locked_users']) &&
    value['locked_users'].every((item) => typeof item === 'string')
  );
};

const isWalIssueEntry = (value: unknown): value is WalIssueEntry => {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'number' &&
    typeof value['user_id'] === 'string' &&
    typeof value['operation_type'] === 'string' &&
    typeof value['operation_data'] === 'string' &&
    typeof value['status'] === 'string' &&
    typeof value['created_at'] === 'string' &&
    typeof value['updated_at'] === 'string'
  );
};

const isWalIssueListResponse = (value: unknown): value is WalIssueListResponse => {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value['items']) &&
    value['items'].every(isWalIssueEntry) &&
    typeof value['total'] === 'number' &&
    typeof value['page'] === 'number' &&
    typeof value['page_size'] === 'number' &&
    typeof value['scope'] === 'string' &&
    typeof value['status'] === 'string'
  );
};

const isWalIssueBatchActionResponse = (value: unknown): value is WalIssueBatchActionResponse => {
  if (!isRecord(value)) return false;
  return (
    typeof value['total'] === 'number' &&
    typeof value['succeeded'] === 'number' &&
    typeof value['failed'] === 'number' &&
    Array.isArray(value['items'])
  );
};

const isWalPathDiagnostic = (value: unknown): value is WalPathDiagnostic => {
  if (!isRecord(value)) return false;
  return (
    typeof value['role'] === 'string' &&
    typeof value['logical_path'] === 'string' &&
    typeof value['physical_path'] === 'string' &&
    isRecord(value['physical']) &&
    isRecord(value['index']) &&
    Array.isArray(value['mismatch_flags'])
  );
};

const isWalIssueDiagnosticsResponse = (value: unknown): value is WalIssueDiagnosticsResponse => {
  if (!isRecord(value)) return false;
  return (
    isWalIssueEntry(value['issue']) &&
    Array.isArray(value['diagnostics']) &&
    value['diagnostics'].every(isWalPathDiagnostic) &&
    Array.isArray(value['recommended_actions'])
  );
};

const summarizeWalOperation = (raw: string) => {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed['path'] === 'string' && typeof parsed['trash_path'] === 'string') return `${parsed['path']} -> ${parsed['trash_path']}`;
    if (typeof parsed['trash_path'] === 'string' && typeof parsed['original_path'] === 'string') return `${parsed['trash_path']} -> ${parsed['original_path']}`;
    if (typeof parsed['src'] === 'string' && typeof parsed['dst'] === 'string') return `${parsed['src']} -> ${parsed['dst']}`;
    if (typeof parsed['old_path'] === 'string' && typeof parsed['new_path'] === 'string') return `${parsed['old_path']} -> ${parsed['new_path']}`;
    if (typeof parsed['path'] === 'string') return parsed['path'];
    return raw;
  } catch {
    return raw;
  }
};

const prettyWalOperation = (raw: string) => {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
};

const truncateText = (value: string, max = 1200) => (value.length <= max ? value : `${value.slice(0, max)}...`);

const formatTime = (value: string | null | undefined, fallback: string) => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const toIsoString = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const saveBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(anchor);
};

const translateWalAction = (t: (key: string) => string, action: string) => {
  switch (action) {
    case 'replay':
      return t('admin.fs.wal_action_replay');
    case 'mark_handled':
      return t('admin.fs.wal_action_mark_handled');
    case 'manual_repair_then_replay':
      return t('admin.fs.wal_action_manual_repair_then_replay');
    case 'inspect_backend':
      return t('admin.fs.wal_action_inspect_backend');
    case 'manual_review_required':
      return t('admin.fs.wal_action_manual_review_required');
    case 'no_action_required':
      return t('admin.fs.wal_action_no_action_required');
    default:
      return action;
  }
};

const translateWalReason = (t: (key: string) => string, reason: string) => {
  switch (reason) {
    case 'metadata_only_mismatch':
      return t('admin.fs.wal_reason_metadata_only_mismatch');
    case 'state_already_converged':
      return t('admin.fs.wal_reason_state_already_converged');
    case 'physical_state_conflict':
      return t('admin.fs.wal_reason_physical_state_conflict');
    case 'physical_error_detected':
      return t('admin.fs.wal_reason_physical_error_detected');
    case 'mixed_state_requires_review':
      return t('admin.fs.wal_reason_mixed_state_requires_review');
    case 'already_consistent':
      return t('admin.fs.wal_reason_already_consistent');
    default:
      return reason;
  }
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

  const [walScope, setWalScope] = useState<WalScope>('issues');
  const [walStatusFilter, setWalStatusFilter] = useState<WalStatusFilter>('all');
  const [walOperationFilter, setWalOperationFilter] = useState<string>('all');
  const [walPage, setWalPage] = useState(1);
  const [walPageSize, setWalPageSize] = useState(10);
  const [walUserFilterDraft, setWalUserFilterDraft] = useState('');
  const [walUserFilter, setWalUserFilter] = useState('');
  const [walUpdatedFromDraft, setWalUpdatedFromDraft] = useState('');
  const [walUpdatedToDraft, setWalUpdatedToDraft] = useState('');
  const [walUpdatedFrom, setWalUpdatedFrom] = useState<string | undefined>();
  const [walUpdatedTo, setWalUpdatedTo] = useState<string | undefined>();
  const [walEntries, setWalEntries] = useState<WalIssueEntry[]>([]);
  const [walTotal, setWalTotal] = useState(0);
  const [walActionId, setWalActionId] = useState<number | null>(null);
  const [selectedWalIds, setSelectedWalIds] = useState<number[]>([]);
  const [diagnosticsLoadingId, setDiagnosticsLoadingId] = useState<number | null>(null);
  const [walDiagnostics, setWalDiagnostics] = useState<WalIssueDiagnosticsResponse | null>(null);

  const fetchOverview = useCallback(async () => {
    const [statsRes, maintenanceRes] = await Promise.allSettled([
      extractData<unknown>(client.GET('/api/v1/file/admin/storage-stats')),
      extractData<unknown>(client.GET('/api/v1/file/admin/maintenance/status')),
    ]);
    setStats(statsRes.status === 'fulfilled' && isAdminStorageStats(statsRes.value) ? statsRes.value : null);
    if (maintenanceRes.status === 'fulfilled' && isMaintenanceStatus(maintenanceRes.value)) {
      setMaintenanceStatus(maintenanceRes.value);
      setLockedUsers(maintenanceRes.value.locked_users);
    } else {
      setMaintenanceStatus(null);
      setLockedUsers([]);
    }
  }, []);

  const fetchWalEntries = useCallback(async () => {
    setIssuesLoading(true);
    try {
      const data = await extractData<unknown>(
        client.GET('/api/v1/file/admin/file-manager/wal/issues', {
          params: {
            query: {
              page: walPage,
              page_size: walPageSize,
              scope: walScope,
              status: walStatusFilter,
              user_id: walUserFilter || undefined,
              operation_type: walOperationFilter === 'all' ? undefined : walOperationFilter,
              updated_from: walUpdatedFrom,
              updated_to: walUpdatedTo,
            },
          },
        }),
      );
      if (isWalIssueListResponse(data)) {
        setSelectedWalIds([]);
        setWalEntries(data.items);
        setWalTotal(data.total);
      } else {
        setSelectedWalIds([]);
        setWalEntries([]);
        setWalTotal(0);
      }
    } catch (e) {
      setSelectedWalIds([]);
      setWalEntries([]);
      setWalTotal(0);
      addToast(handleApiError(e, t), 'error');
    } finally {
      setIssuesLoading(false);
    }
  }, [walPage, walPageSize, walScope, walStatusFilter, walUserFilter, walOperationFilter, walUpdatedFrom, walUpdatedTo, addToast, t]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchOverview(), fetchWalEntries()]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [fetchOverview, fetchWalEntries]);

  useEffect(() => {
    if (loading) return;
    void fetchWalEntries();
  }, [loading, fetchWalEntries]);

  const refreshAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchOverview(), fetchWalEntries()]);
    } finally {
      setLoading(false);
    }
  };

  const handleFullSync = async () => {
    setSyncing(true);
    try {
      const data = await extractData<{ task_id: string }>(client.POST('/api/v1/file/admin/full-index-sync'));
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
      const data = await extractData<{ task_id: string; user_id: string }>(
        client.POST(`/api/v1/file/admin/index-sync/${encodeURIComponent(userId)}`),
      );
      addToast(t('admin.fs.sync_user_success', { user_id: data.user_id, task_id: data.task_id }), 'success');
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
      const data = await extractData<{ task_id: string; user_id: string }>(
        client.POST(`/api/v1/file/admin/index-rebuild/${encodeURIComponent(userId)}`, {
          body: { path: '/', max_directories: 200000 },
        }),
      );
      addToast(t('admin.fs.rebuild_user_success', { user_id: data.user_id, task_id: data.task_id }), 'success');
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

  const applyWalFilters = () => {
    setWalPage(1);
    setWalUserFilter(walUserFilterDraft.trim());
    setWalUpdatedFrom(toIsoString(walUpdatedFromDraft));
    setWalUpdatedTo(toIsoString(walUpdatedToDraft));
  };

  const resetWalFilters = () => {
    setWalPage(1);
    setWalPageSize(10);
    setWalStatusFilter('all');
    setWalOperationFilter('all');
    setWalUserFilterDraft('');
    setWalUserFilter('');
    setWalUpdatedFromDraft('');
    setWalUpdatedToDraft('');
    setWalUpdatedFrom(undefined);
    setWalUpdatedTo(undefined);
  };

  const handleReplayWalIssue = async (issue: WalIssueEntry) => {
    if (!window.confirm(t('admin.fs.wal_replay_confirm', { id: issue.id }))) return;
    setWalActionId(issue.id);
    try {
      await extractData<WalIssueActionResponse>(client.POST(`/api/v1/file/admin/file-manager/wal/${issue.id}/replay`));
      addToast(t('admin.fs.wal_replay_success', { id: issue.id }), 'success');
      await Promise.all([fetchOverview(), fetchWalEntries()]);
    } catch (e) {
      addToast(handleApiError(e, t), 'error');
    } finally {
      setWalActionId(null);
    }
  };

  const handleMarkWalHandled = async (issue: WalIssueEntry) => {
    const note = window.prompt(t('admin.fs.wal_mark_handled_prompt'), issue.failure_reason ?? '');
    if (note === null) return;
    setWalActionId(issue.id);
    try {
      await extractData<WalIssueActionResponse>(
        client.POST(`/api/v1/file/admin/file-manager/wal/${issue.id}/mark-handled`, {
          body: { note: note.trim() || undefined },
        }),
      );
      addToast(t('admin.fs.wal_mark_handled_success', { id: issue.id }), 'success');
      await Promise.all([fetchOverview(), fetchWalEntries()]);
    } catch (e) {
      addToast(handleApiError(e, t), 'error');
    } finally {
      setWalActionId(null);
    }
  };

  const handleReplayWalBatch = async () => {
    if (selectedWalIds.length === 0) {
      addToast(t('admin.fs.wal_batch_empty'), 'warning');
      return;
    }
    if (!window.confirm(t('admin.fs.wal_replay_batch_confirm', { count: selectedWalIds.length }))) return;
    setWalActionId(-1);
    try {
      const data = await extractData<unknown>(
        client.POST('/api/v1/file/admin/file-manager/wal/replay-batch', { body: { ids: selectedWalIds } }),
      );
      if (isWalIssueBatchActionResponse(data)) {
        addToast(
          t('admin.fs.wal_replay_batch_success', { succeeded: data.succeeded, total: data.total }),
          data.failed > 0 ? 'warning' : 'success',
        );
      }
      await Promise.all([fetchOverview(), fetchWalEntries()]);
    } catch (e) {
      addToast(handleApiError(e, t), 'error');
    } finally {
      setWalActionId(null);
    }
  };

  const handleMarkWalBatchHandled = async () => {
    if (selectedWalIds.length === 0) {
      addToast(t('admin.fs.wal_batch_empty'), 'warning');
      return;
    }
    const note = window.prompt(t('admin.fs.wal_mark_handled_batch_prompt'));
    if (note === null) return;
    setWalActionId(-1);
    try {
      const data = await extractData<unknown>(
        client.POST('/api/v1/file/admin/file-manager/wal/mark-handled-batch', {
          body: { ids: selectedWalIds, note: note.trim() || undefined },
        }),
      );
      if (isWalIssueBatchActionResponse(data)) {
        addToast(
          t('admin.fs.wal_mark_handled_batch_success', { succeeded: data.succeeded, total: data.total }),
          data.failed > 0 ? 'warning' : 'success',
        );
      }
      await Promise.all([fetchOverview(), fetchWalEntries()]);
    } catch (e) {
      addToast(handleApiError(e, t), 'error');
    } finally {
      setWalActionId(null);
    }
  };

  const handleExportWalJson = async () => {
    try {
      const response = await client.GET('/api/v1/file/admin/file-manager/wal/export', {
        params: {
          query: {
            scope: walScope,
            status: walStatusFilter,
            user_id: walUserFilter || undefined,
            operation_type: walOperationFilter === 'all' ? undefined : walOperationFilter,
            updated_from: walUpdatedFrom,
            updated_to: walUpdatedTo,
          },
        },
        parseAs: 'blob',
      });
      if (!(response.data instanceof Blob)) {
        throw new Error(t('admin.fs.wal_export_failed'));
      }
      saveBlob(
        response.data,
        `fileuni-wal-${walScope}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`,
      );
      addToast(t('admin.fs.wal_export_success'), 'success');
    } catch (e) {
      addToast(handleApiError(e, t), 'error');
    }
  };

  const handleDiagnoseWalIssue = async (issue: WalIssueEntry) => {
    setDiagnosticsLoadingId(issue.id);
    try {
      const data = await extractData<unknown>(
        client.GET(`/api/v1/file/admin/file-manager/wal/${issue.id}/diagnostics`),
      );
      if (isWalIssueDiagnosticsResponse(data)) {
        setWalDiagnostics(data);
      } else {
        throw new Error(t('admin.fs.wal_diagnostics_failed'));
      }
    } catch (e) {
      addToast(handleApiError(e, t), 'error');
    } finally {
      setDiagnosticsLoadingId(null);
    }
  };

  const toggleWalSelection = (id: number) => {
    setSelectedWalIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const allVisibleSelected = walEntries.length > 0 && walEntries.every((entry) => selectedWalIds.includes(entry.id));

  const toggleSelectAllVisible = () => {
    setSelectedWalIds(allVisibleSelected ? [] : walEntries.map((entry) => entry.id));
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

  const quotaPct =
    typeof stats?.total_used === 'number' && typeof stats?.total_quota === 'number' && stats.total_quota > 0
      ? Math.min(100, (stats.total_used / stats.total_quota) * 100)
      : null;

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
            <p className="text-sm font-black tracking-widest opacity-40 mb-1">{t('admin.fs.cluster_storage')}</p>
            <h3 className="text-3xl font-black">{formatSize(stats?.total_used ?? null, t)}</h3>
            <p className="text-sm font-bold mt-4 text-primary tracking-widest">
              {t('admin.fs.system_status')}: {maintenanceStatus ? (maintenanceStatus.is_global_maintenance ? t('common.on') : t('common.off')) : t('common.na')}
            </p>
          </AdminCard>

          <AdminCard variant="glass" className="rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group">
            <Activity className="absolute -right-4 -bottom-4 w-32 h-32 opacity-5 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-black tracking-widest opacity-40 mb-1">{t('admin.fs.usage_efficiency')}</p>
            <h3 className="text-3xl font-black">{quotaPct === null ? t('common.na') : `${quotaPct.toFixed(1)}%`}</h3>
            <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: `${quotaPct ?? 0}%` }} />
            </div>
            <p className="text-sm font-bold mt-4 opacity-40 tracking-widest">
              {formatSize(stats?.total_used ?? null, t)} / {formatSize(stats?.total_quota ?? null, t)}
            </p>
          </AdminCard>

          <AdminCard variant="glass" className="rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group">
            <Cpu className="absolute -right-4 -bottom-4 w-32 h-32 opacity-5 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-black tracking-widest opacity-40 mb-1">{t('admin.fs.total_users')}</p>
            <h3 className="text-3xl font-black tabular-nums">{typeof stats?.total_users === 'number' ? stats.total_users : t('common.na')}</h3>
            <p className="text-sm font-bold mt-4 opacity-40 tracking-widest">
              {t('admin.fs.locked_users')}: {maintenanceStatus ? lockedUsers.length : t('common.na')}
            </p>
          </AdminCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <HardDrive size={18} className="text-primary" />
                <h2 className="text-sm font-black tracking-widest">{t('admin.fs.global_ops')}</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={refreshAll} className="opacity-50 hover:opacity-100">
                <RefreshCw size={18} className="mr-2" /> {t('common.refresh')}
              </Button>
            </div>

            <AdminCard variant="glass" className="rounded-[2.5rem] p-8 shadow-xl space-y-6">
              <p className="text-sm font-bold opacity-50 italic">{t('admin.fs.global_ops_desc')}</p>
              <Button variant="outline" className="h-16 justify-between group w-full" onClick={handleFullSync} disabled={syncing}>
                <span className="flex items-center gap-3">
                  <RefreshCw size={20} className={syncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
                  <span className="font-black tracking-widest text-sm">{t('admin.fs.sync_index')}</span>
                </span>
                <span className="text-sm opacity-30 font-bold">RE-INDEX CLUSTER</span>
              </Button>

              <div className="pt-5 border-t border-white/5 space-y-3">
                <p className="text-sm font-bold opacity-50 italic">{t('admin.fs.sync_user_index_desc')}</p>
                <Input value={userIdForIndexSync} onChange={(e) => setUserIdForIndexSync(e.target.value)} placeholder={t('admin.fs.user_id_placeholder')} className="h-12 font-mono" disabled={syncingUserIndex || rebuildingUserIndex} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button variant="outline" className="h-12 px-5 justify-center" onClick={handleSyncIndexForUser} disabled={syncingUserIndex || rebuildingUserIndex}>
                    <RefreshCw size={18} className={syncingUserIndex ? 'animate-spin mr-2' : 'mr-2'} />
                    <span className="font-black tracking-widest text-sm">{t('admin.fs.sync_user_index')}</span>
                  </Button>
                  <Button variant="outline" className="h-12 px-5 justify-center" onClick={handleRebuildIndexForUser} disabled={rebuildingUserIndex || syncingUserIndex}>
                    <RefreshCw size={18} className={rebuildingUserIndex ? 'animate-spin mr-2' : 'mr-2'} />
                    <span className="font-black tracking-widest text-sm">{t('admin.fs.rebuild_user_index')}</span>
                  </Button>
                </div>
                <p className="text-xs font-bold opacity-40 italic">{t('admin.fs.rebuild_user_index_desc')}</p>
              </div>
            </AdminCard>

            <div className="flex items-center gap-3 px-4 pt-4">
              <ShieldAlert size={18} className="text-red-500" />
              <h2 className="text-sm font-black tracking-widest text-red-500">{t('admin.fs.emergency_control')}</h2>
            </div>
            <AdminCard className="bg-red-500/5 border border-red-500/10 rounded-[2.5rem] p-8 shadow-xl space-y-6">
              <p className="text-sm font-bold text-red-400/60 italic">{t('admin.fs.emergency_desc')}</p>
              <Button variant="outline" className="w-full h-16 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white group" onClick={handleGlobalUnlock} disabled={unlocking}>
                <RotateCcw size={20} className="mr-3 group-hover:scale-110 transition-transform" />
                <span className="font-black tracking-widest text-sm">{t('admin.fs.force_unlock')}</span>
              </Button>
            </AdminCard>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <Users size={18} className="text-orange-500" />
                <h2 className="text-sm font-black tracking-widest">{t('admin.fs.locked_users')}</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={refreshAll} className="opacity-50 hover:opacity-100">
                <RefreshCw size={18} className="mr-2" /> {t('common.refresh')}
              </Button>
            </div>
            <AdminCard variant="glass" className="rounded-[2.5rem] p-8 shadow-xl min-h-[400px]">
              {!maintenanceStatus ? (
                <div className="h-full flex flex-col items-center justify-center py-20 opacity-30 italic text-center">
                  <AlertTriangle size={48} className="mb-4" />
                  <p className="font-black tracking-widest text-sm">{t('admin.fs.maintenance_status_unavailable')}</p>
                </div>
              ) : lockedUsers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 italic">
                  <CheckCircle2 size={48} className="mb-4" />
                  <p className="font-black tracking-widest text-sm">{t('admin.fs.no_locked_users')}</p>
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
                <h2 className="text-sm font-black tracking-widest">{t('admin.fs.wal_title')}</h2>
                <p className="text-sm opacity-50 mt-1">{walScope === 'issues' ? t('admin.fs.wal_desc') : t('admin.fs.wal_history_desc')}</p>
              </div>
            </div>
            <div className="flex gap-3">
              {walScope === 'history' ? (
                <Button variant="outline" className="rounded-xl" onClick={handleExportWalJson}>
                  <Download size={16} className="mr-2" />
                  {t('admin.fs.wal_export_json')}
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={fetchWalEntries} className="opacity-50 hover:opacity-100">
                <RefreshCw size={18} className={`mr-2 ${issuesLoading ? 'animate-spin' : ''}`} /> {t('common.refresh')}
              </Button>
            </div>
          </div>

          <AdminCard variant="glass" className="rounded-[2.5rem] shadow-xl overflow-hidden">
            <div className="p-6 md:p-8 border-b border-white/5 space-y-5">
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'issues' as const, label: t('admin.fs.wal_scope_issues') },
                  { value: 'history' as const, label: t('admin.fs.wal_scope_history') },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    onClick={() => {
                      setWalScope(item.value);
                      setWalPage(1);
                      setWalDiagnostics(null);
                    }}
                    className={[
                      'px-4 h-10 rounded-2xl border text-sm font-black tracking-widest transition-all',
                      walScope === item.value ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white/5 border-white/10 opacity-60 hover:opacity-100',
                    ].join(' ')}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                <div className="xl:col-span-2 space-y-2">
                  <div className="text-xs font-black tracking-widest opacity-40">{t('admin.fs.wal_filter_user')}</div>
                  <Input value={walUserFilterDraft} onChange={(e) => setWalUserFilterDraft(e.target.value)} placeholder={t('admin.fs.wal_user_filter_placeholder')} className="h-11 font-mono" />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-black tracking-widest opacity-40">{t('admin.fs.wal_filter_status')}</div>
                  <div className="flex flex-wrap gap-2">
                    {walStatusButtons.map((item) => (
                      <button
                        type="button"
                        key={item.value}
                        onClick={() => {
                          setWalStatusFilter(item.value);
                          setWalPage(1);
                        }}
                        className={[
                          'px-3 h-10 rounded-2xl border text-xs font-black tracking-widest transition-all',
                          walStatusFilter === item.value ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white/5 border-white/10 opacity-60 hover:opacity-100',
                        ].join(' ')}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-black tracking-widest opacity-40">{t('admin.fs.wal_filter_operation')}</div>
                  <select value={walOperationFilter} onChange={(e) => { setWalOperationFilter(e.target.value); setWalPage(1); }} className="w-full h-11 rounded-xl bg-background border border-border px-4 font-bold text-sm">
                    {WAL_OPERATION_OPTIONS.map((item) => (
                      <option key={item} value={item}>{item === 'all' ? t('admin.fs.wal_operation_all') : item}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-black tracking-widest opacity-40">{t('admin.fs.wal_filter_updated_from')}</div>
                  <Input type="datetime-local" value={walUpdatedFromDraft} onChange={(e) => setWalUpdatedFromDraft(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-black tracking-widest opacity-40">{t('admin.fs.wal_filter_updated_to')}</div>
                  <Input type="datetime-local" value={walUpdatedToDraft} onChange={(e) => setWalUpdatedToDraft(e.target.value)} className="h-11" />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-3 text-xs font-bold tracking-widest opacity-40">
                  <span>{t('admin.fs.wal_total', { total: walTotal })}</span>
                  <span>{t('admin.fs.wal_filter_user')}: {walUserFilter || t('common.na')}</span>
                  <span>{t('admin.fs.wal_filter_operation')}: {walOperationFilter === 'all' ? t('admin.fs.wal_operation_all') : walOperationFilter}</span>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="h-11 px-4" onClick={applyWalFilters}>
                    <Search size={16} className="mr-2" />
                    {t('admin.fs.wal_filter_apply')}
                  </Button>
                  <Button variant="ghost" className="h-11 px-4" onClick={resetWalFilters}>
                    <RotateCcw size={16} className="mr-2" />
                    {t('admin.fs.wal_filter_reset')}
                  </Button>
                </div>
              </div>

              {walScope === 'issues' ? (
                <div className="rounded-[2rem] border border-white/8 bg-black/20 p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-3 text-sm font-bold">
                    <div className="inline-flex items-center gap-2 opacity-80">
                      <input type="checkbox" aria-label={t('admin.fs.wal_select_all_visible')} checked={allVisibleSelected} onChange={toggleSelectAllVisible} className="h-4 w-4 rounded border-white/20 bg-transparent" />
                      <span>{t('admin.fs.wal_select_all_visible')}</span>
                    </div>
                    <span className="opacity-40 tracking-widest">{t('admin.fs.wal_selected_count', { count: selectedWalIds.length })}</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" className="h-11 px-4" onClick={handleReplayWalBatch} disabled={selectedWalIds.length === 0 || walActionId === -1}>
                      <Play size={16} className="mr-2" />{t('admin.fs.wal_replay_batch')}
                    </Button>
                    <Button variant="ghost" className="h-11 px-4 border border-white/10" onClick={handleMarkWalBatchHandled} disabled={selectedWalIds.length === 0 || walActionId === -1}>
                      <CheckCircle2 size={16} className="mr-2" />{t('admin.fs.wal_mark_handled_batch')}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            {walDiagnostics ? (
              <div className="p-6 md:p-8 border-b border-white/5 bg-black/20 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Stethoscope size={18} className="text-primary" />
                      <h3 className="text-sm font-black tracking-widest">{t('admin.fs.wal_diagnostics_title')}</h3>
                    </div>
                    <p className="text-sm opacity-60">#{walDiagnostics.issue.id} · {walDiagnostics.issue.operation_type} · {summarizeWalOperation(walDiagnostics.issue.operation_data)}</p>
                  </div>
                  <Button variant="ghost" className="h-10 px-4" onClick={() => setWalDiagnostics(null)}>
                    {t('common.close')}
                  </Button>
                </div>

                <div className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5 space-y-3">
                  <p className="text-sm font-black tracking-widest opacity-40">{t('admin.fs.wal_recommended_actions')}</p>
                  <div className="space-y-3">
                    {walDiagnostics.recommended_actions.map((action) => (
                      <div key={`${action.action}-${action.reason_code}`} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={action.action === 'no_action_required' ? 'success' : action.action.includes('inspect') || action.action.includes('manual') ? 'warning' : 'ghost'}>
                            {translateWalAction(t, action.action)}
                          </Badge>
                          <span className="text-sm opacity-70">{translateWalReason(t, action.reason_code)}</span>
                        </div>
                        {action.signals.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {action.signals.map((signal) => (
                              <Badge key={signal} variant="ghost">{signal}</Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {walDiagnostics.diagnostics.map((item) => (
                    <div key={`${item.role}-${item.logical_path}`} className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5 space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={item.mismatch_flags.length > 0 ? 'danger' : 'success'}>{item.role}</Badge>
                        {item.mismatch_flags.length > 0 ? item.mismatch_flags.map((flag) => <Badge key={flag} variant="warning">{flag}</Badge>) : <Badge variant="success">{t('admin.fs.wal_no_mismatch')}</Badge>}
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="font-black tracking-widest opacity-40">Logical</p>
                        <p className="font-mono break-all">{item.logical_path}</p>
                        <p className="font-black tracking-widest opacity-40 pt-2">Physical</p>
                        <p className="font-mono break-all">{item.physical_path}</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="rounded-2xl border border-white/8 bg-black/20 p-4 space-y-2">
                          <p className="font-black tracking-widest opacity-40">{t('admin.fs.wal_physical_state')}</p>
                          <p>{t('admin.fs.wal_exists')}: {item.physical.exists ? t('common.yes') : t('common.no')}</p>
                          <p>{t('admin.fs.wal_kind')}: {item.physical.is_dir === undefined || item.physical.is_dir === null ? t('common.na') : item.physical.is_dir ? 'dir' : 'file'}</p>
                          <p>{t('admin.fs.wal_size')}: {item.physical.size ?? t('common.na')}</p>
                          <p>{t('admin.fs.wal_updated_at')}: {formatTime(item.physical.modified_at, t('common.na'))}</p>
                          <p className="whitespace-pre-wrap break-words">{item.physical.error || t('admin.fs.wal_no_error')}</p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-black/20 p-4 space-y-2">
                          <p className="font-black tracking-widest opacity-40">{t('admin.fs.wal_index_state')}</p>
                          <p>{t('admin.fs.wal_exists')}: {item.index.exists ? t('common.yes') : t('common.no')}</p>
                          <p>{t('admin.fs.wal_kind')}: {item.index.is_dir === undefined || item.index.is_dir === null ? t('common.na') : item.index.is_dir ? 'dir' : 'file'}</p>
                          <p>{t('admin.fs.wal_size')}: {item.index.size ?? t('common.na')}</p>
                          <p>{t('admin.fs.wal_backend_key')}: <span className="font-mono break-all">{item.index.backend_key || t('common.na')}</span></p>
                          <p>{t('admin.fs.wal_original_path')}: <span className="font-mono break-all">{item.index.original_path || t('common.na')}</span></p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="p-6 md:p-8 space-y-4 min-h-[22rem]">
              {issuesLoading ? (
                <div className="h-full flex flex-col items-center justify-center py-20 opacity-40 italic text-center">
                  <RefreshCw size={40} className="mb-4 animate-spin" />
                  <p className="font-black tracking-widest text-sm">{t('admin.fs.wal_loading')}</p>
                </div>
              ) : walEntries.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 italic text-center">
                  <CheckCircle2 size={48} className="mb-4" />
                  <p className="font-black tracking-widest text-sm">{walScope === 'issues' ? t('admin.fs.wal_empty') : t('admin.fs.wal_history_empty')}</p>
                </div>
              ) : (
                walEntries.map((issue) => {
                  const normalizedStatus = issue.status.trim().toLowerCase();
                  const badgeVariant = normalizedStatus === 'failed' ? 'danger' : normalizedStatus === 'recovering' ? 'warning' : 'success';
                  const busy = walActionId === issue.id || walActionId === -1;
                  const selected = selectedWalIds.includes(issue.id);
                  return (
                    <div key={issue.id} className="rounded-[2rem] border border-white/8 bg-black/20 p-5 md:p-6 space-y-4">
                      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {walScope === 'issues' ? (
                              <div className="inline-flex items-center gap-2 opacity-80 mr-1">
                                <input type="checkbox" aria-label={`${t('admin.fs.wal_select_issue') || 'Select issue'} #${issue.id}`} checked={selected} onChange={() => toggleWalSelection(issue.id)} className="h-4 w-4 rounded border-white/20 bg-transparent" />
                              </div>
                            ) : null}
                            <Badge variant={badgeVariant}>{issue.status.replace(/_/g, ' ')}</Badge>
                            <Badge variant="ghost">#{issue.id}</Badge>
                            <Badge variant="ghost">{issue.operation_type}</Badge>
                          </div>
                          <div className="text-sm font-black tracking-widest opacity-60">
                            {t('admin.fs.wal_filter_user')}: <span className="font-mono normal-case tracking-normal opacity-100">{issue.user_id}</span>
                          </div>
                          <div className="text-base font-bold break-all">{summarizeWalOperation(issue.operation_data)}</div>
                        </div>

                        <div className="flex flex-wrap gap-3 xl:justify-end">
                          <Button variant="outline" className="h-11 px-4" onClick={() => handleDiagnoseWalIssue(issue)} disabled={diagnosticsLoadingId === issue.id}>
                            <Stethoscope size={16} className={`mr-2 ${diagnosticsLoadingId === issue.id ? 'animate-pulse' : ''}`} />
                            {t('admin.fs.wal_diagnostics')}
                          </Button>
                          {walScope === 'issues' ? (
                            <>
                              <Button variant="outline" className="h-11 px-4" onClick={() => handleReplayWalIssue(issue)} disabled={busy}>
                                <Play size={16} className="mr-2" />{t('admin.fs.wal_replay')}
                              </Button>
                              <Button variant="ghost" className="h-11 px-4 border border-white/10" onClick={() => handleMarkWalHandled(issue)} disabled={busy}>
                                <CheckCircle2 size={16} className="mr-2" />{t('admin.fs.wal_mark_handled')}
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 text-sm">
                        <div className="rounded-2xl bg-white/[0.03] border border-white/6 p-4 space-y-2">
                          <p className="font-black tracking-widest opacity-40">{t('admin.fs.wal_summary')}</p>
                          <p className="font-bold break-all">{summarizeWalOperation(issue.operation_data)}</p>
                          <p className="text-xs opacity-50">{t('admin.fs.wal_created_at')}: {formatTime(issue.created_at, t('common.na'))}</p>
                          <p className="text-xs opacity-50">{t('admin.fs.wal_updated_at')}: {formatTime(issue.updated_at, t('common.na'))}</p>
                          {walScope === 'history' ? <p className="text-xs opacity-50">{t('admin.fs.wal_completed_at')}: {formatTime(issue.completed_at, t('common.na'))}</p> : null}
                        </div>
                        <div className="rounded-2xl bg-white/[0.03] border border-white/6 p-4 space-y-2 xl:col-span-2">
                          <p className="font-black tracking-widest opacity-40">{t('admin.fs.wal_failure_reason')}</p>
                          <p className="text-sm leading-6 whitespace-pre-wrap break-words min-h-[3rem]">{issue.failure_reason?.trim() || t('admin.fs.wal_no_failure_reason')}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-zinc-950/60 border border-white/6 p-4">
                        <p className="font-black tracking-widest opacity-40 text-xs mb-3">{t('admin.fs.wal_operation')}</p>
                        <pre className="text-xs leading-6 whitespace-pre-wrap break-all opacity-80 overflow-x-auto">{truncateText(prettyWalOperation(issue.operation_data))}</pre>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {walTotal > 0 ? (
              <Pagination current={walPage} total={walTotal} pageSize={walPageSize} pageSizeOptions={[10, 20, 50, 100]} onPageChange={setWalPage} onPageSizeChange={(size) => { setWalPageSize(size); setWalPage(1); }} />
            ) : null}
          </AdminCard>
        </div>
      </div>
    </AdminPage>
  );
};

const formatSize = (bytes: number | null | undefined, t: (key: string) => string) => {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return t('common.na');
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${['B', 'KB', 'MB', 'GB', 'TB'][i]}`;
};

const Badge = ({ children, variant = 'ghost' }: { children: React.ReactNode; variant?: 'success' | 'warning' | 'danger' | 'ghost' }) => {
  const styles = {
    success: 'bg-green-500/10 text-green-500 border-green-500/20',
    warning: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    danger: 'bg-red-500/10 text-red-500 border-red-500/20',
    ghost: 'bg-white/5 text-white/40 border-white/10',
  };

  return <span className={`px-2 py-1 rounded-md text-sm font-black border tracking-tighter ${styles[variant]}`}>{children}</span>;
};
