import admin from './admin.json';
import adminSetting from './admin-setting.json';
import { aboutByResourceLocale } from '../bundles/about';
import { authByResourceLocale } from '../bundles/auth';
import { commonByResourceLocale } from '../bundles/common';
import { emailByResourceLocale } from '../bundles/email';
import { errorsByResourceLocale } from '../bundles/errors';
import { forgotPasswordByResourceLocale } from '../bundles/forgotPassword';
import { launcherByResourceLocale } from '../bundles/launcher';
import { navByResourceLocale } from '../bundles/nav';
import { privacyByResourceLocale } from '../bundles/privacy';
import { profileByResourceLocale } from '../bundles/profile';
import { securityByResourceLocale } from '../bundles/security';
import { sessionsByResourceLocale } from '../bundles/sessions';
import { tosByResourceLocale } from '../bundles/tos';
import { cacheManagerByResourceLocale } from '../bundles/cacheManager';
import { chatByResourceLocale } from '../bundles/chat';
import filemanager from './filemanager.json';
import { pagesByResourceLocale } from '../bundles/pages';
import { systemConfigByResourceLocale } from '../bundles/systemConfig';
import { blacklistByResourceLocale } from '../bundles/blacklist';
import { languagesByResourceLocale } from '../bundles/languages';
import { playerByResourceLocale } from '../bundles/player';
import { themesByResourceLocale } from '../bundles/themes';
import { welcomeByResourceLocale } from '../bundles/welcome';

const translation = {
  "about": aboutByResourceLocale.en,
  "admin": {
    ...admin,
    "settings": adminSetting.admin.settings,
    "config": adminSetting.admin.config,
  },
  "auth": authByResourceLocale.en,
  "blacklist": blacklistByResourceLocale.en,
  "cacheManager": cacheManagerByResourceLocale.en,
  "chat": chatByResourceLocale.en,
  "common": commonByResourceLocale.en,
  "email": emailByResourceLocale.en,
  "errors": errorsByResourceLocale.en,
  "filemanager": filemanager,
  "forgotPassword": forgotPasswordByResourceLocale.en,
  "languages": languagesByResourceLocale.en,
  "launcher": launcherByResourceLocale.en,
  "nav": navByResourceLocale.en,
  "pages": pagesByResourceLocale.en,
  "player": playerByResourceLocale.en,
  "privacy": privacyByResourceLocale.en,
  "profile": profileByResourceLocale.en,
  "security": securityByResourceLocale.en,
  "sessions": sessionsByResourceLocale.en,
  "systemConfig": systemConfigByResourceLocale.en,
  "themes": themesByResourceLocale.en,
  "tos": tosByResourceLocale.en,
  "welcome": welcomeByResourceLocale.en,
} as const;

export default translation;
