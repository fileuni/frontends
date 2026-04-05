import React, { useEffect, useReducer, useRef } from 'react';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { normalizeFrontendStoredLocale } from '@/i18n/locale-adapter';
import {
  AUTO_LOCALE_PREFERENCE,
  FILEUNI_LANGUAGE_MENU_CLASSNAMES,
  LOCALE_PICKER_OPTIONS,
  createDisclosureState,
  getLocaleNativeLabel,
  reduceDisclosureState,
} from '@/i18n/core';
import { useLanguageStore, type Language } from '@/stores/language';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import { cn } from '@/lib/utils';

interface LanguageMenuButtonProps {
  compact?: boolean | undefined;
  className?: string | undefined;
}

const languageOptions: { id: Language; label: string }[] = LOCALE_PICKER_OPTIONS.map((option) => ({
  id: option.code,
  label: option.nativeLabel,
}));

export const LanguageMenuButton: React.FC<LanguageMenuButtonProps> = ({ compact = false, className }) => {
  const { t, i18n } = useTranslation();
  const { language, setLanguage } = useLanguageStore();
  const resolvedTheme = useResolvedTheme();
  const [menuState, dispatchMenu] = useReducer(
    reduceDisclosureState,
    undefined,
    () => createDisclosureState(false),
  );
  const menuRef = useRef<HTMLDivElement>(null);

  const isDark = resolvedTheme === 'dark';
  const currentI18nLang = normalizeFrontendStoredLocale(i18n.language) ?? 'en';
  const langValueForUi: Language = language === AUTO_LOCALE_PREFERENCE ? currentI18nLang : language;
  const currentLabel = getLocaleNativeLabel(langValueForUi);

  useEffect(() => {
    const onDocMouseDown = (event: MouseEvent) => {
      if (!menuState.open) return;
      const target = event.target as Node | null;
      if (menuRef.current && target && !menuRef.current.contains(target)) {
        dispatchMenu({ type: 'close' });
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [menuState.open]);

  return (
    <div className={cn('relative', className)} ref={menuRef}>
      <button
        type="button"
        onClick={() => dispatchMenu({ type: 'toggle' })}
        className={cn(
          FILEUNI_LANGUAGE_MENU_CLASSNAMES.trigger,
          compact && FILEUNI_LANGUAGE_MENU_CLASSNAMES.triggerCompact,
          isDark ? FILEUNI_LANGUAGE_MENU_CLASSNAMES.triggerDark : FILEUNI_LANGUAGE_MENU_CLASSNAMES.triggerLight,
        )}
        aria-label={t('launcher.switch_language')}
        title={t('launcher.switch_language')}
      >
        <Languages size={16} className={FILEUNI_LANGUAGE_MENU_CLASSNAMES.triggerGlyph} aria-hidden />
        <span className={FILEUNI_LANGUAGE_MENU_CLASSNAMES.triggerLabel}>{currentLabel}</span>
      </button>
      {menuState.open && (
        <div
          className={cn(
            FILEUNI_LANGUAGE_MENU_CLASSNAMES.menu,
            isDark ? FILEUNI_LANGUAGE_MENU_CLASSNAMES.menuDark : FILEUNI_LANGUAGE_MENU_CLASSNAMES.menuLight,
          )}
        >
          {languageOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setLanguage(option.id);
                dispatchMenu({ type: 'close' });
              }}
              className={cn(
                FILEUNI_LANGUAGE_MENU_CLASSNAMES.item,
                langValueForUi === option.id
                  ? (isDark
                    ? FILEUNI_LANGUAGE_MENU_CLASSNAMES.itemActiveDark
                    : FILEUNI_LANGUAGE_MENU_CLASSNAMES.itemActiveLight)
                  : (isDark
                    ? FILEUNI_LANGUAGE_MENU_CLASSNAMES.itemIdleDark
                    : FILEUNI_LANGUAGE_MENU_CLASSNAMES.itemIdleLight),
              )}
            >
              <span className="block truncate">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
