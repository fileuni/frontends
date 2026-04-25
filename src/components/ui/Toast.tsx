import React, { useContext } from 'react';
import { createPortal } from 'react-dom';
import {
  DURATION_MAP,
  useToastStore,
} from '@/stores/toast';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import {
  SharedToastContainer,
  ToastI18nContext,
  type ToastI18n,
  type SharedToastViewModel,
} from '@fileuni/ts-shared/toast-ui';

export type ToastI18nContextType = ToastI18n;

export { ToastI18nContext };

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast, toggleDetails, setDoNotShowAndClose } = useToastStore();
  const resolvedTheme = useResolvedTheme();
  const i18n = useContext(ToastI18nContext);

  if (typeof document === 'undefined') return null;

  const mappedToasts: SharedToastViewModel[] = toasts.map((toast) => ({
    id: toast.id,
    message: toast.message,
    type: toast.type,
    duration: toast.duration,
    details: toast.details,
    showDetails: toast.showDetails,
    showDoNotShowAgain: toast.showDoNotShowAgain,
    createdAt: toast.createdAt,
  }));

  const rootStyles = getComputedStyle(document.documentElement);
  const publicHeaderOffset = rootStyles.getPropertyValue('--public-header-offset').trim();
  const topOffset = publicHeaderOffset
    ? `calc(${publicHeaderOffset} + 0.75rem + env(safe-area-inset-top, 0px))`
    : 'max(0.75rem, calc(env(safe-area-inset-top) + 0.75rem))';

  return (
    <SharedToastContainer
      toasts={mappedToasts}
      durations={{
        short: DURATION_MAP.short,
        normal: DURATION_MAP.normal,
        long: DURATION_MAP.long,
      }}
      isDark={resolvedTheme === 'dark'}
      i18n={i18n}
      portalTarget={document.body}
      placement="top-right"
      topOffset={topOffset}
      renderPortal={createPortal}
      onDismiss={removeToast}
      onToggleDetails={toggleDetails}
      onDoNotShowAgain={(id) => {
        void setDoNotShowAndClose(id);
      }}
    />
  );
};

export default ToastContainer;
