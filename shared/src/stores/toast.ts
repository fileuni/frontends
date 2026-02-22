import { create } from 'zustand';
import { storageHub } from '../lib/storageHub';

// Toast类型 / Toast types
export type ToastType = 'info' | 'success' | 'warning' | 'error';

// Toast持续时间类型 / Toast duration types
export type ToastDuration = 'short' | 'normal' | 'long' | 'persistent';

export const DURATION_MAP: Record<ToastDuration, number> = {
  short: 2000,
  normal: 3000,
  long: 5000,
  persistent: Infinity,
};

// Toast配置选项 / Toast configuration options
export interface ToastOptions {
  type?: ToastType;
  duration?: ToastDuration;
  details?: string; // 错误详情 / Error details
  showDoNotShowAgain?: boolean; // 是否显示"下次不再显示" / Show "do not show again" checkbox
  doNotShowAgainKey?: string; // 存储key / Storage key for do not show again
  userId?: string | number; // 用户ID，用于隔离存储 / User ID for isolated storage
}

// Toast对象 / Toast object
export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: ToastDuration;
  details?: string;
  showDoNotShowAgain: boolean;
  doNotShowAgainKey?: string;
  userId?: string | number;
  showDetails: boolean; // 是否展开详情 / Whether to show details
  doNotShowAgainChecked: boolean; // 是否勾选了"下次不再显示" / Whether "do not show again" is checked
  createdAt: number;
}

// 存储key前缀 / Storage key prefix
const DO_NOT_SHOW_PREFIX = 'fileuni_do_not_show_';

// 获取"下次不再显示"的存储key / Get storage key for "do not show again"
const getDoNotShowKey = (key: string, userId?: string | number): string => {
  const userSuffix = userId ? `_${userId}` : '';
  return `${DO_NOT_SHOW_PREFIX}${key}${userSuffix}`;
};

// 检查是否应该显示某个提示 / Check if a toast should be shown
export const shouldShowToast = async (
  key: string,
  userId?: string | number
): Promise<boolean> => {
  const storageKey = getDoNotShowKey(key, userId);
  const value = await storageHub.getItem(storageKey);
  return value !== 'true';
};

// 设置"下次不再显示" / Set "do not show again"
export const setDoNotShowAgain = async (
  key: string,
  userId?: string | number,
  value: boolean = true
): Promise<void> => {
  const storageKey = getDoNotShowKey(key, userId);
  if (value) {
    await storageHub.setItem(storageKey, 'true');
  } else {
    await storageHub.removeItem(storageKey);
  }
};

// Toast状态 / Toast state
interface ToastState {
  toasts: Toast[];

  // 添加Toast / Add toast
  // 支持旧版API: addToast(message, type) 和 新版API: addToast(message, options)
  addToast: (message: string, options?: ToastOptions | ToastType) => Promise<void>;

  // 移除Toast / Remove toast
  removeToast: (id: string) => void;
  
  // 切换详情显示 / Toggle details visibility
  toggleDetails: (id: string) => void;
  
  // 设置"下次不再显示"勾选状态 / Set "do not show again" checked state
  setDoNotShowAgainChecked: (id: string, checked: boolean) => void;
  
  // 确认"下次不再显示"并关闭 / Confirm "do not show again" and close
  confirmDoNotShowAgain: (id: string) => Promise<void>;

  // 设置下次不再显示并关闭 / Set do not show again and close
  setDoNotShowAndClose: (id: string) => Promise<void>;

  // 检查并显示（带"下次不再显示"功能）/ Check and show (with "do not show again" feature)
  checkAndShow: (
    message: string,
    key: string,
    userId?: string | number,
    options?: Omit<ToastOptions, 'showDoNotShowAgain' | 'doNotShowAgainKey'>
  ) => Promise<void>;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: async (message: string, options?: ToastOptions) => {
    const {
      type = 'info',
      duration = 'normal',
      details,
      showDoNotShowAgain = false,
      doNotShowAgainKey,
      userId,
    } = options || {};

    const id = Math.random().toString(36).substring(2, 15);
    
    const toast: Toast = {
      id,
      message,
      type,
      duration,
      details,
      showDoNotShowAgain,
      doNotShowAgainKey,
      userId,
      showDetails: false,
      doNotShowAgainChecked: false,
      createdAt: Date.now(),
    };

    set((state) => ({ toasts: [...state.toasts, toast] }));

    // 如果不是持久化显示，设置自动关闭 / If not persistent, set auto-close
    if (duration !== 'persistent') {
      const timeout = DURATION_MAP[duration];
      setTimeout(() => {
        get().removeToast(id);
      }, timeout);
    }
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  toggleDetails: (id: string) => {
    set((state) => ({
      toasts: state.toasts.map((t) =>
        t.id === id ? { ...t, showDetails: !t.showDetails } : t
      ),
    }));
  },

  setDoNotShowAgainChecked: (id: string, checked: boolean) => {
    set((state) => ({
      toasts: state.toasts.map((t) =>
        t.id === id ? { ...t, doNotShowAgainChecked: checked } : t
      ),
    }));
  },

  confirmDoNotShowAgain: async (id: string) => {
    const toast = get().toasts.find((t) => t.id === id);
    if (toast && toast.doNotShowAgainKey && toast.doNotShowAgainChecked) {
      await setDoNotShowAgain(toast.doNotShowAgainKey, toast.userId, true);
    }
    get().removeToast(id);
  },

  // 设置下次不再显示并关闭 / Set do not show again and close
  setDoNotShowAndClose: async (id: string) => {
    const toast = get().toasts.find((t) => t.id === id);
    if (toast && toast.doNotShowAgainKey) {
      await setDoNotShowAgain(toast.doNotShowAgainKey, toast.userId, true);
    }
    get().removeToast(id);
  },

  checkAndShow: async (
    message: string,
    key: string,
    userId?: string | number,
    options?: Omit<ToastOptions, 'showDoNotShowAgain' | 'doNotShowAgainKey'>
  ) => {
    const shouldShow = await shouldShowToast(key, userId);
    if (shouldShow) {
      await get().addToast(message, {
        ...options,
        showDoNotShowAgain: true,
        doNotShowAgainKey: key,
        userId,
      });
    }
  },
}));

