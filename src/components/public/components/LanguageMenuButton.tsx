import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import {
  createReactLanguageMenuComponent,
  type ReactLanguageMenuProps,
} from '@fileuni/ts-shared/language-menu';

import { normalizeFrontendStoredLocale } from '@/i18n/locale-adapter';
import {
  AUTO_LANGUAGE_PREFERENCE,
} from '@/i18n/core';
import { useLanguageStore, type Language } from '@/stores/language';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';

interface LanguageMenuButtonProps {
  compact?: boolean | undefined;
  className?: string | undefined;
}

const SharedReactLanguageMenu = createReactLanguageMenuComponent({
  createElement: React.createElement as (...args: unknown[]) => unknown,
  useEffect: React.useEffect,
  useReducer: React.useReducer,
  useRef: React.useRef,
  iconComponent: Languages,
}) as (props: ReactLanguageMenuProps) => React.JSX.Element;

export const LanguageMenuButton: React.FC<LanguageMenuButtonProps> = ({ compact = false, className }) => {
  const { t, i18n } = useTranslation();
  const { language, setLanguage } = useLanguageStore();
  const resolvedTheme = useResolvedTheme();

  const isDark = resolvedTheme === 'dark';
  const currentI18nLang = normalizeFrontendStoredLocale(i18n.language) ?? 'en';
  const langValueForUi: Language = language === AUTO_LANGUAGE_PREFERENCE ? currentI18nLang : language;

  return (
    <SharedReactLanguageMenu
      currentLocale={langValueForUi}
      onSelectLocale={setLanguage}
      isDark={isDark}
      buttonLabel={t('launcher.switch_language')}
      compact={compact}
      className={className}
    />
  );
};
