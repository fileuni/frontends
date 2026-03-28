import { create } from 'zustand';
import type { FileInfo } from '@/components/file-manager/types';
import { isAudioFile } from '@/components/file-manager/components/audioPreviewShared.ts';

interface AudioState {
  isOpen: boolean;
  isMinimized: boolean;
  currentTrack: FileInfo | null;
  playlist: FileInfo[];
  currentIndex: number;

  play: (track: FileInfo, folderFiles: FileInfo[]) => void;
  close: () => void;
  setCurrentIndex: (index: number) => void;
  setMinimized: (minimized: boolean) => void;
  next: () => void;
  prev: () => void;
  setPlaylist: (tracks: FileInfo[]) => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  isOpen: false,
  isMinimized: false,
  currentTrack: null,
  playlist: [],
  currentIndex: -1,

  play: (file, folderFiles) => {
    const audioFiles = folderFiles.filter((entry) => !entry.is_dir && isAudioFile(entry.name));
    const playlist = audioFiles.length > 0 ? audioFiles : [file];
    const nextIndex = playlist.findIndex((track) => track.path === file.path);
    const resolvedIndex = nextIndex >= 0 ? nextIndex : 0;

    set({
      isOpen: true,
      isMinimized: false,
      currentTrack: playlist[resolvedIndex] ?? file,
      playlist,
      currentIndex: resolvedIndex,
    });
  },

  close: () => set({ isOpen: false, currentTrack: null, playlist: [], currentIndex: -1 }),

  setCurrentIndex: (index) => set((state) => {
    if (state.playlist.length === 0) return state;
    const nextIndex = Math.min(Math.max(index, 0), state.playlist.length - 1);
    return { currentIndex: nextIndex, currentTrack: state.playlist[nextIndex] ?? null };
  }),

  setMinimized: (minimized) => set({ isMinimized: minimized }),

  next: () => {
    const { playlist, currentIndex } = get();
    if (playlist.length === 0) return;
    const nextIndex = (currentIndex + 1) % playlist.length;
    set({ currentIndex: nextIndex, currentTrack: playlist[nextIndex] ?? null });
  },

  prev: () => {
    const { playlist, currentIndex } = get();
    if (playlist.length === 0) return;
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    set({ currentIndex: prevIndex, currentTrack: playlist[prevIndex] ?? null });
  },

  setPlaylist: (files) => set((state) => {
    const playlist = files.filter((entry) => !entry.is_dir && isAudioFile(entry.name));
    if (playlist.length === 0) {
      return { playlist: [], currentTrack: null, currentIndex: -1 };
    }
    const currentTrackPath = state.currentTrack?.path;
    const nextIndex = currentTrackPath ? playlist.findIndex((entry) => entry.path === currentTrackPath) : 0;
    const resolvedIndex = nextIndex >= 0 ? nextIndex : 0;
    return { playlist, currentIndex: resolvedIndex, currentTrack: playlist[resolvedIndex] ?? null };
  }),
}));
