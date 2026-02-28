import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Modal } from '@/components/ui/Modal.tsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge.tsx';
import { Download, Play, Square, RefreshCw, ExternalLink, Settings, Terminal, Activity } from 'lucide-react';
import type { ToolKind } from './types.ts';

export type ToolProps = {
  tool: string;
  kind: ToolKind;
  installed: boolean;
  homepage: string;
  description: string;
  followStart?: boolean;
  running?: boolean;
  pid?: number | null;
  
  // Install fields
  version: string;
  setVersion: (v: string) => void;
  binPath: string;
  setBinPath: (v: string) => void;
  proxy: string;
  setProxy: (v: string) => void;
  downloadUrl: string;
  setDownloadUrl: (v: string) => void;
  
  // Extra fields
  extraFields?: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    isTextArea?: boolean;
  }[];

  onDownload: () => Promise<void>;
  onFetchLatest?: () => Promise<void>;
  
  // Standard actions
  onStartService?: () => Promise<void>;
  onStopService?: () => Promise<void>;
  onRestart?: () => Promise<void>;
  loading?: boolean;

  // Extra actions
  extraActions?: {
    label: string;
    onClick: () => Promise<string | void> | void;
    variant?: 'outline' | 'primary' | 'ghost' | 'destructive';
    showOutputInModal?: boolean;
  }[];
};

