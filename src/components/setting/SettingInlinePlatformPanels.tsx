import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { cn } from "@/lib/utils";
import {
  ensureRecord,
  isRecord,
  type ConfigObject,
} from "@/lib/configObject";
import { SettingSegmentedControl } from "./SettingSegmentedControl";
import type { TomlAdapter } from "./ExternalDependencyConfigModal";
import { useConfigDraftBinding } from "./useConfigDraftBinding";

type BaseProps = {
  tomlAdapter: TomlAdapter;
  content: string;
  onContentChange: (value: string) => void;
};

type FrontendDraft = {
  jsdelivrMirrorBase: string;
  defaultLoginRoute: string;
};

type MemoryAllocatorDraft = {
  policy: "auto" | "system" | "mimalloc" | "jemalloc";
  profile: "auto" | "low_memory" | "balanced" | "throughput";
  backgroundThread: boolean;
  dirtyDecayMs: string;
  muzzyDecayMs: string;
  arenaMax: string;
  enableLargeOsPages: boolean;
  eagerCommit: boolean;
  purgeDelayMs: string;
};

type SystemBackupDraft = {
  localBackupDir: string;
  maxBackupSizeMb: string;
  tempDir: string;
  includeTables: string;
  configFiles: string;
  includeDirs: string;
  excludePatterns: string;
};

type ExtensionManagerV2Draft = {
  enabled: boolean;
  rootDir: string;
  tempDir: string;
  marketRequestTimeoutSec: string;
  allowSideload: boolean;
  enableWasmRuntime: boolean;
  enableProcessRuntime: boolean;
  enableDockerRuntime: boolean;
  dockerEngineCommand: string;
};

const asRecord = (value: unknown): ConfigObject => {
  return isRecord(value) ? value : {};
};

const toStringValue = (value: unknown, fallback: string): string => {
  return typeof value === "string" ? value : fallback;
};

const toBooleanValue = (value: unknown, fallback: boolean): boolean => {
  return typeof value === "boolean" ? value : fallback;
};

const toNumberString = (value: unknown, fallback: string): string => {
  return typeof value === "number" ? String(value) : fallback;
};

const sanitizeUnsignedIntegerInput = (value: string): string => {
  return value.replace(/[^0-9]/g, "");
};

const listToEditorValue = (value: unknown): string => {
  if (!Array.isArray(value)) {
    return "";
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .join("\n");
};

const editorValueToList = (value: string): string[] => {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const SectionCard: React.FC<{
  title: string;
  isDark: boolean;
  children: React.ReactNode;
}> = ({ title, isDark, children }) => {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 space-y-3",
        isDark
          ? "border-white/10 bg-white/[0.03]"
          : "border-slate-200 bg-white",
      )}
    >
      <div className="text-sm font-black">{title}</div>
      {children}
    </div>
  );
};

const FieldLabel: React.FC<{
  isDark: boolean;
  children: React.ReactNode;
}> = ({ isDark, children }) => {
  return (
    <div
      className={cn(
        "text-xs font-black tracking-wide",
        isDark ? "text-slate-400" : "text-slate-700",
      )}
    >
      {children}
    </div>
  );
};

const BooleanCard = <T extends string>({
  isDark,
  title,
  value,
  options,
  onChange,
}: {
  isDark: boolean;
  title: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) => {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-3",
        isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-slate-50",
      )}
    >
      <FieldLabel isDark={isDark}>{title}</FieldLabel>
      <SettingSegmentedControl
        value={value}
        options={options}
        onChange={onChange}
        className="mt-3"
      />
    </div>
  );
};

