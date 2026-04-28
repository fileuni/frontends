import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { FileInfo, ViewMode, FileManagerMode, ClipboardItem } from '../types/index.ts';
import { useAuthStore } from '@/stores/auth.ts';
import { storageHub } from '@/lib/storageHub';
import { client, extractData, handleApiError, isApiError, type components as ApiComponents } from '@/lib/api.ts';
import { parseFileListResult } from '../utils/fileListResponse.ts';
import { useToastStore } from '@/stores/toast';
import i18next from '@/lib/i18n.ts';

export type { FileManagerMode };
export type FMMode = FileManagerMode;

export interface StorageStats {
  used: number;
  quota: number;
}

export interface Tab {
  id: string;
  path: string;
  title: string;
}

export interface TaskState {
  id: string;
  type: string;
  status: 'queued' | 'pending' | 'running' | 'success' | 'failed' | 'interrupted';
  progress: number;
  message?: string;
  createdAt: string;
}

type BaseListQuery = ApiComponents["schemas"]["BaseListQuery"];

// Data bucket for each user
interface UserFileData {
  currentPath: string;
  clipboard: ClipboardItem[];
  tabs: Tab[];
  activeTabId: string;
  recentFiles: FileInfo[];
  viewMode: ViewMode;
  sortConfig: { field: string; order: 'asc' | 'desc' }; // Sort configuration
  searchKeyword: string; // Search keyword
  searchPath: string; // Search root path
  isSearchMode: boolean; // Whether in search mode
  shareFilter: { hasPassword: boolean | null; enableDirect: boolean | null }; // Share filter
  pageSize: number;
  activeTasks: TaskState[]; // Active task queue
}

interface FileState {
  // Global runtime states
  files: FileInfo[];
  loading: boolean;
  fmMode: FileManagerMode;
  storageStats: StorageStats | null;
  showShareStatus: boolean;
  favoriteFilterColor: number | null;
  highlightedPath: string | null;

  // Pagination info
  pagination: {
    total: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };

  // User specific persisted data
  userStates: Record<string, UserFileData>;

  // Internal helpers
  _getUid: () => string;
  _ensureUser: (uid: string) => void;
  _getUserData: (uid: string) => UserFileData;

  // Public getters
  getCurrentPath: () => string;
  getClipboard: () => ClipboardItem[];
  getTabs: () => Tab[];
  getActiveTabId: () => string;
  getRecentFiles: () => FileInfo[];
  getViewMode: () => ViewMode;
  getSortConfig: () => { field: string; order: 'asc' | 'desc' };
  getSearchKeyword: () => string;
  getSearchPath: () => string;
  getIsSearchMode: () => boolean;
  getShareFilter: () => { hasPassword: boolean | null; enableDirect: boolean | null };
  getPageSize: () => number;
  getPagination: () => { total: number; totalPages: number; currentPage: number; pageSize: number };

