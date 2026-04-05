import i18next from '@/lib/i18n';
import { LOCALE_PICKER_OPTIONS } from '@/i18n/core';

const DOCS_ORIGIN = 'https://docs.fileuni.com';

const resolveDocsLocalePrefix = (lang: string | undefined): string => {
  const raw = (lang || '').toLowerCase();
  const base = raw.split('-')[0] || '';

  const map = Object.fromEntries(
    LOCALE_PICKER_OPTIONS.map((option) => [option.code.split('-')[0] || option.code, option.pathPrefix]),
  ) as Record<string, string>;
  return map[base] ?? '';
};

const normalizePath = (path: string): string => {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
};

/**
 * Build a docs.fileuni.com URL with locale prefix.
 *
 * Examples:
 * - docsUrl('/get-admin-passwd/')
 * - docsUrl('get-admin-passwd/')
 */
export function docsUrl(path: string = '/', lang?: string): string {
  const resolvedLang = lang ?? i18next.language;
  const prefix = resolveDocsLocalePrefix(resolvedLang);
  const p = normalizePath(path);

  // If caller already provided a locale-prefixed path, keep it.
  const knownPrefixes = LOCALE_PICKER_OPTIONS.map((option) => option.pathPrefix).filter(Boolean);
  if (
    knownPrefixes.some((candidate) => p === candidate || p.startsWith(`${candidate}/`))
  ) {
    return `${DOCS_ORIGIN}${p}`;
  }

  return `${DOCS_ORIGIN}${prefix}${p}`;
}

export function docsHomeUrl(lang?: string): string {
  return docsUrl('/', lang);
}
