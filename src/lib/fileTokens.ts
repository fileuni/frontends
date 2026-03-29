import { BASE_URL, client, extractData } from '@/lib/api.ts';

export interface FileDownloadTokenResponse {
  token: string;
}

interface FileContentUrlOptions {
  inline?: boolean;
  mode?: string;
  baseUrl?: string;
}

const normalizeBaseUrl = (baseUrl: string): string => {
  return baseUrl.length === 0 ? '' : baseUrl.replace(/\/+$/, '');
};

export const buildFileContentUrl = (
  token: string,
  { inline = false, mode, baseUrl = BASE_URL }: FileContentUrlOptions = {},
): string => {
  const params = new URLSearchParams({
    file_download_token: token,
  });

  if (inline) {
    params.set('inline', 'true');
  }

  if (mode) {
    params.set('mode', mode);
  }

  return `${normalizeBaseUrl(baseUrl)}/api/v1/file/get-content?${params.toString()}`;
};

export const getFileDownloadToken = async (path: string): Promise<string> => {
  const data = await extractData<FileDownloadTokenResponse>(
    client.GET('/api/v1/file/get-file-download-token', {
      params: { query: { path } },
    }),
  );
  return data.token;
};

export const getFileContentUrl = async (
  path: string,
  options?: FileContentUrlOptions,
): Promise<string> => {
  const token = await getFileDownloadToken(path);
  return buildFileContentUrl(token, options);
};

export const fetchTextFileContent = async (path: string): Promise<string> => {
  const url = await getFileContentUrl(path, { inline: true, mode: 'text' });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status}`);
  }
  return response.text();
};

export const triggerBrowserDownload = (url: string, fileName: string): void => {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadFileByPath = async (
  path: string,
  fileName: string,
  options?: FileContentUrlOptions,
): Promise<void> => {
  const url = await getFileContentUrl(path, options);
  triggerBrowserDownload(url, fileName);
};
