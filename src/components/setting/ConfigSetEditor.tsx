import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import * as toml from "smol-toml";
import type { components as ApiComponents } from "@/types/api.ts";
import type { components as ConfigSetComponents } from "@/types/config_set_api.ts";
import type {
  ConfigError,
  ConfigNoteEntry,
} from "@/components/setting/ConfigRawEditor";
import { ConfigWorkbenchShell } from "@/components/setting/ConfigWorkbenchShell";
import { SettingWorkbenchSurface } from "@/components/setting/SettingWorkbenchSurface";
import { SettingSurfaceControls } from "@/components/setting/SettingSurfaceControls";
import { ConfigPathActionButton } from "@/components/setting/ConfigPathActionButton";
import type { ExternalToolDiagnosisResponse } from "@/components/setting/ExternalDependencyConfigModal";
import { buildSettingCommonActions } from "@/components/setting/SettingCommonActions";
import type { SystemHardwareInfo } from "@/components/setting/ConfigQuickSettingsModal";
import { SettingSetupEntryView } from "@/components/setting/SettingSetupEntryView";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { useToastStore } from "@/stores/toast";
import { client, extractData, handleApiError } from "@/lib/api";
import { CheckCircle, ShieldAlert } from "lucide-react";

type ConfigSetStatusResponse =
  ConfigSetComponents["schemas"]["ConfigSetStatusResponse"];
type ConfigTemplateResponse =
  ConfigSetComponents["schemas"]["ConfigTemplateResponse"];
type ConfigNotesResponse =
  ConfigSetComponents["schemas"]["ConfigNotesResponse"];
type BackendCapabilitiesResponse =
  ApiComponents["schemas"]["SystemCapabilities"];
type ConfigSetApplyResponse =
  ConfigSetComponents["schemas"]["ConfigSetApplyResponse"];
type ConfigValidationError = ConfigError;

const isConfigValidationError = (
  value: unknown,
): value is ConfigValidationError => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate["message"] !== "string") return false;
  if (typeof candidate["line"] !== "number") return false;
  if (typeof candidate["column"] !== "number") return false;
  if (
    candidate["key"] !== undefined &&
    candidate["key"] !== null &&
    typeof candidate["key"] !== "string"
  ) {
    return false;
  }
  return true;
};

const normalizeValidationErrors = (raw: unknown): ConfigValidationError[] => {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isConfigValidationError);
};

const extractValidationErrorsFromException = (
  error: unknown,
): ConfigValidationError[] => {
  if (typeof error !== "object" || error === null) return [];
  const payload = (error as Record<string, unknown>)["data"];
  return normalizeValidationErrors(payload);
};

