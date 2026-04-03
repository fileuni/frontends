import { adminByResourceLocale } from '../bundles/admin';
import { adminSettingByResourceLocale } from '../bundles/adminSetting';
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
import { filemanagerByResourceLocale } from '../bundles/filemanager';
import { pagesByResourceLocale } from '../bundles/pages';
import { systemConfigByResourceLocale } from '../bundles/systemConfig';
import { blacklistByResourceLocale } from '../bundles/blacklist';
import { languagesByResourceLocale } from '../bundles/languages';
import { playerByResourceLocale } from '../bundles/player';
import { themesByResourceLocale } from '../bundles/themes';
import { welcomeByResourceLocale } from '../bundles/welcome';

const translation = {
  "about": aboutByResourceLocale['zh-cn'],
  "admin": {
    ...adminByResourceLocale['zh-cn'],
    "settings": adminSettingByResourceLocale['zh-cn'].admin.settings,
    "config": adminSettingByResourceLocale['zh-cn'].admin.config,
  },
  "auth": authByResourceLocale['zh-cn'],
  "blacklist": blacklistByResourceLocale['zh-cn'],
  "cacheManager": cacheManagerByResourceLocale['zh-cn'],
  "chat": chatByResourceLocale['zh-cn'],
  "common": commonByResourceLocale['zh-cn'],
  "email": emailByResourceLocale['zh-cn'],
  "errors": errorsByResourceLocale['zh-cn'],
  "filemanager": filemanagerByResourceLocale['zh-cn'],
  "forgotPassword": forgotPasswordByResourceLocale['zh-cn'],
  "languages": languagesByResourceLocale['zh-cn'],
  "launcher": launcherByResourceLocale['zh-cn'],
  "nav": navByResourceLocale['zh-cn'],
  "pages": pagesByResourceLocale['zh-cn'],
  "player": playerByResourceLocale['zh-cn'],
  "privacy": privacyByResourceLocale['zh-cn'],
  "profile": profileByResourceLocale['zh-cn'],
  "security": securityByResourceLocale['zh-cn'],
  "sessions": sessionsByResourceLocale['zh-cn'],
  "systemConfig": systemConfigByResourceLocale['zh-cn'],
  "themes": themesByResourceLocale['zh-cn'],
  "tos": tosByResourceLocale['zh-cn'],
  "welcome": welcomeByResourceLocale['zh-cn'],
} as const;

export default translation;
