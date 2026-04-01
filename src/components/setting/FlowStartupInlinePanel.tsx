import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { GripVertical, Plus, Trash2, ArrowUp, ArrowDown, FolderOpen, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { isRecord, ensureRecord } from "@/lib/configObject";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import type { TomlAdapter } from "./ExternalDependencyConfigModal";

type StartupCommandDraft = {
  command: string;
  args: string;
  work_dir: string;
};

type FlowStartupDraft = {
  preStartup: StartupCommandDraft[];
  postStartup: StartupCommandDraft[];
};

type FlowStartupInlinePanelProps = {
  tomlAdapter: TomlAdapter;
  content: string;
  onContentChange: (value: string) => void;
};

const emptyCommand = (): StartupCommandDraft => ({
  command: "",
  args: "",
  work_dir: "",
});

const parseCommandsFromToml = (section: Record<string, unknown>): StartupCommandDraft[] => {
  const commands = section["commands"];
  if (!Array.isArray(commands)) return [];
  return commands
    .filter(isRecord)
    .map((cmd) => ({
      command: typeof cmd["command"] === "string" ? cmd["command"] : "",
      args: Array.isArray(cmd["args"]) ? (cmd["args"] as string[]).join(" ") : "",
      work_dir: typeof cmd["work_dir"] === "string" ? cmd["work_dir"] : "",
    }));
};

const buildCommandsForToml = (commands: StartupCommandDraft[]): Record<string, unknown>[] => {
  return commands
    .filter((cmd) => cmd.command.trim().length > 0)
    .map((cmd) => {
      const obj: Record<string, unknown> = { command: cmd.command.trim() };
      const args = cmd.args.trim();
      if (args.length > 0) {
        obj["args"] = args.split(/\s+/).filter(Boolean);
      }
      if (cmd.work_dir.trim().length > 0) {
        obj["work_dir"] = cmd.work_dir.trim();
      }
      return obj;
    });
};

const createDraft = (source: string, tomlAdapter: TomlAdapter): FlowStartupDraft => {
  const parsed = tomlAdapter.parse(source);
  const root = isRecord(parsed) ? parsed : {};
  const extMgr = isRecord(root["extension_manager"]) ? root["extension_manager"] : {};
  const pre = isRecord(extMgr["pre_startup"]) ? extMgr["pre_startup"] : {};
  const post = isRecord(extMgr["post_startup"]) ? extMgr["post_startup"] : {};
  return {
    preStartup: parseCommandsFromToml(pre),
    postStartup: parseCommandsFromToml(post),
  };
};

const buildContent = (
  source: string,
  tomlAdapter: TomlAdapter,
  draft: FlowStartupDraft,
): string => {
  const parsed = tomlAdapter.parse(source);
  const root: Record<string, unknown> = isRecord(parsed) ? parsed : {};
  const extMgr = ensureRecord(root, "extension_manager");
  const preSection = ensureRecord(extMgr, "pre_startup");
  const postSection = ensureRecord(extMgr, "post_startup");

  const preCommands = buildCommandsForToml(draft.preStartup);
  const postCommands = buildCommandsForToml(draft.postStartup);

  if (preCommands.length > 0) {
    preSection["commands"] = preCommands;
  } else {
    delete preSection["commands"];
  }
  if (postCommands.length > 0) {
    postSection["commands"] = postCommands;
  } else {
    delete postSection["commands"];
  }

  return tomlAdapter.stringify(root);
};

type CommandRowProps = {
  cmd: StartupCommandDraft;
  index: number;
  total: number;
  isDark: boolean;
  onChange: (patch: Partial<StartupCommandDraft>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
};

const CommandRow: React.FC<CommandRowProps> = ({
  cmd,
  index,
  total,
  isDark,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const { t } = useTranslation();
  const inputClass = cn(
    "w-full rounded-lg border px-2.5 py-2 text-sm font-mono transition-colors",
    isDark
      ? "border-white/10 bg-black/30 text-slate-100 placeholder:text-slate-500"
      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400",
  );

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border p-2.5 transition-colors",
        isDark ? "border-white/5 bg-white/[0.02]" : "border-slate-100 bg-slate-50/50",
      )}
    >
      <button
        type="button"
        className="flex flex-col items-center gap-0.5 pt-2 cursor-grab active:cursor-grabbing opacity-40 hover:opacity-70 bg-transparent border-0 p-0"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          onDragStart(index);
        }}
        onDragOver={(e) => onDragOver(e, index)}
        onDrop={(e) => onDrop(e, index)}
      >
        <GripVertical size={14} />
        <span className="text-[10px] font-mono">{index + 1}</span>
      </button>

      <div className="flex-1 grid gap-2">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="shrink-0 opacity-50" />
          <input
            type="text"
            value={cmd.command}
            onChange={(e) => onChange({ command: e.target.value })}
            placeholder={t("admin.config.flowStartup.commandPlaceholder")}
            className={inputClass}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-40 shrink-0 w-10">Args</span>
          <input
            type="text"
            value={cmd.args}
            onChange={(e) => onChange({ args: e.target.value })}
            placeholder={t("admin.config.flowStartup.argsPlaceholder")}
            className={inputClass}
          />
        </div>
        <div className="flex items-center gap-2">
          <FolderOpen size={14} className="shrink-0 opacity-50" />
          <input
            type="text"
            value={cmd.work_dir}
            onChange={(e) => onChange({ work_dir: e.target.value })}
            placeholder={t("admin.config.flowStartup.workDirPlaceholder")}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 pt-1">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className={cn(
            "h-6 w-6 rounded flex items-center justify-center disabled:opacity-30",
            isDark ? "hover:bg-white/10" : "hover:bg-slate-200",
          )}
          title={t("admin.config.flowStartup.moveUp")}
        >
          <ArrowUp size={12} />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          className={cn(
            "h-6 w-6 rounded flex items-center justify-center disabled:opacity-30",
            isDark ? "hover:bg-white/10" : "hover:bg-slate-200",
          )}
          title={t("admin.config.flowStartup.moveDown")}
        >
          <ArrowDown size={12} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            "h-6 w-6 rounded flex items-center justify-center text-destructive",
            isDark ? "hover:bg-white/10" : "hover:bg-slate-200",
          )}
          title={t("admin.config.flowStartup.remove")}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

