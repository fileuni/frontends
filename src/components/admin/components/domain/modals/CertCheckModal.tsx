import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import type { CertPreflightResult } from '../types';
import { sectionCardBase } from '../presentation';

export const CertCheckModal = ({
  isOpen,
  result,
  onClose,
  viewEnabled,
  onRunNow,
}: {
  isOpen: boolean;
  result: CertPreflightResult | null;
  onClose: () => void;
  viewEnabled: boolean;
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
          <div className="py-16 text-center opacity-40 font-bold uppercase tracking-widest">
            {t('common.noData') || 'No data'}
          </div>
        ) : (
          <div className={sectionCardBase}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-black uppercase tracking-widest opacity-60">
                  CERT
                </div>
                <div className="mt-1 text-base font-black truncate">{result.name}</div>
              </div>
              <div className="shrink-0">
                <Badge
                  variant="outline"
                  className={cn(
                    'h-8 px-3 rounded-xl font-black uppercase tracking-widest',
                    result.overall_status === 'fail'
                      ? 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'
                      : result.overall_status === 'warn'
                        ? 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400'
                        : 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400',
                  )}
                >
                  {result.overall_status}
                </Badge>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {(result.items || []).map((it) => (
                <div
                  key={`${it.key}-${it.status}-${it.message}`}
                  className={cn(
                    'rounded-2xl border p-4',
                    it.status === 'fail'
                      ? 'border-red-500/20 bg-red-500/5'
                      : it.status === 'warn'
                        ? 'border-orange-500/20 bg-orange-500/5'
                        : 'border-zinc-200 dark:border-white/5 bg-white/60 dark:bg-white/[0.03]',
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[12px] font-black uppercase tracking-widest opacity-60">
                        {it.key}
                      </div>
                      <div className="mt-1 text-[14px] font-bold opacity-80">
                        {it.message}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'h-7 px-2 rounded-lg font-black uppercase tracking-widest',
                        it.status === 'fail'
                          ? 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'
                          : it.status === 'warn'
                            ? 'bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400'
                            : 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400',
                      )}
                    >
                      {it.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                variant="outline"
                className="h-12 px-6 rounded-2xl border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 font-bold"
                onClick={onClose}
              >
                {t('common.close') || 'Close'}
              </Button>

              {viewEnabled && result.overall_status !== 'fail' && (
                <Button
                  className="h-12 px-6 rounded-2xl bg-gradient-to-br from-primary to-primary/90 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 ml-3"
                  onClick={async () => {
                    const certId = result.cert_id;
                    onClose();
                    await onRunNow(certId);
                  }}
                >
                  {t('admin.domain.certRunNow') || 'Run now'}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
