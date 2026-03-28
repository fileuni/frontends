import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FileInfo } from '../types/index.ts';
import { BASE_URL } from '@/lib/api.ts';
import { getFileDownloadToken } from '@/lib/fileTokens.ts';
import { resolveMediaResumePosition, upsertMediaPlaybackRecord } from '@/lib/mediaPlaybackHistory.ts';
import { loadAudioMetadata, type AudioMetadata } from './audioMetadata.ts';
import {
  EMPTY_LYRICS,
  PLAY_MODE_CONFIG,
  clamp,
  findLyricFile,
  getParentPath,
  getRandomIndex,
  listFolderFiles,
  parseLrc,
  type LyricsState,
  type PlayMode,
} from './audioPreviewShared.ts';

const audioUrlCache = new Map<string, string>();
const audioUrlPromiseCache = new Map<string, Promise<string>>();
const folderCache = new Map<string, FileInfo[]>();
const folderPromiseCache = new Map<string, Promise<FileInfo[]>>();
const lyricCache = new Map<string, LyricsState>();
const lyricPromiseCache = new Map<string, Promise<LyricsState>>();
const metadataCache = new Map<string, AudioMetadata>();
const metadataPromiseCache = new Map<string, Promise<AudioMetadata>>();

export interface AudioTrackDisplay {
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  coverMimeType?: string;
}

interface UseAudioPlaybackControllerOptions {
  playlist: FileInfo[];
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  t: (key: string) => string;
}

const getAudioUrl = async (path: string) => {
  const cached = audioUrlCache.get(path);
  if (cached) return cached;

  const pending = audioUrlPromiseCache.get(path);
  if (pending) return pending;

  const promise = getFileDownloadToken(path)
    .then((token) => `${BASE_URL}/api/v1/file/get-content?file_download_token=${encodeURIComponent(token)}&inline=true`)
    .then((url) => {
      audioUrlCache.set(path, url);
      audioUrlPromiseCache.delete(path);
      return url;
    })
    .catch((error: unknown) => {
      audioUrlPromiseCache.delete(path);
      throw error;
    });

  audioUrlPromiseCache.set(path, promise);
  return promise;
};

const getFolderFiles = async (path: string) => {
  const cached = folderCache.get(path);
  if (cached) return cached;

  const pending = folderPromiseCache.get(path);
  if (pending) return pending;

  const promise = listFolderFiles(path)
    .then((files) => {
      folderCache.set(path, files);
      folderPromiseCache.delete(path);
      return files;
    })
    .catch((error: unknown) => {
      folderPromiseCache.delete(path);
      throw error;
    });

  folderPromiseCache.set(path, promise);
  return promise;
};

const getLyricsState = async (file: FileInfo) => {
  const cached = lyricCache.get(file.path);
  if (cached) return cached;

  const pending = lyricPromiseCache.get(file.path);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const folderFiles = await getFolderFiles(getParentPath(file.path));
      const lyricFile = findLyricFile(file, folderFiles);
      if (!lyricFile) {
        return { status: 'missing', lines: [] as LyricsState['lines'], synced: false } satisfies LyricsState;
      }

      const lyricUrl = await getAudioUrl(lyricFile.path);
      const response = await fetch(lyricUrl);
      if (!response.ok) {
        throw new Error(`Failed to load lyric file: ${response.status}`);
      }

      const parsed = parseLrc(await response.text());
      if (parsed.lines.length === 0) {
        return { status: 'missing', lines: [] as LyricsState['lines'], synced: false, sourcePath: lyricFile.path } satisfies LyricsState;
      }

      return { status: 'ready', sourcePath: lyricFile.path, ...parsed } satisfies LyricsState;
    } catch (error) {
      console.error('Failed to load lyrics', error);
      return { status: 'error', lines: [] as LyricsState['lines'], synced: false } satisfies LyricsState;
    }
  })().then((state) => {
    lyricCache.set(file.path, state);
    lyricPromiseCache.delete(file.path);
    return state;
  });

  lyricPromiseCache.set(file.path, promise);
  return promise;
};

