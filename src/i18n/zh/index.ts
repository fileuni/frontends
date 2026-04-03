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
  "about": aboutByResourceLocale.zh,
  "admin": {
    ...admin,
    "settings": adminSetting.admin.settings,
    "config": adminSetting.admin.config,
  },
  "auth": authByResourceLocale.zh,
  "blacklist": blacklistByResourceLocale.zh,
  "cacheManager": cacheManagerByResourceLocale.zh,
  "chat": chatByResourceLocale.zh,
  "common": commonByResourceLocale.zh,
  "email": emailByResourceLocale.zh,
  "errors": errorsByResourceLocale.zh,
  "filemanager": filemanager,
  "forgotPassword": forgotPasswordByResourceLocale.zh,
  "languages": languagesByResourceLocale.zh,
  "launcher": launcherByResourceLocale.zh,
  "nav": navByResourceLocale.zh,
  "pages": pagesByResourceLocale.zh,
  "player": playerByResourceLocale.zh,
  "privacy": privacyByResourceLocale.zh,
  "profile": profileByResourceLocale.zh,
  "security": securityByResourceLocale.zh,
  "sessions": sessionsByResourceLocale.zh,
  "systemConfig": systemConfigByResourceLocale.zh,
  "themes": themesByResourceLocale.zh,
  "tos": tosByResourceLocale.zh,
  "welcome": welcomeByResourceLocale.zh,
} as const;

export default translation;
