import React from 'react';
import { useNavigationStore } from '@/stores/navigation';

const CORE_PLUGIN_PARAMS = new Set(['mod', 'page', 'plugin_id', 'plugin_route']);

export const PluginEmbeddedView: React.FC = () => {
  const { params } = useNavigationStore();
  const pluginId = params['plugin_id'] ?? '';
  const pluginRoute = params['plugin_route'] ?? '';

  const src = React.useMemo(() => {
    if (!pluginId) return '';
    const [rawRoutePath, rawRouteQuery = ''] = pluginRoute.split('?', 2);
    const suffix = rawRoutePath ? rawRoutePath.replace(/^\//, '') : '';
    const query = new URLSearchParams(rawRouteQuery);

    for (const [key, value] of Object.entries(params)) {
      if (!value || CORE_PLUGIN_PARAMS.has(key)) {
        continue;
      }
      query.set(key, value);
    }

    const base = suffix
      ? `/api/v1/plugins/${encodeURIComponent(pluginId)}/ui/${suffix}`
      : `/api/v1/plugins/${encodeURIComponent(pluginId)}/ui`;
    const queryString = query.toString();
    return queryString ? `${base}?${queryString}` : base;
  }, [params, pluginId, pluginRoute]);

  if (!pluginId) {
    return <div className="p-8 text-sm text-muted-foreground">Plugin ID is missing.</div>;
  }

  return (
    <iframe
      title={`plugin-${pluginId}`}
      src={src}
      className="w-full min-h-[calc(100vh-8rem)] border-0 rounded-2xl bg-background"
      sandbox="allow-same-origin allow-scripts allow-forms allow-downloads allow-popups"
    />
  );
};
