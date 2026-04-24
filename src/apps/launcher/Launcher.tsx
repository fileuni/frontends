import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import * as toml from "smol-toml";
import { Zap, FileText, Info } from "lucide-react";
import {
  AboutModal,
  buildAboutUpdateGuideUrl,
  type AboutUpdateInfo,
} from "@/components/modals/AboutModal";
import { ToastContainer, ToastI18nContext } from "@/components/ui/Toast";
import { toast } from "@/stores/toast";
import { useThemeStore, applyTheme } from "@/stores/theme";
import { useLanguageStore } from "@/stores/language";
import type {
  ConfigError,
  ConfigNoteEntry,
} from "@/components/setting/ConfigRawEditor";
import { SettingWorkbenchSurface } from "@/components/setting/SettingWorkbenchSurface";
import { SettingSurfaceControls } from "@/components/setting/SettingSurfaceControls";
import { ConfigPathActionButton } from "@/components/setting/ConfigPathActionButton";
import { GlassModalShell } from "@fileuni/ts-shared/modal-shell";
import { PasswordInput } from "@/components/common/PasswordInput";
import { useEscapeToCloseTopLayer } from "@/hooks/useEscapeToCloseTopLayer";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import {
  buildSettingCommonActions,
} from "@/components/setting/SettingCommonActions";
import { AUTO_LANGUAGE_PREFERENCE, buildLocaleUrl } from "@/i18n/core";
import { createTauriSettingCommonCapabilityHandlers } from "@/components/setting/settingCommonCapabilityAdapters";
import {
  type ConfigWorkbenchLicenseStatus,
  useConfigWorkbenchController,
} from "@/components/setting/useConfigWorkbenchController";
import { LogViewer, type LogEntry } from "@/apps/launcher/components/LogViewer";
import { QuickActionsPanel } from "@/apps/launcher/components/QuickActionsPanel";
import {
  ServiceControlPanel,
  type ServiceInstallLevel,
} from "@/apps/launcher/components/ServiceControlPanel";
import { useConfigStore } from "./stores/config";
import "@/lib/i18n";
import ConfigSelector from "./ConfigSelector";
import { isTauriRuntime, safeInvoke, safeListen } from "./tauri";

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

type LicenseStatusPayload = ConfigWorkbenchLicenseStatus;

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

interface InstallationStatus {
  runtime_dir: string;
  config_path: string;
  config_exists: boolean;
}

interface RuntimeInitializationResult {
  runtime_dir: string;
  config_path: string;
  config_created: boolean;
  admin_username?: string | null;
  admin_password?: string | null;
  users_table_preexisting: boolean;
}

interface FirstAdminInfo {
  username?: string | null;
}

interface ResetAdminPasswordResult {
  username: string;
  action: string;
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
  const isDark = useResolvedTheme() === "dark";
  const { language } = useLanguageStore();
  const { runtimeDir, setRuntimeDir } = useConfigStore();

  // Toast i18n
  const toastI18n = React.useMemo(
    () => ({
      doNotShowAgain: t("launcher.do_not_show_again"),
      viewDetails: t("launcher.view_details"),
      hideDetails: t("launcher.hide_details"),
      copy: t("launcher.copy"),
    }),
    [t],
  );

  const [status, setStatus] = useState<string>("Checking...");
  const [version, setVersion] = useState<string>("0.0.0");
  const [versionCode, setVersionCode] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [osInfo, setOsInfo] = useState<OSInfo | null>(null);

  // Log related state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [uptime, setUptime] = useState(0);

  // Config selector state
  const [showConfigSelector, setShowConfigSelector] = useState(false);

  const [serviceInstallLevel, setServiceInstallLevel] =
    useState<ServiceInstallLevel>("system");
  const [serviceAutostart, setServiceAutostart] = useState(true);
  const updateGuideBaseUrl =
    language === AUTO_LANGUAGE_PREFERENCE
      ? "https://fileuni.com/update"
      : buildLocaleUrl("https://fileuni.com", language, "/update");

  // Config editor state
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [configBusy, setConfigBusy] = useState(false);

