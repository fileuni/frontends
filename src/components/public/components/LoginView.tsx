import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { useAuthStore } from "@/stores/auth.ts";
import { useToastStore } from '@/stores/toast';
import { useConfigStore } from "@/stores/config.ts";
import { Button } from "@/components/ui/Button.tsx";
import { Modal } from "@/components/ui/Modal.tsx";
import { useNavigationStore } from "@/stores/navigation.ts";
import { cn } from "@/lib/utils.ts";
import { PublicCenteredCard } from "./public-ui/PublicCenteredCard.tsx";
import { SavedAccountsShortcut, normalizeLoginIdentifierInput } from './login-shared';
import { FormField } from "@/components/common/FormField.tsx";
import { IconInput } from "@/components/common/IconInput.tsx";
import { PasswordInput } from "@/components/common/PasswordInput.tsx";
import {
  User,
  Lock,
  ArrowRight,
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  XCircle,
  Clock,
  Globe,
  AlertTriangle,
} from "lucide-react";
import { client, extractData, isApiError, postCaptchaPolicy } from "@/lib/api.ts";
import type { components } from "@/types/api.ts";

import { CaptchaChallenge, type CaptchaPayload } from "@/components/common/CaptchaChallenge.tsx";

/* eslint-disable jsx-a11y/tabindex-no-positive -- Keep the login focus flow aligned with the requested keyboard order. */

