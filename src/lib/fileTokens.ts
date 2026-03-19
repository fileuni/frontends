import { client, extractData } from '@/lib/api.ts';

export interface FileDownloadTokenResponse {
  token: string;
}

export const getFileDownloadToken = async (path: string): Promise<string> => {
  const data = await extractData<FileDownloadTokenResponse>(
    client.GET('/api/v1/file/get-file-download-token', {
      params: { query: { path } },
    }),
  );
  return data.token;
};
