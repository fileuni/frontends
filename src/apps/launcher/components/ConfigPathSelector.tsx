import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Check, X } from 'lucide-react';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import { cn } from '@/lib/utils';
import { useEscapeToCloseTopLayer } from '@/hooks/useEscapeToCloseTopLayer';

export interface ConfigPathValidationResult {
  valid: boolean;
  error?: string;
}

export interface RuntimeDirValue {
  runtimeDir: string;
}

interface RuntimeDirPreset {
  runtimeDir: string;
}

interface ConfigPathSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPath: (value: RuntimeDirValue) => Promise<void>;
  onValidatePath: (value: RuntimeDirValue) => Promise<ConfigPathValidationResult>;
  onBrowsePath: () => Promise<string | null>;
  onPreparePath: (value: RuntimeDirValue) => Promise<void>;
  canClose?: boolean;
  initialValue?: RuntimeDirValue | undefined;
  currentPreset?: RuntimeDirPreset | undefined;
  defaultPreset?: RuntimeDirPreset | undefined;
}

const pickPrimaryRuntimeDir = (value?: RuntimeDirValue | RuntimeDirPreset): string => {
  if (!value) {
    return '';
  }
  return value.runtimeDir.trim();
};

const buildPresetLines = (preset?: RuntimeDirPreset): string[] => {
  if (!preset) {
    return [];
  }

  const runtimeDir = preset.runtimeDir.trim();
  return runtimeDir ? [runtimeDir] : [];
};

