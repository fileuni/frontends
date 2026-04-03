import { adminByResourceLocale } from '../bundles/admin';
import { adminSettingByResourceLocale } from '../bundles/adminSetting';
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
import { filemanagerByResourceLocale } from '../bundles/filemanager';
import { playerByResourceLocale } from '../bundles/player';
import { welcomeByResourceLocale } from '../bundles/welcome';
import { languagesByResourceLocale } from '../bundles/languages';
import { themesByResourceLocale } from '../bundles/themes';

const translation = {
  "about": aboutByResourceLocale.es,
  "admin": {
    ...adminByResourceLocale.es,
    "settings": adminSettingByResourceLocale.es.admin.settings,
    "config": adminSettingByResourceLocale.es.admin.config,
  },
  "auth": authByResourceLocale.es,
  "blacklist": blacklistByResourceLocale.es,
  "cacheManager": cacheManagerByResourceLocale.es,
  "chat": chatByResourceLocale.es,
  "common": commonByResourceLocale.es,
  "email": emailByResourceLocale.es,
  "errors": errorsByResourceLocale.es,
  "filemanager": filemanagerByResourceLocale.es,
  "forgotPassword": forgotPasswordByResourceLocale.es,
  "languages": languagesByResourceLocale.es,
  "launcher": launcherByResourceLocale.es,
  "nav": navByResourceLocale.es,
  "pages": pagesByResourceLocale.es,
  "player": playerByResourceLocale.es,
  "privacy": privacyByResourceLocale.es,
  "profile": profileByResourceLocale.es,
  "security": securityByResourceLocale.es,
  "sessions": sessionsByResourceLocale.es,
  "systemConfig": systemConfigByResourceLocale.es,
  "themes": themesByResourceLocale.es,
  "tos": tosByResourceLocale.es,
  "welcome": welcomeByResourceLocale.es,
} as const;

export default translation;
