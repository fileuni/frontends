import React, { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { useToastStore } from "@/stores/toast";

type DiagnoseToolItem = {
  tool_id: string;
  available: boolean;
  message: string;
  resolved_path?: string | null;
  version_line?: string | null;
};

type DiagnoseResponse = {
  tools: DiagnoseToolItem[];
};

export type DiagnoseExternalTools = (
  configuredValues: Record<string, string>,
) => Promise<DiagnoseResponse>;

interface SharedFfmpegFieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  onDiagnoseExternalTools?: DiagnoseExternalTools | undefined;
  className?: string;
}

export const SharedFfmpegField: React.FC<SharedFfmpegFieldProps> = ({
  value,
  onChange,
  label,
  placeholder = "ffmpeg",
  onDiagnoseExternalTools,
  className,
}) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const { addToast } = useToastStore();
  const [testing, setTesting] = useState(false);
  const inputId = useId();

  const inputClass = cn(
    "h-11 w-full rounded-xl border px-3 text-sm font-mono",
    isDark
      ? "border-white/10 bg-black/30 text-white"
      : "border-slate-300 bg-white text-slate-900",
  );

  const handleTest = async () => {
    if (!onDiagnoseExternalTools || testing) return;
    setTesting(true);
    try {
      const diagnosis = await onDiagnoseExternalTools({
        "vfs_storage_hub.external_tools.ffmpeg_path": value.trim(),
      });
      const item = diagnosis.tools.find((tool) => tool.tool_id === "ffmpeg");
      if (!item) {
        addToast(t("admin.config.externalTools.messages.diagnoseFailed"), "error");
        return;
      }
      if (item.available) {
        const summary = item.resolved_path?.trim()
          ? `${item.message} (${item.resolved_path})`
          : item.message;
        addToast(summary, "success");
      } else {
        addToast(item.message, "error");
      }
    } catch (error) {
      addToast(
        error instanceof Error
          ? error.message
          : t("admin.config.externalTools.messages.diagnoseFailed"),
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
          "text-xs font-black uppercase tracking-wide",
          isDark ? "text-slate-400" : "text-slate-600",
        )}
      >
        {label}
      </label>
      <div className="mt-2 flex items-center gap-2">
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
          disabled={!onDiagnoseExternalTools || testing}
          className={cn(
            "h-11 shrink-0 rounded-xl border px-4 text-sm font-black transition-colors disabled:opacity-50",
            isDark
              ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15"
              : "border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100",
          )}
        >
          {testing ? <Loader2 size={16} className="animate-spin" /> : t("common.test")}
        </button>
      </div>
    </div>
  );
};
