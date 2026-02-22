import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConfigState {
  // 配置文件路径 / Config file path
  configPath: string | null;
  // 是否已选择配置 / Whether config is selected
  hasSelectedConfig: boolean;
  // 设置配置路径 / Set config path
  setConfigPath: (path: string) => void;
  // 清除配置路径 / Clear config path
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
