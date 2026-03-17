import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, HardDrive, Key, Settings2, Shield, WandSparkles } from 'lucide-react';
import { ConfigEditorPanel } from './ConfigEditorPanel';
import { AdminPasswordPanel } from './AdminPasswordPanel';
import { ConfigQuickWizardModal, type ConfigQuickWizardModalProps, type FriendlyStep } from './ConfigQuickWizardModal';
import { LicenseManagementModal } from './LicenseManagementModal';
import { VfsStorageConfigModal } from './VfsStorageConfigModal';
import type { ConfigError, ConfigNoteEntry, EditorJumpPosition } from './ConfigRawEditor';
import { deepClone, ensureRecord, isRecord } from '../lib/configObject';
import { useResolvedTheme } from '../lib/theme';
import { cn } from '../lib/utils';

type LineDiffStats = {
  changed: number;
  added: number;
  removed: number;
};

const calculateLineDiffStats = (before: string, after: string): LineDiffStats => {
  const beforeLines = before.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);
  const maxLen = Math.max(beforeLines.length, afterLines.length);
  let added = 0;
  let removed = 0;
  let changed = 0;

  for (let i = 0; i < maxLen; i += 1) {
    const oldLine = beforeLines[i];
    const newLine = afterLines[i];
    if (oldLine === undefined && newLine !== undefined) {
      added += 1;
    } else if (oldLine !== undefined && newLine === undefined) {
      removed += 1;
    } else if (oldLine !== newLine) {
      changed += 1;
    }
  }

  return { changed, added, removed };
};

export interface SystemConfigWorkbenchProps {
  tomlAdapter: ConfigQuickWizardModalProps['tomlAdapter'];
  loading: boolean;
  configPath?: string | null;
  content: string;
  savedContent: string;
  notes: Record<string, ConfigNoteEntry>;
  validationErrors: ConfigError[];
  busy: boolean;
  onChange: (value: string) => void;
  onTest: () => void;
  onSave: () => void;
  saveLabel?: string;
  onCancel?: () => void;
  showCancel?: boolean;
  allowSaveWithoutChanges?: boolean;
  forceEnableSave?: boolean;
  reloadSummary?: string;
  reloadSummaryLevel?: 'success' | 'warning' | 'error' | 'info';
  restartNotice?: string;
  quickWizardLicense?: {
    isValid: boolean;
    currentUsers: number;
    maxUsers: number;
    deviceCode: string;
    licenseKey: string;
    saving: boolean;
    onLicenseKeyChange: (value: string) => void;
    onApplyLicense: () => void;
  };
  quickWizardEnabled?: boolean;
  runtimeOs?: string;
  onClearValidationErrors?: () => void;
  onResetAdminPassword?: (password: string) => Promise<void | string | { username?: string }>;
  isResettingAdminPassword?: boolean;
  adminPasswordLabel?: string;
  adminPasswordPanelProps?: Partial<import('./AdminPasswordPanel').AdminPasswordPanelProps>;
  onPickStorageDirectory?: import('./VfsStorageConfigModal').VfsStorageConfigModalProps['onPickDirectory'];
}

