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
  "about": aboutByResourceLocale.fr,
  "admin": {
    ...admin,
    "settings": adminSetting.admin.settings,
    "config": adminSetting.admin.config,
  },
  "auth": authByResourceLocale.fr,
  "blacklist": blacklistByResourceLocale.fr,
  "cacheManager": cacheManagerByResourceLocale.fr,
  "chat": chat,
  "common": common,
  "email": email,
  "errors": errors,
  "filemanager": filemanager,
  "forgotPassword": forgotPasswordByResourceLocale.fr,
  "languages": languagesByResourceLocale.fr,
  "launcher": launcherByResourceLocale.fr,
  "nav": navByResourceLocale.fr,
  "pages": pages,
  "player": playerByResourceLocale.fr,
  "privacy": privacyByResourceLocale.fr,
  "profile": profileByResourceLocale.fr,
  "security": securityByResourceLocale.fr,
  "sessions": sessionsByResourceLocale.fr,
  "systemConfig": systemConfig,
  "themes": themesByResourceLocale.fr,
  "tos": tosByResourceLocale.fr,
  "welcome": welcomeByResourceLocale.fr,
} as const;

export default translation;
