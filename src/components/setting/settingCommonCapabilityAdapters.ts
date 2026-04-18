import type { TFunction } from "i18next";
import { client, extractData, handleApiError } from "@/lib/api";
import type { ExternalToolDiagnosisResponse } from "./ExternalDependencyConfigModal";
import type { FlowStartupExecutionResult } from "./FlowStartupInlinePanel";
import type { MediaBackendProbeResponse } from "./MediaTranscodingConfigPanel";
import type { ProbeExternalTool } from "./SharedFfmpegField";
import type { SettingCommonCapabilityHandlers } from "./SettingCommonActions";

type ToastHandler = (
  message: string,
  type: "success" | "error",
) => void | Promise<void>;

type CheckDbPath = "/api/v1/admin/system/config/check-db";

type CheckKvPath = "/api/v1/admin/system/config/check-kv";

type DiagnoseExternalToolsPath =
  "/api/v1/admin/system/config/external-tools/diagnose";

type ProbeExternalToolPath =
  "/api/v1/admin/system/config/external-tools/probe";

type ProbeMediaBackendPath =
  "/api/v1/admin/system/config/media-backend/probe";

type TestPreStartupPath = "/api/v1/admin/startup-commands/test-pre-startup";

type TestPostStartupPath = "/api/v1/admin/startup-commands/test-post-startup";

type HttpCapabilityPaths = {
  checkDb: CheckDbPath;
  checkKv: CheckKvPath;
  diagnoseExternalTools: DiagnoseExternalToolsPath;
  probeExternalTool: ProbeExternalToolPath;
  probeMediaBackend: ProbeMediaBackendPath;
  testPreStartup: TestPreStartupPath;
  testPostStartup: TestPostStartupPath;
};

type CreateHttpSettingCommonCapabilityHandlersParams = {
  t: TFunction;
  addToast: ToastHandler;
  paths: HttpCapabilityPaths;
  headers?: Record<string, string>;
};

type TauriInvoke = <T>(
  command: string,
  args?: Record<string, unknown>,
) => Promise<T>;

type TauriCapabilityCommands = {
  checkDb: string;
  checkKv: string;
  diagnoseExternalTools: string;
  probeExternalTool: string;
  probeMediaBackend: string;
  testPreStartup: string;
  testPostStartup: string;
};

type CreateTauriSettingCommonCapabilityHandlersParams = {
  t: TFunction;
  invoke: TauriInvoke;
  addSuccessToast: (message: string) => void | Promise<void>;
  addErrorToast: (message: string) => void | Promise<void>;
  formatError: (error: unknown) => string;
  commands?: Partial<TauriCapabilityCommands>;
};

const ADMIN_HTTP_PATHS: HttpCapabilityPaths = {
  checkDb: "/api/v1/admin/system/config/check-db",
  checkKv: "/api/v1/admin/system/config/check-kv",
  diagnoseExternalTools: "/api/v1/admin/system/config/external-tools/diagnose",
  probeExternalTool: "/api/v1/admin/system/config/external-tools/probe",
  probeMediaBackend: "/api/v1/admin/system/config/media-backend/probe",
  testPreStartup: "/api/v1/admin/startup-commands/test-pre-startup",
  testPostStartup: "/api/v1/admin/startup-commands/test-post-startup",
};

const TAURI_COMMANDS: TauriCapabilityCommands = {
  checkDb: "check_db_connection",
  checkKv: "check_kv_connection",
  diagnoseExternalTools: "diagnose_external_tools",
  probeExternalTool: "probe_external_tool",
  probeMediaBackend: "probe_media_backend",
  testPreStartup: "test_pre_startup_commands",
  testPostStartup: "test_post_startup_commands",
};

const NO_TOAST_HEADERS = { "X-No-Toast": "true" };

const withHeaders = <TBody extends Record<string, unknown>>(
  body: TBody,
  headers?: Record<string, string>,
) => {
  if (!headers) {
    return { body };
  }
  return { body, headers };
};

