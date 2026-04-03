import admin from './admin.json';
import adminSetting from './admin-setting.json';
import { aboutByResourceLocale } from '../bundles/about';
import { authByResourceLocale } from '../bundles/auth';
import { blacklistByResourceLocale } from '../bundles/blacklist';
import { cacheManagerByResourceLocale } from '../bundles/cacheManager';
import { forgotPasswordByResourceLocale } from '../bundles/forgotPassword';
import { launcherByResourceLocale } from '../bundles/launcher';
import { navByResourceLocale } from '../bundles/nav';
import { privacyByResourceLocale } from '../bundles/privacy';
import { profileByResourceLocale } from '../bundles/profile';
import { securityByResourceLocale } from '../bundles/security';
import { sessionsByResourceLocale } from '../bundles/sessions';
import { tosByResourceLocale } from '../bundles/tos';
import chat from './chat.json';
import common from './common.json';
import email from './email.json';
import errors from './errors.json';
import filemanager from './filemanager.json';
import pages from './pages.json';
import { playerByResourceLocale } from '../bundles/player';
import systemConfig from './system_config.json';
import { welcomeByResourceLocale } from '../bundles/welcome';
import { languagesByResourceLocale } from '../bundles/languages';
import { themesByResourceLocale } from '../bundles/themes';

const translation = {
  "about": aboutByResourceLocale.ru,
  "admin": {
    ...admin,
    "settings": adminSetting.admin.settings,
    "config": adminSetting.admin.config,
  },
  "auth": authByResourceLocale.ru,
  "blacklist": blacklistByResourceLocale.ru,
  "cacheManager": cacheManagerByResourceLocale.ru,
  "chat": chat,
  "common": common,
  "email": email,
  "errors": errors,
  "filemanager": filemanager,
  "forgotPassword": forgotPasswordByResourceLocale.ru,
  "languages": languagesByResourceLocale.ru,
  "launcher": launcherByResourceLocale.ru,
  "nav": navByResourceLocale.ru,
  "pages": pages,
  "player": playerByResourceLocale.ru,
  "privacy": privacyByResourceLocale.ru,
  "profile": profileByResourceLocale.ru,
  "security": securityByResourceLocale.ru,
  "sessions": sessionsByResourceLocale.ru,
  "systemConfig": systemConfig,
  "themes": themesByResourceLocale.ru,
  "tos": tosByResourceLocale.ru,
  "welcome": welcomeByResourceLocale.ru,
} as const;

export default translation;
