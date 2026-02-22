import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, WandSparkles } from 'lucide-react';
import { ConfigEditorPanel, type ConfigError } from './ConfigEditorPanel';
import { ConfigQuickWizardModal, type ConfigQuickWizardModalProps } from './ConfigQuickWizardModal';
import type { ConfigNoteEntry } from './ConfigRawEditor';
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
  onCancel?: () => void;
  showCancel?: boolean;
  reloadSummary?: string;
  reloadSummaryLevel?: 'success' | 'warning' | 'error' | 'info';
  quickWizardLicense?: ConfigQuickWizardModalProps['licenseWizard'];
  quickWizardEnabled?: boolean;
  onClearValidationErrors?: () => void;
  onResetAdminPassword?: (password: string) => Promise<void | string | { username?: string }>;
  isResettingAdminPassword?: boolean;
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
  onCancel,
  showCancel = false,
  reloadSummary = '',
  reloadSummaryLevel = 'info',
  quickWizardLicense,
  quickWizardEnabled = true,
  onClearValidationErrors,
  onResetAdminPassword,
  isResettingAdminPassword,
}) => {
  const { t } = useTranslation();
  const [isQuickWizardOpen, setIsQuickWizardOpen] = useState(false);

  const isDirty = content !== savedContent;
  const pendingDiffStats = useMemo(() => calculateLineDiffStats(savedContent, content), [savedContent, content]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center font-black animate-pulse opacity-50 uppercase tracking-widest">
        {t('admin.config.loading')}
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl sm:rounded-[2.5rem] bg-white/[0.02] border border-white/5 p-3 sm:p-6 shadow-2xl overflow-hidden transition-all hover:border-white/10">
      {validationErrors.length > 0 && (
        <div className="mb-4 sm:mb-6 rounded-xl sm:rounded-2xl bg-red-500/10 border border-red-500/20 p-3 sm:p-5 animate-in fade-in slide-in-from-top-2 shadow-inner">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle size={16} className="animate-pulse sm:w-[18px]" />
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wide">
                {t('admin.config.testFailed')} ({validationErrors.length})
              </h3>
            </div>
            {onClearValidationErrors && (
              <button
                type="button"
                className="h-7 px-2 text-xs uppercase font-bold opacity-50 hover:opacity-100 rounded"
                onClick={onClearValidationErrors}
              >
                {t('common.clear')}
              </button>
            )}
          </div>
          <div className="max-h-48 sm:max-h-64 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2 sm:gap-2.5">
            {validationErrors.map((err, index) => (
              <div key={`${index}-${err.message}`} className="flex items-start gap-2 sm:gap-3 group p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-black/20 hover:bg-black/40 transition-all border border-white/5 hover:border-red-500/20">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm leading-relaxed text-red-200/90 group-hover:text-red-100 transition-colors font-mono font-medium">
                    {err.message}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {typeof err.key === 'string' && err.key.trim().length > 0 && (
                      <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded border border-red-500/30 bg-red-500/10 text-red-200 font-mono">
                        key: {err.key}
                      </span>
                    )}
                    {typeof err.line === 'number' && err.line > 0 && (
                      <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded border border-white/10 bg-black/20 text-red-100/80 font-mono">
                        line: {err.line}
                      </span>
                    )}
                    {typeof err.column === 'number' && err.column > 0 && (
                      <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded border border-white/10 bg-black/20 text-red-100/80 font-mono">
                        column: {err.column}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-3 sm:mb-4 rounded-xl sm:rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs">
          <span className={cn(
            'rounded-lg border px-2 py-0.5 font-bold uppercase tracking-wide',
            isDirty ? 'border-amber-400/30 bg-amber-500/10 text-amber-200' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
          )}>
            {isDirty ? t('admin.config.pendingChanges') : t('admin.config.noPendingChanges')}
          </span>
          <span className="font-bold uppercase opacity-50">{t('admin.config.diffSummary')}</span>
          <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono">
            {t('admin.config.changedLines')}: {pendingDiffStats.changed}
          </span>
          <span className="rounded border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-emerald-200">
            {t('admin.config.addedLines')}: {pendingDiffStats.added}
          </span>
          <span className="rounded border border-red-400/20 bg-red-500/10 px-2 py-0.5 font-mono text-red-200">
            {t('admin.config.removedLines')}: {pendingDiffStats.removed}
          </span>
        </div>
      </div>

      <ConfigEditorPanel
        configPath={configPath || t('admin.config.pathUnavailable')}
        content={content}
        notes={notes}
        errors={validationErrors}
        loading={busy}
        saveDisabled={!isDirty}
        onChange={onChange}
        onTest={onTest}
        onSave={onSave}
        onCancel={onCancel || (() => {})}
        title={t('admin.config.title')}
        testLabel={t('admin.config.testContent')}
        saveLabel={t('admin.config.saveAndReload')}
        cancelLabel={t('common.cancel')}
        showCancel={showCancel}
        actionsPrefix={quickWizardEnabled ? (
          <button
            type="button"
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-white/15 hover:bg-white/10 text-xs sm:text-sm font-bold uppercase tracking-wide transition-all inline-flex items-center gap-1.5"
            onClick={() => setIsQuickWizardOpen(true)}
          >
            <WandSparkles size={14} />
            {t('admin.config.quickWizard.title')}
          </button>
        ) : undefined}
      />

      {reloadSummary && (
        <div className={cn(
          'mt-3 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono border',
          reloadSummaryLevel === 'success' && 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
          reloadSummaryLevel === 'warning' && 'bg-amber-500/10 text-amber-200 border-amber-500/30',
          reloadSummaryLevel === 'error' && 'bg-red-500/10 text-red-200 border-red-500/30',
          reloadSummaryLevel === 'info' && 'bg-white/5 text-white/70 border-white/10',
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
          licenseWizard={quickWizardLicense}
          onResetAdminPassword={onResetAdminPassword}
          isResettingAdminPassword={isResettingAdminPassword}
        />
      )}
    </div>
  );
};
