import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, ShieldCheck, Zap } from 'lucide-react';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import { cn } from '@/lib/utils';

interface SetupOnboardingIntroProps {
  configDir?: string | null;
  appDataDir?: string | null;
  configPath?: string | null;
}

export const SetupOnboardingIntro: React.FC<SetupOnboardingIntroProps> = ({
  configDir,
  appDataDir,
  configPath,
}) => {
  const { t } = useTranslation();
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === 'dark';

  const guideCards = [
    {
      icon: FileText,
      title: t('setup.guide.card1Title'),
      desc: t('setup.guide.card1Desc'),
    },
    {
      icon: ShieldCheck,
      title: t('setup.guide.card2Title'),
      desc: t('setup.guide.card2Desc'),
    },
    {
      icon: Zap,
      title: t('setup.guide.card3Title'),
      desc: t('setup.guide.card3Desc'),
    },
  ];

  const locationRows = [
    configDir?.trim()
      ? { label: t('setup.guide.configDirLabel'), value: configDir }
      : null,
    appDataDir?.trim()
      ? { label: t('setup.guide.appDataDirLabel'), value: appDataDir }
      : null,
    !configDir?.trim() && !appDataDir?.trim() && configPath?.trim()
      ? { label: t('setup.guide.configPathLabel'), value: configPath }
      : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
      <div className={cn(
        'rounded-[2rem] border p-5 sm:p-6 shadow-sm',
        isDark
          ? 'border-sky-400/20 bg-gradient-to-br from-sky-500/10 via-cyan-500/10 to-slate-900'
          : 'border-sky-200/70 bg-gradient-to-br from-sky-50 via-cyan-50 to-white',
      )}>
        <div className={cn(
          'inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em] shadow-sm',
          isDark
            ? 'border-sky-400/20 bg-sky-500/10 text-sky-200'
            : 'border-sky-200 bg-white/80 text-sky-700',
        )}>
          {t('setup.guide.badge')}
        </div>
        <h2 className="mt-4 text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
          {t('setup.guide.title')}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
          {t('setup.guide.desc')}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {guideCards.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className={cn(
                'rounded-2xl border p-4 shadow-sm backdrop-blur',
                isDark ? 'border-white/10 bg-white/[0.04]' : 'border-white/70 bg-white/85',
              )}
            >
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-2xl',
                isDark ? 'bg-sky-500/15 text-sky-200' : 'bg-sky-100 text-sky-700',
              )}>
                <Icon size={18} />
              </div>
              <div className="mt-3 text-sm font-black text-slate-900 dark:text-slate-100">{title}</div>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className={cn(
          'rounded-2xl border p-4 shadow-sm',
          isDark ? 'border-emerald-400/25 bg-emerald-500/10' : 'border-emerald-200/70 bg-emerald-50/90',
        )}>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">
            {t('setup.guide.recommendedTitle')}
          </div>
          <p className="mt-2 text-sm leading-6 text-emerald-900 dark:text-emerald-100">
            {t('setup.guide.recommendedDesc')}
          </p>
        </div>

        {locationRows.length > 0 && (
          <div className={cn(
            'rounded-2xl border p-4 shadow-sm',
            isDark ? 'border-slate-700/60 bg-slate-900/70' : 'border-slate-200/70 bg-white/90',
          )}>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {t('setup.guide.locationTitle')}
            </div>
            <div className="mt-3 space-y-3 text-sm">
              {locationRows.map((row) => (
                <div key={`${row.label}:${row.value}`}>
                  <div className="font-bold text-slate-700 dark:text-slate-200">{row.label}</div>
                  <div className="mt-1 break-all rounded-xl bg-slate-100/90 px-3 py-2 font-mono text-xs text-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                    {row.value}
                  </div>
                </div>
              ))}
              <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                {t('setup.guide.locationDesc')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
