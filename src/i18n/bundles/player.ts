import { defineLocaleBundle } from '@/i18n/core';
import type { FrontendResourceLocale } from '@/i18n/locale-adapter';

const playerBundle = defineLocaleBundle({
  en: {
    playlist: 'Playlist',
    nowPlaying: 'Now Playing',
    subtitlesOff: 'Off',
  },
  'zh-cn': {
    playlist: '播放列表',
    nowPlaying: '正在播放',
    subtitlesOff: '关闭字幕',
  },
  es: {
    playlist: 'Lista de reproducción',
    nowPlaying: 'Reproduciendo ahora',
    subtitlesOff: 'Desactivados',
  },
  de: {
    playlist: 'Wiedergabeliste',
    nowPlaying: 'Jetzt läuft',
    subtitlesOff: 'Aus',
  },
  fr: {
    playlist: 'Liste de lecture',
    nowPlaying: 'Lecture en cours',
    subtitlesOff: 'Désactivés',
  },
  ru: {
    playlist: 'Плейлист',
    nowPlaying: 'Сейчас воспроизводится',
    subtitlesOff: 'Выключены',
  },
  ja: {
    playlist: '再生リスト',
    nowPlaying: '再生中',
    subtitlesOff: 'オフ',
  },
});

type PlayerMessages = { [Key in keyof (typeof playerBundle)['en']]: string };

export const playerByResourceLocale = {
  'zh-cn': playerBundle['zh-cn'],
  en: playerBundle.en,
  es: playerBundle.es,
  de: playerBundle.de,
  fr: playerBundle.fr,
  ru: playerBundle.ru,
  ja: playerBundle.ja,
} satisfies Record<FrontendResourceLocale, PlayerMessages>;
