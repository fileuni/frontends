import { detectLocaleFromNavigator, normalizeLocale, type SupportedLocale } from './core';

export const FRONTEND_RESOURCE_LOCALES = ['en', 'zh-cn', 'es', 'de', 'fr', 'ru', 'ja'] as const;

export type FrontendResourceLocale = (typeof FRONTEND_RESOURCE_LOCALES)[number];

export function toFrontendResourceLocale(locale: SupportedLocale): FrontendResourceLocale {
  return locale;
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
  return value === 'zh-cn' ? 'zh-CN' : value;
}
