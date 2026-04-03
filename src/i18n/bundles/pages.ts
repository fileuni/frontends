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
  "forgotPassword": {
    "title": "Forgot Password"
  },
  "share": {
    "title": "File Share"
  },
  "admin": {
    "userCreate": {
      "title": "Create User",
      "layoutTitle": "Identity Provisioning",
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
      "title": "Edit User",
      "layoutTitle": "Edit Identity Info"
    },
    "settings": {
      "title": "System Settings",
      "layoutTitle": "Core Runtime Settings"
    },
    "permissions": {
      "title": "Permission Management",
      "layoutTitle": "Access Control List",
      "inherit": "Inherit",
      "allow": "Allow",
      "deny": "Deny"
    },
    "fs": {
      "title": "File System Management",
      "layoutTitle": "File System Infrastructure",
      "hybridStorage": "Hybrid",
      "statusRecovering": "RECOVERING"
    },
    "web": {
      "title": "Website Management",
      "layoutTitle": "Multi Site Management",
      "tls": "TLS"
    },
    "tasks": {
      "title": "Task Monitor",
      "layoutTitle": "Background tasks & scheduler monitoring"
    },
    "users": {
      "title": "Users",
      "layoutTitle": "Identity Management"
    }
  },
  "admin_fs": {
    "storage_stats": "Storage Stats",
    "cluster_storage": "Cluster Storage",
    "usage_efficiency": "Usage Efficiency",
    "active_maintenance": "Active Maintenance",
    "storage_types": "Storage Types",
    "engine_distribution": "Engine Distribution",
    "global_ops": "Global Operations",
    "global_ops_desc": "Caution: These actions affect the entire cluster and should only be performed during maintenance windows.",
    "sync_index": "Sync Global Index",
    "emergency_control": "Emergency Hub Control",
    "emergency_desc": "Caution: These actions bypass normal VFS safety checks and may lead to data inconsistency.",
    "force_unlock": "Force Global Unlock",
    "locked_users": "Locked Users (Under WAL Recovery)",
    "system_status": "System Status"
  },
  "admin_perms": {
    "protocol_control": "Protocol Access Control",
    "authorized": "Authorized",
    "filter_placeholder": "Filter authorized users...",
    "s3_credentials": "S3 Credentials",
    "ssh_key": "Active Public Key"
  },
  "register": {
    "title": "Register"
  },
  "login": {
    "title": "Login"
  },
  "filemanager": {
    "title": "File Management"
  },
  "index": {
    "title": "FileUni - High-performance modular system"
  },
  "user": {
    "welcome": {
      "title": "Dashboard"
    },
    "profile": {
      "title": "Profile",
      "layoutTitle": "Edit Profile"
    },
    "sessions": {
      "title": "Sessions",
      "layoutTitle": "Active Sessions"
    },
    "security": {
      "title": "Security",
      "layoutTitle": "Security Control"
    },
    "cache": {
      "title": "Cache Manager",
      "layoutTitle": "Cache Manager"
    },
    "shares": {
      "title": "My Shares"
    }
  },
  "colors": {
    "red": "Red",
    "orange": "Orange",
    "yellow": "Yellow",
    "green": "Green",
    "blue": "Blue",
    "indigo": "Cyan",
    "purple": "Deep Blue"
  },
  "publicShare": {
    "verifying": "Verifying share link...",
    "accessDenied": "Access Denied",
    "linkExpired": "This share link has expired or reached its download limit.",
    "tryAgain": "Try Again",
    "encryptedTitle": "Encrypted Share",
    "passwordRequiredDesc": "This content requires a password to unlock.",
    "enterPassword": "Enter password...",
    "unlockBtn": "Unlock Content",
    "views": "Views",
    "status": "Status",
    "active": "Active",
    "downloadNow": "Download Now",
    "previewOnline": "Preview Online",
    "expiresSoon": "Expires Soon",
    "file": "File",
    "folder": "Folder",
    "qrMobileAccess": "Mobile Access",
    "qrScanDesc": "Scan to open this share on your phone",
    "qrBackToInfo": "Back to Info",
    "emptyFolder": "This folder is empty",
    "previewNotAvailable": "Preview Not Available"
  }
} as const;

