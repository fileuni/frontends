import {
  detectLocaleFromNavigator,
  normalizeLocale,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from './core';

export const FRONTEND_RESOURCE_LOCALES = SUPPORTED_LOCALES;

const I18NEXT_LOCALE_BY_FRONTEND_RESOURCE_LOCALE = {
  en: 'en',
  'zh-CN': 'zh-CN',
  'zh-Hant': 'zh-Hant',
  es: 'es',
  de: 'de',
  fr: 'fr',
  ru: 'ru',
  ja: 'ja',
} as const;

export type FrontendResourceLocale = (typeof FRONTEND_RESOURCE_LOCALES)[number];
export type FrontendI18nextLocale =
  (typeof I18NEXT_LOCALE_BY_FRONTEND_RESOURCE_LOCALE)[FrontendResourceLocale];

export function toFrontendResourceLocale(locale: SupportedLocale): FrontendResourceLocale {
  return locale;
}

export function toI18nextLocale(
  locale: FrontendResourceLocale | SupportedLocale,
): FrontendI18nextLocale {
  return I18NEXT_LOCALE_BY_FRONTEND_RESOURCE_LOCALE[locale];
}

export function normalizeFrontendStoredLocale(value: string | null | undefined): SupportedLocale | null {
  return normalizeLocale(value);
}

export function detectFrontendLocale(
  language: string | null | undefined,
  languages?: readonly string[] | null | undefined,
): SupportedLocale {
  return detectLocaleFromNavigator(language, languages);
}

export function toHtmlLang(value: FrontendResourceLocale | SupportedLocale): string {
  return value === 'zh-CN' ? 'zh-CN' : value;
}
