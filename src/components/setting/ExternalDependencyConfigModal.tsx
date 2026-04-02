import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { useEscapeToCloseTopLayer } from "@/hooks/useEscapeToCloseTopLayer";
import { deepClone, ensureRecord, isRecord } from "@/lib/configObject";
import { getNavigatorPlatformSource } from "@/lib/browserPlatform";
import { useToastStore } from "@/stores/toast";
import { SettingSegmentedControl } from "./SettingSegmentedControl";
import {
  ExternalToolPathField,
  SharedFfmpegField,
  type ProbeExternalTool,
} from "./SharedFfmpegField";

export type ThumbnailImageBackend = "builtin" | "external";

export type TomlAdapter = {
  parse: (source: string) => unknown;
  stringify: (value: unknown) => string;
};

export type ExternalToolDiagnosisItem = {
  tool_id: string;
  group: string;
  display_name: string;
  config_key: string;
  status_code: string;
  supported: boolean;
  available: boolean;
  current_value?: string | null;
  current_value_works: boolean;
  resolved_path?: string | null;
  suggested_value?: string | null;
  version_line?: string | null;
  suggestion_source: string;
  candidates: string[];
  warnings: string[];
  message: string;
  recommendation: string;
};

export type ExternalToolDiagnosisResponse = {
  runtime_os: string;
  supported: boolean;
  is_mobile_platform: boolean;
  tools: ExternalToolDiagnosisItem[];
};

type DiagnoseExternalTools = (
  configuredValues: Record<string, string>,
) => Promise<ExternalToolDiagnosisResponse>;

export type ThumbnailDraft = {
  thumbSizePx: string;
  thumbFormat: string;
  thumbQuality: string;
  imageEnabled: boolean;
  imageBackend: ThumbnailImageBackend;
  imageSmallSkipMb: string;
  imageMaxSizeMb: string;
  imageImagemagickMaxMb: string;
  imageTimeoutSecs: string;
  videoEnabled: boolean;
  videoMaxSizeMb: string;
  videoTimeoutSecs: string;
  videoSeekMode: "seconds" | "ratio" | "auto" | "";
  vipsPath: string;
  imagemagickPath: string;
  ffmpegPath: string;
  libreofficePath: string;
  blenderPath: string;
  latexmkPath: string;
  videoSeekSeconds: string;
  videoSeekRatio: string;
  pdfEnabled: boolean;
  pdfMaxSizeMb: string;
  pdfTimeoutSecs: string;
  officeEnabled: boolean;
  officeMaxSizeMb: string;
  officeTimeoutSecs: string;
  latexEnabled: boolean;
  textEnabled: boolean;
  textMaxChars: string;
  model3dEnabled: boolean;
  model3dMaxSizeMb: string;
  latexmkTimeoutSecs: string;
  latexMaxInputSizeMb: string;
  latexMaxOutputSizeMb: string;
  latexAllowShellEscape: boolean;
};

const EMPTY_THUMBNAIL_DRAFT: ThumbnailDraft = {
  thumbSizePx: "",
  thumbFormat: "",
  thumbQuality: "",
  imageEnabled: false,
  imageBackend: "builtin",
  imageSmallSkipMb: "",
  imageMaxSizeMb: "",
  imageImagemagickMaxMb: "",
  imageTimeoutSecs: "",
  videoEnabled: false,
  videoMaxSizeMb: "",
  videoTimeoutSecs: "",
  videoSeekMode: "",
  vipsPath: "",
  imagemagickPath: "",
  ffmpegPath: "",
  libreofficePath: "",
  blenderPath: "",
  latexmkPath: "",
  videoSeekSeconds: "",
  videoSeekRatio: "",
  pdfEnabled: false,
  pdfMaxSizeMb: "",
  pdfTimeoutSecs: "",
  officeEnabled: false,
  officeMaxSizeMb: "",
  officeTimeoutSecs: "",
  latexEnabled: false,
  textEnabled: false,
  textMaxChars: "",
  model3dEnabled: false,
  model3dMaxSizeMb: "",
  latexmkTimeoutSecs: "",
  latexMaxInputSizeMb: "",
  latexMaxOutputSizeMb: "",
  latexAllowShellEscape: false,
};

export type CompressionDraft = {
  enabled: boolean;
  exe7zPath: string;
  defaultCompressionFormat: string;
  maxConcurrency: string;
  maxCpuThreads: string;
};

const EMPTY_COMPRESSION_DRAFT: CompressionDraft = {
  enabled: true,
  exe7zPath: "7z",
  defaultCompressionFormat: "zip",
  maxConcurrency: "2",
  maxCpuThreads: "2",
};

const normalizeRuntimeOs = (runtimeOs?: string): string => {
  if (runtimeOs && runtimeOs.trim().length > 0) {
    return runtimeOs.trim().toLowerCase();
  }
  if (typeof navigator === "undefined") {
    return "linux";
  }
  const platform = getNavigatorPlatformSource().toLowerCase();
  if (platform.includes("android")) return "android";
  if (
    platform.includes("iphone") ||
    platform.includes("ipad") ||
    platform.includes("ios")
  )
    return "ios";
  if (platform.includes("linux")) return "linux";
  if (platform.includes("win")) return "windows";
  if (platform.includes("mac") || platform.includes("darwin")) return "macos";
  if (platform.includes("freebsd")) return "freebsd";
  return "linux";
};

