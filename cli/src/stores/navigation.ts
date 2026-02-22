import { create } from 'zustand';

/**
 * 路由参数接口 / Route parameters interface
 */
export interface RouteParams {
  mod?: string;
  page?: string;
  [key: string]: string | undefined;
}

interface NavigationState {
  params: RouteParams;
  /**
   * 更新路由参数 / Update route parameters
   */
  setParams: (params: RouteParams) => void;
  /**
   * 从当前 Hash 解析参数 / Parse parameters from current hash
   */
  syncFromHash: () => void;
  /**
   * 导航到新页面 / Navigate to a new page
   */
  navigate: (params: Partial<RouteParams>) => void;
}

/**
 * 解析 URL Hash 参数 / Parse URL Hash parameters
 */
function parseHash(hash: string): RouteParams {
  const params: RouteParams = {};
  const hashContent = hash.startsWith('#') ? hash.substring(1) : hash;
  if (!hashContent) return params;

  const searchParams = new URLSearchParams(hashContent);
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

/**
 * 路由状态管理器 / Route state manager
 */
export const useNavigationStore = create<NavigationState>((set, get) => ({
  params: typeof window !== 'undefined' ? parseHash(window.location.hash) : {},

  setParams: (params) => set({ params }),

  syncFromHash: () => {
    set({ params: parseHash(window.location.hash) });
  },

  navigate: (newParams) => {
    const currentParams = get().params;
    const mergedParams = { ...currentParams, ...newParams };
    
    const searchParams = new URLSearchParams();
    Object.entries(mergedParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value);
      }
    });

    const newHash = '#' + searchParams.toString();
    if (window.location.hash !== newHash) {
      window.location.hash = newHash;
    }
  }
}));

// 监听 hashchange 事件 / Listen for hashchange events
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    useNavigationStore.getState().syncFromHash();
  });
}
