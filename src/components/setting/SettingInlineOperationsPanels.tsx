import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { cn } from "@/lib/utils";
import {
  ensureRecord,
  isRecord,
  type ConfigObject,
} from "@/lib/configObject";
import { PasswordInput } from "@/components/common/PasswordInput";
import { SettingSegmentedControl } from "./SettingSegmentedControl";
import type { TomlAdapter } from "./ExternalDependencyConfigModal";
import { useConfigDraftBinding } from "./useConfigDraftBinding";

type BaseProps = {
  tomlAdapter: TomlAdapter;
  content: string;
  onContentChange: (value: string) => void;
};

type JournalLogDraft = {
  logRetentionDays: string;
  batchSize: string;
  batchSizeLowMemory: string;
  batchSizeThroughput: string;
  flushIntervalMs: string;
  queueCapacityMultiplier: string;
};

type MiddlewareDraft = {
  requestIdHeader: string;
  getipHeaders: string;
  allowedOrigin: string;
  allowedMethods: string;
  allowedHeaders: string;
  allowCredentials: boolean;
  ipWindowSecs: string;
  ipMaxRequests: string;
  clientWindowSecs: string;
  clientMaxRequests: string;
  clientIdHeader: string;
  clientIdCookie: string;
  clientIdBlacklistEnabled: boolean;
  clientMaxCid: string;
  userWindowSecs: string;
  userMaxRequests: string;
  userIdBlacklistEnabled: boolean;
  userMaxId: string;
  bruteForceEnabled: boolean;
  bruteForceMaxFailuresPerUserIp: string;
  bruteForceMaxFailuresPerIpGlobal: string;
  bruteForceLockoutSecs: string;
  bruteForceBackoffEnabled: boolean;
  baseAuthUsername: string;
  baseAuthPassword: string;
  openapiJsonEnableBaseauth: boolean;
};

type TaskRegistryDraft = {
  taskRetentionDays: string;
  cacheTtlCleanupEnabled: boolean;
  cacheTtlCleanupCron: string;
  tempCleanupEnabled: boolean;
  tempCleanupCron: string;
  databaseHealthCheckEnabled: boolean;
  databaseHealthCheckCron: string;
  bloomFilterWarmupEnabled: boolean;
  bloomFilterWarmupCron: string;
  shareCleanupEnabled: boolean;
  shareCleanupCron: string;
  systemBackupEnabled: boolean;
  systemBackupCron: string;
  bloomReserveCapacity: string;
  bloomMaxUsersPerRun: string;
  bloomYieldEveryUsers: string;
  bloomSleepMsPerYield: string;
  quotaMaxUsersPerRun: string;
  quotaYieldEveryUsers: string;
  quotaSleepMsPerUser: string;
  fileIndexMaxUsersPerRun: string;
  fileIndexYieldEveryUsers: string;
  fileIndexSleepMsPerUser: string;
};

