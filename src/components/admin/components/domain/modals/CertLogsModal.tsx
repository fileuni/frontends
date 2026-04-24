import { useTranslation } from 'react-i18next';
import { GlassModalShell } from '@fileuni/ts-shared/modal-shell';
import { RefreshCw } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import type { CertificateItem, CertRunLogItem } from '../types';
import { glassSectionCardBase, StatusBadge } from '../presentation';

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

  if (!isOpen) return null;

  return (
    <GlassModalShell
      title={t('admin.domain.certLogs') || 'Certificate Logs'}
      onClose={onClose}
      closeLabel={t('common.close') || 'Close'}
      maxWidthClassName="max-w-4xl"
      panelClassName="dark text-white"
    >
      {!cert ? (
        <div className="py-16 text-center opacity-40 font-bold tracking-widest">
          {t('common.noData') || 'No data'}
        </div>
      ) : (
        <div className={glassSectionCardBase}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-black tracking-widest opacity-70 truncate">{cert.name}</div>
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
            <div className="shrink-0 text-[14px] font-black tracking-widest opacity-50">{total}</div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 text-[12px] font-black tracking-widest opacity-50">
                    {t('common.time') || 'Time'}
                  </th>
                  <th className="py-3 text-[12px] font-black tracking-widest opacity-50">
                    {t('admin.acme.table.status') || 'Status'}
                  </th>
                  <th className="py-3 text-[12px] font-black tracking-widest opacity-50">
                    {t('admin.domain.certExpiresAt') || 'Expires'}
                  </th>
                  <th className="py-3 text-[12px] font-black tracking-widest opacity-50">
                    {t('common.message') || 'Message'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center opacity-50 font-bold tracking-widest">
                      <RefreshCw className="animate-spin mb-3 mx-auto" size={22} />
                      {t('common.loading')}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center opacity-40 font-bold tracking-widest">
                      {t('common.noData') || 'No data'}
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id} className="border-b border-white/10 last:border-0">
                      <td className="py-3 text-[14px] font-bold opacity-70 whitespace-nowrap">
                        {new Date(row.run_at).toLocaleString()}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="py-3 text-[14px] font-mono opacity-70 whitespace-nowrap">
                        {row.expires_at ? new Date(row.expires_at).toLocaleDateString() : '-'}
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
    </GlassModalShell>
  );
};
