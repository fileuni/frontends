import React, { useEffect, useMemo, useState } from 'react';
import { Boxes, Database, Gauge, HardDrive, Layers3, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import { PasswordInput } from '@/components/common/PasswordInput';
import type { TomlAdapter } from './ExternalDependencyConfigModal';
import {
  applyDraftToConfig,
  buildDraftFromConfig,
  buildPostgresDsn,
  buildRedisUrl,
  buildSqliteDsn,
  defaultDraft,
  parseConfig,
  parsePostgresDsn,
  parseRedisUrl,
  recommendedAllocatorPolicyForRuntime,
  type DatabaseType,
  type FriendlyDraft,
  type LoadProfile,
  type PerformanceTier,
} from './ConfigQuickWizardModal';

interface BaseProps {
  tomlAdapter: TomlAdapter;
  content: string;
  onContentChange: (value: string) => void;
  runtimeOs?: string;
}

interface DatabasePanelProps extends BaseProps {
  onTestDatabase?: (payload: { databaseType: DatabaseType; connectionString: string }) => Promise<void>;
}

interface CachePanelProps extends BaseProps {
  onTestCache?: (payload: { cacheType: string; connectionString: string }) => Promise<void>;
}

const tierOptions: Array<{ value: PerformanceTier; labelKey: string; descKey: string }> = [
  { value: 'extreme-low', labelKey: 'admin.config.quickWizard.performance.tiers.extremeLow', descKey: 'admin.config.quickWizard.performance.descriptions.extremeLow' },
  { value: 'low', labelKey: 'admin.config.quickWizard.performance.tiers.low', descKey: 'admin.config.quickWizard.performance.descriptions.low' },
  { value: 'medium', labelKey: 'admin.config.quickWizard.performance.tiers.medium', descKey: 'admin.config.quickWizard.performance.descriptions.medium' },
  { value: 'good', labelKey: 'admin.config.quickWizard.performance.tiers.good', descKey: 'admin.config.quickWizard.performance.descriptions.good' },
];

const useDraft = ({ tomlAdapter, content, runtimeOs }: Pick<BaseProps, 'tomlAdapter' | 'content' | 'runtimeOs'>) => {
  const fallbackPolicy = recommendedAllocatorPolicyForRuntime(runtimeOs);
  const parsed = useMemo(() => parseConfig(content, tomlAdapter.parse), [content, tomlAdapter]);
  const draft = useMemo(() => parsed.value ? buildDraftFromConfig(parsed.value, fallbackPolicy) : { ...defaultDraft, allocatorPolicy: fallbackPolicy }, [fallbackPolicy, parsed.value]);
  return { fallbackPolicy, parsed, draft };
};

export const PerformanceInlinePanel: React.FC<BaseProps> = ({ tomlAdapter, content, onContentChange, runtimeOs }) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === 'dark';
  const { fallbackPolicy, parsed, draft } = useDraft({ tomlAdapter, content, runtimeOs });
  const [local, setLocal] = useState<FriendlyDraft>(draft);
  const [showAllImpacts, setShowAllImpacts] = useState(false);

  useEffect(() => setLocal(draft), [draft]);

  const pushDraft = (nextDraft: FriendlyDraft) => {
    if (!parsed.value) return;
    const next = applyDraftToConfig(parsed.value, nextDraft, fallbackPolicy);
    onContentChange(tomlAdapter.stringify(next));
  };

  const updateDraft = (updater: (draft: FriendlyDraft) => FriendlyDraft) => {
    setLocal((prev) => {
      const nextDraft = updater(prev);
      pushDraft(nextDraft);
      return nextDraft;
    });
  };

  const impactItems = useMemo(() => {
    const simulated = applyDraftToConfig(parsed.value ?? {}, local, fallbackPolicy);
    const database = (simulated as any).database ?? {};
    const kv = (simulated as any).fast_kv_storage_hub ?? {};
    const vfs = (simulated as any).vfs_storage_hub ?? {};
    const plus = (((simulated as any).extension_manager ?? {}).plus) ?? {};
    const captcha = (simulated as any).captcha_code ?? {};
    const middleware = (simulated as any).middleware ?? {};
    const bruteForce = middleware.brute_force ?? {};
    const ipRate = middleware.ip_rate_limit ?? {};
    const clientRate = middleware.client_id_rate_limit ?? {};
    const userRate = middleware.user_id_rate_limit ?? {};
    const sqlite = database.sqlite_config ?? {};
    const postgres = database.postgres_config ?? {};
    return [
      ['database.db_type', database.db_type],
      ['database.health_check_timeout_seconds', database.health_check_timeout_seconds],
      ['database.sqlite_config.max_connections', database.sqlite_config?.max_connections],
      ['database.sqlite_config.max_connections_low_memory', sqlite.max_connections_low_memory],
      ['database.sqlite_config.max_connections_throughput', sqlite.max_connections_throughput],
      ['database.sqlite_config.min_connections', sqlite.min_connections],
      ['database.sqlite_config.cache_size', sqlite.cache_size],
      ['database.sqlite_config.temp_store', sqlite.temp_store],
      ['database.sqlite_config.mmap_size', sqlite.mmap_size],
      ['database.postgres_config.max_connections', database.postgres_config?.max_connections],
      ['database.postgres_config.max_connections_low_memory', postgres.max_connections_low_memory],
      ['database.postgres_config.max_connections_throughput', postgres.max_connections_throughput],
      ['database.postgres_config.min_connections', postgres.min_connections],
      ['fast_kv_storage_hub.kv_type', kv.kv_type],
      ['fast_kv_storage_hub.default_ttl', kv.default_ttl],
      ['fast_kv_storage_hub.condition_ttl', kv.condition_ttl],
      ['fast_kv_storage_hub.dashmap_mem_upper_limit_ratio', kv.dashmap_mem_upper_limit_ratio],
      ['fast_kv_storage_hub.dashmap_mem_max_bytes', kv.dashmap_mem_max_bytes],
      ['fast_kv_storage_hub.dashmap_mem_max_bytes_low_memory', kv.dashmap_mem_max_bytes_low_memory],
      ['fast_kv_storage_hub.dashmap_mem_max_bytes_throughput', kv.dashmap_mem_max_bytes_throughput],
      ['internal_notify.unread_count_cache_ttl', (simulated as any).internal_notify?.unread_count_cache_ttl],
      ['internal_notify.retention_days', (simulated as any).internal_notify?.retention_days],
      ['system_backup.max_backup_size_mb', (simulated as any).system_backup?.max_backup_size_mb],
      ['middleware.ip_rate_limit.window_secs', ipRate.window_secs],
      ['middleware.ip_rate_limit.max_requests', ipRate.max_requests],
      ['middleware.client_id_rate_limit.window_secs', clientRate.window_secs],
      ['middleware.client_id_rate_limit.max_requests', clientRate.max_requests],
      ['middleware.client_id_rate_limit.max_cid', clientRate.max_cid],
      ['middleware.user_id_rate_limit.window_secs', userRate.window_secs],
      ['middleware.user_id_rate_limit.max_requests', userRate.max_requests],
      ['middleware.user_id_rate_limit.max_userid', userRate.max_userid],
      ['vfs_storage_hub.enable_s3', vfs.enable_s3],
      ['vfs_storage_hub.enable_sftp', vfs.enable_sftp],
      ['vfs_storage_hub.enable_ftp', vfs.enable_ftp],
      ['task_registry.internal_notify.max_concurrency', (simulated as any).task_registry?.internal_notify?.max_concurrency],
      ['task_registry.captcha_preheat.max_concurrency', (simulated as any).task_registry?.captcha_preheat?.max_concurrency],
      ['extension_manager.plus.enabled', plus.enabled],
      ['extension_manager.plus.capture_logs', plus.capture_logs],
      ['captcha_code.graphic_cache_size', captcha.graphic_cache_size],
      ['captcha_code.graphic_gen_concurrency', captcha.graphic_gen_concurrency],
      ['captcha_code.max_gen_concurrency', captcha.max_gen_concurrency],
      ['middleware.brute_force.enabled', bruteForce.enabled],
      ['middleware.brute_force.max_failures_per_user_ip', bruteForce.max_failures_per_user_ip],
      ['middleware.brute_force.max_failures_per_ip_global', bruteForce.max_failures_per_ip_global],
      ['middleware.brute_force.lockout_secs', bruteForce.lockout_secs],
      ['middleware.brute_force.enable_exponential_backoff', bruteForce.enable_exponential_backoff],
      ['memory_allocator.policy', (simulated as any).memory_allocator?.policy],
      ['safeaccess_guard.bloom_filter_capacity', (simulated as any).safeaccess_guard?.bloom_filter_capacity],
      ['file_manager_serv_sftp.max_connections', (simulated as any).file_manager_serv_sftp?.max_connections],
      ['file_manager_serv_ftp.max_connections', (simulated as any).file_manager_serv_ftp?.max_connections],
      ['file_manager_serv_s3.max_connections', (simulated as any).file_manager_serv_s3?.max_connections],
    ].filter(([, value]) => value !== undefined);
  }, [fallbackPolicy, local, parsed.value]);

  const summaryCards = useMemo(() => {
    const simulated = applyDraftToConfig(parsed.value ?? {}, local, fallbackPolicy) as any;
    const db = simulated.database ?? {};
    const kv = simulated.fast_kv_storage_hub ?? {};
    const middleware = simulated.middleware ?? {};
    const bruteForce = middleware.brute_force ?? {};
    const captcha = simulated.captcha_code ?? {};
    return [
      [t('admin.config.quickWizard.performance.preview.dbPool'), `${db.sqlite_config?.max_connections ?? db.postgres_config?.max_connections ?? '-'} / ${db.sqlite_config?.min_connections ?? db.postgres_config?.min_connections ?? '-'}`],
      [t('admin.config.quickWizard.performance.preview.cacheMemory'), `${Math.round((Number(kv.dashmap_mem_max_bytes ?? 0) / 1024 / 1024) || 0)} MB`],
      [t('admin.config.quickWizard.performance.preview.bruteForceLockout'), `${bruteForce.lockout_secs ?? '-'}`],
      [t('admin.config.quickWizard.performance.preview.captchaPreheatPool'), `${captcha.graphic_cache_size ?? '-'}`],
      [t('admin.config.quickWizard.performance.preview.captchaGenConcurrency'), `${captcha.graphic_gen_concurrency ?? '-'}/${captcha.max_gen_concurrency ?? '-'}`],
      [t('admin.config.quickWizard.performance.preview.sftpMaxConnections'), `${simulated.file_manager_serv_sftp?.max_connections ?? '-'}`],
      [t('admin.config.quickWizard.performance.preview.ftpMaxConnections'), `${simulated.file_manager_serv_ftp?.max_connections ?? '-'}`],
      [t('admin.config.quickWizard.performance.preview.s3MaxConnections'), `${simulated.file_manager_serv_s3?.max_connections ?? '-'}`],
    ];
  }, [fallbackPolicy, local, parsed.value, t]);

  const impactGroupStats = useMemo(() => {
    const labelMap: Record<string, string> = {
      database: t('admin.config.quickWizard.performance.preview.groups.database'),
      fast_kv_storage_hub: t('admin.config.quickWizard.performance.preview.groups.cache'),
      internal_notify: t('admin.config.quickWizard.performance.preview.groups.scheduler'),
      system_backup: t('admin.config.quickWizard.performance.preview.groups.scheduler'),
      middleware: t('admin.config.quickWizard.performance.preview.groups.middleware'),
      captcha_code: t('admin.config.quickWizard.performance.preview.groups.captcha'),
      memory_allocator: t('admin.config.quickWizard.performance.preview.groups.allocator'),
      vfs_storage_hub: t('admin.config.quickWizard.performance.preview.groups.vfs'),
      task_registry: t('admin.config.quickWizard.performance.preview.groups.scheduler'),
      file_manager_serv_sftp: t('admin.config.quickWizard.performance.preview.groups.sftp'),
      file_manager_serv_ftp: t('admin.config.quickWizard.performance.preview.groups.ftp'),
      file_manager_serv_s3: t('admin.config.quickWizard.performance.preview.groups.s3'),
      chat_manager: t('admin.config.quickWizard.performance.preview.groups.chat'),
      email_manager: t('admin.config.quickWizard.performance.preview.groups.email'),
      extension_manager: t('admin.config.quickWizard.performance.preview.groups.other'),
      safeaccess_guard: t('admin.config.quickWizard.performance.preview.groups.other'),
    };
    const counts = new Map<string, number>();
    impactItems.forEach(([path]) => {
      const key = String(path).split('.')[0] || 'other';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, label: labelMap[key] || t('admin.config.quickWizard.performance.preview.groups.other'), count }));
  }, [impactItems, t]);

  const selectedTier = tierOptions.find((tier) => tier.value === local.performanceTier) ?? tierOptions[0];

  const selectedHighlights = [
    {
      label: t('admin.config.quickWizard.steps.performance'),
      value: t(selectedTier.labelKey),
    },
    {
      label: t('admin.config.quickWizard.performance.loadProfile.title'),
      value: t(`admin.config.quickWizard.performance.loadProfile.${local.loadProfile}`),
    },
    {
      label: t('setup.config.dbType'),
      value: local.databaseType === 'sqlite' ? 'SQLite' : 'PostgreSQL',
    },
    {
      label: t('setup.config.kvType'),
      value: local.cacheType,
    },
  ];

  const featureStates = [
    ['compression', local.performanceTier === 'good'],
    ['sftp', local.performanceTier === 'good'],
    ['ftp', local.performanceTier !== 'extreme-low' && local.loadProfile === 'light'],
    ['s3', local.performanceTier === 'good'],
    ['chat', local.performanceTier !== 'extreme-low' && local.loadProfile === 'light'],
    ['email', local.performanceTier === 'good' && local.loadProfile === 'light'],
    ['webdav', true],
    ['bloomWarmup', local.performanceTier !== 'extreme-low' && !(local.performanceTier === 'good' && local.loadProfile === 'heavy')],
  ] as const;

  const tipCards = [
    { key: 'raid', icon: HardDrive },
    { key: 'pgsql', icon: Database },
    { key: 'memory', icon: Gauge },
  ] as const;

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className={cn('rounded-2xl border p-4', isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50')}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className={cn('text-xs font-black uppercase tracking-wide', isDark ? 'text-slate-300' : 'text-slate-700')}>
                  {t('admin.config.quickWizard.steps.performance')}
                </div>
                <div className={cn('mt-2 text-sm leading-6', isDark ? 'text-slate-300' : 'text-slate-600')}>
                  {t('admin.config.quickWizard.performance.intro')}
                </div>
              </div>
              <div className={cn('rounded-2xl border px-3 py-3 lg:w-[19rem]', isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white')}>
                <div className={cn('text-[11px] font-black uppercase tracking-[0.18em]', isDark ? 'text-slate-400' : 'text-slate-500')}>
                  {t('admin.config.quickWizard.performance.recommendedSettings')}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {selectedHighlights.map((item) => (
                    <div key={item.label} className={cn('rounded-xl border px-3 py-2.5', isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50')}>
                      <div className={cn('text-[11px] font-black uppercase tracking-[0.18em]', isDark ? 'text-slate-500' : 'text-slate-500')}>{item.label}</div>
                      <div className={cn('mt-1.5 text-sm font-black', isDark ? 'text-slate-100' : 'text-slate-800')}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={cn('rounded-2xl border p-3.5', isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white')}>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className={isDark ? 'text-sky-300' : 'text-sky-600'} />
                <div className={cn('text-xs font-black uppercase tracking-[0.18em]', isDark ? 'text-slate-300' : 'text-slate-700')}>
                  {t('admin.config.quickWizard.steps.performance')}
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {tierOptions.map((tier) => (
                  <button
                    key={tier.value}
                    type="button"
                    onClick={() => updateDraft((prev) => ({ ...prev, performanceTier: tier.value }))}
                    className={cn(
                      'rounded-2xl border px-3 py-3 text-left transition-all',
                      local.performanceTier === tier.value
                        ? 'border-primary bg-primary/10 shadow-sm shadow-primary/10'
                        : isDark ? 'border-white/10 bg-slate-950/40 hover:bg-white/[0.04]' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className={cn('text-sm font-black', local.performanceTier === tier.value ? 'text-primary' : isDark ? 'text-slate-100' : 'text-slate-800')}>
                        {t(tier.labelKey)}
                      </div>
                      <div className={cn('rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wide', local.performanceTier === tier.value ? 'bg-primary/15 text-primary' : isDark ? 'bg-white/10 text-slate-300' : 'bg-white text-slate-500')}>
                        {local.performanceTier === tier.value ? t('common.enabled') : t('common.disabled')}
                      </div>
                    </div>
                    <div className={cn('mt-2 text-xs leading-5', local.performanceTier === tier.value ? 'text-primary/90' : isDark ? 'text-slate-300' : 'text-slate-500')}>
                      {t(tier.descKey)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className={cn('rounded-2xl border p-3.5', isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white')}>
              <div className="flex items-center gap-2">
                <Layers3 size={16} className={isDark ? 'text-emerald-300' : 'text-emerald-600'} />
                <div className={cn('text-xs font-black uppercase tracking-[0.18em]', isDark ? 'text-slate-300' : 'text-slate-700')}>
                  {t('admin.config.quickWizard.performance.loadProfile.title')}
                </div>
              </div>
              <div className={cn('mt-2 text-sm leading-6', isDark ? 'text-slate-300' : 'text-slate-600')}>
                {t('admin.config.quickWizard.performance.loadProfile.desc')}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(['light', 'heavy'] as LoadProfile[]).map((profile) => {
                  const disabled = profile === 'heavy' && (local.performanceTier === 'extreme-low' || local.performanceTier === 'low');
                  return (
                    <button
                      key={profile}
                      type="button"
                      disabled={disabled}
                      onClick={() => updateDraft((prev) => ({ ...prev, loadProfile: profile }))}
                      className={cn(
                        'rounded-2xl border px-3 py-3 text-left text-sm transition-all disabled:cursor-not-allowed disabled:opacity-55',
                        local.loadProfile === profile
                          ? 'border-primary bg-primary/10 text-primary'
                          : isDark ? 'border-white/10 bg-slate-950/40 text-slate-200 hover:bg-white/[0.04]' : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                      )}
                    >
                      <div className="font-black">{t(`admin.config.quickWizard.performance.loadProfile.${profile}`)}</div>
                      <div className={cn('mt-1 text-xs leading-5', local.loadProfile === profile ? 'text-primary/90' : isDark ? 'text-slate-300' : 'text-slate-500')}>
                        {t(`admin.config.quickWizard.performance.loadProfile.${profile}Desc`)}
                      </div>
                      {disabled && (
                        <div className={cn('mt-2 text-xs leading-5 font-semibold', isDark ? 'text-amber-300' : 'text-amber-700')}>
                          {t('admin.config.quickWizard.performance.loadProfile.disabledOnLowHardware')}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className={cn('rounded-2xl border p-4', isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50')}>
          <div className="flex h-full flex-col gap-4">
            <div>
              <div className={cn('text-xs font-black uppercase tracking-wide', isDark ? 'text-slate-300' : 'text-slate-700')}>
                {t('admin.config.quickWizard.performance.performanceTips.title')}
              </div>
              <div className="mt-3 grid gap-2">
                {tipCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.key} className={cn('rounded-2xl border px-3 py-3', isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white')}>
                      <div className="flex items-start gap-3">
                        <div className={cn('mt-0.5 rounded-xl p-2', isDark ? 'bg-white/10 text-sky-200' : 'bg-sky-50 text-sky-700')}>
                          <Icon size={16} />
                        </div>
                        <div className={cn('text-sm leading-6', isDark ? 'text-slate-200' : 'text-slate-700')}>
                          {t(`admin.config.quickWizard.performance.performanceTips.${item.key}`)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={cn('rounded-2xl border p-3.5', isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white')}>
              <div className="flex items-center gap-2">
                <Boxes size={16} className={isDark ? 'text-violet-300' : 'text-violet-600'} />
                <div className={cn('text-xs font-black uppercase tracking-[0.18em]', isDark ? 'text-slate-300' : 'text-slate-700')}>
                  {t('admin.config.quickWizard.performance.recommendedSettings')}
                </div>
              </div>
              <div className={cn('mt-2 text-sm leading-6', isDark ? 'text-slate-300' : 'text-slate-600')}>
                {t('admin.config.quickWizard.performance.preview.simpleHint')}
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {summaryCards.map(([label, value]) => (
                  <div key={label} className={cn('rounded-2xl border px-3 py-3', isDark ? 'border-white/10 bg-slate-950/50' : 'border-slate-200 bg-slate-50')}>
                    <div className={cn('text-[11px] font-black uppercase tracking-[0.18em]', isDark ? 'text-slate-500' : 'text-slate-500')}>{label}</div>
                    <div className={cn('mt-2 text-sm font-black', isDark ? 'text-slate-100' : 'text-slate-800')}>{value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 border-t border-dashed border-slate-200 pt-3 dark:border-white/10">
                <div className={cn('text-[11px] font-black uppercase tracking-[0.18em]', isDark ? 'text-slate-400' : 'text-slate-500')}>
                  {t('admin.config.quickWizard.performance.preview.configKeyChanges')}
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {featureStates.map(([key, enabled]) => (
                    <div key={String(key)} className={cn('rounded-2xl border px-3 py-3 text-sm font-black', enabled ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100' : 'border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-black/20 dark:text-slate-400')}>
                      {t(`admin.config.quickWizard.performance.features.${key}`)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button type="button" onClick={() => setShowAllImpacts(true)} className={cn('mt-auto h-10 rounded-xl border px-4 text-sm font-black transition-all', isDark ? 'border-white/10 bg-black/20 text-slate-100 hover:bg-white/10' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-100')}>
              {t('common.more')}
            </button>
          </div>
        </div>
      </div>
    {showAllImpacts && (
      <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
        <button type="button" aria-label="close" className="absolute inset-0 bg-black/70" onClick={() => setShowAllImpacts(false)} />
        <div className={cn('relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border p-4 shadow-2xl', isDark ? 'border-white/10 bg-slate-950 text-slate-100' : 'border-slate-200 bg-white text-slate-900')}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black uppercase tracking-[0.18em]">{t('admin.config.quickWizard.performance.preview.configKeyChanges')}</div>
              <div className={cn('mt-1 text-sm', isDark ? 'text-slate-300' : 'text-slate-500')}>{t('admin.config.quickWizard.performance.preview.totalChanges', { count: impactItems.length })}</div>
            </div>
            <button type="button" onClick={() => setShowAllImpacts(false)} className={cn('inline-flex h-10 w-10 items-center justify-center rounded-xl border', isDark ? 'border-white/10 bg-white/[0.03] text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-800')} aria-label={t('common.close')} title={t('common.close')}>
              <X size={18} />
            </button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {impactGroupStats.map((group) => (
              <div key={group.key} className={cn('rounded-xl border px-3 py-3', isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50')}>
                <div className={cn('text-[11px] font-black uppercase tracking-[0.18em]', isDark ? 'text-slate-400' : 'text-slate-500')}>{group.label}</div>
                <div className={cn('mt-2 text-sm font-black', isDark ? 'text-slate-100' : 'text-slate-800')}>{group.count}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex-1 overflow-y-auto rounded-xl border border-slate-200 p-3 dark:border-white/10">
            <div className="grid gap-2">
              {impactItems.map(([path, value]) => (
                <div key={String(path)} className="grid grid-cols-[1fr_auto] gap-3 text-sm">
                  <div className={cn('font-mono break-all', isDark ? 'text-slate-300' : 'text-slate-600')}>{path}</div>
                  <div className={cn('font-mono font-black', isDark ? 'text-slate-100' : 'text-slate-800')}>{String(value)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export const DatabaseInlinePanel: React.FC<DatabasePanelProps> = ({ tomlAdapter, content, onContentChange, runtimeOs, onTestDatabase }) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === 'dark';
  const { fallbackPolicy, parsed, draft } = useDraft({ tomlAdapter, content, runtimeOs });
  const [local, setLocal] = useState<FriendlyDraft>(draft);
  useEffect(() => setLocal(draft), [draft]);

  const inputClass = cn('mt-1 h-11 w-full rounded-xl border px-3 text-sm', isDark ? 'border-white/10 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900');
  const pushDraft = (nextDraft: FriendlyDraft) => {
    if (!parsed.value) return;
    const normalized = { ...nextDraft };
    normalized.postgresDsn = buildPostgresDsn(normalized);
    normalized.sqliteDsn = buildSqliteDsn(normalized.sqlitePath);
    onContentChange(tomlAdapter.stringify(applyDraftToConfig(parsed.value, normalized, fallbackPolicy)));
  };

  const updateDraft = (updater: (draft: FriendlyDraft) => FriendlyDraft) => {
    setLocal((prev) => {
      const nextDraft = updater(prev);
      pushDraft(nextDraft);
      return nextDraft;
    });
  };

  return (
    <div className="grid gap-4">
      <div className={cn(
        'inline-flex w-full flex-wrap items-center rounded-2xl border p-1',
        isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-100'
      )}>
        {(['sqlite', 'postgres'] as DatabaseType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => updateDraft((prev) => ({ ...prev, databaseType: type }))}
            className={cn(
              'h-11 min-w-[10rem] flex-1 rounded-xl px-3 text-sm font-black transition-all',
              local.databaseType === type
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : isDark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-700 hover:bg-white'
            )}
          >
            {type === 'sqlite' ? '本地数据库' : 'PostgreSQL'}
          </button>
        ))}
      </div>
      {local.databaseType === 'sqlite' ? (
        <div>
          <div className={cn('text-xs font-black uppercase tracking-wide', isDark ? 'text-slate-400' : 'text-slate-600')}>{t('admin.config.quickWizard.fields.sqlitePath')}</div>
          <input value={local.sqlitePath} onChange={(event) => updateDraft((prev) => ({ ...prev, sqlitePath: event.target.value }))} className={inputClass} />
          <div className="mt-2 text-xs leading-6 text-emerald-700 dark:text-emerald-300">{t('admin.config.quickWizard.hints.sqliteSingleNode')}</div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['host', local.dbHost],
            ['port', local.dbPort],
            ['user', local.dbUser],
            ['password', local.dbPass],
            ['databaseName', local.dbName],
          ].map(([field, value]) => (
            <div key={String(field)} className={field === 'databaseName' ? 'sm:col-span-2' : ''}>
              <div className={cn('text-xs font-black uppercase tracking-wide', isDark ? 'text-slate-400' : 'text-slate-600')}>{t(`admin.config.quickWizard.fields.${field}`)}</div>
              {field === 'password' ? (
                <PasswordInput value={String(value)} onChange={(event) => {
                  const next = { ...local, dbPass: event.target.value } as FriendlyDraft;
                  const parsedFields = parsePostgresDsn(buildPostgresDsn(next));
                  updateDraft(() => ({ ...next, ...parsedFields }));
                }} inputClassName={inputClass} />
              ) : (
                <input type="text" value={String(value)} onChange={(event) => {
                const next = { ...local, [field === 'databaseName' ? 'dbName' : field === 'user' ? 'dbUser' : field === 'password' ? 'dbPass' : field === 'host' ? 'dbHost' : 'dbPort']: event.target.value } as FriendlyDraft;
                const parsedFields = parsePostgresDsn(buildPostgresDsn(next));
                updateDraft(() => ({ ...next, ...parsedFields }));
              }} className={inputClass} />)}
            </div>
          ))}
        </div>
      )}
      {onTestDatabase && (
        <button
          type="button"
          onClick={() => {
            const connectionString = local.databaseType === 'sqlite'
              ? buildSqliteDsn(local.sqlitePath)
              : buildPostgresDsn(local);
            void onTestDatabase({ databaseType: local.databaseType, connectionString });
          }}
          className={cn('h-10 w-fit rounded-xl border px-4 text-sm font-black transition-all', isDark ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15' : 'border-cyan-300 bg-cyan-50 text-cyan-900 hover:bg-cyan-100')}
        >
          {t('setup.editor.check')}
        </button>
      )}
    </div>
  );
};

export const CacheInlinePanel: React.FC<CachePanelProps> = ({ tomlAdapter, content, onContentChange, runtimeOs, onTestCache }) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === 'dark';
  const { fallbackPolicy, parsed, draft } = useDraft({ tomlAdapter, content, runtimeOs });
  const [local, setLocal] = useState<FriendlyDraft>(draft);
  useEffect(() => setLocal(draft), [draft]);
  const inputClass = cn('mt-1 h-11 w-full rounded-xl border px-3 text-sm', isDark ? 'border-white/10 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900');
  const isRedisLike = ['valkey', 'redis', 'keydb'].includes(local.cacheType);
  const pushDraft = (nextDraft: FriendlyDraft) => {
    if (!parsed.value) return;
    const normalized = { ...nextDraft, cacheRedisUrl: buildRedisUrl(nextDraft) };
    onContentChange(tomlAdapter.stringify(applyDraftToConfig(parsed.value, normalized, fallbackPolicy)));
  };

  const updateDraft = (updater: (draft: FriendlyDraft) => FriendlyDraft) => {
    setLocal((prev) => {
      const nextDraft = updater(prev);
      pushDraft(nextDraft);
      return nextDraft;
    });
  };

  return (
    <div className="grid gap-4">
      <div className={cn(
        'inline-flex w-full flex-wrap items-center rounded-2xl border p-1',
        isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-100'
      )}>
        {[
          ['database', 'setup.config.kvSqlHint'],
          ['dashmap', 'setup.config.kvDashmapHint'],
          ['external', 'setup.config.kvRedisHint'],
        ].map(([type, hintKey]) => (
          <button
            key={type}
            type="button"
            onClick={() => updateDraft((prev) => ({ ...prev, cacheType: type === 'external' ? (['redis','valkey','keydb'].includes(prev.cacheType) ? prev.cacheType : 'valkey') : type }))}
            className={cn(
              'min-w-[10rem] flex-1 rounded-xl px-3 py-3 text-left text-sm font-black transition-all',
              (type === 'external' ? isRedisLike : local.cacheType === type)
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : isDark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-700 hover:bg-white'
            )}
          >
            <div>{type === 'database' ? t('setup.config.kvType') + ' · DB' : type === 'dashmap' ? t('setup.config.kvType') + ' · DashMap' : t('setup.cache.externalServer')}</div>
            <div className={cn('mt-1 text-xs leading-5 font-semibold', (type === 'external' ? isRedisLike : local.cacheType === type) ? 'text-white/85' : isDark ? 'text-slate-400' : 'text-slate-500')}>{t(hintKey)}</div>
          </button>
        ))}
      </div>
      {isRedisLike && (
        <div className={cn(
          'inline-flex w-full flex-wrap items-center rounded-2xl border p-1',
          isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-100'
        )}>
          {['redis', 'valkey', 'keydb'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => updateDraft((prev) => ({ ...prev, cacheType: type }))}
              className={cn(
                'h-11 min-w-[8rem] flex-1 rounded-xl px-3 text-sm font-black transition-all',
                local.cacheType === type
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : isDark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-700 hover:bg-white'
              )}
            >
              {type}
            </button>
          ))}
        </div>
      )}
      {isRedisLike && (
        <div className={cn('rounded-2xl border p-3 text-sm leading-6', isDark ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-100' : 'border-cyan-200 bg-cyan-50 text-cyan-900')}>
          {t(`setup.cache.externalHints.${local.cacheType}`)}
        </div>
      )}
      {isRedisLike && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['host', local.cacheHost],
            ['port', local.cachePort],
            ['user', local.cacheUser],
            ['password', local.cachePass],
          ].map(([field, value]) => (
            <div key={String(field)}>
              <div className={cn('text-xs font-black uppercase tracking-wide', isDark ? 'text-slate-400' : 'text-slate-600')}>{t(`admin.config.quickWizard.fields.${field}`)}</div>
              {field === 'password' ? (
                <PasswordInput value={String(value)} onChange={(event) => {
                  const next = { ...local, cachePass: event.target.value } as FriendlyDraft;
                  const parsedFields = parseRedisUrl(buildRedisUrl(next));
                  updateDraft(() => ({ ...next, ...parsedFields }));
                }} inputClassName={inputClass} />
              ) : (
                <input type="text" value={String(value)} onChange={(event) => {
                const key = field === 'user' ? 'cacheUser' : field === 'password' ? 'cachePass' : field === 'host' ? 'cacheHost' : 'cachePort';
                const next = { ...local, [key]: event.target.value } as FriendlyDraft;
                const parsedFields = parseRedisUrl(buildRedisUrl(next));
                updateDraft(() => ({ ...next, ...parsedFields }));
              }} className={inputClass} />)}
            </div>
          ))}
          <label className="flex items-center gap-3 sm:col-span-2">
            <input type="checkbox" checked={local.cacheUseTls} onChange={(event) => updateDraft((prev) => ({ ...prev, cacheUseTls: event.target.checked }))} />
            <span className="text-sm font-black">{t('admin.config.quickWizard.fields.useTls')}</span>
          </label>
        </div>
      )}
      {onTestCache && isRedisLike && (
        <button
          type="button"
          onClick={() => {
            void onTestCache({ cacheType: local.cacheType, connectionString: buildRedisUrl(local) });
          }}
          className={cn('h-10 w-fit rounded-xl border px-4 text-sm font-black transition-all', isDark ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15' : 'border-cyan-300 bg-cyan-50 text-cyan-900 hover:bg-cyan-100')}
        >
          {t('setup.editor.check')}
        </button>
      )}
    </div>
  );
};