export const SystemConfigWorkbench: React.FC<SystemConfigWorkbenchProps> = ({
  tomlAdapter,
  loading,
  configPath,
  content,
  savedContent,
  notes,
  validationErrors,
  busy,
  onChange,
  onTest,
  onSave,
  saveLabel,
  onCancel,
  showCancel = false,
  allowSaveWithoutChanges = false,
  forceEnableSave = false,
  reloadSummary = '',
  reloadSummaryLevel = 'info',
  restartNotice,
  quickWizardLicense,
  quickWizardEnabled = true,
  runtimeOs,
  onClearValidationErrors,
  onResetAdminPassword,
  isResettingAdminPassword,
  adminPasswordLabel,
  adminPasswordPanelProps,
  onPickStorageDirectory,
}) => {
  const { t } = useTranslation();
  const [isQuickWizardOpen, setIsQuickWizardOpen] = useState(false);
  const [quickWizardInitialStep, setQuickWizardInitialStep] = useState<FriendlyStep | undefined>(undefined);
  const [isAdminPasswordOpen, setIsAdminPasswordOpen] = useState(false);
  const [isLicenseOpen, setIsLicenseOpen] = useState(false);
  const [isStorageOpen, setIsStorageOpen] = useState(false);
  const [jumpTo, setJumpTo] = useState<EditorJumpPosition | null>(null);
  const resolvedTheme = useResolvedTheme();

  const isDark = resolvedTheme === 'dark';

  const isDirty = content !== savedContent;
  const pendingDiffStats = useMemo(() => calculateLineDiffStats(savedContent, content), [savedContent, content]);
  const isSaveDisabled = !forceEnableSave && !allowSaveWithoutChanges && !isDirty;

  const openQuickWizardAt = useCallback((step: FriendlyStep) => {
    setQuickWizardInitialStep(step);
    setIsQuickWizardOpen(true);
  }, []);

  const openAdminPassword = useCallback(() => {
    setIsLicenseOpen(false);
    setIsStorageOpen(false);
    setIsAdminPasswordOpen(true);
  }, []);

  const openLicenseManagement = useCallback(() => {
    setIsAdminPasswordOpen(false);
    setIsStorageOpen(false);
    setIsLicenseOpen(true);
  }, []);

  const openStorageConfig = useCallback(() => {
    setIsAdminPasswordOpen(false);
    setIsLicenseOpen(false);
    setIsStorageOpen(true);
  }, []);

  if (loading) {
    return (
      <div className={cn(
        "h-64 flex items-center justify-center font-black animate-pulse uppercase tracking-widest",
        isDark ? "text-white opacity-50" : "text-slate-900 opacity-40"
      )}>
        {t('admin.config.loading')}
      </div>
    );
  }

  const actionButtons = (
    <div className="flex items-center gap-2 flex-wrap">
      {quickWizardEnabled && (
        <button
          type="button"
          className={cn(
            "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border font-black uppercase tracking-wide transition-all inline-flex items-center gap-1.5 shadow-sm",
            isDark 
              ? "border-white/15 hover:bg-white/10 text-slate-300" 
              : "border-slate-300 bg-white hover:bg-slate-50 text-slate-900"
          )}
          onClick={() => setIsQuickWizardOpen(true)}
        >
          <WandSparkles size={18} className="text-primary" />
          {t('admin.config.quickWizard.title')}
        </button>
      )}
    </div>
  );

  const shortcuts = (
    <div className={cn(
      "mb-3 sm:mb-4 rounded-2xl border p-3 sm:p-4",
      isDark ? "border-white/10 bg-black/20" : "border-slate-300 bg-slate-50/70 shadow-inner"
    )}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div>
          <div className={cn("text-sm font-black uppercase tracking-wide", isDark ? "text-slate-200" : "text-slate-900")}>{t('admin.config.shortcuts.title')}</div>
          <div className={cn("text-sm sm:text-sm font-bold", isDark ? "text-slate-500" : "text-slate-600")}>{t('admin.config.shortcuts.subtitle')}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {quickWizardEnabled && (
          <button
            type="button"
            className={cn(
              "h-11 rounded-xl border px-4 text-sm sm:text-sm font-black transition-all inline-flex items-center justify-center gap-2 shadow-sm",
              isDark ? "border-primary/30 bg-primary/10 text-slate-100 hover:bg-primary/15" : "border-primary/30 bg-primary/5 text-slate-900 hover:bg-primary/10"
            )}
            onClick={() => openQuickWizardAt('performance')}
          >
            <WandSparkles size={18} className="text-primary" />
            {t('admin.config.quickWizard.steps.performance')}
          </button>
        )}

        {quickWizardEnabled && (
          <button
            type="button"
            className={cn(
              "h-11 rounded-xl border px-4 text-sm sm:text-sm font-black transition-all inline-flex items-center justify-center gap-2 shadow-sm",
              isDark ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15" : "border-cyan-500/30 bg-cyan-50 text-cyan-900 hover:bg-cyan-100"
            )}
            onClick={() => openQuickWizardAt('database')}
          >
            <Settings2 size={18} className={isDark ? "text-cyan-300" : "text-cyan-700"} />
            {t('admin.config.quickWizard.steps.database')}
          </button>
        )}

        {quickWizardEnabled && (
          <button
            type="button"
            className={cn(
              "h-11 rounded-xl border px-4 text-sm sm:text-sm font-black transition-all inline-flex items-center justify-center gap-2 shadow-sm",
              isDark ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15" : "border-emerald-500/25 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
            )}
            onClick={() => openQuickWizardAt('cache')}
          >
            <Settings2 size={18} className={isDark ? "text-emerald-300" : "text-emerald-700"} />
            {t('admin.config.quickWizard.steps.cache')}
          </button>
        )}

        {onResetAdminPassword && (
          <button
            type="button"
            className={cn(
              "h-11 rounded-xl border px-4 text-sm sm:text-sm font-black transition-all inline-flex items-center justify-center gap-2 shadow-sm",
              isDark ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15" : "border-cyan-500/30 bg-cyan-50 text-cyan-900 hover:bg-cyan-100"
            )}
            onClick={openAdminPassword}
          >
            <Shield size={18} className={isDark ? "text-cyan-300" : "text-cyan-700"} />
            {adminPasswordLabel || t('admin.config.quickWizard.actions.setAdminPassword')}
          </button>
        )}

        {quickWizardLicense && (
          <button
            type="button"
            className={cn(
              "h-11 rounded-xl border px-4 text-sm sm:text-sm font-black transition-all inline-flex items-center justify-center gap-2 shadow-sm",
              isDark ? "border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15" : "border-amber-500/30 bg-amber-50 text-amber-900 hover:bg-amber-100"
            )}
            onClick={openLicenseManagement}
          >
            <Key size={18} className={isDark ? "text-amber-400" : "text-amber-600"} />
            {t('admin.config.license.title')}
          </button>
        )}

        <button
          type="button"
          className={cn(
            "h-11 rounded-xl border px-4 text-sm sm:text-sm font-black transition-all inline-flex items-center justify-center gap-2 shadow-sm",
            isDark ? "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10" : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
          )}
          onClick={openStorageConfig}
        >
          <HardDrive size={18} className={isDark ? "text-slate-200" : "text-slate-700"} />
          {t('admin.config.storage.title')}
        </button>
      </div>
    </div>
  );

  return (
    <div className={cn(
      "flex flex-col rounded-2xl sm:rounded-[2.5rem] border p-3 sm:p-6 shadow-xl transition-all overflow-hidden",
      isDark 
        ? "bg-white/[0.02] border-white/5 shadow-black/40 hover:border-white/10" 
        : "bg-white border-slate-300 shadow-slate-200/50 hover:border-slate-400"
    )}>
      {validationErrors.length > 0 && (
        <div className={cn(
          "mb-4 sm:mb-6 rounded-xl sm:rounded-2xl border p-3 sm:p-5 animate-in fade-in slide-in-from-top-2 shadow-inner",
          isDark ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200"
        )}>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className={cn("flex items-center gap-2", isDark ? "text-red-400" : "text-red-700")}>
              <AlertTriangle size={16} className="animate-pulse sm:w-[18px]" />
              <h3 className="text-sm sm:text-sm font-black uppercase tracking-wide">
                {t('admin.config.testFailed')} ({validationErrors.length})
              </h3>
            </div>
            {onClearValidationErrors && (
              <button
                type="button"
                className={cn(
                  "h-7 px-2 text-sm uppercase font-black transition-opacity",
                  isDark ? "text-slate-400 opacity-50 hover:opacity-100" : "text-red-800 opacity-70 hover:opacity-100"
                )}
                onClick={onClearValidationErrors}
              >
                {t('common.clear')}
              </button>
            )}
          </div>
          <div className="max-h-48 sm:max-h-64 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2 sm:gap-2.5">
            {validationErrors.map((err, index) => {
              const canJump = typeof err.line === 'number' && err.line > 0;
              return (
                <button
                  type="button"
                  key={`${index}-${err.message}`}
                  title={canJump ? `Jump to line ${err.line}` : undefined}
                  onClick={() => {
                    if (!canJump) return;
                    setJumpTo({ line: err.line, column: err.column });
                  }}
                  className={cn(
                    "flex items-start gap-2 sm:gap-3 group p-2.5 sm:p-3 rounded-lg sm:rounded-xl transition-all border text-left",
                    isDark
                      ? "bg-black/20 hover:bg-black/40 border-white/5 hover:border-red-500/20"
                      : "bg-white hover:bg-red-50/30 border-slate-100 hover:border-red-200",
                    canJump && "cursor-pointer"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm sm:text-sm leading-relaxed font-mono font-bold transition-colors",
                      isDark ? "text-red-200/90 group-hover:text-red-100" : "text-red-900"
                    )}>
                      {err.message}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {typeof err.key === 'string' && err.key.trim().length > 0 && (
                        <span className={cn(
                          "text-sm sm:text-sm px-1.5 py-0.5 rounded border font-mono font-black",
                          isDark ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-red-200 bg-red-100 text-red-800"
                        )}>
                          key: {err.key}
                        </span>
                      )}
                      {typeof err.line === 'number' && err.line > 0 && (
                        <span className={cn(
                          "text-sm sm:text-sm px-1.5 py-0.5 rounded border font-mono font-bold",
                          isDark ? "border-white/10 bg-black/20 text-red-100/80" : "border-slate-200 bg-slate-100 text-slate-700"
                        )}>
                          line: {err.line}
                        </span>
                      )}
                      {typeof err.column === 'number' && err.column > 0 && (
                        <span className={cn(
                          "text-sm sm:text-sm px-1.5 py-0.5 rounded border font-mono font-bold",
                          isDark ? "border-white/10 bg-black/20 text-red-100/80" : "border-slate-200 bg-slate-100 text-slate-700"
                        )}>
                          column: {err.column}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={cn(
        "mb-3 sm:mb-4 rounded-xl sm:rounded-2xl border px-3 py-2.5 sm:px-4 sm:py-3 transition-colors",
        isDark ? "border-white/10 bg-black/20 shadow-none" : "border-slate-300 bg-slate-100/50 shadow-inner"
      )}>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm sm:text-sm">
          <span className={cn(
            'rounded-lg border px-2 py-0.5 font-black uppercase tracking-wide',
            isDirty 
              ? (isDark ? 'border-amber-400/30 bg-amber-500/10 text-amber-200' : 'border-amber-500/40 bg-amber-100 text-amber-900') 
              : (isDark ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-emerald-500/40 bg-emerald-100 text-emerald-900'),
          )}>
            {isDirty ? t('admin.config.pendingChanges') : t('admin.config.noPendingChanges')}
          </span>
          <span className={cn("font-black uppercase tracking-widest", isDark ? "text-white opacity-30" : "text-slate-900 opacity-40")}>
            {t('admin.config.diffSummary')}
          </span>
          <span className={cn(
            "rounded border px-2 py-0.5 font-mono font-bold",
            isDark ? "border-white/10 bg-white/5 text-slate-300" : "border-slate-200 bg-white text-slate-800"
          )}>
            {t('admin.config.changedLines')}: {pendingDiffStats.changed}
          </span>
          <span className={cn(
            "rounded border px-2 py-0.5 font-mono font-bold",
            isDark ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200" : "border-emerald-500/20 bg-emerald-50 text-emerald-800"
          )}>
            {t('admin.config.addedLines')}: {pendingDiffStats.added}
          </span>
          <span className={cn(
            "rounded border px-2 py-0.5 font-mono font-bold",
            isDark ? "border-red-400/20 bg-red-500/10 text-red-200" : "border-red-500/20 bg-red-50 text-red-800"
          )}>
            {t('admin.config.removedLines')}: {pendingDiffStats.removed}
          </span>
        </div>
      </div>

      {restartNotice && (
        <div className={cn(
          "mb-3 sm:mb-4 rounded-xl sm:rounded-2xl border px-3 py-2.5 sm:px-4 sm:py-3",
          isDark ? "border-amber-500/30 bg-amber-500/10" : "border-amber-200 bg-amber-50"
        )}>
          <div className={cn(
            "flex items-start gap-2 text-sm sm:text-sm font-semibold",
            isDark ? "text-amber-200" : "text-amber-900"
          )}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{restartNotice}</span>
          </div>
        </div>
      )}

      {shortcuts}

      <ConfigEditorPanel
        configPath={configPath || t('admin.config.pathUnavailable')}
        content={content}
        notes={notes}
        errors={validationErrors}
        jumpTo={jumpTo}
        loading={busy}
        saveDisabled={isSaveDisabled}
        onChange={onChange}
        onTest={onTest}
        onSave={onSave}
        onCancel={onCancel || (() => {})}
        title={t('admin.config.title')}
        testLabel={t('admin.config.testContent')}
        saveLabel={saveLabel || t('admin.config.saveAndReload')}
        cancelLabel={t('common.cancel')}
        showCancel={showCancel}
        isDark={isDark}
        actionsPrefix={quickWizardEnabled ? actionButtons : undefined}
      />

      {reloadSummary && (
        <div className={cn(
          'mt-3 rounded-xl px-3 py-2 text-sm sm:text-sm font-mono border font-bold shadow-sm transition-colors',
          reloadSummaryLevel === 'success' && (isDark ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-900 border-emerald-200'),
          reloadSummaryLevel === 'warning' && (isDark ? 'bg-amber-500/10 text-amber-200 border-amber-500/30' : 'bg-amber-50 text-amber-900 border-amber-200'),
          reloadSummaryLevel === 'error' && (isDark ? 'bg-red-500/10 text-red-200 border-red-500/30' : 'bg-red-50 text-red-900 border-red-200'),
          reloadSummaryLevel === 'info' && (isDark ? 'bg-white/5 text-white/70 border-white/10' : 'bg-slate-100 text-slate-800 border-slate-200'),
        )}>
          {reloadSummary}
        </div>
      )}

      {quickWizardEnabled && (
        <ConfigQuickWizardModal
          tomlAdapter={tomlAdapter}
          isOpen={isQuickWizardOpen}
          onClose={() => setIsQuickWizardOpen(false)}
          content={content}
          onContentChange={onChange}
          {...(quickWizardInitialStep ? { initialStep: quickWizardInitialStep } : {})}
          {...(runtimeOs ? { runtimeOs } : {})}
          {...(onResetAdminPassword ? { onOpenAdminPassword: openAdminPassword } : {})}
          {...(quickWizardLicense ? { onOpenLicenseManagement: openLicenseManagement } : {})}
          onOpenStorageConfig={openStorageConfig}
        />
      )}

      {onResetAdminPassword && (
        <AdminPasswordPanel
          mode="modal"
          isOpen={isAdminPasswordOpen}
          onClose={() => setIsAdminPasswordOpen(false)}
          onConfirm={onResetAdminPassword}
          loading={Boolean(isResettingAdminPassword)}
          showWarning={true}
          showRandomGenerator={true}
          minPasswordLength={8}
          zIndex={150}
          {...adminPasswordPanelProps}
        />
      )}

      {quickWizardLicense && (
        <LicenseManagementModal
          isOpen={isLicenseOpen}
          onClose={() => setIsLicenseOpen(false)}
          isValid={quickWizardLicense.isValid}
          currentUsers={quickWizardLicense.currentUsers}
          maxUsers={quickWizardLicense.maxUsers}
          deviceCode={quickWizardLicense.deviceCode}
          licenseKey={quickWizardLicense.licenseKey}
          saving={quickWizardLicense.saving}
          onLicenseKeyChange={quickWizardLicense.onLicenseKeyChange}
          onApplyLicense={() => {
            const nextKey = quickWizardLicense.licenseKey.trim();
            if (nextKey.length > 0) {
              try {
                const parsed = tomlAdapter.parse(content);
                if (isRecord(parsed)) {
                  const nextConfig = deepClone(parsed);
                  const licenseSection = ensureRecord(nextConfig, 'license');
                  licenseSection.license_key = nextKey;
                  const nextContent = tomlAdapter.stringify(nextConfig);
                  onChange(nextContent);
                }
              } catch {
                // Ignore TOML parse errors; backend apply may still validate.
              }
            }
            quickWizardLicense.onApplyLicense();
          }}
        />
      )}

      <VfsStorageConfigModal
        isOpen={isStorageOpen}
        onClose={() => setIsStorageOpen(false)}
        tomlAdapter={tomlAdapter}
        content={content}
        {...(onPickStorageDirectory ? { onPickDirectory: onPickStorageDirectory } : {})}
        onContentChange={(nextContent) => {
          onChange(nextContent);
        }}
      />
    </div>
  );
};
