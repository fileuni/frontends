import React, { useCallback, useMemo, useState } from "react";
import { Boxes, Check, PenLine, Sparkles, X as XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { useEscapeToCloseTopLayer } from "@/hooks/useEscapeToCloseTopLayer";
import { PasswordInput } from "@/components/common/PasswordInput";
import {
  deepClone,
  ensureRecord,
  isRecord,
  type ConfigObject,
} from "@/lib/configObject";
import type { TomlAdapter } from "./ExternalDependencyConfigModal";
import { PerformanceProfilePickerModal } from "./PerformanceProfilePickerModal";
import { useConfigDraftBinding } from "./useConfigDraftBinding";
import {
  applyPerformanceTemplateToDraft,
  applyDraftToConfig,
  buildDraftFromConfig,
  buildPostgresDsn,
  buildRedisUrl,
  buildSqliteDsn,
  defaultDraft,
  getPresetByTier,
  parseConfig,
  parsePerformanceTemplateId,
  parsePostgresDsn,
  parseRedisUrl,
  resolveEffectivePreset,
  recommendedAllocatorPolicyForRuntime,
  type DatabaseType,
  type FriendlyDraft,
  type PerformanceTier,
  type SystemHardwareInfo,
} from "./ConfigQuickSettingsModal";

interface BaseProps {
  tomlAdapter: TomlAdapter;
  content: string;
  onContentChange: (value: string) => void;
  runtimeOs?: string | undefined;
  systemHardware?: SystemHardwareInfo | null | undefined;
}

interface DatabasePanelProps extends BaseProps {
  onTestDatabase?: ((payload: {
    databaseType: DatabaseType;
    connectionString: string;
  }) => Promise<void>) | undefined;
}

interface CachePanelProps extends BaseProps {
  onTestCache?: ((payload: {
    cacheType: string;
    connectionString: string;
  }) => Promise<void>) | undefined;
}

const tierOptions: Array<{
  value: PerformanceTier;
  labelKey: string;
  descKey: string;
}> = [
  {
    value: "constrained",
    labelKey: "admin.config.quickSettings.performance.tiers.constrained",
    descKey: "admin.config.quickSettings.performance.descriptions.constrained",
  },
  {
    value: "lightweight",
    labelKey: "admin.config.quickSettings.performance.tiers.lightweight",
    descKey: "admin.config.quickSettings.performance.descriptions.lightweight",
  },
  {
    value: "performance",
    labelKey: "admin.config.quickSettings.performance.tiers.performance",
    descKey: "admin.config.quickSettings.performance.descriptions.performance",
  },
];

type FeatureToggleKey =
  | "compression"
  | "sftp"
  | "ftp"
  | "s3"
  | "chat"
  | "email"
  | "webdav"
  | "bloomWarmup";

type FeatureToggleState = Record<FeatureToggleKey, boolean>;
type PreviewEntry = { label: string; path: string; value: string };
type ConfigItem = { path: string; value: unknown };

const featureToggleOrder: FeatureToggleKey[] = [
  "compression",
  "sftp",
  "ftp",
  "s3",
  "chat",
  "email",
  "webdav",
  "bloomWarmup",
];

const asRecord = (value: unknown): ConfigObject => {
  return isRecord(value) ? value : {};
};

const displayValue = (value: unknown): string => {
  return value === null || typeof value === "undefined" ? "-" : String(value);
};

const applyNestedConfigValue = (
  target: ConfigObject,
  keys: string[],
  rawValue: string,
): void => {
  let current = target;
  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index];
    if (!key || key === "*") {
      continue;
    }
    current = ensureRecord(current, key);
  }

  const lastKey = keys[keys.length - 1];
  if (!lastKey || lastKey === "*") {
    return;
  }

  const numericValue = Number(rawValue);
  current[lastKey] = Number.isNaN(numericValue) ? rawValue : numericValue;
};

const flattenConfigValues = (
  source: unknown,
  prefix: string,
  result: Map<string, string>,
): void => {
  if (!isRecord(source)) {
    return;
  }

  for (const [key, value] of Object.entries(source)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (isRecord(value)) {
      flattenConfigValues(value, fullPath, result);
      continue;
    }
    result.set(fullPath, String(value));
  }
};

const deriveFeatureToggleState = (draft: FriendlyDraft): FeatureToggleState => {
  const preset = getPresetByTier(draft.performanceTier);
  if (!preset) {
    return {
      compression: false,
      sftp: false,
      ftp: false,
      s3: false,
      chat: false,
      email: false,
      webdav: true,
      bloomWarmup: false,
    };
  }
  return resolveEffectivePreset(draft, preset).features;
};

const readFeatureToggleStateFromConfig = (
  config: ConfigObject | null | undefined,
  fallback: FeatureToggleState,
): FeatureToggleState => {
  const source: ConfigObject = config ?? {};
  const vfs = asRecord(source.vfs_storage_hub);
  const fileCompress = asRecord(vfs.file_compress);
  const taskRegistry = asRecord(source.task_registry);
  const bloomFilterWarmup = asRecord(taskRegistry.bloom_filter_warmup);
  const chatManager = asRecord(source.chat_manager);
  const emailManager = asRecord(source.email_manager);

  return {
    compression:
      typeof fileCompress.enable === "boolean"
        ? fileCompress.enable
        : fallback.compression,
    sftp:
      typeof vfs.enable_sftp === "boolean" ? vfs.enable_sftp : fallback.sftp,
    ftp: typeof vfs.enable_ftp === "boolean" ? vfs.enable_ftp : fallback.ftp,
    s3: typeof vfs.enable_s3 === "boolean" ? vfs.enable_s3 : fallback.s3,
    chat:
      typeof chatManager.enabled === "boolean"
        ? chatManager.enabled
        : fallback.chat,
    email:
      typeof emailManager.enabled === "boolean"
        ? emailManager.enabled
        : fallback.email,
    webdav:
      typeof vfs.enable_webdav === "boolean"
        ? vfs.enable_webdav
        : fallback.webdav,
    bloomWarmup:
      typeof bloomFilterWarmup.enabled === "boolean"
        ? bloomFilterWarmup.enabled
        : fallback.bloomWarmup,
  };
};