  // Actions
  setCurrentPath: (path: string) => void;
  addToRecentFiles: (file: FileInfo) => void;
  clearRecentFiles: () => void;
  removeFromRecent: (paths: string[]) => void;
  setFiles: (files: FileInfo[]) => void;
  setLoading: (loading: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setFmMode: (mode: FileManagerMode) => void;
  setStorageStats: (stats: StorageStats | null) => void;
  setShowShareStatus: (show: boolean) => void;
  setFavoriteFilterColor: (color: number | null) => void;
  setHighlightedPath: (path: string | null) => void;
  setPageSize: (size: number) => void;
  
  // Sorting and searching related
  setSortConfig: (config: { field: string; order: 'asc' | 'desc' }) => void;
  setSearchKeyword: (keyword: string) => void;
  setSearchPath: (path: string) => void;
  setIsSearchMode: (isSearchMode: boolean) => void;
  setShareFilter: (filter: Partial<{ hasPassword: boolean | null; enableDirect: boolean | null }>) => void;
  setPagination: (total: number, totalPages: number, currentPage: number, pageSize: number) => void;

  // Tab/Selection Actions
  addTab: (path: string, title?: string) => void;
  removeTab: (id: string) => void;
  setActiveTabId: (id: string) => void;
  setTabs: (tabs: Tab[]) => void;
  closeOtherTabs: (id: string) => void;
  closeLeftTabs: (id: string) => void;
  closeRightTabs: (id: string) => void;
  
  // Clipboard Actions
  addToClipboard: (newItems: ClipboardItem[]) => void;
  clearClipboard: () => void;
  removeFromClipboard: (path: string) => void;
  reorderClipboard: (oldIndex: number, newIndex: number) => void;

  // Task Actions
  addTask: (task: TaskState) => void;
  updateTask: (id: string, updates: Partial<TaskState>) => void;
  removeTask: (id: string) => void;
  clearFinishedTasks: () => void;
  getActiveTasks: () => TaskState[];

  // Optimistic Updates
  appendFiles: (newFiles: FileInfo[]) => void;
  updateFile: (path: string, updates: Partial<FileInfo>) => void;
  removeFiles: (paths: string[]) => void;

  // Action Modal
  actionModal: { 
    isOpen: boolean; 
    type: 'create_file' | 'create_dir' | 'rename' | 'delete_confirm' | 'mode_delete_confirm'; 
    title: string;
    defaultValue: string;
    targetPath?: string;
    mode?: FileManagerMode;
    confirmLabel?: string;
  };
  openActionModal: (type: 'create_file' | 'create_dir' | 'rename' | 'delete_confirm' | 'mode_delete_confirm', title: string, defaultValue: string, targetPath?: string, mode?: FileManagerMode, confirmLabel?: string) => void;
  closeActionModal: () => void;

  // Data loading
  loadFiles: (path?: string, page?: number, pageSize?: number, mode?: FileManagerMode) => Promise<void>;
  loadStorageStats: () => Promise<void>;
}

const DEFAULT_TAB_ID = 'default';

const getInitialUserData = (): UserFileData => ({
  currentPath: '/',
  clipboard: [],
  tabs: [{ id: DEFAULT_TAB_ID, path: '/', title: 'Home' }],
  activeTabId: DEFAULT_TAB_ID,
  recentFiles: [],
  viewMode: 'grid',
  sortConfig: { field: 'name', order: 'asc' },
  searchKeyword: '',
  searchPath: '/',
  isSearchMode: false,
  shareFilter: { hasPassword: null, enableDirect: null },
  pageSize: 20,
  activeTasks: []
});

export const useFileStore = create<FileState>()(
  persist(
    (set, get): FileState => ({
      files: [],
      loading: false,
      fmMode: 'files',
      storageStats: null,
      showShareStatus: false,
      favoriteFilterColor: null,
      highlightedPath: null,
      pagination: { total: 0, totalPages: 1, currentPage: 1, pageSize: 20 },
      userStates: {},

      _getUid: () => useAuthStore.getState().currentUserId || 'guest',

      _ensureUser: (uid) => {
        if (!get().userStates[uid]) {
          set(state => ({
            userStates: { ...state.userStates, [uid]: getInitialUserData() }
          }));
        }
      },

      _getUserData: (uid) => {
        const existing = get().userStates[uid];
        if (existing) return existing;

        get()._ensureUser(uid);
        return get().userStates[uid] ?? getInitialUserData();
      },

      getCurrentPath: () => {
        const uid = get()._getUid();
        return get()._getUserData(uid).currentPath;
      },

      getClipboard: () => {
        const uid = get()._getUid();
        return get()._getUserData(uid).clipboard;
      },

      getTabs: () => {
        const uid = get()._getUid();
        return get()._getUserData(uid).tabs;
      },

      getActiveTabId: () => {
        const uid = get()._getUid();
        return get()._getUserData(uid).activeTabId;
      },

      getRecentFiles: () => {
        const uid = get()._getUid();
        return get()._getUserData(uid).recentFiles;
      },

      getViewMode: () => {
        const uid = get()._getUid();
        return get()._getUserData(uid).viewMode;
      },

      getSortConfig: () => {
        const uid = get()._getUid();
        return get()._getUserData(uid).sortConfig;
      },

      getSearchKeyword: () => {
        const uid = get()._getUid();
        return get()._getUserData(uid).searchKeyword;
      },

      getSearchPath: () => {
        const uid = get()._getUid();
        return get()._getUserData(uid).searchPath;
      },

      getIsSearchMode: () => {
        const uid = get()._getUid();
        return get()._getUserData(uid).isSearchMode;
      },

      getShareFilter: () => {
        const uid = get()._getUid();
        return get()._getUserData(uid).shareFilter;
      },

      getPageSize: () => {
        const uid = get()._getUid();
        return get()._getUserData(uid).pageSize;
      },

      getPagination: () => {
        return get().pagination;
      },

      actionModal: { isOpen: false, type: 'create_file', title: '', defaultValue: '' },
      openActionModal: (type, title, defaultValue, targetPath, mode, confirmLabel) => set({ 
        actionModal: {
          isOpen: true,
          type,
          title,
          defaultValue,
          ...(targetPath ? { targetPath } : {}),
          ...(mode ? { mode } : {}),
          ...(confirmLabel ? { confirmLabel } : {}),
        },
      }),
      closeActionModal: () => set((state) => ({ 
        actionModal: { ...state.actionModal, isOpen: false } 
      })),

      setCurrentPath: (path) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        
        const normalizedPath = path.replace(/\/+/g, '/').replace(/(.+)\/$/, '$1') || '/';
        if (normalizedPath === userData.currentPath) return;

        const updatedTabs = userData.tabs.map(tab => 
          tab.id === userData.activeTabId 
            ? { ...tab, path: normalizedPath, title: normalizedPath === '/' ? 'Home' : normalizedPath.split('/').pop() || 'Folder' } 
            : tab
        );

        // Record directory access to recent files
        const currentDirInfo = get().files.find(f => f.path === normalizedPath) || {
          name: normalizedPath.split('/').pop() || 'Root',
          path: normalizedPath,
          is_dir: true,
          size: 0,
          modified: new Date().toISOString(),
          favorite_color: 0
        };
        
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: { ...userData, currentPath: normalizedPath, tabs: updatedTabs } as UserFileData
          }
        }));

