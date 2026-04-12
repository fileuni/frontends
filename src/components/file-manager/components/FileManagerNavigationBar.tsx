import React, { useState, useRef, useEffect } from "react";
import { HardDrive, ArrowRight, AlertTriangle, Cloud, RefreshCw, PencilLine, X } from "lucide-react";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { cn } from "@/lib/utils.ts";
import { useFileStore } from "../store/useFileStore.ts";
import { client, extractData } from "@/lib/api.ts";
import { useTranslation } from "react-i18next";
import { useProtectedStorageStore } from '@/stores/protectedStorage.ts';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import { currentPathMountContextFromFiles, findMountByPath, type RemoteMountSummary } from "../utils/mounts.ts";
import { isProtectedPathUnavailable, pathMatchesProtectedRoot, shouldUsePermanentDeleteForPath } from '../utils/protectedStorage.ts';

type MountListResponse = {
  mounts: RemoteMountSummary[];
};

const getProtectedStorageModeLabel = (
  t: ReturnType<typeof useTranslation>['t'],
  mode: 'disabled' | 'obfuscate' | 'encrypt',
): string => {
  switch (mode) {
    case 'disabled':
      return t('filemanager.protectedStorage.modes.disabled');
    case 'obfuscate':
      return t('filemanager.protectedStorage.modes.obfuscate');
    case 'encrypt':
      return t('filemanager.protectedStorage.modes.encrypt');
  }
};

