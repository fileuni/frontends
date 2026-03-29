import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CheckCircle2, Lock, ShieldCheck, Smartphone, User } from 'lucide-react';

import '@/lib/i18n';
import { PublicCenteredCard } from './public-ui/PublicCenteredCard';
import { FormField } from '@/components/common/FormField';
import { IconInput } from '@/components/common/IconInput';
import { PasswordInput } from '@/components/common/PasswordInput';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useNavigationStore } from '@/stores/navigation';
import { useAuthStore } from '@/stores/auth';
import { SavedAccountsShortcut, normalizeLoginIdentifierInput } from './login-shared';

const NEXTCLOUD_LOGIN_REMEMBER_KEY = 'fileuni-nextcloud-login-remember';

type LoginSubmitResult = {
  redirect_url?: string;
  completed?: boolean;
  message?: string;
};

type FormSubmitEvent = Parameters<
  NonNullable<React.ComponentProps<'form'>['onSubmit']>
>[0];

const parseErrorMessage = async (response: Response, fallback: string) => {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message || fallback;
  } catch {
    return fallback;
  }
};

export const NextcloudLoginView: React.FC = () => {
  const { t } = useTranslation();
  const { params, navigate } = useNavigationStore();
  const { usersMap } = useAuthStore();

  const mode = params['mode'] === 'v2' ? 'v2' : 'legacy';
  const token = params['token'] || '';

  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [completed, setCompleted] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);

  const savedUsers = React.useMemo(() => Object.values(usersMap), [usersMap]);

  React.useEffect(() => {
    const saved = window.localStorage.getItem(NEXTCLOUD_LOGIN_REMEMBER_KEY);
    if (saved) {
      setRememberMe(true);
      setUsername(saved);
    }
  }, []);

  const submitUrl = React.useMemo(() => {
    if (mode === 'v2' && token) {
      return `/index.php/login/v2/flow/${encodeURIComponent(token)}`;
    }
    return '/index.php/login/flow';
  }, [mode, token]);

  const handleSubmit = async (event: FormSubmitEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(submitUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: new URLSearchParams({
          user: username,
          password,
        }),
      });

      if (!response.ok) {
        setError(await parseErrorMessage(response, t('auth.nextcloudInvalidCredentials')));
        return;
      }

      const result = (await response.json()) as LoginSubmitResult;
      if (mode === 'legacy') {
        if (!result.redirect_url) {
          setError(t('auth.nextcloudLoginFailed'));
          return;
        }
        if (rememberMe) {
          window.localStorage.setItem(NEXTCLOUD_LOGIN_REMEMBER_KEY, username);
        } else {
          window.localStorage.removeItem(NEXTCLOUD_LOGIN_REMEMBER_KEY);
        }
        window.location.href = result.redirect_url;
        return;
      }

      if (result.completed) {
        if (rememberMe) {
          window.localStorage.setItem(NEXTCLOUD_LOGIN_REMEMBER_KEY, username);
        } else {
          window.localStorage.removeItem(NEXTCLOUD_LOGIN_REMEMBER_KEY);
        }
        setCompleted(true);
      } else {
        setError(t('auth.nextcloudLoginFailed'));
      }
    } catch {
      setError(t('auth.nextcloudLoginFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const subtitle = mode === 'v2'
    ? t('auth.nextcloudLoginIntroV2')
    : t('auth.nextcloudLoginIntroLegacy');

  return (
    <PublicCenteredCard
      cardMaxWidthClass="max-w-[440px]"
      decorativeBackground="diagonal"
      accentBarClassName="bg-gradient-to-r from-primary to-blue-600"
    >
      {({ isDark }) => (
        <>
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center mb-4">
              <img src="/favicon.svg" alt={t('common.logoAlt')} width={64} height={64} className="shadow-lg" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.24em] text-primary mb-4">
              <Smartphone size={14} />
              {t('auth.nextcloudAccessBadge')}
            </div>
            <h1 className={cn('text-3xl font-black tracking-tight mb-2', isDark ? 'text-white' : 'text-gray-900')}>
              {t('auth.nextcloudLoginTitle')}
            </h1>
            <p className="text-sm opacity-60 font-bold leading-6">
              {subtitle}
            </p>
          </div>

          {completed ? (
            <div className={cn('rounded-[2rem] border p-6 text-center space-y-4', isDark ? 'border-emerald-400/20 bg-emerald-400/10 text-white' : 'border-emerald-200 bg-emerald-50 text-gray-900')}>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <h2 className="text-xl font-black">{t('auth.nextcloudLoginCompletedTitle')}</h2>
                <p className="mt-2 text-sm font-medium opacity-70">{t('auth.nextcloudLoginCompletedDesc')}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <SavedAccountsShortcut
                count={savedUsers.length}
                isDark={isDark}
                title={t('auth.switchToExistingAccount')}
                description={t('auth.manageAccountsDescShort') || 'Select from logged in users'}
                onClick={() => navigate({ mod: 'user', page: 'accounts' })}
              />

              <div className={cn('rounded-[2rem] border p-4 flex items-start gap-3', isDark ? 'border-white/10 bg-white/5 text-white' : 'border-primary/10 bg-primary/5 text-gray-900')}>
                <div className="mt-0.5 text-primary"><ShieldCheck size={18} /></div>
                <div className="text-sm leading-6 font-medium opacity-80">
                  {t('auth.nextcloudGrantNote')}
                </div>
              </div>

              <FormField label={t('common.usernameRegister')} required error={error || undefined}>
                <IconInput
                  icon={<User size={18} />}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  onBlur={() => setUsername(normalizeLoginIdentifierInput(username))}
                  placeholder={t('common.usernameRegister')}
                  autoComplete="username"
                  required
                />
              </FormField>

              <FormField label={t('common.password')} required>
                <PasswordInput
                  icon={<Lock size={18} />}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t('common.password')}
                  autoComplete="current-password"
                  required
                />
              </FormField>

              <label className="flex items-center gap-3 cursor-pointer group p-1 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className={cn(
                    'w-4 h-4 rounded transition-all cursor-pointer',
                    isDark ? 'border-white/10 bg-white/5 checked:bg-primary' : 'border-gray-300 bg-white checked:bg-primary',
                  )}
                />
                <span className="text-sm font-bold opacity-60 leading-tight">
                  {t('common.rememberMe')}
                </span>
              </label>

              <Button type="submit" size="lg" className="w-full h-14 rounded-[1.6rem] gap-2" disabled={submitting || (mode === 'v2' && !token)}>
                <span>{submitting ? t('common.loading') : t('auth.nextcloudContinue')}</span>
                <ArrowRight size={18} />
              </Button>

              <p className="text-center text-sm font-medium opacity-50 leading-6">
                {mode === 'v2' ? t('auth.nextcloudReturnHintV2') : t('auth.nextcloudReturnHintLegacy')}
              </p>
            </form>
          )}
        </>
      )}
    </PublicCenteredCard>
  );
};
