import { AdminCard } from '../../admin-ui';
import { Button } from '@/components/ui/Button.tsx';
import { Network, Pencil, Server, ShieldCheck, Trash2 } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { SiteView } from '../types';

export const WebSitesTable = ({
  loading,
  sites,
  t,
  onEdit,
  onDelete,
}: {
  loading: boolean;
  sites: SiteView[];
  t: TFunction;
  onEdit: (site: SiteView) => void;
  onDelete: (site: SiteView) => void;
}) => {
  return (
    <AdminCard variant="shadcn" className="rounded-[1.5rem] overflow-hidden">
      {loading ? (
        <div className="p-10 text-center text-sm opacity-60">{t('common.loading')}</div>
      ) : sites.length === 0 ? (
        <div className="p-10 text-center text-sm opacity-60">{t('admin.web.empty')}</div>
      ) : (
        <>
          <div className="divide-y divide-border md:hidden">
            {sites.map((site) => {
              const hostnames = site.bindings.flatMap((item) => item.hostnames).slice(0, 4);
              const ports = site.bindings.map((item) => item.listen_port).join(', ');
              const routeTarget = site.route_mode === 'proxy'
                ? (site.proxy_upstream || '-')
                : (site.static_root || '-');
              const tlsTarget = site.tls_enabled
                ? (site.tls_acme_cert_id || site.tls_cert_path || '-')
                : '-';
              return (
                <article key={site.id} className="space-y-4 px-4 py-4 text-sm">
                  <div className="space-y-1">
                    <div className="font-bold break-words">{site.name}</div>
                    <div className="text-xs opacity-60 break-all">{site.id}</div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-border px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
                      {site.route_mode}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${site.enabled ? 'bg-emerald-500/15 text-emerald-600' : 'bg-zinc-500/15 text-zinc-500'}`}>
                      {site.enabled ? t('common.enabled') : t('common.disabled')}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${site.tls_enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-zinc-500/10 text-zinc-500'}`}>
                      <ShieldCheck size={14} />
                      {site.tls_enabled ? t('common.on') : t('common.off')}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-3">
                      <div className="text-xs font-black tracking-wide opacity-50">{t('admin.web.table.bindings')}</div>
                      <div className="mt-2 flex items-center gap-2 opacity-80">
                        <Network size={16} className="shrink-0" />
                        <span>{site.bindings.length} {t('admin.web.table.bindings')}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 opacity-70 break-all">
                        <Server size={16} className="shrink-0" />
                        <span>{ports || '-'}</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-3">
                      <div className="text-xs font-black tracking-wide opacity-50">
                        {site.route_mode === 'proxy' ? t('admin.web.form.proxyUpstream') : t('admin.web.form.staticRoot')}
                      </div>
                      <div className="mt-2 text-sm opacity-80 break-all">{routeTarget}</div>
                      <div className="mt-2 text-xs font-black tracking-wide opacity-50">{t('admin.web.form.tlsAcmeCert')}</div>
                      <div className="mt-1 text-sm opacity-70 break-all">{tlsTarget}</div>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-3">
                      <div className="text-xs font-black tracking-wide opacity-50">{t('admin.web.table.hostnames')}</div>
                      <div className="mt-2 text-sm opacity-80 break-words">
                        {hostnames.length > 0 ? hostnames.join(', ') : '-'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" size="sm" className="h-10" onClick={() => onEdit(site)}>
                      <Pencil size={16} className="mr-1.5" />
                      {t('common.edit')}
                    </Button>
                    <Button type="button" variant="destructive" size="sm" className="h-10" onClick={() => onDelete(site)}>
                      <Trash2 size={16} className="mr-1.5" />
                      {t('common.delete')}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <div className="min-w-[920px]">
              <div className="grid grid-cols-12 gap-2 border-b border-border px-4 py-3 text-sm font-black tracking-wider opacity-60">
                <div className="col-span-3">{t('admin.web.table.site')}</div>
                <div className="col-span-2">{t('admin.web.table.bindings')}</div>
                <div className="col-span-2">{t('admin.web.table.hostnames')}</div>
                <div className="col-span-1">{t('admin.web.table.mode')}</div>
                <div className="col-span-1">TLS</div>
                <div className="col-span-1">{t('admin.web.table.status')}</div>
                <div className="col-span-2 text-right">{t('admin.web.table.actions')}</div>
              </div>

              <div className="divide-y divide-border">
                {sites.map((site) => {
                  const routeTarget = site.route_mode === 'proxy'
                    ? (site.proxy_upstream || '-')
                    : (site.static_root || '-');
                  const tlsTarget = site.tls_enabled
                    ? (site.tls_acme_cert_id || site.tls_cert_path || '-')
                    : '-';
                  return (
                  <div key={site.id} className="grid grid-cols-12 gap-2 px-4 py-4 items-center text-sm">
                    <div className="col-span-3 min-w-0">
                      <div className="font-bold truncate">{site.name}</div>
                      <div className="text-sm opacity-60 truncate">{site.id}</div>
                      <div className="text-sm opacity-60 truncate mt-1">{routeTarget}</div>
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
                      <span className="rounded-full border border-border px-2 py-1 text-sm font-bold">{site.route_mode}</span>
                    </div>
                    <div className="col-span-1">
                      {site.tls_enabled ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-bold">
                            <ShieldCheck size={18} />
                            {t('common.on')}
                          </span>
                          <div className="text-xs opacity-60 truncate">{tlsTarget}</div>
                        </div>
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
                );})}
              </div>
            </div>
          </div>
        </>
      )}
    </AdminCard>
  );
};
