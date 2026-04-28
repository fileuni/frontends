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

type CaptchaDraft = {
  provider: "builtin" | "turnstile";
  codeLength: string;
  expiresIn: string;
  secretKey: string;
  maxRequestsGlobalHour: string;
  graphicCacheSize: string;
  graphicGenConcurrency: string;
  maxGenConcurrency: string;
  poolCheckIntervalSecs: string;
  emergencyFillMultiplier: string;
  maxVerificationFailures: string;
  maxVerificationFailuresIp: string;
  verificationFailureCooldown: string;
  turnstileSiteKey: string;
  turnstileSecretKey: string;
  turnstileVerifyUrl: string;
};

type SafeAccessDraft = {
  enableRiskAssessment: boolean;
  recordAccessHistory: boolean;
  autoBlockThreshold: string;
  historyRetentionSecs: string;
  cleanupIntervalSecs: string;
  bloomFilterFpRate: string;
  bloomFilterCapacity: string;
  ipBlockDurationSecs: string;
  bruteForceThreshold: string;
  bruteForceLockoutSecs: string;
  captchaThreshold: string;
  failCounterTtlSecs: string;
  alertThreshold: string;
};

type UserCenterDraft = {
  defaultRoleId: string;
  maxDevices: string;
  blacklistCacheTtl: string;
  jwtHeader: string;
  tokenPrefix: string;
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
  enableRegistration: boolean;
  enableUsernameRegistration: boolean;
  enableEmailRegistration: boolean;
  enablePhoneRegistration: boolean;
  enableMobileAuth: boolean;
  enableEmailAuth: boolean;
  passwdType: "1" | "2" | "3";
  passwdAutoUpgrade: boolean;
  passwdArgon2Mem: string;
  passwdArgon2T: string;
  passwdArgon2P: string;
  passwdBcryptCost: string;
  passwdSha256Iterations: string;
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

const sanitizeDecimalInput = (value: string): string => {
  return value.replace(/[^0-9.]/g, "");
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

export const CaptchaInlinePanel: React.FC<BaseProps> = ({
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
  const providerOptions = [
    { value: "builtin", label: t("admin.config.advancedPanels.captcha.providers.builtin") },
    { value: "turnstile", label: t("admin.config.advancedPanels.captcha.providers.turnstile") },
  ] as const;
  const createDraft = useCallback(
    (source: string): CaptchaDraft => {
      const parsed = tomlAdapter.parse(source);
      const captcha = asRecord(asRecord(parsed)["captcha_code"]);
      const turnstile = asRecord(captcha["cf_turnstile"]);
      return {
        provider: captcha["captcha_provider"] === "turnstile" ? "turnstile" : "builtin",
        codeLength: toNumberString(captcha["code_length"], "4"),
        expiresIn: toNumberString(captcha["expires_in"], "300"),
        secretKey: toStringValue(
          captcha["secret_key"],
          "CHANGE_ME_TO_A_SECURE_STRING_32_BYTES",
        ),
        maxRequestsGlobalHour: toNumberString(
          captcha["max_requests_global_hour"],
          "10000",
        ),
        graphicCacheSize: toNumberString(captcha["graphic_cache_size"], "100"),
        graphicGenConcurrency: toNumberString(
          captcha["graphic_gen_concurrency"],
          "4",
        ),
        maxGenConcurrency: toNumberString(captcha["max_gen_concurrency"], "8"),
        poolCheckIntervalSecs: toNumberString(
          captcha["pool_check_interval_secs"],
          "1",
        ),
        emergencyFillMultiplier: toNumberString(
          captcha["emergency_fill_multiplier"],
          "2",
        ),
        maxVerificationFailures: toNumberString(
          captcha["max_verification_failures"],
          "5",
        ),
        maxVerificationFailuresIp: toNumberString(
          captcha["max_verification_failures_ip"],
          "30",
        ),
        verificationFailureCooldown: toNumberString(
          captcha["verification_failure_cooldown"],
          "300",
        ),
        turnstileSiteKey: toStringValue(turnstile["site_key"], ""),
        turnstileSecretKey: toStringValue(turnstile["secret_key"], ""),
        turnstileVerifyUrl: toStringValue(
          turnstile["verify_url"],
          "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        ),
      };
    },
    [tomlAdapter],
  );
  const buildContent = useCallback(
    (source: string, draft: CaptchaDraft) => {
      const parsed = tomlAdapter.parse(source);
      const root: ConfigObject = isRecord(parsed) ? parsed : {};
      const captcha = ensureRecord(root, "captcha_code");
      const turnstile = ensureRecord(captcha, "cf_turnstile");
      captcha["captcha_provider"] = draft.provider;
      captcha["code_length"] = Number.parseInt(draft.codeLength, 10) || 4;
      captcha["expires_in"] = Number.parseInt(draft.expiresIn, 10) || 300;
      captcha["secret_key"] =
        draft.secretKey.trim() || "CHANGE_ME_TO_A_SECURE_STRING_32_BYTES";
      captcha["max_requests_global_hour"] =
        Number.parseInt(draft.maxRequestsGlobalHour, 10) || 10000;
      captcha["graphic_cache_size"] =
        Number.parseInt(draft.graphicCacheSize, 10) || 100;
      captcha["graphic_gen_concurrency"] =
        Number.parseInt(draft.graphicGenConcurrency, 10) || 4;
      captcha["max_gen_concurrency"] =
        Number.parseInt(draft.maxGenConcurrency, 10) || 8;
      captcha["pool_check_interval_secs"] =
        Number.parseInt(draft.poolCheckIntervalSecs, 10) || 1;
      captcha["emergency_fill_multiplier"] =
        Number.parseInt(draft.emergencyFillMultiplier, 10) || 2;
      captcha["max_verification_failures"] =
        Number.parseInt(draft.maxVerificationFailures, 10) || 5;
      captcha["max_verification_failures_ip"] =
        Number.parseInt(draft.maxVerificationFailuresIp, 10) || 30;
      captcha["verification_failure_cooldown"] =
        Number.parseInt(draft.verificationFailureCooldown, 10) || 300;
      turnstile["site_key"] = draft.turnstileSiteKey.trim();
      turnstile["secret_key"] = draft.turnstileSecretKey.trim();
      turnstile["verify_url"] =
        draft.turnstileVerifyUrl.trim() ||
        "https://challenges.cloudflare.com/turnstile/v0/siteverify";
      return tomlAdapter.stringify(root);
    },
    [tomlAdapter],
  );
  const { draft, setDraft } = useConfigDraftBinding<CaptchaDraft>({
    content,
    onContentChange,
    createDraft,
    buildContent,
  });
  const captchaGeneralFields: Array<{
    key:
      | "codeLength"
      | "expiresIn"
      | "maxRequestsGlobalHour"
      | "maxVerificationFailures"
      | "maxVerificationFailuresIp"
      | "verificationFailureCooldown";
    value: string;
    label: string;
  }> = [
    {
      key: "codeLength",
      value: draft.codeLength,
      label: t("admin.config.advancedPanels.captcha.codeLength"),
    },
    {
      key: "expiresIn",
      value: draft.expiresIn,
      label: t("admin.config.advancedPanels.captcha.expiresIn"),
    },
    {
      key: "maxRequestsGlobalHour",
      value: draft.maxRequestsGlobalHour,
      label: t("admin.config.advancedPanels.captcha.maxRequestsGlobalHour"),
    },
    {
      key: "maxVerificationFailures",
      value: draft.maxVerificationFailures,
      label: t("admin.config.advancedPanels.captcha.maxVerificationFailures"),
    },
    {
      key: "maxVerificationFailuresIp",
      value: draft.maxVerificationFailuresIp,
      label: t("admin.config.advancedPanels.captcha.maxVerificationFailuresIp"),
    },
    {
      key: "verificationFailureCooldown",
      value: draft.verificationFailureCooldown,
      label: t("admin.config.advancedPanels.captcha.verificationFailureCooldown"),
    },
  ];
  const captchaPoolFields: Array<{
    key:
      | "graphicCacheSize"
      | "graphicGenConcurrency"
      | "maxGenConcurrency"
      | "poolCheckIntervalSecs"
      | "emergencyFillMultiplier";
    value: string;
    label: string;
  }> = [
    {
      key: "graphicCacheSize",
      value: draft.graphicCacheSize,
      label: t("admin.config.advancedPanels.captcha.graphicCacheSize"),
    },
    {
      key: "graphicGenConcurrency",
      value: draft.graphicGenConcurrency,
      label: t("admin.config.advancedPanels.captcha.graphicGenConcurrency"),
    },
    {
      key: "maxGenConcurrency",
      value: draft.maxGenConcurrency,
      label: t("admin.config.advancedPanels.captcha.maxGenConcurrency"),
    },
    {
      key: "poolCheckIntervalSecs",
      value: draft.poolCheckIntervalSecs,
      label: t("admin.config.advancedPanels.captcha.poolCheckIntervalSecs"),
    },
    {
      key: "emergencyFillMultiplier",
      value: draft.emergencyFillMultiplier,
      label: t("admin.config.advancedPanels.captcha.emergencyFillMultiplier"),
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SectionCard
        title={t("admin.config.advancedPanels.captcha.title")}
        isDark={isDark}
      >
        <ToggleCard
          isDark={isDark}
          title={t("admin.config.advancedPanels.captcha.provider")}
          value={draft.provider}
          options={[...providerOptions]}
          onChange={(value) =>
            setDraft((prev) => ({ ...prev, provider: value }))
          }
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {captchaGeneralFields.map((field) => (
            <div key={field.key}>
              <FieldLabel isDark={isDark}>{field.label}</FieldLabel>
              <input
                className={inputClass}
                value={field.value}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    [field.key]: sanitizeUnsignedIntegerInput(event.target.value),
                  }) as CaptchaDraft)
                }
              />
            </div>
          ))}
        </div>
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.captcha.secretKey")}
          </FieldLabel>
          <PasswordInput
            value={draft.secretKey}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, secretKey: event.target.value }))
            }
            wrapperClassName="mt-1"
            inputClassName={inputClass}
          />
        </div>
      </SectionCard>
      <SectionCard
        title={t("admin.config.advancedPanels.captcha.capacityAndTurnstile")}
        isDark={isDark}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {captchaPoolFields.map((field) => (
            <div key={field.key}>
              <FieldLabel isDark={isDark}>{field.label}</FieldLabel>
              <input
                className={inputClass}
                value={field.value}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    [field.key]: sanitizeUnsignedIntegerInput(event.target.value),
                  }) as CaptchaDraft)
                }
              />
            </div>
          ))}
        </div>
        {draft.provider === "turnstile" && (
          <div className="grid gap-3">
            <div>
              <FieldLabel isDark={isDark}>
                {t("admin.config.advancedPanels.captcha.turnstileSiteKey")}
              </FieldLabel>
              <input
                className={inputClass}
                value={draft.turnstileSiteKey}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    turnstileSiteKey: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <FieldLabel isDark={isDark}>
                {t("admin.config.advancedPanels.captcha.turnstileSecretKey")}
              </FieldLabel>
              <PasswordInput
                value={draft.turnstileSecretKey}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    turnstileSecretKey: event.target.value,
                  }))
                }
                wrapperClassName="mt-1"
                inputClassName={inputClass}
              />
            </div>
            <div>
              <FieldLabel isDark={isDark}>
                {t("admin.config.advancedPanels.captcha.turnstileVerifyUrl")}
              </FieldLabel>
              <input
                className={inputClass}
                value={draft.turnstileVerifyUrl}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    turnstileVerifyUrl: event.target.value,
                  }))
                }
              />
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export const SafeAccessGuardInlinePanel: React.FC<BaseProps> = ({
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
    (source: string): SafeAccessDraft => {
      const parsed = tomlAdapter.parse(source);
      const guard = asRecord(asRecord(parsed)["safeaccess_guard"]);
      return {
        enableRiskAssessment: toBooleanValue(
          guard["enable_risk_assessment"],
          true,
        ),
        recordAccessHistory: toBooleanValue(guard["record_access_history"], true),
        autoBlockThreshold: toNumberString(guard["auto_block_threshold"], "100"),
        historyRetentionSecs: toNumberString(
          guard["history_retention_secs"],
          "86400",
        ),
        cleanupIntervalSecs: toNumberString(
          guard["cleanup_interval_secs"],
          "3600",
        ),
        bloomFilterFpRate: typeof guard["bloom_filter_fp_rate"] === "number"
          ? String(guard["bloom_filter_fp_rate"])
          : "0.01",
        bloomFilterCapacity: toNumberString(
          guard["bloom_filter_capacity"],
          "1000000",
        ),
        ipBlockDurationSecs: toNumberString(
          guard["ip_block_duration_secs"],
          "3600",
        ),
        bruteForceThreshold: toNumberString(
          guard["brute_force_threshold"],
          "10",
        ),
        bruteForceLockoutSecs: toNumberString(
          guard["brute_force_lockout_secs"],
          "1800",
        ),
        captchaThreshold: toNumberString(guard["captcha_threshold"], "3"),
        failCounterTtlSecs: toNumberString(
          guard["fail_counter_ttl_secs"],
          "3600",
        ),
        alertThreshold: toNumberString(guard["alert_threshold"], "5"),
      };
    },
    [tomlAdapter],
  );
  const buildContent = useCallback(
    (source: string, draft: SafeAccessDraft) => {
      const parsed = tomlAdapter.parse(source);
      const root: ConfigObject = isRecord(parsed) ? parsed : {};
      const guard = ensureRecord(root, "safeaccess_guard");
      guard["enable_risk_assessment"] = draft.enableRiskAssessment;
      guard["record_access_history"] = draft.recordAccessHistory;
      guard["auto_block_threshold"] =
        Number.parseInt(draft.autoBlockThreshold, 10) || 100;
      guard["history_retention_secs"] =
        Number.parseInt(draft.historyRetentionSecs, 10) || 86400;
      guard["cleanup_interval_secs"] =
        Number.parseInt(draft.cleanupIntervalSecs, 10) || 3600;
      guard["bloom_filter_fp_rate"] =
        Number.parseFloat(draft.bloomFilterFpRate) || 0.01;
      guard["bloom_filter_capacity"] =
        Number.parseInt(draft.bloomFilterCapacity, 10) || 1000000;
      guard["ip_block_duration_secs"] =
        Number.parseInt(draft.ipBlockDurationSecs, 10) || 3600;
      guard["brute_force_threshold"] =
        Number.parseInt(draft.bruteForceThreshold, 10) || 10;
      guard["brute_force_lockout_secs"] =
        Number.parseInt(draft.bruteForceLockoutSecs, 10) || 1800;
      guard["captcha_threshold"] =
        Number.parseInt(draft.captchaThreshold, 10) || 3;
      guard["fail_counter_ttl_secs"] =
        Number.parseInt(draft.failCounterTtlSecs, 10) || 3600;
      guard["alert_threshold"] =
        Number.parseInt(draft.alertThreshold, 10) || 5;
      return tomlAdapter.stringify(root);
    },
    [tomlAdapter],
  );
  const { draft, setDraft } = useConfigDraftBinding<SafeAccessDraft>({
    content,
    onContentChange,
    createDraft,
    buildContent,
  });
  const safeAccessMainFields: Array<{
    key:
      | "autoBlockThreshold"
      | "historyRetentionSecs"
      | "cleanupIntervalSecs"
      | "bloomFilterCapacity"
      | "ipBlockDurationSecs"
      | "alertThreshold";
    value: string;
    label: string;
  }> = [
    {
      key: "autoBlockThreshold",
      value: draft.autoBlockThreshold,
      label: t("admin.config.advancedPanels.safeaccessGuard.autoBlockThreshold"),
    },
    {
      key: "historyRetentionSecs",
      value: draft.historyRetentionSecs,
      label: t("admin.config.advancedPanels.safeaccessGuard.historyRetentionSecs"),
    },
    {
      key: "cleanupIntervalSecs",
      value: draft.cleanupIntervalSecs,
      label: t("admin.config.advancedPanels.safeaccessGuard.cleanupIntervalSecs"),
    },
    {
      key: "bloomFilterCapacity",
      value: draft.bloomFilterCapacity,
      label: t("admin.config.advancedPanels.safeaccessGuard.bloomFilterCapacity"),
    },
    {
      key: "ipBlockDurationSecs",
      value: draft.ipBlockDurationSecs,
      label: t("admin.config.advancedPanels.safeaccessGuard.ipBlockDurationSecs"),
    },
    {
      key: "alertThreshold",
      value: draft.alertThreshold,
      label: t("admin.config.advancedPanels.safeaccessGuard.alertThreshold"),
    },
  ];
  const safeAccessBruteforceFields: Array<{
    key:
      | "bruteForceThreshold"
      | "bruteForceLockoutSecs"
      | "captchaThreshold"
      | "failCounterTtlSecs";
    value: string;
    label: string;
  }> = [
    {
      key: "bruteForceThreshold",
      value: draft.bruteForceThreshold,
      label: t("admin.config.advancedPanels.safeaccessGuard.bruteForceThreshold"),
    },
    {
      key: "bruteForceLockoutSecs",
      value: draft.bruteForceLockoutSecs,
      label: t("admin.config.advancedPanels.safeaccessGuard.bruteForceLockoutSecs"),
    },
    {
      key: "captchaThreshold",
      value: draft.captchaThreshold,
      label: t("admin.config.advancedPanels.safeaccessGuard.captchaThreshold"),
    },
    {
      key: "failCounterTtlSecs",
      value: draft.failCounterTtlSecs,
      label: t("admin.config.advancedPanels.safeaccessGuard.failCounterTtlSecs"),
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SectionCard
        title={t("admin.config.advancedPanels.safeaccessGuard.title")}
        isDark={isDark}
      >
        <ToggleCard
          isDark={isDark}
          title={t("admin.config.advancedPanels.safeaccessGuard.enableRiskAssessment")}
          value={draft.enableRiskAssessment ? "enabled" : "disabled"}
          options={[
            { value: "enabled", label: t("common.enabled") },
            { value: "disabled", label: t("common.disabled") },
          ]}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              enableRiskAssessment: value === "enabled",
            }))
          }
        />
        <ToggleCard
          isDark={isDark}
          title={t("admin.config.advancedPanels.safeaccessGuard.recordAccessHistory")}
          value={draft.recordAccessHistory ? "enabled" : "disabled"}
          options={[...booleanOptions]}
          onChange={(value) =>
            setDraft((prev) => ({
              ...prev,
              recordAccessHistory: value === "enabled",
            }))
          }
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {safeAccessMainFields.map((field) => (
            <div key={field.key}>
              <FieldLabel isDark={isDark}>{field.label}</FieldLabel>
              <input
                className={inputClass}
                value={field.value}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    [field.key]: sanitizeUnsignedIntegerInput(event.target.value),
                  }) as SafeAccessDraft)
                }
              />
            </div>
          ))}
          <div>
            <FieldLabel isDark={isDark}>
              {t("admin.config.advancedPanels.safeaccessGuard.bloomFilterFpRate")}
            </FieldLabel>
            <input
              className={inputClass}
              value={draft.bloomFilterFpRate}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  bloomFilterFpRate: sanitizeDecimalInput(event.target.value),
                }))
              }
            />
          </div>
        </div>
      </SectionCard>
      <SectionCard
        title={t("admin.config.advancedPanels.safeaccessGuard.bruteforceAndCaptcha")}
        isDark={isDark}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {safeAccessBruteforceFields.map((field) => (
            <div key={field.key}>
              <FieldLabel isDark={isDark}>{field.label}</FieldLabel>
              <input
                className={inputClass}
                value={field.value}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    [field.key]: sanitizeUnsignedIntegerInput(event.target.value),
                  }) as SafeAccessDraft)
                }
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

