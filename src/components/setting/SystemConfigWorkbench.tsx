import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  FileArchive,
  HardDrive,
  ImagePlus,
  Key,
  Settings2,
  Video,
  WandSparkles,
} from "lucide-react";
import { ConfigEditorPanel } from "./ConfigEditorPanel";
import {
  ConfigQuickSettingsModal,
  type ConfigQuickSettingsModalProps,
  type FriendlyStep,
} from "./ConfigQuickSettingsModal";
import { LicenseManagementModal } from "./LicenseManagementModal";
import { VfsStorageConfigModal } from "./VfsStorageConfigModal";
import {
  CompressionDependencyConfigModal,
  ThumbnailDependencyConfigModal,
  type ExternalToolDiagnosisResponse,
} from "./ExternalDependencyConfigModal";
import type { ProbeExternalTool } from "./SharedFfmpegField";
import {
  MediaTranscodingConfigModal,
  type MediaBackendProbeResponse,
} from "./MediaTranscodingConfigPanel";
import type {
  ConfigError,
  ConfigNoteEntry,
  EditorJumpPosition,
} from "./ConfigRawEditor";
import { deepClone, ensureRecord, isRecord } from "@/lib/configObject";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { cn } from "@/lib/utils";

type LineDiffStats = {
  changed: number;
  added: number;
  removed: number;
};

const calculateLineDiffStats = (
  before: string,
  after: string,
): LineDiffStats => {
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
  tomlAdapter: ConfigQuickSettingsModalProps["tomlAdapter"];
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
  saveLabel?: string | undefined;
  onCancel?: (() => void) | undefined;
  showCancel?: boolean | undefined;
  allowSaveWithoutChanges?: boolean | undefined;
  forceEnableSave?: boolean | undefined;
  reloadSummary?: string | undefined;
  reloadSummaryLevel?: "success" | "warning" | "error" | "info" | undefined;
  restartNotice?: string | undefined;
  quickSettingsLicense?: {
    isValid: boolean;
    msg?: string | undefined;
    deviceCode: string;
    hwId?: string | undefined;
    auxId?: string | undefined;
    expiresAt?: string | null | undefined;
    features?: string[] | undefined;
    licenseKey: string;
    status: import("./useConfigWorkbenchController").ConfigWorkbenchLicenseStatus | null;
    saving: boolean;
    onLicenseKeyChange: (value: string) => void;
    onApplyLicense: (
      update?: {
        registration?: { key?: string | null; enabled: boolean } | null;
        branding_license?: { key?: string | null; enabled: boolean } | null;
        storage_encryption?: { key?: string | null; enabled: boolean } | null;
        branding?: {
          logo_url?: string | null;
          logo_name?: string | null;
          footer_text?: string | null;
        } | null;
      }
    ) => void;
  };
  quickSettingsEnabled?: boolean | undefined;
  runtimeOs?: string | undefined;
  systemHardware?: ConfigQuickSettingsModalProps["systemHardware"] | undefined;
  onClearValidationErrors?: (() => void) | undefined;
  onPickStorageDirectory?: import("./VfsStorageConfigModal").VfsStorageConfigModalProps["onPickDirectory"];
  onDiagnoseExternalTools?: ((
    configuredValues: Record<string, string>,
  ) => Promise<ExternalToolDiagnosisResponse>) | undefined;
  onProbeExternalTool?: ProbeExternalTool | undefined;
  onProbeMediaBackend?: ((payload: {
    ffmpegPath: string;
    backend: string;
    device?: string;
  }) => Promise<MediaBackendProbeResponse>) | undefined;
  settingsCenterMode?: boolean | undefined;
  editorTitle?: string | undefined;
  testLabel?: string | undefined;
  onSetupActionsReady?: ((actions: SetupActionHandles) => void) | undefined;
  setupViewMode?: "visual" | "raw" | undefined;
  onSetupViewChange?: ((mode: "visual" | "raw") => void) | undefined;
  hideShortcuts?: boolean | undefined;
  hideEditorToolbar?: boolean | undefined;
  hideEditorPath?: boolean | undefined;
}

