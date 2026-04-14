import { Modal } from '@/components/ui/Modal.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Switch } from '@/components/ui/Switch.tsx';
import type { TFunction } from 'i18next';
import { Network, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import type {
  DomainAssetView,
  DomainCertAssetView,
  ListenerDiagnostic,
  SiteBinding,
  SiteDraft,
} from '../types';
import { normalizeHostnames } from '../draft';

export const WebSiteModal = ({
  isOpen,
  draft,
  saving,
  testing,
  canToggleProxyTlsInsecure,
  domainAssets,
  domainCertAssets,
  listenerDiagnostics,
  draftWarnings,
  t,
  onClose,
  onSave,
  onTestConnection,
  onAddBinding,
  onRemoveBinding,
  onUpdateBinding,
  setDraft,
}: {
  isOpen: boolean;
  draft: SiteDraft;
  saving: boolean;
  testing: boolean;
  canToggleProxyTlsInsecure: boolean;
  domainAssets: DomainAssetView[];
  domainCertAssets: DomainCertAssetView[];
  listenerDiagnostics: ListenerDiagnostic[];
  draftWarnings: string[];
  t: TFunction;
  onClose: () => void;
  onSave: () => Promise<void> | void;
  onTestConnection: () => Promise<void> | void;
  onAddBinding: () => void;
  onRemoveBinding: (index: number) => void;
  onUpdateBinding: (index: number, patch: Partial<SiteBinding>) => void;
  setDraft: (next: SiteDraft) => void;
}) => {
  const bindingAddresses = draft.bindings
    .map((binding) => `${binding.listen_ip}:${binding.listen_port}`)
    .filter((item, index, items) => item.length > 0 && items.indexOf(item) === index);
  const bindingHostnames = Array.from(
    new Set(
      draft.bindings.flatMap((binding) => binding.hostnames).filter((item) => item.trim().length > 0),
    ),
  );
  const routeTarget = draft.route_mode === 'proxy' ? draft.proxy_upstream.trim() : draft.static_root.trim();
  const tlsSummary = !draft.tls_enabled
    ? t('common.off')
    : draft.tls_acme_cert_id.trim() || draft.tls_cert_path.trim() || t('common.on');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={draft.id ? t('admin.web.editSite') : t('admin.web.newSite')}
      maxWidth="max-w-5xl"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-border bg-background/60 px-4 py-3">
            <div className="text-sm font-black tracking-wider opacity-50">{t('admin.web.form.routeMode')}</div>
            <div className="mt-2 text-sm font-bold">{draft.route_mode === 'proxy' ? t('admin.web.form.proxy') : t('admin.web.form.static')}</div>
            <div className="mt-1 text-sm opacity-60 break-all">{routeTarget || '-'}</div>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 px-4 py-3">
            <div className="text-sm font-black tracking-wider opacity-50">{t('admin.web.form.bindings')}</div>
            <div className="mt-2 text-sm font-bold break-words">{bindingAddresses.join(', ') || '-'}</div>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 px-4 py-3">
            <div className="text-sm font-black tracking-wider opacity-50">{t('admin.web.form.hostnames')}</div>
            <div className="mt-2 text-sm font-bold break-words">{bindingHostnames.join(', ') || '-'}</div>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 px-4 py-3">
            <div className="text-sm font-black tracking-wider opacity-50">{t('admin.web.form.tlsAcmeCert')}</div>
            <div className="mt-2 text-sm font-bold break-all">{tlsSummary || '-'}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-bold tracking-wider opacity-70">{t('admin.web.form.siteName')}</div>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder={t('admin.web.form.siteNamePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-bold tracking-wider opacity-70">{t('admin.web.form.routeMode')}</div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={draft.route_mode === 'static' ? 'primary' : 'outline'}
                onClick={() => setDraft({ ...draft, route_mode: 'static', proxy_tls_insecure_skip_verify: false })}
                className="h-12"
              >
                {t('admin.web.form.static')}
              </Button>
              <Button
                type="button"
                variant={draft.route_mode === 'proxy' ? 'primary' : 'outline'}
                onClick={() => setDraft({ ...draft, route_mode: 'proxy' })}
                className="h-12"
              >
                {t('admin.web.form.proxy')}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold tracking-wider opacity-70">{t('admin.web.form.enabled')}</span>
              <Switch checked={draft.enabled} onChange={(v) => setDraft({ ...draft, enabled: v })} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold tracking-wider opacity-70">{t('admin.web.tls')}</span>
              <Switch checked={draft.tls_enabled} onChange={(v) => setDraft({ ...draft, tls_enabled: v })} />
            </div>
          </div>

          <div className="rounded-2xl border border-border p-4 space-y-3">
            {draft.route_mode === 'static' ? (
              <>
                <div className="text-sm font-bold tracking-wider opacity-70">{t('admin.web.form.staticRoot')}</div>
                <Input
                  value={draft.static_root}
                  onChange={(e) => setDraft({ ...draft, static_root: e.target.value })}
                  placeholder={t('admin.web.form.staticRootPlaceholder')}
                />
              </>
            ) : (
              <>
                <div className="text-sm font-bold tracking-wider opacity-70">{t('admin.web.form.proxyUpstream')}</div>
                <div className="flex gap-2">
                  <Input
                    value={draft.proxy_upstream}
                    onChange={(e) => setDraft({ ...draft, proxy_upstream: e.target.value })}
                    placeholder={t('admin.web.form.proxyUpstreamPlaceholder')}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={onTestConnection} disabled={testing}>
                    {testing ? <RefreshCw size={18} className="animate-spin" /> : <Network size={18} />}
                  </Button>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm font-bold opacity-70 break-all">
                  {draft.proxy_upstream.trim() || '-'}
                </div>
                <div className="rounded-xl border border-border p-3 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold tracking-wider opacity-70">{t('admin.web.form.proxyTlsInsecure')}</span>
                    <Switch
                      checked={draft.proxy_tls_insecure_skip_verify}
                      disabled={!canToggleProxyTlsInsecure}
                      onChange={(v) => setDraft({ ...draft, proxy_tls_insecure_skip_verify: v })}
                    />
                  </div>
                  {!canToggleProxyTlsInsecure && (
                    <p className="text-sm opacity-60 mt-2">{t('admin.web.form.proxyTlsInsecureHint')}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black tracking-wider">{t('admin.web.form.bindings')}</h3>
            <Button type="button" variant="outline" size="sm" onClick={onAddBinding}>
              <Plus size={18} className="mr-1" /> {t('admin.web.form.addBinding')}
            </Button>
          </div>

          <div className="space-y-3">
            {draft.bindings.map((binding, index) => (
              <div key={`${binding.listen_ip}:${binding.listen_port}:${binding.hostnames.join('|')}:${binding.is_default ? 'default' : 'normal'}`} className="space-y-3 rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-black tracking-wider">{t('admin.web.form.bindings')} {index + 1}</div>
                    <div className="mt-1 text-sm opacity-60 break-words">
                      {`${binding.listen_ip}:${binding.listen_port}`} {binding.hostnames.length > 0 ? `| ${binding.hostnames.join(', ')}` : ''}
                    </div>
                  </div>
                  <Button type="button" variant="destructive" size="sm" onClick={() => onRemoveBinding(index)}>
                    <Trash2 size={18} />
                  </Button>
                </div>
                <div className="grid grid-cols-12 gap-2">
                <div className="col-span-12 md:col-span-3 space-y-1">
                  <div className="text-sm font-bold tracking-wider opacity-60">{t('admin.web.form.ip')}</div>
                  <Input
                    value={binding.listen_ip}
                    onChange={(e) => onUpdateBinding(index, { listen_ip: e.target.value })}
                    placeholder={t('admin.web.form.ipPlaceholder')}
                  />
                </div>
                <div className="col-span-12 md:col-span-2 space-y-1">
                  <div className="text-sm font-bold tracking-wider opacity-60">{t('admin.web.form.port')}</div>
                  <Input
                    value={String(binding.listen_port)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      onUpdateBinding(index, { listen_port: Number.isFinite(v) ? v : 0 });
                    }}
                    placeholder={t('admin.web.form.portPlaceholder')}
                  />
                </div>
                <div className="col-span-12 md:col-span-5 space-y-1">
                  <div className="text-sm font-bold tracking-wider opacity-60">{t('admin.web.form.hostnames')}</div>
                  <Input
                    value={binding.hostnames.join(', ')}
                    onChange={(e) => onUpdateBinding(index, { hostnames: normalizeHostnames(e.target.value) })}
                    placeholder={t('admin.web.form.hostnamesPlaceholder')}
                    list="web-domain-asset-suggestions"
                  />
                  <p className="text-sm opacity-60">{t('admin.web.form.hostnameSuggestionHint')}</p>
                </div>
                <div className="col-span-8 md:col-span-1 space-y-1">
                  <div className="text-sm font-bold tracking-wider opacity-60">{t('admin.web.form.default')}</div>
                  <div className="h-12 flex items-center">
                    <Switch checked={binding.is_default} onChange={(v) => onUpdateBinding(index, { is_default: v })} />
                  </div>
                </div>
                </div>
              </div>
            ))}
          </div>

          {domainAssets.length > 0 && (
            <datalist id="web-domain-asset-suggestions">
              {domainAssets.map((item) => (
                <option key={item.fqdn} value={item.fqdn} />
              ))}
            </datalist>
          )}
        </div>

        <div className="rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black tracking-wider">{t('admin.web.diagnostics.title')}</h3>
            <span className="text-sm font-bold opacity-60">
              {t('admin.web.diagnostics.listenerCount', { count: listenerDiagnostics.length })}
            </span>
          </div>
          <p className="text-sm opacity-70">{t('admin.web.diagnostics.desc')}</p>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {listenerDiagnostics.map((diag) => (
              <div
                key={diag.listenerKey}
                className={`rounded-xl border p-3 ${
                  diag.errors.length > 0
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : 'border-emerald-500/30 bg-emerald-500/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-black">{diag.listenerKey}</span>
                  <span
                    className={`text-sm font-bold ${diag.errors.length > 0 ? 'text-amber-700' : 'text-emerald-700'}`}
                  >
                    {diag.errors.length > 0
                      ? t('admin.web.diagnostics.conflict')
                      : t('admin.web.diagnostics.clean')}
                  </span>
                </div>
                <div className="mt-2 text-sm opacity-80">
                  <div>
                    {t('admin.web.diagnostics.current')}:{' '}
                    {diag.currentBindings.map((item) => item.hostnames.join('|')).join(' ; ')}
                  </div>
                  {diag.remoteBindings.length > 0 && (
                    <div className="mt-1">
                      {t('admin.web.diagnostics.remote')}:{' '}
                      {diag.remoteBindings
                        .map((item) => `${item.site}[${item.binding.hostnames.join('|')}]`)
                        .join(' ; ')}
                    </div>
                  )}
                </div>
                {diag.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {diag.errors.map((msg) => (
                      <p key={msg} className="text-sm text-amber-800">
                        {msg}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {draftWarnings.length > 0 && (
          <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3">
            <p className="text-sm font-black tracking-wider text-amber-700">{t('admin.web.warnings.title')}</p>
            <div className="mt-2 space-y-1">
              {draftWarnings.map((item) => (
                <p key={item} className="text-sm text-amber-800">
                  {item}
                </p>
              ))}
            </div>
          </div>
        )}

        {draft.tls_enabled && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-bold tracking-wider opacity-70">{t('admin.web.form.tlsAcmeCert')}</div>
              <select
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
                value={draft.tls_acme_cert_id}
                onChange={(e) => setDraft({ ...draft, tls_acme_cert_id: e.target.value })}
              >
                <option value="">{t('admin.web.form.tlsAcmeCertNone')}</option>
                {domainCertAssets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {`${item.name} (${item.id})`}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-bold tracking-wider opacity-70">{t('admin.web.form.tlsCertPath')}</div>
                <Input
                  value={draft.tls_cert_path}
                  onChange={(e) => setDraft({ ...draft, tls_cert_path: e.target.value })}
                  placeholder={t('admin.web.form.tlsCertPathPlaceholder')}
                  disabled={Boolean(draft.tls_acme_cert_id.trim())}
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-bold tracking-wider opacity-70">{t('admin.web.form.tlsKeyPath')}</div>
                <Input
                  value={draft.tls_key_path}
                  onChange={(e) => setDraft({ ...draft, tls_key_path: e.target.value })}
                  placeholder={t('admin.web.form.tlsKeyPathPlaceholder')}
                  disabled={Boolean(draft.tls_acme_cert_id.trim())}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            {saving ? <RefreshCw size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
            {t('common.save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