export const FrontendInlinePanel: React.FC<BaseProps> = ({
  tomlAdapter,
  content,
  onContentChange,
}) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const inputClass = cn(
    "mt-1 h-11 w-full rounded-xl border px-3 text-sm font-mono",
    isDark
      ? "border-white/10 bg-black/30 text-white"
      : "border-slate-300 bg-white text-slate-900",
  );
  const createDraft = useCallback(
    (source: string): FrontendDraft => {
      const parsed = tomlAdapter.parse(source);
      const frontend = asRecord(asRecord(parsed)["frontend"]);
      return {
        jsdelivrMirrorBase: toStringValue(
          frontend["jsdelivr_mirror_base"],
          "https://cdn.jsdelivr.net",
        ),
        defaultLoginRoute: toStringValue(
          frontend["default_login_route"],
          "mod=file-manager&page=files",
        ),
      };
    },
    [tomlAdapter],
  );
  const buildContent = useCallback(
    (source: string, draft: FrontendDraft) => {
      const parsed = tomlAdapter.parse(source);
      const root: ConfigObject = isRecord(parsed) ? parsed : {};
      const frontend = ensureRecord(root, "frontend");
      frontend["jsdelivr_mirror_base"] =
        draft.jsdelivrMirrorBase.trim() || "https://cdn.jsdelivr.net";
      frontend["default_login_route"] =
        draft.defaultLoginRoute.trim() || "mod=file-manager&page=files";
      return tomlAdapter.stringify(root);
    },
    [tomlAdapter],
  );
  const { draft, setDraft } = useConfigDraftBinding<FrontendDraft>({
    content,
    onContentChange,
    createDraft,
    buildContent,
  });

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SectionCard
        title={t("admin.config.advancedPanels.frontend.title")}
        isDark={isDark}
      >
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.frontend.jsdelivrMirrorBase")}
          </FieldLabel>
          <input
            className={inputClass}
            value={draft.jsdelivrMirrorBase}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                jsdelivrMirrorBase: event.target.value,
              }))
            }
          />
        </div>
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.frontend.defaultLoginRoute")}
          </FieldLabel>
          <input
            className={inputClass}
            value={draft.defaultLoginRoute}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                defaultLoginRoute: event.target.value,
              }))
            }
          />
          <div
            className={cn(
              "mt-2 text-xs leading-5",
              isDark ? "text-slate-400" : "text-slate-500",
            )}
          >
            {t("admin.config.advancedPanels.frontend.defaultLoginRouteHint")}
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

