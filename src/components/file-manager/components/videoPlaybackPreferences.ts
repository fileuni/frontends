import { storageHub } from '@/lib/storageHub.ts';

export interface VideoPlaybackPreference {
  path: string;
  subtitlePath: string | null;
  audioTrackIndex: number | null;
  updatedAt: number;
}

interface VideoPlaybackPreferencePatch {
  subtitlePath?: string | null;
  audioTrackIndex?: number | null;
}

const STORAGE_KEY = 'fileuni-video-playback-preferences-v1';
const MAX_VIDEO_PREFS = 50;

let cachedPreferences: VideoPlaybackPreference[] | null = null;

const readPreferences = () => {
  if (cachedPreferences) return cachedPreferences;
  const raw = storageHub.getLocalItem(STORAGE_KEY);
  if (!raw) {
    cachedPreferences = [];
    return cachedPreferences;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      cachedPreferences = [];
      return cachedPreferences;
    }

    cachedPreferences = parsed
      .filter((item): item is VideoPlaybackPreference => typeof item === 'object' && item !== null && typeof (item as VideoPlaybackPreference).path === 'string')
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, MAX_VIDEO_PREFS);
    return cachedPreferences;
  } catch {
    cachedPreferences = [];
    return cachedPreferences;
  }
};

const writePreferences = (preferences: VideoPlaybackPreference[]) => {
  cachedPreferences = preferences
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, MAX_VIDEO_PREFS);
  storageHub.setLocalItem(STORAGE_KEY, JSON.stringify(cachedPreferences));
};

export const getVideoPlaybackPreference = (path: string) => readPreferences().find((item) => item.path === path) || null;

export const updateVideoPlaybackPreference = (path: string, patch: VideoPlaybackPreferencePatch) => {
  const current = getVideoPlaybackPreference(path);
  const next: VideoPlaybackPreference = {
    path,
    subtitlePath: Object.prototype.hasOwnProperty.call(patch, 'subtitlePath') ? (patch.subtitlePath ?? null) : (current?.subtitlePath ?? null),
    audioTrackIndex: Object.prototype.hasOwnProperty.call(patch, 'audioTrackIndex') ? (patch.audioTrackIndex ?? null) : (current?.audioTrackIndex ?? null),
    updatedAt: Date.now(),
  };

  const rest = readPreferences().filter((item) => item.path !== path);
  writePreferences([next, ...rest]);
  return next;
};
