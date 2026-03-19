import { useEffect, useMemo, useState } from 'react';
import { handleApiError } from '@/lib/api.ts';
import { useAuthStore } from '@/stores/auth.ts';
import { useConfigStore } from '@/stores/config.ts';
import { useToastStore } from '@fileuni/shared';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '@/stores/navigation.ts';
import { ToolPanel } from './extensions/ToolPanel.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { Puzzle, Cpu } from 'lucide-react';
import { AdminHero, AdminLoadingState, AdminPage } from './admin-ui';
import { ExtensionsTabBar } from './extensions/components/ExtensionsTabBar';
import { buildExtensionTabItems } from './extensions/tabItems';
import { persistToolStateMap, restoreToolStateMap, type ToolState } from './extensions/uiState';
import {
  fetchLatestToolInfoApi,
  fetchServicesApi,
  fetchToolsApi,
  installToolApi,
  deleteToolApi,
  resetOpenlistAdminApi,
  serviceActionApi,
} from './extensions/api.ts';

import type { InstallBody, ToolInfo, ToolKind } from './extensions/types.ts';

export const ExtensionManagerAdmin = () => {
  const { t, i18n } = useTranslation();
  const { addToast } = useToastStore();
  const { params, navigate } = useNavigationStore();
  const { currentUserData } = useAuthStore();
  const { capabilities, fetchCapabilities } = useConfigStore();

  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [serviceStatus, setServiceStatus] = useState<Record<string, { follow_start: boolean; running: boolean; pid?: number | null; kind: ToolKind }>>({});
  const [loading, setLoading] = useState(true);
  const [toolStates, setToolStates] = useState<Record<string, ToolState>>({});
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);

  const extPage = params.ext || 'openlist';
  
  const currentTool = useMemo(() => tools.find(t => t.name === extPage), [tools, extPage]);
  const extItems = useMemo(() => {
    return buildExtensionTabItems(tools);
  }, [tools]);

  const updateToolState = (tool: string, patch: Partial<ToolState>) => {
    setToolStates(prev => ({
      ...prev,
      [tool]: { ...prev[tool], ...patch }
    }));
  };

  const fetchTools = async () => {
    const data = await fetchToolsApi();
    if (data) setTools(data);
  };

  const fetchServices = async () => {
    const data = await fetchServicesApi();
    if (data) {
      const next: Record<string, { follow_start: boolean; running: boolean; pid?: number | null; kind: ToolKind }> = {};
      for (const item of data) {
        next[item.tool] = { follow_start: item.follow_start, running: item.running, pid: item.pid, kind: item.kind };
      }
      setServiceStatus(next);
    }
  };

  const fetchLatestInfo = async () => {
    setIsFetchingInfo(true);
    try {
      const info = await fetchLatestToolInfoApi(extPage);
      if (info) {
        updateToolState(extPage, {
          version: info.version,
          downloadUrl: info.download_url,
        });
        addToast(t('admin.extensions.fetchLatestSuccess'), 'success');
      }
    } catch (e) {
      addToast(handleApiError(e, t), 'error');
    } finally {
      setIsFetchingInfo(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        await Promise.all([fetchTools(), fetchServices(), fetchCapabilities()]);
      } catch (error) {
        addToast(handleApiError(error, t), 'error');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [addToast, t, fetchCapabilities]);

  useEffect(() => {
    if (!params.ext && extItems.length > 0) {
      navigate({ mod: 'admin', page: 'extensions', ext: extItems[0].key });
    }
  }, [params.ext, navigate, extItems]);

  // Persistence for user-defined settings (EXCLUDE version and downloadUrl)
  useEffect(() => {
    const userId = currentUserData?.user.id;
    if (!userId) return;
    setToolStates((prev) => restoreToolStateMap(userId, prev));
  }, [currentUserData?.user.id]);

  useEffect(() => {
    const userId = currentUserData?.user.id;
    if (!userId) return;
    persistToolStateMap(userId, toolStates);
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

  const installToolQuick = async (tool: string) => {
    const state = toolStates[tool];
    if (!state) return;
    try {
      const body: InstallBody = { 
        version: state.version, 
        download_link: state.downloadUrl,
        github_proxy: state.proxy,
        target_bin_dir: state.binPath
      };
      if (!body.download_link) {
        addToast(t('admin.extensions.downloadUrlMissing'), 'error');
        return;
      }
      await installToolApi(tool, body);
      addToast(t('admin.extensions.downloadSuccess', { tool }), 'success');
      await fetchTools();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const deleteToolQuick = async (tool: string) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    try {
      await deleteToolApi(tool);
      addToast(t('common.success'), 'success');
      await fetchTools();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };


  if (loading) {
    return (
      <AdminPage withBottomPadding={false} className="pb-10 sm:pb-20">
        <AdminLoadingState label={t('admin.extensions.loading')} />
      </AdminPage>
    );
  }

  const currentState = toolStates[extPage] || { version: '', downloadUrl: '', binPath: '', proxy: '' };
  const lang = i18n.language.startsWith('en') ? 'en' : 'zh';
  const description = currentTool ? (lang === 'en' ? currentTool.description_en : currentTool.description_zh) : '';

  return (
    <AdminPage withBottomPadding={false} className="space-y-4 sm:space-y-6 pb-10 sm:pb-20">
      <AdminHero
        icon={<Puzzle size={18} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />}
        iconClassName="bg-primary/20 text-primary"
        title={t('admin.extensions.title')}
        subtitle={t('admin.extensions.subtitle') || 'Extension & Plugin Infrastructure'}
        className="rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5 md:p-6 shadow-sm"
        actions={
          <Badge
            variant="outline"
            className="h-8 sm:h-9 md:h-10 px-3 sm:px-4 rounded-xl sm:rounded-2xl border-white/10 bg-white/5 opacity-60 flex gap-2 sm:gap-3 items-center backdrop-blur-md self-start sm:self-auto whitespace-nowrap"
          >
            <Cpu size={14} className="opacity-40 sm:w-4 sm:h-4" />
            <span className="font-mono text-xs sm:text-sm uppercase font-black tracking-widest">
              {capabilities?.runtime_os || 'linux'} / {capabilities?.runtime_arch || 'x86_64'}
            </span>
          </Badge>
        }
      />

      <ExtensionsTabBar
        items={extItems}
        activeKey={extPage}
        onSelect={(key) => navigate({ mod: 'admin', page: 'extensions', ext: key })}
      />

      <ToolPanel
        tool={extPage}
        kind={currentTool?.kind || 'service'}
        installed={currentTool?.installed || false}
        executablePath={currentTool?.executable_path}
        installDir={currentTool?.install_dir}
        binPathConfig={currentTool?.bin_path}
        homepage={currentTool?.homepage || ''}
        description={description}
        followStart={serviceStatus[extPage]?.follow_start}
        running={serviceStatus[extPage]?.running}
        pid={serviceStatus[extPage]?.pid}
        loading={isFetchingInfo}
        version={currentState.version}
        setVersion={(v) => updateToolState(extPage, { version: v })}
        binPath={currentState.binPath || currentTool?.bin_path || ''}
        setBinPath={(v) => updateToolState(extPage, { binPath: v })}
        proxy={currentState.proxy}
        setProxy={(v) => updateToolState(extPage, { proxy: v })}
        downloadUrl={currentState.downloadUrl}
        setDownloadUrl={(v) => updateToolState(extPage, { downloadUrl: v })}
        extraFields={[
          ...(extPage === 'openlist' ? [{ label: t('admin.extensions.openlist.dataPathLabel'), value: currentState.dataPath || './data/extensions/state/openlist/data', onChange: (v: string) => updateToolState(extPage, { dataPath: v }), placeholder: './data/extensions/state/openlist/data' }] : []),
          ...(extPage === 'rclone' ? [
            { label: t('admin.extensions.rclone.configPathLabel'), value: currentState.rcloneConfigPath || './data/extensions/state/rclone/rclone.conf', onChange: (v: string) => updateToolState(extPage, { rcloneConfigPath: v }), placeholder: './data/extensions/state/rclone/rclone.conf' },
            { label: t('admin.extensions.rclone.mountCommandLabel'), value: currentState.rcloneMountCommand || '${BinPath} mount remote: /mnt/remote --config=${ConfigFilePath}', onChange: (v: string) => updateToolState(extPage, { rcloneMountCommand: v }), isTextArea: true },
            { label: t('admin.extensions.rclone.unmountCommandLabel'), value: currentState.rcloneUnmountCommand || 'fusermount -u /mnt/remote', onChange: (v: string) => updateToolState(extPage, { rcloneUnmountCommand: v }), isTextArea: true },
          ] : [])
        ]}
        extraActions={[
          ...(extPage === 'openlist' ? [{ label: t('admin.extensions.openlist.resetAdmin'), onClick: async () => { const res = await resetOpenlistAdminApi(currentState.dataPath || './data/extensions/state/openlist/data'); return res?.stdout || res?.stderr || ''; }, showOutputInModal: true }] : []),
          ...(extPage === 'rclone' ? [{
            label: t('admin.extensions.rclone.copyMount'),
            onClick: () => {
              const binPath = currentTool?.executable_path || 'rclone';
              const configPath = currentState.rcloneConfigPath || './data/extensions/state/rclone/rclone.conf';
              const text = (currentState.rcloneMountCommand || '').replaceAll('${BinPath}', binPath).replaceAll('${ConfigFilePath}', configPath);
              navigator.clipboard.writeText(text);
              addToast(t('admin.extensions.rclone.copyMountSuccess'), 'success');
            }
          }] : [])
        ]}
        onDownload={() => installToolQuick(extPage)}
        onDelete={() => deleteToolQuick(extPage)}
        onFetchLatest={fetchLatestInfo}
        onStartService={() => controlService(extPage, 'start')}
        onStopService={() => controlService(extPage, 'stop')}
        onRestart={() => controlService(extPage, 'restart')}
      />

    </AdminPage>
  );
};
