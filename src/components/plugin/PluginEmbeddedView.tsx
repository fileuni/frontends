import React from 'react';
import { useNavigationStore } from '@/stores/navigation';

export const PluginEmbeddedView: React.FC = () => {
  const { params } = useNavigationStore();
  const pluginId = params['plugin_id'] ?? '';
  const pluginRoute = params['plugin_route'] ?? '';

  const src = React.useMemo(() => {
    if (!pluginId) return '';
    const suffix = pluginRoute ? pluginRoute.replace(/^\//, '') : '';
    return suffix
      ? `/api/v1/plugins/${encodeURIComponent(pluginId)}/ui/${suffix}`
      : `/api/v1/plugins/${encodeURIComponent(pluginId)}/ui`;
  }, [pluginId, pluginRoute]);

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
