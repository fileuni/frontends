import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Cloud,
  Database,
  FolderOpen,
  FolderSync,
  HardDrive,
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
import { PasswordInput } from '@/components/common/PasswordInput';
import { cn } from '@/lib/utils';

type Driver = 'fs' | 's3' | 'webdav' | 'dropbox' | 'onedrive' | 'gdrive' | 'android_saf' | 'ios_scoped_fs' | 'memory';
type RemoteDriver = 's3' | 'webdav' | 'dropbox' | 'onedrive' | 'gdrive';
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

const translateDriverLabel = (_t: TFunction, driver: Driver): string => {
  switch (driver) {
    case 's3': return 'S3';
    case 'webdav': return 'WebDAV';
    case 'dropbox': return 'Dropbox';
    case 'onedrive': return 'OneDrive';
    case 'gdrive': return 'Google Drive';
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

const DRIVER_ORDER: RemoteDriver[] = ['s3', 'webdav', 'dropbox', 'onedrive', 'gdrive'];

const FieldRow = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex items-start justify-between gap-4 border-b border-border/60 py-3 last:border-b-0 last:pb-0 first:pt-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={cn('max-w-[60%] text-right text-sm font-semibold', mono && 'font-mono text-[13px]')}>{value}</span>
  </div>
);

const SummaryCard = ({
  t,
  draft,
  mountTargetMode,
  hasSync,
  selectedSyncMode,
  editingMount,
}: {
  t: TFunction;
  draft: Draft;
  mountTargetMode: 'home' | 'subdir';
  hasSync: boolean;
  selectedSyncMode: { id: number; label: string; description: string };
  editingMount: MountDto | null;
}) => (
  <section className="overflow-hidden rounded-[1.5rem] border border-border bg-card/60 shadow-sm">
    <div className="border-b border-border/70 bg-primary/5 px-4 py-4 sm:px-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {driverIcon(draft.driver, 'h-5 w-5')}
        </div>
        <div className="min-w-0">
          <div className="truncate text-base font-black tracking-tight">{draft.name.trim() || translateDriverLabel(t, draft.driver)}</div>
          <div className="mt-0.5 text-sm text-muted-foreground">{translateDriverLabel(t, draft.driver)}</div>
        </div>
      </div>
    </div>

    <div className="px-4 py-4 sm:px-5">
      <FieldRow label={t('filemanager.mounts.ui.showAt')} value={formatMountPlacement(t, mountTargetMode === 'home' ? '/' : normalizePathInput(draft.mount_dir) || draft.mount_dir)} mono />
      <FieldRow label={t('filemanager.mounts.ui.localFolder')} value={hasSync ? normalizePathInput(draft.sync_peer_dir) || draft.sync_peer_dir : t('filemanager.mounts.ui.syncOff')} mono={hasSync} />
      <FieldRow label={t('filemanager.mounts.syncMode')} value={hasSync ? selectedSyncMode.label : t('filemanager.mounts.ui.syncOff')} />
      <FieldRow label={t('filemanager.mounts.status')} value={draft.enable ? t('common.enabled') : t('common.disabled')} />

      {editingMount && (
        <div className="mt-4 rounded-2xl border border-border/70 bg-background/70 p-4">
          <FieldRow label={t('filemanager.mounts.lastSyncAt')} value={formatDateTime(editingMount.last_sync_at)} />
          <FieldRow label={t('filemanager.mounts.nextSyncAt')} value={editingMount.sync_peer_dir ? formatDateTime(editingMount.next_sync_at) : t('filemanager.mounts.ui.notScheduled')} />
        </div>
      )}

      {editingMount?.last_error && (
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-6 text-red-500">
          {editingMount.last_error}
        </div>
      )}
    </div>
  </section>
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
    if (!isOpen || loading) return;
    const firstMount = mounts[0] ?? null;
    if (firstMount) {
      setEditingId(firstMount.id);
      setDraft(mountToDraft(firstMount));
    } else {
      setEditingId(null);
      setDraft(createDraft(currentPath));
    }
  }, [currentPath, isOpen, loading, mounts]);

  useEffect(() => {
    if (isOpen) return;
    setEditingId(null);
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
  const editingMount = mounts.find((mount) => mount.id === editingId) ?? mounts[0] ?? null;

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

  const mutedSegmentText = 'text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/12';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || t('filemanager.mounts.title')}
      maxWidth="max-w-5xl"
      className="rounded-[1.75rem] border border-border bg-background text-foreground shadow-2xl"
      bodyClassName="overflow-hidden bg-background p-0"
    >
      <div className="flex min-h-[560px] max-h-[calc(100dvh-1rem)] flex-col bg-background text-foreground sm:max-h-[calc(100dvh-2rem)]">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-4 py-4 sm:px-6 sm:py-5">
          {loading ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-[1.5rem] bg-card/25 text-muted-foreground">
              <p className="text-sm">{t('common.loading')}</p>
            </div>
          ) : (
            <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-h-0 space-y-4">
                <section className="rounded-[1.5rem] bg-card/70 p-4 shadow-sm sm:p-5">
                  <div className="mb-4 inline-flex w-full flex-wrap items-center justify-center rounded-full bg-slate-100/90 p-1 dark:bg-white/[0.05] sm:justify-start">
                    {DRIVER_ORDER.map((driver) => {
                      const active = draft.driver === driver;
                      return (
                        <button
                          key={driver}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setDraft((prev) => ({ ...prev, driver, options: {} }))}
                          className={cn(
                            'inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-bold transition-colors sm:flex-none',
                            active
                              ? 'bg-primary text-white shadow-sm dark:text-white'
                              : mutedSegmentText,
                          )}
                        >
                          {driverIcon(driver, 'h-4 w-4')}
                          <span>{translateDriverLabel(t, driver)}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <div className="text-sm font-black">{t('common.name')}</div>
                      <Input value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} />
                    </div>

                    {DRIVER_FIELDS[draft.driver].map((field) => (
                      <div key={field.key} className={cn('space-y-2', field.wide && 'md:col-span-2')}>
                        <div className="text-sm font-black">{translateFieldLabel(t, draft.driver, field.key)}</div>
                        {field.secret ? (
                          <PasswordInput
                            value={draft.options[field.key] ?? ''}
                            onChange={(event) => setDraft((prev) => ({ ...prev, options: { ...prev.options, [field.key]: event.target.value } }))}
                          />
                        ) : (
                          <Input
                            value={draft.options[field.key] ?? ''}
                            onChange={(event) => setDraft((prev) => ({ ...prev, options: { ...prev.options, [field.key]: event.target.value } }))}
                            className={field.key === 'endpoint' ? 'font-mono' : undefined}
                          />
                        )}
                      </div>
                    ))}

                    <div className="space-y-2 md:col-span-2">
                      <div className="text-sm font-black">{t('filemanager.mounts.root')}</div>
                      <Input value={draft.root} onChange={(event) => setDraft((prev) => ({ ...prev, root: event.target.value }))} className="font-mono" placeholder="/" />
                    </div>
                  </div>
                </section>

                <section className="rounded-[1.5rem] bg-card/70 p-4 shadow-sm sm:p-5">
                  <div className="mb-4 text-sm font-black tracking-tight">{t('filemanager.mounts.ui.locationTitle')}</div>
                  <div className="inline-flex w-full items-center rounded-full bg-slate-100/90 p-1 dark:bg-white/[0.05]">
                    <button
                      type="button"
                      aria-pressed={mountTargetMode === 'home'}
                      onClick={() => changeMountTargetMode('home')}
                      className={cn(
                        'flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-black transition-colors',
                        mountTargetMode === 'home'
                          ? 'bg-primary text-white shadow-sm dark:text-white'
                          : mutedSegmentText,
                      )}
                    >
                      <HardDrive size={16} />
                      <span>{t('filemanager.mounts.ui.mainFolder')}</span>
                    </button>

                    <button
                      type="button"
                      aria-pressed={mountTargetMode === 'subdir'}
                      onClick={() => changeMountTargetMode('subdir')}
                      className={cn(
                        'flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-black transition-colors',
                        mountTargetMode === 'subdir'
                          ? 'bg-primary text-white shadow-sm dark:text-white'
                          : mutedSegmentText,
                      )}
                    >
                      <FolderOpen size={16} />
                      <span>{t('filemanager.mounts.ui.separateFolder')}</span>
                    </button>
                  </div>

                  {mountTargetMode === 'subdir' && (
                    <div className="mt-4 space-y-2">
                      <div className="text-sm font-black">{t('filemanager.mounts.mountDir')}</div>
                      <Input
                        value={draft.mount_dir}
                        onChange={(event) => setDraft((prev) => ({ ...prev, mount_dir: event.target.value }))}
                        placeholder={defaultSubdirMountPath(currentPath)}
                        className="font-mono"
                      />
                    </div>
                  )}
                </section>

                <section className="rounded-[1.5rem] bg-gradient-to-br from-primary/[0.05] via-card to-card p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="text-sm font-black tracking-tight">{t('filemanager.mounts.ui.syncTitle')}</div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground">{t('filemanager.mounts.ui.enableSync')}</span>
                      <Switch checked={effectiveSyncEnabled} onChange={(value) => setDraft((prev) => ({ ...prev, sync_enabled: value }))} disabled={mountTargetMode === 'home'} />
                    </div>
                  </div>

                  {mountTargetMode === 'home' ? (
                    <div className="rounded-2xl bg-background/70 p-4 text-sm text-muted-foreground">
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
                          className="font-mono"
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
                              'rounded-2xl px-4 py-3 text-left transition-all',
                              draft.sync_mode === mode.id ? 'bg-primary/10 shadow-sm outline outline-1 outline-primary/25' : 'bg-background/70 hover:bg-accent',
                            )}
                          >
                            <div className="text-sm font-black">{mode.label}</div>
                          </button>
                        ))}
                      </div>

                      <div className="rounded-2xl bg-background/80 p-4 text-sm leading-6 text-muted-foreground">
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
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-background/70 p-4 text-sm text-muted-foreground">
                      {t('filemanager.mounts.ui.syncOff')}
                    </div>
                  )}
                </section>
              </div>

              <div className="hidden xl:block xl:self-start">
                <SummaryCard
                  t={t}
                  draft={draft}
                  mountTargetMode={mountTargetMode}
                  hasSync={hasSync}
                  selectedSyncMode={selectedSyncMode}
                  editingMount={editingMount}
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border bg-background/95 px-4 py-4 backdrop-blur-md sm:px-6">
          <div className="space-y-3 xl:hidden">
            <SummaryCard
              t={t}
              draft={draft}
              mountTargetMode={mountTargetMode}
              hasSync={hasSync}
              selectedSyncMode={selectedSyncMode}
              editingMount={editingMount}
            />
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <div className="text-sm text-muted-foreground sm:mr-auto sm:self-center">
              {t('filemanager.mounts.remoteDeleteNotice')}
            </div>

            {editingMount?.sync_peer_dir && (
              <Button
                variant="outline"
                className="h-11 rounded-xl text-sm sm:w-auto"
                onClick={() => void handleSyncNow(editingMount.id)}
                disabled={syncingId === editingMount.id}
              >
                <FolderSync size={16} className={cn('mr-2', syncingId === editingMount.id && 'animate-spin')} />
                {syncingId === editingMount.id ? t('filemanager.mounts.ui.syncing') : t('filemanager.mounts.syncNow')}
              </Button>
            )}

            {editingId && (
              <Button variant="destructive" className="h-11 rounded-xl text-sm sm:w-auto" onClick={() => void handleDelete(editingId)}>
                <Trash2 size={16} className="mr-2" />
                {t('filemanager.mounts.ui.deleteMount')}
              </Button>
            )}

            <Button className="h-11 rounded-xl text-sm font-bold sm:w-auto" onClick={() => void handleSave()} disabled={saving}>
              {saving ? t('common.processing') : editingId ? t('filemanager.mounts.ui.applyChanges') : t('filemanager.mounts.ui.establishConnection')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
