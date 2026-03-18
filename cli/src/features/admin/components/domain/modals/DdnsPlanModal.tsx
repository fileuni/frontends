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
  const [onlyNeedUpdate, setOnlyNeedUpdate] = useState(true);
  const [runAllRunning, setRunAllRunning] = useState(false);

  const items = useMemo(() => {
    const list = data?.items || [];
    if (!onlyNeedUpdate) return list;
    return list.filter((it) => it.action === 'update' || it.need_update_ipv4 || it.need_update_ipv6);
  }, [data, onlyNeedUpdate]);

  const runAllNeeded = async () => {
    if (!data || runAllRunning) return;
    setRunAllRunning(true);
    try {
      const targets = (data.items || []).filter(
        (it) => it.action === 'update' || it.need_update_ipv4 || it.need_update_ipv6,
      );
      for (const it of targets) {
        // run sequentially to avoid provider burst
        // eslint-disable-next-line no-await-in-loop
        await onRun(it.id);
      }
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
              <Button
                variant="outline"
                onClick={() => setOnlyNeedUpdate((v) => !v)}
                className="h-11 px-5 rounded-2xl border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 font-bold"
              >
                {onlyNeedUpdate ? (t('admin.domain.showAll') || 'Show All') : (t('admin.domain.onlyNeedUpdate') || 'Only Need Update')}
              </Button>
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
