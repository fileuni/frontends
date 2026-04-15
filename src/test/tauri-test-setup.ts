import { afterEach, beforeAll, vi } from 'vitest';
import { clearMocks } from '@tauri-apps/api/mocks';
import { cleanup } from '@testing-library/react';
import { useToastStore } from '@/stores/toast';
import { useConfigStore } from '@/apps/launcher/stores/config';
import { useLanguageStore } from '@/stores/language';
import { useThemeStore } from '@/stores/theme';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('dark') ? false : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  Object.defineProperty(window, 'isTauri', {
    configurable: true,
    writable: true,
    value: true,
  });

  Object.defineProperty(window, 'open', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  clearMocks();
  window.localStorage.clear();
  useToastStore.setState({ toasts: [] });
  useConfigStore.setState({
    runtimeDir: null,
    hasSelectedRuntimeDir: false,
    setRuntimeDir: useConfigStore.getState().setRuntimeDir,
    clearRuntimeDir: useConfigStore.getState().clearRuntimeDir,
  });
  useThemeStore.setState({
    theme: 'system',
    setTheme: useThemeStore.getState().setTheme,
  });
  useLanguageStore.setState({
    language: 'auto',
    setLanguage: useLanguageStore.getState().setLanguage,
  });
});
