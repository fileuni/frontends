import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { client, extractData, handleApiError } from '@/lib/api';
import { useNavigationStore } from '@/stores/navigation';
import { useToastStore } from '@fileuni/shared';
import { ProviderForm } from './domain/ProviderForm';
import { DdnsSourceForm } from './domain/DdnsSourceForm';
import { CertificateForm } from './domain/CertificateForm';
import { 
  Globe, ShieldCheck, Plus, RefreshCw, 
  Trash2, Edit3, Play, Activity, 
  Server, Calendar, Link as LinkIcon, CheckCircle, XCircle, 
  Info, Settings, Network, Shield, Key, Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DomainAcmeDdnsAdminProps {
  view: 'ddns' | 'ssl';
}

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

interface ZeroSslAccountItem {
  id: string;
  name: string;
  eab_kid: string;
  enabled: boolean;
}

interface ProviderDraft {
  name: string;
  provider_key: string;
  credential_json_enc: string;
  config_json: string;
  enabled: boolean;
}

interface DdnsDraft {
  id?: string;
  name: string;
  provider_account_id: string;
  fqdn: string;
  zone: string;
  host: string;
  ttl: number;
  proxied: boolean;
  enabled: boolean;
  ipv4_enabled: boolean;
  ipv6_enabled: boolean;
  ipv4_source_json: string;
  ipv6_source_json: string;
}

interface SslDraft {
  id?: string;
  name: string;
  ca_provider: string;
  challenge_type: string;
  provider_account_id: string;
  domains_json: string;
  account_email: string;
  export_path: string;
  enabled: boolean;
  auto_renew: boolean;
  dns_config_json: string;
}

interface ZeroSslDraft {
  id?: string;
  name: string;
  eab_kid: string;
  eab_hmac_key: string;
  enabled: boolean;
}

// Global styles for high-visibility controls in light mode
const controlBase = "h-11 rounded-xl border border-zinc-400/60 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all shadow-sm font-bold text-foreground placeholder:opacity-30";
const selectBase = cn(controlBase, "appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem] font-normal");
const selectStyle = { backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")' };

const sectionCardBase = "p-8 rounded-[2.5rem] bg-zinc-50/50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 dark:shadow-2xl space-y-8";

const normalizeStatus = (value?: string | null): 'idle' | 'running' | 'success' | 'failed' => {
  const input = (value || '').toLowerCase().trim();
  if (input.includes('run') || input.includes('processing')) return 'running';
  if (input.includes('fail') || input.includes('error')) return 'failed';
  if (input.includes('success') || input.includes('ok')) return 'success';
  return 'idle';
};

const StatusBadge = ({ status }: { status?: string | null }) => {
  const s = normalizeStatus(status);
  if (s === 'success') return <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-500 border-green-500/20 whitespace-nowrap font-bold"><CheckCircle size={12} className="mr-1"/> Success</Badge>;
  if (s === 'failed') return <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-500 border-red-500/20 whitespace-nowrap font-bold"><XCircle size={12} className="mr-1"/> Failed</Badge>;
  if (s === 'running') return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-500 border-blue-500/20 whitespace-nowrap animate-pulse font-bold"><RefreshCw size={12} className="mr-1 animate-spin"/> Running</Badge>;
  return <Badge variant="outline" className="whitespace-nowrap opacity-50 dark:opacity-40 font-bold">Idle</Badge>;
};

const SectionHeader = ({ icon: Icon, title, desc, colorClass = "bg-primary/10 text-primary border-primary/20" }: { icon: any, title: string, desc?: string, colorClass?: string }) => (
  <div className="flex items-start gap-3 mb-6">
    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border shrink-0", colorClass)}>
      <Icon size={16} />
    </div>
    <div>
      <h4 className="text-sm font-black uppercase tracking-widest text-foreground/80 leading-none mb-1">{title}</h4>
      {desc && <p className="text-[10px] opacity-60 dark:opacity-40 font-bold uppercase tracking-tighter leading-none text-foreground/60 dark:text-foreground/40">{desc}</p>}
    </div>
  </div>
);

const newProviderDraft = (): ProviderDraft => ({
  name: '',
  provider_key: 'cloudflare',
  credential_json_enc: '{}',
  config_json: '{}',
  enabled: true,
});

const newDdnsDraft = (): DdnsDraft => ({
  name: '',
  provider_account_id: '',
  fqdn: '',
  zone: '',
  host: '@',
  ttl: 120,
  proxied: false,
  enabled: true,
  ipv4_enabled: true,
  ipv6_enabled: false,
  ipv4_source_json: '{"type":"url","url":"https://api.ipify.org"}',
  ipv6_source_json: '{"type":"url","url":"https://api64.ipify.org"}',
});

const newSslDraft = (): SslDraft => ({
  name: '',
  ca_provider: 'letsencrypt',
  challenge_type: 'dns01',
  provider_account_id: '',
  domains_json: '[]',
  account_email: '',
  export_path: '',
  enabled: true,
  auto_renew: true,
  dns_config_json: '{}',
});

const newZeroSslDraft = (): ZeroSslDraft => ({
  name: '',
  eab_kid: '',
  eab_hmac_key: '',
  enabled: true,
});

const fetchZeroSslAccounts = async (): Promise<ZeroSslAccountItem[]> => {
  const resp = await fetch('/api/v1/admin/domain-acme-ddns/zerossl/accounts', { credentials: 'include' });
  const json = await resp.json();
  const data = json?.data;
  return Array.isArray(data) ? (data as ZeroSslAccountItem[]) : [];
};

const createZeroSslAccount = async (payload: ZeroSslDraft): Promise<ZeroSslAccountItem> => {
  const resp = await fetch('/api/v1/admin/domain-acme-ddns/zerossl/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const json = await resp.json();
  if (!resp.ok || (typeof json?.code === 'number' && json.code !== 0)) {
    throw new Error(json?.message || 'create zerossl account failed');
  }
  return json.data as ZeroSslAccountItem;
};

export const DomainAcmeDdnsAdmin: React.FC<DomainAcmeDdnsAdminProps> = ({ view }) => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const { params } = useNavigationStore();

  const [loading, setLoading] = useState(false);
  const [providerProfiles, setProviderProfiles] = useState<ProviderProfileItem[]>([]);
  const [providers, setProviders] = useState<ProviderAccountItem[]>([]);
  const [ddnsEntries, setDdnsEntries] = useState<DdnsEntryItem[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [zerosslAccounts, setZeroSslAccounts] = useState<ZeroSslAccountItem[]>([]);

  const [ddnsModalOpen, setDdnsModalOpen] = useState(false);
  const [sslModalOpen, setSslModalOpen] = useState(false);
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [zerosslModalOpen, setZeroSslModalOpen] = useState(false);

  const [providerDraft, setProviderDraft] = useState<ProviderDraft>(newProviderDraft());
  const [ddnsDraft, setDdnsDraft] = useState<DdnsDraft>(newDdnsDraft());
  const [sslDraft, setSslDraft] = useState<SslDraft>(newSslDraft());
  const [zerosslDraft, setZeroSslDraft] = useState<ZeroSslDraft>(newZeroSslDraft());

  const acmeProviders = useMemo(() => {
    const set = new Set(providerProfiles.filter((p) => p.supports_acme_dns01).map((p) => p.key));
    return providers.filter((p) => set.has(p.provider_key));
  }, [providers, providerProfiles]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [profileData, providerData, ddnsData, certData, zerosslData] = await Promise.all([
        extractData<ProviderProfileItem[]>(client.GET('/api/v1/admin/domain-acme-ddns/providers/profiles')),
        extractData<ProviderAccountItem[]>(client.GET('/api/v1/admin/domain-acme-ddns/providers/accounts')),
        extractData<DdnsEntryItem[]>(client.GET('/api/v1/admin/domain-acme-ddns/ddns/entries')),
        extractData<CertificateItem[]>(client.GET('/api/v1/admin/domain-acme-ddns/certs')),
        fetchZeroSslAccounts(),
      ]);
      setProviderProfiles(Array.isArray(profileData) ? profileData : []);
      setProviders(Array.isArray(providerData) ? providerData : []);
      setDdnsEntries(Array.isArray(ddnsData) ? ddnsData : []);
      setCertificates(Array.isArray(certData) ? certData : []);
      setZeroSslAccounts(Array.isArray(zerosslData) ? zerosslData : []);
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadAll();
  }, []);

  const openCreateDdns = () => {
    setDdnsDraft(newDdnsDraft());
    setDdnsModalOpen(true);
  };

  const openEditDdns = (item: DdnsEntryItem) => {
    setDdnsDraft({
      id: item.id,
      name: item.name,
      provider_account_id: item.provider_account_id,
      fqdn: item.fqdn,
      zone: item.zone,
      host: item.host,
      ttl: item.ttl,
      proxied: item.proxied,
      enabled: item.enabled,
      ipv4_enabled: item.ipv4_enabled,
      ipv6_enabled: item.ipv6_enabled,
      ipv4_source_json: item.ipv4_source_json,
      ipv6_source_json: item.ipv6_source_json,
    });
    setDdnsModalOpen(true);
  };

  const saveDdns = async () => {
    if (!ddnsDraft.name.trim() || !ddnsDraft.fqdn.trim() || !ddnsDraft.provider_account_id.trim()) {
      addToast(t('admin.domain.ddnsRequired'), 'error');
      return;
    }
    const zone = ddnsDraft.zone.trim() || ddnsDraft.fqdn.split('.').slice(1).join('.');
    const payload = {
      name: ddnsDraft.name.trim(),
      enabled: ddnsDraft.enabled,
      provider_account_id: ddnsDraft.provider_account_id,
      zone,
      host: ddnsDraft.host.trim() || '@',
      fqdn: ddnsDraft.fqdn.trim(),
      ttl: ddnsDraft.ttl,
      proxied: ddnsDraft.proxied,
      ipv4_enabled: ddnsDraft.ipv4_enabled,
      ipv6_enabled: ddnsDraft.ipv6_enabled,
      ipv4_source_json: ddnsDraft.ipv4_source_json,
      ipv6_source_json: ddnsDraft.ipv6_source_json,
      webhook_json: '{}',
      force_update: false,
    };
    try {
      if (ddnsDraft.id) {
        await extractData(client.PUT('/api/v1/admin/domain-acme-ddns/ddns/entries/{id}', { params: { path: { id: ddnsDraft.id } }, body: payload }));
        addToast(t('admin.domain.ddnsUpdated'), 'success');
      } else {
        await extractData(client.POST('/api/v1/admin/domain-acme-ddns/ddns/entries', { body: payload }));
        addToast(t('admin.domain.ddnsCreated'), 'success');
      }
      setDdnsModalOpen(false);
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const deleteDdns = async (id: string) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    try {
      await extractData(client.DELETE('/api/v1/admin/domain-acme-ddns/ddns/entries/{id}', { params: { path: { id } } }));
      addToast(t('admin.domain.ddnsDeleted'), 'success');
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const openCreateSsl = () => {
    setSslDraft(newSslDraft());
    setSslModalOpen(true);
  };

  const openEditSsl = (item: CertificateItem) => {
    setSslDraft({
      id: item.id,
      name: item.name,
      ca_provider: item.ca_provider,
      challenge_type: item.challenge_type,
      provider_account_id: item.provider_account_id || '',
      domains_json: item.domains_json,
      account_email: item.account_email,
      export_path: item.export_path || '',
      enabled: item.enabled,
      auto_renew: item.auto_renew,
      dns_config_json: item.dns_config_json,
    });
    setSslModalOpen(true);
  };

  const saveSsl = async () => {
    if (!sslDraft.name.trim() || !sslDraft.account_email.trim()) {
      addToast(t('admin.domain.certNameEmailRequired'), 'error');
      return;
    }
    
    try {
      const payload = {
        name: sslDraft.name.trim(),
        enabled: sslDraft.enabled,
        auto_renew: sslDraft.auto_renew,
        ca_provider: sslDraft.ca_provider,
        challenge_type: sslDraft.challenge_type,
        domains_json: sslDraft.domains_json,
        provider_account_id: sslDraft.challenge_type === 'dns01' ? (sslDraft.provider_account_id || null) : null,
        dns_config_json: sslDraft.dns_config_json,
        account_email: sslDraft.account_email.trim(),
        export_path: sslDraft.export_path.trim() || null,
      };
      if (sslDraft.id) {
        await extractData(client.PUT('/api/v1/admin/domain-acme-ddns/certs/{id}', { params: { path: { id: sslDraft.id } }, body: payload }));
        addToast(t('admin.domain.certUpdated'), 'success');
      } else {
        await extractData(client.POST('/api/v1/admin/domain-acme-ddns/certs', { body: payload }));
        addToast(t('admin.domain.certCreated'), 'success');
      }
      setSslModalOpen(false);
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const deleteSsl = async (id: string) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    try {
      await extractData(client.DELETE('/api/v1/admin/domain-acme-ddns/certs/{id}', { params: { path: { id } } }));
      addToast(t('admin.domain.certDeleted'), 'success');
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const runSsl = async (id: string) => {
    try {
      addToast(t('common.loading'), 'info');
      await extractData(client.POST('/api/v1/admin/domain-acme-ddns/certs/{id}/run', { params: { path: { id } } }));
      addToast(t('admin.domain.certRunCompleted'), 'success');
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const saveProviderQuick = async () => {
    try {
      const created = await extractData<ProviderAccountItem>(client.POST('/api/v1/admin/domain-acme-ddns/providers/accounts', { body: providerDraft }));
      addToast(t('admin.domain.providerCreated'), 'success');
      setProviderModalOpen(false);
      setProviderDraft(newProviderDraft());
      await loadAll();
      if (created?.id) {
        setDdnsDraft((prev) => ({ ...prev, provider_account_id: created.id }));
        setSslDraft((prev) => ({ ...prev, provider_account_id: created.id }));
      }
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const saveZeroSslQuick = async () => {
    try {
      const created = await createZeroSslAccount(zerosslDraft);
      addToast('ZeroSSL account created', 'success');
      setZeroSslModalOpen(false);
      setZeroSslDraft(newZeroSslDraft());
      await loadAll();

      // Auto-select in SSL draft if it's being configured
      if (created?.id) {
        setSslDraft((prev) => {
          try {
            const config = JSON.parse(prev.dns_config_json || '{}');
            config.zerossl_account_id = created.id;
            return { ...prev, dns_config_json: JSON.stringify(config) };
          } catch {
            return { ...prev, dns_config_json: JSON.stringify({ zerossl_account_id: created.id }) };
          }
        });
      }
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const isDdns = view === 'ddns';

  return (
    <div className="space-y-8 pb-20">
      {/* Page Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="flex items-center gap-4 min-w-0 w-full xl:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner shrink-0 border border-primary/20">
            {isDdns ? <Globe size={24} /> : <ShieldCheck size={24} />}
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-black tracking-tight truncate text-foreground">
              {isDdns ? t('admin.domain.ddnsTitle') : t('admin.domain.acmeTitle')}
            </h2>
            <div className="flex items-center gap-2">
              <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_8px] shrink-0", isDdns ? "bg-blue-500 shadow-blue-500/60" : "bg-green-500 shadow-green-500/60")} />
              <p className="text-sm font-bold opacity-60 dark:opacity-40 uppercase tracking-widest truncate text-foreground">
                {isDdns ? `${ddnsEntries.length} ${t('admin.domain.statsDdnsEntries')}` : `${certificates.length} ${t('admin.domain.statsCertificates')}`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <Button size="sm" variant="outline" onClick={() => setProviderModalOpen(true)} className="h-12 px-4 rounded-xl border-zinc-300 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 shadow-sm transition-all font-bold">
            <Server size={16} className="mr-2 opacity-70 text-indigo-600 dark:text-indigo-400" /> 
            {t('admin.domain.panelProvider')}
          </Button>
          {!isDdns && (
            <Button size="sm" variant="outline" onClick={() => setZeroSslModalOpen(true)} className="h-12 px-4 rounded-xl border-zinc-300 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 shadow-sm transition-all font-bold">
               <LinkIcon size={16} className="mr-2 opacity-70 text-cyan-600 dark:text-cyan-400" /> 
               ZeroSSL
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={loadAll} disabled={loading} className="h-12 w-12 rounded-xl p-0 border-zinc-300 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 flex items-center justify-center shadow-sm transition-all text-foreground/60">
            <RefreshCw size={18} className={cn("opacity-70", loading && "animate-spin")} />
          </Button>
          <Button className="h-12 px-6 rounded-2xl bg-gradient-to-br from-primary to-primary/90 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95 border-t border-white/20" onClick={isDdns ? openCreateDdns : openCreateSsl}>
            <Plus size={18} className="mr-2 stroke-[3px]" />
            <span className="hidden sm:inline font-bold tracking-wider">{t('admin.domain.create')}</span>
          </Button>
        </div>
      </div>

      {/* Content Table */}
      <div className="bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden dark:shadow-2xl backdrop-blur-sm transition-all shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02]">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-foreground/50 dark:text-white/30">
                  {isDdns ? t('common.name') : t('admin.acme.table.name')}
                </th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-foreground/50 dark:text-white/30">
                  {isDdns ? 'Target / Details' : t('admin.acme.table.status')}
                </th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-foreground/50 dark:text-white/30">{t('admin.acme.table.status')}</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-foreground/50 dark:text-white/30 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (!ddnsEntries.length && !certificates.length) ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-foreground/30 font-bold uppercase tracking-widest">
                    <RefreshCw className="animate-spin mb-4 mx-auto" size={32} />
                    {t('common.loading')}
                  </td>
                </tr>
              ) : (isDdns ? ddnsEntries : certificates).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-foreground/20 font-bold uppercase tracking-widest">
                    {isDdns ? <Globe className="mx-auto mb-4" size={48} /> : <ShieldCheck className="mx-auto mb-4" size={48} />}
                    {isDdns ? t('admin.domain.noDdnsEntries') : t('admin.domain.noCertificates')}
                  </td>
                </tr>
              ) : (
                (isDdns ? ddnsEntries : certificates).map((item: any) => (
                  <tr key={item.id} className="border-b border-zinc-100 dark:border-white/5 last:border-0 hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6 text-foreground font-bold">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center border border-zinc-200 dark:border-white/5 font-black text-sm group-hover:border-primary/30 transition-all shadow-inner">
                          {isDdns ? <Activity size={18} className="opacity-70 text-blue-600 dark:text-blue-400" /> : <ShieldCheck size={18} className="opacity-70 text-green-600 dark:text-green-400" />}
                        </div>
                        <div>
                          <div>{item.name}</div>
                          {isDdns && <div className="text-[10px] opacity-60 dark:opacity-40 font-mono mt-0.5">{item.fqdn}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {isDdns ? (
                         <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-zinc-100 dark:bg-white/5 border-zinc-300 dark:border-white/10 text-foreground/60 dark:text-white/40 uppercase font-black">TTL {item.ttl}</Badge>
                            {item.proxied && <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-500 uppercase font-black">Proxy</Badge>}
                         </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[11px] font-bold opacity-60 dark:opacity-40 uppercase tracking-widest text-foreground">
                           <Calendar size={12} className="text-primary" />
                           {item.expires_at ? new Date(item.expires_at).toLocaleDateString() : t('admin.domain.noExpiry')}
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <StatusBadge status={item.last_status} />
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        {!isDdns && (
                          <button onClick={() => runSsl(item.id)} className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/5 hover:bg-green-500 hover:text-white transition-all shadow-sm"><Play size={16} /></button>
                        )}
                        <button onClick={() => isDdns ? openEditDdns(item) : openEditSsl(item)} className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/5 hover:bg-primary hover:text-white transition-all shadow-sm"><Edit3 size={16} /></button>
                        <button onClick={() => isDdns ? deleteDdns(item.id) : deleteSsl(item.id)} className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/5 hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DDNS Modal */}
      <Modal isOpen={ddnsModalOpen} onClose={() => setDdnsModalOpen(false)} title={ddnsDraft.id ? t('admin.domain.ddnsEditTitle') : t('admin.domain.create') + ' DDNS'} maxWidth="max-w-3xl">
        <div className="space-y-8 overflow-y-auto max-h-[80vh] p-1 scrollbar-hide">
          <div className={sectionCardBase}>
            <SectionHeader icon={Info} title={t('admin.domain.basicInfo')} desc="Basic Identification" colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-500 border-blue-500/20" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/50 dark:text-foreground/40 ml-1">{t('common.name')}</label>
                <Input placeholder={t('admin.domain.ddnsNamePlaceholder')} value={ddnsDraft.name} onChange={(e) => setDdnsDraft({ ...ddnsDraft, name: e.target.value })} className={controlBase} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/50 dark:text-foreground/40 ml-1">{t('admin.domain.panelProvider')}</label>
                <div className="flex gap-2">
                  <select className={selectBase} style={selectStyle} value={ddnsDraft.provider_account_id} onChange={(e) => setDdnsDraft({ ...ddnsDraft, provider_account_id: e.target.value })}>
                    <option value="">{providers.length === 0 ? t('admin.domain.noProviders') : t('admin.domain.ddnsProviderPlaceholder')}</option>
                    {providers.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.provider_key})</option>)}
                  </select>
                  <Button type="button" variant="outline" onClick={() => setProviderModalOpen(true)} className="h-11 w-11 p-0 border-zinc-300 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 shadow-sm"><Plus size={18}/></Button>
                </div>
              </div>
            </div>
          </div>

          <div className={sectionCardBase}>
            <SectionHeader icon={Network} title={t('admin.domain.networkConfig')} desc="Target Domain Configuration" colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-500 border-indigo-500/20" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/50 dark:text-foreground/40 ml-1">{t('admin.domain.ddnsFqdnPlaceholder')}</label>
                <Input placeholder="example.com" value={ddnsDraft.fqdn} onChange={(e) => setDdnsDraft({ ...ddnsDraft, fqdn: e.target.value })} className={cn(controlBase, "font-mono")} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/50 dark:text-foreground/40 ml-1">{t('admin.domain.ddnsZonePlaceholder')}</label>
                <Input placeholder="Optional zone" value={ddnsDraft.zone} onChange={(e) => setDdnsDraft({ ...ddnsDraft, zone: e.target.value })} className={cn(controlBase, "font-mono")} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/50 dark:text-foreground/40 ml-1">{t('admin.domain.ddnsHostPlaceholder')}</label>
                <Input placeholder="@" value={ddnsDraft.host} onChange={(e) => setDdnsDraft({ ...ddnsDraft, host: e.target.value })} className={cn(controlBase, "font-mono")} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/50 dark:text-foreground/40 ml-1">TTL</label>
                <Input type="number" placeholder="120" value={String(ddnsDraft.ttl)} onChange={(e) => setDdnsDraft({ ...ddnsDraft, ttl: Number(e.target.value) || 120 })} className={controlBase} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <DdnsSourceForm
              label="IPv4"
              sourceJson={ddnsDraft.ipv4_source_json}
              onChange={(json) => setDdnsDraft({ ...ddnsDraft, ipv4_source_json: json })}
              enabled={ddnsDraft.ipv4_enabled}
              onToggle={(v) => setDdnsDraft({ ...ddnsDraft, ipv4_enabled: v })}
            />
            <DdnsSourceForm
              label="IPv6"
              sourceJson={ddnsDraft.ipv6_source_json}
              onChange={(json) => setDdnsDraft({ ...ddnsDraft, ipv6_source_json: json })}
              enabled={ddnsDraft.ipv6_enabled}
              onToggle={(v) => setDdnsDraft({ ...ddnsDraft, ipv6_enabled: v })}
            />
          </div>

          <div className={cn(sectionCardBase, "grid grid-cols-1 sm:grid-cols-2 gap-8 items-center")}>
            <label className="flex items-center gap-4 cursor-pointer group text-foreground">
               <Switch checked={ddnsDraft.enabled} onChange={(v) => setDdnsDraft({ ...ddnsDraft, enabled: v })} />
               <div>
                  <div className="text-xs font-black uppercase tracking-widest group-hover:text-primary transition-colors opacity-80">{t('admin.domain.enableService')}</div>
                  <div className="text-[9px] opacity-60 dark:opacity-30 font-bold uppercase tracking-tighter">Automatic updates enabled</div>
               </div>
            </label>
            <label className="flex items-center gap-4 cursor-pointer group text-foreground">
               <Switch checked={ddnsDraft.proxied} onChange={(v) => setDdnsDraft({ ...ddnsDraft, proxied: v })} />
               <div>
                  <div className="text-xs font-black uppercase tracking-widest group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors opacity-80">{t('admin.domain.cdnProxy')}</div>
                  <div className="text-[9px] opacity-60 dark:opacity-30 font-bold uppercase tracking-tighter">Cloudflare-style proxy</div>
               </div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-white/5">
            <Button variant="outline" onClick={() => setDdnsModalOpen(false)} className="h-14 px-8 rounded-2xl border-zinc-300 dark:border-white/5 bg-white dark:bg-white/5 font-black uppercase tracking-widest text-xs shadow-sm">{t('common.cancel')}</Button>
            <Button onClick={saveDdns} className="h-14 px-10 rounded-2xl bg-gradient-to-br from-primary to-primary/90 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 border-t border-white/20 font-bold tracking-wider text-primary-foreground">{t('common.save')}</Button>
          </div>
        </div>
      </Modal>

      {/* SSL Modal */}
      <Modal isOpen={sslModalOpen} onClose={() => setSslModalOpen(false)} title={sslDraft.id ? t('admin.domain.certEditTitle') : t('admin.domain.create') + ' SSL/TLS'} maxWidth="max-w-4xl">
        <div className="overflow-y-auto max-h-[80vh] p-1 space-y-8 scrollbar-hide">
          <CertificateForm
            name={sslDraft.name}
            onChangeName={(v) => setSslDraft({ ...sslDraft, name: v })}
            domainsJson={sslDraft.domains_json}
            onChangeDomains={(v) => setSslDraft({ ...sslDraft, domains_json: v })}
            challengeType={sslDraft.challenge_type as any}
            onChangeChallengeType={(v) => setSslDraft({ ...sslDraft, challenge_type: v })}
            caProvider={sslDraft.ca_provider}
            onChangeCaProvider={(v) => setSslDraft({ ...sslDraft, ca_provider: v })}
            accountEmail={sslDraft.account_email}
            onChangeAccountEmail={(v) => setSslDraft({ ...sslDraft, account_email: v })}
            dnsConfigJson={sslDraft.dns_config_json}
            onChangeDnsConfig={(v) => setSslDraft({ ...sslDraft, dns_config_json: v })}
            providerAccountId={sslDraft.provider_account_id}
            onChangeProviderAccountId={(v) => setSslDraft({ ...sslDraft, provider_account_id: v })}
            providers={acmeProviders}
            zeroSslAccounts={zerosslAccounts}
            exportPath={sslDraft.export_path}
            onChangeExportPath={(v) => setSslDraft({ ...sslDraft, export_path: v })}
            onOpenProviderModal={() => setProviderModalOpen(true)}
            onOpenZeroSslModal={() => setZeroSslModalOpen(true)}
          />

          <div className={cn(sectionCardBase, "grid grid-cols-1 sm:grid-cols-2 gap-8 items-center")}>
            <label className="flex items-center gap-4 cursor-pointer group text-foreground">
               <Switch checked={sslDraft.enabled} onChange={(v) => setSslDraft({ ...sslDraft, enabled: v })} />
               <div>
                  <div className="text-xs font-black uppercase tracking-widest group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors opacity-80">{t('admin.domain.enableCert')}</div>
                  <div className="text-[9px] opacity-60 dark:opacity-30 font-bold uppercase tracking-tighter">Active for web services</div>
               </div>
            </label>
             <label className="flex items-center gap-4 cursor-pointer group text-foreground">
               <Switch checked={sslDraft.auto_renew} onChange={(v) => setSslDraft({ ...sslDraft, auto_renew: v })} />
               <div>
                  <div className="text-xs font-black uppercase tracking-widest group-hover:text-primary transition-colors opacity-80">{t('admin.domain.autoRenew')}</div>
                  <div className="text-[9px] opacity-60 dark:opacity-30 font-bold uppercase tracking-tighter">Automatic renewal check</div>
               </div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-white/5">
            <Button variant="outline" onClick={() => setSslModalOpen(false)} className="h-14 px-8 rounded-2xl border-zinc-300 dark:border-white/5 bg-white dark:bg-white/5 font-black uppercase tracking-widest text-xs shadow-sm">{t('common.cancel')}</Button>
            <Button onClick={saveSsl} className="h-14 px-10 rounded-2xl bg-gradient-to-br from-primary to-primary/90 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 border-t border-white/20 font-bold tracking-wider text-primary-foreground">{t('common.save')}</Button>
          </div>
        </div>
      </Modal>

      {/* Provider Modal */}
      <Modal isOpen={providerModalOpen} onClose={() => setProviderModalOpen(false)} title={t('admin.domain.providerTitle') + ' ' + t('common.manage')} maxWidth="max-w-2xl">
        <div className="space-y-8 overflow-y-auto max-h-[80vh] p-1 scrollbar-hide">
          <div className={sectionCardBase}>
            <SectionHeader icon={Server} title={t('admin.domain.accountIdentity')} desc="Provider Identification" colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-500 border-indigo-500/20" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-foreground/50 dark:text-foreground/40 ml-1">{t('common.name')}</label>
                 <Input value={providerDraft.name} onChange={(e) => setProviderDraft({ ...providerDraft, name: e.target.value })} className={controlBase} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/50 dark:text-foreground/40 ml-1">{t('admin.domain.detectionSource')}</label>
                <select className={selectBase} style={selectStyle} value={providerDraft.provider_key} onChange={(e) => setProviderDraft({ ...providerDraft, provider_key: e.target.value })}>
                  {providerProfiles.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className={sectionCardBase}>
            <SectionHeader icon={Key} title={t('admin.domain.authConfig')} desc="API Credentials & Auth" colorClass="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20" />
            <div className="p-1">
              <ProviderForm 
                providerKey={providerDraft.provider_key}
                credentialJson={providerDraft.credential_json_enc}
                configJson={providerDraft.config_json}
                onChangeCredential={(v) => setProviderDraft({ ...providerDraft, credential_json_enc: v })}
                onChangeConfig={(v) => setProviderDraft({ ...providerDraft, config_json: v })}
              />
            </div>
          </div>

          <div className={sectionCardBase}>
             <label className="flex items-center gap-4 cursor-pointer group text-foreground">
               <Switch checked={providerDraft.enabled} onChange={(v) => setProviderDraft({ ...providerDraft, enabled: v })} />
               <div>
                  <div className="text-xs font-black uppercase tracking-widest group-hover:text-primary transition-colors opacity-80">{t('admin.domain.statusEnabled')}</div>
                  <div className="text-[9px] opacity-60 dark:opacity-30 font-bold uppercase tracking-tighter">Ready for DNS-01 and DDNS</div>
               </div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-white/5">
            <Button variant="outline" onClick={() => setProviderModalOpen(false)} className="h-14 px-8 rounded-2xl border-zinc-300 dark:border-white/5 bg-white dark:bg-white/5 font-black uppercase tracking-widest text-xs shadow-sm">{t('common.cancel')}</Button>
            <Button onClick={saveProviderQuick} className="h-14 px-10 rounded-2xl bg-gradient-to-br from-primary to-primary/90 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 border-t border-white/20 font-bold tracking-wider text-primary-foreground">{t('common.create')}</Button>
          </div>
        </div>
      </Modal>

      {/* ZeroSSL Modal */}
      <Modal isOpen={zerosslModalOpen} onClose={() => setZeroSslModalOpen(false)} title="ZeroSSL ACME 账户管理" maxWidth="max-w-xl">
        <div className="space-y-8 overflow-y-auto max-h-[80vh] p-1 scrollbar-hide">
          <div className={sectionCardBase}>
            <SectionHeader icon={LinkIcon} title={t('admin.acme.form.zerosslEab')} desc="External Account Binding" colorClass="bg-cyan-500/10 text-cyan-600 dark:text-cyan-500 border-cyan-500/20" />
            
            <div className="space-y-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-foreground/50 dark:text-foreground/40 ml-1">{t('admin.domain.remark')}</label>
                 <Input value={zerosslDraft.name} onChange={(e) => setZeroSslDraft({ ...zerosslDraft, name: e.target.value })} className={controlBase} />
              </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-foreground/50 dark:text-foreground/40 ml-1">{t('admin.domain.eabKid')}</label>
                 <Input value={zerosslDraft.eab_kid} onChange={(e) => setZeroSslDraft({ ...zerosslDraft, eab_kid: e.target.value })} className={cn(controlBase, "font-mono text-[11px] tracking-tight")} />
              </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-foreground/50 dark:text-foreground/40 ml-1">{t('admin.domain.eabHmac')}</label>
                 <Input type="password" value={zerosslDraft.eab_hmac_key} onChange={(e) => setZeroSslDraft({ ...zerosslDraft, eab_hmac_key: e.target.value })} className={cn(controlBase, "font-mono text-[11px] tracking-tight")} />
              </div>
            </div>
          </div>

          <div className={sectionCardBase}>
             <label className="flex items-center gap-4 cursor-pointer group text-foreground">
                <Switch checked={zerosslDraft.enabled} onChange={(v) => setZeroSslDraft({ ...zerosslDraft, enabled: v })} />
                <div>
                   <div className="text-xs font-black uppercase tracking-widest group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors opacity-80">{t('admin.domain.statusEnabled')}</div>
                   <div className="text-[9px] opacity-60 dark:opacity-30 font-bold uppercase tracking-tighter">Available for ZeroSSL issuance</div>
                </div>
             </label>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-white/5">
            <Button variant="outline" onClick={() => setZeroSslModalOpen(false)} className="h-14 px-8 rounded-2xl border-zinc-300 dark:border-white/5 bg-white dark:bg-white/5 font-black uppercase tracking-widest text-xs shadow-sm">{t('common.cancel')}</Button>
            <Button onClick={saveZeroSslQuick} className="h-14 px-10 rounded-2xl bg-gradient-to-br from-primary to-primary/90 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 border-t border-white/20 font-bold tracking-wider text-primary-foreground">{t('common.create')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DomainAcmeDdnsAdmin;