  const {
    loading: configFetching,
    setLoading: setConfigFetching,
    configPath: configFilePath,
    setConfigPath: setConfigFilePath,
    content: configContent,
    setContent: setConfigContent,
    savedContent: savedConfigContent,
    setSavedContent: setSavedConfigContent,
    notes: configNotes,
    validationErrors: configErrors,
    setValidationErrors: setConfigErrors,
    clearValidationErrors: clearConfigErrors,
    saveSummary: configSummary,
    saveSummaryLevel: configSummaryLevel,
    setSummary: setConfigSummary,
    clearSaveSummary: clearConfigSummary,
    refreshLicenseStatus,
    applyWorkbenchData,
    resetToSaved: resetWorkbenchToSaved,
    settingLicenseBinding,
    quickSettingsLicense,
  } = useConfigWorkbenchController<LicenseStatusPayload>({
    initialLoading: false,
    loadLicenseStatus: async () => {
      if (!isTauriRuntime()) {
        return null;
      }
      try {
        return await safeInvoke<LicenseStatusPayload>("get_license_status");
      } catch (error: unknown) {
        const message = extractErrorMessage(error);
        if (
          message.includes("RUNTIME_INIT_REQUIRED") ||
          message.includes("missing config file")
        ) {
          return null;
        }
        console.error("Failed to load license status:", error);
        return null;
      }
    },
    updateLicense: async (update) => {
      await safeInvoke<void>("update_license_key", { update });
      toast.success(t("admin.saveSuccess"));
      const nextStatus = await safeInvoke<LicenseStatusPayload>("get_license_status");
      return {
        licenseStatus: nextStatus,
        clearLicenseKey: true,
      };
    },
    onLicenseError: async (error) => {
      await toast.error(extractErrorMessage(error));
    },
  });

  const [runtimeDirPresets, setRuntimeDirPresets] =
    useState<RuntimeDirPresets | null>(null);
  const [pendingAdminPassword, setPendingAdminPassword] = useState("");
  const [pendingAdminUsername, setPendingAdminUsername] = useState("admin");
  const [isAdminResetOpen, setIsAdminResetOpen] = useState(false);
  const [isAdminResetting, setIsAdminResetting] = useState(false);
  const [initializationResult, setInitializationResult] =
    useState<RuntimeInitializationResult | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [aboutUpdateInfo, setAboutUpdateInfo] =
    useState<AboutUpdateInfo | null>(null);
  const [aboutUpdateError, setAboutUpdateError] = useState<string | null>(null);
  const [isCheckingAboutUpdates, setIsCheckingAboutUpdates] = useState(false);
  const isServiceRunning = status === "Running";
  const displayedRuntimeDir =
    runtimeDir ?? runtimeDirPresets?.default_runtime_dir ?? "...";
  const suspendLogUpdatesRef = useRef(false);
  const handleStartRef = useRef<(() => Promise<boolean>) | null>(null);
  const handleStopRef = useRef<(() => Promise<void>) | null>(null);

  const inspectRuntimeDir = useCallback(
    async (nextRuntimeDir?: string | null) => {
      return safeInvoke<RuntimeDirInspection>("inspect_runtime_dir", {
        runtimeDir: nextRuntimeDir ?? "",
      });
    },
    [],
  );

  const bindRuntimeDir = useCallback(
    async (nextRuntimeDir?: string | null) => {
      const inspected = await inspectRuntimeDir(nextRuntimeDir);
      await safeInvoke<void>("set_runtime_dir", {
        runtimeDir: inspected.runtime_dir,
      });
      setRuntimeDir(inspected.runtime_dir);
      setConfigFilePath(inspected.config_path);
      return inspected;
    },
    [inspectRuntimeDir, setConfigFilePath, setRuntimeDir],
  );

  const ensureRuntimeConfigReady = async () => {
    try {
      const inspected = await bindRuntimeDir(runtimeDir);
      if (inspected.config_exists) {
        return inspected;
      }

      const accepted = window.confirm(
        t("launcher.runtime_config_missing_prompt", {
          path: inspected.config_path,
        }),
      );
      if (!accepted) {
        return null;
      }

      const initialized = await safeInvoke<RuntimeInitializationResult>(
        "ensure_runtime_config",
        {
          runtimeDir: inspected.runtime_dir,
        },
      );
      await safeInvoke<void>("set_runtime_dir", {
        runtimeDir: initialized.runtime_dir,
      });
      setRuntimeDir(initialized.runtime_dir);
      setConfigFilePath(initialized.config_path);
      setInitializationResult(initialized);
      setPendingAdminUsername(initialized.admin_username?.trim() || "admin");
      return {
        runtime_dir: initialized.runtime_dir,
        config_path: initialized.config_path,
        config_exists: true,
        runtime_dir_exists: true,
      };
    } catch (error) {
      toast.error(extractErrorMessage(error));
      return null;
    }
  };

