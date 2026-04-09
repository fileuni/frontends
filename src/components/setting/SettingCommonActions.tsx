import React from "react";
import type { TFunction } from "i18next";
import { Clock3, Fingerprint, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { cn } from "@/lib/utils";
import { settingCommonIcons, type SettingActionItem } from "./SettingOverview";
import {
  AdminPasswordInlinePanel,
  CacheAccelerationInlinePanel,
  CompressionInlinePanel,
  ProtectedStorageInlinePanel,
  ThumbnailInlinePanel,
} from "./SettingInlineExternalPanels";
import { IdentityVerificationInlinePanel } from "./IdentityVerificationInlinePanel";
import { MediaTranscodingInlinePanel, type ProbeMediaBackend } from "./MediaTranscodingConfigPanel";
import {
  CacheInlinePanel,
  DatabaseInlinePanel,
  PerformanceInlinePanel,
} from "./SettingInlineQuickPanels";
import { StoragePoolInlinePanel } from "./StoragePoolInlinePanel";
import {
  FlowStartupInlinePanel,
  type FlowStartupTestRunner,
} from "./FlowStartupInlinePanel";
import type {
  ExternalToolDiagnosisResponse,
  TomlAdapter,
} from "./ExternalDependencyConfigModal";
import type { ProbeExternalTool } from "./SharedFfmpegField";
import type { SystemHardwareInfo } from "./ConfigQuickSettingsModal";

export type DatabaseCheckPayload = {
  databaseType: "sqlite" | "postgres";
  connectionString: string;
};

export type CacheCheckPayload = {
  cacheType: string;
  connectionString: string;
};

export interface SettingCommonCapabilityHandlers {
  onTestDatabase: (payload: DatabaseCheckPayload) => Promise<void>;
  onTestCache: (payload: CacheCheckPayload) => Promise<void>;
  onDiagnoseExternalTools: (
    configuredValues: Record<string, string>,
  ) => Promise<ExternalToolDiagnosisResponse>;
  onProbeExternalTool: ProbeExternalTool;
  onProbeMediaBackend: ProbeMediaBackend;
  onTestPreStartup: FlowStartupTestRunner;
  onTestPostStartup: FlowStartupTestRunner;
}

export interface SettingLicenseStatusLike {
  registration?: {
    is_valid: boolean;
    enabled: boolean;
    expires_at?: string | null;
    features: string[];
    msg: string;
  };
  branding?: {
    is_valid: boolean;
    enabled: boolean;
    expires_at?: string | null;
    features: string[];
    msg: string;
  };
  storage_encryption?: {
    is_valid: boolean;
    enabled: boolean;
    expires_at?: string | null;
    features: string[];
    msg: string;
  };
  branding_config?: {
    logo_url?: string | null;
    logo_name?: string | null;
    footer_text?: string | null;
  };
  device_code?: string;
  hw_id?: string;
  aux_id?: string;
  // Backward compatibility for LicenseInlinePanel
  is_valid?: boolean;
  msg?: string;
  expires_at?: string | null;
}

interface LicenseInlinePanelProps {
  licenseStatus: SettingLicenseStatusLike | null;
  licenseKey: string;
  onLicenseKeyChange: (value: string) => void;
}

const LicenseInlinePanel: React.FC<LicenseInlinePanelProps> = ({
  licenseStatus,
  licenseKey,
  onLicenseKeyChange,
}) => {
  const { t, i18n } = useTranslation();
  const isDark = useResolvedTheme() === "dark";

  // Derive top-level status from multi-license status if needed
  const isValid = licenseStatus?.is_valid ?? (
    licenseStatus?.registration?.is_valid ||
    licenseStatus?.branding?.is_valid ||
    licenseStatus?.storage_encryption?.is_valid
  ) ?? false;

  const expiresAt = licenseStatus?.expires_at ?? licenseStatus?.registration?.expires_at;

  const statusText = !licenseStatus
    ? t("common.loading")
    : isValid
      ? t("admin.config.quickSettings.options.licenseAuthorized")
      : t("admin.config.quickSettings.options.licenseUnauthorized");

  const expiresText = (() => {
    if (!licenseStatus) return t("common.loading");
    if (!expiresAt) return t("common.none");
    const dt = new Date(expiresAt);
    if (Number.isNaN(dt.getTime())) return expiresAt;
    try {
      return new Intl.DateTimeFormat(i18n.language || undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(dt);
    } catch {
      return dt.toLocaleString();
    }
  })();

  const statusTone = !licenseStatus
    ? isDark
      ? "border-white/10 bg-black/20 text-slate-200"
      : "border-slate-200 bg-white text-slate-700"
    : isValid
      ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
      : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100";

  const baseCardClassName = cn(
    "rounded-2xl border px-3 py-3",
    isDark
      ? "border-white/10 bg-black/20 text-slate-100"
      : "border-slate-200 bg-white text-slate-900",
  );

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <label
        className={cn(
          "block text-sm font-black",
          isDark ? "text-slate-200" : "text-slate-700",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span>{t("admin.config.license.title")}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-black tracking-[0.18em]",
              statusTone,
            )}
          >
            {statusText}
          </span>
        </div>
        <textarea
          value={licenseKey}
          onChange={(event) => onLicenseKeyChange(event.target.value)}
          placeholder={t("admin.config.license.pasteKey")}
          className={cn(
            "mt-2 min-h-28 w-full rounded-2xl border px-3 py-3 text-sm font-mono shadow-inner transition-colors",
            isDark
              ? "border-white/10 bg-black/30 text-slate-100 placeholder:text-slate-500"
              : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400",
          )}
        />
        <div
          className={cn(
            "mt-2 text-xs leading-6",
            isDark ? "text-slate-400" : "text-slate-500",
          )}
        >
          {t("admin.config.quickSettings.fields.licenseHint")}
        </div>
      </label>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <div className={baseCardClassName}>
          <div className="flex items-center gap-2">
            <ShieldCheck
              size={16}
              className={
                !licenseStatus
                  ? isDark
                    ? "text-slate-400"
                    : "text-slate-500"
                  : licenseStatus.is_valid
                    ? "text-emerald-500"
                    : "text-amber-500"
              }
            />
            <div
              className={cn(
                "text-[11px] font-black tracking-[0.18em]",
                isDark ? "text-slate-400" : "text-slate-500",
              )}
            >
              {t("admin.config.quickSettings.fields.licenseStatus")}
            </div>
          </div>
          <div
            className={cn(
              "mt-2 text-sm font-black",
              !licenseStatus
                ? isDark
                  ? "text-slate-200"
                  : "text-slate-700"
                : licenseStatus.is_valid
                  ? isDark
                    ? "text-emerald-300"
                    : "text-emerald-700"
                  : isDark
                    ? "text-amber-300"
                    : "text-amber-700",
            )}
          >
            {statusText}
          </div>
        </div>

        <div className={baseCardClassName}>
          <div className="flex items-center gap-2">
            <Clock3
              size={16}
              className={isDark ? "text-violet-300" : "text-violet-600"}
            />
            <div
              className={cn(
                "text-[11px] font-black tracking-[0.18em]",
                isDark ? "text-slate-400" : "text-slate-500",
              )}
            >
              {t("admin.config.quickSettings.fields.expiresAt")}
            </div>
          </div>
          <div
            className={cn(
              "mt-2 text-sm font-black font-mono",
              isDark ? "text-slate-100" : "text-slate-800",
            )}
          >
            {expiresText}
          </div>
        </div>

        <div className={cn(baseCardClassName, "sm:col-span-2 lg:col-span-1")}>
          <div className="flex items-center gap-2">
            <Fingerprint
              size={16}
              className={isDark ? "text-purple-300" : "text-purple-600"}
            />
            <div
              className={cn(
                "text-[11px] font-black tracking-[0.18em]",
                isDark ? "text-slate-400" : "text-slate-500",
              )}
            >
              {t([
                "admin.config.quickSettings.fields.currentHardwareCode",
                "admin.config.quickSettings.fields.hwFingerprint",
              ])}
            </div>
          </div>
          <div
            className={cn(
              "mt-2 text-sm font-black font-mono break-all",
              isDark ? "text-slate-100" : "text-slate-800",
            )}
          >
            {licenseStatus?.device_code?.trim() || "-"}
          </div>
          {(licenseStatus?.hw_id || licenseStatus?.aux_id) && (
            <div
              className={cn(
                "mt-2 text-xs leading-5 break-all",
                isDark ? "text-slate-400" : "text-slate-500",
              )}
            >
              {licenseStatus.hw_id ? `HW ID: ${licenseStatus.hw_id}` : ""}
              {licenseStatus.hw_id && licenseStatus.aux_id ? " | " : ""}
              {licenseStatus.aux_id ? `AUX ID: ${licenseStatus.aux_id}` : ""}
            </div>
          )}
        </div>

        {licenseStatus?.msg && (
          <div
            className={cn(
              "rounded-2xl border px-3 py-3 text-sm leading-6 sm:col-span-2 lg:col-span-1",
              isDark
                ? "border-white/10 bg-white/[0.03] text-slate-300"
                : "border-slate-200 bg-slate-50 text-slate-600",
            )}
          >
            {licenseStatus.msg}
          </div>
        )}
      </div>
    </div>
  );
};

interface BuildSettingCommonActionsParams {
  t: TFunction;
  isDark: boolean;
  tomlAdapter: TomlAdapter;
  content: string;
  onContentChange: (value: string) => void;
  runtimeOs?: string | undefined;
  systemHardware?: SystemHardwareInfo | null;
  sharedCapabilities: SettingCommonCapabilityHandlers;
  adminPassword: {
    value: string;
    onValueChange: (password: string) => void;
    hint: string;
  };
  license?: {
    status?: SettingLicenseStatusLike | null;
    licenseKey?: string;
    onLicenseKeyChange?: (value: string) => void;
    onApplyLicense?: (update?: {
      registration?: { key?: string | null; enabled: boolean } | null;
      branding_license?: { key?: string | null; enabled: boolean } | null;
      storage_encryption?: { key?: string | null; enabled: boolean } | null;
      branding?: {
        logo_url?: string | null;
        logo_name?: string | null;
        footer_text?: string | null;
      } | null;
    }) => void;
    saving?: boolean;
  };
  storage: {
    onPrimaryAction: () => void;
    primaryActionLabel: string;
  };
}

export const buildSettingCommonActions = ({
  t,
  isDark,
  tomlAdapter,
  content,
  onContentChange,
  runtimeOs,
  systemHardware,
  sharedCapabilities,
  adminPassword,
  license,
  storage,
}: BuildSettingCommonActionsParams): SettingActionItem[] => {
  const {
    onTestDatabase,
    onTestCache,
    onDiagnoseExternalTools,
    onProbeExternalTool,
    onProbeMediaBackend,
    onTestPreStartup,
    onTestPostStartup,
  } = sharedCapabilities;

  const actions: SettingActionItem[] = [
    {
      id: "performance",
      routeKey: "Performance",
      routeAliases: ["Performance", "performance_tuning", "性能调优"],
      label: t("admin.config.quickSettings.performance.performanceTips.title"),
      description: "",
      icon: settingCommonIcons.performance,
      renderPanel: () => (
        <PerformanceInlinePanel
          tomlAdapter={tomlAdapter}
          content={content}
          onContentChange={onContentChange}
          runtimeOs={runtimeOs}
          systemHardware={systemHardware}
        />
      ),
    },
    {
      id: "db-cache",
      routeKey: "datebase_and_cache",
      routeAliases: [
        "datebase_and_cache",
        "db_cache",
        "configure_database_and_cache",
        "Configure database and cache",
      ],
      label: t("systemConfig.setup.steps.databaseCache"),
      description: "",
      icon: settingCommonIcons.database,
      renderPanel: () => (
        <div className="grid gap-4">
          <section className="space-y-3">
            <h4
              className={cn(
                "text-base font-black",
                isDark ? "text-slate-100" : "text-slate-900",
              )}
            >
              {t("systemConfig.setup.config.dbType")}
            </h4>
            <DatabaseInlinePanel
              tomlAdapter={tomlAdapter}
              content={content}
              onContentChange={onContentChange}
              runtimeOs={runtimeOs}
              onTestDatabase={onTestDatabase}
            />
          </section>
          <section className="space-y-3">
            <h4
              className={cn(
                "text-base font-black",
                isDark ? "text-slate-100" : "text-slate-900",
              )}
            >
              {t("systemConfig.setup.config.kvType")}
            </h4>
            <CacheInlinePanel
              tomlAdapter={tomlAdapter}
              content={content}
              onContentChange={onContentChange}
              runtimeOs={runtimeOs}
              onTestCache={onTestCache}
            />
          </section>
        </div>
      ),
    },
    {
      id: "storage",
      routeKey: "storage",
      label: t("systemConfig.setup.storagePool.title"),
      description: "",
      icon: settingCommonIcons.storage,
      renderPanel: () => (
        <StoragePoolInlinePanel
          tomlAdapter={tomlAdapter}
          content={content}
          onContentChange={onContentChange}
          runtimeOs={runtimeOs}
        />
      ),
      actions: [
        {
          id: "save",
          label: storage.primaryActionLabel,
          onClick: storage.onPrimaryAction,
          variant: "primary",
        },
        {
          id: "jump",
          label: t("admin.config.storage.title"),
          onClick: () =>
            document
              .getElementById("setup-inline-storage")
              ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        },
      ],
    },
    {
      id: "admin-password",
      routeKey: "admin_password",
      label: t("systemConfig.setup.admin.changePassword"),
      description: "",
      icon: settingCommonIcons.admin,
      renderPanel: () => (
        <AdminPasswordInlinePanel
          value={adminPassword.value}
          onValueChange={adminPassword.onValueChange}
          hint={adminPassword.hint}
        />
      ),
      points: [] as string[],
    },
    {
      id: "identity-verification",
      routeKey: "identity_verification",
      routeAliases: ["identity_verification", "identity-verification", "邮箱手机验证"],
      label: t("admin.config.identityVerification.title"),
      description: "",
      icon: settingCommonIcons.protectedStorage,
      renderPanel: () => (
        <IdentityVerificationInlinePanel
          tomlAdapter={tomlAdapter}
          content={content}
          onContentChange={onContentChange}
        />
      ),
    },
    {
      id: "cache-acceleration",
      routeKey: "cache_acceleration",
      label: t("systemConfig.setup.storageCache.title"),
      description: "",
      icon: settingCommonIcons.cache,
      renderPanel: () => (
        <CacheAccelerationInlinePanel
          tomlAdapter={tomlAdapter}
          content={content}
          onContentChange={onContentChange}
        />
      ),
    },
    {
      id: "protected-storage",
      routeKey: "protected_storage",
      routeAliases: ["protected_storage", "protected-storage", "加密和混淆储存"],
      label: t("admin.config.protectedStorage.title"),
      description: "",
      icon: settingCommonIcons.protectedStorage,
      renderPanel: () => (
        <ProtectedStorageInlinePanel
          tomlAdapter={tomlAdapter}
          content={content}
          onContentChange={onContentChange}
        />
      ),
    },
    {
      id: "thumbnail",
      routeKey: "thumbnail",
      label: t("admin.config.thumbnail.title"),
      description: "",
      icon: settingCommonIcons.thumbnail,
      renderPanel: () => (
        <ThumbnailInlinePanel
          tomlAdapter={tomlAdapter}
          content={content}
          onContentChange={onContentChange}
          onDiagnoseExternalTools={onDiagnoseExternalTools}
          onProbeExternalTool={onProbeExternalTool}
        />
      ),
    },
    {
      id: "media-transcoding",
      routeKey: "media_transcoding",
      label: t("admin.config.mediaTranscoding.title"),
      description: "",
      icon: settingCommonIcons.mediaTranscoding,
      renderPanel: () => (
        <MediaTranscodingInlinePanel
          tomlAdapter={tomlAdapter}
          content={content}
          onContentChange={onContentChange}
          onDiagnoseExternalTools={onDiagnoseExternalTools}
          onProbeExternalTool={onProbeExternalTool}
          onProbeMediaBackend={onProbeMediaBackend}
        />
      ),
    },
    {
      id: "compression",
      routeKey: "compression",
      label: t("admin.config.compression.title"),
      description: "",
      icon: settingCommonIcons.compression,
      renderPanel: () => (
        <CompressionInlinePanel
          tomlAdapter={tomlAdapter}
          content={content}
          onContentChange={onContentChange}
          onProbeExternalTool={onProbeExternalTool}
        />
      ),
    },
    {
      id: "flow-startup",
      routeKey: "flow_startup",
      routeAliases: ["flow_startup", "flow-startup", "跟随启动", "启动流程"],
      label: t("admin.config.flowStartup.title"),
      description: "",
      icon: settingCommonIcons.performance,
      renderPanel: () => (
        <FlowStartupInlinePanel
          tomlAdapter={tomlAdapter}
          content={content}
          onContentChange={onContentChange}
          runtimeOs={runtimeOs}
          onTestPreStartup={onTestPreStartup}
          onTestPostStartup={onTestPostStartup}
        />
      ),
    },
  ];

  if (license) {
    actions.splice(5, 0, {
      id: "license",
      routeKey: "license",
      label: t("admin.config.license.title"),
      description: "",
      icon: settingCommonIcons.license,
      renderPanel: () => (
        <LicenseInlinePanel
          licenseStatus={license.status ?? null}
          licenseKey={license.licenseKey ?? ""}
          onLicenseKeyChange={license.onLicenseKeyChange ?? (() => {})}
        />
      ),
      actions: [
        {
          id: "save",
          label: t("systemConfig.setup.guide.card3Action"),
          onClick: () => license.onApplyLicense?.(),
          variant: "primary",
          disabled: license.saving ?? false,
        },
      ],
    });
  }

  return actions;
};
