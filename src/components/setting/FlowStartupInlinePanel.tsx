import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { GripVertical, Plus, Trash2, ArrowUp, ArrowDown, FolderOpen, Terminal, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { isRecord, ensureRecord } from "@/lib/configObject";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import type { TomlAdapter } from "./ExternalDependencyConfigModal";
import { useConfigDraftBinding } from "./useConfigDraftBinding";
import { useToastStore } from "@/stores/toast";
import { handleApiError } from "@/lib/api";

export type FlowStartupCommandStatus =
  | "exited"
  | "running"
  | "spawn_failed";

export interface FlowStartupCommandResult {
  index: number;
  command: string;
  status: FlowStartupCommandStatus;
  exit_code: number | null;
  stdout: string;
  stdout_truncated: boolean;
  stderr: string;
  stderr_truncated: boolean;
  error: string | null;
}

export interface FlowStartupExecutionResult {
  phase: string;
  commands: FlowStartupCommandResult[];
  total_duration_ms: number;
}

export type FlowStartupTestRunner = (payload: {
  tomlContent: string;
}) => Promise<FlowStartupExecutionResult>;

type StartupCommandDraft = {
  id: string;
  command: string;
  args: string[];
  work_dir: string;
};

type FlowStartupDraft = {
  preStartupWaitAfterSec: string;
  postStartupStartAfterSec: string;
  preStartup: StartupCommandDraft[];
  postStartup: StartupCommandDraft[];
};

type FlowStartupInlinePanelProps = {
  tomlAdapter: TomlAdapter;
  content: string;
  onContentChange: (value: string) => void;
  runtimeOs?: string | undefined;
  onTestPreStartup?: FlowStartupTestRunner | undefined;
  onTestPostStartup?: FlowStartupTestRunner | undefined;
};

const normalizeRuntimeOs = (runtimeOs?: string): string => {
  return runtimeOs?.trim().toLowerCase() ?? "";
};

const emptyCommand = (): StartupCommandDraft => ({
  id: createCommandId(),
  command: "",
  args: [],
  work_dir: "",
});

let commandDraftSequence = 0;

const createCommandId = (): string => {
  commandDraftSequence += 1;
  return `flow-startup-cmd-${commandDraftSequence}`;
};

const asNumberString = (value: unknown): string => {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? String(value)
    : "";
};

const parseNonNegativeInteger = (value: string): number | null => {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const parseCommandsFromToml = (section: Record<string, unknown>): StartupCommandDraft[] => {
  const commands = section["commands"];
  if (!Array.isArray(commands)) return [];
  return commands
    .filter(isRecord)
    .map((cmd) => ({
      id: createCommandId(),
      command: typeof cmd["command"] === "string" ? cmd["command"] : "",
      args: Array.isArray(cmd["args"])
        ? (cmd["args"] as unknown[]).filter((item): item is string => typeof item === "string")
        : [],
      work_dir: typeof cmd["work_dir"] === "string" ? cmd["work_dir"] : "",
    }));
};

const buildCommandsForToml = (commands: StartupCommandDraft[]): Record<string, unknown>[] => {
  return commands
    .filter((cmd) => cmd.command.trim().length > 0)
    .map((cmd) => {
      const obj: Record<string, unknown> = { command: cmd.command.trim() };
      const args = cmd.args
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      if (args.length > 0) {
        obj["args"] = args;
      }
      if (cmd.work_dir.trim().length > 0) {
        obj["work_dir"] = cmd.work_dir.trim();
      }
      return obj;
    });
};

const parseDraftFromContent = (source: string, tomlAdapter: TomlAdapter): FlowStartupDraft => {
  const parsed = tomlAdapter.parse(source);
  const root = isRecord(parsed) ? parsed : {};
  const extMgr = isRecord(root["extension_manager"]) ? root["extension_manager"] : {};
  const pre = isRecord(extMgr["pre_startup"]) ? extMgr["pre_startup"] : {};
  const post = isRecord(extMgr["post_startup"]) ? extMgr["post_startup"] : {};
  return {
    preStartupWaitAfterSec: asNumberString(pre["wait_after_sec"]),
    postStartupStartAfterSec: asNumberString(post["start_after_sec"]),
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
  extMgr["enabled"] = true;
  delete extMgr["tools"];
  const preSection = ensureRecord(extMgr, "pre_startup");
  const postSection = ensureRecord(extMgr, "post_startup");

  const preCommands = buildCommandsForToml(draft.preStartup);
  const postCommands = buildCommandsForToml(draft.postStartup);
  const preWaitAfterSec = parseNonNegativeInteger(draft.preStartupWaitAfterSec);
  const postStartAfterSec = parseNonNegativeInteger(draft.postStartupStartAfterSec);

  if (preCommands.length > 0) {
    preSection["commands"] = preCommands;
  } else {
    delete preSection["commands"];
  }
  if (preWaitAfterSec !== null) {
    preSection["wait_after_sec"] = preWaitAfterSec;
  } else {
    delete preSection["wait_after_sec"];
  }
  if (postCommands.length > 0) {
    postSection["commands"] = postCommands;
  } else {
    delete postSection["commands"];
  }
  if (postStartAfterSec !== null) {
    postSection["start_after_sec"] = postStartAfterSec;
  } else {
    delete postSection["start_after_sec"];
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
  const argsValue = cmd.args.join("\n");

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
          <div className="w-full">
            <textarea
              value={argsValue}
              onChange={(e) =>
                onChange({ args: e.target.value.split(/\r?\n/) })
              }
              placeholder={t("admin.config.flowStartup.argsPlaceholder")}
              className={cn(inputClass, "min-h-[84px] resize-y")}
            />
            <p className={cn("mt-1 text-[11px] leading-4", isDark ? "text-slate-500" : "text-slate-500")}>
              {t("admin.config.flowStartup.argsHint")}
            </p>
          </div>
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
  delayLabel: string;
  delayHint: string;
  delayPlaceholder: string;
  delayValue: string;
  onDelayChange: (value: string) => void;
  testing: boolean;
  onTest?: (() => void) | undefined;
  commands: StartupCommandDraft[];
  onCommandsChange: (commands: StartupCommandDraft[]) => void;
};

const CommandSection: React.FC<CommandSectionProps> = ({
  title,
  hint,
  delayLabel,
  delayHint,
  delayPlaceholder,
  delayValue,
  onDelayChange,
  testing,
  onTest,
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
      id: existing.id,
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

  const inputClass = cn(
    "mt-2 h-10 w-full rounded-xl border px-3 text-sm font-mono",
    isDark
      ? "border-white/10 bg-black/30 text-white placeholder:text-slate-500"
      : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400",
  );

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
        <div className="flex items-center gap-2">
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
          {onTest ? (
            <button
              type="button"
              onClick={onTest}
              disabled={testing}
              className={cn(
                "flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40",
                isDark
                  ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                  : "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20",
              )}
            >
              <Terminal size={14} />
              {testing
                ? t("admin.config.flowStartup.testingButton")
                : t("admin.config.flowStartup.testButton")}
            </button>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "rounded-xl border p-3",
          isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white",
        )}
      >
        <div className={cn("text-xs font-black uppercase tracking-wide", isDark ? "text-slate-400" : "text-slate-700")}>
          {delayLabel}
        </div>
        <p className={cn("mt-1 text-xs leading-5", isDark ? "text-slate-400" : "text-slate-600")}>
          {delayHint}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={delayValue}
            onChange={(event) => onDelayChange(event.target.value)}
            placeholder={delayPlaceholder}
            className={inputClass}
          />
          <span className={cn("text-xs font-semibold uppercase tracking-wide", isDark ? "text-slate-400" : "text-slate-500")}>
            {t("admin.config.flowStartup.secondsUnit")}
          </span>
        </div>
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
              key={cmd.id}
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
  runtimeOs,
  onTestPreStartup,
  onTestPostStartup,
}) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const { addToast } = useToastStore();
  const [testingPhase, setTestingPhase] = useState<"pre" | "post" | null>(null);
  const normalizedRuntimeOs = normalizeRuntimeOs(runtimeOs);
  const isMobileRuntime =
    normalizedRuntimeOs === "android" || normalizedRuntimeOs === "ios";
  const createDraft = useCallback(
    (source: string) => parseDraftFromContent(source, tomlAdapter),
    [tomlAdapter],
  );
  const buildDraftContent = useCallback(
    (source: string, nextDraft: FlowStartupDraft) => buildContent(source, tomlAdapter, nextDraft),
    [tomlAdapter],
  );
  const { draft, setDraft } = useConfigDraftBinding<FlowStartupDraft>({
    content,
    onContentChange,
    createDraft,
    buildContent: buildDraftContent,
  });

  const buildCurrentTomlContent = useCallback(() => {
    return buildContent(content, tomlAdapter, draft);
  }, [content, tomlAdapter, draft]);

  const getStatusLabel = useCallback(
    (status: FlowStartupCommandStatus) => {
      if (status === "running") {
        return t("admin.config.flowStartup.statusRunning");
      }
      if (status === "spawn_failed") {
        return t("admin.config.flowStartup.statusSpawnFailed");
      }
      return t("admin.config.flowStartup.statusExited");
    },
    [t],
  );

  const buildResultDetails = useCallback(
    (result: FlowStartupExecutionResult) => {
      const lines: string[] = [
        `${t("admin.config.flowStartup.testResultPhase")}: ${result.phase}`,
        `${t("admin.config.flowStartup.testResultDuration")}: ${result.total_duration_ms} ms`,
      ];

      if (result.commands.length === 0) {
        lines.push(t("admin.config.flowStartup.testNoCommands"));
        return lines.join("\n");
      }

      for (const item of result.commands) {
        lines.push("");
        lines.push(
          `${t("admin.config.flowStartup.testResultCommand")} #${item.index + 1}: ${item.command}`,
        );
        lines.push(
          `${t("admin.config.flowStartup.testResultStatus")}: ${getStatusLabel(item.status)}`,
        );
        lines.push(
          `${t("admin.config.flowStartup.testResultExitCode")}: ${item.exit_code ?? "null"}`,
        );
        if (item.error && item.error.trim().length > 0) {
          lines.push(`${t("admin.config.flowStartup.testResultError")}: ${item.error}`);
        }
        if (item.stdout.trim().length > 0) {
          lines.push(`${t("admin.config.flowStartup.testResultStdout")}:\n${item.stdout}`);
          if (item.stdout_truncated) {
            lines.push(t("admin.config.flowStartup.testResultStdoutTruncated"));
          }
        }
        if (item.stderr.trim().length > 0) {
          lines.push(`${t("admin.config.flowStartup.testResultStderr")}:\n${item.stderr}`);
          if (item.stderr_truncated) {
            lines.push(t("admin.config.flowStartup.testResultStderrTruncated"));
          }
        }
      }

      return lines.join("\n");
    },
    [getStatusLabel, t],
  );

  const runTest = useCallback(
    async (
      phase: "pre" | "post",
      runner: FlowStartupTestRunner | undefined,
      phaseLabel: string,
    ) => {
      if (!runner || testingPhase !== null) {
        return;
      }

      setTestingPhase(phase);
      try {
        const result = await runner({ tomlContent: buildCurrentTomlContent() });
        const failedCount = result.commands.filter(
          (item) =>
            item.status === "spawn_failed"
            || Boolean(item.error)
            || (item.status === "exited" && item.exit_code !== 0),
        ).length;
        const details = buildResultDetails(result);

        if (result.commands.length === 0) {
          await addToast(
            t("admin.config.flowStartup.testNoCommandsForPhase", {
              phase: phaseLabel,
            }),
            {
              type: "info",
              duration: "persistent",
              details,
            },
          );
          return;
        }

        if (failedCount === 0) {
          await addToast(
            t("admin.config.flowStartup.testAllPassed", {
              phase: phaseLabel,
              count: result.commands.length,
            }),
            {
              type: "success",
              duration: "persistent",
              details,
            },
          );
          return;
        }

        await addToast(
          t("admin.config.flowStartup.testSomeFailed", {
            phase: phaseLabel,
            failed: failedCount,
            total: result.commands.length,
          }),
          {
            type: "warning",
            duration: "persistent",
            details,
          },
        );
      } catch (error) {
        await addToast(
          t("admin.config.flowStartup.testRequestFailed", { phase: phaseLabel }),
          {
            type: "error",
            duration: "persistent",
            details: handleApiError(error, t),
          },
        );
      } finally {
        setTestingPhase(null);
      }
    },
    [addToast, buildCurrentTomlContent, buildResultDetails, t, testingPhase],
  );

  return (
    <div className="space-y-4">
      {isMobileRuntime ? (
        <div
          className={cn(
            "rounded-2xl border p-4 flex items-start gap-3",
            isDark
              ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
              : "border-amber-200 bg-amber-50 text-amber-900",
          )}
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div className="space-y-2">
            <p className="text-sm font-black">
              {t("admin.config.flowStartup.mobileDisabledTitle")}
            </p>
            <p className="text-sm leading-6">
              {t("admin.config.flowStartup.mobileDisabledBody")}
            </p>
          </div>
        </div>
      ) : null}
      {!isMobileRuntime ? (
        <>
      <div
        className={cn(
          "rounded-2xl border p-4",
          "border-amber-500/30 bg-amber-500/10",
        )}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
          <div className="space-y-2">
            <p className={cn("text-sm font-black", isDark ? "text-amber-200" : "text-amber-900")}>
              {t("admin.config.flowStartup.securityTitle")}
            </p>
            <p className={cn("text-xs leading-5", isDark ? "text-amber-100/80" : "text-amber-900/80")}>
              {t("admin.config.flowStartup.securityBody")}
            </p>
            <p className={cn("text-xs leading-5", isDark ? "text-amber-100/80" : "text-amber-900/80")}>
              {t("admin.config.flowStartup.testBehaviorHint")}
            </p>
          </div>
        </div>
      </div>
      <CommandSection
        title={t("admin.config.flowStartup.preStartupTitle")}
        hint={t("admin.config.flowStartup.preStartupHint")}
        delayLabel={t("admin.config.flowStartup.preStartupDelayLabel")}
        delayHint={t("admin.config.flowStartup.preStartupDelayHint")}
        delayPlaceholder={t("admin.config.flowStartup.preStartupDelayPlaceholder")}
        delayValue={draft.preStartupWaitAfterSec}
        onDelayChange={(value) =>
          setDraft((prev) => ({ ...prev, preStartupWaitAfterSec: value }))
        }
        testing={testingPhase === "pre"}
        onTest={
          onTestPreStartup
            ? () => {
                void runTest(
                  "pre",
                  onTestPreStartup,
                  t("admin.config.flowStartup.preStartupTitle"),
                );
              }
            : undefined
        }
        commands={draft.preStartup}
        onCommandsChange={(commands) => setDraft((prev) => ({ ...prev, preStartup: commands }))}
      />
      <CommandSection
        title={t("admin.config.flowStartup.postStartupTitle")}
        hint={t("admin.config.flowStartup.postStartupHint")}
        delayLabel={t("admin.config.flowStartup.postStartupDelayLabel")}
        delayHint={t("admin.config.flowStartup.postStartupDelayHint")}
        delayPlaceholder={t("admin.config.flowStartup.postStartupDelayPlaceholder")}
        delayValue={draft.postStartupStartAfterSec}
        onDelayChange={(value) =>
          setDraft((prev) => ({ ...prev, postStartupStartAfterSec: value }))
        }
        testing={testingPhase === "post"}
        onTest={
          onTestPostStartup
            ? () => {
                void runTest(
                  "post",
                  onTestPostStartup,
                  t("admin.config.flowStartup.postStartupTitle"),
                );
              }
            : undefined
        }
        commands={draft.postStartup}
        onCommandsChange={(commands) => setDraft((prev) => ({ ...prev, postStartup: commands }))}
      />
        </>
      ) : null}
    </div>
  );
};
