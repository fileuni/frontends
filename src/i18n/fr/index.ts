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
  "about": aboutByResourceLocale.fr,
  "admin": {
    ...adminByResourceLocale.fr,
    "settings": adminSettingByResourceLocale.fr.admin.settings,
    "config": adminSettingByResourceLocale.fr.admin.config,
  },
  "auth": authByResourceLocale.fr,
  "blacklist": blacklistByResourceLocale.fr,
  "cacheManager": cacheManagerByResourceLocale.fr,
  "chat": chatByResourceLocale.fr,
  "common": commonByResourceLocale.fr,
  "email": emailByResourceLocale.fr,
  "errors": errorsByResourceLocale.fr,
  "filemanager": filemanagerByResourceLocale.fr,
  "forgotPassword": forgotPasswordByResourceLocale.fr,
  "languages": languagesByResourceLocale.fr,
  "launcher": launcherByResourceLocale.fr,
  "nav": navByResourceLocale.fr,
  "pages": pagesByResourceLocale.fr,
  "player": playerByResourceLocale.fr,
  "privacy": privacyByResourceLocale.fr,
  "profile": profileByResourceLocale.fr,
  "security": securityByResourceLocale.fr,
  "sessions": sessionsByResourceLocale.fr,
  "systemConfig": systemConfigByResourceLocale.fr,
  "themes": themesByResourceLocale.fr,
  "tos": tosByResourceLocale.fr,
  "welcome": welcomeByResourceLocale.fr,
} as const;

export default translation;
