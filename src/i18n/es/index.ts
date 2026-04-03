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
  "about": aboutByResourceLocale.es,
  "admin": {
    ...admin,
    "settings": adminSetting.admin.settings,
    "config": adminSetting.admin.config,
  },
  "auth": authByResourceLocale.es,
  "blacklist": blacklistByResourceLocale.es,
  "cacheManager": cacheManagerByResourceLocale.es,
  "chat": chat,
  "common": common,
  "email": email,
  "errors": errors,
  "filemanager": filemanager,
  "forgotPassword": forgotPasswordByResourceLocale.es,
  "languages": languagesByResourceLocale.es,
  "launcher": launcherByResourceLocale.es,
  "nav": navByResourceLocale.es,
  "pages": pages,
  "player": playerByResourceLocale.es,
  "privacy": privacyByResourceLocale.es,
  "profile": profileByResourceLocale.es,
  "security": securityByResourceLocale.es,
  "sessions": sessionsByResourceLocale.es,
  "systemConfig": systemConfig,
  "themes": themesByResourceLocale.es,
  "tos": tosByResourceLocale.es,
  "welcome": welcomeByResourceLocale.es,
} as const;

export default translation;
