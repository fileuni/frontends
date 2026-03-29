import React, { useEffect, useRef, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguageStore, type Language } from '@/stores/language';
import { useThemeStore } from '@/stores/theme';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import { cn } from '@/lib/utils';

interface ThemeLanguageControlsProps {
  compact?: boolean | undefined;
  className?: string | undefined;
}

const languageOptions: { id: Language; label: string }[] = [
  { id: 'zh', label: '🇨🇳 中文' },
  { id: 'en', label: '🇬🇧 English' },
  { id: 'es', label: '🇪🇸 Español' },
  { id: 'de', label: '🇩🇪 Deutsch' },
  { id: 'fr', label: '🇫🇷 Français' },
  { id: 'ru', label: '🇷🇺 Русский' },
  { id: 'ja', label: '🇯🇵 日本語' },
];

const supportedLanguages = ['zh', 'en', 'es', 'de', 'fr', 'ru', 'ja'] as const;

const flagMap: Record<Language, string> = {
  auto: '🌐',
  zh: '🇨🇳',
  en: '🇬🇧',
  es: '🇪🇸',
  de: '🇩🇪',
  fr: '🇫🇷',
  ru: '🇷🇺',
  ja: '🇯🇵',
};

export const ThemeLanguageControls: React.FC<ThemeLanguageControlsProps> = ({ compact = false, className }) => {
  const { t, i18n } = useTranslation();
  const { setTheme } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();
  const resolvedTheme = useResolvedTheme();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const isDark = resolvedTheme === 'dark';
  const currentI18nLang = ((i18n.language || 'en').split('-')[0] ?? 'en').toLowerCase();
  const resolvedLang = supportedLanguages.includes(currentI18nLang as typeof supportedLanguages[number])
    ? currentI18nLang as typeof supportedLanguages[number]
    : 'en';
  const langValueForUi: Language = language === 'auto' ? resolvedLang : language;
  const langFlag = flagMap[langValueForUi] ?? flagMap.en;

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
            compact ? 'h-9 w-10 rounded-xl' : 'h-9 w-10 rounded-xl',
            'border inline-flex items-center justify-center transition-all',
            isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-100 border-gray-200 hover:bg-gray-200',
          )}
          aria-label={t('launcher.switch_language')}
          title={t('launcher.switch_language')}
        >
          <span className="text-lg leading-none" aria-hidden>{langFlag}</span>
        </button>
        {isLangMenuOpen && (
          <div className={cn(
            'absolute right-0 mt-2 w-56 rounded-2xl border shadow-2xl overflow-hidden z-30',
            isDark ? 'bg-zinc-950 border-white/10' : 'bg-white border-gray-200',
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
                  'w-full text-left px-4 py-3 text-sm font-black transition-colors whitespace-nowrap',
                  langValueForUi === opt.id
                    ? (isDark ? 'bg-white/10' : 'bg-gray-100')
                    : (isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'),
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
