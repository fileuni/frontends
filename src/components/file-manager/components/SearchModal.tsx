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

const normalizeSearchPath = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '/';
  return trimmed.replace(/\/+/g, '/').replace(/(.+)\/$/, '$1').startsWith('/')
    ? trimmed.replace(/\/+/g, '/').replace(/(.+)\/$/, '$1')
    : `/${trimmed.replace(/\/+/g, '/').replace(/(.+)\/$/, '$1')}`;
};

export const SearchModal = ({ isOpen, onClose }: SearchModalProps) => {
  const { t } = useTranslation();
  const store = useFileStore();
  const { searchFiles, clearSearch } = useFileActions();
  const [keyword, setKeyword] = useState('');
  const [searchPath, setSearchPath] = useState('/');
  const inputRef = useRef<HTMLInputElement>(null);
  const currentSearchKeyword = store.getSearchKeyword();
  const currentSearchPath = store.getSearchPath();
  const currentPath = store.getCurrentPath();
  const isSearchMode = store.getIsSearchMode();

  const handleSearch = () => {
    if (keyword.trim()) {
      void searchFiles(keyword, normalizeSearchPath(searchPath));
      onClose();
    }
  };

  const handleClear = () => {
    setKeyword('');
    setSearchPath(currentPath);
    void clearSearch();
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
      setSearchPath(currentSearchPath || currentPath);
    }
  }, [currentPath, currentSearchKeyword, currentSearchPath, isOpen]);

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
      compact="all"
      maxWidthClassName="max-w-xl"
      bodyClassName="space-y-5"
      closeButton={(
        <Button variant="ghost" size="sm" onClick={onClose} className="rounded-2xl h-12 w-12 p-0 hover:bg-zinc-100/80 dark:hover:bg-white/10 text-foreground/50 dark:text-white/40 shrink-0">
          <X size={24} />
        </Button>
      )}
      footer={(
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-slate-600 dark:text-white/45 italic sm:max-w-[70%]">
            <Info size={18} className="shrink-0" />
            <span className="text-sm font-medium leading-tight">{t('filemanager.searchPlaceholder')}</span>
          </div>
          <Button onClick={onClose} className="rounded-2xl w-full sm:w-auto px-8 h-12 font-black text-sm shadow-xl shadow-primary/20 shrink-0">
            {t('common.close')}
          </Button>
        </div>
      )}
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" size={18} />
          <Input
            ref={inputRef}
            className="h-14 rounded-3xl border-zinc-300 bg-white pl-10 pr-10 text-slate-950 placeholder:text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/30"
            placeholder={t('filemanager.searchPlaceholder')}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {keyword && (
            <button
              type="button"
              onClick={() => setKeyword('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <Input
          className="h-12 rounded-2xl border-zinc-300 bg-white px-4 text-slate-950 placeholder:text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/30"
          placeholder={t('filemanager.searchPathPlaceholder') || '/folder/subfolder'}
          value={searchPath}
          onChange={(e) => setSearchPath(e.target.value)}
          onKeyDown={handleKeyDown}
        />
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
          className="h-12 rounded-2xl bg-white px-6 text-sm font-black text-slate-700 shadow-sm hover:bg-zinc-50 hover:text-slate-900 dark:bg-white/[0.03] dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white"
        >
          {t('filemanager.clear')}
        </Button>
      </div>
    </GlassModalShell>
  );
};
