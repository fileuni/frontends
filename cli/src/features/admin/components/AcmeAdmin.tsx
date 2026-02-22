import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Modal } from '@/components/ui/Modal.tsx';
import { Switch } from '@/components/ui/Switch.tsx';
import { client, extractData, handleApiError } from '@/lib/api.ts';
import { useToastStore } from '@fileuni/shared';
import { FileKey2, Plus, RefreshCw, Play, Trash2, Pencil, Save, ShieldCheck } from 'lucide-react';

type ChallengeType = 'dns01' | 'http01' | 'auto';
type CaProvider = 'letsencrypt' | 'zerossl' | 'letsencrypt_staging';
type DnsProviderProfile = {
  key: string;
  name: string;
  mode: string;
  id_label: string;
  secret_label: string;
  ext_param_label: string;
  help_url: string;
  config_snippet_json: string;
};

interface AcmeCertificateView {
  id: string;
  name: string;
  enabled: boolean;
  auto_renew: boolean;
  ca_provider: CaProvider;
  challenge_type: ChallengeType;
  domains_json: string;
  dns_provider: string;
  dns_provider_config_json: Record<string, unknown>;
  account_email: string;
  acme_home_dir: string;
  http_webroot: string;
  cert_path?: string | null;
  key_path?: string | null;
  fullchain_path?: string | null;
  expires_at?: string | null;
  last_status?: string | null;
  last_error?: string | null;
}

interface AcmeCertFileView {
  id: string;
  name: string;
  cert_path?: string | null;
  key_path?: string | null;
  fullchain_path?: string | null;
  expires_at?: string | null;
  last_status?: string | null;
}

interface AcmeRunResult {
  id: string;
  status: string;
  message: string;
  cert_path?: string | null;
  key_path?: string | null;
  fullchain_path?: string | null;
  expires_at?: string | null;
}

interface AcmeDraft {
  id?: string;
  name: string;
  enabled: boolean;
  auto_renew: boolean;
  ca_provider: CaProvider;
  challenge_type: ChallengeType;
  domains_text: string;
  dns_provider: string;
  dns_provider_config_json_text: string;
  account_email: string;
  acme_home_dir: string;
  http_webroot: string;
  dns_zone: string;
  dns_ttl: string;
  dns_provider_id: string;
  dns_provider_secret: string;
  dns_provider_ext: string;
  dns_api_token: string;
  dns_zone_id: string;
  dns_custom_params: string;
  zerossl_eab_kid: string;
  zerossl_eab_hmac_key: string;
  ca_directory_url: string;
  renew_jitter_max_sec: string;
  renew_dynamic_ratio_divisor: string;
  renew_short_lifetime_days: string;
  renew_short_lifetime_divisor: string;
}

const parseObjectJson = (raw: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
};

const toJsonText = (value: Record<string, unknown>): string => JSON.stringify(value, null, 2);

const toStringField = (value: unknown): string => (typeof value === 'string' ? value : '');

const toNumberField = (value: unknown): string => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return String(parsed);
    }
  }
  return '';
};

