import { Download, HardDriveDownload, Link2, PackageOpen, RefreshCw, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AdminCard } from '../admin-ui';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import type { ToolInfo, ToolInstallMode, ToolIntegrationConfig } from './types.ts';

type InstallDraft = {
  version: string;
  downloadUrl: string;
  targetBinDir: string;
  proxy: string;
};

type Props = {
  tool: ToolInfo;
  integration: ToolIntegrationConfig;
  draft: InstallDraft;
  busy: boolean;
  onDraftChange: (patch: Partial<InstallDraft>) => void;
  onSetInstallMode: (mode: ToolInstallMode) => void;
  onSetBinaryPath: (key: string, path: string) => void;
  onSaveIntegration: () => Promise<void>;
  onFetchLatest: () => Promise<void>;
  onInstallManaged: () => Promise<void>;
  onDeleteManaged: () => Promise<void>;
};

const modeClassName = (active: boolean): string => (
  active
    ? 'border-primary/40 bg-primary/10 text-primary shadow-lg shadow-primary/10'
    : 'border-white/10 bg-white/5 text-foreground/75 hover:bg-white/10'
);

export const ToolIntegrationPanel = ({
  tool,
  integration,
  draft,
  busy,
  onDraftChange,
  onSetInstallMode,
  onSetBinaryPath,
  onSaveIntegration,
  onFetchLatest,
  onInstallManaged,
  onDeleteManaged,
}: Props) => {
  const { t } = useTranslation();

  return (
    <AdminCard variant="glass" className="rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-2xl space-y-6 sm:space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
          <PackageOpen size={20} />
        </div>
        <div>
          <div className="text-lg sm:text-xl font-black tracking-tight">{t('admin.extensions.integrationTitle')}</div>
          <p className="text-sm sm:text-base opacity-65 leading-6">{t('admin.extensions.integrationHint')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          className={`text-left rounded-[1.5rem] border p-5 sm:p-6 transition-all ${modeClassName(integration.install_mode === 'managed_download')}`}
          onClick={() => onSetInstallMode('managed_download')}
        >
          <div className="flex items-center gap-3 font-black text-base sm:text-lg">
            <HardDriveDownload size={18} />
            {t('admin.extensions.installModeManaged')}
          </div>
          <p className="mt-3 text-sm sm:text-base leading-7 opacity-75">
            {t('admin.extensions.installModeManagedHint')}
          </p>
        </button>

        <button
          type="button"
          className={`text-left rounded-[1.5rem] border p-5 sm:p-6 transition-all ${modeClassName(integration.install_mode === 'existing_binary')}`}
          onClick={() => onSetInstallMode('existing_binary')}
        >
          <div className="flex items-center gap-3 font-black text-base sm:text-lg">
            <Link2 size={18} />
            {t('admin.extensions.installModeExisting')}
          </div>
          <p className="mt-3 text-sm sm:text-base leading-7 opacity-75">
            {t('admin.extensions.installModeExistingHint')}
          </p>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {integration.binaries.map((binary) => (
          <div key={binary.key} className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-black text-sm sm:text-base">{binary.display_name}</div>
              <span className={`text-[11px] sm:text-xs uppercase tracking-widest font-black ${binary.exists ? 'text-emerald-400' : 'text-zinc-400'}`}>
                {binary.exists ? t('admin.extensions.binaryReady') : t('admin.extensions.binaryMissing')}
              </span>
            </div>
            <div className="text-xs sm:text-sm font-mono opacity-60 break-all">{binary.resolved_path || binary.configured_path || binary.managed_path}</div>
            <div className="text-[11px] sm:text-xs opacity-45 uppercase tracking-widest">{binary.file_name}</div>
          </div>
        ))}
      </div>

      {integration.install_mode === 'managed_download' ? (
        <div className="space-y-4 sm:space-y-5 border-t border-white/10 pt-6 sm:pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Input value={draft.version} onChange={(e) => onDraftChange({ version: e.target.value })} placeholder={t('admin.extensions.versionPlaceholder')} className="h-12 rounded-2xl bg-white/5 border border-white/10" />
            <Input value={draft.downloadUrl} onChange={(e) => onDraftChange({ downloadUrl: e.target.value })} placeholder={t('admin.extensions.downloadUrlPlaceholder')} className="h-12 rounded-2xl bg-white/5 border border-white/10" />
            <Input value={draft.proxy} onChange={(e) => onDraftChange({ proxy: e.target.value })} placeholder={t('admin.extensions.githubMirrorPlaceholder')} className="h-12 rounded-2xl bg-white/5 border border-white/10" />
            <Input value={draft.targetBinDir} onChange={(e) => onDraftChange({ targetBinDir: e.target.value })} placeholder={tool.install_dir} className="h-12 rounded-2xl bg-white/5 border border-white/10" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button variant="primary" className="h-12 sm:h-14 rounded-2xl px-6 text-sm sm:text-base tracking-widest uppercase" onClick={onFetchLatest} disabled={busy}>
              <RefreshCw size={16} className={`mr-2 ${busy ? 'animate-spin' : ''}`} />
              {t('admin.extensions.fetchLatestBtn')}
            </Button>
            <Button variant="primary" className="flex-1 h-12 sm:h-14 rounded-2xl px-6 text-sm sm:text-base tracking-widest uppercase" onClick={onInstallManaged} disabled={busy}>
              <Download size={16} className="mr-2" />
              {tool.installed ? t('admin.extensions.updateBtn') : t('admin.extensions.installBtn')}
            </Button>
            <Button variant="ghost" className="h-12 sm:h-14 rounded-2xl px-6 bg-red-500/5 border border-red-500/10 hover:bg-red-500/20" onClick={onDeleteManaged} disabled={busy}>
              {t('common.delete')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5 border-t border-white/10 pt-6 sm:pt-8">
          {integration.binaries.map((binary) => (
            <div key={binary.key} className="space-y-2">
              <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{binary.display_name}</div>
              <Input
                value={binary.configured_path || ''}
                onChange={(e) => onSetBinaryPath(binary.key, e.target.value)}
                placeholder={binary.managed_path}
                className="h-12 rounded-2xl bg-white/5 border border-white/10 font-mono"
              />
            </div>
          ))}
          <div className="flex justify-end">
            <Button variant="primary" className="h-12 sm:h-14 rounded-2xl px-8 text-sm sm:text-base tracking-widest uppercase" onClick={onSaveIntegration} disabled={busy}>
              <Save size={16} className="mr-2" />
              {t('admin.extensions.saveIntegration')}
            </Button>
          </div>
        </div>
      )}
    </AdminCard>
  );
};
