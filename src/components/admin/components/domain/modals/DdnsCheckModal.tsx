import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { Play } from 'lucide-react';
import type { DdnsCheckResult } from '../types';
import { sectionCardBase } from '../presentation';

export const DdnsCheckModal = ({
  isOpen,
  result,
  onClose,
  onRunNow,
}: {
  isOpen: boolean;
  result: DdnsCheckResult | null;
  onClose: () => void;
  onRunNow: (id: string) => Promise<void>;
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('common.check') || 'Check'}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6 p-1 text-foreground">
        {!result ? (
          <div className="py-16 text-center opacity-40 font-bold tracking-widest">
            {t('common.noData') || 'No data'}
          </div>
        ) : (
          <div className={sectionCardBase}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-black tracking-widest opacity-60">
                  FQDN
                </div>
                <div className="mt-1 font-mono text-sm truncate">{result.fqdn}</div>
                <div className="mt-2 text-[14px] opacity-60">
                  {result.dns_used_server
                    ? `DoH: ${result.dns_used_server}`
                    : (t('admin.domain.enableSchedulerHint') || 'DoH not available')}
                </div>
              </div>
              <div className="shrink-0">
                <Badge
                  variant="outline"
                  className={cn(
                    'h-8 px-3 rounded-xl font-black tracking-widest',
                    result.need_update_ipv4 || result.need_update_ipv6
                      ? 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400'
                      : 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400',
                  )}
                >
                  {result.need_update_ipv4 || result.need_update_ipv6 ? 'UPDATE' : 'OK'}
                </Badge>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/5">
                <div className="text-[12px] font-black tracking-widest opacity-50">
                  IPv4
                </div>
                <div className="mt-2 text-[14px] font-mono opacity-80">
                  desired: {result.desired_ipv4 || '-'}
                </div>
                <div className="mt-2 text-[14px] font-mono opacity-60">
                  dns: {result.dns_ipv4?.length ? result.dns_ipv4.join(', ') : '-'}
                </div>
                {result.dns_error_ipv4 && (
                  <div className="mt-2 text-[14px] font-bold text-orange-600 dark:text-orange-400">
                    {result.dns_error_ipv4}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2 text-[14px] font-bold">
                  <Badge
                    variant="outline"
                    className={cn(
                      'h-7 px-2 rounded-lg',
                      result.need_update_ipv4
                        ? 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400'
                        : 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400',
                    )}
                  >
                    {result.need_update_ipv4 ? 'UPDATE' : 'OK'}
                  </Badge>
                  {result.ip_changed_ipv4 && <span className="opacity-60">ip changed</span>}
                  {result.dns_mismatch_ipv4 && (
                    <span className="opacity-60">dns mismatch</span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/5">
                <div className="text-[12px] font-black tracking-widest opacity-50">
                  IPv6
                </div>
                <div className="mt-2 text-[14px] font-mono opacity-80">
                  desired: {result.desired_ipv6 || '-'}
                </div>
                <div className="mt-2 text-[14px] font-mono opacity-60">
                  dns: {result.dns_ipv6?.length ? result.dns_ipv6.join(', ') : '-'}
                </div>
                {result.dns_error_ipv6 && (
                  <div className="mt-2 text-[14px] font-bold text-orange-600 dark:text-orange-400">
                    {result.dns_error_ipv6}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2 text-[14px] font-bold">
                  <Badge
                    variant="outline"
                    className={cn(
                      'h-7 px-2 rounded-lg',
                      result.need_update_ipv6
                        ? 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400'
                        : 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400',
                    )}
                  >
                    {result.need_update_ipv6 ? 'UPDATE' : 'OK'}
                  </Badge>
                  {result.ip_changed_ipv6 && <span className="opacity-60">ip changed</span>}
                  {result.dns_mismatch_ipv6 && (
                    <span className="opacity-60">dns mismatch</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                className="h-12 px-6 rounded-2xl border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 font-bold"
                onClick={onClose}
              >
                {t('common.close') || 'Close'}
              </Button>
              {(result.need_update_ipv4 || result.need_update_ipv6) && (
                <Button
                  className="h-12 px-6 rounded-2xl bg-gradient-to-br from-primary to-primary/90 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
                  onClick={async () => {
                    const id = result.id;
                    onClose();
                    await onRunNow(id);
                  }}
                >
                  <Play size={16} className="mr-2" />
                  {t('admin.domain.ddnsRunNow') || 'Run now'}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