const applyFeatureToggleStateToConfig = (
  config: ConfigObject,
  toggles: FeatureToggleState,
  draft: FriendlyDraft,
): ConfigObject => {
  const next = config;
  const vfs = ensureRecord(next, "vfs_storage_hub");
  const fileCompress = ensureRecord(vfs, "file_compress");
  const taskRegistry = ensureRecord(next, "task_registry");
  const bloomFilterWarmup = ensureRecord(taskRegistry, "bloom_filter_warmup");
  const chatManager = ensureRecord(next, "chat_manager");
  const emailManager = ensureRecord(next, "email_manager");
  const sftpServ = ensureRecord(next, "file_manager_serv_sftp");
  const ftpServ = ensureRecord(next, "file_manager_serv_ftp");
  const s3Serv = ensureRecord(next, "file_manager_serv_s3");

  vfs.enable_webdav = toggles.webdav;
  vfs.enable_sftp = toggles.sftp;
  vfs.enable_ftp = toggles.ftp;
  vfs.enable_s3 = toggles.s3;
  fileCompress.enable = toggles.compression;
  bloomFilterWarmup.enabled = toggles.bloomWarmup;
  chatManager.enabled = toggles.chat;
  emailManager.enabled = toggles.email;

  if (!toggles.sftp) {
    sftpServ.max_connections = 1;
    sftpServ.worker_threads = 1;
  } else if (
    typeof sftpServ.max_connections !== "number" ||
    sftpServ.max_connections <= 1
  ) {
    sftpServ.max_connections =
      draft.performanceTier === "performance" ? 100 : 20;
    sftpServ.worker_threads = draft.performanceTier === "performance" ? 4 : 2;
  }

  if (!toggles.ftp) {
    ftpServ.max_connections = 1;
  } else if (
    typeof ftpServ.max_connections !== "number" ||
    ftpServ.max_connections <= 1
  ) {
    ftpServ.max_connections =
      draft.performanceTier === "performance" ? 100 : 20;
  }

  if (!toggles.s3) {
    s3Serv.max_connections = 1;
  } else if (
    typeof s3Serv.max_connections !== "number" ||
    s3Serv.max_connections <= 1
  ) {
    s3Serv.max_connections = draft.performanceTier === "performance" ? 100 : 20;
  }

  return next;
};

const useDraft = ({
  tomlAdapter,
  content,
  runtimeOs,
  systemHardware,
}: Pick<
  BaseProps,
  "tomlAdapter" | "content" | "runtimeOs" | "systemHardware"
>) => {
  const fallbackPolicy = recommendedAllocatorPolicyForRuntime(runtimeOs);
  const parsed = useMemo(
    () => parseConfig(content, tomlAdapter.parse),
    [content, tomlAdapter],
  );
  const suggestedTemplate = useMemo(
    () =>
      parsePerformanceTemplateId(
        systemHardware?.suggested_performance_template,
      ),
    [systemHardware?.suggested_performance_template],
  );
  const draft = useMemo(
    () =>
      parsed.value
        ? buildDraftFromConfig(parsed.value, fallbackPolicy, suggestedTemplate)
        : { ...defaultDraft, allocatorPolicy: fallbackPolicy },
    [fallbackPolicy, parsed.value, suggestedTemplate],
  );
  return { fallbackPolicy, parsed, draft };
};

const buildFriendlyDraftFromContent = (
  content: string,
  tomlAdapter: TomlAdapter,
  fallbackPolicy: FriendlyDraft["allocatorPolicy"],
  suggestedTemplate?: ReturnType<typeof parsePerformanceTemplateId>,
): FriendlyDraft => {
  const parsed = parseConfig(content, tomlAdapter.parse);
  return parsed.value
    ? buildDraftFromConfig(parsed.value, fallbackPolicy, suggestedTemplate)
    : { ...defaultDraft, allocatorPolicy: fallbackPolicy };
};

