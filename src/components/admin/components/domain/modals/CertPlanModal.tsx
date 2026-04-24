import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassModalShell } from '@fileuni/ts-shared/modal-shell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { Activity, Play, ScrollText } from 'lucide-react';
import type { CertPlanItem, CertPlanResponse } from '../types';
import {
  glassControlBase,
  glassSectionCardBase,
  glassSelectBase,
  selectStyle,
} from '../presentation';

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
        await onRun(it.id);
      }
    } finally {
      setRunningBatch(false);
    }
  };

  if (!isOpen) return null;

  return (
    <GlassModalShell
      title={t('admin.domain.sslPlan') || 'Plan'}
      onClose={onClose}
      closeLabel={t('common.close') || 'Close'}
      maxWidthClassName="max-w-5xl"
      panelClassName="dark text-white"
      footer={(
        <div className="flex justify-end">
          <Button
            variant="outline"
            className="h-12 rounded-2xl border-white/10 bg-white/[0.03] px-6 font-bold hover:bg-white/10"
            onClick={onClose}
          >
            {t('common.close') || 'Close'}
          </Button>
        </div>
      )}
    >
      <div className="space-y-6">
        <div className={glassSectionCardBase}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-black tracking-widest opacity-60">
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
                className={glassSelectBase}
                style={selectStyle}
                value={filter}
                onChange={(e) => setFilter(e.target.value === 'all' ? 'all' : 'needed')}
              >
                <option value="needed">{t('admin.domain.onlyNeedRenew') || 'Only Need Renew'}</option>
                <option value="all">{t('admin.domain.showAll') || 'Show All'}</option>
              </select>

              <input
                className={cn(glassControlBase, 'w-[220px]')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('admin.domain.searchPlan') || 'Search name/fqdn/provider'}
              />

              <Button
                variant="outline"
                onClick={onRefresh}
                disabled={loading}
                className="h-11 rounded-2xl border-white/10 bg-white/[0.03] px-5 font-bold hover:bg-white/10"
              >
                <Activity size={16} className={cn('mr-2', loading && 'animate-spin')} />
                {t('common.refresh') || 'Refresh'}
              </Button>

              <Button
                onClick={runNeeded}
                disabled={loading || runningBatch || !data || (data.need_renew || 0) === 0}
                className="h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/90 px-6 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
              >
                <Play size={16} className={cn('mr-2', runningBatch && 'animate-pulse')} />
                {runningBatch ? (t('admin.domain.running') || 'Running...') : (t('admin.domain.runNeeded') || 'Run Needed')}
              </Button>
            </div>
          </div>
        </div>

        <div className={glassSectionCardBase}>
          {!data ? (
            <div className="py-16 text-center font-bold tracking-widest opacity-40">
              {loading ? (t('common.loading') || 'Loading') : (t('common.noData') || 'No data')}
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center font-bold tracking-widest opacity-40">
              {t('admin.domain.noPlanItems') || 'No items'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-3 text-[12px] font-black tracking-widest opacity-50">CERT</th>
                    <th className="py-3 text-[12px] font-black tracking-widest opacity-50">Action</th>
                    <th className="py-3 text-[12px] font-black tracking-widest opacity-50">Due</th>
                    <th className="py-3 text-[12px] font-black tracking-widest opacity-50">Reason</th>
                    <th className="py-3 text-[12px] font-black tracking-widest opacity-50">Ops</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it: CertPlanItem) => {
                    const isNeed = it.action === 'renew';
                    return (
                      <tr key={it.id} className="border-b border-white/10 last:border-0">
                        <td className="py-3">
                          <div className="truncate text-sm font-bold">{it.name}</div>
                          <div className="mt-1 text-[12px] font-bold opacity-40">{it.ca_provider} / {it.challenge_type}</div>
                          {it.expires_at && (
                            <div className="mt-1 text-[12px] font-bold opacity-50">exp: {new Date(it.expires_at).toLocaleDateString()}</div>
                          )}
                        </td>
                        <td className="py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              'h-7 rounded-lg px-2 font-black tracking-widest',
                              isNeed
                                ? 'border-orange-500/20 bg-orange-500/10 text-orange-400'
                                : 'border-green-500/20 bg-green-500/10 text-green-400',
                            )}
                          >
                            {it.action}
                          </Badge>
                        </td>
                        <td className="py-3 whitespace-nowrap text-[14px] font-bold opacity-70">
                          {it.due_at ? new Date(it.due_at).toLocaleString() : '-'}
                        </td>
                        <td className="py-3 text-[14px] font-bold opacity-70">
                          <div className="max-w-[520px] truncate" title={it.reason}>
                            {it.reason}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenLogs(it.id)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] transition-all hover:bg-blue-500 hover:text-white"
                              title={t('admin.domain.certLogs') || 'Logs'}
                            >
                              <ScrollText size={16} className="opacity-70" />
                            </button>
                            <Button
                              size="sm"
                              onClick={async () => { await onRun(it.id); }}
                              disabled={!isNeed}
                              className="h-10 rounded-xl px-4"
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
      </div>
    </GlassModalShell>
  );
};
