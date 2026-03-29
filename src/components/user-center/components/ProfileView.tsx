import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { useAuthStore } from '@/stores/auth.ts';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { User, Mail, FileText, Plus, Trash2, Save, CheckCircle2 } from 'lucide-react';
import { client, extractData, handleApiError } from '@/lib/api.ts';
import { isPhoneInputValid, normalizePhoneInput } from '@/lib/contactNormalize.ts';
import { FormField } from '@/components/common/FormField.tsx';
import { IconInput } from '@/components/common/IconInput.tsx';

import { useToastStore } from '@/stores/toast';
import { DashboardSection, DashboardLoading } from './dashboard-ui';

import type { components } from '@/types/api.ts';

type ProfileUpdateBody = components["schemas"]["UpdateProfileRequest"];
type UserResponse = components["schemas"]["UserResponse"];

export const ProfileView = () => {
  const { t } = useTranslation();
  const { currentUserData } = useAuthStore();
  const { addToast } = useToastStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [otherPhoneKeys, setOtherPhoneKeys] = useState<string[]>([]);
  
  const [form, setForm] = useState({
    full_name: '',
    nickname: '',
    bio: '',
    email: '',
    phone: '',
    other_phones: [] as string[],
  });

  useEffect(() => {
    /**
     * 获取当前用户信息并初始化表单 / Fetch current user info and initialize the form
     */
    const fetchProfile = async () => {
      try {
        const me = await extractData<UserResponse>(client.GET('/api/v1/users/auth/me'));
        setForm({
          full_name: me.full_name || '',
          nickname: me.nickname || '',
          bio: me.bio || '',
          email: me.email || '',
          phone: me.phone || '',
          other_phones: me.other_phones || [],
        });
        setOtherPhoneKeys((me.other_phones || []).map(() => crypto.randomUUID()));
      } catch (e) {
        console.error(e);
        addToast(handleApiError(e, t), 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [addToast, t]);

  /**
   * 校验备用电话列表中的非法索引 / Validate invalid indexes in the extra phones list
   */
  const invalidOtherPhoneIndexes = useMemo(
    () =>
      form.other_phones
        .map((phone, index) => ({ phone: phone.trim(), index }))
        .filter((item) => item.phone.length > 0 && !isPhoneInputValid(item.phone))
        .map((item) => item.index),
    [form.other_phones]
  );

  /**
   * 提交个人资料修改 / Submit profile updates
   */
  const handleSave = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (invalidOtherPhoneIndexes.length > 0) {
      addToast(t('profile.invalidPhoneList'), 'error');
      return;
    }
    setSaving(true);
    try {
      if (!currentUserData?.user.id) return;
      const inputOtherPhones = form.other_phones
        .map((phone) => normalizePhoneInput(phone))
        .filter((phone) => phone.length > 0);
      const body: ProfileUpdateBody = {
        full_name: form.full_name,
        nickname: form.nickname,
        bio: form.bio,
        other_phones: inputOtherPhones,
      };
      const updated = await extractData<UserResponse>(
        client.PUT('/api/v1/users/auth/{user_id}/profile', {
          params: { path: { user_id: currentUserData.user.id } },
          body,
        }),
      );
      const serverOtherPhones: string[] = Array.isArray(updated.other_phones) ? updated.other_phones : [];
      setForm({
        full_name: updated.full_name || '',
        nickname: updated.nickname || '',
        bio: updated.bio || '',
        email: updated.email || '',
        phone: updated.phone || '',
        other_phones: serverOtherPhones,
      });
      setOtherPhoneKeys(serverOtherPhones.map(() => crypto.randomUUID()));

      const changed =
        serverOtherPhones.length !== inputOtherPhones.length ||
        serverOtherPhones.some((phone: string, index: number) => phone !== inputOtherPhones[index]);
      if (changed) {
        addToast(t('profile.phoneListSynced'), 'warning');
      }
      addToast(t('profile.success'), 'success');
    } catch (e: unknown) {
      addToast(handleApiError(e, t), 'error');
    } finally {
      setSaving(false);
    }
  };

  const addPhone = () => {
    if (form.other_phones.length < 10) {
      setForm({ ...form, other_phones: [...form.other_phones, ''] });
      setOtherPhoneKeys([...otherPhoneKeys, crypto.randomUUID()]);
    }
  };

  const updatePhone = (index: number, val: string) => {
    const next = [...form.other_phones];
    next[index] = val;
    setForm({ ...form, other_phones: next });
  };

  const normalizePhoneAt = (index: number) => {
    const next = [...form.other_phones];
    const currentValue = next[index];
    if (typeof currentValue !== 'string') return;
    next[index] = normalizePhoneInput(currentValue);
    setForm({ ...form, other_phones: next });
  };

  const removePhone = (index: number) => {
    setForm({ ...form, other_phones: form.other_phones.filter((_, i) => i !== index) });
    setOtherPhoneKeys(otherPhoneKeys.filter((_, i) => i !== index));
  };

  if (loading) return <DashboardLoading label={t('profile.loading')} className="animate-pulse" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      <div className="lg:col-span-2 space-y-8">
        <DashboardSection variant="glass" className="p-8 md:p-12">
          <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label={t('profile.fullName')}>
                <IconInput
                  icon={<User size={18} />}
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  placeholder={t('profile.fullNamePlaceholder')}
                />
              </FormField>
              <FormField label={t('profile.nickname')}>
                <IconInput
                  icon={<User size={18} />}
                  value={form.nickname}
                  onChange={e => setForm({ ...form, nickname: e.target.value })}
                  placeholder={t('profile.nicknamePlaceholder')}
                />
              </FormField>
            </div>

            <FormField label={t('profile.bio')}>
              <div className="relative group">
                <FileText className="absolute left-4 top-4 opacity-30 group-focus-within:text-primary transition-all" size={18} />
                <textarea
                  value={form.bio}
                  onChange={e => setForm({ ...form, bio: e.target.value })}
                  className="w-full min-h-[120px] pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-white/10 focus:border-primary outline-none transition-all font-bold text-base"
                  placeholder={t('profile.bioPlaceholder')}
                />
              </div>
            </FormField>

            <div className="space-y-4">
              <div className="flex items-center justify-between ml-1">
                <div className="text-sm font-black uppercase tracking-widest opacity-40">{t('profile.extraPhones')}</div>
                <button type="button" onClick={addPhone} className="text-sm font-black text-primary flex items-center gap-1 hover:underline">
                  <Plus size={18} /> {t('profile.addNew')}
                </button>
              </div>
              <div className="space-y-3">
                {form.other_phones.map((phone, idx) => (
                  <div key={otherPhoneKeys[idx] || phone} className="animate-in slide-in-from-left-2">
                    <div className="flex gap-2">
                      <Input 
                        value={phone} 
                        onChange={e => updatePhone(idx, e.target.value)} 
                        onBlur={() => normalizePhoneAt(idx)}
                        placeholder={t('profile.phonePlaceholder')}
                        className={`font-mono text-sm ${invalidOtherPhoneIndexes.includes(idx) ? 'border-red-500' : ''}`}
                      />
                      <button type="button" onClick={() => removePhone(idx)} className="w-12 h-12 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 transition-all hover:text-white shrink-0 border border-red-500/20">
                        <Trash2 size={18} />
                      </button>
                    </div>
                    {invalidOtherPhoneIndexes.includes(idx) && (
                      <p className="mt-1 text-sm text-red-500 font-bold">{t('profile.invalidPhoneFormat')}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 flex justify-end">
              <Button type="submit" className="px-12 h-14" disabled={saving || invalidOtherPhoneIndexes.length > 0}>
                {saving ? <span className="loading-spinner w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                  <>
                    <Save size={18} className="mr-2" /> {t('profile.saveChanges')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DashboardSection>
      </div>

      <div className="space-y-6">
        <DashboardSection
          variant="glass"
          className="p-8 overflow-hidden relative"
          title={t('profile.readonlyIdentity')}
          titleClassName="text-sm uppercase tracking-widest opacity-30"
          headerClassName="mb-6"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Mail size={120} />
          </div>
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-sm font-bold opacity-40 uppercase">{t('profile.primaryEmail')}</span>
              <div className="flex items-center gap-2 font-mono text-sm font-black">
                {form.email || t('profile.none')}
                {form.email && <CheckCircle2 size={18} className="text-green-500" />}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-bold opacity-40 uppercase">{t('profile.verifiedPhone')}</span>
              <div className="flex items-center gap-2 font-mono text-sm font-black">
                {form.phone || t('profile.none')}
                {form.phone && <CheckCircle2 size={18} className="text-green-500" />}
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/5">
            <p className="text-sm font-bold opacity-40 leading-relaxed italic">
              {t('profile.verifiedNote')}
            </p>
          </div>
        </DashboardSection>
      </div>
    </div>
  );
};
