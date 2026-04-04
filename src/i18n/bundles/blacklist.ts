import { defineLocaleBundle } from '@/i18n/core';
import type { FrontendResourceLocale } from '@/i18n/locale-adapter';

const blacklistBundle = defineLocaleBundle({
  en: {
    noReason: 'No reason provided',
  },
  'zh-cn': {
    noReason: '未提供原因',
  },
  es: {
    noReason: 'Sin motivo proporcionado',
  },
  de: {
    noReason: 'Kein Grund angegeben',
  },
  fr: {
    noReason: 'Aucune raison fournie',
  },
  ru: {
    noReason: 'Причина не указана',
  },
  ja: {
    noReason: '理由は未入力です',
  },
});

type BlacklistMessages = { [Key in keyof (typeof blacklistBundle)['en']]: string };

export const blacklistByResourceLocale = {
  'zh-cn': blacklistBundle['zh-cn'],
  en: blacklistBundle.en,
  es: blacklistBundle.es,
  de: blacklistBundle.de,
  fr: blacklistBundle.fr,
  ru: blacklistBundle.ru,
  ja: blacklistBundle.ja,
} satisfies Record<FrontendResourceLocale, BlacklistMessages>;
