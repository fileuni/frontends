import about from './about.json';
import admin from './admin.json';
import adminSetting from './admin-setting.json';
import auth from './auth.json';
import { blacklistByResourceLocale } from '../bundles/blacklist';
import cacheManager from './cacheManager.json';
import chat from './chat.json';
import common from './common.json';
import email from './email.json';
import errors from './errors.json';
import filemanager from './filemanager.json';
import forgotPassword from './forgotPassword.json';
import launcher from './launcher.json';
import nav from './nav.json';
import pages from './pages.json';
import { playerByResourceLocale } from '../bundles/player';
import privacy from './privacy.json';
import profile from './profile.json';
import security from './security.json';
import sessions from './sessions.json';
import systemConfig from './system_config.json';
import tos from './tos.json';
import { welcomeByResourceLocale } from '../bundles/welcome';
import { languagesByResourceLocale } from '../bundles/languages';
import { themesByResourceLocale } from '../bundles/themes';

const translation = {
  "about": about,
  "admin": {
    ...admin,
    "settings": adminSetting.admin.settings,
    "config": adminSetting.admin.config,
  },
  "auth": auth,
  "blacklist": blacklistByResourceLocale.de,
  "cacheManager": cacheManager,
  "chat": chat,
  "common": common,
  "email": email,
  "errors": errors,
  "filemanager": filemanager,
  "forgotPassword": forgotPassword,
  "languages": languagesByResourceLocale.de,
  "launcher": launcher,
  "nav": nav,
  "pages": pages,
  "player": playerByResourceLocale.de,
  "privacy": privacy,
  "profile": profile,
  "security": security,
  "sessions": sessions,
  "systemConfig": systemConfig,
  "themes": themesByResourceLocale.de,
  "tos": tos,
  "welcome": welcomeByResourceLocale.de,
} as const;

export default translation;
