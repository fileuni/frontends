import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import {
  Rocket,
  ShieldCheck,
  Zap,
  Cpu,
  RefreshCw,
  LayoutDashboard,
  Users,
} from "lucide-react";
import { client, extractData } from "@/lib/api";
import { ConfigSetEditor } from "@/components/setting/ConfigSetEditor";
import { useAuthStore } from "@/stores/auth.ts";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { cn } from "@/lib/utils.ts";
import type { SystemCapabilities } from "@/stores/config.ts";

import { useConfigStore } from "@/stores/config.ts";

export const WelcomeView = () => {
  const { t } = useTranslation();
  const resolvedTheme = useResolvedTheme();
  const { isLoggedIn, usersMap, _hasHydrated } = useAuthStore();
  const capabilities = useConfigStore((state) => state.capabilities);
  const [mounted, setMounted] = useState(false);
  const [settingsCenterMode, setSettingsCenterMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const savedUsers = Object.values(usersMap);

  const isDark = resolvedTheme === "dark";

  const checkCapabilities = useCallback(async () => {
    try {
      const caps = await extractData<SystemCapabilities>(
        client.GET("/api/v1/system/backend-capabilities-handshake"),
      );
      setSettingsCenterMode(caps.is_config_set_mode === true);
    } catch (e) {
      console.error("Failed to fetch capabilities", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    void checkCapabilities();
  }, [checkCapabilities]);

  if (!mounted || loading || !_hasHydrated)
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <RefreshCw className="animate-spin text-primary opacity-20" size={48} />
      </div>
    );

  if (settingsCenterMode) {
    return (
      <div className="min-h-screen bg-background px-2 py-2 sm:px-4 sm:py-4">
        <ConfigSetEditor />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-start pt-16 overflow-hidden sm:justify-center">
      {/* Decorative Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl w-full px-4 py-8 text-center sm:px-6 sm:py-12">
        <div className="inline-flex mb-5 transform rotate-3 hover:rotate-0 transition-transform duration-500 sm:mb-8">
          <img
            src={capabilities?.branding?.logo_url || "/favicon.svg"}
            alt={t("common.logoAlt")}
            width={80}
            height={80}
            className="shadow-2xl shadow-primary/20 rounded-2xl"
          />
        </div>

        <h1 className="mb-4 text-3xl font-black tracking-tighter leading-tight sm:text-4xl md:mb-6 md:text-7xl">
          {t("welcome.title")}
        </h1>

        <p className="mx-auto mb-6 max-w-3xl text-base font-medium leading-relaxed italic opacity-70 sm:mb-10 sm:text-lg md:text-2xl">
          {t("welcome.subtitle")}
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          {isLoggedIn ? (
            <>
              <a
                href="#mod=user&page=welcome"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-base font-black text-white shadow-xl shadow-primary/30 transition-all hover:scale-105 sm:h-14 sm:w-auto sm:px-10 sm:text-lg"
              >
                <LayoutDashboard size={20} />
                {t("common.dashboard") || "Dashboard"}
              </a>
              <a
                href="#mod=user&page=accounts"
                className={cn(
                  "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border px-6 text-base font-black transition-all sm:h-14 sm:w-auto sm:px-10 sm:text-lg",
                  isDark
                    ? "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                    : "bg-white border-gray-200 hover:bg-gray-50 text-gray-900 shadow-sm",
                )}
              >
                <Users size={20} />
                {t("auth.switchUser") || "Switch Account"}
              </a>
            </>
          ) : (
            <>
              <a
                href="#mod=public&page=login"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-base font-black text-white shadow-xl shadow-primary/30 transition-all hover:scale-105 sm:h-14 sm:w-auto sm:px-10 sm:text-lg"
              >
                <Rocket size={20} />
                {t("welcome.getStarted")}
              </a>
              {savedUsers.length > 0 && (
                <a
                  href="#mod=user&page=accounts"
                  className={cn(
                    "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border px-6 text-base font-black transition-all sm:h-14 sm:w-auto sm:px-10 sm:text-lg",
                    isDark
                      ? "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                      : "bg-white border-gray-200 hover:bg-gray-50 text-gray-900 shadow-sm",
                  )}
                >
                  <Users size={20} />
                  {t("auth.switchUser") || "Accounts"}
                </a>
              )}
              <a
                href="#mod=public&page=register"
                className={cn(
                  "flex min-h-12 w-full items-center justify-center rounded-2xl border px-6 text-base font-black transition-all sm:h-14 sm:w-auto sm:px-10 sm:text-lg",
                  isDark
                    ? "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                    : "bg-white border-gray-200 hover:bg-gray-50 text-gray-900 shadow-sm",
                )}
              >
                {t("common.register")}
              </a>
            </>
          )}
        </div>

        {/* Feature Badges */}
        <div className="mt-8 flex flex-wrap justify-center gap-3 sm:mt-16 sm:gap-6">
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all sm:px-6 sm:py-3",
              isDark
                ? "bg-white/5 border-white/10"
                : "bg-white border-gray-200 shadow-sm",
            )}
          >
            <Zap className="text-yellow-500" size={18} />
            <span
              className={cn(
                "text-xs font-black tracking-wide sm:text-sm sm:tracking-wider",
                isDark ? "text-white/80" : "text-gray-700",
              )}
            >
              Blazing Fast
            </span>
          </div>
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all sm:px-6 sm:py-3",
              isDark
                ? "bg-white/5 border-white/10"
                : "bg-white border-gray-200 shadow-sm",
            )}
          >
            <ShieldCheck className="text-green-500" size={18} />
            <span
              className={cn(
                "text-xs font-black tracking-wide sm:text-sm sm:tracking-wider",
                isDark ? "text-white/80" : "text-gray-700",
              )}
            >
              Secure Core
            </span>
          </div>
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all sm:px-6 sm:py-3",
              isDark
                ? "bg-white/5 border-white/10"
                : "bg-white border-gray-200 shadow-sm",
            )}
          >
            <Cpu className="text-blue-500" size={18} />
            <span
              className={cn(
                "text-xs font-black tracking-wide sm:text-sm sm:tracking-wider",
                isDark ? "text-white/80" : "text-gray-700",
              )}
            >
              Modular
            </span>
          </div>
        </div>

        {/* Custom Footer if available */}
        {capabilities?.branding?.footer_text && (
          <div className="mt-10 border-t border-dashed border-white/5 pt-6 text-xs opacity-40 font-bold tracking-wide leading-relaxed sm:mt-20 sm:pt-10 sm:text-sm sm:tracking-widest">
            {capabilities.branding.footer_text}
          </div>
        )}
      </div>
    </div>
  );
};