type UserSession = components["schemas"]["UserSession"];
export const LoginView = () => {
  const { t } = useTranslation();
  const { navigate } = useNavigationStore();
  const {
    usersMap,
    saveLoginInfo,
  } = useAuthStore();
  const { addToast } = useToastStore();
  const { capabilities, fetchCapabilities } = useConfigStore();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [captchaData, setCaptchaData] = useState<CaptchaPayload | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [needCaptcha, setNeedCaptcha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreement, setAgreement] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Device Limit States
  const [showDeviceLimit, setShowDeviceLimit] = useState(false);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [limitInfo, setLimitInfo] = useState({ current: 0, max: 0 });

  const savedUsers = Object.values(usersMap);
  const isTurnstileCaptcha = captchaData?.captcha_type === "turnstile";
  const captchaTokenForSubmit = isTurnstileCaptcha ? turnstileToken : (captchaData?.token ?? "");
  const passwordToggleTabIndex = 3;
  const captchaTabIndex = needCaptcha ? 4 : undefined;
  const agreementTabIndex = needCaptcha ? 5 : 4;
  const submitTabIndex = agreementTabIndex + 1;
  const forgotPasswordTabIndex = submitTabIndex + 1;
  const registerTabIndex = forgotPasswordTabIndex + 1;
  const rememberMeTabIndex = registerTabIndex + 1;
  const privacyTabIndex = rememberMeTabIndex + 1;
  const termsTabIndex = privacyTabIndex + 1;

  useEffect(() => {
    void fetchCapabilities();
  }, [fetchCapabilities]);

  const fetchCaptcha = async (isRefresh = false) => {
    try {
      const query = {
        old_captcha_id: isRefresh && captchaData?.token ? captchaData.token : undefined,
        scene: "LOGIN",
        risk_target: identifier || undefined,
        risk_target_type: "identifier",
      };
        
      const data = await extractData<CaptchaPayload>(
        client.GET("/api/v1/users/public/captcha", {
          params: { query }
        })
      );
      setCaptchaData(data);
      setCaptchaCode("");
      setTurnstileToken("");
    } catch (e) {
      console.error("Failed to fetch captcha", e);
    }
  };

  const handleLogin = async (e?: React.SyntheticEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!agreement) {
      addToast(t("auth.agreement"), "warning");
      return;
    }

    setLoading(true);
    try {
      const policy = await postCaptchaPolicy({
        scene: "LOGIN",
        risk_target: identifier,
        risk_target_type: "identifier",
      });
      if (policy.deny_request) {
        addToast(t("errors.TOO_MANY_ATTEMPTS") || "Too many attempts", "error");
        return;
      }
      if (policy.require_captcha) {
        setNeedCaptcha(true);
        if (!captchaData) {
          await fetchCaptcha();
          addToast(t("auth.captchaRequired"), "warning");
          return;
        }
        if (!captchaTokenForSubmit) {
          addToast(t("auth.captchaRequired"), "warning");
          return;
        }
        if (!isTurnstileCaptcha && !captchaCode.trim()) {
          addToast(t("auth.captchaRequired"), "warning");
          return;
        }
      } else {
        setNeedCaptcha(false);
        setCaptchaCode("");
        setCaptchaData(null);
        setTurnstileToken("");
      }

      const loginData = await extractData<components["schemas"]["LoginResponse"]>(
        client.POST("/api/v1/users/public/login", {
          body: {
            username_or_email_or_phone_or_uid: identifier,
            password: password,
            captcha_token: captchaTokenForSubmit || null,
            captcha_code: isTurnstileCaptcha ? null : (captchaCode || null),
          },
        })
      );

      const isDefaultAdmin = (identifier === 'admin' || loginData.user.username === 'admin') && password === 'admin888';

      saveLoginInfo(
        {
          user: loginData.user,
          access_token: loginData.tokens.access_token,
          refresh_token: loginData.tokens.refresh_token,
          login_time: new Date().toISOString(),
        },
        isDefaultAdmin
      );

      addToast(t("auth.loginSuccess"), "success");
      navigate({ mod: "user", page: "welcome" });
    } catch (e: unknown) {
      if (isApiError(e)) {
        if (e.code === 40301) {
          setNeedCaptcha(true);
          fetchCaptcha();
          addToast(t("auth.captchaRequired"), "warning");
          return;
        }

        const msg = e.msg || "";
        // Detect device limit error
        if (msg.includes("MAX_DEVICES_EXCEEDED")) {
          await fetchPublicSessions();
          setShowDeviceLimit(true);
          return;
        }
        
        addToast(msg || t("errors.INTERNAL_ERROR"), "error");
      } else {
        console.error("Login error:", e);
        addToast(e instanceof Error ? e.message : t("errors.INTERNAL_ERROR"), "error");
      }

      // If captcha error or required, decide whether to refresh based on biz_code
      if (isApiError(e)) {
        if (e.biz_code === 'CAPTCHA_REQUIRED') {
          setNeedCaptcha(true);
          fetchCaptcha(true); // Force new captcha
          setCaptchaCode("");
          setTurnstileToken("");
        } else if (e.biz_code === 'INVALID_CAPTCHA') {
          // Only clear input, don't refresh image, allow retry based on max_attempts
          // Only clear input, don't refresh image, allow retry based on max_attempts
          setCaptchaCode("");
          setTurnstileToken("");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicSessions = async () => {
    try {
      const resData = await extractData<components["schemas"]["SessionListResponse"]>(
        client.POST("/api/v1/users/public/sessions/list", {
          body: {
            username_or_email_or_phone_or_uid: identifier,
            password: password,
          },
        })
      );
      setSessions(resData.sessions || []);
      setLimitInfo({
        current: Number(resData.total) || 0,
        max: Number(resData.max_devices) || 0,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const { data } = await client.POST(
        "/api/v1/users/public/sessions/delete",
        {
          body: {
            username_or_email_or_phone_or_uid: identifier,
            password: password,
            session_id: sessionId,
          },
        },
      );
      if (data?.success) {
        addToast(t("sessions.revokeAccess"), "success");
        // After successful removal, attempt to login again
        setShowDeviceLimit(false);
        handleLogin();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getDeviceIcon = (name: string | null | undefined) => {
    const n = (name || "").toLowerCase();
    if (n.includes("phone") || n.includes("iphone") || n.includes("android"))
      return <Smartphone size={18} />;
    if (n.includes("pad") || n.includes("tablet")) return <Tablet size={18} />;
    if (n.includes("window") || n.includes("linux") || n.includes("mac"))
      return <Monitor size={18} />;
    return <Laptop size={18} />;
  };

  return (
    <PublicCenteredCard
      cardMaxWidthClass="max-w-[420px]"
      decorativeBackground="diagonal"
      accentBarClassName="bg-gradient-to-r from-primary to-blue-600"
    >
      {({ isDark }) => (
        <>
          <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center mb-4">
                <img src="/favicon.svg" alt={t('common.logoAlt')} width={64} height={64} className="shadow-lg" />
              </div>
              <h1 className={cn("text-3xl font-black tracking-tight mb-1", isDark ? "text-white" : "text-gray-900")}>
                {t("common.login")}
              </h1>
              <p className="text-sm opacity-50 font-bold uppercase tracking-widest">
                {t("auth.loginTitle")}
              </p>
            </div>

            <SavedAccountsShortcut
              count={savedUsers.length}
              isDark={isDark}
              title={t('auth.switchToExistingAccount')}
              description={t('auth.manageAccountsDescShort') || 'Select from logged in users'}
              onClick={() => navigate({ mod: 'user', page: 'accounts' })}
            />

            <form onSubmit={handleLogin} className="space-y-6">
              <FormField
                label={
                  capabilities?.enable_mobile_auth && capabilities?.enable_email_auth
                    ? t("auth.usernameEmailPhone")
                    : capabilities?.enable_email_auth
                      ? t("auth.usernameEmail")
                      : capabilities?.enable_mobile_auth
                        ? t("auth.usernamePhone")
                        : t("common.usernameRegister")
                }
                required
              >
                <IconInput
                  icon={<User size={18} />}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onBlur={() => setIdentifier(normalizeLoginIdentifierInput(identifier))}
                  tabIndex={1}
                  placeholder={
                    capabilities?.enable_mobile_auth && capabilities?.enable_email_auth
                      ? t("auth.usernameEmailPhone")
                      : t("common.usernameRegister")
                  }
                  required
                />
              </FormField>

              {needCaptcha && (
                <CaptchaChallenge
                  isDark={isDark}
                  captchaData={captchaData}
                  captchaCode={captchaCode}
                  onCaptchaCodeChange={setCaptchaCode}
                  turnstileToken={turnstileToken}
                  onTurnstileTokenChange={setTurnstileToken}
                  onRefresh={() => void fetchCaptcha(true)}
                  label={t("auth.captcha")}
                  placeholder={t('common.verificationCode')}
                  refreshTitle={t("auth.refreshCaptcha")}
                  turnstileSiteKeyMissingText={t('auth.turnstileSiteKeyMissing')}
                  inputTabIndex={captchaTabIndex}
                />
              )}

              <FormField label={null}>
                <div className="flex justify-between items-center ml-1 -mt-1 mb-2">
                  <span className="text-sm font-black uppercase tracking-widest opacity-40">{t("common.password")}</span>
                  <a
                    href="#mod=public&page=forgot-password"
                    tabIndex={forgotPasswordTabIndex}
                    className="text-sm font-black text-primary hover:underline"
                  >
                    {t("common.forgotPassword")}
                  </a>
                </div>
                <PasswordInput
                  icon={<Lock size={18} />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  tabIndex={2}
                  toggleButtonTabIndex={passwordToggleTabIndex}
                  placeholder=""
                  required
                />
              </FormField>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group p-1 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    tabIndex={rememberMeTabIndex}
                    className={cn(
                      "w-4 h-4 rounded transition-all cursor-pointer",
                      isDark ? "border-white/10 bg-white/5 checked:bg-primary" : "border-gray-300 bg-white checked:bg-primary"
                    )}
                  />
                  <span className="text-sm font-bold opacity-60 leading-tight">
                    {t("common.rememberMe")}
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group p-1 select-none">
                  <input
                    type="checkbox"
                    checked={agreement}
                    onChange={(e) => setAgreement(e.target.checked)}
                    tabIndex={agreementTabIndex}
                    className={cn(
                      "mt-1 w-4 h-4 rounded transition-all cursor-pointer",
                      isDark ? "border-white/10 bg-white/5 checked:bg-primary" : "border-gray-300 bg-white checked:bg-primary"
                    )}
                  />
                  <span className="text-sm font-bold opacity-60 leading-tight">
                    {t("auth.agreementPrefix")}
                    <a
                      href="#mod=public&page=privacy"
                      tabIndex={privacyTabIndex}
                      className="text-primary hover:underline mx-1"
                    >
                      {t("auth.privacyPolicy")}
                    </a>
                    {t("auth.and")}
                    <a
                      href="#mod=public&page=tos"
                      tabIndex={termsTabIndex}
                      className="text-primary hover:underline mx-1"
                    >
                      {t("auth.termsOfService")}
                    </a>
                  </span>
                </label>
              </div>

              <Button className="w-full h-14 text-lg" disabled={loading} tabIndex={submitTabIndex}>
                {loading ? (
                  <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    {t("common.login")} <ArrowRight size={20} />
                  </span>
                )}
              </Button>
            </form>

          {capabilities?.enable_registration !== false && (
            <div className={cn("mt-10 pt-10 border-t text-center", isDark ? "border-white/5" : "border-gray-100")}>
              <p className="text-sm font-bold opacity-50 mb-4">
                {t("auth.noAccount")}
              </p>
              <a
                href="#mod=public&page=register"
                tabIndex={registerTabIndex}
                className="inline-flex items-center justify-center px-8 py-3 rounded-xl border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all font-black uppercase text-sm tracking-widest"
              >
                {t("common.register")}
              </a>
            </div>
          )}

          {/* Device Limit Management Modal */}
          <Modal
            isOpen={showDeviceLimit}
            onClose={() => setShowDeviceLimit(false)}
            title={t("auth.deviceLimitExceeded")}
            className="max-w-lg"
          >
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-4">
                <AlertTriangle
                  className="text-orange-500 shrink-0 mt-1"
                  size={20}
                />
                <p className="text-sm font-bold text-orange-200/80 leading-relaxed">
                  {t("auth.deviceLimitDesc", {
                    count: limitInfo.current,
                    max: limitInfo.max,
                  })}
                </p>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border group transition-all",
                      isDark ? "bg-white/[0.03] border-white/5" : "bg-gray-50 border-gray-100"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isDark ? "bg-white/5" : "bg-white border border-gray-100")}>
                        {getDeviceIcon(session.device_name)}
                      </div>
                      <div>
                        <p className={cn("text-sm font-bold", isDark ? "text-white" : "text-gray-900")}>
                          {session.device_name || t("sessions.unknownDevice")}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 text-[14px] font-mono opacity-40 uppercase tracking-tighter">
                          <span className="flex items-center gap-1">
                            <Globe size={10} /> {session.ip_address}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={10} />{" "}
                            {new Date(
                              session.last_accessed_at || "",
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevokeSession(session.id || "")}
                      className="p-2 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all border border-transparent hover:border-red-500/20 shadow-inner"
                      title={t("sessions.revokeAccess")}
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <div className={cn("pt-4 border-t", isDark ? "border-white/5" : "border-gray-100")}>
                <Button
                  variant="outline"
                  className="w-full border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white"
                  onClick={async () => {
                    if (!confirm(t("sessions.revokeConfirm"))) return;
                    const { data } = await client.POST(
                      "/api/v1/users/public/sessions/delete-all",
                      {
                        body: {
                          username_or_email_or_phone_or_uid: identifier,
                          password: password,
                        },
                      },
                    );
                    if (data?.success) {
                      setShowDeviceLimit(false);
                      handleLogin();
                    }
                  }}
                >
                  {t("auth.revokeAll")}
                </Button>
              </div>
            </div>
          </Modal>
        </>
      )}
    </PublicCenteredCard>
  );
};
