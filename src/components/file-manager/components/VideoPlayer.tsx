import React, { useCallback, useEffect, useRef, useState } from 'react';
import Player from 'xgplayer';
import FlvPlugin from 'xgplayer-flv';
import 'xgplayer/dist/index.min.css';
import type { FileInfo } from '../types/index.ts';
import { BASE_URL } from '@/lib/api.ts';
import { getFileDownloadToken } from '@/lib/fileTokens.ts';
import { clearMediaPlaybackRecords, removeMediaPlaybackRecord, resolveMediaResumePosition, upsertMediaPlaybackRecord, useMediaPlaybackHistory } from '@/lib/mediaPlaybackHistory.ts';
import { storageHub } from '@/lib/storageHub.ts';
import {
  Trash2,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  ListOrdered,
  Subtitles,
  Play,
  Pause,
  Maximize2,
  Video,
  History,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button.tsx';
import { cn } from '@/lib/utils.ts';
import { FilePreviewHeader } from './FilePreviewHeader.tsx';
import { formatTime, PLAYBACK_SPEEDS } from './audioPreviewShared.ts';

type PlayMode = 'list' | 'loop' | 'shuffle' | 'single';
type SidebarTab = 'playlist' | 'recent';

const VIDEO_PLAYER_PREFS_KEY = 'fileuni-video-player-ui-v1';

interface VideoPlayerPrefs {
  volume: number;
  playbackRate: number;
  pipPreferred: boolean;
}

const readVideoPlayerPrefs = (): VideoPlayerPrefs => {
  const fallback: VideoPlayerPrefs = { volume: 1, playbackRate: 1, pipPreferred: false };
  const raw = storageHub.getLocalItem(VIDEO_PLAYER_PREFS_KEY);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<VideoPlayerPrefs>;
    return {
      volume: typeof parsed.volume === 'number' ? Math.min(Math.max(parsed.volume, 0), 1) : fallback.volume,
      playbackRate: typeof parsed.playbackRate === 'number' ? parsed.playbackRate : fallback.playbackRate,
      pipPreferred: parsed.pipPreferred === true,
    };
  } catch {
    return fallback;
  }
};

const writeVideoPlayerPrefs = (prefs: VideoPlayerPrefs) => {
  storageHub.setLocalItem(VIDEO_PLAYER_PREFS_KEY, JSON.stringify(prefs));
};

const PLAY_MODE_CONFIG: Record<PlayMode, { icon: React.ElementType; labelKey: string; next: PlayMode }> = {
  list: { icon: ListOrdered, labelKey: 'filemanager.player.playMode.list', next: 'loop' },
  loop: { icon: Repeat, labelKey: 'filemanager.player.playMode.loop', next: 'shuffle' },
  shuffle: { icon: Shuffle, labelKey: 'filemanager.player.playMode.shuffle', next: 'single' },
  single: { icon: Repeat1, labelKey: 'filemanager.player.playMode.single', next: 'list' },
};

interface Props {
  playlist: FileInfo[];
  initialIndex?: number;
  headerExtra?: React.ReactNode;
  onClose?: () => void;
}

interface SubtitleInfo {
  file: FileInfo;
  url: string;
  isActive: boolean;
}

type SubtitleCapablePlayer = Player & {
  attachSubtitle?: (options: { url: string; type: 'vtt' | 'srt' | 'ass' }) => void;
  removeSubtitle?: () => void;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  seek?: (time: number) => void;
};

const getRandomIndex = (length: number, currentIndex: number) => {
  if (length <= 1) return currentIndex;
  let nextIndex = currentIndex;
  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * length);
  }
  return nextIndex;
};

