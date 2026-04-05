import React, { useEffect, useReducer, useRef } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { normalizeFrontendStoredLocale } from '@/i18n/locale-adapter';
import { useLanguageStore, type Language } from '@/stores/language';
import {
  AUTO_LOCALE_PREFERENCE,
  FILEUNI_THEME_TOGGLE_CLASSNAMES,
  FILEUNI_LANGUAGE_MENU_CLASSNAMES,
  LOCALE_PICKER_OPTIONS,
  createDisclosureState,
  getLocaleFlag,
  getNextBinaryTheme,
  reduceDisclosureState,
} from '@/i18n/core';
import { useThemeStore } from '@/stores/theme';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import { cn } from '@/lib/utils';

interface ThemeLanguageControlsProps {
  compact?: boolean | undefined;
  className?: string | undefined;
}

const languageOptions: { id: Language; label: string }[] = LOCALE_PICKER_OPTIONS.map((option) => ({
  id: option.code,
  label: `${option.flag} ${option.nativeLabel}`,
}));

export const ThemeLanguageControls: React.FC<ThemeLanguageControlsProps> = ({ compact = false, className }) => {
  const { t, i18n } = useTranslation();
  const { setTheme } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();
  const resolvedTheme = useResolvedTheme();
  const [langMenuState, dispatchLangMenu] = useReducer(
    reduceDisclosureState,
    undefined,
    () => createDisclosureState(false),
  );
  const langMenuRef = useRef<HTMLDivElement>(null);

  const isDark = resolvedTheme === 'dark';
  const currentI18nLang = normalizeFrontendStoredLocale(i18n.language) ?? 'en';
  const langValueForUi: Language = language === AUTO_LOCALE_PREFERENCE ? currentI18nLang : language;
  const langFlag = language === AUTO_LOCALE_PREFERENCE ? '🌐' : getLocaleFlag(langValueForUi);

  useEffect(() => {
    const onDocMouseDown = (event: MouseEvent) => {
      if (!langMenuState.open) return;
      const target = event.target as Node | null;
      if (langMenuRef.current && target && !langMenuRef.current.contains(target)) {
        dispatchLangMenu({ type: 'close' });
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [langMenuState.open]);

  const toggleTheme = () => {
    setTheme(getNextBinaryTheme(isDark ? 'dark' : 'light'));
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative" ref={langMenuRef}>
        <button
          type="button"
          onClick={() => dispatchLangMenu({ type: 'toggle' })}
          className={cn(
            compact ? 'h-9 w-10 rounded-xl' : FILEUNI_LANGUAGE_MENU_CLASSNAMES.trigger,
            isDark ? FILEUNI_LANGUAGE_MENU_CLASSNAMES.triggerDark : FILEUNI_LANGUAGE_MENU_CLASSNAMES.triggerLight,
          )}
          aria-label={t('launcher.switch_language')}
          title={t('launcher.switch_language')}
        >
          <span className="text-lg leading-none" aria-hidden>{langFlag}</span>
        </button>
        {langMenuState.open && (
          <div className={cn(
            FILEUNI_LANGUAGE_MENU_CLASSNAMES.menu,
            isDark ? FILEUNI_LANGUAGE_MENU_CLASSNAMES.menuDark : FILEUNI_LANGUAGE_MENU_CLASSNAMES.menuLight,
          )}>
            {languageOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setLanguage(opt.id);
                  dispatchLangMenu({ type: 'close' });
                }}
                className={cn(
                  FILEUNI_LANGUAGE_MENU_CLASSNAMES.item,
                  langValueForUi === opt.id
                    ? (isDark
                      ? FILEUNI_LANGUAGE_MENU_CLASSNAMES.itemActiveDark
                      : FILEUNI_LANGUAGE_MENU_CLASSNAMES.itemActiveLight)
                    : (isDark
                      ? FILEUNI_LANGUAGE_MENU_CLASSNAMES.itemIdleDark
                      : FILEUNI_LANGUAGE_MENU_CLASSNAMES.itemIdleLight),
                )}
              >
                <span className="block truncate">{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          FILEUNI_THEME_TOGGLE_CLASSNAMES.button,
          isDark ? FILEUNI_THEME_TOGGLE_CLASSNAMES.dark : FILEUNI_THEME_TOGGLE_CLASSNAMES.light,
        )}
        aria-label={t('launcher.toggle_theme')}
        title={t('launcher.toggle_theme')}
      >
        {isDark ? <Sun size={18} className={cn('opacity-80', isDark ? 'text-slate-200' : 'text-slate-900')} /> : <Moon size={18} className={cn('opacity-80', isDark ? 'text-slate-200' : 'text-slate-900')} />}
      </button>
    </div>
  );
};
