import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  Cloud,
  Database,
  FolderOpen,
  FolderSync,
  HardDrive,
  RefreshCw,
  Server,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { client, extractData, handleApiError } from '@/lib/api';
import type { components } from '@/lib/api';
import { useToastStore } from '@/stores/toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { PasswordInput } from '@/components/common/PasswordInput';
import { cn } from '@/lib/utils';

type Driver = 'fs' | 's3' | 'webdav' | 'dropbox' | 'onedrive' | 'gdrive' | 'android_saf' | 'ios_scoped_fs' | 'memory';
type RemoteDriver = 's3' | 'webdav' | 'dropbox' | 'onedrive' | 'gdrive';
type Step = 'list' | 'provider' | 'form';
type MountDto = components['schemas']['RemoteMountDto'];
type MountListDto = components['schemas']['RemoteMountListDto'];
type MountPolicyDto = components['schemas']['RemoteMountPolicyDto'];
type AdminMountListDto = components['schemas']['AdminRemoteMountListDto'];

interface Draft {
  name: string;
  driver: RemoteDriver;
  root: string;
  mount_dir: string;
  sync_enabled: boolean;
  sync_peer_dir: string;
  sync_mode: number;
  sync_interval_minutes: string;
  sync_timeout_secs: string;
  enable: boolean;
  options: Record<string, string>;
}

const DRIVER_FIELDS: Record<RemoteDriver, { key: string; secret?: boolean; wide?: boolean }[]> = {
  s3: [
    { key: 'endpoint', wide: true },
    { key: 'region' },
    { key: 'bucket' },
    { key: 'access_key_id' },
    { key: 'secret_access_key', secret: true },
  ],
  webdav: [
    { key: 'endpoint', wide: true },
    { key: 'username' },
    { key: 'password', secret: true },
  ],
  dropbox: [
    { key: 'access_token', secret: true, wide: true },
    { key: 'refresh_token', secret: true, wide: true },
    { key: 'client_id' },
    { key: 'client_secret', secret: true },
  ],
  onedrive: [
    { key: 'access_token', secret: true, wide: true },
    { key: 'refresh_token', secret: true, wide: true },
    { key: 'client_id' },
    { key: 'client_secret', secret: true },
  ],
  gdrive: [
    { key: 'access_token', secret: true, wide: true },
    { key: 'refresh_token', secret: true, wide: true },
    { key: 'client_id' },
    { key: 'client_secret', secret: true },
  ],
};

const trimTrailingSlashes = (value: string): string => {
  let next = value;
  while (next.length > 1 && next.endsWith('/')) {
    next = next.slice(0, -1);
  }
  return next;
};

const normalizePathInput = (value: string): string => {
  const trimmed = value.trim().replaceAll('\\', '/');
  if (!trimmed) return '';
  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return normalized === '/' ? '/' : trimTrailingSlashes(normalized);
};

const defaultSubdirMountPath = (path: string): string => {
  const normalized = normalizePathInput(path) || '/';
  return normalized === '/' ? '/remote-storage' : `${normalized}/remote-storage`;
};

const translateDriverLabel = (t: TFunction, driver: Driver): string => {
  switch (driver) {
    case 's3': return t('admin.config.storage.drivers.s3');
    case 'webdav': return t('admin.config.storage.drivers.webdav');
    case 'dropbox': return t('admin.config.storage.drivers.dropbox');
    case 'onedrive': return t('admin.config.storage.drivers.onedrive');
    case 'gdrive': return t('admin.config.storage.drivers.gdrive');
    default: return driver;
  }
};

