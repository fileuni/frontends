import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Globe2, Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Language } from '@/stores/language';
import type { Theme } from '@/stores/theme';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import { cn } from '@/lib/utils';

interface SetupSurfaceControlsProps {
  language: Language;
  onLanguageChange: (value: Language) => void;
  theme: Theme;
  onThemeChange: (value: Theme) => void;
  className?: string;
  compact?: boolean;
}

const languageOptions: Array<{ value: Language; flag: string }> = [
  { value: 'auto', flag: 'AUTO' },
  { value: 'zh', flag: 'CN' },
  { value: 'en', flag: 'GB' },
  { value: 'es', flag: 'ES' },
  { value: 'de', flag: 'DE' },
  { value: 'fr', flag: 'FR' },
  { value: 'ru', flag: 'RU' },
  { value: 'ja', flag: 'JP' },
];

const themeOrder: Theme[] = ['light', 'dark', 'system'];

const themeIconMap = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} satisfies Record<Theme, React.ComponentType<{ size?: number; className?: string }>>;

export const SetupSurfaceControls: React.FC<SetupSurfaceControlsProps> = ({
  language,
  onLanguageChange,
  theme,
  onThemeChange,
  className,
  compact = false,
}) => {
  const { t } = useTranslation();
  const resolvedTheme = useResolvedTheme();
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isDark = resolvedTheme === 'dark';
  const currentLanguage = useMemo(() => {
    return languageOptions.find((option) => option.value === language) ?? languageOptions[0];
  }, [language]);
  const ThemeIcon = themeIconMap[theme] ?? Monitor;

  useEffect(() => {
    if (!isLanguageMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }
      setIsLanguageMenuOpen(false);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isLanguageMenuOpen]);

  const cycleTheme = () => {
    const currentIndex = themeOrder.indexOf(theme);
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length] ?? 'light';
    onThemeChange(nextTheme);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsLanguageMenuOpen((prev) => !prev)}
          className={cn(
            'h-10 rounded-2xl border px-3 text-sm font-black transition-all inline-flex items-center gap-2',
            compact ? 'w-10 justify-center px-0' : 'justify-between min-w-[9.25rem]',
            isDark
              ? 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
              : 'border-slate-200 bg-white/85 text-slate-800 hover:bg-slate-50 shadow-sm'
          )}
          aria-label={t('launcher.switch_language')}
          title={t('launcher.switch_language')}
        >
          <span className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black tracking-[0.12em]',
            isDark ? 'bg-white/10 text-slate-100' : 'bg-slate-100 text-slate-700'
          )}>
            {currentLanguage.flag}
          </span>
          {!compact && (
            <>
              <span className="truncate">{t(`languages.${currentLanguage.value}`)}</span>
              <ChevronDown size={14} className={cn('shrink-0 transition-transform', isLanguageMenuOpen && 'rotate-180')} />
            </>
          )}
          {compact && <Globe2 size={16} className="absolute opacity-0 pointer-events-none" />}
        </button>

        {isLanguageMenuOpen && (
          <div className={cn(
            'absolute right-0 z-20 mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border p-1.5 shadow-2xl',
            isDark ? 'border-white/10 bg-slate-950/98' : 'border-slate-200 bg-white/98'
          )}>
            <div className="grid gap-1">
              {languageOptions.map((option) => {
                const isCurrent = language === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onLanguageChange(option.value);
                      setIsLanguageMenuOpen(false);
                    }}
                    className={cn(
                      'w-full rounded-xl px-3 py-2.5 text-left text-sm font-black transition-all inline-flex items-center gap-3',
                      isCurrent
                        ? (isDark ? 'bg-cyan-500/15 text-cyan-100' : 'bg-cyan-50 text-cyan-900')
                        : (isDark ? 'text-slate-200 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50')
                    )}
                  >
                    <span className={cn(
                      'inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[10px] font-black tracking-[0.12em]',
                      isCurrent
                        ? (isDark ? 'bg-cyan-500/20 text-cyan-100' : 'bg-cyan-100 text-cyan-900')
                        : (isDark ? 'bg-white/10 text-slate-100' : 'bg-slate-100 text-slate-700')
                    )}>
                      {option.flag}
                    </span>
                    <span className="truncate">{t(`languages.${option.value}`)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={cycleTheme}
        className={cn(
          'h-10 rounded-2xl border px-3 transition-all inline-flex items-center justify-center gap-2',
          compact ? 'w-10 px-0' : 'min-w-10',
          isDark
            ? 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
            : 'border-slate-200 bg-white/85 text-slate-700 hover:bg-slate-50 shadow-sm'
        )}
        aria-label={t('launcher.toggle_theme')}
        title={t('launcher.toggle_theme')}
      >
        <ThemeIcon size={18} />
      </button>
    </div>
  );
};
