import { useCallback, useMemo, useState } from "react";
import type { ConfigError, ConfigNoteEntry } from "./ConfigRawEditor";
import type { SystemHardwareInfo } from "./ConfigQuickSettingsModal";

export type ConfigWorkbenchLicenseStatus = {
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

export type ConfigWorkbenchSummaryLevel =
  | "success"
  | "warning"
  | "error"
  | "info";

export type ConfigWorkbenchData<
  TLicenseStatus extends ConfigWorkbenchLicenseStatus,
> = {
  configPath: string;
  content: string;
  notes: Record<string, ConfigNoteEntry>;
  runtimeOs?: string;
  systemHardware?: SystemHardwareInfo | null;
  licenseKey?: string;
  licenseStatus?: TLicenseStatus | null;
};

type LicenseUpdateResult<TLicenseStatus extends ConfigWorkbenchLicenseStatus> =
  | TLicenseStatus
  | null
  | void
  | {
      licenseStatus?: TLicenseStatus | null;
      licenseKey?: string;
      clearLicenseKey?: boolean;
    };

type UseConfigWorkbenchControllerOptions<
  TLicenseStatus extends ConfigWorkbenchLicenseStatus,
> = {
  initialLoading?: boolean;
  load?: (() => Promise<ConfigWorkbenchData<TLicenseStatus>>) | undefined;
  loadLicenseStatus?: (() => Promise<TLicenseStatus | null>) | undefined;
  updateLicense?: (
    licenseKey: string,
  ) => Promise<LicenseUpdateResult<TLicenseStatus>>;
  onLicenseError?: ((error: unknown) => void | Promise<void>) | undefined;
};

export type ConfigWorkbenchQuickSettingsLicense = {
  isValid: boolean;
  msg?: string;
  currentUsers: number;
  maxUsers: number;
  deviceCode: string;
  hwId?: string;
  auxId?: string;
  expiresAt?: string | null;
  features?: string[];
  licenseKey: string;
  saving: boolean;
  onLicenseKeyChange: (value: string) => void;
  onApplyLicense: () => void;
};

type ConfigWorkbenchValidationLike = {
  message: string;
  line?: number | null;
  column?: number | null;
  key?: string | null;
};

export const normalizeConfigValidationErrors = (raw: unknown): ConfigError[] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((item): item is ConfigWorkbenchValidationLike => {
      if (typeof item !== "object" || item === null) {
        return false;
      }
      const candidate = item as Record<string, unknown>;
      if (typeof candidate["message"] !== "string") {
        return false;
      }
      if (
        candidate["line"] !== undefined &&
        candidate["line"] !== null &&
        typeof candidate["line"] !== "number"
      ) {
        return false;
      }
      if (
        candidate["column"] !== undefined &&
        candidate["column"] !== null &&
        typeof candidate["column"] !== "number"
      ) {
        return false;
      }
      if (
        candidate["key"] !== undefined &&
        candidate["key"] !== null &&
        typeof candidate["key"] !== "string"
      ) {
        return false;
      }
      return true;
    })
    .map((item) => ({
      message: item.message,
      line: typeof item.line === "number" ? item.line : 0,
      column: typeof item.column === "number" ? item.column : 0,
      key: typeof item.key === "string" ? item.key : null,
    }));
};

export const extractConfigValidationErrorsFromException = (
  error: unknown,
): ConfigError[] => {
  if (typeof error !== "object" || error === null) {
    return [];
  }
  const payload = (error as Record<string, unknown>)["data"];
  return normalizeConfigValidationErrors(payload);
};

export const normalizeConfigNotes = <
  TNote extends {
    desc_en?: string | null;
    desc_zh?: string | null;
    example?: string | null;
  },
>(
  notes: Record<string, TNote>,
): Record<string, ConfigNoteEntry> => {
  return Object.fromEntries(
    Object.entries(notes).map(([key, note]) => [
      key,
      {
        desc_en: note.desc_en ?? "",
        desc_zh: note.desc_zh ?? "",
        example: note.example ?? "",
      },
    ]),
  );
};

const isLicenseUpdatePayload = <TLicenseStatus extends ConfigWorkbenchLicenseStatus>(
  value: LicenseUpdateResult<TLicenseStatus>,
): value is {
  licenseStatus?: TLicenseStatus | null;
  licenseKey?: string;
  clearLicenseKey?: boolean;
} => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (
    "licenseStatus" in value ||
    "licenseKey" in value ||
    "clearLicenseKey" in value
  );
};

export const useConfigWorkbenchController = <
  TLicenseStatus extends ConfigWorkbenchLicenseStatus,
