import React, { useState, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassModalShell } from '@fileuni/ts-shared/modal-shell';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { FolderPlus, FilePlus, Pencil, X } from 'lucide-react';
import { useFileStore } from '../store/useFileStore.ts';

interface FileActionModalProps {
  onSubmit: (value: string) => void;
}

const getDefaultSelectionRange = (
  type: 'create_file' | 'create_dir' | 'rename' | 'delete_confirm' | 'mode_delete_confirm',
  text: string,
) => {
  if (type !== 'rename') {
    return [0, text.length] as const;
  }

  const lastDotIndex = text.lastIndexOf('.');
  if (lastDotIndex <= 0 || lastDotIndex === text.length - 1) {
    return [0, text.length] as const;
  }

  return [0, lastDotIndex] as const;
};

/**
 * 通用的文件名输入/重命名模态框
 * General purpose modal for filename input/renaming
 */
export const FileActionModal = ({ onSubmit }: FileActionModalProps) => {
  const { t } = useTranslation();
  const { actionModal, closeActionModal } = useFileStore();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingSelectionRef = useRef(false);

  useLayoutEffect(() => {
    if (actionModal.isOpen) {
      pendingSelectionRef.current = true;
      setValue(actionModal.defaultValue);
      return;
    }

    pendingSelectionRef.current = false;
  }, [actionModal.isOpen, actionModal.defaultValue]);

  useLayoutEffect(() => {
    if (!actionModal.isOpen || !pendingSelectionRef.current) return;
    if (value !== actionModal.defaultValue) return;

    const input = inputRef.current;
    if (!input) return;

    input.focus();
    const [selectionStart, selectionEnd] = getDefaultSelectionRange(actionModal.type, value);
    input.setSelectionRange(selectionStart, selectionEnd);
    pendingSelectionRef.current = false;
  }, [actionModal.isOpen, actionModal.type, actionModal.defaultValue, value]);

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
      closeActionModal();
    }
  };

  const getIcon = () => {
    switch (actionModal.type) {
      case 'create_dir': return <FolderPlus className="text-yellow-400" size={24} />;
      case 'create_file': return <FilePlus className="text-blue-400" size={24} />;
      case 'rename': return <Pencil className="text-primary" size={24} />;
      default: return null;
    }
  };

  // Destructive operations use dedicated modal
  if (actionModal.type === 'delete_confirm' || actionModal.type === 'mode_delete_confirm') return null;
  if (!actionModal.isOpen) return null;

  return (
    <GlassModalShell
      title={actionModal.title}
      subtitle={t('filemanager.messages.enterNewName')}
      icon={getIcon()}
      onClose={closeActionModal}
      compact="all"
      maxWidthClassName="max-w-md"
      closeButton={(
        <Button
          variant="ghost"
          size="sm"
          onClick={closeActionModal}
          className="rounded-2xl h-12 w-12 p-0 hover:bg-zinc-100/80 dark:hover:bg-white/10 text-foreground/50 dark:text-white/40 shrink-0"
        >
          <X size={24} />
        </Button>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-inner dark:backdrop-blur-sm">
          {getIcon()}
          <Input
            ref={inputRef}
            className="flex-1 border-none bg-transparent p-0 text-lg text-slate-900 dark:text-white focus-visible:ring-0"
            aria-label={actionModal.title || 'File action name'}
            data-testid="file-action-input"
            placeholder={t('filemanager.messages.enterNewName')}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={closeActionModal} type="button" className="rounded-xl">
            {t('common.cancel')}
          </Button>
          <Button 
            variant="primary" 
            type="submit" 
            className="rounded-xl px-6"
            data-testid="file-action-confirm"
            disabled={!value.trim()}
          >
            {t('common.confirm')}
          </Button>
        </div>
      </form>
    </GlassModalShell>
  );
};
