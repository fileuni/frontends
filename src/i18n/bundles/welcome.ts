import { defineLocaleBundle } from '@/i18n/core';
import type { FrontendResourceLocale } from '@/i18n/locale-adapter';

const welcomeBundle = defineLocaleBundle({
  en: {
    title: 'Welcome to FileUni',
    subtitle: 'Start your beautiful day',
    getStarted: 'Login',
    apiDoc: 'API Documentation',
    userCenter: 'User Center',
    fileManager: 'File Manager',
    cacheManager: 'Cache management and cleanup',
  },
  'zh-cn': {
    title: '欢迎使用 FileUni',
    subtitle: '开启美好的一天',
    getStarted: '登录',
    apiDoc: 'API 文档',
    userCenter: '个人中心',
    fileManager: '文件管理',
    cacheManager: '缓存管理与清理',
  },
  es: {
    title: 'Bienvenido a FileUni',
    subtitle: 'Comience su hermoso día',
    getStarted: 'Iniciar sesión',
    apiDoc: 'Documentación de API',
    userCenter: 'Centro de usuario',
    fileManager: 'Gestor de archivos',
    cacheManager: 'Gestión y limpieza de caché',
  },
  de: {
    title: 'Willkommen bei FileUni',
    subtitle: 'Starten Sie Ihren schönen Tag',
    getStarted: 'Anmelden',
    apiDoc: 'API-Dokumentation',
    userCenter: 'Benutzerzentrum',
    fileManager: 'Dateimanager',
    cacheManager: 'Cache-Verwaltung und Bereinigung',
  },
  fr: {
    title: 'Bienvenue sur FileUni',
    subtitle: 'Commencez votre belle journée',
    getStarted: 'Se connecter',
    apiDoc: 'Documentation API',
    userCenter: 'Centre utilisateur',
    fileManager: 'Gestionnaire de fichiers',
    cacheManager: 'Gestion et nettoyage du cache',
  },
  ru: {
    title: 'Добро пожаловать в FileUni',
    subtitle: 'Начните свой прекрасный день',
    getStarted: 'Войти',
    apiDoc: 'Документация API',
    userCenter: 'Центр пользователя',
    fileManager: 'Файловый менеджер',
    cacheManager: 'Управление и очистка кэша',
  },
  ja: {
    title: 'FileUniへようこそ',
    subtitle: '素晴らしい一日を始めましょう',
    getStarted: 'ログイン',
    apiDoc: 'APIドキュメント',
    userCenter: 'ユーザーセンター',
    fileManager: 'ファイルマネージャー',
    cacheManager: 'キャッシュの管理とクリーンアップ',
  },
});

type WelcomeMessages = { [Key in keyof (typeof welcomeBundle)['en']]: string };

export const welcomeByResourceLocale = {
  zh: welcomeBundle['zh-cn'],
  en: welcomeBundle.en,
  es: welcomeBundle.es,
  de: welcomeBundle.de,
  fr: welcomeBundle.fr,
  ru: welcomeBundle.ru,
  ja: welcomeBundle.ja,
} satisfies Record<FrontendResourceLocale, WelcomeMessages>;
