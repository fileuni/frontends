import React from 'react';
import { ConfigRawEditor, type ConfigError, type ConfigNoteEntry } from './ConfigRawEditor';

interface ConfigEditorPanelProps {
  configPath?: string | null;
  content: string;
  notes: Record<string, ConfigNoteEntry>;
  errors: ConfigError[];
  loading: boolean;
  saveDisabled?: boolean;
  onChange: (value: string) => void;
  onTest: () => void;
  onSave: () => void;
  onCancel: () => void;
  title: string;
  testLabel: string;
  saveLabel: string;
  cancelLabel: string;
  showCancel?: boolean;
  actionsPrefix?: React.ReactNode;
}

export const ConfigEditorPanel: React.FC<ConfigEditorPanelProps> = ({
  configPath,
  content,
  notes,
  errors,
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
}) => {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wide shrink-0">{title}</h3>
          {configPath && (
            <span className="text-[10px] sm:text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded truncate max-w-full sm:max-w-[260px]">
              {configPath}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 justify-end flex-wrap">
          {actionsPrefix}
          <button
            onClick={onTest}
            disabled={loading}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs sm:text-sm font-bold uppercase tracking-wide transition-all disabled:opacity-50"
          >
            {testLabel}
          </button>
          <button
            onClick={onSave}
            disabled={loading || saveDisabled}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-primary hover:opacity-90 text-white text-xs sm:text-sm font-bold uppercase tracking-wide shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
          >
            {saveLabel}
          </button>
          {showCancel && (
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-wide transition-all"
            >
              {cancelLabel}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-black/5 rounded-xl sm:rounded-2xl lg:rounded-[2.5rem] overflow-hidden border border-slate-200/50 dark:border-slate-800/50">
        <ConfigRawEditor
          content={content}
          onChange={onChange}
          notes={notes}
          errors={errors}
          height="100%"
        />
      </div>
    </div>
  );
};