// 便捷的Toast API / Convenient toast API
export const toast = {
  // 普通提示 / Normal toast
  success: (msg: string, options?: Omit<ToastOptions, 'type'>) =>
    useToastStore.getState().addToast(msg, { ...options, type: 'success' }),
  error: (msg: string, options?: Omit<ToastOptions, 'type'>) =>
    useToastStore.getState().addToast(msg, { ...options, type: 'error' }),
  info: (msg: string, options?: Omit<ToastOptions, 'type'>) =>
    useToastStore.getState().addToast(msg, { ...options, type: 'info' }),
  warning: (msg: string, options?: Omit<ToastOptions, 'type'>) =>
    useToastStore.getState().addToast(msg, { ...options, type: 'warning' }),

  // 持久化提示（不会自动关闭）/ Persistent toast (won't auto-close)
  persistent: {
    success: (msg: string, options?: Omit<ToastOptions, 'type' | 'duration'>) =>
      useToastStore.getState().addToast(msg, { ...options, type: 'success', duration: 'persistent' }),
    error: (msg: string, options?: Omit<ToastOptions, 'type' | 'duration'>) =>
      useToastStore.getState().addToast(msg, { ...options, type: 'error', duration: 'persistent' }),
    info: (msg: string, options?: Omit<ToastOptions, 'type' | 'duration'>) =>
      useToastStore.getState().addToast(msg, { ...options, type: 'info', duration: 'persistent' }),
    warning: (msg: string, options?: Omit<ToastOptions, 'type' | 'duration'>) =>
      useToastStore.getState().addToast(msg, { ...options, type: 'warning', duration: 'persistent' }),
  },

  // 带详情的错误提示 / Error toast with details
  errorWithDetails: (
    message: string,
    details: string,
    options?: Omit<ToastOptions, 'type' | 'details'>
  ) =>
    useToastStore.getState().addToast(message, {
      ...options,
      type: 'error',
      details,
      duration: options?.duration || 'long',
    }),

  // 检查并显示（带"下次不再显示"）/ Check and show (with "do not show again")
  checkAndShow: async (
    message: string,
    key: string,
    userId?: string | number,
    options?: Omit<ToastOptions, 'showDoNotShowAgain' | 'doNotShowAgainKey'>
  ) => {
    await useToastStore.getState().checkAndShow(message, key, userId, options);
  },
};

// 用于清除"下次不再显示"的设置 / Clear "do not show again" settings
export const clearDoNotShowSettings = async (userId?: string | number): Promise<void> => {
  const allEntries = await storageHub.listAllEntries();
  const keysToRemove = allEntries
    .filter((entry) => entry.key.startsWith(DO_NOT_SHOW_PREFIX))
    .filter((entry) => {
      if (!userId) return true;
      return entry.key.endsWith(`_${userId}`);
    });
  
  await Promise.all(keysToRemove.map((entry) => storageHub.removeItem(entry.key)));
};

// 获取所有"下次不再显示"的设置 / Get all "do not show again" settings
export const getDoNotShowSettings = async (
  userId?: string | number
): Promise<{ key: string; value: boolean }[]> => {
  const allEntries = await storageHub.listAllEntries();
  const settings = allEntries
    .filter((entry) => entry.key.startsWith(DO_NOT_SHOW_PREFIX))
    .filter((entry) => {
      if (!userId) return true;
      return entry.key.endsWith(`_${userId}`);
    })
    .map((entry) => ({
      key: entry.key.replace(DO_NOT_SHOW_PREFIX, '').replace(/_\d+$/, ''),
      value: entry.value === 'true',
    }));
  
  return settings;
};