export const parseThumbnailDraft = (
  content: string,
  tomlAdapter: TomlAdapter,
): ThumbnailDraft => {
  try {
    const parsed = tomlAdapter.parse(content);
    if (!isRecord(parsed)) return { ...EMPTY_THUMBNAIL_DRAFT };
    const root = parsed;
    const vfsStorageHub = isRecord(root["vfs_storage_hub"])
      ? root["vfs_storage_hub"]
      : {};
    const fileManagerApi = isRecord(root["file_manager_api"])
      ? root["file_manager_api"]
      : {};
    const externalTools = isRecord(vfsStorageHub["external_tools"])
      ? vfsStorageHub["external_tools"]
      : {};
    const thumbnail = isRecord(vfsStorageHub["thumbnail"])
      ? vfsStorageHub["thumbnail"]
      : {};
    const image = isRecord(thumbnail["image"]) ? thumbnail["image"] : {};
    const tools = isRecord(thumbnail["tools"]) ? thumbnail["tools"] : {};
    const video = isRecord(thumbnail["video"]) ? thumbnail["video"] : {};
    const pdf = isRecord(thumbnail["pdf"]) ? thumbnail["pdf"] : {};
    const office = isRecord(thumbnail["office"]) ? thumbnail["office"] : {};
    const text = isRecord(thumbnail["text"]) ? thumbnail["text"] : {};
    const model3d = isRecord(thumbnail["model3d"]) ? thumbnail["model3d"] : {};
    const latexPreview = isRecord(fileManagerApi["latex_preview"])
      ? fileManagerApi["latex_preview"]
      : {};
    const asString = (value: unknown): string =>
      typeof value === "string" ? value : "";
    const asNumberString = (value: unknown): string =>
      typeof value === "number" && Number.isFinite(value)
        ? String(value)
        : "";
    const asBool = (value: unknown): boolean =>
      typeof value === "boolean" ? value : false;
    const asBackend = (value: unknown): ThumbnailImageBackend =>
      value === "external" ? "external" : "builtin";
    const seekModeValue = asString(video["seek_mode"]);
    const seekModeValid = (["seconds", "ratio", "auto"].includes(seekModeValue)
      ? seekModeValue
      : "") as "seconds" | "ratio" | "auto" | "";
    return {
      thumbSizePx: asNumberString(thumbnail["thumb_size_px"]),
      thumbFormat: asString(thumbnail["thumb_format"]),
      thumbQuality: asNumberString(thumbnail["thumb_quality"]),
      imageEnabled: asBool(image["enabled"]),
      imageBackend: asBackend(image["backend"]),
      imageSmallSkipMb: asNumberString(image["small_skip_mb"]),
      imageMaxSizeMb: asNumberString(image["max_size_mb"]),
      imageImagemagickMaxMb: asNumberString(image["imagemagick_max_mb"]),
      imageTimeoutSecs: asNumberString(image["timeout_secs"]),
      videoEnabled: asBool(video["enabled"]),
      videoMaxSizeMb: asNumberString(video["max_size_mb"]),
      videoTimeoutSecs: asNumberString(video["timeout_secs"]),
      videoSeekMode: seekModeValid,
      vipsPath: asString(tools["vips_path"]),
      imagemagickPath: asString(tools["imagemagick_path"]),
      ffmpegPath: asString(externalTools["ffmpeg_path"] ?? tools["ffmpeg_path"]),
      libreofficePath: asString(tools["libreoffice_path"]),
      blenderPath: asString(tools["blender_path"]),
      latexmkPath: asString(latexPreview["latexmk_path"]),
      videoSeekSeconds: asNumberString(video["seek_seconds"]),
      videoSeekRatio: asNumberString(video["seek_ratio"]),
      pdfEnabled: asBool(pdf["enabled"]),
      pdfMaxSizeMb: asNumberString(pdf["max_size_mb"]),
      pdfTimeoutSecs: asNumberString(pdf["timeout_secs"]),
      officeEnabled: asBool(office["enabled"]),
      officeMaxSizeMb: asNumberString(office["max_size_mb"]),
      officeTimeoutSecs: asNumberString(office["timeout_secs"]),
      latexEnabled: asBool(latexPreview["enable_latexmk"]),
      textEnabled: asBool(text["enabled"]),
      textMaxChars: asNumberString(text["max_chars"]),
      model3dEnabled: asBool(model3d["enabled"]),
      model3dMaxSizeMb: asNumberString(model3d["max_size_mb"]),
      latexmkTimeoutSecs: asNumberString(latexPreview["latexmk_timeout_secs"]),
      latexMaxInputSizeMb: asNumberString(latexPreview["max_input_size_mb"]),
      latexMaxOutputSizeMb: asNumberString(latexPreview["max_output_size_mb"]),
      latexAllowShellEscape: asBool(latexPreview["allow_shell_escape"]),
    };
  } catch {
    return { ...EMPTY_THUMBNAIL_DRAFT };
  }
};

