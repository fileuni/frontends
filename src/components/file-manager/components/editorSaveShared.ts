import { client } from '@/lib/api.ts';

export const TEXT_EDITOR_AUTO_SAVE = {
  tickMs: 5_000,
  idleMs: 1_500,
  maxIntervalMs: 30_000,
  errorToastCooldownMs: 30_000,
} as const;

export const OFFICE_EDITOR_AUTO_SAVE = {
  tickMs: 10_000,
  idleMs: 3_000,
  maxIntervalMs: 60_000,
  errorToastCooldownMs: 30_000,
} as const;

type SaveReason = 'manual' | 'auto';
type ToastFn = (message: string, type: 'success' | 'error') => void;
type NumberRef = { current: number };

const getRecordMessage = (value: unknown): string | null => {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const msg = (value as Record<string, unknown>)['msg'];
  return typeof msg === 'string' && msg.length > 0 ? msg : null;
};

const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return getRecordMessage(error) ?? fallbackMessage;
};

export const shouldSkipAutoSave = ({
  reason,
  hasChanges,
  lastEditAt,
  lastSavedAt,
  idleMs,
  maxIntervalMs,
}: {
  reason: SaveReason;
  hasChanges: boolean;
  lastEditAt: number;
  lastSavedAt: number;
  idleMs: number;
  maxIntervalMs: number;
}): boolean => {
  if (reason !== 'auto') {
    return false;
  }

  if (!hasChanges) {
    return true;
  }

  const now = Date.now();
  const idleOk = now - lastEditAt >= idleMs;
  const forceOk = now - lastSavedAt >= maxIntervalMs;
  return !idleOk && !forceOk;
};

export const notifyEditorSaveError = ({
  reason,
  error,
  fallbackMessage,
  addToast,
  lastAutoSaveErrorAtRef,
  cooldownMs,
}: {
  reason: SaveReason;
  error: unknown;
  fallbackMessage: string;
  addToast: ToastFn;
  lastAutoSaveErrorAtRef: NumberRef;
  cooldownMs: number;
}): void => {
  const message = getErrorMessage(error, fallbackMessage);

  if (reason === 'manual') {
    addToast(message, 'error');
    return;
  }

  const now = Date.now();
  if (now - lastAutoSaveErrorAtRef.current < cooldownMs) {
    return;
  }

  lastAutoSaveErrorAtRef.current = now;
  addToast(message, 'error');
};

export const saveTextFileContent = async ({
  path,
  content,
  fallbackMessage,
}: {
  path: string;
  content: string;
  fallbackMessage: string;
}): Promise<void> => {
  const { data, error } = await client.PUT('/api/v1/file/content', {
    body: { path, content, is_base64: false },
  });

  if (error) {
    throw new Error(getErrorMessage(error, fallbackMessage));
  }

  if (!data?.['success']) {
    throw new Error(getRecordMessage(data) ?? fallbackMessage);
  }
};
