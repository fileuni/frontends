// VFS Storage Configuration Modal
// Visual editor for vfs_storage_hub.{connectors,pools,policies,default_pool}

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Database, HardDrive, Layers, Plus, Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { useEscapeToCloseTopLayer } from "@/hooks/useEscapeToCloseTopLayer";
import { Button } from "@/components/ui/Button";
import {
  ConnectorCard,
  ConnectorOptionFields,
  PolicyCard,
  PoolCard,
} from "./VfsStorageDraftCards";
import {
  type ActiveTab,
  type ArchiveSectionDraft,
  type CacheSectionDraft,
  type ConnectorDraft,
  type PolicyDraft,
  type PoolDraft,
  type TomlAdapter,
  type VfsDriver,
  normalizeOptionsForDriver,
  upsertOption,
} from "./vfsStorageDraftShared";
import {
  applyVfsDraftToContent,
  buildDefaultVfsStorageState,
  canPickRootForDriver,
  createConnectorDraft,
  createPolicyDraft,
  createPoolDraft,
  isVfsDriver,
  parseVfsStorageDraftFromContent,
  validateVfsDraft,
} from "./vfsStorageDraftModel";

type ViewMode = "main" | "advanced";

export interface VfsStorageConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  tomlAdapter: TomlAdapter;
  content: string;
  onContentChange: (value: string) => void;
  mode?: "modal" | "panel";
  onPickDirectory?: () => Promise<{
    driver: string;
    root: string;
    display?: string | null;
  } | null>;
}

