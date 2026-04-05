import React, { useEffect, useRef, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { normalizeFrontendStoredLocale } from '@/i18n/locale-adapter';
import { useLanguageStore, type Language } from '@/stores/language';
import {
  AUTO_LOCALE_PREFERENCE,
  FILEUNI_LANGUAGE_MENU_CLASSNAMES,
  LOCALE_PICKER_OPTIONS,
  getLocaleFlag,
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
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const isDark = resolvedTheme === 'dark';
  const currentI18nLang = normalizeFrontendStoredLocale(i18n.language) ?? 'en';
  const langValueForUi: Language = language === AUTO_LOCALE_PREFERENCE ? currentI18nLang : language;
  const langFlag = language === AUTO_LOCALE_PREFERENCE ? '🌐' : getLocaleFlag(langValueForUi);

  useEffect(() => {
    const onDocMouseDown = (event: MouseEvent) => {
      if (!isLangMenuOpen) return;
      const target = event.target as Node | null;
      if (langMenuRef.current && target && !langMenuRef.current.contains(target)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [isLangMenuOpen]);

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative" ref={langMenuRef}>
        <button
          type="button"
          onClick={() => setIsLangMenuOpen((v) => !v)}
          className={cn(
            compact ? 'h-9 w-10 rounded-xl' : FILEUNI_LANGUAGE_MENU_CLASSNAMES.trigger,
            isDark ? FILEUNI_LANGUAGE_MENU_CLASSNAMES.triggerDark : FILEUNI_LANGUAGE_MENU_CLASSNAMES.triggerLight,
          )}
          aria-label={t('launcher.switch_language')}
          title={t('launcher.switch_language')}
        >
          <span className="text-lg leading-none" aria-hidden>{langFlag}</span>
        </button>
        {isLangMenuOpen && (
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
                  setIsLangMenuOpen(false);
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
          'h-9 w-10 rounded-xl border inline-flex items-center justify-center transition-all',
          isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-100 border-gray-200 hover:bg-gray-200',
        )}
        aria-label={t('launcher.toggle_theme')}
        title={t('launcher.toggle_theme')}
      >
        {isDark ? <Sun size={18} className={cn('opacity-80', isDark ? 'text-slate-200' : 'text-slate-900')} /> : <Moon size={18} className={cn('opacity-80', isDark ? 'text-slate-200' : 'text-slate-900')} />}
      </button>
    </div>
  );
};
