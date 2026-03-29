import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ChevronRight,
  Cpu,
  HardDrive,
  Key,
  PenLine,
  Settings2,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  deepClone,
  ensureRecord,
  isRecord,
  type ConfigObject,
} from "@/lib/configObject";
import { getNavigatorPlatformSource } from "@/lib/browserPlatform";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { useEscapeToCloseTopLayer } from "@/hooks/useEscapeToCloseTopLayer";
import { PerformanceProfilePickerModal } from "./PerformanceProfilePickerModal";
import { useConfigDraftBinding } from "./useConfigDraftBinding";

export type DatabaseType = "postgres" | "sqlite";
export type FriendlyStep = "performance" | "database" | "cache" | "other";
export type PerformanceTier = "constrained" | "lightweight" | "performance";
export type LoadProfile = "low-concurrency" | "high-concurrency";
export type PerformanceTemplateId =
  | "constrained"
  | "lightweight"
  | "performance-low-concurrency"
  | "performance-high-concurrency";
export type CaptchaPreheatMode = "memory" | "balanced" | "throughput";

type LegacyPerformanceTier = "extreme-low" | "medium" | "good";

export interface SystemHardwareInfo {
  os_type?: string;
  arch?: string;
  logical_cpu_count?: number | null;
  physical_cpu_count?: number | null;
  total_memory_bytes?: number | null;
  suggested_performance_template?: string | null;
}

export interface FriendlyDraft {
  performanceTier: PerformanceTier;
  loadProfile: LoadProfile;
  captchaPreheatMode: CaptchaPreheatMode;
  databaseType: DatabaseType;
  postgresDsn: string;
  sqliteDsn: string;
  dbHost: string;
  dbPort: string;
  dbUser: string;
  dbPass: string;
  dbName: string;
  sqlitePath: string;
  dbHealthTimeoutSeconds: string;
  cacheType: string;
  cacheRedisUrl: string;
  cacheHost: string;
  cachePort: string;
  cacheUser: string;
  cachePass: string;
  cacheUseTls: boolean;
  enableRegistration: boolean;
  plusEnabled: boolean;
  plusCaptureLogs: boolean;
  captchaCodeLength: string;
  captchaExpiresIn: string;
  allocatorPolicy: "system" | "mimalloc" | "jemalloc";
  allocatorProfile: "low_memory" | "balanced" | "throughput";
}

export const defaultDraft: FriendlyDraft = {
  performanceTier: "lightweight",
  loadProfile: "low-concurrency",
  captchaPreheatMode: "balanced",
  databaseType: "sqlite",
  postgresDsn: "postgres://postgres:admin888@localhost:5432/fileuni",
  sqliteDsn: "sqlite://{RUNTIMEDIR}/fileuni.db",
  dbHost: "localhost",
  dbPort: "5432",
  dbUser: "postgres",
  dbPass: "admin888",
  dbName: "fileuni",
  sqlitePath: "{RUNTIMEDIR}/fileuni.db",
  dbHealthTimeoutSeconds: "5",
  cacheType: "database",
  cacheRedisUrl: "redis://:admin888@127.0.0.1:6379",
  cacheHost: "127.0.0.1",
  cachePort: "6379",
  cacheUser: "",
  cachePass: "admin888",
  cacheUseTls: false,
  enableRegistration: false,
  plusEnabled: true,
  plusCaptureLogs: true,
  captchaCodeLength: "6",
  captchaExpiresIn: "300",
  allocatorPolicy: "mimalloc",
  allocatorProfile: "balanced",
};

interface PerformancePreset {
  tier: PerformanceTier;
  labelKey: string;
  descKey: string;
  recommendations: {
    databaseType: DatabaseType;
    cacheType: string;
    maxConnections: number;
    cacheMemoryMB: number;
  };
  features: {
    compression: boolean;
    sftp: boolean;
    ftp: boolean;
    webdav: boolean;
    s3: boolean;
    bloomWarmup: boolean;
    chat: boolean;
    email: boolean;
  };
}

interface EffectivePreset {
  preset: PerformancePreset;
  maxConnections: number;
  features: PerformancePreset["features"];
}

interface PerformanceTuningPlan {
  domainRequestTimeoutSec: number;
  domainWebhookTimeoutSec: number;
  domainDnsPropagationWaitSec: number;
  domainChallengePollIntervalSec: number;
  domainChallengeMaxPollCount: number;
  chatRateLimitWindowSecs: number;
  chatRateLimitMessagesPerWindow: number;
  chatWsSessionTimeoutSecs: number;
  chatMaxMessageSizeBytes: number;
  chatMaxGroupsPerUser: number;
  chatMaxMembersPerGroup: number;
  chatMaxGroupsJoinedPerUser: number;
  chatMaxGuestInvitesPerUser: number;
  dbMaxConnections: number;
  dbMaxConnectionsLowMemory: number;
  dbMaxConnectionsThroughput: number;
  dbMinConnections: number;
  sqliteCacheSize: number;
  sqliteMmapSize: number;
  cacheMemoryMB: number;
  kvDefaultTtlSecs: number;
  kvConditionTtlSecs: number;
  kvDashmapUpperLimitRatio: number;
  notifyUnreadCountCacheTtlSecs: number;
  notifyRetentionDays: number;
  systemBackupMaxSizeMb: number;
  middleware: {
    ipWindowSecs: number;
    ipMaxRequests: number;
    clientWindowSecs: number;
    clientMaxRequests: number;
    clientMaxCid: number;
    userWindowSecs: number;
    userMaxRequests: number;
    userMaxId: number;
    bruteForceEnabled: boolean;
    bruteForceMaxFailuresPerUserIp: number;
    bruteForceMaxFailuresPerIpGlobal: number;
    bruteForceLockoutSecs: number;
    bruteForceBackoffEnabled: boolean;
  };
  scheduler: {
    criticalCron: string;
    maintenanceCron: string;
    lowPriorityCron: string;
    healthCheckCron: string;
  };
  bloomWarmupTuning: {
    reserveCapacity: number;
    maxUsersPerRun: number;
    yieldEveryUsers: number;
    sleepMsPerYield: number;
  };
  quotaCalibrationTuning: {
    maxUsersPerRun: number;
    yieldEveryUsers: number;
    sleepMsPerUser: number;
  };
  fileIndexSyncTuning: {
    maxUsersPerRun: number;
    yieldEveryUsers: number;
    sleepMsPerUser: number;
  };
  captchaPreheat: {
    graphicCacheSize: number;
    graphicGenConcurrency: number;
    maxGenConcurrency: number;
    poolCheckIntervalSecs: number;
    emergencyFillMultiplier: number;
  };
  vfsBatchMaxConcurrentTasks: number;
  vfsBatchMaxConcurrentTasksLowMemory: number;
  vfsBatchMaxConcurrentTasksThroughput: number;
  fileIndexMaxConcurrentRefresh: number;
  fileIndexMaxConcurrentRefreshLowMemory: number;
  fileIndexMaxConcurrentRefreshThroughput: number;
  fileIndexMaxFilesPerRefresh: number;
  fileIndexMaxFilesPerRefreshLowMemory: number;
  fileIndexMaxFilesPerRefreshThroughput: number;
  fileIndexAdminConsistencyBatchSize: number;
  fileIndexRefreshTimeout: number;
  readCache: {
    backend: "memory" | "local_dir";
    capacityBytes: number;
    maxFileSizeBytes: number;
    ttlSecs: number;
  };
  writeCache: {
    backend: "memory" | "local_dir";
    capacityBytes: number;
    maxFileSizeBytes: number;
    flushConcurrency: number;
    flushIntervalMs: number;
    flushDeadlineSecs: number;
  };
  compressionConcurrency: number;
  compressionConcurrencyLowMemory: number;
  compressionConcurrencyThroughput: number;
  compressionMaxCpuThreads: number;
  compressionMaxCpuThreadsLowMemory: number;
  compressionMaxCpuThreadsThroughput: number;
  taskRetentionDays: number;
  journalLogRetentionDays: number;
  journalLogBatchSize: number;
  journalLogBatchSizeLowMemory: number;
  journalLogBatchSizeThroughput: number;
  journalLogFlushIntervalMs: number;
  journalLogQueueCapacityMultiplier: number;
  webApiUploadMaxFileSize: number;
  webRefreshIntervalSec: number;
  logEnableAsync: boolean;
}

interface ConfigPreviewItem {
  path: string;
  value: string;
}

interface ConfigPreviewGroupStat {
  key: string;
  labelKey: string;
  count: number;
}

const PERFORMANCE_PRESETS: PerformancePreset[] = [
  {
    tier: "constrained",
    labelKey: "admin.config.quickSettings.performance.tiers.constrained",
    descKey: "admin.config.quickSettings.performance.descriptions.constrained",
    recommendations: {
      databaseType: "sqlite",
      cacheType: "database",
      maxConnections: 2,
      cacheMemoryMB: 4,
    },
    features: {
      compression: false,
      sftp: false,
      ftp: false,
      webdav: true,
      s3: false,
      bloomWarmup: false,
      chat: false,
      email: false,
    },
  },
  {
    tier: "lightweight",
    labelKey: "admin.config.quickSettings.performance.tiers.lightweight",
    descKey: "admin.config.quickSettings.performance.descriptions.lightweight",
    recommendations: {
      databaseType: "sqlite",
      cacheType: "database",
      maxConnections: 20,
      cacheMemoryMB: 32,
    },
    features: {
      compression: false,
      sftp: false,
      ftp: false,
      webdav: true,
      s3: false,
      bloomWarmup: true,
      chat: false,
      email: false,
    },
  },
  {
    tier: "performance",
    labelKey: "admin.config.quickSettings.performance.tiers.performance",
    descKey: "admin.config.quickSettings.performance.descriptions.performance",
    recommendations: {
      databaseType: "postgres",
      cacheType: "valkey",
      maxConnections: 72,
      cacheMemoryMB: 192,
    },
    features: {
      compression: true,
      sftp: true,
      ftp: true,
      webdav: true,
      s3: true,
      bloomWarmup: true,
      chat: true,
      email: true,
    },
  },
];

const LOAD_PROFILE_PRESETS = {
  performance: {
    "low-concurrency": {
      maxConnections: 72,
      features: {
        compression: true,
        sftp: true,
        ftp: true,
        webdav: true,
        s3: true,
        bloomWarmup: true,
        chat: true,
        email: true,
      },
    },
    "high-concurrency": {
      maxConnections: 200,
      features: {
        compression: true,
        sftp: true,
        ftp: true,
        webdav: true,
        s3: true,
        bloomWarmup: true,
        chat: true,
        email: true,
      },
    },
  },
};

export const getActivePerformanceTemplate = (
  draft: Pick<FriendlyDraft, "performanceTier" | "loadProfile">,
): PerformanceTemplateId => {
  if (draft.performanceTier === "performance") {
    return draft.loadProfile === "high-concurrency"
      ? "performance-high-concurrency"
      : "performance-low-concurrency";
  }
  return draft.performanceTier;
};

export const parsePerformanceTemplateId = (
  value?: string | null,
): PerformanceTemplateId | null => {
  switch ((value ?? "").trim().toLowerCase()) {
    case "constrained":
      return "constrained";
    case "lightweight":
      return "lightweight";
    case "performance-low-concurrency":
      return "performance-low-concurrency";
    case "performance-high-concurrency":
      return "performance-high-concurrency";
    case "performance-multi-user":
      return "performance-high-concurrency";
    default:
      return null;
  }
};

export const performanceTemplateLabelKey = (
  template: PerformanceTemplateId,
): string => {
  switch (template) {
    case "constrained":
      return "admin.config.quickSettings.performance.templates.constrained";
    case "lightweight":
      return "admin.config.quickSettings.performance.templates.lightweight";
    case "performance-low-concurrency":
      return "admin.config.quickSettings.performance.templates.performanceLowConcurrency";
    case "performance-high-concurrency":
      return "admin.config.quickSettings.performance.templates.performanceHighConcurrency";
  }
};

const performanceTemplateToSelection = (
  template: PerformanceTemplateId,
): Pick<FriendlyDraft, "performanceTier" | "loadProfile"> => {
  switch (template) {
    case "constrained":
      return { performanceTier: "constrained", loadProfile: "low-concurrency" };
    case "lightweight":
      return { performanceTier: "lightweight", loadProfile: "low-concurrency" };
    case "performance-high-concurrency":
      return {
        performanceTier: "performance",
        loadProfile: "high-concurrency",
      };
    case "performance-low-concurrency":
    default:
      return { performanceTier: "performance", loadProfile: "low-concurrency" };
  }
};

const mapPerformanceTierToLegacy = (
  tier: PerformanceTier,
): LegacyPerformanceTier => {
  if (tier === "constrained") return "extreme-low";
  if (tier === "lightweight") return "medium";
  return "good";
};

export const applyPerformanceTemplateToDraft = (
  prev: FriendlyDraft,
  template: PerformanceTemplateId,
): FriendlyDraft => {
  const selection = performanceTemplateToSelection(template);
  const preset = getPresetByTier(selection.performanceTier);
  const next: FriendlyDraft = {
    ...prev,
    performanceTier: selection.performanceTier,
    loadProfile: selection.loadProfile,
    databaseType: preset.recommendations.databaseType,
    cacheType: preset.recommendations.cacheType,
    captchaPreheatMode:
      selection.performanceTier === "constrained" ? "memory" : "balanced",
  };

  if (preset.recommendations.databaseType === "sqlite") {
    next.sqlitePath = "{RUNTIMEDIR}/fileuni.db";
    next.sqliteDsn = "sqlite://{RUNTIMEDIR}/fileuni.db";
  }

  return next;
};

const CRITICAL_TASK_KEYS = [
  "process_timeout_check",
  "interrupted_task_checker",
] as const;
const MAINTENANCE_TASK_KEYS = [
  "cache_ttl_cleanup",
  "temp_cleanup",
  "quota_calibration",
  "file_index_sync",
  "audit_log_pruning",
  "s3_multipart_cleanup",
  "trash_cleanup",
] as const;
const LOW_PRIORITY_TASK_KEYS = [
  "share_cleanup",
  "domain_ddns_sync_check",
  "domain_acme_renewal_check",
  "notification_cleanup",
  "task_cleanup",
  "system_backup",
] as const;

const everyMinutesCron = (minutes: number): string => {
  return `0 */${Math.max(1, minutes)} * * * *`;
};

export const resolveEffectivePreset = (
  draft: FriendlyDraft,
  preset: PerformancePreset,
): EffectivePreset => {
  const tierKey =
    draft.performanceTier === "performance" ? "performance" : null;
  const hasLoadProfile =
    tierKey &&
    LOAD_PROFILE_PRESETS[tierKey as keyof typeof LOAD_PROFILE_PRESETS] &&
    draft.loadProfile;
  if (hasLoadProfile) {
    const profile =
      LOAD_PROFILE_PRESETS[tierKey as keyof typeof LOAD_PROFILE_PRESETS][
        draft.loadProfile as "low-concurrency" | "high-concurrency"
      ];
    return {
      preset,
      maxConnections: profile.maxConnections,
      features: profile.features,
    };
  }
  return {
    preset,
    maxConnections: preset.recommendations.maxConnections,
    features: preset.features,
  };
};

