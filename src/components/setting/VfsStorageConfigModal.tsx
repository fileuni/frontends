// VFS Storage Configuration Modal
// Visual editor for vfs_storage_hub.{connectors,pools,policies,default_pool}

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { HardDrive, Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { useEscapeToCloseTopLayer } from "@/hooks/useEscapeToCloseTopLayer";
import { Button } from "@/components/ui/Button";
import {
  VfsStorageAdvancedSection,
  VfsStorageMainSection,
} from "./VfsStorageSections";
import { getStorageDriverLabel } from "./VfsStorageDraftCards";
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
} from "./vfsStorageDraftShared";
import {
  applyVfsDraftToContent,
  buildDefaultVfsStorageState,
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
      return getStorageDriverLabel(t, driver);
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
      const errorResult = result as {
        ok: false;
        reason: "parse_root" | "parse_failed";
        message: string;
      };
      const validationMessage = errorResult.reason === "parse_root"
        ? t("admin.config.storage.validation.errors.parseRoot")
        : t("admin.config.storage.validation.errors.parseFailed", {
            message: errorResult.message,
          });
      setValidationErrors([
        validationMessage,
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
              "text-xs font-black tracking-widest opacity-60",
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
          <div className="text-xs font-black tracking-widest mb-2">
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
              <h3 className="text-sm sm:text-base font-black tracking-widest truncate">
                {t("admin.config.storage.title")}
              </h3>
              <p
                className={cn(
                  "text-[10px] font-bold tracking-widest mt-0.5",
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
            <VfsStorageMainSection
              isDark={isDark}
              mainPool={mainPool}
              mainConnector={mainConnector}
              connectors={connectors}
              hasDirectoryPicker={hasDirectoryPicker}
              pickingConnectorId={pickingConnectorId}
              driverLabel={driverLabel}
              onOpenAdvanced={() => {
                setView("advanced");
                setTab("connectors");
              }}
              onSelectPrimaryConnector={(connectorName) => {
                if (!mainPool) return;
                updatePool(mainPool.id, (prev) => ({
                  ...prev,
                  primary_connector: connectorName,
                }));
              }}
              onRenameConnector={renameConnector}
              onUpdateConnector={updateConnector}
              onPickConnectorRoot={(id) => {
                void pickConnectorRoot(id);
              }}
            />
          )}

          {(view === "advanced" || showAllSections) && (
            <VfsStorageAdvancedSection
              isDark={isDark}
              showAllSections={showAllSections}
              tab={tab}
              connectors={connectors}
              pools={pools}
              policies={policies}
              connectorNames={connectorNames}
              poolNames={poolNames}
              hasDirectoryPicker={hasDirectoryPicker}
              pickingConnectorId={pickingConnectorId}
              onTabChange={setTab}
              onAddConnector={addConnector}
              onRenameConnector={renameConnector}
              onUpdateConnector={updateConnector}
              onRemoveConnector={removeConnector}
              onPickConnectorRoot={(id) => {
                void pickConnectorRoot(id);
              }}
              onAddPool={addPool}
              onRenamePool={renamePool}
              onUpdatePool={updatePool}
              onRemovePool={removePool}
              onAddPolicy={addPolicy}
              onUpdatePolicy={updatePolicy}
              onRemovePolicy={removePolicy}
            />
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
