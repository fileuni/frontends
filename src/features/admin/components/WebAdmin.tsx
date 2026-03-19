import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button.tsx';
import { client, extractData, handleApiError } from '@/lib/api.ts';
import { useToastStore } from '@/shared';
import { Globe, Plus, RefreshCw } from 'lucide-react';
import { AdminHero, AdminPage } from './admin-ui';
import {
  defaultBinding,
  defaultDraft,
  hasHostOverlap,
  listenerKey,
  toDraft,
  toPayload,
  WebSiteModal,
  WebSitesTable,
  WebStatsGrid,
  type DomainAssetView,
  type DomainCertAssetView,
  type ListenerDiagnostic,
  type SiteBinding,
  type SiteDraft,
  type SiteView,
} from './web';

export const WebAdmin: React.FC = () => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();

  const [sites, setSites] = useState<SiteView[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [domainCertAssets, setDomainCertAssets] = useState<DomainCertAssetView[]>([]);
  const [domainAssets, setDomainAssets] = useState<DomainAssetView[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draft, setDraft] = useState<SiteDraft>(defaultDraft());
  const canToggleProxyTlsInsecure = draft.route_mode === 'proxy' && draft.proxy_upstream.trim().startsWith('https://');

  useEffect(() => {
    if (!canToggleProxyTlsInsecure && draft.proxy_tls_insecure_skip_verify) {
      setDraft((prev) => ({ ...prev, proxy_tls_insecure_skip_verify: false }));
    }
  }, [canToggleProxyTlsInsecure, draft.proxy_tls_insecure_skip_verify]);

  const draftWarnings = useMemo(() => {
    const warnings: string[] = [];
    const defaultCounter = new Map<string, number>();
    const hostnameCounter = new Set<string>();

    for (const binding of draft.bindings) {
      const groupKey = listenerKey(binding, draft.tls_enabled);
      if (binding.is_default) {
        const count = defaultCounter.get(groupKey) || 0;
        defaultCounter.set(groupKey, count + 1);
      }

      for (const host of binding.hostnames) {
        const hostKey = `${groupKey}:${host}`;
        if (hostnameCounter.has(hostKey)) {
          warnings.push(t('admin.web.warnings.duplicateHostInSite', { key: `${binding.listen_ip}:${binding.listen_port}`, host }));
        } else {
          hostnameCounter.add(hostKey);
        }
      }
    }

    for (const [key, count] of defaultCounter.entries()) {
      if (count > 1) {
        warnings.push(t('admin.web.warnings.multiDefaultInListener', { key }));
      }
    }

    const others = sites.filter((item) => item.id !== draft.id && item.enabled && item.tls_enabled === draft.tls_enabled);
    for (const current of draft.bindings) {
      for (const otherSite of others) {
        for (const otherBinding of otherSite.bindings) {
          if (current.listen_ip !== otherBinding.listen_ip || current.listen_port !== otherBinding.listen_port) {
            continue;
          }
          if (current.is_default && otherBinding.is_default) {
            warnings.push(t('admin.web.warnings.defaultConflict', { site: otherSite.name, key: `${current.listen_ip}:${current.listen_port}` }));
          }
          if (hasHostOverlap(current.hostnames, otherBinding.hostnames)) {
            warnings.push(t('admin.web.warnings.hostnameConflict', { site: otherSite.name, key: `${current.listen_ip}:${current.listen_port}` }));
          }
        }
      }
    }

    return Array.from(new Set(warnings));
  }, [draft, sites, t]);

  const listenerDiagnostics = useMemo<ListenerDiagnostic[]>(() => {
    const groups = new Map<string, ListenerDiagnostic>();
    const others = sites.filter((item) => item.id !== draft.id && item.enabled && item.tls_enabled === draft.tls_enabled);

    const getGroup = (key: string): ListenerDiagnostic => {
      const existing = groups.get(key);
      if (existing) {
        return existing;
      }
      const created: ListenerDiagnostic = {
        listenerKey: key,
        currentBindings: [],
        remoteBindings: [],
        errors: [],
      };
      groups.set(key, created);
      return created;
    };

    for (const binding of draft.bindings) {
      const key = listenerKey(binding, draft.tls_enabled);
      const group = getGroup(key);
      group.currentBindings.push(binding);
    }

    for (const otherSite of others) {
      for (const otherBinding of otherSite.bindings) {
        const key = listenerKey(otherBinding, draft.tls_enabled);
        const group = getGroup(key);
        group.remoteBindings.push({ site: otherSite.name, binding: otherBinding });
      }
    }

    for (const group of groups.values()) {
      const defaultCount = group.currentBindings.filter((item) => item.is_default).length;
      if (defaultCount > 1) {
        group.errors.push(t('admin.web.warnings.multiDefaultInListener', { key: group.listenerKey }));
      }

      const hostnameSeen = new Set<string>();
      for (const current of group.currentBindings) {
        for (const host of current.hostnames) {
          const hostKey = host.toLowerCase();
          if (hostnameSeen.has(hostKey)) {
            group.errors.push(t('admin.web.warnings.duplicateHostInSite', { key: group.listenerKey, host }));
          } else {
            hostnameSeen.add(hostKey);
          }
        }
      }

      for (const current of group.currentBindings) {
        for (const remote of group.remoteBindings) {
          if (current.is_default && remote.binding.is_default) {
            group.errors.push(t('admin.web.warnings.defaultConflict', { site: remote.site, key: group.listenerKey }));
          }
          if (hasHostOverlap(current.hostnames, remote.binding.hostnames)) {
            group.errors.push(t('admin.web.warnings.hostnameConflict', { site: remote.site, key: group.listenerKey }));
          }
        }
      }

      group.errors = Array.from(new Set(group.errors));
    }

    return Array.from(groups.values()).sort((a, b) => {
      const aScore = a.errors.length;
      const bScore = b.errors.length;
      if (aScore !== bScore) {
        return bScore - aScore;
      }
      return a.listenerKey.localeCompare(b.listenerKey);
    });
  }, [draft, sites, t]);

  const totals = useMemo(() => {
    const enabled = sites.filter((s) => s.enabled).length;
    const tls = sites.filter((s) => s.tls_enabled).length;
    const proxy = sites.filter((s) => s.route_mode === 'proxy').length;
    return {
      all: sites.length,
      enabled,
      tls,
      proxy,
    };
  }, [sites]);

  const loadSites = async () => {
    try {
      const data = await extractData<SiteView[]>(client.GET('/api/v1/admin/web/sites'));
      setSites(Array.isArray(data) ? data : []);
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const loadDomainCertAssets = async () => {
    try {
      const data = await extractData<DomainCertAssetView[]>(client.GET('/api/v1/admin/domain-acme-ddns/assets/certs'));
      setDomainCertAssets(Array.isArray(data) ? data : []);
    } catch {
      setDomainCertAssets([]);
    }
  };

  const loadDomainAssets = async () => {
    try {
      const data = await extractData<DomainAssetView[]>(client.GET('/api/v1/admin/domain-acme-ddns/assets/domains'));
      setDomainAssets(Array.isArray(data) ? data : []);
    } catch {
      setDomainAssets([]);
    }
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      await loadSites();
      await loadDomainCertAssets();
      await loadDomainAssets();
      setLoading(false);
    };
    run();
  }, []);

  const openCreateModal = () => {
    setDraft(defaultDraft());
    setIsModalOpen(true);
  };

  const openEditModal = (site: SiteView) => {
    setDraft(toDraft(site));
    setIsModalOpen(true);
  };

  const validateDraft = (current: SiteDraft): string | null => {
    if (!current.name.trim()) {
      return t('admin.web.validation.nameRequired');
    }

    if (current.bindings.length === 0) {
      return t('admin.web.validation.bindingsRequired');
    }

    for (const binding of current.bindings) {
      if (!binding.listen_ip.trim()) {
        return t('admin.web.validation.listenIpsRequired');
      }
      if (!Number.isInteger(binding.listen_port) || binding.listen_port <= 0 || binding.listen_port > 65535) {
        return t('admin.web.validation.listenPortsRequired');
      }
      if (binding.hostnames.length === 0) {
        return t('admin.web.validation.hostnamesRequired');
      }
    }

    if (current.tls_enabled && !current.tls_acme_cert_id.trim() && (!current.tls_cert_path.trim() || !current.tls_key_path.trim())) {
      return t('admin.web.validation.tlsFilesRequired');
    }
    if (current.route_mode === 'static' && !current.static_root.trim()) {
      return t('admin.web.validation.staticRootRequired');
    }
    if (current.route_mode === 'proxy' && !current.proxy_upstream.trim()) {
      return t('admin.web.validation.proxyUpstreamRequired');
    }
    return null;
  };

  const saveSite = async () => {
    const err = validateDraft(draft);
    if (err) {
      addToast(err, 'error');
      return;
    }

    if (draftWarnings.length > 0) {
      const ok = window.confirm(`${t('admin.web.warnings.confirmSave')}\n\n${draftWarnings.map((item) => `- ${item}`).join('\n')}`);
      if (!ok) {
        return;
      }
    }

    setSaving(true);
    try {
      const payload = toPayload(draft);
      if (draft.id) {
        await extractData<SiteView>(
          client.PUT('/api/v1/admin/web/sites/{id}', {
            params: { path: { id: draft.id } },
            body: payload,
          }),
        );
      } else {
        await extractData<SiteView>(
          client.POST('/api/v1/admin/web/sites', {
            body: payload,
          }),
        );
      }

      await loadSites();
      setIsModalOpen(false);
      addToast(t('admin.web.saveSuccess'), 'success');
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteSite = async (site: SiteView) => {
    const ok = window.confirm(t('admin.web.deleteConfirm', { name: site.name }));
    if (!ok) {
      return;
    }

    try {
      await extractData<boolean>(
        client.DELETE('/api/v1/admin/web/sites/{id}', {
          params: { path: { id: site.id } },
        }),
      );
      await loadSites();
      addToast(t('admin.web.deleteSuccess'), 'success');
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const reloadRuntime = async () => {
    try {
      await extractData<{ success: boolean }>(client.POST('/api/v1/admin/web/reload'));
      addToast(t('admin.web.reloadSuccess'), 'success');
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const testConnection = async () => {
    const upstream = draft.proxy_upstream.trim();
    if (!upstream) {
      addToast(t('admin.web.validation.proxyUpstreamRequired'), 'error');
      return;
    }

    setTesting(true);
    try {
      const result = await extractData<{ success: boolean; message: string }>(
        client.POST('/api/v1/admin/web/test-upstream', {
          body: { upstream },
        }),
      );
      if (result.success) {
        addToast(result.message, 'success');
      } else {
        addToast(result.message, 'error');
      }
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setTesting(false);
    }
  };

  const updateBinding = (index: number, patch: Partial<SiteBinding>) => {
    setDraft((prev) => {
      const nextBindings = [...prev.bindings];
      const current = { ...nextBindings[index], ...patch };
      nextBindings[index] = current;
      if (patch.is_default === true) {
        const targetKey = listenerKey(current, prev.tls_enabled);
        for (let i = 0; i < nextBindings.length; i += 1) {
          if (i === index) {
            continue;
          }
          const otherKey = listenerKey(nextBindings[i], prev.tls_enabled);
          if (otherKey === targetKey) {
            nextBindings[i] = { ...nextBindings[i], is_default: false };
          }
        }
      }
      return { ...prev, bindings: nextBindings };
    });
  };

  const removeBinding = (index: number) => {
    setDraft((prev) => {
      const nextBindings = prev.bindings.filter((_, i) => i !== index);
      return { ...prev, bindings: nextBindings.length > 0 ? nextBindings : [defaultBinding()] };
    });
  };

  const addBinding = () => {
    setDraft((prev) => ({ ...prev, bindings: [...prev.bindings, defaultBinding()] }));
  };

  return (
    <AdminPage className="space-y-6">
      <AdminHero
        icon={<Globe size={24} />}
        iconClassName="bg-cyan-500/20 text-cyan-600"
        title={t('admin.web.title')}
        subtitle={t('admin.web.subtitle')}
        className="bg-gradient-to-r from-cyan-500/10 via-sky-500/5 to-transparent"
        actions={
          <>
            <Button type="button" variant="outline" onClick={reloadRuntime}>
              <RefreshCw size={16} className="mr-2" />
              {t('admin.web.reload')}
            </Button>
            <Button type="button" onClick={openCreateModal}>
              <Plus size={16} className="mr-2" />
              {t('admin.web.newSite')}
            </Button>
          </>
        }
      />

      <WebStatsGrid
        items={[
          {
            label: t('admin.web.stats.total'),
            value: totals.all,
          },
          {
            label: t('admin.web.stats.enabled'),
            value: totals.enabled,
            valueClassName: 'text-emerald-600',
          },
          {
            label: t('admin.web.stats.tls'),
            value: totals.tls,
            valueClassName: 'text-sky-600',
          },
          {
            label: t('admin.web.stats.proxy'),
            value: totals.proxy,
            valueClassName: 'text-sky-600',
          },
        ]}
      />

      <WebSitesTable loading={loading} sites={sites} t={t} onEdit={openEditModal} onDelete={deleteSite} />

      <WebSiteModal
        isOpen={isModalOpen}
        draft={draft}
        saving={saving}
        testing={testing}
        canToggleProxyTlsInsecure={canToggleProxyTlsInsecure}
        domainAssets={domainAssets}
        domainCertAssets={domainCertAssets}
        listenerDiagnostics={listenerDiagnostics}
        draftWarnings={draftWarnings}
        t={t}
        onClose={() => setIsModalOpen(false)}
        onSave={saveSite}
        onTestConnection={testConnection}
        onAddBinding={addBinding}
        onRemoveBinding={removeBinding}
        onUpdateBinding={updateBinding}
        setDraft={setDraft}
      />
    </AdminPage>
  );
};

export default WebAdmin;
