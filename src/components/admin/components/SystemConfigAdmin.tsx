import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import * as toml from "smol-toml";
import { client, extractData, handleApiError } from "@/lib/api.ts";
import type { components } from "@/lib/api.ts";
import type {
  ConfigError,
  ConfigNoteEntry as SharedConfigNoteEntry,
} from "@/components/setting/ConfigRawEditor";
import { SettingWorkbenchSurface } from "@/components/setting/SettingWorkbenchSurface";
import { ConfigPathActionButton } from "@/components/setting/ConfigPathActionButton";
import { buildSettingCommonActions } from "@/components/setting/SettingCommonActions";
import type { SystemHardwareInfo } from "@/components/setting/ConfigQuickSettingsModal";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { useToastStore } from "@/stores/toast";
import { useAuthzStore } from "@/stores/authz.ts";
import { useAuthStore } from "@/stores/auth.ts";
import { AdminPage } from "./admin-ui";
import type { ExternalToolDiagnosisResponse } from "@/components/setting/ExternalDependencyConfigModal";

type ConfigRawResponse = components["schemas"]["ConfigRawResponse"];
type ConfigNotesResponse = components["schemas"]["ConfigNotesResponse"];
type ApiConfigNoteEntry = components["schemas"]["ConfigNoteEntry"];
type BackendCapabilitiesResponse = components["schemas"]["SystemCapabilities"];

type LicenseStatus = {
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

type ConfigValidationError = {
  message: string;
  line?: number;
  column?: number;
  key?: string | null;
};

type LineDiffStats = {
  changed: number;
  added: number;
  removed: number;
};

const isConfigValidationError = (
  value: unknown,
): value is ConfigValidationError => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.message !== "string") return false;
  if (candidate.line !== undefined && typeof candidate.line !== "number")
    return false;
  if (candidate.column !== undefined && typeof candidate.column !== "number")
    return false;
  if (
    candidate.key !== undefined &&
    candidate.key !== null &&
    typeof candidate.key !== "string"
  )
    return false;
  return true;
};

const normalizeValidationErrors = (raw: unknown): ConfigValidationError[] => {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isConfigValidationError);
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