const getMetadataState = async (file: FileInfo) => {
  const cached = metadataCache.get(file.path);
  if (cached) return cached;

  const pending = metadataPromiseCache.get(file.path);
  if (pending) return pending;

  const promise = loadAudioMetadata(file.path)
    .catch((error: unknown) => {
      console.error('Failed to load audio metadata', error);
      return {} satisfies AudioMetadata;
    })
    .then((metadata) => {
      metadataCache.set(file.path, metadata);
      metadataPromiseCache.delete(file.path);
      return metadata;
    });

  metadataPromiseCache.set(file.path, promise);
  return promise;
};

export const useAudioPlaybackController = ({ playlist, initialIndex = 0, onIndexChange, t }: UseAudioPlaybackControllerOptions) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastVolumeRef = useRef(0.82);
  const restoredPathRef = useRef<string | null>(null);
  const lastPersistedSecondRef = useRef(-1);

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
  const [metadata, setMetadata] = useState<AudioMetadata>({});
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
      if (audio) {
        audio.src = '';
      }
    };
  }, [ensureAudio]);

  useEffect(() => {
    setCurrentIndex(clamp(initialIndex, 0, Math.max(playlist.length - 1, 0)));
  }, [initialIndex, playlist.length]);

  useEffect(() => {
    if (playlist.length === 0) {
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex((index) => clamp(index, 0, playlist.length - 1));
  }, [playlist.length]);

  useEffect(() => {
    onIndexChange?.(currentIndex);
  }, [currentIndex, onIndexChange]);

  const activeFile = playlist[currentIndex] ?? null;
  const currentExtension = activeFile?.name.split('.').pop()?.toUpperCase() || 'AUDIO';
  const playedPercent = duration > 0 ? clamp((currentTime / duration) * 100, 0, 100) : 0;
  const bufferedPercent = duration > 0 ? clamp((bufferedTime / duration) * 100, 0, 100) : 0;
  const playModeConfig = PLAY_MODE_CONFIG[playMode];

  const display = useMemo<AudioTrackDisplay>(() => ({
    title: metadata.title || lyricsState.title || activeFile?.name || 'Audio',
    artist: metadata.artist || lyricsState.artist || t('filemanager.audio.localTrack'),
    album: metadata.album || lyricsState.album,
    coverUrl: metadata.coverUrl,
    coverMimeType: metadata.coverMimeType,
  }), [activeFile?.name, lyricsState.album, lyricsState.artist, lyricsState.title, metadata.album, metadata.artist, metadata.coverMimeType, metadata.coverUrl, metadata.title, t]);

  const activeLyricIndex = useMemo(() => {
    if (lyricsState.status !== 'ready' || !lyricsState.synced) return -1;
    for (let index = lyricsState.lines.length - 1; index >= 0; index -= 1) {
      const line = lyricsState.lines[index];
      if (line.time !== null && currentTime + 0.12 >= line.time) {
        return index;
      }
    }
    return -1;
  }, [currentTime, lyricsState]);

  const currentLyricLine = activeLyricIndex >= 0 ? lyricsState.lines[activeLyricIndex]?.text ?? null : null;

  const persistPlaybackRecord = useCallback((completed = false) => {
    if (!activeFile) return;
    upsertMediaPlaybackRecord({
      path: activeFile.path,
      name: activeFile.name,
      kind: 'audio',
      title: display.title,
      subtitle: display.artist,
      album: display.album,
      position: completed ? 0 : currentTime,
      duration,
      completed,
    });
  }, [activeFile, currentTime, display.album, display.artist, display.title, duration]);

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
    audioUrlCache.delete(activeFile.path);
    lyricCache.delete(activeFile.path);
    metadataCache.delete(activeFile.path);
    restoredPathRef.current = null;
    lastPersistedSecondRef.current = -1;
    setReloadSeed((seed) => seed + 1);
    setLoadError(null);
  }, [activeFile]);

  const playAudio = useCallback(() => {
    const audio = ensureAudio();
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch((): void => undefined);
    }
  }, [ensureAudio]);

  const pauseAudio = useCallback(() => {
    const audio = ensureAudio();
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
    }
  }, [ensureAudio]);

  const togglePlay = useCallback(() => {
    const audio = ensureAudio();
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch((): void => undefined);
      return;
    }
    audio.pause();
  }, [ensureAudio]);

  const seekTo = useCallback((time: number) => {
    const audio = ensureAudio();
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, [ensureAudio]);

  const jumpToLyric = useCallback((time: number) => {
    const audio = ensureAudio();
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
    void audio.play().catch((): void => undefined);
  }, [ensureAudio]);

  const toggleMute = useCallback(() => {
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
  }, [ensureAudio, isMuted, volume]);

  useEffect(() => {
    const audio = ensureAudio();
    if (!audio) return undefined;
    audio.volume = volume;
    audio.muted = isMuted;
    audio.playbackRate = playbackRate;
    return undefined;
  }, [ensureAudio, isMuted, playbackRate, volume]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'select' || tagName === 'textarea' || target?.isContentEditable) return;

      if (event.code === 'Space') {
        event.preventDefault();
        togglePlay();
      }
      if (event.code === 'ArrowRight') {
        event.preventDefault();
        seekTo(clamp(currentTime + 5, 0, duration || Number.MAX_SAFE_INTEGER));
      }
      if (event.code === 'ArrowLeft') {
        event.preventDefault();
        seekTo(clamp(currentTime - 5, 0, duration || Number.MAX_SAFE_INTEGER));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, seekTo, togglePlay]);

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
    const handleLoadedMetadata = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const handleDurationChange = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const handleTimeUpdate = () => setCurrentTime(Number.isFinite(audio.currentTime) ? audio.currentTime : 0);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsTrackLoading(true);
    const handleEnded = () => {
      persistPlaybackRecord(true);
      handleNext('ended');
    };
    const handleVolumeChange = () => {
      setVolume(audio.volume);
      setIsMuted(audio.muted);
      if (audio.volume > 0) {
        lastVolumeRef.current = audio.volume;
      }
    };
    const handleError = () => {
      setIsTrackLoading(false);
      setIsPlaying(false);
      setLoadError(t('filemanager.audio.playbackFailed'));
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
  }, [ensureAudio, handleNext, persistPlaybackRecord, t]);

  useEffect(() => {
    if (!activeFile) return undefined;
    let canceled = false;
    restoredPathRef.current = null;
    lastPersistedSecondRef.current = -1;

    const loadTrack = async () => {
      setIsTrackLoading(true);
      setCurrentTime(0);
      setDuration(0);
      setBufferedTime(0);
      setLoadError(null);

      if (reloadSeed > 0) {
        audioUrlCache.delete(activeFile.path);
      }

      try {
        const url = await getAudioUrl(activeFile.path);
        if (!canceled) {
          setAudioSrc(url);
        }
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
    if (!audio || !audioSrc) return undefined;
    audio.pause();
    audio.src = audioSrc;
    audio.load();
    void audio.play().catch((): void => setIsPlaying(false));
    return undefined;
  }, [audioSrc, ensureAudio]);

  useEffect(() => {
    if (!activeFile || duration <= 0) return undefined;
    if (restoredPathRef.current === activeFile.path) return undefined;
    const resumePosition = resolveMediaResumePosition(activeFile.path, duration);
    restoredPathRef.current = activeFile.path;
    if (resumePosition <= 0) return undefined;

    const audio = ensureAudio();
    if (!audio) return undefined;
    audio.currentTime = resumePosition;
    setCurrentTime(resumePosition);
    lastPersistedSecondRef.current = Math.floor(resumePosition);
    return undefined;
  }, [activeFile, duration, ensureAudio]);

  useEffect(() => {
    if (!activeFile) return undefined;
    let canceled = false;
    setLyricsState(EMPTY_LYRICS);

    const loadLyrics = async () => {
      if (reloadSeed > 0) {
        lyricCache.delete(activeFile.path);
      }
      const state = await getLyricsState(activeFile);
      if (!canceled) {
        setLyricsState(state);
      }
    };

    void loadLyrics();
    return () => {
      canceled = true;
    };
  }, [activeFile, reloadSeed]);

  useEffect(() => {
    if (!activeFile) return undefined;
    let canceled = false;
    setMetadata({});

    const loadMetadata = async () => {
      if (reloadSeed > 0) {
        metadataCache.delete(activeFile.path);
      }
      const nextMetadata = await getMetadataState(activeFile);
      if (!canceled) {
        setMetadata(nextMetadata);
      }
    };

    void loadMetadata();
    return () => {
      canceled = true;
    };
  }, [activeFile, reloadSeed]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return undefined;
    const mediaSession = navigator.mediaSession;

    try {
      if (typeof MediaMetadata !== 'undefined') {
        mediaSession.metadata = new MediaMetadata({
          title: display.title,
          artist: display.artist,
          album: display.album,
          artwork: display.coverUrl ? [{ src: display.coverUrl, type: display.coverMimeType || 'image/jpeg' }] : [],
        });
      }
      mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      if (mediaSession.setPositionState && Number.isFinite(duration) && duration > 0) {
        mediaSession.setPositionState({ duration, playbackRate, position: currentTime });
      }
      mediaSession.setActionHandler('play', playAudio);
      mediaSession.setActionHandler('pause', pauseAudio);
      mediaSession.setActionHandler('previoustrack', handlePrev);
      mediaSession.setActionHandler('nexttrack', () => handleNext('manual'));
      mediaSession.setActionHandler('seekbackward', (details: MediaSessionActionDetails) => seekTo(clamp(currentTime - (details.seekOffset || 10), 0, duration || Number.MAX_SAFE_INTEGER)));
      mediaSession.setActionHandler('seekforward', (details: MediaSessionActionDetails) => seekTo(clamp(currentTime + (details.seekOffset || 10), 0, duration || Number.MAX_SAFE_INTEGER)));
      mediaSession.setActionHandler('seekto', (details: MediaSessionActionDetails) => {
        if (typeof details.seekTime === 'number') {
          seekTo(clamp(details.seekTime, 0, duration || Number.MAX_SAFE_INTEGER));
        }
      });
      mediaSession.setActionHandler('stop', () => {
        const audio = ensureAudio();
        if (!audio) return;
        audio.pause();
        audio.currentTime = 0;
        setCurrentTime(0);
      });
    } catch {
      // No-op for unsupported actions.
    }

    return undefined;
  }, [currentTime, display.album, display.artist, display.coverMimeType, display.coverUrl, display.title, duration, ensureAudio, handleNext, handlePrev, isPlaying, pauseAudio, playAudio, playbackRate, seekTo]);

  useEffect(() => {
    if (!activeFile || duration <= 0 || currentTime <= 0) return undefined;
    const rounded = Math.floor(currentTime);
    if (Math.abs(rounded - lastPersistedSecondRef.current) < 5) return undefined;
    lastPersistedSecondRef.current = rounded;
    persistPlaybackRecord(false);
    return undefined;
  }, [activeFile, currentTime, duration, persistPlaybackRecord]);

  useEffect(() => {
    if (!activeFile || isPlaying || currentTime <= 0) return undefined;
    persistPlaybackRecord(false);
    return undefined;
  }, [activeFile, currentTime, isPlaying, persistPlaybackRecord]);

  useEffect(() => {
    return () => {
      if (activeFile && currentTime > 0) {
        upsertMediaPlaybackRecord({
          path: activeFile.path,
          name: activeFile.name,
          kind: 'audio',
          title: display.title,
          subtitle: display.artist,
          album: display.album,
          position: currentTime,
          duration,
        });
      }
    };
  }, [activeFile, currentTime, display.album, display.artist, display.title, duration]);

  return {
    activeFile,
    activeLyricIndex,
    audioRef,
    bufferedPercent,
    currentExtension,
    currentIndex,
    currentLyricLine,
    currentTime,
    display,
    duration,
    handleNext,
    handlePrev,
    isMuted,
    isPlaying,
    isTrackLoading,
    lastVolumeRef,
    loadError,
    lyricsState,
    playMode,
    playModeConfig,
    playbackRate,
    playedPercent,
    reloadCurrentTrack,
    seekTo,
    selectTrack,
    setCurrentIndex,
    setIsMuted,
    setPlaybackRate,
    setPlayMode,
    setVolume,
    jumpToLyric,
    pauseAudio,
    playAudio,
    toggleMute,
    togglePlay,
    volume,
  };
};