export const FileManagerNavigationBar = () => {
  const { t } = useTranslation();
  const resolvedTheme = useResolvedTheme();
  const store = useFileStore();
  const currentPath = store.getCurrentPath();
  const setCurrentPath = store.setCurrentPath;
  const { files } = store;
  const protectedStatus = useProtectedStorageStore((state) => state.status);
  const focusedRootPath = useProtectedStorageStore((state) => state.focusedRootPath);
  const clearRootHint = useProtectedStorageStore((state) => state.clearRootHint);

  const [isEditMode, setIsEditMode] = useState(false);
  const [pathInput, setPathInput] = useState(currentPath);
  const [mountContext, setMountContext] = useState<RemoteMountSummary | null>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  const startEditMode = () => {
    setPathInput(currentPath);
    setIsEditMode(true);
  };

  const cancelEditMode = () => {
    setPathInput(currentPath);
    setIsEditMode(false);
  };

  useEffect(() => {
    setPathInput(currentPath);
  }, [currentPath]);

  useEffect(() => {
    if (isEditMode) {
      addressInputRef.current?.focus();
      addressInputRef.current?.select();
    }
  }, [isEditMode]);

  useEffect(() => {
    const derived = currentPathMountContextFromFiles(currentPath, files);
    if (derived) {
      setMountContext(derived);
      return undefined;
    }

    let cancelled = false;
    const loadMountContext = async () => {
      try {
        const result = await extractData<MountListResponse>(client.GET('/api/v1/file/mounts'));
        if (!cancelled) {
          setMountContext(findMountByPath(currentPath, result.mounts));
        }
      } catch {
        if (!cancelled) {
          setMountContext(null);
        }
      }
    };

    void loadMountContext();
    return () => {
      cancelled = true;
    };
  }, [currentPath, files]);

  useEffect(() => {
    if (!focusedRootPath || focusedRootPath !== currentPath) return undefined;
    const timer = window.setTimeout(() => clearRootHint(), 3200);
    return () => window.clearTimeout(timer);
  }, [clearRootHint, currentPath, focusedRootPath]);

  const pathSegments = currentPath.split("/").filter(Boolean);
  const protectedMode = protectedStatus?.protected_mode || protectedStatus?.global_mode;
  const isDark = resolvedTheme === 'dark';
  
  const navigateTo = (index: number) => {
    const newPath = "/" + pathSegments.slice(0, index + 1).join("/");
    setCurrentPath(newPath);
  };

  const normalizePathInput = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "/";
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  };

  const handleAddressSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCurrentPath(normalizePathInput(pathInput));
    setIsEditMode(false);
  };

  return (
    <div className={cn(
      "shrink-0 px-3 pb-2 sm:px-6",
      isDark ? "border-t border-white/5" : "border-t border-zinc-200"
    )}>
      <div className={cn(
        "transition-all",
        isEditMode
          ? (isDark
            ? "rounded-xl bg-white/[0.04]"
            : "rounded-xl bg-zinc-50")
          : (isDark
            ? "rounded-xl bg-white/[0.02]"
            : "rounded-xl bg-zinc-50/70")
      )}>
        {!isEditMode ? (
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2">
            <div
              className="min-w-0 cursor-text rounded-lg px-0.5 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className={cn(
                "flex min-w-0 flex-wrap items-start gap-x-0.5 gap-y-0.5 text-sm font-bold leading-5",
                isDark ? "text-white" : "text-zinc-800"
              )}>
                <Button
                  variant="ghost"
                  className={cn(
                    "h-8 shrink-0 rounded-lg border border-transparent p-1.5",
                    isDark
                      ? "text-primary/60 hover:bg-accent hover:text-primary"
                      : "text-zinc-600 hover:border-zinc-200 hover:bg-zinc-100 hover:text-primary"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPath("/");
                  }}
                >
                  <HardDrive size={18} />
                </Button>

                {pathSegments.length === 0 && (
                  <span className={cn(
                    "flex min-h-8 items-center px-1 text-sm font-black tracking-[0.08em]",
                    isDark ? "text-primary/40" : "text-zinc-500"
                  )}>
                    /
                  </span>
                )}

                {pathSegments
                  .filter((_, i) => pathSegments.length <= 2 || i >= pathSegments.length - 2)
                  .map((segment, filteredIndex) => {
                    const i = pathSegments.length <= 2 ? filteredIndex : pathSegments.length - 2 + filteredIndex;
                    return (
                  <div
                    key={`/${pathSegments.slice(0, i + 1).join('/')}`}
                    className="flex min-w-0 max-w-full items-start gap-0.5"
                  >
                    {pathSegments.length > 2 && filteredIndex === 0 && (
                      <>
                        <span className={cn("shrink-0 pt-[7px]", isDark ? "text-primary/20" : "text-zinc-400")}>/</span>
                        <span className={cn("shrink-0 pt-[5px] px-0.5", isDark ? "text-primary/30" : "text-zinc-400")}>...</span>
                      </>
                    )}
                    <span className={cn("shrink-0 pt-[7px]", isDark ? "text-primary/20" : "text-zinc-400")}>/</span>
                    <Button
                      variant="ghost"
                      className={cn(
                        "h-auto min-h-8 min-w-0 max-w-[9rem] items-start justify-start rounded-lg border border-transparent px-1.25 py-1 text-left sm:max-w-full",
                        isDark
                          ? "text-white/70 hover:bg-accent hover:text-white"
                          : "text-zinc-700 hover:border-zinc-200 hover:bg-zinc-100 hover:text-zinc-950"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateTo(i);
                      }}
                    >
                      <span className="block break-words leading-4.5">{segment}</span>
                    </Button>
                  </div>
                    );
                  })}
              </div>
            </div>

            <Button
              variant="ghost"
              className={cn(
                "mt-0.5 h-8 shrink-0 rounded-full px-2.5",
                isDark
                  ? "border border-white/8 bg-white/[0.04] text-primary/60 hover:bg-white/[0.07] hover:text-primary"
                  : "border border-zinc-300 bg-zinc-50 text-zinc-700 shadow-sm hover:bg-white hover:text-primary"
              )}
              onClick={startEditMode}
              aria-label={t('filemanager.editPath') || 'Edit path'}
              title={t('filemanager.editPath') || 'Edit path'}
            >
              <PencilLine size={16} />
            </Button>
          </div>
        ) : (
          <form onSubmit={handleAddressSubmit} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2">
            <Input
              ref={addressInputRef}
              className={cn(
                "min-w-0 rounded-lg text-sm font-mono focus-visible:ring-0 focus-visible:ring-offset-0",
                isDark
                  ? "h-9 border-none bg-transparent px-0 text-inherit"
                  : "h-9 border border-zinc-300 bg-white px-3 text-zinc-800 shadow-inner shadow-zinc-100/80 focus-visible:border-primary"
              )}
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelEditMode();
                }
              }}
              placeholder={t('filemanager.pathPlaceholder') || '/folder/subfolder'}
              aria-label={t('filemanager.editPath') || 'Edit path'}
            />

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9 shrink-0 rounded-lg",
                  isDark
                    ? "text-primary/60 hover:bg-accent hover:text-primary"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-primary"
                )}
                onClick={cancelEditMode}
                aria-label={t('filemanager.cancelEditPath') || 'Cancel path edit'}
                title={t('filemanager.cancelEditPath') || 'Cancel path edit'}
              >
                <X size={16} />
              </Button>
              <button
                type="submit"
                className={cn(
                  "h-9 w-9 shrink-0 rounded-lg bg-primary p-1 text-white transition-colors hover:bg-primary/80",
                  isDark ? "" : "shadow-sm"
                )}
                aria-label={t('filemanager.goToPath') || 'Go to path'}
                title={t('filemanager.goToPath') || 'Go to path'}
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}
      </div>

      {mountContext && (
        <div className="mt-2 rounded-2xl border border-amber-500/15 bg-amber-500/10 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-3 text-amber-100">
            <div className="flex items-center gap-2 text-xs font-black tracking-wide">
              <Cloud size={14} />
              <span>{t('filemanager.mounts.currentMounted') || 'Remote mount active'}</span>
            </div>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs font-black tracking-wide break-all">
              {mountContext.name || mountContext.mount_dir}
            </span>
            <span className="text-xs font-black tracking-wide opacity-70">
              {t('filemanager.mounts.driverLabel') || 'Driver'}: {mountContext.driver}
            </span>
            {mountContext.last_sync_status && (
              <span className="flex items-center gap-1 text-xs font-black tracking-wide opacity-80">
                <RefreshCw size={12} />
                {mountContext.last_sync_status}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-start gap-2 text-amber-50/90">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              {currentPath === mountContext.mount_dir
                ? (t('filemanager.mounts.rootBlockedNotice') || 'This directory is a remote mount mapping. Rename, move, or delete it from Mounts instead of handling it like a normal folder here.')
                : (t('filemanager.mounts.remoteDeleteNotice') || 'Deleting here removes remote objects immediately and does not use the recycle bin.')}
            </span>
          </div>
          {mountContext.last_error && (
            <div className="mt-2 text-xs leading-5 text-rose-100/90">{mountContext.last_error}</div>
          )}
        </div>
      )}

      {protectedStatus?.enabled && pathMatchesProtectedRoot(currentPath, protectedStatus.protected_root) && (
        <div className={cn(
          "mt-2 rounded-2xl border border-cyan-500/15 bg-cyan-500/10 px-4 py-3 text-sm transition-all",
          focusedRootPath === currentPath && "ring-2 ring-cyan-300/60 shadow-[0_0_0_1px_rgba(103,232,249,0.18)] animate-pulse"
        )}>
          <div className="flex flex-wrap items-center gap-3 text-cyan-100">
            <div className="flex items-center gap-2 text-xs font-black tracking-wide">
              <HardDrive size={14} />
              <span>{t('filemanager.protectedStorage.title') || 'Protected Storage'}</span>
            </div>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs font-black tracking-wide break-all">
              {protectedStatus.protected_root || '/'}
            </span>
            <span className="text-xs font-black tracking-wide opacity-70">
              {protectedMode === 'disabled' || protectedMode === 'obfuscate' || protectedMode === 'encrypt'
                ? getProtectedStorageModeLabel(t, protectedMode)
                : protectedMode}
            </span>
          </div>
          <div className="mt-2 flex items-start gap-2 text-cyan-50/90">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              {isProtectedPathUnavailable(protectedStatus)
                ? (t('filemanager.protectedStorage.constraints.adminDisabled') || 'This protected directory is temporarily unavailable because the system mode no longer matches it.')
                : shouldUsePermanentDeleteForPath(currentPath, protectedStatus)
                  ? (t('filemanager.protectedStorage.subdirEffects.body') || 'Delete bypasses the recycle bin and thumbnails are disabled in this subtree.')
                  : (t('filemanager.shareModal.protected') || 'Protected')}
            </span>
          </div>
          {focusedRootPath === currentPath && (
            <div className="mt-2 text-xs font-bold text-cyan-100/90">
              {t('filemanager.protectedStorage.focusedHint') || 'You are now in the protected root directory.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
