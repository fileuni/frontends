import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Search,
  Sparkles,
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
  videoSmallSkipMb: string;
  videoMaxSizeMb: string;
  videoTimeoutSecs: string;
  videoSeekMode: "seconds" | "ratio";
  vipsPath: string;
  imagemagickPath: string;
  ffmpegPath: string;
  libreofficePath: string;
  blenderPath: string;
  latexmkPath: string;
  videoSeekSeconds: string;
  videoSeekRatio: string;
  pdfEnabled: boolean;
  pdfSmallSkipMb: string;
  pdfMaxSizeMb: string;
  pdfImagemagickMaxMb: string;
  pdfTimeoutSecs: string;
  officeEnabled: boolean;
  officeSmallSkipMb: string;
  officeMaxSizeMb: string;
  officeImagemagickMaxMb: string;
  officeTimeoutSecs: string;
  latexEnabled: boolean;
  model3dEnabled: boolean;
  model3dMaxSizeMb: string;
  latexmkTimeoutSecs: string;
  latexMaxInputSizeMb: string;
  latexMaxOutputSizeMb: string;
  latexAllowShellEscape: boolean;
};

export type CompressionDraft = {
  enabled: boolean;
  exe7zPath: string;
  defaultCompressionFormat: string;
  maxConcurrency: string;
  maxCpuThreads: string;
};

type ToolInputDescriptor = {
  toolId: string;
  configKey: string;
  labelKey: string;
  value: string;
  onChange: (value: string) => void;
  placeholderKey: string;
};

const DEFAULT_THUMBNAIL_DRAFT: ThumbnailDraft = {
  thumbSizePx: "256",
  thumbFormat: "jpg",
  thumbQuality: "85",
  imageEnabled: true,
  imageBackend: "builtin",
  imageSmallSkipMb: "1",
  imageMaxSizeMb: "100",
  imageImagemagickMaxMb: "20",
  imageTimeoutSecs: "10",
  videoEnabled: true,
  videoSmallSkipMb: "1",
  videoMaxSizeMb: "100",
  videoTimeoutSecs: "10",
  videoSeekMode: "ratio",
  vipsPath: "vips",
  imagemagickPath: "convert",
  ffmpegPath: "ffmpeg",
  libreofficePath: "soffice",
  blenderPath: "blender",
  latexmkPath: "latexmk",
  videoSeekSeconds: "3",
  videoSeekRatio: "0.3",
  pdfEnabled: true,
  pdfSmallSkipMb: "1",
  pdfMaxSizeMb: "100",
  pdfImagemagickMaxMb: "20",
  pdfTimeoutSecs: "10",
  officeEnabled: true,
  officeSmallSkipMb: "1",
  officeMaxSizeMb: "100",
  officeImagemagickMaxMb: "20",
  officeTimeoutSecs: "10",
  latexEnabled: true,
  model3dEnabled: false,
  model3dMaxSizeMb: "100",
  latexmkTimeoutSecs: "60",
  latexMaxInputSizeMb: "4",
  latexMaxOutputSizeMb: "10",
  latexAllowShellEscape: false,
};