type ExternalizeNetDraft = {
  enabled: boolean;
  hostingEnabled: boolean;
  automationEnabled: boolean;
  adminApiEnabled: boolean;
  allowInsecureTls: boolean;
  allowCommandMethod: boolean;
  refreshIntervalSec: string;
  requestTimeoutSec: string;
  webhookTimeoutSec: string;
  dnsPropagationWaitSec: string;
  challengePollIntervalSec: string;
  challengeMaxPollCount: string;
  acmeRunTimeoutSec: string;
  acmeRenewBeforeDays: string;
  renewJitterMaxSec: string;
  renewDynamicRatioDivisor: string;
  renewShortLifetimeDays: string;
  renewShortLifetimeDivisor: string;
  encryptionKey: string;
  commandAllowPrefixes: string;
  dnsServers: string;
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

const ToggleCard = <T extends string>({
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

export const JournalLogInlinePanel: React.FC<BaseProps> = ({
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
    (source: string): JournalLogDraft => {
      const parsed = tomlAdapter.parse(source);
      const journal = asRecord(asRecord(parsed)["journal_log"]);
      return {
        logRetentionDays: toNumberString(journal["log_retention_days"], "30"),
        batchSize: toNumberString(journal["batch_size"], "100"),
        batchSizeLowMemory: toNumberString(
          journal["batch_size_low_memory"],
          "20",
        ),
        batchSizeThroughput: toNumberString(
          journal["batch_size_throughput"],
          "500",
        ),
        flushIntervalMs: toNumberString(journal["flush_interval_ms"], "1000"),
        queueCapacityMultiplier: toNumberString(
          journal["queue_capacity_multiplier"],
          "2",
        ),
      };
    },
    [tomlAdapter],
  );
  const buildContent = useCallback(
    (source: string, draft: JournalLogDraft) => {
      const parsed = tomlAdapter.parse(source);
      const root: ConfigObject = isRecord(parsed) ? parsed : {};
      const journal = ensureRecord(root, "journal_log");
      journal["log_retention_days"] =
        Number.parseInt(draft.logRetentionDays, 10) || 30;
      journal["batch_size"] = Number.parseInt(draft.batchSize, 10) || 100;
      journal["batch_size_low_memory"] =
        Number.parseInt(draft.batchSizeLowMemory, 10) || 20;
      journal["batch_size_throughput"] =
        Number.parseInt(draft.batchSizeThroughput, 10) || 500;
      journal["flush_interval_ms"] =
        Number.parseInt(draft.flushIntervalMs, 10) || 1000;
      journal["queue_capacity_multiplier"] =
        Number.parseInt(draft.queueCapacityMultiplier, 10) || 2;
      return tomlAdapter.stringify(root);
    },
    [tomlAdapter],
  );
  const { draft, setDraft } = useConfigDraftBinding<JournalLogDraft>({
    content,
    onContentChange,
    createDraft,
    buildContent,
  });
  const fields: Array<{
    key: keyof JournalLogDraft;
    value: string;
    label: string;
  }> = [
    {
      key: "logRetentionDays",
      value: draft.logRetentionDays,
      label: t("admin.config.advancedPanels.journalLog.logRetentionDays"),
    },
    {
      key: "batchSize",
      value: draft.batchSize,
      label: t("admin.config.advancedPanels.journalLog.batchSize"),
    },
    {
      key: "batchSizeLowMemory",
      value: draft.batchSizeLowMemory,
      label: t("admin.config.advancedPanels.journalLog.batchSizeLowMemory"),
    },
    {
      key: "batchSizeThroughput",
      value: draft.batchSizeThroughput,
      label: t("admin.config.advancedPanels.journalLog.batchSizeThroughput"),
    },
    {
      key: "flushIntervalMs",
      value: draft.flushIntervalMs,
      label: t("admin.config.advancedPanels.journalLog.flushIntervalMs"),
    },
    {
      key: "queueCapacityMultiplier",
      value: draft.queueCapacityMultiplier,
      label: t("admin.config.advancedPanels.journalLog.queueCapacityMultiplier"),
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SectionCard
        title={t("admin.config.advancedPanels.journalLog.title")}
        isDark={isDark}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.key}>
              <FieldLabel isDark={isDark}>{field.label}</FieldLabel>
              <input
                className={inputClass}
                value={field.value}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    [field.key]: sanitizeUnsignedIntegerInput(event.target.value),
                  }))
                }
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

export const MiddlewareInlinePanel: React.FC<BaseProps> = ({
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
    (source: string): MiddlewareDraft => {
      const parsed = tomlAdapter.parse(source);
      const middleware = asRecord(asRecord(parsed)["middleware"]);
      const context = asRecord(middleware["context"]);
      const cors = asRecord(middleware["cors"]);
      const ip = asRecord(middleware["ip_rate_limit"]);
      const client = asRecord(middleware["client_id_rate_limit"]);
      const user = asRecord(middleware["user_id_rate_limit"]);
      const brute = asRecord(middleware["brute_force"]);
      const baseAuth = asRecord(middleware["base_auth"]);
      return {
        requestIdHeader: toStringValue(context["request_id_header"], "x-request-id"),
        getipHeaders: toStringValue(context["getip_headers"], "x-forwarded-for,x-real-ip"),
        allowedOrigin: toStringValue(cors["allowed_origin"], "*"),
        allowedMethods: toStringValue(
          cors["allowed_methods"],
          "GET,POST,PUT,DELETE,OPTIONS",
        ),
        allowedHeaders: toStringValue(
          cors["allowed_headers"],
          "Content-Type,Authorization",
        ),
        allowCredentials: toBooleanValue(cors["allow_credentials"], false),
        ipWindowSecs: toNumberString(ip["window_secs"], "60"),
        ipMaxRequests: toNumberString(ip["max_requests"], "100"),
        clientWindowSecs: toNumberString(client["window_secs"], "60"),
        clientMaxRequests: toNumberString(client["max_requests"], "150"),
        clientIdHeader: toStringValue(client["client_id_header"], "x-client-id"),
        clientIdCookie: toStringValue(client["client_id_cookie"], "client-id"),
        clientIdBlacklistEnabled: toBooleanValue(
          client["client_id_blacklist_enabled"],
          false,
        ),
        clientMaxCid: toNumberString(client["max_cid"], "500"),
        userWindowSecs: toNumberString(user["window_secs"], "60"),
        userMaxRequests: toNumberString(user["max_requests"], "200"),
        userIdBlacklistEnabled: toBooleanValue(
          user["user_id_blacklist_enabled"],
          false,
        ),
        userMaxId: toNumberString(user["max_userid"], "100"),
        bruteForceEnabled: toBooleanValue(brute["enabled"], true),
        bruteForceMaxFailuresPerUserIp: toNumberString(
          brute["max_failures_per_user_ip"],
          "5",
        ),
        bruteForceMaxFailuresPerIpGlobal: toNumberString(
          brute["max_failures_per_ip_global"],
          "20",
        ),
        bruteForceLockoutSecs: toNumberString(brute["lockout_secs"], "300"),
        bruteForceBackoffEnabled: toBooleanValue(
          brute["enable_exponential_backoff"],
          true,
        ),
        baseAuthUsername: toStringValue(baseAuth["username"], "admin"),
        baseAuthPassword: toStringValue(baseAuth["password"], "admin888"),
        openapiJsonEnableBaseauth: toBooleanValue(
          baseAuth["openapi_json_enable_baseauth"],
          true,
        ),
      };
    },
    [tomlAdapter],
  );
  const buildContent = useCallback(
    (source: string, draft: MiddlewareDraft) => {
      const parsed = tomlAdapter.parse(source);
      const root: ConfigObject = isRecord(parsed) ? parsed : {};
      const middleware = ensureRecord(root, "middleware");
      const context = ensureRecord(middleware, "context");
      const cors = ensureRecord(middleware, "cors");
      const ip = ensureRecord(middleware, "ip_rate_limit");
      const client = ensureRecord(middleware, "client_id_rate_limit");
      const user = ensureRecord(middleware, "user_id_rate_limit");
      const brute = ensureRecord(middleware, "brute_force");
      const baseAuth = ensureRecord(middleware, "base_auth");

      context["request_id_header"] = draft.requestIdHeader.trim() || "x-request-id";
      context["getip_headers"] =
        draft.getipHeaders.trim() || "x-forwarded-for,x-real-ip";
      cors["allowed_origin"] = draft.allowedOrigin.trim() || "*";
      cors["allowed_methods"] =
        draft.allowedMethods.trim() || "GET,POST,PUT,DELETE,OPTIONS";
      cors["allowed_headers"] =
        draft.allowedHeaders.trim() || "Content-Type,Authorization";
      cors["allow_credentials"] = draft.allowCredentials;

      ip["window_secs"] = Number.parseInt(draft.ipWindowSecs, 10) || 60;
      ip["max_requests"] = Number.parseInt(draft.ipMaxRequests, 10) || 100;

      client["window_secs"] = Number.parseInt(draft.clientWindowSecs, 10) || 60;
      client["max_requests"] =
        Number.parseInt(draft.clientMaxRequests, 10) || 150;
      client["client_id_header"] =
        draft.clientIdHeader.trim() || "x-client-id";
      client["client_id_cookie"] = draft.clientIdCookie.trim() || "client-id";
      client["client_id_blacklist_enabled"] = draft.clientIdBlacklistEnabled;
      client["max_cid"] = Number.parseInt(draft.clientMaxCid, 10) || 500;

      user["window_secs"] = Number.parseInt(draft.userWindowSecs, 10) || 60;
      user["max_requests"] = Number.parseInt(draft.userMaxRequests, 10) || 200;
      user["user_id_blacklist_enabled"] = draft.userIdBlacklistEnabled;
      user["max_userid"] = Number.parseInt(draft.userMaxId, 10) || 100;

      brute["enabled"] = draft.bruteForceEnabled;
      brute["max_failures_per_user_ip"] =
        Number.parseInt(draft.bruteForceMaxFailuresPerUserIp, 10) || 5;
      brute["max_failures_per_ip_global"] =
        Number.parseInt(draft.bruteForceMaxFailuresPerIpGlobal, 10) || 20;
      brute["lockout_secs"] =
        Number.parseInt(draft.bruteForceLockoutSecs, 10) || 300;
      brute["enable_exponential_backoff"] = draft.bruteForceBackoffEnabled;

      baseAuth["username"] = draft.baseAuthUsername.trim() || "admin";
      baseAuth["password"] = draft.baseAuthPassword.trim() || "admin888";
      baseAuth["openapi_json_enable_baseauth"] = draft.openapiJsonEnableBaseauth;

      return tomlAdapter.stringify(root);
    },
    [tomlAdapter],
  );
  const { draft, setDraft } = useConfigDraftBinding<MiddlewareDraft>({
    content,
    onContentChange,
    createDraft,
    buildContent,
  });

  const rateFields: Array<{
    key:
      | "ipWindowSecs"
      | "ipMaxRequests"
      | "clientWindowSecs"
      | "clientMaxRequests"
      | "clientMaxCid"
      | "userWindowSecs"
      | "userMaxRequests"
      | "userMaxId";
    value: string;
    label: string;
  }> = [
    {
      key: "ipWindowSecs",
      value: draft.ipWindowSecs,
      label: t("admin.config.advancedPanels.middleware.ipWindowSecs"),
    },
    {
      key: "ipMaxRequests",
      value: draft.ipMaxRequests,
      label: t("admin.config.advancedPanels.middleware.ipMaxRequests"),
    },
    {
      key: "clientWindowSecs",
      value: draft.clientWindowSecs,
      label: t("admin.config.advancedPanels.middleware.clientWindowSecs"),
    },
    {
      key: "clientMaxRequests",
      value: draft.clientMaxRequests,
      label: t("admin.config.advancedPanels.middleware.clientMaxRequests"),
    },
    {
      key: "clientMaxCid",
      value: draft.clientMaxCid,
      label: t("admin.config.advancedPanels.middleware.clientMaxCid"),
    },
    {
      key: "userWindowSecs",
      value: draft.userWindowSecs,
      label: t("admin.config.advancedPanels.middleware.userWindowSecs"),
    },
    {
      key: "userMaxRequests",
      value: draft.userMaxRequests,
      label: t("admin.config.advancedPanels.middleware.userMaxRequests"),
    },
    {
      key: "userMaxId",
      value: draft.userMaxId,
      label: t("admin.config.advancedPanels.middleware.userMaxId"),
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SectionCard
        title={t("admin.config.advancedPanels.middleware.contextAndCors")}
        isDark={isDark}
      >
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.middleware.requestIdHeader")}
          </FieldLabel>
          <input
            className={inputClass}
            value={draft.requestIdHeader}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, requestIdHeader: event.target.value }))
            }
          />
        </div>
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.middleware.getipHeaders")}
          </FieldLabel>
          <input
            className={inputClass}
            value={draft.getipHeaders}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, getipHeaders: event.target.value }))
            }
          />
        </div>
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.middleware.allowedOrigin")}
          </FieldLabel>
          <input
            className={inputClass}
            value={draft.allowedOrigin}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, allowedOrigin: event.target.value }))
            }
          />
        </div>
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.middleware.allowedMethods")}
          </FieldLabel>
          <input
            className={inputClass}
            value={draft.allowedMethods}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, allowedMethods: event.target.value }))
            }
          />
        </div>
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.middleware.allowedHeaders")}
          </FieldLabel>
          <input
            className={inputClass}
            value={draft.allowedHeaders}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, allowedHeaders: event.target.value }))
            }
          />
        </div>
        <ToggleCard
          isDark={isDark}
          title={t("admin.config.advancedPanels.middleware.allowCredentials")}
          value={draft.allowCredentials ? "enabled" : "disabled"}
          options={[...booleanOptions]}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              allowCredentials: value === "enabled",
            }))
          }
        />
      </SectionCard>
      <SectionCard
        title={t("admin.config.advancedPanels.middleware.rateLimits")}
        isDark={isDark}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {rateFields.map((field) => (
            <div key={field.key}>
              <FieldLabel isDark={isDark}>{field.label}</FieldLabel>
              <input
                className={inputClass}
                value={field.value}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    [field.key]: sanitizeUnsignedIntegerInput(event.target.value),
                  }))
                }
              />
            </div>
          ))}
        </div>
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.middleware.clientIdHeader")}
          </FieldLabel>
          <input
            className={inputClass}
            value={draft.clientIdHeader}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, clientIdHeader: event.target.value }))
            }
          />
        </div>
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.middleware.clientIdCookie")}
          </FieldLabel>
          <input
            className={inputClass}
            value={draft.clientIdCookie}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, clientIdCookie: event.target.value }))
            }
          />
        </div>
        <ToggleCard
          isDark={isDark}
          title={t("admin.config.advancedPanels.middleware.clientIdBlacklistEnabled")}
          value={draft.clientIdBlacklistEnabled ? "enabled" : "disabled"}
          options={[...booleanOptions]}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              clientIdBlacklistEnabled: value === "enabled",
            }))
          }
        />
        <ToggleCard
          isDark={isDark}
          title={t("admin.config.advancedPanels.middleware.userIdBlacklistEnabled")}
          value={draft.userIdBlacklistEnabled ? "enabled" : "disabled"}
          options={[...booleanOptions]}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              userIdBlacklistEnabled: value === "enabled",
            }))
          }
        />
      </SectionCard>
      <SectionCard
        title={t("admin.config.advancedPanels.middleware.bruteForce")}
        isDark={isDark}
      >
        <ToggleCard
          isDark={isDark}
          title={t("admin.config.advancedPanels.middleware.bruteForceEnabled")}
          value={draft.bruteForceEnabled ? "enabled" : "disabled"}
          options={[...booleanOptions]}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              bruteForceEnabled: value === "enabled",
            }))
          }
        />
        <ToggleCard
          isDark={isDark}
          title={t("admin.config.advancedPanels.middleware.bruteForceBackoffEnabled")}
          value={draft.bruteForceBackoffEnabled ? "enabled" : "disabled"}
          options={[...booleanOptions]}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              bruteForceBackoffEnabled: value === "enabled",
            }))
          }
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              key: "bruteForceMaxFailuresPerUserIp",
              value: draft.bruteForceMaxFailuresPerUserIp,
              label: t("admin.config.advancedPanels.middleware.bruteForceMaxFailuresPerUserIp"),
            },
            {
              key: "bruteForceMaxFailuresPerIpGlobal",
              value: draft.bruteForceMaxFailuresPerIpGlobal,
              label: t("admin.config.advancedPanels.middleware.bruteForceMaxFailuresPerIpGlobal"),
            },
            {
              key: "bruteForceLockoutSecs",
              value: draft.bruteForceLockoutSecs,
              label: t("admin.config.advancedPanels.middleware.bruteForceLockoutSecs"),
            },
          ].map((field) => (
            <div key={field.key}>
              <FieldLabel isDark={isDark}>{field.label}</FieldLabel>
              <input
                className={inputClass}
                value={field.value}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    [field.key]: sanitizeUnsignedIntegerInput(event.target.value),
                  }))
                }
              />
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard
        title={t("admin.config.advancedPanels.middleware.baseAuth")}
        isDark={isDark}
      >
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.middleware.baseAuthUsername")}
          </FieldLabel>
          <input
            className={inputClass}
            value={draft.baseAuthUsername}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, baseAuthUsername: event.target.value }))
            }
          />
        </div>
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.middleware.baseAuthPassword")}
          </FieldLabel>
          <PasswordInput
            value={draft.baseAuthPassword}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, baseAuthPassword: event.target.value }))
            }
            wrapperClassName="mt-1"
            inputClassName={inputClass}
          />
        </div>
        <ToggleCard
          isDark={isDark}
          title={t("admin.config.advancedPanels.middleware.openapiJsonEnableBaseauth")}
          value={draft.openapiJsonEnableBaseauth ? "enabled" : "disabled"}
          options={[...booleanOptions]}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              openapiJsonEnableBaseauth: value === "enabled",
            }))
          }
        />
      </SectionCard>
    </div>
  );
};

