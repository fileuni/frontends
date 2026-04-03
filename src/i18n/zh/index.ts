import about from './about.json';
import admin from './admin.json';
import adminSetting from './admin-setting.json';
import auth from './auth.json';
import blacklist from './blacklist.json';
import cacheManager from './cacheManager.json';
import chat from './chat.json';
import common from './common.json';
import email from './email.json';
import errors from './errors.json';
import filemanager from './filemanager.json';
import forgotPassword from './forgotPassword.json';
import launcher from './launcher.json';
import nav from './nav.json';
import pages from './pages.json';
import player from './player.json';
import privacy from './privacy.json';
import profile from './profile.json';
import security from './security.json';
import sessions from './sessions.json';
import systemConfig from './system_config.json';
import themes from './themes.json';
import tos from './tos.json';
import welcome from './welcome.json';
import { languagesByResourceLocale } from '../bundles/languages';

const translation = {
  "about": about,
  "admin": {
    ...admin,
    "settings": adminSetting.admin.settings,
    "config": adminSetting.admin.config,
  },
  "auth": auth,
  "blacklist": blacklist,
  "cacheManager": cacheManager,
  "chat": chat,
  "common": common,
  "email": email,
  "errors": errors,
  "filemanager": filemanager,
  "forgotPassword": forgotPassword,
  "languages": languagesByResourceLocale.zh,
  "launcher": launcher,
  "nav": nav,
  "pages": pages,
  "player": player,
  "privacy": privacy,
  "profile": profile,
  "security": security,
  "sessions": sessions,
  "systemConfig": systemConfig,
  "themes": themes,
  "tos": tos,
  "welcome": welcome,
} as const;

export default translation;
