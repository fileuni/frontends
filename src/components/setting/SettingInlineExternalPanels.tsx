import React, { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { PasswordInput } from "@/components/common/PasswordInput";
import {
  ensureRecord,
  isRecord,
  type ConfigObject,
} from "@/lib/configObject";
import {
  ExternalToolPathField,
  SharedFfmpegField,
  type DiagnoseExternalTools,
  type ProbeExternalTool,
} from "./SharedFfmpegField";
import type {
  CompressionDraft,
  ThumbnailDraft,
  ThumbnailImageBackend,
  TomlAdapter,
} from "./ExternalDependencyConfigModal";
import { SettingSegmentedControl } from "./SettingSegmentedControl";
import {
  applyCompressionDraft,
  applyThumbnailDraft,
  parseCompressionDraft,
  parseThumbnailDraft,
  resolveThumbnailHardwareReuseStatus,
} from "./ExternalDependencyConfigModal";
import { useConfigDraftBinding } from "./useConfigDraftBinding";

const asRecord = (value: unknown): ConfigObject => {
  return isRecord(value) ? value : {};
};

interface BaseProps {
  tomlAdapter: TomlAdapter;
  content: string;
  onContentChange: (value: string) => void;
  onDiagnoseExternalTools?: DiagnoseExternalTools | undefined;
  onProbeExternalTool?: ProbeExternalTool | undefined;
}

export const ThumbnailInlinePanel: React.FC<BaseProps> = ({
  tomlAdapter,
  content,
  onContentChange,
  onDiagnoseExternalTools,
  onProbeExternalTool,
}) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const createDraft = useCallback(
    (source: string) => parseThumbnailDraft(source, tomlAdapter),
    [tomlAdapter],
  );
  const buildContent = useCallback(
    (source: string, nextDraft: ThumbnailDraft) => {
      return applyThumbnailDraft(source, tomlAdapter, nextDraft);
    },
    [tomlAdapter],
  );
  const { draft, setDraft } = useConfigDraftBinding<ThumbnailDraft>({
    content,
    onContentChange,
    createDraft,
    buildContent,
  });

  const inputClass = cn(
    "mt-2 h-11 w-full rounded-xl border px-3 text-sm font-mono",
    isDark
      ? "border-white/10 bg-black/30 text-white"
      : "border-slate-300 bg-white text-slate-900",
  );

  const hardwareReuseStatus = useMemo(
    () => resolveThumbnailHardwareReuseStatus(content, tomlAdapter),
    [content, tomlAdapter],
  );
  const showRasterTools =
    draft.imageBackend === "external" ||
    draft.pdfEnabled ||
    draft.officeEnabled ||
    draft.latexEnabled;

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-2xl border p-4 space-y-4",
          isDark
            ? "border-white/10 bg-white/[0.03]"
            : "border-slate-200 bg-white",
        )}
      >
        <div>
          <div
            className={cn(
              "text-xs font-black uppercase tracking-wide",
              isDark ? "text-slate-400" : "text-slate-700",
            )}
          >
            {t("admin.config.thumbnail.imageBackend")}
          </div>
          <label className="mt-3 flex items-center gap-3">
            <input
              type="checkbox"
              checked={draft.imageEnabled}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, imageEnabled: event.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className={cn("text-sm font-bold", isDark ? "text-slate-200" : "text-slate-700")}>
              {t("admin.config.thumbnail.imageEnabled")}
            </span>
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
                setDraft((prev) => ({ ...prev, imageBackend: value }))
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
          ["admin.config.thumbnail.thumbSizePx", draft.thumbSizePx, (value: string) => setDraft((prev) => ({ ...prev, thumbSizePx: value })), "256"],
          ["admin.config.thumbnail.thumbFormat", draft.thumbFormat, (value: string) => setDraft((prev) => ({ ...prev, thumbFormat: value })), "jpg"],
          ["admin.config.thumbnail.thumbQuality", draft.thumbQuality, (value: string) => setDraft((prev) => ({ ...prev, thumbQuality: value })), "85"],
          ["admin.config.thumbnail.imageSmallSkipMb", draft.imageSmallSkipMb, (value: string) => setDraft((prev) => ({ ...prev, imageSmallSkipMb: value })), "1"],
          ["admin.config.thumbnail.imageMaxSizeMb", draft.imageMaxSizeMb, (value: string) => setDraft((prev) => ({ ...prev, imageMaxSizeMb: value })), "100"],
          ["admin.config.thumbnail.imageTimeoutSecs", draft.imageTimeoutSecs, (value: string) => setDraft((prev) => ({ ...prev, imageTimeoutSecs: value })), "10"],
          ["admin.config.thumbnail.imageImagemagickMaxMb", draft.imageImagemagickMaxMb, (value: string) => setDraft((prev) => ({ ...prev, imageImagemagickMaxMb: value })), "20"],
        ].map(([label, value, onChange, placeholder]) => (
          <div key={String(label)}>
            <div
              className={cn(
                "text-xs font-black uppercase tracking-wide",
                isDark ? "text-slate-400" : "text-slate-700",
              )}
            >
              {t(String(label))}
            </div>
            <input
              value={String(value)}
              onChange={(event) =>
                (onChange as (value: string) => void)(event.target.value)
              }
              className={inputClass}
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
              onChange={(value) => setDraft((prev) => ({ ...prev, vipsPath: value }))}
              label={t("admin.config.thumbnail.vipsPath")}
              placeholder="vips"
              onDiagnoseExternalTools={onDiagnoseExternalTools}
              onProbeExternalTool={onProbeExternalTool}
            />
            <ExternalToolPathField
              toolId="imagemagick"
              configKey="vfs_storage_hub.thumbnail.tools.imagemagick_path"
              value={draft.imagemagickPath}
              onChange={(value) =>
                setDraft((prev) => ({ ...prev, imagemagickPath: value }))
              }
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
            : "border-slate-200 bg-white",
        )}
      >
        <div>
          <div
            className={cn(
              "text-xs font-black uppercase tracking-wide",
              isDark ? "text-slate-400" : "text-slate-600",
            )}
          >
            {t("admin.config.thumbnail.videoTitle")}
          </div>
          <label className="mt-3 flex items-center gap-3">
            <input
              type="checkbox"
              checked={draft.videoEnabled}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, videoEnabled: event.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className={cn("text-sm font-bold", isDark ? "text-slate-200" : "text-slate-700")}>
              {t("admin.config.thumbnail.videoEnabled")}
            </span>
          </label>
          <SharedFfmpegField
            value={draft.ffmpegPath}
            onChange={(value) => setDraft((prev) => ({ ...prev, ffmpegPath: value }))}
            label={t("admin.config.thumbnail.ffmpegPath")}
            placeholder="ffmpeg"
            onDiagnoseExternalTools={onDiagnoseExternalTools}
            onProbeExternalTool={onProbeExternalTool}
            className="mt-3"
          />
        </div>
        <div>
          <div className={cn("text-xs font-black uppercase tracking-wide", isDark ? "text-slate-400" : "text-slate-600")}>
            {t("admin.config.thumbnail.videoSeekMode")}
          </div>
          <div className="mt-2">
            <SettingSegmentedControl<"seconds" | "ratio">
              value={draft.videoSeekMode}
              options={[
                { value: "seconds", label: t("admin.config.thumbnail.videoSeekModeSeconds") },
                { value: "ratio", label: t("admin.config.thumbnail.videoSeekModeRatio") },
              ]}
              onChange={(value) => setDraft((prev) => ({ ...prev, videoSeekMode: value }))}
              className="w-full justify-between"
              buttonClassName="flex-1"
            />
          </div>
        </div>
        {draft.videoSeekMode === "seconds" ? (
          <div>
            <div
              className={cn(
                "text-xs font-black uppercase tracking-wide",
                isDark ? "text-slate-400" : "text-slate-600",
              )}
            >
              {t("admin.config.thumbnail.videoSeekSeconds")}
            </div>
            <input
              value={draft.videoSeekSeconds}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, videoSeekSeconds: event.target.value }))
              }
              className={inputClass}
              inputMode="numeric"
              placeholder="3"
            />
          </div>
        ) : (
          <div>
            <div
              className={cn(
                "text-xs font-black uppercase tracking-wide",
                isDark ? "text-slate-400" : "text-slate-600",
              )}
            >
              {t("admin.config.thumbnail.videoSeekRatio")}
            </div>
            <input
              value={draft.videoSeekRatio}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, videoSeekRatio: event.target.value }))
              }
              className={inputClass}
              inputMode="decimal"
              placeholder="0.3"
            />
          </div>
        )}
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
                  setDraft((prev) => ({ ...prev, pdfEnabled: event.target.checked }))
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
              <input value={draft.pdfMaxSizeMb} onChange={(event) => setDraft((prev) => ({ ...prev, pdfMaxSizeMb: event.target.value }))} className={inputClass} placeholder="100" />
            </div>
          </div>
          <div className="space-y-4 rounded-xl border border-dashed border-slate-300/70 p-3 dark:border-white/10">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={draft.officeEnabled}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, officeEnabled: event.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className={cn("text-sm font-bold", isDark ? "text-slate-200" : "text-slate-700")}>{t("admin.config.thumbnail.officeEnabled")}</span>
            </label>
            <div className={cn("text-sm leading-6", isDark ? "text-slate-300" : "text-slate-700")}>{t("admin.config.thumbnail.officeUsesLibreofficeHint")}</div>
            <div>
              <div className={cn("text-xs font-black uppercase tracking-wide", isDark ? "text-slate-400" : "text-slate-600")}>{t("admin.config.thumbnail.officeMaxSizeMb")}</div>
              <input value={draft.officeMaxSizeMb} onChange={(event) => setDraft((prev) => ({ ...prev, officeMaxSizeMb: event.target.value }))} className={inputClass} placeholder="100" />
            </div>
            <ExternalToolPathField
              toolId="libreoffice"
              configKey="vfs_storage_hub.thumbnail.tools.libreoffice_path"
              value={draft.libreofficePath}
              onChange={(value) =>
                setDraft((prev) => ({ ...prev, libreofficePath: value }))
              }
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
                  setDraft((prev) => ({ ...prev, latexEnabled: event.target.checked }))
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
              onChange={(value) => setDraft((prev) => ({ ...prev, latexmkPath: value }))}
              label={t("admin.config.thumbnail.latexmkPath")}
              placeholder="latexmk"
              onDiagnoseExternalTools={onDiagnoseExternalTools}
              onProbeExternalTool={onProbeExternalTool}
            />
            <div>
              <div className={cn("text-xs font-black uppercase tracking-wide", isDark ? "text-slate-400" : "text-slate-600")}>{t("admin.config.thumbnail.latexMaxInputSizeMb")}</div>
              <input value={draft.latexMaxInputSizeMb} onChange={(event) => setDraft((prev) => ({ ...prev, latexMaxInputSizeMb: event.target.value }))} className={inputClass} placeholder="4" />
            </div>
          </div>
          <div className="space-y-4 rounded-xl border border-dashed border-slate-300/70 p-3 dark:border-white/10">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={draft.model3dEnabled}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, model3dEnabled: event.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className={cn("text-sm font-bold", isDark ? "text-slate-200" : "text-slate-700")}>{t("admin.config.thumbnail.model3dEnabled")}</span>
            </label>
            <div className={cn("text-sm leading-6", isDark ? "text-slate-300" : "text-slate-700")}>{t("admin.config.thumbnail.model3dUsesBlenderHint")}</div>
            <div>
              <div className={cn("text-xs font-black uppercase tracking-wide", isDark ? "text-slate-400" : "text-slate-600")}>{t("admin.config.thumbnail.model3dMaxSizeMb")}</div>
              <input value={draft.model3dMaxSizeMb} onChange={(event) => setDraft((prev) => ({ ...prev, model3dMaxSizeMb: event.target.value }))} className={inputClass} placeholder="100" />
            </div>
            <ExternalToolPathField
              toolId="blender"
              configKey="vfs_storage_hub.thumbnail.tools.blender_path"
              value={draft.blenderPath}
              onChange={(value) => setDraft((prev) => ({ ...prev, blenderPath: value }))}
              label={t("admin.config.thumbnail.blenderPath")}
              placeholder="blender"
              onDiagnoseExternalTools={onDiagnoseExternalTools}
              onProbeExternalTool={onProbeExternalTool}
            />
          </div>
        </div>
        {false && (draft.pdfEnabled || draft.latexEnabled) && (
          <div className="space-y-4 rounded-xl border border-dashed border-slate-300/70 p-3 dark:border-white/10">
            <div className={cn("text-xs font-black uppercase tracking-wide", isDark ? "text-slate-400" : "text-slate-600")}>{t("admin.config.thumbnail.pdfTitle")}</div>
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
            {[
              ["admin.config.thumbnail.pdfSmallSkipMb", draft.pdfSmallSkipMb, (value: string) => setDraft((prev) => ({ ...prev, pdfSmallSkipMb: value })), "1"],
              ["admin.config.thumbnail.pdfMaxSizeMb", draft.pdfMaxSizeMb, (value: string) => setDraft((prev) => ({ ...prev, pdfMaxSizeMb: value })), "100"],
              ["admin.config.thumbnail.pdfTimeoutSecs", draft.pdfTimeoutSecs, (value: string) => setDraft((prev) => ({ ...prev, pdfTimeoutSecs: value })), "10"],
              ["admin.config.thumbnail.pdfImagemagickMaxMb", draft.pdfImagemagickMaxMb, (value: string) => setDraft((prev) => ({ ...prev, pdfImagemagickMaxMb: value })), "20"],
            ].map(([label, value, onChange, placeholder]) => (
              <div key={String(label)}>
                <div className={cn("text-xs font-black uppercase tracking-wide", isDark ? "text-slate-400" : "text-slate-600")}>{t(String(label))}</div>
                <input value={String(value)} onChange={(event) => (onChange as (value: string) => void)(event.target.value)} className={inputClass} placeholder={String(placeholder)} />
              </div>
            ))}
          </div>
        )}
        {false && draft.officeEnabled && (
          <div className="space-y-4 rounded-xl border border-dashed border-slate-300/70 p-3 dark:border-white/10">
            <div className={cn("text-xs font-black uppercase tracking-wide", isDark ? "text-slate-400" : "text-slate-600")}>{t("admin.config.thumbnail.officeTitle")}</div>
            {[
              ["admin.config.thumbnail.officeSmallSkipMb", draft.officeSmallSkipMb, (value: string) => setDraft((prev) => ({ ...prev, officeSmallSkipMb: value })), "1"],
              ["admin.config.thumbnail.officeMaxSizeMb", draft.officeMaxSizeMb, (value: string) => setDraft((prev) => ({ ...prev, officeMaxSizeMb: value })), "100"],
              ["admin.config.thumbnail.officeTimeoutSecs", draft.officeTimeoutSecs, (value: string) => setDraft((prev) => ({ ...prev, officeTimeoutSecs: value })), "60"],
              ["admin.config.thumbnail.officeImagemagickMaxMb", draft.officeImagemagickMaxMb, (value: string) => setDraft((prev) => ({ ...prev, officeImagemagickMaxMb: value })), "20"],
            ].map(([label, value, onChange, placeholder]) => (
              <div key={String(label)}>
                <div className={cn("text-xs font-black uppercase tracking-wide", isDark ? "text-slate-400" : "text-slate-600")}>{t(String(label))}</div>
                <input value={String(value)} onChange={(event) => (onChange as (value: string) => void)(event.target.value)} className={inputClass} placeholder={String(placeholder)} />
              </div>
            ))}
          </div>
        )}
        {false && draft.latexEnabled && (
          <div className="space-y-4 rounded-xl border border-dashed border-slate-300/70 p-3 dark:border-white/10">
            <div className={cn("text-xs font-black uppercase tracking-wide", isDark ? "text-slate-400" : "text-slate-600")}>{t("admin.config.thumbnail.latexTitle")}</div>
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
            {[
              ["admin.config.thumbnail.latexmkTimeoutSecs", draft.latexmkTimeoutSecs, (value: string) => setDraft((prev) => ({ ...prev, latexmkTimeoutSecs: value })), "60"],
              ["admin.config.thumbnail.latexMaxInputSizeMb", draft.latexMaxInputSizeMb, (value: string) => setDraft((prev) => ({ ...prev, latexMaxInputSizeMb: value })), "4"],
              ["admin.config.thumbnail.latexMaxOutputSizeMb", draft.latexMaxOutputSizeMb, (value: string) => setDraft((prev) => ({ ...prev, latexMaxOutputSizeMb: value })), "10"],
            ].map(([label, value, onChange, placeholder]) => (
              <div key={String(label)}>
                <div className={cn("text-xs font-black uppercase tracking-wide", isDark ? "text-slate-400" : "text-slate-600")}>{t(String(label))}</div>
                <input value={String(value)} onChange={(event) => (onChange as (value: string) => void)(event.target.value)} className={inputClass} placeholder={String(placeholder)} />
              </div>
            ))}
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={draft.latexAllowShellEscape}
                onChange={(event) => setDraft((prev) => ({ ...prev, latexAllowShellEscape: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className={cn("text-sm font-bold", isDark ? "text-slate-200" : "text-slate-700")}>{t("admin.config.thumbnail.latexAllowShellEscape")}</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export const CompressionInlinePanel: React.FC<BaseProps> = ({
  tomlAdapter,
  content,
  onContentChange,
  onProbeExternalTool,
}) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const createDraft = useCallback(
    (source: string) => parseCompressionDraft(source, tomlAdapter),
    [tomlAdapter],
  );
  const buildContent = useCallback(
    (source: string, nextDraft: CompressionDraft) => {
      return applyCompressionDraft(source, tomlAdapter, nextDraft);
    },
    [tomlAdapter],
  );
  const { draft, setDraft } = useConfigDraftBinding<CompressionDraft>({
    content,
    onContentChange,
    createDraft,
    buildContent,
  });

  const inputClass = cn(
    "mt-2 h-11 w-full rounded-xl border px-3 text-sm font-mono",
    isDark
      ? "border-white/10 bg-black/30 text-white"
      : "border-slate-300 bg-white text-slate-900",
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div
        className={cn(
          "rounded-2xl border p-4 space-y-4",
          isDark
            ? "border-white/10 bg-white/[0.03]"
            : "border-slate-200 bg-white",
        )}
      >
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            aria-label={t("admin.config.compression.enable")}
            className="mt-1 h-4 w-4 rounded border-slate-300"
            checked={draft.enabled}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, enabled: event.target.checked }))
            }
          />
          <div>
            <div className="text-sm font-black uppercase tracking-wide">
              {t("admin.config.compression.enable")}
            </div>
            <div
              className={cn(
                "text-sm mt-1 leading-6",
                isDark ? "text-slate-400" : "text-slate-700",
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
            setDraft((prev) => ({ ...prev, exe7zPath: value }))
          }
          label="7-Zip"
          placeholder="7z"
          onProbeExternalTool={onProbeExternalTool}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <div
              className={cn(
                "text-xs font-black uppercase tracking-wide",
                isDark ? "text-slate-400" : "text-slate-600",
              )}
            >
              Format
            </div>
            <input
              value={draft.defaultCompressionFormat}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  defaultCompressionFormat: event.target.value,
                }))
              }
              className={inputClass}
              placeholder="zip"
            />
          </div>
          <div>
            <div
              className={cn(
                "text-xs font-black uppercase tracking-wide",
                isDark ? "text-slate-400" : "text-slate-600",
              )}
            >
              Concurrency
            </div>
            <input
              value={draft.maxConcurrency}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  maxConcurrency: event.target.value,
                }))
              }
              className={inputClass}
              placeholder="2"
            />
          </div>
          <div>
            <div
              className={cn(
                "text-xs font-black uppercase tracking-wide",
                isDark ? "text-slate-400" : "text-slate-600",
              )}
            >
              CPU Threads
            </div>
            <input
              value={draft.maxCpuThreads}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  maxCpuThreads: event.target.value,
                }))
              }
              className={inputClass}
              placeholder="2"
            />
          </div>
        </div>
      </div>
      <div
        className={cn(
          "rounded-2xl border p-4 space-y-4",
          isDark
            ? "border-white/10 bg-white/[0.03]"
            : "border-slate-200 bg-white",
        )}
      >
        <div
          className={cn(
            "text-sm leading-6",
            isDark ? "text-slate-300" : "text-slate-700",
          )}
        >
          {t("admin.config.compression.disabledHint")}
        </div>
      </div>
    </div>
  );
};

