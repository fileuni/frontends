import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import i18next, { changeLanguage, type SupportedLang } from '@/lib/i18n';
import { detectFrontendLocale, toHtmlLang, toI18nextLocale } from '@/i18n/locale-adapter';
import {
  AUTO_LOCALE_PREFERENCE,
  FILEUNI_LANGUAGE_STORAGE_KEY,
  resolveLocalePreference,
  type LocalePreference,
} from '@/i18n/core';
import { storageHub } from '../lib/storageHub';

export type Language = LocalePreference;

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
      language: AUTO_LOCALE_PREFERENCE,
      setLanguage: (lang) => {
        set({ language: lang });
        applyLanguage(lang);
      },
    }),
    {
      name: FILEUNI_LANGUAGE_STORAGE_KEY,
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

  const targetLang = resolveLocalePreference(lang, navigator.language, navigator.languages);
  const normalized = detectFrontendLocale(targetLang, [targetLang]) as SupportedLang;
  void changeLanguage(normalized).catch(() => {
    // Fallback to i18next internal changeLanguage on unexpected errors.
    void i18next.changeLanguage(toI18nextLocale(normalized));
  });
  document.documentElement.lang = toHtmlLang(targetLang);
}
