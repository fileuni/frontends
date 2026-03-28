import React, { useCallback, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { PasswordInput } from "@/components/common/PasswordInput";
import type { TomlAdapter } from "./ExternalDependencyConfigModal";
import { SettingSegmentedControl } from "./SettingSegmentedControl";
import { useConfigDraftBinding } from "./useConfigDraftBinding";

type Driver =
  | "fs"
  | "memory"
  | "s3"
  | "webdav"
  | "dropbox"
  | "onedrive"
  | "gdrive"
  | "android_saf"
  | "ios_scoped_fs";

type RemoteDriver = "s3" | "webdav" | "dropbox" | "onedrive" | "gdrive";

type DriverOptionField = {
  key: string;
  secret?: boolean;
  fullWidth?: boolean;
};

type PoolItem = {
  id: string;
  name: string;
  driver: Driver;
  root: string;
  enabled: boolean;
  options: Record<string, string>;
};

interface Props {
  tomlAdapter: TomlAdapter;
  content: string;
  onContentChange: (value: string) => void;
  runtimeOs?: string;
}

const makeId = () => Math.random().toString(36).slice(2, 10);

const driverDefaults: Record<Driver, { root: string; tipsKey: string }> = {
  fs: {
    root: "{RUNTIMEDIR}/vfs",
    tipsKey: "admin.config.storage.hints.root.fs",
  },
  memory: { root: "/", tipsKey: "admin.config.storage.hints.root.memory" },
  s3: { root: "/", tipsKey: "admin.config.storage.hints.root.s3" },
  webdav: { root: "/", tipsKey: "admin.config.storage.hints.root.webdav" },
  dropbox: { root: "/", tipsKey: "admin.config.storage.hints.root.dropbox" },
  onedrive: { root: "/", tipsKey: "admin.config.storage.hints.root.onedrive" },
  gdrive: { root: "/", tipsKey: "admin.config.storage.hints.root.gdrive" },
  android_saf: {
    root: "content://...",
    tipsKey: "admin.config.storage.hints.root.android_saf",
  },
  ios_scoped_fs: {
    root: "bookmark_b64:<BASE64>",
    tipsKey: "admin.config.storage.hints.root.ios_scoped_fs",
  },
};

const remoteDriverFields: Record<RemoteDriver, DriverOptionField[]> = {
  s3: [
    { key: "endpoint" },
    { key: "region" },
    { key: "bucket" },
    { key: "access_key_id" },
    { key: "secret_access_key", secret: true },
  ],
  webdav: [
    { key: "endpoint", fullWidth: true },
    { key: "username" },
    { key: "password", secret: true },
  ],
  dropbox: [
    { key: "access_token", secret: true },
    { key: "refresh_token", secret: true },
    { key: "client_id" },
    { key: "client_secret", secret: true },
  ],
  onedrive: [
    { key: "access_token", secret: true },
    { key: "refresh_token", secret: true },
    { key: "client_id" },
    { key: "client_secret", secret: true },
  ],
  gdrive: [
    { key: "access_token", secret: true },
    { key: "refresh_token", secret: true },
    { key: "client_id" },
    { key: "client_secret", secret: true },
  ],
};

const isRemoteDriver = (driver: Driver): driver is RemoteDriver => {
  return driver in remoteDriverFields;
};

const getFieldHintKey = (driver: RemoteDriver, key: string): string => {
  return driver === "s3"
    ? `setup.storagePool.s3Hints.${key}`
    : `setup.storagePool.${driver}Hints.${key}`;
};

export const StoragePoolInlinePanel: React.FC<Props> = ({
  tomlAdapter,
  content,
  onContentChange,
  runtimeOs,
}) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const normalizedOs = runtimeOs?.toLowerCase() ?? "";
  const driverOptions = useMemo(() => {
    const next: Driver[] = [
      "fs",
      "s3",
      "webdav",
      "dropbox",
      "onedrive",
      "gdrive",
    ];
    if (normalizedOs === "android") {
      next.push("android_saf");
    }
    if (normalizedOs === "ios") {
      next.push("ios_scoped_fs");
    }
    return next;
  }, [normalizedOs]);
  const defaultDriver = driverOptions[0] ?? "fs";

  const createDraft = useCallback(
    (source: string): PoolItem[] => {
      const root = tomlAdapter.parse(source) as Record<string, any>;
      const hub = root?.vfs_storage_hub ?? {};
      const connectors = Array.isArray(hub.connectors) ? hub.connectors : [];
      const pools = Array.isArray(hub.pools) ? hub.pools : [];
      const nextItems: PoolItem[] = pools.map((pool: any, index: number) => {
        const connector =
          connectors.find(
            (item: any) => item.name === pool.primary_connector,
          ) ?? {};
        const optionsRaw = connector.options ?? {};
        return {
          id: `${pool.name || index}`,
          name: pool.name ?? `pool-${index + 1}`,
          driver: driverOptions.includes(connector.driver as Driver)
            ? (connector.driver as Driver)
            : defaultDriver,
          root: connector.root ?? "{RUNTIMEDIR}/vfs",
          enabled: typeof pool.enable === "boolean" ? pool.enable : true,
          options: Object.fromEntries(
            Object.entries(optionsRaw).map(([key, value]) => [
              key,
              String(value),
            ]),
          ),
        };
      });
      return nextItems.length > 0
        ? nextItems
        : [
            {
              id: makeId(),
              name: "default-pool",
              driver: defaultDriver,
              root: driverDefaults[defaultDriver].root,
              enabled: true,
              options: {},
            },
          ];
    },
    [defaultDriver, driverOptions, tomlAdapter],
  );

  const buildContent = useCallback(
    (source: string, nextItems: PoolItem[]) => {
      const root = tomlAdapter.parse(source) as Record<string, any>;
      const hub = root.vfs_storage_hub ?? {};
      root.vfs_storage_hub = hub;
      hub.connectors = nextItems.map((item) => ({
        name: `${item.name}-connector`,
        driver: item.driver,
        root: item.root,
        enable: item.enabled,
        options: item.options,
      }));
      hub.pools = nextItems.map((item) => ({
        name: item.name,
        primary_connector: `${item.name}-connector`,
        backup_connector: `${item.name}-connector`,
        enable_write_cache: false,
        enable: item.enabled,
        options: {},
      }));
      hub.default_pool = nextItems[0]?.name ?? "default-pool";
      if (!Array.isArray(hub.policies)) {
        hub.policies = [];
      }
      return tomlAdapter.stringify(root);
    },
    [tomlAdapter],
  );

  const { draft: items, setDraft: setItems } = useConfigDraftBinding<
    PoolItem[]
  >({
    content,
    onContentChange,
    createDraft,
    buildContent,
  });

  const patch = (updater: (prev: PoolItem[]) => PoolItem[]) => {
    setItems((prev) => updater(prev));
  };

  const inputClass = cn(
    "mt-1 h-11 w-full rounded-xl border px-3 text-sm",
    isDark
      ? "border-white/10 bg-black/30 text-white"
      : "border-slate-300 bg-white text-slate-900",
  );
  const passwordInputClass = cn(
    "h-11 w-full rounded-xl border px-3 text-sm",
    isDark
      ? "border-white/10 bg-black/30 text-white"
      : "border-slate-300 bg-white text-slate-900",
  );

  const renderRemoteDriverFields = (item: PoolItem) => {
    if (!isRemoteDriver(item.driver)) {
      return null;
    }

    const driver = item.driver;

    return (
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {remoteDriverFields[driver].map((field) => {
          const label = t(`setup.storagePool.${driver}.${field.key}`);
          const hint = t(getFieldHintKey(driver, field.key));
          const inputId = `${item.id}-${field.key}`;

          return (
            <div
              key={`${item.id}-${field.key}`}
              className={cn(
                "text-sm text-slate-700 dark:text-slate-200",
                field.fullWidth && "md:col-span-2",
              )}
            >
              <label htmlFor={inputId} className="font-black">
                {label}
              </label>
              {field.secret ? (
                <PasswordInput
                  id={inputId}
                  value={item.options[field.key] ?? ""}
                  wrapperClassName="mt-1"
                  inputClassName={passwordInputClass}
                  onChange={(e) =>
                    patch((prev) =>
                      prev.map((entry) =>
                        entry.id === item.id
                          ? {
                              ...entry,
                              options: {
                                ...entry.options,
                                [field.key]: e.target.value,
                              },
                            }
                          : entry,
                      ),
                    )
                  }
                />
              ) : (
                <input
                  id={inputId}
                  className={inputClass}
                  value={item.options[field.key] ?? ""}
                  onChange={(e) =>
                    patch((prev) =>
                      prev.map((entry) =>
                        entry.id === item.id
                          ? {
                              ...entry,
                              options: {
                                ...entry.options,
                                [field.key]: e.target.value,
                              },
                            }
                          : entry,
                      ),
                    )
                  }
                />
              )}
              <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {hint}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-2xl border p-4",
          isDark
            ? "border-white/10 bg-white/[0.03]"
            : "border-slate-200 bg-white",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div
              className={cn(
                "text-sm font-black",
                isDark ? "text-slate-100" : "text-slate-900",
              )}
            >
              {t("setup.storagePool.title")}
            </div>
            <div className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
              {t("setup.storagePool.desc")}
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              patch((prev) => [
                ...prev,
                {
                  id: makeId(),
                  name: `pool-${prev.length + 1}`,
                  driver: defaultDriver,
                  root: driverDefaults[defaultDriver].root,
                  enabled: true,
                  options: {},
                },
              ])
            }
            className="inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-black"
          >
            <Plus size={16} />
            {t("admin.config.storage.actions.addPool")}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              "rounded-2xl border p-4",
              isDark
                ? "border-white/10 bg-white/[0.03]"
                : "border-slate-200 bg-white shadow-sm",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div
                className={cn(
                  "text-sm font-black",
                  isDark ? "text-slate-100" : "text-slate-900",
                )}
              >
                {item.name ||
                  `${t("admin.config.storage.pools.pool")} #${index + 1}`}
              </div>
              <button
                type="button"
                onClick={() =>
                  patch((prev) =>
                    prev.length > 1
                      ? prev.filter((entry) => entry.id !== item.id)
                      : prev,
                  )
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-rose-600"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm font-black text-slate-700 dark:text-slate-200">
                {t("admin.config.storage.fields.name")}
                <input
                  className={inputClass}
                  value={item.name}
                  onChange={(e) =>
                    patch((prev) =>
                      prev.map((entry) =>
                        entry.id === item.id
                          ? { ...entry, name: e.target.value }
                          : entry,
                      ),
                    )
                  }
                />
              </label>
              <div className="text-sm font-black text-slate-700 dark:text-slate-200">
                {t("admin.config.storage.fields.driver")}
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {driverOptions.map((driver) => {
                    const active = item.driver === driver;
                    return (
                      <button
                        key={driver}
                        type="button"
                        onClick={() =>
                          patch((prev) =>
                            prev.map((entry) =>
                              entry.id === item.id
                                ? {
                                    ...entry,
                                    driver,
                                    root: driverDefaults[driver].root,
                                  }
                                : entry,
                            ),
                          )
                        }
                        className={cn(
                          "rounded-xl border px-3 py-3 text-left transition-colors",
                          active
                            ? "border-primary bg-primary/10 shadow-sm shadow-primary/10"
                            : isDark
                              ? "border-white/10 bg-black/20 hover:bg-white/[0.05]"
                              : "border-slate-200 bg-slate-50 hover:bg-slate-100",
                        )}
                      >
                        <div
                          className={cn(
                            "text-sm font-black",
                            active
                              ? "text-primary"
                              : isDark
                                ? "text-slate-100"
                                : "text-slate-800",
                          )}
                        >
                          {t(`admin.config.storage.drivers.${driver}`)}
                        </div>
                        <div
                          className={cn(
                            "mt-1 text-xs font-mono",
                            active
                              ? "text-primary/80"
                              : isDark
                                ? "text-slate-400"
                                : "text-slate-500",
                          )}
                        >
                          {driver}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {t(driverDefaults[item.driver].tipsKey)}
                </div>
              </div>
              <label className="text-sm font-black text-slate-700 dark:text-slate-200 md:col-span-2">
                {t("admin.config.storage.fields.root")}
                <input
                  className={inputClass}
                  value={item.root}
                  onChange={(e) =>
                    patch((prev) =>
                      prev.map((entry) =>
                        entry.id === item.id
                          ? { ...entry, root: e.target.value }
                          : entry,
                      ),
                    )
                  }
                />
                <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {t("setup.storagePool.rootHint", {
                    value: driverDefaults[item.driver].root,
                  })}
                </div>
              </label>
              <div
                className={cn(
                  "flex flex-col gap-3 rounded-xl border px-3 py-3 md:col-span-2",
                  isDark
                    ? "border-white/10 bg-black/20"
                    : "border-slate-200 bg-slate-50",
                )}
              >
                <div>
                  <div
                    className={cn(
                      "text-sm font-black",
                      isDark ? "text-slate-100" : "text-slate-900",
                    )}
                  >
                    {t("admin.config.storage.fields.enabled")}
                  </div>
                  <div
                    className={cn(
                      "mt-1 text-xs leading-5",
                      isDark ? "text-slate-400" : "text-slate-500",
                    )}
                  >
                    {item.enabled ? t("common.enabled") : t("common.disabled")}
                  </div>
                </div>
                <SettingSegmentedControl
                  value={item.enabled ? "enabled" : "disabled"}
                  options={[
                    { value: "enabled", label: t("common.enabled") },
                    { value: "disabled", label: t("common.disabled") },
                  ]}
                  onChange={(value) =>
                    patch((prev) =>
                      prev.map((entry) =>
                        entry.id === item.id
                          ? { ...entry, enabled: value === "enabled" }
                          : entry,
                      ),
                    )
                  }
                />
              </div>
            </div>

            {renderRemoteDriverFields(item)}
          </div>
        ))}
      </div>
    </div>
  );
};
