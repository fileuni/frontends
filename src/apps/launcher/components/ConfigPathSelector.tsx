import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { GlassModalShell } from '@fileuni/ts-shared/modal-shell';
import { AlertTriangle, Check, X } from "lucide-react";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { cn } from "@/lib/utils";

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
  onValidatePath: (
    value: RuntimeDirValue,
  ) => Promise<ConfigPathValidationResult>;
  onBrowsePath: () => Promise<string | null>;
  onPreparePath: (value: RuntimeDirValue) => Promise<void>;
  canClose?: boolean;
  initialValue?: RuntimeDirValue | undefined;
  currentPreset?: RuntimeDirPreset | undefined;
  defaultPreset?: RuntimeDirPreset | undefined;
}

const pickPrimaryRuntimeDir = (
  value?: RuntimeDirValue | RuntimeDirPreset,
): string => {
  if (!value) {
    return "";
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
  const [runtimeDir, setRuntimeDir] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === "dark";
  const initialRuntimeDir = pickPrimaryRuntimeDir(initialValue);
  const defaultRuntimeDir = pickPrimaryRuntimeDir(defaultPreset);

  const currentPresetLines = useMemo(
    () => buildPresetLines(currentPreset),
    [currentPreset],
  );
  const defaultPresetLines = useMemo(
    () => buildPresetLines(defaultPreset),
    [defaultPreset],
  );

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
      setRuntimeDir(initialRuntimeDir || defaultRuntimeDir || "");
      setIsSubmitting(false);
    }
  }, [defaultRuntimeDir, initialRuntimeDir, isOpen]);

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
        setError(validation.error || t("systemConfig.configSelector.invalid_config"));
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

  const noop = () => {};
  const effectiveOnClose = canClose ? onClose : noop;

  return (
    <GlassModalShell
      title={(
        <div className="flex min-w-0 items-center gap-4 text-slate-950 dark:text-white">
          <div className="rounded-xl bg-primary/10 p-2 shadow-inner shrink-0">
            <img
              src="/favicon.svg"
              alt="FileUni Logo"
              width={48}
              height={48}
              className="drop-shadow-lg"
            />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight truncate">
              {t("systemConfig.configSelector.title")}
            </h2>
            <p className="truncate text-sm text-slate-600 dark:text-white/70">
              {t("systemConfig.configSelector.subtitle")}
            </p>
          </div>
        </div>
      )}
      onClose={effectiveOnClose}
      maxWidthClassName="max-w-lg"
      panelClassName="rounded-2xl shadow-2xl animate-in zoom-in duration-300 overflow-hidden"
      bodyClassName="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar p-4 sm:p-6 space-y-5"
      overlayClassName="animate-in fade-in duration-300"
      zIndexClassName="z-[220]"
      containerClassName="p-2 sm:p-4"
      closeButton={canClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-2 text-slate-500 transition-all hover:bg-zinc-100 hover:text-slate-900 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <X size={20} />
        </button>
      ) : null}
      footer={(
        <div
          className={cn(
            "w-full flex items-center justify-end gap-3",
            isDark ? "text-slate-500" : "text-slate-500",
          )}
        >
          <button
            data-testid="launcher-runtime-dir-cancel"
            type="button"
            onClick={onClose}
            disabled={!canClose || isSubmitting}
            className={cn(
              "px-5 py-2.5 text-sm font-bold transition-all disabled:opacity-50",
              isDark
                ? "text-slate-500 hover:text-slate-200"
                : "text-slate-500 hover:text-slate-900",
            )}
          >
            {t("common.cancel")}
          </button>
          <button
            data-testid="launcher-runtime-dir-confirm"
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
            {t("systemConfig.configSelector.confirm")}
          </button>
        </div>
      )}
    >
      <div data-testid="launcher-config-selector" className="space-y-5">
        <div
          className={cn(
            "p-4 border rounded-xl flex items-start gap-3",
            isDark
              ? "bg-amber-500/10 border-amber-500/20"
              : "bg-amber-50 border-amber-200",
          )}
        >
          <AlertTriangle
            className="text-amber-500 shrink-0 mt-0.5"
            size={18}
          />
          <div
            className={cn(
              "space-y-1",
              isDark ? "text-amber-200" : "text-amber-800",
            )}
          >
            <p className="text-sm font-semibold">
              {t("systemConfig.configSelector.no_config_warning")}
            </p>
            <p className="text-sm leading-6 opacity-80">
              {t("systemConfig.configSelector.default_hint")}
            </p>
          </div>
        </div>

        {error && (
          <div
            data-testid="launcher-runtime-dir-error"
            className={cn(
              "p-3 border rounded-xl text-sm font-semibold flex items-center gap-2",
              isDark
                ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                : "bg-rose-50 border-rose-200 text-rose-600",
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
              "text-xs font-black tracking-[0.1em]",
              isDark ? "text-slate-500" : "text-slate-400",
            )}
          >
            {t("systemConfig.configSelector.config_path")}
          </label>
          <p
            className={cn(
              "text-sm leading-6",
              isDark ? "text-slate-400" : "text-slate-500",
            )}
          >
            {t("systemConfig.configSelector.config_path_desc")}
          </p>
          <div className="flex gap-2">
            <input
              data-testid="launcher-runtime-dir-input"
              id="runtime-dir-input"
              type="text"
              value={runtimeDir}
              onChange={(event) => setRuntimeDir(event.target.value)}
              placeholder={t("systemConfig.configSelector.path_placeholder")}
              className={cn(
                "flex-1 px-4 py-3 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all",
                isDark
                  ? "bg-white/5 border-white/10 text-white"
                  : "bg-gray-50 border-gray-200 text-slate-900",
              )}
            />
            <button
              data-testid="launcher-runtime-dir-browse"
              type="button"
              onClick={() => void handleBrowse()}
              className={cn(
                "px-4 py-3 rounded-xl text-sm font-bold transition-all",
                isDark
                  ? "bg-slate-900 hover:bg-slate-800 text-slate-300"
                  : "bg-gray-100 hover:bg-gray-200 text-slate-700",
              )}
            >
              {t("systemConfig.configSelector.browse")}
            </button>
          </div>
        </div>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div
              className={cn(
                "w-full border-t",
                isDark ? "border-white/5" : "border-gray-100",
              )}
            />
          </div>
          <div className="relative flex justify-center text-[10px] font-black tracking-[0.2em]">
            <span
              className={cn(
                "px-4",
                isDark
                  ? "bg-slate-950 text-slate-700"
                  : "bg-white text-slate-400",
              )}
            >
              {t("systemConfig.configSelector.or")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            data-testid="launcher-runtime-dir-current"
            type="button"
            onClick={() => {
              setRuntimeDir(pickPrimaryRuntimeDir(currentPreset));
            }}
            className={cn(
              "p-4 text-xs border rounded-xl transition-all text-left group",
              isDark
                ? "bg-white/[0.02] border-white/5 hover:border-white/10"
                : "bg-gray-50 border-gray-200 hover:bg-white hover:shadow-md",
            )}
          >
            <span
              className={cn(
                "font-black tracking-wider block mb-2",
                isDark ? "text-slate-400" : "text-slate-600",
              )}
            >
              {t("systemConfig.configSelector.current_dir")}
            </span>
            <span
              className={cn(
                "block mb-2 text-xs leading-5",
                isDark ? "text-slate-500" : "text-slate-500",
              )}
            >
              {t("systemConfig.configSelector.current_dir_desc")}
            </span>
            {currentPresetLines.map((line) => (
              <span
                key={`current:${line}`}
                className={cn(
                  "block truncate mb-1 last:mb-0",
                  isDark ? "text-slate-500" : "text-slate-400",
                )}
              >
                {line}
              </span>
            ))}
          </button>
          <button
            data-testid="launcher-runtime-dir-default"
            type="button"
            onClick={() => {
              setRuntimeDir(pickPrimaryRuntimeDir(defaultPreset));
            }}
            className={cn(
              "p-4 text-xs border rounded-xl transition-all text-left group",
              isDark
                ? "bg-white/[0.02] border-white/5 hover:border-white/10"
                : "bg-gray-50 border-gray-200 hover:bg-white hover:shadow-md",
            )}
          >
            <span
              className={cn(
                "font-black tracking-wider block mb-2",
                isDark ? "text-slate-400" : "text-slate-600",
              )}
            >
              {t("systemConfig.configSelector.default_dir")}
            </span>
            <span
              className={cn(
                "block mb-2 text-xs leading-5",
                isDark ? "text-slate-500" : "text-slate-500",
              )}
            >
              {t("systemConfig.configSelector.default_dir_desc")}
            </span>
            {defaultPresetLines.map((line) => (
              <span
                key={`default:${line}`}
                className={cn(
                  "block truncate mb-1 last:mb-0",
                  isDark ? "text-slate-500" : "text-slate-400",
                )}
              >
                {line}
              </span>
            ))}
          </button>
        </div>
      </div>
    </GlassModalShell>
  );
};