export const VideoPlayer = ({ playlist, initialIndex = 0, headerExtra, onClose }: Props) => {
  const { t } = useTranslation();
  const initialPrefsRef = useRef(readVideoPlayerPrefs());
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [playMode, setPlayMode] = useState<PlayMode>('list');
  const [showSubtitlePanel, setShowSubtitlePanel] = useState(false);
  const [availableSubtitles, setAvailableSubtitles] = useState<SubtitleInfo[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<SubtitleInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(initialPrefsRef.current.volume);
  const [playbackRate, setPlaybackRate] = useState(initialPrefsRef.current.playbackRate);
  const [pipPreferred, setPipPreferred] = useState(initialPrefsRef.current.pipPreferred);
  const [isPipActive, setIsPipActive] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('playlist');

  const activeFile = playlist[currentIndex];
  const isFlv = activeFile?.name.toLowerCase().endsWith('.flv');
  const PlayModeIcon = PLAY_MODE_CONFIG[playMode].icon;
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<SubtitleCapablePlayer | null>(null);
  const restoredPathRef = useRef<string | null>(null);
  const lastPersistedSecondRef = useRef(-1);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const playModeRef = useRef<PlayMode>('list');
  const currentIndexRef = useRef(initialIndex);
  const lastVolumeRef = useRef(initialPrefsRef.current.volume > 0 ? initialPrefsRef.current.volume : 1);
  const recentVideos = useMediaPlaybackHistory('video').filter((record) => record.path !== activeFile?.path).slice(0, 6);

  const playedPercent = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  const persistVideoRecord = useCallback((completed = false) => {
    if (!activeFile) return;
    upsertMediaPlaybackRecord({
      path: activeFile.path,
      name: activeFile.name,
      kind: 'video',
      title: activeFile.name,
      position: completed ? 0 : currentTime,
      duration,
      completed,
    });
  }, [activeFile, currentTime, duration]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    playModeRef.current = playMode;
  }, [playMode]);

  useEffect(() => {
    writeVideoPlayerPrefs({ volume, playbackRate, pipPreferred });
  }, [pipPreferred, playbackRate, volume]);

  const getVideoElement = useCallback(() => playerContainerRef.current?.querySelector('video') as HTMLVideoElement | null, []);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const playNext = useCallback(() => {
    if (playMode === 'shuffle') {
      setCurrentIndex(getRandomIndex(playlist.length, currentIndex));
      return;
    }
    setCurrentIndex((prev) => (prev + 1) % playlist.length);
  }, [currentIndex, playMode, playlist.length]);

  const playPrev = useCallback(() => {
    const player = playerRef.current;
    if (player && player.currentTime > 5) {
      player.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    if (playMode === 'shuffle') {
      setCurrentIndex(getRandomIndex(playlist.length, currentIndex));
      return;
    }
    setCurrentIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
  }, [currentIndex, playMode, playlist.length]);

  const seekTo = useCallback((time: number) => {
    const player = playerRef.current;
    if (!player) return;
    player.currentTime = time;
    player.seek?.(time);
    setCurrentTime(time);
  }, []);

  const playVideo = useCallback(() => {
    playerRef.current?.play();
  }, []);

  const pauseVideo = useCallback(() => {
    playerRef.current?.pause();
  }, []);

  const changeVolume = useCallback((nextVolume: number) => {
    const normalized = Math.min(Math.max(nextVolume, 0), 1);
    if (normalized > 0) {
      lastVolumeRef.current = normalized;
    }
    setVolume(normalized);
    if (playerRef.current) {
      playerRef.current.volume = normalized;
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (volume <= 0) {
      changeVolume(lastVolumeRef.current > 0 ? lastVolumeRef.current : 1);
      return;
    }
    changeVolume(0);
  }, [changeVolume, volume]);

  const changePlaybackRate = useCallback((nextRate: number) => {
    setPlaybackRate(nextRate);
    if (playerRef.current) {
      playerRef.current.playbackRate = nextRate;
    }
  }, []);

  const togglePictureInPicture = useCallback(async () => {
    if (typeof document === 'undefined' || !('pictureInPictureEnabled' in document)) return;
    const video = getVideoElement();
    if (!video || !document.pictureInPictureEnabled) return;

    try {
      if (document.pictureInPictureElement === video) {
        setPipPreferred(false);
        await document.exitPictureInPicture();
        setIsPipActive(false);
        return;
      }
      setPipPreferred(true);
      await video.requestPictureInPicture();
      setIsPipActive(true);
    } catch {
      // Ignore unsupported PiP transitions.
    }
  }, [getVideoElement]);

  const loadSubtitles = useCallback(async () => {
    if (!activeFile) return;
    const baseName = activeFile.name.replace(/\.[^.]+$/, '');
    const subtitleFiles = playlist.filter((file) => {
      const fBase = file.name.replace(/\.[^.]+$/, '');
      const fExt = file.name.split('.').pop()?.toLowerCase();
      return fBase.toLowerCase() === baseName.toLowerCase() && ['vtt', 'srt', 'ass'].includes(fExt || '');
    });

    const subtitles: SubtitleInfo[] = [];
    for (const file of subtitleFiles) {
      try {
        const token = await getFileDownloadToken(file.path);
        subtitles.push({
          file,
          url: `${BASE_URL}/api/v1/file/get-content?file_download_token=${encodeURIComponent(token)}&inline=true`,
          isActive: false,
        });
      } catch {
        // Ignore subtitle failures.
      }
    }
    setAvailableSubtitles(subtitles);
  }, [activeFile, playlist]);

  useEffect(() => {
    if (!playerContainerRef.current || !activeFile) return undefined;
    let mounted = true;
    restoredPathRef.current = null;
    lastPersistedSecondRef.current = -1;

    const init = async () => {
      playerRef.current?.destroy();
      const token = await getFileDownloadToken(activeFile.path);
      if (!mounted) return;

      const player = new Player({
        el: playerContainerRef.current!,
        url: `${BASE_URL}/api/v1/file/get-content?file_download_token=${encodeURIComponent(token)}&inline=true`,
        width: '100%',
        height: '100%',
        autoplay: true,
        controls: false,
        ignores: ['play', 'progress', 'time', 'volume', 'fullscreen', 'pip', 'playbackrate', 'definition', 'start', 'error', 'loading', 'poster', 'replay', 'mobile'],
        plugins: isFlv ? [FlvPlugin] : [],
      }) as SubtitleCapablePlayer;

      player.on('ended', () => {
        upsertMediaPlaybackRecord({
          path: activeFile.path,
          name: activeFile.name,
          kind: 'video',
          title: activeFile.name,
          position: 0,
          duration: durationRef.current,
          completed: true,
        });
        if (playModeRef.current === 'single') {
          player.currentTime = 0;
          player.play();
          return;
        }
        if (playModeRef.current === 'shuffle') {
          setCurrentIndex(getRandomIndex(playlist.length, currentIndexRef.current));
          return;
        }
        setCurrentIndex((prev) => (prev + 1) % playlist.length);
      });
      player.on('play', () => setIsPlaying(true));
      player.on('pause', () => setIsPlaying(false));
      player.on('timeupdate', () => setCurrentTime(player.currentTime));
      player.on('durationchange', () => setDuration(player.duration));
      player.on('volumechange', () => {
        setVolume(player.volume);
        if (player.volume > 0) {
          lastVolumeRef.current = player.volume;
        }
      });
      player.on('ratechange', () => setPlaybackRate(player.playbackRate));
      playerRef.current = player;
    };

    void init();
    void loadSubtitles();

    return () => {
      mounted = false;
      if (activeFile && currentTimeRef.current > 0) {
        upsertMediaPlaybackRecord({
          path: activeFile.path,
          name: activeFile.name,
          kind: 'video',
          title: activeFile.name,
          position: currentTimeRef.current,
          duration: durationRef.current,
        });
      }
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [activeFile, isFlv, loadSubtitles, playlist.length]);

  useEffect(() => {
    if (!playerRef.current) return undefined;
    playerRef.current.volume = volume;
    playerRef.current.playbackRate = playbackRate;
    return undefined;
  }, [playbackRate, volume]);

  useEffect(() => {
    const video = getVideoElement();
    if (!video) return undefined;

    const handleEnterPictureInPicture = () => setIsPipActive(true);
    const handleLeavePictureInPicture = () => setIsPipActive(false);

    video.addEventListener('enterpictureinpicture', handleEnterPictureInPicture);
    video.addEventListener('leavepictureinpicture', handleLeavePictureInPicture);
    setIsPipActive(document.pictureInPictureElement === video);

    if (pipPreferred && document.pictureInPictureEnabled && document.pictureInPictureElement !== video) {
      void video.requestPictureInPicture().catch((): void => undefined);
    }

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPictureInPicture);
      video.removeEventListener('leavepictureinpicture', handleLeavePictureInPicture);
    };
  }, [getVideoElement, pipPreferred]);

  useEffect(() => {
    if (!activeFile || duration <= 0 || restoredPathRef.current === activeFile.path) return undefined;
    const resumePosition = resolveMediaResumePosition(activeFile.path, duration);
    restoredPathRef.current = activeFile.path;
    if (resumePosition <= 0) return undefined;
    seekTo(resumePosition);
    lastPersistedSecondRef.current = Math.floor(resumePosition);
    return undefined;
  }, [activeFile, duration, seekTo]);

  useEffect(() => {
    if (!activeFile || duration <= 0 || currentTime <= 0) return undefined;
    const rounded = Math.floor(currentTime);
    if (Math.abs(rounded - lastPersistedSecondRef.current) < 5) return undefined;
    lastPersistedSecondRef.current = rounded;
    persistVideoRecord(false);
    return undefined;
  }, [activeFile, currentTime, duration, persistVideoRecord]);

  useEffect(() => {
    if (!activeFile || isPlaying || currentTime <= 0) return undefined;
    persistVideoRecord(false);
    return undefined;
  }, [activeFile, currentTime, isPlaying, persistVideoRecord]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !activeFile) return undefined;
    const mediaSession = navigator.mediaSession;

    try {
      if (typeof MediaMetadata !== 'undefined') {
        mediaSession.metadata = new MediaMetadata({
          title: activeFile.name,
          artist: 'FileUni Video',
          album: t('filemanager.player.videoEngine'),
        });
      }
      mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      if (mediaSession.setPositionState && Number.isFinite(duration) && duration > 0) {
        mediaSession.setPositionState({ duration, position: currentTime, playbackRate });
      }
      mediaSession.setActionHandler('play', playVideo);
      mediaSession.setActionHandler('pause', pauseVideo);
      mediaSession.setActionHandler('previoustrack', playPrev);
      mediaSession.setActionHandler('nexttrack', playNext);
      mediaSession.setActionHandler('seekbackward', (details: MediaSessionActionDetails) => seekTo(Math.max(0, currentTime - (details.seekOffset || 10))));
      mediaSession.setActionHandler('seekforward', (details: MediaSessionActionDetails) => seekTo(Math.min(duration || Number.MAX_SAFE_INTEGER, currentTime + (details.seekOffset || 10))));
      mediaSession.setActionHandler('seekto', (details: MediaSessionActionDetails) => {
        if (typeof details.seekTime === 'number') {
          seekTo(details.seekTime);
        }
      });
      mediaSession.setActionHandler('stop', () => {
        pauseVideo();
        seekTo(0);
      });
    } catch {
      // Ignore unsupported media session actions.
    }

    return undefined;
  }, [activeFile, currentTime, duration, isPlaying, pauseVideo, playNext, playPrev, playVideo, playbackRate, seekTo, t]);

  const handleSubtitleChange = (subtitle: SubtitleInfo) => {
    const player = playerRef.current;
    if (!player) return;
    const ext = subtitle.file.name.split('.').pop()?.toLowerCase() || '';
    player.attachSubtitle?.({ url: subtitle.url, type: ext as 'vtt' | 'srt' | 'ass' });
    setCurrentSubtitle(subtitle);
    setAvailableSubtitles((prev) => prev.map((item) => ({ ...item, isActive: item.file.path === subtitle.file.path })));
  };

  const togglePlay = () => {
    if (isPlaying) {
      pauseVideo();
      return;
    }
    playVideo();
  };

  const openRecentVideo = (path: string) => {
    const nextIndex = playlist.findIndex((file) => file.path === path);
    if (nextIndex >= 0) {
      setCurrentIndex(nextIndex);
      return;
    }
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    params.set('preview_path', path);
    window.location.hash = params.toString();
  };

  if (!activeFile) return null;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden relative">
      <FilePreviewHeader
        path={activeFile.path}
        fileName={activeFile.name}
        subtitle={t('filemanager.player.videoEngine')}
        icon={<Video size={20} />}
        onClose={onClose}
        extra={
          <div className="flex items-center gap-2">
            {headerExtra}
            <Button variant="ghost" size="sm" className="rounded-full h-10 w-10 p-0" onClick={() => setShowSubtitlePanel(!showSubtitlePanel)} title={t('filemanager.player.subtitle')}><Subtitles size={18} /></Button>
            <Button variant="ghost" size="sm" className={cn('rounded-full h-10 px-3', isPipActive && 'bg-primary/10 text-primary')} onClick={() => { void togglePictureInPicture(); }} title="PiP">PiP</Button>
            <Button variant="ghost" size="sm" className="rounded-full h-10 w-10 p-0" onClick={() => playerContainerRef.current?.requestFullscreen()} title={t('filemanager.player.fullscreen')}><Maximize2 size={18} /></Button>
          </div>
        }
      />

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden">
        <div ref={playerContainerRef} className="flex-1 relative bg-black group min-h-[14rem] lg:min-h-0">
          {!isPlaying && (
            <button type="button" onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] z-10">
              <div className="w-20 h-20 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-2xl"><Play size={32} className="text-white fill-white ml-1" /></div>
            </button>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/90 to-transparent opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-20">
            <div className="relative mb-4 h-3 overflow-hidden rounded-full bg-white/20">
              <div className="absolute inset-y-0 left-0 rounded-full bg-white/25" style={{ width: `${playedPercent}%` }} />
              <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${playedPercent}%` }} />
              <input type="range" min={0} max={duration || 0} step={0.1} value={duration > 0 ? currentTime : 0} onChange={(event) => seekTo(Number(event.target.value))} className="music-range absolute inset-0 h-full w-full cursor-pointer" aria-label={t('filemanager.player.play')} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 text-white">
              <div className="flex items-center gap-3 sm:gap-4">
                <button type="button" onClick={playPrev} className="hover:text-primary" title={t('filemanager.player.previous')}><SkipBack size={20} /></button>
                <button type="button" onClick={togglePlay} title={isPlaying ? t('filemanager.player.pause') : t('filemanager.player.play')}>{isPlaying ? <Pause size={24} /> : <Play size={24} className="fill-white" />}</button>
                <button type="button" onClick={playNext} className="hover:text-primary" title={t('filemanager.player.next')}><SkipForward size={20} /></button>
                <span className="text-sm font-mono opacity-70">{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 rounded-full bg-white/10 px-3 py-1.5">
                  <button type="button" onClick={toggleMute} title={t('filemanager.audio.volume')}>
                    {volume <= 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(event) => changeVolume(Number(event.target.value))} className="music-range h-2.5 w-24 cursor-pointer" aria-label={t('filemanager.audio.volume')} />
                </div>
                <label className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-black uppercase">
                  <span>{t('filemanager.audio.speed')}</span>
                  <select value={playbackRate} onChange={(event) => changePlaybackRate(Number(event.target.value))} className="bg-transparent text-white outline-none">
                    {PLAYBACK_SPEEDS.map((speed) => (
                      <option key={speed} value={speed} className="text-slate-900">{speed}x</option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={() => setPlayMode(PLAY_MODE_CONFIG[playMode].next)} className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-sm font-black uppercase">
                  <PlayModeIcon size={18} /> {t(PLAY_MODE_CONFIG[playMode].labelKey)}
                </button>
              </div>
            </div>
          </div>

          {showSubtitlePanel && (
            <div className="absolute top-20 right-6 w-64 bg-zinc-900/95 border border-white/10 rounded-2xl shadow-2xl p-2 z-30">
              <button type="button" onClick={() => { playerRef.current?.removeSubtitle?.(); setCurrentSubtitle(null); }} className={cn('w-full text-left px-4 py-2 rounded-xl text-sm font-bold', !currentSubtitle ? 'bg-primary text-white' : 'text-white/60 hover:bg-white/5')}>
                {t('filemanager.player.subtitlesOff')}
              </button>
              {availableSubtitles.map((subtitle) => (
                <button type="button" key={subtitle.file.path} onClick={() => handleSubtitleChange(subtitle)} className={cn('w-full text-left px-4 py-2 rounded-xl text-sm font-bold mt-1', subtitle.isActive ? 'bg-primary text-white' : 'text-white/60 hover:bg-white/5')}>
                  {subtitle.file.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-full shrink-0 border-t border-border bg-accent/5 lg:w-80 lg:border-l lg:border-t-0 flex flex-col">
          <div className="grid grid-cols-2 gap-2 p-3 border-b border-border">
            <button type="button" onClick={() => setSidebarTab('playlist')} className={cn('h-10 rounded-xl text-sm font-black uppercase tracking-[0.22em] transition-all', sidebarTab === 'playlist' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground')}>
              {t('filemanager.player.playlist')}
            </button>
            <button type="button" onClick={() => setSidebarTab('recent')} className={cn('h-10 rounded-xl text-sm font-black uppercase tracking-[0.22em] transition-all', sidebarTab === 'recent' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground')}>
              {t('filemanager.player.recentlyPlayed')}
            </button>
          </div>

          <div className="p-4 border-b border-border flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">{sidebarTab === 'playlist' ? t('filemanager.player.playlist') : t('filemanager.player.recentlyPlayed')}</h3>
              <p className="text-xs text-muted-foreground mt-1">{sidebarTab === 'playlist' ? `${currentIndex + 1} / ${playlist.length}` : recentVideos.length > 0 ? t('filemanager.player.queue', { count: recentVideos.length }) : t('filemanager.player.historyEmpty')}</p>
            </div>
            {sidebarTab === 'recent' ? (
              recentVideos.length > 0 ? (
                <Button variant="ghost" size="sm" className="h-8 rounded-full px-3" onClick={() => clearMediaPlaybackRecords('video')}>
                  {t('common.clear')}
                </Button>
              ) : <History size={16} className="text-muted-foreground" />
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar min-h-0">
            {sidebarTab === 'playlist' ? playlist.map((file, index) => (
              <button type="button" key={file.path} onClick={() => setCurrentIndex(index)} className={cn('w-full flex items-center gap-3 p-3 rounded-xl transition-all border', index === currentIndex ? 'bg-primary/10 border-primary/20' : 'hover:bg-accent border-transparent')}>
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-black', index === currentIndex ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground')}>{index + 1}</div>
                <div className="flex-1 min-w-0 text-left">
                  <p className={cn('text-sm font-bold truncate', index === currentIndex ? 'text-primary' : 'text-muted-foreground')}>{file.name}</p>
                </div>
              </button>
            )) : (
              recentVideos.length > 0 ? recentVideos.map((record) => (
                <div key={record.path} className="rounded-xl border border-border bg-background/80 p-3">
                  <div className="flex items-start gap-3">
                    <button type="button" onClick={() => openRecentVideo(record.path)} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-bold">{record.title || record.name}</p>
                      <div className="mt-2 flex items-center justify-between text-xs font-mono text-muted-foreground">
                        <span>{`${t('filemanager.player.resumeFrom')} ${formatTime(record.position)}`}</span>
                        <span>{record.progressPercent}%</span>
                      </div>
                    </button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0" onClick={() => removeMediaPlaybackRecord(record.path)} title={t('common.delete')}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              )) : <p className="py-8 text-center text-sm font-bold text-muted-foreground">{t('filemanager.player.historyEmpty')}</p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .music-range { -webkit-appearance: none; appearance: none; background: transparent; }
        .music-range::-webkit-slider-runnable-track { height: 12px; background: transparent; }
        .music-range::-moz-range-track { height: 12px; background: transparent; border: none; }
        .music-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; height: 16px; width: 16px; margin-top: -2px; border-radius: 999px; border: 2px solid rgba(255, 255, 255, 0.9); background: #0f172a; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.28); }
        .music-range::-moz-range-thumb { height: 16px; width: 16px; border-radius: 999px; border: 2px solid rgba(255, 255, 255, 0.9); background: #0f172a; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.28); }
      `}</style>
    </div>
  );
};
