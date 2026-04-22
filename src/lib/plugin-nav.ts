import { useAuthStore } from '@/stores/auth';

export const CHAT_PLUGIN_ID = 'com.fileuni.chat';

export interface PluginNavItem {
  plugin_id: string;
  item_key: string;
  label: string;
  route: string;
  icon: string;
  visibility: string;
  group_key?: string | null;
  position?: string | null;
  required_permission?: string | null;
  sort_order: number;
}

interface PluginNavListResponse {
  items: PluginNavItem[];
}

export async function fetchPluginNavItems(): Promise<PluginNavItem[]> {
  const token = useAuthStore.getState().currentUserData?.access_token;
  if (!token) {
    return [];
  }
  const init: RequestInit = {
    credentials: 'same-origin',
  };
  init.headers = {
    Authorization: `Bearer ${token}`,
  };
  const response = await fetch('/api/v1/plugin-host/nav/list', {
    ...init,
  });
  if (!response.ok) {
    throw new Error(`plugin nav request failed with status ${response.status}`);
  }
  const json = (await response.json()) as { data?: PluginNavListResponse };
  const data = json.data ?? { items: [] };
  return data.items ?? [];
}

export function isChatPluginNavItem(item: Pick<PluginNavItem, 'plugin_id'>): boolean {
  return item.plugin_id === CHAT_PLUGIN_ID;
}

export function buildPluginViewHash(
  pluginId: string,
  pluginRoute: string,
  params?: Record<string, string | number | boolean>,
): string {
  const searchParams = new URLSearchParams({
    mod: 'plugin',
    page: 'view',
    plugin_id: pluginId,
    plugin_route: pluginRoute.trim() || '/',
  });

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      searchParams.set(key, String(value));
    }
  }

  return `#${searchParams.toString()}`;
}

export function normalizePluginRoute(route: string): string {
  const trimmed = route.trim();
  if (trimmed.startsWith('#')) {
    return trimmed;
  }
  if (trimmed.startsWith('mod=')) {
    return `#${trimmed}`;
  }
  if (trimmed.startsWith('/')) {
    return `#mod=plugin&page=view&plugin_route=${encodeURIComponent(trimmed)}`;
  }
  return `#${trimmed}`;
}