export const UserCenterInlinePanel: React.FC<BaseProps> = ({
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
    (source: string): UserCenterDraft => {
      const parsed = tomlAdapter.parse(source);
      const userCenter = asRecord(asRecord(parsed)["user_center"]);
      const passwdType = toNumberString(userCenter["passwd_type"], "2");
      return {
        defaultRoleId: typeof userCenter["default_role_id"] === "number"
          ? String(userCenter["default_role_id"])
          : "100",
        maxDevices: toNumberString(userCenter["max_devices"], "5"),
        blacklistCacheTtl: toNumberString(
          userCenter["blacklist_cache_ttl"],
          "86400",
        ),
        jwtHeader: toStringValue(userCenter["jwt_header"], "Authorization"),
        tokenPrefix: toStringValue(userCenter["token_prefix"], "Bearer"),
        accessTokenSecret: toStringValue(
          userCenter["access_token_secret"],
          "CHANGE_ME_TO_A_SECURE_STRING_32_BYTES",
        ),
        refreshTokenSecret: toStringValue(
          userCenter["refresh_token_secret"],
          "CHANGE_ME_TO_A_SECURE_STRING_32_BYTES",
        ),
        accessTokenExpiresIn: toNumberString(
          userCenter["access_token_expires_in"],
          "3600",
        ),
        refreshTokenExpiresIn: toNumberString(
          userCenter["refresh_token_expires_in"],
          "604800",
        ),
        enableRegistration: toBooleanValue(userCenter["enable_registration"], true),
        enableUsernameRegistration: toBooleanValue(
          userCenter["enable_username_registration"],
          true,
        ),
        enableEmailRegistration: toBooleanValue(
          userCenter["enable_email_registration"],
          false,
        ),
        enablePhoneRegistration: toBooleanValue(
          userCenter["enable_phone_registration"],
          false,
        ),
        enableMobileAuth: toBooleanValue(userCenter["enable_mobile_auth"], false),
        enableEmailAuth: toBooleanValue(userCenter["enable_email_auth"], false),
        passwdType:
          passwdType === "1" || passwdType === "3" ? passwdType : "2",
        passwdAutoUpgrade: toBooleanValue(userCenter["passwd_auto_upgrade"], true),
        passwdArgon2Mem: toNumberString(userCenter["passwd_argon2_mem"], "32768"),
        passwdArgon2T: toNumberString(userCenter["passwd_argon2_t"], "3"),
        passwdArgon2P: toNumberString(userCenter["passwd_argon2_p"], "1"),
        passwdBcryptCost: toNumberString(userCenter["passwd_bcrypt_cost"], "10"),
        passwdSha256Iterations: toNumberString(
          userCenter["passwd_sha256_iterations"],
          "310000",
        ),
      };
    },
    [tomlAdapter],
  );
  const buildContent = useCallback(
    (source: string, draft: UserCenterDraft) => {
      const parsed = tomlAdapter.parse(source);
      const root: ConfigObject = isRecord(parsed) ? parsed : {};
      const userCenter = ensureRecord(root, "user_center");
      userCenter["default_role_id"] =
        Number.parseInt(draft.defaultRoleId, 10) || 100;
      userCenter["max_devices"] = Number.parseInt(draft.maxDevices, 10) || 5;
      userCenter["blacklist_cache_ttl"] =
        Number.parseInt(draft.blacklistCacheTtl, 10) || 86400;
      userCenter["jwt_header"] = draft.jwtHeader.trim() || "Authorization";
      userCenter["token_prefix"] = draft.tokenPrefix.trim() || "Bearer";
      userCenter["access_token_secret"] =
        draft.accessTokenSecret.trim() || "CHANGE_ME_TO_A_SECURE_STRING_32_BYTES";
      userCenter["refresh_token_secret"] =
        draft.refreshTokenSecret.trim() || "CHANGE_ME_TO_A_SECURE_STRING_32_BYTES";
      userCenter["access_token_expires_in"] =
        Number.parseInt(draft.accessTokenExpiresIn, 10) || 3600;
      userCenter["refresh_token_expires_in"] =
        Number.parseInt(draft.refreshTokenExpiresIn, 10) || 604800;
      userCenter["enable_registration"] = draft.enableRegistration;
      userCenter["enable_username_registration"] = draft.enableUsernameRegistration;
      userCenter["enable_email_registration"] = draft.enableEmailRegistration;
      userCenter["enable_phone_registration"] = draft.enablePhoneRegistration;
      userCenter["enable_mobile_auth"] = draft.enableMobileAuth;
      userCenter["enable_email_auth"] = draft.enableEmailAuth;
      userCenter["passwd_type"] = Number.parseInt(draft.passwdType, 10) || 2;
      userCenter["passwd_auto_upgrade"] = draft.passwdAutoUpgrade;
      userCenter["passwd_argon2_mem"] =
        Number.parseInt(draft.passwdArgon2Mem, 10) || 32768;
      userCenter["passwd_argon2_t"] =
        Number.parseInt(draft.passwdArgon2T, 10) || 3;
      userCenter["passwd_argon2_p"] =
        Number.parseInt(draft.passwdArgon2P, 10) || 1;
      userCenter["passwd_bcrypt_cost"] =
        Number.parseInt(draft.passwdBcryptCost, 10) || 10;
      userCenter["passwd_sha256_iterations"] =
        Number.parseInt(draft.passwdSha256Iterations, 10) || 310000;
      return tomlAdapter.stringify(root);
    },
    [tomlAdapter],
  );
  const { draft, setDraft } = useConfigDraftBinding<UserCenterDraft>({
    content,
    onContentChange,
    createDraft,
    buildContent,
  });
  const userCenterMainFields: Array<{
    key:
      | "defaultRoleId"
      | "maxDevices"
      | "blacklistCacheTtl"
      | "accessTokenExpiresIn"
      | "refreshTokenExpiresIn";
    value: string;
    label: string;
  }> = [
    {
      key: "defaultRoleId",
      value: draft.defaultRoleId,
      label: t("admin.config.advancedPanels.userCenter.defaultRoleId"),
    },
    {
      key: "maxDevices",
      value: draft.maxDevices,
      label: t("admin.config.advancedPanels.userCenter.maxDevices"),
    },
    {
      key: "blacklistCacheTtl",
      value: draft.blacklistCacheTtl,
      label: t("admin.config.advancedPanels.userCenter.blacklistCacheTtl"),
    },
    {
      key: "accessTokenExpiresIn",
      value: draft.accessTokenExpiresIn,
      label: t("admin.config.advancedPanels.userCenter.accessTokenExpiresIn"),
    },
    {
      key: "refreshTokenExpiresIn",
      value: draft.refreshTokenExpiresIn,
      label: t("admin.config.advancedPanels.userCenter.refreshTokenExpiresIn"),
    },
  ];
  const userCenterToggleFields: Array<{
    key:
      | "enableRegistration"
      | "enableUsernameRegistration"
      | "enableEmailRegistration"
      | "enablePhoneRegistration"
      | "enableMobileAuth"
      | "enableEmailAuth"
      | "passwdAutoUpgrade";
    value: boolean;
    label: string;
  }> = [
    {
      key: "enableRegistration",
      value: draft.enableRegistration,
      label: t("admin.config.advancedPanels.userCenter.enableRegistration"),
    },
    {
      key: "enableUsernameRegistration",
      value: draft.enableUsernameRegistration,
      label: t("admin.config.advancedPanels.userCenter.enableUsernameRegistration"),
    },
    {
      key: "enableEmailRegistration",
      value: draft.enableEmailRegistration,
      label: t("admin.config.advancedPanels.userCenter.enableEmailRegistration"),
    },
    {
      key: "enablePhoneRegistration",
      value: draft.enablePhoneRegistration,
      label: t("admin.config.advancedPanels.userCenter.enablePhoneRegistration"),
    },
    {
      key: "enableMobileAuth",
      value: draft.enableMobileAuth,
      label: t("admin.config.advancedPanels.userCenter.enableMobileAuth"),
    },
    {
      key: "enableEmailAuth",
      value: draft.enableEmailAuth,
      label: t("admin.config.advancedPanels.userCenter.enableEmailAuth"),
    },
    {
      key: "passwdAutoUpgrade",
      value: draft.passwdAutoUpgrade,
      label: t("admin.config.advancedPanels.userCenter.passwdAutoUpgrade"),
    },
  ];
  const userCenterHashFields: Array<{
    key:
      | "passwdArgon2Mem"
      | "passwdArgon2T"
      | "passwdArgon2P"
      | "passwdBcryptCost"
      | "passwdSha256Iterations";
    value: string;
    label: string;
  }> = [
    {
      key: "passwdArgon2Mem",
      value: draft.passwdArgon2Mem,
      label: t("admin.config.advancedPanels.userCenter.passwdArgon2Mem"),
    },
    {
      key: "passwdArgon2T",
      value: draft.passwdArgon2T,
      label: t("admin.config.advancedPanels.userCenter.passwdArgon2T"),
    },
    {
      key: "passwdArgon2P",
      value: draft.passwdArgon2P,
      label: t("admin.config.advancedPanels.userCenter.passwdArgon2P"),
    },
    {
      key: "passwdBcryptCost",
      value: draft.passwdBcryptCost,
      label: t("admin.config.advancedPanels.userCenter.passwdBcryptCost"),
    },
    {
      key: "passwdSha256Iterations",
      value: draft.passwdSha256Iterations,
      label: t("admin.config.advancedPanels.userCenter.passwdSha256Iterations"),
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SectionCard
        title={t("admin.config.advancedPanels.userCenter.title")}
        isDark={isDark}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {userCenterMainFields.map((field) => (
            <div key={field.key}>
              <FieldLabel isDark={isDark}>{field.label}</FieldLabel>
              <input
                className={inputClass}
                value={field.value}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    [field.key]: sanitizeUnsignedIntegerInput(event.target.value),
                  }) as UserCenterDraft)
                }
              />
            </div>
          ))}
          <div>
            <FieldLabel isDark={isDark}>
              {t("admin.config.advancedPanels.userCenter.jwtHeader")}
            </FieldLabel>
            <input
              className={inputClass}
              value={draft.jwtHeader}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, jwtHeader: event.target.value }))
              }
            />
          </div>
          <div>
            <FieldLabel isDark={isDark}>
              {t("admin.config.advancedPanels.userCenter.tokenPrefix")}
            </FieldLabel>
            <input
              className={inputClass}
              value={draft.tokenPrefix}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  tokenPrefix: event.target.value,
                }))
              }
            />
          </div>
        </div>
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.userCenter.accessTokenSecret")}
          </FieldLabel>
          <PasswordInput
            value={draft.accessTokenSecret}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                accessTokenSecret: event.target.value,
              }))
            }
            wrapperClassName="mt-1"
            inputClassName={inputClass}
          />
        </div>
        <div>
          <FieldLabel isDark={isDark}>
            {t("admin.config.advancedPanels.userCenter.refreshTokenSecret")}
          </FieldLabel>
          <PasswordInput
            value={draft.refreshTokenSecret}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                refreshTokenSecret: event.target.value,
              }))
            }
            wrapperClassName="mt-1"
            inputClassName={inputClass}
          />
        </div>
      </SectionCard>
      <SectionCard
        title={t("admin.config.advancedPanels.userCenter.registrationAndAuth")}
        isDark={isDark}
      >
        {userCenterToggleFields.map((field) => (
          <ToggleCard
            key={field.key}
            isDark={isDark}
            title={field.label}
            value={field.value ? "enabled" : "disabled"}
            options={[...booleanOptions]}
            onChange={(nextValue) =>
              setDraft((prev) => ({
                ...prev,
                [field.key]: nextValue === "enabled",
              }) as UserCenterDraft)
            }
          />
        ))}
        <ToggleCard
          isDark={isDark}
          title={t("admin.config.advancedPanels.userCenter.passwdType")}
          value={draft.passwdType}
          options={[
            { value: "1", label: t("admin.config.advancedPanels.userCenter.passwdTypes.pbkdf2") },
            { value: "2", label: t("admin.config.advancedPanels.userCenter.passwdTypes.bcrypt") },
            { value: "3", label: t("admin.config.advancedPanels.userCenter.passwdTypes.argon2id") },
          ]}
          onChange={(value) =>
            setDraft((prev) => ({ ...prev, passwdType: value }))
          }
        />
      </SectionCard>
      <SectionCard
        title={t("admin.config.advancedPanels.userCenter.passwordHashing")}
        isDark={isDark}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {userCenterHashFields.map((field) => (
            <div key={field.key}>
              <FieldLabel isDark={isDark}>{field.label}</FieldLabel>
              <input
                className={inputClass}
                value={field.value}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    [field.key]: sanitizeUnsignedIntegerInput(event.target.value),
                  }) as UserCenterDraft)
                }
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};
