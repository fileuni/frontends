import { storageHub } from '@/lib/storageHub.ts';

export type SubtitleStyleMode = 'bg' | 'stroke' | 'plain';

export interface VideoPlayerUiPrefs {
  volume: number;
  playbackRate: number;
  pipPreferred: boolean;
  brightness: number;
  subtitleScale: number;
  subtitleTextColor: string;
  subtitleBackgroundOpacity: number;
  subtitleBottomOffset: number;
  subtitleStyleMode: SubtitleStyleMode;
}

const STORAGE_KEY = 'fileuni-video-player-ui-v2';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const DEFAULT_VIDEO_PLAYER_UI_PREFS: VideoPlayerUiPrefs = {
  volume: 1,
  playbackRate: 1,
  pipPreferred: false,
  brightness: 1,
  subtitleScale: 1,
  subtitleTextColor: '#ffffff',
  subtitleBackgroundOpacity: 0.54,
  subtitleBottomOffset: 4,
  subtitleStyleMode: 'bg',
};

export const readVideoPlayerUiPrefs = (): VideoPlayerUiPrefs => {
  const raw = storageHub.getLocalItem(STORAGE_KEY);
  if (!raw) return DEFAULT_VIDEO_PLAYER_UI_PREFS;
  try {
    const parsed = JSON.parse(raw) as Partial<VideoPlayerUiPrefs>;
    return {
      volume: typeof parsed.volume === 'number' ? clamp(parsed.volume, 0, 1) : DEFAULT_VIDEO_PLAYER_UI_PREFS.volume,
      playbackRate: typeof parsed.playbackRate === 'number' ? parsed.playbackRate : DEFAULT_VIDEO_PLAYER_UI_PREFS.playbackRate,
      pipPreferred: parsed.pipPreferred === true,
      brightness: typeof parsed.brightness === 'number' ? clamp(parsed.brightness, 0.45, 1.25) : DEFAULT_VIDEO_PLAYER_UI_PREFS.brightness,
      subtitleScale: typeof parsed.subtitleScale === 'number' ? clamp(parsed.subtitleScale, 0.8, 1.6) : DEFAULT_VIDEO_PLAYER_UI_PREFS.subtitleScale,
      subtitleTextColor: typeof parsed.subtitleTextColor === 'string' ? parsed.subtitleTextColor : DEFAULT_VIDEO_PLAYER_UI_PREFS.subtitleTextColor,
      subtitleBackgroundOpacity: typeof parsed.subtitleBackgroundOpacity === 'number' ? clamp(parsed.subtitleBackgroundOpacity, 0, 0.9) : DEFAULT_VIDEO_PLAYER_UI_PREFS.subtitleBackgroundOpacity,
      subtitleBottomOffset: typeof parsed.subtitleBottomOffset === 'number' ? clamp(parsed.subtitleBottomOffset, 0, 12) : DEFAULT_VIDEO_PLAYER_UI_PREFS.subtitleBottomOffset,
      subtitleStyleMode: parsed.subtitleStyleMode === 'plain' || parsed.subtitleStyleMode === 'stroke' || parsed.subtitleStyleMode === 'bg' ? parsed.subtitleStyleMode : DEFAULT_VIDEO_PLAYER_UI_PREFS.subtitleStyleMode,
    };
  } catch {
    return DEFAULT_VIDEO_PLAYER_UI_PREFS;
  }
};

export const writeVideoPlayerUiPrefs = (prefs: VideoPlayerUiPrefs) => {
  storageHub.setLocalItem(STORAGE_KEY, JSON.stringify(prefs));
};
