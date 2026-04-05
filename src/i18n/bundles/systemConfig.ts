import { defineLocaleBundle, type LocaleShape } from '@/i18n/core';
import type { FrontendResourceLocale } from '@/i18n/locale-adapter';
import { mergeLocale } from './_mergeLocale';
const systemConfigEn = {
    "setup": {
        "center": {
            "title": "Welcome to FileUni Settings Center",
            "subtitle": "Finish the first-time settings to get started"
        },
        "guide": {
            "title": "FileUni first-time setup",
            "desc": "You can start directly with the default configuration. It fits most first-time users. You can also choose Customize settings to change the database and other options.",
            "card1Action": "Change location",
            "runtimeDirChangeHint": "To change this location, restart FileUni with --runtime-dir <DIR>. Service installation uses the same flag.",
            "card3Action": "Apply",
            "defaultApplyAction": "Apply default configuration",
            "openAction": "Open this item",
            "requiredPrompt": "FileUni has not finished the initial settings yet. Open Settings Center now?",
            "existingConfigTitle": "Existing configuration detected",
            "existingConfigDesc": "A config.toml already exists in the runtime directory. You can apply it directly to finish the settings. To change the admin password, use the form below.",
            "existingConfigApply": "Apply current configuration",
            "existingConfigCustomize": "Customize settings"
        },
        "editor": {
            "title": "Settings Center",
            "check": "Check Settings",
            "quickSettings": "Continue Quick Settings",
            "visualMode": "Visual Editor",
            "sourceMode": "Text Editor",
            "finishHint": "Confirm to finish the initial settings.",
            "moreActionsTitle": "Other advanced entries",
            "moreActionsDesc": "License, storage, and external tool checks can usually wait until after setup is finished.",
            "showMoreActions": "Show more advanced entries",
            "hideMoreActions": "Hide advanced entries"
        },
        "steps": {
            "step": "Step",
            "performance": "Tune performance",
            "databaseCache": "Configure database and cache",
            "storage": "Configure storage",
            "adminPassword": "Set admin password",
            "finishSimple": "Finish"
        },
        "locked": {},
        "profile": {},
        "config": {
            "dbType": "Database",
            "kvType": "Cache",
            "kvRedisHint": "Redis-compatible backends (Redis/KeyDB/Valkey)",
            "kvDashmapHint": "Note: In-memory cache is volatile and cleared on restart.",
            "kvSqlHint": "Note: Will reuse primary database for cache storage.",
            "versionWarning": {},
            "advanced": {}
        },
        "cache": {
            "externalServer": "External Cache Server",
            "externalHints": {
                "redis": "Use Redis when you already operate a Redis deployment.",
                "valkey": "Valkey is the recommended first-install choice for an external cache server.",
                "keydb": "KeyDB fits high-concurrency and multithreaded workloads better."
            }
        },
        "storagePool": {
            "title": "Storage Pool Settings",
            "desc": "Choose a backend type for each pool, then fill only the fields that backend really needs.",
            "rootHint": "Recommended default: {{value}}",
            "s3": {
                "endpoint": "Endpoint",
                "region": "Region",
                "bucket": "Bucket",
                "access_key_id": "Access Key ID",
                "secret_access_key": "Secret Access Key"
            },
            "s3Hints": {
                "endpoint": "Enter the S3 or compatible object storage endpoint.",
                "region": "Enter the service region or provider-specific region value.",
                "bucket": "Enter the bucket used as the root for this storage pool.",
                "access_key_id": "The access key identifier used to sign requests.",
                "secret_access_key": "The secret key used to sign requests."
            },
            "webdav": {
                "endpoint": "WebDAV Endpoint",
                "username": "Username",
                "password": "Password"
            },
            "dropbox": {
                "access_token": "Access Token",
                "refresh_token": "Refresh Token",
                "client_id": "Client ID",
                "client_secret": "Client Secret"
            },
            "dropboxHints": {
                "access_token": "Optional short-lived token. Prefer refresh_token for long-term use.",
                "refresh_token": "Recommended for long-term Dropbox access. OpenDAL refreshes access tokens automatically.",
                "client_id": "Dropbox app client ID used with refresh_token.",
                "client_secret": "Dropbox app client secret used with refresh_token."
            },
            "onedrive": {
                "access_token": "Access Token",
                "refresh_token": "Refresh Token",
                "client_id": "Client ID",
                "client_secret": "Client Secret"
            },
            "onedriveHints": {
                "access_token": "Optional short-lived Microsoft Graph token. Prefer refresh_token for long-term use.",
                "refresh_token": "Recommended for long-term OneDrive access. Include offline_access when obtaining it.",
                "client_id": "Microsoft Graph app client ID used with refresh_token.",
                "client_secret": "Optional for public clients; required for confidential clients."
            },
            "gdrive": {
                "access_token": "Access Token",
                "refresh_token": "Refresh Token",
                "client_id": "Client ID",
                "client_secret": "Client Secret"
            },
            "gdriveHints": {
                "access_token": "Optional short-lived token. Prefer refresh_token for long-term use.",
                "refresh_token": "Recommended for long-term Google Drive access. OpenDAL refreshes access tokens automatically.",
                "client_id": "Google OAuth client ID used with refresh_token.",
                "client_secret": "Google OAuth client secret used with refresh_token."
            },
            "webdavHints": {
                "endpoint": "Enter the base WebDAV service endpoint.",
                "username": "The account used to sign in to WebDAV.",
                "password": "The password used to sign in to WebDAV."
            }
        },
        "storageCache": {
            "title": "Read / Write Cache Acceleration",
            "writeRisk": "Warning: when write cache is enabled, data is cached first and flushed back asynchronously. Sudden power loss, cache cleanup, or flush failure may cause file loss or delayed persistence."
        },
        "admin": {
            "title": "Set up the administrator account",
            "password": "Secure Password",
            "resetRuleHint": "If no administrator exists yet, apply will create an admin user named admin. If an administrator already exists, apply will reset the first administrator password to the password entered here.",
            "passwordTooShort": "Password must be at least 8 characters",
            "finalConfirmDesc": "Confirm to save your settings and finish the initial settings. You can adjust more options later.",
            "finish": "Finish Settings",
            "changePassword": "Admin Settings",
        },
        "final": {
            "title": "Settings complete",
            "subtitle": "Administrator account {{user}} is ready.",
            "adminCreatedDefault": "Created administrator {{user}} with the temporary password {{password}}. Please change it after your first sign-in.",
            "adminCreatedWithPassword": "Created administrator {{user}} with the password {{password}}.",
            "adminReset": "Updated the sign-in password for administrator {{user}} to {{password}}.",
            "adminExisting": "Administrator {{user}} already exists, so the password was left unchanged.",
            "nextSteps": "What to do next:",
            "step1": "Return to the launcher and start FileUni.",
            "step2": "Open the Web UI and sign in with the administrator account.",
            "step3": "Use the admin console later if you want to adjust more settings.",
            "startNow": "Start FileUni",
            "started": "FileUni is running",
            "openWebUi": "Open Web UI",
            "finishLater": "Maybe later",
            "openHint": "Start FileUni, then open the Web UI to sign in.",
            "runningHint": "FileUni is already running, so you can open the Web UI right away."
        },
        "logs": {
            "setupSuccess": "Settings complete. Confirm to continue."
        }
    },
    "configGuard": {
        "featureDisabledTitle": "Feature Disabled",
        "featureDisabledDesc": "This feature has been disabled by the administrator. Please contact your system administrator for more information."
    },
    "configSet": {
        "locked": {
            "title": "Settings Center Unavailable"
        },
        "config": {
            "versionWarning": {},
            "advanced": {}
        },
        "final": {
            "title": "System settings complete",
            "subtitle": "Administrator {{user}} has been granted full access.",
            "adminCreatedDefault": "Created administrator {{user}}. Default password: {{password}}.",
            "adminCreatedWithPassword": "Created administrator {{user}}. Password: {{password}}.",
            "adminReset": "Updated password for administrator {{user}}: {{password}}.",
            "adminExisting": "Existing administrator {{user}} detected. Password unchanged.",
            "nextSteps": "What to do next:",
            "step1": "Sign in with your administrator account.",
            "step2": "Edit and save configuration online in the Admin Console.",
            "step3": "Confirm to return to the home page."
        },
        "logs": {
            "failed": "Failed",
            "success": "Success"
        }
    },
    "configSelector": {
        "title": "Choose Install Location",
        "subtitle": "Pick the single runtime directory FileUni should use for settings and data",
        "config_path": "Runtime directory",
        "config_path_desc": "FileUni saves setup state, system settings, databases, cache, and runtime data in this single directory.",
        "path_placeholder": "Enter or choose the runtime directory...",
        "browse": "Choose Folder",
        "or": "Quick choices",
        "current_dir": "Use current selection",
        "current_dir_desc": "Keep the location you already chose before.",
        "default_dir": "Use recommended location",
        "default_dir_desc": "Use the default location recommended for this device.",
        "confirm": "Save location and continue",
        "default_hint": "If you are unsure, the recommended location is the easiest choice. You can change it later.",
        "no_config_warning": "This is the first step of the initial setup.",
        "invalid_config": "This location cannot be used right now. Please choose another one.",
    }
} as const;
const systemConfigBundle = defineLocaleBundle({
    en: systemConfigEn,
    'zh-CN': mergeLocale(systemConfigEn, {
        "setup": {
            "center": { "title": "欢迎使用 FileUni 设置中心", "subtitle": "完成首次设置后即可开始使用" },
            "guide": {
                "title": "FileUni 首次设置",
                "desc": "您可以使用默认配置直接开始，默认配置适合多数第一次使用者。也可以点击 调整配置 修改数据库和其他配置信息",
                "card1Action": "修改位置",
                "runtimeDirChangeHint": "如需修改这里，请重启 FileUni 并使用 --runtime-dir <目录>。安装服务时也使用同一个参数。",
                "card3Action": "应用",
                "defaultApplyAction": "应用默认配置",
                "openAction": "打开此项",
                "requiredPrompt": "FileUni 尚未完成首次设置，是否现在打开设置中心？",
                "existingConfigTitle": "检测到已有配置",
                "existingConfigDesc": "当前运行目录下已存在 config.toml，直接应用即可完成设置。如需修改管理员密码，请在下方设置。",
                "existingConfigApply": "直接应用当前配置",
                "existingConfigCustomize": "调整配置"
            },
            "editor": {
                "title": "设置中心",
                "check": "检查设置",
                "quickSettings": "继续快速设置",
                "visualMode": "可视化编辑",
                "sourceMode": "文本编辑",
                "finishHint": "确认后完成首次设置。",
                "moreActionsTitle": "其他高级入口",
                "moreActionsDesc": "授权、存储和外部工具检查通常可以等安装完成后再处理。",
                "showMoreActions": "显示更多高级入口",
                "hideMoreActions": "隐藏高级入口"
            },
            "steps": {
                "step": "步骤",
                "performance": "进行性能调优",
                "databaseCache": "配置数据库和缓存",
                "storage": "配置存储",
                "adminPassword": "设置管理员密码",
                "finishSimple": "完成"
            },
            "locked": {},
            "profile": {},
            "config": {
                "dbType": "数据库",
                "kvType": "缓存",
                "kvRedisHint": "Redis 格式的缓存后端 (Redis/KeyDB/Valkey)",
                "kvDashmapHint": "提示：内存缓存不会持久化数据，重启后缓存将清空。",
                "kvSqlHint": "提示：将复用主数据库存储缓存数据。",
                "versionWarning": {},
                "advanced": {}
            },
            "cache": {
                "externalServer": "独立缓存服务器",
                "externalHints": {
                    "redis": "如果您已经有 Redis 环境，直接复用即可。",
                    "valkey": "首次安装需要独立缓存服务器时，推荐优先使用 Valkey。",
                    "keydb": "KeyDB 更适合高并发和多线程负载。"
                }
            },
            "storagePool": {
                "title": "存储池配置",
                "desc": "为每个存储池选择后端类型，并填写该后端真正需要的最少字段。",
                "rootHint": "推荐默认值：{{value}}",
                "s3": {
                    "endpoint": "服务地址",
                    "region": "区域",
                    "bucket": "桶名称",
                    "access_key_id": "Access Key ID",
                    "secret_access_key": "Secret Access Key"
                },
                "s3Hints": {
                    "endpoint": "填写 S3 或兼容对象存储的访问地址。",
                    "region": "填写服务所在区域；兼容对象存储可按服务商要求填写。",
                    "bucket": "填写要作为此存储池根位置的 bucket。",
                    "access_key_id": "用于访问对象存储的账号标识。",
                    "secret_access_key": "用于访问对象存储的密钥。"
                },
                "webdav": { "endpoint": "WebDAV 地址", "username": "用户名", "password": "密码" },
                "dropbox": {
                    "access_token": "Access Token",
                    "refresh_token": "Refresh Token",
                    "client_id": "Client ID",
                    "client_secret": "Client Secret"
                },
                "dropboxHints": {
                    "access_token": "可选的短期令牌；如需长期稳定使用，建议改填 refresh_token。",
                    "refresh_token": "推荐用于长期 Dropbox 访问；OpenDAL 会自动续期 access token。",
                    "client_id": "与 refresh_token 搭配使用的 Dropbox 应用 Client ID。",
                    "client_secret": "与 refresh_token 搭配使用的 Dropbox 应用 Client Secret。"
                },
                "onedrive": {
                    "access_token": "Access Token",
                    "refresh_token": "Refresh Token",
                    "client_id": "Client ID",
                    "client_secret": "Client Secret"
                },
                "onedriveHints": {
                    "access_token": "可选的短期 Microsoft Graph 令牌；如需长期使用，建议改填 refresh_token。",
                    "refresh_token": "推荐用于长期 OneDrive 访问；获取时请包含 offline_access。",
                    "client_id": "与 refresh_token 搭配使用的 Microsoft Graph 应用 Client ID。",
                    "client_secret": "Public Client 可留空；Confidential Client 需要填写。"
                },
                "gdrive": {
                    "access_token": "Access Token",
                    "refresh_token": "Refresh Token",
                    "client_id": "Client ID",
                    "client_secret": "Client Secret"
                },
                "gdriveHints": {
                    "access_token": "可选的短期令牌；如需长期稳定使用，建议改填 refresh_token。",
                    "refresh_token": "推荐用于长期 Google Drive 访问；OpenDAL 会自动续期 access token。",
                    "client_id": "与 refresh_token 搭配使用的 Google OAuth Client ID。",
                    "client_secret": "与 refresh_token 搭配使用的 Google OAuth Client Secret。"
                },
                "webdavHints": {
                    "endpoint": "填写 WebDAV 服务根地址。",
                    "username": "用于登录 WebDAV 的账号。",
                    "password": "用于登录 WebDAV 的密码。"
                }
            },
            "storageCache": {
                "title": "读写缓存加速",
                "writeRisk": "警告：写缓存启用后，数据会先落入缓存再异步刷回后端；如果设备突然断电、缓存目录被清理或刷写失败，可能出现文件丢失或落盘延迟。"
            },
            "admin": {
                "title": "设置管理员账号",
                "password": "安全密码",
                "resetRuleHint": "如果当前还没有管理员账号，应用时会创建用户名为 admin 的管理员；如果已经存在管理员账号，应用时会重置第一个管理员的密码为这里填写的密码。",
                "passwordTooShort": "密码长度至少为 8 位",
                "finalConfirmDesc": "确认后将保存当前设置并完成首次设置。更多设置可稍后调整。",
                "finish": "完成设置",
                "changePassword": "管理员配置",
            },
            "final": {
                "title": "设置完成",
                "subtitle": "管理员账号 {{user}} 已准备就绪。",
                "adminCreatedDefault": "已为您创建管理员账号 {{user}}，临时密码为 {{password}}。首次登录后建议尽快修改。",
                "adminCreatedWithPassword": "已为您创建管理员账号 {{user}}，登录密码为 {{password}}。",
                "adminReset": "管理员 {{user}} 的登录密码已更新为 {{password}}。",
                "adminExisting": "已检测到管理员 {{user}}，这次没有修改密码。",
                "nextSteps": "后续操作步骤：",
                "step1": "返回启动器后启动 FileUni。",
                "step2": "打开 Web 界面，并使用管理员账号登录。",
                "step3": "进入管理后台后，再按需要完善更多设置。",
                "startNow": "启动 FileUni",
                "started": "FileUni 已启动",
                "openWebUi": "打开 Web 界面",
                "finishLater": "稍后再说",
                "openHint": "启动后打开 Web 界面即可登录。",
                "runningHint": "FileUni 已在运行，现在可以直接打开 Web 界面开始使用。"
            },
            "logs": {
                "setupSuccess": "设置已完成，请确认后继续。"
            }
        },
        "configGuard": {
            "featureDisabledTitle": "功能已禁用",
            "featureDisabledDesc": "该功能已被管理员禁用，请联系系统管理员获取更多信息。"
        },
        "configSet": {
            "locked": {
                "title": "设置中心暂不可用"
            },
            "config": {
                "versionWarning": {},
                "advanced": {}
            },
            "final": {
                "title": "系统设置完成",
                "subtitle": "管理员账号 {{user}} 已成功授权。",
                "adminCreatedDefault": "已新建管理员 {{user}}，初始密码为 {{password}}。",
                "adminCreatedWithPassword": "已新建管理员 {{user}}，密码为 {{password}}。",
                "adminReset": "管理员 {{user}} 的密码已修改为 {{password}}。",
                "adminExisting": "检测到已有管理员 {{user}}，未修改密码。",
                "nextSteps": "后续操作步骤：",
                "step1": "使用管理员账号登录系统。",
                "step2": "在管理后台的配置页面在线编辑并保存配置。",
                "step3": "确认后返回首页。"
            },
            "logs": {
                "failed": "失败",
                "success": "成功"
            }
        },
        "configSelector": {
            "title": "选择安装位置",
            "subtitle": "先选好唯一的运行目录，FileUni 会在这里统一保存配置和数据",
            "config_path": "运行目录",
            "config_path_desc": "这里会统一保存系统设置、安装状态、数据库、缓存和其他运行数据。",
            "path_placeholder": "输入或选择运行目录...",
            "browse": "选择文件夹",
            "or": "快速选择",
            "current_dir": "继续使用当前位置",
            "current_dir_desc": "沿用您刚才选过的安装位置。",
            "default_dir": "使用推荐位置",
            "default_dir_desc": "使用当前设备上的推荐默认位置。",
            "confirm": "保存位置并继续",
            "default_hint": "如果拿不准，直接使用推荐位置即可，后续也可以再调整。",
            "no_config_warning": "这是首次安装时最先需要确认的一步。",
            "invalid_config": "当前路径不可用，请换一个位置再试",
        }
    }),
    es: mergeLocale(systemConfigEn, {
        "setup": {
            "center": {
                "title": "Centro de configuracion de FileUni",
                "subtitle": "Complete los ajustes iniciales para empezar"
            },
            "guide": {
                "existingConfigTitle": "Configuracion existente detectada",
                "existingConfigDesc": "Ya existe un config.toml en el directorio de ejecucion. Puede aplicarlo directamente para finalizar la configuracion. Para cambiar la contrasena de administrador, use el formulario de abajo.",
                "existingConfigApply": "Aplicar configuracion actual",
                "existingConfigCustomize": "Personalizar configuracion",
                "runtimeDirChangeHint": "Para cambiar el directorio de ejecucion, reinicie FileUni con el argumento -R.",
                "card3Action": "Aplicar",
                "card1Action": "Cambiar ubicacion",
                "openAction": "Abrir este elemento",
                "requiredPrompt": "FileUni aun no ha terminado la configuracion inicial. Abrir el centro de configuracion ahora?",
                "title": "Termine la configuracion de FileUni en unos 30 segundos",
                "desc": "Si es la primera vez que usa FileUni, normalmente puede mantener los valores predeterminados. Defina la contrasena de administrador si la necesita y pulse Aplicar para empezar.",
            },
            "steps": {},
            "locked": {},
            "profile": {},
            "config": {
                "dbType": "Tipo de base de datos",
                "kvType": "Backend de caché",
                "kvRedisHint": "Backends compatibles con Redis (Redis/KeyDB/Valkey)",
                "kvDashmapHint": "Nota: la caché en memoria es volátil y se borra al reiniciar.",
                "kvSqlHint": "Nota: reutilizará la base de datos principal para el almacenamiento de caché.",
                "versionWarning": {},
                "advanced": {}
            },
            "admin": {
                "title": "Crear super administrador",
                "password": "Contraseña segura",
                "resetRuleHint": "Esta contraseña se usará para la cuenta de administrador después de la configuración.",
                "finalConfirmDesc": "Confirme para guardar la configuración y terminar la instalación. Podrá ajustar más opciones después.",
                "finish": "Aplicar configuración",
                "changePassword": "Establecer contraseña de admin",
            },
            "final": {
                "title": "¡Todo está listo!",
                "subtitle": "El administrador {{user}} tiene acceso total.",
                "adminCreatedDefault": "Se creó el administrador {{user}}. Contraseña predeterminada: {{password}}.",
                "adminCreatedWithPassword": "Se creó el administrador {{user}}. Contraseña: {{password}}.",
                "adminReset": "Se actualizó la contraseña del administrador {{user}}: {{password}}.",
                "adminExisting": "Se detectó un administrador existente {{user}}. Contraseña sin cambios.",
                "nextSteps": "Siguientes pasos:",
                "step1": "Inicie sesión con su cuenta de administrador.",
                "step2": "Edite y guarde la configuración en línea en la consola de administración.",
                "step3": "Haga clic en confirmar para volver al lanzador y continuar el flujo normal."
            },
            "logs": {},
            "editor": {
                "title": "Centro de configuracion",
                "check": "Comprobar configuracion",
                "quickSettings": "Continuar configuracion rapida",
                "moreActionsTitle": "Otras opciones avanzadas",
                "moreActionsDesc": "La licencia, el almacenamiento y las comprobaciones de herramientas externas normalmente pueden esperar hasta despues de terminar la configuracion inicial.",
                "showMoreActions": "Mostrar mas opciones avanzadas",
                "hideMoreActions": "Ocultar opciones avanzadas"
            }
        },
        "configSet": {
            "config": { "advanced": {} },
            "logs": { "success": "Éxito", "failed": "Fallo" },
            "locked": { "title": "Centro de configuracion no disponible" },
            "final": {
                "title": "¡Todo está listo!",
                "subtitle": "El administrador {{user}} tiene acceso total.",
                "adminCreatedDefault": "Se creó el administrador {{user}}. Contraseña predeterminada: {{password}}.",
                "adminCreatedWithPassword": "Se creó el administrador {{user}}. Contraseña: {{password}}.",
                "adminReset": "Se actualizó la contraseña del administrador {{user}}: {{password}}.",
                "adminExisting": "Se detectó un administrador existente {{user}}. Contraseña sin cambios.",
                "nextSteps": "Siguientes pasos:",
                "step1": "Inicie sesión con su cuenta de administrador.",
                "step2": "Edite y guarde la configuración en línea en la consola de administración.",
                "step3": "Haga clic en confirmar para volver al lanzador y continuar el flujo normal."
            }
        },
        "configSelector": { "confirm": "Confirmar" }
    }),
    de: mergeLocale(systemConfigEn, {
        "setup": {
            "guide": {
                "existingConfigTitle": "Vorhandene Konfiguration erkannt",
                "existingConfigDesc": "Im Laufzeitverzeichnis existiert bereits eine config.toml. Sie konnen sie direkt anwenden. Um das Admin-Passwort zu andern, verwenden Sie das Formular unten.",
                "existingConfigApply": "Aktuelle Konfiguration anwenden",
                "existingConfigCustomize": "Einstellungen anpassen",
                "runtimeDirChangeHint": "Um das Laufzeitverzeichnis zu andern, starten Sie FileUni mit dem Argument -R neu.",
                "card3Action": "Anwenden",
                "card1Action": "Speicherort andern",
                "openAction": "Diesen Eintrag offnen",
                "requiredPrompt": "FileUni hat die Ersteinrichtung noch nicht abgeschlossen. Jetzt das Einstellungscenter offnen?",
                "title": "FileUni in etwa 30 Sekunden einrichten",
                "desc": "Wenn Sie FileUni zum ersten Mal starten, sind die Standardwerte meist schon passend. Wählen Sie bei Bedarf ein Admin-Passwort und klicken Sie dann direkt auf Anwenden.",
            },
            "steps": {},
            "config": { "advanced": {} },
            "admin": {
                "title": "Admin-Passwort festlegen",
                "changePassword": "Admin-Passwort festlegen",
                "resetRuleHint": "Dieses Passwort wird nach der Einrichtung für das Administratorkonto verwendet.",
                "password": "Admin-Passwort",
                "finalConfirmDesc": "Bestätigen Sie, um die aktuellen Einstellungen zu speichern und die Einrichtung abzuschließen. Weitere Optionen können Sie später anpassen."
            },
            "center": { "title": "Willkommen im FileUni-Einstellungscenter", "subtitle": "Schließen Sie die Ersteinrichtung ab, um zu beginnen" },
            "editor": {
                "title": "Einstellungscenter",
                "check": "Einstellungen prüfen",
                "quickSettings": "Schnelleinrichtung fortsetzen",
                "moreActionsTitle": "Weitere erweiterte Einträge",
                "moreActionsDesc": "Lizenz, Speicher und Prüfungen externer Werkzeuge können in der Regel bis nach der Ersteinrichtung warten.",
                "showMoreActions": "Weitere erweiterte Einträge anzeigen",
                "hideMoreActions": "Erweiterte Einträge ausblenden"
            },
            "final": {
                "title": "Alles ist bereit!",
                "subtitle": "Der Administrator {{user}} hat jetzt vollen Zugriff.",
                "adminCreatedDefault": "Administrator {{user}} wurde erstellt. Standardpasswort: {{password}}.",
                "adminCreatedWithPassword": "Administrator {{user}} wurde erstellt. Passwort: {{password}}.",
                "adminReset": "Das Passwort für Administrator {{user}} wurde aktualisiert: {{password}}.",
                "adminExisting": "Vorhandener Administrator {{user}} erkannt. Das Passwort blieb unverändert.",
                "nextSteps": "Nächste Schritte:",
                "step1": "Melden Sie sich mit dem Administratorkonto an.",
                "step2": "Bearbeiten und speichern Sie die Konfiguration in der Admin-Konsole.",
                "step3": "Klicken Sie auf Bestätigen, um zum Launcher zurückzukehren und normal fortzufahren."
            },
            "locked": {}
        },
        "configSet": {
            "config": { "advanced": {} },
            "logs": { "failed": "Fehlgeschlagen", "success": "Erfolg" },
            "locked": { "title": "Einstellungscenter nicht verfügbar" },
            "final": {
                "title": "Alles ist bereit!",
                "subtitle": "Der Administrator {{user}} hat jetzt vollen Zugriff.",
                "adminCreatedDefault": "Administrator {{user}} wurde erstellt. Standardpasswort: {{password}}.",
                "adminCreatedWithPassword": "Administrator {{user}} wurde erstellt. Passwort: {{password}}.",
                "adminReset": "Das Passwort für Administrator {{user}} wurde aktualisiert: {{password}}.",
                "adminExisting": "Vorhandener Administrator {{user}} erkannt. Das Passwort blieb unverändert.",
                "nextSteps": "Nächste Schritte:",
                "step1": "Melden Sie sich mit dem Administratorkonto an.",
                "step2": "Bearbeiten und speichern Sie die Konfiguration in der Admin-Konsole.",
                "step3": "Klicken Sie auf Bestätigen, um zum Launcher zurückzukehren und normal fortzufahren."
            }
        },
        "configSelector": { "confirm": "Bestätigen" }
    }),
    fr: mergeLocale(systemConfigEn, {
        "setup": {
            "center": { "title": "Centre de parametres FileUni", "subtitle": "Terminez les parametres initiaux pour commencer" },
            "guide": {
                "runtimeDirChangeHint": "Pour changer le repertoire d'execution, redemarrez FileUni avec l'argument -R.",
                "card1Action": "Changer l'emplacement",
                "card3Action": "Appliquer",
                "openAction": "Ouvrir cet element",
                "requiredPrompt": "FileUni n'a pas encore termine la configuration initiale. Ouvrir le centre de configuration maintenant ?",
                "existingConfigTitle": "Configuration existante detectee",
                "existingConfigDesc": "Un fichier config.toml existe deja dans le repertoire d'execution. Vous pouvez l'appliquer directement pour terminer la configuration. Pour modifier le mot de passe administrateur, utilisez le formulaire ci-dessous.",
                "existingConfigApply": "Appliquer la configuration actuelle",
                "existingConfigCustomize": "Personnaliser la configuration",
                "title": "Terminez la configuration de FileUni en environ 30 secondes",
                "desc": "Si vous utilisez FileUni pour la premiere fois, les valeurs par defaut suffisent generalement. Ajoutez un mot de passe administrateur si besoin, puis appliquez directement la configuration.",
            },
            "steps": {},
            "locked": {},
            "profile": {},
            "config": {
                "dbType": "Type de base de données",
                "kvType": "Backend de cache",
                "kvRedisHint": "Backends compatibles Redis (Redis/KeyDB/Valkey)",
                "kvDashmapHint": "Note : le cache en mémoire est volatil et effacé au redémarrage.",
                "kvSqlHint": "Note : la base principale sera réutilisée pour le stockage du cache.",
                "versionWarning": {},
                "advanced": {}
            },
            "admin": {
                "title": "Créer le super admin",
                "password": "Mot de passe sécurisé",
                "resetRuleHint": "Ce mot de passe sera utilisé pour le compte administrateur après l'installation.",
                "finalConfirmDesc": "Confirmez pour enregistrer vos réglages et terminer l'installation. Vous pourrez ajuster d'autres options plus tard.",
                "finish": "Appliquer la configuration",
                "changePassword": "Définir le mot de passe admin",
            },
            "final": {
                "title": "Tout est prêt !",
                "subtitle": "L'administrateur {{user}} a reçu un accès complet.",
                "adminCreatedDefault": "Administrateur {{user}} créé. Mot de passe par défaut : {{password}}.",
                "adminCreatedWithPassword": "Administrateur {{user}} créé. Mot de passe : {{password}}.",
                "adminReset": "Mot de passe mis à jour pour l'administrateur {{user}} : {{password}}.",
                "adminExisting": "Administrateur existant détecté : {{user}}. Mot de passe inchangé.",
                "nextSteps": "Que faire ensuite :",
                "step1": "Connectez-vous avec votre compte administrateur.",
                "step2": "Éditez et enregistrez la configuration en ligne dans la console admin.",
                "step3": "Cliquez sur confirmer pour retourner au lanceur et continuer le flux normal."
            },
            "logs": {},
            "editor": {
                "title": "Centre de parametres",
                "check": "Verifier les parametres",
                "quickSettings": "Continuer la configuration rapide",
                "moreActionsTitle": "Autres entrees avancees",
                "moreActionsDesc": "La licence, le stockage et les verifications des outils externes peuvent generalement attendre la fin de la configuration initiale.",
                "showMoreActions": "Afficher plus d’entrees avancees",
                "hideMoreActions": "Masquer les entrees avancees"
            }
        },
        "configSet": {
            "config": { "advanced": {} },
            "logs": { "success": "Succès", "failed": "Echec" },
            "locked": { "title": "Centre de parametres indisponible" },
            "final": {
                "title": "Tout est prêt !",
                "subtitle": "L'administrateur {{user}} a reçu un accès complet.",
                "adminCreatedDefault": "Administrateur {{user}} créé. Mot de passe par défaut : {{password}}.",
                "adminCreatedWithPassword": "Administrateur {{user}} créé. Mot de passe : {{password}}.",
                "adminReset": "Mot de passe mis à jour pour l'administrateur {{user}} : {{password}}.",
                "adminExisting": "Administrateur existant détecté : {{user}}. Mot de passe inchangé.",
                "nextSteps": "Que faire ensuite :",
                "step1": "Connectez-vous avec votre compte administrateur.",
                "step2": "Éditez et enregistrez la configuration en ligne dans la console admin.",
                "step3": "Cliquez sur confirmer pour retourner au lanceur et continuer le flux normal."
            }
        },
        "configSelector": { "confirm": "Confirmer" }
    }),
    ru: mergeLocale(systemConfigEn, {
        "setup": {
            "center": { "title": "Центр настроек FileUni", "subtitle": "Завершите первоначальные настройки и начните работу" },
            "guide": {
                "runtimeDirChangeHint": "Чтобы изменить рабочий каталог, перезапустите FileUni с аргументом -R.",
                "card1Action": "Изменить расположение",
                "card3Action": "Применить",
                "openAction": "Открыть этот раздел",
                "requiredPrompt": "FileUni еще не завершил первоначальную настройку. Открыть центр настроек сейчас?",
                "existingConfigTitle": "Обнаружена существующая конфигурация",
                "existingConfigDesc": "В рабочем каталоге уже есть файл config.toml. Вы можете применить его напрямую, чтобы завершить настройку. Чтобы изменить пароль администратора, используйте форму ниже.",
                "existingConfigApply": "Применить текущую конфигурацию",
                "existingConfigCustomize": "Настроить конфигурацию",
                "title": "Завершите настройку FileUni примерно за 30 секунд",
                "desc": "Если вы запускаете FileUni впервые, значения по умолчанию обычно уже подходят. При необходимости задайте пароль администратора и сразу нажмите Применить.",
            },
            "steps": {
                "step": "Шаг"
            },
            "locked": {},
            "profile": {},
            "config": {
                "dbType": "Тип базы данных",
                "kvType": "Кэш-бэкенд",
                "kvRedisHint": "Бэкенды, совместимые с Redis (Redis/KeyDB/Valkey)",
                "kvDashmapHint": "Примечание: кэш в памяти волатилен и очищается при перезапуске.",
                "kvSqlHint": "Примечание: будет использована основная база данных для хранения кэша.",
                "versionWarning": {},
                "advanced": {}
            },
            "admin": {
                "title": "Создать супер-админа",
                "password": "Надежный пароль",
                "resetRuleHint": "После настройки этот пароль будет использоваться для учетной записи администратора.",
                "finalConfirmDesc": "Подтвердите, чтобы сохранить настройки и завершить установку. Остальные параметры можно изменить позже.",
                "finish": "Применить конфигурацию",
                "changePassword": "Задать пароль администратора",
            },
            "final": {
                "title": "Все готово!",
                "subtitle": "Администратор {{user}} получил полный доступ.",
                "adminCreatedDefault": "Создан администратор {{user}}. Пароль по умолчанию: {{password}}.",
                "adminCreatedWithPassword": "Создан администратор {{user}}. Пароль: {{password}}.",
                "adminReset": "Пароль администратора {{user}} обновлен: {{password}}.",
                "adminExisting": "Обнаружен существующий администратор {{user}}. Пароль не изменен.",
                "nextSteps": "Что делать дальше:",
                "step1": "Войдите под учетной записью администратора.",
                "step2": "Отредактируйте и сохраните конфигурацию онлайн в админ-консоли.",
                "step3": "Нажмите подтвердить, чтобы вернуться в лаунчер и продолжить обычный сценарий."
            },
            "logs": {},
            "editor": {
                "title": "Центр настроек",
                "check": "Проверить настройки",
                "quickSettings": "Продолжить быструю настройку",
                "moreActionsTitle": "Другие расширенные разделы",
                "moreActionsDesc": "Лицензия, хранилище и проверка внешних инструментов обычно могут подождать до завершения первоначальной настройки.",
                "showMoreActions": "Показать больше расширенных разделов",
                "hideMoreActions": "Скрыть расширенные разделы"
            }
        },
        "configSet": {
            "config": { "advanced": {} },
            "logs": { "success": "Успех", "failed": "Ошибка" },
            "locked": { "title": "Центр настроек недоступен" },
            "final": {
                "title": "Все готово!",
                "subtitle": "Администратор {{user}} получил полный доступ.",
                "adminCreatedDefault": "Создан администратор {{user}}. Пароль по умолчанию: {{password}}.",
                "adminCreatedWithPassword": "Создан администратор {{user}}. Пароль: {{password}}.",
                "adminReset": "Пароль администратора {{user}} обновлен: {{password}}.",
                "adminExisting": "Обнаружен существующий администратор {{user}}. Пароль не изменен.",
                "nextSteps": "Что делать дальше:",
                "step1": "Войдите под учетной записью администратора.",
                "step2": "Отредактируйте и сохраните конфигурацию онлайн в админ-консоли.",
                "step3": "Нажмите подтвердить, чтобы вернуться в лаунчер и продолжить обычный сценарий."
            }
        },
        "configSelector": { "confirm": "Подтвердить" }
    }),
    ja: mergeLocale(systemConfigEn, {
        "setup": {
            "center": { "title": "FileUni 設定センター", "subtitle": "初回設定を完了して使い始めましょう" },
            "guide": {
                "runtimeDirChangeHint": "実行ディレクトリを変更するには、-R 引数を付けて FileUni を再起動してください。",
                "card1Action": "保存場所を変更",
                "card3Action": "適用",
                "openAction": "この項目を開く",
                "requiredPrompt": "FileUni はまだ初回設定を完了していません。今すぐ設定センターを開きますか？",
                "existingConfigTitle": "既存の設定を検出しました",
                "existingConfigDesc": "実行ディレクトリ内に config.toml が既に存在します。そのまま適用して設定を完了できます。管理者パスワードを変更する場合は、下のフォームを使ってください。",
                "existingConfigApply": "現在の設定を適用",
                "existingConfigCustomize": "設定を調整",
                "title": "約30秒で FileUni の初期設定を完了",
                "desc": "初めて FileUni を使う場合は、通常は既定値のままで十分です。必要なら管理者パスワードを設定し、そのまま適用してください。",
            },
            "steps": {},
            "locked": {},
            "profile": {},
            "config": {
                "dbType": "データベース種類",
                "kvType": "キャッシュバックエンド",
                "kvRedisHint": "Redis 互換バックエンド (Redis/KeyDB/Valkey)",
                "kvDashmapHint": "注: メモリキャッシュは揮発性で、再起動で消去されます。",
                "kvSqlHint": "注: キャッシュ保存にプライマリ DB を再利用します。",
                "versionWarning": {},
                "advanced": {}
            },
            "admin": {
                "title": "スーパー管理者を作成",
                "password": "安全なパスワード",
                "resetRuleHint": "セットアップ完了後、このパスワードで管理者アカウントにログインします。",
                "finalConfirmDesc": "確認すると現在の設定を保存してセットアップを完了します。追加設定は後から調整できます。",
                "finish": "設定を適用",
                "changePassword": "管理者パスワードを設定",
            },
            "final": {
                "title": "準備完了です！",
                "subtitle": "管理者 {{user}} にフルアクセスを付与しました。",
                "adminCreatedDefault": "管理者 {{user}} を作成しました。既定パスワード: {{password}}。",
                "adminCreatedWithPassword": "管理者 {{user}} を作成しました。パスワード: {{password}}。",
                "adminReset": "管理者 {{user}} のパスワードを更新しました: {{password}}。",
                "adminExisting": "既存の管理者 {{user}} を検出しました。パスワードは変更されません。",
                "nextSteps": "次に行うこと:",
                "step1": "管理者アカウントでサインインします。",
                "step2": "管理コンソールで設定を編集して保存します。",
                "step3": "確認をクリックしてランチャーに戻り、通常フローを続行します。"
            },
            "logs": {},
            "editor": {
                "title": "設定センター",
                "check": "設定を確認",
                "quickSettings": "クイック設定を続ける",
                "moreActionsTitle": "その他の詳細項目",
                "moreActionsDesc": "ライセンス、ストレージ、外部ツールの確認は、通常は初期設定の完了後でも問題ありません。",
                "showMoreActions": "詳細項目をさらに表示",
                "hideMoreActions": "詳細項目を隠す"
            }
        },
        "configSet": {
            "config": { "advanced": {} },
            "logs": { "success": "成功", "failed": "失敗" },
            "locked": { "title": "設定センターを開けません" },
            "final": {
                "title": "準備完了です！",
                "subtitle": "管理者 {{user}} にフルアクセスを付与しました。",
                "adminCreatedDefault": "管理者 {{user}} を作成しました。既定パスワード: {{password}}。",
                "adminCreatedWithPassword": "管理者 {{user}} を作成しました。パスワード: {{password}}。",
                "adminReset": "管理者 {{user}} のパスワードを更新しました: {{password}}。",
                "adminExisting": "既存の管理者 {{user}} を検出しました。パスワードは変更されません。",
                "nextSteps": "次に行うこと:",
                "step1": "管理者アカウントでサインインします。",
                "step2": "管理コンソールで設定を編集して保存します。",
                "step3": "確認をクリックしてランチャーに戻り、通常フローを続行します。"
            }
        },
        "configSelector": { "confirm": "確認" }
    })
});
type SystemConfigMessages = LocaleShape<(typeof systemConfigBundle)['en']>;
export const systemConfigByResourceLocale = {
    'zh-CN': systemConfigBundle['zh-CN'],
  'zh-Hant': systemConfigBundle['zh-Hant'],
  en: systemConfigBundle.en,
    es: systemConfigBundle.es,
    de: systemConfigBundle.de,
    fr: systemConfigBundle.fr,
    ru: systemConfigBundle.ru,
    ja: systemConfigBundle.ja,
} satisfies Record<FrontendResourceLocale, SystemConfigMessages>;
