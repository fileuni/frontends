import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { THEME_TOGGLE_CLASSNAMES, getNextBinaryTheme } from '@/i18n/core';
import { useThemeStore } from '@/stores/theme';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import { cn } from '@/lib/utils';

interface ThemeToggleButtonProps {
  className?: string | undefined;
}

export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({ className }) => {
  const { t } = useTranslation();
  const { setTheme } = useThemeStore();
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(getNextBinaryTheme(isDark ? 'dark' : 'light'))}
      className={cn(
        THEME_TOGGLE_CLASSNAMES.button,
        isDark ? THEME_TOGGLE_CLASSNAMES.dark : THEME_TOGGLE_CLASSNAMES.light,
        className,
      )}
      aria-label={t('launcher.toggle_theme')}
      title={t('launcher.toggle_theme')}
    >
      {isDark ? (
        <Sun size={18} className="opacity-80 text-slate-200" />
      ) : (
        <Moon size={18} className="opacity-80 text-slate-900" />
      )}
    </button>
  );
};
