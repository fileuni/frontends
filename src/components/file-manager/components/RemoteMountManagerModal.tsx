import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  Plus, 
  RefreshCw, 
  Trash2, 
  Cloud, 
  Database, 
  Server, 
  HardDrive, 
  ChevronDown, 
  ChevronRight,
  FolderSync,
  CloudOff,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronLeft,
  Settings
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
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

type AdminMountUserDto = {
  user_id: string;
  username: string;
  role_id: number;
};

type AdminMountRecordDto = {
  user: AdminMountUserDto;
  mount: MountDto;
  policy: PolicyDto;
};

type AdminMountListDto = {
  items: AdminMountRecordDto[];
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
    { key: 'endpoint', full: true },
    { key: 'region' },
    { key: 'bucket' },
    { key: 'access_key_id', full: true },
    { key: 'secret_access_key', secret: true, full: true },
  ],
  webdav: [
    { key: 'endpoint', full: true },
    { key: 'username' },
    { key: 'password', secret: true },
  ],
  dropbox: [
    { key: 'client_id' },
    { key: 'client_secret', secret: true },
    { key: 'access_token', secret: true, full: true },
    { key: 'refresh_token', secret: true, full: true },
  ],
  onedrive: [
    { key: 'client_id' },
    { key: 'client_secret', secret: true },
    { key: 'access_token', secret: true, full: true },
    { key: 'refresh_token', secret: true, full: true },
  ],
  gdrive: [
    { key: 'client_id' },
    { key: 'client_secret', secret: true },
    { key: 'access_token', secret: true, full: true },
    { key: 'refresh_token', secret: true, full: true },
  ],
};

const SYNC_MODE_OPTIONS = [
  { value: 1 },
  { value: 2 },
  { value: 3 },
  { value: 4 },
  { value: 5 },
];

const formatDateTime = (value?: string | null): string => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const translateDriverLabel = (t: TFunction, driver: Driver): string => {
  switch (driver) {
    case 's3': return t('admin.config.storage.drivers.s3');
    case 'webdav': return t('admin.config.storage.drivers.webdav');
    case 'dropbox': return t('admin.config.storage.drivers.dropbox');
    case 'onedrive': return t('admin.config.storage.drivers.onedrive');
    case 'gdrive': return t('admin.config.storage.drivers.gdrive');
  }
};

const DriverIcon = ({ driver, className }: { driver: Driver, className?: string }) => {
  switch (driver) {
    case 's3': return <Database className={className} />;
    case 'webdav': return <Server className={className} />;
    case 'dropbox': return <Cloud className={className} />;
    case 'onedrive': return <Cloud className={className} />;
    case 'gdrive': return <Cloud className={className} />;
    default: return <HardDrive className={className} />;
  }
};

const translateFieldLabel = (t: TFunction, driver: Driver, key: string): string => {
  switch (driver) {
    case 's3':
      switch (key) {
        case 'endpoint': return t('systemConfig.setup.storagePool.s3.endpoint');
        case 'region': return t('systemConfig.setup.storagePool.s3.region');
        case 'bucket': return t('systemConfig.setup.storagePool.s3.bucket');
        case 'access_key_id': return t('systemConfig.setup.storagePool.s3.access_key_id');
        case 'secret_access_key': return t('systemConfig.setup.storagePool.s3.secret_access_key');
      }
      break;
    case 'webdav':
      switch (key) {
        case 'endpoint': return t('systemConfig.setup.storagePool.webdav.endpoint');
        case 'username': return t('systemConfig.setup.storagePool.webdav.username');
        case 'password': return t('systemConfig.setup.storagePool.webdav.password');
      }
      break;
    case 'dropbox':
      switch (key) {
        case 'access_token': return t('systemConfig.setup.storagePool.dropbox.access_token');
        case 'refresh_token': return t('systemConfig.setup.storagePool.dropbox.refresh_token');
        case 'client_id': return t('systemConfig.setup.storagePool.dropbox.client_id');
        case 'client_secret': return t('systemConfig.setup.storagePool.dropbox.client_secret');
      }
      break;
    case 'onedrive':
      switch (key) {
        case 'access_token': return t('systemConfig.setup.storagePool.onedrive.access_token');
        case 'refresh_token': return t('systemConfig.setup.storagePool.onedrive.refresh_token');
        case 'client_id': return t('systemConfig.setup.storagePool.onedrive.client_id');
        case 'client_secret': return t('systemConfig.setup.storagePool.onedrive.client_secret');
      }
      break;
    case 'gdrive':
      switch (key) {
        case 'access_token': return t('systemConfig.setup.storagePool.gdrive.access_token');
        case 'refresh_token': return t('systemConfig.setup.storagePool.gdrive.refresh_token');
        case 'client_id': return t('systemConfig.setup.storagePool.gdrive.client_id');
        case 'client_secret': return t('systemConfig.setup.storagePool.gdrive.client_secret');
      }
      break;
  }
  return key;
};

