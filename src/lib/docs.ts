import i18next from '@/lib/i18n';

const DOCS_ORIGIN = 'https://docs.fileuni.com';

type DocsLocalePrefix = '' | '/zh-cn' | '/es' | '/de' | '/fr' | '/ru' | '/ja';

const resolveDocsLocalePrefix = (lang: string | undefined): DocsLocalePrefix => {
  const raw = (lang || '').toLowerCase();
  const base = raw.split('-')[0] || '';

  const map: Record<string, DocsLocalePrefix> = {
    zh: '/zh-cn',
    es: '/es',
    de: '/de',
    fr: '/fr',
    ru: '/ru',
    ja: '/ja',
  };
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
  if (p === '/zh-cn' || p.startsWith('/zh-cn/')) {
    return `${DOCS_ORIGIN}${p}`;
  }

  return `${DOCS_ORIGIN}${prefix}${p}`;
}

export function docsHomeUrl(lang?: string): string {
  return docsUrl('/', lang);
}