  const pickExternalStorageDirectory =
    async (): Promise<PickedDirectory | null> => {
      try {
        const picked = await safeInvoke<PickedDirectory>(
          "plugin:yh-tauri-storage-picker|pick_directory",
        );
        return picked;
      } catch (error: unknown) {
        toast.error(extractErrorMessage(error));
        return null;
      }
    };

  const readWorkbenchData = useCallback(
    async (
      command: "get_config_content" | "get_config_template_content",
    ) => {
      const [content, notes] = await Promise.all([
        safeInvoke<string>(command),
        safeInvoke<Record<string, ConfigNoteEntry>>("get_config_notes"),
      ]);
      return {
        configPath: configFilePath,
        content,
        notes,
        runtimeOs: osInfo?.os_type ?? "",
        systemHardware: osInfo,
      };
    },
    [configFilePath, osInfo],
  );

  const inspectRuntimeState = useCallback(
    async (nextRuntimeDir?: string | null) => {
      const inspected = await inspectRuntimeDir(nextRuntimeDir);
      const status = await safeInvoke<InstallationStatus>(
        "inspect_installation_status",
        {
          runtimeDir: inspected.runtime_dir,
        },
      );
      setConfigFilePath(status.config_path);

      if (status.config_exists) {
        const adminInfo = await safeInvoke<FirstAdminInfo>("get_first_admin_info");
        setPendingAdminUsername(adminInfo.username?.trim() || "admin");
      }
      return status;
    },
    [inspectRuntimeDir, setConfigFilePath],
  );

  const bindRuntimeDirRef = useRef(bindRuntimeDir);
  const inspectRuntimeStateRef = useRef(inspectRuntimeState);

  useEffect(() => {
    bindRuntimeDirRef.current = bindRuntimeDir;
  }, [bindRuntimeDir]);

