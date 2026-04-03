import { defineLocaleBundle, type LocaleShape } from '@/i18n/core';
import type { FrontendResourceLocale } from '@/i18n/locale-adapter';

const tosBundle = defineLocaleBundle({
  en: {
    title: 'Terms of Service',
    backToWorkspace: 'Back to Workspace',
    acceptableUse: {
      title: 'Acceptable Use',
      content: 'You agree to use FileUni only for lawful purposes. You are responsible for all activities occurring under your account.',
    },
    termination: {
      title: 'Termination',
      content: 'We reserve the right to suspend accounts found to be in violation of system integrity or engaged in malicious scraping.',
    },
    disclaimers: {
      title: 'Disclaimers',
      content: 'FileUni is provided "as is". While we aim for 99.9% uptime, we recommend maintaining external backups for critical data.',
    },
  },
  'zh-cn': {
    title: '服务协议',
    backToWorkspace: '返回工作区',
    acceptableUse: {
      title: '可接受使用',
      content: '您同意仅将 FileUni 用于合法目的。您对您账户下发生的所有活动负责。',
    },
    termination: {
      title: '终止条款',
      content: '我们保留暂停违反系统完整性或从事恶意抓取的账户的权利。',
    },
    disclaimers: {
      title: '免责声明',
      content: 'FileUni 按"原样"提供。虽然我们致力于 99.9% 的正常运行时间，但我们建议为关键数据维护外部备份。',
    },
  },
  es: {
    title: 'Términos de servicio',
    backToWorkspace: 'Volver al espacio de trabajo',
    acceptableUse: {
      title: 'Uso aceptable',
      content: 'Usted acepta usar FileUni solo con fines legales. Usted es responsable de todas las actividades realizadas con su cuenta.',
    },
    termination: {
      title: 'Terminación',
      content: 'Nos reservamos el derecho de suspender cuentas que infrinjan la integridad del sistema o participen en scraping malicioso.',
    },
    disclaimers: {
      title: 'Descargos de responsabilidad',
      content: 'FileUni se proporciona "tal cual". Aunque buscamos un 99,9% de disponibilidad, recomendamos mantener copias de seguridad externas de los datos críticos.',
    },
  },
  de: {
    title: 'Nutzungsbedingungen',
    backToWorkspace: 'Zurück zum Arbeitsbereich',
    acceptableUse: {
      title: 'Zulässige Nutzung',
      content: 'Sie stimmen zu, FileUni nur für rechtmäßige Zwecke zu verwenden. Sie sind für alle Aktivitäten verantwortlich, die unter Ihrem Konto stattfinden.',
    },
    termination: {
      title: 'Kündigung',
      content: 'Wir behalten uns das Recht vor, Konten zu sperren, die gegen die Systemintegrität verstoßen oder böswilliges Scraping betreiben.',
    },
    disclaimers: {
      title: 'Haftungsausschluss',
      content: 'FileUni wird "wie besehen" bereitgestellt. Obwohl wir eine Betriebszeit von 99,9% anstreben, empfehlen wir, externe Backups für kritische Daten zu pflegen.',
    },
  },
  fr: {
    title: 'Conditions d\'utilisation',
    backToWorkspace: 'Retour à l\'espace de travail',
    acceptableUse: {
      title: 'Utilisation acceptable',
      content: 'Vous acceptez d\'utiliser FileUni uniquement à des fins légales. Vous êtes responsable de toutes les activités effectuées sous votre compte.',
    },
    termination: {
      title: 'Résiliation',
      content: 'Nous nous réservons le droit de suspendre les comptes qui enfreignent l\'intégrité du système ou qui se livrent à du scraping malveillant.',
    },
    disclaimers: {
      title: 'Avertissements',
      content: 'FileUni est fourni "tel quel". Bien que nous visons une disponibilité de 99,9 %, nous recommandons de conserver des sauvegardes externes pour les données critiques.',
    },
  },
  ru: {
    title: 'Условия использования',
    backToWorkspace: 'Вернуться в рабочее пространство',
    acceptableUse: {
      title: 'Допустимое использование',
      content: 'Вы соглашаетесь использовать FileUni только в законных целях. Вы несете ответственность за все действия, выполняемые под вашей учетной записью.',
    },
    termination: {
      title: 'Прекращение',
      content: 'Мы оставляем за собой право приостанавливать учетные записи, нарушающие целостность системы или занимающиеся вредоносным скрейпингом.',
    },
    disclaimers: {
      title: 'Отказ от ответственности',
      content: 'FileUni предоставляется "как есть". Хотя мы стремимся к доступности 99,9%, мы рекомендуем хранить внешние резервные копии важных данных.',
    },
  },
  ja: {
    title: '利用規約',
    backToWorkspace: 'ワークスペースに戻る',
    acceptableUse: {
      title: '許容される使用',
      content: 'FileUni を合法的な目的でのみ使用することに同意します。アカウントで行われるすべての活動について責任を負います。',
    },
    termination: {
      title: '終了',
      content: 'システムの整合性に違反した、または悪意のあるスクレイピングに関与したと判断されたアカウントを停止する権利を留保します。',
    },
    disclaimers: {
      title: '免責事項',
      content: 'FileUni は"現状のまま"提供されます。稼働率 99.9% を目指していますが、重要なデータについては外部バックアップの維持を推奨します。',
    },
  },
});

type TosMessages = LocaleShape<(typeof tosBundle)['en']>;

export const tosByResourceLocale = {
  'zh-cn': tosBundle['zh-cn'],
  en: tosBundle.en,
  es: tosBundle.es,
  de: tosBundle.de,
  fr: tosBundle.fr,
  ru: tosBundle.ru,
  ja: tosBundle.ja,
} satisfies Record<FrontendResourceLocale, TosMessages>;
