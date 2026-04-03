import { defineLocaleBundle } from '@/i18n/core';
import type { FrontendResourceLocale } from '@/i18n/locale-adapter';

const themesBundle = defineLocaleBundle({
  en: {
    light: 'Light',
    dark: 'Dark',
    auto: 'Auto',
    system: 'System',
  },
  'zh-cn': {
    light: '明亮',
    dark: '暗黑',
    auto: '自动',
    system: '系统',
  },
  es: {
    light: 'Claro',
    dark: 'Oscuro',
    auto: 'Automático',
    system: 'Sistema',
  },
  de: {
    light: 'Hell',
    dark: 'Dunkel',
    auto: 'Automatisch',
    system: 'System',
  },
  fr: {
    light: 'Clair',
    dark: 'Sombre',
    auto: 'Automatique',
    system: 'Système',
  },
  ru: {
    light: 'Светлая',
    dark: 'Темная',
    auto: 'Авто',
    system: 'Система',
  },
  ja: {
    light: 'ライト',
    dark: 'ダーク',
    auto: '自動',
    system: 'システム',
  },
});

type ThemeLabels = { [Key in keyof (typeof themesBundle)['en']]: string };

export const themesByResourceLocale = {
  'zh-cn': themesBundle['zh-cn'],
  en: themesBundle.en,
  es: themesBundle.es,
  de: themesBundle.de,
  fr: themesBundle.fr,
  ru: themesBundle.ru,
  ja: themesBundle.ja,
} satisfies Record<FrontendResourceLocale, ThemeLabels>;
