import React from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Download,
  ExternalLink,
  Globe,
  Info,
  Loader2,
  RefreshCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import { useEscapeToCloseTopLayer } from '@/hooks/useEscapeToCloseTopLayer';
import { docsHomeUrl } from '@/lib/docs';

const PROJECT_HOMEPAGE_URL = 'https://fileuni.com';
const PROJECT_REPOSITORY_URL = 'https://github.com/FileUni/FileUni-Project';

const GitHubMark: React.FC<{ size?: number; className?: string }> = ({
  size = 20,
  className,
}) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="currentColor"
  >
    <path d="M12 1.5a10.5 10.5 0 0 0-3.32 20.46c.53.1.72-.23.72-.51v-1.78c-2.94.64-3.56-1.25-3.56-1.25-.48-1.21-1.16-1.53-1.16-1.53-.95-.65.07-.64.07-.64 1.05.07 1.6 1.08 1.6 1.08.93 1.6 2.45 1.13 3.04.86.09-.68.36-1.13.65-1.39-2.35-.27-4.82-1.18-4.82-5.23 0-1.15.41-2.08 1.08-2.81-.11-.27-.47-1.37.1-2.85 0 0 .88-.28 2.88 1.07A9.98 9.98 0 0 1 12 6.57c.89 0 1.79.12 2.62.35 2-1.35 2.88-1.07 2.88-1.07.57 1.48.21 2.58.1 2.85.67.73 1.08 1.66 1.08 2.81 0 4.06-2.47 4.96-4.83 5.22.37.32.7.94.7 1.89v2.8c0 .29.19.62.73.51A10.5 10.5 0 0 0 12 1.5Z" />
  </svg>
);

export interface AboutUpdateInfo {
  current_version: string;
  current_channel: string;
  artifact_kind: string;
  target_os: string;
  target_arch: string;
  target_libc?: string | null;
  install_source: {
    source: string;
    confidence: string;
    evidence: string[];
  };
  has_update: boolean;
  stable?: AboutReleaseChannelInfo | null;
  prerelease?: AboutReleaseChannelInfo | null;
}

export interface AboutReleaseChannelInfo {
  channel: string;
  version: string;
  has_update: boolean;
  release_page_url: string;
  target_download_url?: string | null;
  published_at?: string | null;
}

export interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion: string;
  versionCode?: number | null;
  showCheckUpdates?: boolean;
  isCheckingUpdates?: boolean;
  updateInfo?: AboutUpdateInfo | null;
  updateError?: string | null;
  onCheckUpdates?: () => void | Promise<void>;
  onOpenLink?: (url: string) => void;
  getUpdateGuideUrl?: (info: AboutReleaseChannelInfo, updateInfo: AboutUpdateInfo) => string;
  zIndex?: number;
}

export interface AboutViewProps {
  currentVersion: string;
  versionCode?: number | null;
  showCheckUpdates?: boolean;
  isCheckingUpdates?: boolean;
  updateInfo?: AboutUpdateInfo | null;
  updateError?: string | null;
  onCheckUpdates?: () => void | Promise<void>;
  onOpenLink?: (url: string) => void;
  getUpdateGuideUrl?: (info: AboutReleaseChannelInfo, updateInfo: AboutUpdateInfo) => string;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

export function buildAboutUpdateGuideUrl(
  baseUrl: string,
  releaseInfo: AboutReleaseChannelInfo,
  updateInfo: AboutUpdateInfo,
): string {
  const url = new URL(baseUrl);
  url.searchParams.set('kind', updateInfo.artifact_kind || 'cli');
  url.searchParams.set('channel', releaseInfo.channel || updateInfo.current_channel || 'stable');
  url.searchParams.set('current', updateInfo.current_version || '');
  url.searchParams.set('latest', releaseInfo.version || '');
  url.searchParams.set('os', updateInfo.target_os || '');
  url.searchParams.set('arch', updateInfo.target_arch || '');
  if (updateInfo.target_libc) {
    url.searchParams.set('libc', updateInfo.target_libc);
  }
  if (updateInfo.install_source?.source) {
    url.searchParams.set('source', updateInfo.install_source.source);
  }
  return url.toString();
}

const LinkCard: React.FC<{
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onOpenLink?: (url: string) => void;
  isDark: boolean;
}> = ({ href, label, icon: Icon, onOpenLink, isDark }) => {
  const className = cn(
    'group flex flex-col items-center justify-center gap-3 rounded-2xl border transition-all duration-300',
    isDark 
      ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-primary/30' 
      : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-primary/30 shadow-sm hover:shadow-md'
  );

  const content = (
    <>
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 shadow-inner border",
        isDark ? "bg-white/5 border-white/10 group-hover:text-primary" : "bg-white border-gray-200 group-hover:text-primary"
      )}>
        <Icon size={20} />
      </div>
      <div className="flex items-center gap-1.5 px-2 w-full justify-center">
        <span className={cn(
          "text-xs font-black uppercase tracking-tight truncate",
          isDark ? "text-slate-400 group-hover:text-white" : "text-slate-600 group-hover:text-slate-900"
        )}>{label}</span>
        <ExternalLink size={10} className="opacity-30 shrink-0" />
      </div>
    </>
  );

  if (onOpenLink) {
    return (
      <button type="button" onClick={() => onOpenLink(href)} className={cn(className, "py-4 w-full")}>
        {content}
      </button>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cn(className, "py-4")}>
      {content}
    </a>
  );
};

