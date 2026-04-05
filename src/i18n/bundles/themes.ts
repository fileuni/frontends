import { defineLocaleBundle } from '@/i18n/core';
import type { FrontendResourceLocale } from '@/i18n/locale-adapter';
const themesBundle = defineLocaleBundle({
    en: {
        light: 'Light',
        dark: 'Dark',
        system: 'System'
    },
    'zh-CN': {
        light: '明亮',
        dark: '暗黑',
        system: '系统'
    },
    es: {
        light: 'Claro',
        dark: 'Oscuro',
        system: 'Sistema'
    },
    de: {
        light: 'Hell',
        dark: 'Dunkel',
        system: 'System'
    },
    fr: {
        light: 'Clair',
        dark: 'Sombre',
        system: 'Système'
    },
    ru: {
        light: 'Светлая',
        dark: 'Темная',
        system: 'Система'
    },
    ja: {
        light: 'ライト',
        dark: 'ダーク',
        system: 'システム'
    }
});
type ThemeLabels = {
    [Key in keyof (typeof themesBundle)['en']]: string;
};
export const themesByResourceLocale = {
    'zh-CN': themesBundle['zh-CN'],
    'zh-Hant': themesBundle['zh-CN'],
    en: themesBundle.en,
    es: themesBundle.es,
    de: themesBundle.de,
    fr: themesBundle.fr,
    ru: themesBundle.ru,
    ja: themesBundle.ja,
} satisfies Record<FrontendResourceLocale, ThemeLabels>;
