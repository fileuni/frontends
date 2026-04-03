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
  "about": aboutByResourceLocale.de,
  "admin": {
    ...admin,
    "settings": adminSetting.admin.settings,
    "config": adminSetting.admin.config,
  },
  "auth": authByResourceLocale.de,
  "blacklist": blacklistByResourceLocale.de,
  "cacheManager": cacheManagerByResourceLocale.de,
  "chat": chatByResourceLocale.de,
  "common": commonByResourceLocale.de,
  "email": emailByResourceLocale.de,
  "errors": errorsByResourceLocale.de,
  "filemanager": filemanager,
  "forgotPassword": forgotPasswordByResourceLocale.de,
  "languages": languagesByResourceLocale.de,
  "launcher": launcherByResourceLocale.de,
  "nav": navByResourceLocale.de,
  "pages": pagesByResourceLocale.de,
  "player": playerByResourceLocale.de,
  "privacy": privacyByResourceLocale.de,
  "profile": profileByResourceLocale.de,
  "security": securityByResourceLocale.de,
  "sessions": sessionsByResourceLocale.de,
  "systemConfig": systemConfigByResourceLocale.de,
  "themes": themesByResourceLocale.de,
  "tos": tosByResourceLocale.de,
  "welcome": welcomeByResourceLocale.de,
} as const;

export default translation;
