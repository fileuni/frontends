import type { ProtectedStorageStatus } from '@/stores/protectedStorage.ts';

const normalizePath = (path: string): string => {
  const trimmed = path.trim();
  if (!trimmed || trimmed === '/') return '/';
  return trimmed.replace(/\/+/g, '/').replace(/(.+)\/$/, '$1') || '/';
};

export const pathMatchesProtectedRoot = (
  path: string,
  protectedRoot?: string | null,
): boolean => {
  if (!protectedRoot) return false;
  const normalizedPath = normalizePath(path);
  const normalizedRoot = normalizePath(protectedRoot);
  return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`);
};

export const isProtectedSubdirRoot = (
  protectedRoot?: string | null,
): boolean => {
  return Boolean(protectedRoot && normalizePath(protectedRoot) !== '/');
};

export const isProtectedPathUnavailable = (
  status: ProtectedStorageStatus | null,
): boolean => {
  if (!status?.enabled) return false;
  if (!status.protected_mode) return false;
  return status.global_mode !== status.protected_mode;
};

export const shouldUsePermanentDeleteForPath = (
  path: string,
  status: ProtectedStorageStatus | null,
): boolean => {
  if (!status?.enabled || !isProtectedSubdirRoot(status.protected_root)) return false;
  return pathMatchesProtectedRoot(path, status.protected_root);
};

export const shouldDisableThumbnailForPath = (
  path: string,
  status: ProtectedStorageStatus | null,
): boolean => {
  if (!status?.enabled || !status.subdir_thumbnail_disabled) return false;
  if (!isProtectedSubdirRoot(status.protected_root)) return false;
  return pathMatchesProtectedRoot(path, status.protected_root);
};
