import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { Activity, Play, ScrollText } from 'lucide-react';
import type { CertPlanItem, CertPlanResponse } from '../types';
import { sectionCardBase } from '../presentation';

export const CertPlanModal = ({
  isOpen,
  loading,
  data,
  onClose,
  onRefresh,
  onRun,
  onOpenLogs,
}: {
  isOpen: boolean;
  loading: boolean;
  data: CertPlanResponse | null;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onRun: (id: string) => Promise<void>;
  onOpenLogs: (id: string) => void;
}) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'needed' | 'all'>('needed');
  const [query, setQuery] = useState('');
  const [runningBatch, setRunningBatch] = useState(false);

  const items = useMemo(() => {
    const list = data?.items || [];
    const q = query.trim().toLowerCase();
    return list
      .filter((it) => (filter === 'all' ? true : it.action === 'renew'))
      .filter((it) => {
        if (!q) return true;
        return `${it.name} ${it.ca_provider} ${it.challenge_type}`.toLowerCase().includes(q);
      });
  }, [data, filter, query]);

  const runNeeded = async () => {
    if (!data || runningBatch) return;
    setRunningBatch(true);
    try {
      const targets = (data.items || []).filter((it) => it.action === 'renew');
      for (const it of targets) {
        // eslint-disable-next-line no-await-in-loop
        await onRun(it.id);
      }
    } finally {
      setRunningBatch(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('admin.domain.sslPlan') || 'Plan'} maxWidth="max-w-5xl">
      <div className="space-y-6 p-1 text-foreground">
        <div className={sectionCardBase}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-black uppercase tracking-widest opacity-60">
                {t('admin.domain.sslPlanDesc') || 'Preview planned renewals and why.'}
              </div>
              {data && (
                <div className="mt-2 text-[14px] font-bold opacity-70">
                  total={data.total} need_renew={data.need_renew} skipped={data.skipped}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <select
                className="h-11 rounded-2xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm font-bold"
                value={filter}
                onChange={(e) => setFilter(e.target.value === 'all' ? 'all' : 'needed')}
              >
                <option value="needed">{t('admin.domain.onlyNeedRenew') || 'Only Need Renew'}</option>
                <option value="all">{t('admin.domain.showAll') || 'Show All'}</option>
              </select>

              <input
                className="h-11 w-[220px] rounded-2xl border border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm font-bold outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('admin.domain.searchPlan') || 'Search name/fqdn/provider'}
              />

              <Button
                variant="outline"
                onClick={onRefresh}
                disabled={loading}
                className="h-11 px-5 rounded-2xl border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 font-bold"
              >
                <Activity size={16} className={cn('mr-2', loading && 'animate-spin')} />
                {t('common.refresh') || 'Refresh'}
              </Button>

              <Button
                onClick={runNeeded}
                disabled={loading || runningBatch || !data || (data.need_renew || 0) === 0}
                className="h-11 px-6 rounded-2xl bg-gradient-to-br from-primary to-primary/90 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
              >
                <Play size={16} className={cn('mr-2', runningBatch && 'animate-pulse')} />
                {runningBatch ? (t('admin.domain.running') || 'Running...') : (t('admin.domain.runNeeded') || 'Run Needed')}
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
                    <th className="py-3 text-[12px] font-black uppercase tracking-widest opacity-50">CERT</th>
                    <th className="py-3 text-[12px] font-black uppercase tracking-widest opacity-50">Action</th>
                    <th className="py-3 text-[12px] font-black uppercase tracking-widest opacity-50">Due</th>
                    <th className="py-3 text-[12px] font-black uppercase tracking-widest opacity-50">Reason</th>
                    <th className="py-3 text-[12px] font-black uppercase tracking-widest opacity-50">Ops</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it: CertPlanItem) => {
                    const isNeed = it.action === 'renew';
                    return (
                      <tr key={it.id} className="border-b border-zinc-100 dark:border-white/5 last:border-0">
                        <td className="py-3">
                          <div className="font-bold text-sm truncate">{it.name}</div>
                          <div className="mt-1 text-[12px] font-bold opacity-40">{it.ca_provider} / {it.challenge_type}</div>
                          {it.expires_at && (
                            <div className="mt-1 text-[12px] font-bold opacity-50">exp: {new Date(it.expires_at).toLocaleDateString()}</div>
                          )}
                        </td>
                        <td className="py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              'h-7 px-2 rounded-lg font-black uppercase tracking-widest',
                              isNeed
                                ? 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400'
                                : 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400',
                            )}
                          >
                            {it.action}
                          </Badge>
                        </td>
                        <td className="py-3 text-[14px] font-bold opacity-70 whitespace-nowrap">
                          {it.due_at ? new Date(it.due_at).toLocaleString() : '-'}
                        </td>
                        <td className="py-3 text-[14px] font-bold opacity-70">
                          <div className="max-w-[520px] truncate" title={it.reason}>
                            {it.reason}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => onOpenLogs(it.id)}
                              className="h-10 w-10 inline-flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/5 hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                              title={t('admin.domain.certLogs') || 'Logs'}
                            >
                              <ScrollText size={16} className="opacity-70" />
                            </button>
                            <Button
                              size="sm"
                              onClick={async () => { await onRun(it.id); }}
                              disabled={!isNeed}
                              className="h-10 px-4 rounded-xl"
                            >
                              <Play size={16} className="mr-2" />
                              {t('admin.domain.certRunNow') || 'Run'}
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
