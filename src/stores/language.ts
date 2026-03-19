import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import i18next from 'i18next';
import { changeLanguage, type SupportedLang } from '@/lib/i18n';
import { storageHub } from '../lib/storageHub';

export type Language = 'auto' | 'zh' | 'en' | 'es' | 'de' | 'fr' | 'ru' | 'ja';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

/**
 * Global Language State Management
 */
export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'auto',
      setLanguage: (lang) => {
        set({ language: lang });
        applyLanguage(lang);
      },
    }),
    {
      name: 'fileuni-language',
      storage: createJSONStorage(() => storageHub.createZustandStorage()),
      onRehydrateStorage: () => (state) => {
        if (state) applyLanguage(state.language);
      }
    }
  )
);

/**
 * Apply language preference
 */
export function applyLanguage(lang: Language) {
  if (typeof window === 'undefined') return;
  
  let targetLang: string = lang;
  if (lang === 'auto') {
    const base = (navigator.language.split('-')[0] || 'en').toLowerCase();
    const supported: Record<string, string> = {
      en: 'en',
      zh: 'zh',
      es: 'es',
      de: 'de',
      fr: 'fr',
      ru: 'ru',
      ja: 'ja',
    };
    targetLang = supported[base] ?? 'en';
  }
  
  const normalized = (['zh', 'en', 'es', 'de', 'fr', 'ru', 'ja'] as const).includes(targetLang as SupportedLang)
    ? (targetLang as SupportedLang)
    : 'en';
  void changeLanguage(normalized).catch(() => {
    // Fallback to i18next internal changeLanguage on unexpected errors.
    void i18next.changeLanguage(normalized);
  });
  storageHub.setLocalItem('fileuni-language-raw', targetLang);
  document.documentElement.lang = targetLang;
}