export const parseCompressionDraft = (
  content: string,
  tomlAdapter: TomlAdapter,
): CompressionDraft => {
  try {
    const parsed = tomlAdapter.parse(content);
    if (!isRecord(parsed)) return EMPTY_COMPRESSION_DRAFT;
    const root = parsed;
    const vfsStorageHub = isRecord(root["vfs_storage_hub"])
      ? root["vfs_storage_hub"]
      : {};
    const fileCompress = isRecord(vfsStorageHub["file_compress"])
      ? vfsStorageHub["file_compress"]
      : {};
    return {
      enabled:
        typeof fileCompress["enable"] === "boolean"
          ? fileCompress["enable"]
          : EMPTY_COMPRESSION_DRAFT.enabled,
      exe7zPath:
        typeof fileCompress["exe_7zip_path"] === "string"
          ? fileCompress["exe_7zip_path"]
          : EMPTY_COMPRESSION_DRAFT.exe7zPath,
      defaultCompressionFormat:
        typeof fileCompress["default_compression_format"] === "string"
          ? fileCompress["default_compression_format"]
          : EMPTY_COMPRESSION_DRAFT.defaultCompressionFormat,
      maxConcurrency: String(
        fileCompress["process_manager_max_concurrency"] ??
          EMPTY_COMPRESSION_DRAFT.maxConcurrency,
      ),
      maxCpuThreads: String(
        fileCompress["max_cpu_threads"] ?? EMPTY_COMPRESSION_DRAFT.maxCpuThreads,
      ),
    };
  } catch {
    return EMPTY_COMPRESSION_DRAFT;
  }
};

export const applyThumbnailDraft = (
  content: string,
  tomlAdapter: TomlAdapter,
  draft: ThumbnailDraft,
): string => {
  const parsed = tomlAdapter.parse(content);
  if (!isRecord(parsed)) {
    throw new Error("TOML root must be an object");
  }
  const next = deepClone(parsed);
  const vfsStorageHub = ensureRecord(next, "vfs_storage_hub");
  const fileManagerApi = ensureRecord(next, "file_manager_api");
  const externalTools = ensureRecord(vfsStorageHub, "external_tools");
  const thumbnail = ensureRecord(vfsStorageHub, "thumbnail");
  const image = ensureRecord(thumbnail, "image");
  const tools = ensureRecord(thumbnail, "tools");
  const video = ensureRecord(thumbnail, "video");
  const pdf = ensureRecord(thumbnail, "pdf");
  const office = ensureRecord(thumbnail, "office");
  const text = ensureRecord(thumbnail, "text");
  const model3d = ensureRecord(thumbnail, "model3d");
  const latexPreview = ensureRecord(fileManagerApi, "latex_preview");
  const writePositiveInt = (key: string, section: Record<string, unknown>, value: string) => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      section[key] = parsed;
    }
  };
  const writeString = (key: string, section: Record<string, unknown>, value: string) => {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      section[key] = trimmed;
    }
  };
  const writeFloat = (key: string, section: Record<string, unknown>, value: string) => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    const parsed = Number.parseFloat(trimmed);
    if (Number.isFinite(parsed)) {
      section[key] = parsed;
    }
  };

  writePositiveInt("thumb_size_px", thumbnail, draft.thumbSizePx);
  writeString("thumb_format", thumbnail, draft.thumbFormat);
  writePositiveInt("thumb_quality", thumbnail, draft.thumbQuality);
  image["enabled"] = draft.imageEnabled;
  image["backend"] = draft.imageBackend;
  writePositiveInt("small_skip_mb", image, draft.imageSmallSkipMb);
  writePositiveInt("max_size_mb", image, draft.imageMaxSizeMb);
  writePositiveInt("imagemagick_max_mb", image, draft.imageImagemagickMaxMb);
  writePositiveInt("timeout_secs", image, draft.imageTimeoutSecs);
  writeString("vips_path", tools, draft.vipsPath);
  writeString("imagemagick_path", tools, draft.imagemagickPath);
  writeString("libreoffice_path", tools, draft.libreofficePath);
  writeString("blender_path", tools, draft.blenderPath);
  writeString("ffmpeg_path", externalTools, draft.ffmpegPath);
  delete tools["ffmpeg_path"];

  video["enabled"] = draft.videoEnabled;
  writePositiveInt("max_size_mb", video, draft.videoMaxSizeMb);
  writePositiveInt("timeout_secs", video, draft.videoTimeoutSecs);
  writeString("seek_mode", video, draft.videoSeekMode);
  writePositiveInt("seek_seconds", video, draft.videoSeekSeconds);
  writeFloat("seek_ratio", video, draft.videoSeekRatio);

  pdf["enabled"] = draft.pdfEnabled;
  writePositiveInt("max_size_mb", pdf, draft.pdfMaxSizeMb);
  writePositiveInt("timeout_secs", pdf, draft.pdfTimeoutSecs);

  office["enabled"] = draft.officeEnabled;
  writePositiveInt("max_size_mb", office, draft.officeMaxSizeMb);
  writePositiveInt("timeout_secs", office, draft.officeTimeoutSecs);

  text["enabled"] = draft.textEnabled;
  writePositiveInt("max_chars", text, draft.textMaxChars);

  latexPreview["enable_latexmk"] = draft.latexEnabled;
  writeString("latexmk_path", latexPreview, draft.latexmkPath);
  writePositiveInt("latexmk_timeout_secs", latexPreview, draft.latexmkTimeoutSecs);
  writePositiveInt("max_input_size_mb", latexPreview, draft.latexMaxInputSizeMb);
  writePositiveInt("max_output_size_mb", latexPreview, draft.latexMaxOutputSizeMb);
  latexPreview["allow_shell_escape"] = draft.latexAllowShellEscape;

  model3d["enabled"] = draft.model3dEnabled;
  writePositiveInt("max_size_mb", model3d, draft.model3dMaxSizeMb);

  return tomlAdapter.stringify(next);
};