type CommandSectionProps = {
  title: string;
  hint: string;
  commands: StartupCommandDraft[];
  onCommandsChange: (commands: StartupCommandDraft[]) => void;
};

const CommandSection: React.FC<CommandSectionProps> = ({
  title,
  hint,
  commands,
  onCommandsChange,
}) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const updateCommand = (index: number, patch: Partial<StartupCommandDraft>) => {
    const next = [...commands];
    const existing = next[index];
    if (!existing) return;
    next[index] = {
      command: patch.command ?? existing.command,
      args: patch.args ?? existing.args,
      work_dir: patch.work_dir ?? existing.work_dir,
    };
    onCommandsChange(next);
  };

  const moveCommand = (from: number, to: number) => {
    if (to < 0 || to >= commands.length) return;
    const next = [...commands];
    const [item] = next.splice(from, 1);
    if (item) {
      next.splice(to, 0, item);
      onCommandsChange(next);
    }
  };

  const removeCommand = (index: number) => {
    onCommandsChange(commands.filter((_, i) => i !== index));
  };

  const addCommand = () => {
    onCommandsChange([...commands, emptyCommand()]);
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, _index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== toIndex) {
      moveCommand(dragIndex, toIndex);
    }
    setDragIndex(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h4 className={cn("text-sm font-black", isDark ? "text-slate-100" : "text-slate-900")}>
            {title}
          </h4>
          <p className={cn("text-xs opacity-60 mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>
            {hint} ({commands.length}/50)
          </p>
        </div>
        <button
          type="button"
          onClick={addCommand}
          disabled={commands.length >= 50}
          className={cn(
            "flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40",
            isDark
              ? "bg-primary/15 text-primary hover:bg-primary/25"
              : "bg-primary/10 text-primary hover:bg-primary/20",
          )}
        >
          <Plus size={14} />
          {t("admin.config.flowStartup.addCommand")}
        </button>
      </div>

      {commands.length === 0 ? (
        <div className={cn(
          "rounded-xl border border-dashed p-6 text-center text-sm",
          isDark ? "border-white/10 text-slate-500" : "border-slate-200 text-slate-400",
        )}>
          {t("admin.config.flowStartup.noCommands")}
        </div>
      ) : (
        <div className="space-y-1.5">
          {commands.map((cmd, i) => (
            <CommandRow
              key={`${cmd.command}-${cmd.args}-${cmd.work_dir}`}
              cmd={cmd}
              index={i}
              total={commands.length}
              isDark={isDark}
              onChange={(patch) => updateCommand(i, patch)}
              onMoveUp={() => moveCommand(i, i - 1)}
              onMoveDown={() => moveCommand(i, i + 1)}
              onRemove={() => removeCommand(i)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FlowStartupInlinePanel: React.FC<FlowStartupInlinePanelProps> = ({
  tomlAdapter,
  content,
  onContentChange,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<FlowStartupDraft>(() => createDraft(content, tomlAdapter));

  const applyDraft = useCallback(
    (nextDraft: FlowStartupDraft) => {
      setDraft(nextDraft);
      const newContent = buildContent(content, tomlAdapter, nextDraft);
      if (newContent !== content) {
        onContentChange(newContent);
      }
    },
    [content, tomlAdapter, onContentChange],
  );

  return (
    <div className="space-y-4">
      <CommandSection
        title={t("admin.config.flowStartup.preStartupTitle")}
        hint={t("admin.config.flowStartup.preStartupHint")}
        commands={draft.preStartup}
        onCommandsChange={(commands) =>
          applyDraft({ ...draft, preStartup: commands })
        }
      />
      <CommandSection
        title={t("admin.config.flowStartup.postStartupTitle")}
        hint={t("admin.config.flowStartup.postStartupHint")}
        commands={draft.postStartup}
        onCommandsChange={(commands) =>
          applyDraft({ ...draft, postStartup: commands })
        }
      />
    </div>
  );
};
