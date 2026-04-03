import about from './about.json';
import admin from './admin.json';
import adminSetting from './admin-setting.json';
import auth from './auth.json';
import { blacklistByResourceLocale } from '../bundles/blacklist';
import { cacheManagerByResourceLocale } from '../bundles/cacheManager';
import { forgotPasswordByResourceLocale } from '../bundles/forgotPassword';
import { navByResourceLocale } from '../bundles/nav';
import { privacyByResourceLocale } from '../bundles/privacy';
import { profileByResourceLocale } from '../bundles/profile';
import { sessionsByResourceLocale } from '../bundles/sessions';
import { tosByResourceLocale } from '../bundles/tos';
import chat from './chat.json';
import common from './common.json';
import email from './email.json';
import errors from './errors.json';
import filemanager from './filemanager.json';
import launcher from './launcher.json';
import pages from './pages.json';
import { playerByResourceLocale } from '../bundles/player';
import security from './security.json';
import systemConfig from './system_config.json';
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
  "cacheManager": cacheManagerByResourceLocale.de,
  "chat": chat,
  "common": common,
  "email": email,
  "errors": errors,
  "filemanager": filemanager,
  "forgotPassword": forgotPasswordByResourceLocale.de,
  "languages": languagesByResourceLocale.de,
  "launcher": launcher,
  "nav": navByResourceLocale.de,
  "pages": pages,
  "player": playerByResourceLocale.de,
  "privacy": privacyByResourceLocale.de,
  "profile": profileByResourceLocale.de,
  "security": security,
  "sessions": sessionsByResourceLocale.de,
  "systemConfig": systemConfig,
  "themes": themesByResourceLocale.de,
  "tos": tosByResourceLocale.de,
  "welcome": welcomeByResourceLocale.de,
} as const;

export default translation;
