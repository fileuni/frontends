/**
 * 服务状态管理 / Service State Management
 * 
 * 使用 Zustand 管理 FileUni 服务的全局状态
 * Uses Zustand to manage global FileUni service state
 */

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

/**
 * 服务状态类型 / Service status types
 */
export type ServiceStatus = 'running' | 'stopped' | 'checking' | 'unknown';

/**
 * 服务状态接口 / Service state interface
 */
interface ServiceState {
  /** 当前状态 / Current status */
  status: ServiceStatus;
  /** 是否运行中 / Whether service is running */
  isRunning: boolean;
  /** 是否正在加载 / Whether operation is in progress */
  isLoading: boolean;
  /** 错误信息 / Error message */
  error: string | null;
  /** 应用版本 / App version */
  version: string;
  /** 操作系统类型 / OS type */
  osType: string;
  /** 是否支持服务安装 / Whether service installation is supported */
  supportService: boolean;
  /** 是否为 NixOS / Whether running on NixOS */
  isNixos: boolean;
  
  // Actions
  /** 获取服务状态 / Get service status */
  fetchStatus: () => Promise<void>;
  /** 启动服务 / Start service */
  startService: () => Promise<void>;
  /** 停止服务 / Stop service */
  stopService: () => Promise<void>;
  /** 安装服务 / Install service */
  installService: (level: 'system' | 'user', autostart: boolean) => Promise<void>;
  /** 卸载服务 / Uninstall service */
  uninstallService: () => Promise<void>;
  /** 获取应用信息 / Get app info */
  fetchAppInfo: () => Promise<void>;
  /** 清除错误 / Clear error */
  clearError: () => void;
}

/**
 * 服务状态存储 / Service state store
 */
export const useServiceStore = create<ServiceState>((set, get) => ({
  status: 'checking',
  isRunning: false,
  isLoading: false,
  error: null,
  version: '0.1.0',
  osType: 'unknown',
  supportService: false,
  isNixos: false,

  /**
   * 获取服务状态 / Get service status
   */
  fetchStatus: async () => {
    set({ status: 'checking', error: null });
    try {
      const result = await invoke<{ status: string; is_running: boolean }>('get_service_status');
      set({
        status: result.is_running ? 'running' : 'stopped',
        isRunning: result.is_running,
      });
    } catch (err) {
      set({
        status: 'unknown',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  /**
   * 启动服务 / Start service
   */
  startService: async () => {
    set({ isLoading: true, error: null });
    try {
      await invoke<string>('start_service');
      // 等待服务启动 / Wait for service to start
      await new Promise(resolve => setTimeout(resolve, 1000));
      await get().fetchStatus();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  /**
   * 停止服务 / Stop service
   */
  stopService: async () => {
    set({ isLoading: true, error: null });
    try {
      await invoke<string>('stop_service');
      // 等待服务停止 / Wait for service to stop
      await new Promise(resolve => setTimeout(resolve, 500));
      await get().fetchStatus();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  /**
   * 安装服务 / Install service
   */
  installService: async (level: 'system' | 'user', autostart: boolean) => {
    set({ isLoading: true, error: null });
    try {
      await invoke<string>('install_service', { level, autostart });
      set({ isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  /**
   * 卸载服务 / Uninstall service
   */
  uninstallService: async () => {
    set({ isLoading: true, error: null });
    try {
      await invoke<string>('uninstall_service');
      set({ isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  /**
   * 获取应用信息 / Get app info
   */
  fetchAppInfo: async () => {
    try {
      const [version, osInfo] = await Promise.all([
        invoke<string>('get_app_version'),
        invoke<{ os_type: string; support_service: boolean; nixos_hint: boolean }>('get_os_info'),
      ]);
      
      set({
        version,
        osType: osInfo.os_type,
        supportService: osInfo.support_service,
        isNixos: osInfo.nixos_hint,
      });
    } catch (err) {
      console.error('Failed to fetch app info:', err);
    }
  },

  /**
   * 清除错误 / Clear error
   */
  clearError: () => set({ error: null }),
}));
