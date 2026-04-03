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
  "about": aboutByResourceLocale.ru,
  "admin": {
    ...adminByResourceLocale.ru,
    "settings": adminSettingByResourceLocale.ru.admin.settings,
    "config": adminSettingByResourceLocale.ru.admin.config,
  },
  "auth": authByResourceLocale.ru,
  "blacklist": blacklistByResourceLocale.ru,
  "cacheManager": cacheManagerByResourceLocale.ru,
  "chat": chatByResourceLocale.ru,
  "common": commonByResourceLocale.ru,
  "email": emailByResourceLocale.ru,
  "errors": errorsByResourceLocale.ru,
  "filemanager": filemanagerByResourceLocale.ru,
  "forgotPassword": forgotPasswordByResourceLocale.ru,
  "languages": languagesByResourceLocale.ru,
  "launcher": launcherByResourceLocale.ru,
  "nav": navByResourceLocale.ru,
  "pages": pagesByResourceLocale.ru,
  "player": playerByResourceLocale.ru,
  "privacy": privacyByResourceLocale.ru,
  "profile": profileByResourceLocale.ru,
  "security": securityByResourceLocale.ru,
  "sessions": sessionsByResourceLocale.ru,
  "systemConfig": systemConfigByResourceLocale.ru,
  "themes": themesByResourceLocale.ru,
  "tos": tosByResourceLocale.ru,
  "welcome": welcomeByResourceLocale.ru,
} as const;

export default translation;