const DEFAULT_COMPRESSION_DRAFT: CompressionDraft = {
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
    if (!isRecord(parsed)) return DEFAULT_THUMBNAIL_DRAFT;
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
    const asString = (value: unknown, fallback: string) =>
      typeof value === "string" ? value : fallback;
    const asNumberString = (value: unknown, fallback: string) =>
      typeof value === "number" && Number.isFinite(value)
        ? String(value)
        : fallback;
    const asBool = (value: unknown, fallback: boolean) =>
      typeof value === "boolean" ? value : fallback;
    const asBackend = (value: unknown): ThumbnailImageBackend =>
      value === "external" ? "external" : "builtin";
    const videoSeekSeconds = asNumberString(
      video["seek_seconds"],
      DEFAULT_THUMBNAIL_DRAFT.videoSeekSeconds,
    );
    const videoSeekRatio = asNumberString(
      video["seek_ratio"],
      DEFAULT_THUMBNAIL_DRAFT.videoSeekRatio,
    );
    const seekRatioValue = Number(video["seek_ratio"]);
    return {
      thumbSizePx: asNumberString(
        thumbnail["thumb_size_px"],
        DEFAULT_THUMBNAIL_DRAFT.thumbSizePx,
      ),
      thumbFormat: asString(
        thumbnail["thumb_format"],
        DEFAULT_THUMBNAIL_DRAFT.thumbFormat,
      ),
      thumbQuality: asNumberString(
        thumbnail["thumb_quality"],
        DEFAULT_THUMBNAIL_DRAFT.thumbQuality,
      ),
      imageEnabled: asBool(image["enabled"], DEFAULT_THUMBNAIL_DRAFT.imageEnabled),
      imageBackend: asBackend(image["backend"]),
      imageSmallSkipMb: asNumberString(
        image["small_skip_mb"],
        DEFAULT_THUMBNAIL_DRAFT.imageSmallSkipMb,
      ),
      imageMaxSizeMb: asNumberString(
        image["max_size_mb"],
        DEFAULT_THUMBNAIL_DRAFT.imageMaxSizeMb,
      ),
      imageImagemagickMaxMb: asNumberString(
        image["imagemagick_max_mb"],
        DEFAULT_THUMBNAIL_DRAFT.imageImagemagickMaxMb,
      ),
      imageTimeoutSecs: asNumberString(
        image["timeout_secs"],
        DEFAULT_THUMBNAIL_DRAFT.imageTimeoutSecs,
      ),
      videoEnabled: asBool(video["enabled"], DEFAULT_THUMBNAIL_DRAFT.videoEnabled),
      videoSmallSkipMb: asNumberString(
        video["small_skip_mb"],
        DEFAULT_THUMBNAIL_DRAFT.videoSmallSkipMb,
      ),
      videoMaxSizeMb: asNumberString(
        video["max_size_mb"],
        DEFAULT_THUMBNAIL_DRAFT.videoMaxSizeMb,
      ),
      videoTimeoutSecs: asNumberString(
        video["timeout_secs"],
        DEFAULT_THUMBNAIL_DRAFT.videoTimeoutSecs,
      ),
      videoSeekMode:
        Number.isFinite(seekRatioValue) && seekRatioValue > 0 && seekRatioValue <= 1
          ? "ratio"
          : "seconds",
      vipsPath: asString(tools["vips_path"], DEFAULT_THUMBNAIL_DRAFT.vipsPath),
      imagemagickPath: asString(
        tools["imagemagick_path"],
        DEFAULT_THUMBNAIL_DRAFT.imagemagickPath,
      ),
      ffmpegPath: asString(
        externalTools["ffmpeg_path"] ?? tools["ffmpeg_path"],
        DEFAULT_THUMBNAIL_DRAFT.ffmpegPath,
      ),
      libreofficePath: asString(
        tools["libreoffice_path"],
        DEFAULT_THUMBNAIL_DRAFT.libreofficePath,
      ),
      blenderPath: asString(
        tools["blender_path"],
        DEFAULT_THUMBNAIL_DRAFT.blenderPath,
      ),
      latexmkPath: asString(
        latexPreview["latexmk_path"],
        DEFAULT_THUMBNAIL_DRAFT.latexmkPath,
      ),
      videoSeekSeconds,
      videoSeekRatio,
      pdfEnabled: asBool(pdf["enabled"], DEFAULT_THUMBNAIL_DRAFT.pdfEnabled),
      pdfSmallSkipMb: asNumberString(
        pdf["small_skip_mb"],
        DEFAULT_THUMBNAIL_DRAFT.pdfSmallSkipMb,
      ),
      pdfMaxSizeMb: asNumberString(
        pdf["max_size_mb"],
        DEFAULT_THUMBNAIL_DRAFT.pdfMaxSizeMb,
      ),
      pdfImagemagickMaxMb: asNumberString(
        pdf["imagemagick_max_mb"],
        DEFAULT_THUMBNAIL_DRAFT.pdfImagemagickMaxMb,
      ),
      pdfTimeoutSecs: asNumberString(
        pdf["timeout_secs"],
        DEFAULT_THUMBNAIL_DRAFT.pdfTimeoutSecs,
      ),
      officeEnabled: asBool(
        office["enabled"],
        DEFAULT_THUMBNAIL_DRAFT.officeEnabled,
      ),
      officeSmallSkipMb: asNumberString(
        office["small_skip_mb"],
        DEFAULT_THUMBNAIL_DRAFT.officeSmallSkipMb,
      ),
      officeMaxSizeMb: asNumberString(
        office["max_size_mb"],
        DEFAULT_THUMBNAIL_DRAFT.officeMaxSizeMb,
      ),
      officeImagemagickMaxMb: asNumberString(
        office["imagemagick_max_mb"],
        DEFAULT_THUMBNAIL_DRAFT.officeImagemagickMaxMb,
      ),
      officeTimeoutSecs: asNumberString(
        office["timeout_secs"],
        DEFAULT_THUMBNAIL_DRAFT.officeTimeoutSecs,
      ),
      latexEnabled: asBool(
        latexPreview["enable_latexmk"],
        DEFAULT_THUMBNAIL_DRAFT.latexEnabled,
      ),
      model3dEnabled: asBool(
        model3d["enabled"],
        DEFAULT_THUMBNAIL_DRAFT.model3dEnabled,
      ),
      model3dMaxSizeMb: asNumberString(
        model3d["max_size_mb"],
        DEFAULT_THUMBNAIL_DRAFT.model3dMaxSizeMb,
      ),
      latexmkTimeoutSecs: asNumberString(
        latexPreview["latexmk_timeout_secs"],
        DEFAULT_THUMBNAIL_DRAFT.latexmkTimeoutSecs,
      ),
      latexMaxInputSizeMb: asNumberString(
        latexPreview["max_input_size_mb"],
        DEFAULT_THUMBNAIL_DRAFT.latexMaxInputSizeMb,
      ),
      latexMaxOutputSizeMb: asNumberString(
        latexPreview["max_output_size_mb"],
        DEFAULT_THUMBNAIL_DRAFT.latexMaxOutputSizeMb,
      ),
      latexAllowShellEscape: asBool(
        latexPreview["allow_shell_escape"],
        DEFAULT_THUMBNAIL_DRAFT.latexAllowShellEscape,
      ),
    };
  } catch {
    return DEFAULT_THUMBNAIL_DRAFT;
  }
};

