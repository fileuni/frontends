import { isTauriRuntime } from './runtime';

export const openExternalUrl = async (url: string): Promise<void> => {
  if (typeof window === 'undefined') {
    return;
  }

  if (isTauriRuntime()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('plugin:opener|open_url', { url, app: null });
      return;
    } catch (error) {
      console.warn('Failed to open external URL via Tauri opener', error);
    }
  }

  window.open(url, '_blank', 'noopener,noreferrer');
};