const translateFieldHint = (t: TFunction, driver: Driver, key: string): string => {
  switch (driver) {
    case 's3':
      switch (key) {
        case 'endpoint': return t('systemConfig.setup.storagePool.s3Hints.endpoint');
        case 'region': return t('systemConfig.setup.storagePool.s3Hints.region');
        case 'bucket': return t('systemConfig.setup.storagePool.s3Hints.bucket');
        case 'access_key_id': return t('systemConfig.setup.storagePool.s3Hints.access_key_id');
        case 'secret_access_key': return t('systemConfig.setup.storagePool.s3Hints.secret_access_key');
      }
      break;
    case 'webdav':
      switch (key) {
        case 'endpoint': return t('systemConfig.setup.storagePool.webdavHints.endpoint');
        case 'username': return t('systemConfig.setup.storagePool.webdavHints.username');
        case 'password': return t('systemConfig.setup.storagePool.webdavHints.password');
      }
      break;
    case 'dropbox':
      switch (key) {
        case 'access_token': return t('systemConfig.setup.storagePool.dropboxHints.access_token');
        case 'refresh_token': return t('systemConfig.setup.storagePool.dropboxHints.refresh_token');
        case 'client_id': return t('systemConfig.setup.storagePool.dropboxHints.client_id');
        case 'client_secret': return t('systemConfig.setup.storagePool.dropboxHints.client_secret');
      }
      break;
    case 'onedrive':
      switch (key) {
        case 'access_token': return t('systemConfig.setup.storagePool.onedriveHints.access_token');
        case 'refresh_token': return t('systemConfig.setup.storagePool.onedriveHints.refresh_token');
        case 'client_id': return t('systemConfig.setup.storagePool.onedriveHints.client_id');
        case 'client_secret': return t('systemConfig.setup.storagePool.onedriveHints.client_secret');
      }
      break;
    case 'gdrive':
      switch (key) {
        case 'access_token': return t('systemConfig.setup.storagePool.gdriveHints.access_token');
        case 'refresh_token': return t('systemConfig.setup.storagePool.gdriveHints.refresh_token');
        case 'client_id': return t('systemConfig.setup.storagePool.gdriveHints.client_id');
        case 'client_secret': return t('systemConfig.setup.storagePool.gdriveHints.client_secret');
      }
      break;
  }
  return '';
};

const translateSyncModeLabel = (t: TFunction, mode: number): string | null => {
  switch (mode) {
    case 1: return t('filemanager.mounts.syncModes.1');
    case 2: return t('filemanager.mounts.syncModes.2');
    case 3: return t('filemanager.mounts.syncModes.3');
    case 4: return t('filemanager.mounts.syncModes.4');
    case 5: return t('filemanager.mounts.syncModes.5');
    default: return null;
  }
};