const translateFieldLabel = (t: TFunction, driver: Driver, key: string): string => {
  switch (driver) {
    case 's3':
      switch (key) {
        case 'endpoint': return t('filemanager.mounts.fields.endpoint');
        case 'region': return t('filemanager.mounts.fields.region');
        case 'bucket': return t('filemanager.mounts.fields.bucket');
        case 'access_key_id': return t('filemanager.mounts.fields.accessKeyId');
        case 'secret_access_key': return t('filemanager.mounts.fields.secretAccessKey');
      }
      break;
    case 'webdav':
      switch (key) {
        case 'endpoint': return t('filemanager.mounts.fields.endpoint');
        case 'username': return t('filemanager.mounts.fields.username');
        case 'password': return t('filemanager.mounts.fields.password');
      }
      break;
    case 'dropbox':
      switch (key) {
        case 'access_token': return t('filemanager.mounts.fields.accessToken');
        case 'refresh_token': return t('filemanager.mounts.fields.refreshToken');
        case 'client_id': return t('filemanager.mounts.fields.clientId');
        case 'client_secret': return t('filemanager.mounts.fields.clientSecret');
      }
      break;
    case 'onedrive':
      switch (key) {
        case 'access_token': return t('filemanager.mounts.fields.accessToken');
        case 'refresh_token': return t('filemanager.mounts.fields.refreshToken');
        case 'client_id': return t('filemanager.mounts.fields.clientId');
        case 'client_secret': return t('filemanager.mounts.fields.clientSecret');
      }
      break;
    case 'gdrive':
      switch (key) {
        case 'access_token': return t('filemanager.mounts.fields.accessToken');
        case 'refresh_token': return t('filemanager.mounts.fields.refreshToken');
        case 'client_id': return t('filemanager.mounts.fields.clientId');
        case 'client_secret': return t('filemanager.mounts.fields.clientSecret');
      }
      break;
  }
  return key;
};

const driverIcon = (driver: Driver, className?: string) => {
  switch (driver) {
    case 's3': return <Database className={className} />;
    case 'webdav': return <Server className={className} />;
    default: return <Cloud className={className} />;
  }
};

const createDraft = (path: string): Draft => ({
  name: '',
  driver: 'webdav',
  root: '/',
  mount_dir: defaultSubdirMountPath(path),
  sync_enabled: false,
  sync_peer_dir: '',
  sync_mode: 5,
  sync_interval_minutes: '1440',
  sync_timeout_secs: '3600',
  enable: true,
  options: {},
});

const mountToDraft = (mount: MountDto): Draft => ({
  name: mount.name,
  driver: mount.driver as RemoteDriver,
  root: mount.root,
  mount_dir: mount.mount_dir,
  sync_enabled: Boolean(mount.sync_peer_dir),
  sync_peer_dir: mount.sync_peer_dir || '',
  sync_mode: mount.sync_mode,
  sync_interval_minutes: mount.sync_interval_minutes.toString(),
  sync_timeout_secs: mount.sync_timeout_secs.toString(),
  enable: mount.enable,
  options: mount.options,
});

const formatDateTime = (value?: string | null): string => {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

const parseInteger = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatMountPlacement = (t: TFunction, path: string): string => {
  return path === '/' ? t('filemanager.mounts.ui.homeTarget') : path;
};

const getStatusVariant = (status?: string | null): 'success' | 'error' | 'warning' | 'secondary' => {
  if (status === 'success') return 'success';
  if (status === 'failed') return 'error';
  if (status === 'running') return 'warning';
  return 'secondary';
};

const getStatusLabel = (t: TFunction, enabled: boolean, status?: string | null): string => {
  if (!enabled) return t('common.disabled');
  if (status === 'running') return t('filemanager.mounts.ui.syncing');
  if (status === 'failed') return t('filemanager.mounts.ui.syncFailed');
  return t('filemanager.mounts.ui.online');
};

const FieldRow = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex items-start justify-between gap-4 border-b border-border/60 py-3 last:border-b-0 last:pb-0 first:pt-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={cn('max-w-[60%] text-right text-sm font-semibold', mono && 'font-mono text-[13px]')}>{value}</span>
  </div>
);

