import { handleApiError } from '@/lib/api.ts';
import type { ToastType } from '@/stores/toast';
import type { TFunction } from 'i18next';

type AddToast = (message: string, options?: ToastType) => void | Promise<void>;

export const showApiErrorToast = (
  addToast: AddToast,
  t: TFunction,
  error: unknown,
): void => {
  void addToast(handleApiError(error, t), 'error');
};

export const copyTextWithToast = async ({
  text,
  addToast,
  t,
  successMessage,
}: {
  text: string;
  addToast: AddToast;
  t: TFunction;
  successMessage: string;
}): Promise<boolean> => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (!copied) {
        throw new Error('Clipboard copy is unavailable');
      }
    } else {
      throw new Error('Clipboard copy is unavailable');
    }
    await addToast(successMessage, 'success');
    return true;
  } catch (error) {
    showApiErrorToast(addToast, t, error);
    return false;
  }
};
