import { defineLocaleBundle, type LocaleShape } from '@/i18n/core';
import type { FrontendResourceLocale } from '@/i18n/locale-adapter';

import { mergeLocale } from './_mergeLocale';

const pagesEn = {
  "tos": {
    "title": "Terms of Service"
  },
  "privacy": {
    "title": "Privacy Policy"
  },
  "admin": {
    "userCreate": {
      "title": "Create User",
      "provisionIdentity": "Provision Identity",
      "manualAccountCreation": "Manual Account Creation",
      "username": "Username",
      "usernamePlaceholder": "Unique identifier",
      "fullName": "Full Name",
      "fullNamePlaceholder": "Display name",
      "initialPassword": "Initial Password",
      "passwordPlaceholder": "Min 6 characters",
      "confirmPassword": "Confirm Password",
      "confirmPasswordPlaceholder": "Repeat password",
      "role": "Role",
      "regularUser": "Regular User",
      "systemAdministrator": "System Administrator",
      "status": "Status",
      "active": "Active",
      "inactive": "Inactive",
      "banned": "Banned",
      "email": "Email",
      "emailPlaceholder": "Optional email",
      "phone": "Phone",
      "phonePlaceholder": "Optional phone number",
      "createUser": "Create User",
      "createSuccess": "New user created successfully"
    },
    "userEdit": {
      "title": "Edit User"
    },
    "settings": {
      "title": "System Settings"
    },
    "permissions": {
      "title": "Permission Management",
      
    },
    "fs": {
      "title": "File System Management"
    },
    "web": {
      
    },
    "tasks": {
      
    },
    "users": {
      "title": "Users"
    }
  },
  "index": {
    "title": "FileUni - High-performance modular system"
  },
  "user": {
    "welcome": {
      "title": "Dashboard"
    },
    "profile": {
      "title": "Profile"
    },
    "sessions": {
      "title": "Sessions"
    },
    "security": {
      "title": "Security"
    },
    "cache": {
      "title": "Cache Manager"
    },
    "shares": {
      "title": "My Shares"
    }
  },
} as const;

