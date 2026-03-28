import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FileInfo } from '../types/index.ts';
import { BASE_URL } from '@/lib/api.ts';
import { getFileDownloadToken } from '@/lib/fileTokens.ts';
import { Music4 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button.tsx';
import { cn } from '@/lib/utils.ts';
import { FilePreviewHeader } from './FilePreviewHeader.tsx';
import { AudioPreviewMainPanel } from './AudioPreviewMainPanel.tsx';
import { AudioPreviewSidebar } from './AudioPreviewSidebar.tsx';
import {
  EMPTY_LYRICS,
  PLAY_MODE_CONFIG,
  clamp,
  findLyricFile,
  formatTime,
  getRandomIndex,
  listFolderFiles,
  parseLrc,
  getParentPath,
  type LyricsState,
  type PlayMode,
} from './audioPreviewShared.ts';

interface AudioPreviewProps {
  playlist: FileInfo[];
  initialIndex?: number;
  isDark?: boolean;
  headerExtra?: React.ReactNode;
  onClose?: () => void;
}

export const AudioPreview = ({ playlist, initialIndex = 0, isDark, headerExtra, onClose }: AudioPreviewProps) => {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeLyricRef = useRef<HTMLButtonElement | null>(null);
  const folderCacheRef = useRef<Map<string, FileInfo[]>>(new Map());
  const lyricCacheRef = useRef<Map<string, LyricsState>>(new Map());
  const audioUrlCacheRef = useRef<Map<string, string>>(new Map());
  const lastVolumeRef = useRef(0.82);

  const safeInitialIndex = clamp(initialIndex, 0, Math.max(playlist.length - 1, 0));
  const [currentIndex, setCurrentIndex] = useState(safeInitialIndex);
  const [playMode, setPlayMode] = useState<PlayMode>('list');
  const [audioSrc, setAudioSrc] = useState('');
  const [isTrackLoading, setIsTrackLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [volume, setVolume] = useState(lastVolumeRef.current);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lyricsState, setLyricsState] = useState<LyricsState>(EMPTY_LYRICS);
  const [reloadSeed, setReloadSeed] = useState(0);

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    if (typeof window === 'undefined') return null;
    const audio = new window.Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;
    return audio;
  }, []);

  useEffect(() => {
    const audio = ensureAudio();
    return () => {
      audio?.pause();
    };
  }, [ensureAudio]);

  useEffect(() => {
    setCurrentIndex(clamp(initialIndex, 0, Math.max(playlist.length - 1, 0)));
  }, [initialIndex, playlist.length]);

  const activeFile = playlist[currentIndex];
  const playedPercent = duration > 0 ? clamp((currentTime / duration) * 100, 0, 100) : 0;
  const bufferedPercent = duration > 0 ? clamp((bufferedTime / duration) * 100, 0, 100) : 0;
  const currentExtension = activeFile?.name.split('.').pop()?.toUpperCase() || 'AUDIO';
  const playModeConfig = PLAY_MODE_CONFIG[playMode];

  const activeLyricIndex = useMemo(() => {
    if (lyricsState.status !== 'ready' || !lyricsState.synced) return -1;
    for (let index = lyricsState.lines.length - 1; index >= 0; index -= 1) {
      const line = lyricsState.lines[index];
      if (line.time !== null && currentTime + 0.12 >= line.time) return index;
    }
    return -1;
  }, [currentTime, lyricsState]);

  useEffect(() => {
    if (activeLyricIndex < 0) return;
    activeLyricRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeLyricIndex]);

  const selectTrack = useCallback((index: number) => {
    if (playlist.length === 0) return;
    setCurrentIndex(clamp(index, 0, playlist.length - 1));
    setReloadSeed(0);
  }, [playlist.length]);

  const handleNext = useCallback((trigger: 'manual' | 'ended' = 'manual') => {
    if (playlist.length === 0) return;
    if (playMode === 'shuffle') {
      selectTrack(getRandomIndex(playlist.length, currentIndex));
      return;
    }
    if (trigger === 'ended') {
      if (playMode === 'single') {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = 0;
        void audio.play().catch((): void => undefined);
        return;
      }
      if (currentIndex < playlist.length - 1) {
        selectTrack(currentIndex + 1);
        return;
      }
      if (playMode === 'loop') {
        selectTrack(0);
        return;
      }
      setIsPlaying(false);
      return;
    }
    selectTrack((currentIndex + 1) % playlist.length);
  }, [currentIndex, playMode, playlist.length, selectTrack]);

  const handlePrev = useCallback(() => {
    if (playlist.length === 0) return;
    const audio = audioRef.current;
    if (audio && audio.currentTime > 5) {
      audio.currentTime = 0;
      return;
    }
    if (playMode === 'shuffle') {
      selectTrack(getRandomIndex(playlist.length, currentIndex));
      return;
    }
    selectTrack((currentIndex - 1 + playlist.length) % playlist.length);
  }, [currentIndex, playMode, playlist.length, selectTrack]);

  const reloadCurrentTrack = useCallback(() => {
    if (!activeFile) return;
    audioUrlCacheRef.current.delete(activeFile.path);
    lyricCacheRef.current.delete(activeFile.path);
    setReloadSeed((seed) => seed + 1);
    setLoadError(null);
  }, [activeFile]);

  useEffect(() => {
    const audio = ensureAudio();
    if (!audio) return;
    audio.volume = volume;
    audio.muted = isMuted;
    audio.playbackRate = playbackRate;
  }, [ensureAudio, isMuted, playbackRate, volume]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'select' || tagName === 'textarea' || target?.isContentEditable) return;

      if (event.code === 'Space') {
        event.preventDefault();
        const audio = ensureAudio();
        if (!audio) return;
        if (audio.paused) {
          void audio.play().catch((): void => undefined);
        } else {
          audio.pause();
        }
      }

      if (event.code === 'ArrowRight') {
        event.preventDefault();
        const audio = ensureAudio();
        if (!audio) return;
        audio.currentTime = clamp(audio.currentTime + 5, 0, duration || Number.MAX_SAFE_INTEGER);
      }

      if (event.code === 'ArrowLeft') {
        event.preventDefault();
        const audio = ensureAudio();
        if (!audio) return;
        audio.currentTime = clamp(audio.currentTime - 5, 0, duration || Number.MAX_SAFE_INTEGER);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration, ensureAudio]);

  useEffect(() => {
    const audio = ensureAudio();
    if (!audio) return undefined;

    const updateBuffered = () => {
      if (audio.buffered.length === 0) {
        setBufferedTime(0);
        return;
      }
      setBufferedTime(audio.buffered.end(audio.buffered.length - 1));
    };

    const handleCanPlay = () => {
      setIsTrackLoading(false);
      setLoadError(null);
    };
    const handleError = () => {
      setIsTrackLoading(false);
      setIsPlaying(false);
      setLoadError(t('filemanager.audio.playbackFailed'));
    };
    const handleLoadedMetadata = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const handleDurationChange = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const handleTimeUpdate = () => setCurrentTime(Number.isFinite(audio.currentTime) ? audio.currentTime : 0);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsTrackLoading(true);
    const handleEnded = () => handleNext('ended');
    const handleVolumeChange = () => {
      setVolume(audio.volume);
      setIsMuted(audio.muted);
      if (audio.volume > 0) lastVolumeRef.current = audio.volume;
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('progress', updateBuffered);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('canplaythrough', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('volumechange', handleVolumeChange);
    audio.addEventListener('error', handleError);

    updateBuffered();
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('progress', updateBuffered);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('volumechange', handleVolumeChange);
      audio.removeEventListener('error', handleError);
    };
  }, [ensureAudio, handleNext, t]);

  useEffect(() => {
    if (!activeFile) return undefined;
    let canceled = false;

    const loadTrack = async () => {
      setIsTrackLoading(true);
      setCurrentTime(0);
      setDuration(0);
      setBufferedTime(0);
      setLoadError(null);
      if (reloadSeed > 0) audioUrlCacheRef.current.delete(activeFile.path);
      try {
        let url = audioUrlCacheRef.current.get(activeFile.path);
        if (!url) {
          const token = await getFileDownloadToken(activeFile.path);
          url = `${BASE_URL}/api/v1/file/get-content?file_download_token=${encodeURIComponent(token)}&inline=true`;
          audioUrlCacheRef.current.set(activeFile.path, url);
        }
        if (!canceled) setAudioSrc(url);
      } catch (error) {
        console.error('Failed to load audio track', error);
        if (!canceled) {
          setAudioSrc('');
          setIsTrackLoading(false);
          setIsPlaying(false);
          setLoadError(t('filemanager.audio.playbackFailed'));
        }
      }
    };

    void loadTrack();
    return () => {
      canceled = true;
    };
  }, [activeFile, reloadSeed, t]);

  useEffect(() => {
    const audio = ensureAudio();
    if (!audio || !audioSrc) return;
    audio.pause();
    audio.src = audioSrc;
    audio.load();
    void audio.play().catch(() => setIsPlaying(false));
  }, [audioSrc, ensureAudio]);

  useEffect(() => {
    if (!activeFile) return undefined;
    const cached = lyricCacheRef.current.get(activeFile.path);
    if (cached && reloadSeed === 0) {
      setLyricsState(cached);
      return undefined;
    }

    let canceled = false;
    setLyricsState(EMPTY_LYRICS);

    const loadLyrics = async () => {
      try {
        const parentPath = getParentPath(activeFile.path);
        let folderFiles = folderCacheRef.current.get(parentPath);
        if (!folderFiles) {
          folderFiles = await listFolderFiles(parentPath);
          folderCacheRef.current.set(parentPath, folderFiles);
        }
        if (canceled) return;

        const lyricFile = findLyricFile(activeFile, folderFiles);
        if (!lyricFile) {
          const state: LyricsState = { status: 'missing', lines: [], synced: false };
          lyricCacheRef.current.set(activeFile.path, state);
          setLyricsState(state);
          return;
        }

        const token = await getFileDownloadToken(lyricFile.path);
        const response = await fetch(`${BASE_URL}/api/v1/file/get-content?file_download_token=${encodeURIComponent(token)}&inline=true`);
        if (!response.ok) throw new Error(`Failed to load lyric file: ${response.status}`);
        const parsedLyrics = parseLrc(await response.text());
        if (canceled) return;

        const state: LyricsState = parsedLyrics.lines.length > 0
          ? { status: 'ready', sourcePath: lyricFile.path, ...parsedLyrics }
          : { status: 'missing', lines: [], synced: false, sourcePath: lyricFile.path };

        lyricCacheRef.current.set(activeFile.path, state);
        setLyricsState(state);
      } catch (error) {
        console.error('Failed to load lyrics', error);
        if (!canceled) {
          const state: LyricsState = { status: 'error', lines: [], synced: false };
          lyricCacheRef.current.set(activeFile.path, state);
          setLyricsState(state);
        }
      }
    };

    void loadLyrics();
    return () => {
      canceled = true;
    };
  }, [activeFile, reloadSeed]);

  if (!activeFile) return null;

  return (
    <div className={cn('h-screen flex flex-col overflow-hidden', isDark ? 'bg-[#030712] text-white' : 'bg-[#f8fafc] text-slate-900')}>
      <FilePreviewHeader
        path={activeFile.path}
        fileName={activeFile.name}
        isDark={isDark}
        subtitle={t('filemanager.player.audioEngine')}
        icon={<Music4 size={20} />}
        onClose={onClose}
        extra={
          <div className="flex items-center gap-2">
            {headerExtra}
            <span className={cn('inline-flex h-10 items-center rounded-full border px-4 text-xs font-black uppercase tracking-[0.28em]', isDark ? 'border-white/10 bg-white/5 text-white/70' : 'border-slate-200 bg-slate-100 text-slate-500')}>{currentIndex + 1} / {playlist.length}</span>
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-10 rounded-full border px-3', isDark ? 'border-white/10 bg-white/5 text-white hover:bg-white/10' : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200')}
              onClick={() => setPlayMode((mode) => (mode === 'list' ? 'loop' : mode === 'loop' ? 'shuffle' : mode === 'shuffle' ? 'single' : 'list'))}
              title={t(playModeConfig.labelKey)}
            >
              {React.createElement(playModeConfig.icon, { size: 16 })}
            </Button>
          </div>
        }
      />

      <main className={cn('flex-1 overflow-hidden', isDark ? 'bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.18),_transparent_36%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]' : 'bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.15),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)]')}>
        <div className="grid h-full min-h-0 gap-4 p-4 md:gap-6 md:p-6 lg:grid-cols-[minmax(0,1.65fr)_360px]">
          <AudioPreviewMainPanel
            activeFile={activeFile}
            bufferedPercent={bufferedPercent}
            currentExtension={currentExtension}
            currentIndex={currentIndex}
            currentTime={currentTime}
            duration={duration}
            isDark={isDark}
            isMuted={isMuted}
            isPlaying={isPlaying}
            isTrackLoading={isTrackLoading}
            loadError={loadError}
            lyricsState={lyricsState}
            onNext={() => handleNext('manual')}
            onPlayPause={() => {
              const audio = ensureAudio();
              if (!audio) return;
              if (audio.paused) {
                void audio.play().catch((): void => undefined);
              } else {
                audio.pause();
              }
            }}
            onPrev={handlePrev}
            onReload={reloadCurrentTrack}
            onSeek={(time) => {
              const audio = ensureAudio();
              if (!audio) return;
              audio.currentTime = time;
              setCurrentTime(time);
            }}
            onVolumeChange={(nextVolume) => {
              setVolume(nextVolume);
              setIsMuted(nextVolume === 0);
              if (nextVolume > 0) lastVolumeRef.current = nextVolume;
            }}
            onMuteToggle={() => {
              const audio = ensureAudio();
              if (!audio) return;
              if (isMuted || volume === 0) {
                const restoredVolume = lastVolumeRef.current > 0 ? lastVolumeRef.current : 0.82;
                setVolume(restoredVolume);
                setIsMuted(false);
                audio.volume = restoredVolume;
                audio.muted = false;
                return;
              }
              setIsMuted(true);
              audio.muted = true;
            }}
            onPlaybackRateChange={setPlaybackRate}
            playedPercent={playedPercent}
            playModeLabel={t(playModeConfig.labelKey)}
            playbackRate={playbackRate}
            playlistLength={playlist.length}
            progressLabel={t('filemanager.player.play')}
            progressValue={duration > 0 ? currentTime : 0}
            t={t}
            timeLabel={formatTime}
            volume={volume}
          />

          <AudioPreviewSidebar
            activeLyricIndex={activeLyricIndex}
            activeLyricRef={activeLyricRef}
            currentIndex={currentIndex}
            isDark={isDark}
            isPlaying={isPlaying}
            lyricsState={lyricsState}
            onLyricSeek={(time) => {
              const audio = ensureAudio();
              if (!audio) return;
              audio.currentTime = time;
              setCurrentTime(time);
              void audio.play().catch((): void => undefined);
            }}
            onTrackSelect={selectTrack}
            playlist={playlist}
            t={t}
          />
        </div>
      </main>

      <style>{`
        .music-range { -webkit-appearance: none; appearance: none; background: transparent; }
        .music-range::-webkit-slider-runnable-track { height: 12px; background: transparent; }
        .music-range::-moz-range-track { height: 12px; background: transparent; border: none; }
        .music-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; height: 16px; width: 16px; margin-top: -2px; border-radius: 999px; border: 2px solid rgba(255, 255, 255, 0.9); background: #0f172a; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.28); }
        .music-range::-moz-range-thumb { height: 16px; width: 16px; border-radius: 999px; border: 2px solid rgba(255, 255, 255, 0.9); background: #0f172a; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.28); }
        @keyframes music-bar { 0%, 100% { transform: scaleY(0.5); opacity: 0.55; } 50% { transform: scaleY(1.08); opacity: 1; } }
      `}</style>
    </div>
  );
};
