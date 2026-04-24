import { useTranslation } from 'react-i18next';
import { GlassModalShell } from '@fileuni/ts-shared/modal-shell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { CertPreflightResult } from '../types';
import { glassSectionCardBase } from '../presentation';

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

  if (!isOpen) return null;

  return (
    <GlassModalShell
      title={t('common.check') || 'Check'}
      onClose={onClose}
      closeLabel={t('common.close') || 'Close'}
      maxWidthClassName="max-w-3xl"
      panelClassName="dark text-white"
    >
      {!result ? (
        <div className="py-16 text-center opacity-40 font-bold tracking-widest">
          {t('common.noData') || 'No data'}
        </div>
      ) : (
        <div className={glassSectionCardBase}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-black tracking-widest opacity-60">CERT</div>
              <div className="mt-1 text-base font-black truncate">{result.name}</div>
            </div>
            <div className="shrink-0">
              <Badge
                variant="outline"
                className={cn(
                  'h-8 px-3 rounded-xl font-black tracking-widest',
                  result.overall_status === 'fail'
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : result.overall_status === 'warn'
                      ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                      : 'bg-green-500/10 border-green-500/20 text-green-400',
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
                      : 'border-white/10 bg-white/[0.03]',
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[12px] font-black tracking-widest opacity-60">{it.key}</div>
                    <div className="mt-1 text-[14px] font-bold opacity-80">{it.message}</div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'h-7 px-2 rounded-lg font-black tracking-widest',
                      it.status === 'fail'
                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                        : it.status === 'warn'
                          ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                          : 'bg-green-500/10 border-green-500/20 text-green-400',
                    )}
                  >
                    {it.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              className="h-12 rounded-2xl border-white/10 bg-white/[0.03] px-6 font-bold hover:bg-white/10"
              onClick={onClose}
            >
              {t('common.close') || 'Close'}
            </Button>

            {viewEnabled && result.overall_status !== 'fail' && (
              <Button
                className="h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/90 px-6 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
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
    </GlassModalShell>
  );
};
