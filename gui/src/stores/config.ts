import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConfigState {
  // Config file path
  configPath: string | null;
  // Whether config is selected
  hasSelectedConfig: boolean;
  // Set config path
  setConfigPath: (path: string) => void;
  // Clear config path
  clearConfigPath: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      configPath: null,
      hasSelectedConfig: false,
      setConfigPath: (path: string) => set({ 
        configPath: path, 
        hasSelectedConfig: true 
      }),
      clearConfigPath: () => set({ 
        configPath: null, 
        hasSelectedConfig: false 
      }),
    }),
    {
      name: 'fileuni-config-storage',
    }
  )
);