const extractValidationErrorsFromException = (
  error: unknown,
): ConfigValidationError[] => {
  if (typeof error !== "object" || error === null) return [];
  const payload = (error as Record<string, unknown>).data;
  return normalizeValidationErrors(payload);
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [configPath, setConfigPath] = useState("");
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [notes, setNotes] = useState<Record<string, ApiConfigNoteEntry>>({});
  const [validationErrors, setValidationErrors] = useState<
    ConfigValidationError[]
  >([]);
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(
    null,
  );
  const [licenseKey, setLicenseKey] = useState("");
  const [pendingAdminPassword, setPendingAdminPassword] = useState("");
  const [reloadSummary, setReloadSummary] = useState("");
  const [reloadSummaryLevel, setReloadSummaryLevel] = useState<
    "success" | "warning" | "error" | "info"
  >("info");
  const [runtimeOs, setRuntimeOs] = useState("");
  const [systemHardware, setSystemHardware] =
    useState<SystemHardwareInfo | null>(null);
  const { currentUserData } = useAuthStore();

  const fetchConfig = useCallback(async () => {
    const data = await extractData<ConfigRawResponse>(
      client.GET("/api/v1/admin/system/config/raw"),
    );
    if (data) {
      setConfigPath(data.config_path || "");
      setContent(data.toml_content || "");
      setSavedContent(data.toml_content || "");
    }
  }, []);

  const fetchNotes = useCallback(async () => {
    const data = await extractData<ConfigNotesResponse>(
      client.GET("/api/v1/admin/system/config/notes"),
    );
    if (data) {
      setNotes(data.notes || {});
    }
  }, []);

  const fetchLicenseStatus = useCallback(async () => {
    try {
      const data = await extractData<LicenseStatus>(
        client.GET("/api/v1/users/admin/license/status"),
      );
      if (data) {
        setLicenseStatus(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchCapabilities = useCallback(async () => {
    try {
      const data = await extractData<BackendCapabilitiesResponse>(
        client.GET("/api/v1/system/backend-capabilities-handshake"),
      );
      setRuntimeOs(typeof data.runtime_os === "string" ? data.runtime_os : "");
    } catch (e) {
      console.error(e);
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

  const { hasPermission } = useAuthzStore();

  useEffect(() => {
    const load = async () => {
      if (!hasPermission("admin.access")) return;
      try {
        await Promise.all([
          fetchConfig(),
          fetchNotes(),
          fetchLicenseStatus(),
          fetchCapabilities(),
          fetchSystemHardware(),
        ]);
      } catch (e) {
        addToast(handleApiError(e, t), "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [
    fetchCapabilities,
    fetchConfig,
    fetchNotes,
    fetchLicenseStatus,
    fetchSystemHardware,
    addToast,
    t,
    hasPermission,
  ]);

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
      await withTimeout(
        extractData<{ message?: string }>(
          client.POST("/api/v1/admin/system/config/test", {
            body: { toml_content: content },
            headers: { "X-No-Toast": "true" },
          }),
        ),
        20_000,
        "Config test request timeout",
      );
      addToast(t("admin.config.testSuccess"), "success");
    } catch (e) {
      console.error("Config test exception:", e);
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

  const handleReload = useCallback(async () => {
    if (reloading || testing) return;
    const passwordError = validatePendingAdminPassword();
    if (passwordError) {
      addToast(passwordError, "error");
      setReloadSummary(passwordError);
      setReloadSummaryLevel("error");
      return;
    }
    setReloading(true);
    setValidationErrors([]);
    setReloadSummary("");
    setReloadSummaryLevel("info");
    try {
      const currentContent = content;
      await withTimeout(
        extractData<{ message?: string }>(
          client.POST("/api/v1/admin/system/config/reload", {
            body: { toml_content: currentContent },
            headers: { "X-No-Toast": "true" },
          }),
        ),
        20_000,
        "Config reload request timeout",
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

      addToast(t("admin.config.reloadSuccess"), "success");
      const diffSummary = formatLineDiffSummary(
        calculateLineDiffStats(currentContent, serverContent),
      );
      if (serverContent !== currentContent) {
        const summary = `Config synced with server: ${diffSummary}`;
        setReloadSummary(summary);
        setReloadSummaryLevel("warning");
      } else {
        const summary = `Config synced with server: ${diffSummary}`;
        setReloadSummary(summary);
        setReloadSummaryLevel("success");
      }
    } catch (e) {
      console.error("Config reload exception:", e);
      const errData = extractValidationErrorsFromException(e);
      if (errData.length > 0) {
        const firstError = errData[0];
        if (!firstError) {
          const summary = handleApiError(e, t);
          setReloadSummary(summary);
          setReloadSummaryLevel("error");
          addToast(summary, "error");
          return;
        }
        setValidationErrors(errData);
        const summary = `${t("admin.config.reloadFailed")}: ${firstError.message}`;
        setReloadSummary(summary);
        setReloadSummaryLevel("error");
        addToast(summary, "error");
      } else {
        const summary = handleApiError(e, t);
        setReloadSummary(summary);
        setReloadSummaryLevel("error");
        addToast(summary, "error");
      }
    } finally {
      setReloading(false);
    }
  }, [
    addToast,
    configPath,
    content,
    currentUserData?.user.id,
    pendingAdminPassword,
    reloading,
    t,
    testing,
    validatePendingAdminPassword,
  ]);

  const handleUpdateLicense = useCallback(async () => {
    if (!licenseKey.trim()) return;
    setSaving(true);
    try {
      const res = await client.POST("/api/v1/users/admin/license/update", {
        body: { license_key: licenseKey.trim() },
      });
      if (res.data?.success) {
        addToast(t("admin.saveSuccess"), "success");
        setLicenseKey("");
        fetchLicenseStatus();
      }
    } catch (e) {
      addToast(handleApiError(e, t), "error");
    } finally {
      setSaving(false);
    }
  }, [addToast, fetchLicenseStatus, licenseKey, t]);

  const handleResetToSaved = () => {
    setContent(savedContent);
    setValidationErrors([]);
  };

  const normalizedNotes: Record<string, SharedConfigNoteEntry> =
    Object.fromEntries(
      Object.entries(notes).map(([key, note]) => [
        key,
        {
          desc_en: note.desc_en || "",
          desc_zh: note.desc_zh || "",
          example: note.example || "",
        },
      ]),
    );

  const editorErrors: ConfigError[] = validationErrors.map((err) => ({
    message: err.message,
    line: typeof err.line === "number" ? err.line : 0,
    column: typeof err.column === "number" ? err.column : 0,
    key: err.key,
  }));

  const handleDiagnoseExternalTools = useCallback(
    async (
      configuredValues: Record<string, string>,
    ): Promise<ExternalToolDiagnosisResponse> => {
      return extractData<ExternalToolDiagnosisResponse>(
        client.POST("/api/v1/admin/system/config/external-tools/diagnose", {
          body: { configured_values: configuredValues },
          headers: { "X-No-Toast": "true" },
        }),
      );
    },
    [],
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
            void handleUpdateLicense();
          },
          saving,
        },
        storage: {
          onPrimaryAction: () => {
            void handleReload();
          },
          primaryActionLabel: t("admin.config.saveAndReload"),
        },
      }),
    [
      t,
      isDark,
      content,
      pendingAdminPassword,
      runtimeOs,
      systemHardware,
      licenseStatus,
      licenseKey,
      handleUpdateLicense,
      saving,
      handleReload,
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
          label: t("admin.config.saveAndReload"),
          onClick: () => {
            void handleReload();
          },
          disabled: testing || reloading,
        }}
        workbenchProps={{
          tomlAdapter: toml,
          loading,
          configPath,
          content,
          savedContent,
          notes: normalizedNotes,
          validationErrors: editorErrors,
          busy: testing || reloading,
          onChange: setContent,
          onTest: handleTest,
          onSave: handleReload,
          onCancel: handleResetToSaved,
          showCancel: false,
          onClearValidationErrors: () => setValidationErrors([]),
          restartNotice: t("admin.config.restartNotice"),
          reloadSummary,
          reloadSummaryLevel,
          runtimeOs,
          systemHardware,
          onDiagnoseExternalTools: handleDiagnoseExternalTools,
          quickSettingsLicense: {
            isValid: Boolean(licenseStatus?.is_valid),
            msg: licenseStatus?.msg,
            currentUsers: licenseStatus?.current_users || 0,
            maxUsers: licenseStatus?.max_users || 0,
            deviceCode: licenseStatus?.device_code || "",
            hwId: licenseStatus?.hw_id,
            auxId: licenseStatus?.aux_id,
            expiresAt: licenseStatus?.expires_at ?? null,
            features: licenseStatus?.features ?? [],
            licenseKey,
            saving,
            onLicenseKeyChange: setLicenseKey,
            onApplyLicense: () => {
              void handleUpdateLicense();
            },
          },
          editorTitle: t("admin.config.title"),
          testLabel: t("systemConfig.setup.editor.check"),
        }}
      />
    </AdminPage>
  );
};