const ReleaseRow: React.FC<{
  info: AboutReleaseChannelInfo;
  updateInfo: AboutUpdateInfo;
  title: string;
  onOpenLink?: (url: string) => void;
  getUpdateGuideUrl?: (info: AboutReleaseChannelInfo, updateInfo: AboutUpdateInfo) => string;
  t: TFunction;
  isDark: boolean;
}> = ({ info, updateInfo, title, onOpenLink, getUpdateGuideUrl, t, isDark }) => {
  const downloadUrl = info.target_download_url || info.release_page_url;
  const primaryUrl = getUpdateGuideUrl ? getUpdateGuideUrl(info, updateInfo) : downloadUrl;
  
  return (
    <div className={cn(
      "group relative overflow-hidden rounded-xl border p-4 transition-all",
      isDark ? "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]" : "border-gray-200 bg-gray-50 hover:bg-white hover:shadow-sm"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border",
              info.channel === 'prerelease' 
                ? "border-fuchsia-500/30 text-fuchsia-600 bg-fuchsia-500/5" 
                : "border-primary/30 text-primary bg-primary/5"
            )}>
              {title}
            </span>
            {info.has_update && (
              <span className="flex items-center gap-1 text-[10px] font-black text-amber-600 dark:text-amber-500 animate-pulse uppercase tracking-widest">
                <Sparkles size={10} /> {t('about.state.updateAvailable')}
              </span>
            )}
          </div>
          <div className={cn(
            "font-mono text-sm font-black tracking-tight",
            isDark ? "text-white" : "text-slate-950"
          )}>{info.version}</div>
          {info.published_at && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-tighter opacity-40">
              <Calendar size={12} />
              {info.published_at}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant={isDark ? "primary" : "outline"}
            className="h-8 w-8 rounded-lg p-0 shadow-sm"
            onClick={() => onOpenLink ? onOpenLink(primaryUrl) : window.open(primaryUrl, '_blank')}
            title={getUpdateGuideUrl ? t('about.openUpdateGuide') : t('about.downloadChannel')}
          >
            <Download size={14} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 rounded-lg p-0 bg-transparent"
            onClick={() => onOpenLink ? onOpenLink(info.release_page_url) : window.open(info.release_page_url, '_blank')}
            title={t('about.viewReleasePage')}
          >
            <ExternalLink size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  currentVersion,
  versionCode = null,
  showCheckUpdates = false,
  isCheckingUpdates = false,
  updateInfo = null,
  updateError = null,
  onCheckUpdates,
  onOpenLink,
  getUpdateGuideUrl,
  zIndex = 130,
}) => {
  const { t } = useTranslation();
  const resolvedTheme = useResolvedTheme();

  useEscapeToCloseTopLayer({
    active: isOpen,
    enabled: true,
    onEscape: onClose,
  });

  if (!isOpen) return null;

  const isDark = resolvedTheme === 'dark';

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-2 sm:p-6"
      role="dialog"
      aria-modal="true"
      style={{ zIndex }}
    >
      {/* Background Overlay: Strong isolation */}
      <button
        type="button"
        className={cn(
          'absolute inset-0 backdrop-blur-2xl transition-opacity',
          isDark ? 'bg-black/95' : 'bg-slate-900/80',
        )}
        onClick={onClose}
        aria-label={t('common.close')}
      />

      <AboutView
        currentVersion={currentVersion}
        versionCode={versionCode}
        showCheckUpdates={showCheckUpdates}
        isCheckingUpdates={isCheckingUpdates}
        updateInfo={updateInfo}
        updateError={updateError}
        onCheckUpdates={onCheckUpdates}
        onOpenLink={onOpenLink}
        getUpdateGuideUrl={getUpdateGuideUrl}
        showCloseButton={true}
        onClose={onClose}
        className={cn(
          'shadow-[0_20px_70px_-15px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200 min-h-0 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-3rem)]',
        )}
      />
    </div>
  );
};

