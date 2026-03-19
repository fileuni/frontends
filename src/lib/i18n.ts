import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhTranslation from '@/i18n/zh/translation.json';
import enTranslation from '@/i18n/en/translation.json';
import esTranslation from '@/i18n/es/translation.json';
import deTranslation from '@/i18n/de/translation.json';
import frTranslation from '@/i18n/fr/translation.json';
import ruTranslation from '@/i18n/ru/translation.json';
import jaTranslation from '@/i18n/ja/translation.json';

const detectInitialLang = (): 'zh' | 'en' | 'es' | 'de' | 'fr' | 'ru' | 'ja' => {
  if (typeof navigator === 'undefined') return 'en';
  const base = (navigator.language || 'en').split('-')[0]?.toLowerCase() || 'en';
  const supported: Record<string, 'zh' | 'en' | 'es' | 'de' | 'fr' | 'ru' | 'ja'> = {
    en: 'en',
    zh: 'zh',
    es: 'es',
    de: 'de',
    fr: 'fr',
    ru: 'ru',
    ja: 'ja',
  };
  return supported[base] ?? 'en';
};

// Must initialize at the top level of the module to ensure translation resources are available during the SSR phase.
i18next
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zhTranslation },
      en: { translation: enTranslation },
      es: { translation: esTranslation },
      de: { translation: deTranslation },
      fr: { translation: frTranslation },
      ru: { translation: ruTranslation },
      ja: { translation: jaTranslation }
    },
    lng: detectInitialLang(), // Default: browser language
    fallbackLng: 'en', // Any language missing a key will fall back to English
    supportedLngs: ['zh', 'en', 'es', 'de', 'fr', 'ru', 'ja'],
    interpolation: {
      escapeValue: false
    },
    // Handling logic when the key cannot be found in the current language or English.
    parseMissingKeyHandler: (key) => {
      // If even English is missing, display [key] as a placeholder to avoid blank pages.
      return `[${key}]`;
    },
    // Key: Disable asynchronous loading to ensure consistent hydration.
    initImmediate: false 
  });

export default i18next;
