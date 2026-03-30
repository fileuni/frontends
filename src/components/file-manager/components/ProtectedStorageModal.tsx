import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Lock, FolderTree, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal.tsx';
import { cn } from '@/lib/utils.ts';
import { useProtectedStorageStore } from '@/stores/protectedStorage.ts';

interface ProtectedStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  fileCount: number;
  isMountPath: boolean;
}

const InfoCard = ({
  icon: Icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: typeof Shield;
  label: string;
  value: string;
  tone?: 'neutral' | 'warn' | 'ok';
}) => {
  const toneClass =
    tone === 'warn'
      ? 'border-amber-500/20 bg-amber-500/10 text-amber-100'
      : tone === 'ok'
        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
        : 'border-white/10 bg-white/[0.03] text-slate-100';
  return (
    <div className={cn('rounded-2xl border p-3', toneClass)}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 opacity-80">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-widest opacity-60">{label}</div>
          <div className="mt-1 text-sm font-bold leading-6">{value}</div>
        </div>
      </div>
    </div>
  );
};

export const ProtectedStorageModal = ({
  isOpen,
  onClose,
  currentPath,
  fileCount,
  isMountPath,
}: ProtectedStorageModalProps) => {
  const { t } = useTranslation();
  const { status, isLoading, fetchStatus } = useProtectedStorageStore();

  useEffect(() => {
    if (!isOpen) return;
    void fetchStatus();
  }, [fetchStatus, isOpen]);

  const globalMode = status?.global_mode || 'disabled';
  const currentModeLabel = t(`filemanager.protectedStorage.modes.${globalMode}`) || globalMode;
  const isEmptyDir = fileCount === 0;
  const isRootPath = currentPath === '/';
  const canPrepare = globalMode !== 'disabled' && !isMountPath && isEmptyDir;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('filemanager.protectedStorage.title') || 'Protected Storage'}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        <InfoCard
          icon={Shield}
          label={t('filemanager.protectedStorage.globalMode') || 'Global mode'}
          value={currentModeLabel}
          tone={globalMode === 'disabled' ? 'warn' : 'ok'}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <InfoCard
            icon={FolderTree}
            label={t('filemanager.protectedStorage.currentPath') || 'Current path'}
            value={currentPath}
          />
          <InfoCard
            icon={Lock}
            label={t('filemanager.protectedStorage.currentStatus') || 'Current status'}
            value={status?.enabled
              ? (t('filemanager.protectedStorage.status.enabled') || 'Enabled')
              : (t('filemanager.protectedStorage.status.notEnabled') || 'Not enabled')}
          />
        </div>

        {isLoading && (
          <div className="text-sm opacity-60">
            {t('filemanager.protectedStorage.loading') || 'Loading...'}
          </div>
        )}

        {globalMode === 'disabled' && (
          <InfoCard
            icon={AlertTriangle}
            label={t('filemanager.protectedStorage.constraints.title') || 'Restrictions'}
            value={t('filemanager.protectedStorage.constraints.adminDisabled') || 'The administrator has disabled this feature for the whole system.'}
            tone="warn"
          />
        )}

        {globalMode !== 'disabled' && isMountPath && (
          <InfoCard
            icon={AlertTriangle}
            label={t('filemanager.protectedStorage.constraints.title') || 'Restrictions'}
            value={t('filemanager.protectedStorage.constraints.mountBlocked') || 'Phase 1 does not support mount directories.'}
            tone="warn"
          />
        )}

        {globalMode !== 'disabled' && !isMountPath && !isEmptyDir && (
          <InfoCard
            icon={AlertTriangle}
            label={t('filemanager.protectedStorage.constraints.title') || 'Restrictions'}
            value={t('filemanager.protectedStorage.constraints.emptyDirOnly') || 'Phase 1 only allows enabling on an empty directory.'}
            tone="warn"
          />
        )}

        {canPrepare && (
          <InfoCard
            icon={CheckCircle2}
            label={t('filemanager.protectedStorage.constraints.title') || 'Restrictions'}
            value={isRootPath
              ? (t('filemanager.protectedStorage.constraints.rootReady') || 'The current root directory matches the phase 1 prerequisite for protected storage.')
              : (t('filemanager.protectedStorage.constraints.subdirReady') || 'The current subdirectory matches the phase 1 prerequisite for protected storage.')}
            tone="ok"
          />
        )}

        {!isRootPath && globalMode !== 'disabled' && (
          <InfoCard
            icon={AlertTriangle}
            label={t('filemanager.protectedStorage.subdirEffects.title') || 'Subdirectory effect'}
            value={t('filemanager.protectedStorage.subdirEffects.body') || 'If this subdirectory is protected later, delete will bypass the recycle bin and thumbnail features will be disabled in this subtree.'}
            tone="warn"
          />
        )}
      </div>
    </Modal>
  );
};