export const PerformanceInlinePanel: React.FC<BaseProps> = ({
  tomlAdapter,
  content,
  onContentChange,
  runtimeOs,
  systemHardware,
}) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const { fallbackPolicy, parsed } = useDraft({
    tomlAdapter,
    content,
    runtimeOs,
    systemHardware,
  });

  const suggestedTemplate = parsePerformanceTemplateId(
    systemHardware?.suggested_performance_template,
  );

  const currentFeatureToggles = useMemo(
    () =>
      readFeatureToggleStateFromConfig(parsed.value, {
        compression: false,
        sftp: false,
        ftp: false,
        s3: false,
        chat: false,
        email: false,
        webdav: true,
        bloomWarmup: false,
      }),
    [parsed.value],
  );

  const [selectedTier, setSelectedTier] = useState<PerformanceTier | null>(
    null,
  );
  const [isPerformanceProfilePickerOpen, setIsPerformanceProfilePickerOpen] =
    useState(false);
  const [selectedLoadProfile, setSelectedLoadProfile] = useState<
    "low-concurrency" | "high-concurrency"
  >("low-concurrency");
  const [showAllImpacts, setShowAllImpacts] = useState(false);

  const toggleFeature = (key: FeatureToggleKey, enabled: boolean) => {
    if (!parsed.value) return;
    const next = applyFeatureToggleStateToConfig(
      deepClone(parsed.value),
      { ...currentFeatureToggles, [key]: enabled },
      {
        performanceTier: selectedTier ?? "lightweight",
        loadProfile: selectedLoadProfile,
      } as FriendlyDraft,
    );
    onContentChange(tomlAdapter.stringify(next));
  };

  const applyTemplate = () => {
    if (!parsed.value || !selectedTier) return;
    const templateId =
      selectedTier === "performance"
        ? selectedLoadProfile === "high-concurrency"
          ? "performance-high-concurrency"
          : "performance-low-concurrency"
        : selectedTier;
    const templateDraft = applyPerformanceTemplateToDraft(
      parsed.value
        ? buildDraftFromConfig(parsed.value, fallbackPolicy)
        : defaultDraft,
      templateId,
    );
    templateDraft.allocatorPolicy = fallbackPolicy;
    const next = applyDraftToConfig(
      parsed.value,
      templateDraft,
      fallbackPolicy,
    );
    const featureToggles = deriveFeatureToggleState(templateDraft);
    const withFeatures = applyFeatureToggleStateToConfig(
      next as ConfigObject,
      featureToggles,
      templateDraft,
    );
    onContentChange(tomlAdapter.stringify(withFeatures));
    setSelectedTier(null);
  };

  type SummaryEntry = {
    label: string;
    path: string;
    currentValue: string;
    templateValue: string | null;
  };

  const extractSummaryFromConfig = useMemo(
    () =>
      (cfg: ConfigObject | null | undefined): PreviewEntry[] => {
        const source: ConfigObject = cfg ?? {};
        const db = asRecord(source.database);
        const sqliteConfig = asRecord(db.sqlite_config);
        const postgresConfig = asRecord(db.postgres_config);
        const kv = asRecord(source.fast_kv_storage_hub);
        const middleware = asRecord(source.middleware);
        const bruteForce = asRecord(middleware.brute_force);
        const captcha = asRecord(source.captcha_code);
        const sftpServ = asRecord(source.file_manager_serv_sftp);
        const ftpServ = asRecord(source.file_manager_serv_ftp);
        const s3Serv = asRecord(source.file_manager_serv_s3);
        return [
          {
            label: t("admin.config.quickSettings.performance.preview.dbPool"),
            path: "database.*.max_connections",
            value: `${displayValue(sqliteConfig.max_connections ?? postgresConfig.max_connections)} / ${displayValue(sqliteConfig.min_connections ?? postgresConfig.min_connections)}`,
          },
          {
            label: t(
              "admin.config.quickSettings.performance.preview.cacheMemory",
            ),
            path: "fast_kv_storage_hub.dashmap_mem_max_bytes",
            value: `${Math.round(Number(kv.dashmap_mem_max_bytes ?? 0) / 1024 / 1024 || 0)} MB`,
          },
          {
            label: t(
              "admin.config.quickSettings.performance.preview.bruteForceLockout",
            ),
            path: "middleware.brute_force.lockout_secs",
            value: displayValue(bruteForce.lockout_secs),
          },
          {
            label: t(
              "admin.config.quickSettings.performance.preview.captchaPreheatPool",
            ),
            path: "captcha_code.graphic_cache_size",
            value: displayValue(captcha.graphic_cache_size),
          },
          {
            label: t(
              "admin.config.quickSettings.performance.preview.captchaGenConcurrency",
            ),
            path: "captcha_code.graphic_gen_concurrency",
            value: `${displayValue(captcha.graphic_gen_concurrency)}/${displayValue(captcha.max_gen_concurrency)}`,
          },
          {
            label: t(
              "admin.config.quickSettings.performance.preview.sftpMaxConnections",
            ),
            path: "file_manager_serv_sftp.max_connections",
            value: displayValue(sftpServ.max_connections),
          },
          {
            label: t(
              "admin.config.quickSettings.performance.preview.ftpMaxConnections",
            ),
            path: "file_manager_serv_ftp.max_connections",
            value: displayValue(ftpServ.max_connections),
          },
          {
            label: t(
              "admin.config.quickSettings.performance.preview.s3MaxConnections",
            ),
            path: "file_manager_serv_s3.max_connections",
            value: displayValue(s3Serv.max_connections),
          },
        ];
      },
    [t],
  );

  const summaryEntries: SummaryEntry[] = useMemo(() => {
    const currentEntries = extractSummaryFromConfig(parsed.value);
    if (!selectedTier || !parsed.value) {
      return currentEntries.map<SummaryEntry>((e) => ({
        ...e,
        currentValue: e.value,
        templateValue: null,
      }));
    }
    const templateId =
      selectedTier === "performance"
        ? selectedLoadProfile === "high-concurrency"
          ? "performance-high-concurrency"
          : "performance-low-concurrency"
        : selectedTier;
    const templateDraft = applyPerformanceTemplateToDraft(
      buildDraftFromConfig(parsed.value, fallbackPolicy),
      templateId,
    );
    templateDraft.allocatorPolicy = fallbackPolicy;
    const templateConfig = applyDraftToConfig(
      parsed.value,
      templateDraft,
      fallbackPolicy,
    );
    const templateFeatures = deriveFeatureToggleState(templateDraft);
    const templateFull = applyFeatureToggleStateToConfig(
      templateConfig,
      templateFeatures,
      templateDraft,
    );
    const templateEntries = extractSummaryFromConfig(templateFull);
    return currentEntries.map((e, i) => ({
      ...e,
      currentValue: e.value,
      templateValue:
        templateEntries[i]?.value !== e.value
          ? (templateEntries[i]?.value ?? null)
          : null,
    }));
  }, [
    parsed.value,
    selectedTier,
    selectedLoadProfile,
    fallbackPolicy,
    extractSummaryFromConfig,
  ]);

  const [editingParam, setEditingParam] = useState<{
    path: string;
    label: string;
    value: string;
  } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const returnToMoreRef = React.useRef(false);

  const openParamEditor = (entry: SummaryEntry) => {
    returnToMoreRef.current = false;
    setEditingParam({
      path: entry.path,
      label: entry.label,
      value: entry.currentValue,
    });
    setEditingValue(entry.currentValue);
  };

  const openParamEditorFromMore = (item: { path: string; value: unknown }) => {
    returnToMoreRef.current = true;
    setShowAllImpacts(false);
    setEditingParam({
      path: item.path,
      label: item.path,
      value: String(item.value),
    });
    setEditingValue(String(item.value));
  };

  const closeParamEditor = () => {
    setEditingParam(null);
    if (returnToMoreRef.current) {
      returnToMoreRef.current = false;
      setShowAllImpacts(true);
    }
  };

  useEscapeToCloseTopLayer({
    active: Boolean(editingParam),
    onEscape: closeParamEditor,
  });
  useEscapeToCloseTopLayer({
    active: showAllImpacts && !editingParam,
    onEscape: () => setShowAllImpacts(false),
  });

  const applyParamEdit = () => {
    if (!editingParam || !parsed.value) return;
    const cfg = deepClone(parsed.value);
    const parts = editingParam.path.split(".");
    if (!editingParam.path.includes("*")) {
      applyNestedConfigValue(cfg, parts, editingValue);
    }
    onContentChange(tomlAdapter.stringify(cfg));
    closeParamEditor();
  };

  const allConfigItems = useMemo(() => {
    const cfg: ConfigObject = parsed.value ?? {};
    const database = asRecord(cfg.database);
    const kv = asRecord(cfg.fast_kv_storage_hub);
    const vfs = asRecord(cfg.vfs_storage_hub);
    const extensionManager = asRecord(cfg.extension_manager);
    const plus = asRecord(extensionManager.plus);
    const captcha = asRecord(cfg.captcha_code);
    const middleware = asRecord(cfg.middleware);
    const bruteForce = asRecord(middleware.brute_force);
    const ipRate = asRecord(middleware.ip_rate_limit);
    const clientRate = asRecord(middleware.client_id_rate_limit);
    const userRate = asRecord(middleware.user_id_rate_limit);
    const sqlite = asRecord(database.sqlite_config);
    const postgres = asRecord(database.postgres_config);
    return [
      { path: "database.db_type", value: database.db_type },
      {
        path: "database.health_check_timeout_seconds",
        value: database.health_check_timeout_seconds,
      },
      {
        path: "database.sqlite_config.max_connections",
        value: sqlite.max_connections,
      },
      {
        path: "database.sqlite_config.max_connections_low_memory",
        value: sqlite.max_connections_low_memory,
      },
      {
        path: "database.sqlite_config.max_connections_throughput",
        value: sqlite.max_connections_throughput,
      },
      {
        path: "database.sqlite_config.min_connections",
        value: sqlite.min_connections,
      },
      { path: "database.sqlite_config.cache_size", value: sqlite.cache_size },
      { path: "database.sqlite_config.temp_store", value: sqlite.temp_store },
      { path: "database.sqlite_config.mmap_size", value: sqlite.mmap_size },
      {
        path: "database.postgres_config.max_connections",
        value: postgres.max_connections,
      },
      {
        path: "database.postgres_config.max_connections_low_memory",
        value: postgres.max_connections_low_memory,
      },
      {
        path: "database.postgres_config.max_connections_throughput",
        value: postgres.max_connections_throughput,
      },
      {
        path: "database.postgres_config.min_connections",
        value: postgres.min_connections,
      },
      { path: "fast_kv_storage_hub.kv_type", value: kv.kv_type },
      { path: "fast_kv_storage_hub.default_ttl", value: kv.default_ttl },
      { path: "fast_kv_storage_hub.condition_ttl", value: kv.condition_ttl },
      {
        path: "fast_kv_storage_hub.dashmap_mem_upper_limit_ratio",
        value: kv.dashmap_mem_upper_limit_ratio,
      },
      {
        path: "fast_kv_storage_hub.dashmap_mem_max_bytes",
        value: kv.dashmap_mem_max_bytes,
      },
      {
        path: "fast_kv_storage_hub.dashmap_mem_max_bytes_low_memory",
        value: kv.dashmap_mem_max_bytes_low_memory,
      },
      {
        path: "fast_kv_storage_hub.dashmap_mem_max_bytes_throughput",
        value: kv.dashmap_mem_max_bytes_throughput,
      },
      {
        path: "internal_notify.unread_count_cache_ttl",
        value: asRecord(cfg.internal_notify).unread_count_cache_ttl,
      },
      {
        path: "internal_notify.retention_days",
        value: asRecord(cfg.internal_notify).retention_days,
      },
      {
        path: "system_backup.max_backup_size_mb",
        value: asRecord(cfg.system_backup).max_backup_size_mb,
      },
      {
        path: "middleware.ip_rate_limit.window_secs",
        value: ipRate.window_secs,
      },
      {
        path: "middleware.ip_rate_limit.max_requests",
        value: ipRate.max_requests,
      },
      {
        path: "middleware.client_id_rate_limit.window_secs",
        value: clientRate.window_secs,
      },
      {
        path: "middleware.client_id_rate_limit.max_requests",
        value: clientRate.max_requests,
      },
      {
        path: "middleware.client_id_rate_limit.max_cid",
        value: clientRate.max_cid,
      },
      {
        path: "middleware.user_id_rate_limit.window_secs",
        value: userRate.window_secs,
      },
      {
        path: "middleware.user_id_rate_limit.max_requests",
        value: userRate.max_requests,
      },
      {
        path: "middleware.user_id_rate_limit.max_userid",
        value: userRate.max_userid,
      },
      { path: "vfs_storage_hub.enable_s3", value: vfs.enable_s3 },
      { path: "vfs_storage_hub.enable_sftp", value: vfs.enable_sftp },
      { path: "vfs_storage_hub.enable_ftp", value: vfs.enable_ftp },
      { path: "extension_manager.plus.enabled", value: plus.enabled },
      { path: "extension_manager.plus.capture_logs", value: plus.capture_logs },
      {
        path: "captcha_code.graphic_cache_size",
        value: captcha.graphic_cache_size,
      },
      {
        path: "captcha_code.graphic_gen_concurrency",
        value: captcha.graphic_gen_concurrency,
      },
      {
        path: "captcha_code.max_gen_concurrency",
        value: captcha.max_gen_concurrency,
      },
      { path: "middleware.brute_force.enabled", value: bruteForce.enabled },
      {
        path: "middleware.brute_force.max_failures_per_user_ip",
        value: bruteForce.max_failures_per_user_ip,
      },
      {
        path: "middleware.brute_force.max_failures_per_ip_global",
        value: bruteForce.max_failures_per_ip_global,
      },
      {
        path: "middleware.brute_force.lockout_secs",
        value: bruteForce.lockout_secs,
      },
      {
        path: "middleware.brute_force.enable_exponential_backoff",
        value: bruteForce.enable_exponential_backoff,
      },
      {
        path: "memory_allocator.policy",
        value: asRecord(cfg.memory_allocator).policy,
      },
      {
        path: "safeaccess_guard.bloom_filter_capacity",
        value: asRecord(cfg.safeaccess_guard).bloom_filter_capacity,
      },
      {
        path: "file_manager_serv_sftp.max_connections",
        value: asRecord(cfg.file_manager_serv_sftp).max_connections,
      },
      {
        path: "file_manager_serv_ftp.max_connections",
        value: asRecord(cfg.file_manager_serv_ftp).max_connections,
      },
      {
        path: "file_manager_serv_s3.max_connections",
        value: asRecord(cfg.file_manager_serv_s3).max_connections,
      },
    ].filter((item): item is ConfigItem => item.value !== undefined);
  }, [parsed.value]);

  const groupLabelMap: Record<string, string> = useMemo(
    () => ({
      database: t(
        "admin.config.quickSettings.performance.preview.groups.database",
      ),
      fast_kv_storage_hub: t(
        "admin.config.quickSettings.performance.preview.groups.cache",
      ),
      internal_notify: t(
        "admin.config.quickSettings.performance.preview.groups.scheduler",
      ),
      system_backup: t(
        "admin.config.quickSettings.performance.preview.groups.scheduler",
      ),
      middleware: t(
        "admin.config.quickSettings.performance.preview.groups.middleware",
      ),
      captcha_code: t(
        "admin.config.quickSettings.performance.preview.groups.captcha",
      ),
      memory_allocator: t(
        "admin.config.quickSettings.performance.preview.groups.allocator",
      ),
      vfs_storage_hub: t(
        "admin.config.quickSettings.performance.preview.groups.vfs",
      ),
      task_registry: t(
        "admin.config.quickSettings.performance.preview.groups.scheduler",
      ),
      file_manager_serv_sftp: t(
        "admin.config.quickSettings.performance.preview.groups.sftp",
      ),
      file_manager_serv_ftp: t(
        "admin.config.quickSettings.performance.preview.groups.ftp",
      ),
      file_manager_serv_s3: t(
        "admin.config.quickSettings.performance.preview.groups.s3",
      ),
      chat_manager: t(
        "admin.config.quickSettings.performance.preview.groups.chat",
      ),
      email_manager: t(
        "admin.config.quickSettings.performance.preview.groups.email",
      ),
      extension_manager: t(
        "admin.config.quickSettings.performance.preview.groups.other",
      ),
      safeaccess_guard: t(
        "admin.config.quickSettings.performance.preview.groups.other",
      ),
    }),
    [t],
  );

  const templateConfigValues = useMemo((): Map<string, string> | null => {
    if (!selectedTier || !parsed.value) return null;
    const templateId =
      selectedTier === "performance"
        ? selectedLoadProfile === "high-concurrency"
          ? "performance-high-concurrency"
          : "performance-low-concurrency"
        : selectedTier;
    const templateDraft = applyPerformanceTemplateToDraft(
      buildDraftFromConfig(parsed.value, fallbackPolicy),
      templateId,
    );
    templateDraft.allocatorPolicy = fallbackPolicy;
    const templateConfig = applyDraftToConfig(
      parsed.value,
      templateDraft,
      fallbackPolicy,
    );
    const templateFeatures = deriveFeatureToggleState(templateDraft);
    const templateFull = applyFeatureToggleStateToConfig(
      templateConfig,
      templateFeatures,
      templateDraft,
    );

    const result = new Map<string, string>();
    flattenConfigValues(templateFull, "", result);
    return result;
  }, [selectedTier, selectedLoadProfile, parsed.value, fallbackPolicy]);

  const allConfigItemsByGroup = useMemo(() => {
    const groups = new Map<
      string,
      { label: string; items: Array<{ path: string; value: unknown }> }
    >();
    const otherLabel = t(
      "admin.config.quickSettings.performance.preview.groups.other",
    );
    allConfigItems.forEach((item) => {
      const key = item.path.split(".")[0] || "other";
      const group = groups.get(key) ?? {
        label: groupLabelMap[key] || otherLabel,
        items: [],
      };
      group.items.push(item);
      groups.set(key, group);
    });
    return Array.from(groups.entries())
      .sort((a, b) => b[1].items.length - a[1].items.length)
      .map(([key, group]) => ({ key, ...group }));
  }, [allConfigItems, groupLabelMap, t]);

  const featureStates = featureToggleOrder.map(
    (key) => [key, currentFeatureToggles[key]] as const,
  );

  const featureKeyToConfigPath: Record<FeatureToggleKey, string> = {
    compression: "vfs_storage_hub.file_compress.enable",
    sftp: "vfs_storage_hub.enable_sftp",
    ftp: "vfs_storage_hub.enable_ftp",
    s3: "vfs_storage_hub.enable_s3",
    chat: "chat_manager.enabled",
    email: "email_manager.enabled",
    webdav: "vfs_storage_hub.enable_webdav",
    bloomWarmup: "task_registry.bloom_filter_warmup.enabled",
  };

  const getTemplateDiffForFeature = (
    key: FeatureToggleKey,
    currentEnabled: boolean,
  ): boolean | null => {
    if (!templateConfigValues) return null;
    const path = featureKeyToConfigPath[key];
    const templateVal = templateConfigValues.get(path);
    if (templateVal === undefined) return null;
    const templateEnabled = templateVal === "true";
    return templateEnabled !== currentEnabled ? templateEnabled : null;
  };

  const getTemplateDiffForPath = (
    path: string,
    currentValue: unknown,
  ): string | null => {
    if (!templateConfigValues) return null;
    const templateVal = templateConfigValues.get(path);
    if (templateVal === undefined) return null;
    return templateVal !== String(currentValue) ? templateVal : null;
  };

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div
          className={cn(
            "rounded-2xl border p-4",
            isDark
              ? "border-white/10 bg-black/20"
              : "border-slate-200 bg-white",
          )}
        >
          <div className="flex items-center gap-2">
            <Sparkles
              size={16}
              className={isDark ? "text-sky-300" : "text-sky-600"}
            />
            <div
              className={cn(
                "text-xs font-black uppercase tracking-[0.18em]",
                isDark ? "text-slate-300" : "text-slate-700",
              )}
            >
              {t("admin.config.quickSettings.steps.performance")}
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {tierOptions.map((tier) => (
              <button
                key={tier.value}
                type="button"
                onClick={() => {
                  setSelectedTier(tier.value);
                  if (tier.value === "performance") {
                    setIsPerformanceProfilePickerOpen(true);
                  }
                }}
                className={cn(
                  "rounded-2xl border px-3 py-3 text-left transition-colors",
                  tier.value === "performance" && "sm:col-span-2",
                  selectedTier === tier.value
                    ? "border-primary bg-primary/10"
                    : isDark
                      ? "border-white/10 bg-slate-950/40 hover:bg-white/[0.04]"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div
                    className={cn(
                      "text-sm font-black",
                      selectedTier === tier.value
                        ? "text-primary"
                        : isDark
                          ? "text-slate-100"
                          : "text-slate-800",
                    )}
                  >
                    {t(tier.labelKey)}
                  </div>
                  {suggestedTemplate &&
                    (tier.value === "performance"
                      ? suggestedTemplate.startsWith("performance-")
                      : suggestedTemplate === tier.value) && (
                      <div
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wide",
                          isDark
                            ? "bg-cyan-500/15 text-cyan-200"
                            : "bg-cyan-100 text-cyan-900",
                        )}
                      >
                        {t(
                          "admin.config.quickSettings.performance.hardwareRecommendationBadge",
                        )}
                      </div>
                    )}
                </div>
                <div
                  className={cn(
                    "mt-2 text-xs leading-5",
                    selectedTier === tier.value
                      ? "text-primary/90"
                      : isDark
                        ? "text-slate-300"
                        : "text-slate-500",
                  )}
                >
                  {t(tier.descKey)}
                </div>
                {tier.value === "performance" &&
                  selectedTier === "performance" && (
                    <div
                      className={cn(
                        "mt-3 flex items-center justify-between gap-2 rounded-full border px-3 py-2",
                        isDark
                          ? "border-white/10 bg-white/[0.04]"
                          : "border-slate-200 bg-white",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            "text-[11px] font-black uppercase tracking-[0.18em]",
                            isDark ? "text-slate-400" : "text-slate-500",
                          )}
                        >
                          {t(
                            "admin.config.quickSettings.performance.currentProfile",
                          )}
                        </span>
                        <span
                          className={cn(
                            "truncate rounded-full px-2.5 py-1 text-xs font-black",
                            isDark
                              ? "bg-primary/20 text-primary-foreground"
                              : "bg-primary/10 text-primary",
                          )}
                        >
                          {t(
                            `admin.config.quickSettings.performance.loadProfile.${selectedLoadProfile}`,
                          )}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                          isDark
                            ? "border-white/10 bg-white/[0.06] text-slate-100"
                            : "border-slate-200 bg-slate-50 text-slate-700",
                        )}
                      >
                        <PenLine size={14} />
                      </span>
                    </div>
                  )}
              </button>
            ))}
          </div>

          {selectedTier && (
            <button
              type="button"
              onClick={applyTemplate}
              className="mt-3 h-10 w-full rounded-xl bg-primary px-4 text-sm font-black text-white shadow-lg shadow-primary/20 transition-colors hover:opacity-90"
            >
              {t("admin.config.quickSettings.performance.applyTemplate")}
            </button>
          )}

          <div
            className={cn(
              "mt-3 rounded-xl border px-3 py-3 text-sm leading-6",
              isDark
                ? "border-white/10 bg-white/[0.03] text-slate-300"
                : "border-slate-200 bg-slate-50 text-slate-600",
            )}
          >
            <div>
              {t("admin.config.quickSettings.performance.scenarioHint.line1")}
            </div>
            <div className="mt-1">
              {t("admin.config.quickSettings.performance.scenarioHint.line2")}
            </div>
          </div>
        </div>

        <div
          className={cn(
            "rounded-2xl border p-4",
            isDark
              ? "border-white/10 bg-white/[0.03]"
              : "border-slate-200 bg-slate-50",
          )}
        >
          <div className="flex h-full flex-col gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Boxes
                  size={16}
                  className={isDark ? "text-violet-300" : "text-violet-600"}
                />
                <div
                  className={cn(
                    "text-xs font-black uppercase tracking-[0.18em]",
                    isDark ? "text-slate-300" : "text-slate-700",
                  )}
                >
                  {t(
                    "admin.config.quickSettings.performance.featureEnablementTitle",
                  )}
                </div>
              </div>
              <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {featureStates.map(([key, enabled]) => {
                  const templateDiff = getTemplateDiffForFeature(key, enabled);
                  const hasDiff = templateDiff !== null;
                  return (
                    <button
                      key={String(key)}
                      type="button"
                      onClick={() => toggleFeature(key, !enabled)}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm font-black transition-colors",
                        hasDiff
                          ? isDark
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
                            : "border-amber-200 bg-amber-50 text-amber-900"
                          : enabled
                            ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
                            : "border-slate-200 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-500",
                      )}
                    >
                      <span>
                        {t(
                          `admin.config.quickSettings.performance.features.${key}`,
                        )}
                      </span>
                      {hasDiff && (
                        <span className="flex items-center gap-1">
                          {enabled ? <Check size={14} /> : <XIcon size={14} />}
                          <span className="text-xs">-&gt;</span>
                          {templateDiff ? (
                            <Check size={14} />
                          ) : (
                            <XIcon size={14} />
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className={cn(
                "border-t pt-3",
                isDark ? "border-white/10" : "border-slate-200",
              )}
            >
              <div
                className={cn(
                  "text-[11px] font-black uppercase tracking-[0.18em]",
                  isDark ? "text-slate-400" : "text-slate-500",
                )}
              >
                {t(
                  "admin.config.quickSettings.performance.recommendedSettings",
                )}
              </div>
              <div className="mt-2 grid gap-1 sm:grid-cols-2">
                {summaryEntries.map((entry) => (
                  <button
                    key={entry.path}
                    type="button"
                    onClick={() => openParamEditor(entry)}
                    className={cn(
                      "flex items-baseline justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors",
                      entry.templateValue
                        ? isDark
                          ? "border-amber-500/30 bg-amber-500/10"
                          : "border-amber-200 bg-amber-50"
                        : isDark
                          ? "border-transparent hover:bg-white/[0.04]"
                          : "border-transparent hover:bg-slate-100",
                    )}
                  >
                    <span
                      className={cn(
                        "min-w-0 truncate",
                        isDark ? "text-slate-400" : "text-slate-500",
                      )}
                    >
                      {entry.label}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span
                        className={cn(
                          "font-mono font-black",
                          isDark ? "text-slate-100" : "text-slate-900",
                        )}
                      >
                        {entry.currentValue}
                      </span>
                      {entry.templateValue && (
                        <>
                          <span
                            className={cn(
                              "text-xs",
                              isDark ? "text-slate-500" : "text-slate-400",
                            )}
                          >
                            -&gt;
                          </span>
                          <span
                            className={cn(
                              "font-mono font-black",
                              isDark ? "text-amber-200" : "text-amber-800",
                            )}
                          >
                            {entry.templateValue}
                          </span>
                        </>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAllImpacts(true)}
              className={cn(
                "mt-auto h-10 rounded-xl border px-4 text-sm font-black transition-colors",
                isDark
                  ? "border-white/10 bg-black/20 text-slate-100 hover:bg-white/10"
                  : "border-slate-200 bg-white text-slate-800 hover:bg-slate-100",
              )}
            >
              {t("common.more")}
            </button>
          </div>
        </div>
      </div>
      <PerformanceProfilePickerModal
        isOpen={isPerformanceProfilePickerOpen}
        value={selectedLoadProfile}
        onClose={() => setIsPerformanceProfilePickerOpen(false)}
        onSelect={(profile) => setSelectedLoadProfile(profile)}
      />
      {showAllImpacts && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="close"
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowAllImpacts(false)}
          />
          <div
            className={cn(
              "relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border p-4 shadow-2xl",
              isDark
                ? "border-white/10 bg-slate-950 text-slate-100"
                : "border-slate-200 bg-white text-slate-900",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black uppercase tracking-[0.18em]">
                  {t(
                    "admin.config.quickSettings.performance.preview.configKeyChanges",
                  )}
                </div>
                <div
                  className={cn(
                    "mt-1 text-sm",
                    isDark ? "text-slate-300" : "text-slate-500",
                  )}
                >
                  {t(
                    "admin.config.quickSettings.performance.preview.totalChanges",
                    { count: allConfigItems.length },
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllImpacts(false)}
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-xl border",
                  isDark
                    ? "border-white/10 bg-white/[0.03] text-slate-100"
                    : "border-slate-200 bg-slate-50 text-slate-800",
                )}
                aria-label={t("common.close")}
                title={t("common.close")}
              >
                <XIcon size={18} />
              </button>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto">
              <div className="grid gap-4 lg:grid-cols-2">
                {allConfigItemsByGroup.map((group) => (
                  <section
                    key={group.key}
                    className={cn(
                      "rounded-xl border p-3",
                      isDark
                        ? "border-white/10 bg-black/20"
                        : "border-slate-200 bg-slate-50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className={cn(
                          "text-[11px] font-black uppercase tracking-[0.18em]",
                          isDark ? "text-slate-400" : "text-slate-500",
                        )}
                      >
                        {group.label}
                      </div>
                      <div
                        className={cn(
                          "text-xs font-black",
                          isDark ? "text-slate-300" : "text-slate-600",
                        )}
                      >
                        {group.items.length}
                      </div>
                    </div>
                    <div className="mt-2 grid gap-1">
                      {group.items.map((item) => {
                        const diffVal = getTemplateDiffForPath(
                          item.path,
                          item.value,
                        );
                        return (
                          <button
                            key={item.path}
                            type="button"
                            onClick={() => openParamEditorFromMore(item)}
                            className={cn(
                              "grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors",
                              diffVal !== null
                                ? isDark
                                  ? "border-amber-500/30 bg-amber-500/10"
                                  : "border-amber-200 bg-amber-50"
                                : isDark
                                  ? "border-transparent hover:bg-white/[0.04]"
                                  : "border-transparent hover:bg-slate-100",
                            )}
                          >
                            <span
                              className={cn(
                                "font-mono break-all leading-5",
                                isDark ? "text-slate-300" : "text-slate-600",
                              )}
                            >
                              {item.path}
                            </span>
                            <span className="flex shrink-0 items-center gap-1.5">
                              <span
                                className={cn(
                                  "font-mono font-black leading-5",
                                  isDark ? "text-slate-100" : "text-slate-800",
                                )}
                              >
                                {String(item.value)}
                              </span>
                              {diffVal !== null && (
                                <>
                                  <span
                                    className={cn(
                                      "text-xs",
                                      isDark
                                        ? "text-slate-500"
                                        : "text-slate-400",
                                    )}
                                  >
                                    -&gt;
                                  </span>
                                  <span
                                    className={cn(
                                      "font-mono font-black leading-5",
                                      isDark
                                        ? "text-amber-200"
                                        : "text-amber-800",
                                    )}
                                  >
                                    {diffVal}
                                  </span>
                                </>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {editingParam && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="close"
            className="absolute inset-0 bg-black/70"
            onClick={closeParamEditor}
          />
          <div
            className={cn(
              "relative w-full max-w-md rounded-2xl border p-4 shadow-2xl",
              isDark
                ? "border-white/10 bg-slate-950 text-slate-100"
                : "border-slate-200 bg-white text-slate-900",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div
                className={cn(
                  "text-sm font-black",
                  isDark ? "text-slate-100" : "text-slate-900",
                )}
              >
                {editingParam.label}
              </div>
              <button
                type="button"
                onClick={closeParamEditor}
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-xl border",
                  isDark
                    ? "border-white/10 bg-white/[0.03] text-slate-100"
                    : "border-slate-200 bg-slate-50 text-slate-800",
                )}
                aria-label={t("common.close")}
              >
                <XIcon size={16} />
              </button>
            </div>
            <div
              className={cn(
                "mt-2 text-xs font-mono break-all",
                isDark ? "text-slate-400" : "text-slate-500",
              )}
            >
              {editingParam.path}
            </div>
            <input
              type="text"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              className={cn(
                "mt-3 h-11 w-full rounded-xl border px-3 text-sm font-mono",
                isDark
                  ? "border-white/10 bg-black/30 text-white"
                  : "border-slate-300 bg-white text-slate-900",
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyParamEdit();
              }}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeParamEditor}
                className={cn(
                  "h-10 rounded-xl border px-4 text-sm font-black",
                  isDark
                    ? "border-white/10 text-slate-200"
                    : "border-slate-200 text-slate-700",
                )}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={applyParamEdit}
                className="h-10 rounded-xl bg-primary px-4 text-sm font-black text-white shadow-lg shadow-primary/20"
              >
                {t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const DatabaseInlinePanel: React.FC<DatabasePanelProps> = ({
  tomlAdapter,
  content,
  onContentChange,
  runtimeOs,
  onTestDatabase,
}) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const fallbackPolicy = recommendedAllocatorPolicyForRuntime(runtimeOs);
  const createDraft = useCallback(
    (source: string) => {
      return buildFriendlyDraftFromContent(source, tomlAdapter, fallbackPolicy);
    },
    [fallbackPolicy, tomlAdapter],
  );
  const buildContent = useCallback(
    (source: string, nextDraft: FriendlyDraft) => {
      const parsed = parseConfig(source, tomlAdapter.parse);
      if (!parsed.value) {
        return source;
      }
      const normalized = { ...nextDraft };
      normalized.postgresDsn = buildPostgresDsn(normalized);
      normalized.sqliteDsn = buildSqliteDsn(normalized.sqlitePath);
      return tomlAdapter.stringify(
        applyDraftToConfig(parsed.value, normalized, fallbackPolicy),
      );
    },
    [fallbackPolicy, tomlAdapter],
  );
  const { draft: local, setDraft: setLocalDraft } =
    useConfigDraftBinding<FriendlyDraft>({
      content,
      onContentChange,
      createDraft,
      buildContent,
    });

  const inputClass = cn(
    "mt-1 h-11 w-full rounded-xl border px-3 text-sm",
    isDark
      ? "border-white/10 bg-black/30 text-white"
      : "border-slate-300 bg-white text-slate-900",
  );

  const updateDraft = useCallback(
    (updater: (draft: FriendlyDraft) => FriendlyDraft) => {
      setLocalDraft((prev) => updater(prev));
    },
    [setLocalDraft],
  );

  return (
    <div className="grid gap-4">
      <div
        className={cn(
          "inline-flex w-full flex-wrap items-center rounded-2xl border p-1",
          isDark
            ? "border-white/10 bg-white/[0.03]"
            : "border-slate-200 bg-slate-100",
        )}
      >
        {(["sqlite", "postgres"] as DatabaseType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() =>
              updateDraft((prev) => ({ ...prev, databaseType: type }))
            }
            className={cn(
              "h-11 min-w-[10rem] flex-1 rounded-xl px-3 text-sm font-black transition-all",
              local.databaseType === type
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : isDark
                  ? "text-slate-200 hover:bg-white/10"
                  : "text-slate-700 hover:bg-white",
            )}
          >
            {type === "sqlite" ? "本地数据库" : "PostgreSQL"}
          </button>
        ))}
      </div>
      {local.databaseType === "sqlite" ? (
        <div>
          <div
            className={cn(
              "text-xs font-black uppercase tracking-wide",
              isDark ? "text-slate-400" : "text-slate-600",
            )}
          >
            {t("admin.config.quickSettings.fields.sqlitePath")}
          </div>
          <input
            value={local.sqlitePath}
            onChange={(event) =>
              updateDraft((prev) => ({
                ...prev,
                sqlitePath: event.target.value,
              }))
            }
            className={inputClass}
          />
          <div className="mt-2 text-xs leading-6 text-emerald-700 dark:text-emerald-300">
            {t("admin.config.quickSettings.hints.sqliteSingleNode")}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["host", local.dbHost],
            ["port", local.dbPort],
            ["user", local.dbUser],
            ["password", local.dbPass],
            ["databaseName", local.dbName],
          ].map(([field, value]) => (
            <div
              key={String(field)}
              className={field === "databaseName" ? "sm:col-span-2" : ""}
            >
              <div
                className={cn(
                  "text-xs font-black uppercase tracking-wide",
                  isDark ? "text-slate-400" : "text-slate-600",
                )}
              >
                {t(`admin.config.quickSettings.fields.${field}`)}
              </div>
              {field === "password" ? (
                <PasswordInput
                  value={String(value)}
                  onChange={(event) => {
                    const next = {
                      ...local,
                      dbPass: event.target.value,
                    } as FriendlyDraft;
                    const parsedFields = parsePostgresDsn(
                      buildPostgresDsn(next),
                    );
                    updateDraft(() => ({ ...next, ...parsedFields }));
                  }}
                  inputClassName={inputClass}
                />
              ) : (
                <input
                  type="text"
                  value={String(value)}
                  onChange={(event) => {
                    const next = {
                      ...local,
                      [field === "databaseName"
                        ? "dbName"
                        : field === "user"
                          ? "dbUser"
                          : field === "password"
                            ? "dbPass"
                            : field === "host"
                              ? "dbHost"
                              : "dbPort"]: event.target.value,
                    } as FriendlyDraft;
                    const parsedFields = parsePostgresDsn(
                      buildPostgresDsn(next),
                    );
                    updateDraft(() => ({ ...next, ...parsedFields }));
                  }}
                  className={inputClass}
                />
              )}
            </div>
          ))}
        </div>
      )}
      {onTestDatabase && (
        <button
          type="button"
          onClick={() => {
            const connectionString =
              local.databaseType === "sqlite"
                ? buildSqliteDsn(local.sqlitePath)
                : buildPostgresDsn(local);
            void onTestDatabase({
              databaseType: local.databaseType,
              connectionString,
            });
          }}
          className={cn(
            "h-10 w-fit rounded-xl border px-4 text-sm font-black transition-all",
            isDark
              ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15"
              : "border-cyan-300 bg-cyan-50 text-cyan-900 hover:bg-cyan-100",
          )}
        >
          {t("systemConfig.setup.editor.check")}
        </button>
      )}
    </div>
  );
};

export const CacheInlinePanel: React.FC<CachePanelProps> = ({
  tomlAdapter,
  content,
  onContentChange,
  runtimeOs,
  onTestCache,
}) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const fallbackPolicy = recommendedAllocatorPolicyForRuntime(runtimeOs);
  const createDraft = useCallback(
    (source: string) => {
      return buildFriendlyDraftFromContent(source, tomlAdapter, fallbackPolicy);
    },
    [fallbackPolicy, tomlAdapter],
  );
  const buildContent = useCallback(
    (source: string, nextDraft: FriendlyDraft) => {
      const parsed = parseConfig(source, tomlAdapter.parse);
      if (!parsed.value) {
        return source;
      }
      const normalized = {
        ...nextDraft,
        cacheRedisUrl: buildRedisUrl(nextDraft),
      };
      return tomlAdapter.stringify(
        applyDraftToConfig(parsed.value, normalized, fallbackPolicy),
      );
    },
    [fallbackPolicy, tomlAdapter],
  );
  const { draft: local, setDraft: setLocalDraft } =
    useConfigDraftBinding<FriendlyDraft>({
      content,
      onContentChange,
      createDraft,
      buildContent,
    });
  const inputClass = cn(
    "mt-1 h-11 w-full rounded-xl border px-3 text-sm",
    isDark
      ? "border-white/10 bg-black/30 text-white"
      : "border-slate-300 bg-white text-slate-900",
  );
  const isRedisLike = ["valkey", "redis", "keydb"].includes(local.cacheType);

  const updateDraft = useCallback(
    (updater: (draft: FriendlyDraft) => FriendlyDraft) => {
      setLocalDraft((prev) => updater(prev));
    },
    [setLocalDraft],
  );

  return (
    <div className="grid gap-4">
      <div
        className={cn(
          "inline-flex w-full flex-wrap items-center rounded-2xl border p-1",
          isDark
            ? "border-white/10 bg-white/[0.03]"
            : "border-slate-200 bg-slate-100",
        )}
      >
        {([
          ["database", "systemConfig.setup.config.kvSqlHint"],
          ["dashmap", "systemConfig.setup.config.kvDashmapHint"],
          ["external", "systemConfig.setup.config.kvRedisHint"],
        ] as const).map(([type, hintKey]) => (
          <button
            key={type}
            type="button"
            onClick={() =>
              updateDraft((prev) => ({
                ...prev,
                cacheType:
                  type === "external"
                    ? ["redis", "valkey", "keydb"].includes(prev.cacheType)
                      ? prev.cacheType
                      : "valkey"
                    : type,
              }))
            }
            className={cn(
              "min-w-[10rem] flex-1 rounded-xl px-3 py-3 text-left text-sm font-black transition-all",
              (type === "external" ? isRedisLike : local.cacheType === type)
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : isDark
                  ? "text-slate-200 hover:bg-white/10"
                  : "text-slate-700 hover:bg-white",
            )}
          >
            <div>
              {type === "database"
                ? t("systemConfig.setup.config.kvType") + " · DB"
                : type === "dashmap"
                  ? t("systemConfig.setup.config.kvType") + " · DashMap"
                  : t("systemConfig.setup.cache.externalServer")}
            </div>
            <div
              className={cn(
                "mt-1 text-xs leading-5 font-semibold",
                (type === "external" ? isRedisLike : local.cacheType === type)
                  ? "text-white/85"
                  : isDark
                    ? "text-slate-400"
                    : "text-slate-500",
              )}
            >
              {t(hintKey)}
            </div>
          </button>
        ))}
      </div>
      {isRedisLike && (
        <div
          className={cn(
            "inline-flex w-full flex-wrap items-center rounded-2xl border p-1",
            isDark
              ? "border-white/10 bg-white/[0.03]"
              : "border-slate-200 bg-slate-100",
          )}
        >
          {["redis", "valkey", "keydb"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() =>
                updateDraft((prev) => ({ ...prev, cacheType: type }))
              }
              className={cn(
                "h-11 min-w-[8rem] flex-1 rounded-xl px-3 text-sm font-black transition-all",
                local.cacheType === type
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : isDark
                    ? "text-slate-200 hover:bg-white/10"
                    : "text-slate-700 hover:bg-white",
              )}
            >
              {type}
            </button>
          ))}
        </div>
      )}
      {isRedisLike && (
        <div
          className={cn(
            "rounded-2xl border p-3 text-sm leading-6",
            isDark
              ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-100"
              : "border-cyan-200 bg-cyan-50 text-cyan-900",
          )}
        >
          {t(`systemConfig.setup.cache.externalHints.${local.cacheType}`)}
        </div>
      )}
      {isRedisLike && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["host", local.cacheHost],
            ["port", local.cachePort],
            ["user", local.cacheUser],
            ["password", local.cachePass],
          ].map(([field, value]) => (
            <div key={String(field)}>
              <div
                className={cn(
                  "text-xs font-black uppercase tracking-wide",
                  isDark ? "text-slate-400" : "text-slate-600",
                )}
              >
                {t(`admin.config.quickSettings.fields.${field}`)}
              </div>
              {field === "password" ? (
                <PasswordInput
                  value={String(value)}
                  onChange={(event) => {
                    const next = {
                      ...local,
                      cachePass: event.target.value,
                    } as FriendlyDraft;
                    const parsedFields = parseRedisUrl(buildRedisUrl(next));
                    updateDraft(() => ({ ...next, ...parsedFields }));
                  }}
                  inputClassName={inputClass}
                />
              ) : (
                <input
                  type="text"
                  value={String(value)}
                  onChange={(event) => {
                    const key =
                      field === "user"
                        ? "cacheUser"
                        : field === "password"
                          ? "cachePass"
                          : field === "host"
                            ? "cacheHost"
                            : "cachePort";
                    const next = {
                      ...local,
                      [key]: event.target.value,
                    } as FriendlyDraft;
                    const parsedFields = parseRedisUrl(buildRedisUrl(next));
                    updateDraft(() => ({ ...next, ...parsedFields }));
                  }}
                  className={inputClass}
                />
              )}
            </div>
          ))}
          <label className="flex items-center gap-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={local.cacheUseTls}
              onChange={(event) =>
                updateDraft((prev) => ({
                  ...prev,
                  cacheUseTls: event.target.checked,
                }))
              }
            />
            <span className="text-sm font-black">
              {t("admin.config.quickSettings.fields.useTls")}
            </span>
          </label>
        </div>
      )}
      {onTestCache && isRedisLike && (
        <button
          type="button"
          onClick={() => {
            void onTestCache({
              cacheType: local.cacheType,
              connectionString: buildRedisUrl(local),
            });
          }}
          className={cn(
            "h-10 w-fit rounded-xl border px-4 text-sm font-black transition-all",
            isDark
              ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15"
              : "border-cyan-300 bg-cyan-50 text-cyan-900 hover:bg-cyan-100",
          )}
        >
          {t("systemConfig.setup.editor.check")}
        </button>
      )}
    </div>
  );
};
