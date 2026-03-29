import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Modal } from '@/components/ui/Modal.tsx';
import { useFileStore } from '../store/useFileStore.ts';
import { useFileActions } from '../hooks/useFileActions.ts';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal = ({ isOpen, onClose }: SearchModalProps) => {
  const { t } = useTranslation();
  const store = useFileStore();
  const { searchFiles, clearSearch } = useFileActions();
  const [keyword, setKeyword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const currentSearchKeyword = store.getSearchKeyword();
  const isSearchMode = store.getIsSearchMode();

  const handleSearch = () => {
    if (keyword.trim()) {
      searchFiles(keyword);
      onClose();
    }
  };

  const handleClear = () => {
    setKeyword('');
    clearSearch();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      setKeyword(currentSearchKeyword);
    }
  }, [currentSearchKeyword, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
  }, [isOpen]);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title={t('filemanager.search')}
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <Input
            ref={inputRef}
            className="pl-10 pr-10"
            placeholder={t('filemanager.searchPlaceholder')}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {keyword && (
            <button
              type="button"
              onClick={() => setKeyword('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSearch}
            disabled={!keyword.trim()}
            className="flex-1"
          >
            <Search size={16} className="mr-2" />
            {t('filemanager.search')}
          </Button>
          <Button
            variant="ghost"
            onClick={handleClear}
            disabled={!isSearchMode}
          >
            {t('filemanager.clear')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
