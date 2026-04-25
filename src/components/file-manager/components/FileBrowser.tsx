import React from 'react';
import { useFileStore } from '../store/useFileStore.ts';
import { useSelectionStore } from '../store/useSelectionStore.ts';
import { FileItem } from './FileItem.tsx';
import { useFileActions } from '../hooks/useFileActions.ts';
import { Button } from '@/components/ui/Button.tsx';
import { cn } from '@/lib/utils.ts';
import { Inbox, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { FileInfo } from '../types/index.ts';

interface Props {
  onContextMenu: (e: React.MouseEvent, file: FileInfo) => void;
  onAction?: (action: string, target: FileInfo | null) => void;
  dragDisabled?: boolean;
}

/**
 * 纯粹的文件列表浏览器 / Pure File List Browser
 * 仅负责网格与列表模式的切换展示，不再干预分页导航。
 */
type MarqueeRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const MARQUEE_ACTIVATION_DISTANCE = 8;

export const FileBrowser = ({ onContextMenu, onAction, dragDisabled = false }: Props) => {
  const { t } = useTranslation();
  const store = useFileStore();
  const { clearSearch, syncIndexAndRetrySearch } = useFileActions();
  const { files, loading, fmMode } = store;
  const viewMode = store.getViewMode();
  const isSearchMode = store.getIsSearchMode();
  const searchKeyword = store.getSearchKeyword();
  const { selectedIds, deselectAll, setSelection } = useSelectionStore();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const marqueeOriginRef = React.useRef<{ x: number; y: number; append: boolean } | null>(null);
  const [marqueeRect, setMarqueeRect] = React.useState<MarqueeRect | null>(null);
  const [isMarqueeActive, setIsMarqueeActive] = React.useState(false);

  const updateMarqueeSelection = React.useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    const origin = marqueeOriginRef.current;
    if (!container || !origin) return;

    const containerRect = container.getBoundingClientRect();
    const left = Math.min(origin.x, clientX) - containerRect.left + container.scrollLeft;
    const top = Math.min(origin.y, clientY) - containerRect.top + container.scrollTop;
    const right = Math.max(origin.x, clientX) - containerRect.left + container.scrollLeft;
    const bottom = Math.max(origin.y, clientY) - containerRect.top + container.scrollTop;
    const nextRect = {
      left,
      top,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
    };
    setMarqueeRect(nextRect);

    const hitIds = Array.from(container.querySelectorAll<HTMLElement>('[data-select-id]')).flatMap((element) => {
      const selectId = element.dataset['selectId'];
      if (!selectId) return [];
      const rect = element.getBoundingClientRect();
      const itemLeft = rect.left - containerRect.left + container.scrollLeft;
      const itemTop = rect.top - containerRect.top + container.scrollTop;
      const itemRight = itemLeft + rect.width;
      const itemBottom = itemTop + rect.height;
      const intersects = !(itemRight < nextRect.left || itemLeft > nextRect.left + nextRect.width || itemBottom < nextRect.top || itemTop > nextRect.top + nextRect.height);
      return intersects ? [selectId] : [];
    });

    const merged = origin.append
      ? Array.from(new Set([...Array.from(selectedIds), ...hitIds]))
      : hitIds;
    setSelection(merged);
  }, [selectedIds, setSelection]);

  const handlePointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (!(event.target instanceof HTMLElement)) return;
    if (event.target.closest('[data-file-content="true"]')) return;
    if (event.target !== event.currentTarget && !event.target.closest('[data-marquee-surface="true"]')) return;
    marqueeOriginRef.current = {
      x: event.clientX,
      y: event.clientY,
      append: event.ctrlKey || event.metaKey,
    };
    if (!(event.ctrlKey || event.metaKey)) {
      deselectAll();
    }
  }, [deselectAll]);

  const handlePointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const origin = marqueeOriginRef.current;
    if (!origin) return;
    if (!isMarqueeActive) {
      const distance = Math.hypot(event.clientX - origin.x, event.clientY - origin.y);
      if (distance < MARQUEE_ACTIVATION_DISTANCE) return;
      setIsMarqueeActive(true);
    }
    updateMarqueeSelection(event.clientX, event.clientY);
  }, [isMarqueeActive, updateMarqueeSelection]);

  const handlePointerUp = React.useCallback(() => {
    marqueeOriginRef.current = null;
    setIsMarqueeActive(false);
    setTimeout(() => setMarqueeRect(null), 0);
  }, []);

  if (!loading && files.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 opacity-20">
        <Inbox size={64} strokeWidth={1} />
        <p className="text-xl font-black mt-4 tracking-widest">
          {isSearchMode ? (t('filemanager.emptySearch') || t('filemanager.emptyFolder')) : t('filemanager.emptyFolder')}
        </p>
        {isSearchMode && searchKeyword && (
          <>
            <p className="mt-2 text-sm font-bold tracking-[0.18em]">
              {searchKeyword}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button variant="ghost" onClick={() => void clearSearch()}>
                {t('filemanager.clear')}
              </Button>
              <Button variant="outline" onClick={() => void syncIndexAndRetrySearch()}>
                {t('filemanager.syncSearchIndex')}
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
      <div
        ref={containerRef}
        className="relative flex-1 flex flex-col overflow-y-auto custom-scrollbar px-2 md:px-4 pb-4"
        role="listbox"
        aria-label="File list"
        data-testid="file-list"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {marqueeRect && (
          <div
            className="pointer-events-none absolute z-20 rounded-md border border-primary/50 bg-primary/15"
            style={{
              left: marqueeRect.left,
              top: marqueeRect.top,
              width: marqueeRect.width,
              height: marqueeRect.height,
            }}
          />
        )}
        {viewMode === 'grid' ? (
          <div data-marquee-surface="true" className={cn(
            "grid gap-3 md:gap-4 py-4 transition-all duration-500",
            "grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8"
          )}>
            {files.map((file) => (
              <FileItem
                key={(fmMode === 'shares' && file.id) ? file.id : file.path}
                file={file}
                onContextMenu={onContextMenu}
                onAction={onAction}
                dragDisabled={dragDisabled || isMarqueeActive}
              />
            ))}
          </div>
        ) : (
          <div data-marquee-surface="true" className="flex flex-col py-2">
            {files.map((file) => (
              <FileItem
                key={(fmMode === 'shares' && file.id) ? file.id : file.path}
                file={file}
                onContextMenu={onContextMenu}
                onAction={onAction}
                dragDisabled={dragDisabled || isMarqueeActive}
              />
            ))}
          </div>
        )}

        {loading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 opacity-40">
            <Loader2 size={32} className="animate-spin text-primary" />
            <span className="text-sm font-black tracking-[0.2em]">{t('common.loading')}</span>
          </div>
        )}
      </div>
  );
};
