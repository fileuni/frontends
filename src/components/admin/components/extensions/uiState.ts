import { storageHub } from '@/lib/storageHub';

export type ToolState = {
  version: string;
  downloadUrl: string;
  binPath: string;
  proxy: string;
  dataPath?: string;
  rcloneConfigPath?: string;
  rcloneMountCommand?: string;
  rcloneUnmountCommand?: string;
};

export type PersistedToolState = Omit<ToolState, 'version' | 'downloadUrl'>;

export const extOverridesKey = (userId: string): string => `ext-ui-overrides-v2:${userId}`;

export const restoreToolStateMap = (
  userId: string,
  prev: Record<string, ToolState>,
): Record<string, ToolState> => {
  const key = extOverridesKey(userId);
  try {
    const raw = storageHub.getLocalItem(key);
    if (!raw) return prev;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return prev;
    const payload = parsed as Record<string, unknown>;
    const next = { ...prev };
    Object.keys(payload).forEach((tool) => {
      const v = payload[tool];
      if (!v || typeof v !== 'object') return;
      next[tool] = {
        ...next[tool],
        ...(v as Partial<PersistedToolState>),
        version: '',
        downloadUrl: '',
      };
    });
    return next;
  } catch {
    return prev;
  }
};

export const persistToolStateMap = (userId: string, toolStates: Record<string, ToolState>) => {
  const key = extOverridesKey(userId);
  const toSave: Record<string, PersistedToolState> = {};
  Object.keys(toolStates).forEach((tool) => {
    const currentState = toolStates[tool];
    if (!currentState) return;
    const { version: _ignoredVersion, downloadUrl: _ignoredDownloadUrl, ...persistent } = currentState;
    toSave[tool] = persistent;
  });
  storageHub.setLocalItem(key, JSON.stringify(toSave));
};
