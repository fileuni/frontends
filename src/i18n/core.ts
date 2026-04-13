export {
  AUTO_LANGUAGE_PREFERENCE,
  DEFAULT_LOCALE,
  LANGUAGE_STORAGE_KEY,
  LOCALE_METADATA,
  SUPPORTED_LOCALES,
  buildLocaleUrl,
  defineLocaleBundle,
  detectLocale,
  detectLocaleFromNavigator,
  normalizeLocale,
  parseLocalePreference,
  resolveLocalePreference,
  toTraditionalChineseDeep,
  toTraditionalChineseString,
  type LocalePreference,
  type LocaleShape,
  type SupportedLocale,
} from '@fileuni/ts-shared/localization';

export {
  LOCALE_MENU_CLASSNAMES,
  LOCALE_MENU_METRICS,
  LOCALE_MENU_OPTIONS,
  createDisclosureState,
  getLocaleNativeLabel,
  reduceDisclosureState,
  type DisclosureAction,
  type DisclosureState,
  type LocaleMenuOption,
} from '@fileuni/ts-shared/language-menu';

export { THEME_TOGGLE_CLASSNAMES } from '@fileuni/ts-shared/theme-toggle';

export {
  buildThemeHeadBootstrap,
  getNextBinaryTheme,
  initPathLocaleThemeBootstrap,
  parseBrowserThemePreference,
  type ThemeHeadBootstrap,
  type ThemeHeadBootstrapOptions,
} from '@fileuni/ts-shared/theme-system';