export const resolveThumbnailHardwareReuseStatus = (
  content: string,
  tomlAdapter: TomlAdapter,
): { active: boolean; backend?: string; device?: string } => {
  try {
    const parsed = tomlAdapter.parse(content);
    if (!isRecord(parsed)) {
      return { active: false };
    }
    const root = parsed;
    const vfsStorageHub = isRecord(root["vfs_storage_hub"])
      ? root["vfs_storage_hub"]
      : {};
    const media = isRecord(vfsStorageHub["media_transcoding"])
      ? vfsStorageHub["media_transcoding"]
      : {};
    const hardware = isRecord(media["hardware"]) ? media["hardware"] : {};
    const active =
      media["enabled"] === true &&
      hardware["enabled"] === true &&
      typeof hardware["backend"] === "string" &&
      hardware["backend"].trim() !== "" &&
      hardware["backend"].trim().toLowerCase() !== "none";
    const result: { active: boolean; backend?: string; device?: string } = { active };
    if (typeof hardware["backend"] === "string") result.backend = hardware["backend"];
    if (typeof hardware["device"] === "string") result.device = hardware["device"];
    return result;
  } catch {
    return { active: false };
  }
};

export const applyCompressionDraft = (
  content: string,
  tomlAdapter: TomlAdapter,
  draft: CompressionDraft,
): string => {
  const parsed = tomlAdapter.parse(content);
  if (!isRecord(parsed)) {
    throw new Error("TOML root must be an object");
  }
  const next = deepClone(parsed);
  const vfsStorageHub = ensureRecord(next, "vfs_storage_hub");
  const fileCompress = ensureRecord(vfsStorageHub, "file_compress");
  fileCompress["enable"] = draft.enabled;
  fileCompress["exe_7zip_path"] = draft.exe7zPath.trim();
  fileCompress["default_compression_format"] =
    draft.defaultCompressionFormat.trim();
  fileCompress["process_manager_max_concurrency"] =
    Number.parseInt(draft.maxConcurrency, 10) || 2;
  fileCompress["max_cpu_threads"] = Number.parseInt(draft.maxCpuThreads, 10) || 2;
  return tomlAdapter.stringify(next);
};

type ModalShellProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
}) => {
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === "dark";

  useEscapeToCloseTopLayer({
    active: isOpen,
    enabled: true,
    onEscape: onClose,
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close"
        className={cn(
          "absolute inset-0 backdrop-blur-sm transition-colors",
          isDark ? "bg-black/95" : "bg-slate-900/80",
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "relative w-full max-w-4xl rounded-2xl border shadow-lg overflow-hidden flex flex-col min-h-0 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]",
          isDark
            ? "bg-slate-950 border-white/10 text-slate-100 ring-1 ring-white/5"
            : "bg-white border-gray-200 text-slate-900",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-6 shrink-0",
            isDark
              ? "border-white/10 bg-slate-900/50"
              : "border-slate-100 bg-slate-50/50",
          )}
        >
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black uppercase tracking-widest truncate">
              {title}
            </h3>
            <p
              className={cn(
                "text-xs font-bold mt-1",
                isDark ? "text-slate-400" : "text-slate-500",
              )}
            >
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "h-8 w-8 rounded-lg border inline-flex items-center justify-center transition-colors shrink-0",
              isDark
                ? "border-white/15 text-slate-300 hover:bg-white/10"
                : "border-gray-200 text-slate-600 hover:bg-gray-100",
            )}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar p-4 sm:p-6 space-y-6">
          {children}
        </div>

        <div
          className={cn(
            "shrink-0 border-t px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-end gap-2",
            isDark
              ? "border-white/10 bg-slate-900/60"
              : "border-slate-100 bg-slate-50/70",
          )}
        >
          {footer}
        </div>
      </div>
    </div>
  );
};

export interface ThumbnailDependencyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  tomlAdapter: TomlAdapter;
  content: string;
  onContentChange: (value: string) => void;
  runtimeOs?: string | undefined;
  onDiagnoseExternalTools?: DiagnoseExternalTools | undefined;
  onProbeExternalTool?: ProbeExternalTool | undefined;
}

export const ThumbnailDependencyConfigModal: React.FC<
  ThumbnailDependencyConfigModalProps
