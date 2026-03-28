import type React from 'react';
import type { FileInfo } from '../types/index.ts';
import { ListMusic, Loader2, Mic2, Pause } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { getBaseName, type LyricsState } from './audioPreviewShared.ts';

interface AudioPreviewSidebarProps {
  activeLyricIndex: number;
  activeLyricRef: React.RefObject<HTMLButtonElement | null>;
  currentIndex: number;
  isDark?: boolean;
  isPlaying: boolean;
  lyricsState: LyricsState;
  onLyricSeek: (time: number) => void;
  onTrackSelect: (index: number) => void;
  playlist: FileInfo[];
  t: (key: string, options?: Record<string, unknown>) => string;
}

export const AudioPreviewSidebar = ({
  activeLyricIndex,
  activeLyricRef,
  currentIndex,
  isDark,
  isPlaying,
  lyricsState,
  onLyricSeek,
  onTrackSelect,
  playlist,
  t,
}: AudioPreviewSidebarProps) => {
  return (
    <aside className="flex min-h-0 flex-col gap-4">
      <section className={cn('flex min-h-0 flex-1 flex-col rounded-[1.75rem] border p-4 shadow-xl sm:p-5', isDark ? 'border-white/10 bg-slate-950/45' : 'border-white/80 bg-white/80')}>
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

      <section className={cn('flex min-h-0 max-h-[42%] flex-col rounded-[1.75rem] border p-4 shadow-xl sm:p-5', isDark ? 'border-white/10 bg-slate-950/45' : 'border-white/80 bg-white/80')}>
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
    </aside>
  );
};
