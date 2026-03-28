import { useSyncExternalStore } from 'react';
import { storageHub } from '@/lib/storageHub.ts';

export type MediaPlaybackKind = 'audio' | 'video';

export interface MediaPlaybackRecord {
  path: string;
  name: string;
  kind: MediaPlaybackKind;
  title?: string;
  subtitle?: string;
  album?: string;
  position: number;
  duration: number;
  progressPercent: number;
  updatedAt: number;
  completed: boolean;
}

interface MediaPlaybackInput {
  path: string;
  name: string;
  kind: MediaPlaybackKind;
  title?: string;
  subtitle?: string;
  album?: string;
  position: number;
  duration: number;
  completed?: boolean;
}

const STORAGE_KEY = 'fileuni-media-playback-history-v1';
const MAX_MEDIA_HISTORY = 50;
const listeners = new Set<() => void>();

let cachedRecords: MediaPlaybackRecord[] | null = null;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeRecord = (record: MediaPlaybackInput, updatedAt = Date.now()): MediaPlaybackRecord => {
  const safeDuration = Number.isFinite(record.duration) && record.duration > 0 ? record.duration : 0;
  const safePosition = safeDuration > 0 ? clamp(record.position, 0, safeDuration) : Math.max(0, record.position || 0);
  const completed = record.completed === true || (safeDuration > 0 && safePosition >= Math.max(safeDuration - 2, safeDuration * 0.98));

  return {
    path: record.path,
    name: record.name,
    kind: record.kind,
    title: record.title,
    subtitle: record.subtitle,
    album: record.album,
    position: completed ? 0 : safePosition,
    duration: safeDuration,
    progressPercent: safeDuration > 0 ? Math.round((safePosition / safeDuration) * 1000) / 10 : 0,
    updatedAt,
    completed,
  };
};

const readRecords = (): MediaPlaybackRecord[] => {
  if (cachedRecords) return cachedRecords;
  const raw = storageHub.getLocalItem(STORAGE_KEY);
  if (!raw) {
    cachedRecords = [];
    return cachedRecords;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      cachedRecords = [];
      return cachedRecords;
    }
    cachedRecords = parsed
      .filter((item): item is MediaPlaybackRecord => typeof item === 'object' && item !== null && typeof (item as MediaPlaybackRecord).path === 'string')
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, MAX_MEDIA_HISTORY);
    return cachedRecords;
  } catch {
    cachedRecords = [];
    return cachedRecords;
  }
};

const writeRecords = (records: MediaPlaybackRecord[]) => {
  cachedRecords = records.slice(0, MAX_MEDIA_HISTORY);
  storageHub.setLocalItem(STORAGE_KEY, JSON.stringify(cachedRecords));
  listeners.forEach((listener) => {
    listener();
  });
};

const sortRecords = (records: MediaPlaybackRecord[]) => records.sort((left, right) => right.updatedAt - left.updatedAt).slice(0, MAX_MEDIA_HISTORY);

export const listMediaPlaybackRecords = (kind?: MediaPlaybackKind) => {
  const records = readRecords();
  return kind ? records.filter((record) => record.kind === kind) : records;
};

export const getMediaPlaybackRecord = (path: string) => readRecords().find((record) => record.path === path) || null;

export const upsertMediaPlaybackRecord = (record: MediaPlaybackInput) => {
  const existing = readRecords().filter((item) => item.path !== record.path);
  const nextRecord = normalizeRecord(record);
  writeRecords(sortRecords([nextRecord, ...existing]));
  return nextRecord;
};

export const removeMediaPlaybackRecord = (path: string) => {
  writeRecords(readRecords().filter((record) => record.path !== path));
};

export const resolveMediaResumePosition = (path: string, duration?: number) => {
  const record = getMediaPlaybackRecord(path);
  if (!record || record.completed) return 0;
  const effectiveDuration = duration && duration > 0 ? duration : record.duration;
  if (record.position < 5) return 0;
  if (effectiveDuration > 0 && record.position >= Math.max(effectiveDuration - 8, effectiveDuration * 0.96)) return 0;
  return record.position;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useMediaPlaybackHistory = (kind?: MediaPlaybackKind) => useSyncExternalStore<MediaPlaybackRecord[]>(
  subscribe,
  () => listMediaPlaybackRecords(kind),
  (): MediaPlaybackRecord[] => [],
);

export const MAX_MEDIA_PLAYBACK_RECORDS = MAX_MEDIA_HISTORY;