interface AdminPasswordInlinePanelProps {
  value: string;
  onValueChange: (password: string) => void;
  hint?: string | undefined;
  minPasswordLength?: number | undefined;
}

export const AdminPasswordInlinePanel: React.FC<
  AdminPasswordInlinePanelProps
> = ({ value, onValueChange, hint, minPasswordLength = 8 }) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const trimmedPassword = value.trim();
  const showLengthError =
    trimmedPassword.length > 0 && trimmedPassword.length < minPasswordLength;

  return (
    <div>
      <div
        className={cn(
          "text-xs font-black uppercase tracking-wide",
          isDark ? "text-slate-400" : "text-slate-600",
        )}
      >
        {t("systemConfig.setup.admin.password")}
      </div>
      <PasswordInput
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        inputClassName={cn(
          "mt-2 h-11 w-full rounded-xl border px-3 text-sm",
          isDark
            ? "border-white/10 bg-black/30 text-white"
            : "border-slate-300 bg-white text-slate-900",
        )}
        placeholder={t("systemConfig.setup.admin.password")}
      />
      {showLengthError && (
        <div className="mt-2 text-xs leading-6 text-destructive">
          {t([
            "systemConfig.setup.admin.passwordTooShort",
            "launcher.messages.password_too_short",
          ])}
        </div>
      )}
      {hint && (
        <div className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
          {hint}
        </div>
      )}
    </div>
  );
};