const buildDnsConfigFromDraft = (draft: AcmeDraft): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  if (draft.dns_zone.trim()) {
    out.zone = draft.dns_zone.trim();
  }
  if (draft.dns_ttl.trim()) {
    const parsedTtl = Number(draft.dns_ttl.trim());
    if (Number.isFinite(parsedTtl) && parsedTtl > 0) {
      out.ttl = parsedTtl;
    }
  }
  if (draft.dns_provider_id.trim()) {
    out.provider_id = draft.dns_provider_id.trim();
  }
  if (draft.dns_provider_secret.trim()) {
    out.provider_secret = draft.dns_provider_secret.trim();
  }
  if (draft.dns_provider_ext.trim()) {
    out.provider_ext = draft.dns_provider_ext.trim();
  }
  if (draft.dns_api_token.trim()) {
    out.api_token = draft.dns_api_token.trim();
  }
  if (draft.dns_zone_id.trim()) {
    out.zone_id = draft.dns_zone_id.trim();
  }
  if (draft.dns_custom_params.trim()) {
    out.ddns_custom_params = draft.dns_custom_params.trim();
  }
  if (draft.zerossl_eab_kid.trim()) {
    out.zerossl_eab_kid = draft.zerossl_eab_kid.trim();
  }
  if (draft.zerossl_eab_hmac_key.trim()) {
    out.zerossl_eab_hmac_key = draft.zerossl_eab_hmac_key.trim();
  }
  if (draft.ca_directory_url.trim()) {
    out.ca_directory_url = draft.ca_directory_url.trim();
  }
  if (draft.renew_jitter_max_sec.trim()) {
    out.renew_jitter_max_sec = Number(draft.renew_jitter_max_sec.trim());
  }
  if (draft.renew_dynamic_ratio_divisor.trim()) {
    out.renew_dynamic_ratio_divisor = Number(draft.renew_dynamic_ratio_divisor.trim());
  }
  if (draft.renew_short_lifetime_days.trim()) {
    out.renew_short_lifetime_days = Number(draft.renew_short_lifetime_days.trim());
  }
  if (draft.renew_short_lifetime_divisor.trim()) {
    out.renew_short_lifetime_divisor = Number(draft.renew_short_lifetime_divisor.trim());
  }
  return out;
};

const patchDraftWithDnsConfig = (draft: AcmeDraft, config: Record<string, unknown>): AcmeDraft => ({
  ...draft,
  dns_provider_config_json_text: toJsonText(config),
  dns_zone: toStringField(config.zone),
  dns_ttl: toNumberField(config.ttl),
  dns_provider_id: toStringField(config.provider_id),
  dns_provider_secret: toStringField(config.provider_secret),
  dns_provider_ext: toStringField(config.provider_ext),
  dns_api_token: toStringField(config.api_token),
  dns_zone_id: toStringField(config.zone_id),
  dns_custom_params: toStringField(config.ddns_custom_params),
  zerossl_eab_kid: toStringField(config.zerossl_eab_kid),
  zerossl_eab_hmac_key: toStringField(config.zerossl_eab_hmac_key),
  ca_directory_url: toStringField(config.ca_directory_url),
  renew_jitter_max_sec: toNumberField(config.renew_jitter_max_sec),
  renew_dynamic_ratio_divisor: toNumberField(config.renew_dynamic_ratio_divisor),
  renew_short_lifetime_days: toNumberField(config.renew_short_lifetime_days),
  renew_short_lifetime_divisor: toNumberField(config.renew_short_lifetime_divisor),
});

const buildDefaultDraft = (): AcmeDraft => ({
  name: 'new-cert',
  enabled: true,
  auto_renew: true,
  ca_provider: 'letsencrypt',
  challenge_type: 'auto',
  domains_text: 'example.com',
  dns_provider: 'cloudflare',
  dns_provider_config_json_text: '{\n  "zone": "example.com",\n  "api_token": "",\n  "zone_id": ""\n}',
  account_email: 'admin@example.com',
  acme_home_dir: './data/acme',
  http_webroot: './data/acme-http',
  dns_zone: 'example.com',
  dns_ttl: '',
  dns_provider_id: '',
  dns_provider_secret: '',
  dns_provider_ext: '',
  dns_api_token: '',
  dns_zone_id: '',
  dns_custom_params: '',
  zerossl_eab_kid: '',
  zerossl_eab_hmac_key: '',
  ca_directory_url: '',
  renew_jitter_max_sec: '',
  renew_dynamic_ratio_divisor: '',
  renew_short_lifetime_days: '',
  renew_short_lifetime_divisor: '',
});