export const AboutView: React.FC<AboutViewProps> = ({
  currentVersion,
  versionCode = null,
  showCheckUpdates = false,
  isCheckingUpdates = false,
  updateInfo = null,
  updateError = null,
  onCheckUpdates,
  onOpenLink,
  getUpdateGuideUrl,
  showCloseButton = false,
  onClose,
  className,
}) => {
  const { t } = useTranslation();
  const resolvedTheme = useResolvedTheme();

  const isDark = resolvedTheme === 'dark';
  const currentVersionText = currentVersion || '—';
  const versionCodeText = versionCode === null || typeof versionCode === 'undefined' ? '' : String(versionCode);
  const currentChannel = updateInfo?.current_channel || 'stable';

  return (
    <div
      className={cn(
        'relative flex w-full max-w-[480px] flex-col overflow-hidden rounded-2xl border ring-1 min-h-0',
        isDark
          ? 'border-white/10 bg-slate-950 text-white ring-white/5'
          : 'border-gray-200 bg-white text-slate-900 ring-black/[0.03]',
        className,
      )}
    >
      {/* Modern Header: Solid background */}
      <div
        className={cn(
          'relative flex flex-col items-center px-6 pt-9 pb-6 sm:pt-12 sm:pb-8 text-center border-b shrink-0',
          isDark ? 'bg-slate-950 border-white/5' : 'bg-gray-50/50 border-gray-100',
        )}
      >
        {showCloseButton && onClose && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'absolute right-4 top-4 rounded-full p-2 transition-all',
              isDark
                ? 'text-slate-500 hover:bg-white/5 hover:text-white'
                : 'text-slate-400 hover:bg-gray-200 hover:text-slate-900',
            )}
            aria-label={t('common.close')}
          >
            <X size={20} />
          </button>
        )}

        <div
          className={cn(
            'mb-5 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg ring-4',
            isDark
              ? 'bg-primary text-primary-foreground shadow-primary/20 ring-slate-950'
              : 'bg-primary text-white shadow-primary/30 ring-white',
          )}
        >
          <Info size={32} />
        </div>

        <h2 className="text-2xl font-black tracking-tight uppercase">FileUni</h2>

        <div
          className={cn(
            'mt-3 flex items-center gap-2 rounded-full border px-4 py-1',
            isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white shadow-sm',
          )}
        >
          <span
            className={cn(
              'text-[10px] font-black uppercase tracking-[0.2em]',
              isDark ? 'text-slate-500' : 'text-slate-400',
            )}
          >
            {t('about.currentVersion')}
          </span>
          <span className="text-xs font-mono font-black text-primary">{currentVersionText}</span>
        </div>

        {versionCodeText && (
          <div
            className={cn(
              'mt-2 flex items-center gap-2 rounded-full border px-4 py-1',
              isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white shadow-sm',
            )}
          >
            <span
              className={cn(
                'text-[10px] font-black uppercase tracking-[0.2em]',
                isDark ? 'text-slate-500' : 'text-slate-400',
              )}
            >
              {t('about.versionCode')}
            </span>
            <span className="text-xs font-mono font-black text-primary">{versionCodeText}</span>
          </div>
        )}

        <p
          className={cn(
            'mt-5 max-w-[320px] text-sm font-bold leading-relaxed',
            isDark ? 'text-slate-400' : 'text-slate-500',
          )}
        >
          {t('about.subtitle')}
        </p>
      </div>

      <div
        className={cn(
          'flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar space-y-6 sm:space-y-8 px-6 py-6 sm:px-8 sm:py-8',
          isDark ? 'bg-slate-950' : 'bg-white',
        )}
      >
        {/* Links Grid: Adaptive Cards */}
        <div className="grid grid-cols-3 gap-3">
          <LinkCard
            href={PROJECT_HOMEPAGE_URL}
            label={t('about.links.website')}
            icon={Globe}
            isDark={isDark}
            {...(onOpenLink ? { onOpenLink } : {})}
          />
          <LinkCard
            href={docsHomeUrl()}
            label={t('about.links.docs')}
            icon={BookOpen}
            isDark={isDark}
            {...(onOpenLink ? { onOpenLink } : {})}
          />
          <LinkCard
            href={PROJECT_REPOSITORY_URL}
            label="GitHub"
            icon={GitHubMark}
            isDark={isDark}
            {...(onOpenLink ? { onOpenLink } : {})}
          />
        </div>

        {/* Update Section */}
        {showCheckUpdates && (
          <div className="space-y-4">
            <div className={cn('h-px w-full', isDark ? 'bg-white/5' : 'bg-gray-100')} />

            <div
              className={cn(
                'flex items-center justify-between rounded-xl border p-1.5 pl-4 shadow-sm',
                isDark ? 'border-white/10 bg-slate-900' : 'border-gray-200 bg-gray-50',
              )}
            >
              <div
                className={cn(
                  'flex items-center gap-2 text-[10px] font-black uppercase tracking-widest',
                  isDark ? 'text-slate-500' : 'text-slate-400',
                )}
              >
                <Sparkles size={14} className="text-primary" />
                {t('about.updateSectionTitle')}
              </div>
              {onCheckUpdates && (
                <Button
                  size="sm"
                  variant={isDark ? 'ghost' : 'outline'}
                  onClick={() => void onCheckUpdates()}
                  disabled={isCheckingUpdates}
                  className="h-8 gap-2 rounded-lg text-[11px] font-black uppercase tracking-wider shadow-sm"
                >
                  {isCheckingUpdates ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <RefreshCcw size={12} />
                  )}
                  {isCheckingUpdates ? t('about.checking') : t('about.checkUpdates')}
                </Button>
              )}
            </div>

            {updateError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center shadow-inner">
                <div className="text-[10px] font-black text-destructive uppercase tracking-widest">
                  {t('about.updateError')}
                </div>
                <div className="mt-1 text-xs font-bold text-destructive/80">{updateError}</div>
              </div>
            ) : updateInfo ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div
                  className={cn(
                    'flex items-center justify-center gap-2.5 py-1 text-xs font-black uppercase tracking-[0.15em]',
                    updateInfo.has_update ? 'text-amber-600' : 'text-emerald-600',
                  )}
                >
                  {updateInfo.has_update ? (
                    <Download size={14} className="animate-bounce" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  <span>
                    {updateInfo.has_update
                      ? t('about.updateAvailableForCurrentChannel', {
                          channel: t(`about.channels.${currentChannel}`),
                        })
                      : t('about.upToDateForCurrentChannel', {
                          channel: t(`about.channels.${currentChannel}`),
                        })}
                  </span>
                </div>

                <div className="grid gap-2.5">
                  {updateInfo.stable && (
                    <ReleaseRow
                      info={updateInfo.stable}
                      updateInfo={updateInfo}
                      title={t('about.channels.stable')}
                      {...(onOpenLink ? { onOpenLink } : {})}
                      {...(getUpdateGuideUrl ? { getUpdateGuideUrl } : {})}
                      t={t}
                      isDark={isDark}
                    />
                  )}
                  {updateInfo.prerelease && (
                    <ReleaseRow
                      info={updateInfo.prerelease}
                      updateInfo={updateInfo}
                      title={t('about.channels.prerelease')}
                      {...(onOpenLink ? { onOpenLink } : {})}
                      {...(getUpdateGuideUrl ? { getUpdateGuideUrl } : {})}
                      t={t}
                      isDark={isDark}
                    />
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Minimal Footer: Solid and centered */}
      <div
        className={cn(
          'shrink-0 flex items-center justify-between border-t px-6 py-4 sm:px-8 sm:py-5 text-[10px] font-black uppercase tracking-[0.3em]',
          isDark
            ? 'border-white/5 bg-slate-900/50 text-slate-600'
            : 'border-gray-100 bg-gray-50 text-slate-400',
        )}
      >
        <span className="opacity-80">FileUni Project</span>
        <span className="opacity-50">© {new Date().getFullYear()}</span>
      </div>
    </div>
  );
};
