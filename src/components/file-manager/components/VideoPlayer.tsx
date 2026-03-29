import React, { useCallback, useEffect, useRef, useState } from 'react';
import Player from 'xgplayer';
import FlvPlugin from 'xgplayer-flv';
import 'xgplayer/dist/index.min.css';
import type { FileInfo } from '../types/index.ts';
import { BASE_URL } from '@/lib/api.ts';
import { getFileDownloadToken } from '@/lib/fileTokens.ts';
import { clearMediaPlaybackRecords, formatMediaPlaybackUpdatedAt, removeMediaPlaybackRecord, resolveMediaResumePosition, upsertMediaPlaybackRecord, type MediaPlaybackKind, useMediaPlaybackHistory } from '@/lib/mediaPlaybackHistory.ts';
import { getVideoPlaybackPreference, updateVideoPlaybackPreference } from './videoPlaybackPreferences.ts';
import { readVideoPlayerUiPrefs, writeVideoPlayerUiPrefs, type SubtitleStyleMode } from './videoPlayerUiPreferences.ts';
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

interface AudioTrackInfo {
  index: number;
  label: string;
  language?: string | undefined;
  enabled: boolean;
}

interface AudioTrackLike {
  enabled: boolean;
  id?: string;
  label?: string;
  language?: string;
}

interface AudioTrackListLike {
  length: number;
  [index: number]: AudioTrackLike;
}

