import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as toml from 'smol-toml';
import {
  Zap,
  FileText,
  Info,
} from 'lucide-react';
import { AboutModal, buildAboutUpdateGuideUrl, type AboutUpdateInfo } from '@/components/modals/AboutModal';
import { ToastContainer, ToastI18nContext } from '@/components/ui/Toast';
import { toast } from '@/stores/toast';
import { useThemeStore, applyTheme } from '@/stores/theme';
import { useLanguageStore } from '@/stores/language';
import type { ConfigError, ConfigNoteEntry } from '@/components/setting/ConfigRawEditor';
import { SettingWorkbenchSurface } from '@/components/setting/SettingWorkbenchSurface';
import { SettingSurfaceControls } from '@/components/setting/SettingSurfaceControls';
import { ConfigPathActionButton } from '@/components/setting/ConfigPathActionButton';
import type { ExternalToolDiagnosisResponse } from '@/components/setting/ExternalDependencyConfigModal';
import { useEscapeToCloseTopLayer } from '@/hooks/useEscapeToCloseTopLayer';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import { buildSettingCommonActions } from '@/components/setting/SettingCommonActions';
import { LogViewer, type LogEntry } from '@/apps/launcher/components/LogViewer';
import { QuickActionsPanel } from '@/apps/launcher/components/QuickActionsPanel';
import { VersionUpgradeModal, type VersionUpgradeStatusView } from '@/apps/launcher/components/VersionUpgradeModal';
import { ServiceControlPanel, type ServiceInstallLevel } from '@/apps/launcher/components/ServiceControlPanel';
import { useConfigStore } from './stores/config';
import '@/lib/i18n';
import ConfigSelector from './ConfigSelector';
import { isTauriRuntime, safeInvoke, safeListen } from './tauri';

// OS info interface
interface OSInfo {
  os_type: string;
  arch?: string;
  logical_cpu_count?: number | null;
  physical_cpu_count?: number | null;
  total_memory_bytes?: number | null;
  suggested_performance_template?: string;
  support_service: boolean;
  nixos_hint: boolean;
  is_mobile: boolean;
}

// Service status response
interface ServiceStatusResponse {
  status: string;
  is_running: boolean;
}

interface LicenseStatusPayload {
  is_valid: boolean;
  msg: string;
  device_code: string;
  hw_id: string;
  aux_id: string;
  current_users: number;
  max_users: number;
  expires_at?: string | null;
  features: string[];
}

interface RuntimeDirInspection {
  runtime_dir: string;
  config_path: string;
  config_exists: boolean;
  runtime_dir_exists: boolean;
}

interface RuntimeDirPayload {
  runtime_dir: string;
}

interface RuntimeDirPresets {
  current_runtime_dir: string;
  default_runtime_dir: string;
}

type PickedDirectory = {
  driver: string;
  root: string;
  display?: string | null;
};

interface MissingConfigPromptState {
  configPath: string;
}

interface InstallationStatus {
  runtime_dir: string;
  config_path: string;
  config_exists: boolean;
  install_lock_path: string;
  install_lock_exists: boolean;
  is_setup_required: boolean;
}

interface VersionUpgradeStatus extends VersionUpgradeStatusView {
  runtime_dir: string;
  config_path: string;
  needs_config_upgrade: boolean;
  needs_schema_upgrade: boolean;
  blocks_startup: boolean;
  issue?: string | null;
}

