import { useState, useEffect, useRef, useCallback } from "react";
import { FileManagerToolbar } from "./FileManagerToolbar.tsx";
import { FileBrowser } from "./FileBrowser.tsx";
import { FileManagerContextMenu } from "./FileManagerContextMenu.tsx";
import { ShareModal } from "./ShareModal.tsx";
import { GlobalUploader } from "./GlobalUploader.tsx";
import { Pagination } from '@/components/ui/Pagination';

import { useFileActions } from "../hooks/useFileActions.ts";
import { useFileStore } from "../store/useFileStore.ts";
import { useSelectionStore } from "../store/useSelectionStore.ts";
import { useAudioStore } from "@/stores/audio.ts";
import type { FileInfo, ClipboardItem, FileManagerMode } from "../types/index.ts";
import { FileActionModal } from "./FileActionModal.tsx";
import { ConfirmDestructiveModal } from "./ConfirmDestructiveModal.tsx";
import { FilePropertiesModal } from "./FilePropertiesModal.tsx";
import { ArchiveOperationModal, type ArchiveOperationSubmitPayload } from "./ArchiveOperationModal.tsx";
import { ArchiveBrowser } from "./ArchiveBrowser.tsx";

import { ClipboardBar } from "./ClipboardBar.tsx";
import { useTranslation } from "react-i18next";
import { client } from "@/lib/api.ts";
import type { components } from "@/types/api.ts";
import { isAnyEscLayerOpen } from "@/hooks/useEscapeToCloseTopLayer";
import { useToastStore } from "@/stores/toast";
import { useNavigationStore } from "@/stores/navigation.ts";
import { useConfigStore } from "@/stores/config.ts";
import { useProtectedStorageStore } from '@/stores/protectedStorage.ts';
import { Search, X } from "lucide-react";

import { FileManagerTabs } from "./FileManagerTabs.tsx";
import { FileManagerNavigationBar } from "./FileManagerNavigationBar.tsx";
import { FileManagerRecentStats } from "./FileManagerRecentStats.tsx";
import { FileManagerFavoriteFilter } from "./FileManagerFavoriteFilter.tsx";
import { FilePreviewPage } from "./FilePreviewPage.tsx";
import { OfficeLitePage } from "./officeLitePage.tsx";
import { OfficeOpenModal } from "./officeOpenModal.tsx";
import { getFileExtension, isOfficeExtension } from "../utils/officeLite.ts";
import { isMountRootEntry, isMountedEntry, summarizeMountedSelection } from "../utils/mounts.ts";
import { shouldUsePermanentDeleteForPath } from '../utils/protectedStorage.ts';

