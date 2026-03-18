import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Edit3, Play, ScrollText, Search, Trash2 } from 'lucide-react';
import type {
  CertificateItem,
  DdnsEntryItem,
  RowActionsTarget,
} from '../types';
import { sectionCardBase } from '../presentation';

export const RowActionsModal = ({
  target,
  viewEnabled,
  runningDdnsAll,
  runningDdnsById,
  runningSslAll,
  runningSslById,
  ddnsCheckLoading,
  certCheckLoading,
  onClose,
  onRunDdns,
  onCheckDdns,
  onRunSsl,
  onCheckSsl,
  onOpenDdnsLogs,
  onOpenCertLogs,
  onEditDdns,
  onEditSsl,
  onDeleteDdns,
  onDeleteSsl,
}: {
  target: RowActionsTarget | null;
  viewEnabled: boolean;
  runningDdnsAll: boolean;
  runningDdnsById: Record<string, boolean>;
  runningSslAll: boolean;
  runningSslById: Record<string, boolean>;
  ddnsCheckLoading: boolean;
  certCheckLoading: boolean;
  onClose: () => void;
  onRunDdns: (id: string) => Promise<void>;
  onCheckDdns: (id: string) => Promise<void>;
  onRunSsl: (id: string) => Promise<void>;
  onCheckSsl: (id: string) => Promise<void>;
  onOpenDdnsLogs: (entry: DdnsEntryItem) => void;
  onOpenCertLogs: (cert: CertificateItem) => void;
  onEditDdns: (entry: DdnsEntryItem) => void;
  onEditSsl: (cert: CertificateItem) => void;
  onDeleteDdns: (id: string) => Promise<void>;
  onDeleteSsl: (id: string) => Promise<void>;
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={!!target}
      onClose={onClose}
      title={t('common.actions') || 'Actions'}
      maxWidth="max-w-md"
    >
      <div className="space-y-5 p-1 text-foreground">
        {target && (
          <div className={cn(sectionCardBase, 'p-5')}>
            <div className="text-sm font-black uppercase tracking-widest opacity-60">
              {target.kind === 'ddns' ? 'DDNS' : 'SSL/TLS'}
            </div>
            <div className="mt-1 text-base font-black truncate">
              {target.item.name}
            </div>
            {target.kind === 'ddns' && (
              <div className="mt-1 text-[14px] font-mono opacity-60 truncate">
                {target.item.fqdn}
              </div>
            )}

            <div className="mt-5 grid grid-cols-1 gap-2">
              {viewEnabled && target.kind === 'ddns' && (
                <Button
                  variant="outline"
                  className="h-12 justify-start rounded-2xl border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 font-bold"
                  onClick={async () => {
                    const id = target.item.id;
                    onClose();
                    await onRunDdns(id);
                  }}
                  disabled={runningDdnsAll || !!runningDdnsById[target.item.id]}
                >
                  <Play size={16} className="mr-2" />
                  {t('admin.domain.ddnsRunNow') || 'Run now'}
                </Button>
              )}

              {target.kind === 'ddns' && (
                <Button
                  variant="outline"
                  className="h-12 justify-start rounded-2xl border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 font-bold"
                  onClick={async () => {
                    const id = target.item.id;
                    onClose();
                    await onCheckDdns(id);
                  }}
                  disabled={ddnsCheckLoading}
                >
                  <Search size={16} className="mr-2" />
                  {t('common.check') || 'Check'}
                </Button>
              )}

              {viewEnabled && target.kind === 'ssl' && (
                <Button
                  variant="outline"
                  className="h-12 justify-start rounded-2xl border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 font-bold"
                  onClick={async () => {
                    const id = target.item.id;
                    onClose();
                    await onRunSsl(id);
                  }}
                  disabled={runningSslAll || !!runningSslById[target.item.id]}
                >
                  <Play size={16} className="mr-2" />
                  {t('admin.domain.certRunNow') || 'Run now'}
                </Button>
              )}

              {target.kind === 'ssl' && (
                <Button
                  variant="outline"
                  className="h-12 justify-start rounded-2xl border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 font-bold"
                  onClick={async () => {
                    const id = target.item.id;
                    onClose();
                    await onCheckSsl(id);
                  }}
                  disabled={certCheckLoading}
                >
                  <Search size={16} className="mr-2" />
                  {t('common.check') || 'Check'}
                </Button>
              )}

              <Button
                variant="outline"
                className="h-12 justify-start rounded-2xl border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 font-bold"
                onClick={() => {
                  const current = target;
                  onClose();
                  if (current.kind === 'ddns') onOpenDdnsLogs(current.item);
                  else onOpenCertLogs(current.item);
                }}
              >
                <ScrollText size={16} className="mr-2" />
                {target.kind === 'ddns'
                  ? t('admin.domain.ddnsLogs') || 'Logs'
                  : t('admin.domain.certLogs') || 'Logs'}
              </Button>

              {viewEnabled && (
                <Button
                  variant="outline"
                  className="h-12 justify-start rounded-2xl border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 font-bold"
                  onClick={() => {
                    const current = target;
                    onClose();
                    if (current.kind === 'ddns') onEditDdns(current.item);
                    else onEditSsl(current.item);
                  }}
                >
                  <Edit3 size={16} className="mr-2" />
                  {t('common.edit') || 'Edit'}
                </Button>
              )}

              {viewEnabled && (
                <Button
                  variant="outline"
                  className="h-12 justify-start rounded-2xl border-red-500/30 text-red-600 dark:text-red-400 bg-white dark:bg-white/5 font-bold hover:bg-red-500 hover:text-white"
                  onClick={async () => {
                    const current = target;
                    onClose();
                    if (current.kind === 'ddns') await onDeleteDdns(current.item.id);
                    else await onDeleteSsl(current.item.id);
                  }}
                >
                  <Trash2 size={16} className="mr-2" />
                  {t('common.delete') || 'Delete'}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
