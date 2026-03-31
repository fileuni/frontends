import { client, extractData } from '@/lib/api.ts';
import type {
  CloudflaredServiceConfig,
  CloudflaredServiceConfigBody,
  CmdResult,
  InstallBody,
  KopiaRuntimeConfig,
  KopiaRuntimeConfigBody,
  OpenlistRuntimeConfig,
  OpenlistRuntimeConfigBody,
  RcloneRuntimeConfig,
  RcloneRuntimeConfigBody,
  ServiceStatus,
  TailscaleRuntimeConfig,
  TailscaleRuntimeConfigBody,
  ToolIntegrationConfig,
  ToolIntegrationConfigBody,
  ToolInfo,
} from './types.ts';

export const fetchToolsApi = async () => extractData<ToolInfo[]>(client.GET('/api/v1/admin/extensions/tools'));

export const fetchServicesApi = async () => extractData<ServiceStatus[]>(client.GET('/api/v1/admin/extensions/services'));

export const fetchLatestToolInfoApi = async (tool: string) =>
  extractData<{ version: string; download_url: string }>(client.GET('/api/v1/admin/extensions/tools/{tool}/latest-info', { params: { path: { tool } } }));

export const installToolApi = async (tool: string, body: InstallBody) =>
  extractData<Record<string, unknown>>(
    client.POST('/api/v1/admin/extensions/tools/{tool}/install', {
      params: { path: { tool } },
      body,
    }),
  );

export const deleteToolApi = async (tool: string) =>
  extractData<Record<string, unknown>>(client.DELETE('/api/v1/admin/extensions/tools/{tool}', { params: { path: { tool } } }));

export const fetchToolIntegrationApi = async (tool: string) =>
  extractData<ToolIntegrationConfig>(client.GET('/api/v1/admin/extensions/tools/{tool}/integration', { params: { path: { tool } } }));

export const saveToolIntegrationApi = async (tool: string, body: ToolIntegrationConfigBody) =>
  extractData<ToolIntegrationConfig>(client.POST('/api/v1/admin/extensions/tools/{tool}/integration', { params: { path: { tool } }, body }));

export const serviceActionApi = async (tool: string, action: 'start' | 'stop' | 'restart') => {
  if (action === 'start') {
    return client.POST('/api/v1/admin/extensions/services/{tool}/start', { params: { path: { tool } } });
  }
  if (action === 'stop') {
    return client.POST('/api/v1/admin/extensions/services/{tool}/stop', { params: { path: { tool } } });
  }
  return client.POST('/api/v1/admin/extensions/services/{tool}/restart', { params: { path: { tool } } });
};

export const runToolCommandApi = async (tool: string, args: string[]) =>
  extractData<CmdResult>(
    client.POST('/api/v1/admin/extensions/tools/{tool}/command', {
      params: { path: { tool } },
      body: { command: tool, args },
    }),
  );

export const resetOpenlistAdminApi = async (data_path: string) =>
  extractData<CmdResult>(client.POST('/api/v1/admin/extensions/special/openlist/reset-admin', { body: { data_path } }));

export const fetchOpenlistRuntimeConfigApi = async () =>
  extractData<OpenlistRuntimeConfig>(client.GET('/api/v1/admin/extensions/special/openlist/runtime-config'));

export const saveOpenlistRuntimeConfigApi = async (body: OpenlistRuntimeConfigBody) =>
  extractData<OpenlistRuntimeConfig>(client.POST('/api/v1/admin/extensions/special/openlist/runtime-config', { body }));

export const fetchRcloneRuntimeConfigApi = async () =>
  extractData<RcloneRuntimeConfig>(client.GET('/api/v1/admin/extensions/special/rclone/runtime-config'));

export const saveRcloneRuntimeConfigApi = async (body: RcloneRuntimeConfigBody) =>
  extractData<RcloneRuntimeConfig>(client.POST('/api/v1/admin/extensions/special/rclone/runtime-config', { body }));

export const fetchKopiaRuntimeConfigApi = async () =>
  extractData<KopiaRuntimeConfig>(client.GET('/api/v1/admin/extensions/special/kopia/runtime-config'));

export const saveKopiaRuntimeConfigApi = async (body: KopiaRuntimeConfigBody) =>
  extractData<KopiaRuntimeConfig>(client.POST('/api/v1/admin/extensions/special/kopia/runtime-config', { body }));

export const fetchCloudflaredServiceConfigApi = async () =>
  extractData<CloudflaredServiceConfig>(client.GET('/api/v1/admin/extensions/special/cloudflared/service-config'));

export const saveCloudflaredServiceConfigApi = async (body: CloudflaredServiceConfigBody) =>
  extractData<CloudflaredServiceConfig>(client.POST('/api/v1/admin/extensions/special/cloudflared/service-config', { body }));

export const fetchTailscaleRuntimeConfigApi = async () =>
  extractData<TailscaleRuntimeConfig>(client.GET('/api/v1/admin/extensions/special/tailscale/runtime-config'));

export const saveTailscaleRuntimeConfigApi = async (body: TailscaleRuntimeConfigBody) =>
  extractData<TailscaleRuntimeConfig>(client.POST('/api/v1/admin/extensions/special/tailscale/runtime-config', { body }));
