import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  createReactBinaryThemeToggleComponent,
  type ReactBinaryThemeToggleProps,
} from '@fileuni/ts-shared/theme-toggle';

import { getNextBinaryTheme } from '@/i18n/core';
import { useThemeStore } from '@/stores/theme';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';

interface ThemeToggleButtonProps {
  className?: string | undefined;
}

const SharedThemeToggleButton = createReactBinaryThemeToggleComponent({
  createElement: React.createElement as (...args: unknown[]) => unknown,
  darkIconComponent: Sun,
  lightIconComponent: Moon,
}) as (props: ReactBinaryThemeToggleProps) => React.JSX.Element;

export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({ className }) => {
  const { t } = useTranslation();
  const { setTheme } = useThemeStore();
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <SharedThemeToggleButton
      isDark={isDark}
      onToggle={() => setTheme(getNextBinaryTheme(isDark ? 'dark' : 'light'))}
      buttonLabel={t('launcher.toggle_theme')}
      className={className}
    />
  );
};