interface VersionUpgradeResult {
  runtime_dir: string;
  config_path: string;
  backup_path: string;
  program_version: string;
  target_version: string;
  from_config_version?: string | null;
  from_schema_version?: string | null;
  planned_steps: VersionUpgradeStatusView['planned_steps'];
  uses_major_upgrade_bridge: boolean;
  applied_steps: string[];
}

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export function Launcher() {
  const { t } = useTranslation();
  const { theme } = useThemeStore();
  const isDark = useResolvedTheme() === 'dark';
  const { language } = useLanguageStore();
  const { runtimeDir, setRuntimeDir } = useConfigStore();

  // Toast i18n
  const toastI18n = React.useMemo(() => ({
    doNotShowAgain: t('launcher.do_not_show_again'),
    viewDetails: t('launcher.view_details'),
    hideDetails: t('launcher.hide_details'),
    copy: t('launcher.copy'),
  }), [t]);

  const [status, setStatus] = useState<string>('Checking...');
  const [version, setVersion] = useState<string>('0.0.0');
  const [versionCode, setVersionCode] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [osInfo, setOsInfo] = useState<OSInfo | null>(null);

  // Log related state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [uptime, setUptime] = useState(0);

  // Config selector state
  const [showConfigSelector, setShowConfigSelector] = useState(false);

  const [serviceInstallLevel, setServiceInstallLevel] = useState<ServiceInstallLevel>('system');
  const [serviceAutostart, setServiceAutostart] = useState(true);
  const updateGuideBaseUrl = language === 'en' ? 'https://fileuni.com/update' : 'https://fileuni.com/zh-cn/update';

  // Config editor state
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [configContent, setConfigContent] = useState('');
  const [savedConfigContent, setSavedConfigContent] = useState('');
  const [configNotes, setConfigNotes] = useState<Record<string, ConfigNoteEntry>>({});
  const [configErrors, setConfigErrors] = useState<ConfigError[]>([]);
  const [configFetching, setConfigFetching] = useState(false);
  const [configBusy, setConfigBusy] = useState(false);
  const [resettingAdminPassword, setResettingAdminPassword] = useState(false);
  const [configSummary, setConfigSummary] = useState('');
  const [configSummaryLevel, setConfigSummaryLevel] = useState<'success' | 'warning' | 'error' | 'info'>('info');
  const [configFilePath, setConfigFilePath] = useState('');

  // License management state (Quick Settings)
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatusPayload | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseSaving, setLicenseSaving] = useState(false);

  const [runtimeDirPresets, setRuntimeDirPresets] = useState<RuntimeDirPresets | null>(null);
  const [missingConfigPrompt, setMissingConfigPrompt] = useState<MissingConfigPromptState | null>(null);
  const [initialSettingsStatus, setInitialSettingsStatus] = useState<InstallationStatus | null>(null);
  const [initialSettingsRequired, setInitialSettingsRequired] = useState(false);
  const [settingsCenterAdminUsername, setSettingsCenterAdminUsername] = useState('admin');
  const [settingsCenterAdminAction, setSettingsCenterAdminAction] = useState('existing_admin');
  const [settingsCenterPasswordHint, setSettingsCenterPasswordHint] = useState<string | null>(null);
  const [pendingAdminPassword, setPendingAdminPassword] = useState('');
  const [settingsCenterApplying, setSettingsCenterApplying] = useState(false);
  const [isSettingsCenterRequiredPromptOpen, setIsSettingsCenterRequiredPromptOpen] = useState(false);
  const [isSettingsCenterCompletedPromptOpen, setIsSettingsCenterCompletedPromptOpen] = useState(false);
  const [versionUpgradeStatus, setVersionUpgradeStatus] = useState<VersionUpgradeStatus | null>(null);
  const [isVersionUpgradePromptOpen, setIsVersionUpgradePromptOpen] = useState(false);
  const [versionUpgradeBusy, setVersionUpgradeBusy] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [aboutUpdateInfo, setAboutUpdateInfo] = useState<AboutUpdateInfo | null>(null);
  const [aboutUpdateError, setAboutUpdateError] = useState<string | null>(null);
  const [isCheckingAboutUpdates, setIsCheckingAboutUpdates] = useState(false);
  const isServiceRunning = status === 'Running';
  const displayedRuntimeDir = runtimeDir ?? runtimeDirPresets?.default_runtime_dir ?? '...';
  const missingConfigPromptResolver = useRef<((accepted: boolean) => void) | null>(null);
  const suspendLogUpdatesRef = useRef(false);
  const handleStartRef = useRef<(() => Promise<boolean>) | null>(null);
  const handleStopRef = useRef<(() => Promise<void>) | null>(null);

  const inspectRuntimeDir = useCallback(async (nextRuntimeDir?: string | null) => {
    return safeInvoke<RuntimeDirInspection>('inspect_runtime_dir', {
      runtimeDir: nextRuntimeDir ?? '',
    });
  }, []);

  const bindRuntimeDir = useCallback(async (nextRuntimeDir?: string | null) => {
    const inspected = await inspectRuntimeDir(nextRuntimeDir);
    await safeInvoke<void>('set_runtime_dir', {
      runtimeDir: inspected.runtime_dir,
    });
    setRuntimeDir(inspected.runtime_dir);
    setConfigFilePath(inspected.config_path);
    return inspected;
  }, [inspectRuntimeDir, setRuntimeDir]);

  const ensureRuntimeConfigReady = async () => {
    try {
      const inspected = await bindRuntimeDir(runtimeDir);
      if (inspected.config_exists) {
        return inspected;
      }

      const accepted = await new Promise<boolean>((resolve) => {
        missingConfigPromptResolver.current = resolve;
        setMissingConfigPrompt({
          configPath: inspected.config_path,
        });
      });

      if (!accepted) {
        toast.warning(t('launcher.runtime_config_missing_cancelled'));
        return null;
      }

      // Config file must be created by the settings center apply flow.
      await inspectInstallationState(inspected.runtime_dir);
      return null;
    } catch (error) {
      toast.error(extractErrorMessage(error));
      return null;
    }
  };

  const refreshLicenseStatus = useCallback(async () => {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      const payload = await safeInvoke<LicenseStatusPayload>('get_license_status');
      setLicenseStatus(payload);
    } catch (error: unknown) {
      const message = extractErrorMessage(error);
      if (message.includes('RUNTIME_INIT_REQUIRED') || message.includes('missing config file')) {
        setLicenseStatus(null);
        return;
      }
      console.error('Failed to load license status:', error);
    }
  }, []);

  const pickExternalStorageDirectory = async (): Promise<PickedDirectory | null> => {
    try {
      const picked = await safeInvoke<PickedDirectory>('plugin:yh-tauri-storage-picker|pick_directory');
      return picked;
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
      return null;
    }
  };

  const handleUpdateLicenseKey = async () => {
    const trimmed = licenseKey.trim();
    if (!trimmed) {
      return;
    }
    setLicenseSaving(true);
    try {
      await safeInvoke<void>('update_license_key', { license_key: trimmed });
      toast.success(t('admin.saveSuccess'));
      setLicenseKey('');
      await refreshLicenseStatus();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    } finally {
      setLicenseSaving(false);
    }
  };

  const loadSettingsCenterWorkbench = useCallback(async () => {
    setConfigFetching(true);
    try {
      const [content, notes] = await Promise.all([
        safeInvoke<string>('get_config_template_content'),
        safeInvoke<Record<string, ConfigNoteEntry>>('get_config_notes'),
      ]);
      setConfigContent(content);
      setSavedConfigContent(content);
      setConfigNotes(notes);
      setConfigErrors([]);
      setConfigSummary('');
      setConfigSummaryLevel('info');
      await refreshLicenseStatus();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setConfigFetching(false);
    }
  }, [refreshLicenseStatus]);

  const refreshVersionUpgradeStatus = useCallback(async () => {
    if (!isTauriRuntime()) {
      setVersionUpgradeStatus(null);
      setIsVersionUpgradePromptOpen(false);
      return null;
    }

    try {
      const status = await safeInvoke<VersionUpgradeStatus>('inspect_version_upgrade_status');
      setVersionUpgradeStatus(status);
      setIsVersionUpgradePromptOpen(status.blocks_startup);
      return status;
    } catch (error) {
      const message = extractErrorMessage(error);
      console.error('Failed to inspect version upgrade status:', error);
      toast.error(message);
      setVersionUpgradeStatus(null);
      setIsVersionUpgradePromptOpen(false);
      return null;
    }
  }, []);

  const inspectInstallationState = useCallback(async (nextRuntimeDir?: string | null) => {
    const inspected = await inspectRuntimeDir(nextRuntimeDir);
    let status = await safeInvoke<InstallationStatus>('inspect_installation_status', {
      runtimeDir: inspected.runtime_dir,
    });

    if (!status.config_exists) {
      const ensured = await safeInvoke<RuntimeDirInspection>('ensure_runtime_config', {
        runtimeDir: inspected.runtime_dir,
      });
      await safeInvoke<void>('set_runtime_dir', {
        runtimeDir: ensured.runtime_dir,
      });
      setRuntimeDir(ensured.runtime_dir);
      setConfigFilePath(ensured.config_path);
      status = await safeInvoke<InstallationStatus>('inspect_installation_status', {
        runtimeDir: ensured.runtime_dir,
      });
    } else {
      setConfigFilePath(status.config_path);
    }

    setInitialSettingsStatus(status);
    if (status.is_setup_required) {
      await loadSettingsCenterWorkbench();
      setInitialSettingsRequired(true);
      setVersionUpgradeStatus(null);
      setIsVersionUpgradePromptOpen(false);
    } else {
      setInitialSettingsRequired(false);
      await refreshVersionUpgradeStatus();
    }
    return status;
  }, [inspectRuntimeDir, loadSettingsCenterWorkbench, refreshVersionUpgradeStatus, setRuntimeDir]);

  const closeMissingConfigPrompt = (accepted: boolean) => {
    setMissingConfigPrompt(null);
    missingConfigPromptResolver.current?.(accepted);
    missingConfigPromptResolver.current = null;
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const raw = window.localStorage.getItem('fileuni-gui-service-install-options');
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as { level?: ServiceInstallLevel; autostart?: boolean };
      if (parsed.level === 'system' || parsed.level === 'user') {
        setServiceInstallLevel(parsed.level);
      }
      if (typeof parsed.autostart === 'boolean') {
        setServiceAutostart(parsed.autostart);
      }
    } catch {
      // Ignore invalid cached payload
    }
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) {
      setStatus('Unknown');
      return () => {};
    }

    let cancelled = false;

    const loadRuntimeDir = async (attempt: number) => {
      try {
        const inspected = await bindRuntimeDir(runtimeDir);
        await inspectInstallationState(inspected.runtime_dir);
      } catch (error) {
        if (!cancelled && attempt < 5) {
          window.setTimeout(() => {
            void loadRuntimeDir(attempt + 1);
          }, 300);
          return;
        }
        try {
          const defaults = await safeInvoke<RuntimeDirPayload>('get_default_runtime_dir');
          const inspected = await bindRuntimeDir(defaults.runtime_dir);
          await inspectInstallationState(inspected.runtime_dir);
          return;
        } catch (fallbackError) {
          console.error(fallbackError);
        }
        console.error(error);
      }
    };

    void loadRuntimeDir(0);

    return () => {
      cancelled = true;
    };
  }, [bindRuntimeDir, inspectInstallationState, runtimeDir]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    safeInvoke<RuntimeDirPresets>('get_runtime_dir_presets')
      .then((presets) => {
        setRuntimeDirPresets(presets);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    return () => {
      missingConfigPromptResolver.current?.(false);
      missingConfigPromptResolver.current = null;
    };
  }, []);

  useEffect(() => {
    suspendLogUpdatesRef.current = initialSettingsRequired || isEditingConfig || showConfigSelector || Boolean(missingConfigPrompt) || isVersionUpgradePromptOpen;
  }, [isEditingConfig, isVersionUpgradePromptOpen, missingConfigPrompt, initialSettingsRequired, showConfigSelector]);

  useEscapeToCloseTopLayer({
    active: Boolean(missingConfigPrompt),
    onEscape: () => closeMissingConfigPrompt(false),
  });

  useEscapeToCloseTopLayer({
    active: isVersionUpgradePromptOpen,
    onEscape: () => setIsVersionUpgradePromptOpen(false),
  });

  const handleRuntimeDirSelected = async (nextRuntimeDir: string) => {
    try {
      const inspected = await bindRuntimeDir(nextRuntimeDir);
      await inspectInstallationState(inspected.runtime_dir);
      setIsEditingConfig(false);
      setShowConfigSelector(false);
      toast.success(t('launcher.messages.config_set_success'));
    } catch (e: unknown) {
      toast.error(String(e));
    }
  };

  const ensureVersionUpgradeReady = useCallback(async (): Promise<boolean> => {
    const latestStatus = versionUpgradeStatus ?? await refreshVersionUpgradeStatus();
    if (!latestStatus?.blocks_startup) {
      return true;
    }
    setIsVersionUpgradePromptOpen(true);
    await toast.warning(t('launcher.upgrade.startBlocked'));
    return false;
  }, [refreshVersionUpgradeStatus, versionUpgradeStatus, t]);

  const handleRunVersionUpgrade = async () => {
    setVersionUpgradeBusy(true);
    try {
      const result = await safeInvoke<VersionUpgradeResult>('run_version_upgrade');
      toast.success(t('launcher.upgrade.success'));
      setIsVersionUpgradePromptOpen(false);
      await inspectInstallationState(result.runtime_dir);
      await refreshStatus();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setVersionUpgradeBusy(false);
    }
  };

  const handleEditConfig = async () => {
    if (!(await ensureVersionUpgradeReady())) {
      return;
    }
    const ready = await ensureRuntimeConfigReady();
    if (!ready) {
      return;
    }
    setIsEditingConfig(true);
    setConfigFetching(true);
    try {
      const content = await safeInvoke<string>('get_config_content');
      const notes = await safeInvoke<Record<string, ConfigNoteEntry>>('get_config_notes');
      setConfigContent(content);
      setSavedConfigContent(content);
      setConfigNotes(notes);
      setConfigErrors([]);
      setConfigSummary('');
      setConfigSummaryLevel('info');
      await refreshLicenseStatus();
    } catch (e: unknown) {
      toast.error(String(e));
      setIsEditingConfig(false);
    }
    setConfigFetching(false);
  };

  const handleSaveConfig = async () => {
    setConfigBusy(true);
    try {
      // Always validate with structured errors first so users can jump to the exact line.
      const errors = await safeInvoke<ConfigError[]>('test_config', { content: configContent });
      if (errors.length > 0) {
        toast.error(t('launcher.messages.config_test_failed'));
        setConfigErrors(errors);
        setConfigSummary(t('launcher.messages.config_test_failed'));
        setConfigSummaryLevel('error');
        return;
      }

      setConfigErrors([]);

      // GUI config editing happens while the service is stopped.
      // Persist to disk; changes take effect on next start.
      await safeInvoke<void>('save_config', { content: configContent });
      toast.success(t('launcher.messages.config_saved'));
      setSavedConfigContent(configContent);
      setConfigSummary(t('launcher.messages.config_saved'));
      setConfigSummaryLevel('success');
      setConfigErrors([]);
    } catch (e: unknown) {
      toast.error(String(e));
      setConfigSummary(String(e));
      setConfigSummaryLevel('error');
    }
    setConfigBusy(false);
  };

  const handleResetAdminPassword = async (password: string): Promise<string> => {
    setResettingAdminPassword(true);
    try {
      const username = await safeInvoke<string>('reset_admin_password', {
        new_password: password,
      });
      toast.success(t('launcher.reset_admin_password_success'));
      return (typeof username === 'string' && username.trim().length > 0) ? username : 'admin';
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e));
      throw e;
    } finally {
      setResettingAdminPassword(false);
    }
  };

  const handleSettingsCenterRuntimeAction = async () => {
    if (!isTauriRuntime()) {
      await toast.info('CLI: restart FileUni with --runtime-dir <path> to change the runtime directory.', { duration: 'long' });
      return;
    }

    if (isServiceRunning) {
      await toast.warning(t('launcher.messages.stop_service_before_dirs'));
      return;
    }

    setShowConfigSelector(true);
  };

  const settingActions = buildSettingCommonActions({
    t,
    isDark,
    tomlAdapter: toml,
    content: configContent,
    onContentChange: setConfigContent,
    runtimeOs: osInfo?.os_type,
    systemHardware: osInfo,
    onTestDatabase: handleCheckDatabase,
    onTestCache: handleCheckCache,
    adminPassword: {
      onApply: async (password) => handleStoreAdminPassword(password),
      loading: settingsCenterApplying,
      hint: t('setup.admin.resetRuleHint'),
    },
    license: {
      status: licenseStatus,
      licenseKey,
      onLicenseKeyChange: setLicenseKey,
      onApplyLicense: () => { void handleUpdateLicenseKey(); },
      saving: licenseSaving,
    },
    storage: {
      onPrimaryAction: () => { void handleFinalizeSettingsCenter(); },
      primaryActionLabel: t('setup.guide.card3Action'),
    },
  });

  const handleTestConfig = async () => {
    setConfigBusy(true);
    try {
      const errors = await safeInvoke<ConfigError[]>('test_config', { content: configContent });
      if (errors.length === 0) {
        toast.success(t('launcher.messages.config_test_passed'));
        setConfigErrors([]);
        setConfigSummary('');
        setConfigSummaryLevel('info');
      } else {
        toast.error(t('launcher.messages.config_test_failed'));
        setConfigErrors(errors);
        setConfigSummary(t('launcher.messages.config_test_failed'));
        setConfigSummaryLevel('error');
      }
    } catch (e: unknown) {
      toast.error(String(e));
      setConfigSummary(String(e));
      setConfigSummaryLevel('error');
    }
    setConfigBusy(false);
  };

  const handleDiagnoseExternalTools = async (configuredValues: Record<string, string>): Promise<ExternalToolDiagnosisResponse> => {
    return safeInvoke<ExternalToolDiagnosisResponse>('diagnose_external_tools', {
      payload: { configured_values: configuredValues },
    });
  };

  async function handleCheckDatabase({ databaseType, connectionString }: { databaseType: 'sqlite' | 'postgres'; connectionString: string }) {
    try {
      await safeInvoke<void>('check_db_connection', {
        db_type: databaseType,
        connection_string: connectionString,
      });
      toast.success(t('admin.config.testSuccess'));
    } catch (error) {
      toast.error(String(error));
    }
  }

  async function handleCheckCache({ cacheType, connectionString }: { cacheType: string; connectionString: string }) {
    try {
      await safeInvoke<void>('check_kv_connection', {
        kv_type: cacheType,
        connection_string: connectionString,
      });
      toast.success(t('admin.config.testSuccess'));
    } catch (error) {
      toast.error(String(error));
    }
  }

  useEffect(() => {
    let unlistenServiceAction: (() => void) | null = null;
    let unlistenLogs: (() => void) | null = null;

    const init = async () => {
      if (!isTauriRuntime()) {
        return;
      }

      try {
        const response = await safeInvoke<ServiceStatusResponse>('get_service_status');
        setStatus(response.status);
      } catch (error: unknown) {
        console.error(error);
        setStatus('Unknown');
      }

      try {
        const nextVersion = await safeInvoke<string>('get_app_version');
        setVersion(nextVersion);
      } catch (error: unknown) {
        console.error(error);
      }

      try {
        const nextVersionCode = await safeInvoke<number | null>('get_android_version_code');
        setVersionCode(nextVersionCode);
      } catch (error: unknown) {
        console.error(error);
        setVersionCode(null);
      }

      try {
        const info = await safeInvoke<OSInfo>('get_os_info');
        setOsInfo(info);
      } catch (error: unknown) {
        console.error(error);
      }

      unlistenServiceAction = await safeListen<string>('service-action', (event) => {
        if (event.payload === 'start') {
          void handleStartRef.current?.();
        }
        if (event.payload === 'stop') {
          void handleStopRef.current?.();
        }
      });

      unlistenLogs = await safeListen<LogEntry[]>('log-update', (event) => {
        const batch = Array.isArray(event.payload) ? event.payload : [];
        if (batch.length === 0 || suspendLogUpdatesRef.current) {
          return;
        }
        setLogs((prev) => (prev.length === 0 ? batch.slice(-1000) : [...prev, ...batch].slice(-1000)));
      });

      await safeInvoke<void>('subscribe_logs');
    };

    void init().catch(console.error);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (useThemeStore.getState().theme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      unlistenServiceAction?.();
      unlistenLogs?.();
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  useEffect(() => {
    const uptimeInterval = setInterval(() => {
      if (status === 'Running') {
        setUptime((prev) => prev + 1);
      }
    }, 1000);

    return () => {
      clearInterval(uptimeInterval);
    };
  }, [status]);

  const refreshStatus = async () => {
    try {
      const response = await safeInvoke<ServiceStatusResponse>('get_service_status');
      setStatus(response.status);
    } catch (e: unknown) {
      console.error(e);
      setStatus('Unknown');
    }
  };

  const handleStart = async (): Promise<boolean> => {
    const ready = await ensureRuntimeConfigReady();
    if (!ready) {
      return false;
    }
    if (!(await ensureVersionUpgradeReady())) {
      return false;
    }
    setLoading(true);
    try {
      await safeInvoke<string>('start_service');
      toast.success(t('launcher.messages.service_started'));
      await refreshStatus();
      return true;
    } catch (e: unknown) {
      const message = extractErrorMessage(e);
      if (message.includes('Initial settings are incomplete')) {
        setIsSettingsCenterRequiredPromptOpen(true);
      } else {
        toast.error(message);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await safeInvoke<string>('stop_service');
      toast.success(t('launcher.messages.service_stopped'));
      await refreshStatus();
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e));
    }
    setLoading(false);
  };

  handleStartRef.current = handleStart;
  handleStopRef.current = handleStop;

  const persistServiceInstallOptions = (level: ServiceInstallLevel, autostart: boolean) => {
    window.localStorage.setItem(
      'fileuni-gui-service-install-options',
      JSON.stringify({ level, autostart })
    );
  };

  const handleInstall = async () => {
    if (osInfo?.nixos_hint) {
      toast.warning(
        `${t('launcher.nixos_detected')}\n${t('launcher.nixos_desc')}`,
        {
          duration: 'persistent',
          showDoNotShowAgain: true,
        }
      );
      return;
    }
    if (!(await ensureVersionUpgradeReady())) {
      return;
    }
    setLoading(true);
    try {
      await safeInvoke<string>('install_service', { level: serviceInstallLevel, autostart: serviceAutostart });
      toast.success(t('launcher.messages.install_requested'));
    } catch (e: unknown) {
      const message = extractErrorMessage(e);
      if (message.includes('Initial settings are incomplete')) {
        setIsSettingsCenterRequiredPromptOpen(true);
      } else {
        toast.error(message);
      }
    }
    setLoading(false);
  };

  const handleUninstall = async () => {
    setLoading(true);
    try {
      await safeInvoke<string>('uninstall_service');
      toast.success(t('launcher.messages.uninstall_requested'));
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e));
    }
    setLoading(false);
  };

  const handleResetToSavedConfig = () => {
    setConfigContent(savedConfigContent);
    setConfigErrors([]);
    setConfigSummary('');
    setConfigSummaryLevel('info');
  };

  const handleCloseConfigEditor = () => {
    setIsEditingConfig(false);
  };

  useEscapeToCloseTopLayer({
    active: isEditingConfig,
    onEscape: handleCloseConfigEditor,
  });

  const handleOpenWebUI = async () => {
    try {
      await safeInvoke<void>('open_web_ui');
      return true;
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e));
      return false;
    }
  };

  const handleOpenWebUiFromSettingsCenterCompleted = async () => {
    let running = status === 'Running';
    if (!running) {
      running = await handleStart();
    }
    if (!running) {
      return;
    }
    const opened = await handleOpenWebUI();
    if (opened) {
      await finishSettingsCenterAndReturnToLauncher();
    }
  };

  const handleOpenRuntimeDir = async () => {
    try {
      await bindRuntimeDir(runtimeDir);
      await safeInvoke<void>('open_runtime_dir');
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e));
    }
  };

  const handleOpenExternalLink = async (url: string) => {
    if (!isTauriRuntime()) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      await safeInvoke<void>('open_external_url', { url });
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e));
    }
  };

  const handleCheckAboutUpdates = async () => {
    setIsCheckingAboutUpdates(true);
    setAboutUpdateError(null);
    try {
      const payload = await safeInvoke<AboutUpdateInfo>('check_latest_release');
      setAboutUpdateInfo(payload);
    } catch (e: unknown) {
      const message = extractErrorMessage(e);
      setAboutUpdateError(message);
      toast.error(message);
    } finally {
      setIsCheckingAboutUpdates(false);
    }
  };

  type SettingsCenterResult = {
    admin_username: string;
    admin_action: string;
    password_hint?: string | null;
  };

  const handleApplySettingsCenter = async (password: string): Promise<string> => {
    setSettingsCenterApplying(true);
    try {
      const res = await safeInvoke<SettingsCenterResult>('apply_settings_center', {
        content: configContent,
        password,
      });
      const username = res?.admin_username?.trim() || 'admin';
      setSettingsCenterAdminUsername(username);
      if (res?.admin_action) {
        setSettingsCenterAdminAction(res.admin_action);
      }
      setSettingsCenterPasswordHint(res?.password_hint ?? null);
      setSavedConfigContent(configContent);
      setConfigSummary(t('setup.logs.setupSuccess'));
      setConfigSummaryLevel('success');
      setConfigErrors([]);
      toast.success(t('setup.logs.setupSuccess'));
      setIsSettingsCenterCompletedPromptOpen(true);
      setPendingAdminPassword('');
      return username;
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e));
      throw e;
    } finally {
      setSettingsCenterApplying(false);
    }
  };

  const handleStoreAdminPassword = async (password: string): Promise<string> => {
    setSettingsCenterApplying(true);
    try {
      setPendingAdminPassword(password);
      return settingsCenterAdminUsername;
    } finally {
      setSettingsCenterApplying(false);
    }
  };

  const enterSettingsCenterFromPrompt = async () => {
    setIsSettingsCenterRequiredPromptOpen(false);
    try {
      await inspectInstallationState(runtimeDir);
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e));
    }
  };

  const finishSettingsCenterAndReturnToLauncher = async () => {
    setIsSettingsCenterCompletedPromptOpen(false);
    setInitialSettingsRequired(false);
    try {
      await inspectInstallationState(runtimeDir);
      await refreshStatus();
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e));
    }
  };

  const handleFinalizeSettingsCenter = async () => {
    setConfigBusy(true);
    try {
      // Enforce the same structured validation model used by "Test".
      const errors = await safeInvoke<ConfigError[]>('test_config', { content: configContent });
      if (errors.length > 0) {
        toast.error(t('launcher.messages.config_test_failed'));
        setConfigErrors(errors);
        setConfigSummary(t('launcher.messages.config_test_failed'));
        setConfigSummaryLevel('error');
        return;
      }

      setConfigErrors([]);

      await handleApplySettingsCenter(pendingAdminPassword);
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e));
      setConfigSummary(extractErrorMessage(e));
      setConfigSummaryLevel('error');
    } finally {
      setConfigBusy(false);
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'Running': return t('launcher.status.running');
      case 'Stopped': return t('launcher.status.stopped');
      case 'Checking...': return t('launcher.status.checking');
      default: return t('launcher.status.unknown');
    }
  };

  const settingsCenterFinalMessage =
    (settingsCenterAdminAction === 'created_default'
      ? t('setup.final.adminCreatedDefault', { user: settingsCenterAdminUsername, password: settingsCenterPasswordHint || 'admin888' })
      : settingsCenterAdminAction === 'created_with_password'
        ? t('setup.final.adminCreatedWithPassword', { user: settingsCenterAdminUsername, password: settingsCenterPasswordHint || '' })
        : settingsCenterAdminAction === 'reset_password'
          ? t('setup.final.adminReset', { user: settingsCenterAdminUsername, password: settingsCenterPasswordHint || '' })
          : settingsCenterAdminAction === 'existing_admin'
            ? t('setup.final.adminExisting', { user: settingsCenterAdminUsername })
            : '');

  // Format uptime
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (initialSettingsRequired) {
    return (
      <>
        <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-[#020817] dark:via-[#0a0f1d] dark:to-[#0f172a] text-slate-900 dark:text-[#f8fafc] flex flex-col overflow-y-auto overscroll-contain touch-pan-y">
          <div className="flex-1 min-h-0 p-3 pt-[calc(1rem+var(--safe-area-top))] pb-[calc(1rem+var(--safe-area-bottom))] sm:p-6 sm:pt-[calc(1.25rem+var(--safe-area-top))] lg:p-8 lg:pt-[calc(1.5rem+var(--safe-area-top))]">
            <div className="max-w-6xl mx-auto space-y-4">
                <SettingWorkbenchSurface
                  title={t('admin.config.title')}
                  configPath={configFilePath}
                  configPathAction={<ConfigPathActionButton onClick={() => { void handleSettingsCenterRuntimeAction(); }} label={t(['setup.guide.card1Action', 'launcher.modify_runtime_dirs'])} />}
                  headerExtras={<SettingSurfaceControls compact={true} />}
                  settingActions={settingActions}
                testAction={{
                  label: t('setup.editor.check'),
                  onClick: () => { void handleTestConfig(); },
                  disabled: configBusy || settingsCenterApplying,
                }}
                primaryAction={{
                  label: t('setup.guide.card3Action'),
                  onClick: () => { void handleFinalizeSettingsCenter(); },
                  disabled: configBusy || settingsCenterApplying,
                }}
                workbenchProps={{
                  tomlAdapter: toml,
                  loading: configFetching,
                  configPath: configFilePath,
                  content: configContent,
                  savedContent: savedConfigContent,
                  notes: configNotes,
                  validationErrors: configErrors,
                  busy: configBusy,
                  onChange: setConfigContent,
                  onTest: handleTestConfig,
                  onSave: handleFinalizeSettingsCenter,
                  saveLabel: t('setup.admin.finish'),
                  onCancel: handleResetToSavedConfig,
                  allowSaveWithoutChanges: true,
                  forceEnableSave: true,
                  editorTitle: t('setup.editor.title'),
                  testLabel: t('setup.editor.check'),
                  onClearValidationErrors: () => setConfigErrors([]),
                  showCancel: false,
                  reloadSummary: configSummary,
                  reloadSummaryLevel: configSummaryLevel,
                  runtimeOs: osInfo?.os_type,
                  systemHardware: osInfo,
                  onDiagnoseExternalTools: handleDiagnoseExternalTools,
                  ...(osInfo?.is_mobile ? { onPickStorageDirectory: pickExternalStorageDirectory } : {}),
                }}
              />
            </div>
          </div>

          {isSettingsCenterCompletedPromptOpen && (
            <div className="fixed inset-0 z-[160] bg-black/70 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true">
              <div className="w-full max-w-md rounded-3xl border border-emerald-300/40 bg-white/95 dark:bg-slate-900/95 shadow-2xl overflow-hidden flex flex-col min-h-0 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]">
                <div className="px-6 py-5 border-b border-slate-200/70 dark:border-slate-700/60 shrink-0">
                  <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                    {t('setup.final.title')}
                  </h2>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5">
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {settingsCenterFinalMessage || t('setup.final.subtitle', { user: settingsCenterAdminUsername })}
                  </p>
                  <div className="mt-4 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700/60 dark:bg-slate-950/40">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      {t('setup.final.nextSteps')}
                    </p>
                    <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                      {[1, 2, 3].map((i) => (
                        <p key={i}>{i}. {t(`setup.final.step${i}`)}</p>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="px-6 py-5 border-t border-slate-200/70 dark:border-slate-700/60 flex flex-col gap-3 bg-slate-50/80 dark:bg-slate-950/40 shrink-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => { void handleStart(); }}
                      disabled={loading || status === 'Running'}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition-all"
                    >
                      {status === 'Running' ? t('setup.final.started') : t('setup.final.startNow')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { void handleOpenWebUiFromSettingsCenterCompleted(); }}
                      disabled={loading}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold border border-cyan-300 text-cyan-700 hover:bg-cyan-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-cyan-500/30 dark:text-cyan-200 dark:hover:bg-cyan-500/10 transition-all"
                    >
                      {t('setup.final.openWebUi')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { void finishSettingsCenterAndReturnToLauncher(); }}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 transition-all"
                    >
                      {t('setup.final.finishLater')}
                    </button>
                  </div>
                  <p className="text-xs leading-5 text-slate-500 dark:text-slate-400 sm:text-right">
                    {status === 'Running' ? t('setup.final.runningHint') : t('setup.final.openHint')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <ConfigSelector
            isOpen={showConfigSelector}
            onRuntimeDirSelected={handleRuntimeDirSelected}
            canClose={true}
            currentValue={{
              runtimeDir: displayedRuntimeDir === '...' ? '' : displayedRuntimeDir,
            }}
            presets={runtimeDirPresets}
            onClose={() => setShowConfigSelector(false)}
          />
        </div>
        <ToastI18nContext.Provider value={toastI18n}>
          <ToastContainer />
        </ToastI18nContext.Provider>
      </>
    );
  }

  return (
    <>
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-[#020817] dark:via-[#0a0f1d] dark:to-[#0f172a] text-slate-900 dark:text-[#f8fafc] flex flex-col items-stretch justify-start font-sans transition-colors duration-500 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-[800px] h-[800px] bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -left-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-500/10 via-pink-500/5 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main container */}
      <div className="w-full h-full bg-white/80 dark:bg-[#0f172a]/90 backdrop-blur-xl border-0 sm:border-0 shadow-none relative flex flex-col overflow-hidden">

        {/* Glassmorphism header */}
        <div className="flex items-center justify-between px-6 pb-6 pt-[calc(1.5rem+var(--safe-area-top))] sm:px-8 sm:pb-8 sm:pt-[calc(2rem+var(--safe-area-top))] border-b border-slate-200/50 dark:border-slate-800/40 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <img src="/favicon.svg" alt="FileUni Logo" width={56} height={56} className="shadow-xl shadow-cyan-500/20 shrink-0 transform group-hover:scale-110 transition-all duration-500 ease-out" />
              {/* Status indicator */}
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white dark:border-slate-900 shadow-sm ${status === 'Running' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight truncate bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                {t('launcher.title')}
              </h1>
              <p className="hidden sm:block text-slate-500 dark:text-slate-400 font-bold text-sm tracking-widest uppercase mt-1 opacity-80">
                {t('launcher.subtitle')} • v{version}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Stats */}
            {status === 'Running' && (
              <div className="hidden lg:flex items-center mr-6 px-5 py-2.5 bg-slate-100/80 dark:bg-slate-800/40 rounded-2xl text-sm font-bold border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-mono">
                  <Zap size={14} className="text-amber-500" /> {formatUptime(uptime)}
                </span>
              </div>
            )}

            <SettingSurfaceControls compact={true} />
            <button
              type="button"
              onClick={() => setIsAboutOpen(true)}
              className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-all border border-slate-200/50 dark:border-slate-700/50 hover:shadow-lg hover:scale-105 active:scale-95"
              title={t('about.open')}
            >
              <Info size={20} />
            </button>
          </div>
        </div>

         {/* Scrollable Content */}
         <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-10 space-y-6">
            <div className="flex flex-col gap-6">
                {/* Top section: Service Control + Quick Actions side by side */}
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                  <div className="flex-1 w-full space-y-6">
                    <div className="relative z-20 group">
                      <ServiceControlPanel
                        isRunning={status === 'Running'}
                        isLoading={loading}
                        supportService={Boolean(osInfo?.support_service)}
                        statusLabel={getStatusText()}
                        title={t('launcher.service_control')}
                        description={t('launcher.service_control_desc')}
                        startLabel={t('launcher.start_service')}
                        stopLabel={t('launcher.stop_service')}
                        systemIntegrationLabel={t('launcher.system_integration')}
                        installLabel={t('launcher.install')}
                        uninstallLabel={t('launcher.uninstall')}
                        installLevelLabel={t('launcher.install_level')}
                        installLevelSystemLabel={t('launcher.install_level_system')}
                        installLevelUserLabel={t('launcher.install_level_user')}
                        installAutostartLabel={t('launcher.install_autostart')}
                        installLevel={serviceInstallLevel}
                        installAutostart={serviceAutostart}
                        onToggleService={() => {
                          if (status === 'Running') {
                            void handleStop();
                          } else {
                            void handleStart();
                          }
                        }}
                        onInstall={() => {
                          void handleInstall();
                        }}
                        onUninstall={() => {
                          void handleUninstall();
                        }}
                        onInstallLevelChange={(level) => {
                          setServiceInstallLevel(level);
                          persistServiceInstallOptions(level, serviceAutostart);
                        }}
                        onInstallAutostartChange={(enabled) => {
                          setServiceAutostart(enabled);
                          persistServiceInstallOptions(serviceInstallLevel, enabled);
                        }}
                      />
                    </div>

                    {isTauriRuntime() && (
                      <div className="bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 backdrop-blur-sm group hover:border-blue-500/40 transition-all duration-300">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-blue-500/10 transition-colors">
                            <FileText size={18} className="text-slate-400 group-hover:text-blue-500" />
                          </div>
                          <div className="min-w-0 space-y-3">
                            <div className="text-sm font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('launcher.runtime_paths')}</div>
                            <div className="text-sm font-mono text-slate-600 dark:text-slate-300 break-all">
                              {displayedRuntimeDir}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (isServiceRunning) {
                              toast.warning(t('launcher.messages.stop_service_before_dirs'));
                              return;
                            }
                            setShowConfigSelector(true);
                          }}
                          disabled={isServiceRunning}
                          className={`px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 text-sm font-bold transition-all shrink-0 shadow-sm self-start ${isServiceRunning
                            ? 'bg-slate-100/60 dark:bg-slate-800/50 cursor-not-allowed'
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-blue-500 hover:text-white'
                          }`}
                          title={isServiceRunning ? t('launcher.messages.stop_service_before_dirs') : undefined}
                        >
                          {t('launcher.modify_runtime_dirs')}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="w-full lg:w-72 shrink-0">
                    <QuickActionsPanel
                      title={t('launcher.quick_actions')}
                      openWebUiLabel={t('launcher.open_web_ui')}
                      configLabel={t('launcher.config')}
                      openRuntimeDirLabel={t('launcher.open_runtime_dir')}
                      editConfigLabel={t('launcher.edit_config')}
                      helpLabel={t('launcher.help')}
                      aboutLabel={t('about.open')}
                      configDisabled={isServiceRunning}
                      configDisabledHint={t('launcher.messages.stop_service_before_config')}
                      onConfigDisabled={() => toast.warning(t('launcher.messages.stop_service_before_config'))}
                      onOpenWebUi={handleOpenWebUI}
                      onOpenRuntimeDir={handleOpenRuntimeDir}
                      onEditConfig={handleEditConfig}
                      onOpenAbout={() => setIsAboutOpen(true)}
                      showSettingsCenterAction={false}
                    />
                  </div>
                </div>

                {/* Bottom section: Log Viewer - full width */}
                <LogViewer
                  logs={logs}
                  onClear={() => setLogs([])}
                  maxHeight="280px"
                  title={t('launcher.system_logs')}
                  className="shadow-inner"
                />
              </div>
         </div>

          {/* Footer */}
          <div className="flex justify-center items-center pt-6 pb-[calc(1.5rem+var(--safe-area-bottom))] border-t border-slate-200/50 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-8 text-sm text-slate-400 dark:text-slate-500 font-bold tracking-widest uppercase opacity-70">
              <span className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
                {t('launcher.footer_product')} v{version}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="hidden sm:inline hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-default">{t('launcher.footer_build')}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                {t('launcher.footer_ready')}
              </span>
            </div>
          </div>
        </div>


      {/* Config Selector Modal */}
      <ConfigSelector
        isOpen={showConfigSelector}
        onRuntimeDirSelected={handleRuntimeDirSelected}
        canClose={true}
        currentValue={{
          runtimeDir: displayedRuntimeDir === '...' ? '' : displayedRuntimeDir,
        }}
        presets={runtimeDirPresets}
        onClose={() => setShowConfigSelector(false)}
      />

      {missingConfigPrompt && (
        <div className="fixed inset-0 z-[130] bg-black/70 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200/70 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/95 shadow-2xl overflow-hidden flex flex-col min-h-0 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]">
            <div className="px-6 py-5 border-b border-slate-200/70 dark:border-slate-700/60 shrink-0">
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                {t('launcher.runtime_config_missing_title')}
              </h2>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5 space-y-4">
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t('launcher.runtime_config_missing_prompt', { path: missingConfigPrompt.configPath })}
              </p>
              <div className="rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 px-4 py-3 text-sm font-mono break-all text-slate-700 dark:text-slate-200">
                {missingConfigPrompt.configPath}
              </div>
            </div>
            <div className="px-6 py-5 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-end gap-3 bg-slate-50/80 dark:bg-slate-950/40 shrink-0">
              <button
                type="button"
                onClick={() => closeMissingConfigPrompt(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
              >
                {t('launcher.runtime_config_missing_reject')}
              </button>
              <button
                type="button"
                onClick={() => closeMissingConfigPrompt(true)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 shadow-lg shadow-blue-500/25 transition-all"
              >
                {t('launcher.runtime_config_missing_accept')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSettingsCenterRequiredPromptOpen && (
        <div className="fixed inset-0 z-[140] bg-black/70 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-3xl border border-amber-300/40 bg-white/95 dark:bg-slate-900/95 shadow-2xl overflow-hidden flex flex-col min-h-0 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]">
            <div className="px-6 py-5 border-b border-slate-200/70 dark:border-slate-700/60 shrink-0">
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                {t('setup.center.title')}
              </h2>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5 space-y-4">
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t('setup.guide.requiredPrompt')}
              </p>
              {initialSettingsStatus && (
                <div className="space-y-3">
                  <div className="mt-1 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 px-4 py-3 text-sm font-mono break-all text-slate-700 dark:text-slate-200">
                    {initialSettingsStatus.runtime_dir}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-5 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-end gap-3 bg-slate-50/80 dark:bg-slate-950/40 shrink-0">
              <button
                type="button"
                onClick={() => setIsSettingsCenterRequiredPromptOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => { void enterSettingsCenterFromPrompt(); }}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/25 transition-all"
              >
                {t('launcher.settings_center')}
              </button>
            </div>
          </div>
        </div>
      )}

      <VersionUpgradeModal
        isOpen={isVersionUpgradePromptOpen}
        status={versionUpgradeStatus}
        busy={versionUpgradeBusy}
        onClose={() => setIsVersionUpgradePromptOpen(false)}
        onConfirm={() => {
          void handleRunVersionUpgrade();
        }}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        currentVersion={version}
        versionCode={versionCode}
        showCheckUpdates={true}
        isCheckingUpdates={isCheckingAboutUpdates}
        updateInfo={aboutUpdateInfo}
        updateError={aboutUpdateError}
        onCheckUpdates={handleCheckAboutUpdates}
        getUpdateGuideUrl={(info, updateInfo) =>
          buildAboutUpdateGuideUrl(updateGuideBaseUrl, info, updateInfo)
        }
        onOpenLink={(url) => {
          void handleOpenExternalLink(url);
        }}
      />

      {isEditingConfig && (
        <div className="fixed inset-0 z-[120] bg-black/78 p-2 sm:p-4">
          <SettingWorkbenchSurface
            title={t('launcher.edit_config')}
            configPath={configFilePath}
            configPathAction={<ConfigPathActionButton onClick={() => { void handleSettingsCenterRuntimeAction(); }} label={t(['setup.guide.card1Action', 'launcher.modify_runtime_dirs'])} />}
            headerExtras={<SettingSurfaceControls compact={true} />}
            onClose={handleCloseConfigEditor}
            closeAriaLabel={t('common.close')}
            settingActions={settingActions}
            testAction={{
              label: t('setup.editor.check'),
              onClick: () => { void handleTestConfig(); },
              disabled: configBusy,
            }}
            primaryAction={{
              label: t('launcher.save_config'),
              onClick: () => { void handleSaveConfig(); },
              disabled: configBusy,
            }}
            workbenchProps={{
              tomlAdapter: toml,
              loading: configFetching,
              configPath: configFilePath,
              content: configContent,
              savedContent: savedConfigContent,
              notes: configNotes,
              validationErrors: configErrors,
              busy: configBusy,
              onChange: setConfigContent,
              onTest: handleTestConfig,
              onSave: handleSaveConfig,
              saveLabel: t('launcher.save_config'),
              onCancel: handleResetToSavedConfig,
              onClearValidationErrors: () => setConfigErrors([]),
              showCancel: false,
              reloadSummary: configSummary,
              reloadSummaryLevel: configSummaryLevel,
              runtimeOs: osInfo?.os_type,
              systemHardware: osInfo,
              onDiagnoseExternalTools: handleDiagnoseExternalTools,
              onResetAdminPassword: handleResetAdminPassword,
              isResettingAdminPassword: resettingAdminPassword,
              ...(osInfo?.is_mobile ? { onPickStorageDirectory: pickExternalStorageDirectory } : {}),
              quickWizardLicense: {
                isValid: Boolean(licenseStatus?.is_valid),
                ...(licenseStatus?.msg ? { msg: licenseStatus.msg } : {}),
                currentUsers: licenseStatus?.current_users ?? 0,
                maxUsers: licenseStatus?.max_users ?? 0,
                deviceCode: licenseStatus?.device_code ?? '',
                ...(licenseStatus?.hw_id ? { hwId: licenseStatus.hw_id } : {}),
                ...(licenseStatus?.aux_id ? { auxId: licenseStatus.aux_id } : {}),
                expiresAt: licenseStatus?.expires_at ?? null,
                features: licenseStatus?.features ?? [],
                licenseKey,
                saving: licenseSaving,
                onLicenseKeyChange: setLicenseKey,
                onApplyLicense: () => {
                  void handleUpdateLicenseKey();
                },
              },
            }}
          />
        </div>
      )}
    </div>

    {/* Toast Container - placed at outermost layer to ensure correct display */}
    <ToastI18nContext.Provider value={toastI18n}>
      <ToastContainer />
    </ToastI18nContext.Provider>
    </>
  );
}

export default Launcher;
