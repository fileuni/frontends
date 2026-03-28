import React from "react";
import type { TFunction } from "i18next";
import { Clock3, ShieldCheck, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { cn } from "@/lib/utils";
import { settingCommonIcons, type SettingActionItem } from "./SettingOverview";
import {
  AdminPasswordInlinePanel,
  CacheAccelerationInlinePanel,
  CompressionInlinePanel,
  ThumbnailInlinePanel,
} from "./SettingInlineExternalPanels";
import {
  CacheInlinePanel,
  DatabaseInlinePanel,
  PerformanceInlinePanel,
} from "./SettingInlineQuickPanels";
import { StoragePoolInlinePanel } from "./StoragePoolInlinePanel";
import type { TomlAdapter } from "./ExternalDependencyConfigModal";
import type { SystemHardwareInfo } from "./ConfigQuickSettingsModal";

type DatabaseCheckPayload = {
  databaseType: "sqlite" | "postgres";
  connectionString: string;
};

type CacheCheckPayload = {
  cacheType: string;
  connectionString: string;
};

export interface SettingLicenseStatusLike {
  is_valid: boolean;
  msg?: string;
  current_users: number;
  max_users: number;
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

  const statusText = !licenseStatus
    ? t("common.loading")
    : licenseStatus.is_valid
      ? t("admin.config.quickSettings.options.licenseAuthorized")
      : t("admin.config.quickSettings.options.licenseUnauthorized");

  const expiresText = (() => {
    if (!licenseStatus) return t("common.loading");
    if (!licenseStatus.expires_at) return t("common.none");
    const dt = new Date(licenseStatus.expires_at);
    if (Number.isNaN(dt.getTime())) return licenseStatus.expires_at;
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
    : licenseStatus.is_valid
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
              "rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.18em]",
              statusTone,
            )}
          >
            {statusText}
          </span>
        </div>
        <textarea
          value={licenseKey}
          onChange={(event) => onLicenseKeyChange(event.target.value)}
          placeholder={t(
            "admin.config.quickSettings.fields.licenseInputPlaceholder",
          )}
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
                "text-[11px] font-black uppercase tracking-[0.18em]",
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
            <Users
              size={16}
              className={isDark ? "text-cyan-300" : "text-cyan-600"}
            />
            <div
              className={cn(
                "text-[11px] font-black uppercase tracking-[0.18em]",
                isDark ? "text-slate-400" : "text-slate-500",
              )}
            >
              {t("admin.config.quickSettings.fields.maxUsers")}
            </div>
          </div>
          <div
            className={cn(
              "mt-2 text-sm font-black font-mono",
              isDark ? "text-slate-100" : "text-slate-800",
            )}
          >
            {licenseStatus
              ? `${licenseStatus.current_users} / ${licenseStatus.max_users}`
              : "-"}
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
                "text-[11px] font-black uppercase tracking-[0.18em]",
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
  runtimeOs?: string;
  systemHardware?: SystemHardwareInfo | null;
  onTestDatabase?: (payload: DatabaseCheckPayload) => Promise<void>;
  onTestCache?: (payload: CacheCheckPayload) => Promise<void>;
  adminPassword: {
    onApply: (
      password: string,
    ) => Promise<void | string | { username?: string }>;
    loading?: boolean;
    hint: string;
  };
  license: {
    status: SettingLicenseStatusLike | null;
    licenseKey: string;
    onLicenseKeyChange: (value: string) => void;
    onApplyLicense: () => void;
    saving: boolean;
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
  onTestDatabase,
  onTestCache,
  adminPassword,
  license,
  storage,
}: BuildSettingCommonActionsParams): SettingActionItem[] => {
  return [
    {
      id: "performance",
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
      label: t("setup.steps.databaseCache"),
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
              {t("setup.config.dbType")}
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
              {t("setup.config.kvType")}
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
      label: t("setup.storagePool.title"),
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
      label: t("setup.admin.changePassword"),
      description: "",
      icon: settingCommonIcons.admin,
      renderPanel: () => (
        <AdminPasswordInlinePanel
          onApply={adminPassword.onApply}
          loading={adminPassword.loading}
          hint={adminPassword.hint}
        />
      ),
      points: [] as string[],
    },
    {
      id: "license",
      label: t("admin.config.license.title"),
      description: "",
      icon: settingCommonIcons.license,
      renderPanel: () => (
        <LicenseInlinePanel
          licenseStatus={license.status}
          licenseKey={license.licenseKey}
          onLicenseKeyChange={license.onLicenseKeyChange}
        />
      ),
      actions: [
        {
          id: "save",
          label: t("setup.guide.card3Action"),
          onClick: license.onApplyLicense,
          variant: "primary",
          disabled: license.saving,
        },
      ],
    },
    {
      id: "cache-acceleration",
      label: t("setup.storageCache.title"),
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
      id: "thumbnail",
      label: t("admin.config.thumbnail.title"),
      description: "",
      icon: settingCommonIcons.thumbnail,
      renderPanel: () => (
        <ThumbnailInlinePanel
          tomlAdapter={tomlAdapter}
          content={content}
          onContentChange={onContentChange}
        />
      ),
    },
    {
      id: "compression",
      label: t("admin.config.compression.title"),
      description: "",
      icon: settingCommonIcons.compression,
      renderPanel: () => (
        <CompressionInlinePanel
          tomlAdapter={tomlAdapter}
          content={content}
          onContentChange={onContentChange}
        />
      ),
    },
  ];
};