        if (normalizedPath !== '/') {
          get().addToRecentFiles(currentDirInfo as FileInfo);
        }
      },

      addToRecentFiles: (file) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);

        const existing = userData.recentFiles || [];
        const record = { ...file, accessed_at: new Date().toISOString() };
        let merged = [record, ...existing.filter(f => f.path !== file.path)];
        if (merged.length > 100) merged = merged.slice(0, 100);

        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: { ...userData, recentFiles: merged } as UserFileData
          }
        }));
      },

      clearRecentFiles: () => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: { ...userData, recentFiles: [] } as UserFileData
          }
        }));
      },

      removeFromRecent: (paths) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        const pathSet = new Set(paths);
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: { ...userData, recentFiles: (userData.recentFiles || []).filter(f => !pathSet.has(f.path)) } as UserFileData
          }
        }));
      },

      setFiles: (files) => set({ files }),
      setLoading: (loading) => set({ loading }),
      
      setViewMode: (mode) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: { ...userData, viewMode: mode } as UserFileData
          }
        }));
      },

      setFmMode: (mode) => set({ 
        fmMode: mode,
        files: [],
        favoriteFilterColor: null,
        pagination: { total: 0, totalPages: 1, currentPage: 1, pageSize: get().getPageSize() }
      }),

      setStorageStats: (storageStats) => set({ storageStats }),
      setShowShareStatus: (showShareStatus) => set({ showShareStatus }),
      setFavoriteFilterColor: (favoriteFilterColor) => set({ favoriteFilterColor }),
      setHighlightedPath: (highlightedPath) => set({ highlightedPath }),
      
      setPageSize: (pageSize) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: { ...userData, pageSize } as UserFileData
          }
        }));
      },

      setPagination: (total, totalPages, currentPage, pageSize) => set({ pagination: { total, totalPages, currentPage, pageSize } }),

      setSortConfig: (config) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: { ...userData, sortConfig: config } as UserFileData
          }
        }));
      },

      setSearchKeyword: (keyword) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: { ...userData, searchKeyword: keyword } as UserFileData
          }
        }));
      },

      setSearchPath: (path) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        const normalizedPath = path.replace(/\/+/g, '/').replace(/(.+)\/$/, '$1') || '/';
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: { ...userData, searchPath: normalizedPath } as UserFileData
          }
        }));
      },

      setIsSearchMode: (isSearchMode) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: { ...userData, isSearchMode } as UserFileData
          }
        }));
      },

      setShareFilter: (filter) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: { 
              ...userData, 
              shareFilter: { ...userData.shareFilter, ...filter } 
            } as UserFileData
          }
        }));
      },

      appendFiles: (newFiles) => set((state) => {
        const existingPaths = new Set(state.files.map(f => f.path));
        const filtered = newFiles.filter(f => !existingPaths.has(f.path));
        return { files: [...state.files, ...filtered] };
      }),
      updateFile: (path, updates) => set((state) => ({
        files: state.files.map(f => f.path === path ? { ...f, ...updates } : f)
      })),
      removeFiles: (paths) => set((state) => {
        const pathSet = new Set(paths);
        return { files: state.files.filter(f => !pathSet.has(f.path)) };
      }),

      addTab: (path, title) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        const id = Math.random().toString(36).substring(2, 9);
        const newTab = { id, path, title: title || (path === '/' ? 'Home' : path.split('/').pop() || 'Folder') };
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: { ...userData, tabs: [...userData.tabs, newTab], activeTabId: id, currentPath: path } as UserFileData
          }
        }));
      },

      removeTab: (id) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        if (userData.tabs.length <= 1) return;
        const newTabs = userData.tabs.filter(t => t.id !== id);
        let newActiveId = userData.activeTabId;
        let newPath = userData.currentPath;
        if (userData.activeTabId === id) {
          const lastTab = newTabs[newTabs.length - 1];
          if (lastTab) { newActiveId = lastTab.id; newPath = lastTab.path; }
        }
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: { ...userData, tabs: newTabs, activeTabId: newActiveId, currentPath: newPath } as UserFileData
          }
        }));
      },

      setActiveTabId: (id) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        const tab = userData.tabs.find(t => t.id === id);
        if (tab) {
          set(state => ({
            userStates: {
              ...state.userStates,
              [uid]: { ...userData, activeTabId: id, currentPath: tab.path } as UserFileData
            }
          }));
        }
      },

      setTabs: (newTabs) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: { ...userData, tabs: newTabs } as UserFileData
          }
        }));
      },

      closeOtherTabs: (id) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        const tab = userData.tabs.find(t => t.id === id);
        if (!tab) return;
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: { ...userData, tabs: [tab], activeTabId: id, currentPath: tab.path } as UserFileData
          }
        }));
      },

      closeLeftTabs: (id) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        const idx = userData.tabs.findIndex(t => t.id === id);
        if (idx === -1) return;
        const targetTab = userData.tabs[idx];
        if (!targetTab) return;
        const newTabs = userData.tabs.slice(idx);
        const stillHasActive = newTabs.some(t => t.id === userData.activeTabId);
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: { 
              ...userData, 
              tabs: newTabs, 
              activeTabId: stillHasActive ? userData.activeTabId : id,
              currentPath: stillHasActive ? userData.currentPath : targetTab.path
            } as UserFileData
          }
        }));
      },

      closeRightTabs: (id) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        const idx = userData.tabs.findIndex(t => t.id === id);
        if (idx === -1) return;
        const targetTab = userData.tabs[idx];
        if (!targetTab) return;
        const newTabs = userData.tabs.slice(0, idx + 1);
        const stillHasActive = newTabs.some(t => t.id === userData.activeTabId);
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: { 
              ...userData, 
              tabs: newTabs, 
              activeTabId: stillHasActive ? userData.activeTabId : id,
              currentPath: stillHasActive ? userData.currentPath : targetTab.path
            } as UserFileData
          }
        }));
      },
      
      // Clipboard Actions
      addToClipboard: (newItems) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        const existingPaths = new Set(userData.clipboard.map(i => i.path));
        let merged = [...userData.clipboard, ...newItems.filter(i => !existingPaths.has(i.path))];
        if (merged.length > 100) merged = merged.slice(-100);
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: { ...userData, clipboard: merged } as UserFileData
          }
        }));
      },

      clearClipboard: () => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: { ...userData, clipboard: [] } as UserFileData
          }
        }));
      },

      removeFromClipboard: (path) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: {
              ...userData,
              clipboard: userData.clipboard.filter(i => i.path !== path)
            } as UserFileData
          }
        }));
      },

      reorderClipboard: (oldIndex, newIndex) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        const newClipboard = [...userData.clipboard];
        const [movedItem] = newClipboard.splice(oldIndex, 1);
        if (movedItem) newClipboard.splice(newIndex, 0, movedItem);
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: { ...userData, clipboard: newClipboard } as UserFileData
          }
        }));
      },

      addTask: (task) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        const tasks = userData.activeTasks || [];
        const existingIndex = tasks.findIndex((item) => item.id === task.id);
        const nextTasks = existingIndex >= 0
          ? tasks.map((item) => (item.id === task.id ? { ...item, ...task } : item))
          : [task, ...tasks];
        const updatedUser: UserFileData = { ...userData, activeTasks: nextTasks };
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: updatedUser
          }
        }));
      },

      updateTask: (id, updates) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        const tasks = userData.activeTasks || [];
        const updatedUser: UserFileData = { 
          ...userData, 
          activeTasks: tasks.map(t => t.id === id ? { ...t, ...updates } : t)
        };
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: updatedUser
          }
        }));
      },

      removeTask: (id) => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        const tasks = userData.activeTasks || [];
        const updatedUser: UserFileData = { 
          ...userData, 
          activeTasks: tasks.filter(t => t.id !== id)
        };
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: updatedUser
          }
        }));
      },

      clearFinishedTasks: () => {
        const uid = get()._getUid();
        const userData = get()._getUserData(uid);
        const tasks = userData.activeTasks || [];
        const updatedUser: UserFileData = { 
          ...userData, 
          activeTasks: tasks.filter(t => t.status === 'running' || t.status === 'pending')
        };
        set(state => ({
          userStates: {
            ...state.userStates,
            [uid]: updatedUser
          }
        }));
      },

      getActiveTasks: () => {
        const uid = get()._getUid();
        const tasks = get()._getUserData(uid).activeTasks;
        const now = Date.now();
        return tasks.filter((task) => {
          const createdAt = Date.parse(task.createdAt);
          if (!Number.isFinite(createdAt)) {
            return true;
          }
          const ageMs = now - createdAt;
          if (task.status === 'success' || task.status === 'failed' || task.status === 'interrupted') {
            return ageMs < 30 * 60 * 1000;
          }
          return ageMs < 6 * 60 * 60 * 1000;
        });
      },

      loadFiles: async (path, page = 1, pageSize, mode) => {
        const state = get();
        const fileStore = get();
        const activeMode = mode || state.fmMode;
        const effectivePath = path ?? state.getCurrentPath();
        const effectivePageSize = pageSize ?? state.getPageSize();
        const sortConfig = state.getSortConfig();
        const isSearchMode = state.getIsSearchMode();
        const searchKeyword = state.getSearchKeyword();
        const searchPath = state.getSearchPath();
        const showShareStatus = state.showShareStatus;
        const favoriteFilterColor = state.favoriteFilterColor;

        if (activeMode === 'recent') {
          set({ files: [...fileStore.getRecentFiles()] });
          return;
        }

        set({ loading: true });
        try {
          const baseQuery: BaseListQuery = {
            page: String(page),
            page_size: String(effectivePageSize),
            ...(sortConfig.field
              ? {
                  sort_by: sortConfig.field,
                  order: sortConfig.order,
                }
              : {}),
          };

          const keyword = searchKeyword.trim();
          let result: FileInfo[] | unknown;

          if (activeMode === 'files' && isSearchMode && keyword) {
            result = await extractData<FileInfo[] | unknown>(
              client.GET("/api/v1/file/search", {
                params: {
                  query: {
                    ...baseQuery,
                    keyword,
                    path: searchPath,
                  },
                },
              }),
            );
          } else if (activeMode === 'favorites') {
            result = await extractData<FileInfo[] | unknown>(
              client.GET("/api/v1/file/favorites/list", {
                params: {
                  query: {
                    base: baseQuery,
                    ...(favoriteFilterColor !== null ? { color: favoriteFilterColor } : {}),
                  },
                },
              }),
            );
          } else if (activeMode === 'trash') {
            result = await extractData<FileInfo[] | unknown>(
              client.GET("/api/v1/file/recycle-bin/list", {
                params: {
                  query: {
                    base: baseQuery,
                  },
                },
              }),
            );
          } else if (activeMode === 'shares') {
            const shareFilter = fileStore.getShareFilter();
            result = await extractData<FileInfo[] | unknown>(
              client.GET("/api/v1/file/shares/my", {
                params: {
                  query: {
                    base: baseQuery,
                    ...(shareFilter.hasPassword !== null
                      ? { has_password: shareFilter.hasPassword }
                      : {}),
                    ...(shareFilter.enableDirect !== null
                      ? { enable_direct: shareFilter.enableDirect }
                      : {}),
                  },
                },
              }),
            );
          } else {
            result = await extractData<FileInfo[] | unknown>(
              client.GET("/api/v1/file/list", {
                params: {
                  query: {
                    path: effectivePath,
                    base: baseQuery,
                    check_share: showShareStatus,
                  },
                },
              }),
            );
          }

          const parsedResult = parseFileListResult(result);
          const filesArray = parsedResult.items;

          if (parsedResult.totalPages !== null) {
            fileStore.setPagination(
              parsedResult.total ?? filesArray.length,
              parsedResult.totalPages,
              page,
              effectivePageSize,
            );
          } else if (parsedResult.total !== null) {
            const totalPages = Math.ceil(parsedResult.total / effectivePageSize);
            fileStore.setPagination(parsedResult.total, totalPages || 1, page, effectivePageSize);
          } else {
            fileStore.setPagination(filesArray.length, 1, 1, effectivePageSize);
          }

          set({ files: filesArray });
        } catch (_error) {
          console.error('Failed to load files:', _error);
          if (activeMode === 'files' && isSearchMode && searchKeyword.trim()) {
            const { addToast } = useToastStore.getState();
            const t = i18next.t.bind(i18next);
            if (isApiError(_error) && _error.biz_code === 'TOO_MANY_ATTEMPTS') {
              addToast(t('filemanager.searchTooFrequent'), 'error');
            } else if (isApiError(_error) && _error.biz_code === 'INVALID_PARAMETER') {
              addToast(t('filemanager.searchKeywordTooShort'), 'error');
            } else {
              addToast(handleApiError(_error, t), 'error');
            }
          }
        } finally {
          set({ loading: false });
        }
      },

      loadStorageStats: async () => {
        try {
          const stats = await extractData(client.GET("/api/v1/file/storage-stats"));
          set({ storageStats: stats as StorageStats });
        } catch (_error) {
          console.error('Failed to load storage stats:', _error);
        }
      },
    }),
    {
      name: 'fileuni-file-manager-v5',
      storage: createJSONStorage(() => storageHub.createZustandStorage()),
      partialize: (state: FileState) => ({
        showShareStatus: state.showShareStatus,
        userStates: state.userStates 
      }),
    }
  )
);
