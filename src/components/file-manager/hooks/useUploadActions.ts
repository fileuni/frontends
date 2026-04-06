import { useCallback, useRef } from 'react';
import { useUploadStore, type UploadTask } from '../store/useUploadStore.ts';
import { useAuthStore } from '@/stores/auth.ts';
import { useFileStore } from '../store/useFileStore.ts';
import { useFileActions } from './useFileActions.ts';
import { BASE_URL } from '@/lib/api.ts';
import { isRecord } from '@/lib/configObject.ts';
import type { FileInfo } from '../types/index.ts';

const normalizeUploadedFileInfo = (value: unknown): FileInfo | null => {
  if (!isRecord(value)) return null;

  const name = value['name'];
  const path = value['path'];
  const isDir = value['is_dir'];
  const size = value['size'];
  const modified = value['modified'];

  if (
    typeof name !== 'string' ||
    typeof path !== 'string' ||
    typeof isDir !== 'boolean' ||
    typeof size !== 'number' ||
    typeof modified !== 'string'
  ) {
    return null;
  }

  return {
    name,
    path,
    is_dir: isDir,
    size,
    modified,
    favorite_color: typeof value['favorite_color'] === 'number' ? value['favorite_color'] : 0,
    ...(typeof value['id'] === 'string' ? { id: value['id'] } : {}),
    ...(typeof value['has_active_share'] === 'boolean' ? { has_active_share: value['has_active_share'] } : {}),
    ...(typeof value['has_active_direct'] === 'boolean' ? { has_active_direct: value['has_active_direct'] } : {}),
  };
};

export function useUploadActions() {
  const { updateTask, setUploading } = useUploadStore();
  const { loadStorageStats } = useFileActions();
  const { currentUserData } = useAuthStore();
  
  // Track active XHR objects for potential cancellation (not yet exposed in UI)
  const activeRequests = useRef<Record<string, XMLHttpRequest>>({});

  const uploadFile = useCallback(async (task: UploadTask) => {
    if (task.status !== 'pending') return;

    updateTask(task.id, { status: 'uploading', progress: 0 });
    setUploading(true);

    const fullPath = (task.targetPath === '/' ? '' : task.targetPath) + '/' + task.file.name;
    const url = `${BASE_URL}/api/v1/file/upload-raw?path=${encodeURIComponent(fullPath)}`;

    const xhr = new XMLHttpRequest();
    activeRequests.current[task.id] = xhr;

    xhr.open('POST', url, true);
    
    // Set authorization header
    if (currentUserData?.access_token) {
      xhr.setRequestHeader('Authorization', `Bearer ${currentUserData.access_token}`);
    }

    // Listen for progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        updateTask(task.id, { progress: percent });
      }
    };

    xhr.onload = () => {
      delete activeRequests.current[task.id];
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response: unknown = JSON.parse(xhr.responseText);
          if (isRecord(response) && response['success'] === true) {
            updateTask(task.id, { status: 'completed', progress: 100 });
            
            // Partial refresh: if target matches latest currentPath, append and highlight
            const latestStore = useFileStore.getState();
            const latestCurrentPath = latestStore.getCurrentPath();
            
            if (task.targetPath === latestCurrentPath) {
              const newFile = normalizeUploadedFileInfo(response['data']);
              if (!newFile) {
                throw new Error('Invalid upload response payload');
              }
              latestStore.appendFiles([newFile]);
              latestStore.setHighlightedPath(newFile.path);
            }
            
            loadStorageStats();
          } else {
              const errorMsg =
              isRecord(response) && typeof response['msg'] === 'string'
                ? response['msg']
                : 'Upload failed';
            updateTask(task.id, { status: 'error', errorMsg: errorMsg });
          }
        } catch (_error) {
          updateTask(task.id, { status: 'error', errorMsg: 'Invalid response from server' });
        }
      } else {
        updateTask(task.id, { status: 'error', errorMsg: `HTTP ${xhr.status}: ${xhr.statusText}` });
      }
      
      // Check if all tasks are completed
      const remaining = useUploadStore.getState().tasks.filter(t => t.status === 'uploading').length;
      if (remaining === 0) setUploading(false);
    };

    xhr.onerror = () => {
      delete activeRequests.current[task.id];
      updateTask(task.id, { status: 'error', errorMsg: 'Network error occurred' });
      
      const remaining = useUploadStore.getState().tasks.filter(t => t.status === 'uploading').length;
      if (remaining === 0) setUploading(false);
    };

    xhr.send(task.file);
  }, [updateTask, setUploading, loadStorageStats, currentUserData]);

  return { uploadFile };
}