export const parseCompressionDraft = (
  content: string,
  tomlAdapter: TomlAdapter,
): CompressionDraft => {
  try {
    const parsed = tomlAdapter.parse(content);
    if (!isRecord(parsed)) return DEFAULT_COMPRESSION_DRAFT;
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
          : DEFAULT_COMPRESSION_DRAFT.enabled,
      exe7zPath:
        typeof fileCompress["exe_7zip_path"] === "string"
          ? fileCompress["exe_7zip_path"]
          : DEFAULT_COMPRESSION_DRAFT.exe7zPath,
      defaultCompressionFormat:
        typeof fileCompress["default_compression_format"] === "string"
          ? fileCompress["default_compression_format"]
          : DEFAULT_COMPRESSION_DRAFT.defaultCompressionFormat,
      maxConcurrency: String(
        fileCompress["process_manager_max_concurrency"] ??
          DEFAULT_COMPRESSION_DRAFT.maxConcurrency,
      ),
      maxCpuThreads: String(
        fileCompress["max_cpu_threads"] ?? DEFAULT_COMPRESSION_DRAFT.maxCpuThreads,
      ),
    };
  } catch {
    return DEFAULT_COMPRESSION_DRAFT;
  }
};

const buildThumbnailConfiguredValues = (
  draft: ThumbnailDraft,
): Record<string, string> => ({
  "vfs_storage_hub.thumbnail.tools.vips_path": draft.vipsPath.trim(),
  "vfs_storage_hub.thumbnail.tools.imagemagick_path":
    draft.imagemagickPath.trim(),
  "vfs_storage_hub.external_tools.ffmpeg_path": draft.ffmpegPath.trim(),
  "vfs_storage_hub.thumbnail.tools.libreoffice_path":
    draft.libreofficePath.trim(),
  "file_manager_api.latex_preview.latexmk_path": draft.latexmkPath.trim(),
});

