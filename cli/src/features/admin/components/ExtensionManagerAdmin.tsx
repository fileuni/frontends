import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button.tsx';
import { handleApiError } from '@/lib/api.ts';
import { useAuthStore } from '@/stores/auth.ts';
import { useConfigStore } from '@/stores/config.ts';
import { useToastStore } from '@fileuni/shared';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '@/stores/navigation.ts';
import { storageHub } from '@fileuni/shared';
import { ToolPanel } from './extensions/ToolPanel.tsx';
import {
  fetchServicesApi,
  fetchToolsApi,
  installToolApi,
  resetOpenlistAdminApi,
  serviceActionApi,
} from './extensions/api.ts';
import type { InstallBody } from './extensions/types.ts';

type ToolState = {
  version: string;
  downloadUrl: string;
  binPath: string;
  template: string;
  proxy: string;
  // Extra fields
  dataPath?: string;
  rcloneConfigPath?: string;
  rcloneMountCommand?: string;
  rcloneUnmountCommand?: string;
};

export const ExtensionManagerAdmin = () => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const { params, navigate } = useNavigationStore();
  const { currentUserData } = useAuthStore();
  const { capabilities, fetchCapabilities } = useConfigStore();

  const [tools, setTools] = useState<{ name: string; installed: boolean }[]>([]);
  const [serviceStatus, setServiceStatus] = useState<Record<string, { follow_start: boolean; running: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [toolStates, setToolStates] = useState<Record<string, ToolState>>({});

  const [homepages, setHomepages] = useState<Record<string, string>>({});
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [toolAliases, setToolAliases] = useState<Record<string, any>>({});
  const [toolExecutableNames, setToolExecutableNames] = useState<Record<string, string>>({});

  const extPage = params.ext || 'openlist';
  const extItems = useMemo(() => tools.map(t => ({ key: t.name, label: t.name.charAt(0).toUpperCase() + t.name.slice(1) })), [tools]);

  const updateToolState = (tool: string, patch: Partial<ToolState>) => {
    setToolStates(prev => ({
      ...prev,
      [tool]: { ...prev[tool], ...patch }
    }));
  };

  const fetchTools = async () => {
    const data = await fetchToolsApi();
    if (data) {
      setTools(data.map(t => ({ name: t.name, installed: t.installed })));
    }
  };

  const fetchServices = async () => {
    const data = await fetchServicesApi();
    if (data) {
      const next: Record<string, { follow_start: boolean; running: boolean }> = {};
      for (const item of data) {
        next[item.tool] = { follow_start: item.follow_start, running: item.running };
      }
      setServiceStatus(next);
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        await Promise.all([fetchTools(), fetchServices()]);
      } catch (error) {
        addToast(handleApiError(error, t), 'error');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [addToast, t]);

  useEffect(() => {
    if (!params.ext && tools.length > 0) {
      navigate({ mod: 'admin', page: 'extensions', ext: tools[0].name });
    }
  }, [params.ext, navigate, tools]);

  useEffect(() => {
    fetchCapabilities();
  }, [fetchCapabilities]);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL || '/';
        const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        const response = await fetch(`${normalizedBaseUrl}assets/extension-catalog.json`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`catalog http status ${response.status}`);
        
        const raw = await response.json();
        const installDir = raw.install_dir || './data/extensions/bin';
        const lang = (typeof document !== 'undefined' ? document.documentElement.lang : 'zh').startsWith('en') ? 'en' : 'zh';

        const newHomepages: Record<string, string> = {};
        const newDescriptions: Record<string, string> = {};
        const newExecNames: Record<string, string> = {};
        const initialStates: Record<string, ToolState> = {};

        Object.entries(raw.tools || {}).forEach(([name, tool]: [string, any]) => {
          newHomepages[name] = tool.homepage || '';
          newDescriptions[name] = lang === 'en' ? (tool.description_en || '') : (tool.description_zh || '');
          newExecNames[name] = tool.executable_name || name;
          
          initialStates[name] = {
            version: tool.default_version || '',
            template: tool.download_url_template || '',
            proxy: tool.github_base_url || '',
            binPath: installDir,
            downloadUrl: '',
          };

          if (name === 'openlist') initialStates[name].dataPath = './data/extensions/state/openlist/data';
          if (name === 'rclone') {
            initialStates[name].rcloneConfigPath = './data/extensions/state/rclone/rclone.conf';
            initialStates[name].rcloneMountCommand = '${BinPath} mount remote: /mnt/remote ${ConfigFilePath}';
            initialStates[name].rcloneUnmountCommand = 'fusermount -u /mnt/remote';
          }
        });

        setHomepages(newHomepages);
        setDescriptions(newDescriptions);
        setToolExecutableNames(newExecNames);
        setToolAliases(raw.tools || {});
        setToolStates(prev => {
          const merged = { ...initialStates };
          Object.keys(prev).forEach(k => { if(prev[k]) merged[k] = { ...merged[k], ...prev[k] }; });
          return merged;
        });
        setCatalogLoaded(true);
      } catch (_error) {
        addToast(t('admin.extensions.catalogLoadFailed'), 'error');
      }
    };
    loadCatalog();
  }, [addToast, t]);

  useEffect(() => {
    const userId = currentUserData?.user.id;
    if (!userId) return;
    const key = `ext-ui-overrides:${userId}`;
    try {
      const raw = storageHub.getLocalItem(key);
      if (!raw) return;
      const v = JSON.parse(raw);
      setToolStates(prev => {
        const next = { ...prev };
        Object.keys(v).forEach(tool => {
          next[tool] = { ...next[tool], ...v[tool] };
        });
        return next;
      });
    } catch (_e) {}
  }, [currentUserData?.user.id]);

  useEffect(() => {
    const userId = currentUserData?.user.id;
    if (!userId) return;
    const key = `ext-ui-overrides:${userId}`;
    storageHub.setLocalItem(key, JSON.stringify(toolStates));
  }, [currentUserData?.user.id, toolStates]);

  const controlService = async (tool: string, action: 'start' | 'stop' | 'restart') => {
    try {
      await serviceActionApi(tool, action);
      await fetchServices();
      addToast(t('admin.extensions.serviceActionSuccess'), 'success');
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const detectClientPlatform = () => {
    if (capabilities?.runtime_os && capabilities?.runtime_arch) {
      return { os: capabilities.runtime_os, arch: capabilities.runtime_arch };
    }
    const ua = navigator.userAgent.toLowerCase();
    const os = ua.includes('windows') ? 'windows' : ua.includes('mac os') ? 'darwin' : 'linux';
    const arch = ua.includes('aarch64') || ua.includes('arm64') || ua.includes('arm') ? 'aarch64' : 'x86_64';
    return { os, arch };
  };

  const buildDownloadUrl = (tool: string, template: string, version: string, proxy?: string) => {
    const { os, arch } = detectClientPlatform();
    const alias = toolAliases[tool] || {};
    const osAlias = os === 'windows' ? (alias.os_alias_windows || os) : os === 'darwin' ? (alias.os_alias_macos || os) : (alias.os_alias_linux || os);
    const archAlias = arch === 'aarch64' ? (alias.arch_alias_arm64 || arch) : (alias.arch_alias_amd64 || arch);
    let url = template
      .replaceAll('{version}', version).replaceAll('{ver}', version)
      .replaceAll('{raw_os}', os).replaceAll('{raw_arch}', arch)
      .replaceAll('{os_alias}', osAlias).replaceAll('{arch_alias}', archAlias)
      .replaceAll('{os}', osAlias).replaceAll('{arch}', archAlias);
    if ((url.startsWith('http://') || url.startsWith('https://')) && proxy?.trim()) {
      url = `${proxy.trim().replace(/\/+$/, '')}/${url}`;
    }
    return url;
  };

  const installToolQuick = async (tool: string) => {
    const state = toolStates[tool];
    if (!state) return;
    try {
      const execName = toolExecutableNames[tool] || tool;
      const safeBinPath = state.binPath.trim().replace(/\/+$/, '');
      const finalBinPath = (safeBinPath.endsWith(`/${execName}`) || safeBinPath.endsWith(`\\${execName}`)) 
        ? safeBinPath.slice(0, safeBinPath.length - execName.length - 1) 
        : safeBinPath;

      const body: InstallBody = { version: state.version, bin_path: finalBinPath };
      body.download_link = state.downloadUrl.trim() || buildDownloadUrl(tool, state.template, state.version, state.proxy);
      
      if (!body.download_link) {
        addToast(t('admin.extensions.downloadUrlMissing'), 'error');
        return;
      }
      await installToolApi(tool, body);
      addToast(`${tool} downloaded successfully`, 'success');
      await fetchTools();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  if (loading) return <div className="py-10 text-sm font-semibold opacity-70">{t('admin.extensions.loading')}</div>;

  const currentState = toolStates[extPage] || { version: '', downloadUrl: '', binPath: '', template: '', proxy: '' };

  const getExtraFields = (tool: string) => {
    if (tool === 'openlist') return [{ label: t('admin.extensions.openlist.dataPathLabel', 'Data Path'), value: currentState.dataPath || '', onChange: (v: string) => updateToolState(tool, { dataPath: v }), placeholder: './data/extensions/state/openlist/data' }];
    if (tool === 'rclone') return [
      { label: t('admin.extensions.rclone.configPathLabel', 'Config Path'), value: currentState.rcloneConfigPath || '', onChange: (v: string) => updateToolState(tool, { rcloneConfigPath: v }), placeholder: './data/extensions/state/rclone/rclone.conf' },
      { label: t('admin.extensions.rclone.mountCommandLabel', 'Mount Command'), value: currentState.rcloneMountCommand || '', onChange: (v: string) => updateToolState(tool, { rcloneMountCommand: v }), isTextArea: true },
      { label: t('admin.extensions.rclone.unmountCommandLabel', 'Unmount Command'), value: currentState.rcloneUnmountCommand || '', onChange: (v: string) => updateToolState(tool, { rcloneUnmountCommand: v }), isTextArea: true },
    ];
    return [];
  };

  const getExtraActions = (tool: string) => {
    if (tool === 'openlist') return [{ label: t('admin.extensions.openlist.resetAdmin'), onClick: async () => { const res = await resetOpenlistAdminApi(currentState.dataPath || ''); return res?.stdout || res?.stderr || ''; }, showOutputInModal: true }];
    if (tool === 'rclone') return [{
      label: t('admin.extensions.rclone.copyMount'),
      onClick: () => {
        const text = (currentState.rcloneMountCommand || '').replaceAll('${BinPath}', currentState.binPath).replaceAll('${ConfigFilePath}', `--config=${currentState.rcloneConfigPath}`);
        navigator.clipboard.writeText(text);
        addToast('rclone mount command copied', 'success');
      }
    }];
    return [];
  };

  return (
    <div className="space-y-6 min-h-[calc(100vh-10rem)] px-4 md:px-6 lg:px-8 py-4 md:py-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <h3 className="text-lg font-black">{t('admin.extensions.title')}</h3>
        <div className="flex flex-wrap gap-2">
          {extItems.map((item) => (
            <Button key={item.key} size="sm" variant={extPage === item.key ? 'primary' : 'outline'} onClick={() => navigate({ mod: 'admin', page: 'extensions', ext: item.key })}>
              {item.label}
            </Button>
          ))}
        </div>
        <div className="text-sm opacity-70">
          {t('admin.extensions.runtimeHint', { os: capabilities?.runtime_os || 'linux', arch: capabilities?.runtime_arch || 'x86_64', bits: capabilities?.runtime_bits || 64 })}
        </div>
        {!catalogLoaded && <div className="text-sm opacity-70">{t('admin.extensions.catalogLoading')}</div>}
      </div>

      <ToolPanel
        tool={extPage}
        homepage={homepages[extPage] || ''}
        description={descriptions[extPage] || ''}
        followStart={serviceStatus[extPage]?.follow_start}
        version={currentState.version}
        setVersion={(v) => updateToolState(extPage, { version: v })}
        binPath={currentState.binPath}
        setBinPath={(v) => updateToolState(extPage, { binPath: v })}
        template={currentState.template}
        setTemplate={(v) => updateToolState(extPage, { template: v })}
        proxy={currentState.proxy}
        setProxy={(v) => updateToolState(extPage, { proxy: v })}
        downloadUrl={currentState.downloadUrl}
        setDownloadUrl={(v) => updateToolState(extPage, { downloadUrl: v })}
        extraFields={getExtraFields(extPage)}
        extraActions={getExtraActions(extPage)}
        onDownload={() => installToolQuick(extPage)}
        onStartService={() => controlService(extPage, 'start')}
        onStopService={() => controlService(extPage, 'stop')}
        onRestart={() => controlService(extPage, 'restart')}
      />
    </div>
  );
};