export const MemoryAllocatorInlinePanel: React.FC<BaseProps> = ({
  tomlAdapter,
  content,
  onContentChange,
}) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const inputClass = cn(
    "mt-1 h-11 w-full rounded-xl border px-3 text-sm font-mono",
    isDark
      ? "border-white/10 bg-black/30 text-white"
      : "border-slate-300 bg-white text-slate-900",
  );
  const booleanOptions = [
    { value: "enabled", label: t("common.enabled") },
    { value: "disabled", label: t("common.disabled") },
  ] as const;
  const createDraft = useCallback(
    (source: string): MemoryAllocatorDraft => {
      const parsed = tomlAdapter.parse(source);
      const allocator = asRecord(asRecord(parsed)["memory_allocator"]);
      const rawPolicy = toStringValue(allocator["policy"], "auto").toLowerCase();
      const rawProfile = toStringValue(allocator["profile"], "balanced").toLowerCase();
      return {
        policy:
          rawPolicy === "system" || rawPolicy === "mimalloc" || rawPolicy === "jemalloc"
            ? rawPolicy
            : "auto",
        profile:
          rawProfile === "auto" ||
          rawProfile === "low_memory" ||
          rawProfile === "throughput"
            ? rawProfile
            : "balanced",
        backgroundThread: toBooleanValue(allocator["background_thread"], true),
        dirtyDecayMs: toNumberString(allocator["dirty_decay_ms"], "5000"),
        muzzyDecayMs: toNumberString(allocator["muzzy_decay_ms"], "10000"),
        arenaMax: toNumberString(allocator["arena_max"], "4"),
        enableLargeOsPages: toBooleanValue(
          allocator["enable_large_os_pages"],
          false,
        ),
        eagerCommit: toBooleanValue(allocator["eager_commit"], false),
        purgeDelayMs: toNumberString(allocator["purge_delay_ms"], "10"),
      };
    },
    [tomlAdapter],
  );
  const buildContent = useCallback(
    (source: string, draft: MemoryAllocatorDraft) => {
      const parsed = tomlAdapter.parse(source);
      const root: ConfigObject = isRecord(parsed) ? parsed : {};
      const allocator = ensureRecord(root, "memory_allocator");
      allocator["policy"] = draft.policy;
      allocator["profile"] = draft.profile;
      allocator["background_thread"] = draft.backgroundThread;
      allocator["dirty_decay_ms"] =
        Number.parseInt(draft.dirtyDecayMs, 10) || 5000;
      allocator["muzzy_decay_ms"] =
        Number.parseInt(draft.muzzyDecayMs, 10) || 10000;
      allocator["arena_max"] = Number.parseInt(draft.arenaMax, 10) || 4;
      allocator["enable_large_os_pages"] = draft.enableLargeOsPages;
      allocator["eager_commit"] = draft.eagerCommit;
      allocator["purge_delay_ms"] =
        Number.parseInt(draft.purgeDelayMs, 10) || 10;
      return tomlAdapter.stringify(root);
    },
    [tomlAdapter],
  );
  const { draft, setDraft } = useConfigDraftBinding<MemoryAllocatorDraft>({
    content,
    onContentChange,
    createDraft,
    buildContent,
  });
  const allocatorFields: Array<{
    key: "dirtyDecayMs" | "muzzyDecayMs" | "arenaMax" | "purgeDelayMs";
    value: string;
    label: string;
  }> = [
    {
      key: "dirtyDecayMs",
      value: draft.dirtyDecayMs,
      label: t("admin.config.advancedPanels.memoryAllocator.dirtyDecayMs"),
    },
    {
      key: "muzzyDecayMs",
      value: draft.muzzyDecayMs,
      label: t("admin.config.advancedPanels.memoryAllocator.muzzyDecayMs"),
    },
    {
      key: "arenaMax",
      value: draft.arenaMax,
      label: t("admin.config.advancedPanels.memoryAllocator.arenaMax"),
    },
    {
      key: "purgeDelayMs",
      value: draft.purgeDelayMs,
      label: t("admin.config.advancedPanels.memoryAllocator.purgeDelayMs"),
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SectionCard
        title={t("admin.config.advancedPanels.memoryAllocator.title")}
        isDark={isDark}
      >
        <BooleanCard
          isDark={isDark}
          title={t("admin.config.advancedPanels.memoryAllocator.policy")}
          value={draft.policy}
          options={[
            { value: "auto", label: t("admin.config.advancedPanels.memoryAllocator.policies.auto") },
            { value: "system", label: t("admin.config.advancedPanels.memoryAllocator.policies.system") },
            { value: "mimalloc", label: t("admin.config.advancedPanels.memoryAllocator.policies.mimalloc") },
            { value: "jemalloc", label: t("admin.config.advancedPanels.memoryAllocator.policies.jemalloc") },
          ]}
          onChange={(value) =>
            setDraft((prev) => ({ ...prev, policy: value }))
          }
        />
        <BooleanCard
          isDark={isDark}
          title={t("admin.config.advancedPanels.memoryAllocator.profile")}
          value={draft.profile}
          options={[
            { value: "auto", label: t("admin.config.advancedPanels.memoryAllocator.profiles.auto") },
            { value: "low_memory", label: t("admin.config.advancedPanels.memoryAllocator.profiles.lowMemory") },
            { value: "balanced", label: t("admin.config.advancedPanels.memoryAllocator.profiles.balanced") },
            { value: "throughput", label: t("admin.config.advancedPanels.memoryAllocator.profiles.throughput") },
          ]}
          onChange={(value) =>
            setDraft((prev) => ({ ...prev, profile: value }))
          }
        />
      </SectionCard>
      <SectionCard
        title={t("admin.config.advancedPanels.memoryAllocator.jemallocAndMimalloc")}
        isDark={isDark}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {allocatorFields.map((field) => (
            <div key={field.key}>
              <FieldLabel isDark={isDark}>{field.label}</FieldLabel>
              <input
                className={inputClass}
                value={field.value}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    [field.key]: sanitizeUnsignedIntegerInput(event.target.value),
                  }) as MemoryAllocatorDraft)
                }
              />
            </div>
          ))}
        </div>
        <BooleanCard
          isDark={isDark}
          title={t("admin.config.advancedPanels.memoryAllocator.backgroundThread")}
          value={draft.backgroundThread ? "enabled" : "disabled"}
          options={[...booleanOptions]}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              backgroundThread: value === "enabled",
            }))
          }
        />
        <BooleanCard
          isDark={isDark}
          title={t("admin.config.advancedPanels.memoryAllocator.enableLargeOsPages")}
          value={draft.enableLargeOsPages ? "enabled" : "disabled"}
          options={[...booleanOptions]}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              enableLargeOsPages: value === "enabled",
            }))
          }
        />
        <BooleanCard
          isDark={isDark}
          title={t("admin.config.advancedPanels.memoryAllocator.eagerCommit")}
          value={draft.eagerCommit ? "enabled" : "disabled"}
          options={[...booleanOptions]}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              eagerCommit: value === "enabled",
            }))
          }
        />
      </SectionCard>
    </div>
  );
};

