import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConfigState {
  runtimeDir: string | null;
  hasSelectedRuntimeDir: boolean;
  setRuntimeDir: (runtimeDir: string) => void;
  clearRuntimeDir: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist<ConfigState>(
    (set) => ({
      runtimeDir: null,
      hasSelectedRuntimeDir: false,
      setRuntimeDir: (runtimeDir: string) =>
        set({
          runtimeDir,
          hasSelectedRuntimeDir: true,
        }),
      clearRuntimeDir: () =>
        set({
          runtimeDir: null,
          hasSelectedRuntimeDir: false,
        }),
    }),
    { name: 'fileuni-config-storage' }
  )
);
