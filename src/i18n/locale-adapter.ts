import { detectLocale, normalizeLocale, type SupportedLocale } from './core';

export const FRONTEND_RESOURCE_LOCALES = ['zh', 'en', 'es', 'de', 'fr', 'ru', 'ja'] as const;

export type FrontendResourceLocale = (typeof FRONTEND_RESOURCE_LOCALES)[number];

const RESOURCE_LOCALE_BY_CANONICAL: Record<SupportedLocale, FrontendResourceLocale> = {
  en: 'en',
  'zh-cn': 'zh',
  es: 'es',
  de: 'de',
  fr: 'fr',
  ru: 'ru',
  ja: 'ja',
};

export function toFrontendResourceLocale(locale: SupportedLocale): FrontendResourceLocale {
  return RESOURCE_LOCALE_BY_CANONICAL[locale];
}

export function normalizeFrontendStoredLocale(value: string | null | undefined): SupportedLocale | null {
  if (typeof value === 'string' && value.trim().toLowerCase() === 'zh') {
    return 'zh-cn';
  }
  return normalizeLocale(value);
}

export function detectFrontendLocale(
  language: string | null | undefined,
  languages?: readonly string[] | null | undefined,
): SupportedLocale {
  if (languages && languages.length > 0) {
    for (const candidate of languages) {
      const normalized = normalizeFrontendStoredLocale(candidate);
      if (normalized) {
        return normalized;
      }
    }
  }

  const normalized = normalizeFrontendStoredLocale(language);
  return normalized ?? detectLocale(language);
}

export function toHtmlLang(value: FrontendResourceLocale | SupportedLocale): string {
  return value === 'zh' || value === 'zh-cn' ? 'zh-CN' : value;
}
