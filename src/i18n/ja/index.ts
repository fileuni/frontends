import about from './about.json';
import admin from './admin.json';
import auth from './auth.json';
import blacklist from './blacklist.json';
import cacheManager from './cacheManager.json';
import chat from './chat.json';
import common from './common.json';
import configGuard from './configGuard.json';
import configSet from './configSet.json';
import config_selector from './config_selector.json';
import email from './email.json';
import errors from './errors.json';
import filemanager from './filemanager.json';
import forgotPassword from './forgotPassword.json';
import languages from './languages.json';
import launcher from './launcher.json';
import nav from './nav.json';
import pages from './pages.json';
import player from './player.json';
import privacy from './privacy.json';
import profile from './profile.json';
import security from './security.json';
import sessions from './sessions.json';
import setup from './setup.json';
import themes from './themes.json';
import tos from './tos.json';
import welcome from './welcome.json';

const translation = {
  "about": about,
  "admin": admin,
  "auth": auth,
  "blacklist": blacklist,
  "cacheManager": cacheManager,
  "chat": chat,
  "common": common,
  "configGuard": configGuard,
  "configSet": configSet,
  "config_selector": config_selector,
  "email": email,
  "errors": errors,
  "filemanager": filemanager,
  "forgotPassword": forgotPassword,
  "languages": languages,
  "launcher": launcher,
  "nav": nav,
  "pages": pages,
  "player": player,
  "privacy": privacy,
  "profile": profile,
  "security": security,
  "sessions": sessions,
  "setup": setup,
  "themes": themes,
  "tos": tos,
  "welcome": welcome,
} as const;

export default translation;
