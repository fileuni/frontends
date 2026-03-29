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
    await navigator.clipboard.writeText(text);
    await addToast(successMessage, 'success');
    return true;
  } catch (error) {
    showApiErrorToast(addToast, t, error);
    return false;
  }
};
