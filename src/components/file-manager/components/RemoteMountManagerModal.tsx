import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/common/PasswordInput';
import { client, extractData, handleApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useToastStore } from '@/stores/toast';

type Driver = 's3' | 'webdav' | 'dropbox' | 'onedrive' | 'gdrive';

type MountDto = {
  id: string;
  name: string;
  driver: Driver;
  root: string;
  mount_dir: string;
  sync_peer_dir?: string | null;
  sync_mode: number;
  sync_interval_minutes: number;
  sync_timeout_secs: number;
  enable: boolean;
  options: Record<string, string>;
  last_sync_at?: string | null;
  next_sync_at?: string | null;
  last_sync_status?: string | null;
  last_error?: string | null;
};

type PolicyDto = {
  max_private_mounts: number;
  min_sync_interval_minutes: number;
  max_sync_timeout_secs: number;
  current_mounts: number;
};

type MountListDto = {
  mounts: MountDto[];
  policy: PolicyDto;
};

type Draft = {
  id?: string;
  name: string;
  driver: Driver;
  root: string;
  mount_dir: string;
  sync_peer_dir: string;
  sync_mode: number;
  sync_interval_minutes: string;
  sync_timeout_secs: string;
  enable: boolean;
  options: Record<string, string>;
};

type OptionField = {
  key: string;
  secret?: boolean;
  full?: boolean;
};

const DRIVER_FIELDS: Record<Driver, OptionField[]> = {
  s3: [
    { key: 'endpoint' },
    { key: 'region' },
    { key: 'bucket' },
    { key: 'access_key_id' },
    { key: 'secret_access_key', secret: true },
  ],
  webdav: [
    { key: 'endpoint', full: true },
    { key: 'username' },
    { key: 'password', secret: true },
  ],
  dropbox: [
    { key: 'access_token', secret: true },
    { key: 'refresh_token', secret: true },
    { key: 'client_id' },
    { key: 'client_secret', secret: true },
  ],
  onedrive: [
    { key: 'access_token', secret: true },
    { key: 'refresh_token', secret: true },
    { key: 'client_id' },
    { key: 'client_secret', secret: true },
  ],
  gdrive: [
    { key: 'access_token', secret: true },
    { key: 'refresh_token', secret: true },
    { key: 'client_id' },
    { key: 'client_secret', secret: true },
  ],
};

const SYNC_MODE_OPTIONS = [
  { value: 1, labelKey: 'filemanager.mounts.syncModes.1' },
  { value: 2, labelKey: 'filemanager.mounts.syncModes.2' },
  { value: 3, labelKey: 'filemanager.mounts.syncModes.3' },
  { value: 4, labelKey: 'filemanager.mounts.syncModes.4' },
  { value: 5, labelKey: 'filemanager.mounts.syncModes.5' },
];

const formatDateTime = (value?: string | null): string => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const driverLabelKey = (driver: Driver) => `admin.config.storage.drivers.${driver}`;
const fieldLabelKey = (driver: Driver, key: string) => `setup.storagePool.${driver}.${key}`;
const fieldHintKey = (driver: Driver, key: string) => driver === 's3'
  ? `setup.storagePool.s3Hints.${key}`
  : `setup.storagePool.${driver}Hints.${key}`;

const createDraft = (currentPath: string, policy?: PolicyDto | null, mountCount?: number): Draft => {
  const baseName = currentPath === '/' ? '/remote-mount' : `${currentPath.replace(/\/$/, '')}/remote-mount`;
  return {
    name: '',
    driver: 'webdav',
    root: '/',
    mount_dir: `${baseName}-${(mountCount ?? 0) + 1}`,
    sync_peer_dir: currentPath,
    sync_mode: 5,
    sync_interval_minutes: String(policy?.min_sync_interval_minutes ?? 5),
    sync_timeout_secs: String(policy?.max_sync_timeout_secs ?? 900),
    enable: true,
    options: {},
  };
};

