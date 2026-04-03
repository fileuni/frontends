import React, { useCallback, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { PasswordInput } from "@/components/common/PasswordInput";
import { ensureRecord, isRecord, type ConfigObject } from "@/lib/configObject";
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
  runtimeOs?: string | undefined;
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

const translateDriverLabel = (t: TFunction, driver: Driver): string => {
  switch (driver) {
    case "fs": return t("admin.config.storage.drivers.fs");
    case "memory": return t("admin.config.storage.drivers.memory");
    case "s3": return t("admin.config.storage.drivers.s3");
    case "webdav": return t("admin.config.storage.drivers.webdav");
    case "dropbox": return t("admin.config.storage.drivers.dropbox");
    case "onedrive": return t("admin.config.storage.drivers.onedrive");
    case "gdrive": return t("admin.config.storage.drivers.gdrive");
    case "android_saf": return t("admin.config.storage.drivers.android_saf");
    case "ios_scoped_fs": return t("admin.config.storage.drivers.ios_scoped_fs");
  }
};

const translateFieldLabel = (t: TFunction, driver: RemoteDriver, key: string): string => {
  switch (driver) {
    case "s3":
      switch (key) {
        case "endpoint": return t("systemConfig.setup.storagePool.s3.endpoint");
        case "region": return t("systemConfig.setup.storagePool.s3.region");
        case "bucket": return t("systemConfig.setup.storagePool.s3.bucket");
        case "access_key_id": return t("systemConfig.setup.storagePool.s3.access_key_id");
        case "secret_access_key": return t("systemConfig.setup.storagePool.s3.secret_access_key");
      }
      break;
    case "webdav":
      switch (key) {
        case "endpoint": return t("systemConfig.setup.storagePool.webdav.endpoint");
        case "username": return t("systemConfig.setup.storagePool.webdav.username");
        case "password": return t("systemConfig.setup.storagePool.webdav.password");
      }
      break;
    case "dropbox":
      switch (key) {
        case "access_token": return t("systemConfig.setup.storagePool.dropbox.access_token");
        case "refresh_token": return t("systemConfig.setup.storagePool.dropbox.refresh_token");
        case "client_id": return t("systemConfig.setup.storagePool.dropbox.client_id");
        case "client_secret": return t("systemConfig.setup.storagePool.dropbox.client_secret");
      }
      break;
    case "onedrive":
      switch (key) {
        case "access_token": return t("systemConfig.setup.storagePool.onedrive.access_token");
        case "refresh_token": return t("systemConfig.setup.storagePool.onedrive.refresh_token");
        case "client_id": return t("systemConfig.setup.storagePool.onedrive.client_id");
        case "client_secret": return t("systemConfig.setup.storagePool.onedrive.client_secret");
      }
      break;
    case "gdrive":
      switch (key) {
        case "access_token": return t("systemConfig.setup.storagePool.gdrive.access_token");
        case "refresh_token": return t("systemConfig.setup.storagePool.gdrive.refresh_token");
        case "client_id": return t("systemConfig.setup.storagePool.gdrive.client_id");
        case "client_secret": return t("systemConfig.setup.storagePool.gdrive.client_secret");
      }
      break;
  }
  throw new Error(`Missing storage pool label key for ${driver}.${key}`);
};

const translateFieldHint = (t: TFunction, driver: RemoteDriver, key: string): string => {
  switch (driver) {
    case "s3":
      switch (key) {
        case "endpoint": return t("systemConfig.setup.storagePool.s3Hints.endpoint");
        case "region": return t("systemConfig.setup.storagePool.s3Hints.region");
        case "bucket": return t("systemConfig.setup.storagePool.s3Hints.bucket");
        case "access_key_id": return t("systemConfig.setup.storagePool.s3Hints.access_key_id");
        case "secret_access_key": return t("systemConfig.setup.storagePool.s3Hints.secret_access_key");
      }
      break;
    case "webdav":
      switch (key) {
        case "endpoint": return t("systemConfig.setup.storagePool.webdavHints.endpoint");
        case "username": return t("systemConfig.setup.storagePool.webdavHints.username");
        case "password": return t("systemConfig.setup.storagePool.webdavHints.password");
      }
      break;
    case "dropbox":
      switch (key) {
        case "access_token": return t("systemConfig.setup.storagePool.dropboxHints.access_token");
        case "refresh_token": return t("systemConfig.setup.storagePool.dropboxHints.refresh_token");
        case "client_id": return t("systemConfig.setup.storagePool.dropboxHints.client_id");
        case "client_secret": return t("systemConfig.setup.storagePool.dropboxHints.client_secret");
      }
      break;
    case "onedrive":
      switch (key) {
        case "access_token": return t("systemConfig.setup.storagePool.onedriveHints.access_token");
        case "refresh_token": return t("systemConfig.setup.storagePool.onedriveHints.refresh_token");
        case "client_id": return t("systemConfig.setup.storagePool.onedriveHints.client_id");
        case "client_secret": return t("systemConfig.setup.storagePool.onedriveHints.client_secret");
      }
      break;
    case "gdrive":
      switch (key) {
        case "access_token": return t("systemConfig.setup.storagePool.gdriveHints.access_token");
        case "refresh_token": return t("systemConfig.setup.storagePool.gdriveHints.refresh_token");
        case "client_id": return t("systemConfig.setup.storagePool.gdriveHints.client_id");
        case "client_secret": return t("systemConfig.setup.storagePool.gdriveHints.client_secret");
      }
      break;
  }
  throw new Error(`Missing storage pool hint key for ${driver}.${key}`);
};

const asRecord = (value: unknown): ConfigObject => {
  return isRecord(value) ? value : {};
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
  const isSupportedDriver = useCallback(
    (value: unknown): value is Driver => {
      return (
        typeof value === "string" &&
        driverOptions.some((driver) => driver === value)
      );
    },
    [driverOptions],
  );

  const createDraft = useCallback(
    (source: string): PoolItem[] => {
      const parsed = tomlAdapter.parse(source);
      const root = asRecord(parsed);
      const hub = asRecord(root["vfs_storage_hub"]);
      const connectors = Array.isArray(hub["connectors"])
        ? hub["connectors"].filter(isRecord)
        : [];
      const pools = Array.isArray(hub["pools"]) ? hub["pools"].filter(isRecord) : [];
      const nextItems: PoolItem[] = pools.map((pool, index) => {
        const connector =
          connectors.find((item) => item["name"] === pool["primary_connector"]) ?? {};
        const optionsRaw = asRecord(connector["options"]);
        return {
          id:
            typeof pool["name"] === "string" && pool["name"].length > 0
              ? pool["name"]
              : `${index}`,
          name:
            typeof pool["name"] === "string" && pool["name"].length > 0
              ? pool["name"]
              : `pool-${index + 1}`,
          driver: isSupportedDriver(connector["driver"])
            ? connector["driver"]
            : defaultDriver,
          root:
            typeof connector["root"] === "string"
              ? connector["root"]
              : "{RUNTIMEDIR}/vfs",
          enabled: typeof pool["enable"] === "boolean" ? pool["enable"] : true,
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
    [defaultDriver, isSupportedDriver, tomlAdapter],
  );

  const buildContent = useCallback(
    (source: string, nextItems: PoolItem[]) => {
      const parsed = tomlAdapter.parse(source);
      const root: ConfigObject = isRecord(parsed) ? parsed : {};
      const hub = ensureRecord(root, "vfs_storage_hub");
      hub["connectors"] = nextItems.map((item) => ({
        name: `${item.name}-connector`,
        driver: item.driver,
        root: item.root,
        enable: item.enabled,
        options: item.options,
      }));
      hub["pools"] = nextItems.map((item) => ({
        name: item.name,
        primary_connector: `${item.name}-connector`,
        backup_connector: `${item.name}-connector`,
        enable_write_cache: false,
        enable: item.enabled,
        options: {},
      }));
      hub["default_pool"] = nextItems[0]?.name ?? "default-pool";
      if (!Array.isArray(hub["policies"])) {
        hub["policies"] = [];
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
          const label = translateFieldLabel(t, driver, field.key);
          const hint = translateFieldHint(t, driver, field.key);
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
              {t("systemConfig.setup.storagePool.title")}
            </div>
            <div className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
              {t("systemConfig.setup.storagePool.desc")}
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
              <label className="text-sm font-black text-slate-700 dark:text-slate-200 md:col-span-2">
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
              <label className="text-sm font-black text-slate-700 dark:text-slate-200 md:col-span-2">
                {t("admin.config.storage.fields.driver")}
                <select
                  className={inputClass}
                  value={item.driver}
                  onChange={(e) => {
                    const nextDriver = e.target.value as Driver;
                    patch((prev) =>
                      prev.map((entry) =>
                        entry.id === item.id
                          ? {
                              ...entry,
                              driver: nextDriver,
                              root: driverDefaults[nextDriver].root,
                            }
                          : entry,
                      ),
                    );
                  }}
                >
                  {driverOptions.map((driver) => (
                    <option key={driver} value={driver}>
                       {translateDriverLabel(t, driver)}
                    </option>
                  ))}
                </select>
              </label>
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
                  {t("systemConfig.setup.storagePool.rootHint", {
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
