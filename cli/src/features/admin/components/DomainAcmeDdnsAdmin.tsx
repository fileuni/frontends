import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { client, extractData, handleApiError } from '@/lib/api';
import { useToastStore } from '@fileuni/shared';

type DomainPanel = 'provider' | 'ddns' | 'acme' | 'web';

interface ProviderProfileItem {
  key: string;
  name: string;
  supports_acme_dns01: boolean;
  supports_ddns: boolean;
}

interface ProviderAccountItem {
  id: string;
  name: string;
  provider_key: string;
  config_json?: string;
  has_credential?: boolean;
  enabled: boolean;
}

interface DdnsEntryItem {
  id: string;
  name: string;
  provider_account_id: string;
  zone: string;
  host: string;
  fqdn: string;
  ttl: number;
  proxied: boolean;
  ipv4_enabled: boolean;
  ipv6_enabled: boolean;
  ipv4_source_json: string;
  ipv6_source_json: string;
  webhook_json: string;
  force_update: boolean;
  enabled: boolean;
  last_status?: string | null;
}

interface CertificateItem {
  id: string;
  name: string;
  enabled: boolean;
  auto_renew: boolean;
  ca_provider: string;
  challenge_type: string;
  domains_json: string;
  provider_account_id?: string | null;
  dns_config_json: string;
  account_email: string;
  export_path?: string | null;
  expires_at?: string | null;
  last_status?: string | null;
}

interface CertRunAllCheckResponse {
  renew_before_days: number;
  force_update: boolean;
  results: Array<{ id: string; status: string }>;
}

interface DownloadCertResponse {
  cert_pem?: string | null;
  fullchain_pem?: string | null;
  has_private_key?: boolean;
}

interface DomainAssetItem {
  fqdn: string;
  status?: string | null;
}

interface CertificateAssetItem {
  id: string;
  name: string;
  domains_json: string;
  expires_at?: string | null;
  status?: string | null;
}

const normalizeStatus = (value?: string | null): 'idle' | 'running' | 'success' | 'failed' => {
  const input = (value || '').toLowerCase().trim();
  if (input.includes('run') || input.includes('processing')) {
    return 'running';
  }
  if (input.includes('fail') || input.includes('error')) {
    return 'failed';
  }
  if (input.includes('success') || input.includes('ok')) {
    return 'success';
  }
  return 'idle';
};

