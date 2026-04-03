import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import {
  client,
  extractData,
  handleApiError,
  isApiError,
  postCaptchaPolicy,
} from '@/lib/api.ts';
import { normalizeEmailInput, normalizePhoneInput } from '@/lib/contactNormalize.ts';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import {
  Mail,
  Phone,
  Send,
  User,
  UserPlus,
  Lock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { FormField } from '@/components/common/FormField.tsx';
import { IconInput } from '@/components/common/IconInput.tsx';
import { PasswordInput } from '@/components/common/PasswordInput.tsx';
import { CaptchaChallenge, type CaptchaPayload } from '@/components/common/CaptchaChallenge.tsx';
import { useToastStore } from '@/stores/toast';
import { useConfigStore } from '@/stores/config.ts';
import { PublicCenteredCard } from './public-ui/PublicCenteredCard.tsx';

type RegisterMethod = 'username' | 'email' | 'phone';
type RiskTargetType = 'identifier' | 'email' | 'phone';

const METHOD_ORDER: RegisterMethod[] = ['username', 'email', 'phone'];

const getRegisterScene = (method: RegisterMethod): string => {
  switch (method) {
    case 'username':
      return 'REGISTER_USERNAME';
    case 'email':
      return 'REGISTER_EMAIL';
    case 'phone':
      return 'REGISTER_PHONE';
  }
};

const getRiskTargetType = (method: RegisterMethod): RiskTargetType => {
  switch (method) {
    case 'username':
      return 'identifier';
    case 'email':
      return 'email';
    case 'phone':
      return 'phone';
  }
};

const getSendCodeScene = (method: Extract<RegisterMethod, 'email' | 'phone'>): string => {
  return method === 'email' ? 'register_email' : 'register_phone';
};

export const RegisterView = () => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const { capabilities, fetchCapabilities } = useConfigStore();

  const [method, setMethod] = useState<RegisterMethod>('username');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [sendTimer, setSendTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [agreement, setAgreement] = useState(false);
  const [needCaptcha, setNeedCaptcha] = useState(false);
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaData, setCaptchaData] = useState<CaptchaPayload | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');

  const registrationMethods = capabilities?.registration_methods;
  const isTurnstileCaptcha = captchaData?.captcha_type === 'turnstile';
  const captchaTokenForSubmit = isTurnstileCaptcha ? turnstileToken : (captchaData?.token ?? '');
  const normalizedEmail = normalizeEmailInput(email);
  const normalizedPhone = normalizePhoneInput(phone);
  const activeTarget =
    method === 'username'
      ? username.trim()
      : method === 'email'
        ? normalizedEmail
        : normalizedPhone;

  const isPasswordMatch =
    password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  const methodStates = useMemo(() => {
    if (!registrationMethods) {
      return {
        username: { enabled: true, reason: '' },
        email: { enabled: true, reason: '' },
        phone: { enabled: true, reason: '' },
      } as Record<RegisterMethod, { enabled: boolean; reason: string }>;
    }

    return {
      username: {
        enabled: registrationMethods.username,
        reason: registrationMethods.username ? '' : t('auth.registrationMethodDisabledHint'),
      },
      email: {
        enabled: registrationMethods.email,
        reason: registrationMethods.email
          ? ''
          : registrationMethods.email_configured
            ? t('auth.registrationMethodDisabledHint')
            : t('auth.registrationEmailConfigMissing'),
      },
      phone: {
        enabled: registrationMethods.phone,
        reason: registrationMethods.phone
          ? ''
          : registrationMethods.phone_configured
            ? t('auth.registrationMethodDisabledHint')
            : t('auth.registrationSmsConfigMissing'),
      },
    } as Record<RegisterMethod, { enabled: boolean; reason: string }>;
  }, [registrationMethods, t]);

  const disabledMethodHints = METHOD_ORDER.filter((item) => !methodStates[item].enabled).map(
    (item) => ({ item, reason: methodStates[item].reason }),
  );

  const clearCaptcha = () => {
    setNeedCaptcha(false);
    setCaptchaCode('');
    setCaptchaData(null);
    setTurnstileToken('');
  };

  const fetchCaptcha = async (
    scene: string,
    target: string,
    riskTargetType: RiskTargetType,
    isRefresh = false,
  ) => {
    try {
      const data = await extractData<CaptchaPayload>(
        client.GET('/api/v1/users/public/captcha', {
          params: {
            query: {
              old_captcha_id: isRefresh && captchaData?.token ? captchaData.token : undefined,
              scene,
              risk_target: target || undefined,
              risk_target_type: riskTargetType,
            },
          },
        }),
      );
      setCaptchaData(data);
      setCaptchaCode('');
      setTurnstileToken('');
    } catch (error) {
      console.error('Failed to fetch captcha', error);
    }
  };

  const ensureCaptchaForAction = async (
    scene: string,
    target: string,
    riskTargetType: RiskTargetType,
  ): Promise<boolean> => {
    const policy = await postCaptchaPolicy({
      scene,
      risk_target: target || undefined,
      risk_target_type: riskTargetType,
    });

    if (policy.deny_request) {
      addToast(t('errors.TOO_MANY_ATTEMPTS') || 'Too many attempts', 'error');
      return false;
    }

    if (!policy.require_captcha) {
      clearCaptcha();
      return true;
    }

    setNeedCaptcha(true);
    if (!captchaData) {
      await fetchCaptcha(scene, target, riskTargetType);
      addToast(t('auth.captchaRequired'), 'warning');
      return false;
    }
    if (!captchaTokenForSubmit) {
      addToast(t('auth.captchaRequired'), 'warning');
      return false;
    }
    if (!isTurnstileCaptcha && !captchaCode.trim()) {
      addToast(t('auth.captchaRequired'), 'warning');
      return false;
    }
    return true;
  };

  useEffect(() => {
    void fetchCapabilities();
  }, [fetchCapabilities]);

  useEffect(() => {
    if (sendTimer <= 0) {
      return undefined;
    }
    const timerId = window.setInterval(() => {
      setSendTimer((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [sendTimer]);

  useEffect(() => {
    const firstEnabledMethod = METHOD_ORDER.find((item) => methodStates[item].enabled);
    if (firstEnabledMethod && !methodStates[method].enabled) {
      setMethod(firstEnabledMethod);
    }
  }, [method, methodStates]);

  const handleSendCode = async () => {
    if (method !== 'email' && method !== 'phone') {
      return;
    }
    if (!activeTarget) {
      addToast(
        method === 'email' ? t('auth.emailRequired') : t('auth.phoneRequired'),
        'warning',
      );
      return;
    }

    setSendingCode(true);
    try {
      const canProceed = await ensureCaptchaForAction(
        'SEND_CODE',
        activeTarget,
        getRiskTargetType(method),
      );
      if (!canProceed) {
        return;
      }

      const response = await extractData<{ token: string }>(
        client.POST('/api/v1/users/public/send-code', {
          body: {
            target: activeTarget,
            target_type: method,
            scene: getSendCodeScene(method),
            captcha_token: captchaTokenForSubmit || null,
            captcha_code: isTurnstileCaptcha ? null : (captchaCode || null),
          },
        }),
      );
      setVerificationToken(response.token);
      setSendTimer(60);
      addToast(t('auth.codeSent'), 'success');
      clearCaptcha();
    } catch (error) {
      if (isApiError(error) && error.biz_code === 'CAPTCHA_REQUIRED') {
        setNeedCaptcha(true);
        await fetchCaptcha('SEND_CODE', activeTarget, getRiskTargetType(method), true);
      }
      addToast(handleApiError(error, t), 'error');
    } finally {
      setSendingCode(false);
    }
  };

  const handleRegister = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!agreement) {
      addToast(t('auth.agreement'), 'warning');
      return;
    }
    if (!isPasswordMatch) {
      addToast(t('auth.passwordMismatch'), 'warning');
      return;
    }
    if (method === 'username' && !username.trim()) {
      addToast(t('auth.usernameRequired'), 'warning');
      return;
    }
    if (method === 'email' && !normalizedEmail) {
      addToast(t('auth.emailRequired'), 'warning');
      return;
    }
    if (method === 'phone' && !normalizedPhone) {
      addToast(t('auth.phoneRequired'), 'warning');
      return;
    }
    if ((method === 'email' || method === 'phone') && (!verificationToken || !verificationCode.trim())) {
      addToast(t('auth.verificationCodeRequired'), 'warning');
      return;
    }

    setLoading(true);
    try {
      const canProceed = await ensureCaptchaForAction(
        getRegisterScene(method),
        activeTarget,
        getRiskTargetType(method),
      );
      if (!canProceed) {
        return;
      }

      await extractData(
        client.POST('/api/v1/users/public/register', {
          body: {
            method,
            password,
            username: method === 'username' ? username.trim() : null,
            email: method === 'email' ? normalizedEmail : null,
            phone: method === 'phone' ? normalizedPhone : null,
            verification_token:
              method === 'email' || method === 'phone' ? verificationToken : null,
            verification_code:
              method === 'email' || method === 'phone' ? verificationCode.trim() : null,
            captcha_token: captchaTokenForSubmit || null,
            captcha_code: isTurnstileCaptcha ? null : (captchaCode || null),
          },
        }),
      );

      addToast(t('auth.registerSuccess'), 'success');
      window.location.hash = 'mod=public&page=login';
    } catch (error) {
      if (isApiError(error)) {
        if (error.biz_code === 'CAPTCHA_REQUIRED') {
          setNeedCaptcha(true);
          await fetchCaptcha(
            getRegisterScene(method),
            activeTarget,
            getRiskTargetType(method),
            true,
          );
        } else if (error.biz_code === 'INVALID_CAPTCHA') {
          setNeedCaptcha(true);
          setCaptchaCode('');
          setTurnstileToken('');
        }
      }
      addToast(handleApiError(error, t), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (capabilities?.enable_registration === false) {
    return (
      <PublicCenteredCard
        cardMaxWidthClass="max-w-[420px]"
        topPadding={false}
        animate={false}
        decorativeBackground="none"
        bodyClassName="p-10"
      >
        {({ isDark }) => (
          <div className="text-center">
            <XCircle className="mx-auto mb-4 text-red-500" size={64} />
            <h1 className={cn('mb-2 text-2xl font-black', isDark ? 'text-white' : 'text-gray-900')}>
              {t('auth.registrationDisabled')}
            </h1>
            <p className="mb-8 opacity-60">{t('auth.registrationDisabledDesc')}</p>
            <Button
              type="button"
              onClick={() => {
                window.location.hash = 'mod=public&page=login';
              }}
              className="w-full"
            >
              {t('common.backToLogin')}
            </Button>
          </div>
        )}
      </PublicCenteredCard>
    );
  }

  return (
    <PublicCenteredCard
      cardMaxWidthClass="max-w-[460px]"
      decorativeBackground="diagonal-reverse"
      accentBarClassName="bg-gradient-to-r from-blue-600 to-primary"
    >
      {({ isDark }) => (
        <>
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 shadow-inner">
              <UserPlus size={32} />
            </div>
            <h1 className={cn('mb-1 text-3xl font-black tracking-tight', isDark ? 'text-white' : 'text-gray-900')}>
              {t('common.register')}
            </h1>
            <p className="text-sm font-bold opacity-50">{t('auth.joinEcosystem')}</p>
          </div>

          <div className="mb-6 grid grid-cols-3 gap-2">
            {METHOD_ORDER.map((item) => {
              const enabled = methodStates[item].enabled;
              const active = method === item;
              const icon =
                item === 'username' ? <User size={16} /> : item === 'email' ? <Mail size={16} /> : <Phone size={16} />;
              const label =
                item === 'username'
                  ? t('auth.registerWithUsername')
                  : item === 'email'
                    ? t('auth.registerWithEmail')
                    : t('auth.registerWithPhone');
              return (
                <button
                  key={item}
                  type="button"
                  disabled={!enabled}
                  onClick={() => {
                    setMethod(item);
                    clearCaptcha();
                    setVerificationCode('');
                    setVerificationToken('');
                    setSendTimer(0);
                  }}
                  className={cn(
                    'flex min-h-14 flex-col items-center justify-center rounded-2xl border px-3 py-3 text-sm font-black transition-all',
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : isDark
                        ? 'border-white/10 bg-white/[0.03] text-slate-300'
                        : 'border-gray-200 bg-gray-50 text-gray-700',
                    !enabled && 'cursor-not-allowed opacity-45',
                  )}
                >
                  <span className="mb-1">{icon}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {disabledMethodHints.length > 0 && (
            <div className={cn('mb-6 space-y-2 rounded-2xl border px-4 py-3 text-sm', isDark ? 'border-white/10 bg-white/[0.03] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600')}>
              {disabledMethodHints.map(({ item, reason }) => (
                <p key={item}>
                  {item === 'username'
                    ? t('auth.registerWithUsername')
                    : item === 'email'
                      ? t('auth.registerWithEmail')
                      : t('auth.registerWithPhone')}
                  {' · '}
                  {reason}
                </p>
              ))}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            {method === 'username' && (
              <FormField label={t('common.usernameRegister')} required>
                <IconInput
                  icon={<User size={18} />}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder={t('common.usernameRegister')}
                  required
                />
              </FormField>
            )}

            {method === 'email' && (
              <FormField label={t('auth.emailAddress')} required>
                <IconInput
                  icon={<Mail size={18} />}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t('auth.enterEmail')}
                  required
                />
              </FormField>
            )}

            {method === 'phone' && (
              <FormField label={t('auth.phoneNumber')} required>
                <IconInput
                  icon={<Phone size={18} />}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder={t('auth.enterPhone')}
                  required
                />
              </FormField>
            )}

            <FormField label={t('common.password')} required>
              <PasswordInput
                icon={<Lock size={18} />}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('common.password')}
                required
                showStrength
              />
            </FormField>

            <FormField label={t('common.confirmPassword')} required>
              <PasswordInput
                icon={<Lock size={18} />}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={t('common.confirmPassword')}
                required
                rightExtra={
                  confirmPassword ? (
                    isPasswordMatch ? <CheckCircle2 className="text-green-500" size={18} /> : <XCircle className="text-red-500" size={18} />
                  ) : null
                }
              />
            </FormField>

            {(method === 'email' || method === 'phone') && (
              <FormField label={t('common.verificationCode')} required>
                <div className="flex gap-3">
                  <Input
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value)}
                    placeholder={t('common.codePlaceholder')}
                    className="h-12"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 min-w-32"
                    disabled={sendingCode || sendTimer > 0}
                    onClick={() => {
                      void handleSendCode();
                    }}
                  >
                    {sendingCode ? (
                      <span className="h-5 w-5 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                    ) : sendTimer > 0 ? (
                      `${sendTimer}s`
                    ) : (
                      <span className="flex items-center gap-2">
                        <Send size={16} /> {t('common.sendCode')}
                      </span>
                    )}
                  </Button>
                </div>
              </FormField>
            )}

            {needCaptcha && (
              <CaptchaChallenge
                isDark={isDark}
                captchaData={captchaData}
                captchaCode={captchaCode}
                onCaptchaCodeChange={setCaptchaCode}
                turnstileToken={turnstileToken}
                onTurnstileTokenChange={setTurnstileToken}
                onRefresh={() => {
                  void fetchCaptcha(
                    method === 'username' ? getRegisterScene(method) : 'SEND_CODE',
                    activeTarget,
                    getRiskTargetType(method),
                    true,
                  );
                }}
                label={t('auth.captcha')}
                placeholder={t('common.codePlaceholder')}
                refreshTitle={t('auth.refreshCaptcha')}
                turnstileSiteKeyMissingText={t('auth.turnstileSiteKeyMissing')}
              />
            )}

            <div className="space-y-4">
              <label className="flex cursor-pointer items-start gap-3 p-1 select-none">
                <input
                  type="checkbox"
                  checked={agreement}
                  onChange={(event) => setAgreement(event.target.checked)}
                  className={cn(
                    'mt-1 h-4 w-4 rounded transition-all',
                    isDark ? 'border-white/10 bg-white/5 checked:bg-primary' : 'border-gray-300 bg-white checked:bg-primary',
                  )}
                />
                <span className="text-sm font-bold leading-tight opacity-60">
                  {t('auth.agreementPrefix')}
                  <a href="#mod=public&page=privacy" className="mx-1 text-primary hover:underline">{t('auth.privacyPolicy')}</a>
                  {t('auth.and')}
                  <a href="#mod=public&page=tos" className="mx-1 text-primary hover:underline">{t('auth.termsOfService')}</a>
                </span>
              </label>
            </div>

            <Button type="submit" className="h-14 w-full text-lg" disabled={loading}>
              {loading ? (
                <span className="h-6 w-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  {t('common.register')} <UserPlus size={18} />
                </span>
              )}
            </Button>
          </form>

          <div className={cn('mt-10 border-t pt-10 text-center', isDark ? 'border-white/5' : 'border-gray-100')}>
            <p className="text-sm font-bold opacity-50">
              {t('auth.alreadyHaveAccount')}{' '}
              <a href="#mod=public&page=login" className="font-black text-primary hover:underline">{t('common.login')}</a>
            </p>
          </div>
        </>
      )}
    </PublicCenteredCard>
  );
};