type VideoWithOptionalTracks = HTMLVideoElement & {
  audioTracks?: AudioTrackListLike;
};

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
  const { t, i18n } = useTranslation();
  const initialPrefsRef = useRef(readVideoPlayerUiPrefs());
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [playMode, setPlayMode] = useState<PlayMode>('list');
  const [showSubtitlePanel, setShowSubtitlePanel] = useState(false);
  const [availableSubtitles, setAvailableSubtitles] = useState<SubtitleInfo[]>([]);
  const [subtitlesLoaded, setSubtitlesLoaded] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState<SubtitleInfo | null>(null);
  const [availableAudioTracks, setAvailableAudioTracks] = useState<AudioTrackInfo[]>([]);
  const [currentAudioTrackIndex, setCurrentAudioTrackIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(initialPrefsRef.current.volume);
  const [playbackRate, setPlaybackRate] = useState(initialPrefsRef.current.playbackRate);
  const [pipPreferred, setPipPreferred] = useState(initialPrefsRef.current.pipPreferred);
  const [brightness, setBrightness] = useState(initialPrefsRef.current.brightness);
  const [subtitleScale, setSubtitleScale] = useState(initialPrefsRef.current.subtitleScale);
  const [subtitleTextColor, setSubtitleTextColor] = useState(initialPrefsRef.current.subtitleTextColor);
  const [subtitleBackgroundOpacity, setSubtitleBackgroundOpacity] = useState(initialPrefsRef.current.subtitleBackgroundOpacity);
  const [subtitleBottomOffset, setSubtitleBottomOffset] = useState(initialPrefsRef.current.subtitleBottomOffset);
  const [subtitleStyleMode, setSubtitleStyleMode] = useState<SubtitleStyleMode>(initialPrefsRef.current.subtitleStyleMode);
  const [isPipActive, setIsPipActive] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('playlist');
  const [recentFilter, setRecentFilter] = useState<'all' | MediaPlaybackKind>('all');
  const [gestureHint, setGestureHint] = useState<{ kind: 'seek' | 'volume' | 'brightness'; side?: 'left' | 'right'; value: number } | null>(null);

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
  const subtitleRestorePathRef = useRef<string | null>(null);
  const audioTrackRestorePathRef = useRef<string | null>(null);
  const tapStateRef = useRef<{ left: number; right: number }>({ left: 0, right: 0 });
  const gestureTimerRef = useRef<number | null>(null);
  const touchGestureRef = useRef<{ side: 'left' | 'right' | null; startX: number; startY: number; startVolume: number; startBrightness: number; moved: boolean }>({
    side: null,
    startX: 0,
    startY: 0,
    startVolume: 1,
    startBrightness: 1,
    moved: false,
  });
  const recentRecords = useMediaPlaybackHistory().filter((record) => record.path !== activeFile?.path).slice(0, 12);
  const filteredRecentRecords = recentRecords.filter((record) => recentFilter === 'all' || record.kind === recentFilter);
  const activePath = activeFile?.path || '';
  const subtitleSyncKey = `${activePath}:${currentSubtitle?.file.path || 'none'}:${subtitlesLoaded ? '1' : '0'}`;

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
    writeVideoPlayerUiPrefs({
      volume,
      playbackRate,
      pipPreferred,
      brightness,
      subtitleScale,
      subtitleTextColor,
      subtitleBackgroundOpacity,
      subtitleBottomOffset,
      subtitleStyleMode,
    });
  }, [brightness, pipPreferred, playbackRate, subtitleBackgroundOpacity, subtitleBottomOffset, subtitleScale, subtitleStyleMode, subtitleTextColor, volume]);

  const getVideoElement = useCallback(() => playerContainerRef.current?.querySelector('video') as HTMLVideoElement | null, []);
  const getAudioTrackList = useCallback(() => (getVideoElement() as VideoWithOptionalTracks | null)?.audioTracks, [getVideoElement]);

  const syncAudioTracks = useCallback(() => {
    const trackList = getAudioTrackList();
    if (!trackList || typeof trackList.length !== 'number' || trackList.length === 0) {
      setAvailableAudioTracks([]);
      setCurrentAudioTrackIndex(null);
      return [] as AudioTrackInfo[];
    }

    const tracks = Array.from({ length: trackList.length }, (_, index) => {
      const track = trackList[index];
      return {
        index,
        label: track?.label || track?.language || `${t('filemanager.player.audioTrack')} ${index + 1}`,
        language: track?.language,
        enabled: track?.enabled === true,
      } satisfies AudioTrackInfo;
    });

    setAvailableAudioTracks(tracks);
    const activeIndex = tracks.findIndex((track) => track.enabled);
    setCurrentAudioTrackIndex(activeIndex >= 0 ? activeIndex : 0);
    return tracks;
  }, [getAudioTrackList, t]);

  const applyAudioTrackSelection = useCallback((index: number | null, persist = true) => {
    const trackList = getAudioTrackList();
    if (!trackList || typeof trackList.length !== 'number' || trackList.length === 0) return;

    for (let trackIndex = 0; trackIndex < trackList.length; trackIndex += 1) {
      const track = trackList[trackIndex];
      if (track) {
        track.enabled = index === null ? trackIndex === 0 : trackIndex === index;
      }
    }

    setCurrentAudioTrackIndex(index ?? 0);
    syncAudioTracks();
    if (persist && activeFile) {
      updateVideoPlaybackPreference(activeFile.path, { audioTrackIndex: index ?? 0 });
    }
  }, [activeFile, getAudioTrackList, syncAudioTracks]);

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

  const changeBrightness = useCallback((nextBrightness: number) => {
    setBrightness(Math.min(Math.max(nextBrightness, 0.45), 1.25));
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

  const syncSubtitlePresentation = useCallback(() => {
    const subtitleNode = playerContainerRef.current?.querySelector('xg-text-track.xg-text-track') as HTMLElement | null;
    if (!subtitleNode) return false;

    subtitleNode.classList.remove('text-track-bg', 'text-track-stroke', 'text-track-plain');
    subtitleNode.classList.add(`text-track-${subtitleStyleMode}`);
    subtitleNode.style.setProperty('--fileuni-subtitle-color', subtitleTextColor);
    subtitleNode.style.setProperty('--fileuni-subtitle-scale', String(subtitleScale));
    subtitleNode.style.setProperty('--fileuni-subtitle-bg-opacity', String(subtitleBackgroundOpacity));
    subtitleNode.style.setProperty('--fileuni-subtitle-bottom-offset', `${subtitleBottomOffset}%`);
    return true;
  }, [subtitleBackgroundOpacity, subtitleBottomOffset, subtitleScale, subtitleStyleMode, subtitleTextColor]);

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

  const handleSubtitleChange = useCallback((subtitle: SubtitleInfo, persist = true) => {
    const player = playerRef.current;
    if (!player) return;
    const ext = subtitle.file.name.split('.').pop()?.toLowerCase() || '';
    player.attachSubtitle?.({ url: subtitle.url, type: ext as 'vtt' | 'srt' | 'ass' });
    setCurrentSubtitle(subtitle);
    setAvailableSubtitles((prev) => prev.map((item) => ({ ...item, isActive: item.file.path === subtitle.file.path })));
    requestAnimationFrame(() => {
      syncSubtitlePresentation();
    });
    if (persist && activeFile) {
      updateVideoPlaybackPreference(activeFile.path, { subtitlePath: subtitle.file.path });
    }
  }, [activeFile, syncSubtitlePresentation]);

  const disableSubtitle = useCallback((persist = true) => {
    playerRef.current?.removeSubtitle?.();
    setCurrentSubtitle(null);
    setAvailableSubtitles((prev) => prev.map((item) => ({ ...item, isActive: false })));
    requestAnimationFrame(() => {
      syncSubtitlePresentation();
    });
    if (persist && activeFile) {
      updateVideoPlaybackPreference(activeFile.path, { subtitlePath: null });
    }
  }, [activeFile, syncSubtitlePresentation]);

  const loadSubtitles = useCallback(async () => {
    if (!activeFile) return;
    setSubtitlesLoaded(false);
    setCurrentSubtitle(null);
    setAvailableSubtitles([]);
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
    setSubtitlesLoaded(true);
  }, [activeFile, playlist]);

  useEffect(() => {
    if (!playerContainerRef.current || !activeFile) return undefined;
    let mounted = true;
    restoredPathRef.current = null;
    lastPersistedSecondRef.current = -1;
    subtitleRestorePathRef.current = null;
    audioTrackRestorePathRef.current = null;
    setAvailableAudioTracks([]);
    setCurrentAudioTrackIndex(null);

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
    if (!video || !activePath) return undefined;
    video.style.filter = `brightness(${brightness})`;
    return () => {
      video.style.filter = '';
    };
  }, [activePath, brightness, getVideoElement]);

  useEffect(() => {
    if (!activePath) return undefined;
    const syncKey = subtitleSyncKey;
    if (!syncKey) return undefined;
    let attempts = 0;
    let timer: number | null = null;

    const apply = () => {
      if (syncSubtitlePresentation() || attempts >= 10) return;
      attempts += 1;
      timer = window.setTimeout(apply, 160);
    };

    apply();
    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [activePath, subtitleSyncKey, syncSubtitlePresentation]);

  useEffect(() => {
    const video = getVideoElement();
    if (!video || !activeFile?.path) return undefined;

    const syncNow = () => {
      syncAudioTracks();
    };

    const timer = window.setTimeout(syncNow, 120);
    video.addEventListener('loadedmetadata', syncNow);
    video.addEventListener('loadeddata', syncNow);

    return () => {
      window.clearTimeout(timer);
      video.removeEventListener('loadedmetadata', syncNow);
      video.removeEventListener('loadeddata', syncNow);
    };
  }, [activeFile, getVideoElement, syncAudioTracks]);

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
    if (!activeFile || !subtitlesLoaded || subtitleRestorePathRef.current === activeFile.path) return undefined;

    const preference = getVideoPlaybackPreference(activeFile.path);
    if (!preference) {
      subtitleRestorePathRef.current = activeFile.path;
      return undefined;
    }

    if (preference.subtitlePath === null) {
      disableSubtitle(false);
      subtitleRestorePathRef.current = activeFile.path;
      return undefined;
    }

    if (preference.subtitlePath) {
      const matchedSubtitle = availableSubtitles.find((subtitle) => subtitle.file.path === preference.subtitlePath);
      if (matchedSubtitle) {
        handleSubtitleChange(matchedSubtitle, false);
      }
    }

    subtitleRestorePathRef.current = activeFile.path;
    return undefined;
  }, [activeFile, availableSubtitles, disableSubtitle, handleSubtitleChange, subtitlesLoaded]);

  useEffect(() => {
    if (!activeFile || availableAudioTracks.length === 0 || audioTrackRestorePathRef.current === activeFile.path) return undefined;
    const preference = getVideoPlaybackPreference(activeFile.path);
    if (typeof preference?.audioTrackIndex === 'number' && preference.audioTrackIndex >= 0 && preference.audioTrackIndex < availableAudioTracks.length) {
      applyAudioTrackSelection(preference.audioTrackIndex, false);
    }
    audioTrackRestorePathRef.current = activeFile.path;
    return undefined;
  }, [activeFile, applyAudioTrackSelection, availableAudioTracks]);

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

  const handleGestureSeek = useCallback((side: 'left' | 'right') => {
    const now = Date.now();
    const lastTapAt = tapStateRef.current[side];
    tapStateRef.current[side] = now;
    if (now - lastTapAt > 320) return;

    const delta = side === 'left' ? -10 : 10;
    seekTo(Math.max(0, Math.min(durationRef.current || Number.MAX_SAFE_INTEGER, currentTimeRef.current + delta)));
    setGestureHint({ kind: 'seek', side, value: delta });
    if (gestureTimerRef.current !== null) {
      window.clearTimeout(gestureTimerRef.current);
    }
    gestureTimerRef.current = window.setTimeout(() => setGestureHint(null), 700);
  }, [seekTo]);

  const beginTouchGesture = useCallback((side: 'left' | 'right', event: React.TouchEvent<HTMLButtonElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchGestureRef.current = {
      side,
      startX: touch.clientX,
      startY: touch.clientY,
      startVolume: volume,
      startBrightness: brightness,
      moved: false,
    };
  }, [brightness, volume]);

  const moveTouchGesture = useCallback((event: React.TouchEvent<HTMLButtonElement>) => {
    const gesture = touchGestureRef.current;
    const touch = event.touches[0];
    if (!gesture.side || !touch) return;

    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;
    if (Math.abs(deltaY) < 12 || Math.abs(deltaY) < Math.abs(deltaX)) return;

    event.preventDefault();
    gesture.moved = true;

    if (gesture.side === 'left') {
      const nextBrightness = Math.min(Math.max(gesture.startBrightness - deltaY / 240, 0.45), 1.25);
      changeBrightness(nextBrightness);
      setGestureHint({ kind: 'brightness', side: 'left', value: nextBrightness });
      return;
    }

    const nextVolume = Math.min(Math.max(gesture.startVolume - deltaY / 240, 0), 1);
    changeVolume(nextVolume);
    setGestureHint({ kind: 'volume', side: 'right', value: nextVolume });
  }, [changeBrightness, changeVolume]);

  const endTouchGesture = useCallback((side: 'left' | 'right') => {
    const gesture = touchGestureRef.current;
    const moved = gesture.moved;
    touchGestureRef.current = {
      side: null,
      startX: 0,
      startY: 0,
      startVolume: volume,
      startBrightness: brightness,
      moved: false,
    };

    if (gestureTimerRef.current !== null) {
      window.clearTimeout(gestureTimerRef.current);
    }

    gestureTimerRef.current = window.setTimeout(() => setGestureHint(null), 700);
    if (moved) return;
    handleGestureSeek(side);
  }, [brightness, handleGestureSeek, volume]);

  useEffect(() => {
    return () => {
      if (gestureTimerRef.current !== null) {
        window.clearTimeout(gestureTimerRef.current);
      }
    };
  }, []);

  if (!activeFile) return null;

  return (
    <div className="video-player-shell h-screen flex flex-col bg-background overflow-hidden relative">
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

          <button
            type="button"
            onTouchStart={(event) => beginTouchGesture('left', event)}
            onTouchMove={moveTouchGesture}
            onTouchEnd={() => endTouchGesture('left')}
            className="absolute inset-y-0 left-0 z-[5] w-1/2 lg:hidden"
            aria-label="Seek backward"
          />
          <button
            type="button"
            onTouchStart={(event) => beginTouchGesture('right', event)}
            onTouchMove={moveTouchGesture}
            onTouchEnd={() => endTouchGesture('right')}
            className="absolute inset-y-0 right-0 z-[5] w-1/2 lg:hidden"
            aria-label="Seek forward"
          />

          {gestureHint && (
            <div className={cn('pointer-events-none absolute top-1/2 z-[12] -translate-y-1/2 rounded-full bg-black/55 px-4 py-2 text-sm font-black text-white shadow-2xl lg:hidden', gestureHint.side === 'left' ? 'left-6' : 'right-6')}>
              {gestureHint.kind === 'seek'
                ? (gestureHint.value > 0 ? `+${gestureHint.value}s` : `${gestureHint.value}s`)
                : gestureHint.kind === 'volume'
                  ? `${t('filemanager.audio.volume')} ${Math.round(gestureHint.value * 100)}%`
                  : `${t('filemanager.player.brightness')} ${Math.round(gestureHint.value * 100)}%`}
            </div>
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
            <div className="absolute top-20 right-6 w-72 bg-zinc-900/95 border border-white/10 rounded-2xl shadow-2xl p-2 z-30">
              <div className="px-2 pt-2 pb-1">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-white/40">{t('filemanager.player.subtitle')}</p>
              </div>
              <button type="button" onClick={() => disableSubtitle()} className={cn('w-full text-left px-4 py-2 rounded-xl text-sm font-bold', !currentSubtitle ? 'bg-primary text-white' : 'text-white/60 hover:bg-white/5')}>
                {t('filemanager.player.subtitlesOff')}
              </button>
              {availableSubtitles.map((subtitle) => (
                <button type="button" key={subtitle.file.path} onClick={() => handleSubtitleChange(subtitle)} className={cn('w-full text-left px-4 py-2 rounded-xl text-sm font-bold mt-1', subtitle.isActive ? 'bg-primary text-white' : 'text-white/60 hover:bg-white/5')}>
                  {subtitle.file.name}
                </button>
              ))}

              <div className="mt-3 border-t border-white/10 px-2 pt-3 pb-1">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-white/40">{t('filemanager.player.subtitleStyle')}</p>
              </div>
              <div className="space-y-3 px-2 pb-1">
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/5 p-1">
                  {(['bg', 'stroke', 'plain'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSubtitleStyleMode(mode)}
                      className={cn('h-9 rounded-lg text-[11px] font-black uppercase tracking-[0.16em] transition-all', subtitleStyleMode === mode ? 'bg-primary text-white' : 'text-white/60 hover:bg-white/5')}
                    >
                      {t(`filemanager.player.subtitleStyle${mode.charAt(0).toUpperCase()}${mode.slice(1)}`)}
                    </button>
                  ))}
                </div>

                <label className="block text-xs font-black uppercase tracking-[0.18em] text-white/40">
                  {t('filemanager.player.subtitleFontSize')}
                  <div className="mt-2 flex items-center gap-3">
                    <input type="range" min={0.8} max={1.6} step={0.05} value={subtitleScale} onChange={(event) => setSubtitleScale(Number(event.target.value))} className="music-range h-2.5 w-full cursor-pointer" />
                    <span className="w-10 text-right text-white/70">{subtitleScale.toFixed(2)}x</span>
                  </div>
                </label>

                <label className="block text-xs font-black uppercase tracking-[0.18em] text-white/40">
                  {t('filemanager.player.subtitleColor')}
                  <div className="mt-2 flex items-center gap-3">
                    <input type="color" value={subtitleTextColor} onChange={(event) => setSubtitleTextColor(event.target.value)} className="h-9 w-12 rounded-lg border border-white/10 bg-transparent" />
                    <span className="text-[11px] font-mono text-white/65">{subtitleTextColor}</span>
                  </div>
                </label>

                <label className="block text-xs font-black uppercase tracking-[0.18em] text-white/40">
                  {t('filemanager.player.subtitleBackground')}
                  <div className="mt-2 flex items-center gap-3">
                    <input type="range" min={0} max={0.9} step={0.05} value={subtitleBackgroundOpacity} onChange={(event) => setSubtitleBackgroundOpacity(Number(event.target.value))} className="music-range h-2.5 w-full cursor-pointer" />
                    <span className="w-10 text-right text-white/70">{Math.round(subtitleBackgroundOpacity * 100)}%</span>
                  </div>
                </label>

                <label className="block text-xs font-black uppercase tracking-[0.18em] text-white/40">
                  {t('filemanager.player.subtitleOffset')}
                  <div className="mt-2 flex items-center gap-3">
                    <input type="range" min={0} max={12} step={1} value={subtitleBottomOffset} onChange={(event) => setSubtitleBottomOffset(Number(event.target.value))} className="music-range h-2.5 w-full cursor-pointer" />
                    <span className="w-10 text-right text-white/70">{subtitleBottomOffset}%</span>
                  </div>
                </label>
              </div>

              <div className="mt-3 border-t border-white/10 px-2 pt-3 pb-1">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-white/40">{t('filemanager.player.audioTrack')}</p>
              </div>
              {availableAudioTracks.length > 0 ? availableAudioTracks.map((track) => (
                <button type="button" key={`${track.index}-${track.label}`} onClick={() => applyAudioTrackSelection(track.index)} className={cn('mt-1 w-full rounded-xl px-4 py-2 text-left text-sm font-bold', currentAudioTrackIndex === track.index ? 'bg-primary text-white' : 'text-white/60 hover:bg-white/5')}>
                  {track.label}
                </button>
              )) : <p className="px-4 py-2 text-sm text-white/45">{t('filemanager.player.audioTrackUnavailable')}</p>}
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
              <p className="text-xs text-muted-foreground mt-1">{sidebarTab === 'playlist' ? `${currentIndex + 1} / ${playlist.length}` : filteredRecentRecords.length > 0 ? t('filemanager.player.queue', { count: filteredRecentRecords.length }) : t('filemanager.player.historyEmpty')}</p>
            </div>
            {sidebarTab === 'recent' ? (
              filteredRecentRecords.length > 0 ? (
                <Button variant="ghost" size="sm" className="h-8 rounded-full px-3" onClick={() => clearMediaPlaybackRecords(recentFilter === 'all' ? undefined : recentFilter)}>
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
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-border p-1">
                  <button type="button" onClick={() => setRecentFilter('all')} className={cn('h-8 rounded-lg text-[11px] font-black uppercase tracking-[0.18em] transition-all', recentFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                    {t('common.all')}
                  </button>
                  <button type="button" onClick={() => setRecentFilter('audio')} className={cn('h-8 rounded-lg text-[11px] font-black uppercase tracking-[0.18em] transition-all', recentFilter === 'audio' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                    {t('filemanager.player.filterAudio')}
                  </button>
                  <button type="button" onClick={() => setRecentFilter('video')} className={cn('h-8 rounded-lg text-[11px] font-black uppercase tracking-[0.18em] transition-all', recentFilter === 'video' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                    {t('filemanager.player.filterVideo')}
                  </button>
                </div>
                {filteredRecentRecords.length > 0 ? filteredRecentRecords.map((record) => (
                <div key={record.path} className="rounded-xl border border-border bg-background/80 p-3">
                  <div className="flex items-start gap-3">
                    <button type="button" onClick={() => openRecentVideo(record.path)} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-bold">{record.title || record.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{`${t('filemanager.player.lastPlayed')} ${formatMediaPlaybackUpdatedAt(record.updatedAt, i18n.resolvedLanguage || i18n.language)}`}</p>
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
                )) : <p className="py-8 text-center text-sm font-bold text-muted-foreground">{t('filemanager.player.historyEmpty')}</p>}
              </div>
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
        .video-player-shell xg-text-track.xg-text-track {
          color: var(--fileuni-subtitle-color, #ffffff);
          font-size: calc(16px * var(--fileuni-subtitle-scale, 1));
          bottom: var(--fileuni-subtitle-bottom-offset, 4%);
        }
        .video-player-shell xg-text-track.xg-text-track.text-track-bg xg-text-track-inner {
          background-color: rgba(0, 0, 0, var(--fileuni-subtitle-bg-opacity, 0.54));
        }
        .video-player-shell xg-text-track.xg-text-track.text-track-stroke xg-text-track-inner {
          background-color: transparent;
          text-shadow: -1px 1px 0 rgba(0, 0, 0, 0.76), 1px 1px 0 rgba(0, 0, 0, 0.76), 1px -1px 0 rgba(0, 0, 0, 0.76), -1px -1px 0 rgba(0, 0, 0, 0.76);
        }
        .video-player-shell xg-text-track.xg-text-track.text-track-plain xg-text-track-inner {
          background-color: transparent;
          text-shadow: none;
        }
      `}</style>
    </div>
  );
};