export const ConfigSetEditor: React.FC = () => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const { addToast } = useToastStore();

  const [permitted, setPermitted] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [configPath, setConfigPath] = useState("");
  const [configExists, setConfigExists] = useState(false);
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [runtimeOs, setRuntimeOs] = useState<string>("");
  const [systemHardware, setSystemHardware] =
    useState<SystemHardwareInfo | null>(null);
  const [notes, setNotes] = useState<Record<string, ConfigNoteEntry>>({});
  const [validationErrors, setValidationErrors] = useState<ConfigError[]>([]);

  // When config exists, user can choose to customize instead of one-click apply
  const [showCustomize, setShowCustomize] = useState(false);

  type ConfigSetLicenseStatusResponse = {
    is_valid: boolean;
    msg: string;
    device_code: string;
    hw_id: string;
    aux_id: string;
    current_users: number;
    max_users: number;
    expires_at?: string | null;
    features: string[];
  };

  const [licenseStatus, setLicenseStatus] =
    useState<ConfigSetLicenseStatusResponse | null>(null);
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseSaving, setLicenseSaving] = useState(false);

  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminAction, setAdminAction] = useState<string>("existing_admin");
  const [passwordHint, setPasswordHint] = useState<string | null>(null);
  const [pendingAdminPassword, setPendingAdminPassword] = useState("");
  const [completed, setCompleted] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await extractData<ConfigSetStatusResponse>(
        client.GET("/api/v1/config-set/status"),
      );
      setPermitted(data.is_permitted);
      setPermissionMessage(data.message);
    } catch (e) {
      console.error("Failed to fetch config-set status", e);
      setPermitted(false);
      setPermissionMessage("Failed to check config-set permissions");
    }
  }, []);

  const fetchTemplate = useCallback(async () => {
    try {
      const data = await extractData<ConfigTemplateResponse>(
        client.GET("/api/v1/config-set/template"),
      );
      setConfigPath(data.current_config_path);
      setContent(data.current_config_content);
      setSavedContent(data.current_config_content);
      setConfigExists(data.config_exists === true);

      try {
        const parsed = toml.parse(data.current_config_content) as unknown;
        if (typeof parsed === "object" && parsed !== null) {
          const root = parsed as Record<string, unknown>;
          const license = root["license"];
          if (typeof license === "object" && license !== null) {
            const licenseKeyInToml = (license as Record<string, unknown>)
              ["license_key"];
            if (
              typeof licenseKeyInToml === "string" &&
              licenseKeyInToml.trim().length > 0
            ) {
              setLicenseKey(licenseKeyInToml);
            }
          }
        }
      } catch {
        // ignore
      }
    } catch (e) {
      addToast(handleApiError(e, t), "error");
    }
  }, [addToast, t]);

  const fetchNotes = useCallback(async () => {
    try {
      const data = await extractData<ConfigNotesResponse>(
        client.GET("/api/v1/config-set/notes"),
      );
      setNotes(
        (data.notes ?? {}) as unknown as Record<string, ConfigNoteEntry>,
      );
    } catch (e) {
      console.error("Failed to fetch config notes", e);
    }
  }, []);

  const fetchCapabilities = useCallback(async () => {
    try {
      const data = await extractData<BackendCapabilitiesResponse>(
        client.GET("/api/v1/system/backend-capabilities-handshake"),
      );
      setRuntimeOs(typeof data.runtime_os === "string" ? data.runtime_os : "");
    } catch (e) {
      console.error("Failed to fetch backend capabilities", e);
      setRuntimeOs("");
    }
  }, []);

  const fetchSystemHardware = useCallback(async () => {
    try {
      const data = await extractData<SystemHardwareInfo>(
        client.GET("/api/v1/system/os-info"),
      );
      setSystemHardware(data ?? null);
    } catch (e) {
      console.warn("Failed to fetch system os-info", e);
      setSystemHardware(null);
    }
  }, []);

  const refreshLicenseStatus = useCallback(async () => {
    try {
      const data = await extractData<ConfigSetLicenseStatusResponse>(
        client.GET("/api/v1/config-set/license/status"),
      );
      setLicenseStatus(data);
    } catch (e) {
      // License endpoints may be unavailable on older servers; ignore.
      console.warn("Failed to fetch config-set license status", e);
    }
  }, []);

  const applyLicenseKey = useCallback(async () => {
    const trimmed = licenseKey.trim();
    if (!trimmed) return;
    setLicenseSaving(true);
    try {
      const data = await extractData<ConfigSetLicenseStatusResponse>(
        client.POST("/api/v1/config-set/license/update", {
          body: { license_key: trimmed },
        }),
      );
      setLicenseStatus(data);
      addToast(t("admin.config.saveSuccess"), "success");
    } catch (e) {
      addToast(handleApiError(e, t), "error");
    } finally {
      setLicenseSaving(false);
    }
  }, [addToast, licenseKey, t]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await fetchStatus();
        await Promise.all([
          fetchTemplate(),
          fetchNotes(),
          fetchCapabilities(),
          fetchSystemHardware(),
          refreshLicenseStatus(),
        ]);
      } catch (e) {
        console.error("Config-set init failed", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [
    fetchStatus,
    fetchTemplate,
    fetchNotes,
    fetchCapabilities,
    fetchSystemHardware,
    refreshLicenseStatus,
  ]);

  const finishAndReturnToHome = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await extractData(client.POST("/api/v1/config-set/finish"));
      const startedAt = Date.now();
      const timer = window.setInterval(async () => {
        try {
          const data = await extractData<BackendCapabilitiesResponse>(
            client.GET("/api/v1/system/backend-capabilities-handshake"),
          );
          if (data.is_config_set_mode !== true) {
            window.clearInterval(timer);
            window.location.replace("/");
            return;
          }
        } catch {
          if (Date.now() - startedAt > 20_000) {
            window.clearInterval(timer);
            window.location.replace("/");
          }
        }
      }, 1000);
    } catch (e) {
      setFinishing(false);
      addToast(handleApiError(e, t), "error");
    }
  };

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

  const handleTest = async () => {
    if (testing) return;
    setTesting(true);
    setValidationErrors([]);
    try {
      await extractData(
        client.POST("/api/v1/config-set/config-test", {
          body: { toml_content: content },
        }),
      );
      addToast(t("admin.config.testSuccess"), "success");
    } catch (e) {
      const errData = extractValidationErrorsFromException(e);
      if (errData.length > 0) {
        const firstError = errData[0];
        if (!firstError) {
          addToast(handleApiError(e, t), "error");
          return;
        }
        setValidationErrors(errData);
        addToast(
          `${t("admin.config.testFailed")}: ${firstError.message}`,
          "error",
        );
      } else {
        addToast(handleApiError(e, t), "error");
      }
    } finally {
      setTesting(false);
    }
  };

  const handleApply = useCallback(async () => {
    if (testing) return;
    const passwordError = validatePendingAdminPassword();
    if (passwordError) {
      addToast(passwordError, "error");
      return;
    }
    setTesting(true);
    setValidationErrors([]);
    try {
      const res = await extractData<ConfigSetApplyResponse>(
        client.POST("/api/v1/config-set/apply", {
          body: {
            config_path: configPath,
            toml_content: content,
            admin_password: pendingAdminPassword,
          },
        }),
      );
      if (res?.admin_username) setAdminUsername(res.admin_username);
      if (res?.admin_action) setAdminAction(res.admin_action);
      setPasswordHint(res?.password_hint ?? null);
      setPendingAdminPassword("");
      addToast(
        t("systemConfig.configSet.logs.success") || "Configuration saved successfully",
        "success",
      );
      setCompleted(true);
    } catch (e) {
      const errData = extractValidationErrorsFromException(e);
      if (errData.length > 0) {
        const firstError = errData[0];
        if (!firstError) {
          addToast(handleApiError(e, t), "error");
          return;
        }
        setValidationErrors(errData);
        addToast(
          `${t("systemConfig.configSet.logs.failed")}: ${firstError.message}`,
          "error",
        );
      } else {
        addToast(handleApiError(e, t), "error");
      }
    } finally {
      setTesting(false);
    }
  }, [
    addToast,
    configPath,
    content,
    pendingAdminPassword,
    t,
    testing,
    validatePendingAdminPassword,
  ]);

  const handleResetToSaved = () => {
    setContent(savedContent);
    setValidationErrors([]);
  };

  const handleDiagnoseExternalTools = useCallback(
    async (
      configuredValues: Record<string, string>,
    ): Promise<ExternalToolDiagnosisResponse> => {
      return extractData<ExternalToolDiagnosisResponse>(
        client.POST("/api/v1/config-set/external-tools/diagnose", {
          body: { configured_values: configuredValues },
        }),
      );
    },
    [],
  );

  const handleProbeMediaBackend = useCallback(
    async ({
      ffmpegPath,
      backend,
      device,
    }: {
      ffmpegPath: string;
      backend: string;
      device?: string;
    }) => {
      return extractData(
        client.POST("/api/v1/config-set/media-backend/probe", {
          body: {
            ffmpeg_path: ffmpegPath,
            backend,
            ...(device ? { device } : {}),
          },
        }),
      );
    },
    [],
  );

  const handleCheckDatabase = useCallback(
    async ({
      databaseType,
      connectionString,
    }: {
      databaseType: "sqlite" | "postgres";
      connectionString: string;
    }) => {
      try {
        await extractData(
          client.POST("/api/v1/config-set/check-db", {
            body: {
              db_type: databaseType,
              connection_string: connectionString,
            },
          }),
        );
        addToast(t("admin.config.testSuccess"), "success");
      } catch (error) {
        addToast(handleApiError(error, t), "error");
      }
    },
    [addToast, t],
  );

  const handleCheckCache = useCallback(
    async ({
      cacheType,
      connectionString,
    }: {
      cacheType: string;
      connectionString: string;
    }) => {
      try {
        await extractData(
          client.POST("/api/v1/config-set/check-kv", {
            body: { kv_type: cacheType, connection_string: connectionString },
          }),
        );
        addToast(t("admin.config.testSuccess"), "success");
      } catch (error) {
        addToast(handleApiError(error, t), "error");
      }
    },
    [addToast, t],
  );

  const headerActions = <SettingSurfaceControls compact={true} />;

  const settingsCenterTitle = t([
    "systemConfig.setup.editor.title",
    "systemConfig.setup.center.title",
    "admin.config.title",
  ]);

  const finalMessage =
    adminAction === "created_default"
      ? t("systemConfig.configSet.final.adminCreatedDefault", {
          user: adminUsername,
          password: passwordHint || "admin888",
        })
      : adminAction === "created_with_password"
        ? t("systemConfig.configSet.final.adminCreatedWithPassword", {
            user: adminUsername,
            password: passwordHint || "",
          })
        : adminAction === "reset_password"
          ? t("systemConfig.configSet.final.adminReset", {
              user: adminUsername,
              password: passwordHint || "",
            })
          : adminAction === "existing_admin"
            ? t("systemConfig.configSet.final.adminExisting", { user: adminUsername })
            : "";

  const handleConfigPathAction = () => {
    void addToast(
      t([
        "systemConfig.setup.guide.runtimeDirChangeHint",
        "launcher.runtime_dir_change_hint",
      ]),
      { type: "info", duration: "long" },
    );
  };

  const settingActions = useMemo(
    () =>
      buildSettingCommonActions({
        t,
        isDark,
        tomlAdapter: toml,
        content,
        onContentChange: setContent,
        runtimeOs,
        systemHardware,
        onTestDatabase: handleCheckDatabase,
        onTestCache: handleCheckCache,
        onDiagnoseExternalTools: handleDiagnoseExternalTools,
        onProbeMediaBackend: handleProbeMediaBackend,
        adminPassword: {
          value: pendingAdminPassword,
          onValueChange: setPendingAdminPassword,
          hint: t("systemConfig.setup.admin.resetRuleHint"),
        },
        license: {
          status: licenseStatus,
          licenseKey,
          onLicenseKeyChange: setLicenseKey,
          onApplyLicense: () => {
            void applyLicenseKey();
          },
          saving: licenseSaving,
        },
        storage: {
          onPrimaryAction: () => {
            void handleApply();
          },
          primaryActionLabel: t("systemConfig.setup.guide.card3Action"),
        },
      }),
    [
      t,
      isDark,
      content,
      runtimeOs,
      systemHardware,
      handleCheckDatabase,
      handleCheckCache,
      handleDiagnoseExternalTools,
      handleProbeMediaBackend,
      pendingAdminPassword,
      licenseStatus,
      licenseKey,
      licenseSaving,
      applyLicenseKey,
      handleApply,
    ],
  );

  if (!loading && !permitted) {
    return (
      <ConfigWorkbenchShell
        title={t("admin.config.title")}
        headerActions={headerActions}
      >
        <div className="max-w-2xl mx-auto p-6 sm:p-8 bg-card border-2 border-destructive/20 rounded-3xl sm:rounded-[2.5rem] text-center shadow-2xl">
          <ShieldAlert size={80} className="mx-auto text-destructive mb-8" />
          <h2 className="text-4xl font-black mb-6">
            {t("systemConfig.configSet.locked.title")}
          </h2>
          <p className="text-xl opacity-70 mb-10">{permissionMessage}</p>
          <button
            type="button"
            onClick={() => {
              void fetchStatus();
            }}
            className="px-10 py-4 bg-primary text-primary-foreground rounded-2xl font-black shadow-xl"
          >
            {t("common.retry")}
          </button>
        </div>
      </ConfigWorkbenchShell>
    );
  }

  if (completed) {
    return (
      <ConfigWorkbenchShell
        title={settingsCenterTitle}
        configPath={configPath}
        configPathAction={
          <ConfigPathActionButton
            onClick={handleConfigPathAction}
            label={t([
              "systemConfig.setup.guide.card1Action",
              "launcher.modify_runtime_dirs",
            ])}
          />
        }
        headerActions={headerActions}
      >
        <div className="max-w-2xl mx-auto p-6 sm:p-8 bg-card border-2 border-emerald-500/20 rounded-3xl sm:rounded-[2.5rem] text-center shadow-2xl">
          <CheckCircle size={80} className="mx-auto text-emerald-500 mb-8" />
          <h2 className="text-4xl font-black mb-6">
            {t("systemConfig.configSet.final.title")}
          </h2>
          <p className="text-xl opacity-70 mb-10">
            {finalMessage ||
              t("systemConfig.configSet.final.subtitle", { user: adminUsername })}
          </p>
          <div className="max-w-md mx-auto p-4 sm:p-5 bg-muted/50 rounded-xl text-left space-y-3 border border-border mb-8">
            <p className="text-sm font-semibold uppercase tracking-wide opacity-60">
              {t("systemConfig.configSet.final.nextSteps")}
            </p>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <p key={i} className="text-sm leading-6">
                  {i}. {t(`systemConfig.configSet.final.step${i}`)}
                </p>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              void finishAndReturnToHome();
            }}
            disabled={finishing}
            className="px-6 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {finishing ? t("common.processing") : t("common.confirm")}
          </button>
        </div>
      </ConfigWorkbenchShell>
    );
  }

  if (!configExists && !showCustomize && !loading) {
    return (
      <ConfigWorkbenchShell
        title={settingsCenterTitle}
        configPath={configPath}
        configPathAction={
          <ConfigPathActionButton
            onClick={handleConfigPathAction}
            label={t([
              "systemConfig.setup.guide.card1Action",
              "launcher.modify_runtime_dirs",
            ])}
          />
        }
        headerActions={headerActions}
      >
        <SettingSetupEntryView
          mode="first-start"
          busy={testing}
          onPrimary={() => {
            void handleApply();
          }}
          onCustomize={() => setShowCustomize(true)}
          pendingAdminPassword={pendingAdminPassword}
          onPendingAdminPasswordChange={setPendingAdminPassword}
          passwordHint={t("systemConfig.setup.admin.resetRuleHint")}
        />
      </ConfigWorkbenchShell>
    );
  }

  // When config already exists and user has not chosen to customize,
  // show a streamlined one-click apply view.
  if (configExists && !showCustomize && !loading) {
    return (
      <ConfigWorkbenchShell
        title={settingsCenterTitle}
        configPath={configPath}
        configPathAction={
          <ConfigPathActionButton
            onClick={handleConfigPathAction}
            label={t([
              "systemConfig.setup.guide.card1Action",
              "launcher.modify_runtime_dirs",
            ])}
          />
        }
        headerActions={headerActions}
      >
        <SettingSetupEntryView
          mode="existing-config"
          busy={testing}
          onPrimary={() => {
            void handleApply();
          }}
          onCustomize={() => setShowCustomize(true)}
          pendingAdminPassword={pendingAdminPassword}
          onPendingAdminPasswordChange={setPendingAdminPassword}
          passwordHint={t("systemConfig.setup.admin.resetRuleHint")}
        />
      </ConfigWorkbenchShell>
    );
  }

  return (
    <SettingWorkbenchSurface
      title={t("admin.config.title")}
      configPath={configPath}
      configPathAction={
        <ConfigPathActionButton
          onClick={handleConfigPathAction}
          label={t(["systemConfig.setup.guide.card1Action", "launcher.modify_runtime_dirs"])}
        />
      }
      headerExtras={headerActions}
      settingActions={settingActions}
      testAction={{
        label: t("systemConfig.setup.editor.check"),
        onClick: () => {
          void handleTest();
        },
        disabled: testing,
      }}
      primaryAction={{
        label: t("systemConfig.setup.guide.card3Action"),
        onClick: () => {
          void handleApply();
        },
        disabled: testing,
      }}
      workbenchProps={{
        tomlAdapter: toml,
        loading,
        configPath,
        content,
        savedContent,
        notes,
        validationErrors,
        busy: testing,
        onChange: setContent,
        onTest: handleTest,
        onSave: handleApply,
        onCancel: handleResetToSaved,
        showCancel: false,
        allowSaveWithoutChanges: true,
        forceEnableSave: true,
        editorTitle: t("systemConfig.setup.editor.title"),
        testLabel: t("systemConfig.setup.editor.check"),
        onClearValidationErrors: () => setValidationErrors([]),
        runtimeOs,
        systemHardware,
        onDiagnoseExternalTools: handleDiagnoseExternalTools,
        onProbeMediaBackend: handleProbeMediaBackend,
      }}
    />
  );
};
