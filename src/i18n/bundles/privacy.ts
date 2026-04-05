import { defineLocaleBundle, type LocaleShape } from '@/i18n/core';
import type { FrontendResourceLocale } from '@/i18n/locale-adapter';

const privacyBundle = defineLocaleBundle({
  en: {
    title: 'Privacy Policy',
    backToWorkspace: 'Back to Workspace',
    dataCollection: {
      title: 'Data Collection',
      content: 'We only collect essential data required for account management and file storage synchronization. This includes your username, encrypted credentials, and access logs for security auditing.',
    },
    storageSecurity: {
      title: 'Storage Security',
      content: 'Your files are stored in your selected backend nodes (S3, Local, etc.) with strict access control. We never inspect the contents of your files unless explicitly requested for technical support.',
    },
    cookieUsage: {
      title: 'Cookie Usage',
      content: 'We use local persistent storage (StorageHub: LocalStorage + IndexedDB) to remember theme preferences, language settings, and active session tokens.',
    },
  },
  'zh-CN': {
    title: '隐私政策',
    backToWorkspace: '返回工作区',
    dataCollection: {
      title: '数据收集',
      content: '我们仅收集账户管理和文件存储同步所需的基本数据。这包括您的用户名、加密凭据和安全审计的访问日志。',
    },
    storageSecurity: {
      title: '存储安全',
      content: '您的文件存储在您选择的后端节点（S3、本地等）中，具有严格的访问控制。除非明确要求技术支持，否则我们绝不会检查您的文件内容。',
    },
    cookieUsage: {
      title: 'Cookie 使用',
      content: '我们使用本地持久化存储（StorageHub：LocalStorage + IndexedDB）来记住您的主题偏好、语言设置和活动会话令牌。',
    },
  },
  es: {
    title: 'Política de privacidad',
    backToWorkspace: 'Volver al espacio de trabajo',
    dataCollection: {
      title: 'Recopilación de datos',
      content: 'Solo recopilamos los datos esenciales necesarios para la gestión de cuentas y la sincronización del almacenamiento de archivos. Esto incluye su nombre de usuario, credenciales cifradas y registros de acceso para auditoría de seguridad.',
    },
    storageSecurity: {
      title: 'Seguridad de almacenamiento',
      content: 'Sus archivos se almacenan en los nodos backend que elija (S3, local, etc.) con un control de acceso estricto. Nunca inspeccionamos el contenido de sus archivos a menos que lo solicite explícitamente para soporte técnico.',
    },
    cookieUsage: {
      title: 'Uso de cookies',
      content: 'Usamos almacenamiento persistente local (StorageHub: LocalStorage + IndexedDB) para recordar preferencias de tema, configuración de idioma y tokens de sesión activos.',
    },
  },
  de: {
    title: 'Datenschutzrichtlinie',
    backToWorkspace: 'Zurück zum Arbeitsbereich',
    dataCollection: {
      title: 'Datenerfassung',
      content: 'Wir erfassen nur wichtige Daten, die für die Kontoverwaltung und Dateispeichersynchronisation erforderlich sind. Dazu gehören Ihr Benutzername, verschlüsselte Anmeldedaten und Zugriffsprotokolle für die Sicherheitsüberwachung.',
    },
    storageSecurity: {
      title: 'Speichersicherheit',
      content: 'Ihre Dateien werden in Ihren ausgewählten Backend-Knoten (S3, Lokal usw.) mit strenger Zugriffskontrolle gespeichert. Wir prüfen niemals den Inhalt Ihrer Dateien, es sei denn, dies wird ausdrücklich für den technischen Support angefordert.',
    },
    cookieUsage: {
      title: 'Cookie-Nutzung',
      content: 'Wir verwenden lokalen persistenten Speicher (StorageHub: LocalStorage + IndexedDB), um Design-Einstellungen, Spracheinstellungen und aktive Sitzungstoken zu speichern.',
    },
  },
  fr: {
    title: 'Politique de confidentialité',
    backToWorkspace: 'Retour à l\'espace de travail',
    dataCollection: {
      title: 'Collecte de données',
      content: 'Nous ne collectons que les données essentielles nécessaires à la gestion des comptes et à la synchronisation du stockage de fichiers. Cela inclut votre nom d\'utilisateur, des identifiants chiffrés et des journaux d\'accès à des fins d\'audit de sécurité.',
    },
    storageSecurity: {
      title: 'Sécurité du stockage',
      content: 'Vos fichiers sont stockés sur les nœuds backend que vous avez sélectionnés (S3, Local, etc.) avec un contrôle d\'accès strict. Nous n\'inspectons jamais le contenu de vos fichiers, sauf demande explicite pour le support technique.',
    },
    cookieUsage: {
      title: 'Utilisation des cookies',
      content: 'Nous utilisons un stockage persistant local (StorageHub : LocalStorage + IndexedDB) pour mémoriser les préférences de thème, les paramètres de langue et les jetons de session actifs.',
    },
  },
  ru: {
    title: 'Политика конфиденциальности',
    backToWorkspace: 'Вернуться в рабочее пространство',
    dataCollection: {
      title: 'Сбор данных',
      content: 'Мы собираем только необходимые данные для управления аккаунтом и синхронизации хранилища файлов. Это включает имя пользователя, зашифрованные учетные данные и журналы доступа для аудита безопасности.',
    },
    storageSecurity: {
      title: 'Безопасность хранилища',
      content: 'Ваши файлы хранятся на выбранных вами бэкенд-узлах (S3, Local и т. д.) со строгим контролем доступа. Мы никогда не просматриваем содержимое ваших файлов, если вы явно не запросите это для технической поддержки.',
    },
    cookieUsage: {
      title: 'Использование файлов cookie',
      content: 'Мы используем локальное постоянное хранилище (StorageHub: LocalStorage + IndexedDB), чтобы запоминать настройки темы, языка и активные токены сеанса.',
    },
  },
  ja: {
    title: 'プライバシーポリシー',
    backToWorkspace: 'ワークスペースに戻る',
    dataCollection: {
      title: 'データ収集',
      content: '当社は、アカウント管理とファイルストレージの同期に必要な最小限のデータのみを収集します。これには、ユーザー名、暗号化された認証情報、およびセキュリティ監査のためのアクセスログが含まれます。',
    },
    storageSecurity: {
      title: 'ストレージセキュリティ',
      content: 'ファイルは、厳格なアクセス制御の下で、選択したバックエンドノード（S3、ローカルなど）に保存されます。技術サポートのために明示的に依頼された場合を除き、ファイル内容を確認することはありません。',
    },
    cookieUsage: {
      title: 'Cookieの使用',
      content: 'テーマ設定、言語設定、アクティブなセッショントークンを記憶するために、ローカルの永続ストレージ（StorageHub: LocalStorage + IndexedDB）を使用します。',
    },
  },
});

type PrivacyMessages = LocaleShape<(typeof privacyBundle)['en']>;

export const privacyByResourceLocale = {
  'zh-CN': privacyBundle['zh-CN'],
  'zh-Hant': privacyBundle['zh-Hant'],
  en: privacyBundle.en,
  es: privacyBundle.es,
  de: privacyBundle.de,
  fr: privacyBundle.fr,
  ru: privacyBundle.ru,
  ja: privacyBundle.ja,
} satisfies Record<FrontendResourceLocale, PrivacyMessages>;