type CacheAccelerationDraft = {
  readEnable: boolean;
  readBackend: "memory" | "local_dir";
  readLocalDir: string;
  readCapacityBytes: string;
  readMaxFileSizeBytes: string;
  readTtlSecs: string;
  writeEnable: boolean;
  writeBackend: "memory" | "local_dir";
  writeLocalDir: string;
  writeCapacityBytes: string;
  writeMaxFileSizeBytes: string;
  writeFlushConcurrency: string;
  writeFlushIntervalMs: string;
  writeFlushDeadlineSecs: string;
};

type ProtectedStorageDraft = {
  globalMode: "disabled" | "obfuscate" | "encrypt";
  blockSizeKiB: string;
  prng: "xorshift" | "pcg";
  workers: string;
  cipher: string;
  wrapKey: string;
};

const InlineSegmentCard: React.FC<{
  isDark: boolean;
  title: string;
  subtitle?: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}> = ({ isDark, title, subtitle, value, options, onChange }) => (
  <div
    className={cn(
      "rounded-xl border px-3 py-3",
      isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-slate-50",
    )}
  >
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div
          className={cn(
            "text-sm font-black",
            isDark ? "text-slate-100" : "text-slate-900",
          )}
        >
          {title}
        </div>
        {subtitle && (
          <div
            className={cn(
              "mt-1 text-xs leading-5",
              isDark ? "text-slate-400" : "text-slate-500",
            )}
          >
            {subtitle}
          </div>
        )}
      </div>
      <SettingSegmentedControl
        value={value}
        options={options}
        onChange={onChange}
      />
    </div>
  </div>
);