export const TaskRegistryInlinePanel: React.FC<BaseProps> = ({
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
    (source: string): TaskRegistryDraft => {
      const parsed = tomlAdapter.parse(source);
      const registry = asRecord(asRecord(parsed)["task_registry"]);
      const cacheTtlCleanup = asRecord(registry["cache_ttl_cleanup"]);
      const tempCleanup = asRecord(registry["temp_cleanup"]);
      const databaseHealthCheck = asRecord(registry["database_health_check"]);
      const bloomWarmup = asRecord(registry["bloom_filter_warmup"]);
      const shareCleanup = asRecord(registry["share_cleanup"]);
      const systemBackup = asRecord(registry["system_backup"]);
      const bloomTuning = asRecord(registry["bloom_filter_warmup_tuning"]);
      const quotaTuning = asRecord(registry["quota_calibration_tuning"]);
      const fileIndexTuning = asRecord(registry["file_index_sync_tuning"]);
      return {
        taskRetentionDays: toNumberString(registry["task_retention_days"], "30"),
        cacheTtlCleanupEnabled: toBooleanValue(cacheTtlCleanup["enabled"], true),
        cacheTtlCleanupCron: toStringValue(
          cacheTtlCleanup["cron_expression"],
          "0 */5 * * * *",
        ),
        tempCleanupEnabled: toBooleanValue(tempCleanup["enabled"], true),
        tempCleanupCron: toStringValue(
          tempCleanup["cron_expression"],
          "0 */5 * * * *",
        ),
        databaseHealthCheckEnabled: toBooleanValue(
          databaseHealthCheck["enabled"],
          true,
        ),
        databaseHealthCheckCron: toStringValue(
          databaseHealthCheck["cron_expression"],
          "0 */5 * * * *",
        ),
        bloomFilterWarmupEnabled: toBooleanValue(bloomWarmup["enabled"], true),
        bloomFilterWarmupCron: toStringValue(
          bloomWarmup["cron_expression"],
          "0 */5 * * * *",
        ),
        shareCleanupEnabled: toBooleanValue(shareCleanup["enabled"], true),
        shareCleanupCron: toStringValue(
          shareCleanup["cron_expression"],
          "0 */5 * * * *",
        ),
        systemBackupEnabled: toBooleanValue(systemBackup["enabled"], true),
        systemBackupCron: toStringValue(
          systemBackup["cron_expression"],
          "0 */5 * * * *",
        ),
        bloomReserveCapacity: toNumberString(bloomTuning["reserve_capacity"], "1000000"),
        bloomMaxUsersPerRun: toNumberString(bloomTuning["max_users_per_run"], "50000"),
        bloomYieldEveryUsers: toNumberString(bloomTuning["yield_every_users"], "100"),
        bloomSleepMsPerYield: toNumberString(bloomTuning["sleep_ms_per_yield"], "2"),
        quotaMaxUsersPerRun: toNumberString(quotaTuning["max_users_per_run"], "2000"),
        quotaYieldEveryUsers: toNumberString(quotaTuning["yield_every_users"], "50"),
        quotaSleepMsPerUser: toNumberString(quotaTuning["sleep_ms_per_user"], "10"),
        fileIndexMaxUsersPerRun: toNumberString(
          fileIndexTuning["max_users_per_run"],
          "2000",
        ),
        fileIndexYieldEveryUsers: toNumberString(
          fileIndexTuning["yield_every_users"],
          "50",
        ),
        fileIndexSleepMsPerUser: toNumberString(
          fileIndexTuning["sleep_ms_per_user"],
          "10",
        ),
      };
    },
    [tomlAdapter],
  );
  const buildContent = useCallback(
    (source: string, draft: TaskRegistryDraft) => {
      const parsed = tomlAdapter.parse(source);
      const root: ConfigObject = isRecord(parsed) ? parsed : {};
      const registry = ensureRecord(root, "task_registry");
      const cacheTtlCleanup = ensureRecord(registry, "cache_ttl_cleanup");
      const tempCleanup = ensureRecord(registry, "temp_cleanup");
      const databaseHealthCheck = ensureRecord(registry, "database_health_check");
      const bloomWarmup = ensureRecord(registry, "bloom_filter_warmup");
      const shareCleanup = ensureRecord(registry, "share_cleanup");
      const systemBackup = ensureRecord(registry, "system_backup");
      const bloomTuning = ensureRecord(registry, "bloom_filter_warmup_tuning");
      const quotaTuning = ensureRecord(registry, "quota_calibration_tuning");
      const fileIndexTuning = ensureRecord(registry, "file_index_sync_tuning");

      registry["task_retention_days"] =
        Number.parseInt(draft.taskRetentionDays, 10) || 30;

      cacheTtlCleanup["enabled"] = draft.cacheTtlCleanupEnabled;
      cacheTtlCleanup["cron_expression"] =
        draft.cacheTtlCleanupCron.trim() || "0 */5 * * * *";
      tempCleanup["enabled"] = draft.tempCleanupEnabled;
      tempCleanup["cron_expression"] =
        draft.tempCleanupCron.trim() || "0 */5 * * * *";
      databaseHealthCheck["enabled"] = draft.databaseHealthCheckEnabled;
      databaseHealthCheck["cron_expression"] =
        draft.databaseHealthCheckCron.trim() || "0 */5 * * * *";
      bloomWarmup["enabled"] = draft.bloomFilterWarmupEnabled;
      bloomWarmup["cron_expression"] =
        draft.bloomFilterWarmupCron.trim() || "0 */5 * * * *";
      shareCleanup["enabled"] = draft.shareCleanupEnabled;
      shareCleanup["cron_expression"] =
        draft.shareCleanupCron.trim() || "0 */5 * * * *";
      systemBackup["enabled"] = draft.systemBackupEnabled;
      systemBackup["cron_expression"] =
        draft.systemBackupCron.trim() || "0 */5 * * * *";

      bloomTuning["reserve_capacity"] =
        Number.parseInt(draft.bloomReserveCapacity, 10) || 1000000;
      bloomTuning["max_users_per_run"] =
        Number.parseInt(draft.bloomMaxUsersPerRun, 10) || 50000;
      bloomTuning["yield_every_users"] =
        Number.parseInt(draft.bloomYieldEveryUsers, 10) || 100;
      bloomTuning["sleep_ms_per_yield"] =
        Number.parseInt(draft.bloomSleepMsPerYield, 10) || 2;

      quotaTuning["max_users_per_run"] =
        Number.parseInt(draft.quotaMaxUsersPerRun, 10) || 2000;
      quotaTuning["yield_every_users"] =
        Number.parseInt(draft.quotaYieldEveryUsers, 10) || 50;
      quotaTuning["sleep_ms_per_user"] =
        Number.parseInt(draft.quotaSleepMsPerUser, 10) || 10;

      fileIndexTuning["max_users_per_run"] =
        Number.parseInt(draft.fileIndexMaxUsersPerRun, 10) || 2000;
      fileIndexTuning["yield_every_users"] =
        Number.parseInt(draft.fileIndexYieldEveryUsers, 10) || 50;
      fileIndexTuning["sleep_ms_per_user"] =
        Number.parseInt(draft.fileIndexSleepMsPerUser, 10) || 10;

      return tomlAdapter.stringify(root);
    },
    [tomlAdapter],
  );
  const { draft, setDraft } = useConfigDraftBinding<TaskRegistryDraft>({
    content,
    onContentChange,
    createDraft,
    buildContent,
  });

  const taskJobs: Array<{
    title: string;
    enabledKey:
      | "cacheTtlCleanupEnabled"
      | "tempCleanupEnabled"
      | "databaseHealthCheckEnabled"
      | "bloomFilterWarmupEnabled"
      | "shareCleanupEnabled"
      | "systemBackupEnabled";
    cronKey:
      | "cacheTtlCleanupCron"
      | "tempCleanupCron"
      | "databaseHealthCheckCron"
      | "bloomFilterWarmupCron"
      | "shareCleanupCron"
      | "systemBackupCron";
    enabledValue: boolean;
    cronValue: string;
  }> = [
    {
      title: t("admin.config.advancedPanels.taskRegistry.jobs.cacheTtlCleanup"),
      enabledKey: "cacheTtlCleanupEnabled",
      cronKey: "cacheTtlCleanupCron",
      enabledValue: draft.cacheTtlCleanupEnabled,
      cronValue: draft.cacheTtlCleanupCron,
    },
    {
      title: t("admin.config.advancedPanels.taskRegistry.jobs.tempCleanup"),
      enabledKey: "tempCleanupEnabled",
      cronKey: "tempCleanupCron",
      enabledValue: draft.tempCleanupEnabled,
      cronValue: draft.tempCleanupCron,
    },
    {
      title: t("admin.config.advancedPanels.taskRegistry.jobs.databaseHealthCheck"),
      enabledKey: "databaseHealthCheckEnabled",
      cronKey: "databaseHealthCheckCron",
      enabledValue: draft.databaseHealthCheckEnabled,
      cronValue: draft.databaseHealthCheckCron,
    },
    {
      title: t("admin.config.advancedPanels.taskRegistry.jobs.bloomFilterWarmup"),
      enabledKey: "bloomFilterWarmupEnabled",
      cronKey: "bloomFilterWarmupCron",
      enabledValue: draft.bloomFilterWarmupEnabled,
      cronValue: draft.bloomFilterWarmupCron,
    },
    {
      title: t("admin.config.advancedPanels.taskRegistry.jobs.shareCleanup"),
      enabledKey: "shareCleanupEnabled",
      cronKey: "shareCleanupCron",
      enabledValue: draft.shareCleanupEnabled,
      cronValue: draft.shareCleanupCron,
    },
    {
      title: t("admin.config.advancedPanels.taskRegistry.jobs.systemBackup"),
      enabledKey: "systemBackupEnabled",
      cronKey: "systemBackupCron",
      enabledValue: draft.systemBackupEnabled,
      cronValue: draft.systemBackupCron,
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SectionCard
        title={t("admin.config.advancedPanels.taskRegistry.title")}
        isDark={isDark}
      >
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.taskRegistry.taskRetentionDays")}
          </FieldLabel>
          <input
            className={inputClass}
            value={draft.taskRetentionDays}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                taskRetentionDays: sanitizeUnsignedIntegerInput(event.target.value),
              }))
            }
          />
        </div>
        <div className="grid gap-3">
          {taskJobs.map((job) => (
            <div
              key={job.enabledKey}
              className={cn(
                "rounded-xl border px-3 py-3",
                isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-slate-50",
              )}
            >
              <FieldLabel isDark={isDark}>{job.title}</FieldLabel>
              <SettingSegmentedControl
                value={job.enabledValue ? "enabled" : "disabled"}
                options={[...booleanOptions]}
                onChange={(value) =>
                  setDraft((prev) => ({
                    ...prev,
                    [job.enabledKey]: value === "enabled",
                  }))
                }
                className="mt-3"
              />
              <input
                className={inputClass}
                value={job.cronValue}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    [job.cronKey]: event.target.value,
                  }))
                }
              />
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard
        title={t("admin.config.advancedPanels.taskRegistry.tuning")}
        isDark={isDark}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              key: "bloomReserveCapacity",
              value: draft.bloomReserveCapacity,
              label: t("admin.config.advancedPanels.taskRegistry.bloomReserveCapacity"),
            },
            {
              key: "bloomMaxUsersPerRun",
              value: draft.bloomMaxUsersPerRun,
              label: t("admin.config.advancedPanels.taskRegistry.bloomMaxUsersPerRun"),
            },
            {
              key: "bloomYieldEveryUsers",
              value: draft.bloomYieldEveryUsers,
              label: t("admin.config.advancedPanels.taskRegistry.bloomYieldEveryUsers"),
            },
            {
              key: "bloomSleepMsPerYield",
              value: draft.bloomSleepMsPerYield,
              label: t("admin.config.advancedPanels.taskRegistry.bloomSleepMsPerYield"),
            },
            {
              key: "quotaMaxUsersPerRun",
              value: draft.quotaMaxUsersPerRun,
              label: t("admin.config.advancedPanels.taskRegistry.quotaMaxUsersPerRun"),
            },
            {
              key: "quotaYieldEveryUsers",
              value: draft.quotaYieldEveryUsers,
              label: t("admin.config.advancedPanels.taskRegistry.quotaYieldEveryUsers"),
            },
            {
              key: "quotaSleepMsPerUser",
              value: draft.quotaSleepMsPerUser,
              label: t("admin.config.advancedPanels.taskRegistry.quotaSleepMsPerUser"),
            },
            {
              key: "fileIndexMaxUsersPerRun",
              value: draft.fileIndexMaxUsersPerRun,
              label: t("admin.config.advancedPanels.taskRegistry.fileIndexMaxUsersPerRun"),
            },
            {
              key: "fileIndexYieldEveryUsers",
              value: draft.fileIndexYieldEveryUsers,
              label: t("admin.config.advancedPanels.taskRegistry.fileIndexYieldEveryUsers"),
            },
            {
              key: "fileIndexSleepMsPerUser",
              value: draft.fileIndexSleepMsPerUser,
              label: t("admin.config.advancedPanels.taskRegistry.fileIndexSleepMsPerUser"),
            },
          ].map((field) => (
            <div key={field.key}>
              <FieldLabel isDark={isDark}>{field.label}</FieldLabel>
              <input
                className={inputClass}
                value={field.value}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    [field.key]: sanitizeUnsignedIntegerInput(event.target.value),
                  }))
                }
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

