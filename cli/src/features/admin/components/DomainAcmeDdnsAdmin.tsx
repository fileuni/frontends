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

const PREFERRED_PROVIDER_ORDER = [
  'aliyun',
  'tencentcloud',
  'dnspod',
  'huaweicloud',
  'volcengine',
  'cloudflare',
  'aws',
  'google',
  'azure',
  'godaddy',
  'gandi',
  'callback',
];

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
    ca_provider: 'letsencrypt',
    challenge_type: 'dns01',
    provider_account_id: '',
    domains_json: '["example.com"]',
    dns_config_json: '{}',
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
      return t('admin.domain.panelProvider');
    }
    if (panel === 'acme') {
      return t('admin.domain.panelAcme');
    }
    if (panel === 'web') {
      return t('admin.domain.panelWeb');
    }
    return t('admin.domain.panelDdns');
  }, [panel, t]);

  const caProviderOptions = useMemo(() => [
    { value: 'letsencrypt', label: t('admin.domain.caProviders.letsencrypt') },
    { value: 'letsencrypt-staging', label: t('admin.domain.caProviders.letsencrypt-staging') },
    { value: 'zerossl', label: t('admin.domain.caProviders.zerossl') },
  ], [t]);

  const challengeOptions = useMemo(() => [
    { value: 'dns01', label: t('admin.domain.challengeTypes.dns01') },
    { value: 'http01', label: t('admin.domain.challengeTypes.http01') },
  ], [t]);

  const acmeProviderKeySet = useMemo(() => {
    return new Set(
      providerProfiles
        .filter((item) => item.supports_acme_dns01)
        .map((item) => item.key),
    );
  }, [providerProfiles]);

  const acmeProviders = useMemo(() => {
    return providers.filter((item) => acmeProviderKeySet.has(item.provider_key));
  }, [providers, acmeProviderKeySet]);

  const sortedProviderProfiles = useMemo(() => {
    const rank = new Map(PREFERRED_PROVIDER_ORDER.map((key, idx) => [key, idx]));
    return [...providerProfiles].sort((a, b) => {
      const ar = rank.get(a.key) ?? Number.MAX_SAFE_INTEGER;
      const br = rank.get(b.key) ?? Number.MAX_SAFE_INTEGER;
      if (ar !== br) return ar - br;
      return a.name.localeCompare(b.name);
    });
  }, [providerProfiles]);

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
      addToast(t('admin.domain.providerNameRequired'), 'error');
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
      addToast(t('admin.domain.providerCreated'), 'success');
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const createDdnsEntry = async () => {
    if (!newDdns.name.trim() || !newDdns.provider_account_id.trim() || !newDdns.fqdn.trim()) {
      addToast(t('admin.domain.ddnsRequired'), 'error');
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
      addToast(t('admin.domain.ddnsCreated'), 'success');
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const createCertificate = async () => {
    if (!newCert.name.trim() || !newCert.account_email.trim()) {
      addToast(t('admin.domain.certNameEmailRequired'), 'error');
      return;
    }
    if (newCert.challenge_type === 'http01') {
      try {
        const parsed = JSON.parse(newCert.dns_config_json || '{}');
        const webroot = typeof parsed.webroot === 'string' ? parsed.webroot.trim() : typeof parsed.http_webroot === 'string' ? parsed.http_webroot.trim() : '';
        if (!webroot) {
          addToast(t('admin.domain.certHttp01WebrootRequired'), 'error');
          return;
        }
      } catch {
        addToast(t('admin.domain.certDnsConfigInvalid'), 'error');
        return;
      }
    }
    try {
      await extractData(
        client.POST('/api/v1/admin/domain-acme-ddns/certs', {
          body: {
            name: newCert.name.trim(),
            enabled: newCert.enabled,
            auto_renew: newCert.auto_renew,
            ca_provider: newCert.ca_provider,
            challenge_type: newCert.challenge_type,
            domains_json: newCert.domains_json,
            provider_account_id:
              newCert.challenge_type === 'dns01'
                ? (newCert.provider_account_id.trim() || null)
                : null,
            dns_config_json: newCert.dns_config_json,
            account_email: newCert.account_email.trim(),
            export_path: newCert.export_path.trim() || null,
          },
        }),
      );
      setNewCert((prev) => ({ ...prev, name: '' }));
      await loadAll();
      addToast(t('admin.domain.certCreated'), 'success');
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
        addToast(t('admin.domain.forceRenewCompleted', { renewed }), 'success');
      } else {
        addToast(t('admin.domain.renewalCheckCompleted', { threshold: data.renew_before_days, renewed }), 'success');
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
      addToast(t('admin.domain.providerDeleted'), 'success');
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
      addToast(t('admin.domain.providerUpdated'), 'success');
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
      addToast(t('admin.domain.ddnsRunCompleted'), 'success');
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const runAllDdnsNow = async () => {
    setRunningDdnsAll(true);
    try {
      await extractData(client.POST('/api/v1/admin/domain-acme-ddns/ddns/run-all'));
      addToast(t('admin.domain.ddnsRunAllCompleted'), 'success');
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
      addToast(t('admin.domain.ddnsDeleted'), 'success');
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
      addToast(t('admin.domain.ddnsUpdated'), 'success');
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
      addToast(t('admin.domain.certRunCompleted'), 'success');
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
      addToast(t('admin.domain.certDeleted'), 'success');
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
            provider_account_id:
              editingCert.challenge_type === 'dns01'
                ? (editingCert.provider_account_id || null)
                : null,
            dns_config_json: editingCert.dns_config_json,
            account_email: editingCert.account_email,
            export_path: editingCert.export_path || null,
          },
        }),
      );
      addToast(t('admin.domain.certUpdated'), 'success');
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
        addToast(t('admin.domain.certNoContent'), 'error');
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
      addToast(data.has_private_key ? t('admin.domain.certDownloadedWithKey') : t('admin.domain.certDownloaded'), 'success');
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
      addToast(t('admin.domain.certExported'), 'success');
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
        <div className="text-sm font-semibold opacity-80">{t('admin.domain.title')}</div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={panel === 'provider' ? 'default' : 'outline'}
            onClick={() => setPanel('provider')}
          >
            {t('admin.domain.panelProvider')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={panel === 'ddns' ? 'default' : 'outline'}
            onClick={() => setPanel('ddns')}
          >
            {t('admin.domain.panelDdns')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={panel === 'acme' ? 'default' : 'outline'}
            onClick={() => setPanel('acme')}
          >
            {t('admin.domain.panelAcme')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={panel === 'web' ? 'default' : 'outline'}
            onClick={() => setPanel('web')}
          >
            {t('admin.domain.panelWeb')}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider opacity-60">{title}</div>
        <Button size="sm" variant="outline" onClick={loadAll} disabled={loading}>
          {loading ? t('admin.domain.loading') : t('admin.domain.refresh')}
        </Button>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/30 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5 text-sm">
          <div>
            <div className="opacity-60">{t('admin.domain.statsProviderProfiles')}</div>
            <div className="text-2xl font-black">{providerProfiles.length}</div>
          </div>
          <div>
            <div className="opacity-60">{t('admin.domain.statsProviderAccounts')}</div>
            <div className="text-2xl font-black">{providers.length}</div>
          </div>
          <div>
            <div className="opacity-60">{t('admin.domain.statsDdnsEntries')}</div>
            <div className="text-2xl font-black">{ddnsEntries.length}</div>
          </div>
          <div>
            <div className="opacity-60">{t('admin.domain.statsCertificates')}</div>
            <div className="text-2xl font-black">{certificates.length}</div>
          </div>
          <div>
            <div className="opacity-60">{t('admin.domain.statsWebDomains')}</div>
            <div className="text-2xl font-black">{domainAssets.length}</div>
          </div>
        </div>
      </div>

      {panel === 'provider' ? (
        <div className="rounded-xl border border-border/50 bg-card/30 p-4">
          <div className="mb-3 text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.domain.providerTitle')}</div>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-2">
            <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder={t('admin.domain.providerNamePlaceholder')} value={newProvider.name} onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })} />
            <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={newProvider.provider_key} onChange={(e) => setNewProvider({ ...newProvider, provider_key: e.target.value })}>
              {sortedProviderProfiles.map((item) => (
                <option key={item.key} value={item.key}>{item.name}</option>
              ))}
            </select>
            <textarea className="min-h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder={t('admin.domain.providerCredentialPlaceholder')} value={newProvider.credential_json_enc} onChange={(e) => setNewProvider({ ...newProvider, credential_json_enc: e.target.value })} />
            <textarea className="min-h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder={t('admin.domain.providerConfigPlaceholder')} value={newProvider.config_json} onChange={(e) => setNewProvider({ ...newProvider, config_json: e.target.value })} />
            <Button size="sm" onClick={createProvider}>{t('admin.domain.create')}</Button>
          </div>
          {editingProvider && (
            <div className="mb-4 rounded-lg border border-border/60 p-3 space-y-2">
              <div className="text-xs uppercase opacity-70">{t('admin.domain.providerEditTitle')}</div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={editingProvider.name} onChange={(e) => setEditingProvider({ ...editingProvider, name: e.target.value })} />
                <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={editingProvider.provider_key} onChange={(e) => setEditingProvider({ ...editingProvider, provider_key: e.target.value })}>
                  {sortedProviderProfiles.map((item) => (
                    <option key={item.key} value={item.key}>{item.name}</option>
                  ))}
                </select>
                <textarea className="min-h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder={t('admin.domain.providerCredentialEditPlaceholder')} value={editingProvider.credential_json_enc} onChange={(e) => setEditingProvider({ ...editingProvider, credential_json_enc: e.target.value })} />
                <textarea className="min-h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm" value={editingProvider.config_json} onChange={(e) => setEditingProvider({ ...editingProvider, config_json: e.target.value })} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveProviderEdit}>{t('admin.domain.save')}</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingProvider(null)}>{t('admin.domain.cancel')}</Button>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2 text-sm">
            {providers.length === 0 ? (
              <div className="opacity-60">{t('admin.domain.noProviders')}</div>
            ) : (
              providers.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    <div className="opacity-60">{item.provider_key}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs uppercase opacity-70">{item.enabled ? t('admin.domain.statusEnabled') : t('admin.domain.statusDisabled')}</div>
                    <Button size="sm" variant="outline" onClick={() => beginEditProvider(item)}>{t('admin.domain.edit')}</Button>
                    <Button size="sm" variant="outline" onClick={() => deleteProviderAccount(item.id)}>{t('admin.domain.delete')}</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : panel === 'ddns' ? (
        <div className="rounded-xl border border-border/50 bg-card/30 p-4">
          <div className="mb-3 text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.domain.panelDdns')}</div>
          <div className="mb-3">
            <Button size="sm" variant="outline" disabled={runningDdnsAll} onClick={runAllDdnsNow}>
              {runningDdnsAll ? t('admin.domain.running') : t('admin.domain.runAllNow')}
            </Button>
          </div>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-6 gap-2">
            <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder={t('admin.domain.ddnsNamePlaceholder')} value={newDdns.name} onChange={(e) => setNewDdns({ ...newDdns, name: e.target.value })} />
            <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={newDdns.provider_account_id} onChange={(e) => setNewDdns({ ...newDdns, provider_account_id: e.target.value })}>
              <option value="">{t('admin.domain.ddnsProviderPlaceholder')}</option>
              {providers.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder={t('admin.domain.ddnsFqdnPlaceholder')} value={newDdns.fqdn} onChange={(e) => setNewDdns({ ...newDdns, fqdn: e.target.value })} />
            <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder={t('admin.domain.ddnsZonePlaceholder')} value={newDdns.zone} onChange={(e) => setNewDdns({ ...newDdns, zone: e.target.value })} />
            <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder={t('admin.domain.ddnsHostPlaceholder')} value={newDdns.host} onChange={(e) => setNewDdns({ ...newDdns, host: e.target.value })} />
            <Button size="sm" onClick={createDdnsEntry}>{t('admin.domain.create')}</Button>
          </div>
          {editingDdns && (
            <div className="mb-4 rounded-lg border border-border/60 p-3 space-y-2">
              <div className="text-xs uppercase opacity-70">{t('admin.domain.ddnsEditTitle')}</div>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={editingDdns.name} onChange={(e) => setEditingDdns({ ...editingDdns, name: e.target.value })} />
                <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={editingDdns.fqdn} onChange={(e) => setEditingDdns({ ...editingDdns, fqdn: e.target.value })} />
                <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={editingDdns.zone} onChange={(e) => setEditingDdns({ ...editingDdns, zone: e.target.value })} />
                <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={editingDdns.host} onChange={(e) => setEditingDdns({ ...editingDdns, host: e.target.value })} />
                <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" type="number" value={editingDdns.ttl} onChange={(e) => setEditingDdns({ ...editingDdns, ttl: Number(e.target.value) || 120 })} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveDdnsEdit}>{t('admin.domain.save')}</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingDdns(null)}>{t('admin.domain.cancel')}</Button>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2 text-sm">
            {ddnsEntries.length === 0 ? (
              <div className="opacity-60">{t('admin.domain.noDdnsEntries')}</div>
            ) : (
              ddnsEntries.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    <div className="opacity-60">{item.fqdn}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs uppercase opacity-70">{normalizeStatus(item.last_status)}</div>
                    <Button size="sm" variant="outline" onClick={() => runDdnsEntryNow(item.id)}>{t('admin.domain.run')}</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingDdns(item)}>{t('admin.domain.edit')}</Button>
                    <Button size="sm" variant="outline" onClick={() => deleteDdnsEntry(item.id)}>{t('admin.domain.delete')}</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : panel === 'acme' ? (
        <div className="rounded-xl border border-border/50 bg-card/30 p-4">
          <div className="mb-3 text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.domain.acmeTitle')}</div>
          <div className="mb-3 rounded-lg border border-border/50 bg-background/40 p-3 text-xs opacity-80">
            {t('admin.domain.acmeAutoRenewHint')}
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={runningCertCheck}
              onClick={() => runCertCheck(false)}
            >
              {runningCertCheck ? t('admin.domain.running') : t('admin.domain.runRenewalCheck')}
            </Button>
            <Button
              size="sm"
              disabled={runningCertCheck}
              onClick={() => runCertCheck(true)}
            >
              {runningCertCheck ? t('admin.domain.running') : t('admin.domain.forceRenewAll')}
            </Button>
          </div>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-8 gap-2">
            <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder={t('admin.domain.certNamePlaceholder')} value={newCert.name} onChange={(e) => setNewCert({ ...newCert, name: e.target.value })} />
            <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={newCert.ca_provider} onChange={(e) => setNewCert({ ...newCert, ca_provider: e.target.value })}>
              {caProviderOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={newCert.challenge_type} onChange={(e) => setNewCert({ ...newCert, challenge_type: e.target.value })}>
              {challengeOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <select
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
              value={newCert.provider_account_id}
              disabled={newCert.challenge_type !== 'dns01'}
              onChange={(e) => setNewCert({ ...newCert, provider_account_id: e.target.value })}
            >
              <option value="">{t('admin.domain.certProviderPlaceholder')}</option>
              {acmeProviders.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder={t('admin.domain.certDomainsPlaceholder')} value={newCert.domains_json} onChange={(e) => setNewCert({ ...newCert, domains_json: e.target.value })} />
            <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder={t('admin.domain.certDnsConfigPlaceholder')} value={newCert.dns_config_json} onChange={(e) => setNewCert({ ...newCert, dns_config_json: e.target.value })} />
            <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder={t('admin.domain.certEmailPlaceholder')} value={newCert.account_email} onChange={(e) => setNewCert({ ...newCert, account_email: e.target.value })} />
            <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" placeholder={t('admin.domain.certExportPlaceholder')} value={newCert.export_path} onChange={(e) => setNewCert({ ...newCert, export_path: e.target.value })} />
            <Button size="sm" onClick={createCertificate}>{t('admin.domain.create')}</Button>
          </div>
          {editingCert && (
            <div className="mb-4 rounded-lg border border-border/60 p-3 space-y-2">
              <div className="text-xs uppercase opacity-70">{t('admin.domain.certEditTitle')}</div>
              <div className="grid grid-cols-1 md:grid-cols-8 gap-2">
                <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={editingCert.name} onChange={(e) => setEditingCert({ ...editingCert, name: e.target.value })} />
                <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={editingCert.ca_provider} onChange={(e) => setEditingCert({ ...editingCert, ca_provider: e.target.value })}>
                  {caProviderOptions.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
                <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={editingCert.challenge_type} onChange={(e) => setEditingCert({ ...editingCert, challenge_type: e.target.value })}>
                  {challengeOptions.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  value={editingCert.provider_account_id || ''}
                  disabled={editingCert.challenge_type !== 'dns01'}
                  onChange={(e) => setEditingCert({ ...editingCert, provider_account_id: e.target.value || null })}
                >
                  <option value="">{t('admin.domain.certProviderPlaceholder')}</option>
                  {acmeProviders.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                <textarea className="min-h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm" value={editingCert.domains_json} onChange={(e) => setEditingCert({ ...editingCert, domains_json: e.target.value })} />
                <textarea className="min-h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm" value={editingCert.dns_config_json} onChange={(e) => setEditingCert({ ...editingCert, dns_config_json: e.target.value })} />
                <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={editingCert.account_email} onChange={(e) => setEditingCert({ ...editingCert, account_email: e.target.value })} />
                <input className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={editingCert.export_path || ''} onChange={(e) => setEditingCert({ ...editingCert, export_path: e.target.value })} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveCertEdit}>{t('admin.domain.save')}</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingCert(null)}>{t('admin.domain.cancel')}</Button>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2 text-sm">
            {certificates.length === 0 ? (
              <div className="opacity-60">{t('admin.domain.noCertificates')}</div>
            ) : (
              certificates.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    <div className="opacity-60">{item.expires_at || t('admin.domain.noExpiry')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs uppercase opacity-70">{normalizeStatus(item.last_status)}</div>
                    <Button size="sm" variant="outline" onClick={() => runCertNow(item.id)}>{t('admin.domain.run')}</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingCert(item)}>{t('admin.domain.edit')}</Button>
                    <Button size="sm" variant="outline" onClick={() => downloadCert(item.id)}>{t('common.download')}</Button>
                    <Button size="sm" variant="outline" onClick={() => exportCert(item.id)}>{t('admin.domain.certExported').split(' ')[0]}</Button>
                    <Button size="sm" variant="outline" onClick={() => deleteCert(item.id)}>{t('admin.domain.delete')}</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card/30 p-4">
          <div className="mb-3 text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.domain.webTitle')}</div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
            <div>
              <div className="mb-2 font-semibold opacity-80">{t('admin.domain.webDomainAssets')}</div>
              <div className="space-y-2">
                {domainAssets.length === 0 ? (
                  <div className="opacity-60">{t('admin.domain.noDomainAssets')}</div>
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
              <div className="mb-2 font-semibold opacity-80">{t('admin.domain.webCertAssets')}</div>
              <div className="space-y-2">
                {certAssets.length === 0 ? (
                  <div className="opacity-60">{t('admin.domain.noCertAssets')}</div>
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