export const SystemBackupInlinePanel: React.FC<BaseProps> = ({
  tomlAdapter,
  content,
  onContentChange,
}) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const inputClass = cn(
    "mt-1 h-11 w-full rounded-xl border px-3 text-sm font-mono",
    isDark
      ? "border-white/10 bg-black/30 text-white"
      : "border-slate-300 bg-white text-slate-900",
  );
  const textareaClass = cn(
    "mt-1 min-h-28 w-full rounded-xl border px-3 py-3 text-sm font-mono",
    isDark
      ? "border-white/10 bg-black/30 text-white"
      : "border-slate-300 bg-white text-slate-900",
  );
  const createDraft = useCallback(
    (source: string): SystemBackupDraft => {
      const parsed = tomlAdapter.parse(source);
      const backup = asRecord(asRecord(parsed)["system_backup"]);
      return {
        localBackupDir: toStringValue(
          backup["local_backup_dir"],
          "{RUNTIMEDIR}/backups",
        ),
        maxBackupSizeMb: toNumberString(backup["max_backup_size_mb"], "1024"),
        tempDir: toStringValue(backup["temp_dir"], "{TEMPDIR}/backup"),
        includeTables: listToEditorValue(backup["include_tables"]),
        configFiles: listToEditorValue(backup["config_files"]),
        includeDirs: listToEditorValue(backup["include_dirs"]),
        excludePatterns: listToEditorValue(backup["exclude_patterns"]),
      };
    },
    [tomlAdapter],
  );
  const buildContent = useCallback(
    (source: string, draft: SystemBackupDraft) => {
      const parsed = tomlAdapter.parse(source);
      const root: ConfigObject = isRecord(parsed) ? parsed : {};
      const backup = ensureRecord(root, "system_backup");
      backup["local_backup_dir"] =
        draft.localBackupDir.trim() || "{RUNTIMEDIR}/backups";
      backup["max_backup_size_mb"] =
        Number.parseInt(draft.maxBackupSizeMb, 10) || 1024;
      backup["temp_dir"] = draft.tempDir.trim() || "{TEMPDIR}/backup";
      backup["include_tables"] = editorValueToList(draft.includeTables);
      backup["config_files"] = editorValueToList(draft.configFiles);
      backup["include_dirs"] = editorValueToList(draft.includeDirs);
      backup["exclude_patterns"] = editorValueToList(draft.excludePatterns);
      return tomlAdapter.stringify(root);
    },
    [tomlAdapter],
  );
  const { draft, setDraft } = useConfigDraftBinding<SystemBackupDraft>({
    content,
    onContentChange,
    createDraft,
    buildContent,
  });
  const backupListFields: Array<{
    key: "includeTables" | "configFiles" | "includeDirs" | "excludePatterns";
    value: string;
    label: string;
  }> = [
    {
      key: "includeTables",
      value: draft.includeTables,
      label: t("admin.config.advancedPanels.systemBackup.includeTables"),
    },
    {
      key: "configFiles",
      value: draft.configFiles,
      label: t("admin.config.advancedPanels.systemBackup.configFiles"),
    },
    {
      key: "includeDirs",
      value: draft.includeDirs,
      label: t("admin.config.advancedPanels.systemBackup.includeDirs"),
    },
    {
      key: "excludePatterns",
      value: draft.excludePatterns,
      label: t("admin.config.advancedPanels.systemBackup.excludePatterns"),
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SectionCard
        title={t("admin.config.advancedPanels.systemBackup.title")}
        isDark={isDark}
      >
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.systemBackup.localBackupDir")}
          </FieldLabel>
          <input
            className={inputClass}
            value={draft.localBackupDir}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                localBackupDir: event.target.value,
              }))
            }
          />
        </div>
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.systemBackup.maxBackupSizeMb")}
          </FieldLabel>
          <input
            className={inputClass}
            value={draft.maxBackupSizeMb}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                maxBackupSizeMb: sanitizeUnsignedIntegerInput(event.target.value),
              }))
            }
          />
        </div>
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.systemBackup.tempDir")}
          </FieldLabel>
          <input
            className={inputClass}
            value={draft.tempDir}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, tempDir: event.target.value }))
            }
          />
        </div>
      </SectionCard>
      <SectionCard
        title={t("admin.config.advancedPanels.systemBackup.selectionLists")}
        isDark={isDark}
      >
        {backupListFields.map((field) => (
          <div key={field.key}>
            <FieldLabel isDark={isDark}>{field.label}</FieldLabel>
            <textarea
              className={textareaClass}
              value={field.value}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  [field.key]: event.target.value,
                }) as SystemBackupDraft)
              }
            />
          </div>
        ))}
      </SectionCard>
    </div>
  );
};

