import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhTranslation from '@/i18n/zh/translation.json';
import enTranslation from '@/i18n/en/translation.json';
import esTranslation from '@/i18n/es/translation.json';

const detectInitialLang = (): 'zh' | 'en' | 'es' => {
  if (typeof navigator === 'undefined') return 'en';
  const base = (navigator.language || 'en').split('-')[0]?.toLowerCase();
  if (base === 'zh') return 'zh';
  if (base === 'es') return 'es';
  return 'en';
};

// Must initialize at the top level of the module to ensure translation resources are available during the SSR phase.
i18next
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zhTranslation },
      en: { translation: enTranslation },
      es: { translation: esTranslation }
    },
    lng: detectInitialLang(), // Default: browser language
    fallbackLng: 'en', // Any language missing a key will fall back to English
    supportedLngs: ['zh', 'en', 'es'],
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
