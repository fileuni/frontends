import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';

import {
  AboutView,
  buildAboutUpdateGuideUrl,
  type AboutUpdateInfo,
} from '@/components/modals/AboutModal';

import { useLanguageStore } from '@/stores/language';
import { AUTO_LOCALE_PREFERENCE, buildLocaleUrl } from '@/i18n/core';
import { useThemeStore } from '@/stores/theme';

import { cn } from '@/lib/utils';
import { useConfigStore } from '@/stores/config';
import { client, extractData } from '@/lib/api';
import { checkLatestReleaseApi, fetchRuntimeVersionApi } from '@/components/public/components/about/api';
import { AdminPage } from './admin-ui';

type SystemOsInfo = {
  os_type: string;
  os_version?: string | null;
  kernel_version?: string | null;
  support_service: boolean;
  nixos_hint: boolean;
  is_mobile: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isSystemOsInfo = (value: unknown): value is SystemOsInfo => {
  if (!isRecord(value)) return false;
  if (typeof value['os_type'] !== 'string') return false;
  if (typeof value['support_service'] !== 'boolean') return false;
  if (typeof value['nixos_hint'] !== 'boolean') return false;
  if (typeof value['is_mobile'] !== 'boolean') return false;
  if (value['os_version'] !== undefined && value['os_version'] !== null && typeof value['os_version'] !== 'string') return false;
  if (value['kernel_version'] !== undefined && value['kernel_version'] !== null && typeof value['kernel_version'] !== 'string') return false;
  return true;
};

const isTauriLikeRuntime = (): boolean => {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w['__TAURI__'] || w['__TAURI_INTERNALS__']);
};

export const AdminAboutPage: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useThemeStore();
  const { language } = useLanguageStore();
  const { capabilities } = useConfigStore();

  const [osInfo, setOsInfo] = useState<SystemOsInfo | null>(null);

  const [runtimeVersion, setRuntimeVersion] = useState('');
  const [updateInfo, setUpdateInfo] = useState<AboutUpdateInfo | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchRuntimeVersionApi()
      .then((payload) => {
        if (cancelled) return;
        setRuntimeVersion(payload.version);
      })
      .catch((error) => {
        console.error('Failed to fetch runtime version', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void extractData<unknown>(client.GET('/api/v1/system/os-info'))
      .then((payload) => {
        if (cancelled) return;
        if (isSystemOsInfo(payload)) {
          setOsInfo(payload);
        } else {
          setOsInfo(null);
        }
      })
      .catch((error) => {
        console.warn('Failed to fetch system os-info', error);
        if (cancelled) return;
        setOsInfo(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const isDark = useMemo(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, [theme]);

  const updateGuideBaseUrl = useMemo(() => {
    return language === AUTO_LOCALE_PREFERENCE
      ? 'https://fileuni.com/update'
      : buildLocaleUrl('https://fileuni.com', language, '/update');
  }, [language]);

  const runtimeKindLabel = useMemo(() => {
    return isTauriLikeRuntime() ? 'tauri' : 'cli-web';
  }, []);

  const handleCheckUpdates = async () => {
    if (isCheckingUpdates) return;
    setIsCheckingUpdates(true);
    setUpdateError(null);
    try {
      const payload = await checkLatestReleaseApi();
      setUpdateInfo(payload);
    } catch (error) {
      console.error('Failed to check latest release', error);
      setUpdateError(error instanceof Error ? error.message : String(error));
      setUpdateInfo(null);
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  return (
    <AdminPage withBottomPadding={false} className="pt-2">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <AboutView
          currentVersion={runtimeVersion}
          showCheckUpdates={true}
          isCheckingUpdates={isCheckingUpdates}
          updateInfo={updateInfo}
          updateError={updateError}
          onCheckUpdates={handleCheckUpdates}
          getUpdateGuideUrl={(info, full) => buildAboutUpdateGuideUrl(updateGuideBaseUrl, info, full)}
          className="max-w-none"
        />

        <div
          className={cn(
            'rounded-2xl border p-6',
            isDark ? 'border-white/5 bg-zinc-950/40' : 'border-gray-200 bg-white',
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className={cn('text-xs font-black tracking-widest opacity-50', isDark ? 'text-white' : 'text-gray-900')}>
                {t('common.system')}
              </div>
              <div className={cn('mt-1 text-lg font-black tracking-tight', isDark ? 'text-white' : 'text-gray-900')}>
                Runtime & Environment
              </div>
              <div className={cn('mt-1 text-sm font-bold opacity-70', isDark ? 'text-white' : 'text-gray-700')}>
                {t('about.subtitle')}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className={cn('rounded-xl border p-4', isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50')}>
              <div className={cn('text-[10px] font-black tracking-widest opacity-50', isDark ? 'text-white' : 'text-gray-900')}>
                Service Kind
              </div>
              <div className="mt-1 font-mono text-sm font-black text-primary">{runtimeKindLabel}</div>
            </div>
            <div className={cn('rounded-xl border p-4', isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50')}>
              <div className={cn('text-[10px] font-black tracking-widest opacity-50', isDark ? 'text-white' : 'text-gray-900')}>
                Runtime OS
              </div>
              <div className="mt-1 font-mono text-sm font-black text-primary">
                {capabilities?.runtime_os || osInfo?.os_type || updateInfo?.target_os || '—'}
              </div>
            </div>
            <div className={cn('rounded-xl border p-4', isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50')}>
              <div className={cn('text-[10px] font-black tracking-widest opacity-50', isDark ? 'text-white' : 'text-gray-900')}>
                CPU Arch
              </div>
              <div className="mt-1 font-mono text-sm font-black text-primary">
                {capabilities?.runtime_arch || updateInfo?.target_arch || '—'}
              </div>
            </div>
            <div className={cn('rounded-xl border p-4', isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50')}>
              <div className={cn('text-[10px] font-black tracking-widest opacity-50', isDark ? 'text-white' : 'text-gray-900')}>
                Runtime Bits
              </div>
              <div className="mt-1 font-mono text-sm font-black text-primary">
                {capabilities?.runtime_bits ? String(capabilities.runtime_bits) : '—'}
              </div>
            </div>
            <div className={cn('rounded-xl border p-4', isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50')}>
              <div className={cn('text-[10px] font-black tracking-widest opacity-50', isDark ? 'text-white' : 'text-gray-900')}>
                OS Version
              </div>
              <div className="mt-1 font-mono text-sm font-black text-primary">
                {osInfo?.os_version || '—'}
              </div>
              {osInfo?.kernel_version && (
                <div className={cn('mt-1 text-xs font-bold opacity-70', isDark ? 'text-white' : 'text-gray-700')}>
                  kernel: {osInfo.kernel_version}
                </div>
              )}
            </div>
            <div className={cn('rounded-xl border p-4', isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50')}>
              <div className={cn('text-[10px] font-black tracking-widest opacity-50', isDark ? 'text-white' : 'text-gray-900')}>
                Platform
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-black text-primary">
                  {osInfo?.is_mobile ? 'mobile' : 'desktop'}
                </span>
                <span className={cn('text-xs font-black tracking-widest opacity-40', isDark ? 'text-white' : 'text-gray-900')}>
                  service={osInfo?.support_service ? 'yes' : 'no'}
                </span>
              </div>
              {osInfo?.nixos_hint && (
                <div className={cn('mt-1 text-xs font-bold opacity-70', isDark ? 'text-white' : 'text-gray-700')}>
                  nixos hint: true
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminPage>
  );
};
