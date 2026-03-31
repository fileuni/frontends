import { KeyRound, Save, Server } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AdminCard } from '../admin-ui';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import type { OpenlistRuntimeConfig } from './types.ts';

type Props = {
  config: OpenlistRuntimeConfig;
  loading: boolean;
  onChange: (patch: Partial<OpenlistRuntimeConfig>) => void;
  onSave: () => Promise<void>;
  onResetAdmin: () => Promise<void>;
};

export const OpenlistConfigPanel = ({ config, loading, onChange, onSave, onResetAdmin }: Props) => {
  const { t } = useTranslation();

  return (
    <AdminCard variant="glass" className="rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-2xl space-y-5 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Server size={20} className="text-primary" />
        <div>
          <div className="text-lg sm:text-xl font-black tracking-tight">{t('admin.extensions.openlist.runtimeTitle')}</div>
          <p className="text-sm sm:text-base opacity-65 leading-6">{t('admin.extensions.openlist.runtimeHint')}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.openlist.dataPathLabel')}</div>
        <Input value={config.data_path} onChange={(e) => onChange({ data_path: e.target.value })} className="h-12 rounded-2xl bg-white/5 border border-white/10 font-mono" />
      </div>

      <div className="space-y-2">
        <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.openlist.extraArgsLabel')}</div>
        <textarea
          className="w-full min-h-[120px] rounded-[1.5rem] border border-white/10 bg-white/5 p-4 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/20"
          value={config.extra_args.join('\n')}
          onChange={(e) => onChange({ extra_args: e.target.value.split('\n').map((line) => line.trim()).filter(Boolean) })}
          placeholder="--public"
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45 mb-2">{t('admin.extensions.openlist.serviceCommandLabel')}</div>
        <pre className="whitespace-pre-wrap break-all font-mono text-xs sm:text-sm leading-7 opacity-85">{config.service_command || '--'}</pre>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <Button variant="primary" className="flex-1 h-12 sm:h-14 rounded-2xl uppercase tracking-widest" onClick={onSave} disabled={loading}>
          <Save size={16} className="mr-2" />
          {t('admin.extensions.openlist.saveConfig')}
        </Button>
        <Button variant="ghost" className="h-12 sm:h-14 rounded-2xl bg-white/5 border border-white/10 px-6" onClick={onResetAdmin} disabled={loading}>
          <KeyRound size={16} className="mr-2" />
          {t('admin.extensions.openlist.resetAdmin')}
        </Button>
      </div>
    </AdminCard>
  );
};
