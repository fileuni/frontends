import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import i18next from 'i18next';
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
  
  i18next.changeLanguage(targetLang);
  storageHub.setLocalItem('fileuni-language-raw', targetLang);
  document.documentElement.lang = targetLang;
}
