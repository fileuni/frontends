import React, { useState, useRef, useEffect } from "react";
import { HardDrive, ArrowRight, AlertTriangle, Globe, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { cn } from "@/lib/utils.ts";
import { useFileStore } from "../store/useFileStore.ts";
import { client, extractData } from "@/lib/api.ts";
import { useTranslation } from "react-i18next";
import { useProtectedStorageStore } from '@/stores/protectedStorage.ts';
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
  
  const navigateTo = (index: number) => {
    const newPath = "/" + pathSegments.slice(0, index + 1).join("/");
    setCurrentPath(newPath);
  };

  const handleAddressSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    let targetPath = pathInput.trim();
    if (!targetPath && !targetPath.startsWith("/")) targetPath = "/" + targetPath;
    if (targetPath === "") targetPath = "/";
    setCurrentPath(targetPath);
    setIsEditMode(false);
  };

  return (
    <div className="px-6 py-2 bg-white/[0.02] border-b border-white/5 shrink-0">
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex-1 h-9 rounded-xl flex items-center px-3 transition-all relative overflow-hidden",
          isEditMode ? "bg-white/10 border border-primary/30" : "hover:bg-white/5 border border-transparent cursor-text"
        )}>
          {!isEditMode ? (
            <>
              <button type="button" className="absolute inset-0" onClick={() => setIsEditMode(true)} />
              <div className="relative z-10 flex items-center gap-1 overflow-x-auto no-scrollbar font-bold text-sm w-full h-full">
              <Button variant="ghost" className="p-1.5 h-9 rounded-lg text-primary/60 hover:text-primary shrink-0" onClick={(e) => { e.stopPropagation(); setCurrentPath("/"); }}>
                <HardDrive size={18} />
              </Button>
              {pathSegments.length > 4 && (
                <><span className="opacity-10 shrink-0">/</span><span className="px-1 opacity-40 font-black">...</span></>
              )}
              {pathSegments.map((segment, i) => {
                if (pathSegments.length > 4 && i < pathSegments.length - 4) return null;
                return (
                  <React.Fragment key={`/${pathSegments.slice(0, i + 1).join('/')}`}>
                    <span className="opacity-10 shrink-0">/</span>
                    <Button variant="ghost" className="px-2 h-9 rounded-lg whitespace-nowrap shrink-0 opacity-60 hover:opacity-100 max-w-[120px]" onClick={(e) => { e.stopPropagation(); navigateTo(i); }}>
                      <span className="truncate">{segment}</span>
                    </Button>
                  </React.Fragment>
                );
              })}
              <div className="flex-1 h-full min-w-[20px]" />
              </div>
            </>
          ) : (
            <form onSubmit={handleAddressSubmit} className="flex items-center w-full gap-2">
              <Input ref={addressInputRef} className="bg-transparent border-none p-0 h-full text-sm font-mono focus-visible:ring-0 focus-visible:ring-offset-0" value={pathInput} onChange={(e) => setPathInput(e.target.value)} onBlur={() => setTimeout(() => setIsEditMode(false), 200)} />
              <button type="submit" className="p-1 rounded-lg bg-primary text-white hover:bg-primary/80 transition-colors">
                <ArrowRight size={18} />
              </button>
            </form>
          )}
        </div>
      </div>

      {mountContext && (
        <div className="mt-2 rounded-2xl border border-amber-500/15 bg-amber-500/10 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-3 text-amber-100">
            <div className="flex items-center gap-2 font-black uppercase tracking-widest text-[11px]">
              <Globe size={14} />
              <span>{t('filemanager.mounts.currentMounted') || 'Remote mount active'}</span>
            </div>
            <span className="rounded-full border border-white/10 px-2 py-0.5 font-black text-[11px] uppercase tracking-widest">
              {mountContext.name || mountContext.mount_dir}
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest opacity-70">
              {t('filemanager.mounts.driverLabel') || 'Driver'}: {mountContext.driver}
            </span>
            {mountContext.last_sync_status && (
              <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest opacity-80">
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
            <div className="flex items-center gap-2 font-black uppercase tracking-widest text-[11px]">
              <HardDrive size={14} />
              <span>{t('filemanager.protectedStorage.title') || 'Protected Storage'}</span>
            </div>
            <span className="rounded-full border border-white/10 px-2 py-0.5 font-black text-[11px] uppercase tracking-widest">
              {protectedStatus.protected_root || '/'}
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest opacity-70">
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