export const VfsStorageConfigModal: React.FC<VfsStorageConfigModalProps> = ({
  isOpen,
  onClose,
  tomlAdapter,
  content,
  onContentChange,
  mode = "modal",
  onPickDirectory,
}) => {
  const { t } = useTranslation();
  const resolvedTheme = useResolvedTheme();

  const [pickingConnectorId, setPickingConnectorId] = useState<string | null>(
    null,
  );
  const isDark = resolvedTheme === "dark";
  const hasDirectoryPicker = Boolean(onPickDirectory);

  const [tab, setTab] = useState<ActiveTab>("pools");
  const [view, setView] = useState<ViewMode>("main");
  const [connectors, setConnectors] = useState<ConnectorDraft[]>(() => buildDefaultVfsStorageState().connectors);
  const [pools, setPools] = useState<PoolDraft[]>(() => buildDefaultVfsStorageState().pools);
  const [defaultPool, setDefaultPool] = useState(() => buildDefaultVfsStorageState().defaultPool);
  const [policies, setPolicies] = useState<PolicyDraft[]>(() => buildDefaultVfsStorageState().policies);
  const [cacheSection, setCacheSection] = useState<CacheSectionDraft>(() => buildDefaultVfsStorageState().cacheSection);
  const [archiveSection, setArchiveSection] = useState<ArchiveSectionDraft>(() => buildDefaultVfsStorageState().archiveSection);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEscapeToCloseTopLayer({
    active: isOpen,
    enabled: true,
    onEscape: onClose,
  });

  useEffect(() => {
    if (!isOpen) return;
    setValidationErrors([]);
    const parsed = parseVfsStorageDraftFromContent(content, tomlAdapter);
    setConnectors(parsed.connectors);
    setPools(parsed.pools);
    setDefaultPool(parsed.defaultPool);
    setPolicies(parsed.policies);
    setCacheSection(parsed.cacheSection);
    setArchiveSection(parsed.archiveSection);
    setError(parsed.error);
    setView("main");
    setTab("pools");
  }, [content, isOpen, tomlAdapter]);

  const connectorNames = useMemo(() => {
    return connectors.map((c) => c.name.trim()).filter((v) => v.length > 0);
  }, [connectors]);

  const poolNames = useMemo(() => {
    return pools.map((p) => p.name.trim()).filter((v) => v.length > 0);
  }, [pools]);

  const mainPool = useMemo(() => {
    const wanted = defaultPool.trim();
    if (wanted.length > 0) {
      const found = pools.find((p) => p.name.trim() === wanted);
      if (found) return found;
    }
    return pools[0] ?? null;
  }, [defaultPool, pools]);

  const mainConnector = useMemo(() => {
    if (!mainPool) return null;
    const wanted = mainPool.primary_connector.trim();
    if (wanted.length === 0) return null;
    return connectors.find((c) => c.name.trim() === wanted) ?? null;
  }, [connectors, mainPool]);

  const driverLabel = useCallback(
    (driver: VfsDriver): string => {
      return t(`admin.config.storage.drivers.${driver}`);
    },
    [t],
  );

  const applyToConfig = useCallback(() => {
    setValidationErrors([]);
    if (error) {
      setValidationErrors([
        t("admin.config.storage.validation.errors.parseFailed", {
          message: error,
        }),
      ]);
      return;
    }
    const errs = validateVfsDraft(t, {
      connectors,
      pools,
      defaultPool,
      policies,
    });
    if (errs.length > 0) {
      setValidationErrors(errs);
      return;
    }

    const result = applyVfsDraftToContent({
      content,
      tomlAdapter,
      connectors,
      pools,
      defaultPool,
      policies,
      cacheSection,
      archiveSection,
    });
    if (!result.ok) {
      setValidationErrors([
        result.reason === "parse_root"
          ? t("admin.config.storage.validation.errors.parseRoot")
          : t("admin.config.storage.validation.errors.parseFailed", {
              message: result.message,
            }),
      ]);
      return;
    }

    onContentChange(result.content);
    onClose();
  }, [
    archiveSection,
    cacheSection,
    connectors,
    content,
    defaultPool,
    error,
    onClose,
    onContentChange,
    policies,
    pools,
    t,
    tomlAdapter,
  ]);

  const resetToLocalDefaults = useCallback(() => {
    const defaults = buildDefaultVfsStorageState();
    setConnectors(defaults.connectors);
    setPools(defaults.pools);
    setDefaultPool(defaults.defaultPool);
    setPolicies(defaults.policies);
    setCacheSection(defaults.cacheSection);
    setArchiveSection(defaults.archiveSection);
    setValidationErrors([]);
    setError(null);
    setTab("pools");
  }, []);

  const updateConnector = useCallback(
    (id: string, updater: (prev: ConnectorDraft) => ConnectorDraft) => {
      setConnectors((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
    },
    [],
  );

  const renameConnector = useCallback((id: string, nextName: string) => {
    setConnectors((prev) => {
      const current = prev.find((c) => c.id === id);
      const oldName = current?.name ?? "";
      const next = prev.map((c) =>
        c.id === id ? { ...c, name: nextName } : c,
      );
      if (!oldName.trim() || oldName === nextName) {
        return next;
      }
      setPools((poolsPrev) =>
        poolsPrev.map((p) => ({
          ...p,
          primary_connector:
            p.primary_connector === oldName ? nextName : p.primary_connector,
          backup_connector:
            p.backup_connector === oldName ? nextName : p.backup_connector,
        })),
      );
      return next;
    });
  }, []);

  const removeConnector = useCallback((id: string) => {
    setConnectors((prev) => {
      const removing = prev.find((c) => c.id === id);
      const next = prev.filter((c) => c.id !== id);
      const removedName = removing?.name ?? "";
      const fallbackName = next[0]?.name ?? "";
      if (removedName.trim().length > 0) {
        setPools((poolsPrev) =>
          poolsPrev.map((p) => ({
            ...p,
            primary_connector:
              p.primary_connector === removedName
                ? fallbackName
                : p.primary_connector,
            backup_connector:
              p.backup_connector === removedName ? "" : p.backup_connector,
          })),
        );
      }
      return next;
    });
  }, []);

  const addConnector = useCallback(() => {
    const baseName = "connector";
    const existing = new Set(connectorNames);
    let index = 1;
    let name = `${baseName}-${index}`;
    while (existing.has(name)) {
      index += 1;
      name = `${baseName}-${index}`;
    }
    setConnectors((prev) => [...prev, createConnectorDraft(name)]);
  }, [connectorNames]);

  const updatePool = useCallback(
    (id: string, updater: (prev: PoolDraft) => PoolDraft) => {
      setPools((prev) => prev.map((p) => (p.id === id ? updater(p) : p)));
    },
    [],
  );

  const renamePool = useCallback((id: string, nextName: string) => {
    setPools((prev) => {
      const current = prev.find((p) => p.id === id);
      const oldName = current?.name ?? "";
      const next = prev.map((p) =>
        p.id === id ? { ...p, name: nextName } : p,
      );
      if (!oldName.trim() || oldName === nextName) {
        return next;
      }
      setDefaultPool((prevDefault) =>
        prevDefault === oldName ? nextName : prevDefault,
      );
      setPolicies((prevPolicies) =>
        prevPolicies.map((policy) => ({
          ...policy,
          pool_name: policy.pool_name === oldName ? nextName : policy.pool_name,
        })),
      );
      return next;
    });
  }, []);

  const removePool = useCallback((id: string) => {
    setPools((prev) => {
      const removing = prev.find((p) => p.id === id);
      const next = prev.filter((p) => p.id !== id);
      const removedName = removing?.name ?? "";
      const fallbackName = next[0]?.name ?? "";
      if (removedName.trim().length > 0) {
        setDefaultPool((prevDefault) =>
          prevDefault === removedName ? fallbackName : prevDefault,
        );
        setPolicies((prevPolicies) =>
          prevPolicies.map((policy) => ({
            ...policy,
            pool_name:
              policy.pool_name === removedName
                ? fallbackName
                : policy.pool_name,
          })),
        );
      }
      return next;
    });
  }, []);

  const addPool = useCallback(() => {
    const baseName = "pool";
    const existing = new Set(poolNames);
    let index = 1;
    let name = `${baseName}-${index}`;
    while (existing.has(name)) {
      index += 1;
      name = `${baseName}-${index}`;
    }
    const defaultConnector = connectorNames[0] ?? "local-fs";
    setPools((prev) => [...prev, createPoolDraft(name, defaultConnector)]);
    if (!defaultPool.trim()) {
      setDefaultPool(name);
    }
  }, [connectorNames, defaultPool, poolNames]);

  const addPolicy = useCallback(() => {
    const fallbackPool = defaultPool.trim() || poolNames[0] || "default-pool";
    setPolicies((prev) => [...prev, createPolicyDraft(fallbackPool)]);
  }, [defaultPool, poolNames]);

  const removePolicy = useCallback((id: string) => {
    setPolicies((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updatePolicy = useCallback(
    (id: string, updater: (prev: PolicyDraft) => PolicyDraft) => {
      setPolicies((prev) => prev.map((p) => (p.id === id ? updater(p) : p)));
    },
    [],
  );

  const pickConnectorRoot = useCallback(
    async (connectorId: string) => {
      if (!onPickDirectory) {
        return;
      }
      setPickingConnectorId(connectorId);
      try {
        const picked = await onPickDirectory();
        if (!picked) {
          return;
        }
        const nextDriver = isVfsDriver(picked.driver) ? picked.driver : null;
        updateConnector(connectorId, (prev) => {
          const driver: VfsDriver = nextDriver ?? prev.driver;
          return {
            ...prev,
            driver,
            root: picked.root,
            options: normalizeOptionsForDriver(driver, prev.options),
          };
        });
      } finally {
        setPickingConnectorId(null);
      }
    },
    [onPickDirectory, updateConnector],
  );

  if (mode === "modal" && !isOpen) return null;

  const contentView = (
    <>
      <div
        className={cn(
          "rounded-xl border p-3 sm:p-4",
          isDark
            ? "border-white/10 bg-white/[0.02]"
            : "border-slate-200 bg-white",
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div
            className={cn(
              "text-xs font-black uppercase tracking-widest opacity-60",
              isDark ? "text-slate-200" : "text-slate-600",
            )}
          >
            {t("admin.config.storage.fields.defaultPool")}
          </div>
          <select
            className={cn(
              "h-10 rounded-lg border px-3 text-sm font-mono font-bold w-full sm:w-auto",
              isDark
                ? "border-white/15 bg-black/30 text-white"
                : "border-slate-300 bg-white text-slate-900",
            )}
            value={defaultPool}
            onChange={(e) => setDefaultPool(e.target.value)}
          >
            {pools.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name || "(unnamed)"}
              </option>
            ))}
          </select>
          <div
            className={cn(
              "text-xs font-bold opacity-60 sm:ml-auto",
              isDark ? "text-slate-400" : "text-slate-500",
            )}
          >
            vfs_storage_hub
          </div>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div
          className={cn(
            "rounded-xl border p-3 sm:p-4",
            isDark
              ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
              : "border-rose-200 bg-rose-50 text-rose-900",
          )}
        >
          <div className="text-xs font-black uppercase tracking-widest mb-2">
            {t("admin.config.storage.validation.title")}
          </div>
          <div className="space-y-1 text-sm font-mono font-bold">
            {validationErrors.map((msg) => (
              <div key={`${msg}-${validationErrors.length}`}>- {msg}</div>
            ))}
          </div>
        </div>
      )}

      <div className={cn("grid grid-cols-2 gap-2")}>
        <button
          type="button"
          className={cn(
            "h-10 rounded-lg text-sm font-black border transition-colors shadow-sm inline-flex items-center justify-center gap-2",
            view === "main"
              ? "bg-primary text-white border-primary"
              : isDark
                ? "bg-black/20 text-slate-300 border-white/10 hover:bg-white/10"
                : "bg-white text-slate-900 border-slate-300 hover:bg-slate-50",
          )}
          onClick={() => setView("main")}
        >
          <HardDrive size={16} />
          {t("admin.config.storage.views.main")}
        </button>
        <button
          type="button"
          className={cn(
            "h-10 rounded-lg text-sm font-black border transition-colors shadow-sm inline-flex items-center justify-center gap-2",
            view === "advanced"
              ? "bg-primary text-white border-primary"
              : isDark
                ? "bg-black/20 text-slate-300 border-white/10 hover:bg-white/10"
                : "bg-white text-slate-900 border-slate-300 hover:bg-slate-50",
          )}
          onClick={() => setView("advanced")}
        >
          <Settings2 size={16} />
          {t("admin.config.storage.views.advanced")}
        </button>
      </div>
    </>
  );

  const showAllSections = mode === "panel";

  return (
    <div
      className={cn(
        mode === "modal"
          ? "fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4"
          : "relative w-full",
      )}
      {...(mode === "modal"
        ? { role: "dialog", "aria-modal": "true" as const }
        : {})}
    >
      {mode === "modal" && (
        <button
          type="button"
          aria-label={t("common.cancel")}
          className={cn(
            "absolute inset-0 backdrop-blur-sm transition-colors",
            isDark ? "bg-black/95" : "bg-slate-900/80",
          )}
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          mode === "modal"
            ? "relative w-full max-w-5xl rounded-2xl border shadow-lg overflow-hidden flex flex-col min-h-0 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]"
            : "relative w-full rounded-2xl border shadow-md overflow-hidden flex flex-col min-h-0",
          isDark
            ? "bg-slate-950 border-white/10 text-slate-100 ring-1 ring-white/5"
            : "bg-white border-gray-200 text-slate-900",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-2 border-b px-4 py-4 sm:px-6 shrink-0",
            isDark
              ? "border-white/10 bg-slate-900/50"
              : "border-slate-100 bg-slate-50/50",
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "p-2 rounded-lg",
                isDark ? "bg-cyan-500/10" : "bg-cyan-50",
              )}
            >
              <HardDrive size={18} className="text-cyan-500 shrink-0" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black uppercase tracking-widest truncate">
                {t("admin.config.storage.title")}
              </h3>
              <p
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest mt-0.5",
                  isDark ? "text-slate-500" : "text-slate-400",
                )}
              >
                {t("admin.config.storage.subtitle")}
              </p>
            </div>
          </div>
          {mode === "modal" && (
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "h-8 w-8 rounded-lg border inline-flex items-center justify-center transition-colors",
                isDark
                  ? "border-white/15 text-slate-300 hover:bg-white/10"
                  : "border-gray-200 text-slate-600 hover:bg-gray-100",
              )}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar p-4 sm:p-6 space-y-4">
          {contentView}

          {view === "main" && !showAllSections && (
            <div
              className={cn(
                "rounded-2xl border p-3 sm:p-4",
                isDark
                  ? "border-white/10 bg-white/[0.02]"
                  : "border-slate-200 bg-white",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className={cn(
                      "text-xs font-black uppercase tracking-widest opacity-60",
                      isDark ? "text-slate-300" : "text-slate-600",
                    )}
                  >
                    {t("admin.config.storage.main.hint")}
                  </div>
                </div>
                <button
                  type="button"
                  className={cn(
                    "h-9 px-3 rounded-lg border text-sm font-black inline-flex items-center gap-2 transition-colors shrink-0",
                    isDark
                      ? "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                      : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
                  )}
                  onClick={() => {
                    setView("advanced");
                    setTab("connectors");
                  }}
                >
                  <Settings2 size={16} />
                  {t("admin.config.storage.main.openAdvanced")}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <label
                  className={cn(
                    "text-sm font-black",
                    isDark ? "text-slate-300" : "text-slate-700",
                  )}
                >
                  {t("admin.config.storage.pools.primary")}
                  <select
                    className={cn(
                      "mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold",
                      isDark
                        ? "border-white/15 bg-black/30 text-white"
                        : "border-slate-300 bg-white text-slate-900",
                    )}
                    value={mainPool?.primary_connector || ""}
                    onChange={(e) => {
                      if (!mainPool) return;
                      updatePool(mainPool.id, (prev) => ({
                        ...prev,
                        primary_connector: e.target.value,
                      }));
                    }}
                  >
                    <option value="">{t("common.none")}</option>
                    {connectors
                      .map((c) => c.name.trim())
                      .filter((name) => name.length > 0)
                      .map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                  </select>
                </label>

                <div
                  className={cn(
                    "text-xs font-bold leading-relaxed self-end opacity-70",
                    isDark ? "text-slate-400" : "text-slate-600",
                  )}
                >
                  {t("admin.config.storage.main.desc")}
                </div>
              </div>

              {!mainConnector ? (
                <div
                  className={cn(
                    "mt-3 rounded-xl border p-3 text-sm font-bold",
                    isDark
                      ? "border-white/10 bg-black/20 text-slate-300"
                      : "border-slate-200 bg-slate-50 text-slate-700",
                  )}
                >
                  {t("admin.config.storage.main.noPrimaryConnector")}
                </div>
              ) : (
                <div
                  className={cn(
                    "mt-3 rounded-2xl border p-3 sm:p-4",
                    isDark
                      ? "border-white/10 bg-white/[0.03]"
                      : "border-slate-200 bg-white",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-black uppercase tracking-wide truncate">
                        {mainConnector.name ||
                          t("admin.config.storage.connectors.connector")}
                      </div>
                      <div
                        className={cn(
                          "text-xs font-bold uppercase tracking-widest mt-0.5 opacity-60",
                          isDark ? "text-slate-400" : "text-slate-500",
                        )}
                      >
                        {driverLabel(mainConnector.driver)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label
                      className={cn(
                        "text-sm font-black",
                        isDark ? "text-slate-300" : "text-slate-700",
                      )}
                    >
                      {t("admin.config.storage.fields.name")}
                      <input
                        className={cn(
                          "mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold focus:outline-none focus:ring-2",
                          isDark
                            ? "border-white/15 bg-black/30 text-white focus:ring-cyan-500/30"
                            : "border-slate-300 bg-white text-slate-900 focus:ring-cyan-500/20 shadow-sm",
                        )}
                        value={mainConnector.name}
                        onChange={(e) =>
                          renameConnector(mainConnector.id, e.target.value)
                        }
                      />
                    </label>

                    <label
                      className={cn(
                        "text-sm font-black",
                        isDark ? "text-slate-300" : "text-slate-700",
                      )}
                    >
                      {t("admin.config.storage.fields.driver")}
                      <select
                        className={cn(
                          "mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold",
                          isDark
                            ? "border-white/15 bg-black/30 text-white"
                            : "border-slate-300 bg-white text-slate-900",
                        )}
                        value={mainConnector.driver}
                        onChange={(e) => {
                          const nextDriver = e.target.value as VfsDriver;
                          updateConnector(mainConnector.id, (prev) => ({
                            ...prev,
                            driver: nextDriver,
                            root: driverUsesSlashRoot(nextDriver)
                              ? driverUsesSlashRoot(prev.driver)
                                ? prev.root
                                : "/"
                              : prev.root,
                            options: normalizeOptionsForDriver(
                              nextDriver,
                              prev.options,
                            ),
                          }));
                        }}
                      >
                        {(
                          [
                            "fs",
                            "s3",
                            "webdav",
                            "dropbox",
                            "onedrive",
                            "gdrive",
                            "memory",
                            "android_saf",
                            "ios_scoped_fs",
                          ] as VfsDriver[]
                        ).map((driver) => (
                          <option key={driver} value={driver}>
                            {driverLabel(driver)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label
                      className={cn(
                        "text-sm font-black md:col-span-2",
                        isDark ? "text-slate-300" : "text-slate-700",
                      )}
                    >
                      {t("admin.config.storage.fields.root")}
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          className={cn(
                            "w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold focus:outline-none focus:ring-2",
                            isDark
                              ? "border-white/15 bg-black/30 text-white focus:ring-cyan-500/30"
                              : "border-slate-300 bg-white text-slate-900 focus:ring-cyan-500/20 shadow-sm",
                          )}
                          value={mainConnector.root}
                          placeholder={t(
                            `admin.config.storage.placeholders.root.${mainConnector.driver}`,
                          )}
                          onChange={(e) =>
                            updateConnector(mainConnector.id, (prev) => ({
                              ...prev,
                              root: e.target.value,
                            }))
                          }
                        />
                        {canPickRootForDriver(mainConnector.driver, hasDirectoryPicker) && (
                          <button
                            type="button"
                            className={cn(
                              "h-10 px-3 rounded-lg border text-sm font-black shrink-0 transition-colors",
                              isDark
                                ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
                                : "border-cyan-200 bg-cyan-50 text-cyan-900 hover:bg-cyan-100",
                            )}
                            onClick={() => {
                              void pickConnectorRoot(mainConnector.id);
                            }}
                            disabled={pickingConnectorId === mainConnector.id}
                          >
                            {pickingConnectorId === mainConnector.id
                              ? t("common.processing")
                              : t("admin.config.storage.actions.pickDirectory")}
                          </button>
                        )}
                      </div>
                      <div
                        className={cn(
                          "text-xs font-bold mt-1 opacity-60",
                          isDark ? "text-slate-400" : "text-slate-500",
                        )}
                      >
                        {t(
                          `admin.config.storage.hints.root.${mainConnector.driver}`,
                        )}
                      </div>
                    </label>

                    <label
                      className={cn(
                        "text-sm font-black",
                        isDark ? "text-slate-300" : "text-slate-700",
                      )}
                    >
                      {t("admin.config.storage.fields.enabled")}
                      <div className="mt-1">
                        <input
                          type="checkbox"
                          className="h-5 w-5"
                          checked={mainConnector.enable}
                          onChange={(e) =>
                            updateConnector(mainConnector.id, (prev) => ({
                              ...prev,
                              enable: e.target.checked,
                            }))
                          }
                        />
                      </div>
                    </label>

                    <div className="md:col-span-2" />
                  </div>

                  <ConnectorOptionFields
                    connector={mainConnector}
                    isDark={isDark}
                    onChangeOption={(key, value) => {
                      updateConnector(mainConnector.id, (prev) => ({
                        ...prev,
                        options: upsertOption(prev.options, key, value),
                      }));
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {(view === "advanced" || showAllSections) && (
            <>
              {!showAllSections && (
                <div className={cn("grid grid-cols-1 sm:grid-cols-3 gap-2")}>
                  <button
                    type="button"
                    className={cn(
                      "h-10 rounded-lg text-sm font-black border transition-colors shadow-sm inline-flex items-center justify-center gap-2",
                      tab === "pools"
                        ? isDark
                          ? "bg-primary text-white border-primary"
                          : "bg-primary text-white border-primary"
                        : isDark
                          ? "bg-black/20 text-slate-300 border-white/10 hover:bg-white/10"
                          : "bg-white text-slate-900 border-slate-300 hover:bg-slate-50",
                    )}
                    onClick={() => setTab("pools")}
                  >
                    <Layers size={16} />
                    {t("admin.config.storage.tabs.pools")}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "h-10 rounded-lg text-sm font-black border transition-colors shadow-sm inline-flex items-center justify-center gap-2",
                      tab === "connectors"
                        ? isDark
                          ? "bg-primary text-white border-primary"
                          : "bg-primary text-white border-primary"
                        : isDark
                          ? "bg-black/20 text-slate-300 border-white/10 hover:bg-white/10"
                          : "bg-white text-slate-900 border-slate-300 hover:bg-slate-50",
                    )}
                    onClick={() => setTab("connectors")}
                  >
                    <Database size={16} />
                    {t("admin.config.storage.tabs.connectors")}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "h-10 rounded-lg text-sm font-black border transition-colors shadow-sm inline-flex items-center justify-center gap-2",
                      tab === "policies"
                        ? isDark
                          ? "bg-primary text-white border-primary"
                          : "bg-primary text-white border-primary"
                        : isDark
                          ? "bg-black/20 text-slate-300 border-white/10 hover:bg-white/10"
                          : "bg-white text-slate-900 border-slate-300 hover:bg-slate-50",
                    )}
                    onClick={() => setTab("policies")}
                  >
                    <Layers size={16} />
                    {t("admin.config.storage.tabs.policies")}
                  </button>
                </div>
              )}

              {(showAllSections || tab === "connectors") && (
                <div className="space-y-3">
                  {showAllSections && (
                    <div
                      className={cn(
                        "text-sm font-black uppercase tracking-wide",
                        isDark ? "text-slate-100" : "text-slate-900",
                      )}
                    >
                      {t("admin.config.storage.sections.connectors")}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div
                      className={cn(
                        "text-xs font-black uppercase tracking-widest opacity-60",
                        isDark ? "text-slate-300" : "text-slate-600",
                      )}
                    >
                      {t("admin.config.storage.connectors.title")}
                    </div>
                    <button
                      type="button"
                      className={cn(
                        "h-9 px-3 rounded-lg border text-sm font-black inline-flex items-center gap-2 transition-colors",
                        isDark
                          ? "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                          : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
                      )}
                      onClick={addConnector}
                    >
                      <Plus size={16} />
                      {t("admin.config.storage.actions.addConnector")}
                    </button>
                  </div>

                  {connectors.map((connector, index) => (
                    <ConnectorCard
                      key={connector.id}
                      connector={connector}
                      index={index}
                      isDark={isDark}
                      allowDelete={connectors.length > 1}
                      canPickRoot={canPickRootForDriver(connector.driver, hasDirectoryPicker)}
                      isPickingRoot={pickingConnectorId === connector.id}
                      onRenameConnector={renameConnector}
                      onUpdateConnector={updateConnector}
                      onRemoveConnector={removeConnector}
                      onPickConnectorRoot={(id) => {
                        void pickConnectorRoot(id);
                      }}
                    />
                  ))}
                </div>
              )}

              {(showAllSections || tab === "pools") && (
                <div className="space-y-3">
                  {showAllSections && (
                    <div
                      className={cn(
                        "text-sm font-black uppercase tracking-wide",
                        isDark ? "text-slate-100" : "text-slate-900",
                      )}
                    >
                      {t("admin.config.storage.sections.pools")}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div
                      className={cn(
                        "text-xs font-black uppercase tracking-widest opacity-60",
                        isDark ? "text-slate-300" : "text-slate-600",
                      )}
                    >
                      {t("admin.config.storage.pools.title")}
                    </div>
                    <button
                      type="button"
                      className={cn(
                        "h-9 px-3 rounded-lg border text-sm font-black inline-flex items-center gap-2 transition-colors",
                        isDark
                          ? "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                          : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
                      )}
                      onClick={addPool}
                    >
                      <Plus size={16} />
                      {t("admin.config.storage.actions.addPool")}
                    </button>
                  </div>

                  {pools.map((pool, index) => (
                    <PoolCard
                      key={pool.id}
                      pool={pool}
                      index={index}
                      isDark={isDark}
                      allowDelete={pools.length > 1}
                      connectorNames={connectorNames}
                      onRenamePool={renamePool}
                      onUpdatePool={updatePool}
                      onRemovePool={removePool}
                    />
                  ))}
                </div>
              )}

              {(showAllSections || tab === "policies") && (
                <div className="space-y-3">
                  {showAllSections && (
                    <div
                      className={cn(
                        "text-sm font-black uppercase tracking-wide",
                        isDark ? "text-slate-100" : "text-slate-900",
                      )}
                    >
                      {t("admin.config.storage.sections.policies")}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div
                      className={cn(
                        "text-xs font-black uppercase tracking-widest opacity-60",
                        isDark ? "text-slate-300" : "text-slate-600",
                      )}
                    >
                      {t("admin.config.storage.policies.title")}
                    </div>
                    <button
                      type="button"
                      className={cn(
                        "h-9 px-3 rounded-lg border text-sm font-black inline-flex items-center gap-2 transition-colors",
                        isDark
                          ? "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                          : "border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
                      )}
                      onClick={addPolicy}
                    >
                      <Plus size={16} />
                      {t("admin.config.storage.actions.addPolicy")}
                    </button>
                  </div>

                  <div
                    className={cn(
                      "text-sm font-bold opacity-70",
                      isDark ? "text-slate-400" : "text-slate-600",
                    )}
                  >
                    {t("admin.config.storage.policies.hint")}
                  </div>

                  {policies.length === 0 && (
                    <div
                      className={cn(
                        "rounded-xl border p-3",
                        isDark
                          ? "border-white/10 bg-black/20 text-slate-300"
                          : "border-slate-200 bg-slate-50 text-slate-700",
                      )}
                    >
                      {t("admin.config.storage.policies.empty")}
                    </div>
                  )}

                  {policies.map((policy, index) => (
                    <PolicyCard
                      key={policy.id}
                      policy={policy}
                      index={index}
                      isDark={isDark}
                      poolNames={poolNames}
                      onUpdatePolicy={updatePolicy}
                      onRemovePolicy={removePolicy}
                    />
                  ))}
                </div>
              )}

              {false && showAllSections && (
                <div className="space-y-3">
                  <div
                    className={cn(
                      "text-sm font-black uppercase tracking-wide",
                      isDark ? "text-slate-100" : "text-slate-900",
                    )}
                  >
                    {t("admin.config.storage.sections.cache")}
                  </div>
                  <div className="grid gap-4 xl:grid-cols-2">
                    <div
                      className={cn(
                        "rounded-2xl border p-4 space-y-3",
                        isDark
                          ? "border-white/10 bg-white/[0.03]"
                          : "border-slate-200 bg-white",
                      )}
                    >
                      <div
                        className={cn(
                          "text-xs font-black uppercase tracking-widest opacity-60",
                          isDark ? "text-slate-300" : "text-slate-600",
                        )}
                      >
                        {t("admin.config.storage.cache.read")}
                      </div>
                      <label className="flex items-center gap-3 text-sm font-black">
                        <input
                          type="checkbox"
                          checked={cacheSection.readEnable}
                          onChange={(e) =>
                            setCacheSection((prev) => ({
                              ...prev,
                              readEnable: e.target.checked,
                            }))
                          }
                        />
                        {t("admin.config.storage.cache.enable")}
                      </label>
                      <select
                        className={cn(
                          "h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold",
                          isDark
                            ? "border-white/15 bg-black/30 text-white"
                            : "border-slate-300 bg-white text-slate-900",
                        )}
                        value={cacheSection.readBackend}
                        onChange={(e) =>
                          setCacheSection((prev) => ({
                            ...prev,
                            readBackend: e.target.value as
                              | "memory"
                              | "local_dir",
                          }))
                        }
                      >
                        <option value="memory">memory</option>
                        <option value="local_dir">local_dir</option>
                      </select>
                      <input
                        className={cn(
                          "h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold",
                          isDark
                            ? "border-white/15 bg-black/30 text-white"
                            : "border-slate-300 bg-white text-slate-900",
                        )}
                        value={cacheSection.readLocalDir}
                        onChange={(e) =>
                          setCacheSection((prev) => ({
                            ...prev,
                            readLocalDir: e.target.value,
                          }))
                        }
                        placeholder="local_dir"
                      />
                      <input
                        className={cn(
                          "h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold",
                          isDark
                            ? "border-white/15 bg-black/30 text-white"
                            : "border-slate-300 bg-white text-slate-900",
                        )}
                        value={cacheSection.readCapacityBytes}
                        onChange={(e) =>
                          setCacheSection((prev) => ({
                            ...prev,
                            readCapacityBytes: e.target.value,
                          }))
                        }
                        placeholder="capacity_bytes"
                      />
                      <input
                        className={cn(
                          "h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold",
                          isDark
                            ? "border-white/15 bg-black/30 text-white"
                            : "border-slate-300 bg-white text-slate-900",
                        )}
                        value={cacheSection.readMaxFileSizeBytes}
                        onChange={(e) =>
                          setCacheSection((prev) => ({
                            ...prev,
                            readMaxFileSizeBytes: e.target.value,
                          }))
                        }
                        placeholder="max_file_size_bytes"
                      />
                      <input
                        className={cn(
                          "h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold",
                          isDark
                            ? "border-white/15 bg-black/30 text-white"
                            : "border-slate-300 bg-white text-slate-900",
                        )}
                        value={cacheSection.readTtlSecs}
                        onChange={(e) =>
                          setCacheSection((prev) => ({
                            ...prev,
                            readTtlSecs: e.target.value,
                          }))
                        }
                        placeholder="ttl_secs"
                      />
                    </div>
                    <div
                      className={cn(
                        "rounded-2xl border p-4 space-y-3",
                        isDark
                          ? "border-white/10 bg-white/[0.03]"
                          : "border-slate-200 bg-white",
                      )}
                    >
                      <div
                        className={cn(
                          "text-xs font-black uppercase tracking-widest opacity-60",
                          isDark ? "text-slate-300" : "text-slate-600",
                        )}
                      >
                        {t("admin.config.storage.cache.write")}
                      </div>
                      <label className="flex items-center gap-3 text-sm font-black">
                        <input
                          type="checkbox"
                          checked={cacheSection.writeEnable}
                          onChange={(e) =>
                            setCacheSection((prev) => ({
                              ...prev,
                              writeEnable: e.target.checked,
                            }))
                          }
                        />
                        {t("admin.config.storage.cache.enable")}
                      </label>
                      <select
                        className={cn(
                          "h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold",
                          isDark
                            ? "border-white/15 bg-black/30 text-white"
                            : "border-slate-300 bg-white text-slate-900",
                        )}
                        value={cacheSection.writeBackend}
                        onChange={(e) =>
                          setCacheSection((prev) => ({
                            ...prev,
                            writeBackend: e.target.value as
                              | "memory"
                              | "local_dir",
                          }))
                        }
                      >
                        <option value="memory">memory</option>
                        <option value="local_dir">local_dir</option>
                      </select>
                      <input
                        className={cn(
                          "h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold",
                          isDark
                            ? "border-white/15 bg-black/30 text-white"
                            : "border-slate-300 bg-white text-slate-900",
                        )}
                        value={cacheSection.writeLocalDir}
                        onChange={(e) =>
                          setCacheSection((prev) => ({
                            ...prev,
                            writeLocalDir: e.target.value,
                          }))
                        }
                        placeholder="local_dir"
                      />
                      <input
                        className={cn(
                          "h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold",
                          isDark
                            ? "border-white/15 bg-black/30 text-white"
                            : "border-slate-300 bg-white text-slate-900",
                        )}
                        value={cacheSection.writeCapacityBytes}
                        onChange={(e) =>
                          setCacheSection((prev) => ({
                            ...prev,
                            writeCapacityBytes: e.target.value,
                          }))
                        }
                        placeholder="capacity_bytes"
                      />
                      <input
                        className={cn(
                          "h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold",
                          isDark
                            ? "border-white/15 bg-black/30 text-white"
                            : "border-slate-300 bg-white text-slate-900",
                        )}
                        value={cacheSection.writeFlushConcurrency}
                        onChange={(e) =>
                          setCacheSection((prev) => ({
                            ...prev,
                            writeFlushConcurrency: e.target.value,
                          }))
                        }
                        placeholder="flush_concurrency"
                      />
                      <input
                        className={cn(
                          "h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold",
                          isDark
                            ? "border-white/15 bg-black/30 text-white"
                            : "border-slate-300 bg-white text-slate-900",
                        )}
                        value={cacheSection.writeFlushIntervalMs}
                        onChange={(e) =>
                          setCacheSection((prev) => ({
                            ...prev,
                            writeFlushIntervalMs: e.target.value,
                          }))
                        }
                        placeholder="flush_interval_ms"
                      />
                    </div>
                  </div>
                </div>
              )}

              {false && showAllSections && (
                <div className="space-y-3">
                  <div
                    className={cn(
                      "text-sm font-black uppercase tracking-wide",
                      isDark ? "text-slate-100" : "text-slate-900",
                    )}
                  >
                    {t("admin.config.storage.sections.archive")}
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl border p-4 space-y-3",
                      isDark
                        ? "border-white/10 bg-white/[0.03]"
                        : "border-slate-200 bg-white",
                    )}
                  >
                    <label className="flex items-center gap-3 text-sm font-black">
                      <input
                        type="checkbox"
                        checked={archiveSection.enable}
                        onChange={(e) =>
                          setArchiveSection((prev) => ({
                            ...prev,
                            enable: e.target.checked,
                          }))
                        }
                      />
                      {t("admin.config.storage.archive.enable")}
                    </label>
                    <input
                      className={cn(
                        "h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold",
                        isDark
                          ? "border-white/15 bg-black/30 text-white"
                          : "border-slate-300 bg-white text-slate-900",
                      )}
                      value={archiveSection.exe7zipPath}
                      onChange={(e) =>
                        setArchiveSection((prev) => ({
                          ...prev,
                          exe7zipPath: e.target.value,
                        }))
                      }
                      placeholder="exe_7zip_path"
                    />
                    <input
                      className={cn(
                        "h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold",
                        isDark
                          ? "border-white/15 bg-black/30 text-white"
                          : "border-slate-300 bg-white text-slate-900",
                      )}
                      value={archiveSection.defaultCompressionFormat}
                      onChange={(e) =>
                        setArchiveSection((prev) => ({
                          ...prev,
                          defaultCompressionFormat: e.target.value,
                        }))
                      }
                      placeholder="default_compression_format"
                    />
                    <div className="grid gap-3 md:grid-cols-3">
                      <input
                        className={cn(
                          "h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold",
                          isDark
                            ? "border-white/15 bg-black/30 text-white"
                            : "border-slate-300 bg-white text-slate-900",
                        )}
                        value={archiveSection.maxConcurrency}
                        onChange={(e) =>
                          setArchiveSection((prev) => ({
                            ...prev,
                            maxConcurrency: e.target.value,
                          }))
                        }
                        placeholder="process_manager_max_concurrency"
                      />
                      <input
                        className={cn(
                          "h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold",
                          isDark
                            ? "border-white/15 bg-black/30 text-white"
                            : "border-slate-300 bg-white text-slate-900",
                        )}
                        value={archiveSection.maxCpuThreads}
                        onChange={(e) =>
                          setArchiveSection((prev) => ({
                            ...prev,
                            maxCpuThreads: e.target.value,
                          }))
                        }
                        placeholder="max_cpu_threads"
                      />
                      <input
                        className={cn(
                          "h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold",
                          isDark
                            ? "border-white/15 bg-black/30 text-white"
                            : "border-slate-300 bg-white text-slate-900",
                        )}
                        value={archiveSection.timeoutSecs}
                        onChange={(e) =>
                          setArchiveSection((prev) => ({
                            ...prev,
                            timeoutSecs: e.target.value,
                          }))
                        }
                        placeholder="timeout_secs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div
          className={cn(
            "border-t px-4 py-4 sm:px-6 flex items-center justify-between gap-2",
            isDark
              ? "border-white/10 bg-black/20"
              : "border-slate-100 bg-slate-50/50",
          )}
        >
          <button
            type="button"
            onClick={resetToLocalDefaults}
            className={cn(
              "h-10 px-4 rounded-lg border text-sm font-black transition-colors",
              isDark
                ? "border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                : "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
            )}
          >
            {t("admin.config.storage.actions.resetLocal")}
          </button>

          <div className="flex items-center gap-2">
            {mode === "modal" && (
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "h-10 px-4 rounded-lg border text-sm font-black transition-colors",
                  isDark
                    ? "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
              >
                {t("common.cancel")}
              </button>
            )}
            <Button
              onClick={applyToConfig}
              className="h-10 px-6 rounded-lg shadow-sm"
            >
              {t("admin.config.storage.actions.apply")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
