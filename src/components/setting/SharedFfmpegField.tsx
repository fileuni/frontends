import React, { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { useToastStore } from "@/stores/toast";

type DiagnoseToolItem = {
  tool_id: string;
  available: boolean;
  status_code?: string;
  message: string;
  resolved_path?: string | null;
  version_line?: string | null;
  warnings?: string[];
};

type DiagnoseResponse = {
  tools: DiagnoseToolItem[];
};

export type DiagnoseExternalTools = (
  configuredValues: Record<string, string>,
) => Promise<DiagnoseResponse>;

export type ProbeExternalTool = (payload: {
  toolId: string;
  value: string;
}) => Promise<{
  tool_id: string;
  display_name: string;
  available: boolean;
  current_value: string;
  resolved_path?: string | null;
  version_line?: string | null;
  message: string;
}>;

interface ExternalToolPathFieldProps {
  toolId: string;
  configKey: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  onDiagnoseExternalTools?: DiagnoseExternalTools | undefined;
  onProbeExternalTool?: ProbeExternalTool | undefined;
  className?: string;
}

export const ExternalToolPathField: React.FC<ExternalToolPathFieldProps> = ({
  toolId,
  configKey,
  value,
  onChange,
  label,
  placeholder = "ffmpeg",
  onDiagnoseExternalTools,
  onProbeExternalTool,
  className,
}) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const { addToast } = useToastStore();
  const [testing, setTesting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    tone: "success" | "warning" | "error";
    summary: string;
    detail?: string;
  } | null>(null);
  const inputId = useId();

  const inputClass = cn(
    "h-11 w-full rounded-xl border px-3 text-sm font-mono",
    isDark
      ? "border-white/10 bg-black/30 text-white"
      : "border-slate-300 bg-white text-slate-900",
  );

  const handleTest = async () => {
    if ((!onProbeExternalTool && !onDiagnoseExternalTools) || testing) return;
    setTesting(true);
    try {
      const item = onProbeExternalTool
        ? await onProbeExternalTool({ toolId, value: value.trim() })
        : (await onDiagnoseExternalTools({ [configKey]: value.trim() })).tools.find(
            (tool) => tool.tool_id === toolId,
          );
      if (!item) {
        const summary = t("admin.config.externalTools.messages.toolTestFailed", {
          tool: label,
        });
        setLastResult({ tone: "error", summary });
        addToast(summary, "error");
        return;
      }
      const detail = [item.resolved_path?.trim(), item.version_line?.trim(), item.message]
        .filter(Boolean)
        .join(" | ");
      const hasWarnings = false;
      if (item.available && !hasWarnings) {
        const summary = t("admin.config.externalTools.messages.toolTestOk", {
          tool: label,
        });
        setLastResult({ tone: "success", summary, detail });
        addToast(`${summary}${detail ? `: ${detail}` : ""}`, "success");
      } else {
        const summary = t("admin.config.externalTools.messages.toolTestFailed", {
          tool: label,
        });
        setLastResult({ tone: "error", summary, detail });
        addToast(`${summary}${detail ? `: ${detail}` : ""}`, "error");
      }
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message
          : t("admin.config.externalTools.messages.diagnoseFailed");
      setLastResult({
        tone: "error",
        summary: t("admin.config.externalTools.messages.toolTestFailed", {
          tool: label,
        }),
        detail,
      });
      addToast(
        `${t("admin.config.externalTools.messages.toolTestFailed", { tool: label })}: ${detail}`,
        "error",
      );
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className={cn(
          "text-xs font-black uppercase tracking-wide break-words",
          isDark ? "text-slate-400" : "text-slate-600",
        )}
      >
        {label}
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => {
            void handleTest();
          }}
          disabled={(!onProbeExternalTool && !onDiagnoseExternalTools) || testing}
          className={cn(
            "h-11 w-full shrink-0 rounded-xl border px-4 text-sm font-black transition-colors disabled:opacity-50 sm:w-auto",
            isDark
              ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15"
              : "border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100",
          )}
        >
          {testing ? <Loader2 size={16} className="animate-spin" /> : t("common.test")}
        </button>
      </div>
      {lastResult && (
        <div
          className={cn(
            "mt-2 rounded-xl border px-3 py-2 text-sm leading-6",
            lastResult.tone === "success"
              ? isDark
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
              : lastResult.tone === "warning"
                ? isDark
                  ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
                  : "border-amber-200 bg-amber-50 text-amber-900"
                : isDark
                  ? "border-rose-500/25 bg-rose-500/10 text-rose-100"
                  : "border-rose-200 bg-rose-50 text-rose-900",
          )}
        >
          <div className="font-black uppercase tracking-wide">{lastResult.summary}</div>
          {lastResult.detail && <div className="mt-1 break-all opacity-90">{lastResult.detail}</div>}
        </div>
      )}
    </div>
  );
};

interface SharedFfmpegFieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  onDiagnoseExternalTools?: DiagnoseExternalTools | undefined;
  onProbeExternalTool?: ProbeExternalTool | undefined;
  className?: string;
}

export const SharedFfmpegField: React.FC<SharedFfmpegFieldProps> = (props) => (
  <ExternalToolPathField
    toolId="ffmpeg"
    configKey="vfs_storage_hub.external_tools.ffmpeg_path"
    {...props}
  />
);