const buildCompressionConfiguredValues = (
  draft: CompressionDraft,
): Record<string, string> => ({
  "vfs_storage_hub.file_compress.exe_7zip_path": draft.exe7zPath.trim(),
  "vfs_storage_hub.file_compress.default_compression_format":
    draft.defaultCompressionFormat.trim(),
  "vfs_storage_hub.file_compress.process_manager_max_concurrency":
    draft.maxConcurrency.trim(),
  "vfs_storage_hub.file_compress.max_cpu_threads": draft.maxCpuThreads.trim(),
});

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
  const parsePositiveInt = (value: string, fallback: number) =>
    Number.isFinite(Number.parseInt(value, 10)) && Number.parseInt(value, 10) > 0
      ? Number.parseInt(value, 10)
      : fallback;

  thumbnail["thumb_size_px"] = parsePositiveInt(
    draft.thumbSizePx,
    Number.parseInt(DEFAULT_THUMBNAIL_DRAFT.thumbSizePx, 10),
  );
  thumbnail["thumb_format"] = draft.thumbFormat.trim();
  thumbnail["thumb_quality"] = parsePositiveInt(
    draft.thumbQuality,
    Number.parseInt(DEFAULT_THUMBNAIL_DRAFT.thumbQuality, 10),
  );
  image["enabled"] = draft.imageEnabled;
  image["backend"] = draft.imageBackend;
  image["small_skip_mb"] = parsePositiveInt(
    draft.imageSmallSkipMb,
    Number.parseInt(DEFAULT_THUMBNAIL_DRAFT.imageSmallSkipMb, 10),
  );
  image["max_size_mb"] = parsePositiveInt(
    draft.imageMaxSizeMb,
    Number.parseInt(DEFAULT_THUMBNAIL_DRAFT.imageMaxSizeMb, 10),
  );
  image["imagemagick_max_mb"] = parsePositiveInt(
    draft.imageImagemagickMaxMb,
    Number.parseInt(DEFAULT_THUMBNAIL_DRAFT.imageImagemagickMaxMb, 10),
  );
  image["timeout_secs"] = parsePositiveInt(
    draft.imageTimeoutSecs,
    Number.parseInt(DEFAULT_THUMBNAIL_DRAFT.imageTimeoutSecs, 10),
  );
  tools["vips_path"] = draft.vipsPath.trim();
  tools["imagemagick_path"] = draft.imagemagickPath.trim();
  tools["libreoffice_path"] = draft.libreofficePath.trim();
  tools["blender_path"] = draft.blenderPath.trim();
  externalTools["ffmpeg_path"] = draft.ffmpegPath.trim();
  delete tools["ffmpeg_path"];

  video["enabled"] = draft.videoEnabled;
  video["small_skip_mb"] = parsePositiveInt(
    draft.videoSmallSkipMb,
    Number.parseInt(DEFAULT_THUMBNAIL_DRAFT.videoSmallSkipMb, 10),
  );
  video["max_size_mb"] = parsePositiveInt(
    draft.videoMaxSizeMb,
    Number.parseInt(DEFAULT_THUMBNAIL_DRAFT.videoMaxSizeMb, 10),
  );
  video["timeout_secs"] = parsePositiveInt(
    draft.videoTimeoutSecs,
    Number.parseInt(DEFAULT_THUMBNAIL_DRAFT.videoTimeoutSecs, 10),
  );
  const seekSeconds = Number(draft.videoSeekSeconds);
  const seekRatio = Number(draft.videoSeekRatio);
  if (draft.videoSeekMode === "seconds") {
    video["seek_seconds"] = Number.isFinite(seekSeconds) && seekSeconds > 0
      ? Math.floor(seekSeconds)
      : Number.parseInt(DEFAULT_THUMBNAIL_DRAFT.videoSeekSeconds, 10);
    delete video["seek_ratio"];
  } else {
    video["seek_ratio"] = Number.isFinite(seekRatio) && seekRatio > 0 && seekRatio <= 1
      ? seekRatio
      : Number.parseFloat(DEFAULT_THUMBNAIL_DRAFT.videoSeekRatio);
    delete video["seek_seconds"];
  }

  pdf["enabled"] = draft.pdfEnabled;
  pdf["small_skip_mb"] = parsePositiveInt(
    draft.pdfSmallSkipMb,
    Number.parseInt(DEFAULT_THUMBNAIL_DRAFT.pdfSmallSkipMb, 10),
  );
  pdf["max_size_mb"] = parsePositiveInt(
    draft.pdfMaxSizeMb,
    Number.parseInt(DEFAULT_THUMBNAIL_DRAFT.pdfMaxSizeMb, 10),
  );
  pdf["imagemagick_max_mb"] = parsePositiveInt(
    draft.pdfImagemagickMaxMb,
    Number.parseInt(DEFAULT_THUMBNAIL_DRAFT.pdfImagemagickMaxMb, 10),
  );
  pdf["timeout_secs"] = parsePositiveInt(
    draft.pdfTimeoutSecs,
    Number.parseInt(DEFAULT_THUMBNAIL_DRAFT.pdfTimeoutSecs, 10),
  );

  office["enabled"] = draft.officeEnabled;
  office["small_skip_mb"] = parsePositiveInt(
    draft.officeSmallSkipMb,
    Number.parseInt(DEFAULT_THUMBNAIL_DRAFT.officeSmallSkipMb, 10),
  );
  office["max_size_mb"] = parsePositiveInt(
    draft.officeMaxSizeMb,
    Number.parseInt(DEFAULT_THUMBNAIL_DRAFT.officeMaxSizeMb, 10),
  );
  office["imagemagick_max_mb"] = parsePositiveInt(
    draft.officeImagemagickMaxMb,
    Number.parseInt(DEFAULT_THUMBNAIL_DRAFT.officeImagemagickMaxMb, 10),
  );
  office["timeout_secs"] = parsePositiveInt(
    draft.officeTimeoutSecs,
    Number.parseInt(DEFAULT_THUMBNAIL_DRAFT.officeTimeoutSecs, 10),
  );

  if (draft.latexEnabled) {
    text["enabled"] = true;
  }
  latexPreview["enable_latexmk"] = draft.latexEnabled;
  latexPreview["latexmk_path"] = draft.latexmkPath.trim();
  latexPreview["latexmk_timeout_secs"] = parsePositiveInt(
    draft.latexmkTimeoutSecs,
    Number.parseInt(DEFAULT_THUMBNAIL_DRAFT.latexmkTimeoutSecs, 10),
  );
  latexPreview["max_input_size_mb"] = parsePositiveInt(
    draft.latexMaxInputSizeMb,
    Number.parseInt(DEFAULT_THUMBNAIL_DRAFT.latexMaxInputSizeMb, 10),
  );
  latexPreview["max_output_size_mb"] = parsePositiveInt(
    draft.latexMaxOutputSizeMb,
    Number.parseInt(DEFAULT_THUMBNAIL_DRAFT.latexMaxOutputSizeMb, 10),
  );
  latexPreview["allow_shell_escape"] = draft.latexAllowShellEscape;

  model3d["enabled"] = draft.model3dEnabled;
  model3d["max_size_mb"] = parsePositiveInt(
    draft.model3dMaxSizeMb,
    Number.parseInt(DEFAULT_THUMBNAIL_DRAFT.model3dMaxSizeMb, 10),
  );
  model3d["timeout_secs"] = 60;
  model3d["small_skip_mb"] = 1;
  model3d["imagemagick_max_mb"] = 0;
  model3d["seek_seconds"] = 0;
  model3d["seek_ratio"] = 0;
  model3d["max_chars"] = 0;

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
    return {
      active,
      backend: typeof hardware["backend"] === "string" ? hardware["backend"] : undefined,
      device: typeof hardware["device"] === "string" ? hardware["device"] : undefined,
    };
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

