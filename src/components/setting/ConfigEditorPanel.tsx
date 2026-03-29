import React from "react";
import { cn } from "@/lib/utils";
import {
  ConfigRawEditor,
  type ConfigError,
  type ConfigNoteEntry,
  type EditorJumpPosition,
} from "./ConfigRawEditor";

interface ConfigEditorPanelProps {
  configPath?: string | null | undefined;
  content: string;
  notes: Record<string, ConfigNoteEntry>;
  errors: ConfigError[];
  jumpTo?: EditorJumpPosition | null | undefined;
  loading: boolean;
  saveDisabled?: boolean | undefined;
  onChange: (value: string) => void;
  onTest: () => void;
  onSave: () => void;
  onCancel: () => void;
  title: string;
  testLabel: string;
  saveLabel: string;
  cancelLabel: string;
  showCancel?: boolean | undefined;
  actionsPrefix?: React.ReactNode | undefined;
  isDark?: boolean | undefined;
  editorVisible?: boolean | undefined;
  collapsedContent?: React.ReactNode | undefined;
  hideToolbarWhenCollapsed?: boolean | undefined;
  showToolbar?: boolean | undefined;
}

export const ConfigEditorPanel: React.FC<ConfigEditorPanelProps> = ({
  configPath,
  content,
  notes,
  errors,
  jumpTo,
  loading,
  saveDisabled = false,
  onChange,
  onTest,
  onSave,
  onCancel,
  title,
  testLabel,
  saveLabel,
  cancelLabel,
  showCancel = true,
  actionsPrefix,
  isDark = true,
  editorVisible = true,
  collapsedContent,
  hideToolbarWhenCollapsed = false,
  showToolbar = true,
}) => {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 min-h-[320px] sm:min-h-[420px] lg:min-h-[600px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <h3
            className={cn(
              "text-sm sm:text-sm font-black uppercase tracking-wide shrink-0",
              isDark ? "text-white" : "text-slate-900",
            )}
          >
            {title}
          </h3>
          {configPath && (
            <span
              className={cn(
                "text-sm sm:text-sm font-mono px-2 py-0.5 rounded border shadow-sm",
                isDark
                  ? "text-slate-400 bg-slate-800/50 border-transparent"
                  : "text-slate-800 bg-slate-200 border-slate-300",
              )}
            >
              {configPath}
            </span>
          )}
        </div>
        {showToolbar && !(hideToolbarWhenCollapsed && !editorVisible) && (
          <div className="flex items-center gap-2 shrink-0 justify-end flex-wrap">
            {actionsPrefix}
            <button
              type="button"
              onClick={onTest}
              disabled={loading}
              className={cn(
                "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-sm sm:text-sm font-black uppercase tracking-wide transition-colors disabled:opacity-50 shadow-sm border",
                isDark
                  ? "bg-cyan-500/10 text-cyan-400 border-transparent hover:bg-cyan-500/20"
                  : "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100",
              )}
            >
              {testLabel}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={loading || saveDisabled}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-primary hover:opacity-90 text-white text-sm sm:text-sm font-black uppercase tracking-wide shadow-sm transition-colors disabled:opacity-50"
            >
              {saveLabel}
            </button>
            {showCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className={cn(
                  "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-sm sm:text-sm font-black uppercase tracking-wide transition-colors shadow-sm border",
                  isDark
                    ? "bg-slate-800/50 text-slate-400 border-transparent hover:bg-slate-700"
                    : "bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300",
                )}
              >
                {cancelLabel}
              </button>
            )}
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex-1 min-h-0 rounded-xl sm:rounded-2xl lg:rounded-[2.5rem] overflow-hidden border transition-colors",
          isDark
            ? "bg-black/5 border-slate-800/50"
            : "bg-slate-100 border-slate-300 shadow-inner",
        )}
      >
        {editorVisible ? (
          <div className="overflow-visible p-2 sm:p-3">
            <ConfigRawEditor
              content={content}
              onChange={onChange}
              notes={notes}
              errors={errors}
              jumpTo={jumpTo}
              height="clamp(420px, 72vh, 960px)"
              isDark={isDark}
            />
          </div>
        ) : (
          <div className="h-full min-h-[280px] p-4 sm:p-6 lg:p-8">
            {collapsedContent}
          </div>
        )}
      </div>
    </div>
  );
};
