import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { useToastStore } from '@/stores/toast';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/Button';
import { AdminCard, AdminPage, AdminPageHeader } from './admin-ui';
import { PlugZap, RefreshCw, Upload, Download, Play, Square, Trash2, Settings2, X } from 'lucide-react';

type MarketPlugin = {
  id: string;
  name: string;
  summary: string;
  author: string;
  latestVersion: string | null;
  runtimes: string[];
  downloadUrl: string | null;
};

type RegistryPlugin = {
  id: string;
  display_name: string;
  runtime_kind: string;
  source_kind: string;
  current_version: string | null;
  install_status: string;
  enabled: boolean;
};

type RuntimeHandle = {
  plugin_id: string;
  runtime_kind: string;
  status: string;
  detail: string;
};

type PluginStatus = {
  runtime: {
    enabled: boolean;
    temp_dir: string;
    host_api_base_url: string;
    layout: { packages_dir: string; config_dir: string };
  };
  stats: {
    plugin_count: number;
    version_count: number;
    audit_log_count: number;
  };
};

type PluginConfig = {
  plugin_id: string;
  config_dir: string;
  config_file: string;
  content: string;
};

const authHeaders = (token: string | undefined) => {
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
};

export const PluginAdmin: React.FC = () => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const token = useAuthStore((s) => s.currentUserData?.access_token);

  const [market, setMarket] = useState<MarketPlugin[]>([]);
  const [registry, setRegistry] = useState<RegistryPlugin[]>([]);
  const [runtimes, setRuntimes] = useState<RuntimeHandle[]>([]);
  const [status, setStatus] = useState<PluginStatus | null>(null);
  const [selectedPluginId, setSelectedPluginId] = useState<string>('');
  const [marketUrl, setMarketUrl] = useState('');
  const [configText, setConfigText] = useState('');
  const [configMeta, setConfigMeta] = useState<PluginConfig | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [marketInstalling, setMarketInstalling] = useState(false);
  const [loading, setLoading] = useState(true);

  const selectedRuntime = useMemo(
    () => runtimes.find((item) => item.plugin_id === selectedPluginId) ?? null,
    [runtimes, selectedPluginId],
  );

  const selectedPlugin = useMemo(
    () => registry.find((item) => item.id === selectedPluginId) ?? null,
    [registry, selectedPluginId],
  );

  const fetchJson = useCallback(async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(url, {
      ...init,
      headers: init?.headers ?? authHeaders(token),
    });
    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const json = (await response.json()) as { msg?: string; message?: string };
        message = json.msg || json.message || message;
      } catch {
        // ignore parse failure
      }
      throw new Error(message);
    }
    const json = (await response.json()) as { data: T };
    return json.data;
  }, [token]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [marketData, registryData, runtimeData, statusData] = await Promise.all([
        fetchJson<{ plugins?: MarketPlugin[] }>('/api/v1/admin/plugins/market/catalog').catch(() => ({ plugins: [] })),
        fetchJson<RegistryPlugin[]>('/api/v1/admin/plugins/registry'),
        fetchJson<{ runtimes: RuntimeHandle[] }>('/api/v1/admin/plugins/runtimes'),
        fetchJson<PluginStatus>('/api/v1/admin/plugins/status'),
      ]);
      setMarket(marketData.plugins ?? []);
      setRegistry(registryData);
      setRuntimes(runtimeData.runtimes ?? []);
      setStatus(statusData);
      if (selectedPluginId && !registryData.some((item) => item.id === selectedPluginId)) {
        setSelectedPluginId(registryData[0]?.id ?? '');
      } else if (!selectedPluginId && registryData[0]) {
        setSelectedPluginId(registryData[0].id);
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to load plugin data', 'error');
    } finally {
      setLoading(false);
    }
  }, [fetchJson, addToast, selectedPluginId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleInstallFromMarket = async () => {
    if (!marketUrl.trim()) return;
    setMarketInstalling(true);
    try {
      await fetchJson('/api/v1/admin/plugins/market/install', {
        method: 'POST',
        headers: (() => {
          const headers = authHeaders(token);
          headers.set('Content-Type', 'application/json');
          return headers;
        })(),
        body: JSON.stringify({ download_url: marketUrl.trim() }),
      });
      addToast('Plugin package installed from market URL', 'success');
      setMarketUrl('');
      await reload();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to install plugin', 'error');
    } finally {
      setMarketInstalling(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const response = await fetch('/api/v1/admin/plugins/install', {
        method: 'POST',
        headers: authHeaders(token),
        body: await file.arrayBuffer(),
      });
      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          const json = (await response.json()) as { msg?: string; message?: string };
          message = json.msg || json.message || message;
        } catch {
          // ignore parse failure
        }
        throw new Error(message);
      }
      addToast('Local plugin package installed', 'success');
      await reload();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to upload plugin package', 'error');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const mutatePlugin = async (pluginId: string, action: 'start' | 'stop' | 'uninstall') => {
    try {
      await fetchJson(`/api/v1/admin/plugins/${encodeURIComponent(pluginId)}/${action}`, {
        method: 'POST',
        headers: authHeaders(token),
      });
      addToast(`Plugin ${action} completed`, 'success');
      await reload();
    } catch (error) {
      addToast(error instanceof Error ? error.message : `Failed to ${action} plugin`, 'error');
    }
  };

  const loadConfig = useCallback(async (pluginId: string) => {
    try {
      const data = await fetchJson<PluginConfig>(`/api/v1/admin/plugins/${encodeURIComponent(pluginId)}/config`);
      setConfigMeta(data);
      setConfigText(data.content);
    } catch (error) {
      setConfigMeta(null);
      setConfigText('');
      addToast(error instanceof Error ? error.message : 'Failed to load plugin config', 'error');
    }
  }, [fetchJson, addToast]);

  const saveConfig = async () => {
    if (!selectedPluginId) return;
    try {
      const data = await fetchJson<PluginConfig>(`/api/v1/admin/plugins/${encodeURIComponent(selectedPluginId)}/config`, {
        method: 'POST',
        headers: (() => {
          const headers = authHeaders(token);
          headers.set('Content-Type', 'application/json');
          return headers;
        })(),
        body: JSON.stringify({ content: configText }),
      });
      setConfigMeta(data);
      setConfigText(data.content);
      addToast('Plugin config saved', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to save plugin config', 'error');
    }
  };

  useEffect(() => {
    if (selectedPluginId) {
      void loadConfig(selectedPluginId);
    }
  }, [selectedPluginId, loadConfig]);

  return (
    <AdminPage>
      <AdminPageHeader
        icon={<PlugZap size={24} />}
        title={t('common.plugins', { defaultValue: 'Plugins' })}
        subtitle={'Plugin market, installation, runtime, and package management'}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
        <AdminCard variant="glass" className="p-6 rounded-[2rem] space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">Plugin Market</h2>
            <Button variant="ghost" size="sm" onClick={() => void reload()}>
              <RefreshCw size={16} className="mr-2" /> Refresh
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <input
              value={marketUrl}
              onChange={(e) => setMarketUrl(e.target.value)}
              placeholder="Paste a .zip.fupkg market download URL"
              className="min-h-11 rounded-xl border border-border bg-background px-4"
            />
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void handleInstallFromMarket()} disabled={marketInstalling || !marketUrl.trim()}>
                <Download size={16} className="mr-2" /> Install from URL
              </Button>
              <label className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-white font-bold cursor-pointer">
                <Upload size={16} className="mr-2" /> {uploading ? 'Uploading…' : 'Upload .zip.fupkg'}
                <input type="file" accept=".fupkg,.zip.fupkg" className="hidden" onChange={(e) => void handleUpload(e)} />
              </label>
            </div>
          </div>

          <div className="space-y-3">
            {market.length === 0 ? (
              <div className="text-sm opacity-60">No market plugins loaded yet.</div>
            ) : market.map((plugin) => (
              <div key={plugin.id} className="rounded-2xl border border-border bg-background/60 p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-black">{plugin.name}</div>
                    <div className="text-xs opacity-60">{plugin.id} · {plugin.author}</div>
                  </div>
                  <div className="text-xs font-bold opacity-70">{plugin.latestVersion ?? 'n/a'}</div>
                </div>
                <div className="text-sm opacity-70">{plugin.summary}</div>
                <div className="text-xs opacity-50">{plugin.runtimes.join(', ')}</div>
                {plugin.downloadUrl ? (
                  <Button size="sm" onClick={() => { setMarketUrl(plugin.downloadUrl ?? ''); }}>
                    Use download URL
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard variant="glass" className="p-6 rounded-[2rem] space-y-4">
          <h2 className="text-lg font-black">Plugin Runtime Status</h2>
          {status ? (
            <div className="space-y-2 text-sm">
              <div>Enabled: <strong>{String(status.runtime.enabled)}</strong></div>
              <div>Plugin count: <strong>{status.stats.plugin_count}</strong></div>
              <div>Package dir: <code>{status.runtime.layout.packages_dir}</code></div>
              <div>Config dir: <code>{status.runtime.layout.config_dir}</code></div>
              <div>Host API: <code>{status.runtime.host_api_base_url}</code></div>
            </div>
          ) : (
            <div className="text-sm opacity-60">Loading runtime status…</div>
          )}
        </AdminCard>
      </div>

      <AdminCard variant="glass" className="p-6 rounded-[2rem] space-y-4">
        <h2 className="text-lg font-black">Installed Plugins</h2>
        {loading ? (
          <div className="text-sm opacity-60">Loading plugins…</div>
        ) : registry.length === 0 ? (
          <div className="text-sm opacity-60">No installed plugins.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
            <div className="space-y-3">
              {registry.map((plugin) => (
                <button
                  key={plugin.id}
                  type="button"
                  onClick={() => setSelectedPluginId(plugin.id)}
                  className={`w-full rounded-2xl border p-4 text-left ${selectedPluginId === plugin.id ? 'border-primary bg-primary/10' : 'border-border bg-background/50'}`}
                >
                  <div className="font-black">{plugin.display_name}</div>
                  <div className="text-xs opacity-60">{plugin.id}</div>
                  <div className="mt-2 text-sm opacity-70">{plugin.runtime_kind} · {plugin.install_status}</div>
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-border bg-background/50 p-4 space-y-4">
              {selectedPluginId ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-black">{selectedPluginId}</div>
                      <div className="text-xs opacity-60">Runtime: {selectedRuntime?.runtime_kind ?? 'stopped'}</div>
                    </div>
                    <div className="text-xs opacity-60">{selectedRuntime?.status ?? 'inactive'}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => void mutatePlugin(selectedPluginId, 'start')} disabled={!selectedPlugin || !!selectedRuntime || selectedPlugin.install_status !== 'installed'}>
                      <Play size={16} className="mr-2" /> Start
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void mutatePlugin(selectedPluginId, 'stop')} disabled={!selectedRuntime}>
                      <Square size={16} className="mr-2" /> Stop
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setConfigModalOpen(true)} disabled={!selectedPlugin}>
                      <Settings2 size={16} className="mr-2" /> Settings
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => void mutatePlugin(selectedPluginId, 'uninstall')} disabled={!selectedPlugin || !!selectedRuntime}>
                      <Trash2 size={16} className="mr-2" /> Uninstall
                    </Button>
                  </div>
                  <PluginInspector pluginId={selectedPluginId} {...(token ? { token } : {})} />
                </>
              ) : (
                <div className="text-sm opacity-60">Select an installed plugin to inspect it.</div>
              )}
            </div>
          </div>
        )}
      </AdminCard>

      {configModalOpen && selectedPluginId ? (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl rounded-[2rem] border border-border bg-background shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Plugin Settings</h2>
                <div className="text-xs opacity-60">{configMeta?.config_file ?? 'Loading config path…'}</div>
              </div>
              <button
                type="button"
                onClick={() => setConfigModalOpen(false)}
                className="rounded-xl border border-border p-2 hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>
            <textarea
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              className="min-h-[24rem] w-full rounded-2xl border border-border bg-background p-4 font-mono text-sm"
              spellCheck={false}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfigModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void saveConfig()}>
                Save config
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPage>
  );
};

const PluginInspector: React.FC<{ pluginId: string; token?: string }> = ({ pluginId, token }) => {
  const [permissions, setPermissions] = useState<unknown[]>([]);
  const [tasks, setTasks] = useState<unknown[]>([]);
  const [navItems, setNavItems] = useState<unknown[]>([]);

  useEffect(() => {
    let cancelled = false;
    const headers = authHeaders(token);
    void Promise.all([
      fetch(`/api/v1/admin/plugins/${encodeURIComponent(pluginId)}/permissions`, { headers }).then((r) => r.json()),
      fetch(`/api/v1/admin/plugins/${encodeURIComponent(pluginId)}/tasks`, { headers }).then((r) => r.json()),
      fetch(`/api/v1/admin/plugins/${encodeURIComponent(pluginId)}/nav-items`, { headers }).then((r) => r.json()),
    ]).then(([permissionsJson, tasksJson, navJson]) => {
      if (cancelled) return;
      setPermissions(permissionsJson.data ?? []);
      setTasks(tasksJson.data?.tasks ?? []);
      setNavItems(navJson.data?.items ?? []);
    }).catch(() => {
      if (cancelled) return;
      setPermissions([]);
      setTasks([]);
      setNavItems([]);
    });
    return () => { cancelled = true; };
  }, [pluginId, token]);

  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="font-black mb-2">Permissions</div>
        <pre className="rounded-xl bg-muted p-3 overflow-auto text-xs">{JSON.stringify(permissions, null, 2)}</pre>
      </div>
      <div>
        <div className="font-black mb-2">Tasks</div>
        <pre className="rounded-xl bg-muted p-3 overflow-auto text-xs">{JSON.stringify(tasks, null, 2)}</pre>
      </div>
      <div>
        <div className="font-black mb-2">Navigation</div>
        <pre className="rounded-xl bg-muted p-3 overflow-auto text-xs">{JSON.stringify(navItems, null, 2)}</pre>
      </div>
    </div>
  );
};
