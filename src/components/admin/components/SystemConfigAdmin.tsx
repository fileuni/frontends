import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import * as toml from "smol-toml";
import { client, extractData, handleApiError } from "@/lib/api.ts";
import type { components } from "@/lib/api.ts";
import type {
  ZeroTierGenerateKeypairResponse,
  ZeroTierRuntimeSnapshot,
} from "@/components/setting/ZeroTierEmbeddedInlinePanel";
import { SettingWorkbenchSurface } from "@/components/setting/SettingWorkbenchSurface";
import { ConfigPathActionButton } from "@/components/setting/ConfigPathActionButton";
import {
  buildSettingCommonActions,
} from "@/components/setting/SettingCommonActions";
import type { SystemHardwareInfo } from "@/components/setting/ConfigQuickSettingsModal";
import { createAdminSettingCommonCapabilityHandlers } from "@/components/setting/settingCommonCapabilityAdapters";
import {
  extractConfigValidationErrorsFromException,
  normalizeConfigNotes,
  type ConfigWorkbenchLicenseStatus,
  type UseConfigWorkbenchControllerOptions,
  useConfigWorkbenchController,
} from "@/components/setting/useConfigWorkbenchController";
import { normalizeSystemConfigRequiredSections } from "@/components/setting/systemConfigNormalizer";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { useToastStore } from "@/stores/toast";
import { useAuthzStore } from "@/stores/authz.ts";
import { useAuthStore } from "@/stores/auth.ts";
import { AdminPage } from "./admin-ui";

type ConfigRawResponse = components["schemas"]["ConfigRawResponse"];
type ConfigNotesResponse = components["schemas"]["ConfigNotesResponse"];
type BackendCapabilitiesResponse = components["schemas"]["SystemCapabilities"];
type ZeroTierStatusResponse = ZeroTierRuntimeSnapshot;

type LineDiffStats = {
  changed: number;
  added: number;
  removed: number;
};

const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const calculateLineDiffStats = (
  before: string,
  after: string,
): LineDiffStats => {
  const beforeLines = before.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);
  const maxLen = Math.max(beforeLines.length, afterLines.length);
  let added = 0;
  let removed = 0;
  let changed = 0;

  for (let i = 0; i < maxLen; i += 1) {
    const oldLine = beforeLines[i];
    const newLine = afterLines[i];
    if (oldLine === undefined && newLine !== undefined) {
      added += 1;
    } else if (oldLine !== undefined && newLine === undefined) {
      removed += 1;
    } else if (oldLine !== newLine) {
      changed += 1;
    }
  }

  return { changed, added, removed };
};

const formatLineDiffSummary = (stats: LineDiffStats): string => {
  return `changed ${stats.changed}, added ${stats.added}, removed ${stats.removed}`;
};

