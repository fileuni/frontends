import { useEffect, useMemo, useState } from 'react';
import { Cpu, Puzzle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.ts';
import { useConfigStore } from '@/stores/config.ts';
import { useNavigationStore } from '@/stores/navigation.ts';
import { useToastStore } from '@/stores/toast';
import { handleApiError } from '@/lib/api.ts';
import { Badge } from '@/components/ui/Badge.tsx';
import { AdminHero, AdminLoadingState, AdminPage } from './admin-ui';
import { ToolPanel } from './extensions/ToolPanel.tsx';
import { ToolIntegrationPanel } from './extensions/ToolIntegrationPanel.tsx';
import { ToolDiagnosticsPanel } from './extensions/ToolDiagnosticsPanel.tsx';
import { CloudflaredConfigPanel } from './extensions/CloudflaredConfigPanel.tsx';
import { CommandResultModal } from './extensions/CommandResultModal.tsx';
import { KopiaConfigPanel } from './extensions/KopiaConfigPanel.tsx';
import { OpenlistConfigPanel } from './extensions/OpenlistConfigPanel.tsx';
import { RcloneConfigPanel } from './extensions/RcloneConfigPanel.tsx';
import { TailscaleConfigPanel } from './extensions/TailscaleConfigPanel.tsx';
import { ExtensionsTabBar } from './extensions/components/ExtensionsTabBar';
import {
  fetchCloudflaredServiceConfigApi,
  fetchKopiaRuntimeConfigApi,
  fetchLatestToolInfoApi,
  fetchOpenlistRuntimeConfigApi,
  fetchRcloneRuntimeConfigApi,
  fetchTailscaleRuntimeConfigApi,
  fetchToolDiagnosticsApi,
  fetchToolIntegrationApi,
  installToolApi,
  runToolCommandApi,
  saveCloudflaredServiceConfigApi,
  saveKopiaRuntimeConfigApi,
  saveOpenlistRuntimeConfigApi,
  saveRcloneRuntimeConfigApi,
  saveTailscaleRuntimeConfigApi,
  saveToolIntegrationApi,
} from './extensions/api.ts';
import { buildExtensionTabItems } from './extensions/tabItems';
import type { ToolState } from './extensions/uiState';
import { usePersistedToolStates } from './extensions/hooks/usePersistedToolStates';
import { useExtensionsBackend } from './extensions/hooks/useExtensionsBackend';
import {
  createEmptyCloudflaredServiceConfig,
  createEmptyIntegrationConfig,
  createEmptyKopiaRuntimeConfig,
  createEmptyOpenlistRuntimeConfig,
  createEmptyRcloneRuntimeConfig,
  createEmptyTailscaleRuntimeConfig,
  type CloudflaredServiceConfig,
  type CmdResult,
  type InstallBody,
  type KopiaRuntimeConfig,
  type OpenlistRuntimeConfig,
  type RcloneRuntimeConfig,
  type TailscaleRuntimeConfig,
  type ToolDiagnosticResult,
  type ToolInfo,
  type ToolIntegrationConfig,
  type ToolInstallMode,
} from './extensions/types.ts';

const computeKopiaRepositoryPreview = (tool: ToolInfo | undefined, config: KopiaRuntimeConfig): string => {
  const binPath = tool?.executable_path || 'kopia';
  return config.repository_command_template
    .replaceAll('${BinPath}', binPath)
    .replaceAll('${ConfigFilePath}', config.config_file_path)
    .replaceAll('${CacheDirectory}', config.cache_directory);
};

const computeKopiaSnapshotPreview = (tool: ToolInfo | undefined, config: KopiaRuntimeConfig): string => {
  const binPath = tool?.executable_path || 'kopia';
  return config.snapshot_command_template
    .replaceAll('${BinPath}', binPath)
    .replaceAll('${ConfigFilePath}', config.config_file_path)
    .replaceAll('${CacheDirectory}', config.cache_directory);
};

const computeRcloneMountPreview = (tool: ToolInfo | undefined, config: RcloneRuntimeConfig): string => {
  const binPath = tool?.executable_path || 'rclone';
  return config.mount_command_template
    .replaceAll('${BinPath}', binPath)
    .replaceAll('${ConfigFilePath}', config.config_path);
};

export const ExtensionManagerAdmin = () => {
  const { t, i18n } = useTranslation();
  const { addToast } = useToastStore();
  const { params, navigate } = useNavigationStore();
  const { currentUserData } = useAuthStore();
  const { capabilities, fetchCapabilities } = useConfigStore();

  const userId = currentUserData?.user.id;
  const { toolStates, updateToolState } = usePersistedToolStates(userId);
  const {
    tools,
    serviceStatus,
    loading,
    loadAll,
    deleteTool,
    controlService,
  } = useExtensionsBackend({ t, addToast, fetchCapabilities });

  const extPage = params['ext'] || 'openlist';
  const currentTool = useMemo(() => tools.find((tool) => tool.name === extPage), [tools, extPage]);
  const extItems = useMemo(() => buildExtensionTabItems(tools), [tools]);
  const lang = i18n.language.startsWith('en') ? 'en' : 'zh';
  const description = currentTool ? (lang === 'en' ? currentTool.description_en : currentTool.description_zh) : '';
  const currentState: ToolState = toolStates[extPage] || { version: '', downloadUrl: '', targetBinDir: '', proxy: '' };

  const [busy, setBusy] = useState(false);
  const [integrationConfigs, setIntegrationConfigs] = useState<Record<string, ToolIntegrationConfig>>({});
  const [openlistConfig, setOpenlistConfig] = useState<OpenlistRuntimeConfig>(createEmptyOpenlistRuntimeConfig());
  const [rcloneConfig, setRcloneConfig] = useState<RcloneRuntimeConfig>(createEmptyRcloneRuntimeConfig());
  const [kopiaConfig, setKopiaConfig] = useState<KopiaRuntimeConfig>(createEmptyKopiaRuntimeConfig());
  const [cloudflaredConfig, setCloudflaredConfig] = useState<CloudflaredServiceConfig>(createEmptyCloudflaredServiceConfig());
  const [tailscaleConfig, setTailscaleConfig] = useState<TailscaleRuntimeConfig>(createEmptyTailscaleRuntimeConfig());
  const [commandTitle, setCommandTitle] = useState('');
  const [commandResult, setCommandResult] = useState<CmdResult | null>(null);
  const [commandModalOpen, setCommandModalOpen] = useState(false);
  const [diagnosticsResults, setDiagnosticsResults] = useState<Record<string, ToolDiagnosticResult[]>>({});
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!params['ext'] && extItems.length > 0) {
      const first = extItems[0];
      if (first) {
        navigate({ mod: 'admin', page: 'extensions', ext: first.key });
      }
    }
  }, [extItems, navigate, params]);

  useEffect(() => {
    if (!currentTool) return;
    let cancelled = false;

    const run = async () => {
      try {
        const integration = await fetchToolIntegrationApi(currentTool.name);
        if (!cancelled) {
          setIntegrationConfigs((prev) => ({ ...prev, [currentTool.name]: integration }));
        }

        if (currentTool.runtime_profile === 'openlist') {
          const data = await fetchOpenlistRuntimeConfigApi();
          if (!cancelled) setOpenlistConfig(data);
        }
        if (currentTool.runtime_profile === 'rclone') {
          const data = await fetchRcloneRuntimeConfigApi();
          if (!cancelled) setRcloneConfig(data);
        }
        if (currentTool.runtime_profile === 'kopia') {
          const data = await fetchKopiaRuntimeConfigApi();
          if (!cancelled) setKopiaConfig(data);
        }
        if (currentTool.runtime_profile === 'cloudflared') {
          const data = await fetchCloudflaredServiceConfigApi();
          if (!cancelled) setCloudflaredConfig(data);
        }
        if (currentTool.runtime_profile === 'tailscale') {
          const data = await fetchTailscaleRuntimeConfigApi();
          if (!cancelled) setTailscaleConfig(data);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          addToast(handleApiError(error, t), 'error');
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [addToast, currentTool, t]);

  const integrationConfig = integrationConfigs[extPage] || createEmptyIntegrationConfig(extPage);

  const refreshList = async () => {
    await loadAll();
  };

  const copyText = async (text: string, successKey = 'admin.extensions.copySuccess') => {
    try {
      await navigator.clipboard.writeText(text);
      addToast(t(successKey), 'success');
    } catch (error: unknown) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const runToolCommandWithModal = async (title: string, tool: string, args: string[]) => {
    setBusy(true);
    try {
      const result = await runToolCommandApi(tool, args);
      setCommandTitle(title);
      setCommandResult(result);
      setCommandModalOpen(true);
    } catch (error: unknown) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setBusy(false);
    }
  };

  const installToolQuick = async (tool: string) => {
    const state = toolStates[tool];
    if (!state?.downloadUrl) {
      addToast(t('admin.extensions.downloadUrlMissing'), 'error');
      return;
    }
    setBusy(true);
    try {
      const body: InstallBody = {
        version: state.version,
        download_link: state.downloadUrl,
        github_proxy: state.proxy,
        target_bin_dir: state.targetBinDir,
      };
      await installToolApi(tool, body);
      addToast(t('admin.extensions.downloadSuccess', { tool }), 'success');
      await refreshList();
      const integration = await fetchToolIntegrationApi(tool);
      setIntegrationConfigs((prev) => ({ ...prev, [tool]: integration }));
    } catch (error: unknown) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setBusy(false);
    }
  };

  const deleteManagedInstall = async (tool: string) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    setBusy(true);
    try {
      await deleteTool(tool);
      await refreshList();
    } finally {
      setBusy(false);
    }
  };

  const fetchLatestAndFill = async (tool: string) => {
    setBusy(true);
    try {
      const info = await fetchLatestToolInfoApi(tool);
      updateToolState(tool, {
        version: info.version,
        downloadUrl: info.download_url,
      });
      addToast(t('admin.extensions.fetchLatestSuccess'), 'success');
    } catch (error: unknown) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setBusy(false);
    }
  };

  const updateInstallMode = (mode: ToolInstallMode) => {
    setIntegrationConfigs((prev) => ({
      ...prev,
      [extPage]: { ...(prev[extPage] || createEmptyIntegrationConfig(extPage)), install_mode: mode },
    }));
  };

  const updateIntegrationBinaryPath = (key: string, path: string) => {
    setIntegrationConfigs((prev) => {
      const current = prev[extPage] || createEmptyIntegrationConfig(extPage);
      return {
        ...prev,
        [extPage]: {
          ...current,
          binaries: current.binaries.map((binary) => binary.key === key ? { ...binary, configured_path: path } : binary),
        },
      };
    });
  };

  const saveIntegration = async () => {
    setBusy(true);
    try {
      const data = await saveToolIntegrationApi(extPage, {
        install_mode: integrationConfig.install_mode,
        binaries: integrationConfig.binaries.map((binary) => ({ key: binary.key, path: binary.configured_path || '' })),
      });
      setIntegrationConfigs((prev) => ({ ...prev, [extPage]: data }));
      addToast(t('admin.extensions.saveIntegrationSuccess'), 'success');
      await refreshList();
    } catch (error: unknown) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveOpenlistConfig = async () => {
    setBusy(true);
    try {
      const data = await saveOpenlistRuntimeConfigApi({ data_path: openlistConfig.data_path, extra_args: openlistConfig.extra_args });
      setOpenlistConfig(data);
      addToast(t('admin.extensions.openlist.saveSuccess'), 'success');
    } catch (error: unknown) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveRcloneConfig = async () => {
    setBusy(true);
    try {
      const data = await saveRcloneRuntimeConfigApi({
        config_path: rcloneConfig.config_path,
        rc_addr: rcloneConfig.rc_addr,
        rc_no_auth: rcloneConfig.rc_no_auth,
        extra_args: rcloneConfig.extra_args,
        mount_command_template: rcloneConfig.mount_command_template,
        unmount_command_template: rcloneConfig.unmount_command_template,
      });
      setRcloneConfig(data);
      addToast(t('admin.extensions.rclone.saveSuccess'), 'success');
    } catch (error: unknown) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveKopiaConfig = async () => {
    setBusy(true);
    try {
      const data = await saveKopiaRuntimeConfigApi({
        config_file_path: kopiaConfig.config_file_path,
        cache_directory: kopiaConfig.cache_directory,
        repository_command_template: kopiaConfig.repository_command_template,
        snapshot_command_template: kopiaConfig.snapshot_command_template,
      });
      setKopiaConfig(data);
      addToast(t('admin.extensions.kopia.saveSuccess'), 'success');
    } catch (error: unknown) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveCloudflaredConfig = async () => {
    setBusy(true);
    try {
      const data = await saveCloudflaredServiceConfigApi({
        tunnel_token: cloudflaredConfig.tunnel_token,
        log_level: cloudflaredConfig.log_level,
        log_file: cloudflaredConfig.log_file,
        metrics: cloudflaredConfig.metrics,
        protocol: cloudflaredConfig.protocol,
        edge_ip_version: cloudflaredConfig.edge_ip_version,
        no_autoupdate: cloudflaredConfig.no_autoupdate,
        quick_tunnel_url: cloudflaredConfig.quick_tunnel_url,
      });
      setCloudflaredConfig(data);
      addToast(t('admin.extensions.cloudflared.saveSuccess'), 'success');
    } catch (error: unknown) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveTailscaleConfig = async () => {
    setBusy(true);
    try {
      const data = await saveTailscaleRuntimeConfigApi({
        state_dir: tailscaleConfig.state_dir,
        state_file: tailscaleConfig.state_file,
        socket_path: tailscaleConfig.socket_path,
        tun_mode: tailscaleConfig.tun_mode,
        udp_port: tailscaleConfig.udp_port,
        verbose: tailscaleConfig.verbose,
        debug_addr: tailscaleConfig.debug_addr,
        socks5_server: tailscaleConfig.socks5_server,
        http_proxy_listen: tailscaleConfig.http_proxy_listen,
        no_logs_no_support: tailscaleConfig.no_logs_no_support,
        auth_key: tailscaleConfig.auth_key,
        hostname: tailscaleConfig.hostname,
        operator: tailscaleConfig.operator,
        login_server: tailscaleConfig.login_server,
        accept_dns: tailscaleConfig.accept_dns,
        accept_routes: tailscaleConfig.accept_routes,
        advertise_exit_node: tailscaleConfig.advertise_exit_node,
        advertise_routes: tailscaleConfig.advertise_routes,
        advertise_tags: tailscaleConfig.advertise_tags,
        ssh: tailscaleConfig.ssh,
        shields_up: tailscaleConfig.shields_up,
      });
      setTailscaleConfig(data);
      addToast(t('admin.extensions.tailscale.saveSuccess'), 'success');
    } catch (error: unknown) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setBusy(false);
    }
  };

  const runDiagnostics = async (tool: string) => {
    setDiagnosticsLoading(true);
    try {
      const results = await fetchToolDiagnosticsApi(tool);
      setDiagnosticsResults((prev) => ({ ...prev, [tool]: results }));
    } catch (error: unknown) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminPage withBottomPadding={false} className="pb-10 sm:pb-20">
        <AdminLoadingState label={t('admin.extensions.loading')} />
      </AdminPage>
    );
  }

  return (
    <AdminPage withBottomPadding={false} className="space-y-4 sm:space-y-6 pb-10 sm:pb-20">
      <AdminHero
        icon={<Puzzle size={18} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />}
        iconClassName="bg-primary/20 text-primary"
        title={t('admin.extensions.title')}
        subtitle={t('admin.extensions.subtitle') || 'Extension & Plugin Infrastructure'}
        className="rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5 md:p-6 shadow-sm"
        actions={
          <Badge variant="outline" className="h-8 sm:h-9 md:h-10 px-3 sm:px-4 rounded-xl sm:rounded-2xl border-white/10 bg-white/5 opacity-60 flex gap-2 sm:gap-3 items-center backdrop-blur-md self-start sm:self-auto whitespace-nowrap">
            <Cpu size={14} className="opacity-40 sm:w-4 sm:h-4" />
            <span className="font-mono text-xs sm:text-sm uppercase font-black tracking-widest">{capabilities?.runtime_os || 'linux'} / {capabilities?.runtime_arch || 'x86_64'}</span>
          </Badge>
        }
      />

      <ExtensionsTabBar items={extItems} activeKey={extPage} onSelect={(key) => navigate({ mod: 'admin', page: 'extensions', ext: key })} />

      {currentTool ? (
        <>
          <ToolPanel
            tool={extPage}
            displayName={currentTool.display_name}
            kind={currentTool.kind}
            installed={currentTool.installed}
            executablePath={currentTool.executable_path}
            homepage={currentTool.homepage}
            description={description}
            installMode={currentTool.integration_mode}
            followStart={serviceStatus[extPage]?.follow_start}
            running={serviceStatus[extPage]?.running}
            pid={serviceStatus[extPage]?.pid}
            loading={busy}
            onDelete={() => deleteManagedInstall(extPage)}
            onStartService={() => controlService(extPage, 'start')}
            onStopService={() => controlService(extPage, 'stop')}
            onRestart={() => controlService(extPage, 'restart')}
          />

          <ToolIntegrationPanel
            tool={currentTool}
            integration={integrationConfig}
            draft={currentState}
            busy={busy}
            onDraftChange={(patch) => updateToolState(extPage, patch)}
            onSetInstallMode={updateInstallMode}
            onSetBinaryPath={updateIntegrationBinaryPath}
            onSaveIntegration={saveIntegration}
            onFetchLatest={() => fetchLatestAndFill(extPage)}
            onInstallManaged={() => installToolQuick(extPage)}
            onDeleteManaged={() => deleteManagedInstall(extPage)}
          />

          <ToolDiagnosticsPanel
            results={diagnosticsResults[extPage] || []}
            loading={diagnosticsLoading}
            onRefresh={() => runDiagnostics(extPage)}
          />

          {currentTool.runtime_profile === 'openlist' ? (
            <OpenlistConfigPanel
              config={openlistConfig}
              loading={busy}
              onChange={(patch) => setOpenlistConfig((prev) => ({ ...prev, ...patch }))}
              onSave={saveOpenlistConfig}
              onResetAdmin={() => runToolCommandWithModal(t('admin.extensions.openlist.resetAdmin'), 'openlist', ['admin', 'random', '--data', openlistConfig.data_path])}
            />
          ) : null}

          {currentTool.runtime_profile === 'rclone' ? (
            <RcloneConfigPanel
              config={rcloneConfig}
              loading={busy}
              onChange={(patch) => setRcloneConfig((prev) => ({ ...prev, ...patch }))}
              onSave={saveRcloneConfig}
              onCopyMount={() => { void copyText(computeRcloneMountPreview(currentTool, rcloneConfig), 'admin.extensions.rclone.copyMountSuccess'); }}
            />
          ) : null}

          {currentTool.runtime_profile === 'kopia' ? (
            <KopiaConfigPanel
              config={kopiaConfig}
              loading={busy}
              onChange={(patch) => setKopiaConfig((prev) => ({ ...prev, ...patch }))}
              onSave={saveKopiaConfig}
              onCopyRepositoryCommand={() => { void copyText(computeKopiaRepositoryPreview(currentTool, kopiaConfig), 'admin.extensions.kopia.copyRepositorySuccess'); }}
              onCopySnapshotCommand={() => { void copyText(computeKopiaSnapshotPreview(currentTool, kopiaConfig), 'admin.extensions.kopia.copySnapshotSuccess'); }}
              repositoryPreview={computeKopiaRepositoryPreview(currentTool, kopiaConfig)}
              snapshotPreview={computeKopiaSnapshotPreview(currentTool, kopiaConfig)}
            />
          ) : null}

          {currentTool.runtime_profile === 'cloudflared' ? (
            <CloudflaredConfigPanel
              config={cloudflaredConfig}
              loading={busy}
              onChange={(patch) => setCloudflaredConfig((prev) => ({ ...prev, ...patch }))}
              onSave={saveCloudflaredConfig}
              onCopyServiceCommand={() => { void copyText(cloudflaredConfig.service_command, 'admin.extensions.cloudflared.copySuccess'); }}
              onCopyQuickTunnelCommand={() => { void copyText(cloudflaredConfig.quick_tunnel_command, 'admin.extensions.cloudflared.copySuccess'); }}
            />
          ) : null}

          {currentTool.runtime_profile === 'tailscale' ? (
            <TailscaleConfigPanel
              config={tailscaleConfig}
              loading={busy}
              onChange={(patch) => setTailscaleConfig((prev) => ({ ...prev, ...patch }))}
              onSave={saveTailscaleConfig}
              onCopyDaemonCommand={() => { void copyText(tailscaleConfig.daemon_command, 'admin.extensions.tailscale.copySuccess'); }}
              onCopyUpCommand={() => { void copyText(tailscaleConfig.up_command, 'admin.extensions.tailscale.copySuccess'); }}
              onRunUp={() => runToolCommandWithModal(t('admin.extensions.tailscale.runUp'), 'tailscale', tailscaleConfig.up_args)}
              onRunDown={() => runToolCommandWithModal(t('admin.extensions.tailscale.runDown'), 'tailscale', tailscaleConfig.down_args)}
              onRunStatus={() => runToolCommandWithModal(t('admin.extensions.tailscale.runStatus'), 'tailscale', tailscaleConfig.status_args)}
              onRunNetcheck={() => runToolCommandWithModal(t('admin.extensions.tailscale.runNetcheck'), 'tailscale', tailscaleConfig.netcheck_args)}
            />
          ) : null}
        </>
      ) : null}

      <CommandResultModal
        title={commandTitle}
        result={commandResult}
        isOpen={commandModalOpen}
        onClose={() => setCommandModalOpen(false)}
      />
    </AdminPage>
  );
};
