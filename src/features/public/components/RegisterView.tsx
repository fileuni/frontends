import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { client, handleApiError } from '@/lib/api.ts';
import { Button } from '@/components/ui/Button.tsx';
import { UserPlus, User, Lock, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { FormField } from '@/components/common/FormField.tsx';
import { IconInput } from '@/components/common/IconInput.tsx';
import { PasswordInput } from '@/components/common/PasswordInput.tsx';

import { useToastStore } from '@/shared';
import { useConfigStore } from '@/stores/config.ts';
import { PublicCenteredCard } from './public-ui/PublicCenteredCard.tsx';

export const RegisterView = () => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const { capabilities } = useConfigStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreement, setAgreement] = useState(false);

  const isMatch = password === confirmPassword && confirmPassword !== '';
  const canSubmit = username.length >= 3 && password.length >= 6 && isMatch && agreement;

  const handleRegister = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!agreement) {
      addToast(t("auth.agreement"), "warning");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await client.POST("/api/v1/users/public/register", {
        body: { username, password },
      });
      
      if (error) {
        addToast(handleApiError(error, t), "error");
        return;
      }
      
      if (data?.success) {
        addToast(t('auth.registerSuccess'), 'success');
        window.location.hash = 'mod=public&page=login';
      }
    } catch (e: unknown) {
      console.error("Register catch error:", e);
      addToast(t("errors.INTERNAL_ERROR"), "error");
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
            <XCircle className="mx-auto text-red-500 mb-4" size={64} />
            <h1 className={cn("text-2xl font-black mb-2", isDark ? "text-white" : "text-gray-900")}>
              {t('auth.registrationDisabled') || 'Registration Disabled'}
            </h1>
            <p className="opacity-60 mb-8">{t('auth.registrationDisabledDesc') || 'User registration is currently disabled by system administrator.'}</p>
            <Button onClick={() => window.location.hash = 'mod=public&page=login'} className="w-full">{t('common.backToLogin') || 'Back to Login'}</Button>
          </div>
        )}
      </PublicCenteredCard>
    );
  }

  return (
    <PublicCenteredCard
      cardMaxWidthClass="max-w-[420px]"
      decorativeBackground="diagonal-reverse"
      accentBarClassName="bg-gradient-to-r from-blue-600 to-primary"
    >
      {({ isDark }) => (
        <>
          <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-500 mb-4 shadow-inner">
                <UserPlus size={32} />
              </div>
              <h1 className={cn("text-3xl font-black tracking-tight mb-1", isDark ? "text-white" : "text-gray-900")}>{t('common.register')}</h1>
              <p className="text-sm opacity-50 font-bold">{t('auth.joinEcosystem')}</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-5">
              <FormField label={t('common.usernameRegister')} required>
                <IconInput
                  icon={<User size={18} />}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder={t('common.usernameRegister')}
                  required
                />
              </FormField>

              <FormField label={t('common.password')} required>
                <PasswordInput
                  icon={<Lock size={18} />}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('common.password')}
                  required
                  showStrength
                />
              </FormField>

              <FormField label={t('common.confirmPassword')} required>
                <PasswordInput
                  icon={<Lock size={18} />}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={t('common.confirmPassword')}
                  required
                  rightExtra={
                    confirmPassword ? (
                      isMatch ? <CheckCircle2 className="text-green-500" size={18} /> : <XCircle className="text-red-500" size={18} />
                    ) : null
                  }
                />
              </FormField>

              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group p-1 select-none">
                  <input 
                    type="checkbox" 
                    checked={agreement}
                    onChange={(e) => setAgreement(e.target.checked)}
                    className={cn(
                      "mt-1 w-4 h-4 rounded transition-all cursor-pointer",
                      isDark ? "border-white/10 bg-white/5 checked:bg-primary" : "border-gray-300 bg-white checked:bg-primary"
                    )}
                  />
                  <span className="text-sm font-bold opacity-60 leading-tight">
                    {t('auth.agreementPrefix')}
                    <a href="#mod=public&page=privacy" className="text-primary hover:underline mx-1">{t('auth.privacyPolicy')}</a>
                    {t('auth.and')}
                    <a href="#mod=public&page=tos" className="text-primary hover:underline mx-1">{t('auth.termsOfService')}</a>
                  </span>
                </label>
              </div>

              <Button className="w-full h-14 text-lg" disabled={loading || !canSubmit}>
                {loading ? <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('common.register')}
              </Button>
            </form>

            <div className={cn("mt-10 pt-10 border-t text-center", isDark ? "border-white/5" : "border-gray-100")}>
              <p className="text-sm font-bold opacity-50">
                {t('auth.alreadyHaveAccount')}{' '}
                <a href="#mod=public&page=login" className="text-primary hover:underline font-black">{t('common.login')}</a>
              </p>
            </div>
        </>
      )}
    </PublicCenteredCard>
  );
};
