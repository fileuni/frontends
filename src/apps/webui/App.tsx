import React from "react";
import { useTranslation } from "react-i18next";
import { AppRouter } from "./Router";
import { Navbar } from "@/components/public/components/Navbar.tsx";
import { ToastContainer, ToastI18nContext } from "@/components/ui/Toast";
import { GlobalAudioPlayer } from "@/components/file-manager/components";
import {
  ChatProvider,
  ChatErrorBoundary,
} from "@/components/chat/context/ChatContext";
import { ChatUnifiedUI } from "@/components/chat/components/ChatUnifiedUI";
import { EmailUnifiedUI } from "@/components/email/components/EmailUnifiedUI";
import { useAuthStore } from "@/stores/auth";
import { useAuthzStore } from "@/stores/authz";
import { useConfigStore } from "@/stores/config";
import { MustChangePasswordModal } from "@/components/public/components/MustChangePasswordModal.tsx";
import { cn } from "@/lib/utils.ts";

const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { t } = useTranslation();

  const toastI18n = React.useMemo(
    () => ({
      doNotShowAgain: t("common.doNotShowAgain"),
      viewDetails: t("common.viewDetails"),
      hideDetails: t("common.hideDetails"),
      copy: t("common.copy"),
    }),
    [t],
  );

  return (
    <ToastI18nContext.Provider value={toastI18n}>
      {children}
    </ToastI18nContext.Provider>
  );
};

/**
 * SPA Main Application Entry
 */
export const App: React.FC = () => {
  const { currentUserId, isLoggedIn } = useAuthStore();
  const { capabilities, fetchCapabilities } = useConfigStore();
  const {
    fetchEntitlements,
    clear: clearEntitlements,
    hasPermission,
  } = useAuthzStore();
  const canInitFeatures = Boolean(capabilities);

  React.useEffect(() => {
    void fetchCapabilities();
  }, [fetchCapabilities]);

  const chatAuth = React.useMemo(() => {
    if (!currentUserId) return null;
    return { type: "system" as const, userId: currentUserId };
  }, [currentUserId]);

  const content = (
    <>
      {canInitFeatures && <Navbar />}
      <main className={cn("flex-1 flex flex-col", canInitFeatures && "pt-16 [--public-header-offset:4rem]")}>
        <AppRouter />
      </main>
      {canInitFeatures && <GlobalAudioPlayer />}
      {canInitFeatures && <MustChangePasswordModal />}
    </>
  );

  React.useEffect(() => {
    if (!isLoggedIn || !canInitFeatures) {
      clearEntitlements();
      return;
    }
    void fetchEntitlements();
  }, [
    isLoggedIn,
    fetchEntitlements,
    clearEntitlements,
    canInitFeatures,
  ]);

  const canUseChat =
    canInitFeatures &&
    capabilities?.enable_chat !== false &&
    hasPermission("feature.chat.use");
  const canUseEmail =
    canInitFeatures &&
    capabilities?.enable_email_manager !== false &&
    hasPermission("feature.email_manager.use");

  if (!canInitFeatures || !chatAuth) {
    return (
      <ToastProvider>
        {content}
        <ToastContainer />
      </ToastProvider>
    );
  }

  if (!canUseChat) {
    return (
      <ToastProvider>
        {content}
        {canUseEmail && <EmailUnifiedUI />}
        <ToastContainer />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <ChatErrorBoundary fallback={content}>
        <ChatProvider auth={chatAuth}>
          {content}
          <ChatErrorBoundary>
            <ChatUnifiedUI />
          </ChatErrorBoundary>
          {canUseEmail && <EmailUnifiedUI />}
          <ToastContainer />
        </ChatProvider>
      </ChatErrorBoundary>
    </ToastProvider>
  );
};