const parseDomains = (domainsText: string): string[] =>
  Array.from(
    new Set(
      domainsText
        .split('\n')
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  );

const isIpIdentifier = (value: string): boolean => {
  const item = value.trim();
  if (!item) {
    return false;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(item)) {
    return true;
  }
  return item.includes(':');
};

const formatDomains = (domainsJson: string): string => {
  try {
    const domains = JSON.parse(domainsJson) as string[];
    if (Array.isArray(domains)) {
      return domains.join('\n');
    }
    return '';
  } catch {
    return '';
  }
};

const toDraft = (item: AcmeCertificateView): AcmeDraft => {
  const base: AcmeDraft = {
    id: item.id,
    name: item.name,
    enabled: item.enabled,
    auto_renew: item.auto_renew,
    ca_provider: item.ca_provider,
    challenge_type: item.challenge_type,
    domains_text: formatDomains(item.domains_json),
    dns_provider: item.dns_provider,
    dns_provider_config_json_text: JSON.stringify(item.dns_provider_config_json, null, 2),
    account_email: item.account_email,
    acme_home_dir: item.acme_home_dir,
    http_webroot: item.http_webroot,
    dns_zone: '',
    dns_ttl: '',
    dns_provider_id: '',
    dns_provider_secret: '',
    dns_provider_ext: '',
    dns_api_token: '',
    dns_zone_id: '',
    dns_custom_params: '',
    zerossl_eab_kid: '',
    zerossl_eab_hmac_key: '',
    ca_directory_url: '',
    renew_jitter_max_sec: '',
    renew_dynamic_ratio_divisor: '',
    renew_short_lifetime_days: '',
    renew_short_lifetime_divisor: '',
  };
  const parsed = parseObjectJson(base.dns_provider_config_json_text);
  return patchDraftWithDnsConfig(base, parsed);
};

export const AcmeAdmin: React.FC = () => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();

  const [items, setItems] = useState<AcmeCertificateView[]>([]);
  const [certFiles, setCertFiles] = useState<AcmeCertFileView[]>([]);
  const [dnsProfiles, setDnsProfiles] = useState<DnsProviderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draft, setDraft] = useState<AcmeDraft>(buildDefaultDraft());
  const [isZerosslEabExpanded, setIsZerosslEabExpanded] = useState(false);
  const [isRawJsonExpanded, setIsRawJsonExpanded] = useState(false);

  const stats = useMemo(() => {
    const enabled = items.filter((item) => item.enabled).length;
    const autoRenew = items.filter((item) => item.auto_renew).length;
    const success = items.filter((item) => item.last_status === 'success').length;
    return {
      total: items.length,
      enabled,
      autoRenew,
      success,
    };
  }, [items]);
  const isDnsConfigEnabled = draft.challenge_type !== 'http01';
  const dnsProfileByKey = useMemo(() => {
    const map = new Map<string, DnsProviderProfile>();
    for (const item of dnsProfiles) {
      map.set(item.key, item);
    }
    return map;
  }, [dnsProfiles]);
  const selectedDnsProfile = useMemo(() => dnsProfileByKey.get(draft.dns_provider.trim()), [dnsProfileByKey, draft.dns_provider]);
  const nativeDnsProfiles = useMemo(() => dnsProfiles.filter((item) => item.mode === 'native'), [dnsProfiles]);
  const genericDnsProfiles = useMemo(() => dnsProfiles.filter((item) => item.mode === 'generic'), [dnsProfiles]);
  const otherDnsProfiles = useMemo(() => dnsProfiles.filter((item) => item.mode !== 'native' && item.mode !== 'generic'), [dnsProfiles]);

  const loadAll = async () => {
    try {
      const certs = await extractData<AcmeCertificateView[]>(client.GET('/api/v1/admin/acme/certs'));
      setItems(Array.isArray(certs) ? certs : []);
      const files = await extractData<AcmeCertFileView[]>(client.GET('/api/v1/admin/acme/cert-files'));
      setCertFiles(Array.isArray(files) ? files : []);
      const providers = await extractData<DnsProviderProfile[]>(client.GET('/api/v1/admin/ddns/providers'));
      setDnsProfiles(Array.isArray(providers) ? providers : []);
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      await loadAll();
      setLoading(false);
    };
    run();
  }, []);

  const openCreate = () => {
    setDraft(buildDefaultDraft());
    setIsZerosslEabExpanded(false);
    setIsRawJsonExpanded(false);
    setIsModalOpen(true);
  };

  const openEdit = (item: AcmeCertificateView) => {
    const nextDraft = toDraft(item);
    setDraft(nextDraft);
    setIsZerosslEabExpanded(Boolean(nextDraft.zerossl_eab_kid.trim() || nextDraft.zerossl_eab_hmac_key.trim()));
    setIsRawJsonExpanded(false);
    setIsModalOpen(true);
  };

  const validateDraft = (value: AcmeDraft): string | null => {
    if (!value.name.trim()) {
      return t('admin.acme.validation.nameRequired');
    }
    if (!value.account_email.trim()) {
      return t('admin.acme.validation.emailRequired');
    }
    const domains = parseDomains(value.domains_text);
    if (domains.length === 0) {
      return t('admin.acme.validation.domainsRequired');
    }
    const hasWildcard = domains.some((item) => item.trim().startsWith('*.'));
    const hasIp = domains.some((item) => isIpIdentifier(item));
    if (hasWildcard && hasIp) {
      return t('admin.acme.validation.mixedWildcardIpNotSupported');
    }
    if (!value.acme_home_dir.trim()) {
      return t('admin.acme.validation.homeDirRequired');
    }
    if (value.challenge_type === 'http01' && !value.http_webroot.trim()) {
      return t('admin.acme.validation.httpWebrootRequired');
    }
    if (value.challenge_type === 'http01' && hasWildcard) {
      return t('admin.acme.validation.httpWildcardNotSupported');
    }
    if (value.challenge_type === 'dns01' && hasIp) {
      return t('admin.acme.validation.dnsIpNotSupported');
    }
    if (value.challenge_type !== 'http01' && !value.dns_provider.trim()) {
      return t('admin.acme.validation.dnsProviderRequired');
    }
    if (value.challenge_type !== 'http01') {
      try {
        const parsed = JSON.parse(value.dns_provider_config_json_text) as Record<string, unknown>;
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          return t('admin.acme.validation.dnsConfigInvalid');
        }
        const providerKey = value.dns_provider.trim();
        const profile = dnsProfileByKey.get(providerKey);
        const providerId = typeof parsed.provider_id === 'string' ? parsed.provider_id.trim() : '';
        const providerSecret = typeof parsed.provider_secret === 'string' ? parsed.provider_secret.trim() : '';
        const apiToken = typeof parsed.api_token === 'string' ? parsed.api_token.trim() : '';
        if (providerKey === 'cloudflare' && !apiToken) {
          return t('admin.acme.validation.apiTokenRequired');
        }
        if (profile) {
          if (profile.id_label.trim() && !providerId) {
            return t('admin.acme.validation.providerIdRequired');
          }
          if (profile.secret_label.trim() && !providerSecret) {
            return t('admin.acme.validation.providerSecretRequired');
          }
        }
      } catch {
        return t('admin.acme.validation.dnsConfigInvalid');
      }
    }
    return null;
  };

  const updateDraftByDnsForm = (next: Partial<AcmeDraft>) => {
    setDraft((current) => {
      const merged = { ...current, ...next };
      const parsed = buildDnsConfigFromDraft(merged);
      return { ...merged, dns_provider_config_json_text: toJsonText(parsed) };
    });
  };

  const syncDnsFormFromRawJson = () => {
    setDraft((current) => patchDraftWithDnsConfig(current, parseObjectJson(current.dns_provider_config_json_text)));
  };

  const applyProviderTemplate = () => {
    const profile = dnsProfileByKey.get(draft.dns_provider.trim());
    if (!profile || !profile.config_snippet_json.trim()) {
      addToast(t('admin.acme.form.providerTemplateMissing'), 'error');
      return;
    }
    const parsed = parseObjectJson(profile.config_snippet_json);
    if (Object.keys(parsed).length === 0) {
      addToast(t('admin.acme.form.providerTemplateInvalid'), 'error');
      return;
    }
    setDraft((current) => patchDraftWithDnsConfig(current, parsed));
  };

  const onProviderChange = (providerKey: string) => {
    setDraft((current) => {
      const profile = dnsProfileByKey.get(providerKey.trim());
      if (!profile) {
        return { ...current, dns_provider: providerKey };
      }
      const currentConfig = parseObjectJson(current.dns_provider_config_json_text);
      const hasConfig = Object.keys(currentConfig).length > 0;
      if (hasConfig) {
        return { ...current, dns_provider: providerKey };
      }
      const template = parseObjectJson(profile.config_snippet_json);
      if (Object.keys(template).length === 0) {
        return { ...current, dns_provider: providerKey };
      }
      return patchDraftWithDnsConfig({ ...current, dns_provider: providerKey }, template);
    });
  };

  const saveDraft = async () => {
    const error = validateDraft(draft);
    if (error) {
      addToast(error, 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        enabled: draft.enabled,
        auto_renew: draft.auto_renew,
        ca_provider: draft.ca_provider,
        challenge_type: draft.challenge_type,
        domains: parseDomains(draft.domains_text),
        dns_provider: draft.dns_provider.trim(),
        dns_provider_config_json: JSON.parse(draft.dns_provider_config_json_text),
        account_email: draft.account_email.trim(),
        acme_home_dir: draft.acme_home_dir.trim(),
        http_webroot: draft.http_webroot.trim(),
      };

      if (draft.id) {
        await extractData<AcmeCertificateView>(
          client.PUT('/api/v1/admin/acme/certs/{id}', {
            params: { path: { id: draft.id } },
            body: payload,
          }),
        );
      } else {
        await extractData<AcmeCertificateView>(
          client.POST('/api/v1/admin/acme/certs', {
            body: payload,
          }),
        );
      }

      await loadAll();
      setIsModalOpen(false);
      addToast(t('admin.acme.saveSuccess'), 'success');
    } catch (apiError) {
      addToast(handleApiError(apiError, t), 'error');
    } finally {
      setSaving(false);
    }
  };

  const runNow = async (id: string) => {
    setRunningId(id);
    try {
      const result = await extractData<AcmeRunResult>(
        client.POST('/api/v1/admin/acme/certs/{id}/run', {
          params: { path: { id } },
        }),
      );
      const message = result.status === 'success' ? t('admin.acme.runSuccess') : `${t('admin.acme.runFailed')}: ${result.message}`;
      addToast(message, result.status === 'success' ? 'success' : 'error');
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setRunningId(null);
    }
  };

  const deleteItem = async (item: AcmeCertificateView) => {
    const ok = window.confirm(t('admin.acme.deleteConfirm', { name: item.name }));
    if (!ok) {
      return;
    }
    try {
      await extractData<boolean>(
        client.DELETE('/api/v1/admin/acme/certs/{id}', {
          params: { path: { id: item.id } },
        }),
      );
      addToast(t('admin.acme.deleteSuccess'), 'success');
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="rounded-[2rem] border border-border bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600">
              <FileKey2 size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">{t('admin.acme.title')}</h2>
              <p className="text-sm font-bold uppercase tracking-wider opacity-60">{t('admin.acme.subtitle')}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={loadAll}>
              <RefreshCw size={16} className="mr-2" />
              {t('admin.acme.refresh')}
            </Button>
            <Button type="button" onClick={openCreate}>
              <Plus size={16} className="mr-2" />
              {t('admin.acme.newCert')}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-bold uppercase tracking-wider opacity-50">{t('admin.acme.stats.total')}</p>
          <p className="mt-2 text-2xl font-black">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-bold uppercase tracking-wider opacity-50">{t('admin.acme.stats.enabled')}</p>
          <p className="mt-2 text-2xl font-black text-emerald-600">{stats.enabled}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-bold uppercase tracking-wider opacity-50">{t('admin.acme.stats.autoRenew')}</p>
          <p className="mt-2 text-2xl font-black text-cyan-600">{stats.autoRenew}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-bold uppercase tracking-wider opacity-50">{t('admin.acme.stats.success')}</p>
          <p className="mt-2 text-2xl font-black text-teal-600">{stats.success}</p>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 text-sm font-black uppercase tracking-wider opacity-60 border-b border-border">
          <div className="col-span-2">{t('admin.acme.table.name')}</div>
          <div className="col-span-2">{t('admin.acme.table.domains')}</div>
          <div className="col-span-1">CA</div>
          <div className="col-span-1">Challenge</div>
          <div className="col-span-2">{t('admin.acme.table.expiresAt')}</div>
          <div className="col-span-1">{t('admin.acme.table.status')}</div>
          <div className="col-span-3 text-right">{t('admin.acme.table.actions')}</div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm opacity-60">{t('common.loading')}</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm opacity-60">{t('admin.acme.empty')}</div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-4 items-center text-sm">
                <div className="col-span-2 min-w-0">
                  <div className="font-bold truncate">{item.name}</div>
                  <div className="text-sm opacity-60 truncate">{item.id}</div>
                </div>
                <div className="col-span-2 text-sm opacity-80 whitespace-pre-line">
                  {formatDomains(item.domains_json)}
                </div>
                <div className="col-span-1 text-sm uppercase">{item.ca_provider}</div>
                <div className="col-span-1 text-sm uppercase">{item.challenge_type}</div>
                <div className="col-span-2 text-sm opacity-80">{item.expires_at || '-'}</div>
                <div className="col-span-1">
                  {item.last_status === 'success' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-bold"><ShieldCheck size={14} />OK</span>
                  ) : (
                    <span className="text-sm opacity-60">{item.last_status || '-'}</span>
                  )}
                </div>
                <div className="col-span-3 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => runNow(item.id)} disabled={runningId === item.id}>
                    {runningId === item.id ? <RefreshCw size={14} className="mr-1 animate-spin" /> : <Play size={14} className="mr-1" />}
                    {t('admin.acme.runNow')}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => openEdit(item)}>
                    <Pencil size={14} className="mr-1" />
                    {t('common.edit')}
                  </Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => deleteItem(item)}>
                    <Trash2 size={14} className="mr-1" />
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[1.5rem] border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 text-sm font-black uppercase tracking-wider opacity-60 border-b border-border">{t('admin.acme.localFiles')}</div>
        <div className="divide-y divide-border">
          {certFiles.length === 0 ? (
            <div className="p-6 text-sm opacity-60">{t('admin.acme.emptyFiles')}</div>
          ) : (
            certFiles.map((item) => (
              <div key={item.id} className="p-4 text-sm space-y-1">
                <div className="font-bold text-sm">{item.name}</div>
                <div>ID: {item.id}</div>
                <div>cert: {item.cert_path || '-'}</div>
                <div>key: {item.key_path || '-'}</div>
                <div>fullchain: {item.fullchain_path || '-'}</div>
                <div>expires: {item.expires_at || '-'}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={draft.id ? t('admin.acme.editCert') : t('admin.acme.newCert')} maxWidth="max-w-5xl">
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.name')}</label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="my-cert" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.accountEmail')}</label>
              <Input value={draft.account_email} onChange={(e) => setDraft({ ...draft, account_email: e.target.value })} placeholder="ops@example.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border p-3 flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.enabled')}</span>
              <Switch checked={draft.enabled} onChange={(v) => setDraft({ ...draft, enabled: v })} />
            </div>
            <div className="rounded-xl border border-border p-3 flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.autoRenew')}</span>
              <Switch checked={draft.auto_renew} onChange={(v) => setDraft({ ...draft, auto_renew: v })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.caProvider')}</label>
              <select className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" value={draft.ca_provider} onChange={(e) => setDraft({ ...draft, ca_provider: e.target.value as CaProvider })}>
                <option value="letsencrypt">Let's Encrypt</option>
                <option value="letsencrypt_staging">Let's Encrypt (Staging)</option>
                <option value="zerossl">ZeroSSL</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.challengeType')}</label>
              <select className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" value={draft.challenge_type} onChange={(e) => setDraft({ ...draft, challenge_type: e.target.value as ChallengeType })}>
                <option value="auto">auto</option>
                <option value="dns01">dns01</option>
                <option value="http01">http01</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.domains')}</label>
              <textarea className="min-h-[120px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={draft.domains_text} onChange={(e) => setDraft({ ...draft, domains_text: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.dnsProvider')}</label>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                <select
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  value={draft.dns_provider}
                  onChange={(e) => onProviderChange(e.target.value)}
                  disabled={!isDnsConfigEnabled}
                >
                  <option value="">{t('admin.acme.form.providerSelectPlaceholder')}</option>
                  {nativeDnsProfiles.length > 0 && (
                    <optgroup label={t('admin.acme.form.providerGroupNative')}>
                      {nativeDnsProfiles.map((profile) => (
                        <option key={profile.key} value={profile.key}>
                          {profile.key} ({profile.name})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {genericDnsProfiles.length > 0 && (
                    <optgroup label={t('admin.acme.form.providerGroupGeneric')}>
                      {genericDnsProfiles.map((profile) => (
                        <option key={profile.key} value={profile.key}>
                          {profile.key} ({profile.name})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {otherDnsProfiles.length > 0 && (
                    <optgroup label={t('admin.acme.form.providerGroupOther')}>
                      {otherDnsProfiles.map((profile) => (
                        <option key={profile.key} value={profile.key}>
                          {profile.key} ({profile.name})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <Button type="button" variant="outline" onClick={applyProviderTemplate} disabled={!isDnsConfigEnabled}>
                  {t('admin.acme.form.useProviderTemplate')}
                </Button>
              </div>
              <p className="text-sm opacity-60">
                {selectedDnsProfile?.name || t('admin.acme.form.providerNotFound')}
              </p>
              {selectedDnsProfile?.help_url && (
                <a className="inline-block text-sm text-teal-600 underline underline-offset-2" href={selectedDnsProfile.help_url} target="_blank" rel="noreferrer">
                  {t('admin.acme.form.providerDoc')}
                </a>
              )}
              <label className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.httpWebroot')}</label>
              <Input value={draft.http_webroot} onChange={(e) => setDraft({ ...draft, http_webroot: e.target.value })} placeholder="./data/acme-http" />
              <label className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.homeDir')}</label>
              <Input value={draft.acme_home_dir} onChange={(e) => setDraft({ ...draft, acme_home_dir: e.target.value })} placeholder="./data/acme" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`space-y-2 rounded-xl border border-border p-3 ${isDnsConfigEnabled ? '' : 'opacity-60'}`}>
              <div className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.dnsConfigBasic')}</div>
              <label className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.zone')}</label>
              <Input value={draft.dns_zone} onChange={(e) => updateDraftByDnsForm({ dns_zone: e.target.value })} placeholder="example.com" disabled={!isDnsConfigEnabled} />
              <label className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.ttl')}</label>
              <Input value={draft.dns_ttl} onChange={(e) => updateDraftByDnsForm({ dns_ttl: e.target.value })} placeholder="120" disabled={!isDnsConfigEnabled} />
              {draft.dns_provider === 'cloudflare' && (
                <>
                  <label className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.apiToken')}</label>
                  <Input value={draft.dns_api_token} onChange={(e) => updateDraftByDnsForm({ dns_api_token: e.target.value })} placeholder="token" disabled={!isDnsConfigEnabled} />
                  <label className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.zoneId')}</label>
                  <Input value={draft.dns_zone_id} onChange={(e) => updateDraftByDnsForm({ dns_zone_id: e.target.value })} placeholder="zone_id_optional" disabled={!isDnsConfigEnabled} />
                </>
              )}
              <label className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.customParams')}</label>
              <Input value={draft.dns_custom_params} onChange={(e) => updateDraftByDnsForm({ dns_custom_params: e.target.value })} placeholder="key1=v1&key2=v2" disabled={!isDnsConfigEnabled} />
            </div>

            <div className={`space-y-2 rounded-xl border border-border p-3 ${isDnsConfigEnabled ? '' : 'opacity-60'}`}>
              <div className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.dnsConfigCredential')}</div>
              {draft.dns_provider !== 'cloudflare' && (
                <>
                  {selectedDnsProfile?.id_label?.trim() && (
                    <>
                      <label className="text-sm font-bold uppercase tracking-wider opacity-70">{selectedDnsProfile.id_label} *</label>
                      <Input value={draft.dns_provider_id} onChange={(e) => updateDraftByDnsForm({ dns_provider_id: e.target.value })} placeholder="provider_id" disabled={!isDnsConfigEnabled} />
                    </>
                  )}
                  {selectedDnsProfile?.secret_label?.trim() && (
                    <>
                      <label className="text-sm font-bold uppercase tracking-wider opacity-70">{selectedDnsProfile.secret_label} *</label>
                      <Input value={draft.dns_provider_secret} onChange={(e) => updateDraftByDnsForm({ dns_provider_secret: e.target.value })} placeholder="provider_secret" disabled={!isDnsConfigEnabled} />
                    </>
                  )}
                  {selectedDnsProfile?.ext_param_label?.trim() && (
                    <>
                      <label className="text-sm font-bold uppercase tracking-wider opacity-70">{selectedDnsProfile.ext_param_label}</label>
                      <Input value={draft.dns_provider_ext} onChange={(e) => updateDraftByDnsForm({ dns_provider_ext: e.target.value })} placeholder="provider_ext_optional" disabled={!isDnsConfigEnabled} />
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-border p-3">
            <div className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.advancedRenewal')}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.caDirectoryUrl')}</label>
                <Input value={draft.ca_directory_url} onChange={(e) => updateDraftByDnsForm({ ca_directory_url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.renewJitterMaxSec')}</label>
                <Input value={draft.renew_jitter_max_sec} onChange={(e) => updateDraftByDnsForm({ renew_jitter_max_sec: e.target.value })} placeholder="600" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.renewDynamicRatioDivisor')}</label>
                <Input value={draft.renew_dynamic_ratio_divisor} onChange={(e) => updateDraftByDnsForm({ renew_dynamic_ratio_divisor: e.target.value })} placeholder="3" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.renewShortLifetimeDays')}</label>
                <Input value={draft.renew_short_lifetime_days} onChange={(e) => updateDraftByDnsForm({ renew_short_lifetime_days: e.target.value })} placeholder="10" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.renewShortLifetimeDivisor')}</label>
                <Input value={draft.renew_short_lifetime_divisor} onChange={(e) => updateDraftByDnsForm({ renew_short_lifetime_divisor: e.target.value })} placeholder="2" />
              </div>
            </div>
          </div>

          {draft.ca_provider === 'zerossl' && (
            <div className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.zerosslEab')}</div>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsZerosslEabExpanded((v) => !v)}>
                  {isZerosslEabExpanded ? t('admin.acme.form.hideAdvanced') : t('admin.acme.form.showAdvanced')}
                </Button>
              </div>
              <p className="text-sm opacity-60">{t('admin.acme.form.zerosslEabHint')}</p>
              {isZerosslEabExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.zerosslEabKid')}</label>
                    <Input value={draft.zerossl_eab_kid} onChange={(e) => updateDraftByDnsForm({ zerossl_eab_kid: e.target.value })} placeholder="eab_kid_optional" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.zerosslEabHmacKey')}</label>
                    <Input value={draft.zerossl_eab_hmac_key} onChange={(e) => updateDraftByDnsForm({ zerossl_eab_hmac_key: e.target.value })} placeholder="eab_hmac_key_optional" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 rounded-xl border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-bold uppercase tracking-wider opacity-70">{t('admin.acme.form.dnsConfigJson')}</label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsRawJsonExpanded((v) => !v)} disabled={!isDnsConfigEnabled}>
                  {isRawJsonExpanded ? t('admin.acme.form.hideRawJson') : t('admin.acme.form.showRawJson')}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={syncDnsFormFromRawJson} disabled={!isDnsConfigEnabled || !isRawJsonExpanded}>
                  {t('admin.acme.form.syncFromJson')}
                </Button>
              </div>
            </div>
            <p className="text-sm opacity-60">{t('admin.acme.form.syncHint')}</p>
            {isRawJsonExpanded && (
              <>
                <textarea
                  className="min-h-[160px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                  value={draft.dns_provider_config_json_text}
                  onChange={(e) => setDraft({ ...draft, dns_provider_config_json_text: e.target.value })}
                  disabled={!isDnsConfigEnabled}
                />
                <p className="text-sm opacity-60">{t('admin.acme.form.rawJsonWarning')}</p>
              </>
            )}
            {!isRawJsonExpanded && (
              <Button type="button" variant="outline" size="sm" onClick={() => setIsRawJsonExpanded(true)} disabled={!isDnsConfigEnabled}>
                {t('admin.acme.form.showRawJson')}
              </Button>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
            <Button type="button" onClick={saveDraft} disabled={saving}>
              {saving ? <RefreshCw size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AcmeAdmin;