export const SystemConfigAdmin = () => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const { addToast } = useToastStore();

  const [testing, setTesting] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [pendingAdminPassword, setPendingAdminPassword] = useState("");
  const [zerotierRuntimeSnapshot, setZeroTierRuntimeSnapshot] =
    useState<ZeroTierStatusResponse | null>(null);
  const [zerotierAdminApiAvailable, setZeroTierAdminApiAvailable] = useState(true);
  const [zerotierActionPending, setZeroTierActionPending] = useState(false);
  const [zerotierFastPollUntil, setZeroTierFastPollUntil] = useState(0);
  const [generatingZeroTierKeypair, setGeneratingZeroTierKeypair] = useState(false);
  const { currentUserData } = useAuthStore();

  const loadZeroTierSnapshot = useCallback(async (): Promise<ZeroTierStatusResponse | null> => {
    try {
      const status = await extractData<ZeroTierStatusResponse>(
        client.GET("/api/v1/admin/zerotier-embedded/status", {
          headers: { "X-No-Toast": "true" },
        }),
      );
      setZeroTierAdminApiAvailable(true);
      setZeroTierRuntimeSnapshot(status);
      return status;
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        setZeroTierAdminApiAvailable(false);
        setZeroTierRuntimeSnapshot(null);
        return null;
      }
      console.warn("Failed to fetch ZeroTier status", error);
      return null;
    }
  }, []);

  const loadSystemConfigWorkbench = useCallback(async () => {
    const [
      config,
      notePayload,
      capabilities,
      osInfo,
      zerotierStatus,
    ] = await Promise.all([
      extractData<ConfigRawResponse>(client.GET("/api/v1/admin/system/config/raw")),
      extractData<ConfigNotesResponse>(
        client.GET("/api/v1/admin/system/config/notes"),
      ),
      extractData<BackendCapabilitiesResponse>(
        client.GET("/api/v1/system/backend-capabilities-handshake"),
      ),
      extractData<SystemHardwareInfo>(client.GET("/api/v1/system/os-info")).catch(
        (error) => {
          console.warn("Failed to fetch system os info during admin config load", error);
          return null;
        },
      ),
      loadZeroTierSnapshot(),
    ]);

    setZeroTierRuntimeSnapshot(zerotierStatus);

    return {
      configPath: config?.config_path ?? "",
      content: config?.toml_content ?? "",
      notes: normalizeConfigNotes(
        (notePayload?.notes ?? {}) as Record<
          string,
          components["schemas"]["ConfigNoteEntry"]
        >,
      ),
      runtimeOs:
        typeof capabilities?.runtime_os === "string"
          ? capabilities.runtime_os
          : "",
      systemHardware: osInfo ?? null,
    };
  }, [loadZeroTierSnapshot]);

  const loadAdminLicenseStatus = useCallback(async () => {
    try {
      return await extractData<ConfigWorkbenchLicenseStatus>(
        client.GET("/api/v1/users/admin/license/status"),
      );
    } catch (error) {
      console.error(error);
      return null;
    }
  }, []);

  const updateAdminLicense = useCallback(
    async (update: Parameters<NonNullable<UseConfigWorkbenchControllerOptions<ConfigWorkbenchLicenseStatus>["updateLicense"]>>[0]) => {
      const res = await client.POST("/api/v1/users/admin/license/update", {
        body: update,
      });
      if (res.error) {
        throw res.error;
      }
      const nextStatus = await extractData<ConfigWorkbenchLicenseStatus>(
        client.GET("/api/v1/users/admin/license/status"),
      );
      addToast(t("admin.saveSuccess"), "success");
      return {
        licenseStatus: nextStatus,
      };
    },
    [addToast, t],
  );

  const handleAdminLicenseError = useCallback(
    async (error: unknown) => {
      await addToast(handleApiError(error, t), "error");
    },
    [addToast, t],
  );

  const {
    loading,
    configPath,
    setConfigPath,
    content,
    setContent,
    savedContent,
    setSavedContent,
    notes,
    validationErrors,
    setValidationErrors,
    clearValidationErrors,
    saveSummary,
    saveSummaryLevel,
    setSummary,
    clearSaveSummary,
    runtimeOs,
    systemHardware,
    loadWorkbench,
    settingLicenseBinding,
    quickSettingsLicense,
    resetToSaved,
  } = useConfigWorkbenchController<ConfigWorkbenchLicenseStatus>({
    load: loadSystemConfigWorkbench,
    loadLicenseStatus: loadAdminLicenseStatus,
    updateLicense: updateAdminLicense,
    onLicenseError: handleAdminLicenseError,
  });

  const { hasPermission } = useAuthzStore();

  useEffect(() => {
    const load = async () => {
      if (!hasPermission("admin.access")) return;
      try {
        await loadWorkbench();
      } catch (e) {
        addToast(handleApiError(e, t), "error");
      }
    };
    void load();
  }, [addToast, hasPermission, loadWorkbench, t]);

  useEffect(() => {
    if (!hasPermission("admin.access")) {
      return undefined;
    }
    const intervalMs = Date.now() < zerotierFastPollUntil ? 2500 : 8000;
    const timer = setInterval(() => {
      void loadZeroTierSnapshot();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [hasPermission, loadZeroTierSnapshot, zerotierFastPollUntil]);

  useEffect(() => {
    if (!testing && !reloading) return undefined;
    const watchdog = setTimeout(() => {
      setTesting(false);
      setReloading(false);
      addToast("Operation timeout watchdog released busy state", "warning");
    }, 45000);
    return () => clearTimeout(watchdog);
  }, [testing, reloading, addToast]);

  const handleTest = async () => {
    if (testing || reloading) return;
    setTesting(true);
    setValidationErrors([]);
    try {
      const normalized = normalizeSystemConfigRequiredSections(content, toml);
      if (normalized.changed) {
        setContent(normalized.content);
      }
      await withTimeout(
        extractData<{ message?: string }>(
          client.POST("/api/v1/admin/system/config/test", {
            body: { toml_content: normalized.content },
            headers: { "X-No-Toast": "true" },
          }),
        ),
        20_000,
        "Config test request timeout",
      );
      addToast(t("admin.config.testSuccess"), "success");
    } catch (e) {
      console.error("Config test exception:", e);
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

  const handleGenerateZeroTierKeypair = useCallback(async () => {
    if (generatingZeroTierKeypair) {
      return;
    }
    setGeneratingZeroTierKeypair(true);
    try {
      const generated = await extractData<ZeroTierGenerateKeypairResponse>(
        client.POST("/api/v1/admin/zerotier-embedded/keypair/generate"),
      );
      const parsed = toml.parse(content);
      const root =
        typeof parsed === "object" && parsed !== null
          ? (parsed as Record<string, unknown>)
          : {};
      const section =
        typeof root["zerotier_embedded"] === "object" &&
        root["zerotier_embedded"] !== null
          ? (root["zerotier_embedded"] as Record<string, unknown>)
          : {};
      root["zerotier_embedded"] = section;
      section["identity_public"] = generated.identity_public;
      section["identity_secret"] = generated.identity_secret;
      setContent(toml.stringify(root));
      setZeroTierRuntimeSnapshot((prev) =>
        prev
          ? { ...prev, node_id: generated.node_id }
          : prev,
      );
      addToast(t("admin.config.zerotierEmbedded.keypairGenerated"), "success");
    } catch (error) {
      addToast(handleApiError(error, t), "error");
    } finally {
      setGeneratingZeroTierKeypair(false);
    }
  }, [addToast, content, generatingZeroTierKeypair, setContent, t]);

  const triggerZeroTierAction = useCallback(
    async (path: "/api/v1/admin/zerotier-embedded/join" | "/api/v1/admin/zerotier-embedded/disconnect" | "/api/v1/admin/zerotier-embedded/reconnect") => {
      if (zerotierActionPending) {
        return;
      }
      setZeroTierActionPending(true);
      try {
        const snapshot = await extractData<ZeroTierRuntimeSnapshot>(
          client.POST(path, {
            headers: { "X-No-Toast": "true" },
          }),
        );
        setZeroTierAdminApiAvailable(true);
        setZeroTierRuntimeSnapshot(snapshot);
        setZeroTierFastPollUntil(Date.now() + 30_000);
      } catch (error) {
        addToast(handleApiError(error, t), "error");
        await loadZeroTierSnapshot();
      } finally {
        setZeroTierActionPending(false);
      }
    },
    [addToast, loadZeroTierSnapshot, t, zerotierActionPending],
  );

  const handleSaveConfig = useCallback(async () => {
    if (reloading || testing) return;
    const passwordError = validatePendingAdminPassword();
    if (passwordError) {
      addToast(passwordError, "error");
      setSummary(passwordError, "error");
      return;
    }
    setReloading(true);
    clearValidationErrors();
    clearSaveSummary();
    try {
      const normalized = normalizeSystemConfigRequiredSections(content, toml);
      const currentContent = normalized.content;
      if (normalized.changed) {
        setContent(currentContent);
      }
      await withTimeout(
        extractData<{ message?: string }>(
          client.POST("/api/v1/admin/system/config/test", {
            body: { toml_content: currentContent },
            headers: { "X-No-Toast": "true" },
          }),
        ),
        20_000,
        "Config test request timeout",
      );
      await withTimeout(
        extractData<{ message?: string }>(
          client.POST("/api/v1/admin/system/config/save", {
            body: { toml_content: currentContent },
            headers: { "X-No-Toast": "true" },
          }),
        ),
        20_000,
        "Config save request timeout",
      );

      const refreshed = await withTimeout(
        extractData<ConfigRawResponse>(
          client.GET("/api/v1/admin/system/config/raw"),
        ),
        15_000,
        "Config refresh request timeout",
      );

      const serverContent = refreshed.toml_content || "";
      const serverPath = refreshed.config_path || configPath;
      setConfigPath(serverPath);
      setSavedContent(serverContent);
      setContent(serverContent);

      const trimmedPendingAdminPassword = pendingAdminPassword.trim();
      if (trimmedPendingAdminPassword.length > 0 && currentUserData?.user.id) {
        await withTimeout(
          extractData(
            client.POST("/api/v1/users/admin/users/{user_id}/reset-password", {
              params: { path: { user_id: currentUserData.user.id } },
              body: { new_password: trimmedPendingAdminPassword },
            }),
          ),
          20_000,
          "Admin password reset request timeout",
        );
        addToast(t("launcher.reset_admin_password_success"), "success");
        setPendingAdminPassword("");
      }

      addToast(t("admin.config.saveSuccess"), "success");
      const diffSummary = formatLineDiffSummary(
        calculateLineDiffStats(currentContent, serverContent),
      );
      if (serverContent !== currentContent) {
        const summary = `${t("admin.config.saveSuccess")} ${diffSummary}`;
        setSummary(summary, "warning");
      } else {
        const summary = `${t("admin.config.saveSuccess")} ${diffSummary}`;
        setSummary(summary, "success");
      }
    } catch (e) {
      console.error("Config save exception:", e);
      const errData = extractConfigValidationErrorsFromException(e);
      if (errData.length > 0) {
        const firstError = errData[0];
        if (!firstError) {
          const summary = handleApiError(e, t);
          setSummary(summary, "error");
          addToast(summary, "error");
          return;
        }
        setValidationErrors(errData);
        const summary = `${t("admin.config.saveFailed")}: ${firstError.message}`;
        setSummary(summary, "error");
        addToast(summary, "error");
      } else {
        const summary = handleApiError(e, t);
        setSummary(summary, "error");
        addToast(summary, "error");
      }
    } finally {
      setReloading(false);
    }
  }, [
    addToast,
      clearSaveSummary,
    clearValidationErrors,
    configPath,
    content,
    currentUserData?.user.id,
    pendingAdminPassword,
    reloading,
    setConfigPath,
    setContent,
    setSavedContent,
    setSummary,
    setValidationErrors,
    t,
    testing,
    validatePendingAdminPassword,
  ]);

  const sharedCapabilities = useMemo(
    () =>
      createAdminSettingCommonCapabilityHandlers({
        t,
        addToast,
      }),
    [addToast, t],
  );

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
            void handleSaveConfig();
          },
          primaryActionLabel: t("admin.config.saveConfig"),
        },
        zerotierEmbedded: {
          runtimeSnapshot: zerotierRuntimeSnapshot,
          adminApiAvailable: zerotierAdminApiAvailable,
          actionPending: zerotierActionPending,
          generatingKeypair: generatingZeroTierKeypair,
          onJoinNow: () => {
            void triggerZeroTierAction("/api/v1/admin/zerotier-embedded/join");
          },
          onDisconnect: () => {
            void triggerZeroTierAction("/api/v1/admin/zerotier-embedded/disconnect");
          },
          onReconnect: () => {
            void triggerZeroTierAction("/api/v1/admin/zerotier-embedded/reconnect");
          },
          onGenerateKeypair: () => {
            void handleGenerateZeroTierKeypair();
          },
        },
      }),
    [
      t,
      isDark,
      content,
      pendingAdminPassword,
      runtimeOs,
      systemHardware,
      setContent,
      sharedCapabilities,
      settingLicenseBinding,
      handleSaveConfig,
      zerotierRuntimeSnapshot,
      zerotierAdminApiAvailable,
      zerotierActionPending,
      generatingZeroTierKeypair,
      triggerZeroTierAction,
      handleGenerateZeroTierKeypair,
    ],
  );

  const handleConfigPathAction = () => {
    void addToast(
      t([
        "systemConfig.setup.guide.runtimeDirChangeHint",
        "launcher.runtime_dir_change_hint",
      ]),
      { type: "info", duration: "long" },
    );
  };

  return (
    <AdminPage>
      <SettingWorkbenchSurface
        title={t("admin.config.title")}
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
        settingActions={settingActions}
        testAction={{
          label: t("systemConfig.setup.editor.check"),
          onClick: () => {
            void handleTest();
          },
          disabled: testing || reloading,
        }}
        primaryAction={{
          label: t("admin.config.saveConfig"),
          onClick: () => {
            void handleSaveConfig();
          },
          disabled: testing || reloading,
        }}
        workbenchProps={{
          tomlAdapter: toml,
          loading,
          configPath,
          content,
          savedContent,
          notes,
          validationErrors,
          busy: testing || reloading,
          onChange: setContent,
          onTest: handleTest,
          onSave: handleSaveConfig,
          onCancel: resetToSaved,
          showCancel: false,
          onClearValidationErrors: clearValidationErrors,
          restartNotice: t("admin.config.restartNotice"),
          saveSummary,
          saveSummaryLevel,
          runtimeOs,
          systemHardware,
          onDiagnoseExternalTools: sharedCapabilities.onDiagnoseExternalTools,
          onProbeExternalTool: sharedCapabilities.onProbeExternalTool,
          onProbeMediaBackend: sharedCapabilities.onProbeMediaBackend,
          ...(quickSettingsLicense ? { quickSettingsLicense } : {}),
          editorTitle: t("admin.config.title"),
          testLabel: t("systemConfig.setup.editor.check"),
        }}
      />
    </AdminPage>
  );
};