const buildPerformanceTuningPlan = (
  draft: FriendlyDraft,
  effectivePreset: EffectivePreset,
): PerformanceTuningPlan => {
  const { preset, maxConnections } = effectivePreset;
  const tuningTier = mapPerformanceTierToLegacy(preset.tier);
  const isMultiUserProfile =
    draft.performanceTier === "performance" &&
    draft.loadProfile === "high-concurrency";
  let cacheMemoryMB = preset.recommendations.cacheMemoryMB;
  if (tuningTier === "good" && isMultiUserProfile) {
    cacheMemoryMB = Math.round(cacheMemoryMB * 1.5);
  }

  const dbMinConnections =
    draft.databaseType === "postgres"
      ? Math.max(1, Math.floor(maxConnections * 0.1))
      : 1;
  const dbMaxConnectionsLowMemory = Math.max(
    1,
    Math.floor(maxConnections * 0.5),
  );
  const dbMaxConnectionsThroughput = Math.max(
    maxConnections,
    Math.ceil(maxConnections * 1.5),
  );

  const sqliteCacheSize =
    tuningTier === "extreme-low" ? 256 : tuningTier === "medium" ? 2048 : 4096;
  const sqliteMmapSize =
    tuningTier === "extreme-low"
      ? 0
      : tuningTier === "good"
        ? 268435456
        : 33554432;
  const kvTtlByTier: Record<
    LegacyPerformanceTier,
    { defaultTtl: number; conditionTtl: number; dashmapUpperLimitRatio: number }
  > = {
    "extreme-low": {
      defaultTtl: 900,
      conditionTtl: 60,
      dashmapUpperLimitRatio: 0.6,
    },
    medium: {
      defaultTtl: 1800,
      conditionTtl: 120,
      dashmapUpperLimitRatio: 0.85,
    },
    good: {
      defaultTtl: isMultiUserProfile ? 7200 : 3600,
      conditionTtl: isMultiUserProfile ? 600 : 300,
      dashmapUpperLimitRatio: isMultiUserProfile ? 1.3 : 1.1,
    },
  };
  const notifyByTier: Record<
    LegacyPerformanceTier,
    { unreadCountCacheTtl: number; retentionDays: number }
  > = {
    "extreme-low": { unreadCountCacheTtl: 300, retentionDays: 30 },
    medium: { unreadCountCacheTtl: 1200, retentionDays: 90 },
    good: {
      unreadCountCacheTtl: isMultiUserProfile ? 3600 : 2400,
      retentionDays: isMultiUserProfile ? 120 : 90,
    },
  };
  const systemBackupByTier: Record<
    LegacyPerformanceTier,
    { maxBackupSizeMb: number }
  > = {
    "extreme-low": { maxBackupSizeMb: 256 },
    medium: { maxBackupSizeMb: 1024 },
    good: { maxBackupSizeMb: isMultiUserProfile ? 8192 : 4096 },
  };

  const middlewareByTier: Record<
    LegacyPerformanceTier,
    PerformanceTuningPlan["middleware"]
  > = {
    "extreme-low": {
      ipWindowSecs: 60,
      ipMaxRequests: 60,
      clientWindowSecs: 60,
      clientMaxRequests: 80,
      clientMaxCid: 80,
      userWindowSecs: 60,
      userMaxRequests: 120,
      userMaxId: 50,
      bruteForceEnabled: true,
      bruteForceMaxFailuresPerUserIp: 3,
      bruteForceMaxFailuresPerIpGlobal: 10,
      bruteForceLockoutSecs: 600,
      bruteForceBackoffEnabled: true,
    },
    medium: {
      ipWindowSecs: 60,
      ipMaxRequests: 180,
      clientWindowSecs: 60,
      clientMaxRequests: 220,
      clientMaxCid: 700,
      userWindowSecs: 60,
      userMaxRequests: 260,
      userMaxId: 300,
      bruteForceEnabled: true,
      bruteForceMaxFailuresPerUserIp: 5,
      bruteForceMaxFailuresPerIpGlobal: 20,
      bruteForceLockoutSecs: 360,
      bruteForceBackoffEnabled: true,
    },
    good: {
      ipWindowSecs: 60,
      ipMaxRequests: isMultiUserProfile ? 500 : 300,
      clientWindowSecs: 60,
      clientMaxRequests: isMultiUserProfile ? 600 : 360,
      clientMaxCid: isMultiUserProfile ? 5000 : 2500,
      userWindowSecs: 60,
      userMaxRequests: isMultiUserProfile ? 700 : 420,
      userMaxId: isMultiUserProfile ? 3000 : 1200,
      bruteForceEnabled: true,
      bruteForceMaxFailuresPerUserIp: isMultiUserProfile ? 8 : 6,
      bruteForceMaxFailuresPerIpGlobal: isMultiUserProfile ? 30 : 24,
      bruteForceLockoutSecs: isMultiUserProfile ? 180 : 240,
      bruteForceBackoffEnabled: true,
    },
  };

  const schedulerByTier: Record<
    LegacyPerformanceTier,
    PerformanceTuningPlan["scheduler"]
  > = {
    "extreme-low": {
      criticalCron: everyMinutesCron(10),
      maintenanceCron: everyMinutesCron(30),
      lowPriorityCron: everyMinutesCron(60),
      healthCheckCron: everyMinutesCron(15),
    },
    medium: {
      criticalCron: everyMinutesCron(2),
      maintenanceCron: everyMinutesCron(8),
      lowPriorityCron: everyMinutesCron(20),
      healthCheckCron: everyMinutesCron(3),
    },
    good: {
      criticalCron: everyMinutesCron(1),
      maintenanceCron: everyMinutesCron(isMultiUserProfile ? 10 : 6),
      lowPriorityCron: everyMinutesCron(isMultiUserProfile ? 20 : 15),
      healthCheckCron: everyMinutesCron(isMultiUserProfile ? 3 : 2),
    },
  };
  const bloomWarmupTuningByTier: Record<
    LegacyPerformanceTier,
    PerformanceTuningPlan["bloomWarmupTuning"]
  > = {
    "extreme-low": {
      reserveCapacity: 100000,
      maxUsersPerRun: 5000,
      yieldEveryUsers: 20,
      sleepMsPerYield: 8,
    },
    medium: {
      reserveCapacity: 500000,
      maxUsersPerRun: 60000,
      yieldEveryUsers: 100,
      sleepMsPerYield: 2,
    },
    good: {
      reserveCapacity: isMultiUserProfile ? 600000 : 1000000,
      maxUsersPerRun: isMultiUserProfile ? 80000 : 120000,
      yieldEveryUsers: isMultiUserProfile ? 120 : 150,
      sleepMsPerYield: isMultiUserProfile ? 1 : 0,
    },
  };
  const quotaCalibrationTuningByTier: Record<
    LegacyPerformanceTier,
    PerformanceTuningPlan["quotaCalibrationTuning"]
  > = {
    "extreme-low": {
      maxUsersPerRun: 200,
      yieldEveryUsers: 20,
      sleepMsPerUser: 20,
    },
    medium: {
      maxUsersPerRun: 4000,
      yieldEveryUsers: 80,
      sleepMsPerUser: 4,
    },
    good: {
      maxUsersPerRun: isMultiUserProfile ? 5000 : 8000,
      yieldEveryUsers: isMultiUserProfile ? 100 : 120,
      sleepMsPerUser: isMultiUserProfile ? 2 : 1,
    },
  };
  const fileIndexSyncTuningByTier: Record<
    LegacyPerformanceTier,
    PerformanceTuningPlan["fileIndexSyncTuning"]
  > = {
    "extreme-low": {
      maxUsersPerRun: 50,
      yieldEveryUsers: 10,
      sleepMsPerUser: 80,
    },
    medium: {
      maxUsersPerRun: 1000,
      yieldEveryUsers: 40,
      sleepMsPerUser: 20,
    },
    good: {
      maxUsersPerRun: isMultiUserProfile ? 1500 : 3000,
      yieldEveryUsers: isMultiUserProfile ? 60 : 80,
      sleepMsPerUser: isMultiUserProfile ? 10 : 5,
    },
  };
  const captchaPreheatByTier: Record<
    LegacyPerformanceTier,
    PerformanceTuningPlan["captchaPreheat"]
  > = {
    "extreme-low": {
      graphicCacheSize: 20,
      graphicGenConcurrency: 1,
      maxGenConcurrency: 1,
      poolCheckIntervalSecs: 5,
      emergencyFillMultiplier: 1,
    },
    medium: {
      graphicCacheSize: 80,
      graphicGenConcurrency: 2,
      maxGenConcurrency: 3,
      poolCheckIntervalSecs: 2,
      emergencyFillMultiplier: 2,
    },
    good: {
      graphicCacheSize: isMultiUserProfile ? 300 : 180,
      graphicGenConcurrency: isMultiUserProfile ? 4 : 3,
      maxGenConcurrency: isMultiUserProfile ? 8 : 6,
      poolCheckIntervalSecs: 1,
      emergencyFillMultiplier: isMultiUserProfile ? 3 : 2,
    },
  };
  const baseCaptchaPreheat = captchaPreheatByTier[tuningTier];
  const captchaPreheat = (() => {
    if (draft.captchaPreheatMode === "memory") {
      return {
        graphicCacheSize: Math.max(
          20,
          Math.floor(baseCaptchaPreheat.graphicCacheSize * 0.6),
        ),
        graphicGenConcurrency: Math.max(
          1,
          baseCaptchaPreheat.graphicGenConcurrency - 1,
        ),
        maxGenConcurrency: Math.max(
          1,
          baseCaptchaPreheat.maxGenConcurrency - 1,
        ),
        poolCheckIntervalSecs: Math.max(
          1,
          baseCaptchaPreheat.poolCheckIntervalSecs + 1,
        ),
        emergencyFillMultiplier: Math.max(
          1,
          baseCaptchaPreheat.emergencyFillMultiplier - 1,
        ),
      };
    }
    if (draft.captchaPreheatMode === "throughput") {
      return {
        graphicCacheSize: Math.max(
          20,
          Math.floor(baseCaptchaPreheat.graphicCacheSize * 1.4),
        ),
        graphicGenConcurrency: Math.max(
          1,
          baseCaptchaPreheat.graphicGenConcurrency + 1,
        ),
        maxGenConcurrency: Math.max(
          1,
          baseCaptchaPreheat.maxGenConcurrency + 2,
        ),
        poolCheckIntervalSecs: Math.max(
          1,
          baseCaptchaPreheat.poolCheckIntervalSecs - 1,
        ),
        emergencyFillMultiplier: Math.max(
          1,
          baseCaptchaPreheat.emergencyFillMultiplier + 1,
        ),
      };
    }
    return baseCaptchaPreheat;
  })();

  const compressionConcurrency = effectivePreset.features.compression
    ? tuningTier === "good"
      ? isMultiUserProfile
        ? 2
        : 4
      : tuningTier === "medium"
        ? 2
        : 1
    : 1;
  const compressionConcurrencyLowMemory = 1;
  const compressionConcurrencyThroughput = effectivePreset.features.compression
    ? tuningTier === "good"
      ? isMultiUserProfile
        ? 4
        : 6
      : tuningTier === "medium"
        ? 3
        : 2
    : 1;
  const compressionMaxCpuThreads = effectivePreset.features.compression
    ? tuningTier === "good"
      ? isMultiUserProfile
        ? 4
        : 3
      : tuningTier === "medium"
        ? 2
        : 1
    : 1;
  const compressionMaxCpuThreadsLowMemory = 1;
  const compressionMaxCpuThreadsThroughput = effectivePreset.features
    .compression
    ? tuningTier === "good"
      ? isMultiUserProfile
        ? 8
        : 6
      : tuningTier === "medium"
        ? 4
        : 2
    : 1;
  const vfsBatchMaxConcurrentTasks = effectivePreset.features.compression
    ? tuningTier === "good"
      ? isMultiUserProfile
        ? 4
        : 6
      : tuningTier === "medium"
        ? 3
        : 2
    : 1;
  const vfsBatchMaxConcurrentTasksLowMemory = 1;
  const vfsBatchMaxConcurrentTasksThroughput =
    tuningTier === "good"
      ? isMultiUserProfile
        ? 6
        : 8
      : tuningTier === "medium"
        ? 4
        : 2;
  const fileIndexMaxConcurrentRefresh =
    tuningTier === "good"
      ? isMultiUserProfile
        ? 6
        : 5
      : tuningTier === "medium"
        ? 3
        : 2;
  const fileIndexMaxConcurrentRefreshLowMemory = 1;
  const fileIndexMaxConcurrentRefreshThroughput =
    tuningTier === "good"
      ? isMultiUserProfile
        ? 10
        : 8
      : tuningTier === "medium"
        ? 5
        : 3;
  const fileIndexMaxFilesPerRefresh =
    tuningTier === "good"
      ? isMultiUserProfile
        ? 4096
        : 2048
      : tuningTier === "medium"
        ? 1024
        : 256;
  const fileIndexMaxFilesPerRefreshLowMemory =
    tuningTier === "good" ? 512 : tuningTier === "medium" ? 384 : 256;
  const fileIndexMaxFilesPerRefreshThroughput =
    tuningTier === "good"
      ? isMultiUserProfile
        ? 8192
        : 4096
      : tuningTier === "medium"
        ? 2048
        : 512;
  const fileIndexAdminConsistencyBatchSize = Math.min(
    1000,
    Math.max(50, Math.floor(fileIndexMaxFilesPerRefresh / 4)),
  );
  const fileIndexRefreshTimeout =
    tuningTier === "good"
      ? isMultiUserProfile
        ? 900
        : 600
      : tuningTier === "medium"
        ? 480
        : 300;
  const readCache =
    tuningTier === "good"
      ? {
          backend: "memory" as const,
          capacityBytes: isMultiUserProfile
            ? 512 * 1024 * 1024
            : 256 * 1024 * 1024,
          maxFileSizeBytes: isMultiUserProfile
            ? 8 * 1024 * 1024
            : 4 * 1024 * 1024,
          ttlSecs: isMultiUserProfile ? 3600 : 2400,
        }
      : tuningTier === "medium"
        ? {
            backend: "memory" as const,
            capacityBytes: 128 * 1024 * 1024,
            maxFileSizeBytes: 2 * 1024 * 1024,
            ttlSecs: 1800,
          }
        : {
            backend: "local_dir" as const,
            capacityBytes: 8 * 1024 * 1024,
            maxFileSizeBytes: 128 * 1024,
            ttlSecs: 300,
          };
  const writeCache =
    tuningTier === "good"
      ? {
          backend: "local_dir" as const,
          capacityBytes: isMultiUserProfile
            ? 512 * 1024 * 1024
            : 256 * 1024 * 1024,
          maxFileSizeBytes: isMultiUserProfile ? 1024 * 1024 : 512 * 1024,
          flushConcurrency: isMultiUserProfile ? 4 : 3,
          flushIntervalMs: isMultiUserProfile ? 10 : 20,
          flushDeadlineSecs: isMultiUserProfile ? 600 : 480,
        }
      : tuningTier === "medium"
        ? {
            backend: "local_dir" as const,
            capacityBytes: 96 * 1024 * 1024,
            maxFileSizeBytes: 256 * 1024,
            flushConcurrency: 2,
            flushIntervalMs: 30,
            flushDeadlineSecs: 360,
          }
        : {
            backend: "local_dir" as const,
            capacityBytes: 8 * 1024 * 1024,
            maxFileSizeBytes: 64 * 1024,
            flushConcurrency: 1,
            flushIntervalMs: 80,
            flushDeadlineSecs: 180,
          };

  const domainRequestTimeoutSec =
    tuningTier === "good"
      ? isMultiUserProfile
        ? 8
        : 12
      : tuningTier === "medium"
        ? 15
        : 20;
  const domainWebhookTimeoutSec =
    tuningTier === "good"
      ? isMultiUserProfile
        ? 8
        : 10
      : tuningTier === "medium"
        ? 12
        : 15;
  const domainDnsPropagationWaitSec =
    tuningTier === "good"
      ? isMultiUserProfile
        ? 15
        : 20
      : tuningTier === "medium"
        ? 25
        : 30;
  const domainChallengePollIntervalSec = tuningTier === "good" ? 2 : 3;
  const domainChallengeMaxPollCount =
    tuningTier === "good"
      ? isMultiUserProfile
        ? 120
        : 90
      : tuningTier === "medium"
        ? 75
        : 60;
  const chatRateLimitWindowSecs = tuningTier === "good" ? 10 : 15;
  const chatRateLimitMessagesPerWindow =
    tuningTier === "good"
      ? isMultiUserProfile
        ? 80
        : 50
      : tuningTier === "medium"
        ? 40
        : 20;
  const chatWsSessionTimeoutSecs = tuningTier === "good" ? 86400 : 43200;
  const chatMaxMessageSizeBytes =
    tuningTier === "good"
      ? isMultiUserProfile
        ? 131072
        : 65536
      : tuningTier === "medium"
        ? 32768
        : 16384;
  const chatMaxGroupsPerUser =
    tuningTier === "good" ? 30 : tuningTier === "medium" ? 20 : 10;
  const chatMaxMembersPerGroup =
    tuningTier === "good"
      ? isMultiUserProfile
        ? 20000
        : 10000
      : tuningTier === "medium"
        ? 5000
        : 1000;
  const chatMaxGroupsJoinedPerUser =
    tuningTier === "good"
      ? isMultiUserProfile
        ? 400
        : 200
      : tuningTier === "medium"
        ? 150
        : 80;
  const chatMaxGuestInvitesPerUser =
    tuningTier === "good"
      ? isMultiUserProfile
        ? 100
        : 50
      : tuningTier === "medium"
        ? 30
        : 10;

  return {
    domainRequestTimeoutSec,
    domainWebhookTimeoutSec,
    domainDnsPropagationWaitSec,
    domainChallengePollIntervalSec,
    domainChallengeMaxPollCount,
    chatRateLimitWindowSecs,
    chatRateLimitMessagesPerWindow,
    chatWsSessionTimeoutSecs,
    chatMaxMessageSizeBytes,
    chatMaxGroupsPerUser,
    chatMaxMembersPerGroup,
    chatMaxGroupsJoinedPerUser,
    chatMaxGuestInvitesPerUser,
    dbMaxConnections: maxConnections,
    dbMaxConnectionsLowMemory,
    dbMaxConnectionsThroughput,
    dbMinConnections,
    sqliteCacheSize,
    sqliteMmapSize,
    cacheMemoryMB,
    kvDefaultTtlSecs: kvTtlByTier[tuningTier].defaultTtl,
    kvConditionTtlSecs: kvTtlByTier[tuningTier].conditionTtl,
    kvDashmapUpperLimitRatio: kvTtlByTier[tuningTier].dashmapUpperLimitRatio,
    notifyUnreadCountCacheTtlSecs: notifyByTier[tuningTier].unreadCountCacheTtl,
    notifyRetentionDays: notifyByTier[tuningTier].retentionDays,
    systemBackupMaxSizeMb: systemBackupByTier[tuningTier].maxBackupSizeMb,
    middleware: middlewareByTier[tuningTier],
    scheduler: schedulerByTier[tuningTier],
    bloomWarmupTuning: bloomWarmupTuningByTier[tuningTier],
    quotaCalibrationTuning: quotaCalibrationTuningByTier[tuningTier],
    fileIndexSyncTuning: fileIndexSyncTuningByTier[tuningTier],
    captchaPreheat,
    vfsBatchMaxConcurrentTasks,
    vfsBatchMaxConcurrentTasksLowMemory,
    vfsBatchMaxConcurrentTasksThroughput,
    fileIndexMaxConcurrentRefresh,
    fileIndexMaxConcurrentRefreshLowMemory,
    fileIndexMaxConcurrentRefreshThroughput,
    fileIndexMaxFilesPerRefresh,
    fileIndexMaxFilesPerRefreshLowMemory,
    fileIndexMaxFilesPerRefreshThroughput,
    fileIndexAdminConsistencyBatchSize,
    fileIndexRefreshTimeout,
    readCache,
    writeCache,
    compressionConcurrency,
    compressionConcurrencyLowMemory,
    compressionConcurrencyThroughput,
    compressionMaxCpuThreads,
    compressionMaxCpuThreadsLowMemory,
    compressionMaxCpuThreadsThroughput,
    taskRetentionDays:
      tuningTier === "good" ? 90 : tuningTier === "medium" ? 45 : 30,
    journalLogRetentionDays:
      tuningTier === "good" ? 180 : tuningTier === "medium" ? 90 : 30,
    journalLogBatchSize:
      tuningTier === "good"
        ? isMultiUserProfile
          ? 400
          : 200
        : tuningTier === "medium"
          ? 80
          : 20,
    journalLogBatchSizeLowMemory:
      tuningTier === "good"
        ? isMultiUserProfile
          ? 160
          : 120
        : tuningTier === "medium"
          ? 60
          : 12,
    journalLogBatchSizeThroughput:
      tuningTier === "good"
        ? isMultiUserProfile
          ? 600
          : 320
        : tuningTier === "medium"
          ? 130
          : 30,
    journalLogFlushIntervalMs:
      tuningTier === "good"
        ? isMultiUserProfile
          ? 300
          : 500
        : tuningTier === "medium"
          ? 900
          : 1800,
    journalLogQueueCapacityMultiplier:
      tuningTier === "good" ? 4 : tuningTier === "medium" ? 3 : 2,
    webApiUploadMaxFileSize:
      tuningTier === "good"
        ? 1024 * 1024 * 1024
        : tuningTier === "medium"
          ? 512 * 1024 * 1024
          : 256 * 1024 * 1024,
    webRefreshIntervalSec:
      tuningTier === "extreme-low" ? 300 : tuningTier === "medium" ? 60 : 30,
    logEnableAsync: tuningTier === "good",
  };
};

const ensureVfsLocalStorageDefaults = (vfsHub: ConfigObject): void => {
  const defaultConnectorName = "local-fs";
  const defaultPoolName = "default-pool";
  const defaultRoot = "{RUNTIMEDIR}/vfs";

  const connectors = vfsHub.connectors;
  if (!Array.isArray(connectors) || connectors.length === 0) {
    vfsHub.connectors = [
      {
        name: defaultConnectorName,
        driver: "fs",
        root: defaultRoot,
        enable: true,
        options: {},
      },
    ];
  }

  const pools = vfsHub.pools;
  if (!Array.isArray(pools) || pools.length === 0) {
    vfsHub.pools = [
      {
        name: defaultPoolName,
        primary_connector: defaultConnectorName,
        backup_connector: defaultConnectorName,
        enable_write_cache: false,
        enable: true,
        options: {},
      },
    ];
  }

  if (!Array.isArray(vfsHub.policies)) {
    vfsHub.policies = [];
  }

  const defaultPool = vfsHub.default_pool;
  if (typeof defaultPool !== "string" || defaultPool.trim().length === 0) {
    vfsHub.default_pool = defaultPoolName;
  }
};

const toStringValue = (value: unknown, fallback: string): string => {
  return typeof value === "string" ? value : fallback;
};

const nonEmptyString = (value: string, fallback: string): string => {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
};

const toNumberString = (value: unknown, fallback: string): string => {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : fallback;
};

const toBooleanValue = (value: unknown, fallback: boolean): boolean => {
  return typeof value === "boolean" ? value : fallback;
};

export const parsePostgresDsn = (
  dsn: string,
): Pick<
  FriendlyDraft,
  "dbHost" | "dbPort" | "dbUser" | "dbPass" | "dbName"
