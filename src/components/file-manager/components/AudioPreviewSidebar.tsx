import { useState } from 'react';
import type React from 'react';
import type { FileInfo } from '../types/index.ts';
import type { MediaPlaybackRecord } from '@/lib/mediaPlaybackHistory.ts';
import { ListMusic, Loader2, Mic2, Pause, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { formatTime, getBaseName, type LyricsState } from './audioPreviewShared.ts';

interface AudioPreviewSidebarProps {
  activeLyricIndex: number;
  activeLyricRef: React.RefObject<HTMLButtonElement | null>;
  currentIndex: number;
  currentLyricLine: string | null;
  isDark?: boolean;
  isPlaying: boolean;
  lyricsState: LyricsState;
  onLyricSeek: (time: number) => void;
  onClearRecentHistory: () => void;
  onOpenRecentRecord: (path: string) => void;
  onRemoveRecentRecord: (path: string) => void;
  onTrackSelect: (index: number) => void;
  playlist: FileInfo[];
  recentRecords: MediaPlaybackRecord[];
  t: (key: string, options?: Record<string, unknown>) => string;
}

export const AudioPreviewSidebar = ({
  activeLyricIndex,
  activeLyricRef,
  currentIndex,
  currentLyricLine,
  isDark,
  isPlaying,
  lyricsState,
  onLyricSeek,
  onClearRecentHistory,
  onOpenRecentRecord,
  onRemoveRecentRecord,
  onTrackSelect,
  playlist,
  recentRecords,
  t,
}: AudioPreviewSidebarProps) => {
  const [mobileTab, setMobileTab] = useState<'lyrics' | 'playlist' | 'recent'>('lyrics');

  return (
    <aside className="flex min-h-0 flex-col gap-4">
      <div className={cn('grid grid-cols-3 gap-2 rounded-2xl border p-1 lg:hidden', isDark ? 'border-white/10 bg-white/5' : 'border-white/80 bg-white/80')}>
        <button type="button" onClick={() => setMobileTab('lyrics')} className={cn('h-11 rounded-[1rem] text-sm font-black uppercase tracking-[0.22em] transition-all', mobileTab === 'lyrics' ? 'bg-primary text-primary-foreground' : isDark ? 'text-white/65' : 'text-slate-500')}>
          {t('filemanager.audio.lyrics')}
        </button>
        <button type="button" onClick={() => setMobileTab('playlist')} className={cn('h-11 rounded-[1rem] text-sm font-black uppercase tracking-[0.22em] transition-all', mobileTab === 'playlist' ? 'bg-primary text-primary-foreground' : isDark ? 'text-white/65' : 'text-slate-500')}>
          {t('filemanager.player.playlist')}
        </button>
        <button type="button" onClick={() => setMobileTab('recent')} className={cn('h-11 rounded-[1rem] text-sm font-black uppercase tracking-[0.22em] transition-all', mobileTab === 'recent' ? 'bg-primary text-primary-foreground' : isDark ? 'text-white/65' : 'text-slate-500')}>
          {t('filemanager.player.recentlyPlayed')}
        </button>
      </div>

      <section className={cn('flex min-h-[20rem] flex-1 flex-col rounded-[1.75rem] border p-4 shadow-xl sm:p-5', mobileTab !== 'lyrics' && 'hidden lg:flex', isDark ? 'border-white/10 bg-slate-950/45' : 'border-white/80 bg-white/80')}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', isDark ? 'bg-white/5 text-primary' : 'bg-primary/10 text-primary')}><Mic2 size={18} /></div>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em]">{t('filemanager.audio.lyrics')}</p>
              <p className={cn('text-xs', isDark ? 'text-white/40' : 'text-slate-500')}>
                {lyricsState.status === 'ready' && lyricsState.synced ? t('filemanager.audio.syncedLyrics') : t('filemanager.audio.plainLyrics')}
              </p>
            </div>
          </div>
          {lyricsState.sourcePath && <span className={cn('max-w-[10rem] truncate text-xs font-bold', isDark ? 'text-white/40' : 'text-slate-500')}>{lyricsState.sourcePath.split('/').pop()}</span>}
        </div>

        {currentLyricLine && lyricsState.synced && (
          <div className={cn('mb-4 rounded-2xl border px-4 py-3 text-sm font-bold', isDark ? 'border-sky-400/15 bg-sky-400/10 text-sky-100' : 'border-sky-200 bg-sky-50 text-sky-700')}>
            {currentLyricLine}
          </div>
        )}

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
          {lyricsState.status === 'loading' && (
            <div className={cn('flex h-full flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed text-center', isDark ? 'border-white/10 text-white/55' : 'border-slate-200 text-slate-500')}>
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm font-bold">{t('filemanager.audio.lyricsLoading')}</p>
            </div>
          )}

          {lyricsState.status === 'missing' && (
            <div className={cn('flex h-full flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed p-6 text-center', isDark ? 'border-white/10 text-white/55' : 'border-slate-200 text-slate-500')}>
              <Mic2 className="h-7 w-7 text-primary/70" />
              <p className="text-sm font-bold">{t('filemanager.audio.lyricsUnavailable')}</p>
              <p className="text-xs">{t('filemanager.audio.instrumental')}</p>
            </div>
          )}

          {lyricsState.status === 'error' && (
            <div className={cn('flex h-full flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed p-6 text-center', isDark ? 'border-red-400/20 text-red-100' : 'border-red-200 text-red-700')}>
              <Mic2 className="h-7 w-7" />
              <p className="text-sm font-bold">{t('filemanager.audio.lyricsFailed')}</p>
            </div>
          )}

          {lyricsState.status === 'ready' && (
            <div className="space-y-1 py-2">
              {lyricsState.lines.map((line, index) => {
                const isActive = index === activeLyricIndex;
                return (
                  <button
                    key={line.id}
                    ref={isActive ? activeLyricRef : null}
                    type="button"
                    disabled={line.time === null}
                    onClick={() => line.time !== null && onLyricSeek(line.time)}
                    className={cn('w-full rounded-2xl px-4 py-3 text-left transition-all', line.time === null && 'cursor-default', isActive ? (isDark ? 'bg-sky-400/15 text-white shadow-[0_14px_40px_rgba(14,165,233,0.18)]' : 'bg-sky-50 text-sky-700 shadow-[0_14px_40px_rgba(14,165,233,0.12)]') : (isDark ? 'text-white/65 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'))}
                  >
                    <span className={cn('block text-sm leading-7 md:text-base', isActive && 'font-black')}>{line.text}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className={cn('flex min-h-[16rem] max-h-[26rem] flex-col rounded-[1.75rem] border p-4 shadow-xl sm:p-5 lg:min-h-0 lg:max-h-[42%]', mobileTab !== 'playlist' && 'hidden lg:flex', isDark ? 'border-white/10 bg-slate-950/45' : 'border-white/80 bg-white/80')}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', isDark ? 'bg-white/5 text-primary' : 'bg-primary/10 text-primary')}><ListMusic size={18} /></div>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em]">{t('filemanager.player.playlist')}</p>
              <p className={cn('text-xs', isDark ? 'text-white/40' : 'text-slate-500')}>{t('filemanager.player.queue', { count: playlist.length })}</p>
            </div>
          </div>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {playlist.map((track, index) => {
            const isActive = index === currentIndex;
            return (
              <button
                key={track.path}
                type="button"
                onClick={() => onTrackSelect(index)}
                className={cn('flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all', isActive ? (isDark ? 'border-sky-400/20 bg-sky-400/10 text-white' : 'border-sky-200 bg-sky-50 text-sky-700') : (isDark ? 'border-transparent bg-white/[0.03] text-white/70 hover:border-white/10 hover:bg-white/[0.06]' : 'border-transparent bg-slate-100/75 text-slate-600 hover:border-slate-200 hover:bg-white'))}
              >
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black', isActive ? 'bg-primary text-primary-foreground' : isDark ? 'bg-white/5 text-white/55' : 'bg-white text-slate-500')}>
                  {isActive && isPlaying ? <Pause size={16} /> : index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{track.name}</p>
                  <p className={cn('mt-1 text-xs', isActive ? (isDark ? 'text-sky-100/70' : 'text-sky-700/70') : isDark ? 'text-white/35' : 'text-slate-400')}>{getBaseName(track.name)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className={cn('flex min-h-[14rem] max-h-[24rem] flex-col rounded-[1.75rem] border p-4 shadow-xl sm:p-5 lg:min-h-0 lg:max-h-[30%]', mobileTab !== 'recent' && 'hidden lg:flex', isDark ? 'border-white/10 bg-slate-950/45' : 'border-white/80 bg-white/80')}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.28em]">{t('filemanager.player.recentlyPlayed')}</p>
            <p className={cn('text-xs', isDark ? 'text-white/40' : 'text-slate-500')}>{recentRecords.length > 0 ? t('filemanager.player.queue', { count: recentRecords.length }) : t('filemanager.player.historyEmpty')}</p>
          </div>
          {recentRecords.length > 0 && (
            <button
              type="button"
              onClick={onClearRecentHistory}
              className={cn('inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors', isDark ? 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900')}
              title={t('common.clear')}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {recentRecords.length === 0 && <p className={cn('px-2 py-8 text-center text-sm font-bold', isDark ? 'text-white/50' : 'text-slate-500')}>{t('filemanager.player.historyEmpty')}</p>}
          {recentRecords.map((record) => (
            <div key={record.path} className={cn('rounded-2xl border px-3 py-3', isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/80')}>
              <div className="flex items-start gap-3">
                <button type="button" onClick={() => onOpenRecentRecord(record.path)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-bold">{record.title || record.name}</p>
                  <p className={cn('mt-1 truncate text-xs', isDark ? 'text-white/40' : 'text-slate-500')}>{record.subtitle || record.name}</p>
                  <div className={cn('mt-2 flex items-center justify-between text-xs font-mono', isDark ? 'text-white/35' : 'text-slate-400')}>
                    <span>{`${t('filemanager.player.resumeFrom')} ${formatTime(record.completed ? 0 : record.position)}`}</span>
                    <span>{record.progressPercent}%</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveRecentRecord(record.path)}
                  className={cn('mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors', isDark ? 'text-white/45 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700')}
                  title={t('common.delete')}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
};
