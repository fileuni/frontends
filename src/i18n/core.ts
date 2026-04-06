export {
  AUTO_LOCALE_PREFERENCE,
  DEFAULT_LOCALE,
  FILEUNI_LANGUAGE_STORAGE_KEY,
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
} from '@fileuni/ts-shared/locale';

export {
  FILEUNI_CONTROL_METRICS,
  FILEUNI_ICON_BUTTON_CLASSNAMES,
  FILEUNI_LANGUAGE_MENU_CLASSNAMES,
  FILEUNI_THEME_TOGGLE_CLASSNAMES,
  LOCALE_PICKER_OPTIONS,
  createDisclosureState,
  getLocaleFlag,
  getLocaleNativeLabel,
  mountPathLocaleDropdown,
  reduceDisclosureState,
  type DisclosureAction,
  type DisclosureState,
  type LocalePickerOption,
} from '@fileuni/ts-shared/controls';

export {
  buildThemeHeadBootstrap,
  getNextBinaryTheme,
  initPathLocaleThemeBootstrap,
  parseBrowserThemePreference,
  type ThemeHeadBootstrap,
  type ThemeHeadBootstrapOptions,
} from '@fileuni/ts-shared/theme';