> => {
  const match = dsn.match(
    /^postgres:\/\/(?:([^:\/?#@]*)(?::([^@\/?#]*))?@)?([^:\/?#]+)?(?::(\d+))?\/([^?#]+)$/i,
  );
  if (!match) {
    return {
      dbHost: defaultDraft.dbHost,
      dbPort: defaultDraft.dbPort,
      dbUser: defaultDraft.dbUser,
      dbPass: defaultDraft.dbPass,
      dbName: defaultDraft.dbName,
    };
  }
  return {
    dbUser: decodeURIComponent(match[1] || defaultDraft.dbUser),
    dbPass: decodeURIComponent(match[2] || defaultDraft.dbPass),
    dbHost: match[3] || defaultDraft.dbHost,
    dbPort: match[4] || defaultDraft.dbPort,
    dbName: decodeURIComponent(match[5] || defaultDraft.dbName),
  };
};

export const buildPostgresDsn = (draft: FriendlyDraft): string => {
  const dbUser = nonEmptyString(draft.dbUser, defaultDraft.dbUser);
  const dbPass = nonEmptyString(draft.dbPass, defaultDraft.dbPass);
  const dbHost = nonEmptyString(draft.dbHost, defaultDraft.dbHost);
  const dbPort = nonEmptyString(draft.dbPort, defaultDraft.dbPort);
  const dbName = nonEmptyString(draft.dbName, defaultDraft.dbName);
  const auth =
    dbUser || dbPass
      ? `${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPass)}@`
      : "";
  return `postgres://${auth}${dbHost}:${dbPort}/${encodeURIComponent(dbName)}`;
};

export const parseSqlitePath = (dsn: string): string => {
  if (dsn.startsWith("sqlite://")) {
    return dsn.slice("sqlite://".length) || defaultDraft.sqlitePath;
  }
  if (dsn.startsWith("sqlite:")) {
    return dsn.slice("sqlite:".length) || defaultDraft.sqlitePath;
  }
  return defaultDraft.sqlitePath;
};

export const buildSqliteDsn = (path: string): string => {
  const sqlitePath = nonEmptyString(path, defaultDraft.sqlitePath);
  return `sqlite://${sqlitePath}`;
};

export const parseRedisUrl = (
  url: string,
): Pick<
  FriendlyDraft,
  "cacheHost" | "cachePort" | "cacheUser" | "cachePass" | "cacheUseTls"
> => {
  const match = url.match(
    /^(rediss?):\/\/(?:([^:\/?#@]*)(?::([^@\/?#]*))?@)?([^:\/?#]+)?(?::(\d+))?/i,
  );
  if (!match) {
    return {
      cacheHost: defaultDraft.cacheHost,
      cachePort: defaultDraft.cachePort,
      cacheUser: defaultDraft.cacheUser,
      cachePass: defaultDraft.cachePass,
      cacheUseTls: defaultDraft.cacheUseTls,
    };
  }
  const scheme = match[1] ?? "redis";
  return {
    cacheUseTls: scheme.toLowerCase() === "rediss",
    cacheUser: decodeURIComponent(match[2] || ""),
    cachePass: decodeURIComponent(match[3] || ""),
    cacheHost: match[4] || defaultDraft.cacheHost,
    cachePort: match[5] || defaultDraft.cachePort,
  };
};

export const getPresetByTier = (tier: PerformanceTier): PerformancePreset => {
  const matched = PERFORMANCE_PRESETS.find((preset) => preset.tier === tier);
  if (matched) {
    return matched;
  }
  const fallback = PERFORMANCE_PRESETS.at(-1);
  if (fallback) {
    return fallback;
  }
  throw new Error("PERFORMANCE_PRESETS must contain at least one item");
};

export const buildRedisUrl = (draft: FriendlyDraft): string => {
  const scheme = draft.cacheUseTls ? "rediss" : "redis";
  const cacheHost = nonEmptyString(draft.cacheHost, defaultDraft.cacheHost);
  const cachePort = nonEmptyString(draft.cachePort, defaultDraft.cachePort);
  const cacheUser = draft.cacheUser.trim();
  const cachePass = nonEmptyString(draft.cachePass, defaultDraft.cachePass);
  const userEncoded = encodeURIComponent(cacheUser);
  const passEncoded = encodeURIComponent(cachePass);
  const auth = cacheUser || cachePass ? `${userEncoded}:${passEncoded}@` : "";
  return `${scheme}://${auth}${cacheHost}:${cachePort}`;
};

const normalizeRuntimeOs = (
  input?: string,
): "linux" | "windows" | "macos" | "freebsd" | "unknown" => {
  const value = (input ?? "").trim().toLowerCase();
  if (value === "linux") return "linux";
  if (value === "windows" || value === "win32") return "windows";
  if (value === "macos" || value === "darwin" || value === "mac")
    return "macos";
  if (value === "freebsd") return "freebsd";
  return "unknown";
};

const inferClientRuntimeOs = ():
  | "linux"
  | "windows"
  | "macos"
  | "freebsd"
  | "unknown" => {
  if (typeof navigator === "undefined") {
    return "unknown";
  }
  const platform = getNavigatorPlatformSource().toLowerCase();
  if (platform.includes("linux")) return "linux";
  if (platform.includes("win")) return "windows";
  if (platform.includes("mac") || platform.includes("darwin")) return "macos";
  if (platform.includes("freebsd")) return "freebsd";
  return "unknown";
};

export const recommendedAllocatorPolicyForRuntime = (
  runtimeOs?: string | undefined,
): FriendlyDraft["allocatorPolicy"] => {
  const normalized = normalizeRuntimeOs(runtimeOs);
  if (normalized === "linux") {
    return "jemalloc";
  }
  if (
    normalized === "windows" ||
    normalized === "macos" ||
    normalized === "freebsd"
  ) {
    return "mimalloc";
  }
  const inferred = inferClientRuntimeOs();
  return inferred === "linux" ? "jemalloc" : "mimalloc";
};

export const parseConfig = (
  content: string,
  parseToml: (source: string) => unknown,
): { value: ConfigObject | null; error: string | null } => {
  try {
    const parsed = parseToml(content);
    if (!isRecord(parsed)) {
      return { value: null, error: "TOML root must be an object" };
    }
    return { value: parsed, error: null };
  } catch (error) {
    return {
      value: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export const buildDraftFromConfig = (
  config: ConfigObject,
  fallbackPolicy: FriendlyDraft["allocatorPolicy"],
  suggestedTemplate: PerformanceTemplateId | null = null,
): FriendlyDraft => {
  const database = isRecord(config.database) ? config.database : {};
  const postgresConfig = isRecord(database.postgres_config)
    ? database.postgres_config
    : {};
  const sqliteConfig = isRecord(database.sqlite_config)
    ? database.sqlite_config
    : {};
  const kvHub = isRecord(config.fast_kv_storage_hub)
    ? config.fast_kv_storage_hub
    : {};
  const userCenter = isRecord(config.user_center) ? config.user_center : {};
  const extensionManager = isRecord(config.extension_manager)
    ? config.extension_manager
    : {};
  const plus = isRecord(extensionManager.plus) ? extensionManager.plus : {};
  const captchaCode = isRecord(config.captcha_code) ? config.captcha_code : {};
  const memoryAllocator = isRecord(config.memory_allocator)
    ? config.memory_allocator
    : {};
  const graphicCacheSize =
    typeof captchaCode.graphic_cache_size === "number"
      ? captchaCode.graphic_cache_size
      : 100;
  const maxGenConcurrency =
    typeof captchaCode.max_gen_concurrency === "number"
      ? captchaCode.max_gen_concurrency
      : 8;
  const captchaPreheatMode: CaptchaPreheatMode =
    graphicCacheSize <= 50 && maxGenConcurrency <= 2
      ? "memory"
      : graphicCacheSize >= 200 || maxGenConcurrency >= 6
        ? "throughput"
        : "balanced";

  const databaseTypeRaw = toStringValue(
    database.db_type,
    defaultDraft.databaseType,
  );
  const databaseType: DatabaseType =
    databaseTypeRaw === "sqlite" ? "sqlite" : "postgres";
  const postgresDsn = toStringValue(
    postgresConfig.database_dsn,
    defaultDraft.postgresDsn,
  );
  const sqliteDsn = toStringValue(
    sqliteConfig.database_dsn,
    defaultDraft.sqliteDsn,
  );
  const dbFields = parsePostgresDsn(postgresDsn);
  const sqlitePath = parseSqlitePath(sqliteDsn);

  const cacheRedisUrl = toStringValue(
    kvHub.redis_url,
    defaultDraft.cacheRedisUrl,
  );
  const cacheFields = parseRedisUrl(cacheRedisUrl);

  const allocatorPolicyValue = toStringValue(
    memoryAllocator.policy,
    fallbackPolicy,
  ).toLowerCase();
  const allocatorPolicy: FriendlyDraft["allocatorPolicy"] =
    allocatorPolicyValue === "system"
      ? "system"
      : allocatorPolicyValue === "mimalloc"
        ? "mimalloc"
        : allocatorPolicyValue === "jemalloc"
          ? "jemalloc"
          : fallbackPolicy;

  const allocatorProfileValue = toStringValue(
    memoryAllocator.profile,
    defaultDraft.allocatorProfile,
  ).toLowerCase();
  const allocatorProfile: FriendlyDraft["allocatorProfile"] =
    allocatorProfileValue === "low_memory"
      ? "low_memory"
      : allocatorProfileValue === "throughput"
        ? "throughput"
        : "balanced";

  const templateSelection = performanceTemplateToSelection(
    suggestedTemplate ?? "lightweight",
  );

  return {
    performanceTier: templateSelection.performanceTier,
    loadProfile: templateSelection.loadProfile,
    databaseType,
    captchaPreheatMode,
    postgresDsn,
    sqliteDsn,
    dbHost: dbFields.dbHost,
    dbPort: dbFields.dbPort,
    dbUser: dbFields.dbUser,
    dbPass: dbFields.dbPass,
    dbName: dbFields.dbName,
    sqlitePath,
    dbHealthTimeoutSeconds: toNumberString(
      database.health_check_timeout_seconds,
      defaultDraft.dbHealthTimeoutSeconds,
    ),
    cacheType: toStringValue(kvHub.kv_type, defaultDraft.cacheType),
    cacheRedisUrl,
    cacheHost: cacheFields.cacheHost,
    cachePort: cacheFields.cachePort,
    cacheUser: cacheFields.cacheUser,
    cachePass: cacheFields.cachePass,
    cacheUseTls: cacheFields.cacheUseTls,
    enableRegistration: toBooleanValue(
      userCenter.enable_registration,
      defaultDraft.enableRegistration,
    ),
    plusEnabled: toBooleanValue(plus.enabled, defaultDraft.plusEnabled),
    plusCaptureLogs: toBooleanValue(
      plus.capture_logs,
      defaultDraft.plusCaptureLogs,
    ),
    captchaCodeLength: toNumberString(
      captchaCode.code_length,
      defaultDraft.captchaCodeLength,
    ),
    captchaExpiresIn: toNumberString(
      captchaCode.expires_in,
      defaultDraft.captchaExpiresIn,
    ),
    allocatorPolicy,
    allocatorProfile,
  };
};

export const applyDraftToConfig = (
  base: ConfigObject,
  draft: FriendlyDraft,
  recommendedPolicy: FriendlyDraft["allocatorPolicy"],
): ConfigObject => {
  const next = deepClone(base);
  const database = ensureRecord(next, "database");
  const postgresConfig = ensureRecord(database, "postgres_config");
  const sqliteConfig = ensureRecord(database, "sqlite_config");
  const kvHub = ensureRecord(next, "fast_kv_storage_hub");
  const userCenter = ensureRecord(next, "user_center");
  const extensionManager = ensureRecord(next, "extension_manager");
  const plus = ensureRecord(extensionManager, "plus");
  const captchaCode = ensureRecord(next, "captcha_code");
  const memoryAllocator = ensureRecord(next, "memory_allocator");

  database.db_type = draft.databaseType;
  postgresConfig.database_dsn = nonEmptyString(
    draft.postgresDsn,
    defaultDraft.postgresDsn,
  );
  sqliteConfig.database_dsn = nonEmptyString(
    draft.sqliteDsn,
    defaultDraft.sqliteDsn,
  );

  const healthTimeout = Number.parseInt(draft.dbHealthTimeoutSeconds, 10);
  database.health_check_timeout_seconds =
    Number.isFinite(healthTimeout) && healthTimeout > 0
      ? healthTimeout
      : Number.parseInt(defaultDraft.dbHealthTimeoutSeconds, 10);

  kvHub.kv_type = nonEmptyString(draft.cacheType, defaultDraft.cacheType);
  kvHub.redis_url = nonEmptyString(
    draft.cacheRedisUrl,
    defaultDraft.cacheRedisUrl,
  );

  userCenter.enable_registration = draft.enableRegistration;
  plus.enabled = draft.plusEnabled;
  plus.capture_logs = draft.plusCaptureLogs;

  const captchaCodeLength = Number.parseInt(draft.captchaCodeLength, 10);
  captchaCode.code_length =
    Number.isFinite(captchaCodeLength) && captchaCodeLength > 0
      ? captchaCodeLength
      : Number.parseInt(defaultDraft.captchaCodeLength, 10);
  const captchaExpiresIn = Number.parseInt(draft.captchaExpiresIn, 10);
  captchaCode.expires_in =
    Number.isFinite(captchaExpiresIn) && captchaExpiresIn > 0
      ? captchaExpiresIn
      : Number.parseInt(defaultDraft.captchaExpiresIn, 10);

  memoryAllocator.policy = recommendedPolicy;
  memoryAllocator.profile = draft.allocatorProfile;

  const preset = PERFORMANCE_PRESETS.find(
    (p) => p.tier === draft.performanceTier,
  );
  if (preset) {
    const effectivePreset = resolveEffectivePreset(draft, preset);
    const effectiveFeatures = effectivePreset.features;
    const tuningPlan = buildPerformanceTuningPlan(draft, effectivePreset);
    const isLowFootprintPreset = draft.performanceTier !== "performance";
    const isPerformanceMultiUser =
      draft.performanceTier === "performance" &&
      draft.loadProfile === "high-concurrency";

    memoryAllocator.policy = recommendedPolicy;
    memoryAllocator.profile = isLowFootprintPreset
      ? "low_memory"
      : isPerformanceMultiUser
        ? "throughput"
        : "balanced";
    captchaCode.graphic_cache_size = tuningPlan.captchaPreheat.graphicCacheSize;
    captchaCode.graphic_gen_concurrency =
      tuningPlan.captchaPreheat.graphicGenConcurrency;
    captchaCode.max_gen_concurrency =
      tuningPlan.captchaPreheat.maxGenConcurrency;
    captchaCode.pool_check_interval_secs =
      tuningPlan.captchaPreheat.poolCheckIntervalSecs;
    captchaCode.emergency_fill_multiplier =
      tuningPlan.captchaPreheat.emergencyFillMultiplier;
    plus.startup_parallelism_low_memory = isLowFootprintPreset ? 1 : 2;
    plus.startup_parallelism_throughput =
      draft.performanceTier === "performance"
        ? isPerformanceMultiUser
          ? 6
          : 4
        : 2;

    if (draft.databaseType === "sqlite") {
      sqliteConfig.max_connections = tuningPlan.dbMaxConnections;
      sqliteConfig.max_connections_low_memory =
        tuningPlan.dbMaxConnectionsLowMemory;
      sqliteConfig.max_connections_throughput =
        tuningPlan.dbMaxConnectionsThroughput;
      sqliteConfig.min_connections = tuningPlan.dbMinConnections;
      sqliteConfig.cache_size = tuningPlan.sqliteCacheSize;
      sqliteConfig.temp_store = 2;
      sqliteConfig.mmap_size = tuningPlan.sqliteMmapSize;

      // Extreme-low tier targets very low-RAM devices (e.g. 32MB).
      // Force mmap off to avoid memory pressure.
      if (draft.performanceTier === "constrained") {
        sqliteConfig.mmap_size = 0;
      }
    } else {
      postgresConfig.max_connections = tuningPlan.dbMaxConnections;
      postgresConfig.max_connections_low_memory =
        tuningPlan.dbMaxConnectionsLowMemory;
      postgresConfig.max_connections_throughput =
        tuningPlan.dbMaxConnectionsThroughput;
      postgresConfig.min_connections = tuningPlan.dbMinConnections;
    }

    const dashmapMemBaseMb = Math.max(4, tuningPlan.cacheMemoryMB);
    const dashmapMemLowMb = Math.max(4, Math.floor(dashmapMemBaseMb * 0.5));
    const dashmapMemThroughputMb = Math.max(
      dashmapMemBaseMb,
      Math.floor(dashmapMemBaseMb * 1.5),
    );
    kvHub.dashmap_mem_max_bytes = dashmapMemBaseMb * 1024 * 1024;
    kvHub.dashmap_mem_max_bytes_low_memory = dashmapMemLowMb * 1024 * 1024;
    kvHub.dashmap_mem_max_bytes_throughput =
      dashmapMemThroughputMb * 1024 * 1024;
    kvHub.dashmap_mem_upper_limit_ratio = tuningPlan.kvDashmapUpperLimitRatio;
    kvHub.default_ttl = tuningPlan.kvDefaultTtlSecs;
    kvHub.condition_ttl = tuningPlan.kvConditionTtlSecs;
    if (!Array.isArray(kvHub.dashmap_indexed_prefixes)) {
      kvHub.dashmap_indexed_prefixes = [];
    }
    if (
      typeof kvHub.key_prefix !== "string" ||
      kvHub.key_prefix.trim().length === 0
    ) {
      kvHub.key_prefix = "fileuni:";
    }

    const internalNotify = ensureRecord(next, "internal_notify");
    internalNotify.unread_count_cache_ttl =
      tuningPlan.notifyUnreadCountCacheTtlSecs;
    internalNotify.retention_days = tuningPlan.notifyRetentionDays;

    const systemBackup = ensureRecord(next, "system_backup");
    systemBackup.max_backup_size_mb = tuningPlan.systemBackupMaxSizeMb;

    const middleware = ensureRecord(next, "middleware");
    const ipRateLimit = ensureRecord(middleware, "ip_rate_limit");
    ipRateLimit.window_secs = tuningPlan.middleware.ipWindowSecs;
    ipRateLimit.max_requests = tuningPlan.middleware.ipMaxRequests;

    const clientRateLimit = ensureRecord(middleware, "client_id_rate_limit");
    clientRateLimit.window_secs = tuningPlan.middleware.clientWindowSecs;
    clientRateLimit.max_requests = tuningPlan.middleware.clientMaxRequests;
    clientRateLimit.max_cid = tuningPlan.middleware.clientMaxCid;
    clientRateLimit.client_id_blacklist_enabled = false;

    const userRateLimit = ensureRecord(middleware, "user_id_rate_limit");
    userRateLimit.window_secs = tuningPlan.middleware.userWindowSecs;
    userRateLimit.max_requests = tuningPlan.middleware.userMaxRequests;
    userRateLimit.max_userid = tuningPlan.middleware.userMaxId;
    userRateLimit.user_id_blacklist_enabled = false;

    const bruteForce = ensureRecord(middleware, "brute_force");
    bruteForce.enabled = tuningPlan.middleware.bruteForceEnabled;
    bruteForce.max_failures_per_user_ip =
      tuningPlan.middleware.bruteForceMaxFailuresPerUserIp;
    bruteForce.max_failures_per_ip_global =
      tuningPlan.middleware.bruteForceMaxFailuresPerIpGlobal;
    bruteForce.lockout_secs = tuningPlan.middleware.bruteForceLockoutSecs;
    bruteForce.enable_exponential_backoff =
      tuningPlan.middleware.bruteForceBackoffEnabled;

    // Extreme-low tier targets very low-RAM devices (e.g. 32MB).
    // Force a small bloom filter capacity to reduce memory footprint.
    if (draft.performanceTier === "constrained") {
      const safeaccessGuard = ensureRecord(next, "safeaccess_guard");
      safeaccessGuard.bloom_filter_capacity = 10000;
    }

    const vfsHub = ensureRecord(next, "vfs_storage_hub");
    vfsHub.enable_webdav = effectiveFeatures.webdav;
    vfsHub.enable_sftp = effectiveFeatures.sftp;
    vfsHub.enable_ftp = effectiveFeatures.ftp;
    vfsHub.enable_s3 = effectiveFeatures.s3;
    ensureVfsLocalStorageDefaults(vfsHub);
    const readCache = ensureRecord(vfsHub, "read_cache");
    readCache.enable = false;
    readCache.backend = tuningPlan.readCache.backend;
    readCache.local_dir = "{RUNTIMEDIR}/cache/vfs-read";
    readCache.capacity_bytes = tuningPlan.readCache.capacityBytes;
    readCache.max_file_size_bytes = tuningPlan.readCache.maxFileSizeBytes;
    readCache.cache_thumbnail_paths = false;
    readCache.skip_extensions = [];
    readCache.ttl_secs = tuningPlan.readCache.ttlSecs;
    const writeCache = ensureRecord(vfsHub, "write_cache");
    writeCache.enable = false;
    writeCache.backend = tuningPlan.writeCache.backend;
    writeCache.local_dir = "{RUNTIMEDIR}/cache/vfs-write";
    writeCache.capacity_bytes = tuningPlan.writeCache.capacityBytes;
    writeCache.max_file_size_bytes = tuningPlan.writeCache.maxFileSizeBytes;
    writeCache.cache_thumbnail_paths = false;
    writeCache.skip_extensions = [];
    writeCache.flush_concurrency = tuningPlan.writeCache.flushConcurrency;
    writeCache.flush_interval_ms = tuningPlan.writeCache.flushIntervalMs;
    writeCache.flush_deadline_secs = tuningPlan.writeCache.flushDeadlineSecs;
    writeCache.abnormal_spill_dir = "{RUNTIMEDIR}/cache/vfs-write-abnormal";

    const fileCompress = ensureRecord(vfsHub, "file_compress");
    fileCompress.enable = effectiveFeatures.compression;
    fileCompress.process_manager_max_concurrency =
      tuningPlan.compressionConcurrency;
    fileCompress.process_manager_max_concurrency_low_memory =
      tuningPlan.compressionConcurrencyLowMemory;
    fileCompress.process_manager_max_concurrency_throughput =
      tuningPlan.compressionConcurrencyThroughput;
    fileCompress.max_cpu_threads = tuningPlan.compressionMaxCpuThreads;
    fileCompress.max_cpu_threads_low_memory =
      tuningPlan.compressionMaxCpuThreadsLowMemory;
    fileCompress.max_cpu_threads_throughput =
      tuningPlan.compressionMaxCpuThreadsThroughput;
    vfsHub.max_concurrent_tasks = tuningPlan.vfsBatchMaxConcurrentTasks;
    const batchOperation = ensureRecord(vfsHub, "batch_operation");
    batchOperation.max_concurrent_tasks = tuningPlan.vfsBatchMaxConcurrentTasks;
    batchOperation.max_concurrent_tasks_low_memory =
      tuningPlan.vfsBatchMaxConcurrentTasksLowMemory;
    batchOperation.max_concurrent_tasks_throughput =
      tuningPlan.vfsBatchMaxConcurrentTasksThroughput;
    const fileIndex = ensureRecord(vfsHub, "file_index");
    fileIndex.max_concurrent_refresh = tuningPlan.fileIndexMaxConcurrentRefresh;
    fileIndex.max_concurrent_refresh_low_memory =
      tuningPlan.fileIndexMaxConcurrentRefreshLowMemory;
    fileIndex.max_concurrent_refresh_throughput =
      tuningPlan.fileIndexMaxConcurrentRefreshThroughput;
    fileIndex.max_files_per_refresh = tuningPlan.fileIndexMaxFilesPerRefresh;
    fileIndex.max_files_per_refresh_low_memory =
      tuningPlan.fileIndexMaxFilesPerRefreshLowMemory;
    fileIndex.max_files_per_refresh_throughput =
      tuningPlan.fileIndexMaxFilesPerRefreshThroughput;
    fileIndex.admin_consistency_check_batch_size =
      tuningPlan.fileIndexAdminConsistencyBatchSize;
    fileIndex.refresh_timeout = tuningPlan.fileIndexRefreshTimeout;

    const taskRegistry = ensureRecord(next, "task_registry");
    const bloomWarmup = ensureRecord(taskRegistry, "bloom_filter_warmup");
    bloomWarmup.enabled = effectiveFeatures.bloomWarmup;
    bloomWarmup.cron_expression = tuningPlan.scheduler.maintenanceCron;
    const bloomWarmupTuning = ensureRecord(
      taskRegistry,
      "bloom_filter_warmup_tuning",
    );
    bloomWarmupTuning.reserve_capacity =
      tuningPlan.bloomWarmupTuning.reserveCapacity;
    bloomWarmupTuning.max_users_per_run =
      tuningPlan.bloomWarmupTuning.maxUsersPerRun;
    bloomWarmupTuning.yield_every_users =
      tuningPlan.bloomWarmupTuning.yieldEveryUsers;
    bloomWarmupTuning.sleep_ms_per_yield =
      tuningPlan.bloomWarmupTuning.sleepMsPerYield;
    const quotaCalibrationTuning = ensureRecord(
      taskRegistry,
      "quota_calibration_tuning",
    );
    quotaCalibrationTuning.max_users_per_run =
      tuningPlan.quotaCalibrationTuning.maxUsersPerRun;
    quotaCalibrationTuning.yield_every_users =
      tuningPlan.quotaCalibrationTuning.yieldEveryUsers;
    quotaCalibrationTuning.sleep_ms_per_user =
      tuningPlan.quotaCalibrationTuning.sleepMsPerUser;
    const fileIndexSyncTuning = ensureRecord(
      taskRegistry,
      "file_index_sync_tuning",
    );
    fileIndexSyncTuning.max_users_per_run =
      tuningPlan.fileIndexSyncTuning.maxUsersPerRun;
    fileIndexSyncTuning.yield_every_users =
      tuningPlan.fileIndexSyncTuning.yieldEveryUsers;
    fileIndexSyncTuning.sleep_ms_per_user =
      tuningPlan.fileIndexSyncTuning.sleepMsPerUser;
    taskRegistry.task_retention_days = tuningPlan.taskRetentionDays;

    CRITICAL_TASK_KEYS.forEach((taskName) => {
      const task = ensureRecord(taskRegistry, taskName);
      task.enabled = true;
      task.cron_expression = tuningPlan.scheduler.criticalCron;
    });

    MAINTENANCE_TASK_KEYS.forEach((taskName) => {
      const task = ensureRecord(taskRegistry, taskName);
      task.enabled = true;
      task.cron_expression = tuningPlan.scheduler.maintenanceCron;
    });

    LOW_PRIORITY_TASK_KEYS.forEach((taskName) => {
      const task = ensureRecord(taskRegistry, taskName);
      task.enabled = true;
      task.cron_expression = tuningPlan.scheduler.lowPriorityCron;
    });

    const databaseHealthCheck = ensureRecord(
      taskRegistry,
      "database_health_check",
    );
    databaseHealthCheck.enabled = true;
    databaseHealthCheck.cron_expression = tuningPlan.scheduler.healthCheckCron;

    const sftpServ = ensureRecord(next, "file_manager_serv_sftp");
    sftpServ.max_connections = effectiveFeatures.sftp
      ? draft.performanceTier === "performance"
        ? 100
        : 20
      : 1;
    sftpServ.worker_threads = effectiveFeatures.sftp
      ? draft.performanceTier === "performance"
        ? 4
        : 2
      : 1;

    const ftpServ = ensureRecord(next, "file_manager_serv_ftp");
    ftpServ.max_connections = effectiveFeatures.ftp
      ? draft.performanceTier === "performance"
        ? 100
        : 20
      : 1;

    const s3Serv = ensureRecord(next, "file_manager_serv_s3");
    s3Serv.max_connections = effectiveFeatures.s3
      ? draft.performanceTier === "performance"
        ? 100
        : 20
      : 1;

    const chatManager = ensureRecord(next, "chat_manager");
    chatManager.enabled = effectiveFeatures.chat;
    chatManager.rate_limit_window_secs = tuningPlan.chatRateLimitWindowSecs;
    chatManager.rate_limit_messages_per_window =
      tuningPlan.chatRateLimitMessagesPerWindow;
    chatManager.ws_session_timeout_secs = tuningPlan.chatWsSessionTimeoutSecs;
    chatManager.max_message_size_bytes = tuningPlan.chatMaxMessageSizeBytes;
    chatManager.max_groups_per_user = tuningPlan.chatMaxGroupsPerUser;
    chatManager.max_members_per_group = tuningPlan.chatMaxMembersPerGroup;
    chatManager.max_groups_joined_per_user =
      tuningPlan.chatMaxGroupsJoinedPerUser;
    chatManager.max_guest_invites_per_user =
      tuningPlan.chatMaxGuestInvitesPerUser;

    const domainAcmeDdns = ensureRecord(next, "domain_acme_ddns");
    domainAcmeDdns.request_timeout_sec = tuningPlan.domainRequestTimeoutSec;
    domainAcmeDdns.webhook_timeout_sec = tuningPlan.domainWebhookTimeoutSec;
    domainAcmeDdns.dns_propagation_wait_sec =
      tuningPlan.domainDnsPropagationWaitSec;
    domainAcmeDdns.challenge_poll_interval_sec =
      tuningPlan.domainChallengePollIntervalSec;
    domainAcmeDdns.challenge_max_poll_count =
      tuningPlan.domainChallengeMaxPollCount;
    const web = ensureRecord(next, "web");
    web.refresh_interval_sec = tuningPlan.webRefreshIntervalSec;

    const emailManager = ensureRecord(next, "email_manager");
    emailManager.enabled = effectiveFeatures.email;

    const journalLog = ensureRecord(next, "journal_log");
    journalLog.log_retention_days = tuningPlan.journalLogRetentionDays;
    journalLog.batch_size = tuningPlan.journalLogBatchSize;
    journalLog.batch_size_low_memory = tuningPlan.journalLogBatchSizeLowMemory;
    journalLog.batch_size_throughput = tuningPlan.journalLogBatchSizeThroughput;
    journalLog.flush_interval_ms = tuningPlan.journalLogFlushIntervalMs;
    journalLog.queue_capacity_multiplier =
      tuningPlan.journalLogQueueCapacityMultiplier;

    const fileManagerApi = ensureRecord(next, "file_manager_api");
    fileManagerApi.webapi_upload_max_file_size =
      tuningPlan.webApiUploadMaxFileSize;

    const logConfig = ensureRecord(next, "log");
    logConfig.enable_async = tuningPlan.logEnableAsync;
  }

  return next;
};

export interface ConfigQuickSettingsModalProps {
  tomlAdapter: {
    parse: (source: string) => unknown;
    stringify: (value: unknown) => string;
  };
  isOpen: boolean;
  onClose: () => void;
  content: string;
  onContentChange: (value: string) => void;
  runtimeOs?: string | undefined;
  systemHardware?: SystemHardwareInfo | null | undefined;
  initialStep?: FriendlyStep | undefined;
  onOpenLicenseManagement?: (() => void) | undefined;
  onOpenStorageConfig?: (() => void) | undefined;
  settingsCenterMode?: boolean | undefined;
  embedded?: boolean | undefined;
  showDoneAction?: boolean | undefined;
}

export const ConfigQuickSettingsModal: React.FC<
  ConfigQuickSettingsModalProps
> = ({
  tomlAdapter,
  isOpen,
  onClose,
  content,
  onContentChange,
  runtimeOs,
  systemHardware,
  initialStep,
  onOpenLicenseManagement,
  onOpenStorageConfig,
  settingsCenterMode = false,
  embedded = false,
  showDoneAction = true,
}) => {
  const { t } = useTranslation();
  const [friendlyStep, setFriendlyStep] = useState<FriendlyStep>("performance");
  const [showDetailedPreview, setShowDetailedPreview] = useState(false);
  const [showSetupAdvanced, setShowSetupAdvanced] = useState(false);
  const [isPerformanceProfilePickerOpen, setIsPerformanceProfilePickerOpen] =
    useState(false);
  const resolvedTheme = useResolvedTheme();

  const hasInitializedRef = useRef(false);

  const isDark = resolvedTheme === "dark";

  useEscapeToCloseTopLayer({
    active: isOpen && !embedded,
    enabled: true,
    onEscape: onClose,
  });

  const friendlySteps = useMemo<FriendlyStep[]>(() => {
    return ["performance", "database", "cache", "other"];
  }, []);

  useEffect(() => {
    if (!friendlySteps.includes(friendlyStep)) {
      const first = friendlySteps[0];
      if (first) {
        setFriendlyStep(first);
      }
    }
  }, [friendlyStep, friendlySteps]);

  const allocatorRecommendation = useMemo(() => {
    const normalized = normalizeRuntimeOs(runtimeOs);
    const effectiveOs =
      normalized === "unknown" ? inferClientRuntimeOs() : normalized;
    return {
      os: effectiveOs,
      policy: recommendedAllocatorPolicyForRuntime(runtimeOs),
    };
  }, [runtimeOs]);

  const suggestedTemplate = useMemo(
    () =>
      parsePerformanceTemplateId(
        systemHardware?.suggested_performance_template,
      ),
    [systemHardware?.suggested_performance_template],
  );

  const createDraft = useCallback(
    (source: string): FriendlyDraft => {
      const parsed = parseConfig(source, tomlAdapter.parse);
      if (!parsed.value) {
        return {
          ...defaultDraft,
          allocatorPolicy: allocatorRecommendation.policy,
        };
      }
      return {
        ...buildDraftFromConfig(
          parsed.value,
          allocatorRecommendation.policy,
          suggestedTemplate,
        ),
        allocatorPolicy: allocatorRecommendation.policy,
      };
    },
    [allocatorRecommendation.policy, suggestedTemplate, tomlAdapter],
  );

  const buildContent = useCallback(
    (source: string, nextDraft: FriendlyDraft): string => {
      const parsed = parseConfig(source, tomlAdapter.parse);
      const baseConfig = parsed.value ?? {};
      const normalizedDraft: FriendlyDraft = {
        ...nextDraft,
        allocatorPolicy: allocatorRecommendation.policy,
      };
      return tomlAdapter.stringify(
        applyDraftToConfig(
          baseConfig,
          normalizedDraft,
          allocatorRecommendation.policy,
        ),
      );
    },
    [allocatorRecommendation.policy, tomlAdapter],
  );

  const { draft, setDraft } = useConfigDraftBinding<FriendlyDraft>({
    active: isOpen,
    content,
    onContentChange,
    createDraft,
    buildContent,
    debounceMs: 220,
  });
  const previewDraft = useDeferredValue(draft);
  const showTechnicalChoices = !settingsCenterMode || showSetupAdvanced;
  const isExternalDatabase = draft.databaseType === "postgres";
  const isRedisLikeCache =
    draft.cacheType === "valkey" ||
    draft.cacheType === "redis" ||
    draft.cacheType === "keydb";
  const isDashmapCache = draft.cacheType === "dashmap";
  const canInspectTechnicalPreview = !settingsCenterMode || showSetupAdvanced;
  const previewIsRedisLikeCache =
    previewDraft.cacheType === "valkey" ||
    previewDraft.cacheType === "redis" ||
    previewDraft.cacheType === "keydb";

  const currentPreset = useMemo(() => {
    const base = getPresetByTier(previewDraft.performanceTier);
    const effectivePreset = resolveEffectivePreset(previewDraft, base);
    return {
      ...base,
      recommendations: {
        ...base.recommendations,
        maxConnections: effectivePreset.maxConnections,
      },
      features: effectivePreset.features,
    };
  }, [previewDraft]);

  const previewTuningPlan = useMemo(() => {
    const base = getPresetByTier(previewDraft.performanceTier);
    const effectivePreset = resolveEffectivePreset(previewDraft, base);
    return buildPerformanceTuningPlan(previewDraft, effectivePreset);
  }, [previewDraft]);

  const previewConfigItems = useMemo<ConfigPreviewItem[]>(() => {
    const items: ConfigPreviewItem[] = [];
    const pushItem = (path: string, value: string | number | boolean) => {
      items.push({ path, value: String(value) });
    };

    pushItem("database.db_type", previewDraft.databaseType);
    if (previewDraft.databaseType === "sqlite") {
      pushItem(
        "database.sqlite_config.max_connections",
        previewTuningPlan.dbMaxConnections,
      );
      pushItem(
        "database.sqlite_config.max_connections_low_memory",
        previewTuningPlan.dbMaxConnectionsLowMemory,
      );
      pushItem(
        "database.sqlite_config.max_connections_throughput",
        previewTuningPlan.dbMaxConnectionsThroughput,
      );
      pushItem(
        "database.sqlite_config.min_connections",
        previewTuningPlan.dbMinConnections,
      );
      pushItem(
        "database.sqlite_config.cache_size",
        previewTuningPlan.sqliteCacheSize,
      );
      pushItem("database.sqlite_config.temp_store", 2);
      pushItem(
        "database.sqlite_config.mmap_size",
        previewTuningPlan.sqliteMmapSize,
      );
    } else {
      pushItem(
        "database.postgres_config.max_connections",
        previewTuningPlan.dbMaxConnections,
      );
      pushItem(
        "database.postgres_config.max_connections_low_memory",
        previewTuningPlan.dbMaxConnectionsLowMemory,
      );
      pushItem(
        "database.postgres_config.max_connections_throughput",
        previewTuningPlan.dbMaxConnectionsThroughput,
      );
      pushItem(
        "database.postgres_config.min_connections",
        previewTuningPlan.dbMinConnections,
      );
    }

    pushItem(
      "fast_kv_storage_hub.kv_type",
      nonEmptyString(previewDraft.cacheType, defaultDraft.cacheType),
    );
    pushItem(
      "fast_kv_storage_hub.default_ttl",
      previewTuningPlan.kvDefaultTtlSecs,
    );
    pushItem(
      "fast_kv_storage_hub.condition_ttl",
      previewTuningPlan.kvConditionTtlSecs,
    );
    pushItem(
      "fast_kv_storage_hub.dashmap_mem_upper_limit_ratio",
      previewTuningPlan.kvDashmapUpperLimitRatio,
    );
    const previewDashmapMemBaseMb = Math.max(
      4,
      previewTuningPlan.cacheMemoryMB,
    );
    const previewDashmapMemLowMb = Math.max(
      4,
      Math.floor(previewDashmapMemBaseMb * 0.5),
    );
    const previewDashmapMemThroughputMb = Math.max(
      previewDashmapMemBaseMb,
      Math.floor(previewDashmapMemBaseMb * 1.5),
    );
    pushItem(
      "fast_kv_storage_hub.dashmap_mem_max_bytes",
      previewDashmapMemBaseMb * 1024 * 1024,
    );
    pushItem(
      "fast_kv_storage_hub.dashmap_mem_max_bytes_low_memory",
      previewDashmapMemLowMb * 1024 * 1024,
    );
    pushItem(
      "fast_kv_storage_hub.dashmap_mem_max_bytes_throughput",
      previewDashmapMemThroughputMb * 1024 * 1024,
    );
    pushItem(
      "internal_notify.unread_count_cache_ttl",
      previewTuningPlan.notifyUnreadCountCacheTtlSecs,
    );
    pushItem(
      "internal_notify.retention_days",
      previewTuningPlan.notifyRetentionDays,
    );
    pushItem(
      "system_backup.max_backup_size_mb",
      previewTuningPlan.systemBackupMaxSizeMb,
    );

    pushItem(
      "middleware.ip_rate_limit.window_secs",
      previewTuningPlan.middleware.ipWindowSecs,
    );
    pushItem(
      "middleware.ip_rate_limit.max_requests",
      previewTuningPlan.middleware.ipMaxRequests,
    );
    pushItem(
      "middleware.client_id_rate_limit.window_secs",
      previewTuningPlan.middleware.clientWindowSecs,
    );
    pushItem(
      "middleware.client_id_rate_limit.max_requests",
      previewTuningPlan.middleware.clientMaxRequests,
    );
    pushItem(
      "middleware.client_id_rate_limit.max_cid",
      previewTuningPlan.middleware.clientMaxCid,
    );
    pushItem(
      "middleware.client_id_rate_limit.client_id_blacklist_enabled",
      false,
    );
    pushItem(
      "middleware.user_id_rate_limit.window_secs",
      previewTuningPlan.middleware.userWindowSecs,
    );
    pushItem(
      "middleware.user_id_rate_limit.max_requests",
      previewTuningPlan.middleware.userMaxRequests,
    );
    pushItem(
      "middleware.user_id_rate_limit.max_userid",
      previewTuningPlan.middleware.userMaxId,
    );
    pushItem("middleware.user_id_rate_limit.user_id_blacklist_enabled", false);
    pushItem(
      "middleware.brute_force.enabled",
      previewTuningPlan.middleware.bruteForceEnabled,
    );
    pushItem(
      "middleware.brute_force.max_failures_per_user_ip",
      previewTuningPlan.middleware.bruteForceMaxFailuresPerUserIp,
    );
    pushItem(
      "middleware.brute_force.max_failures_per_ip_global",
      previewTuningPlan.middleware.bruteForceMaxFailuresPerIpGlobal,
    );
    pushItem(
      "middleware.brute_force.lockout_secs",
      previewTuningPlan.middleware.bruteForceLockoutSecs,
    );
    pushItem(
      "middleware.brute_force.enable_exponential_backoff",
      previewTuningPlan.middleware.bruteForceBackoffEnabled,
    );

    if (previewDraft.performanceTier === "constrained") {
      pushItem("safeaccess_guard.bloom_filter_capacity", 10000);
    }

    pushItem(
      "captcha_code.graphic_cache_size",
      previewTuningPlan.captchaPreheat.graphicCacheSize,
    );
    pushItem(
      "captcha_code.graphic_gen_concurrency",
      previewTuningPlan.captchaPreheat.graphicGenConcurrency,
    );
    pushItem(
      "captcha_code.max_gen_concurrency",
      previewTuningPlan.captchaPreheat.maxGenConcurrency,
    );
    pushItem(
      "captcha_code.pool_check_interval_secs",
      previewTuningPlan.captchaPreheat.poolCheckIntervalSecs,
    );
    pushItem(
      "captcha_code.emergency_fill_multiplier",
      previewTuningPlan.captchaPreheat.emergencyFillMultiplier,
    );
    pushItem("memory_allocator.policy", previewDraft.allocatorPolicy);
    pushItem("memory_allocator.profile", previewDraft.allocatorProfile);
    pushItem(
      "extension_manager.plus.startup_parallelism_low_memory",
      currentPreset.tier === "performance" ? 2 : 1,
    );
    pushItem(
      "extension_manager.plus.startup_parallelism_throughput",
      currentPreset.tier === "performance"
        ? previewDraft.loadProfile === "high-concurrency"
          ? 6
          : 4
        : 2,
    );

    pushItem("vfs_storage_hub.enable_webdav", currentPreset.features.webdav);
    pushItem("vfs_storage_hub.enable_sftp", currentPreset.features.sftp);
    pushItem("vfs_storage_hub.enable_ftp", currentPreset.features.ftp);
    pushItem("vfs_storage_hub.enable_s3", currentPreset.features.s3);
    pushItem(
      "vfs_storage_hub.max_concurrent_tasks",
      previewTuningPlan.vfsBatchMaxConcurrentTasks,
    );
    pushItem(
      "vfs_storage_hub.batch_operation.max_concurrent_tasks",
      previewTuningPlan.vfsBatchMaxConcurrentTasks,
    );
    pushItem(
      "vfs_storage_hub.batch_operation.max_concurrent_tasks_low_memory",
      previewTuningPlan.vfsBatchMaxConcurrentTasksLowMemory,
    );
    pushItem(
      "vfs_storage_hub.batch_operation.max_concurrent_tasks_throughput",
      previewTuningPlan.vfsBatchMaxConcurrentTasksThroughput,
    );
    pushItem(
      "vfs_storage_hub.file_compress.enable",
      currentPreset.features.compression,
    );
    pushItem(
      "vfs_storage_hub.file_compress.process_manager_max_concurrency",
      previewTuningPlan.compressionConcurrency,
    );
    pushItem(
      "vfs_storage_hub.file_compress.process_manager_max_concurrency_low_memory",
      previewTuningPlan.compressionConcurrencyLowMemory,
    );
    pushItem(
      "vfs_storage_hub.file_compress.process_manager_max_concurrency_throughput",
      previewTuningPlan.compressionConcurrencyThroughput,
    );
    pushItem(
      "vfs_storage_hub.file_compress.max_cpu_threads",
      previewTuningPlan.compressionMaxCpuThreads,
    );
    pushItem(
      "vfs_storage_hub.file_compress.max_cpu_threads_low_memory",
      previewTuningPlan.compressionMaxCpuThreadsLowMemory,
    );
    pushItem(
      "vfs_storage_hub.file_compress.max_cpu_threads_throughput",
      previewTuningPlan.compressionMaxCpuThreadsThroughput,
    );
    pushItem(
      "vfs_storage_hub.file_index.max_concurrent_refresh",
      previewTuningPlan.fileIndexMaxConcurrentRefresh,
    );
    pushItem(
      "vfs_storage_hub.file_index.max_concurrent_refresh_low_memory",
      previewTuningPlan.fileIndexMaxConcurrentRefreshLowMemory,
    );
    pushItem(
      "vfs_storage_hub.file_index.max_concurrent_refresh_throughput",
      previewTuningPlan.fileIndexMaxConcurrentRefreshThroughput,
    );
    pushItem(
      "vfs_storage_hub.file_index.max_files_per_refresh",
      previewTuningPlan.fileIndexMaxFilesPerRefresh,
    );
    pushItem(
      "vfs_storage_hub.file_index.max_files_per_refresh_low_memory",
      previewTuningPlan.fileIndexMaxFilesPerRefreshLowMemory,
    );
    pushItem(
      "vfs_storage_hub.file_index.max_files_per_refresh_throughput",
      previewTuningPlan.fileIndexMaxFilesPerRefreshThroughput,
    );
    pushItem(
      "vfs_storage_hub.file_index.admin_consistency_check_batch_size",
      previewTuningPlan.fileIndexAdminConsistencyBatchSize,
    );
    pushItem(
      "vfs_storage_hub.file_index.refresh_timeout",
      previewTuningPlan.fileIndexRefreshTimeout,
    );
    pushItem("vfs_storage_hub.read_cache.enable", false);
    pushItem(
      "vfs_storage_hub.read_cache.backend",
      previewTuningPlan.readCache.backend,
    );
    pushItem(
      "vfs_storage_hub.read_cache.capacity_bytes",
      previewTuningPlan.readCache.capacityBytes,
    );
    pushItem(
      "vfs_storage_hub.read_cache.max_file_size_bytes",
      previewTuningPlan.readCache.maxFileSizeBytes,
    );
    pushItem(
      "vfs_storage_hub.read_cache.ttl_secs",
      previewTuningPlan.readCache.ttlSecs,
    );
    pushItem("vfs_storage_hub.write_cache.enable", false);
    pushItem(
      "vfs_storage_hub.write_cache.backend",
      previewTuningPlan.writeCache.backend,
    );
    pushItem(
      "vfs_storage_hub.write_cache.capacity_bytes",
      previewTuningPlan.writeCache.capacityBytes,
    );
    pushItem(
      "vfs_storage_hub.write_cache.max_file_size_bytes",
      previewTuningPlan.writeCache.maxFileSizeBytes,
    );
    pushItem(
      "vfs_storage_hub.write_cache.flush_concurrency",
      previewTuningPlan.writeCache.flushConcurrency,
    );
    pushItem(
      "vfs_storage_hub.write_cache.flush_interval_ms",
      previewTuningPlan.writeCache.flushIntervalMs,
    );
    pushItem(
      "vfs_storage_hub.write_cache.flush_deadline_secs",
      previewTuningPlan.writeCache.flushDeadlineSecs,
    );

    pushItem(
      "task_registry.bloom_filter_warmup.enabled",
      currentPreset.features.bloomWarmup,
    );
    pushItem(
      "task_registry.bloom_filter_warmup.cron_expression",
      previewTuningPlan.scheduler.maintenanceCron,
    );
    pushItem(
      "task_registry.bloom_filter_warmup_tuning.reserve_capacity",
      previewTuningPlan.bloomWarmupTuning.reserveCapacity,
    );
    pushItem(
      "task_registry.bloom_filter_warmup_tuning.max_users_per_run",
      previewTuningPlan.bloomWarmupTuning.maxUsersPerRun,
    );
    pushItem(
      "task_registry.bloom_filter_warmup_tuning.yield_every_users",
      previewTuningPlan.bloomWarmupTuning.yieldEveryUsers,
    );
    pushItem(
      "task_registry.bloom_filter_warmup_tuning.sleep_ms_per_yield",
      previewTuningPlan.bloomWarmupTuning.sleepMsPerYield,
    );
    pushItem(
      "task_registry.quota_calibration_tuning.max_users_per_run",
      previewTuningPlan.quotaCalibrationTuning.maxUsersPerRun,
    );
    pushItem(
      "task_registry.quota_calibration_tuning.yield_every_users",
      previewTuningPlan.quotaCalibrationTuning.yieldEveryUsers,
    );
    pushItem(
      "task_registry.quota_calibration_tuning.sleep_ms_per_user",
      previewTuningPlan.quotaCalibrationTuning.sleepMsPerUser,
    );
    pushItem(
      "task_registry.file_index_sync_tuning.max_users_per_run",
      previewTuningPlan.fileIndexSyncTuning.maxUsersPerRun,
    );
    pushItem(
      "task_registry.file_index_sync_tuning.yield_every_users",
      previewTuningPlan.fileIndexSyncTuning.yieldEveryUsers,
    );
    pushItem(
      "task_registry.file_index_sync_tuning.sleep_ms_per_user",
      previewTuningPlan.fileIndexSyncTuning.sleepMsPerUser,
    );
    pushItem(
      "task_registry.task_retention_days",
      previewTuningPlan.taskRetentionDays,
    );
    CRITICAL_TASK_KEYS.forEach((taskName) => {
      pushItem(`task_registry.${taskName}.enabled`, true);
      pushItem(
        `task_registry.${taskName}.cron_expression`,
        previewTuningPlan.scheduler.criticalCron,
      );
    });
    MAINTENANCE_TASK_KEYS.forEach((taskName) => {
      pushItem(`task_registry.${taskName}.enabled`, true);
      pushItem(
        `task_registry.${taskName}.cron_expression`,
        previewTuningPlan.scheduler.maintenanceCron,
      );
    });
    LOW_PRIORITY_TASK_KEYS.forEach((taskName) => {
      pushItem(`task_registry.${taskName}.enabled`, true);
      pushItem(
        `task_registry.${taskName}.cron_expression`,
        previewTuningPlan.scheduler.lowPriorityCron,
      );
    });
    pushItem("task_registry.database_health_check.enabled", true);
    pushItem(
      "task_registry.database_health_check.cron_expression",
      previewTuningPlan.scheduler.healthCheckCron,
    );

    pushItem(
      "file_manager_serv_sftp.max_connections",
      currentPreset.features.sftp
        ? previewDraft.performanceTier === "performance"
          ? 100
          : 20
        : 1,
    );
    pushItem(
      "file_manager_serv_sftp.worker_threads",
      currentPreset.features.sftp
        ? previewDraft.performanceTier === "performance"
          ? 4
          : 2
        : 1,
    );
    pushItem(
      "file_manager_serv_ftp.max_connections",
      currentPreset.features.ftp
        ? previewDraft.performanceTier === "performance"
          ? 100
          : 20
        : 1,
    );
    pushItem(
      "file_manager_serv_s3.max_connections",
      currentPreset.features.s3
        ? previewDraft.performanceTier === "performance"
          ? 100
          : 20
        : 1,
    );
    pushItem("chat_manager.enabled", currentPreset.features.chat);
    pushItem(
      "chat_manager.rate_limit_window_secs",
      previewTuningPlan.chatRateLimitWindowSecs,
    );
    pushItem(
      "chat_manager.rate_limit_messages_per_window",
      previewTuningPlan.chatRateLimitMessagesPerWindow,
    );
    pushItem(
      "chat_manager.ws_session_timeout_secs",
      previewTuningPlan.chatWsSessionTimeoutSecs,
    );
    pushItem(
      "chat_manager.max_message_size_bytes",
      previewTuningPlan.chatMaxMessageSizeBytes,
    );
    pushItem(
      "chat_manager.max_groups_per_user",
      previewTuningPlan.chatMaxGroupsPerUser,
    );
    pushItem(
      "chat_manager.max_members_per_group",
      previewTuningPlan.chatMaxMembersPerGroup,
    );
    pushItem(
      "chat_manager.max_groups_joined_per_user",
      previewTuningPlan.chatMaxGroupsJoinedPerUser,
    );
    pushItem(
      "chat_manager.max_guest_invites_per_user",
      previewTuningPlan.chatMaxGuestInvitesPerUser,
    );
    pushItem(
      "domain_acme_ddns.request_timeout_sec",
      previewTuningPlan.domainRequestTimeoutSec,
    );
    pushItem(
      "domain_acme_ddns.webhook_timeout_sec",
      previewTuningPlan.domainWebhookTimeoutSec,
    );
    pushItem(
      "domain_acme_ddns.dns_propagation_wait_sec",
      previewTuningPlan.domainDnsPropagationWaitSec,
    );
    pushItem(
      "domain_acme_ddns.challenge_poll_interval_sec",
      previewTuningPlan.domainChallengePollIntervalSec,
    );
    pushItem(
      "domain_acme_ddns.challenge_max_poll_count",
      previewTuningPlan.domainChallengeMaxPollCount,
    );
    pushItem("email_manager.enabled", currentPreset.features.email);
    pushItem(
      "journal_log.log_retention_days",
      previewTuningPlan.journalLogRetentionDays,
    );
    pushItem("journal_log.batch_size", previewTuningPlan.journalLogBatchSize);
    pushItem(
      "journal_log.batch_size_low_memory",
      previewTuningPlan.journalLogBatchSizeLowMemory,
    );
    pushItem(
      "journal_log.batch_size_throughput",
      previewTuningPlan.journalLogBatchSizeThroughput,
    );
    pushItem(
      "journal_log.flush_interval_ms",
      previewTuningPlan.journalLogFlushIntervalMs,
    );
    pushItem(
      "journal_log.queue_capacity_multiplier",
      previewTuningPlan.journalLogQueueCapacityMultiplier,
    );
    pushItem(
      "file_manager_api.webapi_upload_max_file_size",
      previewTuningPlan.webApiUploadMaxFileSize,
    );
    pushItem("log.enable_async", previewTuningPlan.logEnableAsync);

    return items;
  }, [currentPreset, previewDraft, previewTuningPlan]);

  const previewGroupStats = useMemo<ConfigPreviewGroupStat[]>(() => {
    const groupLabelKeyMap: Record<string, string> = {
      database:
        "admin.config.quickSettings.performance.preview.groups.database",
      fast_kv_storage_hub:
        "admin.config.quickSettings.performance.preview.groups.cache",
      internal_notify:
        "admin.config.quickSettings.performance.preview.groups.scheduler",
      system_backup:
        "admin.config.quickSettings.performance.preview.groups.scheduler",
      middleware:
        "admin.config.quickSettings.performance.preview.groups.middleware",
      captcha_code:
        "admin.config.quickSettings.performance.preview.groups.captcha",
      memory_allocator:
        "admin.config.quickSettings.performance.preview.groups.allocator",
      vfs_storage_hub:
        "admin.config.quickSettings.performance.preview.groups.vfs",
      task_registry:
        "admin.config.quickSettings.performance.preview.groups.scheduler",
      file_manager_serv_sftp:
        "admin.config.quickSettings.performance.preview.groups.sftp",
      file_manager_serv_ftp:
        "admin.config.quickSettings.performance.preview.groups.ftp",
      file_manager_serv_s3:
        "admin.config.quickSettings.performance.preview.groups.s3",
      chat_manager:
        "admin.config.quickSettings.performance.preview.groups.chat",
      domain_acme_ddns:
        "admin.config.quickSettings.performance.preview.groups.scheduler",
      email_manager:
        "admin.config.quickSettings.performance.preview.groups.email",
    };
    const counts = new Map<string, number>();
    previewConfigItems.forEach((item) => {
      const key = item.path.split(".")[0] || "other";
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({
        key,
        labelKey:
          groupLabelKeyMap[key] ||
          "admin.config.quickSettings.performance.preview.groups.other",
        count,
      }));
  }, [previewConfigItems]);

  const previewSimpleCards = useMemo(() => {
    const sftpConnectionValue = currentPreset.features.sftp
      ? previewDraft.performanceTier === "performance"
        ? 100
        : 20
      : 1;
    const ftpConnectionValue = currentPreset.features.ftp
      ? previewDraft.performanceTier === "performance"
        ? 100
        : 20
      : 1;
    const s3ConnectionValue = currentPreset.features.s3
      ? previewDraft.performanceTier === "performance"
        ? 100
        : 20
      : 1;
    return [
      {
        label: t("admin.config.quickSettings.performance.featureS3"),
        value: currentPreset.features.s3
          ? t("admin.config.quickSettings.options.enabled")
          : t("admin.config.quickSettings.options.disabled"),
        enabled: currentPreset.features.s3,
      },
      {
        label: t("admin.config.quickSettings.performance.featureSftp"),
        value: currentPreset.features.sftp
          ? t("admin.config.quickSettings.options.enabled")
          : t("admin.config.quickSettings.options.disabled"),
        enabled: currentPreset.features.sftp,
      },
      {
        label: t("admin.config.quickSettings.performance.featureFtp"),
        value: currentPreset.features.ftp
          ? t("admin.config.quickSettings.options.enabled")
          : t("admin.config.quickSettings.options.disabled"),
        enabled: currentPreset.features.ftp,
      },
      {
        label: t("admin.config.quickSettings.performance.featureWebdav"),
        value: currentPreset.features.webdav
          ? t("admin.config.quickSettings.options.enabled")
          : t("admin.config.quickSettings.options.disabled"),
        enabled: currentPreset.features.webdav,
      },
      {
        label: t("admin.config.quickSettings.performance.featureChat"),
        value: currentPreset.features.chat
          ? t("admin.config.quickSettings.options.enabled")
          : t("admin.config.quickSettings.options.disabled"),
        enabled: currentPreset.features.chat,
      },
      {
        label: t("admin.config.quickSettings.performance.featureEmail"),
        value: currentPreset.features.email
          ? t("admin.config.quickSettings.options.enabled")
          : t("admin.config.quickSettings.options.disabled"),
        enabled: currentPreset.features.email,
      },
      {
        label: t("admin.config.quickSettings.performance.featureCompression"),
        value: currentPreset.features.compression
          ? t("admin.config.quickSettings.options.enabled")
          : t("admin.config.quickSettings.options.disabled"),
        enabled: currentPreset.features.compression,
      },
      {
        label: t("admin.config.quickSettings.performance.featureBloomWarmup"),
        value: currentPreset.features.bloomWarmup
          ? t("admin.config.quickSettings.options.enabled")
          : t("admin.config.quickSettings.options.disabled"),
        enabled: currentPreset.features.bloomWarmup,
      },
      {
        label: t("admin.config.quickSettings.performance.preview.dbPool"),
        value: `${previewTuningPlan.dbMinConnections}-${previewTuningPlan.dbMaxConnections}`,
      },
      {
        label: t("admin.config.quickSettings.performance.preview.cacheMemory"),
        value: `${previewTuningPlan.cacheMemoryMB} MB`,
      },
      {
        label: t("admin.config.quickSettings.performance.preview.ipRateLimit"),
        value: `${previewTuningPlan.middleware.ipMaxRequests}/${previewTuningPlan.middleware.ipWindowSecs}s`,
      },
      {
        label: t(
          "admin.config.quickSettings.performance.preview.clientRateLimit",
        ),
        value: `${previewTuningPlan.middleware.clientMaxRequests}/${previewTuningPlan.middleware.clientWindowSecs}s`,
      },
      {
        label: t(
          "admin.config.quickSettings.performance.preview.userRateLimit",
        ),
        value: `${previewTuningPlan.middleware.userMaxRequests}/${previewTuningPlan.middleware.userWindowSecs}s`,
      },
      {
        label: t(
          "admin.config.quickSettings.performance.preview.bruteForceLockout",
        ),
        value: `${previewTuningPlan.middleware.bruteForceLockoutSecs}s`,
      },
      {
        label: t(
          "admin.config.quickSettings.performance.preview.captchaPreheatMode",
        ),
        value: t(
          `admin.config.quickSettings.performance.preheatMode.options.${previewDraft.captchaPreheatMode}`,
        ),
        interactive: previewDraft.performanceTier !== "constrained",
        options: ["memory", "balanced", "throughput"] as CaptchaPreheatMode[],
        current: previewDraft.captchaPreheatMode,
      },
      {
        label: t(
          "admin.config.quickSettings.performance.preview.captchaPreheatPool",
        ),
        value: String(previewTuningPlan.captchaPreheat.graphicCacheSize),
      },
      {
        label: t(
          "admin.config.quickSettings.performance.preview.captchaGenConcurrency",
        ),
        value: `${previewTuningPlan.captchaPreheat.graphicGenConcurrency}/${previewTuningPlan.captchaPreheat.maxGenConcurrency}`,
      },
      {
        label: t(
          "admin.config.quickSettings.performance.preview.captchaPoolCheckInterval",
        ),
        value: `${previewTuningPlan.captchaPreheat.poolCheckIntervalSecs}s`,
      },
      {
        label: t("admin.config.quickSettings.performance.preview.criticalCron"),
        value: previewTuningPlan.scheduler.criticalCron,
      },
      {
        label: t(
          "admin.config.quickSettings.performance.preview.maintenanceCron",
        ),
        value: previewTuningPlan.scheduler.maintenanceCron,
      },
      {
        label: t(
          "admin.config.quickSettings.performance.preview.lowPriorityCron",
        ),
        value: previewTuningPlan.scheduler.lowPriorityCron,
      },
      {
        label: t(
          "admin.config.quickSettings.performance.preview.vfsConcurrency",
        ),
        value: String(previewTuningPlan.vfsBatchMaxConcurrentTasks),
      },
      {
        label: t(
          "admin.config.quickSettings.performance.preview.compressionConcurrency",
        ),
        value: String(previewTuningPlan.compressionConcurrency),
      },
      ...(currentPreset.features.sftp
        ? [
            {
              label: t(
                "admin.config.quickSettings.performance.preview.sftpMaxConnections",
              ),
              value: String(sftpConnectionValue),
            },
          ]
        : []),
      ...(currentPreset.features.ftp
        ? [
            {
              label: t(
                "admin.config.quickSettings.performance.preview.ftpMaxConnections",
              ),
              value: String(ftpConnectionValue),
            },
          ]
        : []),
      ...(currentPreset.features.s3
        ? [
            {
              label: t(
                "admin.config.quickSettings.performance.preview.s3MaxConnections",
              ),
              value: String(s3ConnectionValue),
            },
          ]
        : []),
    ];
  }, [
    currentPreset.features,
    previewDraft.captchaPreheatMode,
    previewDraft.performanceTier,
    previewTuningPlan,
    t,
  ]);

  const parsed = useMemo(() => {
    if (!isOpen) {
      return { value: null, error: null };
    }
    return parseConfig(content, tomlAdapter.parse);
  }, [content, isOpen, tomlAdapter]);
  const parseError = isOpen ? parsed.error : null;

  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
      setShowDetailedPreview(false);
      setShowSetupAdvanced(false);
      setIsPerformanceProfilePickerOpen(false);
      return;
    }

    if (!hasInitializedRef.current) {
      setFriendlyStep(initialStep ?? "performance");
      hasInitializedRef.current = true;
    }
  }, [initialStep, isOpen]);

  useEffect(() => {
    if (!isOpen || embedded || typeof document === "undefined") {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [embedded, isOpen]);

  const currentStepIndex = friendlySteps.indexOf(friendlyStep);

  const syncDraft = useCallback(
    (updater: (prev: FriendlyDraft) => FriendlyDraft) => {
      setDraft((prev) => {
        const updated = updater(prev);
        return {
          ...updated,
          allocatorPolicy: allocatorRecommendation.policy,
        };
      });
    },
    [allocatorRecommendation.policy, setDraft],
  );

  const selectPerformanceProfile = useCallback(
    (profile: LoadProfile) => {
      syncDraft((prev) =>
        applyPerformanceTemplateToDraft(
          prev,
          profile === "high-concurrency"
            ? "performance-high-concurrency"
            : "performance-low-concurrency",
        ),
      );
    },
    [syncDraft],
  );

  const databaseLabelFor = useCallback(
    (databaseType: DatabaseType) => {
      if (showTechnicalChoices) {
        return databaseType === "sqlite"
          ? t("admin.config.quickSettings.options.sqlite")
          : t("admin.config.quickSettings.options.postgres");
      }
      return databaseType === "sqlite"
        ? t("admin.config.quickSettings.setupLabels.localDatabase")
        : t("admin.config.quickSettings.setupLabels.externalDatabase");
    },
    [showTechnicalChoices, t],
  );

  const cacheLabelFor = useCallback(
    (cacheType: string) => {
      if (showTechnicalChoices) {
        const labelKeyMap: Record<string, string> = {
          valkey: "admin.config.quickSettings.options.cacheValkey",
          redis: "admin.config.quickSettings.options.cacheRedis",
          keydb: "admin.config.quickSettings.options.cacheKeydb",
          dashmap: "admin.config.quickSettings.options.cacheDashmap",
          database: "admin.config.quickSettings.options.cacheDatabase",
        };
        return t(
          labelKeyMap[cacheType] ||
            "admin.config.quickSettings.options.cacheDashmap",
        );
      }
      if (cacheType === "dashmap") {
        return t("admin.config.quickSettings.setupLabels.builtInCache");
      }
      if (cacheType === "database") {
        return t("admin.config.quickSettings.setupLabels.databaseCache");
      }
      return t("admin.config.quickSettings.setupLabels.externalCache");
    },
    [showTechnicalChoices, t],
  );

  const setupOverviewItems = useMemo(() => {
    const cacheHint = previewIsRedisLikeCache
      ? t("admin.config.quickSettings.setupHints.externalCache")
      : previewDraft.cacheType === "database"
        ? t("admin.config.quickSettings.hints.cacheNoExternalConnection")
        : t("admin.config.quickSettings.hints.cacheDashmapLightweight");

    return [
      {
        label: t("admin.config.quickSettings.steps.performance"),
        value: t(currentPreset.labelKey),
        hint: t(currentPreset.descKey),
      },
      {
        label: t("admin.config.quickSettings.steps.database"),
        value: databaseLabelFor(previewDraft.databaseType),
        hint:
          previewDraft.databaseType === "sqlite"
            ? t("admin.config.quickSettings.hints.sqliteSingleNode")
            : t("admin.config.quickSettings.setupHints.externalDatabase"),
      },
      {
        label: t("admin.config.quickSettings.steps.cache"),
        value: cacheLabelFor(previewDraft.cacheType),
        hint: cacheHint,
      },
    ];
  }, [
    cacheLabelFor,
    currentPreset.descKey,
    currentPreset.labelKey,
    databaseLabelFor,
    previewDraft.cacheType,
    previewDraft.databaseType,
    previewIsRedisLikeCache,
    t,
  ]);

  const setupSummaryCards = useMemo(() => {
    return previewSimpleCards
      .filter((card) => !("interactive" in card) || !card.interactive)
      .slice(0, 8);
  }, [previewSimpleCards]);

  const renderSetupAdvancedToggle = useCallback(() => {
    if (!settingsCenterMode) {
      return null;
    }
    return (
      <div
        className={cn(
          "mb-3 rounded-xl border px-3 py-3 sm:px-4",
          isDark
            ? "border-white/10 bg-black/20"
            : "border-slate-200 bg-slate-50",
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p
              className={cn(
                "text-sm font-black",
                isDark ? "text-slate-100" : "text-slate-900",
              )}
            >
              {t("admin.config.quickSettings.setupAdvanced.title")}
            </p>
            <p
              className={cn(
                "mt-1 text-sm leading-6",
                isDark ? "text-slate-400" : "text-slate-600",
              )}
            >
              {t("admin.config.quickSettings.setupAdvanced.desc")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSetupAdvanced((prev) => !prev)}
            className={cn(
              "h-10 rounded-lg border px-4 text-sm font-black transition-all shrink-0",
              isDark
                ? "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50 shadow-sm",
            )}
          >
            {t(
              showSetupAdvanced
                ? "admin.config.quickSettings.setupAdvanced.hide"
                : "admin.config.quickSettings.setupAdvanced.show",
            )}
          </button>
        </div>
      </div>
    );
  }, [isDark, settingsCenterMode, showSetupAdvanced, t]);

  const setupPanelClassName = cn(
    "rounded-3xl border p-4 sm:p-5 shadow-sm",
    isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white",
  );

  const setupSubPanelClassName = cn(
    "rounded-2xl border p-4",
    isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-slate-50/80",
  );

  const setupInputClassName = cn(
    "mt-1 h-11 w-full rounded-2xl border px-3 text-sm focus:outline-none focus:ring-2",
    isDark
      ? "border-white/10 bg-black/30 text-white focus:ring-cyan-500/30"
      : "border-slate-200 bg-white text-slate-900 focus:ring-cyan-500/20",
  );

  const setupChoiceClassName = (
    selected: boolean,
    accent: "cyan" | "emerald" = "cyan",
  ) =>
    cn(
      "rounded-2xl border px-3 py-3 text-left text-sm font-black transition-all",
      selected
        ? accent === "emerald"
          ? isDark
            ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-100"
            : "border-emerald-300 bg-emerald-50 text-emerald-900"
          : isDark
            ? "border-cyan-400/35 bg-cyan-500/10 text-cyan-100"
            : "border-cyan-300 bg-cyan-50 text-cyan-900"
        : isDark
          ? "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/10"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    );

  const settingsCenterModeContent = (
    <div className="space-y-4 sm:space-y-5">
      <section
        className={cn(
          "rounded-3xl border p-4 sm:p-5",
          isDark
            ? "border-emerald-500/20 bg-emerald-500/10"
            : "border-emerald-200 bg-emerald-50/90",
        )}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p
              className={cn(
                "text-sm font-black",
                isDark ? "text-emerald-100" : "text-emerald-900",
              )}
            >
              {t("admin.config.quickSettings.setupHintTitle")}
            </p>
            <p
              className={cn(
                "mt-1 text-sm leading-6",
                isDark ? "text-emerald-200/85" : "text-emerald-800",
              )}
            >
              {t("admin.config.quickSettings.setupHintDesc")}
            </p>
          </div>
        </div>
      </section>

      <section id="setup-section-performance" className={setupPanelClassName}>
        <div className="flex items-center gap-2">
          <Cpu
            size={18}
            className={isDark ? "text-cyan-300" : "text-cyan-700"}
          />
          <h4
            className={cn(
              "text-sm font-black uppercase tracking-[0.18em]",
              isDark ? "text-slate-100" : "text-slate-900",
            )}
          >
            {t("admin.config.quickSettings.steps.performance")}
          </h4>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {PERFORMANCE_PRESETS.map((preset) => {
            const selected = draft.performanceTier === preset.tier;
            return (
              <button
                key={preset.tier}
                type="button"
                onClick={() => {
                  syncDraft((prev) =>
                    applyPerformanceTemplateToDraft(
                      prev,
                      preset.tier === "performance"
                        ? "performance-low-concurrency"
                        : preset.tier,
                    ),
                  );
                  if (preset.tier === "performance") {
                    setIsPerformanceProfilePickerOpen(true);
                  }
                }}
                className={cn(
                  setupChoiceClassName(selected),
                  preset.tier === "performance" &&
                    "md:col-span-2 xl:col-span-4",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex h-2.5 w-2.5 rounded-full",
                      preset.tier === "constrained"
                        ? "bg-rose-400"
                        : preset.tier === "lightweight"
                          ? "bg-sky-400"
                          : "bg-emerald-400",
                    )}
                  />
                  <span>{t(preset.labelKey)}</span>
                </div>
                <p
                  className={cn(
                    "mt-2 text-sm leading-6 font-medium",
                    selected
                      ? ""
                      : isDark
                        ? "text-slate-300"
                        : "text-slate-600",
                  )}
                >
                  {t(preset.descKey)}
                </p>
                {preset.tier === "performance" && selected && (
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
                          `admin.config.quickSettings.performance.loadProfile.${draft.loadProfile}`,
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
            );
          })}
        </div>

        <div
          className={cn(
            "mt-4 rounded-xl border px-3 py-3 text-sm leading-6",
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
      </section>

      <section id="setup-section-storage" className={setupPanelClassName}>
        <div className="flex items-center gap-2">
          <HardDrive
            size={18}
            className={isDark ? "text-cyan-300" : "text-cyan-700"}
          />
          <h4
            className={cn(
              "text-sm font-black uppercase tracking-[0.18em]",
              isDark ? "text-slate-100" : "text-slate-900",
            )}
          >
            {t("admin.config.quickSettings.steps.database")} /{" "}
            {t("admin.config.quickSettings.steps.cache")}
          </h4>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className={setupSubPanelClassName}>
            <div
              className={cn(
                "text-xs font-black uppercase tracking-[0.18em]",
                isDark ? "text-slate-400" : "text-slate-500",
              )}
            >
              {t("admin.config.quickSettings.steps.database")}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["sqlite", "postgres"] as DatabaseType[]).map(
                (databaseType) => (
                  <button
                    key={databaseType}
                    type="button"
                    onClick={() =>
                      syncDraft((prev) => ({ ...prev, databaseType }))
                    }
                    className={setupChoiceClassName(
                      draft.databaseType === databaseType,
                    )}
                  >
                    {databaseLabelFor(databaseType)}
                  </button>
                ),
              )}
            </div>

            {draft.databaseType === "postgres" ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label
                  className={cn(
                    "text-sm font-black",
                    isDark ? "text-slate-200" : "text-slate-700",
                  )}
                >
                  {t("admin.config.quickSettings.fields.host")}
                  <input
                    className={setupInputClassName}
                    value={draft.dbHost}
                    onChange={(event) => {
                      const dbHost = event.target.value;
                      syncDraft((prev) => {
                        const next = { ...prev, dbHost };
                        next.postgresDsn = buildPostgresDsn(next);
                        return next;
                      });
                    }}
                  />
                </label>
                <label
                  className={cn(
                    "text-sm font-black",
                    isDark ? "text-slate-200" : "text-slate-700",
                  )}
                >
                  {t("admin.config.quickSettings.fields.port")}
                  <input
                    className={setupInputClassName}
                    value={draft.dbPort}
                    onChange={(event) => {
                      const dbPort = event.target.value;
                      syncDraft((prev) => {
                        const next = { ...prev, dbPort };
                        next.postgresDsn = buildPostgresDsn(next);
                        return next;
                      });
                    }}
                  />
                </label>
                <label
                  className={cn(
                    "text-sm font-black",
                    isDark ? "text-slate-200" : "text-slate-700",
                  )}
                >
                  {t("admin.config.quickSettings.fields.user")}
                  <input
                    className={setupInputClassName}
                    value={draft.dbUser}
                    onChange={(event) => {
                      const dbUser = event.target.value;
                      syncDraft((prev) => {
                        const next = { ...prev, dbUser };
                        next.postgresDsn = buildPostgresDsn(next);
                        return next;
                      });
                    }}
                  />
                </label>
                <label
                  className={cn(
                    "text-sm font-black",
                    isDark ? "text-slate-200" : "text-slate-700",
                  )}
                >
                  {t("admin.config.quickSettings.fields.password")}
                  <input
                    type="password"
                    className={setupInputClassName}
                    value={draft.dbPass}
                    onChange={(event) => {
                      const dbPass = event.target.value;
                      syncDraft((prev) => {
                        const next = { ...prev, dbPass };
                        next.postgresDsn = buildPostgresDsn(next);
                        return next;
                      });
                    }}
                  />
                </label>
                <label
                  className={cn(
                    "text-sm font-black sm:col-span-2",
                    isDark ? "text-slate-200" : "text-slate-700",
                  )}
                >
                  {t("admin.config.quickSettings.fields.databaseName")}
                  <input
                    className={setupInputClassName}
                    value={draft.dbName}
                    onChange={(event) => {
                      const dbName = event.target.value;
                      syncDraft((prev) => {
                        const next = { ...prev, dbName };
                        next.postgresDsn = buildPostgresDsn(next);
                        return next;
                      });
                    }}
                  />
                </label>
              </div>
            ) : (
              <div className="mt-4">
                <label
                  className={cn(
                    "text-sm font-black",
                    isDark ? "text-slate-200" : "text-slate-700",
                  )}
                >
                  {t("admin.config.quickSettings.fields.sqlitePath")}
                  <input
                    className={setupInputClassName}
                    value={draft.sqlitePath}
                    onChange={(event) => {
                      const sqlitePath = event.target.value;
                      syncDraft((prev) => {
                        const next = { ...prev, sqlitePath };
                        next.sqliteDsn = buildSqliteDsn(sqlitePath);
                        return next;
                      });
                    }}
                  />
                </label>
                <p
                  className={cn(
                    "mt-2 text-sm leading-6",
                    isDark ? "text-emerald-200/85" : "text-emerald-700",
                  )}
                >
                  {t("admin.config.quickSettings.hints.sqliteSingleNode")}
                </p>
              </div>
            )}
          </div>

          <div className={setupSubPanelClassName}>
            <div
              className={cn(
                "text-xs font-black uppercase tracking-[0.18em]",
                isDark ? "text-slate-400" : "text-slate-500",
              )}
            >
              {t("admin.config.quickSettings.steps.cache")}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                {
                  value: "dashmap",
                  label: cacheLabelFor("dashmap"),
                  selected: draft.cacheType === "dashmap",
                },
                {
                  value: "database",
                  label: cacheLabelFor("database"),
                  selected: draft.cacheType === "database",
                },
                {
                  value: "external",
                  label: cacheLabelFor("valkey"),
                  selected: isRedisLikeCache,
                },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    syncDraft((prev) => ({
                      ...prev,
                      cacheType:
                        option.value === "external"
                          ? prev.cacheType === "redis" ||
                            prev.cacheType === "keydb" ||
                            prev.cacheType === "valkey"
                            ? prev.cacheType
                            : "valkey"
                          : option.value,
                    }))
                  }
                  className={setupChoiceClassName(option.selected)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {isRedisLikeCache ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label
                  className={cn(
                    "text-sm font-black",
                    isDark ? "text-slate-200" : "text-slate-700",
                  )}
                >
                  {t("admin.config.quickSettings.fields.host")}
                  <input
                    className={setupInputClassName}
                    value={draft.cacheHost}
                    onChange={(event) => {
                      const cacheHost = event.target.value;
                      syncDraft((prev) => {
                        const next = { ...prev, cacheHost };
                        next.cacheRedisUrl = buildRedisUrl(next);
                        return next;
                      });
                    }}
                  />
                </label>
                <label
                  className={cn(
                    "text-sm font-black",
                    isDark ? "text-slate-200" : "text-slate-700",
                  )}
                >
                  {t("admin.config.quickSettings.fields.port")}
                  <input
                    className={setupInputClassName}
                    value={draft.cachePort}
                    onChange={(event) => {
                      const cachePort = event.target.value;
                      syncDraft((prev) => {
                        const next = { ...prev, cachePort };
                        next.cacheRedisUrl = buildRedisUrl(next);
                        return next;
                      });
                    }}
                  />
                </label>
                <label
                  className={cn(
                    "text-sm font-black",
                    isDark ? "text-slate-200" : "text-slate-700",
                  )}
                >
                  {t("admin.config.quickSettings.fields.user")}
                  <input
                    className={setupInputClassName}
                    value={draft.cacheUser}
                    onChange={(event) => {
                      const cacheUser = event.target.value;
                      syncDraft((prev) => {
                        const next = { ...prev, cacheUser };
                        next.cacheRedisUrl = buildRedisUrl(next);
                        return next;
                      });
                    }}
                  />
                </label>
                <label
                  className={cn(
                    "text-sm font-black",
                    isDark ? "text-slate-200" : "text-slate-700",
                  )}
                >
                  {t("admin.config.quickSettings.fields.password")}
                  <input
                    type="password"
                    className={setupInputClassName}
                    value={draft.cachePass}
                    onChange={(event) => {
                      const cachePass = event.target.value;
                      syncDraft((prev) => {
                        const next = { ...prev, cachePass };
                        next.cacheRedisUrl = buildRedisUrl(next);
                        return next;
                      });
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    syncDraft((prev) => {
                      const next = { ...prev, cacheUseTls: !prev.cacheUseTls };
                      next.cacheRedisUrl = buildRedisUrl(next);
                      return next;
                    });
                  }}
                  className={cn(
                    "sm:col-span-2",
                    setupChoiceClassName(draft.cacheUseTls, "emerald"),
                  )}
                >
                  {t("admin.config.quickSettings.fields.useTls")}:{" "}
                  {draft.cacheUseTls
                    ? t("admin.config.quickSettings.options.enabled")
                    : t("admin.config.quickSettings.options.disabled")}
                </button>
              </div>
            ) : (
              <p
                className={cn(
                  "mt-4 text-sm leading-6",
                  isDark ? "text-slate-300" : "text-slate-600",
                )}
              >
                {draft.cacheType === "database"
                  ? t(
                      "admin.config.quickSettings.hints.cacheNoExternalConnection",
                    )
                  : t(
                      "admin.config.quickSettings.hints.cacheDashmapLightweight",
                    )}
              </p>
            )}
          </div>
        </div>
      </section>

      <section
        id="setup-section-recommendation"
        className={setupPanelClassName}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 lg:max-w-xl">
            <div className="flex items-center gap-2">
              <Wand2
                size={18}
                className={isDark ? "text-cyan-300" : "text-cyan-700"}
              />
              <h4
                className={cn(
                  "text-sm font-black uppercase tracking-[0.18em]",
                  isDark ? "text-slate-100" : "text-slate-900",
                )}
              >
                {t(
                  "admin.config.quickSettings.performance.recommendedSettings",
                )}
              </h4>
            </div>
          </div>
          {renderSetupAdvancedToggle()}
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {setupOverviewItems.map((item) => (
            <div
              key={`${item.label}:${item.value}`}
              className={setupSubPanelClassName}
            >
              <div
                className={cn(
                  "text-xs font-black uppercase tracking-[0.18em]",
                  isDark ? "text-slate-500" : "text-slate-500",
                )}
              >
                {item.label}
              </div>
              <div
                className={cn(
                  "mt-1 text-sm font-black",
                  isDark ? "text-slate-100" : "text-slate-900",
                )}
              >
                {item.value}
              </div>
              <p
                className={cn(
                  "mt-1 text-sm leading-6",
                  isDark ? "text-slate-300" : "text-slate-600",
                )}
              >
                {item.hint}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {setupSummaryCards.map((card) => {
            const isEnabled = "enabled" in card ? card.enabled : undefined;
            return (
              <div
                key={`${card.label}:${card.value}`}
                className={setupSubPanelClassName}
              >
                <div
                  className={cn(
                    "text-xs font-black uppercase tracking-[0.18em]",
                    isDark ? "text-slate-500" : "text-slate-500",
                  )}
                >
                  {card.label}
                </div>
                <div
                  className={cn(
                    "mt-1 text-sm font-black",
                    isEnabled === undefined
                      ? isDark
                        ? "text-slate-100"
                        : "text-slate-900"
                      : isEnabled
                        ? isDark
                          ? "text-emerald-300"
                          : "text-emerald-700"
                        : isDark
                          ? "text-rose-300"
                          : "text-rose-700",
                  )}
                >
                  {card.value}
                </div>
              </div>
            );
          })}
        </div>

        {showSetupAdvanced && (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className={setupSubPanelClassName}>
              <div
                className={cn(
                  "text-xs font-black uppercase tracking-[0.18em]",
                  isDark ? "text-slate-500" : "text-slate-500",
                )}
              >
                {t("admin.config.quickSettings.setupAdvanced.show")}
              </div>
              <div className="mt-3 space-y-3">
                <label
                  className={cn(
                    "text-sm font-black",
                    isDark ? "text-slate-200" : "text-slate-700",
                  )}
                >
                  {t("admin.config.quickSettings.fields.healthTimeoutSeconds")}
                  <input
                    className={setupInputClassName}
                    value={draft.dbHealthTimeoutSeconds}
                    onChange={(event) => {
                      const value = event.target.value;
                      syncDraft((prev) => ({
                        ...prev,
                        dbHealthTimeoutSeconds: value,
                      }));
                    }}
                  />
                </label>
                {draft.databaseType === "postgres" && (
                  <label
                    className={cn(
                      "text-sm font-black",
                      isDark ? "text-slate-200" : "text-slate-700",
                    )}
                  >
                    {t("admin.config.quickSettings.fields.postgresDsn")}
                    <input
                      className={cn(setupInputClassName, "font-mono")}
                      value={draft.postgresDsn}
                      onChange={(event) => {
                        const postgresDsn = event.target.value;
                        const parsedFields = parsePostgresDsn(postgresDsn);
                        syncDraft((prev) => ({
                          ...prev,
                          postgresDsn,
                          dbHost: parsedFields.dbHost,
                          dbPort: parsedFields.dbPort,
                          dbUser: parsedFields.dbUser,
                          dbPass: parsedFields.dbPass,
                          dbName: parsedFields.dbName,
                        }));
                      }}
                    />
                  </label>
                )}
                {isRedisLikeCache && (
                  <label
                    className={cn(
                      "text-sm font-black",
                      isDark ? "text-slate-200" : "text-slate-700",
                    )}
                  >
                    {t("admin.config.quickSettings.fields.redisUrl")}
                    <input
                      className={cn(setupInputClassName, "font-mono")}
                      value={draft.cacheRedisUrl}
                      onChange={(event) => {
                        const cacheRedisUrl = event.target.value;
                        const fields = parseRedisUrl(cacheRedisUrl);
                        syncDraft((prev) => ({
                          ...prev,
                          cacheRedisUrl,
                          cacheHost: fields.cacheHost,
                          cachePort: fields.cachePort,
                          cacheUser: fields.cacheUser,
                          cachePass: fields.cachePass,
                          cacheUseTls: fields.cacheUseTls,
                        }));
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className={setupSubPanelClassName}>
              <div
                className={cn(
                  "text-xs font-black uppercase tracking-[0.18em]",
                  isDark ? "text-slate-500" : "text-slate-500",
                )}
              >
                {t("admin.config.quickSettings.steps.other")}
              </div>
              {draft.performanceTier !== "constrained" && (
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {(
                    ["memory", "balanced", "throughput"] as CaptchaPreheatMode[]
                  ).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() =>
                        syncDraft((prev) => ({
                          ...prev,
                          captchaPreheatMode: mode,
                        }))
                      }
                      className={setupChoiceClassName(
                        draft.captchaPreheatMode === mode,
                        "emerald",
                      )}
                    >
                      {t(
                        `admin.config.quickSettings.performance.preheatMode.options.${mode}`,
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {onOpenLicenseManagement && (
                  <button
                    type="button"
                    onClick={onOpenLicenseManagement}
                    className={setupChoiceClassName(false)}
                  >
                    {t("admin.config.license.title")}
                  </button>
                )}
                {onOpenStorageConfig && (
                  <button
                    type="button"
                    onClick={onOpenStorageConfig}
                    className={setupChoiceClassName(false)}
                  >
                    {t("admin.config.storage.title")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {showDoneAction && (
        <section
          className={cn(
            "rounded-3xl border px-4 py-3 sm:px-5",
            isDark
              ? "border-white/10 bg-white/[0.03]"
              : "border-slate-200 bg-white",
          )}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p
              className={cn(
                "text-sm leading-6",
                isDark ? "text-slate-300" : "text-slate-600",
              )}
            >
              {t("systemConfig.setup.admin.finalConfirmDesc")}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-primary bg-primary px-5 text-sm font-black text-white shadow-lg shadow-primary/20 transition-all hover:opacity-90"
            >
              {t("admin.config.quickSettings.actions.doneSetup")}
            </button>
          </div>
        </section>
      )}
    </div>
  );

  if (!isOpen) {
    return null;
  }

  const panelContent = (
    <>
      <div
        className={cn(
          embedded
            ? "w-full min-h-0"
            : "relative w-full max-w-6xl rounded-2xl border shadow-lg overflow-hidden flex flex-col min-h-0 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]",
          embedded
            ? "text-inherit"
            : isDark
              ? "border-white/10 bg-slate-950 text-slate-100 ring-1 ring-white/5"
              : "border-slate-300 bg-white text-slate-900",
        )}
      >
        {!embedded && (
          <div
            className={cn(
              "flex items-center justify-between gap-2 border-b px-3 py-4 sm:px-6 shrink-0",
              isDark
                ? "border-white/10 bg-slate-900/50"
                : "border-slate-200 bg-slate-50/50",
            )}
          >
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black uppercase tracking-widest truncate">
                {t("admin.config.quickSettings.title")}
              </h3>
              <p
                className={cn(
                  "text-[10px] sm:text-xs font-bold uppercase tracking-[0.1em] mt-1",
                  isDark ? "text-slate-500" : "text-slate-400",
                )}
              >
                {t("admin.config.quickSettings.subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "h-8 w-8 rounded-lg border inline-flex items-center justify-center transition-colors",
                  isDark
                    ? "border-white/15 text-slate-300 hover:bg-white/10"
                    : "border-slate-200 text-slate-600 hover:bg-slate-100",
                )}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <div
          className={cn(
            embedded
              ? "space-y-4"
              : "flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-5 space-y-4 custom-scrollbar",
          )}
        >
          {parseError && (
            <div
              className={cn(
                "rounded-xl border p-3 sm:p-4",
                isDark
                  ? "border-amber-500/30 bg-amber-500/10"
                  : "border-amber-200 bg-amber-50",
              )}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <AlertTriangle
                  size={18}
                  className={isDark ? "text-amber-300" : "text-amber-600"}
                />
                <div className="space-y-2">
                  <p
                    className={cn(
                      "text-sm font-black",
                      isDark ? "text-amber-100" : "text-amber-900",
                    )}
                  >
                    {t("admin.config.quickSettings.parseErrorTitle")}
                  </p>
                  <p
                    className={cn(
                      "text-sm sm:text-sm break-words font-mono",
                      isDark ? "text-amber-200/90" : "text-amber-800",
                    )}
                  >
                    {parseError}
                  </p>
                  <p
                    className={cn(
                      "text-sm",
                      isDark ? "text-amber-200/80" : "text-amber-700",
                    )}
                  >
                    {t("admin.config.quickSettings.parseErrorHint")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!parseError &&
            (settingsCenterMode ? (
              settingsCenterModeContent
            ) : (
              <div className="space-y-4">
                <div
                  className={cn(
                    "rounded-xl border p-2 sm:p-3",
                    isDark
                      ? "border-white/10 bg-white/[0.02]"
                      : "border-slate-300 bg-slate-100 shadow-inner",
                  )}
                >
                  <div className="flex items-center gap-1 overflow-x-auto sm:hidden">
                    {friendlySteps.map((step, index) => {
                      const active = friendlyStep === step;
                      const completed = index < currentStepIndex;
                      return (
                        <React.Fragment key={step}>
                          <button
                            type="button"
                            onClick={() => setFriendlyStep(step)}
                            className={cn(
                              "shrink-0 rounded-full border px-2.5 py-1.5 text-xs font-black transition-colors",
                              active
                                ? "border-primary bg-primary text-white"
                                : completed
                                  ? isDark
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                                  : isDark
                                    ? "border-white/10 bg-black/20 text-slate-300"
                                    : "border-slate-300 bg-white text-slate-700",
                            )}
                          >
                            {t(`admin.config.quickSettings.steps.${step}`)}
                          </button>
                          {index < friendlySteps.length - 1 && (
                            <ChevronRight
                              size={14}
                              className={
                                isDark
                                  ? "shrink-0 text-slate-500"
                                  : "shrink-0 text-slate-400"
                              }
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  <div
                    className={cn(
                      "hidden gap-2 sm:grid sm:grid-cols-3",
                      friendlySteps.length >= 5
                        ? "sm:grid-cols-5"
                        : friendlySteps.length >= 4
                          ? "sm:grid-cols-4"
                          : "sm:grid-cols-3",
                    )}
                  >
                    {friendlySteps.map((step, index) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => setFriendlyStep(step)}
                        className={cn(
                          "h-10 rounded-lg text-sm sm:text-sm font-black border transition-all shadow-sm",
                          friendlyStep === step
                            ? isDark
                              ? "bg-primary text-white border-primary"
                              : "bg-primary text-white border-primary"
                            : index < currentStepIndex
                              ? isDark
                                ? "bg-emerald-500/10 text-emerald-200 border-emerald-500/30"
                                : "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : isDark
                                ? "bg-black/20 text-slate-300 border-white/10 hover:bg-white/10"
                                : "bg-white text-slate-900 border-slate-300 hover:bg-slate-50 shadow-sm",
                        )}
                      >
                        {index + 1}.{" "}
                        {t(`admin.config.quickSettings.steps.${step}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {friendlyStep === "performance" && (
                  <section
                    className={cn(
                      "rounded-2xl border p-3 sm:p-4 shadow-sm",
                      isDark
                        ? "border-white/10 bg-white/[0.03]"
                        : "border-slate-200 bg-white",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Cpu
                        size={16}
                        className={
                          isDark ? "text-purple-300" : "text-purple-600"
                        }
                      />
                      <h4 className="text-sm sm:text-sm font-black uppercase tracking-wide">
                        {t("admin.config.quickSettings.steps.performance")}
                      </h4>
                    </div>
                    <p
                      className={cn(
                        "text-sm sm:text-sm mb-4",
                        isDark ? "text-slate-400" : "text-slate-800 font-black",
                      )}
                    >
                      {t("admin.config.quickSettings.performance.intro")}
                    </p>
                    {showTechnicalChoices && (
                      <div
                        className={cn(
                          "mb-4 rounded-lg border px-3 py-2 text-sm font-black",
                          isDark
                            ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
                            : "border-cyan-200 bg-cyan-50 text-cyan-800",
                        )}
                      >
                        {t(
                          allocatorRecommendation.policy === "jemalloc"
                            ? "admin.config.quickSettings.performance.allocatorRecommendationLinux"
                            : "admin.config.quickSettings.performance.allocatorRecommendationOthers",
                          { os: allocatorRecommendation.os },
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {PERFORMANCE_PRESETS.map((preset) => (
                        <button
                          key={preset.tier}
                          type="button"
                          onClick={() => {
                            syncDraft((prev) =>
                              applyPerformanceTemplateToDraft(
                                prev,
                                preset.tier === "performance"
                                  ? "performance-low-concurrency"
                                  : preset.tier,
                              ),
                            );
                            if (preset.tier === "performance") {
                              setIsPerformanceProfilePickerOpen(true);
                            }
                          }}
                          className={cn(
                            "relative p-3 rounded-xl border text-left transition-all",
                            preset.tier === "performance" && "sm:col-span-2",
                            draft.performanceTier === preset.tier
                              ? isDark
                                ? "border-purple-400/50 bg-purple-500/10 ring-1 ring-purple-400/30 shadow-black/40 shadow-lg"
                                : "border-purple-500 bg-purple-50 ring-1 ring-purple-200 shadow-purple-100 shadow-lg"
                              : isDark
                                ? "border-white/10 bg-black/20 hover:bg-white/5"
                                : "border-slate-200 bg-slate-50/50 hover:bg-slate-100",
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className={cn(
                                "w-3 h-3 rounded-full",
                                preset.tier === "constrained"
                                  ? "bg-red-400"
                                  : preset.tier === "lightweight"
                                    ? "bg-blue-400"
                                    : "bg-emerald-400",
                              )}
                            />
                            <span className="text-sm sm:text-sm font-black">
                              {t(preset.labelKey)}
                            </span>
                          </div>
                          <p
                            className={cn(
                              "text-sm sm:text-sm line-clamp-2",
                              isDark
                                ? "text-slate-400"
                                : "text-slate-800 font-black",
                            )}
                          >
                            {t(preset.descKey)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span
                              className={cn(
                                "text-sm px-1.5 py-0.5 rounded border font-black",
                                isDark
                                  ? "bg-white/10 text-slate-300 border-transparent"
                                  : "bg-white text-slate-700 border-slate-200",
                              )}
                            >
                              {databaseLabelFor(
                                preset.recommendations.databaseType,
                              )}
                            </span>
                            <span
                              className={cn(
                                "text-sm px-1.5 py-0.5 rounded border font-black",
                                isDark
                                  ? "bg-white/10 text-slate-300 border-transparent"
                                  : "bg-white text-slate-700 border-slate-200",
                              )}
                            >
                              {cacheLabelFor(preset.recommendations.cacheType)}
                            </span>
                          </div>
                          {preset.tier === "performance" &&
                            draft.performanceTier === "performance" && (
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
                                      isDark
                                        ? "text-slate-400"
                                        : "text-slate-500",
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
                                      `admin.config.quickSettings.performance.loadProfile.${draft.loadProfile}`,
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

                    <div
                      className={cn(
                        "mt-4 rounded-xl border px-3 py-3 text-sm leading-6",
                        isDark
                          ? "border-white/10 bg-white/[0.03] text-slate-300"
                          : "border-slate-200 bg-slate-50 text-slate-600",
                      )}
                    >
                      <div>
                        {t(
                          "admin.config.quickSettings.performance.scenarioHint.line1",
                        )}
                      </div>
                      <div className="mt-1">
                        {t(
                          "admin.config.quickSettings.performance.scenarioHint.line2",
                        )}
                      </div>
                    </div>

                    {showTechnicalChoices &&
                      draft.performanceTier === "performance" && (
                        <div
                          className={cn(
                            "mt-4 rounded-xl border p-3",
                            isDark
                              ? "border-cyan-500/30 bg-cyan-500/5"
                              : "border-cyan-200 bg-cyan-50",
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <AlertTriangle
                              size={16}
                              className={
                                isDark ? "text-cyan-300" : "text-cyan-600"
                              }
                            />
                            <div>
                              <div
                                className={cn(
                                  "text-sm font-black mb-1",
                                  isDark ? "text-cyan-200" : "text-cyan-900",
                                )}
                              >
                                {t(
                                  "admin.config.quickSettings.performance.performanceTips.title",
                                )}
                              </div>
                              <ul
                                className={cn(
                                  "text-sm space-y-1",
                                  isDark
                                    ? "text-cyan-200/80"
                                    : "text-cyan-800 font-bold",
                                )}
                              >
                                <li>
                                  •{" "}
                                  {t(
                                    "admin.config.quickSettings.performance.performanceTips.raid",
                                  )}
                                </li>
                                <li>
                                  •{" "}
                                  {t(
                                    "admin.config.quickSettings.performance.performanceTips.pgsql",
                                  )}
                                </li>
                                <li>
                                  •{" "}
                                  {t(
                                    "admin.config.quickSettings.performance.performanceTips.memory",
                                  )}
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                    <div
                      className={cn(
                        "mt-4 rounded-xl border p-3 shadow-sm",
                        isDark
                          ? "border-white/10 bg-black/20"
                          : "border-slate-200 bg-slate-50",
                      )}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Wand2 size={18} className="text-primary" />
                        <div
                          className={cn(
                            "text-sm uppercase font-black tracking-widest",
                            isDark ? "opacity-60" : "text-slate-500",
                          )}
                        >
                          {t(
                            "admin.config.quickSettings.performance.recommendedSettings",
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                        {previewSimpleCards.map((card) => (
                          <div
                            key={`${card.label}:${card.value}`}
                            className={cn(
                              "rounded-lg border px-2.5 py-2 transition-all flex flex-col",
                              isDark
                                ? "border-white/5 bg-black/30"
                                : "border-slate-200 bg-white",
                            )}
                          >
                            <div
                              className={cn(
                                "text-sm uppercase font-black mb-1.5 truncate",
                                isDark ? "text-slate-500" : "text-slate-400",
                              )}
                            >
                              {card.label}
                            </div>

                            {"interactive" in card && card.interactive ? (
                              <div className="flex flex-wrap gap-1 mt-auto">
                                {(card.options as CaptchaPreheatMode[]).map(
                                  (opt) => (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() =>
                                        syncDraft((prev) => ({
                                          ...prev,
                                          captchaPreheatMode: opt,
                                        }))
                                      }
                                      className={cn(
                                        "px-1.5 py-0.5 rounded text-sm font-black border transition-all",
                                        card.current === opt
                                          ? isDark
                                            ? "bg-primary/20 border-primary/40 text-primary"
                                            : "bg-primary text-white border-primary"
                                          : isDark
                                            ? "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                                            : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200",
                                      )}
                                    >
                                      {t(
                                        `admin.config.quickSettings.performance.preheatMode.options.${opt}`,
                                      )}
                                    </button>
                                  ),
                                )}
                              </div>
                            ) : (
                              <div
                                className={cn(
                                  "text-sm font-black mt-auto truncate",
                                  card.enabled === undefined
                                    ? isDark
                                      ? "text-slate-100"
                                      : "text-slate-900"
                                    : card.enabled
                                      ? isDark
                                        ? "text-emerald-300"
                                        : "text-emerald-700"
                                      : isDark
                                        ? "text-red-300"
                                        : "text-red-700",
                                )}
                              >
                                {card.value}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {canInspectTechnicalPreview && (
                        <div className="mt-3 flex items-center justify-between">
                          <div
                            className={cn(
                              "text-sm font-black uppercase opacity-40 shrink-0",
                              isDark ? "text-white" : "text-slate-900",
                            )}
                          >
                            {t(
                              "admin.config.quickSettings.performance.preview.totalChanges",
                              { count: previewConfigItems.length },
                            )}
                          </div>
                          <button
                            type="button"
                            className={cn(
                              "h-8 px-3 rounded-lg border text-sm font-black transition-all shadow-sm shrink-0",
                              isDark
                                ? "border-white/15 bg-white/5 hover:bg-white/10 text-slate-300"
                                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
                            )}
                            onClick={() =>
                              setShowDetailedPreview((prev) => !prev)
                            }
                          >
                            {showDetailedPreview
                              ? t(
                                  "admin.config.quickSettings.performance.preview.hideDetails",
                                )
                              : t(
                                  "admin.config.quickSettings.performance.preview.viewDetails",
                                )}
                          </button>
                        </div>
                      )}

                      {canInspectTechnicalPreview && showDetailedPreview && (
                        <div
                          className={cn(
                            "grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 mt-3 pt-3 border-t",
                            isDark ? "border-white/10" : "border-slate-200",
                          )}
                        >
                          <div
                            className={cn(
                              "rounded-lg border overflow-hidden",
                              isDark
                                ? "border-white/10 bg-black/30"
                                : "border-slate-200 bg-white",
                            )}
                          >
                            <div
                              className={cn(
                                "grid grid-cols-[1fr_auto] gap-2 border-b px-2.5 py-2 text-sm font-black uppercase tracking-wider",
                                isDark
                                  ? "border-white/10 text-slate-400 bg-white/5"
                                  : "border-slate-300 text-slate-600 bg-slate-100",
                              )}
                            >
                              <div>
                                {t(
                                  "admin.config.quickSettings.performance.preview.path",
                                )}
                              </div>
                              <div>
                                {t(
                                  "admin.config.quickSettings.performance.preview.value",
                                )}
                              </div>
                            </div>
                            <div className="max-h-80 overflow-auto custom-scrollbar">
                              {previewConfigItems.map((item) => (
                                <div
                                  key={`${item.path}:${item.value}`}
                                  className={cn(
                                    "grid grid-cols-[1fr_auto] gap-2 border-b px-2.5 py-1.5 text-sm last:border-b-0",
                                    isDark
                                      ? "border-white/10 hover:bg-white/5"
                                      : "border-slate-100 hover:bg-slate-50",
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "font-mono break-all font-bold",
                                      isDark
                                        ? "text-slate-300"
                                        : "text-slate-700",
                                    )}
                                  >
                                    {item.path}
                                  </div>
                                  <div
                                    className={cn(
                                      "font-mono font-black",
                                      isDark
                                        ? "text-cyan-300"
                                        : "text-cyan-700",
                                    )}
                                  >
                                    {item.value}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div
                            className={cn(
                              "rounded-lg border p-2.5 flex flex-col",
                              isDark
                                ? "border-white/10 bg-black/30"
                                : "border-slate-200 bg-white",
                            )}
                          >
                            <div
                              className={cn(
                                "text-sm uppercase font-black opacity-60 mb-2",
                                isDark ? "text-white" : "text-slate-500",
                              )}
                            >
                              {t(
                                "admin.config.quickSettings.performance.preview.groupStats",
                              )}
                            </div>
                            <div className="space-y-1.5">
                              {previewGroupStats.map((group) => (
                                <div
                                  key={`${group.key}:${group.count}`}
                                  className={cn(
                                    "flex items-center justify-between rounded border px-2 py-1.5 text-sm font-bold",
                                    isDark
                                      ? "border-white/10 bg-black/20 text-slate-300"
                                      : "border-slate-100 bg-slate-50 text-slate-700",
                                  )}
                                >
                                  <span>{t(group.labelKey)}</span>
                                  <span
                                    className={cn(
                                      "font-mono font-black",
                                      isDark
                                        ? "text-cyan-300"
                                        : "text-cyan-700",
                                    )}
                                  >
                                    {group.count}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {friendlyStep === "database" && (
                  <section
                    className={cn(
                      "rounded-2xl border p-3 sm:p-4 shadow-sm",
                      isDark
                        ? "border-white/10 bg-white/[0.03]"
                        : "border-slate-200 bg-white",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Settings2
                        size={16}
                        className={isDark ? "text-cyan-300" : "text-cyan-600"}
                      />
                      <h4 className="text-sm sm:text-sm font-black uppercase tracking-wide">
                        {t("admin.config.quickSettings.steps.database")}
                      </h4>
                    </div>

                    {renderSetupAdvancedToggle()}

                    <div className="mb-3">
                      <div
                        className={cn(
                          "text-sm font-black mb-2",
                          isDark ? "text-slate-300" : "text-slate-700",
                        )}
                      >
                        {t("admin.config.quickSettings.fields.dbType")}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            syncDraft((prev) => ({
                              ...prev,
                              databaseType: "postgres",
                            }))
                          }
                          className={cn(
                            "flex-1 h-10 rounded-lg border text-sm font-black transition-all",
                            draft.databaseType === "postgres"
                              ? isDark
                                ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-200"
                                : "bg-cyan-500 text-white border-cyan-600 shadow-md"
                              : isDark
                                ? "bg-black/30 border-white/15 text-slate-300 hover:bg-white/10"
                                : "bg-white border-slate-300 text-slate-900 hover:bg-slate-50 shadow-sm",
                          )}
                        >
                          {databaseLabelFor("postgres")}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            syncDraft((prev) => ({
                              ...prev,
                              databaseType: "sqlite",
                            }))
                          }
                          className={cn(
                            "flex-1 h-10 rounded-lg border text-sm font-black transition-all",
                            draft.databaseType === "sqlite"
                              ? isDark
                                ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-200"
                                : "bg-cyan-500 text-white border-cyan-600 shadow-md"
                              : isDark
                                ? "bg-black/30 border-white/15 text-slate-300 hover:bg-white/10"
                                : "bg-white border-slate-300 text-slate-900 hover:bg-slate-50 shadow-sm",
                          )}
                        >
                          {databaseLabelFor("sqlite")}
                        </button>
                      </div>
                      {draft.databaseType === "sqlite" && (
                        <p
                          className={cn(
                            "mt-2 text-sm",
                            isDark ? "text-emerald-200/90" : "text-emerald-700",
                          )}
                        >
                          {t(
                            "admin.config.quickSettings.hints.sqliteSingleNode",
                          )}
                        </p>
                      )}
                      {settingsCenterMode &&
                        isExternalDatabase &&
                        !showTechnicalChoices && (
                          <p
                            className={cn(
                              "mt-2 text-sm",
                              isDark ? "text-slate-400" : "text-slate-600",
                            )}
                          >
                            {t(
                              "admin.config.quickSettings.setupHints.externalDatabase",
                            )}
                          </p>
                        )}
                    </div>

                    {showTechnicalChoices && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label
                          className={cn(
                            "text-sm font-black",
                            isDark ? "text-slate-300" : "text-slate-700",
                          )}
                        >
                          {t(
                            "admin.config.quickSettings.fields.healthTimeoutSeconds",
                          )}
                          <input
                            className={cn(
                              "mt-1 w-full h-10 rounded-lg border px-3 text-sm transition-all focus:outline-none focus:ring-2",
                              isDark
                                ? "border-white/15 bg-black/30 text-white focus:ring-cyan-500/30"
                                : "border-slate-300 bg-white text-slate-900 focus:ring-cyan-500/20 shadow-sm",
                            )}
                            value={draft.dbHealthTimeoutSeconds}
                            onChange={(event) => {
                              const value = event.target.value;
                              syncDraft((prev) => ({
                                ...prev,
                                dbHealthTimeoutSeconds: value,
                              }));
                            }}
                          />
                        </label>
                      </div>
                    )}

                    {draft.databaseType === "postgres" ? (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label
                          className={cn(
                            "text-sm font-black",
                            isDark ? "text-slate-300" : "text-slate-700",
                          )}
                        >
                          {t("admin.config.quickSettings.fields.host")}
                          <input
                            className={cn(
                              "mt-1 w-full h-10 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2",
                              isDark
                                ? "border-white/15 bg-black/30 text-white focus:ring-cyan-500/30"
                                : "border-slate-300 bg-white text-slate-900 focus:ring-cyan-500/20 shadow-sm",
                            )}
                            value={draft.dbHost}
                            onChange={(event) => {
                              const dbHost = event.target.value;
                              syncDraft((prev) => {
                                const next = { ...prev, dbHost };
                                next.postgresDsn = buildPostgresDsn(next);
                                return next;
                              });
                            }}
                          />
                        </label>
                        <label
                          className={cn(
                            "text-sm font-black",
                            isDark ? "text-slate-300" : "text-slate-700",
                          )}
                        >
                          {t("admin.config.quickSettings.fields.port")}
                          <input
                            className={cn(
                              "mt-1 w-full h-10 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2",
                              isDark
                                ? "border-white/15 bg-black/30 text-white focus:ring-cyan-500/30"
                                : "border-slate-300 bg-white text-slate-900 focus:ring-cyan-500/20 shadow-sm",
                            )}
                            value={draft.dbPort}
                            onChange={(event) => {
                              const dbPort = event.target.value;
                              syncDraft((prev) => {
                                const next = { ...prev, dbPort };
                                next.postgresDsn = buildPostgresDsn(next);
                                return next;
                              });
                            }}
                          />
                        </label>
                        <label
                          className={cn(
                            "text-sm font-black",
                            isDark ? "text-slate-300" : "text-slate-700",
                          )}
                        >
                          {t("admin.config.quickSettings.fields.user")}
                          <input
                            className={cn(
                              "mt-1 w-full h-10 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2",
                              isDark
                                ? "border-white/15 bg-black/30 text-white focus:ring-cyan-500/30"
                                : "border-slate-300 bg-white text-slate-900 focus:ring-cyan-500/20 shadow-sm",
                            )}
                            value={draft.dbUser}
                            onChange={(event) => {
                              const dbUser = event.target.value;
                              syncDraft((prev) => {
                                const next = { ...prev, dbUser };
                                next.postgresDsn = buildPostgresDsn(next);
                                return next;
                              });
                            }}
                          />
                        </label>
                        <label
                          className={cn(
                            "text-sm font-black",
                            isDark ? "text-slate-300" : "text-slate-700",
                          )}
                        >
                          {t("admin.config.quickSettings.fields.password")}
                          <input
                            type="password"
                            className={cn(
                              "mt-1 w-full h-10 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2",
                              isDark
                                ? "border-white/15 bg-black/30 text-white focus:ring-cyan-500/30"
                                : "border-slate-300 bg-white text-slate-900 focus:ring-cyan-500/20 shadow-sm",
                            )}
                            value={draft.dbPass}
                            onChange={(event) => {
                              const dbPass = event.target.value;
                              syncDraft((prev) => {
                                const next = { ...prev, dbPass };
                                next.postgresDsn = buildPostgresDsn(next);
                                return next;
                              });
                            }}
                          />
                        </label>
                        <label
                          className={cn(
                            "text-sm font-black sm:col-span-2",
                            isDark ? "text-slate-300" : "text-slate-700",
                          )}
                        >
                          {t("admin.config.quickSettings.fields.databaseName")}
                          <input
                            className={cn(
                              "mt-1 w-full h-10 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2",
                              isDark
                                ? "border-white/15 bg-black/30 text-white focus:ring-cyan-500/30"
                                : "border-slate-300 bg-white text-slate-900 focus:ring-cyan-500/20 shadow-sm",
                            )}
                            value={draft.dbName}
                            onChange={(event) => {
                              const dbName = event.target.value;
                              syncDraft((prev) => {
                                const next = { ...prev, dbName };
                                next.postgresDsn = buildPostgresDsn(next);
                                return next;
                              });
                            }}
                          />
                        </label>
                        {showTechnicalChoices && (
                          <label
                            className={cn(
                              "text-sm font-black sm:col-span-2",
                              isDark ? "text-slate-300" : "text-slate-700",
                            )}
                          >
                            {t("admin.config.quickSettings.fields.postgresDsn")}
                            <input
                              className={cn(
                                "mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono focus:outline-none focus:ring-2",
                                isDark
                                  ? "border-cyan-400/30 bg-black/40 text-cyan-200 focus:ring-cyan-500/30"
                                  : "border-cyan-300 bg-cyan-50 text-cyan-900 focus:ring-cyan-500/20",
                              )}
                              value={draft.postgresDsn}
                              onChange={(event) => {
                                const postgresDsn = event.target.value;
                                const parsedFields =
                                  parsePostgresDsn(postgresDsn);
                                syncDraft((prev) => ({
                                  ...prev,
                                  postgresDsn,
                                  dbHost: parsedFields.dbHost,
                                  dbPort: parsedFields.dbPort,
                                  dbUser: parsedFields.dbUser,
                                  dbPass: parsedFields.dbPass,
                                  dbName: parsedFields.dbName,
                                }));
                              }}
                            />
                          </label>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 grid grid-cols-1 gap-3">
                        <label
                          className={cn(
                            "text-sm font-black",
                            isDark ? "text-slate-300" : "text-slate-700",
                          )}
                        >
                          {t("admin.config.quickSettings.fields.sqlitePath")}
                          <input
                            className={cn(
                              "mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono focus:outline-none focus:ring-2",
                              isDark
                                ? "border-white/15 bg-black/30 text-white focus:ring-cyan-500/30"
                                : "border-slate-300 bg-white text-slate-900 focus:ring-cyan-500/20 shadow-sm",
                            )}
                            value={draft.sqlitePath}
                            onChange={(event) => {
                              const sqlitePath = event.target.value;
                              syncDraft((prev) => {
                                const next = { ...prev, sqlitePath };
                                next.sqliteDsn = buildSqliteDsn(sqlitePath);
                                return next;
                              });
                            }}
                          />
                        </label>
                        <p
                          className={cn(
                            "text-sm",
                            isDark ? "text-slate-400" : "text-slate-600",
                          )}
                        >
                          {t("admin.config.quickSettings.hints.sqlitePathOnly")}
                        </p>
                      </div>
                    )}
                  </section>
                )}

                {friendlyStep === "cache" && (
                  <section
                    className={cn(
                      "rounded-2xl border p-3 sm:p-4 shadow-sm",
                      isDark
                        ? "border-white/10 bg-white/[0.03]"
                        : "border-slate-200 bg-white",
                    )}
                  >
                    <h4 className="text-sm sm:text-sm font-black uppercase tracking-wide mb-3">
                      {t("admin.config.quickSettings.steps.cache")}
                    </h4>
                    {renderSetupAdvancedToggle()}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <div
                          className={cn(
                            "text-sm font-black mb-2",
                            isDark ? "text-slate-300" : "text-slate-700",
                          )}
                        >
                          {t("admin.config.quickSettings.fields.cacheType")}
                        </div>
                        <div
                          className={cn(
                            "grid gap-2",
                            showTechnicalChoices
                              ? "grid-cols-2 md:grid-cols-5"
                              : "grid-cols-1 sm:grid-cols-3",
                          )}
                        >
                          {(showTechnicalChoices
                            ? [
                                {
                                  value: "valkey",
                                  label: cacheLabelFor("valkey"),
                                  selected: draft.cacheType === "valkey",
                                },
                                {
                                  value: "redis",
                                  label: cacheLabelFor("redis"),
                                  selected: draft.cacheType === "redis",
                                },
                                {
                                  value: "keydb",
                                  label: cacheLabelFor("keydb"),
                                  selected: draft.cacheType === "keydb",
                                },
                                {
                                  value: "dashmap",
                                  label: cacheLabelFor("dashmap"),
                                  selected: draft.cacheType === "dashmap",
                                },
                                {
                                  value: "database",
                                  label: cacheLabelFor("database"),
                                  selected: draft.cacheType === "database",
                                },
                              ]
                            : [
                                {
                                  value: "dashmap",
                                  label: cacheLabelFor("dashmap"),
                                  selected: draft.cacheType === "dashmap",
                                },
                                {
                                  value: "database",
                                  label: cacheLabelFor("database"),
                                  selected: draft.cacheType === "database",
                                },
                                {
                                  value: "external",
                                  label: cacheLabelFor("valkey"),
                                  selected: isRedisLikeCache,
                                },
                              ]
                          ).map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                syncDraft((prev) => ({
                                  ...prev,
                                  cacheType:
                                    option.value === "external"
                                      ? prev.cacheType === "redis" ||
                                        prev.cacheType === "keydb" ||
                                        prev.cacheType === "valkey"
                                        ? prev.cacheType
                                        : "valkey"
                                      : option.value,
                                }))
                              }
                              className={cn(
                                "h-10 rounded-lg border text-sm font-black transition-all",
                                option.selected
                                  ? isDark
                                    ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-200"
                                    : "bg-cyan-500 text-white border-cyan-600 shadow-md"
                                  : isDark
                                    ? "bg-black/30 border-white/15 text-slate-300 hover:bg-white/10"
                                    : "bg-white border-slate-300 text-slate-900 hover:bg-slate-50 shadow-sm",
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                        {isDashmapCache && (
                          <p
                            className={cn(
                              "mt-2 text-sm",
                              isDark
                                ? "text-emerald-200/90"
                                : "text-emerald-700",
                            )}
                          >
                            {t(
                              "admin.config.quickSettings.hints.cacheDashmapLightweight",
                            )}
                          </p>
                        )}
                        {settingsCenterMode &&
                          isRedisLikeCache &&
                          !showTechnicalChoices && (
                            <p
                              className={cn(
                                "mt-2 text-sm",
                                isDark ? "text-slate-400" : "text-slate-600",
                              )}
                            >
                              {t(
                                "admin.config.quickSettings.setupHints.externalCache",
                              )}
                            </p>
                          )}
                      </div>
                      {isRedisLikeCache && (
                        <label
                          className={cn(
                            "text-sm font-black",
                            isDark ? "text-slate-300" : "text-slate-700",
                          )}
                        >
                          {t("admin.config.quickSettings.fields.useTls")}
                          <button
                            type="button"
                            className={cn(
                              "mt-1 h-10 w-full rounded-lg border font-black transition-all shadow-sm",
                              draft.cacheUseTls
                                ? isDark
                                  ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
                                  : "bg-emerald-500 text-white border-emerald-600"
                                : isDark
                                  ? "bg-black/30 border-white/15 text-slate-200"
                                  : "bg-white border-slate-300 text-slate-900 shadow-sm",
                            )}
                            onClick={() => {
                              syncDraft((prev) => {
                                const next = {
                                  ...prev,
                                  cacheUseTls: !prev.cacheUseTls,
                                };
                                next.cacheRedisUrl = buildRedisUrl(next);
                                return next;
                              });
                            }}
                          >
                            {draft.cacheUseTls
                              ? t("admin.config.quickSettings.options.enabled")
                              : t(
                                  "admin.config.quickSettings.options.disabled",
                                )}
                          </button>
                        </label>
                      )}
                    </div>
                    {isRedisLikeCache ? (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label
                          className={cn(
                            "text-sm font-black",
                            isDark ? "text-slate-300" : "text-slate-700",
                          )}
                        >
                          {t("admin.config.quickSettings.fields.host")}
                          <input
                            className={cn(
                              "mt-1 w-full h-10 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2",
                              isDark
                                ? "border-white/15 bg-black/30 text-white focus:ring-cyan-500/30"
                                : "border-slate-300 bg-white text-slate-900 focus:ring-cyan-500/20 shadow-sm",
                            )}
                            value={draft.cacheHost}
                            onChange={(event) => {
                              const cacheHost = event.target.value;
                              syncDraft((prev) => {
                                const next = { ...prev, cacheHost };
                                next.cacheRedisUrl = buildRedisUrl(next);
                                return next;
                              });
                            }}
                          />
                        </label>
                        <label
                          className={cn(
                            "text-sm font-black",
                            isDark ? "text-slate-300" : "text-slate-700",
                          )}
                        >
                          {t("admin.config.quickSettings.fields.port")}
                          <input
                            className={cn(
                              "mt-1 w-full h-10 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2",
                              isDark
                                ? "border-white/15 bg-black/30 text-white focus:ring-cyan-500/30"
                                : "border-slate-300 bg-white text-slate-900 focus:ring-cyan-500/20 shadow-sm",
                            )}
                            value={draft.cachePort}
                            onChange={(event) => {
                              const cachePort = event.target.value;
                              syncDraft((prev) => {
                                const next = { ...prev, cachePort };
                                next.cacheRedisUrl = buildRedisUrl(next);
                                return next;
                              });
                            }}
                          />
                        </label>
                        <label
                          className={cn(
                            "text-sm font-black",
                            isDark ? "text-slate-300" : "text-slate-700",
                          )}
                        >
                          {t("admin.config.quickSettings.fields.user")}
                          <input
                            className={cn(
                              "mt-1 w-full h-10 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2",
                              isDark
                                ? "border-white/15 bg-black/30 text-white focus:ring-cyan-500/30"
                                : "border-slate-300 bg-white text-slate-900 focus:ring-cyan-500/20 shadow-sm",
                            )}
                            value={draft.cacheUser}
                            onChange={(event) => {
                              const cacheUser = event.target.value;
                              syncDraft((prev) => {
                                const next = { ...prev, cacheUser };
                                next.cacheRedisUrl = buildRedisUrl(next);
                                return next;
                              });
                            }}
                          />
                        </label>
                        <label
                          className={cn(
                            "text-sm font-black",
                            isDark ? "text-slate-300" : "text-slate-700",
                          )}
                        >
                          {t("admin.config.quickSettings.fields.password")}
                          <input
                            type="password"
                            className={cn(
                              "mt-1 w-full h-10 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2",
                              isDark
                                ? "border-white/15 bg-black/30 text-white focus:ring-cyan-500/30"
                                : "border-slate-300 bg-white text-slate-900 focus:ring-cyan-500/20 shadow-sm",
                            )}
                            value={draft.cachePass}
                            onChange={(event) => {
                              const cachePass = event.target.value;
                              syncDraft((prev) => {
                                const next = { ...prev, cachePass };
                                next.cacheRedisUrl = buildRedisUrl(next);
                                return next;
                              });
                            }}
                          />
                        </label>
                        {showTechnicalChoices && (
                          <label
                            className={cn(
                              "text-sm font-black sm:col-span-2",
                              isDark ? "text-slate-300" : "text-slate-700",
                            )}
                          >
                            {t("admin.config.quickSettings.fields.redisUrl")}
                            <input
                              className={cn(
                                "mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono focus:outline-none focus:ring-2",
                                isDark
                                  ? "border-cyan-400/30 bg-black/40 text-cyan-200 focus:ring-cyan-500/30"
                                  : "border-cyan-300 bg-cyan-50 text-cyan-900 focus:ring-cyan-500/20",
                              )}
                              value={draft.cacheRedisUrl}
                              onChange={(event) => {
                                const cacheRedisUrl = event.target.value;
                                const fields = parseRedisUrl(cacheRedisUrl);
                                syncDraft((prev) => ({
                                  ...prev,
                                  cacheRedisUrl,
                                  cacheHost: fields.cacheHost,
                                  cachePort: fields.cachePort,
                                  cacheUser: fields.cacheUser,
                                  cachePass: fields.cachePass,
                                  cacheUseTls: fields.cacheUseTls,
                                }));
                              }}
                            />
                          </label>
                        )}
                      </div>
                    ) : (
                      <p
                        className={cn(
                          "mt-3 text-sm",
                          isDark ? "text-slate-400" : "text-slate-600",
                        )}
                      >
                        {t(
                          "admin.config.quickSettings.hints.cacheNoExternalConnection",
                        )}
                      </p>
                    )}
                  </section>
                )}

                {friendlyStep === "other" && (
                  <section
                    className={cn(
                      "rounded-2xl border p-3 sm:p-4 shadow-sm",
                      isDark
                        ? "border-white/10 bg-white/[0.03]"
                        : "border-slate-200 bg-white",
                    )}
                  >
                    <h4 className="text-sm sm:text-sm font-black uppercase tracking-wide mb-3">
                      {t("admin.config.quickSettings.steps.other")}
                    </h4>
                    <p
                      className={cn(
                        "text-sm sm:text-sm mb-3",
                        isDark ? "text-slate-400" : "text-slate-800 font-black",
                      )}
                    >
                      {t("admin.config.quickSettings.otherActions.intro")}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {onOpenLicenseManagement && (
                        <button
                          type="button"
                          className={cn(
                            "h-12 rounded-lg border text-sm sm:text-sm font-black transition-all inline-flex items-center justify-center gap-2 shadow-sm",
                            isDark
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                              : "border-amber-500/50 bg-amber-50 text-amber-900 hover:bg-amber-100",
                          )}
                          onClick={onOpenLicenseManagement}
                        >
                          <Key
                            size={18}
                            className={
                              isDark ? "text-amber-400" : "text-amber-600"
                            }
                          />
                          {t("admin.config.license.title")}
                        </button>
                      )}

                      {onOpenStorageConfig && (
                        <button
                          type="button"
                          className={cn(
                            "h-12 rounded-lg border text-sm sm:text-sm font-black transition-all inline-flex items-center justify-center gap-2 shadow-sm",
                            isDark
                              ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
                              : "border-cyan-500/50 bg-cyan-50 text-cyan-900 hover:bg-cyan-100",
                          )}
                          onClick={onOpenStorageConfig}
                        >
                          <HardDrive
                            size={18}
                            className={
                              isDark ? "text-cyan-300" : "text-cyan-700"
                            }
                          />
                          {t("admin.config.storage.title")}
                        </button>
                      )}
                    </div>
                  </section>
                )}

                <div className="flex items-center justify-between gap-2 shrink-0">
                  <button
                    type="button"
                    className={cn(
                      "h-10 px-6 rounded-lg border text-sm sm:text-sm font-black transition-all disabled:opacity-40 shadow-sm",
                      isDark
                        ? "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    )}
                    onClick={() => {
                      if (currentStepIndex > 0) {
                        const previousStep =
                          friendlySteps[currentStepIndex - 1];
                        if (previousStep) {
                          setFriendlyStep(previousStep);
                        }
                      }
                    }}
                    disabled={currentStepIndex <= 0}
                  >
                    {t("admin.config.quickSettings.actions.previous")}
                  </button>
                  <div className="flex items-center gap-2">
                    {currentStepIndex < friendlySteps.length - 1 && (
                      <button
                        type="button"
                        className={cn(
                          "h-10 px-6 rounded-lg border text-sm sm:text-sm font-black transition-all disabled:opacity-40 shadow-sm",
                          isDark
                            ? "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                        )}
                        onClick={() => {
                          const nextStep = friendlySteps[currentStepIndex + 1];
                          if (nextStep) {
                            setFriendlyStep(nextStep);
                          }
                        }}
                      >
                        {t("admin.config.quickSettings.actions.next")}
                      </button>
                    )}
                    {showDoneAction ? (
                      <button
                        type="button"
                        className="h-10 px-8 rounded-lg border border-primary bg-primary text-white text-sm sm:text-sm font-black disabled:opacity-40 shadow-lg shadow-primary/20 transition-all hover:opacity-90"
                        onClick={onClose}
                      >
                        {t(
                          settingsCenterMode
                            ? "admin.config.quickSettings.actions.doneSetup"
                            : "admin.config.quickSettings.actions.done",
                        )}
                      </button>
                    ) : currentStepIndex >= friendlySteps.length - 1 ? (
                      <div
                        className={cn(
                          "text-sm font-bold px-3",
                          isDark ? "text-slate-400" : "text-slate-600",
                        )}
                      >
                        {t("systemConfig.setup.editor.finishHint")}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
      <PerformanceProfilePickerModal
        isOpen={isPerformanceProfilePickerOpen}
        value={draft.loadProfile}
        onClose={() => setIsPerformanceProfilePickerOpen(false)}
        onSelect={selectPerformanceProfile}
        zIndexClassName="z-[170]"
      />
    </>
  );

  if (embedded) {
    return panelContent;
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label={t("common.close")}
        className={cn(
          "absolute inset-0 backdrop-blur-sm transition-colors",
          isDark ? "bg-black/95" : "bg-slate-900/80",
        )}
        onClick={onClose}
      />
      {panelContent}
    </div>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(modalContent, document.body);
};
