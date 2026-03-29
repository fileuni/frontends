import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { Activity, Play, ScrollText, Search } from 'lucide-react';
import type { DdnsPlanItem, DdnsPlanResponse } from '../types';
import { sectionCardBase } from '../presentation';

export const DdnsPlanModal = ({
  isOpen,
  loading,
  data,
  onClose,
  onRefresh,
  onRun,
  onInspect,
  onCheck,
  onOpenLogs,
}: {
  isOpen: boolean;
  loading: boolean;
  data: DdnsPlanResponse | null;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onRun: (id: string) => Promise<void>;
  onInspect: (id: string) => Promise<void>;
  onCheck: (id: string) => Promise<void>;
  onOpenLogs: (id: string) => void;
}) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'needed' | 'all' | 'failed' | 'skipped'>('needed');
  const [query, setQuery] = useState('');
  const [maxConcurrency, setMaxConcurrency] = useState(3);
  const [runAllRunning, setRunAllRunning] = useState(false);

  const items = useMemo(() => {
    const list = data?.items || [];
    const q = query.trim().toLowerCase();
    return list
      .filter((it) => {
        if (filter === 'all') return true;
        if (filter === 'failed') return it.action === 'failed';
        if (filter === 'skipped') return it.action === 'skipped';
        // needed
        return it.action === 'update' || it.need_update_ipv4 || it.need_update_ipv6;
      })
      .filter((it) => {
        if (!q) return true;
        const text = `${it.name} ${it.fqdn} ${it.provider_key}`.toLowerCase();
        return text.includes(q);
      });
  }, [data, filter, query]);

  const runWithThrottle = async (targets: DdnsPlanItem[]) => {
    const max = Math.max(1, Math.min(8, Number(maxConcurrency) || 1));

    const pending = [...targets];
    const inflight: Array<Promise<void>> = [];
    const inflightByProvider = new Map<string, number>();

    const startOne = (it: DdnsPlanItem) => {
      const pk = it.provider_key || 'unknown';
      inflightByProvider.set(pk, (inflightByProvider.get(pk) || 0) + 1);
      const p = onRun(it.id)
        .catch(() => {
          // errors are already toasted by caller; keep batch running
        })
        .finally(() => {
          const n = (inflightByProvider.get(pk) || 1) - 1;
          if (n <= 0) inflightByProvider.delete(pk);
          else inflightByProvider.set(pk, n);
        });
      inflight.push(p);
      p.finally(() => {
        const idx = inflight.indexOf(p);
        if (idx >= 0) inflight.splice(idx, 1);
      });
    };

    while (pending.length > 0 || inflight.length > 0) {
      let started = false;

      for (let i = 0; i < pending.length && inflight.length < max; ) {
        const it = pending[i];
        if (!it) {
          i += 1;
          continue;
        }
        const pk = it.provider_key || 'unknown';
        const providerBusy = (inflightByProvider.get(pk) || 0) >= 1;
        if (!providerBusy) {
          pending.splice(i, 1);
          startOne(it);
          started = true;
        } else {
          i += 1;
        }
      }

      if (!started) {
        if (inflight.length === 0) break;
        // eslint-disable-next-line no-await-in-loop
        await Promise.race(inflight);
      }
    }
  };

  const runAllNeeded = async () => {
    if (!data || runAllRunning) return;
    setRunAllRunning(true);
    try {
      const targets = (data.items || []).filter(
        (it) => it.action === 'update' || it.need_update_ipv4 || it.need_update_ipv6,
      );
      await runWithThrottle(targets);
    } finally {
      setRunAllRunning(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('admin.domain.ddnsPlan') || 'Plan'} maxWidth="max-w-5xl">
      <div className="space-y-6 p-1 text-foreground">
        <div className={sectionCardBase}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-black uppercase tracking-widest opacity-60">
                {t('admin.domain.ddnsPlanDesc') || 'Preview what will be updated and why.'}
              </div>
              {data && (
                <div className="mt-2 text-[14px] font-bold opacity-70">
                  total={data.total} need_update={data.need_update} failed={data.failed} skipped={data.skipped}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <div className="flex items-center gap-2">
                <div className="text-[12px] font-black uppercase tracking-widest opacity-50">
                  {t('admin.domain.filter') || 'Filter'}
                </div>
                <select
                  className="h-11 rounded-2xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm font-bold"
                  value={filter}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilter(
                      v === 'all' ? 'all' : v === 'failed' ? 'failed' : v === 'skipped' ? 'skipped' : 'needed',
                    );
                  }}
                >
                  <option value="needed">{t('admin.domain.onlyNeedUpdate') || 'Only Need Update'}</option>
                  <option value="failed">{t('admin.domain.failedOnly') || 'Failed Only'}</option>
                  <option value="skipped">{t('admin.domain.skippedOnly') || 'Skipped Only'}</option>
                  <option value="all">{t('admin.domain.showAll') || 'Show All'}</option>
                </select>
              </div>

              <input
                className="h-11 w-[220px] rounded-2xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm font-bold outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('admin.domain.searchPlan') || 'Search name/fqdn/provider'}
              />

              <div className="flex items-center gap-2">
                <div className="text-[12px] font-black uppercase tracking-widest opacity-50">
                  {t('admin.domain.concurrency') || 'Concurrency'}
                </div>
                <select
                  className="h-11 rounded-2xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm font-bold"
                  value={maxConcurrency}
                  onChange={(e) => setMaxConcurrency(Number(e.target.value) || 1)}
                >
                  {[1, 2, 3, 4, 6, 8].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <Button
                variant="outline"
                onClick={async () => {
                  await onRefresh();
                }}
                disabled={loading}
                className="h-11 px-5 rounded-2xl border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 font-bold"
              >
                <Activity size={16} className={cn('mr-2', loading && 'animate-spin')} />
                {t('common.refresh') || 'Refresh'}
              </Button>
              <Button
                onClick={runAllNeeded}
                disabled={loading || runAllRunning || !data || (data.need_update || 0) === 0}
                className="h-11 px-6 rounded-2xl bg-gradient-to-br from-primary to-primary/90 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
              >
                <Play size={16} className={cn('mr-2', runAllRunning && 'animate-pulse')} />
                {runAllRunning ? (t('admin.domain.running') || 'Running...') : (t('admin.domain.runNeeded') || 'Run Needed')}
              </Button>
            </div>
          </div>
        </div>

        <div className={sectionCardBase}>
          {!data ? (
            <div className="py-16 text-center opacity-40 font-bold uppercase tracking-widest">
              {loading ? (t('common.loading') || 'Loading') : (t('common.noData') || 'No data')}
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center opacity-40 font-bold uppercase tracking-widest">
              {t('admin.domain.noPlanItems') || 'No items'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-white/5">
                    <th className="py-3 text-[12px] font-black uppercase tracking-widest opacity-50">FQDN</th>
                    <th className="py-3 text-[12px] font-black uppercase tracking-widest opacity-50">Action</th>
                    <th className="py-3 text-[12px] font-black uppercase tracking-widest opacity-50">IPv4</th>
                    <th className="py-3 text-[12px] font-black uppercase tracking-widest opacity-50">IPv6</th>
                    <th className="py-3 text-[12px] font-black uppercase tracking-widest opacity-50">Reasons</th>
                    <th className="py-3 text-[12px] font-black uppercase tracking-widest opacity-50">Ops</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it: DdnsPlanItem) => {
                    const needUpdate = it.action === 'update' || it.need_update_ipv4 || it.need_update_ipv6;
                    const actionColor = it.action === 'failed'
                      ? 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'
                      : it.action === 'skipped'
                        ? 'bg-zinc-500/10 border-zinc-500/20 text-zinc-700 dark:text-zinc-300'
                        : needUpdate
                          ? 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400'
                          : 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400';
                    return (
                      <tr key={it.id} className="border-b border-zinc-100 dark:border-white/5 last:border-0">
                        <td className="py-3">
                          <div className="font-bold text-sm truncate">{it.name}</div>
                          <div className="mt-1 text-[14px] font-mono opacity-60 truncate">{it.fqdn}</div>
                          <div className="mt-1 text-[12px] font-bold opacity-40">{it.provider_key}</div>
                        </td>
                        <td className="py-3">
                          <Badge variant="outline" className={cn('h-7 px-2 rounded-lg font-black uppercase tracking-widest', actionColor)}>
                            {it.action}
                          </Badge>
                        </td>
                        <td className="py-3 text-[14px] font-mono opacity-70 whitespace-nowrap">
                          {it.desired_ipv4 ? `want ${it.desired_ipv4}` : '-'}
                          {it.dns_error_ipv4 ? <div className="text-[12px] text-orange-600 dark:text-orange-400">dns err</div> : null}
                        </td>
                        <td className="py-3 text-[14px] font-mono opacity-70 whitespace-nowrap">
                          {it.desired_ipv6 ? `want ${it.desired_ipv6}` : '-'}
                          {it.dns_error_ipv6 ? <div className="text-[12px] text-orange-600 dark:text-orange-400">dns err</div> : null}
                        </td>
                        <td className="py-3 text-[14px] font-bold opacity-70">
                          <div className="max-w-[520px] truncate" title={(it.reasons || []).join('; ')}>
                            {(it.reasons || []).join('; ') || '-'}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={async () => { await onInspect(it.id); }}
                              className="h-10 w-10 inline-flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition-all shadow-sm"
                              title={t('admin.domain.ddnsInspect') || 'Inspect'}
                            >
                              <Activity size={16} className="opacity-70" />
                            </button>
                            <button
                              onClick={async () => { await onCheck(it.id); }}
                              className="h-10 w-10 inline-flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition-all shadow-sm"
                              title={t('common.check') || 'Check'}
                            >
                              <Search size={16} className="opacity-70" />
                            </button>
                            <button
                              onClick={() => onOpenLogs(it.id)}
                              className="h-10 w-10 inline-flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/5 hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                              title={t('admin.domain.ddnsLogs') || 'Logs'}
                            >
                              <ScrollText size={16} className="opacity-70" />
                            </button>
                            <Button
                              size="sm"
                              onClick={async () => { await onRun(it.id); }}
                              disabled={!needUpdate}
                              className="h-10 px-4 rounded-xl"
                            >
                              <Play size={16} className="mr-2" />
                              {t('admin.domain.ddnsRunNow') || 'Run'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            className="h-12 px-6 rounded-2xl border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 font-bold"
            onClick={onClose}
          >
            {t('common.close') || 'Close'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
