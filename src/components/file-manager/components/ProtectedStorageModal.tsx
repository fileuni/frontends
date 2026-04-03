import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Lock, FolderTree, AlertTriangle, CheckCircle2, Copy, FolderOpen, Lightbulb } from 'lucide-react';
import { Modal } from '@/components/ui/Modal.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { cn } from '@/lib/utils.ts';
import { copyTextWithToast } from '@/lib/feedback.ts';
import { useProtectedStorageStore } from '@/stores/protectedStorage.ts';
import { useToastStore } from '@/stores/toast.ts';
import { handleApiError } from '@/lib/api.ts';
import { useFileStore } from '../store/useFileStore.ts';

const PROTECTED_STORAGE_MODE_LABEL_KEYS = {
  disabled: 'filemanager.protectedStorage.modes.disabled',
  obfuscate: 'filemanager.protectedStorage.modes.obfuscate',
  encrypt: 'filemanager.protectedStorage.modes.encrypt',
} as const;

const PROTECTED_STORAGE_MODE_DETAIL_KEYS = {
  disabled: 'filemanager.protectedStorage.modeDetails.disabled',
  obfuscate: 'filemanager.protectedStorage.modeDetails.obfuscate',
  encrypt: 'filemanager.protectedStorage.modeDetails.encrypt',
} as const;

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
  const { status, isLoading, fetchStatus, enableRoot, focusRootHint } = useProtectedStorageStore();
  const { addToast } = useToastStore();
  const setCurrentPath = useFileStore((state) => state.setCurrentPath);

  useEffect(() => {
    if (!isOpen) return;
    void fetchStatus();
  }, [fetchStatus, isOpen]);

  const globalMode = status?.global_mode || 'disabled';
  const currentModeLabel = (globalMode in PROTECTED_STORAGE_MODE_LABEL_KEYS
    ? t(PROTECTED_STORAGE_MODE_LABEL_KEYS[globalMode as keyof typeof PROTECTED_STORAGE_MODE_LABEL_KEYS])
    : globalMode) || globalMode;
  const isEmptyDir = fileCount === 0;
  const isRootPath = currentPath === '/';
  const isAlreadyEnabled = Boolean(status?.enabled);
  const isCurrentRootProtected = status?.protected_root === currentPath;
  const isProtectedElsewhere = Boolean(status?.enabled && status?.protected_root && status.protected_root !== currentPath);
  const isReservedPath = currentPath === '/.thumbs' || currentPath === '/.recycle_bin' || currentPath === '/.virtual' || currentPath === '/.protected' || currentPath.startsWith('/.thumbs/') || currentPath.startsWith('/.recycle_bin/') || currentPath.startsWith('/.virtual/') || currentPath.startsWith('/.protected/');
  const isAdminDisabled = globalMode === 'disabled';
  const canPrepare = !isAdminDisabled && !isMountPath && !isReservedPath && isEmptyDir && !isAlreadyEnabled;
  const enabledAt = status?.protected_enabled_at ? new Date(status.protected_enabled_at).toLocaleString() : null;
  const updatedAt = status?.protected_updated_at ? new Date(status.protected_updated_at).toLocaleString() : null;
  const currentDecisionMessage = (() => {
    if (isAdminDisabled) return t('filemanager.protectedStorage.constraints.adminDisabled');
    if (isProtectedElsewhere) return t('filemanager.protectedStorage.constraints.alreadyEnabledElsewhere', { path: status?.protected_root || '/' });
    if (isCurrentRootProtected) return t('filemanager.protectedStorage.constraints.currentRootActive', { path: currentPath });
    if (isMountPath) return t('filemanager.protectedStorage.constraints.mountBlocked');
    if (isReservedPath) return t('filemanager.protectedStorage.constraints.systemPathBlocked');
    if (!isEmptyDir) return t('filemanager.protectedStorage.constraints.emptyDirOnly');
    return isRootPath
      ? t('filemanager.protectedStorage.constraints.rootReady')
      : t('filemanager.protectedStorage.constraints.subdirReady');
  })();
  const currentDecisionTone = isAdminDisabled || isProtectedElsewhere || isMountPath || isReservedPath || !isEmptyDir
    ? 'warn'
    : 'ok';
  const modeDetailMessage = t(
    PROTECTED_STORAGE_MODE_DETAIL_KEYS[
      globalMode in PROTECTED_STORAGE_MODE_DETAIL_KEYS
        ? (globalMode as keyof typeof PROTECTED_STORAGE_MODE_DETAIL_KEYS)
        : 'disabled'
    ],
  );
  const currentAdviceMessage = (() => {
    if (globalMode === 'disabled') return t('filemanager.protectedStorage.advice.adminDisabled');
    if (isProtectedElsewhere) return t('filemanager.protectedStorage.advice.alreadyEnabledElsewhere');
    if (isCurrentRootProtected) return t('filemanager.protectedStorage.advice.currentRootActive');
    if (isMountPath) return t('filemanager.protectedStorage.advice.mountBlocked');
    if (isReservedPath) return t('filemanager.protectedStorage.advice.systemPathBlocked');
    if (!isEmptyDir) return t('filemanager.protectedStorage.advice.emptyDirOnly');
    return t('filemanager.protectedStorage.advice.ready');
  })();
  const handleEnable = async () => {
    try {
      await enableRoot(currentPath);
      addToast(t('filemanager.protectedStorage.enableSuccess') || 'Protected storage enabled', 'success');
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };
  const handleJumpToProtectedRoot = () => {
    if (!status?.protected_root) return;
    focusRootHint(status.protected_root);
    setCurrentPath(status.protected_root);
    onClose();
  };
  const handleCopyProtectedRoot = async () => {
    if (!status?.protected_root) return;
    await copyTextWithToast({
      text: status.protected_root,
      addToast,
      t,
      successMessage:
        t('filemanager.protectedStorage.copyRootSuccess') || 'Protected root copied',
    });
  };

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

        <InfoCard
          icon={Shield}
          label={t('filemanager.protectedStorage.modeDetails.title') || 'Mode Detail'}
          value={modeDetailMessage || ''}
          tone={globalMode === 'disabled' ? 'warn' : 'neutral'}
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

        {status?.enabled && (
          <div className="grid gap-3 md:grid-cols-2">
            <InfoCard
              icon={FolderTree}
              label={t('filemanager.protectedStorage.protectedRoot') || 'Protected root'}
              value={status.protected_root || '/'}
              tone="ok"
            />
            <InfoCard
              icon={Lock}
              label={t('filemanager.protectedStorage.protectedMode') || 'Protected mode'}
              value={status.protected_mode
                ? ((status.protected_mode in PROTECTED_STORAGE_MODE_LABEL_KEYS
                  ? t(PROTECTED_STORAGE_MODE_LABEL_KEYS[status.protected_mode as keyof typeof PROTECTED_STORAGE_MODE_LABEL_KEYS])
                  : status.protected_mode) || status.protected_mode)
                : currentModeLabel}
              tone="ok"
            />
            {enabledAt && (
              <InfoCard
                icon={CheckCircle2}
                label={t('filemanager.protectedStorage.enabledAt') || 'Enabled at'}
                value={enabledAt}
                tone="ok"
              />
            )}
            {updatedAt && (
              <InfoCard
                icon={CheckCircle2}
                label={t('filemanager.protectedStorage.updatedAt') || 'Updated at'}
                value={updatedAt}
                tone="ok"
              />
            )}
          </div>
        )}

        {isLoading && (
          <div className="text-sm opacity-60">
            {t('filemanager.protectedStorage.loading') || 'Loading...'}
          </div>
        )}

        <InfoCard
          icon={currentDecisionTone === 'ok' ? CheckCircle2 : AlertTriangle}
          label={t('filemanager.protectedStorage.constraints.title') || 'Restrictions'}
          value={currentDecisionMessage || ''}
          tone={currentDecisionTone}
        />

        <InfoCard
          icon={Lightbulb}
          label={t('filemanager.protectedStorage.advice.title') || 'Next Step'}
          value={currentAdviceMessage || ''}
          tone={currentDecisionTone === 'ok' ? 'ok' : 'neutral'}
        />

        {!isRootPath && globalMode !== 'disabled' && (
          <InfoCard
            icon={AlertTriangle}
            label={t('filemanager.protectedStorage.subdirEffects.title') || 'Subdirectory effect'}
            value={t('filemanager.protectedStorage.subdirEffects.body') || 'If this subdirectory is protected later, delete will bypass the recycle bin and thumbnail features will be disabled in this subtree.'}
            tone="warn"
          />
        )}

        {!status?.enabled && (
          <div className="flex justify-end pt-2">
            <Button onClick={handleEnable} disabled={!canPrepare || isLoading}>
              {t('filemanager.protectedStorage.enableAction') || 'Enable for current directory'}
            </Button>
          </div>
        )}

        {status?.enabled && status.protected_root && (
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            {!isCurrentRootProtected && (
              <Button variant="outline" onClick={handleJumpToProtectedRoot} className="inline-flex items-center gap-2">
                <FolderOpen size={16} />
                {t('filemanager.protectedStorage.openProtectedRoot') || 'Open protected root'}
              </Button>
            )}
            <Button variant="outline" onClick={() => void handleCopyProtectedRoot()} className="inline-flex items-center gap-2">
              <Copy size={16} />
              {t('filemanager.protectedStorage.copyProtectedRoot') || 'Copy protected root'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
