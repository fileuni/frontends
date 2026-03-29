import type React from 'react';
import type { FileInfo } from '../types/index.ts';
import { client } from '@/lib/api.ts';
import { ListOrdered, Repeat, Repeat1, Shuffle } from 'lucide-react';

export type PlayMode = 'list' | 'loop' | 'shuffle' | 'single';

export interface LyricLine {
  id: string;
  time: number | null;
  text: string;
}

export interface LyricsState {
  status: 'loading' | 'ready' | 'missing' | 'error';
  lines: LyricLine[];
  synced: boolean;
  title?: string;
  artist?: string;
  album?: string;
  sourcePath?: string;
}

export const PLAY_MODE_CONFIG: Record<PlayMode, { icon: React.ElementType; labelKey: string }> = {
  list: { icon: ListOrdered, labelKey: 'filemanager.player.playMode.list' },
  loop: { icon: Repeat, labelKey: 'filemanager.player.playMode.loop' },
  shuffle: { icon: Shuffle, labelKey: 'filemanager.player.playMode.shuffle' },
  single: { icon: Repeat1, labelKey: 'filemanager.player.playMode.single' },
};

export const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
export const EMPTY_LYRICS: LyricsState = { status: 'loading', lines: [], synced: false };
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma'] as const;

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const isAudioFile = (name: string) => AUDIO_EXTENSIONS.includes((name.split('.').pop()?.toLowerCase() || '') as (typeof AUDIO_EXTENSIONS)[number]);

export const getParentPath = (path: string) => {
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash <= 0) return '/';
  return path.slice(0, lastSlash) || '/';
};

export const getBaseName = (name: string) => name.replace(/\.[^.]+$/, '');

export const formatTime = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const parseFraction = (raw?: string) => {
  if (!raw) return 0;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return 0;
  if (raw.length === 3) return numeric / 1000;
  if (raw.length === 2) return numeric / 100;
  return numeric / 10;
};

export const parseLrc = (source: string): Omit<LyricsState, 'status' | 'sourcePath'> => {
  const meta: { title?: string; artist?: string; album?: string } = {};
  const timedLines: Array<{ time: number; text: string }> = [];
  const plainLines: LyricLine[] = [];
  let offsetSeconds = 0;

  for (const rawLine of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const offsetMatch = line.match(/^\[offset:([+-]?\d+)\]$/i);
    if (offsetMatch) {
      offsetSeconds = Number(offsetMatch[1] || '0') / 1000;
      continue;
    }

    const metaMatch = line.match(/^\[(ti|ar|al):([^\]]*)\]$/i);
    if (metaMatch) {
      const key = (metaMatch[1] ?? '').toLowerCase();
      const value = metaMatch[2]?.trim() ?? '';
      if (!value) continue;
      if (key === 'ti') meta.title = value;
      if (key === 'ar') meta.artist = value;
      if (key === 'al') meta.album = value;
      continue;
    }

    const matches = [...line.matchAll(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    if (matches.length === 0) {
      plainLines.push({ id: `plain-${plainLines.length}`, time: null, text: line });
      continue;
    }

    const text = line.replace(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g, '').trim() || '♪';
    for (const match of matches) {
      const minutes = Number(match[1] || '0');
      const seconds = Number(match[2] || '0');
      const fraction = parseFraction(match[3]);
      timedLines.push({
        time: clamp(minutes * 60 + seconds + fraction + offsetSeconds, 0, Number.MAX_SAFE_INTEGER),
        text,
      });
    }
  }

  if (timedLines.length > 0) {
    return {
      lines: timedLines
        .sort((a, b) => a.time - b.time)
        .map((line, index) => ({ id: `timed-${line.time}-${index}`, time: line.time, text: line.text })),
      synced: true,
      ...meta,
    };
  }

  return { lines: plainLines, synced: false, ...meta };
};

export const getRandomIndex = (length: number, currentIndex: number) => {
  if (length <= 1) return currentIndex;
  let nextIndex = currentIndex;
  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * length);
  }
  return nextIndex;
};

export const listFolderFiles = async (path: string): Promise<FileInfo[]> => {
  const { data: res } = await client.GET('/api/v1/file/list', { params: { query: { path } } });
  if (Array.isArray(res?.data)) return res.data as FileInfo[];
  if (res?.data && typeof res.data === 'object') {
    const payload = res.data as Record<string, unknown>;
    const items = payload.items ?? payload.data;
    if (Array.isArray(items)) return items as FileInfo[];
  }
  return [];
};

export const findLyricFile = (track: FileInfo, folderFiles: FileInfo[]) => {
  const baseName = getBaseName(track.name).toLowerCase();
  return folderFiles.find((file) => {
    if (file.is_dir) return false;
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    return extension === 'lrc' && getBaseName(file.name).toLowerCase() === baseName;
  });
};