export const RemoteMountManagerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  onChanged?: () => void;
  targetUserId?: string;
  title?: string;
}> = ({ isOpen, onClose, currentPath, onChanged, targetUserId, title }) => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [mounts, setMounts] = useState<MountDto[]>([]);
  const [policy, setPolicy] = useState<MountPolicyDto | null>(null);
  const [draft, setDraft] = useState<Draft>(() => createDraft(currentPath));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('list');

  const refreshMounts = useCallback(async () => {
    setLoading(true);
    try {
      if (targetUserId) {
        const result = await extractData<AdminMountListDto>(client.GET('/api/v1/file/admin/mounts', {}));
        const userItems = result.items.filter((item) => item.user.user_id === targetUserId);
        setMounts(userItems.map((item) => item.mount));
        setPolicy(userItems[0]?.policy ?? null);
      } else {
        const result = await extractData<MountListDto>(client.GET('/api/v1/file/mounts', {}));
        setMounts(result.mounts);
        setPolicy(result.policy);
      }
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, t, targetUserId]);

  useEffect(() => {
    if (!isOpen) return;
    void refreshMounts();
  }, [isOpen, refreshMounts]);

  useEffect(() => {
    if (isOpen) return;
    setEditingId(null);
    setStep('list');
    setDraft(createDraft(currentPath));
  }, [currentPath, isOpen]);

  const syncModes = useMemo(
    () => [
      { id: 1, label: t('filemanager.mounts.syncModes.1'), description: t('filemanager.mounts.syncModeDescriptions.1') },
      { id: 2, label: t('filemanager.mounts.syncModes.2'), description: t('filemanager.mounts.syncModeDescriptions.2') },
      { id: 3, label: t('filemanager.mounts.syncModes.3'), description: t('filemanager.mounts.syncModeDescriptions.3') },
      { id: 4, label: t('filemanager.mounts.syncModes.4'), description: t('filemanager.mounts.syncModeDescriptions.4') },
      { id: 5, label: t('filemanager.mounts.syncModes.5'), description: t('filemanager.mounts.syncModeDescriptions.5') },
    ],
    [t],
  );

  const mountTargetMode = draft.mount_dir === '/' ? 'home' : 'subdir';
  const effectiveSyncEnabled = mountTargetMode === 'subdir' && draft.sync_enabled;
  const hasSync = effectiveSyncEnabled && draft.sync_peer_dir.trim().length > 0;
  const selectedSyncMode = syncModes.find((item) => item.id === draft.sync_mode) ?? {
    id: 5,
    label: t('filemanager.mounts.syncModes.5'),
    description: t('filemanager.mounts.syncModeDescriptions.5'),
  };
  const editingMount = mounts.find((mount) => mount.id === editingId) ?? null;

  const openCreate = () => {
    setEditingId(null);
    setDraft(createDraft(currentPath));
    setStep('provider');
  };

  const selectDriver = (driver: RemoteDriver) => {
    setDraft({ ...createDraft(currentPath), driver });
    setStep('form');
  };

  const editMount = (mount: MountDto) => {
    setDraft(mountToDraft(mount));
    setEditingId(mount.id);
    setStep('form');
  };

  const goBack = () => {
    if (step === 'provider') {
      setStep('list');
      return;
    }
    if (step === 'form') {
      setStep(editingId ? 'list' : 'provider');
    }
  };

  const changeMountTargetMode = (mode: 'home' | 'subdir') => {
    setDraft((prev) => ({
      ...prev,
      mount_dir: mode === 'home' ? '/' : prev.mount_dir === '/' ? defaultSubdirMountPath(currentPath) : prev.mount_dir,
      sync_enabled: mode === 'home' ? false : prev.sync_enabled,
      sync_peer_dir: mode === 'home' ? '' : prev.sync_peer_dir,
    }));
  };

  const handleSave = async () => {
    const normalizedMountDir = mountTargetMode === 'home' ? '/' : normalizePathInput(draft.mount_dir);
    const normalizedRoot = normalizePathInput(draft.root) || '/';
    const normalizedPeerDir = effectiveSyncEnabled ? normalizePathInput(draft.sync_peer_dir) : '';
    const syncInterval = parseInteger(draft.sync_interval_minutes);
    const syncTimeout = parseInteger(draft.sync_timeout_secs);

    if (!normalizedMountDir) {
      addToast(t('filemanager.mounts.messages.mountPathRequired'), 'error');
      return;
    }
    if (effectiveSyncEnabled && !normalizedPeerDir) {
      addToast(t('filemanager.mounts.messages.syncPeerRequired'), 'error');
      return;
    }
    if (syncInterval === null || syncTimeout === null) {
      addToast(t('filemanager.mounts.messages.invalidNumber'), 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim() || translateDriverLabel(t, draft.driver),
        driver: draft.driver,
        root: normalizedRoot,
        mount_dir: normalizedMountDir,
        sync_peer_dir: effectiveSyncEnabled ? normalizedPeerDir : null,
        sync_mode: draft.sync_mode,
        sync_interval_minutes: syncInterval,
        sync_timeout_secs: syncTimeout,
        enable: draft.enable,
        options: Object.fromEntries(
          Object.entries(draft.options)
            .filter(([key]) => key.trim().length > 0)
            .map(([key, value]) => [key.trim(), value]),
        ),
      };

      const request = targetUserId
        ? editingId
          ? client.PUT('/api/v1/file/admin/mounts/{user_id}/{mount_id}', { params: { path: { user_id: targetUserId, mount_id: editingId } }, body: payload })
          : client.POST('/api/v1/file/admin/mounts/{user_id}', { params: { path: { user_id: targetUserId } }, body: payload })
        : editingId
          ? client.PUT('/api/v1/file/mounts/{mount_id}', { params: { path: { mount_id: editingId } }, body: payload })
          : client.POST('/api/v1/file/mounts', { body: payload });

      await extractData(request);
      addToast(t('filemanager.mounts.messages.saved'), 'success');
      setEditingId(null);
      setStep('list');
      await refreshMounts();
      onChanged?.();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (mountId: string) => {
    if (!window.confirm(t('filemanager.mounts.messages.confirmDelete'))) return;
    try {
      if (targetUserId) {
        await extractData(client.DELETE('/api/v1/file/admin/mounts/{user_id}/{mount_id}', { params: { path: { user_id: targetUserId, mount_id: mountId } } }));
      } else {
        await extractData(client.DELETE('/api/v1/file/mounts/{mount_id}', { params: { path: { mount_id: mountId } } }));
      }
      addToast(t('filemanager.mounts.messages.deleted'), 'success');
      setEditingId(null);
      setStep('list');
      await refreshMounts();
      onChanged?.();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const handleSyncNow = async (mountId: string) => {
    setSyncingId(mountId);
    try {
      const request = targetUserId
        ? client.POST('/api/v1/file/admin/mounts/{user_id}/{mount_id}/sync', { params: { path: { user_id: targetUserId, mount_id: mountId } } })
        : client.POST('/api/v1/file/mounts/{mount_id}/sync', { params: { path: { mount_id: mountId } } });
      await extractData(request);
      addToast(t('filemanager.mounts.messages.synced'), 'success');
      await refreshMounts();
      onChanged?.();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || t('filemanager.mounts.title')}
      maxWidth="max-w-5xl"
      className="rounded-[2rem] border border-white/10 bg-zinc-950 text-white shadow-2xl shadow-black/40"
      bodyClassName="overflow-hidden bg-zinc-950 p-0"
    >
      <div className="flex min-h-[640px] flex-col bg-zinc-950 text-white">
        <div className="border-b border-white/8 bg-gradient-to-b from-white/[0.05] to-transparent px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {step !== 'list' && (
                <Button variant="ghost" className="h-10 rounded-xl px-3 text-sm text-white/80 hover:bg-white/8 hover:text-white" onClick={goBack}>
                  <ChevronLeft size={16} className="mr-1.5" />
                  {t('common.back')}
                </Button>
              )}
            </div>

            {step === 'list' && (
              <div className="flex items-center gap-2">
                <Button variant="outline" className="h-10 rounded-xl border-white/10 bg-white/[0.03] px-4 text-sm text-white/80 hover:bg-white/[0.06] hover:text-white" onClick={() => void refreshMounts()}>
                  <RefreshCw size={16} className={cn('mr-2', loading && 'animate-spin')} />
                  {t('filemanager.mounts.ui.refresh')}
                </Button>
                <Button className="h-10 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90" onClick={openCreate}>
                  {t('filemanager.mounts.add')}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          {step === 'list' && (
            <div>
              {loading ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-[1.75rem] border border-dashed border-white/10 bg-white/[0.03] text-white/50">
                  <RefreshCw size={28} className="animate-spin" />
                  <p className="text-sm">{t('common.loading')}</p>
                </div>
              ) : mounts.length === 0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-5 rounded-[1.75rem] border border-dashed border-white/10 bg-white/[0.03] px-6 text-center">
                  <div className="flex h-18 w-18 items-center justify-center rounded-[2rem] bg-primary/12 text-primary shadow-lg shadow-primary/10">
                    <FolderSync size={34} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black tracking-tight">{t('filemanager.mounts.ui.noMountsTitle')}</h4>
                    <p className="mx-auto max-w-md text-sm leading-7 text-white/45">{t('filemanager.mounts.ui.noMountsDesc')}</p>
                  </div>
                  <Button className="h-10 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90" onClick={openCreate}>
                    {t('filemanager.mounts.ui.getStarted')}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {mounts.map((mount) => {
                    const syncEnabled = Boolean(mount.sync_peer_dir);
                    return (
                      <div key={mount.id} className="rounded-[1.75rem] border border-white/8 bg-white/[0.035] p-5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.7)] transition-all hover:border-white/12 hover:bg-white/[0.05]">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                              {driverIcon(mount.driver as Driver, 'h-6 w-6')}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="truncate text-lg font-black tracking-tight">{mount.name || translateDriverLabel(t, mount.driver as Driver)}</h4>
                                <Badge variant={mount.enable ? getStatusVariant(mount.last_sync_status) : 'outline'} className="h-7 px-3 text-sm font-bold">
                                  {getStatusLabel(t, mount.enable, mount.last_sync_status)}
                                </Badge>
                              </div>
                              <p className="mt-1 text-sm text-white/45">{translateDriverLabel(t, mount.driver as Driver)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <div className="mb-1 text-sm font-black">{t('filemanager.mounts.ui.showAt')}</div>
                            <div className="font-mono text-sm text-white/60">{formatMountPlacement(t, mount.mount_dir)}</div>
                          </div>
                          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <div className="mb-1 text-sm font-black">{t('filemanager.mounts.ui.localFolder')}</div>
                            <div className="font-mono text-sm text-white/60">{syncEnabled ? mount.sync_peer_dir || '-' : t('filemanager.mounts.ui.syncOff')}</div>
                          </div>
                          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <div className="mb-1 text-sm font-black">{t('filemanager.mounts.lastSyncAt')}</div>
                            <div className="text-sm text-white/60">{formatDateTime(mount.last_sync_at)}</div>
                          </div>
                          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <div className="mb-1 text-sm font-black">{t('filemanager.mounts.nextSyncAt')}</div>
                            <div className="text-sm text-white/60">{syncEnabled ? formatDateTime(mount.next_sync_at) : t('filemanager.mounts.ui.notScheduled')}</div>
                          </div>
                        </div>

                        {mount.last_error && (
                          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-500">
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            <div className="text-sm leading-6">{mount.last_error}</div>
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div>
                            {syncEnabled && (
                              <Button
                                variant="outline"
                                className="h-10 rounded-xl px-4 text-sm"
                                onClick={() => void handleSyncNow(mount.id)}
                                disabled={syncingId === mount.id}
                              >
                                <RefreshCw size={16} className={cn('mr-2', syncingId === mount.id && 'animate-spin')} />
                                {syncingId === mount.id ? t('filemanager.mounts.ui.syncing') : t('filemanager.mounts.syncNow')}
                              </Button>
                            )}
                          </div>
                          <Button variant="ghost" className="h-10 rounded-xl px-4 text-sm text-white/80 hover:bg-white/8 hover:text-white" onClick={() => editMount(mount)}>
                            {t('common.edit')}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 'provider' && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(Object.keys(DRIVER_FIELDS) as RemoteDriver[]).map((driver) => (
                <button
                  key={driver}
                  type="button"
                  onClick={() => selectDriver(driver)}
                  className="rounded-[1.75rem] border border-white/8 bg-white/[0.035] p-5 text-left shadow-[0_18px_40px_-24px_rgba(0,0,0,0.7)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/8"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                      {driverIcon(driver, 'h-6 w-6')}
                    </div>
                    <div className="text-lg font-black tracking-tight">{translateDriverLabel(t, driver)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 'form' && (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_320px]">
              <div className="space-y-4">
                <section className="rounded-[1.75rem] border border-white/8 bg-white/[0.035] p-5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.7)] sm:p-6">
                  <div className="mb-4 text-sm font-black tracking-tight">{t('filemanager.mounts.ui.connectionTitle')}</div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <div className="text-sm font-black">{t('common.name')}</div>
                      <Input value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} className="h-12 rounded-xl border-white/10 bg-black/25 text-white placeholder:text-white/25" />
                    </div>

                    {DRIVER_FIELDS[draft.driver].map((field) => (
                      <div key={field.key} className={cn('space-y-2', field.wide && 'md:col-span-2')}>
                        <div className="text-sm font-black">{translateFieldLabel(t, draft.driver, field.key)}</div>
                        {field.secret ? (
                          <PasswordInput
                            value={draft.options[field.key] ?? ''}
                            onChange={(event) => setDraft((prev) => ({ ...prev, options: { ...prev.options, [field.key]: event.target.value } }))}
                            inputClassName="h-12 rounded-xl border-white/10 bg-black/25 text-base text-white placeholder:text-white/25"
                          />
                        ) : (
                          <Input
                            value={draft.options[field.key] ?? ''}
                            onChange={(event) => setDraft((prev) => ({ ...prev, options: { ...prev.options, [field.key]: event.target.value } }))}
                            className={cn('h-12 rounded-xl border-white/10 bg-black/25 text-white placeholder:text-white/25', field.key === 'endpoint' && 'font-mono')}
                          />
                        )}
                      </div>
                    ))}

                    <div className="space-y-2 md:col-span-2">
                      <div className="text-sm font-black">{t('filemanager.mounts.root')}</div>
                      <Input value={draft.root} onChange={(event) => setDraft((prev) => ({ ...prev, root: event.target.value }))} className="h-12 rounded-xl border-white/10 bg-black/25 font-mono text-white placeholder:text-white/25" placeholder="/" />
                    </div>
                  </div>
                </section>

                <section className="rounded-[1.75rem] border border-white/8 bg-white/[0.035] p-5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.7)] sm:p-6">
                  <div className="mb-4 text-sm font-black tracking-tight">{t('filemanager.mounts.ui.locationTitle')}</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      aria-pressed={mountTargetMode === 'home'}
                      onClick={() => changeMountTargetMode('home')}
                      className={cn(
                        'rounded-2xl border p-4 text-left transition-all',
                        mountTargetMode === 'home' ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10' : 'border-white/8 bg-black/20 hover:bg-white/[0.05]',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <HardDrive size={18} className="text-primary" />
                        <span className="text-sm font-black">{t('filemanager.mounts.ui.mainFolder')}</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      aria-pressed={mountTargetMode === 'subdir'}
                      onClick={() => changeMountTargetMode('subdir')}
                      className={cn(
                        'rounded-2xl border p-4 text-left transition-all',
                        mountTargetMode === 'subdir' ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10' : 'border-white/8 bg-black/20 hover:bg-white/[0.05]',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <FolderOpen size={18} className="text-primary" />
                        <span className="text-sm font-black">{t('filemanager.mounts.ui.separateFolder')}</span>
                      </div>
                    </button>
                  </div>

                  {mountTargetMode === 'subdir' && (
                    <div className="mt-4 space-y-2">
                      <div className="text-sm font-black">{t('filemanager.mounts.mountDir')}</div>
                      <Input
                        value={draft.mount_dir}
                        onChange={(event) => setDraft((prev) => ({ ...prev, mount_dir: event.target.value }))}
                        placeholder={defaultSubdirMountPath(currentPath)}
                        className="h-12 rounded-xl border-white/10 bg-black/25 font-mono text-white placeholder:text-white/25"
                      />
                    </div>
                  )}
                </section>

                <section className="rounded-[1.75rem] border border-white/8 bg-white/[0.035] p-5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.7)] sm:p-6">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="text-sm font-black tracking-tight">{t('filemanager.mounts.ui.syncTitle')}</div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{t('filemanager.mounts.ui.enableSync')}</span>
                      <Switch checked={effectiveSyncEnabled} onChange={(value) => setDraft((prev) => ({ ...prev, sync_enabled: value }))} disabled={mountTargetMode === 'home'} />
                    </div>
                  </div>

                  {mountTargetMode === 'home' ? (
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-white/55">
                      {t('filemanager.mounts.ui.homeNoSyncHint')}
                    </div>
                  ) : effectiveSyncEnabled ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="text-sm font-black">{t('filemanager.mounts.ui.localFolder')}</div>
                        <Input
                          value={draft.sync_peer_dir}
                          onChange={(event) => setDraft((prev) => ({ ...prev, sync_peer_dir: event.target.value }))}
                          placeholder={currentPath === '/' ? '/work-folder' : currentPath}
                          className="h-12 rounded-xl border-white/10 bg-black/25 font-mono text-white placeholder:text-white/25"
                        />
                      </div>

                      <div className="grid gap-3">
                        {syncModes.map((mode) => (
                          <button
                            key={mode.id}
                            type="button"
                            aria-pressed={draft.sync_mode === mode.id}
                            onClick={() => setDraft((prev) => ({ ...prev, sync_mode: mode.id }))}
                            className={cn(
                              'rounded-2xl border px-4 py-3 text-left transition-all',
                              draft.sync_mode === mode.id ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10' : 'border-white/8 bg-black/20 hover:bg-white/[0.05]',
                            )}
                          >
                            <div className="text-sm font-black">{mode.label}</div>
                          </button>
                        ))}
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-6 text-white/55">
                        {selectedSyncMode.description}
                      </div>

                      {(draft.sync_mode === 2 || draft.sync_mode === 4) && (
                        <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-500">
                          <AlertCircle size={18} className="mt-0.5 shrink-0" />
                          <p className="text-sm leading-6">{t('filemanager.mounts.ui.syncDeleteWarning')}</p>
                        </div>
                      )}

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <div className="text-sm font-black">{t('filemanager.mounts.syncInterval')}</div>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={policy?.min_sync_interval_minutes ?? 1}
                            value={draft.sync_interval_minutes}
                            onChange={(event) => setDraft((prev) => ({ ...prev, sync_interval_minutes: event.target.value }))}
                            className="h-12 rounded-xl border-white/10 bg-black/25 text-white placeholder:text-white/25"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-black">{t('filemanager.mounts.syncTimeout')}</div>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={policy?.max_sync_timeout_secs ?? undefined}
                            value={draft.sync_timeout_secs}
                            onChange={(event) => setDraft((prev) => ({ ...prev, sync_timeout_secs: event.target.value }))}
                            className="h-12 rounded-xl border-white/10 bg-black/25 text-white placeholder:text-white/25"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-white/55">
                      {t('filemanager.mounts.ui.syncOff')}
                    </div>
                  )}
                </section>
              </div>

              <div className="xl:sticky xl:top-0 xl:self-start">
                <section className="overflow-hidden rounded-[1.9rem] border border-white/10 bg-white/[0.04] shadow-[0_22px_50px_-26px_rgba(0,0,0,0.85)] backdrop-blur-sm">
                  <div className="bg-gradient-to-br from-primary/14 via-primary/7 to-transparent px-5 py-5 sm:px-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/14 text-primary shadow-lg shadow-primary/10">
                        {driverIcon(draft.driver, 'h-6 w-6')}
                      </div>
                      <div>
                        <div className="text-lg font-black tracking-tight">{draft.name.trim() || translateDriverLabel(t, draft.driver)}</div>
                        <div className="mt-1 text-sm text-white/45">{translateDriverLabel(t, draft.driver)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-5 sm:px-6">
                    <FieldRow label={t('filemanager.mounts.ui.showAt')} value={formatMountPlacement(t, mountTargetMode === 'home' ? '/' : normalizePathInput(draft.mount_dir) || draft.mount_dir)} mono />
                    <FieldRow label={t('filemanager.mounts.ui.localFolder')} value={hasSync ? normalizePathInput(draft.sync_peer_dir) || draft.sync_peer_dir : t('filemanager.mounts.ui.syncOff')} mono={hasSync} />
                    <FieldRow label={t('filemanager.mounts.syncMode')} value={hasSync ? selectedSyncMode.label : t('filemanager.mounts.ui.syncOff')} />
                    <FieldRow label={t('filemanager.mounts.status')} value={draft.enable ? t('common.enabled') : t('common.disabled')} />

                    {editingMount && (
                      <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
                        <FieldRow label={t('filemanager.mounts.lastSyncAt')} value={formatDateTime(editingMount.last_sync_at)} />
                        <FieldRow label={t('filemanager.mounts.nextSyncAt')} value={editingMount.sync_peer_dir ? formatDateTime(editingMount.next_sync_at) : t('filemanager.mounts.ui.notScheduled')} />
                      </div>
                    )}

                    {editingMount?.last_error && (
                      <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-6 text-red-500">
                        {editingMount.last_error}
                      </div>
                    )}

                    <div className="mt-5 space-y-2">
                      {editingMount?.sync_peer_dir && (
                        <Button
                          variant="outline"
                          className="h-11 w-full rounded-xl border-white/10 bg-white/[0.03] text-sm text-white/85 hover:bg-white/[0.06] hover:text-white"
                          onClick={() => void handleSyncNow(editingMount.id)}
                          disabled={syncingId === editingMount.id}
                        >
                          <RefreshCw size={16} className={cn('mr-2', syncingId === editingMount.id && 'animate-spin')} />
                          {syncingId === editingMount.id ? t('filemanager.mounts.ui.syncing') : t('filemanager.mounts.syncNow')}
                        </Button>
                      )}

                      <Button className="h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90" onClick={() => void handleSave()} disabled={saving}>
                        {saving ? t('common.processing') : editingId ? t('filemanager.mounts.ui.applyChanges') : t('filemanager.mounts.ui.establishConnection')}
                      </Button>

                      {editingId && (
                        <Button variant="destructive" className="h-11 w-full rounded-xl text-sm" onClick={() => void handleDelete(editingId)}>
                          <Trash2 size={16} className="mr-2" />
                          {t('filemanager.mounts.ui.deleteMount')}
                        </Button>
                      )}
                    </div>

                    <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-700 dark:text-amber-300">
                      {t('filemanager.mounts.remoteDeleteNotice')}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
