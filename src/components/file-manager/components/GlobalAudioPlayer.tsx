import { useEffect, useRef, useState } from 'react';
import { useAudioStore } from '@/stores/audio.ts';
import { useThemeStore } from '@/stores/theme';
import { BASE_URL } from '@/lib/api.ts';
import { getFileDownloadToken } from '@/lib/fileTokens.ts';
import {
  ChevronDown,
  Download,
  ExternalLink,
  Music4,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { Button } from '@/components/ui/Button.tsx';
import { useTranslation } from 'react-i18next';
import { clearMediaPlaybackRecords, formatMediaPlaybackUpdatedAt, removeMediaPlaybackRecord, type MediaPlaybackKind, useMediaPlaybackHistory } from '@/lib/mediaPlaybackHistory.ts';
import { formatTime } from './audioPreviewShared.ts';
import { useAudioPlaybackController } from './useAudioPlaybackController.ts';

type PanelTab = 'lyrics' | 'playlist' | 'recent';

export const GlobalAudioPlayer = () => {
  const { t, i18n } = useTranslation();
  const { isOpen, isMinimized, currentTrack, playlist, currentIndex, close, setCurrentIndex, setMinimized } = useAudioStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const activeLyricRef = useRef<HTMLButtonElement | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>('lyrics');
  const [recentFilter, setRecentFilter] = useState<'all' | MediaPlaybackKind>('all');

  const controller = useAudioPlaybackController({
    playlist,
    initialIndex: currentIndex,
    onIndexChange: setCurrentIndex,
    t,
  });
  const recentRecords = useMediaPlaybackHistory()
    .filter((record) => record.path !== controller.activeFile?.path)
    .slice(0, 12);
  const filteredRecentRecords = recentRecords.filter((record) => recentFilter === 'all' || record.kind === recentFilter);

  useEffect(() => {
    if (controller.activeLyricIndex < 0) return;
    activeLyricRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [controller.activeLyricIndex]);

  const handleDownload = async () => {
    if (!controller.activeFile) return;
    try {
      const token = await getFileDownloadToken(controller.activeFile.path);
      const url = `${BASE_URL}/api/v1/file/get-content?file_download_token=${encodeURIComponent(token)}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = controller.display.title || controller.activeFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed', error);
    }
  };

  const handleOpenStandalone = () => {
    if (!currentTrack) return;
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    params.set('preview_path', currentTrack.path);
    window.location.hash = params.toString();
    close();
  };

  const handleOpenRecentRecord = (path: string) => {
    const nextIndex = playlist.findIndex((track) => track.path === path);
    if (nextIndex >= 0) {
      controller.selectTrack(nextIndex);
      return;
    }
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    params.set('preview_path', path);
    window.location.hash = params.toString();
    close();
  };

  if (!isOpen || !controller.activeFile) return null;

  return (
    <div className={cn('fixed z-[120] transition-all duration-300', isMinimized ? 'bottom-3 right-3 sm:bottom-6 sm:right-6' : 'inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[430px]')}>
      {isMinimized ? (
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className={cn('relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border shadow-2xl transition-transform hover:scale-[1.04]', isDark ? 'border-white/10 bg-slate-950/90' : 'border-white/80 bg-white/90', 'backdrop-blur-xl')}
          title={t('filemanager.player.nowPlaying')}
        >
          {controller.display.coverUrl ? (
            <img src={controller.display.coverUrl} alt={controller.display.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
              <Music4 size={24} />
            </div>
          )}
          <span className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
            {controller.isPlaying ? <Pause size={12} /> : <Play size={12} className="fill-current" />}
          </span>
        </button>
      ) : (
        <div className={cn('overflow-hidden rounded-[2rem] border shadow-2xl backdrop-blur-xl', isDark ? 'border-white/10 bg-slate-950/90 text-white' : 'border-black/5 bg-white/90 text-slate-900')}>
          <div className={cn('flex items-start gap-4 border-b px-4 py-4 sm:px-5', isDark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-slate-50/70')}>
            <div className={cn('relative h-16 w-16 shrink-0 overflow-hidden rounded-[1.25rem] border', isDark ? 'border-white/10 bg-white/5' : 'border-white/80 bg-slate-100')}>
              {controller.display.coverUrl ? (
                <img src={controller.display.coverUrl} alt={controller.display.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-primary">
                  <Music4 size={24} />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-black tracking-tight sm:text-base">{controller.display.title}</h4>
                  <p className={cn('truncate text-sm', isDark ? 'text-white/60' : 'text-slate-500')}>{controller.display.artist}</p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full p-0" onClick={() => { void handleDownload(); }} title={t('common.download')}>
                    <Download size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full p-0" onClick={handleOpenStandalone} title={t('filemanager.actions.preview')}>
                    <ExternalLink size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full p-0" onClick={() => setMinimized(true)} title={t('common.minimize')}>
                    <ChevronDown size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full p-0 hover:bg-destructive/10 hover:text-destructive" onClick={close} title={t('common.close')}>
                    <X size={16} />
                  </Button>
                </div>
              </div>

              <div className={cn('mt-3 rounded-2xl border px-3 py-2 text-sm font-bold', isDark ? 'border-white/10 bg-white/5 text-white/75' : 'border-slate-200 bg-white/80 text-slate-600')}>
                {controller.currentLyricLine || t('filemanager.audio.instrumental')}
              </div>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
            <div className="space-y-2">
              <div className="relative h-2.5 overflow-hidden rounded-full bg-black/10">
                <div className={cn('absolute inset-y-0 left-0 rounded-full', isDark ? 'bg-white/10' : 'bg-slate-200')} style={{ width: `${controller.bufferedPercent}%` }} />
                <div className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,_rgba(56,189,248,0.95)_0%,_rgba(34,197,94,0.9)_100%)]" style={{ width: `${controller.playedPercent}%` }} />
                <input type="range" min={0} max={controller.duration || 0} step={0.1} value={controller.duration > 0 ? controller.currentTime : 0} onChange={(event) => controller.seekTo(Number(event.target.value))} className="music-range absolute inset-0 h-full w-full cursor-pointer" aria-label={t('filemanager.player.play')} />
              </div>
              <div className={cn('flex items-center justify-between text-xs font-mono', isDark ? 'text-white/45' : 'text-slate-500')}>
                <span>{formatTime(controller.currentTime)}</span>
                <span>{formatTime(controller.duration)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className={cn('h-11 w-11 rounded-full p-0', isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200')} onClick={controller.handlePrev} title={t('filemanager.player.previous')}>
                  <SkipBack size={18} />
                </Button>
                <Button size="lg" className="h-12 rounded-full px-6" onClick={controller.togglePlay} title={controller.isPlaying ? t('filemanager.player.pause') : t('filemanager.player.play')}>
                  {controller.isPlaying ? <Pause size={20} /> : <Play size={20} className="fill-current" />}
                </Button>
                <Button variant="ghost" size="sm" className={cn('h-11 w-11 rounded-full p-0', isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200')} onClick={() => controller.handleNext('manual')} title={t('filemanager.player.next')}>
                  <SkipForward size={18} />
                </Button>
              </div>

              <div className={cn('hidden items-center gap-3 rounded-full border px-4 py-2 sm:flex', isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50')}>
                <button type="button" onClick={controller.toggleMute} className="text-primary" title={controller.isMuted ? t('filemanager.player.unmute') : t('filemanager.player.mute')}>
                  {controller.isMuted || controller.volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
                </button>
                <input type="range" min={0} max={1} step={0.01} value={controller.isMuted ? 0 : controller.volume} onChange={(event) => {
                  const nextVolume = Number(event.target.value);
                  controller.setVolume(nextVolume);
                  controller.setIsMuted(nextVolume === 0);
                  if (nextVolume > 0) controller.lastVolumeRef.current = nextVolume;
                }} className="music-range h-3 w-28 cursor-pointer" aria-label={t('filemanager.audio.volume')} />
              </div>
            </div>

            <div className={cn('grid grid-cols-3 gap-2 rounded-2xl border p-1', isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50')}>
              <button type="button" onClick={() => setPanelTab('lyrics')} className={cn('h-10 rounded-[1rem] text-sm font-black uppercase tracking-[0.22em] transition-all', panelTab === 'lyrics' ? 'bg-primary text-primary-foreground' : isDark ? 'text-white/65' : 'text-slate-500')}>
                {t('filemanager.audio.lyrics')}
              </button>
              <button type="button" onClick={() => setPanelTab('playlist')} className={cn('h-10 rounded-[1rem] text-sm font-black uppercase tracking-[0.22em] transition-all', panelTab === 'playlist' ? 'bg-primary text-primary-foreground' : isDark ? 'text-white/65' : 'text-slate-500')}>
                {t('filemanager.player.playlist')}
              </button>
              <button type="button" onClick={() => setPanelTab('recent')} className={cn('h-10 rounded-[1rem] text-sm font-black uppercase tracking-[0.22em] transition-all', panelTab === 'recent' ? 'bg-primary text-primary-foreground' : isDark ? 'text-white/65' : 'text-slate-500')}>
                {t('filemanager.player.recentlyPlayed')}
              </button>
            </div>

            <div className={cn('overflow-hidden rounded-[1.5rem] border', isDark ? 'border-white/10 bg-slate-900/70' : 'border-slate-200 bg-slate-50/80')}>
              {panelTab === 'lyrics' ? (
                <div className="custom-scrollbar max-h-52 space-y-1 overflow-y-auto p-3">
                  {controller.lyricsState.status === 'loading' && <p className={cn('px-2 py-8 text-center text-sm font-bold', isDark ? 'text-white/55' : 'text-slate-500')}>{t('filemanager.audio.lyricsLoading')}</p>}
                  {controller.lyricsState.status === 'missing' && <p className={cn('px-2 py-8 text-center text-sm font-bold', isDark ? 'text-white/55' : 'text-slate-500')}>{t('filemanager.audio.lyricsUnavailable')}</p>}
                  {controller.lyricsState.status === 'error' && <p className={cn('px-2 py-8 text-center text-sm font-bold', isDark ? 'text-red-100' : 'text-red-600')}>{t('filemanager.audio.lyricsFailed')}</p>}
                  {controller.lyricsState.status === 'ready' && controller.lyricsState.lines.map((line, index) => {
                    const isActive = index === controller.activeLyricIndex;
                    return (
                      <button
                        key={line.id}
                        ref={isActive ? activeLyricRef : null}
                        type="button"
                        disabled={line.time === null}
                        onClick={() => line.time !== null && controller.jumpToLyric(line.time)}
                        className={cn('w-full rounded-2xl px-3 py-2 text-left text-sm transition-all', isActive ? (isDark ? 'bg-sky-400/15 text-white' : 'bg-sky-50 text-sky-700') : (isDark ? 'text-white/65 hover:bg-white/5 hover:text-white' : 'text-slate-600 hover:bg-white hover:text-slate-900'))}
                      >
                        {line.text}
                      </button>
                    );
                  })}
                </div>
              ) : panelTab === 'playlist' ? (
                <div className="custom-scrollbar max-h-52 space-y-2 overflow-y-auto p-3">
                  {playlist.map((track, index) => {
                    const isActive = index === controller.currentIndex;
                    return (
                      <button
                        key={track.path}
                        type="button"
                        onClick={() => controller.selectTrack(index)}
                        className={cn('flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all', isActive ? (isDark ? 'border-sky-400/20 bg-sky-400/10 text-white' : 'border-sky-200 bg-sky-50 text-sky-700') : (isDark ? 'border-transparent bg-white/[0.03] text-white/70 hover:border-white/10 hover:bg-white/[0.06]' : 'border-transparent bg-white/70 text-slate-600 hover:border-slate-200'))}
                      >
                        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-black', isActive ? 'bg-primary text-primary-foreground' : isDark ? 'bg-white/5 text-white/55' : 'bg-slate-100 text-slate-500')}>
                          {isActive && controller.isPlaying ? <Pause size={14} /> : index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{track.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="custom-scrollbar max-h-52 space-y-2 overflow-y-auto p-3">
                  {recentRecords.length > 0 && (
                    <div className="space-y-2 pb-1">
                      <div className={cn('grid grid-cols-3 gap-2 rounded-2xl border p-1', isDark ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-white/80')}>
                        <button type="button" onClick={() => setRecentFilter('all')} className={cn('h-8 rounded-xl text-[11px] font-black uppercase tracking-[0.18em] transition-all', recentFilter === 'all' ? 'bg-primary text-primary-foreground' : isDark ? 'text-white/60' : 'text-slate-500')}>
                          {t('common.all')}
                        </button>
                        <button type="button" onClick={() => setRecentFilter('audio')} className={cn('h-8 rounded-xl text-[11px] font-black uppercase tracking-[0.18em] transition-all', recentFilter === 'audio' ? 'bg-primary text-primary-foreground' : isDark ? 'text-white/60' : 'text-slate-500')}>
                          {t('filemanager.player.filterAudio')}
                        </button>
                        <button type="button" onClick={() => setRecentFilter('video')} className={cn('h-8 rounded-xl text-[11px] font-black uppercase tracking-[0.18em] transition-all', recentFilter === 'video' ? 'bg-primary text-primary-foreground' : isDark ? 'text-white/60' : 'text-slate-500')}>
                          {t('filemanager.player.filterVideo')}
                        </button>
                      </div>
                      <div className="flex justify-end">
                      <Button variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={() => clearMediaPlaybackRecords(recentFilter === 'all' ? undefined : recentFilter)}>
                        {t('common.clear')}
                      </Button>
                      </div>
                    </div>
                  )}
                  {filteredRecentRecords.length === 0 && <p className={cn('px-2 py-8 text-center text-sm font-bold', isDark ? 'text-white/55' : 'text-slate-500')}>{t('filemanager.player.historyEmpty')}</p>}
                  {filteredRecentRecords.map((record) => (
                    <div key={record.path} className={cn('rounded-2xl border px-3 py-3', isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white/70')}>
                      <div className="flex items-start gap-3">
                        <button type="button" onClick={() => handleOpenRecentRecord(record.path)} className="min-w-0 flex-1 text-left">
                          <p className="truncate text-sm font-bold">{record.title || record.name}</p>
                          <p className={cn('mt-1 truncate text-xs', isDark ? 'text-white/40' : 'text-slate-500')}>{record.subtitle || record.name}</p>
                          <p className={cn('mt-2 text-xs', isDark ? 'text-white/35' : 'text-slate-400')}>
                            {`${t('filemanager.player.lastPlayed')} ${formatMediaPlaybackUpdatedAt(record.updatedAt, i18n.resolvedLanguage || i18n.language)}`}
                          </p>
                          <div className={cn('mt-2 flex items-center justify-between text-xs font-mono', isDark ? 'text-white/35' : 'text-slate-400')}>
                            <span>{`${t('filemanager.player.resumeFrom')} ${formatTime(record.position)}`}</span>
                            <span>{record.progressPercent}%</span>
                          </div>
                        </button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0" onClick={() => removeMediaPlaybackRecord(record.path)} title={t('common.delete')}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .music-range { -webkit-appearance: none; appearance: none; background: transparent; }
        .music-range::-webkit-slider-runnable-track { height: 12px; background: transparent; }
        .music-range::-moz-range-track { height: 12px; background: transparent; border: none; }
        .music-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; height: 15px; width: 15px; margin-top: -1px; border-radius: 999px; border: 2px solid rgba(255,255,255,0.9); background: #0f172a; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.28); }
        .music-range::-moz-range-thumb { height: 15px; width: 15px; border-radius: 999px; border: 2px solid rgba(255,255,255,0.9); background: #0f172a; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.28); }
      `}</style>
    </div>
  );
};