export const ToolPanel = (props: ToolProps) => {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [highlightInstall, setHighlightInstall] = useState(false);

  const handleExtraAction = async (action: NonNullable<ToolProps['extraActions']>[number]) => {
    try {
      const result = await action.onClick();
      if (action.showOutputInModal && typeof result === 'string') {
        setModalTitle(action.label);
        setModalContent(result);
        setModalOpen(true);
      }
    } catch (error: any) {
      if (action.showOutputInModal) {
        setModalTitle(`${action.label} - Error`);
        setModalContent(error?.message || String(error));
        setModalOpen(true);
      }
    }
  };

  const triggerInstallHint = () => {
    setHighlightInstall(true);
    setTimeout(() => setHighlightInstall(false), 2000);
  };

  const showServiceActions = props.kind === 'service' || props.kind === 'both';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Operations Panel */}
      <div className="p-8 bg-white/[0.03] rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-inner">
              <Activity size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xl font-black tracking-tight uppercase">{t('admin.extensions.operationSection')}</h4>
                <Badge variant={props.installed ? 'success' : 'outline'} className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                  {props.installed ? t('admin.extensions.status.installed') : t('admin.extensions.status.notInstalled')}
                </Badge>
                {props.installed && showServiceActions && (
                  <Badge variant={props.running ? 'success' : 'secondary'} className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                    {props.running ? 'Running' : 'Stopped'}
                  </Badge>
                )}
              </div>
              <p className="text-xs opacity-40 font-bold uppercase tracking-widest mt-0.5">{props.tool === 'openlist' ? 'OpenList' : props.tool} Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {props.pid && <Badge variant="outline" className="font-mono text-[10px] opacity-50 px-3 py-1 rounded-lg bg-white/5">PID: {props.pid}</Badge>}
            <a 
              href={props.homepage} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white/70 hover:text-white"
              title="Homepage"
            >
              <ExternalLink size={18} />
            </a>
            <Button 
              variant="outline" 
              className={`h-10 w-10 rounded-xl p-0 transition-all ${highlightInstall ? 'animate-bounce border-primary bg-primary/20 text-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]' : 'bg-white/5 border-white/10'}`}
              onClick={() => setInstallModalOpen(true)}
              title={t('admin.extensions.configSection')}
            >
              <Settings size={18} />
            </Button>
          </div>
        </div>

        {!props.installed ? (
          <div className="py-16 px-6 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] bg-white/[0.01] group hover:bg-white/[0.02] transition-all cursor-pointer" onClick={triggerInstallHint}>
            <Terminal size={48} className="mx-auto mb-6 opacity-10 group-hover:opacity-20 transition-opacity" />
            <p className="text-base font-bold opacity-40">{t('admin.extensions.installFirstHint')}</p>
            <p className="text-xs opacity-20 mt-2 uppercase tracking-widest font-black">{t('admin.extensions.clickSettingsToInstall') || 'Click settings to install'}</p>
          </div>
        ) : (
          <div className="space-y-10">
            {showServiceActions && (
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase opacity-40 ml-1 tracking-widest">{t('admin.extensions.serviceControl')}</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <Button 
                    variant={props.running ? 'ghost' : 'primary'} 
                    className="h-16 rounded-2xl font-black uppercase tracking-widest text-xs gap-3 shadow-lg transition-all active:scale-95"
                    onClick={props.onStartService}
                    disabled={props.running || props.loading}
                  >
                    <Play size={18} fill="currentColor" />
                    {t('admin.extensions.serviceStart')}
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="h-16 rounded-2xl font-black uppercase tracking-widest text-xs gap-3 bg-white/5 border border-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all active:scale-95"
                    onClick={props.onStopService}
                    disabled={!props.running || props.loading}
                  >
                    <Square size={18} fill="currentColor" />
                    {t('admin.extensions.serviceStop')}
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="h-16 rounded-2xl font-black uppercase tracking-widest text-xs gap-3 bg-white/5 border border-white/5 hover:bg-white/10 transition-all active:scale-95"
                    onClick={props.onRestart}
                    disabled={props.loading}
                  >
                    <RefreshCw size={18} className={props.loading ? 'animate-spin' : ''} />
                    {t('admin.extensions.serviceRestart')}
                  </Button>
                </div>
              </div>
            )}

            {props.extraActions && props.extraActions.length > 0 && (
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase opacity-40 ml-1 tracking-widest">{t('admin.extensions.toolActions')}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {props.extraActions.map((action, idx) => (
                    <Button 
                      key={idx} 
                      variant={action.variant === 'primary' ? 'primary' : 'ghost'} 
                      className={`h-16 rounded-2xl font-black uppercase tracking-widest text-xs gap-3 shadow-lg transition-all active:scale-95 ${action.variant !== 'primary' ? 'bg-white/5 border border-white/5 hover:bg-white/10' : ''}`}
                      onClick={() => handleExtraAction(action)}
                      disabled={props.loading}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {props.kind === 'task' && (!props.extraActions || props.extraActions.length === 0) && (
              <div className="p-8 bg-white/[0.02] rounded-3xl border border-white/5 text-sm opacity-60 leading-relaxed font-medium">
                {t('admin.extensions.taskKindHint')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Configuration & Installation Modal */}
      <Modal 
        isOpen={installModalOpen} 
        onClose={() => setInstallModalOpen(false)} 
        title={`${t('admin.extensions.configSection')} - ${props.tool.charAt(0).toUpperCase() + props.tool.slice(1)}`}
        maxWidth="max-w-2xl"
      >
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between bg-primary/5 p-4 rounded-2xl border border-primary/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                <Settings size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm">{t('admin.extensions.fetchLatestTitle') || 'Automatic Configuration'}</h4>
                <p className="text-[10px] opacity-60 font-medium uppercase tracking-wider">{t('admin.extensions.fetchLatestHint') || 'Fetch latest version from GitHub'}</p>
              </div>
            </div>
            {props.onFetchLatest && (
              <Button 
                size="sm" 
                variant="primary" 
                className="rounded-xl h-10 px-4 font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-primary/20"
                onClick={props.onFetchLatest}
                disabled={props.loading}
              >
                <RefreshCw size={14} className={props.loading ? 'animate-spin' : ''} />
                {t('admin.extensions.fetchLatestBtn')}
              </Button>
            )}
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase opacity-40 ml-1 tracking-widest">{t('admin.extensions.version') || 'Version'}</label>
                <Input value={props.version} onChange={(e) => props.setVersion(e.target.value)} className="h-12 rounded-2xl bg-white/5 border-white/5" placeholder="v1.0.0" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase opacity-40 ml-1 tracking-widest">{t('admin.extensions.binPath')}</label>
                <Input value={props.binPath} onChange={(e) => props.setBinPath(e.target.value)} className="h-12 rounded-2xl bg-white/5 border-white/5" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase opacity-40 ml-1 tracking-widest">{t('admin.extensions.githubProxy')}</label>
              <Input value={props.proxy} onChange={(e) => props.setProxy(e.target.value)} placeholder="https://ghproxy.com/" className="h-12 rounded-2xl bg-white/5 border-white/5" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase opacity-40 ml-1 tracking-widest">{t('admin.extensions.customDownloadUrl')}</label>
              <Input value={props.downloadUrl} onChange={(e) => props.setDownloadUrl(e.target.value)} className="h-12 rounded-2xl bg-white/5 border-white/5" />
            </div>

            {props.extraFields && props.extraFields.length > 0 && (
              <div className="pt-4 space-y-4 border-t border-white/5">
                {props.extraFields.map((field, idx) => (
                  <div key={idx} className="space-y-2">
                    <label className="text-[10px] font-black uppercase opacity-40 ml-1 tracking-widest">{field.label}</label>
                    {field.isTextArea ? (
                      <textarea
                        className="w-full min-h-[120px] rounded-2xl border border-white/5 bg-white/5 p-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all leading-relaxed"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <Input value={field.value} onChange={(e) => field.onChange(e.target.value)} placeholder={field.placeholder} className="h-12 rounded-2xl bg-white/5 border-white/5" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/10 gap-3 transition-all active:scale-95"
              variant="primary"
              onClick={props.onDownload}
              disabled={props.loading}
            >
              {props.loading ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
              {props.installed ? t('admin.extensions.updateBtn') || 'Update Tool' : t('admin.extensions.installBtn') || 'Install Tool'}
            </Button>
            <Button 
              variant="outline" 
              className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs border-white/10 bg-white/5 hover:bg-white/10"
              onClick={() => setInstallModalOpen(false)}
            >
              {t('common.close')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} maxWidth="max-w-2xl">
        <div className="p-6 space-y-6">
          <div className="p-5 bg-black/40 rounded-[1.5rem] border border-white/5 font-mono text-xs overflow-auto max-h-[50vh] leading-relaxed">
            <pre className="whitespace-pre-wrap break-all opacity-80">{modalContent}</pre>
          </div>
          <div className="flex justify-end">
            <Button 
              className="rounded-xl px-8 h-11 font-bold"
              onClick={() => setModalOpen(false)}
            >
              {t('common.close')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
