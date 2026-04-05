import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.ts';
import { AccountSelector } from './AccountSelector.tsx';
import { Users, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { useNavigationStore, type RouteParams } from '@/stores/navigation.ts';
import { cn } from '@/lib/utils.ts';
import { PublicCenteredCard } from './public-ui/PublicCenteredCard.tsx';

export const AccountsView = () => {
  const { t } = useTranslation();
  const { logout } = useAuthStore();
  const { params, navigate } = useNavigationStore();

  const getRedirectParams = (): Partial<RouteParams> => {
    // Priority parse redirect param from Hash
    const redirect = params['redirect'];
    if (!redirect) return { mod: 'user', page: 'welcome' };

    // If it's a full hash string, parse it
    if (redirect.includes('mod=')) {
      const p = new URLSearchParams(redirect.startsWith('#') ? redirect.substring(1) : redirect);
      const result: Partial<RouteParams> = {};
      p.forEach((v, k) => { result[k] = v; });
      return result;
    }
    return { mod: 'user', page: 'welcome' };
  };

  const handleSelect = (_userId: string) => {
    // Force wait a tick to ensure store switched
    setTimeout(() => {
      const destParams = getRedirectParams();
      navigate(destParams);
    }, 50);
  };

  return (
    <PublicCenteredCard
      cardMaxWidthClass="max-w-[480px]"
      decorativeBackground="diagonal"
      accentBarClassName="bg-gradient-to-r from-primary to-blue-600"
    >
      {({ isDark }) => (
        <>
          <div className="flex items-center justify-between mb-10">
            <Button
              variant="ghost"
              className="p-2 h-10 w-10 rounded-xl"
              onClick={() => window.history.back()}
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="text-center flex-1 pr-10">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mb-2">
                <Users size={24} />
              </div>
              <h1 className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-gray-900")}>{t('auth.manageAccounts')}</h1>
            </div>
          </div>

          <AccountSelector
            showAddButton={true}
            onAddAccount={() => navigate({ mod: 'public', page: 'login' })}
            onSelect={handleSelect}
          />

          <div className={cn("mt-8 pt-6 border-t space-y-3", isDark ? "border-white/5" : "border-gray-100")}>
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl border-red-500/20 text-red-500 hover:bg-red-500/10"
              onClick={() => { logout(); navigate({ mod: 'public', page: 'login' }); }}
            >
              <LogOut size={18} className="mr-2" /> {t('common.logout')}
            </Button>
            <p className="text-sm text-center opacity-30 font-bold tracking-widest px-6">
              {t('auth.manageAccountsDesc')}
            </p>
          </div>
        </>
      )}
    </PublicCenteredCard>
  );
};
