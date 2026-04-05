import { defineLocaleBundle } from '@/i18n/core';
import type { FrontendResourceLocale } from '@/i18n/locale-adapter';
const playerBundle = defineLocaleBundle({
    en: {},
    'zh-CN': {},
    es: {},
    de: {},
    fr: {},
    ru: {},
    ja: {}
});
type PlayerMessages = {
    [Key in keyof (typeof playerBundle)['en']]: string;
};
export const playerByResourceLocale = {
    'zh-CN': playerBundle['zh-CN'],
    'zh-Hant': playerBundle['zh-CN'],
    en: playerBundle.en,
    es: playerBundle.es,
    de: playerBundle.de,
    fr: playerBundle.fr,
    ru: playerBundle.ru,
    ja: playerBundle.ja,
} satisfies Record<FrontendResourceLocale, PlayerMessages>;
