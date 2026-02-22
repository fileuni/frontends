import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Modal } from '@/components/ui/Modal.tsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export type ToolProps = {
  tool: string;
  homepage: string;
  description: string;
  followStart?: boolean;
  
  // Install fields
  version: string;
  setVersion: (v: string) => void;
  binPath: string;
  setBinPath: (v: string) => void;
  template: string;
  setTemplate: (v: string) => void;
  proxy: string;
  setProxy: (v: string) => void;
  downloadUrl: string;
  setDownloadUrl: (v: string) => void;
  
  // Extra fields for specific tools
  extraFields?: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    isTextArea?: boolean;
  }[];

  onDownload: () => Promise<void>;
  
  // Standard actions
  onStartService?: () => Promise<void>;
  onStopService?: () => Promise<void>;
  onRestart?: () => Promise<void>;

  // Extra actions for specific tools
  extraActions?: {
    label: string;
    onClick: () => Promise<string | void> | void;
    variant?: 'outline' | 'primary' | 'ghost' | 'destructive';
    showOutputInModal?: boolean;
  }[];
};

export const ToolPanel = (props: ToolProps) => {
  const { t } = useTranslation();
  const [installCollapsed, setInstallCollapsed] = useState(true);
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

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4 h-full">
      <h4 className="text-xl font-black capitalize">{t(`admin.extensions.${props.tool}.title`, props.tool)}</h4>
      
      <div className="rounded-xl border border-white/10 bg-black/10 p-3 space-y-2">
        <div className="text-sm opacity-80">{props.description}</div>
        <div className="text-sm opacity-80">
          {t('admin.extensions.projectHomepage')}:{' '}
          <a href={props.homepage} target="_blank" rel="noopener noreferrer" className="underline break-all">
            {props.homepage}
          </a>
        </div>
      </div>

      {/* Installation Section */}
      <div className="rounded-xl border border-white/10 bg-black/10 p-3 space-y-3">
        <div 
          className="flex items-center justify-between cursor-pointer select-none" 
          onClick={() => setInstallCollapsed((v) => !v)}
        >
          <div className="text-base font-semibold">{t('admin.extensions.openlist.installSection')}</div>
          <div className="text-sm opacity-80">
            {installCollapsed ? t('admin.extensions.openlist.expandInstall') : t('admin.extensions.openlist.collapseInstall')}
          </div>
        </div>
        
        {!installCollapsed && (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              <div className="space-y-1">
                <div className="text-sm uppercase opacity-50 px-1">{t('admin.extensions.version')}</div>
                <Input value={props.version} onChange={(e) => props.setVersion(e.target.value)} placeholder={t('admin.extensions.placeholders.version')} />
              </div>
              <div className="space-y-1">
                <div className="text-sm uppercase opacity-50 px-1">{t('admin.extensions.binPath')}</div>
                <Input value={props.binPath} onChange={(e) => props.setBinPath(e.target.value)} placeholder={t('admin.extensions.placeholders.binPath')} />
              </div>
              <div className="space-y-1">
                <div className="text-sm uppercase opacity-50 px-1">{t('admin.extensions.downloadTemplate')}</div>
                <Input value={props.template} onChange={(e) => props.setTemplate(e.target.value)} placeholder={t('admin.extensions.placeholders.downloadTemplate')} />
              </div>
              <div className="space-y-1">
                <div className="text-sm uppercase opacity-50 px-1">{t('admin.extensions.githubProxy')}</div>
                <Input value={props.proxy} onChange={(e) => props.setProxy(e.target.value)} placeholder={t('admin.extensions.placeholders.githubProxy')} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <div className="text-sm uppercase opacity-50 px-1">{t('admin.extensions.customDownloadUrl')}</div>
                <Input value={props.downloadUrl} onChange={(e) => props.setDownloadUrl(e.target.value)} placeholder={t('admin.extensions.placeholders.customDownloadUrl')} />
              </div>

              {props.extraFields?.map((field, idx) => (
                <div key={idx} className={field.isTextArea ? 'md:col-span-2 lg:col-span-3 space-y-1' : 'space-y-1'}>
                  <div className="text-sm uppercase opacity-50 px-1">{field.label}</div>
                  {field.isTextArea ? (
                    <textarea
                      className="w-full h-20 rounded-lg border border-white/10 bg-black/20 p-2 text-sm font-mono"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <Input value={field.value} onChange={(e) => field.onChange(e.target.value)} placeholder={field.placeholder} />
                  )}
                </div>
              ))}
            </div>
            <Button className="w-full h-10 text-sm font-bold" variant="outline" onClick={props.onDownload}>
              {t('admin.extensions.downloadNow', { tool: props.tool })}
            </Button>
          </div>
        )}
      </div>

      {/* Operation Section */}
      <div className="rounded-xl border border-white/10 bg-black/10 p-4 space-y-3">
        <div className="text-lg font-semibold">{t('admin.extensions.openlist.operationSection')}</div>
        {props.followStart !== undefined && (
          <div className="text-sm opacity-70 mb-2">
            {t('admin.extensions.openlist.followStartLabel')}: {props.followStart ? t('admin.extensions.openlist.followStartEnabled') : t('admin.extensions.openlist.followStartDisabled')}
          </div>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {props.onStartService && (
            <Button size="sm" variant="outline" onClick={props.onStartService}>{t('admin.extensions.serviceStart')}</Button>
          )}
          {props.onStopService && (
            <Button size="sm" variant="outline" onClick={props.onStopService}>{t('admin.extensions.serviceStop')}</Button>
          )}
          {props.onRestart && (
            <Button size="sm" variant="outline" onClick={props.onRestart}>{t('admin.extensions.serviceRestart', 'Restart')}</Button>
          )}
          
          {props.extraActions?.map((action, idx) => (
            <Button 
              key={idx} 
              size="sm" 
              variant={action.variant || 'outline'} 
              onClick={() => handleExtraAction(action)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} maxWidth="max-w-2xl">
        <pre className="text-sm whitespace-pre-wrap break-all p-2 bg-black/20 rounded-lg">{modalContent}</pre>
      </Modal>
    </div>
  );
};