const createDraft = (currentPath: string, policy?: PolicyDto | null, mountCount?: number): Draft => {
  const baseName = currentPath === '/' ? '/remote-mount' : `${currentPath.replace(/\/$/, '')}/remote-mount`;
  return {
    name: '',
    driver: 'webdav',
    root: '/',
    mount_dir: `${baseName}-${(mountCount ?? 0) + 1}`,
    sync_peer_dir: '',
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
  targetUserId?: string;
  title?: string;
}> = ({ isOpen, onClose, currentPath, onChanged, targetUserId, title }) => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounts, setMounts] = useState<MountDto[]>([]);
  const [policy, setPolicy] = useState<PolicyDto | null>(null);
  const [draft, setDraft] = useState<Draft>(() => createDraft(currentPath, null, 0));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mobileDetailView, setMobileDetailView] = useState(false);

  const canCreateNew = useMemo(() => {
    if (!policy) return true;
    if (editingId) return true;
    return policy.current_mounts < policy.max_private_mounts;
  }, [editingId, policy]);

  const refreshMounts = useCallback(async () => {
    setLoading(true);
    try {
      if (targetUserId) {
        const result = await extractData<AdminMountListDto>(client.GET('/api/v1/file/admin/mounts', {}));
        const userItems = result.items.filter((item) => item.user.user_id === targetUserId);
        setMounts(userItems.map((item) => item.mount));
        setPolicy(userItems[0]?.policy ?? null);
        if (!editingId) {
          setDraft(createDraft(currentPath, userItems[0]?.policy ?? null, userItems.length));
        }
      } else {
        const result = await extractData<MountListDto>(client.GET('/api/v1/file/mounts', {}));
        setMounts(result.mounts);
        setPolicy(result.policy);
        if (!editingId) {
          setDraft(createDraft(currentPath, result.policy, result.mounts.length));
        }
      }
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, currentPath, editingId, t, targetUserId]);

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
    setShowAdvanced(false);
    setMobileDetailView(true);
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
      const request = targetUserId
        ? editingId
          ? client.PUT('/api/v1/file/admin/mounts/{user_id}/{mount_id}', {
            params: { path: { user_id: targetUserId, mount_id: editingId } },
            body: payload,
          })
          : client.POST('/api/v1/file/admin/mounts/{user_id}', {
            params: { path: { user_id: targetUserId } },
            body: payload,
          })
        : editingId
          ? client.PUT('/api/v1/file/mounts/{mount_id}', {
            params: { path: { mount_id: editingId } },
            body: payload,
          })
          : client.POST('/api/v1/file/mounts', { body: payload });
      await extractData<MountDto>(request);
      addToast(t('filemanager.mounts.messages.saved') || 'Saved', 'success');
      resetDraft();
      setMobileDetailView(false);
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
      if (targetUserId) {
        await extractData(client.DELETE('/api/v1/file/admin/mounts/{user_id}/{mount_id}', {
          params: { path: { user_id: targetUserId, mount_id: mountId } },
        }));
      } else {
        await extractData(client.DELETE('/api/v1/file/mounts/{mount_id}', {
          params: { path: { mount_id: mountId } },
        }));
      }
      addToast(t('filemanager.mounts.messages.deleted') || 'Deleted', 'success');
      if (editingId === mountId) {
        resetDraft();
        setMobileDetailView(false);
      }
      await refreshMounts();
      onChanged?.();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const handleSync = async (mountId: string) => {
    try {
      if (targetUserId) {
        await extractData(client.POST('/api/v1/file/admin/mounts/{user_id}/{mount_id}/sync', {
          params: { path: { user_id: targetUserId, mount_id: mountId } },
        }));
      } else {
        await extractData(client.POST('/api/v1/file/mounts/{mount_id}/sync', {
          params: { path: { mount_id: mountId } },
        }));
      }
      addToast(t('filemanager.mounts.messages.synced') || 'Synchronized', 'success');
      await refreshMounts();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const selectedMount = useMemo(() => mounts.find(m => m.id === editingId), [editingId, mounts]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || t('filemanager.mounts.title') || 'Remote Mounts'}
      maxWidth="max-w-6xl"
      bodyClassName="p-0 bg-background overflow-hidden"
    >
      <div className="flex flex-col md:grid md:grid-cols-[300px_1fr] lg:grid-cols-[360px_1fr] h-[85vh] md:h-[75vh] lg:h-[80vh] min-h-[550px] overflow-hidden">
        {/* Left Side: Mount List */}
        <div className={cn(
          "flex flex-col border-r border-border bg-muted/20 overflow-hidden h-full",
          mobileDetailView ? "hidden md:flex" : "flex"
        )}>
          <div className="p-4 border-b border-border flex items-center justify-between gap-3 shrink-0 bg-background/50 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <FolderSync size={18} />
              </div>
              <span className="font-bold text-sm tracking-tight">{t('filemanager.mounts.listTitle')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => void refreshMounts()} title="Refresh">
                <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
              </Button>
              <Button disabled={!canCreateNew} onClick={resetDraft} size="icon" className="h-8 w-8 rounded-full" variant="secondary" title="Add Mount">
                <Plus size={16} />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
            {mounts.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center text-center p-8 text-muted-foreground mt-8">
                <div className="relative mb-4">
                  <CloudOff size={48} className="opacity-10" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Plus size={18} className="opacity-40 animate-pulse" />
                  </div>
                </div>
                <p className="text-sm font-bold opacity-80">{t('filemanager.mounts.ui.noMountsTitle')}</p>
                <p className="text-[11px] opacity-50 mt-1 max-w-[180px] leading-relaxed">{t('filemanager.mounts.ui.noMountsDesc')}</p>
                <Button variant="outline" size="sm" className="mt-4 h-8 text-xs font-semibold px-6 rounded-full" onClick={resetDraft}>
                   {t('filemanager.mounts.ui.getStarted')}
                </Button>
              </div>
            )}
            
            {mounts.map((mount) => {
              const isSelected = editingId === mount.id;
              const hasError = Boolean(mount.last_error);
              const isSyncing = mount.last_sync_status?.toLowerCase() === 'syncing';
              
              return (
                <div 
                  key={mount.id} 
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "group relative rounded-xl border p-3.5 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20",
                    isSelected 
                      ? "border-primary bg-background shadow-md shadow-primary/5 ring-1 ring-primary/10" 
                      : "border-transparent bg-background/40 hover:bg-background/80 hover:border-border/60",
                    !mount.enable && "opacity-60"
                  )}
                  onClick={() => {
                    setDraft(mountToDraft(mount));
                    setEditingId(mount.id);
                    setMobileDetailView(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setDraft(mountToDraft(mount));
                      setEditingId(mount.id);
                      setMobileDetailView(true);
                    }
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
                      isSelected 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                    )}>
                      <DriverIcon driver={mount.driver} className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-sm truncate leading-tight tracking-tight">{mount.name || mount.mount_dir}</h4>
                        <div className="shrink-0 flex items-center">
                          {hasError ? (
                            <AlertCircle size={14} className="text-destructive animate-pulse" />
                          ) : isSyncing ? (
                            <Activity size={14} className="text-blue-500 animate-pulse" />
                          ) : mount.enable ? (
                            <CheckCircle2 size={14} className="text-green-500" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                          )}
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1.5 truncate">
                        <span className="font-medium">{translateDriverLabel(t, mount.driver)}</span>
                        <span className="opacity-30">|</span>
                        <span className="truncate opacity-80 font-mono text-[10px]">{mount.mount_dir}</span>
                      </div>
                    </div>
                  </div>
                  {isSelected && <div className="absolute right-3 top-1/2 -translate-y-1/2 md:hidden text-primary animate-in fade-in slide-in-from-left-1"><ChevronRight size={18} /></div>}
                </div>
              );
            })}
          </div>

          {policy && (
            <div className="p-4 border-t border-border bg-background/50 backdrop-blur-md">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-bold text-muted-foreground tracking-tight">{t('filemanager.mounts.ui.usage')}</span>
                <span className="text-xs font-bold tabular-nums opacity-80">{policy.current_mounts} / {policy.max_private_mounts}</span>
              </div>
              <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-1000 ease-out rounded-full",
                    (policy.current_mounts / policy.max_private_mounts) > 0.9 ? "bg-destructive" : "bg-primary"
                  )}
                  style={{ width: `${(policy.current_mounts / policy.max_private_mounts) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Editor/Form */}
        <div className={cn(
          "flex flex-col h-full overflow-hidden bg-background relative",
          !mobileDetailView ? "hidden md:flex" : "flex"
        )}>
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-md sticky top-0 z-20 shrink-0">
            <button 
              type="button"
              onClick={() => setMobileDetailView(false)}
              className="flex items-center gap-2 text-sm font-semibold text-primary active:scale-95 transition-transform"
            >
              <ChevronLeft size={20} strokeWidth={2} />
              {t('filemanager.mounts.ui.back')}
            </button>
            <div className="text-xs font-bold opacity-40">{t('filemanager.mounts.ui.editor')}</div>
          </div>

          {/* Desktop/Common Header */}
          <div className="px-6 py-5 lg:px-10 lg:py-8 border-b border-border bg-muted/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            <div>
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "p-2 rounded-xl shadow-sm",
                  editingId ? "bg-primary/10 text-primary" : "bg-green-500/10 text-green-500"
                )}>
                  {editingId ? <Settings size={20} /> : <Plus size={20} />}
                </div>
                <h3 className="text-lg lg:text-xl font-bold tracking-tight">
                  {editingId ? t('filemanager.mounts.editTitle') : t('filemanager.mounts.newTitle')}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 font-medium pl-10">
                {t('filemanager.mounts.formHint')}
              </p>
            </div>
            
            <div className="flex items-center gap-2 pl-10 sm:pl-0">
              {editingId && (
                <>
                  <Button variant="outline" size="sm" onClick={() => void handleSync(editingId)} className="h-9 px-4 text-xs font-semibold gap-2 rounded-full border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all">
                    <RefreshCw size={14} />
                    <span>{t('filemanager.mounts.syncNow')}</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void handleDelete(editingId)} className="h-9 w-9 p-0 rounded-full text-destructive hover:bg-destructive/10">
                    <Trash2 size={16} />
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 custom-scrollbar">
            {/* Connection Status Section */}
            {selectedMount && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="p-4 rounded-2xl border bg-muted/10 flex items-center gap-4 transition-all hover:bg-muted/20">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center shadow-sm",
                    selectedMount.last_error ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-500"
                  )}>
                    {selectedMount.last_error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-muted-foreground font-bold tracking-tight mb-0.5">{t('filemanager.mounts.ui.status')}</div>
                    <div className="text-sm font-bold truncate leading-none">
                      {selectedMount.last_error ? t('filemanager.mounts.ui.error') : (selectedMount.last_sync_status || t('filemanager.mounts.ui.online'))}
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-2xl border bg-muted/10 flex items-center gap-4 transition-all hover:bg-muted/20">
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shadow-sm">
                    <Clock size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-muted-foreground font-bold tracking-tight mb-0.5">{t('filemanager.mounts.ui.lastActivity')}</div>
                    <div className="text-sm font-bold truncate leading-none tabular-nums">
                      {formatDateTime(selectedMount.last_sync_at)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-8 max-w-3xl mx-auto">
              {/* Provider Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="text-xs font-bold text-muted-foreground tracking-tight">{t('filemanager.mounts.ui.provider')}</div>
                  {draft.driver && <span className="text-[10px] font-bold py-0.5 px-2 rounded-full bg-primary/10 text-primary">{translateDriverLabel(t, draft.driver)}</span>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {(Object.keys(DRIVER_FIELDS) as Driver[]).map((driver) => {
                    const isSelected = draft.driver === driver;
                    return (
                      <button
                        key={driver}
                        type="button"
                        onClick={() => setDraft((prev) => ({ ...prev, driver, root: '/' }))}
                        className={cn(
                          "relative group flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300 h-28 overflow-hidden",
                          isSelected 
                            ? "border-primary bg-primary/5 text-primary shadow-lg shadow-primary/5 -translate-y-1" 
                            : "border-muted-foreground/10 bg-background hover:border-primary/40 hover:bg-muted/50 text-muted-foreground"
                        )}
                      >
                        <DriverIcon driver={driver} className={cn("w-7 h-7 transition-transform group-hover:scale-110", isSelected && "scale-110")} />
                        <span className="text-[11px] font-bold tracking-tight text-center leading-tight">{translateDriverLabel(t, driver)}</span>
                        {isSelected && <div className="absolute top-2 right-2"><CheckCircle2 size={12} strokeWidth={2.5} /></div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Master Toggle Section */}
              <div className="flex items-center justify-between p-5 rounded-2xl border bg-card/60 transition-all hover:bg-muted/20 group shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-500", 
                    draft.enable ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"
                  )}>
                    <Activity size={24} />
                  </div>
                  <div>
                    <div className="font-bold text-sm lg:text-base leading-none tracking-tight">{t('filemanager.mounts.ui.activeConnection')}</div>
                    <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">{t('filemanager.mounts.ui.activeHint')}</p>
                  </div>
                </div>
                <Switch 
                  className="scale-110"
                  checked={draft.enable} 
                  onChange={(val) => setDraft((prev) => ({ ...prev, enable: val }))} 
                />
              </div>

              {/* Form Content Cards */}
              <div className="grid gap-8">
                {/* Basic Section */}
                <div className="p-6 rounded-3xl border bg-muted/10 space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-4 bg-primary rounded-full" />
                    <h4 className="text-xs font-bold text-foreground/80">{t('filemanager.mounts.ui.basicSection')}</h4>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="mount-name" className="text-[11px] font-bold text-muted-foreground tracking-tight pl-1">{t('admin.config.storage.fields.name')}</label>
                      <Input 
                        id="mount-name"
                        value={draft.name} 
                        onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} 
                        placeholder="Work Drive" 
                        className="h-11 px-4 rounded-xl border-muted-foreground/20 focus:border-primary transition-all text-sm font-semibold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="mount-dir" className="text-[11px] font-bold text-muted-foreground tracking-tight pl-1">{t('filemanager.mounts.mountDir')}</label>
                      <Input 
                        id="mount-dir"
                        value={draft.mount_dir} 
                        onChange={(e) => setDraft((prev) => ({ ...prev, mount_dir: e.target.value }))} 
                        placeholder="/cloud-data"
                        className="h-11 px-4 rounded-xl font-mono text-sm border-muted-foreground/20 focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Connection Details Section */}
                <div className="p-6 rounded-3xl border bg-card/40 space-y-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-4 bg-primary rounded-full" />
                    <h4 className="text-xs font-bold text-foreground/80">{t('filemanager.mounts.ui.credentialsSection')}</h4>
                  </div>
                  <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                    {DRIVER_FIELDS[draft.driver].map((field) => {
                      const inputId = `mount-field-${field.key}`;
                      return (
                        <div key={field.key} className={cn('space-y-2', field.full && 'sm:col-span-2')}>
                          <label htmlFor={inputId} className="text-[11px] font-bold text-muted-foreground tracking-tight pl-1">
                            {translateFieldLabel(t, draft.driver, field.key)}
                          </label>
                          {field.secret ? (
                            <PasswordInput
                              id={inputId}
                              value={draft.options[field.key] ?? ''}
                              onChange={(e) => setDraft((prev) => ({ ...prev, options: { ...prev.options, [field.key]: e.target.value } }))}
                              inputClassName="h-11 px-4 rounded-xl border-muted-foreground/20 text-sm font-semibold"
                            />
                          ) : (
                            <Input
                              id={inputId}
                              value={draft.options[field.key] ?? ''}
                              onChange={(e) => setDraft((prev) => ({ ...prev, options: { ...prev.options, [field.key]: e.target.value } }))}
                              className="h-11 px-4 rounded-xl border-muted-foreground/20 text-sm font-semibold"
                            />
                          )}
                          <p className="text-[10px] text-muted-foreground font-medium pl-1 leading-relaxed opacity-70 italic">{translateFieldHint(t, draft.driver, field.key)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Advanced Accordion */}
                <div className="rounded-3xl border border-dashed border-muted-foreground/30 overflow-hidden bg-muted/5">
                  <button 
                    type="button" 
                    onClick={() => setShowAdvanced(!showAdvanced)} 
                    className="flex items-center justify-between w-full px-6 py-4 text-xs font-bold text-muted-foreground hover:bg-muted/10 transition-colors tracking-tight"
                  >
                    <div className="flex items-center gap-3">
                      <Settings size={14} className={cn("transition-all duration-500", showAdvanced ? "rotate-180 text-primary" : "rotate-0")} />
                      {t('filemanager.mounts.ui.advancedSection')}
                    </div>
                    <ChevronDown size={16} className={cn("transition-transform duration-300", showAdvanced && "rotate-180")} />
                  </button>
                  
                  {showAdvanced && (
                    <div className="p-6 pt-0 grid gap-6 sm:grid-cols-2 animate-in slide-in-from-top-4 duration-300">
                      <div className="space-y-2 sm:col-span-2">
                        <label htmlFor="mount-root" className="text-[11px] font-bold text-muted-foreground tracking-tight pl-1">{t('filemanager.mounts.root')}</label>
                        <Input id="mount-root" value={draft.root} onChange={(e) => setDraft((prev) => ({ ...prev, root: e.target.value }))} className="h-11 px-4 rounded-xl font-mono text-sm border-muted-foreground/10 focus:border-primary" />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label htmlFor="sync-peer" className="text-[11px] font-bold text-muted-foreground tracking-tight pl-1">{t('filemanager.mounts.syncPeer')}</label>
                        <Input id="sync-peer" value={draft.sync_peer_dir} onChange={(e) => setDraft((prev) => ({ ...prev, sync_peer_dir: e.target.value }))} className="h-11 px-4 rounded-xl font-mono text-sm border-muted-foreground/10 focus:border-primary" placeholder="/local/backup" />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="sync-mode" className="text-[11px] font-bold text-muted-foreground tracking-tight pl-1">{t('filemanager.mounts.syncMode')}</label>
                        <select id="sync-mode" className="w-full h-11 px-4 rounded-xl bg-background border border-muted-foreground/10 text-xs font-bold appearance-none focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer" value={draft.sync_mode} onChange={(e) => setDraft((prev) => ({ ...prev, sync_mode: Number(e.target.value) }))}>
                          {SYNC_MODE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{translateSyncModeLabel(t, o.value)}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="sync-interval" className="text-[11px] font-bold text-muted-foreground tracking-tight pl-1">{t('filemanager.mounts.syncInterval')}</label>
                        <Input id="sync-interval" type="number" value={draft.sync_interval_minutes} onChange={(e) => setDraft((prev) => ({ ...prev, sync_interval_minutes: e.target.value }))} className="h-11 px-4 rounded-xl text-sm font-semibold border-muted-foreground/10 focus:border-primary" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 lg:px-10 lg:py-6 border-t border-border bg-background/80 backdrop-blur-xl flex items-center justify-between gap-6 shrink-0 z-10">
             <div className="hidden lg:flex items-start gap-3 text-[10px] text-muted-foreground max-w-[320px] leading-tight">
               <AlertCircle size={14} className="shrink-0 mt-0.5" />
               <p className="font-medium italic opacity-70 leading-relaxed">
                {t('filemanager.mounts.remoteDeleteNotice')}
               </p>
             </div>
             <div className="flex items-center gap-3 ml-auto w-full sm:w-auto">
              <Button variant="ghost" size="sm" onClick={resetDraft} className="text-xs h-10 px-6 font-semibold flex-1 sm:flex-none">
                {editingId ? t('filemanager.mounts.add') : t('filemanager.mounts.reset')}
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving || (!editingId && !canCreateNew)} className="h-10 px-10 text-xs font-bold rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all flex-1 sm:flex-none">
                {saving ? (t('common.processing')) : editingId ? t('filemanager.mounts.ui.applyChanges') : t('filemanager.mounts.ui.establishConnection')}
              </Button>
             </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
