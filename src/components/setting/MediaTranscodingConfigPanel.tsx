import React, { useCallback, useState } from "react";
import { GlassModalShell } from '@fileuni/ts-shared/modal-shell';
import { Loader2, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { deepClone, ensureRecord, isRecord } from "@/lib/configObject";
import { useToastStore } from "@/stores/toast";
import { useConfigDraftBinding } from "./useConfigDraftBinding";
import type { TomlAdapter } from "./ExternalDependencyConfigModal";
import {
  SharedFfmpegField,
  type DiagnoseExternalTools,
  type ProbeExternalTool,
} from "./SharedFfmpegField";

export type MediaBackendProbeResponse = {
  ffmpeg_available: boolean;
  ffmpeg_version_line?: string | null;
  backend: string;
  encoder_name?: string | null;
  backend_supported: boolean;
  backend_available: boolean;
  message: string;
  warnings: string[];
};

export type ProbeMediaBackend = (payload: {
  ffmpegPath: string;
  backend: string;
  device?: string;
}) => Promise<MediaBackendProbeResponse>;

export type MediaTranscodingDraft = {
  enabled: boolean;
  cacheDir: string;
  cleanupTtlSecs: string;
  timeoutSecs: string;
  maxConcurrentTasks: string;
  maxConcurrentTasksLowMemory: string;
  maxConcurrentTasksThroughput: string;
  allowSoftwareFallback: boolean;
  delivery: string;
  segmentDurationSecs: string;
  videoCodec: string;
  audioCodec: string;
  preset: string;
  crf: string;
  maxWidth: string;
  maxHeight: string;
  maxFps: string;
  audioBitrateKbps: string;
  hardwareEnabled: boolean;
  backend: string;
  device: string;
  ffmpegPath: string;
};

const DEFAULT_MEDIA_TRANSCODING_DRAFT: MediaTranscodingDraft = {
  enabled: false,
  cacheDir: "{RUNTIMEDIR}/cache/media-transcoding",
  cleanupTtlSecs: "1800",
  timeoutSecs: "7200",
  maxConcurrentTasks: "1",
  maxConcurrentTasksLowMemory: "1",
  maxConcurrentTasksThroughput: "2",
  allowSoftwareFallback: true,
  delivery: "hls",
  segmentDurationSecs: "4",
  videoCodec: "h264",
  audioCodec: "aac",
  preset: "veryfast",
  crf: "23",
  maxWidth: "1920",
  maxHeight: "1080",
  maxFps: "30",
  audioBitrateKbps: "160",
  hardwareEnabled: false,
  backend: "vaapi",
  device: "/dev/dri/renderD128",
  ffmpegPath: "ffmpeg",
};

const asString = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;
const asBool = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;
const asNumberString = (value: unknown, fallback: string) =>
  typeof value === "number" && Number.isFinite(value) ? String(value) : fallback;

export const parseMediaTranscodingDraft = (
  content: string,
  tomlAdapter: TomlAdapter,
): MediaTranscodingDraft => {
  try {
    const parsed = tomlAdapter.parse(content);
    if (!isRecord(parsed)) return DEFAULT_MEDIA_TRANSCODING_DRAFT;
    const root = parsed;
    const vfsStorageHub = isRecord(root["vfs_storage_hub"])
      ? root["vfs_storage_hub"]
      : {};
    const externalTools = isRecord(vfsStorageHub["external_tools"])
      ? vfsStorageHub["external_tools"]
      : {};
    const thumbnail = isRecord(vfsStorageHub["thumbnail"])
      ? vfsStorageHub["thumbnail"]
      : {};
    const thumbnailTools = isRecord(thumbnail["tools"])
      ? thumbnail["tools"]
      : {};
    const media = isRecord(vfsStorageHub["media_transcoding"])
      ? vfsStorageHub["media_transcoding"]
      : {};
    const video = isRecord(media["video"]) ? media["video"] : {};
    const hardware = isRecord(media["hardware"]) ? media["hardware"] : {};
    return {
      enabled: asBool(media["enabled"], DEFAULT_MEDIA_TRANSCODING_DRAFT.enabled),
      cacheDir: asString(media["cache_dir"], DEFAULT_MEDIA_TRANSCODING_DRAFT.cacheDir),
      cleanupTtlSecs: asNumberString(
        media["cleanup_ttl_secs"],
        DEFAULT_MEDIA_TRANSCODING_DRAFT.cleanupTtlSecs,
      ),
      timeoutSecs: asNumberString(
        media["timeout_secs"],
        DEFAULT_MEDIA_TRANSCODING_DRAFT.timeoutSecs,
      ),
      maxConcurrentTasks: asNumberString(
        media["max_concurrent_tasks"],
        DEFAULT_MEDIA_TRANSCODING_DRAFT.maxConcurrentTasks,
      ),
      maxConcurrentTasksLowMemory: asNumberString(
        media["max_concurrent_tasks_low_memory"],
        DEFAULT_MEDIA_TRANSCODING_DRAFT.maxConcurrentTasksLowMemory,
      ),
      maxConcurrentTasksThroughput: asNumberString(
        media["max_concurrent_tasks_throughput"],
        DEFAULT_MEDIA_TRANSCODING_DRAFT.maxConcurrentTasksThroughput,
      ),
      allowSoftwareFallback: asBool(
        media["allow_software_fallback"] ?? hardware["allow_fallback_to_software"],
        DEFAULT_MEDIA_TRANSCODING_DRAFT.allowSoftwareFallback,
      ),
      delivery: asString(video["delivery"], DEFAULT_MEDIA_TRANSCODING_DRAFT.delivery),
      segmentDurationSecs: asNumberString(
        video["segment_duration_secs"],
        DEFAULT_MEDIA_TRANSCODING_DRAFT.segmentDurationSecs,
      ),
      videoCodec: asString(video["video_codec"], DEFAULT_MEDIA_TRANSCODING_DRAFT.videoCodec),
      audioCodec: asString(video["audio_codec"], DEFAULT_MEDIA_TRANSCODING_DRAFT.audioCodec),
      preset: asString(video["preset"], DEFAULT_MEDIA_TRANSCODING_DRAFT.preset),
      crf: asNumberString(video["crf"], DEFAULT_MEDIA_TRANSCODING_DRAFT.crf),
      maxWidth: asNumberString(video["max_width"], DEFAULT_MEDIA_TRANSCODING_DRAFT.maxWidth),
      maxHeight: asNumberString(video["max_height"], DEFAULT_MEDIA_TRANSCODING_DRAFT.maxHeight),
      maxFps: asNumberString(video["max_fps"], DEFAULT_MEDIA_TRANSCODING_DRAFT.maxFps),
      audioBitrateKbps: asNumberString(
        video["audio_bitrate_kbps"],
        DEFAULT_MEDIA_TRANSCODING_DRAFT.audioBitrateKbps,
      ),
      hardwareEnabled: asBool(
        hardware["enabled"],
        DEFAULT_MEDIA_TRANSCODING_DRAFT.hardwareEnabled,
      ),
      backend: asString(hardware["backend"], DEFAULT_MEDIA_TRANSCODING_DRAFT.backend),
      device: asString(hardware["device"], DEFAULT_MEDIA_TRANSCODING_DRAFT.device),
      ffmpegPath: asString(
        externalTools["ffmpeg_path"] ?? thumbnailTools["ffmpeg_path"],
        DEFAULT_MEDIA_TRANSCODING_DRAFT.ffmpegPath,
      ),
    };
  } catch {
    return DEFAULT_MEDIA_TRANSCODING_DRAFT;
  }
};

const parsePositiveInt = (value: string, fallback: number) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const applyMediaTranscodingDraft = (
  content: string,
  tomlAdapter: TomlAdapter,
  draft: MediaTranscodingDraft,
): string => {
  const parsed = tomlAdapter.parse(content);
  if (!isRecord(parsed)) {
    throw new Error("TOML root must be an object");
  }
  const next = deepClone(parsed);
  const vfsStorageHub = ensureRecord(next, "vfs_storage_hub");
  const externalTools = ensureRecord(vfsStorageHub, "external_tools");
  externalTools["ffmpeg_path"] = draft.ffmpegPath.trim();

  const media = ensureRecord(vfsStorageHub, "media_transcoding");
  const video = ensureRecord(media, "video");
  const hardware = ensureRecord(media, "hardware");
  media["enabled"] = draft.enabled;
  media["cache_dir"] = draft.cacheDir.trim();
  media["cleanup_ttl_secs"] = parsePositiveInt(
    draft.cleanupTtlSecs,
    Number.parseInt(DEFAULT_MEDIA_TRANSCODING_DRAFT.cleanupTtlSecs, 10),
  );
  media["timeout_secs"] = parsePositiveInt(
    draft.timeoutSecs,
    Number.parseInt(DEFAULT_MEDIA_TRANSCODING_DRAFT.timeoutSecs, 10),
  );
  media["max_concurrent_tasks"] = parsePositiveInt(
    draft.maxConcurrentTasks,
    Number.parseInt(DEFAULT_MEDIA_TRANSCODING_DRAFT.maxConcurrentTasks, 10),
  );
  media["max_concurrent_tasks_low_memory"] = parsePositiveInt(
    draft.maxConcurrentTasksLowMemory,
    Number.parseInt(DEFAULT_MEDIA_TRANSCODING_DRAFT.maxConcurrentTasksLowMemory, 10),
  );
  media["max_concurrent_tasks_throughput"] = parsePositiveInt(
    draft.maxConcurrentTasksThroughput,
    Number.parseInt(DEFAULT_MEDIA_TRANSCODING_DRAFT.maxConcurrentTasksThroughput, 10),
  );
  media["allow_software_fallback"] = draft.allowSoftwareFallback;

  video["enabled"] = true;
  video["delivery"] = draft.delivery.trim();
  video["segment_duration_secs"] = parsePositiveInt(
    draft.segmentDurationSecs,
    Number.parseInt(DEFAULT_MEDIA_TRANSCODING_DRAFT.segmentDurationSecs, 10),
  );
  video["video_codec"] = draft.videoCodec.trim();
  video["audio_codec"] = draft.audioCodec.trim();
  video["preset"] = draft.preset.trim();
  video["crf"] = parsePositiveInt(
    draft.crf,
    Number.parseInt(DEFAULT_MEDIA_TRANSCODING_DRAFT.crf, 10),
  );
  video["max_width"] = parsePositiveInt(
    draft.maxWidth,
    Number.parseInt(DEFAULT_MEDIA_TRANSCODING_DRAFT.maxWidth, 10),
  );
  video["max_height"] = parsePositiveInt(
    draft.maxHeight,
    Number.parseInt(DEFAULT_MEDIA_TRANSCODING_DRAFT.maxHeight, 10),
  );
  video["max_fps"] = parsePositiveInt(
    draft.maxFps,
    Number.parseInt(DEFAULT_MEDIA_TRANSCODING_DRAFT.maxFps, 10),
  );
  video["audio_bitrate_kbps"] = parsePositiveInt(
    draft.audioBitrateKbps,
    Number.parseInt(DEFAULT_MEDIA_TRANSCODING_DRAFT.audioBitrateKbps, 10),
  );

  hardware["enabled"] = draft.hardwareEnabled;
  hardware["backend"] = draft.backend.trim();
  hardware["device"] = draft.device.trim();
  hardware["allow_fallback_to_software"] = draft.allowSoftwareFallback;
  return tomlAdapter.stringify(next);
};

type PanelProps = {
  tomlAdapter: TomlAdapter;
  content: string;
  onContentChange: (value: string) => void;
  onDiagnoseExternalTools?: DiagnoseExternalTools | undefined;
  onProbeExternalTool?: ProbeExternalTool | undefined;
  onProbeMediaBackend?: ProbeMediaBackend | undefined;
};

const sectionCardClass = (isDark: boolean) =>
  cn(
    "rounded-2xl border p-4 space-y-4",
    isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white",
  );

const fieldLabelClass = (isDark: boolean) =>
  cn(
    "text-xs font-black tracking-wide",
    isDark ? "text-slate-400" : "text-slate-600",
  );

const inputClass = (isDark: boolean) =>
  cn(
    "mt-2 h-11 w-full rounded-xl border px-3 text-sm font-mono",
    isDark ? "border-white/10 bg-black/30 text-white" : "border-slate-300 bg-white text-slate-900",
  );

const MediaTranscodingForm: React.FC<PanelProps & { draft: MediaTranscodingDraft; setDraft: React.Dispatch<React.SetStateAction<MediaTranscodingDraft>>; }> = ({
  draft,
  setDraft,
  onDiagnoseExternalTools,
  onProbeExternalTool,
  onProbeMediaBackend,
}) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const { addToast } = useToastStore();
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<{
    tone: "success" | "error";
    summary: string;
    detail?: string;
  } | null>(null);

  const handleProbe = async () => {
    if (!onProbeMediaBackend || probing) return;
    setProbing(true);
    try {
      const payload: Parameters<ProbeMediaBackend>[0] = {
        ffmpegPath: draft.ffmpegPath.trim(),
        backend: draft.backend,
        ...(draft.device.trim() ? { device: draft.device.trim() } : {}),
      };
      const response = await onProbeMediaBackend(payload);
      const detail = (() => {
        const constraints = response.message.match(
          /constraints:\s*width\s*(\d+)-(\d+)\s*height\s*(\d+)-(\d+)/i,
        );
        if (constraints) {
          return t("admin.config.mediaTranscoding.probeConstraintHint", {
            minWidth: constraints[1],
            maxWidth: constraints[2],
            minHeight: constraints[3],
            maxHeight: constraints[4],
          });
        }
        if (response.warnings.length > 0) {
          return response.warnings.join(" ");
        }
        return response.message;
      })();

      if (response.backend_available) {
        const summary = t("admin.config.mediaTranscoding.probeOk", {
          backend: response.backend,
          encoder: response.encoder_name ?? response.backend,
        });
        setProbeResult({ tone: "success", summary, detail });
        addToast(summary, "success");
      } else if (!response.ffmpeg_available) {
        const summary = t("admin.config.mediaTranscoding.probeFailedFfmpeg");
        setProbeResult({ tone: "error", summary, detail });
        addToast(`${summary}: ${detail}`, "error");
      } else if (!response.backend_supported) {
        const summary = t("admin.config.mediaTranscoding.probeFailedEncoder", {
          backend: response.backend,
          encoder: response.encoder_name ?? response.backend,
        });
        setProbeResult({ tone: "error", summary, detail });
        addToast(`${summary}: ${detail}`, "error");
      } else {
        const summary = t("admin.config.mediaTranscoding.probeFailedBackend", {
          backend: response.backend,
          encoder: response.encoder_name ?? response.backend,
        });
        setProbeResult({ tone: "error", summary, detail });
        addToast(`${summary}: ${detail}`, "error");
      }
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message
          : t("admin.config.mediaTranscoding.probeFailed");
      const summary = t("admin.config.mediaTranscoding.probeFailed");
      setProbeResult({ tone: "error", summary, detail });
      addToast(`${summary}: ${detail}`, "error");
    } finally {
      setProbing(false);
    }
  };

  const backendOptions = ["none", "vaapi", "qsv", "nvenc", "videotoolbox", "amf"];

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr_0.95fr]">
      <div className={sectionCardClass(isDark)}>
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) => setDraft((prev) => ({ ...prev, enabled: event.target.checked }))}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <div>
            <div className="text-sm font-black tracking-wide">{t("admin.config.mediaTranscoding.enable")}</div>
          </div>
        </div>

        <SharedFfmpegField
          value={draft.ffmpegPath}
          onChange={(value) => setDraft((prev) => ({ ...prev, ffmpegPath: value }))}
          label={t("admin.config.mediaTranscoding.ffmpegPath")}
          placeholder={t("admin.config.externalTools.placeholders.ffmpeg")}
          onDiagnoseExternalTools={onDiagnoseExternalTools}
          onProbeExternalTool={onProbeExternalTool}
        />

        {[
          { id: "cacheDir", label: t("admin.config.mediaTranscoding.cacheDir"), value: draft.cacheDir, onChange: (value: string) => setDraft((prev) => ({ ...prev, cacheDir: value })) },
          { id: "cleanupTtlSecs", label: t("admin.config.mediaTranscoding.cleanupTtlSecs"), value: draft.cleanupTtlSecs, onChange: (value: string) => setDraft((prev) => ({ ...prev, cleanupTtlSecs: value })) },
          { id: "timeoutSecs", label: t("admin.config.mediaTranscoding.timeoutSecs"), value: draft.timeoutSecs, onChange: (value: string) => setDraft((prev) => ({ ...prev, timeoutSecs: value })) },
        ].map(({ id, label, value, onChange }) => (
          <label key={id} className="block">
            <span className={fieldLabelClass(isDark)}>{label}</span>
            <input value={value} onChange={(event) => onChange(event.target.value)} className={inputClass(isDark)} />
          </label>
        ))}

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { id: "maxConcurrentTasks", label: t("admin.config.mediaTranscoding.maxConcurrentTasks"), value: draft.maxConcurrentTasks, onChange: (value: string) => setDraft((prev) => ({ ...prev, maxConcurrentTasks: value })) },
            { id: "maxConcurrentTasksLowMemory", label: t("admin.config.mediaTranscoding.maxConcurrentTasksLowMemory"), value: draft.maxConcurrentTasksLowMemory, onChange: (value: string) => setDraft((prev) => ({ ...prev, maxConcurrentTasksLowMemory: value })) },
            { id: "maxConcurrentTasksThroughput", label: t("admin.config.mediaTranscoding.maxConcurrentTasksThroughput"), value: draft.maxConcurrentTasksThroughput, onChange: (value: string) => setDraft((prev) => ({ ...prev, maxConcurrentTasksThroughput: value })) },
          ].map(({ id, label, value, onChange }) => (
            <label key={id} className="block">
              <span className={fieldLabelClass(isDark)}>{label}</span>
              <input value={value} onChange={(event) => onChange(event.target.value)} className={inputClass(isDark)} />
            </label>
          ))}
        </div>

      </div>

      <div className={sectionCardClass(isDark)}>
        <div className={cn("rounded-xl border p-3 text-sm leading-6", isDark ? "border-white/10 bg-white/[0.03] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700")}>{t("admin.config.mediaTranscoding.videoHint")}</div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { id: "delivery", label: t("admin.config.mediaTranscoding.delivery"), value: draft.delivery, onChange: (value: string) => setDraft((prev) => ({ ...prev, delivery: value })) },
            { id: "segmentDurationSecs", label: t("admin.config.mediaTranscoding.segmentDurationSecs"), value: draft.segmentDurationSecs, onChange: (value: string) => setDraft((prev) => ({ ...prev, segmentDurationSecs: value })) },
            { id: "videoCodec", label: t("admin.config.mediaTranscoding.videoCodec"), value: draft.videoCodec, onChange: (value: string) => setDraft((prev) => ({ ...prev, videoCodec: value })) },
            { id: "audioCodec", label: t("admin.config.mediaTranscoding.audioCodec"), value: draft.audioCodec, onChange: (value: string) => setDraft((prev) => ({ ...prev, audioCodec: value })) },
            { id: "preset", label: t("admin.config.mediaTranscoding.preset"), value: draft.preset, onChange: (value: string) => setDraft((prev) => ({ ...prev, preset: value })) },
            { id: "crf", label: t("admin.config.mediaTranscoding.crf"), value: draft.crf, onChange: (value: string) => setDraft((prev) => ({ ...prev, crf: value })) },
            { id: "maxWidth", label: t("admin.config.mediaTranscoding.maxWidth"), value: draft.maxWidth, onChange: (value: string) => setDraft((prev) => ({ ...prev, maxWidth: value })) },
            { id: "maxHeight", label: t("admin.config.mediaTranscoding.maxHeight"), value: draft.maxHeight, onChange: (value: string) => setDraft((prev) => ({ ...prev, maxHeight: value })) },
            { id: "maxFps", label: t("admin.config.mediaTranscoding.maxFps"), value: draft.maxFps, onChange: (value: string) => setDraft((prev) => ({ ...prev, maxFps: value })) },
            { id: "audioBitrateKbps", label: t("admin.config.mediaTranscoding.audioBitrateKbps"), value: draft.audioBitrateKbps, onChange: (value: string) => setDraft((prev) => ({ ...prev, audioBitrateKbps: value })) },
          ].map(({ id, label, value, onChange }) => (
            <label key={id} className="block">
              <span className={fieldLabelClass(isDark)}>{label}</span>
              <input value={value} onChange={(event) => onChange(event.target.value)} className={inputClass(isDark)} />
            </label>
          ))}
        </div>
      </div>

      <div className={sectionCardClass(isDark)}>
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={draft.hardwareEnabled}
            onChange={(event) => setDraft((prev) => ({ ...prev, hardwareEnabled: event.target.checked }))}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <div>
            <div className="text-sm font-black tracking-wide">{t("admin.config.mediaTranscoding.hardwareEnabled")}</div>
          </div>
        </div>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={draft.allowSoftwareFallback}
            onChange={(event) => setDraft((prev) => ({ ...prev, allowSoftwareFallback: event.target.checked }))}
            className="h-4 w-4 rounded border-slate-300"
          />
          <span className={cn("text-sm font-bold", isDark ? "text-slate-200" : "text-slate-700")}>{t("admin.config.mediaTranscoding.allowSoftwareFallback")}</span>
        </label>

        <div
          className={cn(
            "rounded-xl border p-3 text-sm leading-6",
            isDark ? "border-white/10 bg-white/[0.03] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700",
          )}
        >
          <div className="font-black tracking-wide">{t("admin.config.mediaTranscoding.platformNotesTitle")}</div>
          <div className="mt-2">{t("admin.config.mediaTranscoding.platformLinux")}</div>
          <div>{t("admin.config.mediaTranscoding.platformWindowsIntel")}</div>
          <div>{t("admin.config.mediaTranscoding.platformWindowsNvidia")}</div>
          <div>{t("admin.config.mediaTranscoding.platformWindowsAmd")}</div>
          <div>{t("admin.config.mediaTranscoding.platformMacos")}</div>
          <div>{t("admin.config.mediaTranscoding.platformFreebsd")}</div>
        </div>

        <label className="block">
          <span className={fieldLabelClass(isDark)}>{t("admin.config.mediaTranscoding.backend")}</span>
          <select
            value={draft.backend}
            onChange={(event) => setDraft((prev) => ({ ...prev, backend: event.target.value }))}
            className={inputClass(isDark)}
          >
            {backendOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={fieldLabelClass(isDark)}>{t("admin.config.mediaTranscoding.device")}</span>
          <input value={draft.device} onChange={(event) => setDraft((prev) => ({ ...prev, device: event.target.value }))} className={inputClass(isDark)} />
        </label>

        <button
          type="button"
          onClick={() => {
            void handleProbe();
          }}
          disabled={!onProbeMediaBackend || probing}
          className={cn(
            "h-11 rounded-xl border px-4 text-sm font-black inline-flex items-center gap-2 disabled:opacity-50",
            isDark
              ? "border-violet-400/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/15"
              : "border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100",
          )}
        >
          {probing ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
          {t("admin.config.mediaTranscoding.probeBackend")}
        </button>

        <div className={cn(
          "rounded-xl border p-3 text-sm leading-6",
          isDark ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-100" : "border-cyan-200 bg-cyan-50 text-cyan-900",
        )}>
          {t("admin.config.mediaTranscoding.helper")}
        </div>

        {probeResult && (
          <div
            className={cn(
              "rounded-xl border p-3 text-sm leading-6",
              probeResult.tone === "success"
                ? isDark
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
                  : "border-emerald-200 bg-emerald-50 text-emerald-900"
                : isDark
                  ? "border-rose-500/25 bg-rose-500/10 text-rose-100"
                  : "border-rose-200 bg-rose-50 text-rose-900",
            )}
          >
            <div className="font-black tracking-wide">{probeResult.summary}</div>
            {probeResult.detail && <div className="mt-1 opacity-90">{probeResult.detail}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export const MediaTranscodingInlinePanel: React.FC<PanelProps> = ({
  tomlAdapter,
  content,
  onContentChange,
  onDiagnoseExternalTools,
  onProbeExternalTool,
  onProbeMediaBackend,
}) => {
  const createDraft = useCallback(
    (source: string) => parseMediaTranscodingDraft(source, tomlAdapter),
    [tomlAdapter],
  );
  const buildContent = useCallback(
    (source: string, nextDraft: MediaTranscodingDraft) =>
      applyMediaTranscodingDraft(source, tomlAdapter, nextDraft),
    [tomlAdapter],
  );
  const { draft, setDraft } = useConfigDraftBinding<MediaTranscodingDraft>({
    content,
    onContentChange,
    createDraft,
    buildContent,
  });
  return (
    <MediaTranscodingForm
      tomlAdapter={tomlAdapter}
      content={content}
      onContentChange={onContentChange}
      draft={draft}
      setDraft={setDraft}
      onDiagnoseExternalTools={onDiagnoseExternalTools}
      onProbeExternalTool={onProbeExternalTool}
      onProbeMediaBackend={onProbeMediaBackend}
    />
  );
};

interface MediaTranscodingConfigModalProps extends PanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MediaTranscodingConfigModal: React.FC<MediaTranscodingConfigModalProps> = ({
  isOpen,
  onClose,
  tomlAdapter,
  content,
  onContentChange,
  onDiagnoseExternalTools,
  onProbeExternalTool,
  onProbeMediaBackend,
}) => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const [draft, setDraft] = useState<MediaTranscodingDraft>(DEFAULT_MEDIA_TRANSCODING_DRAFT);

  const handleApply = () => {
    try {
      onContentChange(applyMediaTranscodingDraft(content, tomlAdapter, draft));
      addToast(t("admin.config.mediaTranscoding.applied"), "success");
      onClose();
    } catch (error) {
      addToast(error instanceof Error ? error.message : t("admin.config.mediaTranscoding.applyFailed"), "error");
    }
  };

  if (!isOpen) return null;

  return (
    <GlassModalShell
      title={t("admin.config.mediaTranscoding.title")}
      subtitle={t("admin.config.mediaTranscoding.subtitle")}
      icon={<Video size={18} />}
      onClose={onClose}
      maxWidthClassName="max-w-7xl"
      panelClassName="rounded-2xl shadow-lg overflow-hidden"
      bodyClassName="p-4 sm:p-6"
      overlayClassName="backdrop-blur-sm transition-colors"
      zIndexClassName="z-[150]"
      containerClassName="p-2 sm:p-4"
      closeButton={(
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 rounded-lg border border-[hsl(var(--modal-glass-border))] text-[hsl(var(--modal-glass-close-foreground))] inline-flex items-center justify-center transition-colors shrink-0 hover:bg-[hsl(var(--modal-glass-close-hover-bg))]"
        >
          ×
        </button>
      )}
      footer={(
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-white/[0.04] text-slate-800 dark:text-white text-sm font-black transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.08] shadow-sm dark:backdrop-blur-sm">{t("common.cancel")}</button>
          <button type="button" onClick={handleApply} className="h-10 px-4 rounded-xl bg-primary text-white text-sm font-black hover:opacity-90">{t("common.confirm")}</button>
        </div>
      )}
    >
      <MediaTranscodingForm
        tomlAdapter={tomlAdapter}
        content={content}
        onContentChange={onContentChange}
        draft={draft}
        setDraft={setDraft}
        onDiagnoseExternalTools={onDiagnoseExternalTools}
        onProbeExternalTool={onProbeExternalTool}
        onProbeMediaBackend={onProbeMediaBackend}
      />
    </GlassModalShell>
  );
};
