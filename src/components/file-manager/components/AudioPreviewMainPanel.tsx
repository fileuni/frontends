import { Disc3, Loader2, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { cn } from '@/lib/utils.ts';
import { PLAYBACK_SPEEDS, type LyricsState } from './audioPreviewShared.ts';

interface AudioPreviewMainPanelProps {
  bufferedPercent: number;
  coverUrl?: string;
  currentExtension: string;
  currentIndex: number;
  currentTime: number;
  duration: number;
  isDark?: boolean;
  isMuted: boolean;
  isPlaying: boolean;
  isTrackLoading: boolean;
  loadError: string | null;
  lyricsState: LyricsState;
  onNext: () => void;
  onPlayPause: () => void;
  onPrev: () => void;
  onReload: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (value: number) => void;
  onMuteToggle: () => void;
  onPlaybackRateChange: (value: number) => void;
  playedPercent: number;
  playModeLabel: string;
  playbackRate: number;
  playlistLength: number;
  progressLabel: string;
  progressValue: number;
  t: (key: string) => string;
  timeLabel: (value: number) => string;
  trackAlbum?: string;
  trackArtist: string;
  trackTitle: string;
  volume: number;
}

export const AudioPreviewMainPanel = ({
  bufferedPercent,
  coverUrl,
  currentExtension,
  currentIndex,
  currentTime,
  duration,
  isDark,
  isMuted,
  isPlaying,
  isTrackLoading,
  loadError,
  lyricsState,
  onNext,
  onPlayPause,
  onPrev,
  onReload,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onPlaybackRateChange,
  playedPercent,
  playModeLabel,
  playbackRate,
  playlistLength,
  progressLabel,
  progressValue,
  t,
  timeLabel,
  trackAlbum,
  trackArtist,
  trackTitle,
  volume,
}: AudioPreviewMainPanelProps) => {
  const rateText = playbackRate.toFixed(playbackRate % 1 === 0 ? 0 : 2);

  return (
    <section className={cn('min-h-0 rounded-[2rem] border p-5 shadow-2xl sm:p-8', isDark ? 'border-white/10 bg-white/5 backdrop-blur-xl' : 'border-white/70 bg-white/70 backdrop-blur-xl')}>
      <div className="flex h-full flex-col gap-6 lg:gap-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-center xl:gap-10">
          <div className="relative mx-auto flex shrink-0 items-center justify-center xl:mx-0">
            <div className={cn('absolute inset-0 rounded-[2.5rem] blur-3xl', isDark ? 'bg-sky-400/20' : 'bg-sky-300/40')} />
            <div className={cn('relative h-56 w-56 overflow-hidden rounded-[2.25rem] border shadow-[0_30px_80px_rgba(15,23,42,0.35)] md:h-72 md:w-72', isDark ? 'border-white/10 bg-[radial-gradient(circle_at_30%_30%,_rgba(125,211,252,0.24),_transparent_38%),linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(15,118,110,0.65)_100%)]' : 'border-white/80 bg-[radial-gradient(circle_at_30%_30%,_rgba(255,255,255,0.95),_rgba(186,230,253,0.85)_38%,_rgba(14,165,233,0.26)_100%)]')}>
              {coverUrl ? (
                <img src={coverUrl} alt={trackTitle} className={cn('h-full w-full object-cover transition-transform duration-700', isPlaying ? 'scale-[1.04]' : 'scale-100')} />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <div className={cn('absolute inset-[12%] rounded-full border', isDark ? 'border-white/10 bg-slate-950/70' : 'border-white/70 bg-white/75')} />
                  <div className={cn('absolute inset-[31%] rounded-full border backdrop-blur-md', isDark ? 'border-white/10 bg-white/10' : 'border-white/80 bg-white/80')} />
                  <div className={cn('relative z-10 flex h-24 w-24 items-center justify-center rounded-full border text-primary md:h-28 md:w-28', isDark ? 'border-white/10 bg-slate-950/80' : 'border-white/80 bg-white/90')}>
                    <Disc3 className={cn('h-10 w-10 md:h-12 md:w-12', isPlaying ? 'animate-[spin_7s_linear_infinite]' : '')} />
                  </div>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/75 to-transparent" />
              <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-end gap-1.5">
                {[0, 1, 2, 3, 4].map((bar) => (
                  <span key={bar} className={cn('block w-1.5 rounded-full bg-white/90 transition-all', isPlaying ? 'animate-[music-bar_1.2s_ease-in-out_infinite]' : 'h-4 opacity-50')} style={{ height: isPlaying ? `${22 + ((bar * 7) % 20)}px` : '16px', animationDelay: `${bar * 0.15}s` }} />
                ))}
              </div>
              {isTrackLoading && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/30 backdrop-blur-[2px]"><Loader2 className="h-10 w-10 animate-spin text-white" /></div>}
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-5 text-center xl:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 xl:justify-start">
              <span className={cn('inline-flex h-9 items-center rounded-full border px-4 text-xs font-black uppercase tracking-[0.28em]', isDark ? 'border-sky-400/20 bg-sky-400/10 text-sky-200' : 'border-sky-200 bg-sky-50 text-sky-700')}>{currentExtension}</span>
              <span className={cn('inline-flex h-9 items-center rounded-full border px-4 text-xs font-black uppercase tracking-[0.28em]', isDark ? 'border-white/10 bg-white/5 text-white/70' : 'border-slate-200 bg-slate-100 text-slate-500')}>{lyricsState.synced ? t('filemanager.audio.syncedLyrics') : t('filemanager.audio.highFidelity')}</span>
              {isTrackLoading && <span className={cn('inline-flex h-9 items-center rounded-full border px-4 text-xs font-black uppercase tracking-[0.28em]', isDark ? 'border-amber-400/20 bg-amber-400/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700')}>{t('filemanager.audio.buffering')}</span>}
            </div>

            <div className="space-y-3">
              <h1 className="line-clamp-2 break-all text-3xl font-black tracking-tight md:text-5xl">{trackTitle}</h1>
              <p className={cn('text-base md:text-lg', isDark ? 'text-white/70' : 'text-slate-600')}>{trackArtist}</p>
              {trackAlbum && <p className={cn('text-sm font-medium', isDark ? 'text-white/45' : 'text-slate-500')}>{trackAlbum}</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className={cn('rounded-2xl border p-4 text-left', isDark ? 'border-white/10 bg-slate-950/40' : 'border-white/80 bg-white/75')}>
                <p className={cn('text-xs font-black uppercase tracking-[0.28em]', isDark ? 'text-white/40' : 'text-slate-400')}>{t('filemanager.player.nowPlaying')}</p>
                <p className="mt-3 text-xl font-black">{currentIndex + 1} / {playlistLength}</p>
              </div>
              <div className={cn('rounded-2xl border p-4 text-left', isDark ? 'border-white/10 bg-slate-950/40' : 'border-white/80 bg-white/75')}>
                <p className={cn('text-xs font-black uppercase tracking-[0.28em]', isDark ? 'text-white/40' : 'text-slate-400')}>{t('filemanager.audio.speed')}</p>
                <p className="mt-3 text-xl font-black">{rateText}x</p>
              </div>
              <div className={cn('rounded-2xl border p-4 text-left', isDark ? 'border-white/10 bg-slate-950/40' : 'border-white/80 bg-white/75')}>
                <p className={cn('text-xs font-black uppercase tracking-[0.28em]', isDark ? 'text-white/40' : 'text-slate-400')}>{playModeLabel}</p>
                <p className="mt-3 text-xl font-black">{timeLabel(duration)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative h-3 overflow-hidden rounded-full bg-black/10">
            <div className={cn('absolute inset-y-0 left-0 rounded-full', isDark ? 'bg-white/10' : 'bg-slate-300/70')} style={{ width: `${bufferedPercent}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,_rgba(56,189,248,0.95)_0%,_rgba(34,197,94,0.9)_100%)]" style={{ width: `${playedPercent}%` }} />
            <input type="range" min={0} max={duration || 0} step={0.1} value={progressValue} onChange={(event) => onSeek(Number(event.target.value))} className="music-range absolute inset-0 h-full w-full cursor-pointer" aria-label={progressLabel} />
          </div>
          <div className={cn('flex items-center justify-between text-sm font-mono', isDark ? 'text-white/55' : 'text-slate-500')}>
            <span>{timeLabel(currentTime)}</span>
            <span>{timeLabel(duration)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 xl:justify-start">
          <Button variant="ghost" size="sm" className={cn('h-12 rounded-full border px-4', isDark ? 'border-white/10 bg-white/5 text-white hover:bg-white/10' : 'border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-100')} onClick={onPrev} title={t('filemanager.player.previous')}><SkipBack size={18} /></Button>
          <Button size="lg" className="h-14 rounded-full px-8" onClick={onPlayPause} title={isPlaying ? t('filemanager.player.pause') : t('filemanager.player.play')}>{isPlaying ? <Pause size={22} /> : <Play size={22} className="fill-current" />}</Button>
          <Button variant="ghost" size="sm" className={cn('h-12 rounded-full border px-4', isDark ? 'border-white/10 bg-white/5 text-white hover:bg-white/10' : 'border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-100')} onClick={onNext} title={t('filemanager.player.next')}><SkipForward size={18} /></Button>

          <div className={cn('flex min-h-12 items-center gap-3 rounded-full border px-4 py-2', isDark ? 'border-white/10 bg-white/5 text-white' : 'border-slate-200 bg-white/80 text-slate-700')}>
            <button type="button" onClick={onMuteToggle} className="shrink-0 text-primary transition-transform hover:scale-110" title={isMuted ? t('filemanager.player.unmute') : t('filemanager.player.mute')}>
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input type="range" min={0} max={1} step={0.01} value={isMuted ? 0 : volume} onChange={(event) => onVolumeChange(Number(event.target.value))} className="music-range h-3 w-28 cursor-pointer sm:w-36" aria-label={t('filemanager.audio.volume')} />
          </div>

          <label className={cn('flex min-h-12 items-center gap-3 rounded-full border px-4 py-2 text-sm font-bold', isDark ? 'border-white/10 bg-white/5 text-white' : 'border-slate-200 bg-white/80 text-slate-700')}>
            <span className={cn('text-xs font-black uppercase tracking-[0.24em]', isDark ? 'text-white/45' : 'text-slate-400')}>{t('filemanager.audio.speed')}</span>
            <select value={playbackRate} onChange={(event) => onPlaybackRateChange(Number(event.target.value))} className={cn('bg-transparent outline-none', isDark ? 'text-white' : 'text-slate-700')}>
              {PLAYBACK_SPEEDS.map((speed) => <option key={speed} value={speed}>{speed}x</option>)}
            </select>
          </label>
        </div>

        {loadError && (
          <div className={cn('flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-4', isDark ? 'border-red-400/20 bg-red-400/10 text-red-100' : 'border-red-200 bg-red-50 text-red-700')}>
            <p className="text-sm font-bold">{loadError}</p>
            <Button variant="outline" size="sm" className="h-10 rounded-full px-4" onClick={onReload}>{t('common.retry')}</Button>
          </div>
        )}
      </div>
    </section>
  );
};