export const createHttpSettingCommonCapabilityHandlers = ({
  t,
  addToast,
  paths,
  headers,
}: CreateHttpSettingCommonCapabilityHandlersParams): SettingCommonCapabilityHandlers => ({
  onTestDatabase: async ({ databaseType, connectionString }) => {
    try {
      await extractData(
        client.POST(paths.checkDb, withHeaders({
          db_type: databaseType,
          connection_string: connectionString,
        }, headers)),
      );
      await addToast(t("admin.config.testSuccess"), "success");
    } catch (error) {
      await addToast(handleApiError(error, t), "error");
    }
  },
  onTestCache: async ({ cacheType, connectionString }) => {
    try {
      await extractData(
        client.POST(paths.checkKv, withHeaders({
          kv_type: cacheType,
          connection_string: connectionString,
        }, headers)),
      );
      await addToast(t("admin.config.testSuccess"), "success");
    } catch (error) {
      await addToast(handleApiError(error, t), "error");
    }
  },
  onDiagnoseExternalTools: (configuredValues) =>
    extractData<ExternalToolDiagnosisResponse>(
      client.POST(
        paths.diagnoseExternalTools,
        withHeaders({ configured_values: configuredValues }, headers),
      ),
    ),
  onProbeExternalTool: ({ toolId, value }) =>
    extractData<Awaited<ReturnType<ProbeExternalTool>>>(
      client.POST(
        paths.probeExternalTool,
        withHeaders({ tool_id: toolId, value }, headers),
      ),
    ),
  onProbeMediaBackend: ({ ffmpegPath, backend, device }) =>
    extractData<MediaBackendProbeResponse>(
      client.POST(
        paths.probeMediaBackend,
        withHeaders(
          {
            ffmpeg_path: ffmpegPath,
            backend,
            ...(device ? { device } : {}),
          },
          headers,
        ),
      ),
    ),
  onTestPreStartup: ({ tomlContent }) =>
    extractData<FlowStartupExecutionResult>(
      client.POST(
        paths.testPreStartup,
        withHeaders({ toml_content: tomlContent }, headers),
      ),
    ),
  onTestPostStartup: ({ tomlContent }) =>
    extractData<FlowStartupExecutionResult>(
      client.POST(
        paths.testPostStartup,
        withHeaders({ toml_content: tomlContent }, headers),
      ),
    ),
});

export const createAdminSettingCommonCapabilityHandlers = (
  params: Omit<CreateHttpSettingCommonCapabilityHandlersParams, "paths" | "headers">,
): SettingCommonCapabilityHandlers => {
  return createHttpSettingCommonCapabilityHandlers({
    ...params,
    paths: ADMIN_HTTP_PATHS,
    headers: NO_TOAST_HEADERS,
  });
};

export const createTauriSettingCommonCapabilityHandlers = ({
  t,
  invoke,
  addSuccessToast,
  addErrorToast,
  formatError,
  commands,
}: CreateTauriSettingCommonCapabilityHandlersParams): SettingCommonCapabilityHandlers => {
  const resolved = { ...TAURI_COMMANDS, ...commands };
  return {
    onTestDatabase: async ({ databaseType, connectionString }) => {
      try {
        await invoke<void>(resolved.checkDb, {
          dbType: databaseType,
          connectionString,
        });
        await addSuccessToast(t("admin.config.testSuccess"));
      } catch (error) {
        await addErrorToast(formatError(error));
      }
    },
    onTestCache: async ({ cacheType, connectionString }) => {
      try {
        await invoke<void>(resolved.checkKv, {
          kvType: cacheType,
          connectionString,
        });
        await addSuccessToast(t("admin.config.testSuccess"));
      } catch (error) {
        await addErrorToast(formatError(error));
      }
    },
    onDiagnoseExternalTools: (configuredValues) =>
      invoke<ExternalToolDiagnosisResponse>(resolved.diagnoseExternalTools, {
        payload: { configured_values: configuredValues },
      }),
    onProbeExternalTool: ({ toolId, value }) =>
      invoke<Awaited<ReturnType<ProbeExternalTool>>>(resolved.probeExternalTool, {
        payload: {
          tool_id: toolId,
          value,
        },
      }),
    onProbeMediaBackend: ({ ffmpegPath, backend, device }) =>
      invoke<MediaBackendProbeResponse>(resolved.probeMediaBackend, {
        payload: {
          ffmpeg_path: ffmpegPath,
          backend,
          ...(device ? { device } : {}),
        },
      }),
    onTestPreStartup: ({ tomlContent }) =>
      invoke<FlowStartupExecutionResult>(resolved.testPreStartup, { tomlContent }),
    onTestPostStartup: ({ tomlContent }) =>
      invoke<FlowStartupExecutionResult>(resolved.testPostStartup, { tomlContent }),
  };
};
