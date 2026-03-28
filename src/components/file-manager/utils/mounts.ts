import type { ClipboardItem, FileInfo } from '../types/index.ts';

export type DeleteBehavior = 'trash' | 'remote_direct';

export type RemoteMountSummary = {
  id: string;
  name: string;
  driver: string;
  mount_dir: string;
  last_sync_status?: string | null;
  last_sync_at?: string | null;
  next_sync_at?: string | null;
  last_error?: string | null;
};

export const isMountedEntry = (file: Pick<FileInfo, 'mount_id'> | null | undefined): boolean => {
  return Boolean(file?.mount_id);
};

export const isMountRootEntry = (file: Pick<FileInfo, 'is_mount_root'> | null | undefined): boolean => {
  return file?.is_mount_root === true;
};

export const isRemoteDirectDelete = (
  file: Pick<FileInfo, 'delete_behavior'> | Pick<ClipboardItem, 'delete_behavior'> | null | undefined,
): boolean => {
  return file?.delete_behavior === 'remote_direct';
};

export const pathMatchesMountDir = (path: string, mountDir: string): boolean => {
  return path === mountDir || path.startsWith(`${mountDir}/`);
};

export const findMountByPath = <T extends RemoteMountSummary>(path: string, mounts: T[]): T | null => {
  const matched = mounts
    .filter((mount) => pathMatchesMountDir(path, mount.mount_dir))
    .sort((left, right) => right.mount_dir.length - left.mount_dir.length);
  return matched[0] ?? null;
};

export const summarizeMountedSelection = (paths: string[], files: FileInfo[]) => {
  const matchedFiles = paths
    .map((path) => files.find((file) => file.path === path))
    .filter((file): file is FileInfo => Boolean(file));

  return {
    matchedFiles,
    hasMountedEntries: matchedFiles.some((file) => isMountedEntry(file)),
    hasMountRoot: matchedFiles.some((file) => isMountRootEntry(file)),
    hasRemoteDirectDelete: matchedFiles.some((file) => isRemoteDirectDelete(file)),
  };
};

export const currentPathMountContextFromFiles = (currentPath: string, files: FileInfo[]): RemoteMountSummary | null => {
  const candidates = files
    .filter((file) => file.mount_id && file.mount_dir && pathMatchesMountDir(currentPath, file.mount_dir))
    .map((file) => ({
      id: file.mount_id!,
      name: file.mount_name || file.mount_dir || file.path,
      driver: file.mount_driver || 'remote',
      mount_dir: file.mount_dir!,
      last_sync_status: file.mount_sync_status,
      last_sync_at: file.mount_last_sync_at,
      next_sync_at: file.mount_next_sync_at,
      last_error: file.mount_last_error,
    }))
    .sort((left, right) => right.mount_dir.length - left.mount_dir.length);

  return candidates[0] ?? null;
};
