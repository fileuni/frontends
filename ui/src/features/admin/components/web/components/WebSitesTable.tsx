import { AdminCard } from '../../admin-ui';
import { Button } from '@/components/ui/Button.tsx';
import { Network, Pencil, Server, ShieldCheck, Trash2 } from 'lucide-react';
import type { SiteView } from '../types';

type TFunc = (key: string, options?: Record<string, unknown>) => string;

export const WebSitesTable = ({
  loading,
  sites,
  t,
  onEdit,
  onDelete,
}: {
  loading: boolean;
  sites: SiteView[];
  t: TFunc;
  onEdit: (site: SiteView) => void;
  onDelete: (site: SiteView) => void;
}) => {
  return (
    <AdminCard variant="shadcn" className="rounded-[1.5rem] overflow-hidden">
      <div className="grid grid-cols-12 gap-2 px-4 py-3 text-sm font-black uppercase tracking-wider opacity-60 border-b border-border">
        <div className="col-span-3">{t('admin.web.table.site')}</div>
        <div className="col-span-2">{t('admin.web.table.bindings')}</div>
        <div className="col-span-2">{t('admin.web.table.hostnames')}</div>
        <div className="col-span-1">{t('admin.web.table.mode')}</div>
        <div className="col-span-1">TLS</div>
        <div className="col-span-1">{t('admin.web.table.status')}</div>
        <div className="col-span-2 text-right">{t('admin.web.table.actions')}</div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-sm opacity-60">{t('common.loading')}</div>
      ) : sites.length === 0 ? (
        <div className="p-10 text-center text-sm opacity-60">{t('admin.web.empty')}</div>
      ) : (
        <div className="divide-y divide-border">
          {sites.map((site) => (
            <div key={site.id} className="grid grid-cols-12 gap-2 px-4 py-4 items-center text-sm">
              <div className="col-span-3 min-w-0">
                <div className="font-bold truncate">{site.name}</div>
                <div className="text-sm opacity-60 truncate">{site.id}</div>
              </div>
              <div className="col-span-2">
                <div className="flex items-center gap-1 text-sm opacity-70">
                  <Network size={18} /> {site.bindings.length} {t('admin.web.table.bindings')}
                </div>
                <div className="flex items-center gap-1 text-sm opacity-70">
                  <Server size={18} /> {site.bindings.map((item) => item.listen_port).join(', ')}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-sm opacity-80 truncate">
                  {site.bindings.flatMap((item) => item.hostnames).slice(0, 4).join(', ')}
                </div>
              </div>
              <div className="col-span-1">
                <span className="rounded-full border border-border px-2 py-1 text-sm font-bold uppercase">{site.route_mode}</span>
              </div>
              <div className="col-span-1">
                {site.tls_enabled ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-bold">
                    <ShieldCheck size={18} />
                    {t('common.on')}
                  </span>
                ) : (
                  <span className="text-sm opacity-50">{t('common.off')}</span>
                )}
              </div>
              <div className="col-span-1">
                <span
                  className={`rounded-full px-2 py-1 text-sm font-bold ${site.enabled ? 'bg-emerald-500/15 text-emerald-600' : 'bg-zinc-500/15 text-zinc-500'}`}
                >
                  {site.enabled ? t('common.enabled') : t('common.disabled')}
                </span>
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onEdit(site)}>
                  <Pencil size={18} className="mr-1" />
                  {t('common.edit')}
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(site)}>
                  <Trash2 size={18} className="mr-1" />
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminCard>
  );
};
