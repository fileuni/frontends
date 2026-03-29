import { client, extractData } from '@/lib/api.ts';

export interface FileIntegrationAppInfo {
  id: string;
  name: string;
  app_type: 'internal' | 'web' | 'local';
  protocol?: string;
  url_template?: string;
  icon?: string;
}

export const fetchFileIntegrationApps = async (
  ext: string,
): Promise<FileIntegrationAppInfo[]> => {
  return extractData<FileIntegrationAppInfo[]>(
    client.GET('/api/v1/file/integration/apps', {
      params: { query: { ext } },
    }),
  );
};

export const fetchWopiOpenUrl = async (
  path: string,
  mode: 'edit' | 'view',
): Promise<string> => {
  const data = await extractData<{ url: string }>(
    client.GET('/api/v1/file/integration/wopi/open', {
      params: { query: { path, mode } },
    }),
  );

  if (!data.url) {
    throw new Error('Failed to resolve WOPI URL');
  }

  return data.url;
};
