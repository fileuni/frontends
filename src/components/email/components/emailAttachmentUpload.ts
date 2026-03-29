import { BASE_URL, type BaseResponse } from '@/lib/api.ts';
import { createClientUniqueId } from './emailUtils.tsx';
import type { ComposeAttachment, UploadFileInfo } from './emailTypes.ts';

export const uploadTempVfsAttachment = async (args: {
  attachment: ComposeAttachment;
  accessToken?: string | null;
}): Promise<string> => {
  const { attachment, accessToken } = args;

  const safeFilename = attachment.name.replace(/[\\/]/g, '_');
  const targetPath = `/.virtual/tmp/email_attachments/${createClientUniqueId()}_${safeFilename}`;
  const uploadUrl = `${BASE_URL}/api/v1/file/upload-raw?path=${encodeURIComponent(targetPath)}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
    body: attachment.file,
  });

  const payload = (await response
    .json()
    .catch((): null => null)) as BaseResponse<UploadFileInfo> | null;
  const uploadedPath = payload?.data?.path;
  if (!response.ok || !payload?.success || !uploadedPath) {
    throw new Error(payload?.msg || 'Attachment upload failed');
  }

  return uploadedPath;
};