export const DomainAcmeDdnsAdmin: React.FC = () => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const [panel, setPanel] = useState<DomainPanel>('provider');
  const [loading, setLoading] = useState(false);
  const [providerProfiles, setProviderProfiles] = useState<ProviderProfileItem[]>([]);
  const [providers, setProviders] = useState<ProviderAccountItem[]>([]);
  const [ddnsEntries, setDdnsEntries] = useState<DdnsEntryItem[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [domainAssets, setDomainAssets] = useState<DomainAssetItem[]>([]);
  const [certAssets, setCertAssets] = useState<CertificateAssetItem[]>([]);
  const [newProvider, setNewProvider] = useState({
    name: '',
    provider_key: 'cloudflare',
    credential_json_enc: '{}',
    config_json: '{}',
    enabled: true,
  });
  const [newDdns, setNewDdns] = useState({
    name: '',
    provider_account_id: '',
    zone: '',
    host: '@',
    fqdn: '',
    ttl: 120,
    proxied: false,
    enabled: true,
  });
  const [newCert, setNewCert] = useState({
    name: '',
    provider_account_id: '',
    domains_json: '["example.com"]',
    account_email: 'admin@example.com',
    export_path: '',
    enabled: true,
    auto_renew: true,
  });
  const [runningCertCheck, setRunningCertCheck] = useState(false);
  const [runningDdnsAll, setRunningDdnsAll] = useState(false);
  const [editingProvider, setEditingProvider] = useState<{
    id: string;
    name: string;
    provider_key: string;
    credential_json_enc: string;
    config_json: string;
    enabled: boolean;
  } | null>(null);
  const [editingDdns, setEditingDdns] = useState<DdnsEntryItem | null>(null);
  const [editingCert, setEditingCert] = useState<CertificateItem | null>(null);

  const title = useMemo(() => {
    if (panel === 'provider') {
      return 'Provider Accounts';
    }
    if (panel === 'acme') {
      return t('admin.acme.title');
    }
    if (panel === 'web') {
      return 'Web Reuse';
    }
    return t('admin.ddns.title');
  }, [panel, t]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [profileData, providerData, ddnsData, certData, domainAssetData, certAssetData] = await Promise.all([
        extractData<ProviderProfileItem[]>(client.GET('/api/v1/admin/domain-acme-ddns/providers/profiles')),
        extractData<ProviderAccountItem[]>(client.GET('/api/v1/admin/domain-acme-ddns/providers/accounts')),
        extractData<DdnsEntryItem[]>(client.GET('/api/v1/admin/domain-acme-ddns/ddns/entries')),
        extractData<CertificateItem[]>(client.GET('/api/v1/admin/domain-acme-ddns/certs')),
        extractData<DomainAssetItem[]>(client.GET('/api/v1/admin/domain-acme-ddns/assets/domains')),
        extractData<CertificateAssetItem[]>(client.GET('/api/v1/admin/domain-acme-ddns/assets/certs')),
      ]);
      setProviderProfiles(Array.isArray(profileData) ? profileData : []);
      setProviders(Array.isArray(providerData) ? providerData : []);
      setDdnsEntries(Array.isArray(ddnsData) ? ddnsData : []);
      setCertificates(Array.isArray(certData) ? certData : []);
      setDomainAssets(Array.isArray(domainAssetData) ? domainAssetData : []);
      setCertAssets(Array.isArray(certAssetData) ? certAssetData : []);
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setLoading(false);
    }
  };

  const createProvider = async () => {
    if (!newProvider.name.trim()) {
      addToast('Provider account name is required', 'error');
      return;
    }
    try {
      await extractData(
        client.POST('/api/v1/admin/domain-acme-ddns/providers/accounts', {
          body: {
            name: newProvider.name.trim(),
            provider_key: newProvider.provider_key.trim(),
            credential_json_enc: newProvider.credential_json_enc,
            config_json: newProvider.config_json,
            enabled: newProvider.enabled,
          },
        }),
      );
      setNewProvider((prev) => ({ ...prev, name: '' }));
      await loadAll();
      addToast('Provider account created', 'success');
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const createDdnsEntry = async () => {
    if (!newDdns.name.trim() || !newDdns.provider_account_id.trim() || !newDdns.fqdn.trim()) {
      addToast('DDNS name, provider account and fqdn are required', 'error');
      return;
    }
    try {
      await extractData(
        client.POST('/api/v1/admin/domain-acme-ddns/ddns/entries', {
          body: {
            name: newDdns.name.trim(),
            enabled: newDdns.enabled,
            provider_account_id: newDdns.provider_account_id,
            zone: newDdns.zone.trim() || newDdns.fqdn.split('.').slice(1).join('.'),
            host: newDdns.host.trim() || '@',
            fqdn: newDdns.fqdn.trim(),
            ttl: newDdns.ttl,
            proxied: newDdns.proxied,
            ipv4_enabled: true,
            ipv6_enabled: false,
            ipv4_source_json: '{}',
            ipv6_source_json: '{}',
            webhook_json: '{}',
            force_update: false,
          },
        }),
      );
      setNewDdns((prev) => ({ ...prev, name: '', fqdn: '' }));
      await loadAll();
      addToast('DDNS entry created', 'success');
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const createCertificate = async () => {
    if (!newCert.name.trim() || !newCert.account_email.trim()) {
      addToast('Certificate name and email are required', 'error');
      return;
    }
    try {
      await extractData(
        client.POST('/api/v1/admin/domain-acme-ddns/certs', {
          body: {
            name: newCert.name.trim(),
            enabled: newCert.enabled,
            auto_renew: newCert.auto_renew,
            ca_provider: 'letsencrypt',
            challenge_type: 'dns01',
            domains_json: newCert.domains_json,
            provider_account_id: newCert.provider_account_id.trim() || null,
            dns_config_json: '{}',
            account_email: newCert.account_email.trim(),
            export_path: newCert.export_path.trim() || null,
          },
        }),
      );
      setNewCert((prev) => ({ ...prev, name: '' }));
      await loadAll();
      addToast('Certificate created', 'success');
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const runCertCheck = async (force_update: boolean) => {
    setRunningCertCheck(true);
    try {
      const data = await extractData<CertRunAllCheckResponse>(
        client.POST('/api/v1/admin/domain-acme-ddns/certs/run-all-check', {
          body: { force_update },
        }),
      );

      const renewed = data.results.length;
      if (force_update) {
        addToast(`Force renewal check completed. renewed=${renewed}`, 'success');
      } else {
        addToast(`Renewal check completed. threshold=${data.renew_before_days}d renewed=${renewed}`, 'success');
      }
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setRunningCertCheck(false);
    }
  };

  const deleteProviderAccount = async (id: string) => {
    try {
      await extractData(
        client.DELETE('/api/v1/admin/domain-acme-ddns/providers/accounts/{id}', {
          params: { path: { id } },
        }),
      );
      addToast('Provider account deleted', 'success');
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const beginEditProvider = (item: ProviderAccountItem) => {
    setEditingProvider({
      id: item.id,
      name: item.name,
      provider_key: item.provider_key,
      credential_json_enc: '',
      config_json: item.config_json || '{}',
      enabled: item.enabled,
    });
  };

  const saveProviderEdit = async () => {
    if (!editingProvider) return;
    try {
      await extractData(
        client.PUT('/api/v1/admin/domain-acme-ddns/providers/accounts/{id}', {
          params: { path: { id: editingProvider.id } },
          body: {
            name: editingProvider.name,
            provider_key: editingProvider.provider_key,
            credential_json_enc: editingProvider.credential_json_enc,
            config_json: editingProvider.config_json,
            enabled: editingProvider.enabled,
          },
        }),
      );
      addToast('Provider account updated', 'success');
      setEditingProvider(null);
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const runDdnsEntryNow = async (id: string) => {
    try {
      await extractData(
        client.POST('/api/v1/admin/domain-acme-ddns/ddns/entries/{id}/run', {
          params: { path: { id } },
        }),
      );
      addToast('DDNS run completed', 'success');
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const runAllDdnsNow = async () => {
    setRunningDdnsAll(true);
    try {
      await extractData(client.POST('/api/v1/admin/domain-acme-ddns/ddns/run-all'));
      addToast('DDNS run-all completed', 'success');
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setRunningDdnsAll(false);
    }
  };

  const deleteDdnsEntry = async (id: string) => {
    try {
      await extractData(
        client.DELETE('/api/v1/admin/domain-acme-ddns/ddns/entries/{id}', {
          params: { path: { id } },
        }),
      );
      addToast('DDNS entry deleted', 'success');
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const saveDdnsEdit = async () => {
    if (!editingDdns) return;
    try {
      await extractData(
        client.PUT('/api/v1/admin/domain-acme-ddns/ddns/entries/{id}', {
          params: { path: { id: editingDdns.id } },
          body: {
            name: editingDdns.name,
            enabled: editingDdns.enabled,
            provider_account_id: editingDdns.provider_account_id,
            zone: editingDdns.zone,
            host: editingDdns.host,
            fqdn: editingDdns.fqdn,
            ttl: editingDdns.ttl,
            proxied: editingDdns.proxied,
            ipv4_enabled: editingDdns.ipv4_enabled,
            ipv6_enabled: editingDdns.ipv6_enabled,
            ipv4_source_json: editingDdns.ipv4_source_json,
            ipv6_source_json: editingDdns.ipv6_source_json,
            webhook_json: editingDdns.webhook_json,
            force_update: editingDdns.force_update,
          },
        }),
      );
      addToast('DDNS entry updated', 'success');
      setEditingDdns(null);
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const runCertNow = async (id: string) => {
    try {
      await extractData(
        client.POST('/api/v1/admin/domain-acme-ddns/certs/{id}/run', {
          params: { path: { id } },
        }),
      );
      addToast('Certificate run completed', 'success');
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const deleteCert = async (id: string) => {
    try {
      await extractData(
        client.DELETE('/api/v1/admin/domain-acme-ddns/certs/{id}', {
          params: { path: { id } },
        }),
      );
      addToast('Certificate deleted', 'success');
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const saveCertEdit = async () => {
    if (!editingCert) return;
    try {
      await extractData(
        client.PUT('/api/v1/admin/domain-acme-ddns/certs/{id}', {
          params: { path: { id: editingCert.id } },
          body: {
            name: editingCert.name,
            enabled: editingCert.enabled,
            auto_renew: editingCert.auto_renew,
            ca_provider: editingCert.ca_provider,
            challenge_type: editingCert.challenge_type,
            domains_json: editingCert.domains_json,
            provider_account_id: editingCert.provider_account_id || null,
            dns_config_json: editingCert.dns_config_json,
            account_email: editingCert.account_email,
            export_path: editingCert.export_path || null,
          },
        }),
      );
      addToast('Certificate updated', 'success');
      setEditingCert(null);
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const downloadCert = async (id: string) => {
    try {
      const data = await extractData<DownloadCertResponse>(
        client.GET('/api/v1/admin/domain-acme-ddns/certs/{id}/download', {
          params: { path: { id } },
        }),
      );
      const content = [data.fullchain_pem || '', data.cert_pem || ''].filter(Boolean).join('\n');
      if (!content.trim()) {
        addToast('No certificate content available', 'error');
        return;
      }
      const blob = new Blob([content], { type: 'application/x-pem-file;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${id}.pem`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast(`Certificate downloaded${data.has_private_key ? ' (private key stored on server)' : ''}`, 'success');
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const exportCert = async (id: string) => {
    try {
      await extractData(
        client.POST('/api/v1/admin/domain-acme-ddns/certs/{id}/export', {
          params: { path: { id } },
        }),
      );
      addToast('Certificate exported to server path', 'success');
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  React.useEffect(() => {
    loadAll();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card/40 p-3">
        <div className="text-sm font-semibold opacity-80">Domain Automation</div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={panel === 'provider' ? 'default' : 'outline'}
            onClick={() => setPanel('provider')}
          >
            Provider Accounts
          </Button>
          <Button
            type="button"
            size="sm"
            variant={panel === 'ddns' ? 'default' : 'outline'}
            onClick={() => setPanel('ddns')}
          >
            {t('admin.ddns.title')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={panel === 'acme' ? 'default' : 'outline'}
            onClick={() => setPanel('acme')}
          >
            {t('admin.acme.title')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={panel === 'web' ? 'default' : 'outline'}
            onClick={() => setPanel('web')}
          >
            Web Reuse
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider opacity-60">{title}</div>
        <Button size="sm" variant="outline" onClick={loadAll} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/30 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5 text-sm">
          <div>
            <div className="opacity-60">Provider Profiles</div>
            <div className="text-2xl font-black">{providerProfiles.length}</div>
          </div>
          <div>
            <div className="opacity-60">Provider Accounts</div>
            <div className="text-2xl font-black">{providers.length}</div>
          </div>
          <div>
            <div className="opacity-60">DDNS Entries</div>
            <div className="text-2xl font-black">{ddnsEntries.length}</div>
          </div>
          <div>
            <div className="opacity-60">Certificates</div>
            <div className="text-2xl font-black">{certificates.length}</div>
          </div>
          <div>
            <div className="opacity-60">Web Domain Assets</div>
            <div className="text-2xl font-black">{domainAssets.length}</div>
          </div>
        </div>
      </div>

      {panel === 'provider' ? (
        <div className="rounded-xl border border-border/50 bg-card/30 p-4">
          <div className="mb-3 text-sm font-bold uppercase tracking-wider opacity-70">Provider Accounts</div>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-2">
            <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="account name" value={newProvider.name} onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })} />
            <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={newProvider.provider_key} onChange={(e) => setNewProvider({ ...newProvider, provider_key: e.target.value })}>
              {providerProfiles.map((item) => (
                <option key={item.key} value={item.key}>{item.name}</option>
              ))}
            </select>
            <textarea className="min-h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder='credential json (will be encrypted at rest)' value={newProvider.credential_json_enc} onChange={(e) => setNewProvider({ ...newProvider, credential_json_enc: e.target.value })} />
            <textarea className="min-h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder='config json' value={newProvider.config_json} onChange={(e) => setNewProvider({ ...newProvider, config_json: e.target.value })} />
            <Button size="sm" onClick={createProvider}>Create</Button>
          </div>
          {editingProvider && (
            <div className="mb-4 rounded-lg border border-border/60 p-3 space-y-2">
              <div className="text-xs uppercase opacity-70">Edit provider account</div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={editingProvider.name} onChange={(e) => setEditingProvider({ ...editingProvider, name: e.target.value })} />
                <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={editingProvider.provider_key} onChange={(e) => setEditingProvider({ ...editingProvider, provider_key: e.target.value })}>
                  {providerProfiles.map((item) => (
                    <option key={item.key} value={item.key}>{item.name}</option>
                  ))}
                </select>
                <textarea className="min-h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder='credential json (blank = keep existing encrypted value)' value={editingProvider.credential_json_enc} onChange={(e) => setEditingProvider({ ...editingProvider, credential_json_enc: e.target.value })} />
                <textarea className="min-h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm" value={editingProvider.config_json} onChange={(e) => setEditingProvider({ ...editingProvider, config_json: e.target.value })} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveProviderEdit}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingProvider(null)}>Cancel</Button>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2 text-sm">
            {providers.length === 0 ? (
              <div className="opacity-60">No provider accounts</div>
            ) : (
              providers.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    <div className="opacity-60">{item.provider_key}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs uppercase opacity-70">{item.enabled ? 'enabled' : 'disabled'}</div>
                    <Button size="sm" variant="outline" onClick={() => beginEditProvider(item)}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => deleteProviderAccount(item.id)}>Delete</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : panel === 'ddns' ? (
        <div className="rounded-xl border border-border/50 bg-card/30 p-4">
          <div className="mb-3 text-sm font-bold uppercase tracking-wider opacity-70">DDNS</div>
          <div className="mb-3">
            <Button size="sm" variant="outline" disabled={runningDdnsAll} onClick={runAllDdnsNow}>
              {runningDdnsAll ? 'Running...' : 'Run All Now'}
            </Button>
          </div>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-6 gap-2">
            <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="entry name" value={newDdns.name} onChange={(e) => setNewDdns({ ...newDdns, name: e.target.value })} />
            <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={newDdns.provider_account_id} onChange={(e) => setNewDdns({ ...newDdns, provider_account_id: e.target.value })}>
              <option value="">provider account</option>
              {providers.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="fqdn" value={newDdns.fqdn} onChange={(e) => setNewDdns({ ...newDdns, fqdn: e.target.value })} />
            <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="zone" value={newDdns.zone} onChange={(e) => setNewDdns({ ...newDdns, zone: e.target.value })} />
            <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="host" value={newDdns.host} onChange={(e) => setNewDdns({ ...newDdns, host: e.target.value })} />
            <Button size="sm" onClick={createDdnsEntry}>Create</Button>
          </div>
          {editingDdns && (
            <div className="mb-4 rounded-lg border border-border/60 p-3 space-y-2">
              <div className="text-xs uppercase opacity-70">Edit DDNS entry</div>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={editingDdns.name} onChange={(e) => setEditingDdns({ ...editingDdns, name: e.target.value })} />
                <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={editingDdns.fqdn} onChange={(e) => setEditingDdns({ ...editingDdns, fqdn: e.target.value })} />
                <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={editingDdns.zone} onChange={(e) => setEditingDdns({ ...editingDdns, zone: e.target.value })} />
                <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={editingDdns.host} onChange={(e) => setEditingDdns({ ...editingDdns, host: e.target.value })} />
                <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" type="number" value={editingDdns.ttl} onChange={(e) => setEditingDdns({ ...editingDdns, ttl: Number(e.target.value) || 120 })} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveDdnsEdit}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingDdns(null)}>Cancel</Button>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2 text-sm">
            {ddnsEntries.length === 0 ? (
              <div className="opacity-60">No DDNS entries</div>
            ) : (
              ddnsEntries.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    <div className="opacity-60">{item.fqdn}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs uppercase opacity-70">{normalizeStatus(item.last_status)}</div>
                    <Button size="sm" variant="outline" onClick={() => runDdnsEntryNow(item.id)}>Run</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingDdns(item)}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => deleteDdnsEntry(item.id)}>Delete</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : panel === 'acme' ? (
        <div className="rounded-xl border border-border/50 bg-card/30 p-4">
          <div className="mb-3 text-sm font-bold uppercase tracking-wider opacity-70">Certificates</div>
          <div className="mb-3 rounded-lg border border-border/50 bg-background/40 p-3 text-xs opacity-80">
            Auto renewal rule: scheduler check (default daily) and manual check both renew certificates whose
            remaining days are less than configured threshold. Force update ignores remaining days.
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={runningCertCheck}
              onClick={() => runCertCheck(false)}
            >
              {runningCertCheck ? 'Running...' : 'Run Renewal Check'}
            </Button>
            <Button
              size="sm"
              disabled={runningCertCheck}
              onClick={() => runCertCheck(true)}
            >
              {runningCertCheck ? 'Running...' : 'Force Renew All'}
            </Button>
          </div>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-6 gap-2">
            <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="certificate name" value={newCert.name} onChange={(e) => setNewCert({ ...newCert, name: e.target.value })} />
            <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={newCert.provider_account_id} onChange={(e) => setNewCert({ ...newCert, provider_account_id: e.target.value })}>
              <option value="">provider account</option>
              {providers.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder='domains json, e.g. ["example.com"]' value={newCert.domains_json} onChange={(e) => setNewCert({ ...newCert, domains_json: e.target.value })} />
            <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="account email" value={newCert.account_email} onChange={(e) => setNewCert({ ...newCert, account_email: e.target.value })} />
            <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder="optional export path" value={newCert.export_path} onChange={(e) => setNewCert({ ...newCert, export_path: e.target.value })} />
            <Button size="sm" onClick={createCertificate}>Create</Button>
          </div>
          {editingCert && (
            <div className="mb-4 rounded-lg border border-border/60 p-3 space-y-2">
              <div className="text-xs uppercase opacity-70">Edit certificate</div>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={editingCert.name} onChange={(e) => setEditingCert({ ...editingCert, name: e.target.value })} />
                <textarea className="min-h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm" value={editingCert.domains_json} onChange={(e) => setEditingCert({ ...editingCert, domains_json: e.target.value })} />
                <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={editingCert.account_email} onChange={(e) => setEditingCert({ ...editingCert, account_email: e.target.value })} />
                <textarea className="min-h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm" value={editingCert.dns_config_json} onChange={(e) => setEditingCert({ ...editingCert, dns_config_json: e.target.value })} />
                <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={editingCert.export_path || ''} onChange={(e) => setEditingCert({ ...editingCert, export_path: e.target.value })} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveCertEdit}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingCert(null)}>Cancel</Button>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2 text-sm">
            {certificates.length === 0 ? (
              <div className="opacity-60">No certificates</div>
            ) : (
              certificates.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    <div className="opacity-60">{item.expires_at || 'no expiry'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs uppercase opacity-70">{normalizeStatus(item.last_status)}</div>
                    <Button size="sm" variant="outline" onClick={() => runCertNow(item.id)}>Run</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingCert(item)}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => downloadCert(item.id)}>Download</Button>
                    <Button size="sm" variant="outline" onClick={() => exportCert(item.id)}>Export</Button>
                    <Button size="sm" variant="outline" onClick={() => deleteCert(item.id)}>Delete</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card/30 p-4">
          <div className="mb-3 text-sm font-bold uppercase tracking-wider opacity-70">Web Reuse</div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
            <div>
              <div className="mb-2 font-semibold opacity-80">Domain Assets</div>
              <div className="space-y-2">
                {domainAssets.length === 0 ? (
                  <div className="opacity-60">No domain assets</div>
                ) : (
                  domainAssets.map((item) => (
                    <div key={item.fqdn} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                      <span>{item.fqdn}</span>
                      <span className="text-xs uppercase opacity-70">{normalizeStatus(item.status)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 font-semibold opacity-80">Certificate Assets</div>
              <div className="space-y-2">
                {certAssets.length === 0 ? (
                  <div className="opacity-60">No certificate assets</div>
                ) : (
                  certAssets.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                      <span>{item.name}</span>
                      <span className="text-xs uppercase opacity-70">{normalizeStatus(item.status)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DomainAcmeDdnsAdmin;