  useEffect(() => {
    inspectRuntimeStateRef.current = inspectRuntimeState;
  }, [inspectRuntimeState]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const raw = window.localStorage.getItem(
      "fileuni-gui-service-install-options",
    );
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as {
        level?: ServiceInstallLevel;
        autostart?: boolean;
      };
      if (parsed.level === "system" || parsed.level === "user") {
        setServiceInstallLevel(parsed.level);
      }
      if (typeof parsed.autostart === "boolean") {
        setServiceAutostart(parsed.autostart);
      }
    } catch {
      // Ignore invalid cached payload
    }
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) {
      setStatus("Unknown");
      return () => {};
    }

    let cancelled = false;

    const loadRuntimeDir = async (attempt: number) => {
      try {
        const inspected = await bindRuntimeDirRef.current(runtimeDir);
        await inspectRuntimeStateRef.current(inspected.runtime_dir);
      } catch (error) {
        if (!cancelled && attempt < 5) {
          window.setTimeout(() => {
            void loadRuntimeDir(attempt + 1);
          }, 300);
          return;
        }
        try {
          const defaults = await safeInvoke<RuntimeDirPayload>(
            "get_default_runtime_dir",
          );
          const inspected = await bindRuntimeDirRef.current(defaults.runtime_dir);
          await inspectRuntimeStateRef.current(inspected.runtime_dir);
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
  }, [runtimeDir]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    safeInvoke<RuntimeDirPresets>("get_runtime_dir_presets")
      .then((presets) => {
        setRuntimeDirPresets(presets);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    suspendLogUpdatesRef.current =
      isEditingConfig || showConfigSelector || isAdminResetOpen;
  }, [isAdminResetOpen, isEditingConfig, showConfigSelector]);

  const handleRuntimeDirSelected = async (nextRuntimeDir: string) => {
    try {
      const inspected = await bindRuntimeDir(nextRuntimeDir);
      await inspectRuntimeState(inspected.runtime_dir);
      setIsEditingConfig(false);
      setShowConfigSelector(false);
      toast.success(t("launcher.messages.config_set_success"));
    } catch (e: unknown) {
      toast.error(String(e));
    }
  };

  const handleEditConfig = async () => {
    const ready = await ensureRuntimeConfigReady();
    if (!ready) {
      return;
    }
    setIsEditingConfig(true);
    setConfigFetching(true);
    try {
      applyWorkbenchData(await readWorkbenchData("get_config_content"));
      await refreshLicenseStatus();
    } catch (e: unknown) {
      toast.error(String(e));
      setIsEditingConfig(false);
    } finally {
      setConfigFetching(false);
    }
  };

  const handleSaveConfig = async () => {
    setConfigBusy(true);
    try {
      // Always validate with structured errors first so users can jump to the exact line.
      const errors = await safeInvoke<ConfigError[]>("test_config", {
        content: configContent,
      });
      if (errors.length > 0) {
        toast.error(t("launcher.messages.config_test_failed"));
        setConfigErrors(errors);
        setConfigSummary(t("launcher.messages.config_test_failed"), "error");
        return;
      }

      clearConfigErrors();

      // GUI config editing happens while the service is stopped.
      // Persist to disk; changes take effect on next start.
      await safeInvoke<void>("save_config", { content: configContent });
      toast.success(t("launcher.messages.config_saved"));
      setSavedConfigContent(configContent);
      setConfigSummary(t("launcher.messages.config_saved"), "success");
      clearConfigErrors();
    } catch (e: unknown) {
      toast.error(String(e));
      setConfigSummary(String(e), "error");
    }
    setConfigBusy(false);
  };

  const handleSettingsCenterRuntimeAction = async () => {
    if (!isTauriRuntime()) {
      await toast.info(
        "CLI: restart FileUni with --runtime-dir <path> to change the runtime directory.",
        { duration: "long" },
      );
      return;
    }

    if (isServiceRunning) {
      await toast.warning(t("launcher.messages.stop_service_before_dirs"));
      return;
    }

    setShowConfigSelector(true);
  };

  const sharedCapabilities = React.useMemo(
    () =>
      createTauriSettingCommonCapabilityHandlers({
        t,
        invoke: safeInvoke,
        addSuccessToast: toast.success,
        addErrorToast: toast.error,
        formatError: extractErrorMessage,
      }),
    [t],
  );

  const settingActions = buildSettingCommonActions({
    sharedCapabilities,
    t,
    isDark,
    tomlAdapter: toml,
    content: configContent,
    onContentChange: setConfigContent,
    runtimeOs: osInfo?.os_type,
    systemHardware: osInfo,
    adminPassword: {
      value: pendingAdminPassword,
      onValueChange: setPendingAdminPassword,
      hint: t("systemConfig.setup.admin.resetRuleHint"),
    },
    ...(settingLicenseBinding ? { license: settingLicenseBinding } : {}),
    storage: {
      onPrimaryAction: () => {
        void handleSaveConfig();
      },
      primaryActionLabel: t("launcher.save_config"),
    },
  });

  const validatePendingAdminPassword = useCallback(() => {
    const trimmed = pendingAdminPassword.trim();
    if (trimmed.length === 0) {
      return null;
    }
    if (trimmed.length < 8) {
      return t([
        "systemConfig.setup.admin.passwordTooShort",
        "launcher.messages.password_too_short",
      ]);
    }
    return null;
  }, [pendingAdminPassword, t]);

  const handleTestConfig = async () => {
    setConfigBusy(true);
    try {
      const errors = await safeInvoke<ConfigError[]>("test_config", {
        content: configContent,
      });
      if (errors.length === 0) {
        toast.success(t("launcher.messages.config_test_passed"));
        clearConfigErrors();
        clearConfigSummary();
      } else {
        toast.error(t("launcher.messages.config_test_failed"));
        setConfigErrors(errors);
        setConfigSummary(t("launcher.messages.config_test_failed"), "error");
      }
    } catch (e: unknown) {
      toast.error(String(e));
      setConfigSummary(String(e), "error");
    }
    setConfigBusy(false);
  };

  useEffect(() => {
    let unlistenServiceAction: (() => void) | null = null;
    let unlistenLogs: (() => void) | null = null;

    const init = async () => {
      if (!isTauriRuntime()) {
        return;
      }

      try {
        const response =
          await safeInvoke<ServiceStatusResponse>("get_service_status");
        setStatus(response.status);
      } catch (error: unknown) {
        console.error(error);
        setStatus("Unknown");
      }

      try {
        const nextVersion = await safeInvoke<string>("get_app_version");
        setVersion(nextVersion);
      } catch (error: unknown) {
        console.error(error);
      }

      try {
        const nextVersionCode = await safeInvoke<number | null>(
          "get_android_version_code",
        );
        setVersionCode(nextVersionCode);
      } catch (error: unknown) {
        console.error(error);
        setVersionCode(null);
      }

      try {
        const info = await safeInvoke<OSInfo>("get_os_info");
        setOsInfo(info);
      } catch (error: unknown) {
        console.error(error);
      }

      unlistenServiceAction = await safeListen<string>(
        "service-action",
        (event) => {
          if (event.payload === "start") {
            void handleStartRef.current?.();
          }
          if (event.payload === "stop") {
            void handleStopRef.current?.();
          }
        },
      );

      unlistenLogs = await safeListen<LogEntry[]>("log-update", (event) => {
        const batch = Array.isArray(event.payload) ? event.payload : [];
        if (batch.length === 0 || suspendLogUpdatesRef.current) {
          return;
        }
        setLogs((prev) =>
          prev.length === 0
            ? batch.slice(-1000)
            : [...prev, ...batch].slice(-1000),
        );
      });

      await safeInvoke<void>("subscribe_logs");
    };

    void init().catch(console.error);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      if (useThemeStore.getState().theme === "system") {
        applyTheme("system");
      }
    };
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      unlistenServiceAction?.();
      unlistenLogs?.();
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  useEffect(() => {
    const uptimeInterval = setInterval(() => {
      if (status === "Running") {
        setUptime((prev) => prev + 1);
      }
    }, 1000);

    return () => {
      clearInterval(uptimeInterval);
    };
  }, [status]);

  const refreshStatus = async () => {
    try {
      const response =
        await safeInvoke<ServiceStatusResponse>("get_service_status");
      setStatus(response.status);
    } catch (e: unknown) {
      console.error(e);
      setStatus("Unknown");
    }
  };

  const handleStart = async (): Promise<boolean> => {
    const ready = await ensureRuntimeConfigReady();
    if (!ready) {
      return false;
    }
    setLoading(true);
    try {
      await safeInvoke<string>("start_service");
      toast.success(t("launcher.messages.service_started"));
      await refreshStatus();
      return true;
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await safeInvoke<string>("stop_service");
      toast.success(t("launcher.messages.service_stopped"));
      await refreshStatus();
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e));
    }
    setLoading(false);
  };

  handleStartRef.current = handleStart;
  handleStopRef.current = handleStop;

  const persistServiceInstallOptions = (
    level: ServiceInstallLevel,
    autostart: boolean,
  ) => {
    window.localStorage.setItem(
      "fileuni-gui-service-install-options",
      JSON.stringify({ level, autostart }),
    );
  };

  const handleInstall = async () => {
    if (osInfo?.nixos_hint) {
      toast.warning(
        `${t("launcher.nixos_detected")}\n${t("launcher.nixos_desc")}`,
        {
          duration: "persistent",
          showDoNotShowAgain: true,
        },
      );
      return;
    }
    const ready = await ensureRuntimeConfigReady();
    if (!ready) {
      return;
    }
    setLoading(true);
    try {
      await safeInvoke<string>("install_service", {
        level: serviceInstallLevel,
        autostart: serviceAutostart,
      });
      toast.success(t("launcher.messages.install_requested"));
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e));
    }
    setLoading(false);
  };

  const handleUninstall = async () => {
    setLoading(true);
    try {
      await safeInvoke<string>("uninstall_service");
      toast.success(t("launcher.messages.uninstall_requested"));
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e));
    }
    setLoading(false);
  };

  const handleResetToSavedConfig = () => {
    resetWorkbenchToSaved();
    clearConfigSummary();
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
      await safeInvoke<void>("open_web_ui");
      return true;
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e));
      return false;
    }
  };

  const handleOpenRuntimeDir = async () => {
    try {
      await bindRuntimeDir(runtimeDir);
      await safeInvoke<void>("open_runtime_dir");
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e));
    }
  };

  const handleOpenExternalLink = async (url: string) => {
    if (!isTauriRuntime()) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      await safeInvoke<void>("open_external_url", { url });
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e));
    }
  };

  const handleCheckAboutUpdates = async () => {
    setIsCheckingAboutUpdates(true);
    setAboutUpdateError(null);
    try {
      const payload = await safeInvoke<AboutUpdateInfo>("check_latest_release");
      setAboutUpdateInfo(payload);
    } catch (e: unknown) {
      const message = extractErrorMessage(e);
      setAboutUpdateError(message);
      toast.error(message);
    } finally {
      setIsCheckingAboutUpdates(false);
    }
  };

  const handleResetAdminPassword = async () => {
    const trimmedUsername = pendingAdminUsername.trim();
    const trimmedPassword = pendingAdminPassword.trim();
    if (!trimmedUsername) {
      toast.error(t("common.usernameRegister"));
      return;
    }
    const passwordError = validatePendingAdminPassword();
    if (passwordError || !trimmedPassword) {
      toast.error(passwordError || t("common.password"));
      return;
    }

    setIsAdminResetting(true);
    try {
      const result = await safeInvoke<ResetAdminPasswordResult>(
        "reset_admin_password",
        {
          username: trimmedUsername,
          newPassword: trimmedPassword,
        },
      );
      setPendingAdminPassword("");
      setIsAdminResetOpen(false);
      setPendingAdminUsername(result.username);
      toast.success(t("launcher.reset_admin_password_success"));
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e));
    } finally {
      setIsAdminResetting(false);
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "Running":
        return t("launcher.status.running");
      case "Stopped":
        return t("launcher.status.stopped");
      case "Checking...":
        return t("launcher.status.checking");
      default:
        return t("launcher.status.unknown");
    }
  };

  // Format uptime
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
        <div
          className="fixed inset-0 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-[#020817] dark:via-[#0a0f1d] dark:to-[#0f172a] text-slate-900 dark:text-[#f8fafc] flex flex-col items-stretch justify-start font-sans transition-colors duration-500 overflow-hidden"
          data-testid="launcher-root"
        >
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/2 w-[800px] h-[800px] bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute -bottom-1/2 -left-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-500/10 via-pink-500/5 to-transparent rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
        </div>

        {/* Main container */}
        <div className="w-full h-full bg-white/80 dark:bg-[#0f172a]/90 backdrop-blur-xl border-0 sm:border-0 shadow-none relative flex flex-col overflow-hidden">
          {/* Glassmorphism header */}
          <div className="flex items-center justify-between px-6 pb-6 pt-[calc(1.5rem+var(--safe-area-top))] sm:px-8 sm:pb-8 sm:pt-[calc(2rem+var(--safe-area-top))] border-b border-slate-200/50 dark:border-slate-800/40 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
            <div className="flex items-center gap-5">
              <div className="relative group">
                <img
                  src="/favicon.svg"
                  alt="FileUni Logo"
                  width={56}
                  height={56}
                  className="shadow-xl shadow-cyan-500/20 shrink-0 transform group-hover:scale-110 transition-all duration-500 ease-out"
                />
                {/* Status indicator */}
                <div
                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white dark:border-slate-900 shadow-sm ${status === "Running" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}
                />
              </div>
              <div className="min-w-0">
                <h1
                  className="text-xl sm:text-2xl font-black tracking-tight truncate bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent"
                  data-testid="launcher-title"
                >
                  {t("launcher.title")}
                </h1>
                <p className="hidden sm:block text-slate-500 dark:text-slate-400 font-bold text-sm tracking-widest mt-1 opacity-80">
                  {t("launcher.subtitle")} • v{version}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Stats */}
              {status === "Running" && (
                <div className="hidden lg:flex items-center mr-6 px-5 py-2.5 bg-slate-100/80 dark:bg-slate-800/40 rounded-2xl text-sm font-bold border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-mono">
                    <Zap size={14} className="text-amber-500" />{" "}
                    {formatUptime(uptime)}
                  </span>
                </div>
              )}

              <SettingSurfaceControls compact={true} />
              <button
                type="button"
                onClick={() => setIsAboutOpen(true)}
                className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-all border border-slate-200/50 dark:border-slate-700/50 hover:shadow-lg hover:scale-105 active:scale-95"
                title={t("about.open")}
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
                      isRunning={status === "Running"}
                      isLoading={loading}
                      supportService={Boolean(osInfo?.support_service)}
                      statusLabel={getStatusText()}
                      title={t("launcher.service_control")}
                      description={t("launcher.service_control_desc")}
                      startLabel={t("launcher.start_service")}
                      stopLabel={t("launcher.stop_service")}
                      systemIntegrationLabel={t("launcher.system_integration")}
                      installLabel={t("launcher.install")}
                      uninstallLabel={t("launcher.uninstall")}
                      installLevelLabel={t("launcher.install_level")}
                      installLevelSystemLabel={t(
                        "launcher.install_level_system",
                      )}
                      installLevelUserLabel={t("launcher.install_level_user")}
                      installAutostartLabel={t("launcher.install_autostart")}
                      installLevel={serviceInstallLevel}
                      installAutostart={serviceAutostart}
                      onToggleService={() => {
                        if (status === "Running") {
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
                        persistServiceInstallOptions(
                          serviceInstallLevel,
                          enabled,
                        );
                      }}
                    />
                  </div>

                  {isTauriRuntime() && (
                    <div
                      className="bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 backdrop-blur-sm group hover:border-blue-500/40 transition-all duration-300"
                      data-testid="launcher-runtime-paths"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-blue-500/10 transition-colors">
                          <FileText
                            size={18}
                            className="text-slate-400 group-hover:text-blue-500"
                          />
                        </div>
                        <div className="min-w-0 space-y-3">
                          <div className="text-sm font-black tracking-wider text-slate-400 dark:text-slate-500">
                            {t("launcher.runtime_paths")}
                          </div>
                          <div
                            className="text-sm font-mono text-slate-600 dark:text-slate-300 break-all"
                            data-testid="launcher-runtime-dir"
                          >
                            {displayedRuntimeDir}
                          </div>
                        </div>
                      </div>
                      <button
                        data-testid="launcher-modify-runtime-dir"
                        type="button"
                        onClick={() => {
                          if (isServiceRunning) {
                            toast.warning(
                              t("launcher.messages.stop_service_before_dirs"),
                            );
                            return;
                          }
                          setShowConfigSelector(true);
                        }}
                        disabled={isServiceRunning}
                        className={`px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 text-sm font-bold transition-all shrink-0 shadow-sm self-start ${
                          isServiceRunning
                            ? "bg-slate-100/60 dark:bg-slate-800/50 cursor-not-allowed"
                            : "bg-slate-100 dark:bg-slate-800 hover:bg-blue-500 hover:text-white"
                        }`}
                        title={
                          isServiceRunning
                            ? t("launcher.messages.stop_service_before_dirs")
                            : undefined
                        }
                      >
                        {t("launcher.modify_runtime_dirs")}
                      </button>
                    </div>
                  )}
                </div>

                <div className="w-full lg:w-72 shrink-0">
                  <QuickActionsPanel
                    title={t("launcher.quick_actions")}
                    openWebUiLabel={t("launcher.open_web_ui")}
                    configLabel={t("launcher.config")}
                    openRuntimeDirLabel={t("launcher.open_runtime_dir")}
                    editConfigLabel={t("launcher.edit_config")}
                    helpLabel={t("launcher.help")}
                    aboutLabel={t("about.open")}
                    configDisabled={isServiceRunning}
                    configDisabledHint={t(
                      "launcher.messages.stop_service_before_config",
                    )}
                    onConfigDisabled={() =>
                      toast.warning(
                        t("launcher.messages.stop_service_before_config"),
                      )
                    }
                    onOpenWebUi={handleOpenWebUI}
                    onOpenRuntimeDir={handleOpenRuntimeDir}
                    onEditConfig={handleEditConfig}
                    onResetAdminPassword={() => setIsAdminResetOpen(true)}
                    resetAdminPasswordLabel={t("systemConfig.setup.admin.changePassword")}
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
                title={t("launcher.system_logs")}
                className="shadow-inner"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-center items-center pt-6 pb-[calc(1.5rem+var(--safe-area-bottom))] border-t border-slate-200/50 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-8 text-sm text-slate-400 dark:text-slate-500 font-bold tracking-widest opacity-70">
              <span className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
                {t("launcher.footer_product")} v{version}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="hidden sm:inline hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-default">
                {t("launcher.footer_build")}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                {t("launcher.footer_ready")}
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
            runtimeDir:
              displayedRuntimeDir === "..." ? "" : displayedRuntimeDir,
          }}
          presets={runtimeDirPresets}
          onClose={() => setShowConfigSelector(false)}
        />

        {initializationResult && (
          <GlassModalShell
            title={t("launcher.runtime_config_missing_title")}
            onClose={() => setInitializationResult(null)}
            closeLabel={t("common.close") || "Close"}
            maxWidthClassName="max-w-lg"
            panelClassName="dark text-white"
          >
            <div className="space-y-4">
              <p className="text-sm leading-6 text-slate-300">
                {t("launcher.runtime_config_missing_accept")}
              </p>
              <div className="rounded-2xl bg-slate-800/80 px-4 py-3 text-sm font-mono break-all text-slate-200">
                {initializationResult.config_path}
              </div>
              {initializationResult.admin_username && (
                <div className="rounded-2xl border border-slate-700/60 p-4 space-y-2 text-sm text-slate-200">
                  <p>
                    {initializationResult.users_table_preexisting
                      ? `First admin: ${initializationResult.admin_username}`
                      : `Admin username: ${initializationResult.admin_username}`}
                  </p>
                  {initializationResult.admin_password && (
                    <p>{`Admin password: ${initializationResult.admin_password}`}</p>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    void handleStart();
                    setInitializationResult(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-700 text-slate-200 hover:bg-slate-800 transition-all"
                >
                  {t("launcher.start_service")}
                </button>
                <button
                  type="button"
                  onClick={() => setInitializationResult(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 shadow-lg shadow-blue-500/25 transition-all"
                >
                  {t("common.confirm")}
                </button>
              </div>
            </div>
          </GlassModalShell>
        )}

        {isAdminResetOpen && (
          <GlassModalShell
            title={t("systemConfig.setup.admin.changePassword")}
            onClose={() => setIsAdminResetOpen(false)}
            closeLabel={t("common.close") || "Close"}
            maxWidthClassName="max-w-md"
            panelClassName="dark text-white"
          >
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-200">
                {t("common.usernameRegister")}
              </span>
              <input
                value={pendingAdminUsername}
                onChange={(event) => setPendingAdminUsername(event.target.value)}
                className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-base font-semibold text-slate-100 outline-none"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold text-slate-200">
                {t("common.password")}
              </span>
              <PasswordInput
                value={pendingAdminPassword}
                onChange={(event) => setPendingAdminPassword(event.target.value)}
                inputClassName="bg-white/[0.03] text-white placeholder:text-white/30"
              />
            </label>
            <p className="text-sm leading-6 text-slate-300">
              {t("systemConfig.setup.admin.resetRuleHint")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAdminResetOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleResetAdminPassword();
                }}
                disabled={isAdminResetting}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
              >
                {isAdminResetting ? t("common.processing") : t("common.confirm")}
              </button>
            </div>
          </div>
          </GlassModalShell>
        )}

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
          <div className="fixed inset-0 z-[120] overflow-y-auto overscroll-contain touch-pan-y bg-black/78 px-2 pt-[calc(0.5rem+var(--safe-area-top,0px))] pb-[calc(0.5rem+var(--safe-area-bottom,0px))] sm:px-4 sm:pt-[calc(1rem+var(--safe-area-top,0px))] sm:pb-[calc(1rem+var(--safe-area-bottom,0px))]">
            <div className="mx-auto flex min-h-full w-full max-w-[96rem] items-start">
              <SettingWorkbenchSurface
                title={t("launcher.edit_config")}
                configPath={configFilePath}
                configPathAction={
                  <ConfigPathActionButton
                    onClick={() => {
                      void handleSettingsCenterRuntimeAction();
                    }}
                    label={t([
                      "systemConfig.setup.guide.card1Action",
                      "launcher.modify_runtime_dirs",
                    ])}
                  />
                }
                headerExtras={<SettingSurfaceControls compact={true} />}
                onClose={handleCloseConfigEditor}
                closeAriaLabel={t("common.close")}
                settingActions={settingActions}
                testAction={{
                  label: t("systemConfig.setup.editor.check"),
                  onClick: () => {
                    void handleTestConfig();
                  },
                  disabled: configBusy,
                }}
                primaryAction={{
                  label: t("launcher.save_config"),
                  onClick: () => {
                    void handleSaveConfig();
                  },
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
                  saveLabel: t("launcher.save_config"),
                  onCancel: handleResetToSavedConfig,
                  onClearValidationErrors: clearConfigErrors,
                  showCancel: false,
                  saveSummary: configSummary,
                  saveSummaryLevel: configSummaryLevel,
                  restartNotice: t("admin.config.restartNotice"),
                  runtimeOs: osInfo?.os_type,
                  systemHardware: osInfo,
                  onDiagnoseExternalTools: sharedCapabilities.onDiagnoseExternalTools,
                  onProbeExternalTool: sharedCapabilities.onProbeExternalTool,
                  onProbeMediaBackend: sharedCapabilities.onProbeMediaBackend,
                  ...(osInfo?.is_mobile
                    ? { onPickStorageDirectory: pickExternalStorageDirectory }
                    : {}),
                  ...(quickSettingsLicense ? { quickSettingsLicense } : {}),
                }}
              />
            </div>
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
