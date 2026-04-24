import { useTranslation } from 'react-i18next';
import { GlassModalShell } from '@fileuni/ts-shared/modal-shell';
import { Button } from '@/components/ui/Button.tsx';
import { useAuthStore } from '@/stores/auth.ts';
import { AlertTriangle } from 'lucide-react';
import { PasswordChangeForm } from '@/components/user-center/components/PasswordChangeForm.tsx';

export const MustChangePasswordModal = () => {
  const { t } = useTranslation();
  const { mustChangePassword, setMustChangePassword, mustChangePasswordDismissed, setMustChangePasswordDismissed, logout } = useAuthStore();

  if (!mustChangePassword || mustChangePasswordDismissed) return null;

  return (
    <GlassModalShell
      title={t('nav.changePassword')}
      onClose={() => setMustChangePasswordDismissed(true)}
      closeLabel={t('common.close') || 'Close'}
      maxWidthClassName="max-w-md"
      panelClassName="dark border-orange-500/30 text-white"
    >
      <div className="space-y-6">
        <div className="flex items-start gap-4 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">
          <AlertTriangle className="text-orange-500 shrink-0 mt-1" size={20} />
          <div>
            <p className="mb-1 text-sm font-black leading-tight text-orange-200/90">
              {t('auth.defaultPasswordWarning')}
            </p>
            <p className="text-sm font-bold italic leading-relaxed text-orange-200/60">
              {t('auth.defaultPasswordDesc')}
            </p>
          </div>
        </div>

        <PasswordChangeForm
          prefilledOldPassword="admin888"
          disableOldPassword={true}
          onSuccess={() => {
            setMustChangePassword(false);
            setMustChangePasswordDismissed(true);
          }}
        />

        <div className="flex flex-col gap-3 pt-2">
          <Button
            variant="outline"
            type="button"
            className="h-12 w-full border-white/10 bg-white/[0.03] text-white hover:bg-white/10"
            onClick={() => setMustChangePasswordDismissed(true)}
          >
            {t('common.doNotShowAgain') || 'Ignore for now'}
          </Button>
          <Button
            variant="ghost"
            type="button"
            className="w-full text-sm text-white/60 hover:bg-white/5 hover:text-white"
            onClick={() => logout()}
          >
            {t('common.logout')}
          </Button>
        </div>
      </div>
    </GlassModalShell>
  );
};
