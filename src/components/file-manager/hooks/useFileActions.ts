import { useCallback, useRef } from 'react';
import { client, extractData, handleApiError } from '@/lib/api.ts';
import { downloadFileByPath } from '@/lib/fileTokens.ts';
import { useFileStore, type TaskState } from '../store/useFileStore.ts';
import { useSelectionStore } from '../store/useSelectionStore.ts';
import { useTranslation } from 'react-i18next';
import type { FileInfo, ClipboardItem } from '../types/index.ts';
import { useToastStore } from '@/stores/toast';
import { isMountRootEntry } from '../utils/mounts.ts';
import { useProtectedStorageStore } from '@/stores/protectedStorage.ts';
import { shouldUsePermanentDeleteForPath } from '../utils/protectedStorage.ts';

interface TaskData {
  status: TaskState['status'];
  message?: string;
  progress?: number;
  task_id?: string;
}

interface WaitForTaskOptions {
  expectedPaths?: string[];
  successMessage?: string;
}

interface BatchMoveOptions {
  optimistic?: boolean;
  successMessage?: string;
  successMessageFactory?: (paths: string[], targetDir: string) => string;
}

export function useFileActions() {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const store = useFileStore();
  const activeIntervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  
  const currentPath = store.getCurrentPath();
  const protectedStatus = useProtectedStorageStore((state) => state.status);
  const fmMode = store.fmMode;

  const loadFiles = store.loadFiles;
  const loadStorageStats = store.loadStorageStats;
  const setFiles = store.setFiles;
  const setLoading = store.setLoading;
  const appendFiles = store.appendFiles;
  const removeFiles = store.removeFiles;
  const updateFile = store.updateFile;
  
  const { deselectAll, setSelection } = useSelectionStore();

  const toggleFavorite = async (paths: string[], color: number) => {
    try {
      for (const path of paths) {
        const { data } = await client.POST("/api/v1/file/favorites/set-color", {
          body: { path, color }
        });
        if (data?.['success']) {
          updateFile(path, { favorite_color: color });
          
          // If in favorites mode and unfavoriting, remove item after animation
          if (fmMode === 'favorites' && color === 0) {
            setTimeout(() => {
              removeFiles([path]);
            }, 600); // Wait for animation
          }
        }
      }
      addToast(color > 0 ? t('filemanager.messages.favoriteAdded') : t('filemanager.messages.favoriteRemoved'), "success");
    } catch (_error) { console.error(_error); }
  };

  const searchFiles = useCallback(async (keyword: string) => {
    store.setSearchKeyword(keyword.trim());
    store.setIsSearchMode(!!keyword.trim());
  }, [store]);

  const clearSearch = useCallback(async () => {
    store.setSearchKeyword('');
    store.setIsSearchMode(false);
  }, [store]);

  const clearHistory = useCallback(() => {
    if (confirm(t('filemanager.messages.confirmClearHistory') || "Clear all browsing history?")) {
      store.clearRecentFiles();
      if (fmMode === 'recent') setFiles([]);
    }
  }, [store, fmMode, setFiles, t]);

  const removeFromHistory = useCallback((paths: string[]) => {
    store.removeFromRecent(paths);
    if (fmMode === 'recent') {
      const recent = store.getRecentFiles();
      setFiles(recent.filter(f => !paths.includes(f.path)));
    }
  }, [store, fmMode, setFiles]);

  const waitForTask = (taskId: string, options?: WaitForTaskOptions) => {
    if (activeIntervalsRef.current.has(taskId)) return;

    const poll = async () => {
      try {
        const task = await extractData<TaskData>(client.GET("/api/v1/file/task/{id}", {
          params: { path: { id: taskId } }
        }));

        store.updateTask(taskId, {
          status: task.status,
          progress: typeof task.progress === 'number' && Number.isFinite(task.progress)
            ? task.progress
            : task.status === 'success'
              ? 100
              : 0,
          ...(task.message ? { message: task.message } : {}),
        });

        if (task.status === 'success') {
          await loadFiles();
          if (options?.expectedPaths && options.expectedPaths.length > 0) {
            const firstExpectedPath = options.expectedPaths[0];
            if (firstExpectedPath) {
              setTimeout(() => {
                store.setHighlightedPath(firstExpectedPath);
              }, 100);
            }
          }
          if (options?.successMessage) {
            addToast(options.successMessage, 'success');
          }
          return true;
        } else if (task.status === 'failed' || task.status === 'interrupted') {
          addToast(`Task failed: ${task.message || 'Unknown error'}`, "error");
          loadFiles();
          return true;
        }
        return false;
      } catch (_error) {
        console.error("Polling error:", _error);
        return false;
      }
    };

    const interval = setInterval(async () => {
      if (await poll()) {
        clearInterval(interval);
        activeIntervalsRef.current.delete(taskId);
      }
    }, 2000);

    activeIntervalsRef.current.set(taskId, interval);
  };

  /**
   * 辅助函数：从 API 响应中提取 Task ID / Helper: Extract Task ID from API response
   */
  const extractTaskId = (data: unknown): string | undefined => {
    if (!data) return undefined;
    if (typeof data === 'string') return data;
    if (typeof data === 'object') {
      const obj = data as TaskData;
      return obj.task_id;
    }
    return undefined;
  };

  const resolveFilesByPaths = (paths: string[]): FileInfo[] => {
    const knownFiles = store.files;
    return paths
      .map((path) => knownFiles.find((file) => file.path === path))
      .filter((file): file is FileInfo => Boolean(file));
  };

  const showMountRootBlockedToast = () => {
    addToast(t('filemanager.messages.mountRootDeleteBlocked') || 'This mapped remote storage must be removed from Mounts.', 'error');
  };

  const deleteFiles = async (paths: string[], skipConfirm: boolean = false) => {
    if (paths.length === 0 || !paths[0]) return;
    const allUsePermanentDelete = paths.every((path) =>
      shouldUsePermanentDeleteForPath(path, protectedStatus),
    );
    const deleteConfirmMessage = allUsePermanentDelete
      ? t('filemanager.messages.confirmDeletePermanent', { count: paths.length })
      : t('filemanager.messages.confirmDelete', { count: paths.length });
    if (!skipConfirm && !confirm(deleteConfirmMessage)) return;

    try {
      const selectedFiles = resolveFilesByPaths(paths);
      if (selectedFiles.some((file) => isMountRootEntry(file))) {
        showMountRootBlockedToast();
        return;
      }

      if (paths.length === 1) {
        const request = allUsePermanentDelete
          ? client.POST("/api/v1/file/delete-permanent", {
              body: { path: paths[0] }
            })
          : client.DELETE("/api/v1/file/delete", {
              body: { path: paths[0] }
            });
        const { data } = await request;
        if (data?.['success']) {
          removeFiles(paths);
          loadStorageStats();
        }
      } else {
        const { data } = await client.POST(
          allUsePermanentDelete
            ? "/api/v1/file/batch-delete-permanent"
            : "/api/v1/file/batch-delete",
          {
            body: { paths }
          }
        );
        if (data?.['success']) {
          const taskId = extractTaskId(data['data']);
          if (taskId) {
            store.addTask({
              id: taskId,
              type: 'batch_delete',
              status: 'pending',
              progress: 0,
              createdAt: new Date().toISOString()
            });
            waitForTask(taskId);
          } else {
            removeFiles(paths);
            loadStorageStats();
          }
        }
      }
    } catch (_error) {
      addToast(handleApiError(_error, t), 'error');
      await loadFiles();
    }
  };

  const batchMove = async (paths: string[], targetDir: string, options?: BatchMoveOptions) => {
    try {
      const selectedFiles = resolveFilesByPaths(paths);
      if (selectedFiles.some((file) => isMountRootEntry(file))) {
        showMountRootBlockedToast();
        return;
      }

      const shouldOptimisticallyRemove = options?.optimistic === true;
      const successMessage = options?.successMessageFactory
        ? options.successMessageFactory(paths, targetDir)
        : options?.successMessage;
      if (shouldOptimisticallyRemove) {
        removeFiles(paths);
        const currentSelection = useSelectionStore.getState().selectedIds;
        const remainingSelection = store.files
          .filter((file) => !paths.includes(file.path) && currentSelection.has(file.path))
          .map((file) => file.path);
        setSelection(remainingSelection);
      } else {
        deselectAll();
      }

      const { data } = await client.POST("/api/v1/file/batch-move", {
        body: { paths, target_path: targetDir }
      });
      const expectedPaths = paths.map(p => `${targetDir}/${p.split('/').pop()}`.replace(/\/+/g, '/'));
      if (data?.['success']) {
        const taskId = extractTaskId(data['data']);
        if (taskId) {
          store.addTask({
            id: taskId,
            type: 'batch_move',
            status: 'pending',
            progress: 0,
            createdAt: new Date().toISOString()
          });
          waitForTask(taskId, {
            expectedPaths,
            ...(successMessage ? { successMessage } : {}),
          });
        } else {
          if (!shouldOptimisticallyRemove) {
            removeFiles(paths);
            deselectAll();
          }
          if (targetDir === currentPath) await loadFiles();
          const firstExpectedPath = expectedPaths[0];
          if (firstExpectedPath) store.setHighlightedPath(firstExpectedPath);
          if (successMessage) {
            addToast(successMessage, 'success');
          }
        }
      }
    } catch (_error) {
      addToast(handleApiError(_error, t), 'error');
      await loadFiles();
    }
  };

  const batchCopy = async (paths: string[], targetDir: string) => {
    try {
      const selectedFiles = resolveFilesByPaths(paths);
      if (selectedFiles.some((file) => isMountRootEntry(file))) {
        showMountRootBlockedToast();
        return;
      }

      const { data } = await client.POST("/api/v1/file/batch-copy", {
        body: { paths, target_path: targetDir }
      });
      const expectedPaths = paths.map(p => `${targetDir}/${p.split('/').pop()}`.replace(/\/+/g, '/'));
      if (data?.['success']) {
        const taskId = extractTaskId(data['data']);
        if (taskId) {
          store.addTask({
            id: taskId,
            type: 'batch_copy',
            status: 'pending',
            progress: 0,
            createdAt: new Date().toISOString()
          });
          waitForTask(taskId, { expectedPaths });
        } else {
          await loadFiles();
          const firstExpectedPath = expectedPaths[0];
          if (firstExpectedPath) store.setHighlightedPath(firstExpectedPath);
        }
      }
    } catch (_error) {
      addToast(handleApiError(_error, t), 'error');
    }
  };

  const batchCompress = async (paths: string[], targetName: string) => {
    try {
      const { data } = await client.POST("/api/v1/file/batch-compress", {
        body: { paths, format: 'zip', target_name: targetName }
      });
      const expectedPath = `${currentPath}/${targetName}`.replace(/\/+/g, '/');
      if (data?.['success']) {
        const taskId = extractTaskId(data['data']);
        if (taskId) {
          store.addTask({
            id: taskId,
            type: 'compress',
            status: 'pending',
            progress: 0,
            createdAt: new Date().toISOString()
          });
          waitForTask(taskId, { expectedPaths: [expectedPath] });
        } else {
          await loadFiles();
          store.setHighlightedPath(expectedPath);
        }
      }
    } catch (_error) {
      addToast(handleApiError(_error, t), 'error');
    }
  };

  const renameFile = async (oldPath: string, newName: string) => {
    try {
      const pathParts = oldPath.split('/');
      pathParts[pathParts.length - 1] = newName;
      const newPath = pathParts.join('/');

      const { data, error } = await client.POST("/api/v1/file/rename", {
        body: { old_path: oldPath, new_path: newPath }
      });
      if (error) throw error;
      if (data?.['success']) {
        updateFile(oldPath, { name: newName, path: newPath });
        // Ensure it's highlighted after rename
        store.setHighlightedPath(newPath);
      }
    } catch (_error) {
      console.error('Rename failed:', _error);
    }
  };

  const downloadFile = async (path: string) => {
    try {
      const file = store.files.find(f => f.path === path);
      if (file) store.addToRecentFiles(file);

      const fileName = path.split('/').pop() || 'file';
      await downloadFileByPath(path, fileName);
    } catch (_error) {
      console.error('Download failed:', _error);
      addToast(t('common.error') || "Download failed", "error");
    }
  };

  const previewFile = (path: string) => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    params.set('preview_path', path);
    window.location.hash = params.toString();
  };

  const restoreFiles = async (paths: string[]) => {
    try {
      await client.POST("/api/v1/file/recycle-bin/restore", { body: { paths } });
      removeFiles(paths);
      deselectAll();
    } catch (_error) { void _error; }
  };

  const deletePermanent = async (paths: string[]) => {
    if (!confirm(t('filemanager.messages.confirmDeletePermanent', { count: paths.length }) || `Permanently delete ${paths.length} items?`)) return;
    try {
      await client.POST("/api/v1/file/recycle-bin/delete-permanent", { body: { paths } });
      removeFiles(paths);
      deselectAll();
    } catch (_error) { void _error; }
  };

  const clearRecycleBin = async () => {
    if (!confirm(t('filemanager.messages.confirmClearTrash') || "Clear recycle bin?")) return;
    try {
      await client.POST("/api/v1/file/recycle-bin/clear-all", {});
      loadFiles();
      loadStorageStats();
    } catch (_error) { void _error; }
  };

  const clearAllShares = async () => {
    if (!confirm(t('filemanager.messages.confirmClearShares') || "Are you sure you want to cancel all your shares?")) return;
    try {
      const { data } = await client.POST("/api/v1/file/shares/clear-all", {});
      if (data?.['success']) {
        setFiles([]);
        addToast(t('filemanager.messages.deleted'), "success");
      }
    } catch (_error) { console.error(_error); }
  };

  const clearAllFavorites = async () => {
    if (!confirm(t('filemanager.messages.confirmClearFavorites') || "Are you sure you want to remove all favorites?")) return;
    try {
      const { data } = await client.POST("/api/v1/file/favorites/clear-all", {});
      if (data?.['success']) {
        setFiles([]);
        addToast(t('filemanager.messages.favoriteRemoved'), "success");
      }
    } catch (_error) { console.error(_error); }
  };

  const clearThumbnailCache = async (path?: string) => {
    const confirmMessage = path
      ? (t('filemanager.thumbnail.confirmClearDir') || 'Clear thumbnails in this folder?')
      : (t('filemanager.thumbnail.confirmClearAll') || 'Clear all thumbnails?');
    if (!confirm(confirmMessage)) return;
    try {
      const body = path ? { path } : {};
      const { data } = await client.POST("/api/v1/file/thumbnail/clear", { body });
      if (data?.['success']) {
        addToast(t('filemanager.thumbnail.cleared') || 'Thumbnail cache cleared', "success");
      }
    } catch (_error) { console.error(_error); }
  };

  const clearThumbnailCacheAllUsers = async () => {
    if (!confirm(t('filemanager.thumbnail.confirmClearAllUsers') || 'Clear all users thumbnail cache?')) return;
    try {
      const { data } = await client.POST("/api/v1/file/admin/thumbnail/clear-all", {});
      if (data?.['success']) {
        addToast(t('filemanager.thumbnail.cleared') || 'Thumbnail cache cleared', "success");
      }
    } catch (_error) { console.error(_error); }
  };

  const setThumbnailDisabled = async (path: string, disabled: boolean) => {
    const confirmMessage = disabled
      ? (t('filemanager.thumbnail.confirmDisable') || 'Disable thumbnails in this folder?')
      : (t('filemanager.thumbnail.confirmEnable') || 'Enable thumbnails in this folder?');
    if (!confirm(confirmMessage)) return;
    try {
      const { data } = await client.POST("/api/v1/file/thumbnail/disable", { body: { path, disabled } });
      if (data?.['success']) {
        addToast(disabled ? (t('filemanager.thumbnail.disabled') || 'Thumbnails disabled') : (t('filemanager.thumbnail.enabled') || 'Thumbnails enabled'), "success");
      }
    } catch (_error) { console.error(_error); }
  };

  const decompressFile = async (path: string, targetPath?: string) => {
    try {
      const file = store.files.find(f => f.path === path);
      if (file) store.addToRecentFiles(file);
      const { data } = await client.POST("/api/v1/file/decompress", { 
        body: { archive_path: path, target_path: targetPath || currentPath } 
      });
      if (data?.['success']) {
        const taskId = extractTaskId(data['data']);
        if (taskId) {
          store.addTask({
            id: taskId,
            type: 'decompress',
            status: 'pending',
            progress: 0,
            createdAt: new Date().toISOString()
          });
          waitForTask(taskId);
        } else {
          loadFiles();
        }
      }
    } catch (_error) {
      addToast(handleApiError(_error, t), 'error');
    }
  };

  const forceSyncIndex = async (path: string = currentPath) => {
    setLoading(true);
    try {
      const data = await extractData<FileInfo[]>(client.POST("/api/v1/file/sync-index", {
        body: { path }
      }));
      setFiles(data);
    } catch (_error) { console.error(_error); } finally { setLoading(false); }
  };

  const createDirectory = async (name: string) => {
    if (!name) return;
    try {
      const newItem = await extractData<FileInfo>(client.POST("/api/v1/file/create-dir", {
        body: { path: `${currentPath}/${name}`.replace(/\/+/g, '/') }
      }));
      appendFiles([newItem]);
      store.setHighlightedPath(newItem.path);
      loadStorageStats();
    } catch (_error) { void _error; loadFiles(); }
  };

  const createFile = async (name: string) => {
    if (!name) return;
    try {
      const newItem = await extractData<FileInfo>(client.POST("/api/v1/file/create", {
        body: { path: `${currentPath}/${name}`.replace(/\/+/g, '/'), content: '' }
      }));
      appendFiles([newItem]);
      store.setHighlightedPath(newItem.path);
      loadStorageStats();
    } catch (_error) { void _error; loadFiles(); }
  };

  const cancelShare = async (shareId: string) => {
    if (!shareId) return;
    try {
      const { data } = await client.DELETE("/api/v1/file/shares/{id}", {
        params: { path: { id: shareId } }
      });
      if (data?.['success']) {
        store.setFiles(store.files.filter(f => f.id !== shareId));
        addToast(t('filemanager.messages.deleted'), "success");
      }
    } catch (_error) {
      console.error('Failed to cancel share:', _error);
    }
  };

  const pasteItems = async (items: ClipboardItem[], targetPath: string) => {
    if (items.length === 0) return;
    
    const copyPaths = items.filter(i => i.type === 'copy').map(i => i.path);
    const movePaths = items.filter(i => i.type === 'cut').map(i => i.path);

    if (copyPaths.length > 0) {
      await batchCopy(copyPaths, targetPath);
    }

    if (movePaths.length > 0) {
      await batchMove(movePaths, targetPath);
      for (const path of movePaths) {
        store.removeFromClipboard(path);
      }
    }
  };

  const pasteSingleItem = async (item: ClipboardItem, targetPath: string, overrideType?: 'copy' | 'cut') => {
    const actionType = overrideType || item.type;
    if (actionType === 'copy') {
      await batchCopy([item.path], targetPath);
    } else {
      await batchMove([item.path], targetPath);
      store.removeFromClipboard(item.path);
    }
  };

  return { 
    loadFiles, loadStorageStats, deleteFiles, renameFile, downloadFile, previewFile, searchFiles, clearSearch,
    batchMove, batchCopy, batchCompress,
    restoreFiles, deletePermanent, clearRecycleBin, clearAllShares, clearAllFavorites,
    clearThumbnailCache, clearThumbnailCacheAllUsers, setThumbnailDisabled,
    decompressFile, toggleFavorite,
    createDirectory, createFile, forceSyncIndex,
    clearHistory, removeFromHistory,
    cancelShare, pasteItems, pasteSingleItem, waitForTask
  };
}
