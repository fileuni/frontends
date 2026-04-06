import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import * as toml from "smol-toml";
import type { components as ApiComponents } from "@/types/api.ts";
import type { components as ConfigSetComponents } from "@/types/config_set_api.ts";
import { ConfigWorkbenchShell } from "@/components/setting/ConfigWorkbenchShell";
import { SettingWorkbenchSurface } from "@/components/setting/SettingWorkbenchSurface";
import { SettingSurfaceControls } from "@/components/setting/SettingSurfaceControls";
import { ConfigPathActionButton } from "@/components/setting/ConfigPathActionButton";
import {
  buildSettingCommonActions,
} from "@/components/setting/SettingCommonActions";
import type { SystemHardwareInfo } from "@/components/setting/ConfigQuickSettingsModal";
import { createConfigSetSettingCommonCapabilityHandlers } from "@/components/setting/settingCommonCapabilityAdapters";
import {
  extractConfigValidationErrorsFromException,
  normalizeConfigNotes,
  type ConfigWorkbenchLicenseStatus,
  useConfigWorkbenchController,
} from "@/components/setting/useConfigWorkbenchController";
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

export const ConfigSetEditor: React.FC = () => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const { addToast } = useToastStore();

  const [permitted, setPermitted] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState("");

  const [testing, setTesting] = useState(false);
  const [configExists, setConfigExists] = useState(false);

  // When config exists, user can choose to customize instead of one-click apply
  const [showCustomize, setShowCustomize] = useState(false);

  const [adminUsername, setAdminUsername] = useState("admin");
  const [adminAction, setAdminAction] = useState<string>("existing_admin");
  const [passwordHint, setPasswordHint] = useState<string | null>(null);
  const [pendingAdminPassword, setPendingAdminPassword] = useState("");
  const [completed, setCompleted] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const loadConfigSetWorkbench = useCallback(async () => {
    const [template, notePayload, capabilities, osInfo] = await Promise.all([
      extractData<ConfigTemplateResponse>(client.GET("/api/v1/config-set/template")),
      extractData<ConfigNotesResponse>(client.GET("/api/v1/config-set/notes")),
      extractData<BackendCapabilitiesResponse>(
        client.GET("/api/v1/system/backend-capabilities-handshake"),
      ),
      extractData<SystemHardwareInfo>(client.GET("/api/v1/system/os-info")).catch(
        (error) => {
          console.warn("Failed to fetch system os info during config-set init", error);
          return null;
        },
      ),
    ]);

    const currentContent = template?.current_config_content ?? "";
    setConfigExists(template?.config_exists === true);

    let licenseKeyFromToml: string | undefined;
    try {
      const parsed = toml.parse(currentContent) as unknown;
      if (typeof parsed === "object" && parsed !== null) {
        const root = parsed as Record<string, unknown>;
        const license = root["license"];
        if (typeof license === "object" && license !== null) {
          const value = (license as Record<string, unknown>)["license_key"];
          if (typeof value === "string" && value.trim().length > 0) {
            licenseKeyFromToml = value;
          }
        }
      }
    } catch {
      // Ignore broken inline parse while loading the editor.
    }

    return {
      configPath: template?.current_config_path ?? "",
      content: currentContent,
      notes: normalizeConfigNotes(notePayload?.notes ?? {}),
      runtimeOs:
        typeof capabilities?.runtime_os === "string"
          ? capabilities.runtime_os
          : "",
      systemHardware: osInfo ?? null,
      ...(licenseKeyFromToml ? { licenseKey: licenseKeyFromToml } : {}),
    };
  }, []);

  const loadConfigSetLicenseStatus = useCallback(async () => {
    try {
      return await extractData<ConfigWorkbenchLicenseStatus>(
        client.GET("/api/v1/config-set/license/status"),
      );
    } catch (error) {
      console.warn("Failed to fetch config-set license status", error);
      return null;
    }
  }, []);

  const updateConfigSetLicense = useCallback(
    async (nextLicenseKey: string) => {
      const nextStatus = await extractData<ConfigWorkbenchLicenseStatus>(
        client.POST("/api/v1/config-set/license/update", {
          body: { license_key: nextLicenseKey },
        }),
      );
      addToast(t("admin.config.saveSuccess"), "success");
      return {
        licenseStatus: nextStatus,
        clearLicenseKey: false,
      };
    },
    [addToast, t],
  );

  const handleConfigSetLicenseError = useCallback(
    async (error: unknown) => {
      await addToast(handleApiError(error, t), "error");
    },
    [addToast, t],
  );

  const {
    loading,
    configPath,
    content,
    setContent,
    savedContent,
    notes,
    validationErrors,
    setValidationErrors,
    clearValidationErrors,
    runtimeOs,
    systemHardware,
    settingLicenseBinding,
    loadWorkbench,
    resetToSaved,
  } = useConfigWorkbenchController<ConfigWorkbenchLicenseStatus>({
    load: loadConfigSetWorkbench,
    loadLicenseStatus: loadConfigSetLicenseStatus,
    updateLicense: updateConfigSetLicense,
    onLicenseError: handleConfigSetLicenseError,
  });

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

  useEffect(() => {
    const load = async () => {
      try {
        await fetchStatus();
        await loadWorkbench();
      } catch (e) {
        console.error("Config-set init failed", e);
      }
    };
    void load();
  }, [fetchStatus, loadWorkbench]);

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
    clearValidationErrors();
    try {
      await extractData(
        client.POST("/api/v1/config-set/config-test", {
          body: { toml_content: content },
        }),
      );
      addToast(t("admin.config.testSuccess"), "success");
    } catch (e) {
      const errData = extractConfigValidationErrorsFromException(e);
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
    clearValidationErrors();
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
      const errData = extractConfigValidationErrorsFromException(e);
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
    clearValidationErrors,
    configPath,
    content,
    pendingAdminPassword,
    setValidationErrors,
    t,
    testing,
    validatePendingAdminPassword,
  ]);

  const sharedCapabilities = useMemo(
    () =>
      createConfigSetSettingCommonCapabilityHandlers({
        t,
        addToast,
      }),
    [addToast, t],
  );

  const headerActions = <SettingSurfaceControls compact={true} />;

  const settingsCenterTitle = t([
    "systemConfig.setup.editor.title",
    "systemConfig.setup.center.title",
    "admin.config.title",
  ]);

  const configSetFinalSteps = [
    {
      key: 'systemConfig.configSet.final.step1',
      text: t('systemConfig.configSet.final.step1'),
    },
    {
      key: 'systemConfig.configSet.final.step2',
      text: t('systemConfig.configSet.final.step2'),
    },
    {
      key: 'systemConfig.configSet.final.step3',
      text: t('systemConfig.configSet.final.step3'),
    },
  ] as const;

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
        sharedCapabilities,
        adminPassword: {
          value: pendingAdminPassword,
          onValueChange: setPendingAdminPassword,
          hint: t("systemConfig.setup.admin.resetRuleHint"),
        },
        ...(settingLicenseBinding ? { license: settingLicenseBinding } : {}),
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
      setContent,
      sharedCapabilities,
      runtimeOs,
      systemHardware,
      pendingAdminPassword,
      settingLicenseBinding,
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
            <p className="text-sm font-semibold tracking-wide opacity-60">
              {t("systemConfig.configSet.final.nextSteps")}
            </p>
              <div className="space-y-2">
                {configSetFinalSteps.map((step, index) => (
                  <p key={step.key} className="text-sm leading-6">
                    {index + 1}. {step.text}
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
        onCancel: resetToSaved,
        showCancel: false,
        allowSaveWithoutChanges: true,
        forceEnableSave: true,
        editorTitle: t("systemConfig.setup.editor.title"),
        testLabel: t("systemConfig.setup.editor.check"),
        onClearValidationErrors: clearValidationErrors,
        runtimeOs,
        systemHardware,
        onDiagnoseExternalTools: sharedCapabilities.onDiagnoseExternalTools,
        onProbeExternalTool: sharedCapabilities.onProbeExternalTool,
        onProbeMediaBackend: sharedCapabilities.onProbeMediaBackend,
      }}
    />
  );
};
