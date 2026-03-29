import { BASE_URL } from '@/lib/api.ts';
import type { FileInfo } from '../types/index.ts';

export type SharePasswordMode = 'keep' | 'change' | 'remove';

export interface ShareFormState {
  password: string;
  expireDate: string;
  maxDownloads: number;
  enableDirect: boolean;
  canUpload: boolean;
  canUpdateNoCreate: boolean;
  canDelete: boolean;
  passwordMode: SharePasswordMode;
}

export interface ShareClipboardLabels {
  title: string;
  file: string;
  link: string;
  password: string;
  existingPassword: string;
  directTitle: string;
  directUrl: string;
  directUser: string;
  directPass: string;
}

export const EMPTY_SHARE_FORM: ShareFormState = {
  password: '',
  expireDate: '',
  maxDownloads: 0,
  enableDirect: false,
  canUpload: false,
  canUpdateNoCreate: false,
  canDelete: false,
  passwordMode: 'keep',
};

export const formatShareDateForInput = (date: Date): string => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const createEditingShareForm = (file: FileInfo): ShareFormState => ({
  password: '',
  expireDate: file.expire_at ? formatShareDateForInput(new Date(file.expire_at)) : '',
  maxDownloads: file.max_downloads || 0,
  enableDirect: file.enable_direct || false,
  canUpload: file.can_upload || false,
  canUpdateNoCreate: file.can_update_no_create || false,
  canDelete: file.can_delete || false,
  passwordMode: 'keep',
});

export const createNewShareForm = (): ShareFormState => {
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 7);
  return {
    ...EMPTY_SHARE_FORM,
    expireDate: formatShareDateForInput(defaultDate),
    passwordMode: 'change',
  };
};

export const getShareExpireDays = (expireDate: string): number | undefined => {
  if (!expireDate) return undefined;
  const now = new Date();
  const target = new Date(expireDate);
  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : undefined;
};

export const hasVisibleSharePassword = (
  form: ShareFormState,
  isEditing: boolean,
): boolean => {
  return Boolean((form.passwordMode === 'change' || (!isEditing && form.password)) && form.password);
};

export const currentShareHasPassword = (
  form: ShareFormState,
  file: FileInfo | null,
): boolean => {
  if (form.passwordMode === 'remove') return false;
  if (form.passwordMode === 'change') return Boolean(form.password);
  return Boolean(file?.has_password);
};

export const buildShareCreateBody = (
  file: FileInfo,
  form: ShareFormState,
): Record<string, unknown> => {
  const expireDays = getShareExpireDays(form.expireDate);
  return {
    path: file.path,
    ...(form.password ? { password: form.password } : {}),
    ...(expireDays !== undefined ? { expire_days: expireDays } : {}),
    ...(form.maxDownloads > 0 ? { max_downloads: form.maxDownloads } : {}),
    enable_direct: form.enableDirect,
    ...(file.is_dir ? { can_upload: form.canUpload } : {}),
    ...(file.is_dir ? { can_update_no_create: form.canUpdateNoCreate } : {}),
    ...(file.is_dir ? { can_delete: form.canDelete } : {}),
  };
};

export const buildShareUpdateBody = (
  file: FileInfo,
  form: ShareFormState,
): Record<string, unknown> => {
  const days = getShareExpireDays(form.expireDate);
  const body: Record<string, unknown> = {
    enable_direct: form.enableDirect,
    expire_days: form.expireDate === '' ? null : (days !== undefined ? days : null),
    max_downloads: form.maxDownloads > 0 ? form.maxDownloads : null,
    ...(file.is_dir ? { can_upload: form.canUpload } : {}),
    ...(file.is_dir ? { can_update_no_create: form.canUpdateNoCreate } : {}),
    ...(file.is_dir ? { can_delete: form.canDelete } : {}),
  };

  if (form.passwordMode === 'change') {
    body['password'] = form.password || null;
  } else if (form.passwordMode === 'remove') {
    body['password'] = null;
  }

  return body;
};

const getFrontendBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  const { origin, pathname } = window.location;
  return origin + (pathname.endsWith('/') ? pathname : `${pathname}/`);
};

export const buildShareHashUrl = (
  shareId: string,
  subPath?: string,
): string => {
  const url = `${getFrontendBaseUrl()}#mod=file-manager&page=share&token=${shareId}`;
  return subPath && subPath !== '/'
    ? `${url}&sub_path=${encodeURIComponent(subPath)}`
    : url;
};

export const buildDirectShareUrl = (shareId: string): string => {
  const backendBaseUrl = BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${backendBaseUrl}/api/v1/file/public/direct/${shareId}/`;
};

export const buildDirectShareItemUrl = (
  shareId: string,
  path = '/',
  password?: string,
): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = buildDirectShareUrl(shareId).replace(/\/$/, '');
  const query = password ? `?password=${encodeURIComponent(password)}` : '';
  return `${baseUrl}${normalizedPath}${query}`;
};

export const buildShareClipboardText = ({
  labels,
  fileName,
  shareUrl,
  directUrl,
  password,
  hasVisiblePassword,
  hasExistingPassword,
  directEnabled,
}: {
  labels: ShareClipboardLabels;
  fileName: string;
  shareUrl: string;
  directUrl: string;
  password: string;
  hasVisiblePassword: boolean;
  hasExistingPassword: boolean;
  directEnabled: boolean;
}): string => {
  let info = `${labels.title}\n${labels.file}: ${fileName}\n${labels.link}: ${shareUrl}`;

  if (hasVisiblePassword) {
    info += `\n${labels.password}: ${password}`;
  } else if (hasExistingPassword) {
    info += `\n${labels.password}: ${labels.existingPassword}`;
  }

  if (directEnabled) {
    info += `\n\n${labels.directTitle}\n${labels.directUrl}: ${directUrl}\n${labels.directUser}: fileuni`;
    if (hasVisiblePassword) {
      info += `\n${labels.directPass}: ${password}`;
    } else if (hasExistingPassword) {
      info += `\n${labels.directPass}: ${labels.existingPassword}`;
    }
  }

  return info;
};
