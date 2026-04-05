import React from 'react';
import { Modal } from '@/components/ui/Modal.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { useTranslation } from 'react-i18next';
import type { FileInfo } from '../types/index.ts';
import { FileIcon } from './FileIcon.tsx';
import { Calendar, HardDrive, Hash, Info, Type, Clock, Eye, Globe, AlertTriangle, type LucideIcon } from 'lucide-react';
import { useFileActions } from '../hooks/useFileActions.ts';
import { useProtectedStorageStore } from '@/stores/protectedStorage.ts';
import {
  isProtectedPathUnavailable,
  pathMatchesProtectedRoot,
  shouldDisableThumbnailForPath,
  shouldUsePermanentDeleteForPath,
} from '../utils/protectedStorage.ts';

interface Props {
  file: FileInfo | null;
  onClose: () => void;
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface PropertyItemProps {
  icon: LucideIcon;
  label: string;
  value: string | React.ReactNode;
}

const getProtectedStorageModeLabel = (
  t: ReturnType<typeof useTranslation>['t'],
  mode: 'disabled' | 'obfuscate' | 'encrypt',
): string => {
  switch (mode) {
    case 'disabled':
      return t('filemanager.protectedStorage.modes.disabled');
    case 'obfuscate':
      return t('filemanager.protectedStorage.modes.obfuscate');
    case 'encrypt':
      return t('filemanager.protectedStorage.modes.encrypt');
  }
};

export const FilePropertiesModal = ({ file, onClose }: Props) => {
  const { t } = useTranslation();
  const { previewFile } = useFileActions();
  const protectedStatus = useProtectedStorageStore((state) => state.status);
  
  if (!file) return null;

  const isProtected = pathMatchesProtectedRoot(file.path, protectedStatus?.protected_root);
  const protectedMode = protectedStatus?.protected_mode || protectedStatus?.global_mode || 'disabled';
  const protectedUnavailable = isProtectedPathUnavailable(protectedStatus);
  const protectedPermanentDelete = shouldUsePermanentDeleteForPath(file.path, protectedStatus);
  const protectedThumbnailDisabled = shouldDisableThumbnailForPath(file.path, protectedStatus);
  const protectedEnabledAt = protectedStatus?.protected_enabled_at
    ? new Date(protectedStatus.protected_enabled_at).toLocaleString()
    : null;
  const protectedUpdatedAt = protectedStatus?.protected_updated_at
    ? new Date(protectedStatus.protected_updated_at).toLocaleString()
    : null;

  const handlePreview = () => {
    previewFile(file.path);
    onClose();
  };

  const PropertyItem = ({ icon: Icon, label, value }: PropertyItemProps) => (
    <div className="flex items-center gap-3 p-2 px-3 rounded-xl bg-white/[0.02] border border-white/5">
      <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-black opacity-30 leading-none mb-1">{label}</p>
        <p className="text-sm font-bold truncate break-all leading-tight">{value}</p>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={!!file}
      onClose={onClose}
      title={t('filemanager.actions.properties')}
      maxWidth="max-w-md"
      bodyClassName="p-4"
    >
      <div className="space-y-2">
        <div className="flex items-center p-3 gap-4 bg-primary/5 rounded-2xl border border-primary/10 mb-3">
          <FileIcon name={file.name} isDir={file.is_dir} size={40} />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black truncate break-all leading-tight">{file.name}</h3>
            <p className="text-[14px] font-black opacity-30 mt-0.5">
              {file.is_dir ? t('filemanager.folder') : t('filemanager.file')}
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          <PropertyItem icon={Type} label={t('filemanager.prop.name')} value={file.name} />
          <PropertyItem icon={HardDrive} label={t('filemanager.prop.path')} value={file.path} />
          {!file.is_dir && <PropertyItem icon={Hash} label={t('filemanager.prop.size')} value={formatSize(file.size)} />}
          <PropertyItem icon={Calendar} label={t('filemanager.prop.modified')} value={new Date(file.modified).toLocaleString()} />

          {file.mount_id && (
            <PropertyItem icon={Globe} label={t('filemanager.mounts.rootBadge') || 'Mounted'} value={file.mount_name || file.mount_dir || file.path} />
          )}

          {file.mount_driver && (
            <PropertyItem icon={Info} label={t('filemanager.mounts.driverLabel') || 'Driver'} value={file.mount_driver} />
          )}

          {file.delete_behavior === 'remote_direct' && (
            <PropertyItem icon={AlertTriangle} label={t('filemanager.mounts.deleteBehaviorLabel') || 'Delete Behavior'} value={t('filemanager.mounts.remoteDeleteNotice') || 'Deleting here removes remote objects immediately and does not use the recycle bin.'} />
          )}

          {file.accessed_at && (
            <PropertyItem icon={Clock} label={t('filemanager.prop.accessed')} value={new Date(file.accessed_at).toLocaleString()} />
          )}

          {file.original_path && (
            <PropertyItem icon={Info} label={t('filemanager.prop.original')} value={file.original_path} />
          )}

          {file.mount_last_sync_at && (
            <PropertyItem icon={Clock} label={t('filemanager.mounts.lastSyncAt') || 'Last Sync'} value={new Date(file.mount_last_sync_at).toLocaleString()} />
          )}

          {file.mount_last_error && (
            <PropertyItem icon={AlertTriangle} label={t('filemanager.mounts.errorLabel') || 'Last Error'} value={file.mount_last_error} />
          )}

          {isProtected && (
            <PropertyItem
              icon={HardDrive}
              label={t('filemanager.protectedStorage.title') || 'Protected Storage'}
              value={protectedMode === 'disabled' || protectedMode === 'obfuscate' || protectedMode === 'encrypt'
                ? getProtectedStorageModeLabel(t, protectedMode)
                : protectedMode}
            />
          )}

          {isProtected && protectedStatus?.protected_root && (
            <PropertyItem
              icon={Info}
              label={t('filemanager.protectedStorage.protectedRoot') || 'Protected Root'}
              value={protectedStatus.protected_root}
            />
          )}

          {isProtected && protectedEnabledAt && (
            <PropertyItem
              icon={Calendar}
              label={t('filemanager.protectedStorage.enabledAt') || 'Enabled At'}
              value={protectedEnabledAt}
            />
          )}

          {isProtected && protectedUpdatedAt && (
            <PropertyItem
              icon={Clock}
              label={t('filemanager.protectedStorage.updatedAt') || 'Updated At'}
              value={protectedUpdatedAt}
            />
          )}

          {isProtected && protectedUnavailable && (
            <PropertyItem
              icon={AlertTriangle}
              label={t('filemanager.protectedStorage.currentStatus') || 'Current Status'}
              value={t('filemanager.protectedStorage.constraints.adminDisabled') || 'This protected directory is temporarily unavailable because the system mode no longer matches it.'}
            />
          )}

          {isProtected && protectedPermanentDelete && (
            <PropertyItem
              icon={AlertTriangle}
              label={t('filemanager.mounts.deleteBehaviorLabel') || 'Delete Behavior'}
              value={t('filemanager.protectedStorage.subdirEffects.body') || 'Delete bypasses the recycle bin and thumbnails are disabled in this subtree.'}
            />
          )}

          {isProtected && protectedThumbnailDisabled && (
            <PropertyItem
              icon={Info}
              label={t('filemanager.thumbnail.disableAction') || 'Thumbnail'}
              value={t('filemanager.protectedStorage.subdirEffects.body') || 'Delete bypasses the recycle bin and thumbnails are disabled in this subtree.'}
            />
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          {!file.is_dir && (
            <Button 
              variant="outline"
              size="sm"
              onClick={handlePreview} 
                className="px-4 font-black text-sm flex items-center gap-2"
            >
              <Eye size={18} />
              {t('filemanager.actions.preview')}
            </Button>
          )}
          <Button 
            onClick={onClose} 
            size="sm"
            className="px-6 font-black text-sm"
          >
            {t('common.close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
