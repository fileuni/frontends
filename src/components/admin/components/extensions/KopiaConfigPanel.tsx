import { Copy, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AdminCard } from '../admin-ui';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import type { KopiaRuntimeConfig } from './types.ts';

type Props = {
  config: KopiaRuntimeConfig;
  loading: boolean;
  onChange: (patch: Partial<KopiaRuntimeConfig>) => void;
  onSave: () => Promise<void>;
  onCopyRepositoryCommand: () => void;
  onCopySnapshotCommand: () => void;
  repositoryPreview: string;
  snapshotPreview: string;
};

export const KopiaConfigPanel = ({
  config,
  loading,
  onChange,
  onSave,
  onCopyRepositoryCommand,
  onCopySnapshotCommand,
  repositoryPreview,
  snapshotPreview,
}: Props) => {
  const { t } = useTranslation();

  return (
    <AdminCard variant="glass" className="rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-2xl space-y-5 sm:space-y-6">
      <div>
        <div className="text-lg sm:text-xl font-black tracking-tight">{t('admin.extensions.kopia.runtimeTitle')}</div>
        <p className="text-sm sm:text-base opacity-65 leading-6 mt-2">{t('admin.extensions.kopia.runtimeHint')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.kopia.configFileLabel')}</div>
          <Input value={config.config_file_path} onChange={(e) => onChange({ config_file_path: e.target.value })} className="h-12 rounded-2xl bg-white/5 border border-white/10 font-mono" />
        </div>
        <div className="space-y-2">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.kopia.cacheDirectoryLabel')}</div>
          <Input value={config.cache_directory} onChange={(e) => onChange({ cache_directory: e.target.value })} className="h-12 rounded-2xl bg-white/5 border border-white/10 font-mono" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.kopia.repositoryCommandLabel')}</div>
          <textarea className="w-full min-h-[120px] rounded-[1.5rem] border border-white/10 bg-white/5 p-4 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/20" value={config.repository_command_template} onChange={(e) => onChange({ repository_command_template: e.target.value })} />
          <Button variant="ghost" className="h-11 rounded-2xl bg-white/5 border border-white/10 px-5" onClick={onCopyRepositoryCommand}>
            <Copy size={16} className="mr-2" />
            {t('admin.extensions.kopia.copyRepositoryCommand')}
          </Button>
        </div>
        <div className="space-y-2">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.kopia.snapshotCommandLabel')}</div>
          <textarea className="w-full min-h-[120px] rounded-[1.5rem] border border-white/10 bg-white/5 p-4 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/20" value={config.snapshot_command_template} onChange={(e) => onChange({ snapshot_command_template: e.target.value })} />
          <Button variant="ghost" className="h-11 rounded-2xl bg-white/5 border border-white/10 px-5" onClick={onCopySnapshotCommand}>
            <Copy size={16} className="mr-2" />
            {t('admin.extensions.kopia.copySnapshotCommand')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45 mb-2">{t('admin.extensions.kopia.repositoryCommandPreviewLabel')}</div>
          <pre className="whitespace-pre-wrap break-all font-mono text-xs sm:text-sm leading-7 opacity-85">{repositoryPreview || '--'}</pre>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45 mb-2">{t('admin.extensions.kopia.snapshotCommandPreviewLabel')}</div>
          <pre className="whitespace-pre-wrap break-all font-mono text-xs sm:text-sm leading-7 opacity-85">{snapshotPreview || '--'}</pre>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" className="h-12 sm:h-14 rounded-2xl px-8 uppercase tracking-widest" onClick={onSave} disabled={loading}>
          <Save size={16} className="mr-2" />
          {t('admin.extensions.kopia.saveConfig')}
        </Button>
      </div>
    </AdminCard>
  );
};