export const ExternalizeNetInlinePanel: React.FC<BaseProps> = ({
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
  const booleanOptions = [
    { value: "enabled", label: t("common.enabled") },
    { value: "disabled", label: t("common.disabled") },
  ] as const;
  const createDraft = useCallback(
    (source: string): ExternalizeNetDraft => {
      const parsed = tomlAdapter.parse(source);
      const ext = asRecord(asRecord(parsed)["externalize_net"]);
      return {
        enabled: toBooleanValue(ext["enabled"], true),
        hostingEnabled: toBooleanValue(ext["hosting_enabled"], true),
        automationEnabled: toBooleanValue(ext["automation_enabled"], true),
        adminApiEnabled: toBooleanValue(ext["admin_api_enabled"], true),
        allowInsecureTls: toBooleanValue(ext["allow_insecure_tls"], false),
        allowCommandMethod: toBooleanValue(ext["allow_command_method"], false),
        refreshIntervalSec: toNumberString(ext["refresh_interval_sec"], "30"),
        requestTimeoutSec: toNumberString(ext["request_timeout_sec"], "15"),
        webhookTimeoutSec: toNumberString(ext["webhook_timeout_sec"], "10"),
        dnsPropagationWaitSec: toNumberString(
          ext["dns_propagation_wait_sec"],
          "30",
        ),
        challengePollIntervalSec: toNumberString(
          ext["challenge_poll_interval_sec"],
          "2",
        ),
        challengeMaxPollCount: toNumberString(
          ext["challenge_max_poll_count"],
          "60",
        ),
        acmeRunTimeoutSec: toNumberString(ext["acme_run_timeout_sec"], "1800"),
        acmeRenewBeforeDays: toNumberString(
          ext["acme_renew_before_days"],
          "30",
        ),
        renewJitterMaxSec: toNumberString(ext["renew_jitter_max_sec"], "480"),
        renewDynamicRatioDivisor: toNumberString(
          ext["renew_dynamic_ratio_divisor"],
          "3",
        ),
        renewShortLifetimeDays: toNumberString(
          ext["renew_short_lifetime_days"],
          "10",
        ),
        renewShortLifetimeDivisor: toNumberString(
          ext["renew_short_lifetime_divisor"],
          "2",
        ),
        encryptionKey: toStringValue(
          ext["encryption_key"],
          "CHANGE_ME_TO_A_SECURE_STRING_32_BYTES",
        ),
        commandAllowPrefixes: listToEditorValue(ext["command_allow_prefixes"]),
        dnsServers: listToEditorValue(ext["dns_servers"]),
      };
    },
    [tomlAdapter],
  );
  const buildContent = useCallback(
    (source: string, draft: ExternalizeNetDraft) => {
      const parsed = tomlAdapter.parse(source);
      const root: ConfigObject = isRecord(parsed) ? parsed : {};
      const ext = ensureRecord(root, "externalize_net");
      ext["enabled"] = draft.enabled;
      ext["hosting_enabled"] = draft.hostingEnabled;
      ext["automation_enabled"] = draft.automationEnabled;
      ext["admin_api_enabled"] = draft.adminApiEnabled;
      ext["allow_insecure_tls"] = draft.allowInsecureTls;
      ext["allow_command_method"] = draft.allowCommandMethod;
      ext["refresh_interval_sec"] =
        Number.parseInt(draft.refreshIntervalSec, 10) || 30;
      ext["request_timeout_sec"] =
        Number.parseInt(draft.requestTimeoutSec, 10) || 15;
      ext["webhook_timeout_sec"] =
        Number.parseInt(draft.webhookTimeoutSec, 10) || 10;
      ext["dns_propagation_wait_sec"] =
        Number.parseInt(draft.dnsPropagationWaitSec, 10) || 30;
      ext["challenge_poll_interval_sec"] =
        Number.parseInt(draft.challengePollIntervalSec, 10) || 2;
      ext["challenge_max_poll_count"] =
        Number.parseInt(draft.challengeMaxPollCount, 10) || 60;
      ext["acme_run_timeout_sec"] =
        Number.parseInt(draft.acmeRunTimeoutSec, 10) || 1800;
      ext["acme_renew_before_days"] =
        Number.parseInt(draft.acmeRenewBeforeDays, 10) || 30;
      ext["renew_jitter_max_sec"] =
        Number.parseInt(draft.renewJitterMaxSec, 10) || 480;
      ext["renew_dynamic_ratio_divisor"] =
        Number.parseInt(draft.renewDynamicRatioDivisor, 10) || 3;
      ext["renew_short_lifetime_days"] =
        Number.parseInt(draft.renewShortLifetimeDays, 10) || 10;
      ext["renew_short_lifetime_divisor"] =
        Number.parseInt(draft.renewShortLifetimeDivisor, 10) || 2;
      ext["encryption_key"] =
        draft.encryptionKey.trim() || "CHANGE_ME_TO_A_SECURE_STRING_32_BYTES";
      ext["command_allow_prefixes"] = editorValueToList(draft.commandAllowPrefixes);
      ext["dns_servers"] = editorValueToList(draft.dnsServers);
      return tomlAdapter.stringify(root);
    },
    [tomlAdapter],
  );
  const { draft, setDraft } = useConfigDraftBinding<ExternalizeNetDraft>({
    content,
    onContentChange,
    createDraft,
    buildContent,
  });

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SectionCard
        title={t("admin.config.advancedPanels.externalizeNet.title")}
        isDark={isDark}
      >
        {[
          {
            key: "enabled",
            value: draft.enabled,
            label: t("admin.config.advancedPanels.externalizeNet.enabled"),
          },
          {
            key: "hostingEnabled",
            value: draft.hostingEnabled,
            label: t("admin.config.advancedPanels.externalizeNet.hostingEnabled"),
          },
          {
            key: "automationEnabled",
            value: draft.automationEnabled,
            label: t("admin.config.advancedPanels.externalizeNet.automationEnabled"),
          },
          {
            key: "adminApiEnabled",
            value: draft.adminApiEnabled,
            label: t("admin.config.advancedPanels.externalizeNet.adminApiEnabled"),
          },
          {
            key: "allowInsecureTls",
            value: draft.allowInsecureTls,
            label: t("admin.config.advancedPanels.externalizeNet.allowInsecureTls"),
          },
          {
            key: "allowCommandMethod",
            value: draft.allowCommandMethod,
            label: t("admin.config.advancedPanels.externalizeNet.allowCommandMethod"),
          },
        ].map((field) => (
          <ToggleCard
            key={field.key}
            isDark={isDark}
            title={field.label}
            value={field.value ? "enabled" : "disabled"}
            options={[...booleanOptions]}
            onChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                [field.key]: value === "enabled",
              }))
            }
          />
        ))}
      </SectionCard>
      <SectionCard
        title={t("admin.config.advancedPanels.externalizeNet.timeoutsAndRenewal")}
        isDark={isDark}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              key: "refreshIntervalSec",
              value: draft.refreshIntervalSec,
              label: t("admin.config.advancedPanels.externalizeNet.refreshIntervalSec"),
            },
            {
              key: "requestTimeoutSec",
              value: draft.requestTimeoutSec,
              label: t("admin.config.advancedPanels.externalizeNet.requestTimeoutSec"),
            },
            {
              key: "webhookTimeoutSec",
              value: draft.webhookTimeoutSec,
              label: t("admin.config.advancedPanels.externalizeNet.webhookTimeoutSec"),
            },
            {
              key: "dnsPropagationWaitSec",
              value: draft.dnsPropagationWaitSec,
              label: t("admin.config.advancedPanels.externalizeNet.dnsPropagationWaitSec"),
            },
            {
              key: "challengePollIntervalSec",
              value: draft.challengePollIntervalSec,
              label: t("admin.config.advancedPanels.externalizeNet.challengePollIntervalSec"),
            },
            {
              key: "challengeMaxPollCount",
              value: draft.challengeMaxPollCount,
              label: t("admin.config.advancedPanels.externalizeNet.challengeMaxPollCount"),
            },
            {
              key: "acmeRunTimeoutSec",
              value: draft.acmeRunTimeoutSec,
              label: t("admin.config.advancedPanels.externalizeNet.acmeRunTimeoutSec"),
            },
            {
              key: "acmeRenewBeforeDays",
              value: draft.acmeRenewBeforeDays,
              label: t("admin.config.advancedPanels.externalizeNet.acmeRenewBeforeDays"),
            },
            {
              key: "renewJitterMaxSec",
              value: draft.renewJitterMaxSec,
              label: t("admin.config.advancedPanels.externalizeNet.renewJitterMaxSec"),
            },
            {
              key: "renewDynamicRatioDivisor",
              value: draft.renewDynamicRatioDivisor,
              label: t("admin.config.advancedPanels.externalizeNet.renewDynamicRatioDivisor"),
            },
            {
              key: "renewShortLifetimeDays",
              value: draft.renewShortLifetimeDays,
              label: t("admin.config.advancedPanels.externalizeNet.renewShortLifetimeDays"),
            },
            {
              key: "renewShortLifetimeDivisor",
              value: draft.renewShortLifetimeDivisor,
              label: t("admin.config.advancedPanels.externalizeNet.renewShortLifetimeDivisor"),
            },
          ].map((field) => (
            <div key={field.key}>
              <FieldLabel isDark={isDark}>{field.label}</FieldLabel>
              <input
                className={inputClass}
                value={field.value}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    [field.key]: sanitizeUnsignedIntegerInput(event.target.value),
                  }))
                }
              />
            </div>
          ))}
        </div>
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.externalizeNet.encryptionKey")}
          </FieldLabel>
          <PasswordInput
            value={draft.encryptionKey}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, encryptionKey: event.target.value }))
            }
            wrapperClassName="mt-1"
            inputClassName={inputClass}
          />
        </div>
      </SectionCard>
      <SectionCard
        title={t("admin.config.advancedPanels.externalizeNet.lists")}
        isDark={isDark}
      >
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.externalizeNet.commandAllowPrefixes")}
          </FieldLabel>
          <textarea
            className={textareaClass}
            value={draft.commandAllowPrefixes}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                commandAllowPrefixes: event.target.value,
              }))
            }
          />
        </div>
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.externalizeNet.dnsServers")}
          </FieldLabel>
          <textarea
            className={textareaClass}
            value={draft.dnsServers}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, dnsServers: event.target.value }))
            }
          />
        </div>
      </SectionCard>
    </div>
  );
};