export interface SetupActionHandles {
  openLicenseManagement?: () => void;
  openStorageConfig: () => void;
  openThumbnailTools: () => void;
  openMediaTranscodingTools: () => void;
  openCompressionTools: () => void;
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
  reloadSummary = "",
  reloadSummaryLevel = "info",
  restartNotice,
  quickSettingsLicense,
  quickSettingsEnabled = true,
  runtimeOs,
  systemHardware,
  onClearValidationErrors,
  onPickStorageDirectory,
  onDiagnoseExternalTools,
  onProbeExternalTool,
  onProbeMediaBackend,
  settingsCenterMode = false,
  editorTitle,
  testLabel,
  onSetupActionsReady,
  setupViewMode,
  onSetupViewChange,
  hideShortcuts = false,
  hideEditorToolbar = false,
  hideEditorPath = false,
}) => {
  const { t } = useTranslation();
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [quickSettingsInitialStep, setQuickSettingsInitialStep] = useState<
    FriendlyStep | undefined
  >(undefined);
  const [isLicenseOpen, setIsLicenseOpen] = useState(false);
  const [isStorageOpen, setIsStorageOpen] = useState(false);
  const [isThumbnailToolsOpen, setIsThumbnailToolsOpen] = useState(false);
  const [isMediaTranscodingOpen, setIsMediaTranscodingOpen] = useState(false);
  const [isCompressionToolsOpen, setIsCompressionToolsOpen] = useState(false);
  const [jumpTo, setJumpTo] = useState<EditorJumpPosition | null>(null);
  const [showRawEditor, setShowRawEditor] = useState(!settingsCenterMode);
  const [showSetupAdvancedActions, setShowSetupAdvancedActions] =
    useState(false);
  const resolvedTheme = useResolvedTheme();

  const isDark = resolvedTheme === "dark";

  const isDirty = content !== savedContent;
  const deferredContent = useDeferredValue(content);
  const pendingDiffStats = useMemo(
    () => calculateLineDiffStats(savedContent, deferredContent),
    [savedContent, deferredContent],
  );
  const isSaveDisabled =
    !forceEnableSave && !allowSaveWithoutChanges && !isDirty;

  useEffect(() => {
    if (!settingsCenterMode) {
      setShowRawEditor(true);
      setShowSetupAdvancedActions(false);
      setIsQuickSettingsOpen(false);
    }
  }, [settingsCenterMode]);

  useEffect(() => {
    if (settingsCenterMode && validationErrors.length > 0) {
      setShowRawEditor(true);
    }
  }, [settingsCenterMode, validationErrors.length]);

  useEffect(() => {
    if (!settingsCenterMode || !setupViewMode) {
      return;
    }
    setShowRawEditor(setupViewMode === "raw");
  }, [settingsCenterMode, setupViewMode]);

  useEffect(() => {
    if (!settingsCenterMode) {
      return;
    }
    onSetupViewChange?.(showRawEditor ? "raw" : "visual");
  }, [onSetupViewChange, settingsCenterMode, showRawEditor]);

  const openQuickSettingsAt = useCallback((step: FriendlyStep) => {
    setQuickSettingsInitialStep(step);
    setIsQuickSettingsOpen(true);
  }, []);

  const openLicenseManagement = useCallback(() => {
    setIsStorageOpen(false);
    setIsThumbnailToolsOpen(false);
    setIsMediaTranscodingOpen(false);
    setIsCompressionToolsOpen(false);
    setIsLicenseOpen(true);
  }, []);

  const openStorageConfig = useCallback(() => {
    setIsLicenseOpen(false);
    setIsThumbnailToolsOpen(false);
    setIsMediaTranscodingOpen(false);
    setIsCompressionToolsOpen(false);
    setIsStorageOpen(true);
  }, []);

  const openThumbnailTools = useCallback(() => {
    setIsLicenseOpen(false);
    setIsStorageOpen(false);
    setIsMediaTranscodingOpen(false);
    setIsCompressionToolsOpen(false);
    setIsThumbnailToolsOpen(true);
  }, []);

  const openMediaTranscodingTools = useCallback(() => {
    setIsLicenseOpen(false);
    setIsStorageOpen(false);
    setIsThumbnailToolsOpen(false);
    setIsCompressionToolsOpen(false);
    setIsMediaTranscodingOpen(true);
  }, []);

  const openCompressionTools = useCallback(() => {
    setIsLicenseOpen(false);
    setIsStorageOpen(false);
    setIsThumbnailToolsOpen(false);
    setIsMediaTranscodingOpen(false);
    setIsCompressionToolsOpen(true);
  }, []);

  useEffect(() => {
    onSetupActionsReady?.({
      ...(quickSettingsLicense ? { openLicenseManagement } : {}),
      openStorageConfig,
      openThumbnailTools,
      openMediaTranscodingTools,
      openCompressionTools,
    });
  }, [
    quickSettingsLicense,
    onSetupActionsReady,
    openCompressionTools,
    openMediaTranscodingTools,
    openLicenseManagement,
    openStorageConfig,
    openThumbnailTools,
  ]);

  if (loading) {
    return (
      <div
        className={cn(
          "h-64 flex items-center justify-center font-black animate-pulse tracking-widest",
          isDark ? "text-white opacity-50" : "text-slate-900 opacity-40",
        )}
      >
        {t("admin.config.loading")}
      </div>
    );
  }

  const actionButtons = (
    <div className="flex items-center gap-2 flex-wrap">
      {quickSettingsEnabled && (!settingsCenterMode || showRawEditor) && (
        <button
          type="button"
          className={cn(
            "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border font-black tracking-wide transition-all inline-flex items-center gap-1.5 shadow-sm",
            isDark
              ? "border-white/15 hover:bg-white/10 text-slate-300"
              : "border-slate-300 bg-white hover:bg-slate-50 text-slate-900",
          )}
          onClick={() => setIsQuickSettingsOpen(true)}
        >
          <WandSparkles size={18} className="text-primary" />
          {settingsCenterMode
            ? t("systemConfig.setup.editor.quickSettings")
            : t("admin.config.quickSettings.title")}
        </button>
      )}
    </div>
  );

  const shortcuts = (
    <div
      className={cn(
        "mb-3 sm:mb-4 rounded-2xl border p-3 sm:p-4",
        isDark
          ? "border-white/10 bg-black/20"
          : "border-slate-300 bg-slate-50/70 shadow-inner",
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div>
          <div
            className={cn(
              "text-sm font-black tracking-wide",
              isDark ? "text-slate-200" : "text-slate-900",
            )}
          >
            {t("admin.config.shortcuts.title")}
          </div>
          <div
            className={cn(
              "text-sm sm:text-sm font-bold",
              isDark ? "text-slate-500" : "text-slate-600",
            )}
          >
            {t("admin.config.shortcuts.subtitle")}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {quickSettingsEnabled && !settingsCenterMode && (
          <button
            type="button"
            className={cn(
              "h-11 rounded-xl border px-4 text-sm sm:text-sm font-black transition-all inline-flex items-center justify-center gap-2 shadow-sm",
              isDark
                ? "border-primary/30 bg-primary/10 text-slate-100 hover:bg-primary/15"
                : "border-primary/30 bg-primary/5 text-slate-900 hover:bg-primary/10",
            )}
            onClick={() => openQuickSettingsAt("performance")}
          >
            <WandSparkles size={18} className="text-primary" />
            {t("admin.config.quickSettings.steps.performance")}
          </button>
        )}

        {quickSettingsEnabled && !settingsCenterMode && (
          <button
            type="button"
            className={cn(
              "h-11 rounded-xl border px-4 text-sm sm:text-sm font-black transition-all inline-flex items-center justify-center gap-2 shadow-sm",
              isDark
                ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15"
                : "border-cyan-500/30 bg-cyan-50 text-cyan-900 hover:bg-cyan-100",
            )}
            onClick={() => openQuickSettingsAt("database")}
          >
            <Settings2
              size={18}
              className={isDark ? "text-cyan-300" : "text-cyan-700"}
            />
            {t("admin.config.quickSettings.steps.database")}
          </button>
        )}

        {quickSettingsEnabled && !settingsCenterMode && (
          <button
            type="button"
            className={cn(
              "h-11 rounded-xl border px-4 text-sm sm:text-sm font-black transition-all inline-flex items-center justify-center gap-2 shadow-sm",
              isDark
                ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                : "border-emerald-500/25 bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
            )}
            onClick={() => openQuickSettingsAt("cache")}
          >
            <Settings2
              size={18}
              className={isDark ? "text-emerald-300" : "text-emerald-700"}
            />
            {t("admin.config.quickSettings.steps.cache")}
          </button>
        )}

        {!settingsCenterMode && quickSettingsLicense && (
          <button
            type="button"
            className={cn(
              "h-11 rounded-xl border px-4 text-sm sm:text-sm font-black transition-all inline-flex items-center justify-center gap-2 shadow-sm",
              isDark
                ? "border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
                : "border-amber-500/30 bg-amber-50 text-amber-900 hover:bg-amber-100",
            )}
            onClick={openLicenseManagement}
          >
            <Key
              size={18}
              className={isDark ? "text-amber-400" : "text-amber-600"}
            />
            {t("admin.config.license.title")}
          </button>
        )}

        {!settingsCenterMode && (
          <button
            type="button"
            className={cn(
              "h-11 rounded-xl border px-4 text-sm sm:text-sm font-black transition-all inline-flex items-center justify-center gap-2 shadow-sm",
              isDark
                ? "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
                : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
            )}
            onClick={openStorageConfig}
          >
            <HardDrive
              size={18}
              className={isDark ? "text-slate-200" : "text-slate-700"}
            />
            {t("admin.config.storage.title")}
          </button>
        )}

        {!settingsCenterMode && (
          <button
            type="button"
            className={cn(
              "h-11 rounded-xl border px-4 text-sm sm:text-sm font-black transition-all inline-flex items-center justify-center gap-2 shadow-sm",
              isDark
                ? "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-500/15"
                : "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-900 hover:bg-fuchsia-100",
            )}
            onClick={openThumbnailTools}
          >
            <ImagePlus
              size={18}
              className={isDark ? "text-fuchsia-300" : "text-fuchsia-700"}
            />
            {t("admin.config.thumbnail.title")}
          </button>
        )}

        {!settingsCenterMode && (
          <button
            type="button"
            className={cn(
              "h-11 rounded-xl border px-4 text-sm sm:text-sm font-black transition-all inline-flex items-center justify-center gap-2 shadow-sm",
              isDark
                ? "border-violet-400/25 bg-violet-500/10 text-violet-100 hover:bg-violet-500/15"
                : "border-violet-300 bg-violet-50 text-violet-900 hover:bg-violet-100",
            )}
            onClick={openMediaTranscodingTools}
          >
            <Video
              size={18}
              className={isDark ? "text-violet-300" : "text-violet-700"}
            />
            {t("admin.config.mediaTranscoding.title")}
          </button>
        )}

        {!settingsCenterMode && (
          <button
            type="button"
            className={cn(
              "h-11 rounded-xl border px-4 text-sm sm:text-sm font-black transition-all inline-flex items-center justify-center gap-2 shadow-sm",
              isDark
                ? "border-orange-400/25 bg-orange-500/10 text-orange-100 hover:bg-orange-500/15"
                : "border-orange-300 bg-orange-50 text-orange-900 hover:bg-orange-100",
            )}
            onClick={openCompressionTools}
          >
            <FileArchive
              size={18}
              className={isDark ? "text-orange-300" : "text-orange-700"}
            />
            {t("admin.config.compression.title")}
          </button>
        )}
      </div>

      {settingsCenterMode && (
        <div
          className={cn(
            "mt-3 rounded-xl border p-3",
            isDark
              ? "border-white/10 bg-black/20"
              : "border-slate-200 bg-white",
          )}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div
                className={cn(
                  "text-sm font-black",
                  isDark ? "text-slate-100" : "text-slate-900",
                )}
              >
                {t("systemConfig.setup.editor.moreActionsTitle")}
              </div>
              <div
                className={cn(
                  "text-sm leading-6",
                  isDark ? "text-slate-400" : "text-slate-600",
                )}
              >
                {t("systemConfig.setup.editor.moreActionsDesc")}
              </div>
            </div>
            <button
              type="button"
              className={cn(
                "h-10 rounded-lg border px-4 text-sm font-black transition-all shrink-0",
                isDark
                  ? "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
                  : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
              )}
              onClick={() => setShowSetupAdvancedActions((prev) => !prev)}
            >
              {showSetupAdvancedActions
                ? t("systemConfig.setup.editor.hideMoreActions")
                : t("systemConfig.setup.editor.showMoreActions")}
            </button>
          </div>

          {showSetupAdvancedActions && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {quickSettingsLicense && (
                <button
                  type="button"
                  className={cn(
                    "h-11 rounded-xl border px-4 text-sm sm:text-sm font-black transition-all inline-flex items-center justify-center gap-2 shadow-sm",
                    isDark
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
                      : "border-amber-500/30 bg-amber-50 text-amber-900 hover:bg-amber-100",
                  )}
                  onClick={openLicenseManagement}
                >
                  <Key
                    size={18}
                    className={isDark ? "text-amber-400" : "text-amber-600"}
                  />
                  {t("admin.config.license.title")}
                </button>
              )}

              <button
                type="button"
                className={cn(
                  "h-11 rounded-xl border px-4 text-sm sm:text-sm font-black transition-all inline-flex items-center justify-center gap-2 shadow-sm",
                  isDark
                    ? "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
                    : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
                )}
                onClick={openStorageConfig}
              >
                <HardDrive
                  size={18}
                  className={isDark ? "text-slate-200" : "text-slate-700"}
                />
                {t("admin.config.storage.title")}
              </button>

              <button
                type="button"
                className={cn(
                  "h-11 rounded-xl border px-4 text-sm sm:text-sm font-black transition-all inline-flex items-center justify-center gap-2 shadow-sm",
                  isDark
                    ? "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-500/15"
                    : "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-900 hover:bg-fuchsia-100",
                )}
                onClick={openThumbnailTools}
              >
                <ImagePlus
                  size={18}
                  className={isDark ? "text-fuchsia-300" : "text-fuchsia-700"}
                />
                {t("admin.config.thumbnail.title")}
              </button>

              <button
                type="button"
                className={cn(
                  "h-11 rounded-xl border px-4 text-sm sm:text-sm font-black transition-all inline-flex items-center justify-center gap-2 shadow-sm",
                  isDark
                    ? "border-violet-400/25 bg-violet-500/10 text-violet-100 hover:bg-violet-500/15"
                    : "border-violet-300 bg-violet-50 text-violet-900 hover:bg-violet-100",
                )}
                onClick={openMediaTranscodingTools}
              >
                <Video
                  size={18}
                  className={isDark ? "text-violet-300" : "text-violet-700"}
                />
                {t("admin.config.mediaTranscoding.title")}
              </button>

              <button
                type="button"
                className={cn(
                  "h-11 rounded-xl border px-4 text-sm sm:text-sm font-black transition-all inline-flex items-center justify-center gap-2 shadow-sm",
                  isDark
                    ? "border-orange-400/25 bg-orange-500/10 text-orange-100 hover:bg-orange-500/15"
                    : "border-orange-300 bg-orange-50 text-orange-900 hover:bg-orange-100",
                )}
                onClick={openCompressionTools}
              >
                <FileArchive
                  size={18}
                  className={isDark ? "text-orange-300" : "text-orange-700"}
                />
                {t("admin.config.compression.title")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl sm:rounded-[2.5rem] border p-3 sm:p-6 shadow-md transition-colors overflow-hidden",
        isDark
          ? "bg-white/[0.02] border-white/5 shadow-black/40 hover:border-white/10"
          : "bg-white border-slate-300 shadow-slate-200/50 hover:border-slate-400",
      )}
    >
      {validationErrors.length > 0 && (
        <div
          className={cn(
            "mb-4 sm:mb-6 rounded-xl sm:rounded-2xl border p-3 sm:p-5 shadow-inner",
            isDark
              ? "bg-red-500/10 border-red-500/20"
              : "bg-red-50 border-red-200",
          )}
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div
              className={cn(
                "flex items-center gap-2",
                isDark ? "text-red-400" : "text-red-700",
              )}
            >
              <AlertTriangle size={16} className="animate-pulse sm:w-[18px]" />
              <h3 className="text-sm sm:text-sm font-black tracking-wide">
                {t("admin.config.testFailed")} ({validationErrors.length})
              </h3>
            </div>
            {onClearValidationErrors && (
              <button
                type="button"
                className={cn(
                  "h-7 px-2 text-sm font-black transition-opacity",
                  isDark
                    ? "text-slate-400 opacity-50 hover:opacity-100"
                    : "text-red-800 opacity-70 hover:opacity-100",
                )}
                onClick={onClearValidationErrors}
              >
                {t("common.clear")}
              </button>
            )}
          </div>
          <div className="max-h-48 sm:max-h-64 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2 sm:gap-2.5">
            {validationErrors.map((err) => {
              const canJump = typeof err.line === "number" && err.line > 0;
              return (
                <button
                  type="button"
                  key={`${err.key ?? "unknown"}:${err.line ?? 0}:${err.column ?? 0}:${err.message}`}
                  title={canJump ? `Jump to line ${err.line}` : undefined}
                  onClick={() => {
                    if (!canJump) return;
                    setJumpTo({ line: err.line, column: err.column });
                  }}
                  className={cn(
                    "flex items-start gap-2 sm:gap-3 group p-2.5 sm:p-3 rounded-lg sm:rounded-xl transition-colors border text-left",
                    isDark
                      ? "bg-black/20 hover:bg-black/40 border-white/5 hover:border-red-500/20"
                      : "bg-white hover:bg-red-50/30 border-slate-100 hover:border-red-200",
                    canJump && "cursor-pointer",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm sm:text-sm leading-relaxed font-mono font-bold transition-colors",
                        isDark
                          ? "text-red-200/90 group-hover:text-red-100"
                          : "text-red-900",
                      )}
                    >
                      {err.message}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {typeof err.key === "string" &&
                        err.key.trim().length > 0 && (
                          <span
                            className={cn(
                              "text-sm sm:text-sm px-1.5 py-0.5 rounded border font-mono font-black",
                              isDark
                                ? "border-red-500/30 bg-red-500/10 text-red-200"
                                : "border-red-200 bg-red-100 text-red-800",
                            )}
                          >
                            key: {err.key}
                          </span>
                        )}
                      {typeof err.line === "number" && err.line > 0 && (
                        <span
                          className={cn(
                            "text-sm sm:text-sm px-1.5 py-0.5 rounded border font-mono font-bold",
                            isDark
                              ? "border-white/10 bg-black/20 text-red-100/80"
                              : "border-slate-200 bg-slate-100 text-slate-700",
                          )}
                        >
                          line: {err.line}
                        </span>
                      )}
                      {typeof err.column === "number" && err.column > 0 && (
                        <span
                          className={cn(
                            "text-sm sm:text-sm px-1.5 py-0.5 rounded border font-mono font-bold",
                            isDark
                              ? "border-white/10 bg-black/20 text-red-100/80"
                              : "border-slate-200 bg-slate-100 text-slate-700",
                          )}
                        >
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

      {!settingsCenterMode && (
        <div
          className={cn(
            "mb-3 sm:mb-4 rounded-xl sm:rounded-2xl border px-3 py-2.5 sm:px-4 sm:py-3 transition-colors",
            isDark
              ? "border-white/10 bg-black/20 shadow-none"
              : "border-slate-300 bg-slate-100/50 shadow-inner",
          )}
        >
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm sm:text-sm">
            <span
              className={cn(
                "rounded-lg border px-2 py-0.5 font-black tracking-wide",
                isDirty
                  ? isDark
                    ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
                    : "border-amber-500/40 bg-amber-100 text-amber-900"
                  : isDark
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                    : "border-emerald-500/40 bg-emerald-100 text-emerald-900",
              )}
            >
              {isDirty
                ? t("admin.config.pendingChanges")
                : t("admin.config.noPendingChanges")}
            </span>
            <span
              className={cn(
                "font-black tracking-widest",
                isDark ? "text-white opacity-30" : "text-slate-900 opacity-40",
              )}
            >
              {t("admin.config.diffSummary")}
            </span>
            <span
              className={cn(
                "rounded border px-2 py-0.5 font-mono font-bold",
                isDark
                  ? "border-white/10 bg-white/5 text-slate-300"
                  : "border-slate-200 bg-white text-slate-800",
              )}
            >
              {t("admin.config.changedLines")}: {pendingDiffStats.changed}
            </span>
            <span
              className={cn(
                "rounded border px-2 py-0.5 font-mono font-bold",
                isDark
                  ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                  : "border-emerald-500/20 bg-emerald-50 text-emerald-800",
              )}
            >
              {t("admin.config.addedLines")}: {pendingDiffStats.added}
            </span>
            <span
              className={cn(
                "rounded border px-2 py-0.5 font-mono font-bold",
                isDark
                  ? "border-red-400/20 bg-red-500/10 text-red-200"
                  : "border-red-500/20 bg-red-50 text-red-800",
              )}
            >
              {t("admin.config.removedLines")}: {pendingDiffStats.removed}
            </span>
          </div>
        </div>
      )}

      {restartNotice && (
        <div
          className={cn(
            "mb-3 sm:mb-4 rounded-xl sm:rounded-2xl border px-3 py-2.5 sm:px-4 sm:py-3",
            isDark
              ? "border-amber-500/30 bg-amber-500/10"
              : "border-amber-200 bg-amber-50",
          )}
        >
          <div
            className={cn(
              "flex items-start gap-2 text-sm sm:text-sm font-semibold",
              isDark ? "text-amber-200" : "text-amber-900",
            )}
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{restartNotice}</span>
          </div>
        </div>
      )}

      {!settingsCenterMode && !hideShortcuts && shortcuts}

      <ConfigEditorPanel
        configPath={
          hideEditorPath
            ? undefined
            : settingsCenterMode
              ? undefined
              : configPath || t("admin.config.pathUnavailable")
        }
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
        title={editorTitle || t("admin.config.title")}
        testLabel={testLabel || t("admin.config.testContent")}
        saveLabel={saveLabel || t("admin.config.saveAndReload")}
        cancelLabel={t("common.cancel")}
        showCancel={showCancel}
        isDark={isDark}
        actionsPrefix={quickSettingsEnabled ? actionButtons : undefined}
        editorVisible={showRawEditor}
        hideToolbarWhenCollapsed={settingsCenterMode}
        showToolbar={!hideEditorToolbar}
        collapsedContent={
          settingsCenterMode ? (
            <div className="space-y-4">
              {quickSettingsEnabled && (
                <ConfigQuickSettingsModal
                  tomlAdapter={tomlAdapter}
                  isOpen={true}
                  onClose={() => {}}
                  content={content}
                  onContentChange={onChange}
                  runtimeOs={runtimeOs}
                  systemHardware={systemHardware}
                  onOpenLicenseManagement={
                    quickSettingsLicense ? openLicenseManagement : undefined
                  }
                  onOpenStorageConfig={openStorageConfig}
                  settingsCenterMode={settingsCenterMode}
                  embedded={true}
                  showDoneAction={false}
                />
              )}
            </div>
          ) : undefined
        }
      />

      {reloadSummary && (
        <div
          className={cn(
            "mt-3 rounded-xl px-3 py-2 text-sm sm:text-sm font-mono border font-bold shadow-sm transition-colors",
            reloadSummaryLevel === "success" &&
              (isDark
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                : "bg-emerald-50 text-emerald-900 border-emerald-200"),
            reloadSummaryLevel === "warning" &&
              (isDark
                ? "bg-amber-500/10 text-amber-200 border-amber-500/30"
                : "bg-amber-50 text-amber-900 border-amber-200"),
            reloadSummaryLevel === "error" &&
              (isDark
                ? "bg-red-500/10 text-red-200 border-red-500/30"
                : "bg-red-50 text-red-900 border-red-200"),
            reloadSummaryLevel === "info" &&
              (isDark
                ? "bg-white/5 text-white/70 border-white/10"
                : "bg-slate-100 text-slate-800 border-slate-200"),
          )}
        >
          {reloadSummary}
        </div>
      )}

      {quickSettingsEnabled && (
        <ConfigQuickSettingsModal
          tomlAdapter={tomlAdapter}
          isOpen={isQuickSettingsOpen}
          onClose={() => setIsQuickSettingsOpen(false)}
          content={content}
          onContentChange={onChange}
          {...(quickSettingsInitialStep
            ? { initialStep: quickSettingsInitialStep }
            : {})}
          {...(runtimeOs ? { runtimeOs } : {})}
          {...(systemHardware ? { systemHardware } : {})}
          {...(quickSettingsLicense
            ? { onOpenLicenseManagement: openLicenseManagement }
            : {})}
          onOpenStorageConfig={openStorageConfig}
          settingsCenterMode={settingsCenterMode}
        />
      )}

      {quickSettingsLicense && (
        <LicenseManagementModal
          isOpen={isLicenseOpen}
          onClose={() => setIsLicenseOpen(false)}
          status={quickSettingsLicense.status}
          saving={quickSettingsLicense.saving}
          onApplyLicense={(update) => {
            quickSettingsLicense.onApplyLicense(update);
            
            // Also update the TOML content in the background to keep it in sync
            try {
              const parsed = tomlAdapter.parse(content);
              if (isRecord(parsed)) {
                const nextConfig = deepClone(parsed);
                const licenseSection = ensureRecord(nextConfig, "license");
                
                if (update.registration) {
                  const reg = ensureRecord(licenseSection, "registration");
                  if (update.registration.key !== undefined) reg["key"] = update.registration.key;
                  if (update.registration.enabled !== undefined) reg["enabled"] = update.registration.enabled;
                }
                if (update.branding_license) {
                  const brLic = ensureRecord(licenseSection, "branding_license");
                  if (update.branding_license.key !== undefined) brLic["key"] = update.branding_license.key;
                  if (update.branding_license.enabled !== undefined) brLic["enabled"] = update.branding_license.enabled;
                }
                if (update.storage_encryption) {
                  const stLic = ensureRecord(licenseSection, "storage_encryption");
                  if (update.storage_encryption.key !== undefined) stLic["key"] = update.storage_encryption.key;
                  if (update.storage_encryption.enabled !== undefined) stLic["enabled"] = update.storage_encryption.enabled;
                }
                if (update.branding) {
                  const br = ensureRecord(licenseSection, "branding");
                  if (update.branding.logo_url !== undefined) br["logo_url"] = update.branding.logo_url;
                  if (update.branding.logo_name !== undefined) br["logo_name"] = update.branding.logo_name;
                  if (update.branding.footer_text !== undefined) br["footer_text"] = update.branding.footer_text;
                }

                const nextContent = tomlAdapter.stringify(nextConfig);
                onChange(nextContent);
              }
            } catch (e) {
              console.warn("Failed to sync TOML after license update", e);
            }
          }}
        />
      )}

      <VfsStorageConfigModal
        isOpen={isStorageOpen}
        onClose={() => setIsStorageOpen(false)}
        tomlAdapter={tomlAdapter}
        content={content}
        {...(onPickStorageDirectory
          ? { onPickDirectory: onPickStorageDirectory }
          : {})}
        onContentChange={(nextContent) => {
          onChange(nextContent);
        }}
      />

      <ThumbnailDependencyConfigModal
        isOpen={isThumbnailToolsOpen}
        onClose={() => setIsThumbnailToolsOpen(false)}
        tomlAdapter={tomlAdapter}
        content={content}
        onContentChange={onChange}
        runtimeOs={runtimeOs}
        onDiagnoseExternalTools={onDiagnoseExternalTools}
        onProbeExternalTool={onProbeExternalTool}
      />

      <MediaTranscodingConfigModal
        isOpen={isMediaTranscodingOpen}
        onClose={() => setIsMediaTranscodingOpen(false)}
        tomlAdapter={tomlAdapter}
        content={content}
        onContentChange={onChange}
        onDiagnoseExternalTools={onDiagnoseExternalTools}
        onProbeExternalTool={onProbeExternalTool}
        onProbeMediaBackend={onProbeMediaBackend}
      />

      <CompressionDependencyConfigModal
        isOpen={isCompressionToolsOpen}
        onClose={() => setIsCompressionToolsOpen(false)}
        tomlAdapter={tomlAdapter}
        content={content}
        onContentChange={onChange}
        runtimeOs={runtimeOs}
        onDiagnoseExternalTools={onDiagnoseExternalTools}
        onProbeExternalTool={onProbeExternalTool}
      />
    </div>
  );
};
