import { defineLocaleBundle } from '@/i18n/core';
import type { FrontendResourceLocale } from '@/i18n/locale-adapter';
const playerBundle = defineLocaleBundle({
    en: {},
    'zh-cn': {},
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
    'zh-cn': playerBundle['zh-cn'],
    en: playerBundle.en,
    es: playerBundle.es,
    de: playerBundle.de,
    fr: playerBundle.fr,
    ru: playerBundle.ru,
    ja: playerBundle.ja,
} satisfies Record<FrontendResourceLocale, PlayerMessages>;
