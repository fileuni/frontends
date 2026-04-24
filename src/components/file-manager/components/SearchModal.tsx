import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { Search, X, Info } from 'lucide-react';
import { GlassModalShell } from '@fileuni/ts-shared/modal-shell';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
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

  if (!isOpen) return null;

  return (
    <GlassModalShell
      title={t('filemanager.search')}
      subtitle={t('filemanager.searchPlaceholder')}
      icon={<Search size={24} />}
      onClose={onClose}
      maxWidthClassName="max-w-xl"
      bodyClassName="space-y-5"
      closeButton={(
        <Button variant="ghost" size="sm" onClick={onClose} className="rounded-2xl h-12 w-12 p-0 hover:bg-white/5 shrink-0">
          <X size={24} className="opacity-40" />
        </Button>
      )}
      footer={(
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 opacity-30 italic sm:max-w-[70%]">
            <Info size={18} className="shrink-0" />
            <span className="text-sm font-medium leading-tight">{t('filemanager.searchPlaceholder')}</span>
          </div>
          <Button onClick={onClose} className="rounded-2xl w-full sm:w-auto px-8 h-12 font-black text-sm shadow-xl shadow-primary/20 shrink-0">
            {t('common.close')}
          </Button>
        </div>
      )}
    >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <Input
            ref={inputRef}
            className="pl-10 pr-10 h-14 rounded-3xl border-white/10 bg-white/[0.03] text-white placeholder:text-white/30"
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

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/70 leading-relaxed">
          {isSearchMode
            ? t('filemanager.searchActive')
            : t('filemanager.searchPlaceholder')}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleSearch}
            disabled={!keyword.trim()}
            className="flex-1 rounded-2xl h-12 font-black text-sm shadow-xl shadow-primary/20"
          >
            <Search size={16} className="mr-2" />
            {t('filemanager.search')}
          </Button>
          <Button
            variant="ghost"
            onClick={handleClear}
            disabled={!isSearchMode}
            className="rounded-2xl h-12 px-6 font-black text-sm bg-white/[0.03] hover:bg-white/10"
          >
            {t('filemanager.clear')}
          </Button>
        </div>
    </GlassModalShell>
  );
};
