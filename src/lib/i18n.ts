import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

export type SupportedLang = 'zh' | 'en' | 'es' | 'de' | 'fr' | 'ru' | 'ja';

const supportedLangs: SupportedLang[] = ['zh', 'en', 'es', 'de', 'fr', 'ru', 'ja'];

const loaders: Record<SupportedLang, () => Promise<{ default: Record<string, unknown> }>> = {
  zh: () => import('@/i18n/zh/index.ts'),
  en: () => import('@/i18n/en/index.ts'),
  es: () => import('@/i18n/es/index.ts'),
  de: () => import('@/i18n/de/index.ts'),
  fr: () => import('@/i18n/fr/index.ts'),
  ru: () => import('@/i18n/ru/index.ts'),
  ja: () => import('@/i18n/ja/index.ts')
};

const toSupportedLang = (raw: unknown): SupportedLang | null => {
  if (typeof raw !== 'string') return null;
  const base = raw.split('-')[0]?.toLowerCase() || '';
  if (base === 'zh') return 'zh';
  if (base === 'en') return 'en';
  if (base === 'es') return 'es';
  if (base === 'de') return 'de';
  if (base === 'fr') return 'fr';
  if (base === 'ru') return 'ru';
  if (base === 'ja') return 'ja';
  return null;
};

const detectInitialLang = (): SupportedLang => {
  if (typeof window === 'undefined') return 'en';

  try {
    const stateRaw = window.localStorage.getItem('fileuni-language');
    if (stateRaw) {
      const parsed = JSON.parse(stateRaw) as { state?: { language?: string } };
      const value = parsed?.state?.language;
      if (value === 'auto') {
        const detected = toSupportedLang(navigator.language || 'en');
        return detected ?? 'en';
      }
      const normalized = toSupportedLang(value);
      if (normalized) return normalized;
    }
  } catch {
    // ignore
  }

  const saved = toSupportedLang(window.localStorage.getItem('fileuni-language-raw'));
  if (saved) return saved;

  return toSupportedLang(navigator.language || 'en') ?? 'en';
};

const loadTranslationFor = async (lang: SupportedLang): Promise<Record<string, unknown>> => {
  const mod = await loaders[lang]();
  return mod.default;
};

export const ensureLanguageLoaded = async (lang: SupportedLang): Promise<void> => {
  if (i18next.hasResourceBundle(lang, 'translation')) return;
  const resources = await loadTranslationFor(lang);
  i18next.addResourceBundle(lang, 'translation', resources, true, true);
};

export const changeLanguage = async (lang: SupportedLang): Promise<void> => {
  await ensureLanguageLoaded('en');
  await ensureLanguageLoaded(lang);
  await i18next.changeLanguage(lang);
};

// Must initialize at the top level of the module so React components can translate immediately.
const initialLang = detectInitialLang();
const enTranslation = await loadTranslationFor('en');
const initialTranslation = initialLang === 'en' ? enTranslation : await loadTranslationFor(initialLang);

i18next.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslation },
    ...(initialLang === 'en' ? {} : { [initialLang]: { translation: initialTranslation } })
  },
  lng: initialLang,
  fallbackLng: 'en',
  supportedLngs: supportedLangs,
  interpolation: {
    escapeValue: false
  },
  react: {
    useSuspense: false
  },
  parseMissingKeyHandler: (key) => {
    return `[${key}]`;
  },
  // Ensure stable hydration for first paint.
  initImmediate: false
});

export default i18next;