export const ProtectedStorageInlinePanel: React.FC<BaseProps> = ({
  tomlAdapter,
  content,
  onContentChange,
}) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const createDraft = useCallback(
    (source: string): ProtectedStorageDraft => {
      const parsed = tomlAdapter.parse(source);
      const root = asRecord(parsed);
      const hub = asRecord(root["vfs_storage_hub"]);
      const protectedStorage = asRecord(hub["protected_storage"]);
      const obfuscation = asRecord(protectedStorage["obfuscation"]);
      const encrypt = asRecord(protectedStorage["encrypt"]);
      const globalMode = protectedStorage["global_mode"];
      const prng = obfuscation["prng"];
      return {
        globalMode:
          globalMode === "obfuscate" || globalMode === "encrypt"
            ? globalMode
            : "disabled",
        blockSizeKiB: String(obfuscation["block_size_kib"] ?? 256),
        prng: prng === "pcg" ? "pcg" : "xorshift",
        workers: String(obfuscation["workers"] ?? 0),
        cipher:
          typeof encrypt["cipher"] === "string" && encrypt["cipher"].trim().length > 0
            ? encrypt["cipher"]
            : "aes-256-ctr",
        wrapKey:
          typeof encrypt["wrap_key"] === "string" ? encrypt["wrap_key"] : "",
      };
    },
    [tomlAdapter],
  );
  const buildContent = useCallback(
    (source: string, next: ProtectedStorageDraft) => {
      const parsed = tomlAdapter.parse(source);
      const root: ConfigObject = isRecord(parsed) ? parsed : {};
      const hub = ensureRecord(root, "vfs_storage_hub");
      hub["protected_storage"] = {
        global_mode: next.globalMode,
        obfuscation: {
          block_size_kib: Number.parseInt(next.blockSizeKiB, 10) || 256,
          prng: next.prng,
          workers: Number.parseInt(next.workers, 10) || 0,
        },
        encrypt: {
          cipher: "aes-256-ctr",
          wrap_key: next.wrapKey,
        },
      };
      return tomlAdapter.stringify(root);
    },
    [tomlAdapter],
  );
  const { draft, setDraft } = useConfigDraftBinding<ProtectedStorageDraft>({
    content,
    onContentChange,
    createDraft,
    buildContent,
  });
  const inputClass = cn(
    "mt-1 h-11 w-full rounded-xl border px-3 text-sm font-mono",
    isDark
      ? "border-white/10 bg-black/30 text-white"
      : "border-slate-300 bg-white text-slate-900",
  );
  const riskKey = `admin.config.protectedStorage.risks.${draft.globalMode}`;

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-2xl border p-4 text-sm leading-6",
          isDark
            ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
            : "border-amber-200 bg-amber-50 text-amber-900",
        )}
      >
        {t(riskKey)}
      </div>

      <div
        className={cn(
          "rounded-2xl border p-4 space-y-3",
          isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white",
        )}
      >
        <InlineSegmentCard
          isDark={isDark}
          title={t("admin.config.protectedStorage.globalMode")}
          subtitle={t(`admin.config.protectedStorage.globalModeHint.${draft.globalMode}`)}
          value={draft.globalMode}
          options={[
            { value: "disabled", label: t("admin.config.protectedStorage.modes.disabled") },
            { value: "obfuscate", label: t("admin.config.protectedStorage.modes.obfuscate") },
            { value: "encrypt", label: t("admin.config.protectedStorage.modes.encrypt") },
          ]}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              globalMode: value as ProtectedStorageDraft["globalMode"],
            }))
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div
          className={cn(
            "rounded-2xl border p-4 space-y-3",
            isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white",
          )}
        >
          <div className="text-sm font-black">{t("admin.config.protectedStorage.obfuscation.title")}</div>
          <div>
            <div className={cn("text-xs font-black uppercase tracking-wide", isDark ? "text-slate-400" : "text-slate-700")}>
              {t("admin.config.protectedStorage.obfuscation.blockSizeKiB")}
            </div>
            <input
              className={inputClass}
              value={draft.blockSizeKiB}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, blockSizeKiB: event.target.value }))
              }
              placeholder="256"
            />
          </div>
          <InlineSegmentCard
            isDark={isDark}
            title={t("admin.config.protectedStorage.obfuscation.prng")}
            subtitle={t("admin.config.protectedStorage.obfuscation.prngHint")}
            value={draft.prng}
            options={[
              { value: "xorshift", label: "xorshift" },
              { value: "pcg", label: "pcg" },
            ]}
            onChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                prng: value as ProtectedStorageDraft["prng"],
              }))
            }
          />
          <div>
            <div className={cn("text-xs font-black uppercase tracking-wide", isDark ? "text-slate-400" : "text-slate-700")}>
              {t("admin.config.protectedStorage.obfuscation.workers")}
            </div>
            <input
              className={inputClass}
              value={draft.workers}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, workers: event.target.value }))
              }
              placeholder="0"
            />
            <div className={cn("mt-2 text-xs leading-5", isDark ? "text-slate-400" : "text-slate-500")}>
              {t("admin.config.protectedStorage.obfuscation.workersHint")}
            </div>
          </div>
        </div>

        <div
          className={cn(
            "rounded-2xl border p-4 space-y-3",
            isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white",
          )}
        >
          <div className="text-sm font-black">{t("admin.config.protectedStorage.encrypt.title")}</div>
          <div>
            <div className={cn("text-xs font-black uppercase tracking-wide", isDark ? "text-slate-400" : "text-slate-700")}>
              {t("admin.config.protectedStorage.encrypt.cipher")}
            </div>
            <input className={inputClass} value={draft.cipher} readOnly />
            <div className={cn("mt-2 text-xs leading-5", isDark ? "text-slate-400" : "text-slate-500")}>
              {t("admin.config.protectedStorage.encrypt.cipherHint")}
            </div>
          </div>
          <div>
            <div className={cn("text-xs font-black uppercase tracking-wide", isDark ? "text-slate-400" : "text-slate-700")}>
              {t("admin.config.protectedStorage.encrypt.wrapKey")}
            </div>
            <PasswordInput
              value={draft.wrapKey}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, wrapKey: event.target.value }))
              }
              wrapperClassName="mt-1"
              inputClassName={cn(
                "h-11 rounded-xl border px-3 text-sm font-mono",
                isDark
                  ? "border-white/10 bg-black/30 text-white"
                  : "border-slate-300 bg-white text-slate-900",
              )}
            />
            <div className={cn("mt-2 text-xs leading-5", isDark ? "text-slate-400" : "text-slate-500")}>
              {t("admin.config.protectedStorage.encrypt.wrapKeyHint")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CacheAccelerationInlinePanel: React.FC<BaseProps> = ({
  tomlAdapter,
  content,
  onContentChange,
}) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const createDraft = useCallback(
    (source: string): CacheAccelerationDraft => {
      const parsed = tomlAdapter.parse(source);
      const root = asRecord(parsed);
      const hub = asRecord(root["vfs_storage_hub"]);
      const readCache = asRecord(hub["read_cache"]);
      const writeCache = asRecord(hub["write_cache"]);
      return {
        readEnable: Boolean(readCache["enable"]),
        readBackend: readCache["backend"] === "local_dir" ? "local_dir" : "memory",
        readLocalDir:
          typeof readCache["local_dir"] === "string"
            ? readCache["local_dir"]
            : "{RUNTIMEDIR}/cache/vfs-read",
        readCapacityBytes: String(readCache["capacity_bytes"] ?? 134217728),
        readMaxFileSizeBytes: String(readCache["max_file_size_bytes"] ?? 2097152),
        readTtlSecs: String(readCache["ttl_secs"] ?? 1800),
        writeEnable: Boolean(writeCache["enable"]),
        writeBackend: writeCache["backend"] === "memory" ? "memory" : "local_dir",
        writeLocalDir:
          typeof writeCache["local_dir"] === "string"
            ? writeCache["local_dir"]
            : "{RUNTIMEDIR}/cache/vfs-write",
        writeCapacityBytes: String(writeCache["capacity_bytes"] ?? 100663296),
        writeMaxFileSizeBytes: String(writeCache["max_file_size_bytes"] ?? 262144),
        writeFlushConcurrency: String(writeCache["flush_concurrency"] ?? 2),
        writeFlushIntervalMs: String(writeCache["flush_interval_ms"] ?? 30),
        writeFlushDeadlineSecs: String(writeCache["flush_deadline_secs"] ?? 360),
      };
    },
    [tomlAdapter],
  );

  const buildContent = useCallback(
    (source: string, next: CacheAccelerationDraft) => {
      const parsed = tomlAdapter.parse(source);
      const root: ConfigObject = isRecord(parsed) ? parsed : {};
      const hub = ensureRecord(root, "vfs_storage_hub");
      hub["read_cache"] = {
        enable: next.readEnable,
        backend: next.readBackend,
        local_dir: next.readLocalDir,
        capacity_bytes:
          Number.parseInt(next.readCapacityBytes, 10) || 134217728,
        max_file_size_bytes:
          Number.parseInt(next.readMaxFileSizeBytes, 10) || 2097152,
        ttl_secs: Number.parseInt(next.readTtlSecs, 10) || 1800,
      };
      hub["write_cache"] = {
        enable: next.writeEnable,
        backend: next.writeBackend,
        local_dir: next.writeLocalDir,
        capacity_bytes:
          Number.parseInt(next.writeCapacityBytes, 10) || 100663296,
        max_file_size_bytes:
          Number.parseInt(next.writeMaxFileSizeBytes, 10) || 262144,
        flush_concurrency: Number.parseInt(next.writeFlushConcurrency, 10) || 2,
        flush_interval_ms: Number.parseInt(next.writeFlushIntervalMs, 10) || 30,
        flush_deadline_secs:
          Number.parseInt(next.writeFlushDeadlineSecs, 10) || 360,
      };
      return tomlAdapter.stringify(root);
    },
    [tomlAdapter],
  );

  const { draft, setDraft } = useConfigDraftBinding<CacheAccelerationDraft>({
    content,
    onContentChange,
    createDraft,
    buildContent,
  });

  const inputClass = cn(
    "mt-1 h-11 w-full rounded-xl border px-3 text-sm font-mono",
    isDark
      ? "border-white/10 bg-black/30 text-white"
      : "border-slate-300 bg-white text-slate-900",
  );
  const backendOptions = [
    { value: "memory", label: t("admin.config.storage.cache.backends.memory") },
    {
      value: "local_dir",
      label: t("admin.config.storage.cache.backends.localDir"),
    },
  ] as const;
  const enableOptions = [
    { value: "enabled", label: t("common.enabled") },
    { value: "disabled", label: t("common.disabled") },
  ] as const;
  const patch = (
    updater: (prev: CacheAccelerationDraft) => CacheAccelerationDraft,
  ) => {
    setDraft((prev) => updater(prev));
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div
        className={cn(
          "rounded-2xl border p-4 space-y-3",
          isDark
            ? "border-white/10 bg-white/[0.03]"
            : "border-slate-200 bg-white",
        )}
      >
        <div className="text-sm font-black">
          {t("admin.config.storage.cache.read")}
        </div>
        <InlineSegmentCard
          isDark={isDark}
          title={t("admin.config.storage.cache.enable")}
          subtitle={
            draft.readEnable ? t("common.enabled") : t("common.disabled")
          }
          value={draft.readEnable ? "enabled" : "disabled"}
          options={[...enableOptions]}
          onChange={(value) =>
            patch((prev) => ({ ...prev, readEnable: value === "enabled" }))
          }
        />
        <InlineSegmentCard
          isDark={isDark}
          title={t("admin.config.storage.cache.backend")}
          subtitle={
            draft.readBackend === "local_dir"
              ? t("admin.config.storage.cache.backends.localDir")
              : t("admin.config.storage.cache.backends.memory")
          }
          value={draft.readBackend}
          options={[...backendOptions]}
          onChange={(value) =>
            patch((prev) => ({
              ...prev,
              readBackend: value as "memory" | "local_dir",
            }))
          }
        />
        {draft.readBackend === "local_dir" && (
          <input
            className={inputClass}
            value={draft.readLocalDir}
            onChange={(e) =>
              patch((prev) => ({ ...prev, readLocalDir: e.target.value }))
            }
            placeholder={t("admin.config.storage.cache.localDir")}
          />
        )}
        <input
          className={inputClass}
          value={draft.readCapacityBytes}
          onChange={(e) =>
            patch((prev) => ({ ...prev, readCapacityBytes: e.target.value }))
          }
          placeholder={t("admin.config.storage.cache.capacityBytes")}
        />
        <input
          className={inputClass}
          value={draft.readMaxFileSizeBytes}
          onChange={(e) =>
            patch((prev) => ({ ...prev, readMaxFileSizeBytes: e.target.value }))
          }
          placeholder={t("admin.config.storage.cache.maxFileSizeBytes")}
        />
      </div>
      <div
        className={cn(
          "rounded-2xl border p-4 space-y-3",
          isDark
            ? "border-white/10 bg-white/[0.03]"
            : "border-slate-200 bg-white",
        )}
      >
        <div className="text-sm font-black">
          {t("admin.config.storage.cache.write")}
        </div>
        {draft.writeEnable && (
          <div
            className={cn(
              "rounded-xl border p-3 text-sm leading-6",
              isDark
                ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                : "border-rose-200 bg-rose-50 text-rose-900",
            )}
          >
            {t("systemConfig.setup.storageCache.writeRisk")}
          </div>
        )}
        <InlineSegmentCard
          isDark={isDark}
          title={t("admin.config.storage.cache.enable")}
          subtitle={
            draft.writeEnable ? t("common.enabled") : t("common.disabled")
          }
          value={draft.writeEnable ? "enabled" : "disabled"}
          options={[...enableOptions]}
          onChange={(value) =>
            patch((prev) => ({ ...prev, writeEnable: value === "enabled" }))
          }
        />
        <InlineSegmentCard
          isDark={isDark}
          title={t("admin.config.storage.cache.backend")}
          subtitle={
            draft.writeBackend === "local_dir"
              ? t("admin.config.storage.cache.backends.localDir")
              : t("admin.config.storage.cache.backends.memory")
          }
          value={draft.writeBackend}
          options={[...backendOptions]}
          onChange={(value) =>
            patch((prev) => ({
              ...prev,
              writeBackend: value as "memory" | "local_dir",
            }))
          }
        />
        {draft.writeBackend === "local_dir" && (
          <input
            className={inputClass}
            value={draft.writeLocalDir}
            onChange={(e) =>
              patch((prev) => ({ ...prev, writeLocalDir: e.target.value }))
            }
            placeholder={t("admin.config.storage.cache.localDir")}
          />
        )}
        <input
          className={inputClass}
          value={draft.writeCapacityBytes}
          onChange={(e) =>
            patch((prev) => ({ ...prev, writeCapacityBytes: e.target.value }))
          }
          placeholder={t("admin.config.storage.cache.capacityBytes")}
        />
        <input
          className={inputClass}
          value={draft.writeFlushConcurrency}
          onChange={(e) =>
            patch((prev) => ({
              ...prev,
              writeFlushConcurrency: e.target.value,
            }))
          }
          placeholder={t("admin.config.storage.cache.flushConcurrency")}
        />
      </div>
    </div>
  );
};
