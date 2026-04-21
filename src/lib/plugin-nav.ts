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
  const response = await fetch('/api/v1/plugin-host/nav/list', {
    credentials: 'same-origin',
  });
  if (!response.ok) {
    throw new Error(`plugin nav request failed with status ${response.status}`);
  }
  const json = (await response.json()) as { data?: PluginNavListResponse };
  const data = json.data ?? { items: [] };
  return data.items ?? [];
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
