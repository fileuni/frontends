import { type ReactNode } from 'react';
import { GlassModalShell } from '@fileuni/ts-shared/modal-shell';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

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
  if (!isOpen) return null;

  const noop = () => {};
  const effectiveOnClose = hideCloseButton ? noop : onClose;

  return (
    <GlassModalShell
      title={title}
      onClose={effectiveOnClose}
      maxWidthClassName={maxWidth}
      panelClassName={cn(
        "rounded-2xl border-2 bg-background text-foreground border-border shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300",
        className
      )}
      bodyClassName={cn(
        "p-4 px-4 sm:px-6 bg-background",
        bodyClassName
      )}
      overlayClassName="bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      zIndexClassName="z-[110]"
      containerClassName="p-2 sm:p-4"
      closeButton={hideCloseButton ? null : (
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full transition-all opacity-50 hover:opacity-100 hover:bg-muted"
        >
          <X size={18} />
        </button>
      )}
    >
      {children}
    </GlassModalShell>
  );
};