> = ({
  isOpen,
  onClose,
  tomlAdapter,
  content,
  onContentChange,
  runtimeOs,
  onDiagnoseExternalTools,
  onProbeExternalTool,
}) => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === "dark";
  const normalizedRuntimeOs = normalizeRuntimeOs(runtimeOs);
  const isMobileRuntime =
    normalizedRuntimeOs === "android" || normalizedRuntimeOs === "ios";
  const [draft, setDraft] = useState<ThumbnailDraft>(EMPTY_THUMBNAIL_DRAFT);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(parseThumbnailDraft(content, tomlAdapter));
  }, [content, isOpen, tomlAdapter]);

  const hardwareReuseStatus = useMemo(
    () => resolveThumbnailHardwareReuseStatus(content, tomlAdapter),
    [content, tomlAdapter],
  );
  const showRasterTools =
    draft.imageBackend === "external" ||
    draft.pdfEnabled ||
    draft.officeEnabled ||
    draft.latexEnabled;
  const handleApply = () => {
    try {
      const nextContent = applyThumbnailDraft(content, tomlAdapter, draft);
      onContentChange(nextContent);
      addToast(t("admin.config.thumbnail.applied"), "success");
      onClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("admin.config.externalTools.messages.writeFailed");
      addToast(message, "error");
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t("admin.config.thumbnail.title")}
      subtitle={t("admin.config.thumbnail.subtitle")}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "h-10 px-4 rounded-xl border text-sm font-black transition-colors",
              isDark
                ? "border-white/15 text-slate-300 hover:bg-white/10"
                : "border-slate-300 text-slate-700 hover:bg-slate-100",
            )}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="h-10 px-4 rounded-xl bg-primary text-white text-sm font-black hover:opacity-90"
          >
            {t("common.confirm")}
          </button>
        </>
      }
    >
      {isMobileRuntime && (
        <div
          className={cn(
            "rounded-2xl border p-4 flex items-start gap-3",
            isDark
              ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
              : "border-amber-200 bg-amber-50 text-amber-900",
          )}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div className="text-sm leading-6 font-semibold">
            {t("admin.config.externalTools.mobileDisabled")}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div
          className={cn(
            "rounded-2xl border p-4 space-y-4",
            isDark
              ? "border-white/10 bg-white/[0.03]"
              : "border-slate-200 bg-slate-50",
          )}
        >
          <div>
            <div
              className={cn(
                "text-xs font-black uppercase tracking-wide",
                isDark ? "text-slate-400" : "text-slate-600",
              )}
            >
              {t("admin.config.thumbnail.imageBackend")}
            </div>
            <label className="mt-3 flex items-center gap-3">
              <input
                type="checkbox"
                checked={draft.imageEnabled}
                onChange={(event) =>
                  setDraft((state) => ({ ...state, imageEnabled: event.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className={cn("text-sm font-bold", isDark ? "text-slate-200" : "text-slate-700")}>{t("admin.config.thumbnail.imageEnabled")}</span>
            </label>
            <div className="mt-2">
              <SettingSegmentedControl<ThumbnailImageBackend>
                value={draft.imageBackend}
                options={[
                  {
                    value: "builtin",
                    label: t("admin.config.thumbnail.imageBackendBuiltin"),
                  },
                  {
                    value: "external",
                    label: t("admin.config.thumbnail.imageBackendExternal"),
                  },
                ]}
                onChange={(value) =>
                  setDraft((state) => ({ ...state, imageBackend: value }))
                }
                className="w-full justify-between"
                buttonClassName="flex-1"
              />
            </div>
            <div
              className={cn(
                "mt-2 text-xs leading-6",
                isDark ? "text-slate-400" : "text-slate-600",
              )}
            >
              {t("admin.config.thumbnail.imageBackendHint")}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["admin.config.thumbnail.thumbSizePx", draft.thumbSizePx, (value: string) => setDraft((state) => ({ ...state, thumbSizePx: value })), "256"],
            ["admin.config.thumbnail.thumbFormat", draft.thumbFormat, (value: string) => setDraft((state) => ({ ...state, thumbFormat: value })), "jpg"],
            ["admin.config.thumbnail.thumbQuality", draft.thumbQuality, (value: string) => setDraft((state) => ({ ...state, thumbQuality: value })), "85"],
            ["admin.config.thumbnail.imageSmallSkipMb", draft.imageSmallSkipMb, (value: string) => setDraft((state) => ({ ...state, imageSmallSkipMb: value })), "1"],
            ["admin.config.thumbnail.imageMaxSizeMb", draft.imageMaxSizeMb, (value: string) => setDraft((state) => ({ ...state, imageMaxSizeMb: value })), "100"],
            ["admin.config.thumbnail.imageTimeoutSecs", draft.imageTimeoutSecs, (value: string) => setDraft((state) => ({ ...state, imageTimeoutSecs: value })), "10"],
            ["admin.config.thumbnail.imageImagemagickMaxMb", draft.imageImagemagickMaxMb, (value: string) => setDraft((state) => ({ ...state, imageImagemagickMaxMb: value })), "20"],
          ].map(([label, value, onChange, placeholder]) => (
            <div key={String(label)}>
              <div className={cn("text-xs font-black uppercase tracking-wide", isDark ? "text-slate-400" : "text-slate-600")}>{t(String(label))}</div>
              <input
                value={String(value)}
                onChange={(event) => (onChange as (value: string) => void)(event.target.value)}
                className={cn(
                  "mt-2 h-11 w-full rounded-xl border px-3 text-sm font-mono",
                  isDark
                    ? "border-white/10 bg-black/30 text-white"
                    : "border-slate-300 bg-white text-slate-900",
                )}
                placeholder={String(placeholder)}
              />
            </div>
          ))}
          </div>

          {showRasterTools && (
            <div className="space-y-4 rounded-xl border border-dashed border-slate-300/70 p-3 dark:border-white/10">
              <ExternalToolPathField
                toolId="vips"
                configKey="vfs_storage_hub.thumbnail.tools.vips_path"
                value={draft.vipsPath}
                onChange={(value) => setDraft((state) => ({ ...state, vipsPath: value }))}
                label={t("admin.config.thumbnail.vipsPath")}
                placeholder="vips"
                onDiagnoseExternalTools={onDiagnoseExternalTools}
                onProbeExternalTool={onProbeExternalTool}
              />
              <ExternalToolPathField
                toolId="imagemagick"
                configKey="vfs_storage_hub.thumbnail.tools.imagemagick_path"
                value={draft.imagemagickPath}
                onChange={(value) => setDraft((state) => ({ ...state, imagemagickPath: value }))}
                label={t("admin.config.thumbnail.imagemagickPath")}
                placeholder="convert"
                onDiagnoseExternalTools={onDiagnoseExternalTools}
                onProbeExternalTool={onProbeExternalTool}
              />
            </div>
          )}
        </div>

        <div
          className={cn(
            "rounded-2xl border p-4 space-y-4",
            isDark
              ? "border-white/10 bg-white/[0.03]"
              : "border-slate-200 bg-slate-50",
          )}
        >
          <div>
            <label className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={draft.videoEnabled}
                onChange={(event) =>
                  setDraft((state) => ({ ...state, videoEnabled: event.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className={cn("text-sm font-bold", isDark ? "text-slate-200" : "text-slate-700")}>{t("admin.config.thumbnail.videoEnabled")}</span>
            </label>
            <SharedFfmpegField
              value={draft.ffmpegPath}
              onChange={(value) =>
                setDraft((state) => ({ ...state, ffmpegPath: value }))
              }
              label={t("admin.config.thumbnail.ffmpegPath")}
              placeholder="ffmpeg"
              onDiagnoseExternalTools={onDiagnoseExternalTools}
              onProbeExternalTool={onProbeExternalTool}
            />
          </div>
          <div>
            <div
              className={cn(
                "text-xs font-black uppercase tracking-wide",
                isDark ? "text-slate-400" : "text-slate-600",
              )}
            >
              {t("admin.config.thumbnail.videoSeekMode")}
            </div>
            <div className="mt-2">
              <SettingSegmentedControl<"seconds" | "ratio" | "auto">
                value={draft.videoSeekMode || "auto"}
                options={[
                  {
                    value: "auto",
                    label: t("admin.config.thumbnail.videoSeekModeAuto"),
                  },
                  {
                    value: "seconds",
                    label: t("admin.config.thumbnail.videoSeekModeSeconds"),
                  },
                  {
                    value: "ratio",
                    label: t("admin.config.thumbnail.videoSeekModeRatio"),
                  },
                ]}
                onChange={(value) =>
                  setDraft((state) => ({ ...state, videoSeekMode: value }))
                }
                className="w-full justify-between"
                buttonClassName="flex-1"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="thumbnail-video-seek-value"
              className={cn(
                "text-xs font-black uppercase tracking-wide",
                isDark ? "text-slate-400" : "text-slate-600",
              )}
            >
              {draft.videoSeekMode === "seconds"
                ? t("admin.config.thumbnail.videoSeekSeconds")
                : t("admin.config.thumbnail.videoSeekRatio")}
            </label>
            <input
              id="thumbnail-video-seek-value"
              value={
                draft.videoSeekMode === "seconds"
                  ? draft.videoSeekSeconds
                  : draft.videoSeekRatio
              }
              onChange={(event) =>
                setDraft((state) =>
                  draft.videoSeekMode === "seconds"
                    ? { ...state, videoSeekSeconds: event.target.value }
                    : { ...state, videoSeekRatio: event.target.value },
                )
              }
              className={cn(
                "mt-2 h-11 w-full rounded-xl border px-3 text-sm font-mono",
                isDark
                  ? "border-white/10 bg-black/30 text-white"
                  : "border-slate-300 bg-white text-slate-900",
              )}
              inputMode={draft.videoSeekMode === "seconds" ? "numeric" : "decimal"}
              placeholder={draft.videoSeekMode === "seconds" ? "3" : "0.3"}
            />
            <div
              className={cn(
                "mt-2 text-xs leading-6",
                isDark ? "text-slate-400" : "text-slate-600",
              )}
            >
              {t("admin.config.thumbnail.videoSeekHint")}
            </div>
          </div>
          <div
            className={cn(
              "rounded-xl border p-3 text-sm leading-6",
              isDark
                ? "border-violet-500/20 bg-violet-500/10 text-violet-100"
                : "border-violet-200 bg-violet-50 text-violet-900",
            )}
          >
            {hardwareReuseStatus.active
              ? t("admin.config.thumbnail.videoHardwareReuseActive", {
                  backend: hardwareReuseStatus.backend ?? "unknown",
                  device: hardwareReuseStatus.device?.trim()
                    ? hardwareReuseStatus.device
                    : t("admin.config.thumbnail.deviceAuto"),
                })
              : t("admin.config.thumbnail.videoHardwareReuseInactive")}
          </div>
          <div
            className={cn(
              "rounded-xl border p-3 text-sm leading-6",
              isDark
                ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-100"
                : "border-cyan-200 bg-cyan-50 text-cyan-900",
            )}
          >
            {t("admin.config.thumbnail.helper")}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-dashed border-slate-300/70 p-3 dark:border-white/10">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={draft.pdfEnabled}
                  onChange={(event) =>
                    setDraft((state) => ({ ...state, pdfEnabled: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className={cn("text-sm font-bold", isDark ? "text-slate-200" : "text-slate-700")}>{t("admin.config.thumbnail.pdfEnabled")}</span>
              </label>
              <div className={cn("text-sm leading-6", isDark ? "text-slate-300" : "text-slate-700")}>{t("admin.config.thumbnail.pdfUsesRasterToolsHint")}</div>
              {draft.latexEnabled && (
                <div
                  className={cn(
                    "rounded-xl border p-3 text-sm leading-6",
                    isDark
                      ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
                      : "border-amber-200 bg-amber-50 text-amber-900",
                  )}
                >
                  {t("admin.config.thumbnail.latexDependsOnPdfHint")}
                </div>
              )}
              <div>
                <div className={cn("text-xs font-black uppercase tracking-wide", isDark ? "text-slate-400" : "text-slate-600")}>{t("admin.config.thumbnail.pdfMaxSizeMb")}</div>
                <input
                  value={draft.pdfMaxSizeMb}
                  onChange={(event) => setDraft((state) => ({ ...state, pdfMaxSizeMb: event.target.value }))}
                  className={cn(
                    "mt-2 h-11 w-full rounded-xl border px-3 text-sm font-mono",
                    isDark
                      ? "border-white/10 bg-black/30 text-white"
                      : "border-slate-300 bg-white text-slate-900",
                  )}
                  placeholder="100"
                />
              </div>
            </div>
            <div className="space-y-4 rounded-xl border border-dashed border-slate-300/70 p-3 dark:border-white/10">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={draft.officeEnabled}
                  onChange={(event) =>
                    setDraft((state) => ({ ...state, officeEnabled: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className={cn("text-sm font-bold", isDark ? "text-slate-200" : "text-slate-700")}>{t("admin.config.thumbnail.officeEnabled")}</span>
              </label>
              <div className={cn("text-sm leading-6", isDark ? "text-slate-300" : "text-slate-700")}>{t("admin.config.thumbnail.officeUsesLibreofficeHint")}</div>
              <div>
                <div className={cn("text-xs font-black uppercase tracking-wide", isDark ? "text-slate-400" : "text-slate-600")}>{t("admin.config.thumbnail.officeMaxSizeMb")}</div>
                <input
                  value={draft.officeMaxSizeMb}
                  onChange={(event) => setDraft((state) => ({ ...state, officeMaxSizeMb: event.target.value }))}
                  className={cn(
                    "mt-2 h-11 w-full rounded-xl border px-3 text-sm font-mono",
                    isDark
                      ? "border-white/10 bg-black/30 text-white"
                      : "border-slate-300 bg-white text-slate-900",
                  )}
                  placeholder="100"
                />
              </div>
              <ExternalToolPathField
                toolId="libreoffice"
                configKey="vfs_storage_hub.thumbnail.tools.libreoffice_path"
                value={draft.libreofficePath}
                onChange={(value) => setDraft((state) => ({ ...state, libreofficePath: value }))}
                label={t("admin.config.thumbnail.libreofficePath")}
                placeholder="soffice"
                onDiagnoseExternalTools={onDiagnoseExternalTools}
                onProbeExternalTool={onProbeExternalTool}
              />
            </div>
            <div className="space-y-4 rounded-xl border border-dashed border-slate-300/70 p-3 dark:border-white/10">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={draft.latexEnabled}
                  onChange={(event) =>
                    setDraft((state) => ({ ...state, latexEnabled: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className={cn("text-sm font-bold", isDark ? "text-slate-200" : "text-slate-700")}>{t("admin.config.thumbnail.latexEnabled")}</span>
              </label>
              <div className={cn("text-sm leading-6", isDark ? "text-slate-300" : "text-slate-700")}>{t("admin.config.thumbnail.latexUsesPdfHint")}</div>
              <ExternalToolPathField
                toolId="latexmk"
                configKey="file_manager_api.latex_preview.latexmk_path"
                value={draft.latexmkPath}
                onChange={(value) => setDraft((state) => ({ ...state, latexmkPath: value }))}
                label={t("admin.config.thumbnail.latexmkPath")}
                placeholder="latexmk"
                onDiagnoseExternalTools={onDiagnoseExternalTools}
                onProbeExternalTool={onProbeExternalTool}
              />
              <div>
                <div className={cn("text-xs font-black uppercase tracking-wide", isDark ? "text-slate-400" : "text-slate-600")}>{t("admin.config.thumbnail.latexMaxInputSizeMb")}</div>
                <input
                  value={draft.latexMaxInputSizeMb}
                  onChange={(event) =>
                    setDraft((state) => ({ ...state, latexMaxInputSizeMb: event.target.value }))
                  }
                  className={cn(
                    "mt-2 h-11 w-full rounded-xl border px-3 text-sm font-mono",
                    isDark
                      ? "border-white/10 bg-black/30 text-white"
                      : "border-slate-300 bg-white text-slate-900",
                  )}
                  placeholder="4"
                />
              </div>
            </div>
            <div className="space-y-4 rounded-xl border border-dashed border-slate-300/70 p-3 dark:border-white/10">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={draft.model3dEnabled}
                  onChange={(event) =>
                    setDraft((state) => ({ ...state, model3dEnabled: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className={cn("text-sm font-bold", isDark ? "text-slate-200" : "text-slate-700")}>{t("admin.config.thumbnail.model3dEnabled")}</span>
              </label>
              <div className={cn("text-sm leading-6", isDark ? "text-slate-300" : "text-slate-700")}>{t("admin.config.thumbnail.model3dUsesBlenderHint")}</div>
              <div>
                <div className={cn("text-xs font-black uppercase tracking-wide", isDark ? "text-slate-400" : "text-slate-600")}>{t("admin.config.thumbnail.model3dMaxSizeMb")}</div>
                <input
                  value={draft.model3dMaxSizeMb}
                  onChange={(event) =>
                    setDraft((state) => ({ ...state, model3dMaxSizeMb: event.target.value }))
                  }
                  className={cn(
                    "mt-2 h-11 w-full rounded-xl border px-3 text-sm font-mono",
                    isDark
                      ? "border-white/10 bg-black/30 text-white"
                      : "border-slate-300 bg-white text-slate-900",
                  )}
                  placeholder="100"
                />
              </div>
              <ExternalToolPathField
                toolId="blender"
                configKey="vfs_storage_hub.thumbnail.tools.blender_path"
                value={draft.blenderPath}
                onChange={(value) => setDraft((state) => ({ ...state, blenderPath: value }))}
                label={t("admin.config.thumbnail.blenderPath")}
                placeholder="blender"
                onDiagnoseExternalTools={onDiagnoseExternalTools}
                onProbeExternalTool={onProbeExternalTool}
              />
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

export interface CompressionDependencyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  tomlAdapter: TomlAdapter;
  content: string;
  onContentChange: (value: string) => void;
  runtimeOs?: string | undefined;
  onDiagnoseExternalTools?: DiagnoseExternalTools | undefined;
  onProbeExternalTool?: ProbeExternalTool | undefined;
}

export const CompressionDependencyConfigModal: React.FC<
  CompressionDependencyConfigModalProps
> = ({
  isOpen,
  onClose,
  tomlAdapter,
  content,
  onContentChange,
  runtimeOs,
  onDiagnoseExternalTools,
  onProbeExternalTool,
}) => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === "dark";
  const normalizedRuntimeOs = normalizeRuntimeOs(runtimeOs);
  const isMobileRuntime =
    normalizedRuntimeOs === "android" || normalizedRuntimeOs === "ios";
  const [draft, setDraft] = useState<CompressionDraft>(
    EMPTY_COMPRESSION_DRAFT,
  );

  useEffect(() => {
    if (!isOpen) return;
    setDraft(parseCompressionDraft(content, tomlAdapter));
  }, [content, isOpen, tomlAdapter]);

  const handleApply = () => {
    try {
      const nextContent = applyCompressionDraft(content, tomlAdapter, draft);
      onContentChange(nextContent);
      addToast(t("admin.config.compression.applied"), "success");
      onClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("admin.config.externalTools.messages.writeFailed");
      addToast(message, "error");
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t("admin.config.compression.title")}
      subtitle={t("admin.config.compression.subtitle")}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "h-10 px-4 rounded-xl border text-sm font-black transition-colors",
              isDark
                ? "border-white/15 text-slate-300 hover:bg-white/10"
                : "border-slate-300 text-slate-700 hover:bg-slate-100",
            )}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="h-10 px-4 rounded-xl bg-primary text-white text-sm font-black hover:opacity-90"
          >
            {t("common.confirm")}
          </button>
        </>
      }
    >
      {isMobileRuntime && (
        <div
          className={cn(
            "rounded-2xl border p-4 flex items-start gap-3",
            isDark
              ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
              : "border-amber-200 bg-amber-50 text-amber-900",
          )}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div className="text-sm leading-6 font-semibold">
            {t("admin.config.externalTools.mobileDisabled")}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
        <div
          className={cn(
            "rounded-2xl border p-4 space-y-4",
            isDark
              ? "border-white/10 bg-white/[0.03]"
              : "border-slate-200 bg-slate-50",
          )}
        >
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              aria-label={t("admin.config.compression.enable")}
              className="mt-1 h-4 w-4 rounded border-slate-300"
              checked={draft.enabled}
              onChange={(event) =>
                setDraft((state) => ({
                  ...state,
                  enabled: event.target.checked,
                }))
              }
            />
            <div>
              <div className="text-sm font-black uppercase tracking-wide">
                {t("admin.config.compression.enable")}
              </div>
              <div
                className={cn(
                  "text-sm mt-1 leading-6",
                  isDark ? "text-slate-400" : "text-slate-600",
                )}
              >
                {t("admin.config.compression.enableHint")}
              </div>
            </div>
          </div>

          <ExternalToolPathField
            toolId="7z"
            configKey="vfs_storage_hub.file_compress.exe_7zip_path"
            value={draft.exe7zPath}
            onChange={(value) =>
              setDraft((state) => ({
                ...state,
                exe7zPath: value,
              }))
            }
            label="7-Zip"
            placeholder="7z"
            onDiagnoseExternalTools={onDiagnoseExternalTools}
            onProbeExternalTool={onProbeExternalTool}
          />

        </div>

        <div
          className={cn(
            "rounded-2xl border p-4 space-y-4",
            isDark
              ? "border-white/10 bg-white/[0.03]"
              : "border-slate-200 bg-slate-50",
          )}
        >
          <div
            className={cn(
              "rounded-xl border p-4 flex items-start gap-3",
              isDark
                ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-100"
                : "border-indigo-200 bg-indigo-50 text-indigo-900",
            )}
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <div className="text-sm leading-6">
              {t("admin.config.compression.helper")}
            </div>
          </div>
          {!draft.enabled && (
            <div
              className={cn(
                "rounded-xl border p-4 flex items-start gap-3",
                isDark
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
                  : "border-amber-200 bg-amber-50 text-amber-900",
              )}
            >
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div className="text-sm leading-6">
                {t("admin.config.compression.disabledHint")}
              </div>
            </div>
          )}
        </div>
      </div>

    </ModalShell>
  );
};
