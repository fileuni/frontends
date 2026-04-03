import { defineLocaleBundle, type LocaleShape } from '@/i18n/core';
import type { FrontendResourceLocale } from '@/i18n/locale-adapter';

const cacheManagerBundle = defineLocaleBundle({
  en: {
    title: 'Cache Manager',
    subtitle: 'Inspect and clear frontend caches in one place. Default actions only affect the current account.',
    managedCacheSize: 'Managed Cache Size',
    totalLocalStorage: 'Total Local Cache (LocalStorage + IndexedDB)',
    managedKeys: '{{count}} managed keys',
    localKeys: '{{count}} local cache keys',
    warningText: 'Cache cleanup only affects local data on this device and does not change server data.',
    scopeCurrentUser: 'Current Account',
    scopeAllUsers: 'All Accounts',
    clearCurrentUser: 'Clear Current Account',
    clearAllUsers: 'Clear All Accounts',
    categoryStats: '{{size}} · {{count}} keys',
    confirmClearCategory: 'Clear {{category}} (scope: {{scope}})?',
    clearSuccess: 'Cleared {{removed}} keys and freed {{size}}',
    clearFailed: 'Failed to clear cache',
    categories: {
      email_address_book: {
        title: 'Address Book Cache',
        desc: 'Temporary email contact book',
      },
      chat_cache: {
        title: 'Chat Cache',
        desc: 'Chat history, nicknames, and session settings',
      },
      file_manager_cache: {
        title: 'File Manager Cache',
        desc: 'Paths, tabs, clipboard, tasks, and local state',
      },
      user_session_cache: {
        title: 'User Session Cache',
        desc: 'Local account map and session tokens',
      },
      extension_cache: {
        title: 'External Tool Cache',
        desc: 'Local settings for external tools and follow-startup panels',
      },
      ui_preferences_cache: {
        title: 'UI Preferences Cache',
        desc: 'Theme, language, and global UI preferences',
      },
    },
  },
  'zh-cn': {
    title: '缓存管理器',
    subtitle: '集中查看和清理前端缓存，默认操作仅影响当前账号。',
    managedCacheSize: '受管缓存',
    totalLocalStorage: '本地缓存总量（LocalStorage + IndexedDB）',
    managedKeys: '{{count}} 个受管 Key',
    localKeys: '{{count}} 个本地缓存 Key',
    warningText: '缓存清理仅在当前设备本地生效，不会影响服务器数据。',
    scopeCurrentUser: '当前账号',
    scopeAllUsers: '所有账号',
    clearCurrentUser: '清理当前账号',
    clearAllUsers: '清理所有账号',
    categoryStats: '占用 {{size}} · {{count}} 个 Key',
    confirmClearCategory: '确认清理 {{category}}（范围：{{scope}}）？',
    clearSuccess: '已清理 {{removed}} 个 Key，释放 {{size}}',
    clearFailed: '缓存清理失败',
    categories: {
      email_address_book: {
        title: '地址薄缓存',
        desc: '邮箱联系人临时地址薄',
      },
      chat_cache: {
        title: '聊天缓存',
        desc: '聊天历史、昵称、会话配置',
      },
      file_manager_cache: {
        title: '文件管理缓存',
        desc: '路径、标签页、剪贴板、任务等本地状态',
      },
      user_session_cache: {
        title: '用户会话缓存',
        desc: '本地登录账户映射与会话令牌',
      },
      extension_cache: {
        title: '外部工具缓存',
        desc: '外部工具与跟随启动面板的本地配置',
      },
      ui_preferences_cache: {
        title: '界面偏好缓存',
        desc: '主题、语言等全局界面偏好',
      },
    },
  },
  es: {
    title: 'Gestor de caché',
    subtitle: 'Revise y limpie las cachés del frontend en un solo lugar. Las acciones predeterminadas solo afectan a la cuenta actual.',
    managedCacheSize: 'Tamaño de caché administrado',
    totalLocalStorage: 'Caché local total (LocalStorage + IndexedDB)',
    managedKeys: '{{count}} claves administradas',
    localKeys: '{{count}} claves de caché local',
    warningText: 'La limpieza de caché solo afecta a los datos locales de este dispositivo y no cambia los datos del servidor.',
    scopeCurrentUser: 'Cuenta actual',
    scopeAllUsers: 'Todas las cuentas',
    clearCurrentUser: 'Limpiar cuenta actual',
    clearAllUsers: 'Limpiar todas las cuentas',
    categoryStats: '{{size}} · {{count}} claves',
    confirmClearCategory: '¿Borrar {{category}} (ámbito: {{scope}})?',
    clearSuccess: 'Se borraron {{removed}} claves y se liberó {{size}}',
    clearFailed: 'No se pudo limpiar la caché',
    categories: {
      email_address_book: {
        title: 'Caché de libreta de direcciones',
        desc: 'Libreta temporal de contactos de correo',
      },
      chat_cache: {
        title: 'Caché de chat',
        desc: 'Historial de chat, apodos y ajustes de sesión',
      },
      file_manager_cache: {
        title: 'Caché del gestor de archivos',
        desc: 'Rutas, pestañas, portapapeles, tareas y estado local',
      },
      user_session_cache: {
        title: 'Caché de sesión de usuario',
        desc: 'Mapa local de cuentas y tokens de sesión',
      },
      extension_cache: {
        title: 'Caché de herramientas externas',
        desc: 'Ajustes locales para herramientas externas y paneles de inicio asociado',
      },
      ui_preferences_cache: {
        title: 'Caché de preferencias de interfaz',
        desc: 'Tema, idioma y preferencias globales de la interfaz',
      },
    },
  },
  de: {
    title: 'Cache-Manager',
    subtitle: 'Überprüfen und löschen Sie Frontend-Caches an einem Ort. Standardaktionen betreffen nur das aktuelle Konto.',
    managedCacheSize: 'Verwaltete Cache-Größe',
    totalLocalStorage: 'Gesamt lokaler Cache (LocalStorage + IndexedDB)',
    managedKeys: '{{count}} verwaltete Schlüssel',
    localKeys: '{{count}} lokale Cache-Schlüssel',
    warningText: 'Cache-Bereinigung betrifft nur lokale Daten auf diesem Gerät und ändert keine Serverdaten.',
    scopeCurrentUser: 'Aktuelles Konto',
    scopeAllUsers: 'Alle Konten',
    clearCurrentUser: 'Aktuelles Konto löschen',
    clearAllUsers: 'Alle Konten löschen',
    categoryStats: '{{size}} · {{count}} Schlüssel',
    confirmClearCategory: '{{category}} löschen (Bereich: {{scope}})?',
    clearSuccess: '{{removed}} Schlüssel gelöscht und {{size}} freigegeben',
    clearFailed: 'Cache konnte nicht gelöscht werden',
    categories: {
      email_address_book: {
        title: 'Adressbuch-Cache',
        desc: 'Temporäres E-Mail-Kontaktbuch',
      },
      chat_cache: {
        title: 'Chat-Cache',
        desc: 'Chatverlauf, Spitznamen und Sitzungseinstellungen',
      },
      file_manager_cache: {
        title: 'Dateimanager-Cache',
        desc: 'Pfade, Tabs, Zwischenablage, Aufgaben und lokaler Zustand',
      },
      user_session_cache: {
        title: 'Benutzersitzungs-Cache',
        desc: 'Lokale Kontozuordnung und Sitzungstoken',
      },
      extension_cache: {
        title: 'Cache für externe Tools',
        desc: 'Lokale Einstellungen für externe Tools und die Mitstart-Panels',
      },
      ui_preferences_cache: {
        title: 'UI-Einstellungs-Cache',
        desc: 'Design, Sprache und globale UI-Einstellungen',
      },
    },
  },
  fr: {
    title: 'Gestionnaire de cache',
    subtitle: 'Inspectez et videz les caches du frontend depuis un seul endroit. Les actions par défaut n’affectent que le compte actuel.',
    managedCacheSize: 'Taille du cache géré',
    totalLocalStorage: 'Cache local total (LocalStorage + IndexedDB)',
    managedKeys: '{{count}} clés gérées',
    localKeys: '{{count}} clés de cache local',
    warningText: 'Le nettoyage du cache ne touche que les données locales de cet appareil et ne modifie pas les données du serveur.',
    scopeCurrentUser: 'Compte actuel',
    scopeAllUsers: 'Tous les comptes',
    clearCurrentUser: 'Effacer le compte actuel',
    clearAllUsers: 'Effacer tous les comptes',
    categoryStats: '{{size}} · {{count}} clés',
    confirmClearCategory: 'Effacer {{category}} (portée : {{scope}}) ?',
    clearSuccess: '{{removed}} clés effacées et {{size}} libéré',
    clearFailed: 'Impossible d’effacer le cache',
    categories: {
      email_address_book: {
        title: 'Cache du carnet d’adresses',
        desc: 'Carnet temporaire des contacts e-mail',
      },
      chat_cache: {
        title: 'Cache de chat',
        desc: 'Historique, pseudonymes et paramètres de session',
      },
      file_manager_cache: {
        title: 'Cache du gestionnaire de fichiers',
        desc: 'Chemins, onglets, presse-papiers, tâches et état local',
      },
      user_session_cache: {
        title: 'Cache de session utilisateur',
        desc: 'Carte locale des comptes et jetons de session',
      },
      extension_cache: {
        title: 'Cache des outils externes',
        desc: 'Paramètres locaux des outils externes et des panneaux de démarrage lié',
      },
      ui_preferences_cache: {
        title: 'Cache des préférences UI',
        desc: 'Thème, langue et préférences globales de l’interface',
      },
    },
  },
  ru: {
    title: 'Менеджер кэша',
    subtitle: 'Просматривайте и очищайте кэш фронтенда в одном месте. Действия по умолчанию затрагивают только текущую учетную запись.',
    managedCacheSize: 'Размер управляемого кэша',
    totalLocalStorage: 'Общий локальный кэш (LocalStorage + IndexedDB)',
    managedKeys: '{{count}} управляемых ключей',
    localKeys: '{{count}} локальных ключей кэша',
    warningText: 'Очистка кэша затрагивает только локальные данные на этом устройстве и не изменяет данные сервера.',
    scopeCurrentUser: 'Текущая учетная запись',
    scopeAllUsers: 'Все учетные записи',
    clearCurrentUser: 'Очистить текущую учетную запись',
    clearAllUsers: 'Очистить все учетные записи',
    categoryStats: '{{size}} · {{count}} ключей',
    confirmClearCategory: 'Очистить {{category}} (область: {{scope}})?',
    clearSuccess: 'Удалено {{removed}} ключей и освобождено {{size}}',
    clearFailed: 'Не удалось очистить кэш',
    categories: {
      email_address_book: {
        title: 'Кэш адресной книги',
        desc: 'Временная адресная книга почтовых контактов',
      },
      chat_cache: {
        title: 'Кэш чата',
        desc: 'История чата, псевдонимы и настройки сессий',
      },
      file_manager_cache: {
        title: 'Кэш файлового менеджера',
        desc: 'Пути, вкладки, буфер обмена, задачи и локальное состояние',
      },
      user_session_cache: {
        title: 'Кэш пользовательской сессии',
        desc: 'Локальная карта аккаунтов и токены сессий',
      },
      extension_cache: {
        title: 'Кэш внешних инструментов',
        desc: 'Локальные настройки внешних инструментов и панелей автозапуска',
      },
      ui_preferences_cache: {
        title: 'Кэш настроек интерфейса',
        desc: 'Тема, язык и глобальные настройки интерфейса',
      },
    },
  },
  ja: {
    title: 'キャッシュマネージャー',
    subtitle: 'フロントエンドのキャッシュを一か所で確認して削除できます。既定の操作は現在のアカウントだけに適用されます。',
    managedCacheSize: '管理対象キャッシュサイズ',
    totalLocalStorage: 'ローカルキャッシュ総量（LocalStorage + IndexedDB）',
    managedKeys: '{{count}} 個の管理対象キー',
    localKeys: '{{count}} 個のローカルキャッシュキー',
    warningText: 'キャッシュの削除はこの端末のローカルデータにのみ影響し、サーバーデータは変更しません。',
    scopeCurrentUser: '現在のアカウント',
    scopeAllUsers: 'すべてのアカウント',
    clearCurrentUser: '現在のアカウントを削除',
    clearAllUsers: 'すべてのアカウントを削除',
    categoryStats: '{{size}} · {{count}} キー',
    confirmClearCategory: '{{category}} を削除しますか？（範囲: {{scope}}）',
    clearSuccess: '{{removed}} 個のキーを削除し、{{size}} を解放しました',
    clearFailed: 'キャッシュの削除に失敗しました',
    categories: {
      email_address_book: {
        title: 'アドレス帳キャッシュ',
        desc: '一時的なメール連絡先アドレス帳',
      },
      chat_cache: {
        title: 'チャットキャッシュ',
        desc: 'チャット履歴、ニックネーム、セッション設定',
      },
      file_manager_cache: {
        title: 'ファイルマネージャーキャッシュ',
        desc: 'パス、タブ、クリップボード、タスク、ローカル状態',
      },
      user_session_cache: {
        title: 'ユーザーセッションキャッシュ',
        desc: 'ローカルアカウントマップとセッショントークン',
      },
      extension_cache: {
        title: '外部ツールキャッシュ',
        desc: '外部ツールと連動起動パネルのローカル設定',
      },
      ui_preferences_cache: {
        title: 'UI 設定キャッシュ',
        desc: 'テーマ、言語、グローバル UI 設定',
      },
    },
  },
});

type CacheManagerMessages = LocaleShape<(typeof cacheManagerBundle)['en']>;

export const cacheManagerByResourceLocale = {
  zh: cacheManagerBundle['zh-cn'],
  en: cacheManagerBundle.en,
  es: cacheManagerBundle.es,
  de: cacheManagerBundle.de,
  fr: cacheManagerBundle.fr,
  ru: cacheManagerBundle.ru,
  ja: cacheManagerBundle.ja,
} satisfies Record<FrontendResourceLocale, CacheManagerMessages>;
