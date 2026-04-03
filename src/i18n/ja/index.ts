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
  "about": aboutByResourceLocale.ja,
  "admin": {
    ...admin,
    "settings": adminSetting.admin.settings,
    "config": adminSetting.admin.config,
  },
  "auth": authByResourceLocale.ja,
  "blacklist": blacklistByResourceLocale.ja,
  "cacheManager": cacheManagerByResourceLocale.ja,
  "chat": chat,
  "common": common,
  "email": email,
  "errors": errors,
  "filemanager": filemanager,
  "forgotPassword": forgotPasswordByResourceLocale.ja,
  "languages": languagesByResourceLocale.ja,
  "launcher": launcherByResourceLocale.ja,
  "nav": navByResourceLocale.ja,
  "pages": pages,
  "player": playerByResourceLocale.ja,
  "privacy": privacyByResourceLocale.ja,
  "profile": profileByResourceLocale.ja,
  "security": securityByResourceLocale.ja,
  "sessions": sessionsByResourceLocale.ja,
  "systemConfig": systemConfig,
  "themes": themesByResourceLocale.ja,
  "tos": tosByResourceLocale.ja,
  "welcome": welcomeByResourceLocale.ja,
} as const;

export default translation;
