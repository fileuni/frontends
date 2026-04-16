import { create } from 'zustand';

/**
 * Route parameters interface
 */
export interface RouteParams {
  mod?: string;
  page?: string;
  [key: string]: string | undefined;
}

const DEFAULT_PAGE_BY_MODULE: Record<string, string> = {
  public: 'index',
  user: 'welcome',
  admin: 'users',
  'file-manager': 'files',
};

function getDefaultPageForModule(mod?: string): string | undefined {
  if (!mod) return undefined;
  return DEFAULT_PAGE_BY_MODULE[mod];
}

interface NavigationState {
  params: RouteParams;
  /**
   * Update route parameters
   */
  setParams: (params: RouteParams) => void;
  /**
   * Parse parameters from current hash
   */
  syncFromHash: () => void;
  /**
   * Navigate to a new page
   */
  navigate: (params: Partial<RouteParams>) => void;
}

/**
 * Parse URL Hash parameters
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
 * Route state manager
 */
export const useNavigationStore = create<NavigationState>((set, get) => ({
  params: typeof window !== 'undefined' ? parseHash(window.location.hash) : {},

  setParams: (params) => set({ params }),

  syncFromHash: () => {
    set({ params: parseHash(window.location.hash) });
  },

  navigate: (newParams) => {
    const currentParams = get().params;
    const isModuleChange = typeof newParams.mod === 'string' && newParams.mod !== currentParams.mod;

    const mergedParams: RouteParams = isModuleChange
      ? (typeof newParams.mod === 'string' ? { mod: newParams.mod } : {})
      : { ...currentParams };

    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        delete mergedParams[key];
        return;
      }
      mergedParams[key] = value;
    });

    if (isModuleChange && mergedParams.page === undefined) {
      const defaultPage = getDefaultPageForModule(mergedParams.mod);
      if (defaultPage) {
        mergedParams.page = defaultPage;
      }
    }
    
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

// Listen for hashchange events
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    useNavigationStore.getState().syncFromHash();
  });
}
