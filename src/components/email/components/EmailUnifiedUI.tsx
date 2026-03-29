import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail, X } from "lucide-react";
import { EmailPage } from "@/components/email/components/EmailPage";
import { useEscapeToCloseTopLayer } from '@/hooks/useEscapeToCloseTopLayer';

export interface EmailRouterState {
  isOpen: boolean;
  view: "inbox" | "compose" | "account";
  accountId?: string | undefined;
  folderName?: string | undefined;
}

export const EmailUnifiedUI: React.FC = () => {
  const { t } = useTranslation();
  const [routerState, setRouterState] = useState<EmailRouterState>({
    isOpen: false,
    view: "inbox",
  });

  const parseHash = useCallback((): EmailRouterState => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    
    // Support modalPage=email (Primary) and mod=email (Legacy)
    const isModalEmail = params.get("modalPage") === "email" || params.get("mod") === "email";
    
    // Support formats:
    // #mail - Open mail inbox
    // #mail/compose - Open compose modal
    // #mail/account/{id}/folder/{name} - Open specific account folder
    
    if (hash.startsWith("#mail") && !hash.startsWith("#mail_")) { // Avoid conflict with potential other features
      const parts = hash.replace("#mail", "").split("/").filter(Boolean);
      
      if (parts.length === 0) {
        return { isOpen: true, view: "inbox" };
      }
      
      if (parts[0] === "compose") {
        return { isOpen: true, view: "compose" };
      }
      
      if (parts[0] === "account" && parts.length >= 3 && parts[2] === "folder") {
        return {
          isOpen: true,
          view: "account",
          ...(parts[1] ? { accountId: parts[1] } : {}),
          ...(parts[3] ? { folderName: parts[3] } : {}),
        };
      }
      
      return { isOpen: true, view: "inbox" };
    }
    
    if (isModalEmail) {
      return { isOpen: true, view: "inbox" };
    }
    
    return { isOpen: false, view: "inbox" };
  }, []);

  // Listen for hash changes
  useEffect(() => {
    const checkHash = () => {
      setRouterState(parseHash());
    };

    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, [parseHash]);

  const closeEmail = useCallback(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);
    params.delete("modalPage");
    // Only delete mod if it's EXACTLY "email"
    if (params.get("mod") === "email") {
      params.delete("mod");
    }
    const newHash = params.toString();
    window.location.hash = newHash ? `#${newHash}` : "";
  }, []);

  useEscapeToCloseTopLayer({
    active: routerState.isOpen,
    onEscape: closeEmail,
  });

  if (!routerState.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={closeEmail}
        aria-label={t("common.close")}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-[1400px] h-full bg-background rounded-[2.5rem] shadow-2xl border border-border/50 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="h-16 border-b border-border/40 px-6 flex items-center justify-between bg-muted/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Mail size={22} />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tight">{t("email.title")}</h1>
              <p className="text-sm uppercase font-black tracking-widest opacity-40">{t("email.subtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeEmail}
            className="w-10 h-10 rounded-2xl hover:bg-muted flex items-center justify-center transition-all active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <EmailPage 
            initialView={routerState.view}
            {...(routerState.accountId ? { initialAccountId: routerState.accountId } : {})}
            {...(routerState.folderName ? { initialFolderName: routerState.folderName } : {})}
          />
        </div>
      </div>
    </div>
  );
};