const mountToDraft = (mount: MountDto): Draft => ({
  id: mount.id,
  name: mount.name,
  driver: mount.driver,
  root: mount.root,
  mount_dir: mount.mount_dir,
  sync_peer_dir: mount.sync_peer_dir ?? '',
  sync_mode: mount.sync_mode,
  sync_interval_minutes: String(mount.sync_interval_minutes),
  sync_timeout_secs: String(mount.sync_timeout_secs),
  enable: mount.enable,
  options: { ...mount.options },
});

export const RemoteMountManagerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  onChanged?: () => void;
}> = ({ isOpen, onClose, currentPath, onChanged }) => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounts, setMounts] = useState<MountDto[]>([]);
  const [policy, setPolicy] = useState<PolicyDto | null>(null);
  const [draft, setDraft] = useState<Draft>(() => createDraft(currentPath, null, 0));
  const [editingId, setEditingId] = useState<string | null>(null);

  const canCreateNew = useMemo(() => {
    if (!policy) return true;
    if (editingId) return true;
    return policy.current_mounts < policy.max_private_mounts;
  }, [editingId, policy]);

  const refreshMounts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await extractData<MountListDto>(client.GET('/api/v1/file/mounts'));
      setMounts(result.mounts);
      setPolicy(result.policy);
      if (!editingId) {
        setDraft(createDraft(currentPath, result.policy, result.mounts.length));
      }
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, currentPath, editingId, t]);

  useEffect(() => {
    if (!isOpen) return;
    void refreshMounts();
  }, [isOpen, refreshMounts]);

  useEffect(() => {
    if (!isOpen || editingId) return;
    setDraft(createDraft(currentPath, policy, mounts.length));
  }, [currentPath, editingId, isOpen, mounts.length, policy]);

  const resetDraft = () => {
    setEditingId(null);
    setDraft(createDraft(currentPath, policy, mounts.length));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        driver: draft.driver,
        root: draft.root.trim(),
        mount_dir: draft.mount_dir.trim(),
        sync_peer_dir: draft.sync_peer_dir.trim() || null,
        sync_mode: draft.sync_mode,
        sync_interval_minutes: Number.parseInt(draft.sync_interval_minutes, 10),
        sync_timeout_secs: Number.parseInt(draft.sync_timeout_secs, 10),
        enable: draft.enable,
        options: Object.fromEntries(Object.entries(draft.options).filter(([key]) => key.trim().length > 0)),
      };
      const request = editingId
        ? client.PUT('/api/v1/file/mounts/{mount_id}', {
          params: { path: { mount_id: editingId } },
          body: payload,
        })
        : client.POST('/api/v1/file/mounts', { body: payload });
      await extractData<MountDto>(request);
      addToast(t('filemanager.mounts.messages.saved') || 'Saved', 'success');
      resetDraft();
      await refreshMounts();
      onChanged?.();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (mountId: string) => {
    if (!window.confirm(t('filemanager.mounts.messages.confirmDelete') || 'Delete this mount?')) return;
    try {
      await extractData(client.DELETE('/api/v1/file/mounts/{mount_id}', {
        params: { path: { mount_id: mountId } },
      }));
      addToast(t('filemanager.mounts.messages.deleted') || 'Deleted', 'success');
      if (editingId === mountId) {
        resetDraft();
      }
      await refreshMounts();
      onChanged?.();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const handleSync = async (mountId: string) => {
    try {
      await extractData(client.POST('/api/v1/file/mounts/{mount_id}/sync', {
        params: { path: { mount_id: mountId } },
      }));
      addToast(t('filemanager.mounts.messages.synced') || 'Synchronized', 'success');
      await refreshMounts();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('filemanager.mounts.title') || 'Remote Mounts'}
      maxWidth="max-w-6xl"
      bodyClassName="space-y-4"
    >
      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black uppercase tracking-widest opacity-70">
                  {t('filemanager.mounts.policyTitle') || 'Policy'}
                </div>
                <div className="mt-2 grid gap-2 text-sm md:grid-cols-3">
                  <div>{t('filemanager.mounts.maxPrivateMounts')}: <span className="font-black">{policy?.current_mounts ?? 0} / {policy?.max_private_mounts ?? '-'}</span></div>
                  <div>{t('filemanager.mounts.minSyncInterval')}: <span className="font-black">{policy?.min_sync_interval_minutes ?? '-'} min</span></div>
                  <div>{t('filemanager.mounts.maxSyncTimeout')}: <span className="font-black">{policy?.max_sync_timeout_secs ?? '-'} s</span></div>
                </div>
                <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  {t('filemanager.mounts.remoteDeleteNotice') || 'Deleting inside a mounted directory removes remote objects immediately and does not use the recycle bin.'}
                </div>
              </div>
              <Button variant="ghost" onClick={() => void refreshMounts()} className="shrink-0">
                <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-black uppercase tracking-widest opacity-70">
              {t('filemanager.mounts.listTitle') || 'Configured Mounts'}
            </div>
            <Button disabled={!canCreateNew} onClick={resetDraft} className="gap-2">
              <Plus size={16} />
              {t('filemanager.mounts.add') || 'Add Mount'}
            </Button>
          </div>

          <div className="space-y-3">
            {mounts.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-5 text-sm opacity-70">
                {t('filemanager.mounts.empty') || 'No private remote mounts yet.'}
              </div>
            )}
            {mounts.map((mount) => (
              <div key={mount.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-base font-black">{mount.name || mount.mount_dir}</div>
                    <div className="text-sm opacity-70">{t(driverLabelKey(mount.driver)) || mount.driver}</div>
                    <div className="text-sm font-mono opacity-70">{mount.mount_dir}</div>
                    <div className="text-sm opacity-60">
                      {t('filemanager.mounts.syncPeer') || 'Sync Peer'}: {mount.sync_peer_dir || '-'}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => {
                      setDraft(mountToDraft(mount));
                      setEditingId(mount.id);
                    }}>
                      {t('common.edit') || 'Edit'}
                    </Button>
                    <Button variant="ghost" onClick={() => void handleSync(mount.id)}>
                      {t('filemanager.mounts.syncNow') || 'Sync Now'}
                    </Button>
                    <Button variant="ghost" onClick={() => void handleDelete(mount.id)} className="text-rose-500 hover:text-rose-500 gap-2">
                      <Trash2 size={16} />
                      {t('common.delete') || 'Delete'}
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-4">
                  <div>{t('filemanager.mounts.status') || 'Status'}: <span className="font-black">{mount.last_sync_status || '-'}</span></div>
                  <div>{t('filemanager.mounts.lastSyncAt') || 'Last Sync'}: <span className="font-black">{formatDateTime(mount.last_sync_at)}</span></div>
                  <div>{t('filemanager.mounts.nextSyncAt') || 'Next Sync'}: <span className="font-black">{formatDateTime(mount.next_sync_at)}</span></div>
                  <div>{t('filemanager.mounts.syncMode') || 'Mode'}: <span className="font-black">{t(`filemanager.mounts.syncModes.${mount.sync_mode}`) || mount.sync_mode}</span></div>
                </div>
                {mount.last_error && (
                  <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-400">
                    {mount.last_error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black uppercase tracking-widest opacity-70">
                {editingId ? (t('filemanager.mounts.editTitle') || 'Edit Mount') : (t('filemanager.mounts.newTitle') || 'New Mount')}
              </div>
              <div className="mt-1 text-sm opacity-60">
                {t('filemanager.mounts.formHint') || 'Mount a private remote storage into a VFS directory and optionally sync it with another local directory.'}
              </div>
            </div>
            {editingId && <Button variant="ghost" onClick={resetDraft}>{t('common.cancel') || 'Cancel'}</Button>}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-black md:col-span-2">
              {t('admin.config.storage.fields.name') || 'Name'}
              <input className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} />
            </label>
            <label className="text-sm font-black">
              {t('admin.config.storage.fields.driver') || 'Driver'}
              <select className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" value={draft.driver} onChange={(e) => setDraft((prev) => ({ ...prev, driver: e.target.value as Driver, root: '/' }))}>
                {(Object.keys(DRIVER_FIELDS) as Driver[]).map((driver) => (
                  <option key={driver} value={driver}>{t(driverLabelKey(driver)) || driver}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-black">
              {t('filemanager.mounts.root') || 'Remote Root'}
              <input className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-mono" value={draft.root} onChange={(e) => setDraft((prev) => ({ ...prev, root: e.target.value }))} />
            </label>
            <label className="text-sm font-black md:col-span-2">
              {t('filemanager.mounts.mountDir') || 'Mount Directory'}
              <input className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-mono" value={draft.mount_dir} onChange={(e) => setDraft((prev) => ({ ...prev, mount_dir: e.target.value }))} />
            </label>
            <label className="text-sm font-black md:col-span-2">
              {t('filemanager.mounts.syncPeer') || 'Sync Peer Directory'}
              <input className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-mono" value={draft.sync_peer_dir} onChange={(e) => setDraft((prev) => ({ ...prev, sync_peer_dir: e.target.value }))} />
            </label>
            <label className="text-sm font-black">
              {t('filemanager.mounts.syncMode') || 'Sync Mode'}
              <select className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" value={draft.sync_mode} onChange={(e) => setDraft((prev) => ({ ...prev, sync_mode: Number(e.target.value) }))}>
                {SYNC_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{t(option.labelKey) || String(option.value)}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-black">
              {t('filemanager.mounts.syncInterval') || 'Sync Interval (minutes)'}
              <input className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-mono" value={draft.sync_interval_minutes} onChange={(e) => setDraft((prev) => ({ ...prev, sync_interval_minutes: e.target.value }))} />
            </label>
            <label className="text-sm font-black">
              {t('filemanager.mounts.syncTimeout') || 'Sync Timeout (seconds)'}
              <input className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-mono" value={draft.sync_timeout_secs} onChange={(e) => setDraft((prev) => ({ ...prev, sync_timeout_secs: e.target.value }))} />
            </label>
            <label className="flex items-center gap-3 text-sm font-black md:col-span-2">
              <input type="checkbox" checked={draft.enable} onChange={(e) => setDraft((prev) => ({ ...prev, enable: e.target.checked }))} />
              {t('admin.config.storage.fields.enabled') || 'Enabled'}
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {DRIVER_FIELDS[draft.driver].map((field) => {
              const inputId = `mount-${draft.driver}-${field.key}`;
              return (
              <div key={`${draft.driver}-${field.key}`} className={cn('text-sm', field.full && 'md:col-span-2')}>
                <label htmlFor={inputId} className="font-black">
                  {t(fieldLabelKey(draft.driver, field.key)) || field.key}
                </label>
                {field.secret ? (
                  <PasswordInput
                    id={inputId}
                    wrapperClassName="mt-1"
                    inputClassName="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-mono"
                    value={draft.options[field.key] ?? ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, options: { ...prev.options, [field.key]: e.target.value } }))}
                  />
                ) : (
                  <input
                    id={inputId}
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-mono"
                    value={draft.options[field.key] ?? ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, options: { ...prev.options, [field.key]: e.target.value } }))}
                  />
                )}
                <div className="mt-1 text-xs opacity-60">{t(fieldHintKey(draft.driver, field.key)) || ''}</div>
              </div>
            )})}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={resetDraft}>{t('filemanager.mounts.reset') || 'Reset'}</Button>
            <Button onClick={() => void handleSave()} disabled={saving || (!editingId && !canCreateNew)}>
              {saving ? (t('common.processing') || 'Processing') : (t('common.save') || 'Save')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
