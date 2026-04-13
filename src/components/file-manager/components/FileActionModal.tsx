import React, { useState, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { FolderPlus, FilePlus, Pencil } from 'lucide-react';
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

  return (
    <Modal
      isOpen={actionModal.isOpen}
      onClose={closeActionModal}
      title={actionModal.title}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
          {getIcon()}
          <Input
            ref={inputRef}
            className="flex-1 bg-transparent border-none text-lg p-0 focus-visible:ring-0"
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
            disabled={!value.trim()}
          >
            {t('common.confirm')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
