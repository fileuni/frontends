import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button.tsx';
import { useAuthStore } from '@/stores/auth.ts';
import { client, handleApiError } from '@/lib/api.ts';
import { useToastStore } from '@/stores/toast';
import { Lock, Key, CheckCircle2, XCircle } from 'lucide-react';
import { FormField } from '@/components/common/FormField.tsx';
import { PasswordInput } from '@/components/common/PasswordInput.tsx';

interface PasswordChangeFormProps {
  onSuccess?: () => void;
  prefilledOldPassword?: string;
  hideOldPassword?: boolean;
  disableOldPassword?: boolean;
}

export const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({
  onSuccess,
  prefilledOldPassword = '',
  hideOldPassword = false,
  disableOldPassword = false,
}) => {
  const { t } = useTranslation();
  const { currentUserData } = useAuthStore();
  const { addToast } = useToastStore();

  const [oldPassword, setOldPassword] = useState(prefilledOldPassword);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isMatch = newPassword === confirmPassword && confirmPassword !== '';
  const canSubmit = newPassword.length >= 6 && isMatch && (hideOldPassword || oldPassword.length > 0);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      if (!currentUserData?.user.id) return;
      const { data, error } = await client.POST('/api/v1/users/auth/{user_id}/change-password', {
        params: { path: { user_id: currentUserData.user.id } },
        body: {
          old_password: oldPassword,
          new_password: newPassword,
        }
      });

      if (error) {
        addToast(handleApiError(error, t), 'error');
        return;
      }

      if (data?.['success']) {
        addToast(t('forgotPassword.resetSuccess'), 'success');
        setNewPassword('');
        setConfirmPassword('');
        if (onSuccess) onSuccess();
      }
    } catch (e) {
      console.error(e);
      addToast(t('errors.INTERNAL_ERROR'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!hideOldPassword && (
        <FormField label={t('security.currentPassword') || t('common.password')} required>
          <PasswordInput
            icon={<Lock size={18} />}
            value={oldPassword}
            onChange={e => setOldPassword(e.target.value)}
            placeholder={t('security.currentPassword') || 'Current Password'}
            disabled={disableOldPassword}
            required
          />
        </FormField>
      )}

      <FormField label={t('forgotPassword.newPassword')} required>
        <PasswordInput
          icon={<Key size={18} />}
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder={t('forgotPassword.newPassword')}
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

      <div className="pt-2">
        <Button type="submit" className="w-full h-14 text-lg shadow-xl" disabled={loading || !canSubmit}>
          {loading ? <span className="loading-spinner animate-spin w-6 h-6 border-2 border-white/30 border-t-white rounded-full" /> : t('forgotPassword.updatePassword')}
        </Button>
      </div>
    </form>
  );
};