const pagesBundle = defineLocaleBundle({
  en: pagesEn,
  'zh-CN': mergeLocale(pagesEn, {
    "tos": { "title": "服务协议" },
    "privacy": { "title": "隐私政策" },
    "admin": {
      "userCreate": {
        "title": "创建用户",
        "provisionIdentity": "配置身份",
        "manualAccountCreation": "手动创建账户",
        "username": "用户名",
        "usernamePlaceholder": "唯一标识符",
        "fullName": "完整名称",
        "fullNamePlaceholder": "显示名称",
        "initialPassword": "初始密码",
        "passwordPlaceholder": "最少 6 个字符",
        "confirmPassword": "确认密码",
        "confirmPasswordPlaceholder": "重复密码",
        "role": "角色",
        "regularUser": "普通用户",
        "systemAdministrator": "系统管理员",
        "status": "状态",
        "active": "活跃",
        "inactive": "未激活",
        "banned": "已禁封",
        "email": "邮箱",
        "emailPlaceholder": "可选邮箱",
        "phone": "手机",
        "phonePlaceholder": "可选手机号码",
        "createUser": "创建用户",
        "createSuccess": "新用户创建成功"
      },
      "userEdit": {
        "title": "编辑用户"
      },
      "settings": {
        "title": "系统配置"
      },
      "permissions": {
        "title": "权限管理"
      },
      "fs": {
        "title": "文件系统管理"
      },
      "web": {
        
      },
      "tasks": {
        
      },
      "users": {
        "title": "用户管理"
      }
    },
    "index": { "title": "FileUni - 高性能模块化系统" },
    "user": {
      "welcome": { "title": "控制台" },
      "profile": { "title": "个人资料" },
      "sessions": { "title": "会话管理" },
      "security": { "title": "安全中心" },
      "cache": { "title": "缓存管理" },
      "shares": { "title": "我的分享" }
    }
  }),
  es: mergeLocale(pagesEn, {
    "tos": { "title": "Términos de servicio" },
    "privacy": { "title": "Política de privacidad" },
    "admin": {
      "userCreate": {
        "title": "Crear usuario",
        "provisionIdentity": "Aprovisionar identidad",
        "manualAccountCreation": "Creación manual de cuenta",
        "username": "Usuario",
        "usernamePlaceholder": "Identificador único",
        "fullName": "Nombre completo",
        "fullNamePlaceholder": "Nombre para mostrar",
        "initialPassword": "Contraseña inicial",
        "passwordPlaceholder": "Mín. 6 caracteres",
        "confirmPassword": "Confirmar contraseña",
        "confirmPasswordPlaceholder": "Repita la contraseña",
        "role": "Rol",
        "regularUser": "Usuario normal",
        "systemAdministrator": "Administrador del sistema",
        "status": "Estado",
        "active": "Activa",
        "inactive": "Inactiva",
        "banned": "Bloqueada",
        "email": "Correo",
        "emailPlaceholder": "Correo opcional",
        "phone": "Teléfono",
        "phonePlaceholder": "Número opcional",
        "createUser": "Crear usuario",
        "createSuccess": "Usuario creado correctamente"
      },
      "userEdit": { "title": "Editar usuario" },
      "settings": { "title": "Ajustes del sistema" },
      "permissions": {
        "title": "Gestión de permisos"
      },
      "fs": {
        "title": "Gestión del sistema de archivos"
      },
      "web": {},
      "tasks": {},
      "users": { "title": "Usuarios" }
    },
    "index": { "title": "FileUni - Sistema modular de alto rendimiento" },
    "user": {
      "welcome": { "title": "Panel de control" },
      "profile": { "title": "Perfil" },
      "sessions": { "title": "Sesiones" },
      "security": { "title": "Seguridad" },
      "cache": { "title": "Gestor de caché" },
      "shares": { "title": "Mis compartidos" }
    },
  }),
  de: mergeLocale(pagesEn, {
    "tos": { "title": "Nutzungsbedingungen" },
    "privacy": { "title": "Datenschutzrichtlinie" },
    "admin": {
      "userCreate": {
        "title": "Benutzer erstellen",
        "provisionIdentity": "Identität bereitstellen",
        "manualAccountCreation": "Manuelle Kontoerstellung",
        "username": "Benutzername",
        "usernamePlaceholder": "Eindeutiger Bezeichner",
        "fullName": "Vollständiger Name",
        "fullNamePlaceholder": "Anzeigename",
        "initialPassword": "Anfangspasswort",
        "passwordPlaceholder": "Mindestens 6 Zeichen",
        "confirmPassword": "Passwort bestätigen",
        "confirmPasswordPlaceholder": "Passwort wiederholen",
        "role": "Rolle",
        "regularUser": "Regulärer Benutzer",
        "systemAdministrator": "Systemadministrator",
        "active": "Aktiv",
        "inactive": "Inaktiv",
        "banned": "Gesperrt",
        "email": "E-Mail",
        "emailPlaceholder": "Optionale E-Mail",
        "phone": "Telefon",
        "phonePlaceholder": "Optionale Telefonnummer",
        "createUser": "Benutzer erstellen",
        "createSuccess": "Neuer Benutzer erfolgreich erstellt"
      },
      "userEdit": { "title": "Benutzer bearbeiten" },
      "settings": { "title": "Systemeinstellungen" },
      "permissions": {
        "title": "Berechtigungsverwaltung"
      },
      "fs": {
        "title": "Dateisystemverwaltung"
      },
      "web": {},
      "tasks": {},
      "users": { "title": "Benutzer" }
    },
    "index": { "title": "FileUni - Hochleistung-modulares System" },
    "user": {
      "profile": { "title": "Profil" },
      "sessions": { "title": "Sitzungen" },
      "security": { "title": "Sicherheit" },
      "cache": { "title": "Cache-Manager" },
      "shares": { "title": "Meine Freigaben" }
    },
  }),
  fr: mergeLocale(pagesEn, {
    "tos": { "title": "Conditions d'utilisation" },
    "privacy": { "title": "Politique de confidentialité" },
    "admin": {
      "userCreate": {
        "title": "Créer un utilisateur",
        "provisionIdentity": "Provisionner l'identité",
        "manualAccountCreation": "Création manuelle de compte",
        "username": "Nom d'utilisateur",
        "usernamePlaceholder": "Identifiant unique",
        "fullName": "Nom complet",
        "fullNamePlaceholder": "Nom d'affichage",
        "initialPassword": "Mot de passe initial",
        "passwordPlaceholder": "Min. 6 caractères",
        "confirmPassword": "Confirmer le mot de passe",
        "confirmPasswordPlaceholder": "Répéter le mot de passe",
        "role": "Rôle",
        "regularUser": "Utilisateur",
        "systemAdministrator": "Administrateur système",
        "status": "Statut",
        "active": "Actif",
        "inactive": "Inactif",
        "banned": "Banni",
        "email": "E-mail",
        "emailPlaceholder": "E-mail optionnel",
        "phone": "Téléphone",
        "phonePlaceholder": "Numéro optionnel",
        "createUser": "Créer l'utilisateur",
        "createSuccess": "Nouvel utilisateur créé avec succès"
      },
      "userEdit": { "title": "Modifier l'utilisateur" },
      "settings": { "title": "Paramètres système" },
      "permissions": {
        "title": "Gestion des permissions"
      },
      "fs": {
        "title": "Gestion du système de fichiers"
      },
      "web": {},
      "tasks": {},
      "users": { "title": "Utilisateurs" }
    },
    "index": { "title": "FileUni - Système modulaire haute performance" },
    "user": {
      "welcome": { "title": "Tableau de bord" },
      "profile": { "title": "Profil" },
      "sessions": { "title": "Sessions actives" },
      "security": { "title": "Sécurité" },
      "cache": { "title": "Gestionnaire de cache" },
      "shares": { "title": "Mes partages" }
    },
  }),
  ru: mergeLocale(pagesEn, {
    "tos": { "title": "Условия использования" },
    "privacy": { "title": "Политика конфиденциальности" },
    "admin": {
      "userCreate": {
        "title": "Создать пользователя",
        "provisionIdentity": "Создать идентификатор",
        "manualAccountCreation": "Ручное создание аккаунта",
        "username": "Имя пользователя",
        "usernamePlaceholder": "Уникальный идентификатор",
        "fullName": "Полное имя",
        "fullNamePlaceholder": "Отображаемое имя",
        "initialPassword": "Начальный пароль",
        "passwordPlaceholder": "Мин. 6 символов",
        "confirmPassword": "Подтвердите пароль",
        "confirmPasswordPlaceholder": "Повторите пароль",
        "role": "Роль",
        "regularUser": "Пользователь",
        "systemAdministrator": "Администратор системы",
        "status": "Статус",
        "active": "Активен",
        "inactive": "Неактивен",
        "banned": "Заблокирован",
        "email": "Почта",
        "emailPlaceholder": "Почта (необязательно)",
        "phone": "Телефон",
        "phonePlaceholder": "Телефон (необязательно)",
        "createUser": "Создать пользователя",
        "createSuccess": "Пользователь успешно создан"
      },
      "userEdit": { "title": "Редактировать пользователя" },
      "settings": { "title": "Системные настройки" },
      "permissions": {
        "title": "Управление правами"
      },
      "fs": {
        "title": "Управление файловой системой"
      },
      "web": {},
      "tasks": {},
      "users": { "title": "Пользователи" }
    },
    "index": { "title": "FileUni — высокопроизводительная модульная система" },
    "user": {
      "welcome": { "title": "Панель управления" },
      "profile": { "title": "Профиль" },
      "sessions": { "title": "Сессии" },
      "security": { "title": "Безопасность" },
      "cache": { "title": "Менеджер кэша" },
      "shares": { "title": "Мои публикации" }
    },
  }),
  ja: mergeLocale(pagesEn, {
    "tos": { "title": "利用規約" },
    "privacy": { "title": "プライバシーポリシー" },
    "admin": {
      "userCreate": {
        "title": "ユーザー作成",
        "provisionIdentity": "本人情報を作成",
        "manualAccountCreation": "手動アカウント作成",
        "username": "ユーザー名",
        "usernamePlaceholder": "一意の識別子",
        "fullName": "氏名",
        "fullNamePlaceholder": "表示名",
        "initialPassword": "初期パスワード",
        "passwordPlaceholder": "最小 6 文字",
        "confirmPassword": "パスワード確認",
        "confirmPasswordPlaceholder": "パスワードを再入力",
        "role": "ロール",
        "regularUser": "一般ユーザー",
        "systemAdministrator": "システム管理者",
        "status": "ステータス",
        "active": "有効",
        "inactive": "無効",
        "banned": "凍結",
        "email": "メール",
        "emailPlaceholder": "任意のメール",
        "phone": "電話",
        "phonePlaceholder": "任意の電話番号",
        "createUser": "ユーザーを作成",
        "createSuccess": "ユーザーを作成しました"
      },
      "userEdit": { "title": "ユーザー編集" },
      "settings": { "title": "システム設定" },
      "permissions": {
        "title": "権限管理"
      },
      "fs": {
        "title": "ファイルシステム管理"
      },
      "web": {},
      "tasks": {},
      "users": { "title": "ユーザー" }
    },
    "index": { "title": "FileUni - 高性能モジュラーシステム" },
    "user": {
      "welcome": { "title": "ダッシュボード" },
      "profile": { "title": "プロフィール" },
      "sessions": { "title": "セッション" },
      "security": { "title": "セキュリティ" },
      "cache": { "title": "キャッシュ管理" },
      "shares": { "title": "共有一覧" }
    },
  }),
});

type PagesMessages = LocaleShape<(typeof pagesBundle)['en']>;

export const pagesByResourceLocale = {
  'zh-CN': pagesBundle['zh-CN'],
  'zh-Hant': pagesBundle['zh-CN'],
  en: pagesBundle.en,
  es: pagesBundle.es,
  de: pagesBundle.de,
  fr: pagesBundle.fr,
  ru: pagesBundle.ru,
  ja: pagesBundle.ja,
} satisfies Record<FrontendResourceLocale, PagesMessages>;
