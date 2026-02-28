import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Modal } from '@/components/ui/Modal.tsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge.tsx';
import { ChevronDown, ChevronUp, Download, Play, Square, RefreshCw, ExternalLink, Settings, Terminal, Activity } from 'lucide-react';
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
  const [configCollapsed, setConfigCollapsed] = useState(props.installed);
  const [opCollapsed, setOpCollapsed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');

  const handleExtraAction = async (action: ToolProps['extraActions'][0]) => {
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

  const showServiceActions = props.kind === 'service' || props.kind === 'both';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Status Banner */}
      <div className="p-8 bg-white/[0.03] rounded-[2rem] border border-white/5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-black capitalize">{props.tool === 'openlist' ? 'OpenList' : props.tool}</h3>
            <Badge variant={props.installed ? 'success' : 'outline'} className="rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              {props.installed ? t('admin.extensions.status.installed') : t('admin.extensions.status.notInstalled')}
            </Badge>
            {props.installed && showServiceActions && (
              <Badge variant={props.running ? 'success' : 'secondary'} className="rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                {props.running ? 'Running' : 'Stopped'}
              </Badge>
            )}
          </div>
          <p className="text-sm opacity-60 leading-relaxed max-w-2xl">
            {props.description}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a 
            href={props.homepage} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white/70 hover:text-white"
          >
            <ExternalLink size={20} />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Configuration */}
        <div className="p-8 bg-white/[0.03] rounded-[2rem] border border-white/5 shadow-xl space-y-6">
          <div 
            className="flex items-center justify-between cursor-pointer group"
            onClick={() => setConfigCollapsed(!configCollapsed)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center border border-primary/20">
                <Settings size={20} />
              </div>
              <h4 className="text-lg font-bold">{t('admin.extensions.configSection')}</h4>
              {props.onFetchLatest && (
                <div className="flex items-center gap-2">
                  <Button 
                    size="xs" 
                    variant="ghost" 
                    className="h-8 px-2 rounded-lg gap-1.5 opacity-60 hover:opacity-100 hover:bg-primary/10 hover:text-primary transition-all"
                    onClick={(e) => { e.stopPropagation(); props.onFetchLatest(); }}
                    disabled={props.loading}
                  >
                    <RefreshCw size={14} className={props.loading ? 'animate-spin' : ''} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{t('admin.extensions.fetchLatestBtn')}</span>
                  </Button>
                  {props.version && (
                    <div className="animate-in zoom-in-95 fade-in duration-500 flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-primary/40 animate-pulse" />
                      <span className="text-[10px] font-mono font-black text-primary/80 tracking-tighter">{props.version}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            {configCollapsed ? <ChevronDown size={20} className="opacity-40 group-hover:opacity-100" /> : <ChevronUp size={20} className="opacity-40 group-hover:opacity-100" />}
          </div>

          {!configCollapsed && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase opacity-40 ml-1 tracking-widest">{t('admin.extensions.binPath')}</label>
                  <Input value={props.binPath} onChange={(e) => props.setBinPath(e.target.value)} className="h-11 rounded-xl bg-white/5 border-white/5" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase opacity-40 ml-1 tracking-widest">{t('admin.extensions.githubProxy')}</label>
                  <Input value={props.proxy} onChange={(e) => props.setProxy(e.target.value)} placeholder="https://ghproxy.com/" className="h-11 rounded-xl bg-white/5 border-white/5" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase opacity-40 ml-1 tracking-widest">{t('admin.extensions.customDownloadUrl')}</label>
                  <Input value={props.downloadUrl} onChange={(e) => props.setDownloadUrl(e.target.value)} className="h-11 rounded-xl bg-white/5 border-white/5" />
                </div>
              </div>

              {props.extraFields && props.extraFields.length > 0 && (
                <div className="pt-4 space-y-4 border-t border-white/5">
                  {props.extraFields.map((field, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase opacity-40 ml-1 tracking-widest">{field.label}</label>
                      {field.isTextArea ? (
                        <textarea
                          className="w-full min-h-[100px] rounded-2xl border border-white/5 bg-white/5 p-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          placeholder={field.placeholder}
                        />
                      ) : (
                        <Input value={field.value} onChange={(e) => field.onChange(e.target.value)} placeholder={field.placeholder} className="h-11 rounded-xl bg-white/5 border-white/5" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <Button 
                className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/10 gap-2"
                variant="primary"
                onClick={props.onDownload}
                disabled={props.loading}
              >
                {props.loading ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                {t('admin.extensions.installOrUpdate')}
              </Button>
            </div>
          )}
        </div>

        {/* Right: Operations */}
        <div className="p-8 bg-white/[0.03] rounded-[2rem] border border-white/5 shadow-xl space-y-6">
          <div 
            className="flex items-center justify-between cursor-pointer group"
            onClick={() => setOpCollapsed(!opCollapsed)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Activity size={20} />
              </div>
              <h4 className="text-lg font-bold">{t('admin.extensions.operationSection')}</h4>
            </div>
            {opCollapsed ? <ChevronDown size={20} className="opacity-40 group-hover:opacity-100" /> : <ChevronUp size={20} className="opacity-40 group-hover:opacity-100" />}
          </div>

          {!opCollapsed && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {!props.installed ? (
                <div className="py-12 px-6 text-center border-2 border-dashed border-white/5 rounded-[2rem] opacity-40">
                  <Terminal size={32} className="mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-medium">{t('admin.extensions.installFirstHint')}</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {showServiceActions && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase opacity-40 ml-1 tracking-widest">{t('admin.extensions.serviceControl')}</label>
                        {props.pid && <Badge variant="outline" className="font-mono text-[10px] opacity-50">PID: {props.pid}</Badge>}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <Button 
                          variant={props.running ? 'ghost' : 'primary'} 
                          className="h-14 rounded-2xl font-bold gap-2"
                          onClick={props.onStartService}
                          disabled={props.running}
                        >
                          <Play size={16} />
                          {t('admin.extensions.serviceStart')}
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="h-14 rounded-2xl font-bold gap-2 bg-white/5 border border-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
                          onClick={props.onStopService}
                          disabled={!props.running}
                        >
                          <Square size={16} />
                          {t('admin.extensions.serviceStop')}
                        </Button>
                        <Button 
                          variant="ghost"
                          className="h-14 rounded-2xl font-bold gap-2 bg-white/5 border border-white/5 hover:bg-white/10"
                          onClick={props.onRestart}
                        >
                          <RefreshCw size={16} />
                          {t('admin.extensions.serviceRestart')}
                        </Button>
                      </div>
                    </div>
                  )}

                  {props.extraActions && props.extraActions.length > 0 && (
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase opacity-40 ml-1 tracking-widest">{t('admin.extensions.toolActions')}</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {props.extraActions.map((action, idx) => (
                          <Button 
                            key={idx} 
                            variant={action.variant === 'primary' ? 'primary' : 'ghost'} 
                            className={`h-14 rounded-2xl font-bold gap-2 ${action.variant !== 'primary' ? 'bg-white/5 border border-white/5 hover:bg-white/10' : ''}`}
                            onClick={() => handleExtraAction(action)}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {props.kind === 'task' && (!props.extraActions || props.extraActions.length === 0) && (
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 text-sm opacity-60 leading-relaxed">
                      {t('admin.extensions.taskKindHint')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
