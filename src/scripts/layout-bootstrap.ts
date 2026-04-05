import {
  FILEUNI_LANGUAGE_STORAGE_KEY,
  detectLocale,
  normalizeLocale,
} from '../i18n/core';

export function initFrontendLayoutBootstrap(): void {
  const theme = (() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('fileuni-theme')) {
      const saved = JSON.parse(localStorage.getItem('fileuni-theme') || 'null');
      if (saved?.state?.theme === 'dark' || saved?.state?.theme === 'light') {
        return saved.state.theme as 'dark' | 'light';
      }
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  })();

  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);

  const lang = (() => {
    try {
      const state = localStorage.getItem(FILEUNI_LANGUAGE_STORAGE_KEY);
      if (state) {
        const parsed = JSON.parse(state);
        const value = parsed?.state?.language;
        const normalized = normalizeLocale(value);
        if (normalized) {
          return normalized;
        }
        if (value === 'auto') {
          return detectLocale(navigator.language);
        }
      }
    } catch (_error) {
      void _error;
    }
    return detectLocale(navigator.language);
  })();

  document.documentElement.lang = lang;
}
