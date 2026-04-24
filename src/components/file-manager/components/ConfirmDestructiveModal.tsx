import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassModalShell } from '@fileuni/ts-shared/modal-shell';
import { Button } from '@/components/ui/Button.tsx';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDestructiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (actionType: 'physical_delete' | 'mode_remove') => void;
  title: string;
  message: string;
  confirmLabel?: string;
  mode?: string | undefined;
  isModeSpecific?: boolean;
}

/**
 * 带有倒计时的破坏性操作确认模态框
 * Destructive action confirmation modal with countdown
 */
export const ConfirmDestructiveModal = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  message,
  confirmLabel,
  mode,
  isModeSpecific = false
}: ConfirmDestructiveModalProps) => {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (isOpen) {
      setCountdown(10);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
    return undefined;
  }, [isOpen, onClose]);

  const handleAction = (type: 'physical_delete' | 'mode_remove') => {
    onSubmit(type);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <GlassModalShell
      title={title}
      subtitle={message}
      icon={<AlertTriangle size={24} />}
      onClose={onClose}
      compact="all"
      maxWidthClassName="max-w-sm"
      closeButton={(
        <Button variant="ghost" size="sm" onClick={onClose} className="rounded-2xl h-12 w-12 p-0 hover:bg-white/5 shrink-0">
          <X size={24} className="opacity-40" />
        </Button>
      )}
    >
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
            <AlertTriangle className="text-red-500" size={32} />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-white text-sm font-black flex items-center justify-center animate-pulse">
            {countdown}s
          </div>
        </div>
        
        <p className="text-sm opacity-70">
          {message}
        </p>

        <div className="flex flex-col w-full gap-2 mt-4">
          <Button 
            variant="destructive" 
            onClick={() => handleAction('physical_delete')}
            data-testid="file-destructive-confirm"
            className="rounded-xl w-full"
          >
            {confirmLabel || t('filemanager.actions.deletePhysical')}
          </Button>

          {isModeSpecific && mode === 'favorites' && (
            <Button 
              variant="outline" 
              onClick={() => handleAction('mode_remove')}
              className="rounded-xl w-full border-primary/20 text-primary hover:bg-primary/5"
            >
              {t('filemanager.actions.removeFavorite')}
            </Button>
          )}

          {isModeSpecific && mode === 'recent' && (
            <Button 
              variant="outline" 
              onClick={() => handleAction('mode_remove')}
              className="rounded-xl w-full border-primary/20 text-primary hover:bg-primary/5"
            >
              {t('filemanager.actions.removeHistory')}
            </Button>
          )}

          {isModeSpecific && mode === 'shares' && (
            <Button 
              variant="outline" 
              onClick={() => handleAction('mode_remove')}
              className="rounded-xl w-full border-primary/20 text-primary hover:bg-primary/5"
            >
              {t('filemanager.actions.cancelShare')}
            </Button>
          )}

          <Button variant="ghost" onClick={onClose} className="rounded-xl w-full">
            {t('common.cancel')} ({countdown}s)
          </Button>
        </div>
      </div>
    </GlassModalShell>
  );
};
