import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { Pagination } from '@/shared';
import { Modal } from '@/components/ui/Modal';
import type { CertificateItem, CertRunLogItem } from '../types';
import { sectionCardBase, StatusBadge } from '../presentation';

export const CertLogsModal = ({
  isOpen,
  cert,
  loading,
  items,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onClose,
}: {
  isOpen: boolean;
  cert: CertificateItem | null;
  loading: boolean;
  items: CertRunLogItem[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onClose: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('admin.domain.certLogs') || 'Certificate Logs'}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6 p-1 text-foreground">
        {!cert ? (
          <div className="py-16 text-center opacity-40 font-bold uppercase tracking-widest">
            {t('common.noData') || 'No data'}
          </div>
        ) : (
          <div className={sectionCardBase}>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-black uppercase tracking-widest opacity-70 truncate">
                  {cert.name}
                </div>
                <div className="mt-1 text-[14px] font-mono opacity-60 truncate">
                  {(() => {
                    try {
                      const arr = JSON.parse(cert.domains_json) as unknown;
                      return Array.isArray(arr) ? arr.join(', ') : cert.domains_json;
                    } catch {
                      return cert.domains_json;
                    }
                  })()}
                </div>
              </div>
              <div className="shrink-0 text-[14px] font-black uppercase tracking-widest opacity-50">
                {total}
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-white/5">
                    <th className="py-3 text-[12px] font-black uppercase tracking-widest opacity-50">
                      {t('common.time') || 'Time'}
                    </th>
                    <th className="py-3 text-[12px] font-black uppercase tracking-widest opacity-50">
                      {t('admin.acme.table.status') || 'Status'}
                    </th>
                    <th className="py-3 text-[12px] font-black uppercase tracking-widest opacity-50">
                      {t('admin.domain.certExpiresAt') || 'Expires'}
                    </th>
                    <th className="py-3 text-[12px] font-black uppercase tracking-widest opacity-50">
                      {t('common.message') || 'Message'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-10 text-center opacity-50 font-bold uppercase tracking-widest"
                      >
                        <RefreshCw className="animate-spin mb-3 mx-auto" size={22} />
                        {t('common.loading')}
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-10 text-center opacity-40 font-bold uppercase tracking-widest"
                      >
                        {t('common.noData') || 'No data'}
                      </td>
                    </tr>
                  ) : (
                    items.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-zinc-100 dark:border-white/5 last:border-0"
                      >
                        <td className="py-3 text-[14px] font-bold opacity-70 whitespace-nowrap">
                          {new Date(row.run_at).toLocaleString()}
                        </td>
                        <td className="py-3">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="py-3 text-[14px] font-mono opacity-70 whitespace-nowrap">
                          {row.expires_at
                            ? new Date(row.expires_at).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="py-3 text-[14px] font-bold opacity-70">
                          <div className="truncate" title={row.message}>
                            {row.message}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              current={page}
              total={total}
              pageSize={pageSize}
              onPageChange={onPageChange}
              onPageSizeChange={(size) => {
                onPageSizeChange(size);
                onPageChange(1);
              }}
              className="bg-transparent"
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
