import admin from './admin.json';
import adminSetting from './admin-setting.json';
import { aboutByResourceLocale } from '../bundles/about';
import { authByResourceLocale } from '../bundles/auth';
import { blacklistByResourceLocale } from '../bundles/blacklist';
import { cacheManagerByResourceLocale } from '../bundles/cacheManager';
import { chatByResourceLocale } from '../bundles/chat';
import { commonByResourceLocale } from '../bundles/common';
import { emailByResourceLocale } from '../bundles/email';
import { errorsByResourceLocale } from '../bundles/errors';
import { forgotPasswordByResourceLocale } from '../bundles/forgotPassword';
import { launcherByResourceLocale } from '../bundles/launcher';
import { navByResourceLocale } from '../bundles/nav';
import { pagesByResourceLocale } from '../bundles/pages';
import { privacyByResourceLocale } from '../bundles/privacy';
import { profileByResourceLocale } from '../bundles/profile';
import { securityByResourceLocale } from '../bundles/security';
import { sessionsByResourceLocale } from '../bundles/sessions';
import { systemConfigByResourceLocale } from '../bundles/systemConfig';
import { tosByResourceLocale } from '../bundles/tos';
import filemanager from './filemanager.json';
import { playerByResourceLocale } from '../bundles/player';
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
  "chat": chatByResourceLocale.ja,
  "common": commonByResourceLocale.ja,
  "email": emailByResourceLocale.ja,
  "errors": errorsByResourceLocale.ja,
  "filemanager": filemanager,
  "forgotPassword": forgotPasswordByResourceLocale.ja,
  "languages": languagesByResourceLocale.ja,
  "launcher": launcherByResourceLocale.ja,
  "nav": navByResourceLocale.ja,
  "pages": pagesByResourceLocale.ja,
  "player": playerByResourceLocale.ja,
  "privacy": privacyByResourceLocale.ja,
  "profile": profileByResourceLocale.ja,
  "security": securityByResourceLocale.ja,
  "sessions": sessionsByResourceLocale.ja,
  "systemConfig": systemConfigByResourceLocale.ja,
  "themes": themesByResourceLocale.ja,
  "tos": tosByResourceLocale.ja,
  "welcome": welcomeByResourceLocale.ja,
} as const;

export default translation;