export const ConfigPathSelector: React.FC<ConfigPathSelectorProps> = ({
  isOpen,
  onClose,
  onConfirmPath,
  onValidatePath,
  onBrowsePath,
  onPreparePath,
  canClose = true,
  initialValue,
  currentPreset,
  defaultPreset,
}) => {
  const { t } = useTranslation();
  const [runtimeDir, setRuntimeDir] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === 'dark';

  const currentPresetLines = useMemo(() => buildPresetLines(currentPreset), [currentPreset]);
  const defaultPresetLines = useMemo(() => buildPresetLines(defaultPreset), [defaultPreset]);

  const extractErrorMessage = (errorValue: unknown): string => {
    if (errorValue instanceof Error) {
      return errorValue.message;
    }
    return String(errorValue);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setRuntimeDir(
        pickPrimaryRuntimeDir(initialValue) || pickPrimaryRuntimeDir(defaultPreset) || ''
      );
      setIsSubmitting(false);
    }
  }, [defaultPreset, initialValue, isOpen]);

  useEscapeToCloseTopLayer({
    active: isOpen && canClose,
    enabled: canClose,
    onEscape: onClose,
  });

  const handleBrowse = async () => {
    try {
      const selected = await onBrowsePath();
      if (selected) {
        setRuntimeDir(selected);
        setError(null);
      }
    } catch (errorValue: unknown) {
      setError(extractErrorMessage(errorValue));
    }
  };

  const handleConfirm = async () => {
    const trimmedRuntimeDir = runtimeDir.trim();
    const payload = { runtimeDir: trimmedRuntimeDir };
    setError(null);
    setIsSubmitting(true);
    try {
      const validation = await onValidatePath(payload);
      if (!validation.valid) {
        setError(validation.error || t('config_selector.invalid_config'));
        return;
      }
      await onPreparePath(payload);
      await onConfirmPath(payload);
    } catch (errorValue: unknown) {
      setError(extractErrorMessage(errorValue));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted || !isOpen) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed inset-0 flex items-center justify-center z-[220] p-2 sm:p-4 animate-in fade-in duration-300',
        isDark ? 'bg-black/95' : 'bg-slate-900/80'
      )}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          'rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in duration-300 flex flex-col min-h-0 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]',
          isDark
            ? 'bg-slate-950 border border-white/10 ring-1 ring-white/5'
            : 'bg-white border border-gray-200'
        )}
      >
        <div className="bg-gradient-to-r from-blue-600 to-cyan-700 p-4 sm:p-6 text-white relative shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md shadow-inner">
              <img src="/favicon.svg" alt="FileUni Logo" width={48} height={48} className="drop-shadow-lg" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">{t('config_selector.title')}</h2>
              <p className="text-sm text-blue-100/80">{t('config_selector.subtitle')}</p>
            </div>
          </div>
          {canClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-all"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar p-4 sm:p-6 space-y-5">
          <div
            className={cn(
              'p-4 border rounded-xl flex items-start gap-3',
              isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'
            )}
          >
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <div className={cn('space-y-1', isDark ? 'text-amber-200' : 'text-amber-800')}>
              <p className="text-sm font-semibold">{t('config_selector.no_config_warning')}</p>
              <p className="text-sm leading-6 opacity-80">{t('config_selector.default_hint')}</p>
            </div>
          </div>

          {error && (
            <div
              className={cn(
                'p-3 border rounded-xl text-sm font-semibold flex items-center gap-2',
                isDark
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  : 'bg-rose-50 border-rose-200 text-rose-600'
              )}
            >
              <AlertTriangle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2.5">
            <label
              htmlFor="runtime-dir-input"
              className={cn(
                'text-xs font-black uppercase tracking-[0.1em]',
                isDark ? 'text-slate-500' : 'text-slate-400'
              )}
            >
              {t('config_selector.config_path')}
            </label>
            <p className={cn('text-sm leading-6', isDark ? 'text-slate-400' : 'text-slate-500')}>
              {t('config_selector.config_path_desc')}
            </p>
            <div className="flex gap-2">
              <input
                id="runtime-dir-input"
                type="text"
                value={runtimeDir}
                onChange={(event) => setRuntimeDir(event.target.value)}
                placeholder={t('config_selector.path_placeholder')}
                className={cn(
                  'flex-1 px-4 py-3 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all',
                  isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-slate-900'
                )}
              />
              <button
                type="button"
                onClick={() => void handleBrowse()}
                className={cn(
                  'px-4 py-3 rounded-xl text-sm font-bold transition-all',
                  isDark
                    ? 'bg-slate-900 hover:bg-slate-800 text-slate-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-slate-700'
                )}
              >
                {t('config_selector.browse')}
              </button>
            </div>
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className={cn('w-full border-t', isDark ? 'border-white/5' : 'border-gray-100')} />
            </div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.2em]">
              <span className={cn('px-4', isDark ? 'bg-slate-950 text-slate-700' : 'bg-white text-slate-400')}>
                {t('config_selector.or')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setRuntimeDir(pickPrimaryRuntimeDir(currentPreset));
              }}
              className={cn(
                'p-4 text-xs border rounded-xl transition-all text-left group',
                isDark
                  ? 'bg-white/[0.02] border-white/5 hover:border-white/10'
                  : 'bg-gray-50 border-gray-200 hover:bg-white hover:shadow-md'
              )}
            >
              <span className={cn('font-black uppercase tracking-wider block mb-2', isDark ? 'text-slate-400' : 'text-slate-600')}>
                {t('config_selector.current_dir')}
              </span>
              <span className={cn('block mb-2 text-xs leading-5', isDark ? 'text-slate-500' : 'text-slate-500')}>
                {t('config_selector.current_dir_desc')}
              </span>
              {currentPresetLines.map((line) => (
                <span key={`current:${line}`} className={cn('block truncate mb-1 last:mb-0', isDark ? 'text-slate-500' : 'text-slate-400')}>
                  {line}
                </span>
              ))}
            </button>
            <button
              type="button"
              onClick={() => {
                setRuntimeDir(pickPrimaryRuntimeDir(defaultPreset));
              }}
              className={cn(
                'p-4 text-xs border rounded-xl transition-all text-left group',
                isDark
                  ? 'bg-white/[0.02] border-white/5 hover:border-white/10'
                  : 'bg-gray-50 border-gray-200 hover:bg-white hover:shadow-md'
              )}
            >
              <span className={cn('font-black uppercase tracking-wider block mb-2', isDark ? 'text-slate-400' : 'text-slate-600')}>
                {t('config_selector.default_dir')}
              </span>
              <span className={cn('block mb-2 text-xs leading-5', isDark ? 'text-slate-500' : 'text-slate-500')}>
                {t('config_selector.default_dir_desc')}
              </span>
              {defaultPresetLines.map((line) => (
                <span key={`default:${line}`} className={cn('block truncate mb-1 last:mb-0', isDark ? 'text-slate-500' : 'text-slate-400')}>
                  {line}
                </span>
              ))}
            </button>
          </div>
        </div>

        <div
          className={cn(
            'flex items-center justify-end gap-3 p-4 sm:p-6 border-t shrink-0',
            isDark ? 'border-white/10 bg-black/40' : 'border-gray-100 bg-gray-50'
          )}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={!canClose || isSubmitting}
            className={cn(
              'px-5 py-2.5 text-sm font-bold transition-all disabled:opacity-50',
              isDark ? 'text-slate-500 hover:text-slate-200' : 'text-slate-500 hover:text-slate-900'
            )}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 text-white rounded-xl text-sm font-black shadow-xl shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check size={18} />
            )}
            {t('config_selector.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