>({
  initialLoading = true,
  load,
  loadLicenseStatus,
  updateLicense,
  onLicenseError,
}: UseConfigWorkbenchControllerOptions<TLicenseStatus>) => {
  const [loading, setLoading] = useState(initialLoading);
  const [configPath, setConfigPath] = useState("");
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [notes, setNotes] = useState<Record<string, ConfigNoteEntry>>({});
  const [validationErrors, setValidationErrors] = useState<ConfigError[]>([]);
  const [reloadSummary, setReloadSummary] = useState("");
  const [reloadSummaryLevel, setReloadSummaryLevel] =
    useState<ConfigWorkbenchSummaryLevel>("info");
  const [runtimeOs, setRuntimeOs] = useState("");
  const [systemHardware, setSystemHardware] =
    useState<SystemHardwareInfo | null>(null);
  const [licenseStatus, setLicenseStatus] =
    useState<TLicenseStatus | null>(null);
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseSaving, setLicenseSaving] = useState(false);

  const clearReloadSummary = useCallback(() => {
    setReloadSummary("");
    setReloadSummaryLevel("info");
  }, []);

  const applyWorkbenchData = useCallback(
    (data: ConfigWorkbenchData<TLicenseStatus>) => {
      setConfigPath(data.configPath);
      setContent(data.content);
      setSavedContent(data.content);
      setNotes(data.notes);
      setValidationErrors([]);
      clearReloadSummary();
      setRuntimeOs(data.runtimeOs ?? "");
      setSystemHardware(data.systemHardware ?? null);
      if (typeof data.licenseKey === "string") {
        setLicenseKey(data.licenseKey);
      }
      if ("licenseStatus" in data) {
        setLicenseStatus(data.licenseStatus ?? null);
      }
    },
    [clearReloadSummary],
  );

  const loadWorkbench = useCallback(async () => {
    if (!load) {
      throw new Error("Config workbench loader is not configured");
    }
    setLoading(true);
    try {
      const [data, nextLicenseStatus] = await Promise.all([
        load(),
        loadLicenseStatus ? loadLicenseStatus() : Promise.resolve(undefined),
      ]);
      applyWorkbenchData({
        ...data,
        ...(loadLicenseStatus ? { licenseStatus: nextLicenseStatus ?? null } : {}),
      });
      return data;
    } finally {
      setLoading(false);
    }
  }, [applyWorkbenchData, load, loadLicenseStatus]);

  const refreshLicenseStatus = useCallback(async () => {
    if (!loadLicenseStatus) {
      return null;
    }
    const nextStatus = await loadLicenseStatus();
    setLicenseStatus(nextStatus);
    return nextStatus;
  }, [loadLicenseStatus]);

  const applyLicenseKey = useCallback(async () => {
    if (!updateLicense) {
      return null;
    }
    const trimmed = licenseKey.trim();
    if (!trimmed) {
      return null;
    }
    setLicenseSaving(true);
    try {
      const result = await updateLicense(trimmed);
      if (isLicenseUpdatePayload(result)) {
        if ("licenseStatus" in result) {
          setLicenseStatus(result.licenseStatus ?? null);
        }
        if (typeof result.licenseKey === "string") {
          setLicenseKey(result.licenseKey);
        } else if (result.clearLicenseKey) {
          setLicenseKey("");
        }
        return result;
      }
      if (result !== undefined) {
        setLicenseStatus(result ?? null);
      }
      return result ?? null;
    } finally {
      setLicenseSaving(false);
    }
  }, [licenseKey, updateLicense]);

  const safeApplyLicenseKey = useCallback(async () => {
    try {
      await applyLicenseKey();
    } catch (error) {
      await onLicenseError?.(error);
    }
  }, [applyLicenseKey, onLicenseError]);

  const resetToSaved = useCallback(() => {
    setContent(savedContent);
    setValidationErrors([]);
  }, [savedContent]);

  const clearValidationErrors = useCallback(() => {
    setValidationErrors([]);
  }, []);

  const setSummary = useCallback(
    (summary: string, level: ConfigWorkbenchSummaryLevel) => {
      setReloadSummary(summary);
      setReloadSummaryLevel(level);
    },
    [],
  );

  const settingLicenseBinding = useMemo(() => {
    if (!updateLicense) {
      return undefined;
    }
    return {
      status: licenseStatus,
      licenseKey,
      onLicenseKeyChange: setLicenseKey,
      onApplyLicense: () => {
        void safeApplyLicenseKey();
      },
      saving: licenseSaving,
    };
  }, [licenseKey, licenseSaving, licenseStatus, safeApplyLicenseKey, updateLicense]);

  const quickSettingsLicense = useMemo<
    ConfigWorkbenchQuickSettingsLicense | undefined
  >(() => {
    if (!updateLicense) {
      return undefined;
    }
    return {
      isValid: Boolean(licenseStatus?.is_valid),
      ...(licenseStatus?.msg ? { msg: licenseStatus.msg } : {}),
      currentUsers: licenseStatus?.current_users ?? 0,
      maxUsers: licenseStatus?.max_users ?? 0,
      deviceCode: licenseStatus?.device_code ?? "",
      ...(licenseStatus?.hw_id ? { hwId: licenseStatus.hw_id } : {}),
      ...(licenseStatus?.aux_id ? { auxId: licenseStatus.aux_id } : {}),
      expiresAt: licenseStatus?.expires_at ?? null,
      features: licenseStatus?.features ?? [],
      licenseKey,
      saving: licenseSaving,
      onLicenseKeyChange: setLicenseKey,
      onApplyLicense: () => {
        void safeApplyLicenseKey();
      },
    };
  }, [licenseKey, licenseSaving, licenseStatus, safeApplyLicenseKey, updateLicense]);

  return {
    loading,
    setLoading,
    configPath,
    setConfigPath,
    content,
    setContent,
    savedContent,
    setSavedContent,
    notes,
    setNotes,
    validationErrors,
    setValidationErrors,
    clearValidationErrors,
    reloadSummary,
    reloadSummaryLevel,
    setSummary,
    clearReloadSummary,
    runtimeOs,
    setRuntimeOs,
    systemHardware,
    setSystemHardware,
    licenseStatus,
    setLicenseStatus,
    licenseKey,
    setLicenseKey,
    licenseSaving,
    loadWorkbench,
    refreshLicenseStatus,
    applyLicenseKey,
    safeApplyLicenseKey,
    applyWorkbenchData,
    resetToSaved,
    settingLicenseBinding,
    quickSettingsLicense,
  };
};
