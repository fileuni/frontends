import { defineLocaleBundle } from '@/i18n/core';
import type { FrontendResourceLocale } from '@/i18n/locale-adapter';

const languagesBundle = defineLocaleBundle({
  en: {
    zh: 'Chinese',
    en: 'English',
    es: 'Spanish',
    de: 'German',
    fr: 'French',
    ru: 'Russian',
    ja: 'Japanese',
    auto: 'Auto',
  },
  'zh-cn': {
    zh: '中文',
    en: 'English',
    es: 'Español',
    de: 'Deutsch',
    fr: 'Français',
    ru: 'Русский',
    ja: '日本語',
    auto: '自动',
  },
  es: {
    zh: 'Chino',
    en: 'Inglés',
    es: 'Español',
    de: 'Alemán',
    fr: 'Francés',
    ru: 'Ruso',
    ja: 'Japonés',
    auto: 'Automático',
  },
  de: {
    zh: 'Chinesisch',
    en: 'Englisch',
    es: 'Spanisch',
    de: 'Deutsch',
    fr: 'Französisch',
    ru: 'Russisch',
    ja: 'Japanisch',
    auto: 'Automatisch',
  },
  fr: {
    zh: 'Chinois',
    en: 'Anglais',
    es: 'Espagnol',
    de: 'Allemand',
    fr: 'Français',
    ru: 'Russe',
    ja: 'Japonais',
    auto: 'Automatique',
  },
  ru: {
    zh: 'Китайский',
    en: 'Английский',
    es: 'Испанский',
    de: 'Немецкий',
    fr: 'Французский',
    ru: 'Русский',
    ja: 'Японский',
    auto: 'Авто',
  },
  ja: {
    zh: '中国語',
    en: '英語',
    es: 'スペイン語',
    de: 'ドイツ語',
    fr: 'フランス語',
    ru: 'ロシア語',
    ja: '日本語',
    auto: '自動',
  },
});

type LanguageLabels = { [Key in keyof (typeof languagesBundle)['en']]: string };

export const languagesByResourceLocale = {
  zh: languagesBundle['zh-cn'],
  en: languagesBundle.en,
  es: languagesBundle.es,
  de: languagesBundle.de,
  fr: languagesBundle.fr,
  ru: languagesBundle.ru,
  ja: languagesBundle.ja,
} satisfies Record<FrontendResourceLocale, LanguageLabels>;