type ToolCardProps = {
  item: ExternalToolDiagnosisItem;
};

const ToolCard: React.FC<ToolCardProps> = ({ item }) => {
  const { t } = useTranslation();
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === "dark";
  const badgeClass =
    item.status_code === "ok"
      ? isDark
        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
        : "border-emerald-300 bg-emerald-50 text-emerald-700"
      : item.status_code === "ok_with_warning"
        ? isDark
          ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
          : "border-amber-300 bg-amber-50 text-amber-700"
        : isDark
          ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
          : "border-rose-300 bg-rose-50 text-rose-700";
  const statusLabel =
    item.status_code === "ok"
      ? t("admin.config.externalTools.status.ok")
      : item.status_code === "ok_with_warning"
        ? t("admin.config.externalTools.status.warning")
        : item.status_code === "configured_invalid"
          ? t("admin.config.externalTools.status.configuredInvalid")
          : item.status_code === "unsupported"
            ? t("admin.config.externalTools.status.unsupported")
            : t("admin.config.externalTools.status.missing");

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-3",
        isDark
          ? "border-white/10 bg-white/[0.03]"
          : "border-slate-200 bg-white shadow-sm",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black uppercase tracking-wide">
            {item.display_name}
          </div>
          <div
            className={cn(
              "text-xs font-mono mt-1 break-all",
              isDark ? "text-slate-400" : "text-slate-500",
            )}
          >
            {item.config_key}
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-xs font-black uppercase tracking-wide",
            badgeClass,
          )}
        >
          {statusLabel}
        </span>
      </div>

      <div
        className={cn(
          "text-sm leading-6",
          isDark ? "text-slate-200" : "text-slate-700",
        )}
      >
        {item.message}
      </div>

      <div className="grid grid-cols-1 gap-2 text-xs">
        <div
          className={cn(
            "rounded-lg border px-3 py-2",
            isDark
              ? "border-white/10 bg-black/20"
              : "border-slate-200 bg-slate-50",
          )}
        >
          <div
            className={cn(
              "font-black uppercase tracking-wide mb-1",
              isDark ? "text-slate-400" : "text-slate-500",
            )}
          >
            {t("admin.config.externalTools.card.current")}
          </div>
          <div className="font-mono break-all">
            {item.current_value?.trim() ? item.current_value : "-"}
          </div>
        </div>
        <div
          className={cn(
            "rounded-lg border px-3 py-2",
            isDark
              ? "border-white/10 bg-black/20"
              : "border-slate-200 bg-slate-50",
          )}
        >
          <div
            className={cn(
              "font-black uppercase tracking-wide mb-1",
              isDark ? "text-slate-400" : "text-slate-500",
            )}
          >
            {t("admin.config.externalTools.card.detected")}
          </div>
          <div className="font-mono break-all">
            {item.resolved_path?.trim() ? item.resolved_path : "-"}
          </div>
        </div>
      </div>

      {item.version_line && (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-xs",
            isDark
              ? "border-white/10 bg-black/20"
              : "border-slate-200 bg-slate-50",
          )}
        >
          <div
            className={cn(
              "font-black uppercase tracking-wide mb-1",
              isDark ? "text-slate-400" : "text-slate-500",
            )}
          >
            {t("admin.config.externalTools.card.version")}
          </div>
          <div className="font-mono break-all">{item.version_line}</div>
        </div>
      )}

      {item.candidates.length > 0 && (
        <div>
          <div
            className={cn(
              "text-[11px] font-black uppercase tracking-wide mb-2",
              isDark ? "text-slate-400" : "text-slate-500",
            )}
          >
            {t("admin.config.externalTools.card.candidates")}
          </div>
          <div className="flex flex-wrap gap-2">
            {item.candidates.slice(0, 4).map((candidate) => (
              <span
                key={candidate}
                className={cn(
                  "rounded-lg border px-2 py-1 text-[11px] font-mono break-all",
                  isDark
                    ? "border-white/10 bg-white/5 text-slate-300"
                    : "border-slate-200 bg-slate-50 text-slate-700",
                )}
              >
                {candidate}
              </span>
            ))}
          </div>
        </div>
      )}

      {item.warnings.length > 0 && (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-xs leading-6",
            isDark
              ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
              : "border-amber-200 bg-amber-50 text-amber-900",
          )}
        >
          <div className="font-black uppercase tracking-wide mb-1">
            {t("admin.config.externalTools.card.warnings")}
          </div>
          <div>{item.warnings.join(" ")}</div>
        </div>
      )}

      <div
        className={cn(
          "text-xs leading-6",
          isDark ? "text-slate-300" : "text-slate-600",
        )}
      >
        {item.recommendation}
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
  const [draft, setDraft] = useState<ThumbnailDraft>(DEFAULT_THUMBNAIL_DRAFT);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              <SettingSegmentedControl<"seconds" | "ratio">
                value={draft.videoSeekMode}
                options={[
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
          <div className="grid gap-4 xl:grid-cols-4">
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
    DEFAULT_COMPRESSION_DRAFT,
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
