import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  FRONTEND_RESOURCE_LOCALES,
  detectFrontendLocale,
  normalizeFrontendStoredLocale,
  toI18nextLocale,
  type FrontendI18nextLocale,
  type FrontendResourceLocale,
} from '@/i18n/locale-adapter';

export type SupportedLang = FrontendResourceLocale;

const supportedLangs: SupportedLang[] = [...FRONTEND_RESOURCE_LOCALES];
const supportedI18nextLangs: FrontendI18nextLocale[] = supportedLangs.map((lang) =>
  toI18nextLocale(lang),
);

const loaders: Record<SupportedLang, () => Promise<{ default: Record<string, unknown> }>> = {
  en: () => import('@/i18n/en/index.ts'),
  'zh-CN': () => import('@/i18n/zh-CN/index.ts'),
  'zh-Hant': () => import('@/i18n/zh-Hant/index.ts'),
  es: () => import('@/i18n/es/index.ts'),
  de: () => import('@/i18n/de/index.ts'),
  fr: () => import('@/i18n/fr/index.ts'),
  ru: () => import('@/i18n/ru/index.ts'),
  ja: () => import('@/i18n/ja/index.ts')
};

const toSupportedLang = (raw: unknown): SupportedLang | null => {
  if (typeof raw !== 'string') return null;
  const canonical = normalizeFrontendStoredLocale(raw);
  return canonical;
};

const detectInitialLang = (): SupportedLang => {
  if (typeof window === 'undefined') return 'en';

  try {
    const stateRaw = window.localStorage.getItem('fileuni-language');
    if (stateRaw) {
      const parsed = JSON.parse(stateRaw) as { state?: { language?: string } };
      const value = parsed?.state?.language;
      if (value === 'auto') {
        return detectFrontendLocale(navigator.language || 'en', navigator.languages);
      }
      const normalized = toSupportedLang(value);
      if (normalized) return normalized;
    }
  } catch {
    // ignore
  }

  return detectFrontendLocale(navigator.language || 'en', navigator.languages);
};

const loadTranslationFor = async (lang: SupportedLang): Promise<Record<string, unknown>> => {
  const mod = await loaders[lang]();
  return mod.default;
};

export const ensureLanguageLoaded = async (lang: SupportedLang): Promise<void> => {
  const i18nextLocale = toI18nextLocale(lang);
  if (i18next.hasResourceBundle(i18nextLocale, 'translation')) return;
  const resources = await loadTranslationFor(lang);
  i18next.addResourceBundle(i18nextLocale, 'translation', resources, true, true);
};

export const changeLanguage = async (lang: SupportedLang): Promise<void> => {
  await ensureLanguageLoaded('en');
  await ensureLanguageLoaded(lang);
  await i18next.changeLanguage(toI18nextLocale(lang));
};

// Must initialize at the top level of the module so React components can translate immediately.
const initialLang = detectInitialLang();
const initialI18nextLang = toI18nextLocale(initialLang);
const enTranslation = await loadTranslationFor('en');
const initialTranslation = initialLang === 'en' ? enTranslation : await loadTranslationFor(initialLang);

i18next.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslation },
    ...(initialLang === 'en'
      ? {}
      : { [initialI18nextLang]: { translation: initialTranslation } })
  },
  lng: initialI18nextLang,
  supportedLngs: supportedI18nextLangs,
  interpolation: {
    escapeValue: false
  },
  react: {
    useSuspense: false
  },
  // Ensure stable hydration for first paint.
  initImmediate: false
});

export default i18next;