const pagesBundle = defineLocaleBundle({
  en: pagesEn,
  'zh-cn': mergeLocale(pagesEn, {
    "tos": { "title": "服务协议" },
    "privacy": { "title": "隐私政策" },
    "forgotPassword": { "title": "找回密码" },
    "share": { "title": "文件分享" },
    "admin": {
      "userCreate": {
        "title": "创建用户",
        "layoutTitle": "用户下发",
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
        "title": "编辑用户",
        "layoutTitle": "编辑身份信息"
      },
      "settings": {
        "title": "系统配置",
        "layoutTitle": "核心运行设置"
      },
      "permissions": {
        "title": "权限管理",
        "layoutTitle": "访问控制列表",
        "inherit": "继承",
        "allow": "允许",
        "deny": "拒绝"
      },
      "fs": {
        "title": "文件系统管理",
        "layoutTitle": "文件系统基础设施",
        "hybridStorage": "混合存储",
        "statusRecovering": "恢复中"
      },
      "web": {
        "title": "网站管理",
        "layoutTitle": "多站点管理"
      },
      "tasks": {
        "title": "任务监控",
        "layoutTitle": "后台任务与调度监控"
      },
      "users": {
        "title": "用户管理",
        "layoutTitle": "身份管理"
      }
    },
    "admin_fs": {
      "storage_stats": "存储统计",
      "cluster_storage": "集群总存储",
      "usage_efficiency": "使用效率",
      "active_maintenance": "活跃维护中",
      "storage_types": "存储后端类型",
      "engine_distribution": "引擎分布",
      "global_ops": "全局操作",
      "global_ops_desc": "注意：这些操作影响整个集群，仅应在维护窗口执行。",
      "sync_index": "同步全局索引",
      "emergency_control": "紧急枢纽控制",
      "emergency_desc": "警告：这些操作绕过正常 VFS 安全检查，可能导致数据不一致。",
      "force_unlock": "强制全局解锁",
      "locked_users": "被锁定用户 (正在执行 WAL 恢复)",
      "system_status": "系统状态"
    },
    "admin_perms": {
      "protocol_control": "协议访问控制",
      "authorized": "已授权",
      "filter_placeholder": "筛选授权用户...",
      "s3_credentials": "S3 访问凭据",
      "ssh_key": "当前 SSH 公钥"
    },
    "register": { "title": "注册" },
    "login": { "title": "登录" },
    "filemanager": { "title": "文件管理" },
    "index": { "title": "FileUni - 高性能模块化系统" },
    "user": {
      "welcome": { "title": "控制台" },
      "profile": { "title": "个人资料", "layoutTitle": "编辑个人资料" },
      "sessions": { "title": "会话管理", "layoutTitle": "活动会话" },
      "security": { "title": "安全中心", "layoutTitle": "安全控制" },
      "cache": { "title": "缓存管理", "layoutTitle": "缓存管理" },
      "shares": { "title": "我的分享" }
    }
  }),
  es: mergeLocale(pagesEn, {
    "tos": { "title": "Términos de servicio" },
    "privacy": { "title": "Política de privacidad" },
    "forgotPassword": { "title": "Olvidé mi contraseña" },
    "share": { "title": "Compartir archivos" },
    "admin": {
      "userCreate": {
        "title": "Crear usuario",
        "layoutTitle": "Provisionamiento de identidad",
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
      "userEdit": { "title": "Editar usuario", "layoutTitle": "Editar información de identidad" },
      "settings": { "title": "Ajustes del sistema", "layoutTitle": "Ajustes principales de ejecución" },
      "permissions": {
        "title": "Gestión de permisos",
        "layoutTitle": "Lista de control de acceso",
        "inherit": "Heredar",
        "allow": "Permitir",
        "deny": "Denegar"
      },
      "fs": {
        "title": "Gestión del sistema de archivos",
        "layoutTitle": "Infraestructura del sistema de archivos",
        "hybridStorage": "Híbrido",
        "statusRecovering": "RECUPERANDO"
      },
      "web": { "title": "Gestión de sitios web", "layoutTitle": "Gestión multisite", "tls": "TLS seguro" },
      "tasks": { "title": "Monitor de tareas", "layoutTitle": "Tareas en segundo plano y monitorización del planificador" },
      "users": { "title": "Usuarios", "layoutTitle": "Gestión de identidades" }
    },
    "admin_fs": {
      "storage_stats": "Estadísticas de almacenamiento",
      "cluster_storage": "Almacenamiento del clúster",
      "usage_efficiency": "Eficiencia de uso",
      "active_maintenance": "Mantenimiento activo",
      "storage_types": "Tipos de almacenamiento",
      "engine_distribution": "Distribución del motor",
      "global_ops": "Operaciones globales",
      "global_ops_desc": "Precaución: estas acciones afectan a todo el clúster y solo deben realizarse durante ventanas de mantenimiento.",
      "sync_index": "Sincronizar índice global",
      "emergency_control": "Control de emergencia del hub",
      "emergency_desc": "Precaución: estas acciones omiten comprobaciones de seguridad normales de VFS y pueden provocar inconsistencias de datos.",
      "force_unlock": "Forzar desbloqueo global",
      "locked_users": "Usuarios bloqueados (en recuperación WAL)",
      "system_status": "Estado del sistema"
    },
    "admin_perms": {
      "protocol_control": "Control de acceso por protocolo",
      "authorized": "Autorizado",
      "filter_placeholder": "Filtrar usuarios autorizados...",
      "s3_credentials": "Credenciales S3",
      "ssh_key": "Clave pública activa"
    },
    "register": { "title": "Registrarse" },
    "login": { "title": "Iniciar sesión" },
    "filemanager": { "title": "Gestión de archivos" },
    "index": { "title": "FileUni - Sistema modular de alto rendimiento" },
    "user": {
      "welcome": { "title": "Panel de control" },
      "profile": { "title": "Perfil", "layoutTitle": "Editar perfil" },
      "sessions": { "title": "Sesiones", "layoutTitle": "Sesiones activas" },
      "security": { "title": "Seguridad", "layoutTitle": "Control de seguridad" },
      "cache": { "title": "Gestor de caché", "layoutTitle": "Gestor de caché" },
      "shares": { "title": "Mis compartidos" }
    },
    "colors": {
      "red": "Rojo",
      "orange": "Naranja",
      "yellow": "Amarillo",
      "green": "Verde",
      "blue": "Azul",
      "indigo": "Cian",
      "purple": "Azul profundo"
    },
    "publicShare": {
      "verifying": "Verificando enlace de compartición...",
      "accessDenied": "Acceso denegado",
      "linkExpired": "Este enlace de compartición ha expirado o alcanzó su límite de descargas.",
      "tryAgain": "Reintentar",
      "encryptedTitle": "Compartición cifrada",
      "passwordRequiredDesc": "Este contenido requiere una contraseña para desbloquearse.",
      "enterPassword": "Introduzca la contraseña...",
      "unlockBtn": "Desbloquear contenido",
      "views": "Vistas",
      "status": "Estado",
      "active": "Activa",
      "downloadNow": "Descargar ahora",
      "previewOnline": "Vista previa en línea",
      "expiresSoon": "Caduca pronto",
      "file": "Archivo",
      "folder": "Carpeta",
      "qrMobileAccess": "Acceso móvil",
      "qrScanDesc": "Escanee para abrir esta compartición en su teléfono",
      "qrBackToInfo": "Volver a información",
      "emptyFolder": "Esta carpeta está vacía",
      "previewNotAvailable": "Vista previa no disponible"
    }
  }),
  de: mergeLocale(pagesEn, {
    "tos": { "title": "Nutzungsbedingungen" },
    "privacy": { "title": "Datenschutzrichtlinie" },
    "forgotPassword": { "title": "Passwort vergessen" },
    "share": { "title": "Dateifreigabe" },
    "admin": {
      "userCreate": {
        "title": "Benutzer erstellen",
        "layoutTitle": "Identitätsbereitstellung",
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
      "userEdit": { "title": "Benutzer bearbeiten", "layoutTitle": "Identitätsinformationen bearbeiten" },
      "settings": { "title": "Systemeinstellungen", "layoutTitle": "Kern-Laufzeiteinstellungen" },
      "permissions": {
        "title": "Berechtigungsverwaltung",
        "layoutTitle": "Zugriffskontrollliste",
        "inherit": "Vererben",
        "allow": "Erlauben",
        "deny": "Verweigern"
      },
      "fs": {
        "title": "Dateisystemverwaltung",
        "layoutTitle": "Dateisystem-Infrastruktur",
        "statusRecovering": "WIRD WIEDERHERGESTELLT"
      },
      "web": { "title": "Website-Verwaltung", "layoutTitle": "Multi-Site-Verwaltung" },
      "tasks": { "title": "Aufgabenüberwachung", "layoutTitle": "Hintergrundaufgaben & Planerüberwachung" },
      "users": { "title": "Benutzer", "layoutTitle": "Identitätsverwaltung" }
    },
    "register": { "title": "Registrieren" },
    "login": { "title": "Anmelden" },
    "filemanager": { "title": "Dateiverwaltung" },
    "index": { "title": "FileUni - Hochleistung-modulares System" },
    "user": {
      "profile": { "title": "Profil", "layoutTitle": "Profil bearbeiten" },
      "sessions": { "title": "Sitzungen", "layoutTitle": "Aktive Sitzungen" },
      "security": { "title": "Sicherheit", "layoutTitle": "Sicherheitskontrolle" },
      "cache": { "title": "Cache-Manager", "layoutTitle": "Cache-Manager" },
      "shares": { "title": "Meine Freigaben" }
    },
    "colors": {
      "red": "Rot",
      "yellow": "Gelb",
      "green": "Grün",
      "blue": "Blau",
      "purple": "Dunkelblau"
    },
    "publicShare": {
      "verifying": "Freigelink wird überprüft...",
      "accessDenied": "Zugriff verweigert",
      "linkExpired": "Dieser Freigelink ist abgelaufen oder hat sein Download-Limit erreicht.",
      "tryAgain": "Erneut versuchen",
      "encryptedTitle": "Verschlüsselte Freigabe",
      "passwordRequiredDesc": "Dieser Inhalt erfordert ein Passwort zum Entsperren.",
      "enterPassword": "Passwort eingeben...",
      "unlockBtn": "Inhalt entsperren",
      "views": "Aufrufe",
      "active": "Aktiv",
      "downloadNow": "Jetzt herunterladen",
      "file": "Datei",
      "folder": "Ordner",
      "qrMobileAccess": "Mobiler Zugriff",
      "qrScanDesc": "Scannen Sie, um diese Freigabe auf Ihrem Telefon zu öffnen",
      "qrBackToInfo": "Zurück zur Info",
      "emptyFolder": "Dieser Ordner ist leer",
      "previewNotAvailable": "Vorschau nicht verfügbar"
    }
  }),
  fr: mergeLocale(pagesEn, {
    "tos": { "title": "Conditions d'utilisation" },
    "privacy": { "title": "Politique de confidentialité" },
    "forgotPassword": { "title": "Mot de passe oublié" },
    "share": { "title": "Partage de fichiers" },
    "admin": {
      "userCreate": {
        "title": "Créer un utilisateur",
        "layoutTitle": "Provisionnement d'identité",
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
      "userEdit": { "title": "Modifier l'utilisateur", "layoutTitle": "Modifier les infos d'identité" },
      "settings": { "title": "Paramètres système", "layoutTitle": "Paramètres d'exécution du cœur" },
      "permissions": {
        "title": "Gestion des permissions",
        "layoutTitle": "Liste de contrôle d'accès",
        "inherit": "Hériter",
        "allow": "Autoriser",
        "deny": "Refuser"
      },
      "fs": {
        "title": "Gestion du système de fichiers",
        "layoutTitle": "Infrastructure du système de fichiers",
        "hybridStorage": "Hybride",
        "statusRecovering": "RÉCUPÉRATION"
      },
      "web": { "title": "Gestion des sites Web", "layoutTitle": "Gestion multi-sites", "tls": "TLS securise" },
      "tasks": { "title": "Moniteur de tâches", "layoutTitle": "Tâches en arrière-plan et surveillance du planificateur" },
      "users": { "title": "Utilisateurs", "layoutTitle": "Gestion des identités" }
    },
    "admin_fs": {
      "storage_stats": "Statistiques de stockage",
      "cluster_storage": "Stockage du cluster",
      "usage_efficiency": "Efficacité d'utilisation",
      "active_maintenance": "Maintenance active",
      "storage_types": "Types de stockage",
      "engine_distribution": "Répartition des moteurs",
      "global_ops": "Opérations globales",
      "global_ops_desc": "Attention : ces actions affectent tout le cluster et ne doivent être effectuées que pendant les fenêtres de maintenance.",
      "sync_index": "Synchroniser l'index global",
      "emergency_control": "Contrôle d'urgence du hub",
      "emergency_desc": "Attention : ces actions contournent les contrôles de sécurité VFS et peuvent entraîner des incohérences de données.",
      "force_unlock": "Forcer le déverrouillage global",
      "locked_users": "Utilisateurs verrouillés (récupération WAL)",
      "system_status": "État du système"
    },
    "admin_perms": {
      "protocol_control": "Contrôle d'accès par protocole",
      "authorized": "Autorisé",
      "filter_placeholder": "Filtrer les utilisateurs autorisés...",
      "s3_credentials": "Identifiants S3",
      "ssh_key": "Clé publique active"
    },
    "register": { "title": "S'inscrire" },
    "login": { "title": "Se connecter" },
    "filemanager": { "title": "Gestion des fichiers" },
    "index": { "title": "FileUni - Système modulaire haute performance" },
    "user": {
      "welcome": { "title": "Tableau de bord" },
      "profile": { "title": "Profil", "layoutTitle": "Modifier le profil" },
      "sessions": { "title": "Sessions actives", "layoutTitle": "Sessions actives" },
      "security": { "title": "Sécurité", "layoutTitle": "Contrôle de sécurité" },
      "cache": { "title": "Gestionnaire de cache", "layoutTitle": "Gestionnaire de cache" },
      "shares": { "title": "Mes partages" }
    },
    "colors": {
      "red": "Rouge",
      "orange": "Orange vif",
      "yellow": "Jaune",
      "green": "Vert",
      "blue": "Bleu",
      "indigo": "Bleu cyan",
      "purple": "Bleu profond"
    },
    "publicShare": {
      "verifying": "Vérification du lien de partage...",
      "accessDenied": "Accès refusé",
      "linkExpired": "Ce lien de partage a expiré ou a atteint sa limite de téléchargements.",
      "tryAgain": "Réessayer",
      "encryptedTitle": "Partage chiffré",
      "passwordRequiredDesc": "Ce contenu nécessite un mot de passe pour être déverrouillé.",
      "enterPassword": "Saisissez le mot de passe...",
      "unlockBtn": "Déverrouiller le contenu",
      "views": "Vues",
      "status": "Statut",
      "active": "Actif",
      "downloadNow": "Télécharger maintenant",
      "previewOnline": "Aperçu en ligne",
      "expiresSoon": "Expire bientôt",
      "file": "Fichier",
      "folder": "Dossier",
      "qrMobileAccess": "Accès mobile",
      "qrScanDesc": "Scannez pour ouvrir ce partage sur votre téléphone",
      "qrBackToInfo": "Retour aux infos",
      "emptyFolder": "Ce dossier est vide",
      "previewNotAvailable": "Aperçu indisponible"
    }
  }),
  ru: mergeLocale(pagesEn, {
    "tos": { "title": "Условия использования" },
    "privacy": { "title": "Политика конфиденциальности" },
    "forgotPassword": { "title": "Забыли пароль" },
    "share": { "title": "Общий доступ к файлам" },
    "admin": {
      "userCreate": {
        "title": "Создать пользователя",
        "layoutTitle": "Выдача идентификатора",
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
      "userEdit": { "title": "Редактировать пользователя", "layoutTitle": "Редактирование данных идентификатора" },
      "settings": { "title": "Системные настройки", "layoutTitle": "Основные настройки выполнения" },
      "permissions": {
        "title": "Управление правами",
        "layoutTitle": "Список контроля доступа",
        "inherit": "Наследовать",
        "allow": "Разрешить",
        "deny": "Запретить"
      },
      "fs": {
        "title": "Управление файловой системой",
        "layoutTitle": "Инфраструктура файловой системы",
        "hybridStorage": "Гибрид",
        "statusRecovering": "ВОССТАНОВЛЕНИЕ"
      },
      "web": { "title": "Управление сайтами", "layoutTitle": "Управление несколькими сайтами", "tls": "Защищенный TLS" },
      "tasks": { "title": "Монитор задач", "layoutTitle": "Фоновые задачи и мониторинг планировщика" },
      "users": { "title": "Пользователи", "layoutTitle": "Управление идентификаторами" }
    },
    "admin_fs": {
      "storage_stats": "Статистика хранилища",
      "cluster_storage": "Хранилище кластера",
      "usage_efficiency": "Эффективность использования",
      "active_maintenance": "Активное обслуживание",
      "storage_types": "Типы хранилищ",
      "engine_distribution": "Распределение движков",
      "global_ops": "Глобальные операции",
      "global_ops_desc": "Внимание: эти действия влияют на весь кластер и должны выполняться только в окнах обслуживания.",
      "sync_index": "Синхронизировать глобальный индекс",
      "emergency_control": "Аварийное управление хабом",
      "emergency_desc": "Внимание: эти действия обходят стандартные проверки безопасности VFS и могут привести к несогласованности данных.",
      "force_unlock": "Принудительно разблокировать глобально",
      "locked_users": "Заблокированные пользователи (восстановление WAL)",
      "system_status": "Статус системы"
    },
    "admin_perms": {
      "protocol_control": "Контроль доступа по протоколам",
      "authorized": "Авторизован",
      "filter_placeholder": "Фильтровать авторизованных пользователей...",
      "s3_credentials": "Учетные данные S3",
      "ssh_key": "Активный публичный ключ"
    },
    "register": { "title": "Регистрация" },
    "login": { "title": "Войти" },
    "filemanager": { "title": "Управление файлами" },
    "index": { "title": "FileUni — высокопроизводительная модульная система" },
    "user": {
      "welcome": { "title": "Панель управления" },
      "profile": { "title": "Профиль", "layoutTitle": "Редактировать профиль" },
      "sessions": { "title": "Сессии", "layoutTitle": "Активные сессии" },
      "security": { "title": "Безопасность", "layoutTitle": "Контроль безопасности" },
      "cache": { "title": "Менеджер кэша", "layoutTitle": "Менеджер кэша" },
      "shares": { "title": "Мои публикации" }
    },
    "colors": {
      "red": "Красный",
      "orange": "Оранжевый",
      "yellow": "Желтый",
      "green": "Зеленый",
      "blue": "Синий",
      "indigo": "Циан",
      "purple": "Глубокий синий"
    },
    "publicShare": {
      "verifying": "Проверка ссылки на общий доступ...",
      "accessDenied": "Доступ запрещен",
      "linkExpired": "Эта ссылка истекла или достигла лимита загрузок.",
      "tryAgain": "Повторить",
      "encryptedTitle": "Зашифрованный доступ",
      "passwordRequiredDesc": "Для доступа к этому содержимому нужен пароль.",
      "enterPassword": "Введите пароль...",
      "unlockBtn": "Открыть доступ",
      "views": "Просмотры",
      "status": "Статус",
      "active": "Активен",
      "downloadNow": "Скачать",
      "previewOnline": "Предпросмотр онлайн",
      "expiresSoon": "Скоро истечет",
      "file": "Файл",
      "folder": "Папка",
      "qrMobileAccess": "Доступ с телефона",
      "qrScanDesc": "Сканируйте, чтобы открыть эту ссылку на телефоне",
      "qrBackToInfo": "Назад к информации",
      "emptyFolder": "Эта папка пуста",
      "previewNotAvailable": "Предпросмотр недоступен"
    }
  }),
  ja: mergeLocale(pagesEn, {
    "tos": { "title": "利用規約" },
    "privacy": { "title": "プライバシーポリシー" },
    "forgotPassword": { "title": "パスワードをお忘れですか" },
    "share": { "title": "ファイル共有" },
    "admin": {
      "userCreate": {
        "title": "ユーザー作成",
        "layoutTitle": "本人情報の作成",
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
      "userEdit": { "title": "ユーザー編集", "layoutTitle": "本人情報を編集" },
      "settings": { "title": "システム設定", "layoutTitle": "コア実行設定" },
      "permissions": {
        "title": "権限管理",
        "layoutTitle": "アクセス制御リスト",
        "inherit": "継承",
        "allow": "許可",
        "deny": "拒否"
      },
      "fs": {
        "title": "ファイルシステム管理",
        "layoutTitle": "ファイルシステム基盤",
        "hybridStorage": "ハイブリッド",
        "statusRecovering": "復旧中"
      },
      "web": { "title": "Webサイト管理", "layoutTitle": "マルチサイト管理", "tls": "TLS 暗号化" },
      "tasks": { "title": "タスク監視", "layoutTitle": "バックグラウンドタスクとスケジューラー監視" },
      "users": { "title": "ユーザー", "layoutTitle": "本人情報管理" }
    },
    "admin_fs": {
      "storage_stats": "ストレージ統計",
      "cluster_storage": "クラスターストレージ",
      "usage_efficiency": "使用効率",
      "active_maintenance": "アクティブメンテナンス",
      "storage_types": "ストレージ種別",
      "engine_distribution": "エンジン分布",
      "global_ops": "グローバル操作",
      "global_ops_desc": "注意: これらの操作はクラスター全体に影響し、メンテナンス時間内にのみ実行してください。",
      "sync_index": "グローバルインデックスを同期",
      "emergency_control": "緊急ハブ制御",
      "emergency_desc": "注意: これらの操作は通常の VFS 安全チェックを回避し、データ不整合につながる可能性があります。",
      "force_unlock": "グローバル強制アンロック",
      "locked_users": "ロック中のユーザー (WAL 復旧中)",
      "system_status": "システム状態"
    },
    "admin_perms": {
      "protocol_control": "プロトコルアクセス制御",
      "authorized": "許可済み",
      "filter_placeholder": "許可済みユーザーを絞り込み...",
      "s3_credentials": "S3 資格情報",
      "ssh_key": "有効な公開鍵"
    },
    "register": { "title": "登録" },
    "login": { "title": "ログイン" },
    "filemanager": { "title": "ファイル管理" },
    "index": { "title": "FileUni - 高性能モジュラーシステム" },
    "user": {
      "welcome": { "title": "ダッシュボード" },
      "profile": { "title": "プロフィール", "layoutTitle": "プロフィール編集" },
      "sessions": { "title": "セッション", "layoutTitle": "アクティブセッション" },
      "security": { "title": "セキュリティ", "layoutTitle": "セキュリティ制御" },
      "cache": { "title": "キャッシュ管理", "layoutTitle": "キャッシュ管理" },
      "shares": { "title": "共有一覧" }
    },
    "colors": {
      "red": "赤",
      "orange": "オレンジ",
      "yellow": "黄",
      "green": "緑",
      "blue": "青",
      "indigo": "シアン",
      "purple": "ディープブルー"
    },
    "publicShare": {
      "verifying": "共有リンクを確認しています...",
      "accessDenied": "アクセス拒否",
      "linkExpired": "この共有リンクは期限切れか、ダウンロード上限に達しました。",
      "tryAgain": "再試行",
      "encryptedTitle": "暗号化された共有",
      "passwordRequiredDesc": "このコンテンツはパスワードが必要です。",
      "enterPassword": "パスワードを入力...",
      "unlockBtn": "コンテンツを解除",
      "views": "閲覧数",
      "status": "ステータス",
      "active": "有効",
      "downloadNow": "今すぐダウンロード",
      "previewOnline": "オンラインプレビュー",
      "expiresSoon": "まもなく期限切れ",
      "file": "ファイル",
      "folder": "フォルダ",
      "qrMobileAccess": "モバイルアクセス",
      "qrScanDesc": "スキャンしてスマホで開く",
      "qrBackToInfo": "情報に戻る",
      "emptyFolder": "このフォルダは空です",
      "previewNotAvailable": "プレビューできません"
    }
  }),
});

type PagesMessages = LocaleShape<(typeof pagesBundle)['en']>;

export const pagesByResourceLocale = {
  'zh-cn': pagesBundle['zh-cn'],
  en: pagesBundle.en,
  es: pagesBundle.es,
  de: pagesBundle.de,
  fr: pagesBundle.fr,
  ru: pagesBundle.ru,
  ja: pagesBundle.ja,
} satisfies Record<FrontendResourceLocale, PagesMessages>;