export const FileManagerView = () => {
  const { t } = useTranslation();
  const { capabilities } = useConfigStore();
  const protectedStatus = useProtectedStorageStore((state) => state.status);
  const { params, navigate } = useNavigationStore();
  const {
    loadFiles, deleteFiles, downloadFile, restoreFiles, deletePermanent,
    clearRecycleBin, toggleFavorite, createFile, createDirectory, renameFile,
    clearHistory, removeFromHistory, cancelShare, previewFile, pasteItems,
    waitForTask, clearThumbnailCache, clearThumbnailCacheAllUsers, setThumbnailDisabled, clearSearch
  } = useFileActions();

  const store = useFileStore();
  const {
    setCurrentPath, files, openActionModal, closeActionModal,
    fmMode, setFmMode, addToRecentFiles, pagination, actionModal,
    addToClipboard,
  } = store;

  const currentPath = store.getCurrentPath();
  const clipboard = store.getClipboard();
  const isSearchMode = store.getIsSearchMode();
  const searchKeyword = store.getSearchKeyword();
  const officePath = params['office_path'];
  const previewPath = params['preview_path'];
  const { addToast } = useToastStore();
  const { selectedIds, deselectAll, selectAll } = useSelectionStore();
  const { play: playAudio } = useAudioStore();

  const isArchive = (file: FileInfo | null) => {
    if (!file || file.is_dir) return false;
    const lowerName = file.name.toLowerCase();

    // Strict UI rule: if 7z is not enabled, do not offer archive actions for .7z files.
    if (lowerName.endsWith('.7z')) {
      return capabilities?.has_7z === true;
    }

    const archives = ['.zip', '.rar', '.tar.gz', '.gz', '.tar', '.bz2', '.xz'];
    return archives.some(ext => lowerName.endsWith(ext));
  };

  const [archiveOpModal, setArchiveOpModal] = useState<{
    isOpen: boolean; mode: 'compress' | 'decompress'; paths: string[];
    defaultTargetPath: string; defaultArchiveName: string;
  }>({
    isOpen: false, mode: 'decompress', paths: [], defaultTargetPath: '/', defaultArchiveName: 'archive',
  });

  const [browsingArchivePath, setBrowsingArchivePath] = useState<string | null>(null);
  const [archivePassword, setArchivePassword] = useState<string | undefined>(undefined);
  const [isReady, setIsReady] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; target: FileInfo | null; } | null>(null);
  const [activeShareFile, setActiveShareFile] = useState<FileInfo | null>(null);
  const [pendingDeletePaths, setPendingDeletePaths] = useState<string[]>([]);
  const [propertiesFile, setPropertiesFile] = useState<FileInfo | null>(null);
  const isSyncingRef = useRef(false);
  const handleActionRef = useRef<
    (action: string, target: FileInfo | null) => void
  >(() => undefined);

  useEffect(() => {
    isSyncingRef.current = true;
    const page = params['page'] as FileManagerMode;
    const path = params['path'];
    const keyword = params['keyword']?.trim() || '';
    const isSearchFromHash = params['search'] === '1' && keyword.length > 0;
    
    if (page && page !== useFileStore.getState().fmMode) {
      useFileStore.getState().setFmMode(page);
    } else if (!page) {
      useFileStore.getState().setFmMode('files');
    }
    
    if (path && path !== useFileStore.getState().getCurrentPath()) {
      useFileStore.getState().setCurrentPath(path);
    }
    if (keyword !== useFileStore.getState().getSearchKeyword()) {
      useFileStore.getState().setSearchKeyword(keyword);
    }
    if (isSearchFromHash !== useFileStore.getState().getIsSearchMode()) {
      useFileStore.getState().setIsSearchMode(isSearchFromHash);
    }
    
    setIsReady(true);
    setTimeout(() => { isSyncingRef.current = false; }, 100);
  }, [params]);


  useEffect(() => {
    if (!isReady || isSyncingRef.current) return;
    
    interface NavParams extends Record<string, string | number | undefined> {
      mod: string;
      page: FileManagerMode;
      path?: string;
      search?: string;
      keyword?: string;
    }

    const newParams: NavParams = { mod: 'file-manager', page: fmMode };
    if (fmMode === "files") {
      newParams.path = currentPath;
    }
    if (isSearchMode && searchKeyword.trim()) {
      newParams.search = '1';
      newParams.keyword = searchKeyword.trim();
    }
    
    if (
      params.page !== newParams.page
      || params['path'] !== newParams.path
      || params['search'] !== newParams.search
      || params['keyword'] !== newParams.keyword
    ) {
      navigate(newParams as unknown as Parameters<typeof navigate>[0]);
    }
  }, [
    currentPath,
    fmMode,
    isReady,
    isSearchMode,
    navigate,
    params,
    searchKeyword,
  ]);

  const buildClipboardItem = useCallback((
    path: string,
    type: ClipboardItem['type'],
  ): ClipboardItem => {
    const file = files.find((item) => item.path === path);
    return {
      path,
      type,
      name: file?.name || path.split('/').pop() || '',
      is_dir: file?.is_dir || false,
      ...(file?.mount_id ? { mount_id: file.mount_id } : {}),
      ...(file?.mount_dir ? { mount_dir: file.mount_dir } : {}),
      ...(typeof file?.is_mount_root === 'boolean'
        ? { is_mount_root: file.is_mount_root }
        : {}),
      ...(file?.delete_behavior
        ? { delete_behavior: file.delete_behavior }
        : {}),
    };
  }, [files]);

  useEffect(() => {
    if (!isReady || officePath || previewPath) return;
    loadFiles(fmMode === 'files' ? currentPath : '');
  }, [currentPath, fmMode, isReady, loadFiles, officePath, previewPath]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // If a top-layer modal or overlay is open, let it handle Escape and related keys.
      if (isAnyEscLayerOpen()) return;

      const isAnyModalOpen = actionModal.isOpen || activeShareFile || propertiesFile || browsingArchivePath || archiveOpModal.isOpen;
      const isMod = e.ctrlKey || e.metaKey;
      const paths = Array.from(selectedIds);

      if (e.key === 'Escape') { deselectAll(); setContextMenu(null); return; }
      if (isAnyModalOpen) return;

      if (isMod && e.key.toLowerCase() === 'a') { e.preventDefault(); selectAll(files.map(f => f.path)); }
      if (isMod && e.key.toLowerCase() === 'c' && paths.length > 0) {
        e.preventDefault();
        const copyItems: ClipboardItem[] = paths.map((p) =>
          buildClipboardItem(p, 'copy'),
        );
        addToClipboard(copyItems);
        addToast(t('filemanager.messages.addedToClipboardCopy'), "success");
        deselectAll();
      }
      if (isMod && e.key.toLowerCase() === 'x' && paths.length > 0) {
        e.preventDefault();
        const cutItems: ClipboardItem[] = paths.map((p) =>
          buildClipboardItem(p, 'cut'),
        );
        addToClipboard(cutItems);
        addToast(t('filemanager.messages.addedToClipboardCut'), "success");
        deselectAll();
      }
      if (isMod && e.key.toLowerCase() === 'v' && clipboard.length > 0 && fmMode === 'files') {
        e.preventDefault();
        handleActionRef.current("paste", null);
      }
      if (e.key === 'F2' && selectedIds.size === 1) {
        const path = Array.from(selectedIds)[0];
        const targetFile = files.find(f => f.path === path);
        if (targetFile) handleActionRef.current("rename", targetFile);
      }
      if ((e.key === 'Delete' || (e.key === 'Backspace' && isMod)) && paths.length > 0) {
        e.preventDefault();
        handleActionRef.current("delete", null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedIds, files, clipboard, fmMode,
    actionModal, activeShareFile, propertiesFile, browsingArchivePath, archiveOpModal,
    selectAll, deselectAll, addToast, t, addToClipboard, buildClipboardItem
  ]);

  const handleAction = (action: string, target: FileInfo | null) => {
    setContextMenu(null);
    const isShares = fmMode === "shares";
    const selectedList = selectedIds.size > 0 ? Array.from(selectedIds) : target ? [isShares && target.id ? target.id : target.path] : [];
    const paths = isShares ? (selectedIds.size > 0 ? (Array.from(selectedIds).map(id => files.find(f => f.id === id)?.path).filter(Boolean) as string[]) : (target ? [target.path] : [])) : selectedList;
    const selectionSummary = summarizeMountedSelection(paths, files);
    const mountedTarget = target && isMountedEntry(target);
    const mountRootTarget = target && isMountRootEntry(target);

    if (paths.length === 0 && !["refresh", "empty_trash", "new_file", "new_folder", "paste", "clear_history"].includes(action)) return;

    if (mountRootTarget && ['delete', 'rename', 'compress', 'extract', 'copy', 'cut'].includes(action)) {
      addToast(t('filemanager.messages.mountRootDeleteBlocked') || 'This mapped remote storage must be removed from Mounts.', 'error');
      return;
    }

    if ((action === 'toggle_favorite' || action.startsWith('favorite_')) && mountedTarget) {
      addToast(t('filemanager.messages.mountFavoriteUnsupported') || 'This action is not available for remote mount entries yet.', 'error');
      return;
    }

    switch (action) {
      case "open":
      case "preview":
        if (target) {
          const ext = target.name.split('.').pop()?.toLowerCase() || '';
          const isAudio = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma'].includes(ext);
          if (target.is_dir) { 
            setFmMode("files"); 
            setCurrentPath(target.path); 
          } 
          else if (isArchive(target) && action === "open") { 
            setBrowsingArchivePath(target.path); 
          }
          else if (isAudio && action === "open") {
            // Audio prioritizes floating player
            playAudio(target, files);
            addToast(t('filemanager.audio.addedToPlaylist'), 'success');
          }
          else { 
            addToRecentFiles(target); 
            previewFile(target.path); 
          }
        }
        break;
      case "browse_archive": if (target) setBrowsingArchivePath(target.path); break;
      case "open_location":
        if (target) {
          void clearSearch();
          const pathParts = target.path.split('/').filter(Boolean);
          pathParts.pop();
          const parentPath = '/' + pathParts.join('/');
          store.addTab(parentPath);
          store.setFmMode('files');
          store.setHighlightedPath(target.path);
        }
        break;
      case "properties": if (target) { addToRecentFiles(target); setPropertiesFile(target); } break;
      case "remove_from_history": removeFromHistory(paths); deselectAll(); break;
      case "clear_history": clearHistory(); break;
      case "download": if (target) downloadFile(target.path); break;
      case "cancel_share": if (selectedIds.size > 0) { for (const id of Array.from(selectedIds)) cancelShare(id); deselectAll(); } else if (target?.id) cancelShare(target.id); break;
      case "share": if (target) setActiveShareFile(target); break;
      case "copy": case "cut": {
        const items: ClipboardItem[] = paths.map((p) =>
          buildClipboardItem(p, action as 'copy' | 'cut'),
        );
        addToClipboard(items);
        deselectAll();
        break;
      }
      case "paste": if (fmMode === 'files') pasteItems(clipboard, currentPath); break;
      case "delete": {
        if (selectionSummary.hasMountRoot) {
          addToast(t('filemanager.messages.mountRootDeleteBlocked') || 'This mapped remote storage must be removed from Mounts.', 'error');
          return;
        }
        setPendingDeletePaths(paths);
        if (fmMode === 'files' && selectionSummary.hasRemoteDirectDelete) {
          openActionModal(
            'delete_confirm',
            t('filemanager.actions.deleteRemote') || t('filemanager.actions.delete'),
            `${t('filemanager.messages.confirmDeleteRemotePrefix') || 'This will delete '}${paths.length}${t('filemanager.messages.confirmDeleteRemoteSuffix') || ' remote items immediately, and they will not enter the recycle bin.'}`,
            undefined,
            undefined,
            t('filemanager.actions.deleteRemotePhysical') || t('filemanager.actions.deletePhysical'),
          );
          break;
        }
        const usePermanentDelete = paths.length > 0
          && paths.every((path) => shouldUsePermanentDeleteForPath(path, protectedStatus));
        if (fmMode === 'files' || fmMode === 'trash') {
          const deleteConfirmMessage = usePermanentDelete
            ? t('filemanager.messages.confirmDeletePermanent', { count: paths.length })
            : t('filemanager.messages.confirmDelete', { count: paths.length });
          openActionModal(
            "delete_confirm",
            usePermanentDelete ? t("filemanager.actions.deletePermanent") : t("filemanager.actions.delete"),
            deleteConfirmMessage,
            undefined,
            undefined,
            usePermanentDelete ? t("filemanager.actions.deletePermanent") : undefined,
          );
        } else {
          openActionModal("mode_delete_confirm", t("filemanager.actions.delete"), t("filemanager.messages.confirmDelete", { count: paths.length }), undefined, fmMode);
        }
        break;
      }
      case "restore": restoreFiles(paths); break;
      case "delete_permanent": deletePermanent(paths); break;
      case "empty_trash": clearRecycleBin(); break;
      case "compress": openArchiveOperationModal('compress', paths); break;
      case "extract": openArchiveOperationModal('decompress', paths); break;
      case "refresh": loadFiles(); break;
      case "rename": if (target) openActionModal("rename", t("filemanager.actions.rename"), target.name, target.path); break;
      case "new_file": openActionModal("create_file", t("filemanager.newFile"), "NewFile.md"); break;
      case "new_folder": openActionModal("create_dir", t("filemanager.newFolder"), "NewFolder"); break;
      case "thumb_clear_dir": if (target) clearThumbnailCache(target.path); break;
      case "thumb_clear_all": clearThumbnailCache(); break;
      case "thumb_clear_all_users": clearThumbnailCacheAllUsers(); break;
      case "thumb_disable": if (target) setThumbnailDisabled(target.path, true); break;
      case "thumb_enable": if (target) setThumbnailDisabled(target.path, false); break;
      case "toggle_favorite": if (target) toggleFavorite([target.path], target.favorite_color === 0 ? 1 : 0); break;
      default: if (action.startsWith("favorite_")) { const colorText = action.split("_")[1]; if (!colorText) break; const color = parseInt(colorText, 10); toggleFavorite(paths, color); } break;
    }
  };
  handleActionRef.current = handleAction;

  const handleModalSubmit = (value: string) => {
    if (actionModal.type === "create_file") createFile(value);
    else if (actionModal.type === "create_dir") createDirectory(value);
    else if (actionModal.type === "rename" && actionModal.targetPath) renameFile(actionModal.targetPath, value);
  };

  const handleDestructiveSubmit = (type: 'physical_delete' | 'mode_remove') => {
    if (type === 'mode_remove') {
      const paths = pendingDeletePaths;
      if (actionModal.mode === 'favorites') toggleFavorite(paths, 0);
      else if (actionModal.mode === 'recent') removeFromHistory(paths);
      else if (actionModal.mode === 'shares') {
        const selectedIdsArray = Array.from(selectedIds);
        if (selectedIdsArray.length > 0) { for (const id of selectedIdsArray) cancelShare(id); } 
        else { const file = files.find(f => paths.includes(f.path)); if (file?.id) cancelShare(file.id); }
      }
      deselectAll();
    } else {
      deleteFiles(pendingDeletePaths, true);
    }
  };

  const openArchiveOperationModal = (mode: 'compress' | 'decompress', paths: string[]) => {
    const firstPath = paths[0];
    setArchiveOpModal({ isOpen: true, mode, paths, defaultTargetPath: currentPath, defaultArchiveName: mode === 'compress' ? (paths.length === 1 && firstPath ? firstPath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'archive' : 'archive') : 'archive' });
  };

  const handleArchiveOperationSubmit = async (payload: ArchiveOperationSubmitPayload) => {
    const isBatch = payload.paths.length > 1;

    // Construct strongly typed Body
    const body: Record<string, unknown> = payload.mode === 'decompress' 
      ? { 
          paths: payload.paths, 
          archive_path: payload.paths[0], 
          target_path: payload.targetPath, 
          overwrite: payload.overwrite, 
          password: payload.password, 
          delete_archive: payload.deleteArchive 
        } 
      : { 
          paths: payload.paths, 
          source_path: payload.paths[0], 
          format: payload.format, 
          level: payload.level, 
          password: payload.password, 
          encrypt_filenames: payload.encryptFilenames, 
          delete_source: payload.deleteSource, 
          target_name: payload.targetName 
        };

    if (!isBatch) { 
      delete body['paths'];
    } else {
      delete body['archive_path'];
      delete body['source_path'];
    }

    try {
      let response: { data?: unknown; error?: unknown };
      if (payload.mode === 'decompress') {
        if (isBatch) {
          response = await client.POST('/api/v1/file/batch-decompress', { 
            body: body as components["schemas"]["BatchDecompressRequest"] 
          });
        } else {
          response = await client.POST('/api/v1/file/decompress', { 
            body: body as components["schemas"]["DecompressRequest"] 
          });
        }
      } else {
        if (isBatch) {
          response = await client.POST('/api/v1/file/batch-compress', { 
            body: body as components["schemas"]["BatchCompressRequest"] 
          });
        } else {
          response = await client.POST('/api/v1/file/compress', { 
            body: body as components["schemas"]["CompressRequest"] 
          });
        }
      }
      
      const { data, error } = response;
      if (error) {
        const errObj = error as Record<string, unknown>;
        throw new Error((errObj['msg'] as string) || 'Operation failed');
      }

      // Safely extract taskId
      const resultData = (data as Record<string, unknown> | undefined)?.['data'] as Record<string, unknown> | undefined;
      const taskId = resultData?.['task_id'] as string | undefined;
      
      if (!taskId) throw new Error(t('filemanager.archive.taskIdMissing'));
      
      store.addTask({
        id: taskId,
        type: payload.mode,
        status: 'pending',
        progress: 0,
        createdAt: new Date().toISOString()
      });

      const expectedPath = payload.mode === 'compress' 
        ? `${currentPath}/${payload.targetName}.${payload.format}`.replace(/\/+/g, '/')
        : payload.targetPath;
      waitForTask(taskId, [expectedPath]);

      setArchiveOpModal(s => ({ ...s, isOpen: false }));
      addToast(t('filemanager.task.started'), "success");
    } catch (e: unknown) { 
      if (e instanceof Error) throw e;
      throw new Error(String(e));
    }
  };

  const isMinimal = ["favorites", "trash", "recent", "shares"].includes(fmMode);
  const isOfficePreview = previewPath ? isOfficeExtension(getFileExtension(previewPath)) : false;
  const routePage = params.page;
  const routePath = params["path"];

  const closePreview = useCallback(() => {
    const nextPage = routePage || fmMode || 'files';
    navigate({
      preview_path: undefined,
      page: nextPage,
      path: nextPage === 'files' ? (routePath || currentPath) : undefined,
    });
  }, [currentPath, fmMode, navigate, routePage, routePath]);

  if (officePath) {
    return (
      <OfficeLitePage
        path={officePath}
        onClose={() => {
          const hash = window.location.hash.substring(1);
          const p = new URLSearchParams(hash);
          p.delete('office_path');
          p.delete('office_mode');
          window.location.hash = p.toString();
        }}
      />
    );
  }

  if (previewPath && isOfficePreview) {
    return (
      <OfficeOpenModal
        path={previewPath}
        onClose={closePreview}
      />
    );
  }

  // If there's a preview path, show the preview page
  if (previewPath) {
    return (
      <FilePreviewPage 
        path={previewPath} 
        onClose={closePreview} 
      />
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background">
      {!isMinimal && <FileManagerTabs />}
      <div className="flex flex-col flex-1 overflow-hidden bg-background px-4">
        <FileManagerToolbar />
        {fmMode === "recent" && <FileManagerRecentStats onClear={() => handleAction("clear_history", null)} />}
        {fmMode === "files" && !isMinimal && <FileManagerNavigationBar />}
        {fmMode === "favorites" && <FileManagerFavoriteFilter />}
        <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
          {fmMode === 'files' && isSearchMode && searchKeyword && (
            <div className="mx-2 mt-2 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-black tracking-[0.18em] text-primary">
                  <Search size={14} />
                  <span>{t('filemanager.searchActive') || t('filemanager.search')}</span>
                </div>
                <div className="mt-1 truncate text-sm font-semibold text-foreground/80">{searchKeyword}</div>
              </div>
              <button
                type="button"
                onClick={() => void clearSearch()}
                className="ml-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 text-primary transition-colors hover:bg-primary/10"
                title={t('filemanager.clear')}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <FileBrowser 
            onAction={handleAction}
            onContextMenu={(e, file) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, target: file }); }} 
          />
          {fmMode !== 'recent' && (
            <Pagination
              current={pagination.currentPage} total={pagination.total} pageSize={pagination.pageSize}
              onPageChange={(page) => loadFiles(undefined, page, pagination.pageSize)}
              onPageSizeChange={(size) => { store.setPageSize(size); loadFiles(undefined, 1, size); }}
              className="border-t bg-background/50 backdrop-blur-md"
            />
          )}
        </div>
        {contextMenu && <FileManagerContextMenu x={contextMenu.x} y={contextMenu.y} target={contextMenu.target} onClose={() => setContextMenu(null)} onAction={handleAction} />}
      </div>
      {contextMenu && (
        <button
          type="button"
          aria-label={t('common.close')}
          className="absolute inset-0 z-[190] cursor-default bg-transparent"
          onClick={() => setContextMenu(null)}
        />
      )}

      <FilePropertiesModal file={propertiesFile} onClose={() => setPropertiesFile(null)} />
      <ShareModal isOpen={!!activeShareFile} onClose={() => setActiveShareFile(null)} file={activeShareFile} />
      <FileActionModal onSubmit={handleModalSubmit} />
      <ConfirmDestructiveModal 
        isOpen={actionModal.isOpen && (actionModal.type === 'delete_confirm' || actionModal.type === 'mode_delete_confirm')}
        onClose={closeActionModal}
        onSubmit={handleDestructiveSubmit}
        title={actionModal.title}
        message={actionModal.defaultValue}
        confirmLabel={actionModal.confirmLabel || (fmMode === 'files' ? t('filemanager.actions.delete') : t('filemanager.actions.deletePhysical'))}
        mode={actionModal.mode}
        isModeSpecific={actionModal.type === 'mode_delete_confirm'}
      />
      <ArchiveOperationModal {...archiveOpModal} onClose={() => setArchiveOpModal(s => ({ ...s, isOpen: false }))} onSubmit={handleArchiveOperationSubmit} />
      {browsingArchivePath && (
        <ArchiveBrowser 
          archivePath={browsingArchivePath} 
          password={archivePassword}
          onClose={() => { setBrowsingArchivePath(null); setArchivePassword(undefined); }} 
        />
      )}
      <GlobalUploader />
      <ClipboardBar />
    </div>
  );
};
