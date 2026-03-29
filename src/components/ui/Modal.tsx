import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { useEscapeToCloseTopLayer } from '@/hooks/useEscapeToCloseTopLayer';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  maxWidth?: string;
  hideCloseButton?: boolean;
}

export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className, 
  bodyClassName,
  maxWidth = "max-w-md",
  hideCloseButton = false
}: ModalProps) => {
  useEscapeToCloseTopLayer({
    active: isOpen,
    enabled: !hideCloseButton,
    onEscape: onClose,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => !hideCloseButton && onClose()} />
       <div className={cn(
         "relative w-full rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border-2 bg-background text-foreground border-border flex flex-col min-h-0 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]",
          maxWidth,
          className
        )}>
        <div className={cn(
           "px-4 sm:px-6 py-4 border-b flex items-center justify-between border-border bg-muted/30 shrink-0"
         )}>
          <h3 className="text-lg font-black tracking-tight">{title}</h3>
          {!hideCloseButton && (
            <button 
              type="button"
              onClick={onClose} 
              className="p-2 rounded-full transition-all opacity-50 hover:opacity-100 hover:bg-muted"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className={cn(
          "flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar p-4 px-4 sm:px-6 bg-background",
          bodyClassName
        )}>
          {children}
        </div>
      </div>
    </div>
  );
};
