import about from './about.json';
import admin from './admin.json';
import adminSetting from './admin-setting.json';
import auth from './auth.json';
import { forgotPasswordByResourceLocale } from '../bundles/forgotPassword';
import { navByResourceLocale } from '../bundles/nav';
import { privacyByResourceLocale } from '../bundles/privacy';
import { profileByResourceLocale } from '../bundles/profile';
import { sessionsByResourceLocale } from '../bundles/sessions';
import { tosByResourceLocale } from '../bundles/tos';
import { cacheManagerByResourceLocale } from '../bundles/cacheManager';
import chat from './chat.json';
import common from './common.json';
import email from './email.json';
import errors from './errors.json';
import filemanager from './filemanager.json';
import launcher from './launcher.json';
import pages from './pages.json';
import security from './security.json';
import systemConfig from './system_config.json';
import { blacklistByResourceLocale } from '../bundles/blacklist';
import { languagesByResourceLocale } from '../bundles/languages';
import { playerByResourceLocale } from '../bundles/player';
import { themesByResourceLocale } from '../bundles/themes';
import { welcomeByResourceLocale } from '../bundles/welcome';

const translation = {
  "about": about,
  "admin": {
    ...admin,
    "settings": adminSetting.admin.settings,
    "config": adminSetting.admin.config,
  },
  "auth": auth,
  "blacklist": blacklistByResourceLocale.en,
  "cacheManager": cacheManagerByResourceLocale.en,
  "chat": chat,
  "common": common,
  "email": email,
  "errors": errors,
  "filemanager": filemanager,
  "forgotPassword": forgotPasswordByResourceLocale.en,
  "languages": languagesByResourceLocale.en,
  "launcher": launcher,
  "nav": navByResourceLocale.en,
  "pages": pages,
  "player": playerByResourceLocale.en,
  "privacy": privacyByResourceLocale.en,
  "profile": profileByResourceLocale.en,
  "security": security,
  "sessions": sessionsByResourceLocale.en,
  "systemConfig": systemConfig,
  "themes": themesByResourceLocale.en,
  "tos": tosByResourceLocale.en,
  "welcome": welcomeByResourceLocale.en,
} as const;

export default translation;