export const ExtensionManagerV2InlinePanel: React.FC<BaseProps> = ({
  tomlAdapter,
  content,
  onContentChange,
}) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const inputClass = cn(
    "mt-1 h-11 w-full rounded-xl border px-3 text-sm font-mono",
    isDark
      ? "border-white/10 bg-black/30 text-white"
      : "border-slate-300 bg-white text-slate-900",
  );
  const booleanOptions = [
    { value: "enabled", label: t("common.enabled") },
    { value: "disabled", label: t("common.disabled") },
  ] as const;
  const createDraft = useCallback(
    (source: string): ExtensionManagerV2Draft => {
      const parsed = tomlAdapter.parse(source);
      const ext = asRecord(asRecord(parsed)["extension_manager_v2"]);
      return {
        enabled: toBooleanValue(ext["enabled"], false),
        rootDir: toStringValue(ext["root_dir"], "{RUNTIMEDIR}/plugins"),
        tempDir: toStringValue(ext["temp_dir"], "{TEMPDIR}/extension"),
        marketRequestTimeoutSec: toNumberString(
          ext["market_request_timeout_sec"],
          "30",
        ),
        allowSideload: toBooleanValue(ext["allow_sideload"], true),
        enableWasmRuntime: toBooleanValue(ext["enable_wasm_runtime"], true),
        enableProcessRuntime: toBooleanValue(ext["enable_process_runtime"], true),
        enableDockerRuntime: toBooleanValue(ext["enable_docker_runtime"], false),
        dockerEngineCommand: toStringValue(ext["docker_engine_command"], "docker"),
      };
    },
    [tomlAdapter],
  );
  const buildContent = useCallback(
    (source: string, draft: ExtensionManagerV2Draft) => {
      const parsed = tomlAdapter.parse(source);
      const root: ConfigObject = isRecord(parsed) ? parsed : {};
      const ext = ensureRecord(root, "extension_manager_v2");
      ext["enabled"] = draft.enabled;
      ext["root_dir"] = draft.rootDir.trim() || "{RUNTIMEDIR}/plugins";
      ext["temp_dir"] = draft.tempDir.trim() || "{TEMPDIR}/extension";
      ext["market_request_timeout_sec"] =
        Number.parseInt(draft.marketRequestTimeoutSec, 10) || 30;
      ext["allow_sideload"] = draft.allowSideload;
      ext["enable_wasm_runtime"] = draft.enableWasmRuntime;
      ext["enable_process_runtime"] = draft.enableProcessRuntime;
      ext["enable_docker_runtime"] = draft.enableDockerRuntime;
      ext["docker_engine_command"] = draft.dockerEngineCommand.trim() || "docker";
      return tomlAdapter.stringify(root);
    },
    [tomlAdapter],
  );
  const { draft, setDraft } = useConfigDraftBinding<ExtensionManagerV2Draft>({
    content,
    onContentChange,
    createDraft,
    buildContent,
  });

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SectionCard
        title={t("admin.config.advancedPanels.extensionManagerV2.title")}
        isDark={isDark}
      >
        <BooleanCard
          isDark={isDark}
          title={t("admin.config.advancedPanels.extensionManagerV2.enabled")}
          value={draft.enabled ? "enabled" : "disabled"}
          options={[...booleanOptions]}
          onChange={(value) =>
            setDraft((prev) => ({ ...prev, enabled: value === "enabled" }))
          }
        />
        <BooleanCard
          isDark={isDark}
          title={t("admin.config.advancedPanels.extensionManagerV2.allowSideload")}
          value={draft.allowSideload ? "enabled" : "disabled"}
          options={[...booleanOptions]}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              allowSideload: value === "enabled",
            }))
          }
        />
        <BooleanCard
          isDark={isDark}
          title={t("admin.config.advancedPanels.extensionManagerV2.enableWasmRuntime")}
          value={draft.enableWasmRuntime ? "enabled" : "disabled"}
          options={[...booleanOptions]}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              enableWasmRuntime: value === "enabled",
            }))
          }
        />
        <BooleanCard
          isDark={isDark}
          title={t("admin.config.advancedPanels.extensionManagerV2.enableProcessRuntime")}
          value={draft.enableProcessRuntime ? "enabled" : "disabled"}
          options={[...booleanOptions]}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              enableProcessRuntime: value === "enabled",
            }))
          }
        />
        <BooleanCard
          isDark={isDark}
          title={t("admin.config.advancedPanels.extensionManagerV2.enableDockerRuntime")}
          value={draft.enableDockerRuntime ? "enabled" : "disabled"}
          options={[...booleanOptions]}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              enableDockerRuntime: value === "enabled",
            }))
          }
        />
      </SectionCard>
      <SectionCard
        title={t("admin.config.advancedPanels.extensionManagerV2.pathsAndTimeouts")}
        isDark={isDark}
      >
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.extensionManagerV2.rootDir")}
          </FieldLabel>
          <input
            className={inputClass}
            value={draft.rootDir}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, rootDir: event.target.value }))
            }
          />
        </div>
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.extensionManagerV2.tempDir")}
          </FieldLabel>
          <input
            className={inputClass}
            value={draft.tempDir}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, tempDir: event.target.value }))
            }
          />
        </div>
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.extensionManagerV2.marketRequestTimeoutSec")}
          </FieldLabel>
          <input
            className={inputClass}
            value={draft.marketRequestTimeoutSec}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                marketRequestTimeoutSec: sanitizeUnsignedIntegerInput(
                  event.target.value,
                ),
              }))
            }
          />
        </div>
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.extensionManagerV2.dockerEngineCommand")}
          </FieldLabel>
          <input
            className={inputClass}
            value={draft.dockerEngineCommand}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                dockerEngineCommand: event.target.value,
              }))
            }
          />
        </div>
      </SectionCard>
    </div>
  );
};
