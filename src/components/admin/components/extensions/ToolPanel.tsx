import { Activity, ExternalLink, Play, RefreshCw, Square, Terminal, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge.tsx';
import { Button } from '@/components/ui/Button.tsx';
import type { ToolInstallMode, ToolKind } from './types.ts';

type Props = {
  tool: string;
  displayName: string;
  kind: ToolKind;
  installed: boolean;
  executablePath?: string | undefined;
  homepage: string;
  description: string;
  installMode: ToolInstallMode;
  followStart?: boolean | undefined;
  running?: boolean | undefined;
  pid?: number | null | undefined;
  loading?: boolean | undefined;
  onDelete?: (() => Promise<void>) | undefined;
  onStartService?: (() => Promise<void>) | undefined;
  onStopService?: (() => Promise<void>) | undefined;
  onRestart?: (() => Promise<void>) | undefined;
};

export const ToolPanel = ({
  displayName,
  kind,
  installed,
  executablePath,
  homepage,
  description,
  installMode,
  followStart,
  running,
  pid,
  loading,
  onDelete,
  onStartService,
  onStopService,
  onRestart,
}: Props) => {
  const { t } = useTranslation();
  const showServiceActions = kind === 'service' || kind === 'both';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-4 sm:p-6 md:p-10 bg-white/[0.03] rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[3rem] border border-white/10 shadow-2xl space-y-6 md:space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4 sm:gap-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl sm:rounded-3xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-inner shrink-0">
              <Activity size={24} className="sm:w-8 sm:h-8 md:w-10 md:h-10" />
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h4 className="text-xl sm:text-2xl md:text-4xl font-black tracking-tight leading-tight">{displayName}</h4>
                <Badge variant={installed ? 'success' : 'outline'} className="rounded-full px-3 py-1 text-xs sm:text-sm font-bold uppercase tracking-widest">
                  {installed ? t('admin.extensions.status.installed') : t('admin.extensions.status.notInstalled')}
                </Badge>
                {showServiceActions && (
                  <Badge variant={running ? 'success' : 'secondary'} className="rounded-full px-3 py-1 text-xs sm:text-sm font-bold uppercase tracking-widest">
                    {running ? t('admin.extensions.running') : t('admin.extensions.stopped')}
                  </Badge>
                )}
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs sm:text-sm font-bold uppercase tracking-widest bg-white/5 border-white/10">
                  {installMode === 'existing_binary' ? t('admin.extensions.installModeExisting') : t('admin.extensions.installModeManaged')}
                </Badge>
              </div>
              <p className="text-sm sm:text-base md:text-lg opacity-75 leading-7 max-w-4xl">{description}</p>
              {executablePath && (
                <p className="text-xs sm:text-sm md:text-base font-mono opacity-60 flex items-center gap-2 break-all">
                  <Terminal size={14} className="shrink-0" />
                  {executablePath}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm opacity-55 font-black uppercase tracking-widest">
                <span>{t('admin.extensions.management')}</span>
                <span>{t('admin.extensions.followStart')}: {followStart ? t('common.enabled') : t('common.disabled')}</span>
                {pid ? <span>{t('admin.extensions.pidLabel')}: {pid}</span> : null}
              </div>
            </div>
          </div>

          <a
            href={homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white/70 hover:text-white shrink-0"
            title={t('admin.extensions.homepage')}
          >
            <ExternalLink size={18} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
          </a>
        </div>

        {showServiceActions && (
          <div className="space-y-4">
            <div className="text-xs sm:text-sm md:text-base font-black uppercase opacity-50 ml-1 tracking-wider sm:tracking-[0.2em]">{t('admin.extensions.serviceControl')}</div>
            <div className="grid grid-cols-1 min-[450px]:grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              <Button
                variant={running ? 'ghost' : 'primary'}
                className="h-12 sm:h-14 md:h-20 rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] font-black uppercase tracking-widest text-xs sm:text-sm md:text-base gap-2 sm:gap-3"
                onClick={onStartService}
                disabled={running || loading}
              >
                <Play size={16} fill="currentColor" />
                {t('admin.extensions.serviceStart')}
              </Button>
              <Button
                variant="ghost"
                className="h-12 sm:h-14 md:h-20 rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] font-black uppercase tracking-widest text-xs sm:text-sm md:text-base gap-2 sm:gap-3 bg-white/5 border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                onClick={onStopService}
                disabled={!running || loading}
              >
                <Square size={16} fill="currentColor" />
                {t('admin.extensions.serviceStop')}
              </Button>
              <Button
                variant="ghost"
                className="h-12 sm:h-14 md:h-20 rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] font-black uppercase tracking-widest text-xs sm:text-sm md:text-base gap-2 sm:gap-3 bg-white/5 border border-white/10 hover:bg-white/10"
                onClick={onRestart}
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                {t('admin.extensions.serviceRestart')}
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  className="h-12 sm:h-14 md:h-20 rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] font-black uppercase tracking-widest text-xs sm:text-sm md:text-base gap-2 sm:gap-3 bg-red-500/5 border border-red-500/10 hover:bg-red-500/20 hover:text-red-400"
                  onClick={onDelete}
                  disabled={loading || running || !installed || installMode === 'existing_binary'}
                >
                  <Trash2 size={16} />
                  {t('common.delete')}
                </Button>
              )}
            </div>
          </div>
        )}

        {kind === 'task' && (
          <div className="p-4 sm:p-6 md:p-8 bg-white/[0.02] rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 text-sm sm:text-base md:text-lg opacity-60 leading-relaxed font-medium">
            {t('admin.extensions.taskKindHint')}
          </div>
        )}
      </div>
    </div>
  );
};
