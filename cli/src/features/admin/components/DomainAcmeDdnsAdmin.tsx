import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@fileuni/shared';
import { client, extractData, handleApiError } from '@/lib/api';
import { useToastStore } from '@fileuni/shared';
import { ProviderForm } from './domain/ProviderForm';
import { DdnsSourceForm } from './domain/DdnsSourceForm';
import { CertificateForm } from './domain/CertificateForm';
import { KeyValueForm, parseJsonObjectToStringMap } from './domain/KeyValueForm';
import { 
  Globe, ShieldCheck, Plus, RefreshCw, 
  Trash2, Edit3, Play, Activity, ScrollText,
  Server, Calendar, Link as LinkIcon, XCircle, 
  Info, Network, Key, MoreHorizontal, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type DomainAcmeDdnsView,
  type ProviderProfileItem,
  type ProviderAccountItem,
  type DdnsEntryItem,
  type DdnsRunLogItem,
  type DdnsCheckResult,
  type DdnsEntryInspectResult,
  type DdnsPlanResponse,
  type CertRunLogItem,
  type CertPreflightResult,
  type CertTestDns01Result,
  type CertPlanResponse,
  type CertificateItem,
  type CertRunAllCheckResponse,
  type ZeroSslAccountItem,
  type ProviderTestDnsResult,
  type ProviderTestAuthResult,
  type ProviderAccountPayload,
  type DdnsPlanRequest,
  type CertPlanPayload,
  type ProviderDraft,
  type DdnsDraft,
  type SslDraft,
  type ZeroSslDraft,
  type RowActionsTarget,
  isDdnsEntryItem,
  newProviderDraft,
  newDdnsDraft,
  newSslDraft,
  newZeroSslDraft,
  normalizeChallengeType,
} from './domain/types';
import type { CertificatePayload, DdnsEntryPayload } from './domain/types';
import { parseItemsAndTotal } from './domain/paginated';
import {
  controlBase,
  sectionCardBase,
  selectBase,
  selectStyle,
  SectionHeader,
  StatusBadge,
} from './domain/presentation';
import { DdnsLogsModal } from './domain/modals/DdnsLogsModal';
import { CertLogsModal } from './domain/modals/CertLogsModal';
import { DdnsCheckModal } from './domain/modals/DdnsCheckModal';
import { DdnsInspectModal } from './domain/modals/DdnsInspectModal';
import { DdnsPlanModal } from './domain/modals/DdnsPlanModal';
import { CertCheckModal } from './domain/modals/CertCheckModal';
import { CertPlanModal } from './domain/modals/CertPlanModal';
import { RowActionsModal } from './domain/modals/RowActionsModal';

interface DomainAcmeDdnsAdminProps {
  view: DomainAcmeDdnsView;
}




const fetchZeroSslAccounts = async (): Promise<ZeroSslAccountItem[]> => {
  return extractData<ZeroSslAccountItem[]>(client.GET('/api/v1/admin/domain-acme-ddns/zerossl/accounts'));
};

const createZeroSslAccount = async (payload: ZeroSslDraft): Promise<ZeroSslAccountItem> => {
  return extractData<ZeroSslAccountItem>(client.POST('/api/v1/admin/domain-acme-ddns/zerossl/accounts', { 
    body: payload 
  }));
};

export const DomainAcmeDdnsAdmin: React.FC<DomainAcmeDdnsAdminProps> = ({ view }) => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState(false);
  const [runningDdnsById, setRunningDdnsById] = useState<Record<string, boolean>>({});
  const [runningDdnsAll, setRunningDdnsAll] = useState(false);
  const [runningSslById, setRunningSslById] = useState<Record<string, boolean>>({});
  const [runningSslAll, setRunningSslAll] = useState(false);
  const [providerProfiles, setProviderProfiles] = useState<ProviderProfileItem[]>([]);
  const [providers, setProviders] = useState<ProviderAccountItem[]>([]);
  const [ddnsEntries, setDdnsEntries] = useState<DdnsEntryItem[]>([]);
  const [ddnsTotal, setDdnsTotal] = useState(0);
  const [ddnsPage, setDdnsPage] = useState(1);
  const [ddnsPageSize, setDdnsPageSize] = useState(20);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [certTotal, setCertTotal] = useState(0);
  const [certPage, setCertPage] = useState(1);
  const [certPageSize, setCertPageSize] = useState(20);
  const [zerosslAccounts, setZeroSslAccounts] = useState<ZeroSslAccountItem[]>([]);

  const [logOpen, setLogOpen] = useState(false);
  const [logEntry, setLogEntry] = useState<DdnsEntryItem | null>(null);
  const [logLoading, setLogLoading] = useState(false);
  const [logItems, setLogItems] = useState<DdnsRunLogItem[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(20);

  const [certLogOpen, setCertLogOpen] = useState(false);
  const [certLogCert, setCertLogCert] = useState<CertificateItem | null>(null);
  const [certLogLoading, setCertLogLoading] = useState(false);
  const [certLogItems, setCertLogItems] = useState<CertRunLogItem[]>([]);
  const [certLogTotal, setCertLogTotal] = useState(0);
  const [certLogPage, setCertLogPage] = useState(1);
  const [certLogPageSize, setCertLogPageSize] = useState(20);

  const [rowActionsOpen, setRowActionsOpen] = useState<RowActionsTarget | null>(null);

  const [ddnsCheckOpen, setDdnsCheckOpen] = useState(false);
  const [ddnsCheckLoading, setDdnsCheckLoading] = useState(false);
  const [ddnsCheckResult, setDdnsCheckResult] = useState<DdnsCheckResult | null>(null);

  const [ddnsInspectOpen, setDdnsInspectOpen] = useState(false);
  const [ddnsInspectLoading, setDdnsInspectLoading] = useState(false);
  const [ddnsInspectResult, setDdnsInspectResult] = useState<DdnsEntryInspectResult | null>(null);

  const [ddnsPlanOpen, setDdnsPlanOpen] = useState(false);
  const [ddnsPlanLoading, setDdnsPlanLoading] = useState(false);
  const [ddnsPlanData, setDdnsPlanData] = useState<DdnsPlanResponse | null>(null);

  const [certCheckOpen, setCertCheckOpen] = useState(false);
  const [certCheckLoading, setCertCheckLoading] = useState(false);
  const [certCheckResult, setCertCheckResult] = useState<CertPreflightResult | null>(null);

  const [certPlanOpen, setCertPlanOpen] = useState(false);
  const [certPlanLoading, setCertPlanLoading] = useState(false);
  const [certPlanData, setCertPlanData] = useState<CertPlanResponse | null>(null);

  const [certDns01TestRunning, setCertDns01TestRunning] = useState(false);

  const [bulkCreateOpen, setBulkCreateOpen] = useState(false);

  const [featureFlags, setFeatureFlags] = useState<{
    moduleEnabled: boolean;
    ddnsEnabled: boolean;
    sslEnabled: boolean;
    ddnsSchedulerEnabled: boolean;
    sslSchedulerEnabled: boolean;
  } | null>(null);

  const [ddnsModalOpen, setDdnsModalOpen] = useState(false);
  const [sslModalOpen, setSslModalOpen] = useState(false);
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [zerosslModalOpen, setZeroSslModalOpen] = useState(false);

  const [ddnsFqdnHelper, setDdnsFqdnHelper] = useState('');

  const [providerTestZone, setProviderTestZone] = useState('');
  const [providerTestHost, setProviderTestHost] = useState('_fileuni_verify');
  const [providerTestRunning, setProviderTestRunning] = useState(false);
  const [providerAuthTestRunning, setProviderAuthTestRunning] = useState(false);

  const [providerDraft, setProviderDraft] = useState<ProviderDraft>(newProviderDraft());
  const [showProviderList, setShowProviderList] = useState(true);
  const [ddnsDraft, setDdnsDraft] = useState<DdnsDraft>(newDdnsDraft());
  const [sslDraft, setSslDraft] = useState<SslDraft>(newSslDraft());
  const [zerosslDraft, setZeroSslDraft] = useState<ZeroSslDraft>(newZeroSslDraft());

  const acmeProviders = useMemo(() => {
    const set = new Set(
      providerProfiles
        .filter((p) => p.vendor_type === 'domain' || p.supports_acme_dns01)
        .map((p) => p.key),
    );
    return providers.filter((p) => set.has(p.provider_key));
  }, [providers, providerProfiles]);

  const acmeDns01Providers = useMemo(() => {
    const set = new Set(providerProfiles.filter((p) => p.supports_acme_dns01).map((p) => p.key));
    return acmeProviders.filter((p) => set.has(p.provider_key));
  }, [acmeProviders, providerProfiles]);

  const ddnsProviders = useMemo(() => {
    const set = new Set(
      providerProfiles
        .filter((p) => p.supports_ddns)
        .map((p) => p.key),
    );
    return providers.filter((p) => set.has(p.provider_key));
  }, [providers, providerProfiles]);

  const providerProfilesForCurrentView = useMemo(() => {
    if (view === 'ddns') {
      return providerProfiles.filter((p) => p.supports_ddns);
    }
    return providerProfiles.filter((p) => p.vendor_type === 'domain' || p.supports_acme_dns01);
  }, [providerProfiles, view]);

  const providerProfileMap = useMemo(
    () => new Map(providerProfiles.map((p) => [p.key, p])),
    [providerProfiles],
  );

  const providerDraftProfile = useMemo(() => {
    return providerProfileMap.get(providerDraft.provider_key) || null;
  }, [providerProfileMap, providerDraft.provider_key]);

  const providerDraftAccount = useMemo(() => {
    if (!providerDraft.id) return null;
    return providers.find((p) => p.id === providerDraft.id) || null;
  }, [providers, providerDraft.id]);

  const providersForCurrentView = useMemo(() => {
    if (view === 'ddns') {
      return ddnsProviders;
    }
    return acmeProviders;
  }, [view, ddnsProviders, acmeProviders]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const isDdnsView = view === 'ddns';
      const isSslView = view === 'ssl';
      const [profileData, providerData, ddnsDataRaw, certDataRaw, zerosslData, configData] = await Promise.all([
        extractData<ProviderProfileItem[]>(client.GET('/api/v1/admin/domain-acme-ddns/providers/profiles')),
        extractData<ProviderAccountItem[]>(client.GET('/api/v1/admin/domain-acme-ddns/providers/accounts')),
        isDdnsView
          ? extractData<unknown>(client.GET('/api/v1/admin/domain-acme-ddns/ddns/entries', {
              params: { query: { page: ddnsPage, page_size: ddnsPageSize } },
            }))
          : Promise.resolve(null),
        isSslView
          ? extractData<unknown>(client.GET('/api/v1/admin/domain-acme-ddns/certs', {
              params: { query: { page: certPage, page_size: certPageSize } },
            }))
          : Promise.resolve(null),
        fetchZeroSslAccounts(),
        extractData<Record<string, unknown>>(client.GET('/api/v1/admin/system/config')),
      ]);
      setProviderProfiles(Array.isArray(profileData) ? profileData : []);
      setProviders(Array.isArray(providerData) ? providerData : []);
      if (isDdnsView) {
        const { items, total } = parseItemsAndTotal<DdnsEntryItem>(ddnsDataRaw);
        setDdnsEntries(items);
        setDdnsTotal(total);
      }
      if (isSslView) {
        const { items, total } = parseItemsAndTotal<CertificateItem>(certDataRaw);
        setCertificates(items);
        setCertTotal(total);
      }
      setZeroSslAccounts(Array.isArray(zerosslData) ? zerosslData : []);

      const getBool = (root: unknown, path: string[]): boolean | null => {
        let cur: unknown = root;
        for (const key of path) {
          if (typeof cur !== 'object' || cur === null) return null;
          const rec = cur as Record<string, unknown>;
          cur = rec[key];
        }
        return typeof cur === 'boolean' ? cur : null;
      };
       // The admin system config endpoint may return a subset of config fields.
       // If a flag is missing, treat it as "unknown" and keep the UI visible.
       const moduleEnabled = getBool(configData, ['domain_acme_ddns', 'enabled']) ?? true;
       const ddnsJobEnabled = getBool(configData, ['task_registry', 'domain_ddns_sync_check', 'enabled']) ?? true;
       const sslJobEnabled = getBool(configData, ['task_registry', 'domain_acme_renewal_check', 'enabled']) ?? true;
       setFeatureFlags({
         moduleEnabled,
         // Manual operations should be allowed when module is enabled.
         // Scheduler enable is tracked separately and only affects auto-run.
         ddnsEnabled: moduleEnabled,
         sslEnabled: moduleEnabled,
         ddnsSchedulerEnabled: ddnsJobEnabled,
         sslSchedulerEnabled: sslJobEnabled,
       });
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setLoading(false);
    }
  };

  const runDdns = async (id: string) => {
    if (runningDdnsAll || runningDdnsById[id]) return;
    setRunningDdnsById((prev) => ({ ...prev, [id]: true }));
    try {
      addToast(t('common.loading'), 'info');
      await extractData(client.POST('/api/v1/admin/domain-acme-ddns/ddns/entries/{id}/run', { params: { path: { id } } }));
      addToast(t('admin.domain.ddnsRunCompleted'), 'success');
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setRunningDdnsById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const runDdnsAll = async () => {
    if (runningDdnsAll) return;
    setRunningDdnsAll(true);
    try {
      addToast(t('common.loading'), 'info');
      await extractData(client.POST('/api/v1/admin/domain-acme-ddns/ddns/run-all'));
      addToast(t('admin.domain.ddnsRunAllCompleted'), 'success');
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setRunningDdnsAll(false);
    }
  };

  const checkDdns = async (id: string) => {
    if (ddnsCheckLoading) return;
    setDdnsCheckLoading(true);
    try {
      const data = await extractData<DdnsCheckResult>(
        client.POST('/api/v1/admin/domain-acme-ddns/ddns/entries/{id}/check', { params: { path: { id } } }),
      );
      setDdnsCheckResult(data);
      setDdnsCheckOpen(true);
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setDdnsCheckLoading(false);
    }
  };

  const inspectDdns = async (id: string) => {
    if (ddnsInspectLoading) return;
    setDdnsInspectLoading(true);
    try {
      const data = await extractData<DdnsEntryInspectResult>(
        client.POST('/api/v1/admin/domain-acme-ddns/ddns/entries/{id}/inspect', {
          params: { path: { id } },
        }),
      );
      setDdnsInspectResult(data);
      setDdnsInspectOpen(true);
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setDdnsInspectLoading(false);
    }
  };

  const loadDdnsPlan = async (openModal: boolean) => {
    if (ddnsPlanLoading) return;
    setDdnsPlanLoading(true);
    try {
      const req: DdnsPlanRequest = { limit: 200 };
      const data = await extractData<DdnsPlanResponse>(
        client.POST('/api/v1/admin/domain-acme-ddns/ddns/plan', {
          body: req,
        }),
      );
      setDdnsPlanData(data);
      if (openModal) setDdnsPlanOpen(true);
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setDdnsPlanLoading(false);
    }
  };

  const checkCert = async (id: string) => {
    if (certCheckLoading) return;
    setCertCheckLoading(true);
    try {
      const data = await extractData<CertPreflightResult>(
        client.POST('/api/v1/admin/domain-acme-ddns/certs/{id}/check', { params: { path: { id } } }),
      );
      setCertCheckResult(data);
      setCertCheckOpen(true);
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setCertCheckLoading(false);
    }
  };

  const loadCertPlan = async (openModal: boolean) => {
    if (certPlanLoading) return;
    setCertPlanLoading(true);
    try {
      const req: CertPlanPayload = { force_update: false };
      const data = await extractData<CertPlanResponse>(
        client.POST('/api/v1/admin/domain-acme-ddns/certs/plan', {
          body: req,
        }),
      );
      setCertPlanData(data);
      if (openModal) setCertPlanOpen(true);
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setCertPlanLoading(false);
    }
  };

  const testCertDns01 = async () => {
    if (!sslDraft.id) {
      addToast(t('admin.domain.saveCertFirst') || 'Save certificate first', 'error');
      return;
    }
    if (certDns01TestRunning) return;
    setCertDns01TestRunning(true);
    try {
      const res = await extractData<CertTestDns01Result>(
        client.POST('/api/v1/admin/domain-acme-ddns/certs/{id}/test-dns01', {
          params: { path: { id: sslDraft.id } },
        }),
      );
      addToast(res.message, res.observed ? 'success' : 'info');
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setCertDns01TestRunning(false);
    }
  };

  const openLogs = (entry: DdnsEntryItem) => {
    setLogEntry(entry);
    setLogPage(1);
    setLogOpen(true);
  };

  const openCertLogs = (cert: CertificateItem) => {
    setCertLogCert(cert);
    setCertLogPage(1);
    setCertLogOpen(true);
  };

  React.useEffect(() => {
    if (!logOpen || !logEntry) return undefined;
    let cancelled = false;
    (async () => {
      setLogLoading(true);
      try {
        const data = await extractData<unknown>(
          client.GET('/api/v1/admin/domain-acme-ddns/ddns/entries/{id}/logs', {
            params: {
              path: { id: logEntry.id },
              query: {
                page: logPage,
                page_size: logPageSize,
              },
            },
          }),
        );
        if (cancelled) return;
        const parsed = parseItemsAndTotal<DdnsRunLogItem>(data);
        setLogItems(parsed.items);
        setLogTotal(parsed.total);
      } catch (error) {
        if (!cancelled) addToast(handleApiError(error, t), 'error');
      } finally {
        if (!cancelled) setLogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [logOpen, logEntry?.id, logPage, logPageSize]);

  React.useEffect(() => {
    if (!certLogOpen || !certLogCert) return undefined;
    let cancelled = false;
    (async () => {
      setCertLogLoading(true);
      try {
        const data = await extractData<unknown>(
          client.GET('/api/v1/admin/domain-acme-ddns/certs/{id}/logs', {
            params: {
              path: { id: certLogCert.id },
              query: {
                page: certLogPage,
                page_size: certLogPageSize,
              },
            },
          }),
        );
        if (cancelled) return;
        const parsed = parseItemsAndTotal<CertRunLogItem>(data);
        setCertLogItems(parsed.items);
        setCertLogTotal(parsed.total);
      } catch (error) {
        if (!cancelled) addToast(handleApiError(error, t), 'error');
      } finally {
        if (!cancelled) setCertLogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [certLogOpen, certLogCert?.id, certLogPage, certLogPageSize]);

  React.useEffect(() => {
    loadAll();
  }, [ddnsPage, ddnsPageSize, certPage, certPageSize, view]);

  const openCreateDdns = () => {
    if (ddnsTotal >= 100) {
      addToast(t('admin.domain.ddnsLimitReached') || 'DDNS entries limit reached (max=100)', 'error');
      return;
    }
    setDdnsDraft(newDdnsDraft());
    setBulkCreateOpen(false);
    setDdnsModalOpen(true);
  };

  const openEditDdns = (item: DdnsEntryItem) => {
    setDdnsDraft({
      id: item.id,
      name: item.name,
      provider_account_id: item.provider_account_id,
      fqdns: '',
      zone: item.zone,
      host: item.host,
      ttl: item.ttl,
      proxied: item.proxied,
      enabled: item.enabled,
      ipv4_enabled: item.ipv4_enabled,
      ipv6_enabled: item.ipv6_enabled,
      ipv4_source_json: item.ipv4_source_json,
      ipv6_source_json: item.ipv6_source_json,
      webhook_json: item.webhook_json || '{}',
      force_update: item.force_update || false,
    });
    setBulkCreateOpen(false);
    setDdnsModalOpen(true);
  };

  const saveDdns = async () => {
    if (!ddnsDraft.name.trim() || !ddnsDraft.provider_account_id.trim()) {
      addToast(t('admin.domain.ddnsRequired'), 'error');
      return;
    }

    const zone = ddnsDraft.zone.trim().replace(/\.+$/g, '');
    const hostRaw = ddnsDraft.host.trim().replace(/\.+$/g, '');
    const host = hostRaw ? hostRaw : '@';
    const ttl = Number(ddnsDraft.ttl);
    if (!zone || !host) {
      addToast(t('admin.domain.ddnsTargetRequired') || 'Zone and host are required', 'error');
      return;
    }
    if (!Number.isFinite(ttl) || ttl < 60 || ttl > 86400) {
      addToast(t('admin.domain.invalidTtl') || 'TTL must be between 60 and 86400', 'error');
      return;
    }

    const normHost = (h: string) => {
      const v = (h || '').trim().replace(/\.+$/g, '');
      return v ? v : '@';
    };
    const buildFqdn = (z: string, h: string) => (h === '@' ? z : `${h}.${z}`);

    let webhookJson = '{}';
    try {
      const s = (ddnsDraft.webhook_json || '').trim();
      if (s) {
        const v = JSON.parse(s);
        if (!v || typeof v !== 'object' || Array.isArray(v)) {
          throw new Error('not object');
        }
        webhookJson = s;
      }
    } catch {
      addToast(t('admin.domain.invalidJson') || 'Invalid JSON', 'error');
      return;
    }

    try {
      if (ddnsDraft.id) {
        // Edit mode (single entry)
        const fqdn = buildFqdn(zone, host);
        const payload: DdnsEntryPayload = {
          name: ddnsDraft.name.trim(),
          enabled: ddnsDraft.enabled,
          provider_account_id: ddnsDraft.provider_account_id,
          zone,
          host,
          fqdn,
          ttl,
          proxied: ddnsDraft.proxied,
          ipv4_enabled: ddnsDraft.ipv4_enabled,
          ipv6_enabled: ddnsDraft.ipv6_enabled,
          ipv4_source_json: ddnsDraft.ipv4_source_json,
          ipv6_source_json: ddnsDraft.ipv6_source_json,
          webhook_json: webhookJson,
          force_update: ddnsDraft.force_update,
        };
        await extractData(client.PUT('/api/v1/admin/domain-acme-ddns/ddns/entries/{id}', { params: { path: { id: ddnsDraft.id } }, body: payload }));
        addToast(t('admin.domain.ddnsUpdated'), 'success');
      } else {
        const createdIds: string[] = [];
        const hostLines = ddnsDraft.fqdns
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l);

        const targets = hostLines.length > 0
          ? hostLines.map((line) => {
              const parts = line.split(',').map((p) => p.trim()).filter((p) => p);
              const h = normHost(parts[0] || '');
              const t = parts[1] ? Number(parts[1]) : ttl;
              return { host: h, ttl: t };
            })
          : [{ host: normHost(host), ttl }];

        if (targets.some((x) => !x.host)) {
          addToast(t('admin.domain.ddnsHostListInvalid') || 'Hosts list is invalid', 'error');
          return;
        }

        if (targets.some((x) => !Number.isFinite(x.ttl) || x.ttl < 60 || x.ttl > 86400)) {
          addToast(t('admin.domain.invalidTtl') || 'TTL must be between 60 and 86400', 'error');
          return;
        }

        addToast(`正在创建 ${targets.length} 个条目...`, 'info');
        for (const target of targets) {
          const fqdn = buildFqdn(zone, target.host);
          const payload: DdnsEntryPayload = {
            name: targets.length > 1 ? `${ddnsDraft.name.trim()} - ${fqdn}` : ddnsDraft.name.trim(),
            enabled: ddnsDraft.enabled,
            provider_account_id: ddnsDraft.provider_account_id,
            zone,
            host: target.host,
            fqdn,
            ttl: target.ttl,
            proxied: ddnsDraft.proxied,
            ipv4_enabled: ddnsDraft.ipv4_enabled,
            ipv6_enabled: ddnsDraft.ipv6_enabled,
            ipv4_source_json: ddnsDraft.ipv4_source_json,
            ipv6_source_json: ddnsDraft.ipv6_source_json,
            webhook_json: webhookJson,
            force_update: ddnsDraft.force_update,
          };
          const created = await extractData<DdnsEntryItem>(
            client.POST('/api/v1/admin/domain-acme-ddns/ddns/entries', { body: payload }),
          );
          createdIds.push(created.id);
        }
        addToast(t('admin.domain.ddnsCreated'), 'success');
        setDdnsModalOpen(false);
        await loadAll();

        // Best-practice: show diagnostics immediately after creation.
        if (createdIds.length > 0) {
          await inspectDdns(createdIds[0]);
        }

        if (createdIds.length > 0 && window.confirm(t('admin.domain.ddnsSavedRunNowConfirm') || 'Saved successfully. Run once now?')) {
          for (const id of createdIds) {
            // run sequentially to avoid provider burst
            await runDdns(id);
          }
        }
        return;
      }
      setDdnsModalOpen(false);
      await loadAll();

      if (ddnsDraft.enabled && ddnsDraft.id) {
        await inspectDdns(ddnsDraft.id);
      }
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
      challenge_type: normalizeChallengeType(item.challenge_type),
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
      const parseJson = (raw: string): { ok: boolean; value: unknown } => {
        const s = (raw || '').trim();
        if (!s) return { ok: true, value: null };
        try {
          return { ok: true, value: JSON.parse(s) as unknown };
        } catch {
          return { ok: false, value: null };
        }
      };

      const domainsParsed = parseJson(sslDraft.domains_json);
      if (!domainsParsed.ok) {
        addToast(t('admin.domain.invalidJson') || 'Invalid JSON', 'error');
        return;
      }
      const domainsVal = domainsParsed.value;
      if (!Array.isArray(domainsVal) || domainsVal.length === 0 || !domainsVal.every((x) => typeof x === 'string' && x.trim())) {
        addToast(t('admin.domain.domainsRequired') || 'Domains are required', 'error');
        return;
      }

      const dnsCfgRaw = (sslDraft.dns_config_json || '{}').trim();
      const dnsCfgParsed = parseJson(dnsCfgRaw);
      if (!dnsCfgParsed.ok) {
        addToast(t('admin.domain.invalidJson') || 'Invalid JSON', 'error');
        return;
      }
      const dnsCfgVal = dnsCfgParsed.value;
      if (!dnsCfgVal || typeof dnsCfgVal !== 'object' || Array.isArray(dnsCfgVal)) {
        addToast(t('admin.domain.invalidJson') || 'Invalid JSON', 'error');
        return;
      }
      const dnsCfgObj = dnsCfgVal as Record<string, unknown>;

      if (sslDraft.challenge_type === 'dns01') {
        if (!sslDraft.provider_account_id?.trim()) {
          addToast(t('admin.domain.providerRequiredForDns01') || 'DNS-01 requires provider account', 'error');
          return;
        }
        const zone = String((dnsCfgObj.dns_zone ?? dnsCfgObj.zone ?? '')).trim();
        if (!zone) {
          addToast(t('admin.domain.zoneRequired') || 'Zone is required', 'error');
          return;
        }
      }
      if (sslDraft.challenge_type === 'http01') {
        const webroot = String((dnsCfgObj.webroot ?? dnsCfgObj.http_webroot ?? '')).trim();
        if (!webroot) {
          addToast(t('admin.domain.webrootRequired') || 'Webroot is required', 'error');
          return;
        }
      }

      const payload: CertificatePayload = {
        name: sslDraft.name.trim(),
        enabled: sslDraft.enabled,
        auto_renew: sslDraft.auto_renew,
        ca_provider: sslDraft.ca_provider,
        challenge_type: sslDraft.challenge_type,
        domains_json: sslDraft.domains_json,
        provider_account_id: sslDraft.challenge_type === 'dns01' ? (sslDraft.provider_account_id || null) : null,
        dns_config_json: dnsCfgRaw || '{}',
        account_email: sslDraft.account_email.trim(),
        export_path: sslDraft.export_path.trim() || null,
      };
      let savedId = sslDraft.id || '';
      if (sslDraft.id) {
        const updated = await extractData<CertificateItem>(
          client.PUT('/api/v1/admin/domain-acme-ddns/certs/{id}', { params: { path: { id: sslDraft.id } }, body: payload }),
        );
        savedId = updated.id;
        addToast(t('admin.domain.certUpdated'), 'success');
      } else {
        const created = await extractData<CertificateItem>(
          client.POST('/api/v1/admin/domain-acme-ddns/certs', { body: payload }),
        );
        savedId = created.id;
        addToast(t('admin.domain.certCreated'), 'success');
      }

      setSslModalOpen(false);
      await loadAll();

      // Best-practice gating: if enabling automation, run preflight and (dns01) dns01 write test.
      const shouldGate = payload.enabled || payload.auto_renew;
      if (shouldGate && savedId) {
        const preflight = await extractData<CertPreflightResult>(
          client.POST('/api/v1/admin/domain-acme-ddns/certs/{id}/check', { params: { path: { id: savedId } } }),
        );
        setCertCheckResult(preflight);
        setCertCheckOpen(true);

        if ((preflight.overall_status || '').toLowerCase() === 'fail') {
          addToast(preflight.items?.find((x) => x.status === 'fail')?.message || 'preflight failed', 'error');
          if (window.confirm(t('admin.domain.preflightFailDisableConfirm') || 'Preflight failed. Disable this certificate now?')) {
            await extractData(
              client.PUT('/api/v1/admin/domain-acme-ddns/certs/{id}', {
                params: { path: { id: savedId } },
                body: { ...payload, enabled: false, auto_renew: false },
              }),
            );
            addToast(t('common.disabled') || 'disabled', 'info');
            await loadAll();
          }
          return;
        }

        if (payload.challenge_type === 'dns01') {
          const res = await extractData<CertTestDns01Result>(
            client.POST('/api/v1/admin/domain-acme-ddns/certs/{id}/test-dns01', { params: { path: { id: savedId } } }),
          );
          addToast(res.message, res.observed ? 'success' : 'info');
        }
      }
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
    if (runningSslAll || runningSslById[id]) return;
    setRunningSslById((prev) => ({ ...prev, [id]: true }));
    try {
      addToast(t('common.loading'), 'info');
      await extractData(client.POST('/api/v1/admin/domain-acme-ddns/certs/{id}/run', { params: { path: { id } } }));
      addToast(t('admin.domain.certRunCompleted'), 'success');
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setRunningSslById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const runSslRenewalCheckAll = async (forceUpdate: boolean) => {
    if (runningSslAll) return;
    setRunningSslAll(true);
    try {
      addToast(t('common.loading'), 'info');
      const resp = await extractData<CertRunAllCheckResponse>(
        client.POST('/api/v1/admin/domain-acme-ddns/certs/run-all-check', { body: { force_update: forceUpdate } }),
      );
      const renewed = Array.isArray(resp.results)
        ? resp.results.filter((r) => (r.status || '').toLowerCase() === 'success').length
        : 0;
      if (forceUpdate) {
        addToast(t('admin.domain.forceRenewCompleted', { renewed }), 'success');
      } else {
        addToast(t('admin.domain.renewalCheckCompleted', { threshold: resp.renew_before_days, renewed }), 'success');
      }
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setRunningSslAll(false);
    }
  };

  const openEditProvider = (item: ProviderAccountItem) => {
    setProviderDraft({
      id: item.id,
      name: item.name,
      provider_key: item.provider_key,
      credential_json_enc: '', // Redacted on backend, empty means keep original on update
      config_json: item.config_json,
      enabled: item.enabled,
    });
    setShowProviderList(false);
  };

  const deleteProvider = async (id: string) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    try {
      await extractData(client.DELETE('/api/v1/admin/domain-acme-ddns/providers/accounts/{id}', { params: { path: { id } } }));
      addToast(t('admin.domain.providerDeleted'), 'success');
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const saveProviderQuick = async () => {
    if (!providerDraft.name.trim()) {
      addToast(t('admin.domain.providerNameRequired'), 'error');
      return;
    }
    try {
      const parseJsonObj = (raw: string): { ok: boolean; value: Record<string, unknown>; error?: string } => {
        const s = (raw || '').trim();
        if (!s) return { ok: true, value: {} };
        try {
          const v = JSON.parse(s);
          if (!v || typeof v !== 'object' || Array.isArray(v)) {
            return { ok: false, value: {}, error: t('admin.domain.invalidJson') || 'Invalid JSON' };
          }
          return { ok: true, value: v as Record<string, unknown> };
        } catch {
          return { ok: false, value: {}, error: t('admin.domain.invalidJson') || 'Invalid JSON' };
        }
      };

      const cfgParsed = parseJsonObj(providerDraft.config_json);
      if (!cfgParsed.ok) {
        addToast(cfgParsed.error || 'Invalid JSON', 'error');
        return;
      }

      if (!providerDraft.id) {
        const credParsed = parseJsonObj(providerDraft.credential_json_enc);
        if (!credParsed.ok) {
          addToast(credParsed.error || 'Invalid JSON', 'error');
          return;
        }
      }

      const body: ProviderAccountPayload = {
        name: providerDraft.name.trim(),
        provider_key: providerDraft.provider_key,
        credential_json_enc: providerDraft.credential_json_enc,
        config_json: providerDraft.config_json || '{}',
        enabled: providerDraft.enabled,
      };

      let result: ProviderAccountItem;
      if (providerDraft.id) {
        result = await extractData<ProviderAccountItem>(client.PUT('/api/v1/admin/domain-acme-ddns/providers/accounts/{id}', { 
          params: { path: { id: providerDraft.id } },
          body
        }));
        addToast(t('admin.domain.providerUpdated'), 'success');
      } else {
        result = await extractData<ProviderAccountItem>(client.POST('/api/v1/admin/domain-acme-ddns/providers/accounts', { 
          body
        }));
        addToast(t('admin.domain.providerCreated'), 'success');
      }
      
      setShowProviderList(true);
      setProviderDraft(newProviderDraft());
      await loadAll();
      
      if (result?.id && !providerDraft.id) {
        setDdnsDraft((prev) => ({ ...prev, provider_account_id: result.id }));
        setSslDraft((prev: SslDraft) => ({ ...prev, provider_account_id: result.id }));
      }
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const testProviderDns = async () => {
    if (!providerDraft.id) {
      addToast(t('admin.domain.saveProviderFirst') || 'Save provider first', 'error');
      return;
    }
    if (!providerTestZone.trim()) {
      addToast(t('admin.domain.zoneRequired') || 'Zone is required', 'error');
      return;
    }
    if (providerTestRunning) return;
    setProviderTestRunning(true);
    try {
      const res = await extractData<ProviderTestDnsResult>(
        client.POST('/api/v1/admin/domain-acme-ddns/providers/accounts/{id}/test-dns', {
          params: { path: { id: providerDraft.id } },
          body: { zone: providerTestZone.trim(), host: providerTestHost.trim() || undefined },
        }),
      );

      addToast(res.message, res.observed ? 'success' : 'info');
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setProviderTestRunning(false);
    }
  };

  const testProviderAuth = async () => {
    if (!providerDraft.id) {
      addToast(t('admin.domain.saveProviderFirst') || 'Save provider first', 'error');
      return;
    }
    if (providerAuthTestRunning) return;
    setProviderAuthTestRunning(true);
    try {
      const res = await extractData<ProviderTestAuthResult>(
        client.POST('/api/v1/admin/domain-acme-ddns/providers/accounts/{id}/test-auth', {
          params: { path: { id: providerDraft.id } },
        }),
      );

      const status = res.status.toLowerCase();
      const kind = status.includes('fail') || status.includes('error')
        ? 'error'
        : status.includes('skip')
          ? 'info'
          : 'success';
      addToast(res.message, kind);
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setProviderAuthTestRunning(false);
    }
  };

  const saveZeroSslQuick = async () => {
    try {
      const created = await createZeroSslAccount(zerosslDraft);
      addToast(t('admin.domain.zerosslAccountCreated'), 'success');
      setZeroSslModalOpen(false);
      setZeroSslDraft(newZeroSslDraft());
      await loadAll();

      // Auto-select in SSL draft if it's being configured
      if (created?.id) {
        setSslDraft((prev: SslDraft) => {
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
  const isSsl = view === 'ssl';
  const viewEnabled = isDdns ? (featureFlags?.ddnsEnabled ?? true) : (featureFlags?.sslEnabled ?? true);
  const schedulerEnabled = isDdns
    ? (featureFlags?.ddnsSchedulerEnabled ?? true)
    : (featureFlags?.sslSchedulerEnabled ?? true);

  const selectedDdnsProviderKey = useMemo(() => {
    const account = providers.find((p) => p.id === ddnsDraft.provider_account_id);
    return account?.provider_key;
  }, [providers, ddnsDraft.provider_account_id]);

  const selectedDdnsProviderAccount = useMemo(() => {
    return providers.find((p) => p.id === ddnsDraft.provider_account_id) || null;
  }, [providers, ddnsDraft.provider_account_id]);

  const cardsData = isDdns ? ddnsEntries : certificates;

  const renderCards = () => {
    if (loading && (!ddnsEntries.length && !certificates.length)) {
      return (
        <div className="sm:col-span-2 px-5 py-10 text-center text-foreground/40 font-bold uppercase tracking-widest rounded-3xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-white/[0.03]">
          <RefreshCw className="animate-spin mb-3 mx-auto" size={26} />
          {t('common.loading')}
        </div>
      );
    }

    if (cardsData.length === 0) {
      return (
        <div className="sm:col-span-2 px-5 py-12 text-center text-foreground/30 font-bold uppercase tracking-widest rounded-3xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-white/[0.03]">
          {isDdns ? <Globe className="mx-auto mb-3" size={40} /> : <ShieldCheck className="mx-auto mb-3" size={40} />}
          {isDdns ? t('admin.domain.noDdnsEntries') : t('admin.domain.noCertificates')}
        </div>
      );
    }

    return (
      <>
        {cardsData.map((item: DdnsEntryItem | CertificateItem) => {
          const isDdnsItem = isDdnsEntryItem(item);
          return (
            <div key={item.id} className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/5 shadow-sm h-full flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-black text-base truncate">{item.name}</div>
                  {isDdnsItem && <div className="mt-1 text-[14px] font-mono opacity-70 truncate">{item.fqdn}</div>}
                  {!isDdnsItem && item.expires_at && (
                    <div className="mt-1 text-[14px] font-bold opacity-60">{new Date(item.expires_at).toLocaleDateString()}</div>
                  )}
                </div>
                <div className="shrink-0">
                  <StatusBadge status={item.last_status} />
                </div>
              </div>

              {isDdnsItem && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[14px] h-5 px-1.5 bg-zinc-100 dark:bg-white/5 border-zinc-300 dark:border-white/10 text-foreground/60 dark:text-white/40 uppercase font-black">
                    TTL {item.ttl}
                  </Badge>
                  {item.proxied && (
                    <Badge variant="outline" className="text-[14px] h-5 px-1.5 bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-500 uppercase font-black">
                      {t('admin.domain.proxyBadge')}
                    </Badge>
                  )}
                  {(item.last_ipv4 || item.last_ipv6) && (
                    <div className="text-[14px] font-mono opacity-60">
                      {item.last_ipv4 ? `v4 ${item.last_ipv4}` : ''}{item.last_ipv4 && item.last_ipv6 ? '  ' : ''}{item.last_ipv6 ? `v6 ${item.last_ipv6}` : ''}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-zinc-200/60 dark:border-white/5 mt-auto">
                {isDdnsItem ? (
                  <>
                    {viewEnabled && (
                      <button
                        onClick={() => runDdns(item.id)}
                        disabled={runningDdnsAll || !!runningDdnsById[item.id]}
                        className="h-11 w-11 flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/5 hover:bg-green-500 hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-inherit transition-all shadow-sm"
                        title={t('admin.domain.ddnsRunNow') || 'Run now'}
                      >
                        <Play size={16} className={cn(!!runningDdnsById[item.id] && 'animate-pulse')} />
                      </button>
                    )}
                    <button
                      onClick={() => inspectDdns(item.id)}
                      disabled={ddnsInspectLoading}
                      className="h-11 w-11 flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition-all shadow-sm disabled:opacity-40"
                      title={t('admin.domain.ddnsInspect') || 'Inspect'}
                    >
                      <Activity size={16} className={cn(ddnsInspectLoading && 'animate-pulse')} />
                    </button>
                    <button
                      onClick={() => openLogs(item)}
                      className="h-11 w-11 flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/5 hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                      title={t('admin.domain.ddnsLogs') || 'Logs'}
                    >
                      <ScrollText size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => openCertLogs(item as CertificateItem)}
                      className="h-11 w-11 flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/5 hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                      title={t('admin.domain.certLogs') || 'Logs'}
                    >
                      <ScrollText size={16} />
                    </button>
                    {viewEnabled ? (
                      <button
                        onClick={() => runSsl(item.id)}
                        disabled={runningSslAll || !!runningSslById[item.id]}
                        className="h-11 w-11 flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/5 hover:bg-green-500 hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-inherit transition-all shadow-sm"
                        title={t('admin.domain.certRunNow') || 'Run now'}
                      >
                        <Play size={16} className={cn(!!runningSslById[item.id] && 'animate-pulse')} />
                      </button>
                    ) : null}
                  </>
                )}
                {viewEnabled && (
                  <button onClick={() => isDdnsItem ? openEditDdns(item) : openEditSsl(item)} className="h-11 w-11 flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/5 hover:bg-primary hover:text-white transition-all shadow-sm" title={t('common.edit') || 'Edit'}>
                    <Edit3 size={16} />
                  </button>
                )}
                {viewEnabled && (
                  <button onClick={() => isDdnsItem ? deleteDdns(item.id) : deleteSsl(item.id)} className="h-11 w-11 flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/5 hover:bg-red-500 hover:text-white transition-all shadow-sm" title={t('common.delete') || 'Delete'}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </>
    );
  };

  React.useEffect(() => {
    if (selectedDdnsProviderKey !== 'cloudflare' && ddnsDraft.proxied) {
      setDdnsDraft((prev) => ({ ...prev, proxied: false }));
    }
  }, [selectedDdnsProviderKey, ddnsDraft.proxied]);

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

        <div className="w-full xl:w-auto grid grid-cols-2 sm:flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setProviderModalOpen(true)}
            className="h-12 px-4 rounded-xl border-zinc-300 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 shadow-sm transition-all font-bold text-foreground"
          >
            <Server size={16} className="mr-2 opacity-70 text-indigo-600 dark:text-indigo-400" /> 
            {t('admin.domain.panelProvider')}
          </Button>
          {!isDdns && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZeroSslModalOpen(true)}
              className="h-12 px-4 rounded-xl border-zinc-300 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 shadow-sm transition-all font-bold text-foreground"
            >
               <LinkIcon size={16} className="mr-2 opacity-70 text-cyan-600 dark:text-cyan-400" /> 
               ZeroSSL
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={loadAll}
            disabled={loading}
            className="h-12 w-full sm:w-12 rounded-xl p-0 sm:p-0 border-zinc-300 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 flex items-center justify-center shadow-sm transition-all text-foreground/60"
            title={t('common.refresh') || 'Refresh'}
          >
            <RefreshCw size={18} className={cn("opacity-70", loading && "animate-spin")} />
          </Button>
          {isDdns && viewEnabled && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await loadDdnsPlan(true);
                }}
                disabled={loading || ddnsPlanLoading}
                className="h-12 px-4 rounded-xl border-zinc-300 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 shadow-sm transition-all font-bold text-foreground"
                title={t('admin.domain.ddnsPlan') || 'Plan'}
              >
                <Activity size={16} className={cn('mr-2 opacity-70 text-indigo-600 dark:text-indigo-400', ddnsPlanLoading && 'animate-spin')} />
                <span>{t('admin.domain.ddnsPlan') || 'Plan'}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={runDdnsAll}
                disabled={loading || runningDdnsAll}
                className="h-12 px-4 rounded-xl border-zinc-300 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 shadow-sm transition-all font-bold text-foreground"
                title={t('admin.domain.ddnsRunNow') || 'Run now'}
              >
                <Play size={16} className="mr-2 opacity-70 text-blue-600 dark:text-blue-400" />
                <span>{t('admin.domain.ddnsRunNow') || 'Run now'}</span>
              </Button>
            </>
          )}
          {!isDdns && viewEnabled && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await loadCertPlan(true);
                }}
                disabled={loading || certPlanLoading}
                className="h-12 px-4 rounded-xl border-zinc-300 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 shadow-sm transition-all font-bold text-foreground"
                title={t('admin.domain.sslPlan') || 'Plan'}
              >
                <Activity size={16} className={cn('mr-2 opacity-70 text-indigo-600 dark:text-indigo-400', certPlanLoading && 'animate-spin')} />
                <span>{t('admin.domain.sslPlan') || 'Plan'}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => runSslRenewalCheckAll(false)}
                disabled={loading || runningSslAll}
                className="h-12 px-4 rounded-xl border-zinc-300 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 shadow-sm transition-all font-bold text-foreground"
                title={t('admin.domain.runRenewalCheck')}
              >
                <Activity size={16} className="mr-2 opacity-70 text-green-600 dark:text-green-400" />
                <span className="hidden sm:inline">{t('admin.domain.runRenewalCheck')}</span>
                <span className="sm:hidden">{t('admin.domain.runRenewalCheck')?.slice(0, 4) || 'Check'}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => runSslRenewalCheckAll(true)}
                disabled={loading || runningSslAll}
                className="h-12 px-4 rounded-xl border-zinc-300 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 shadow-sm transition-all font-bold text-foreground"
                title={t('admin.domain.forceRenewAll')}
              >
                <Play size={16} className="mr-2 opacity-70 text-orange-600 dark:text-orange-400" />
                <span className="hidden sm:inline">{t('admin.domain.forceRenewAll')}</span>
                <span className="sm:hidden">{t('admin.domain.forceRenewAll')?.slice(0, 5) || 'Force'}</span>
              </Button>
            </>
          )}
          {viewEnabled && (
            <Button
              className="h-12 px-6 rounded-2xl bg-gradient-to-br from-primary to-primary/90 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95 border-t border-white/20 col-span-2 sm:col-span-1"
              onClick={isDdns ? openCreateDdns : openCreateSsl}
            >
              <Plus size={18} className="mr-2 stroke-[3px]" />
              <span className="font-bold tracking-wider">{t('admin.domain.create')}</span>
            </Button>
          )}
        </div>
      </div>

       {!viewEnabled && (
         <div className={cn(sectionCardBase, "border-red-500/20 bg-red-500/5")}> 
           <SectionHeader icon={XCircle} title={t('common.disabled') || 'Disabled'} desc={isDdns ? (t('admin.domain.ddnsDisabledByConfig') || 'DDNS is disabled by config') : (t('admin.domain.sslDisabledByConfig') || 'SSL/TLS is disabled by config')} colorClass="bg-red-500/10 text-red-600 border-red-500/20" />
           <div className="text-sm font-bold opacity-70">
             {(featureFlags && !featureFlags.moduleEnabled) ? (t('admin.domain.domainModuleDisabled') || 'Enable [domain_acme_ddns] in config to use this module.') : (t('admin.domain.enableSchedulerHint') || 'Also ensure the related scheduled job is enabled in [task_registry].')}
           </div>
         </div>
       )}

       {viewEnabled && !schedulerEnabled && (
         <div className={cn(sectionCardBase, "border-orange-500/20 bg-orange-500/5")}> 
           <SectionHeader icon={Info} title={isDdns ? 'DDNS Scheduler' : 'ACME Scheduler'} desc={t('admin.domain.enableSchedulerHint') || 'Also ensure the related scheduled job is enabled in [task_registry].'} colorClass="bg-orange-500/10 text-orange-700 border-orange-500/20" />
           <div className="text-sm font-bold opacity-70">
             {t('admin.domain.enableSchedulerHint') || 'Also ensure the related scheduled job is enabled in [task_registry].'}
           </div>
         </div>
       )}

      {/* Cards (phone + pad portrait) */}
      <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
        {renderCards()}
      </div>

      {/* Cards fallback for low-height pad/split-screen even on lg+ */}
      <div className="hidden [@media(min-width:1024px)_and_(max-height:720px)]:grid grid-cols-1 sm:grid-cols-2 gap-3">
        {renderCards()}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block [@media(min-width:1024px)_and_(max-height:720px)]:hidden bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden dark:shadow-2xl backdrop-blur-sm transition-all shadow-sm">
        <div className="overflow-auto max-h-[calc(100vh-360px)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02]">
                <th className="sticky top-0 z-10 px-8 py-5 text-[14px] font-black uppercase tracking-widest text-foreground/50 dark:text-white/30 bg-zinc-50/90 dark:bg-black/40 backdrop-blur">
                  {isDdns ? t('common.name') : t('admin.acme.table.name')}
                </th>
                <th className="sticky top-0 z-10 px-8 py-5 text-[14px] font-black uppercase tracking-widest text-foreground/50 dark:text-white/30 bg-zinc-50/90 dark:bg-black/40 backdrop-blur">
                  {isDdns ? 'Target / Details' : t('admin.acme.table.status')}
                </th>
                <th className="sticky top-0 z-10 px-8 py-5 text-[14px] font-black uppercase tracking-widest text-foreground/50 dark:text-white/30 bg-zinc-50/90 dark:bg-black/40 backdrop-blur">{t('admin.acme.table.status')}</th>
                <th className="sticky top-0 z-10 px-8 py-5 text-[14px] font-black uppercase tracking-widest text-foreground/50 dark:text-white/30 text-right bg-zinc-50/90 dark:bg-black/40 backdrop-blur">{t('common.actions')}</th>
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
                (isDdns ? ddnsEntries : certificates).map((item: DdnsEntryItem | CertificateItem) => (
                  <tr
                    key={item.id}
                    onClick={() => {
                      if (!viewEnabled) return;
                      if (isDdnsEntryItem(item)) openEditDdns(item);
                      else openEditSsl(item as CertificateItem);
                    }}
                    className="border-b border-zinc-100 dark:border-white/5 last:border-0 hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer"
                  >
                    <td className="px-8 py-5 text-foreground font-bold">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center border border-zinc-200 dark:border-white/5 font-black text-sm group-hover:border-primary/30 transition-all shadow-inner">
                          {isDdns ? <Activity size={18} className="opacity-70 text-blue-600 dark:text-blue-400" /> : <ShieldCheck size={18} className="opacity-70 text-green-600 dark:text-green-400" />}
                        </div>
                        <div>
                          <div>{item.name}</div>
                          {isDdnsEntryItem(item) && <div className="text-[14px] opacity-60 dark:opacity-40 font-mono mt-0.5 text-foreground">{item.fqdn}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {isDdns ? (
                         <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-[14px] h-5 px-1.5 bg-zinc-100 dark:bg-white/5 border-zinc-300 dark:border-white/10 text-foreground/60 dark:text-white/40 uppercase font-black">TTL {isDdnsEntryItem(item) ? item.ttl : 0}</Badge>
                             {isDdnsEntryItem(item) && item.proxied && <Badge variant="outline" className="text-[14px] h-5 px-1.5 bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-500 uppercase font-black">{t('admin.domain.proxyBadge')}</Badge>}
                             {isDdnsEntryItem(item) && (item.last_ipv4 || item.last_ipv6) && (
                               <span className="ml-2 text-[14px] font-mono opacity-60">
                                 {item.last_ipv4 ? `v4 ${item.last_ipv4}` : ''}{item.last_ipv4 && item.last_ipv6 ? '  ' : ''}{item.last_ipv6 ? `v6 ${item.last_ipv6}` : ''}
                               </span>
                             )}
                         </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[14px] font-bold opacity-60 dark:opacity-40 uppercase tracking-widest text-foreground">
                           <Calendar size={18} className="text-primary" />
                           {!isDdnsEntryItem(item) && item.expires_at ? new Date(item.expires_at).toLocaleDateString() : t('admin.domain.noExpiry')}
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <StatusBadge status={item.last_status} />
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-100 [@media(hover:hover)]:opacity-60 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity">
                        {isDdnsEntryItem(item) ? (
                          <>
                            {viewEnabled && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  runDdns(item.id);
                                }}
                                disabled={runningDdnsAll || !!runningDdnsById[item.id]}
                                className="h-11 w-11 inline-flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/5 hover:bg-green-500 hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-inherit transition-all shadow-sm"
                                title={t('admin.domain.ddnsRunNow') || 'Run now'}
                              >
                                <Play size={16} className={cn(!!runningDdnsById[item.id] && 'animate-pulse')} />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRowActionsOpen({ kind: 'ddns', item });
                              }}
                              className="h-11 w-11 inline-flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition-all shadow-sm"
                              title={t('common.actions') || 'Actions'}
                              aria-label={t('common.actions') || 'Actions'}
                            >
                              <MoreHorizontal size={18} className="opacity-70" />
                            </button>
                          </>
                        ) : (
                          <>
                            {viewEnabled ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  runSsl(item.id);
                                }}
                                disabled={runningSslAll || !!runningSslById[item.id]}
                                className="h-11 w-11 inline-flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/5 hover:bg-green-500 hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-inherit transition-all shadow-sm"
                                title={t('admin.domain.certRunNow') || 'Run now'}
                              >
                                <Play size={16} className={cn(!!runningSslById[item.id] && 'animate-pulse')} />
                              </button>
                            ) : null}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRowActionsOpen({ kind: 'ssl', item: item as CertificateItem });
                              }}
                              className="h-11 w-11 inline-flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition-all shadow-sm"
                              title={t('common.actions') || 'Actions'}
                              aria-label={t('common.actions') || 'Actions'}
                            >
                              <MoreHorizontal size={18} className="opacity-70" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RowActionsModal
        target={rowActionsOpen}
        viewEnabled={viewEnabled}
        runningDdnsAll={runningDdnsAll}
        runningDdnsById={runningDdnsById}
        runningSslAll={runningSslAll}
        runningSslById={runningSslById}
        ddnsCheckLoading={ddnsCheckLoading}
        ddnsInspectLoading={ddnsInspectLoading}
        certCheckLoading={certCheckLoading}
        onClose={() => setRowActionsOpen(null)}
        onRunDdns={runDdns}
        onCheckDdns={checkDdns}
        onInspectDdns={inspectDdns}
        onRunSsl={runSsl}
        onCheckSsl={checkCert}
        onOpenDdnsLogs={openLogs}
        onOpenCertLogs={openCertLogs}
        onEditDdns={openEditDdns}
        onEditSsl={openEditSsl}
        onDeleteDdns={deleteDdns}
        onDeleteSsl={deleteSsl}
      />

      <DdnsCheckModal
        isOpen={ddnsCheckOpen}
        result={ddnsCheckResult}
        onClose={() => {
          setDdnsCheckOpen(false);
          setDdnsCheckResult(null);
        }}
        onRunNow={runDdns}
      />

      <DdnsInspectModal
        isOpen={ddnsInspectOpen}
        result={ddnsInspectResult}
        onClose={() => {
          setDdnsInspectOpen(false);
          setDdnsInspectResult(null);
        }}
        onRunNow={runDdns}
      />

      <DdnsPlanModal
        isOpen={ddnsPlanOpen}
        loading={ddnsPlanLoading}
        data={ddnsPlanData}
        onClose={() => {
          setDdnsPlanOpen(false);
        }}
        onRefresh={async () => {
          await loadDdnsPlan(false);
        }}
        onRun={runDdns}
        onInspect={inspectDdns}
        onCheck={checkDdns}
        onOpenLogs={(id) => {
          const entry = ddnsEntries.find((x) => x.id === id) || null;
          if (entry) openLogs(entry);
          else addToast(t('common.noData') || 'No data', 'info');
        }}
      />

      <CertCheckModal
        isOpen={certCheckOpen}
        result={certCheckResult}
        onClose={() => {
          setCertCheckOpen(false);
          setCertCheckResult(null);
        }}
        viewEnabled={viewEnabled}
        onRunNow={runSsl}
      />

      <CertPlanModal
        isOpen={certPlanOpen}
        loading={certPlanLoading}
        data={certPlanData}
        onClose={() => setCertPlanOpen(false)}
        onRefresh={async () => {
          await loadCertPlan(false);
        }}
        onRun={runSsl}
        onOpenLogs={(id) => {
          const cert = certificates.find((x) => x.id === id) || null;
          if (cert) openCertLogs(cert);
          else addToast(t('common.noData') || 'No data', 'info');
        }}
      />

      {isDdns && (
        <Pagination
          current={ddnsPage}
          total={ddnsTotal}
          pageSize={ddnsPageSize}
          onPageChange={setDdnsPage}
          onPageSizeChange={(size) => {
            setDdnsPageSize(size);
            setDdnsPage(1);
          }}
          className="bg-white/60 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/5 rounded-3xl"
        />
      )}

      {isSsl && (
        <Pagination
          current={certPage}
          total={certTotal}
          pageSize={certPageSize}
          onPageChange={setCertPage}
          onPageSizeChange={(size) => {
            setCertPageSize(size);
            setCertPage(1);
          }}
          className="bg-white/60 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/5 rounded-3xl"
        />
      )}

      <DdnsLogsModal
        isOpen={logOpen}
        entry={logEntry}
        loading={logLoading}
        items={logItems}
        total={logTotal}
        page={logPage}
        pageSize={logPageSize}
        onPageChange={setLogPage}
        onPageSizeChange={setLogPageSize}
        onClose={() => {
          setLogOpen(false);
          setLogEntry(null);
          setLogItems([]);
          setLogTotal(0);
        }}
      />

      <CertLogsModal
        isOpen={certLogOpen}
        cert={certLogCert}
        loading={certLogLoading}
        items={certLogItems}
        total={certLogTotal}
        page={certLogPage}
        pageSize={certLogPageSize}
        onPageChange={setCertLogPage}
        onPageSizeChange={setCertLogPageSize}
        onClose={() => {
          setCertLogOpen(false);
          setCertLogCert(null);
          setCertLogItems([]);
          setCertLogTotal(0);
        }}
      />

      {/* DDNS Modal */}
      <Modal isOpen={ddnsModalOpen} onClose={() => setDdnsModalOpen(false)} title={ddnsDraft.id ? t('admin.domain.ddnsEditTitle') : t('admin.domain.create') + ' DDNS'} maxWidth="max-w-3xl">
        <div className="space-y-8 overflow-y-auto max-h-[80vh] p-1 scrollbar-hide">
          <div className={sectionCardBase}>
            <div className="space-y-8">
              <SectionHeader icon={Info} title={t('admin.domain.basicInfo')} desc={t('admin.domain.basicInfo')} colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-500 border-blue-500/20" />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-[14px] font-black uppercase tracking-widest text-foreground/50 dark:text-foreground/40 ml-1">{t('common.name')}</label>
                   <Input placeholder={t('admin.domain.ddnsNamePlaceholder')} value={ddnsDraft.name} onChange={(e) => setDdnsDraft({ ...ddnsDraft, name: e.target.value })} className={controlBase} />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[14px] font-black uppercase tracking-widest text-foreground/50 dark:text-foreground/40 ml-1">{t('admin.domain.panelProvider')}</label>
                   <div className="flex gap-2">
                     <select className={selectBase} style={selectStyle} value={ddnsDraft.provider_account_id} onChange={(e) => setDdnsDraft({ ...ddnsDraft, provider_account_id: e.target.value })}>
                       <option value="">{ddnsProviders.length === 0 ? t('admin.domain.noProviders') : t('admin.domain.ddnsProviderPlaceholder')}</option>
                       {ddnsProviders.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.provider_key})</option>)}
                     </select>
                     <Button type="button" variant="outline" onClick={() => setProviderModalOpen(true)} className="h-11 w-11 p-0 border-zinc-300 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 shadow-sm text-foreground"><Plus size={18}/></Button>
                  </div>

                  {selectedDdnsProviderAccount && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] font-black uppercase tracking-widest opacity-70">
                      {selectedDdnsProviderAccount.enabled === false && (
                        <Badge variant="outline" className="h-6 px-2 rounded-lg opacity-70">
                          {t('common.disabled') || 'disabled'}
                        </Badge>
                      )}
                      {selectedDdnsProviderAccount.has_credential === false && (
                        <Badge variant="outline" className="h-6 px-2 rounded-lg bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400">
                          {t('admin.domain.noCredentialBadge') || 'NO SECRET'}
                        </Badge>
                      )}
                      {selectedDdnsProviderAccount.has_credential && selectedDdnsProviderAccount.auth_ok === true && (
                        <Badge variant="outline" className="h-6 px-2 rounded-lg bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400">
                          {t('admin.domain.credOkBadge') || 'CRED OK'}
                        </Badge>
                      )}
                      {selectedDdnsProviderAccount.has_credential && selectedDdnsProviderAccount.auth_ok === false && (
                        <Badge variant="outline" className="h-6 px-2 rounded-lg bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400">
                          {t('admin.domain.credErrorBadge') || 'CRED ERROR'}
                        </Badge>
                      )}
                      {selectedDdnsProviderAccount.auth_test_status && (
                        <Badge variant="outline" className="h-6 px-2 rounded-lg">
                          {selectedDdnsProviderAccount.auth_test_status}
                        </Badge>
                      )}
                      {selectedDdnsProviderAccount.auth_error && (
                        <span className="text-[12px] font-bold opacity-60 truncate" title={selectedDdnsProviderAccount.auth_error}>
                          {selectedDdnsProviderAccount.auth_error}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="text-[12px] font-black uppercase tracking-widest opacity-60">
                      {t('admin.domain.fqdnHelper') || 'FQDN Helper'}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col md:flex-row gap-3">
                    <Input
                      placeholder={t('admin.domain.fqdnHelperPlaceholder') || 'e.g. www.example.com'}
                      value={ddnsFqdnHelper}
                      onChange={(e) => setDdnsFqdnHelper(e.target.value)}
                      className={cn(controlBase, 'font-mono')}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 px-5 rounded-xl border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 font-bold shrink-0"
                      onClick={() => {
                        const raw = ddnsFqdnHelper.trim().replace(/\.+$/g, '');
                        if (!raw || !raw.includes('.')) {
                          addToast(t('admin.domain.ddnsTargetRequired') || 'Zone and host are required', 'error');
                          return;
                        }
                        const cleaned = raw.toLowerCase();
                        const currentZone = ddnsDraft.zone.trim().replace(/\.+$/g, '').toLowerCase();
                        if (currentZone && (cleaned === currentZone || cleaned.endsWith(`.${currentZone}`))) {
                          const hostPart = cleaned === currentZone ? '@' : cleaned.slice(0, -(currentZone.length + 1));
                          setDdnsDraft((prev) => ({ ...prev, host: hostPart || '@' }));
                          addToast(t('admin.domain.confirmZoneHostHint') || 'Auto-filled Zone/Host as a suggestion. Please verify.', 'info');
                          return;
                        }
                        const parts = cleaned.split('.').filter((p) => p);
                        if (parts.length < 2) {
                          addToast(t('admin.domain.ddnsTargetRequired') || 'Zone and host are required', 'error');
                          return;
                        }
                        const zone = parts.slice(-2).join('.');
                        const host = parts.slice(0, -2).join('.') || '@';
                        setDdnsDraft((prev) => ({ ...prev, zone, host }));
                        addToast(t('admin.domain.confirmZoneHostHint') || 'Auto-filled Zone/Host as a suggestion. Please verify.', 'info');
                      }}
                    >
                      {t('admin.domain.fillZoneHost') || 'Fill Zone/Host'}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="space-y-2 min-w-0">
                   <label className="text-[14px] font-black uppercase tracking-wider md:tracking-widest text-foreground/50 dark:text-foreground/40 ml-1 whitespace-nowrap overflow-hidden text-ellipsis">
                     {t('admin.domain.zoneLabel') || 'Zone'}
                   </label>
                   <Input
                     placeholder={t('admin.domain.zonePlaceholder') || 'e.g. nascore.eu.org'}
                     value={ddnsDraft.zone}
                     onChange={(e) => setDdnsDraft({ ...ddnsDraft, zone: e.target.value })}
                     className={controlBase}
                   />
                 </div>
                 <div className="space-y-2 min-w-0">
                   <label className="text-[14px] font-black uppercase tracking-wider md:tracking-widest text-foreground/50 dark:text-foreground/40 ml-1 whitespace-nowrap overflow-hidden text-ellipsis">
                     {t('admin.domain.hostLabel') || 'Host'}
                   </label>
                   <Input
                     placeholder={t('admin.domain.hostPlaceholder') || '@ or sub'}
                     value={ddnsDraft.host}
                     onChange={(e) => setDdnsDraft({ ...ddnsDraft, host: e.target.value })}
                     className={controlBase}
                   />
                 </div>
                 <div className="space-y-2 min-w-0">
                   <label className="text-[14px] font-black uppercase tracking-wider md:tracking-widest text-foreground/50 dark:text-foreground/40 ml-1 whitespace-nowrap overflow-hidden text-ellipsis">
                     {t('admin.domain.ttlLabel') || 'TTL'}
                   </label>
                   <Input
                     type="number"
                     min={60}
                     max={86400}
                     value={ddnsDraft.ttl}
                     onChange={(e) => setDdnsDraft({ ...ddnsDraft, ttl: Number(e.target.value) })}
                     className={controlBase}
                   />
                 </div>
               </div>

               <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5">
                 <div className="text-[14px] font-black uppercase tracking-widest opacity-60">FQDN</div>
                 <div className="mt-2 font-mono text-sm">
                   {(ddnsDraft.host.trim() === '@' || !ddnsDraft.host.trim())
                     ? (ddnsDraft.zone.trim() || '-')
                     : `${ddnsDraft.host.trim().replace(/\.+$/g, '')}.${ddnsDraft.zone.trim().replace(/\.+$/g, '')}`}
                 </div>
                 <div className="mt-2 text-[14px] opacity-50">
                   {t('admin.domain.zoneHostExplicitHint') || 'Please explicitly fill Zone and Host. No automatic inference.'}
                 </div>
               </div>
             </div>
           </div>
          </div>

          {!ddnsDraft.id && (
            <div className={sectionCardBase}>
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <SectionHeader icon={Network} title={t('admin.domain.bulkCreateTitle') || 'Bulk Create'} desc={t('admin.domain.bulkCreateDesc') || 'Optional: create multiple hosts under the same zone'} colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-500 border-indigo-500/20" />
                  <Button type="button" variant="outline" onClick={() => setBulkCreateOpen((v) => !v)} className="h-11 px-4 rounded-xl border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm font-bold">
                    {bulkCreateOpen ? (t('admin.domain.hideBulkCreate') || 'Hide') : (t('admin.domain.showBulkCreate') || 'Show')}
                  </Button>
                </div>

                {bulkCreateOpen && (
                  <div className="space-y-2">
                    <label className="text-[14px] font-black uppercase tracking-widest text-foreground/50 dark:text-foreground/40 ml-1">
                      {t('admin.domain.hostsListLabel') || 'Hosts list'}
                    </label>
                    <textarea
                      placeholder={t('admin.domain.hostsListPlaceholder') || '@\nwww\napi,120'}
                      value={ddnsDraft.fqdns}
                      onChange={(e) => setDdnsDraft({ ...ddnsDraft, fqdns: e.target.value })}
                      className="w-full min-h-[120px] rounded-xl border border-zinc-400/60 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 font-mono text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all shadow-sm text-foreground placeholder:opacity-30"
                      spellCheck={false}
                    />
                    <p className="text-[14px] opacity-50 italic">{t('admin.domain.hostsListHint') || 'One host per line. Optional per-line TTL: host,ttl. Zone is taken from the Zone field.'}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <DdnsSourceForm
              label={t('admin.domain.ipv4Config')}
              sourceJson={ddnsDraft.ipv4_source_json}
              onChange={(json) => setDdnsDraft({ ...ddnsDraft, ipv4_source_json: json })}
              enabled={ddnsDraft.ipv4_enabled}
              onToggle={(v) => setDdnsDraft({ ...ddnsDraft, ipv4_enabled: v })}
              isIpv6={false}
            />
            <DdnsSourceForm
              label={t('admin.domain.ipv6Config')}
              sourceJson={ddnsDraft.ipv6_source_json}
              onChange={(json) => setDdnsDraft({ ...ddnsDraft, ipv6_source_json: json })}
              enabled={ddnsDraft.ipv6_enabled}
              onToggle={(v) => setDdnsDraft({ ...ddnsDraft, ipv6_enabled: v })}
              isIpv6={true}
            />
          </div>

          <div className={sectionCardBase}>
            <div className="space-y-6">
              <SectionHeader icon={LinkIcon} title={t('admin.domain.webhookTitle') || 'Webhook'} desc={t('admin.domain.webhookTitle') || 'Webhook'} colorClass="bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[14px] font-black uppercase tracking-widest text-foreground/50 dark:text-foreground/40 ml-1">{t('admin.domain.forceUpdate') || 'Force Update'}</label>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/5">
                    <div className="text-sm font-bold opacity-70">
                      {ddnsDraft.force_update ? (t('admin.domain.automaticUpdates') || 'Enabled') : (t('admin.domain.statusIdle') || 'Idle')}
                    </div>
                    <Switch checked={ddnsDraft.force_update} onChange={(v: boolean) => setDdnsDraft({ ...ddnsDraft, force_update: v })} />
                  </div>
                  <p className="text-[14px] opacity-50 italic">
                    {t('admin.domain.forceUpdateHint') || 'When enabled, the next run will upsert records even if IP has not changed.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[14px] font-black uppercase tracking-widest text-foreground/50 dark:text-foreground/40 ml-1">
                    {t('admin.domain.webhookJson') || 'Webhook Fields'}
                  </label>
                  <KeyValueForm
                    value={parseJsonObjectToStringMap(ddnsDraft.webhook_json)}
                    onChange={(obj) => setDdnsDraft({ ...ddnsDraft, webhook_json: JSON.stringify(obj) })}
                    addLabel={t('admin.domain.addWebhookField') || 'Add field'}
                    keyPlaceholder="key"
                    valuePlaceholder="value"
                  />
                  <p className="text-[14px] opacity-50 italic">
                    {t('admin.domain.webhookJsonHint') || 'Primarily used by callback provider and merged as extra fields in callback payload.'}
                  </p>
                </div>
              </div>

              {selectedDdnsProviderKey?.toLowerCase() === 'callback' && (
                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-sm font-bold opacity-80">
                  {t('admin.domain.callbackProviderHint') || 'Callback provider reads endpoint config from provider credential/config JSON. webhook_json here will be merged into callback payload.'}
                </div>
              )}
            </div>
          </div>

          <div className={sectionCardBase}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              <label className="flex items-start gap-4 cursor-pointer group text-foreground">
                <div className="pt-1"><Switch checked={ddnsDraft.enabled} onChange={(v) => setDdnsDraft({ ...ddnsDraft, enabled: v })} /></div>
                <div>
                    <div className="text-sm font-black uppercase tracking-widest group-hover:text-primary transition-colors opacity-80">{t('admin.domain.enableService')}</div>
                    <div className="text-[14px] opacity-60 dark:opacity-30 font-bold uppercase tracking-tighter">{t('admin.domain.automaticUpdates')}</div>
                </div>
              </label>
              {selectedDdnsProviderKey === 'cloudflare' && (
                <label className="flex items-start gap-4 cursor-pointer group text-foreground">
                  <div className="pt-1"><Switch checked={ddnsDraft.proxied} onChange={(v) => setDdnsDraft({ ...ddnsDraft, proxied: v })} /></div>
                  <div>
                      <div className="text-sm font-black uppercase tracking-widest group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors opacity-80">{t('admin.domain.cdnProxy')}</div>
                      <div className="text-[14px] opacity-60 dark:opacity-30 font-bold uppercase tracking-tighter">{t('admin.domain.cloudflareProxy')}</div>
                  </div>
                </label>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 -mx-1 px-1 py-4 flex justify-end gap-3 border-t border-zinc-200 dark:border-white/5 bg-white/85 dark:bg-black/40 backdrop-blur-xl">
            <Button variant="outline" onClick={() => setDdnsModalOpen(false)} className="h-14 px-8 rounded-2xl border-zinc-300 dark:border-white/5 bg-white dark:bg-white/5 font-black uppercase tracking-widest text-sm shadow-sm text-foreground">{t('common.cancel')}</Button>
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
            challengeType={sslDraft.challenge_type}
            onChangeChallengeType={(v) => setSslDraft({ ...sslDraft, challenge_type: v })}
            caProvider={sslDraft.ca_provider}
            onChangeCaProvider={(v) => setSslDraft({ ...sslDraft, ca_provider: v })}
            accountEmail={sslDraft.account_email}
            onChangeAccountEmail={(v) => setSslDraft({ ...sslDraft, account_email: v })}
            dnsConfigJson={sslDraft.dns_config_json}
            onChangeDnsConfig={(v) => setSslDraft({ ...sslDraft, dns_config_json: v })}
            providerAccountId={sslDraft.provider_account_id}
            onChangeProviderAccountId={(v) => setSslDraft({ ...sslDraft, provider_account_id: v })}
            providers={acmeDns01Providers}
            zeroSslAccounts={zerosslAccounts}
            exportPath={sslDraft.export_path}
            onChangeExportPath={(v) => setSslDraft({ ...sslDraft, export_path: v })}
            onOpenProviderModal={() => setProviderModalOpen(true)}
            onOpenZeroSslModal={() => setZeroSslModalOpen(true)}
          />

          {sslDraft.challenge_type === 'dns01' && (
            <div className={sectionCardBase}>
              <div className="space-y-6">
                <SectionHeader
                  icon={Network}
                  title={t('admin.domain.testDns01') || 'Test DNS-01'}
                  desc={t('admin.domain.zoneHostExplicitHint') || 'Test DNS write permission with a temporary TXT record.'}
                  colorClass="bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20"
                />
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={testCertDns01}
                    disabled={certDns01TestRunning}
                    className="h-12 px-6 rounded-2xl border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 font-bold"
                  >
                    <Search size={16} className={cn('mr-2', certDns01TestRunning && 'animate-pulse')} />
                    {certDns01TestRunning ? (t('common.loading') || 'Loading') : (t('admin.domain.testDns01') || 'Test DNS-01')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className={sectionCardBase}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              <label className="flex items-start gap-4 cursor-pointer group text-foreground">
                <div className="pt-1"><Switch checked={sslDraft.enabled} onChange={(v) => setSslDraft({ ...sslDraft, enabled: v })} /></div>
                <div>
                    <div className="text-sm font-black uppercase tracking-widest group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors opacity-80">{t('admin.domain.enableCert')}</div>
                    <div className="text-[14px] opacity-60 dark:opacity-30 font-bold uppercase tracking-tighter">{t('admin.domain.activeForWeb')}</div>
                </div>
              </label>
              <label className="flex items-start gap-4 cursor-pointer group text-foreground">
                <div className="pt-1"><Switch checked={sslDraft.auto_renew} onChange={(v) => setSslDraft({ ...sslDraft, auto_renew: v })} /></div>
                <div>
                    <div className="text-sm font-black uppercase tracking-widest group-hover:text-primary transition-colors opacity-80">{t('admin.domain.autoRenew')}</div>
                    <div className="text-[14px] opacity-60 dark:opacity-30 font-bold uppercase tracking-tighter">{t('admin.domain.autoRenewalCheck')}</div>
                </div>
              </label>
            </div>
          </div>

          <div className="sticky bottom-0 -mx-1 px-1 py-4 flex justify-end gap-3 border-t border-zinc-200 dark:border-white/5 bg-white/85 dark:bg-black/40 backdrop-blur-xl">
            <Button variant="outline" onClick={() => setSslModalOpen(false)} className="h-14 px-8 rounded-2xl border-zinc-300 dark:border-white/5 bg-white dark:bg-white/5 font-black uppercase tracking-widest text-sm shadow-sm text-foreground">{t('common.cancel')}</Button>
            <Button onClick={saveSsl} className="h-14 px-10 rounded-2xl bg-gradient-to-br from-primary to-primary/90 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 border-t border-white/20 font-bold tracking-wider text-primary-foreground">{t('common.save')}</Button>
          </div>
        </div>
      </Modal>

      {/* Provider Modal */}
      <Modal isOpen={providerModalOpen} onClose={() => { setProviderModalOpen(false); setShowProviderList(true); }} title={t('admin.domain.providerTitle')} maxWidth="max-w-2xl">
        <div className="space-y-8 overflow-y-auto max-h-[80vh] p-1 scrollbar-hide text-foreground">
          {showProviderList ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-sm font-black uppercase tracking-widest opacity-70">{t('common.manage')}</h3>
                <Button onClick={() => { setProviderDraft(newProviderDraft()); setShowProviderList(false); }} size="sm" className="h-10 px-4 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all border border-primary/20 font-bold">
                  <Plus size={16} className="mr-2" /> {t('common.new')}
                </Button>
              </div>

              <div className="grid gap-3">
                {providersForCurrentView.length === 0 ? (
                  <div className="py-12 text-center opacity-30 font-bold uppercase tracking-widest text-sm border-2 border-dashed border-zinc-200 dark:border-white/5 rounded-3xl">
                    {t('admin.domain.noProviders')}
                  </div>
                ) : (
                  providersForCurrentView.map((p) => {
                    const profile = providerProfileMap.get(p.provider_key);
                    const testStatusRaw = (p.auth_test_status || '').trim();
                    const testStatus = testStatusRaw.toLowerCase();
                    const hasTest = !!testStatusRaw;
                    return (
                      <div key={p.id} className="group p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 flex items-center justify-between hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center border border-zinc-200 dark:border-white/10 shadow-sm">
                            <Server size={18} className="opacity-70 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <div className="font-bold text-sm flex flex-wrap items-center gap-2">
                              {p.name}
                              {!p.enabled && <Badge variant="outline" className="text-[14px] h-4 px-1 opacity-50">{t('common.disabled')}</Badge>}
                              {!p.has_credential && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1 bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400">
                                  {t('admin.domain.noCredentialBadge') || 'NO SECRET'}
                                </Badge>
                              )}
                              {profile?.supports_ddns && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1 bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400">
                                  {t('admin.domain.capDdns') || 'DDNS'}
                                </Badge>
                              )}
                              {profile?.supports_acme_dns01 && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1 bg-cyan-500/10 border-cyan-500/20 text-cyan-800 dark:text-cyan-300">
                                  {t('admin.domain.capDns01') || 'DNS-01'}
                                </Badge>
                              )}
                              {p.has_credential && p.auth_ok === false && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1 bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400">
                                  {t('admin.domain.credErrorBadge') || 'CRED ERROR'}
                                </Badge>
                              )}
                              {p.has_credential && p.auth_ok === true && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1 bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400">
                                  {t('admin.domain.credOkBadge') || 'CRED OK'}
                                </Badge>
                              )}
                              {hasTest && (
                                <span title={p.auth_test_message || testStatusRaw}>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-[10px] h-4 px-1',
                                      testStatus.includes('fail') || testStatus.includes('error')
                                        ? 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'
                                        : testStatus.includes('skip')
                                          ? 'bg-zinc-500/10 border-zinc-500/20 text-zinc-700 dark:text-zinc-300'
                                          : 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400',
                                    )}
                                  >
                                    {testStatus.includes('fail') || testStatus.includes('error')
                                      ? (t('admin.domain.testFailBadge') || 'TEST FAIL')
                                      : testStatus.includes('skip')
                                        ? (t('admin.domain.testSkipBadge') || 'TEST SKIP')
                                        : (t('admin.domain.testOkBadge') || 'TEST OK')}
                                  </Badge>
                                </span>
                              )}
                            </div>
                            <div className="text-[14px] opacity-50 font-mono uppercase flex items-center gap-2">
                              <span>{p.provider_key}</span>
                              {profile?.vendor_type === 'ddns_only' && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1 bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400">DDNS ONLY</Badge>
                              )}
                            </div>
                            {p.auth_ok === false && p.auth_error && (
                              <div className="text-[14px] font-bold opacity-70 text-red-700 dark:text-red-400 max-w-[520px] truncate" title={p.auth_error}>
                                {p.auth_error}
                              </div>
                            )}
                            {(p.auth_test_status || p.auth_test_message) && (
                              <div
                                className="text-[14px] font-bold opacity-70 text-zinc-700 dark:text-zinc-300 max-w-[520px] truncate"
                                title={p.auth_test_message || p.auth_test_status || ''}
                              >
                                {p.auth_test_message || p.auth_test_status}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditProvider(p)}
                            className="p-2 rounded-lg bg-white dark:bg-white/10 border border-zinc-200 dark:border-white/10 hover:bg-primary hover:text-white transition-all shadow-sm"
                            title={t('common.edit') || 'Edit'}
                            aria-label={t('common.edit') || 'Edit'}
                          >
                            <Edit3 size={18} />
                          </button>
                          <button
                            onClick={() => deleteProvider(p.id)}
                            className="p-2 rounded-lg bg-white dark:bg-white/10 border border-zinc-200 dark:border-white/10 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                            title={t('common.delete') || 'Delete'}
                            aria-label={t('common.delete') || 'Delete'}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="sticky bottom-0 -mx-1 px-1 py-4 flex justify-end border-t border-zinc-200 dark:border-white/5 bg-white/85 dark:bg-black/40 backdrop-blur-xl">
                <Button variant="outline" onClick={() => setProviderModalOpen(false)} className="h-12 px-6 rounded-xl font-bold uppercase tracking-widest text-sm">{t('common.close')}</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className={sectionCardBase}>
                <div className="space-y-8">
                  <SectionHeader icon={Server} title={t('admin.domain.accountIdentity')} desc={t('admin.domain.providerAccountIdentity')} colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-500 border-indigo-500/20" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[14px] font-black uppercase tracking-widest opacity-50 dark:opacity-40 ml-1">{t('common.name')}</label>
                      <Input value={providerDraft.name} onChange={(e) => setProviderDraft((prev) => ({ ...prev, name: e.target.value }))} className={controlBase} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[14px] font-black uppercase tracking-widest opacity-50 dark:opacity-40 ml-1">{t('admin.domain.detectionSource')}</label>
                      <select className={selectBase} style={selectStyle} value={providerDraft.provider_key} onChange={(e) => setProviderDraft((prev) => ({ ...prev, provider_key: e.target.value }))}>
                        {providerProfilesForCurrentView.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className={sectionCardBase}>
                <div className="space-y-6">
                  <SectionHeader icon={Key} title={t('admin.domain.authConfig')} desc={t('admin.domain.authConfigDesc')} colorClass="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20" />
                  <div className="p-1">
                    <ProviderForm 
                      providerKey={providerDraft.provider_key}
                      providerProfile={providerDraftProfile}
                      credentialJson={providerDraft.credential_json_enc}
                      configJson={providerDraft.config_json}
                      onChangeCredential={(v) => setProviderDraft((prev) => ({ ...prev, credential_json_enc: v }))}
                      onChangeConfig={(v) => setProviderDraft((prev) => ({ ...prev, config_json: v }))}
                      isEdit={!!providerDraft.id}
                    />
                    {providerDraft.id && (
                      <p className="mt-4 text-[14px] text-zinc-500 italic px-1">{t('admin.domain.providerCredentialEditPlaceholder')}</p>
                    )}
                  </div>
                </div>
              </div>

              {providerDraft.id && providerDraftProfile?.supports_acme_dns01 && (
                <div className={sectionCardBase}>
                  <div className="space-y-6">
                    <SectionHeader
                      icon={Network}
                      title={t('common.check') || 'Check'}
                      desc={t('admin.domain.zoneHostExplicitHint') || 'Test DNS write permission with a temporary TXT record.'}
                      colorClass="bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20"
                    />

                    {providerDraftAccount?.has_credential === false && (
                      <div className="text-[14px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3">
                        {t('admin.domain.noCredentialHint') || 'No credential stored. Enter credentials and Save before testing.'}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[14px] font-black uppercase tracking-widest opacity-50 dark:opacity-40 ml-1">
                          {t('admin.domain.zoneLabel') || 'Zone'}
                        </label>
                        <Input
                          value={providerTestZone}
                          onChange={(e) => setProviderTestZone(e.target.value)}
                          placeholder={t('admin.domain.zonePlaceholder') || 'e.g. example.com'}
                          className={controlBase}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[14px] font-black uppercase tracking-widest opacity-50 dark:opacity-40 ml-1">
                          {t('admin.domain.hostLabel') || 'Host'}
                        </label>
                        <Input
                          value={providerTestHost}
                          onChange={(e) => setProviderTestHost(e.target.value)}
                          placeholder="_fileuni_verify"
                          className={controlBase}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <div className="flex flex-wrap justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={testProviderAuth}
                          disabled={providerAuthTestRunning || providerDraftAccount?.has_credential === false}
                          className="h-12 px-6 rounded-2xl border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 font-bold"
                        >
                          <Key size={16} className={cn('mr-2', providerAuthTestRunning && 'animate-pulse')} />
                          {providerAuthTestRunning ? (t('common.loading') || 'Loading') : (t('admin.domain.testAuth') || 'Test Auth')}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={testProviderDns}
                          disabled={providerTestRunning || providerDraftAccount?.has_credential === false}
                          className="h-12 px-6 rounded-2xl border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 font-bold"
                        >
                          <Search size={16} className={cn('mr-2', providerTestRunning && 'animate-pulse')} />
                          {providerTestRunning ? (t('common.loading') || 'Loading') : (t('admin.domain.testDns') || 'Test DNS')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {providerDraft.id && !providerDraftProfile?.supports_acme_dns01 && (
                <div className={sectionCardBase}>
                  <div className="space-y-6">
                    <SectionHeader
                      icon={Key}
                      title={t('admin.domain.testAuth') || 'Test Auth'}
                      desc={t('common.test') || 'Test Connection'}
                      colorClass="bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20"
                    />

                    {providerDraftAccount?.has_credential === false && (
                      <div className="text-[14px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3">
                        {t('admin.domain.noCredentialHint') || 'No credential stored. Enter credentials and Save before testing.'}
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        onClick={testProviderAuth}
                        disabled={providerAuthTestRunning || providerDraftAccount?.has_credential === false}
                        className="h-12 px-6 rounded-2xl border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 font-bold"
                      >
                        <Key size={16} className={cn('mr-2', providerAuthTestRunning && 'animate-pulse')} />
                        {providerAuthTestRunning ? (t('common.loading') || 'Loading') : (t('admin.domain.testAuth') || 'Test Auth')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className={sectionCardBase}>
                <label className="flex items-start gap-4 cursor-pointer group">
                  <div className="pt-1"><Switch checked={providerDraft.enabled} onChange={(v) => setProviderDraft((prev) => ({ ...prev, enabled: v }))} /></div>
                  <div>
                      <div className="text-sm font-black uppercase tracking-widest group-hover:text-primary transition-colors opacity-80">{t('admin.domain.statusEnabled')}</div>
                      <div className="text-[14px] opacity-60 dark:opacity-30 font-bold uppercase tracking-tighter">{t('admin.domain.readyForDdns')}</div>
                  </div>
                </label>
              </div>

              <div className="sticky bottom-0 -mx-1 px-1 py-4 flex justify-end gap-3 border-t border-zinc-200 dark:border-white/5 bg-white/85 dark:bg-black/40 backdrop-blur-xl">
                <Button variant="outline" onClick={() => setShowProviderList(true)} className="h-14 px-8 rounded-2xl border-zinc-300 dark:border-white/5 bg-white dark:bg-white/5 font-black uppercase tracking-widest text-sm shadow-sm text-foreground">{t('common.back')}</Button>
                <Button onClick={saveProviderQuick} className="h-14 px-10 rounded-2xl bg-gradient-to-br from-primary to-primary/90 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 border-t border-white/20 font-bold tracking-wider text-primary-foreground">
                  {providerDraft.id ? t('common.save') : t('admin.domain.create')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ZeroSSL Modal */}
      <Modal isOpen={zerosslModalOpen} onClose={() => setZeroSslModalOpen(false)} title={t('admin.domain.zerosslAccountManagement')} maxWidth="max-w-xl">
        <div className="space-y-8 overflow-y-auto max-h-[80vh] p-1 scrollbar-hide text-foreground">
          <div className={sectionCardBase}>
            <div className="space-y-8">
              <SectionHeader icon={LinkIcon} title={t('admin.acme.form.zerosslEab')} desc={t('admin.domain.zerosslEabDesc')} colorClass="bg-cyan-500/10 text-cyan-600 dark:text-cyan-500 border-cyan-500/20" />
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[14px] font-black uppercase tracking-widest opacity-50 dark:opacity-40 ml-1">{t('admin.domain.remark')}</label>
                  <Input value={zerosslDraft.name} onChange={(e) => setZeroSslDraft({ ...zerosslDraft, name: e.target.value })} className={controlBase} />
                </div>
                <div className="space-y-2">
                  <label className="text-[14px] font-black uppercase tracking-widest opacity-50 dark:opacity-40 ml-1">{t('admin.domain.eabKid')}</label>
                  <Input value={zerosslDraft.eab_kid} onChange={(e) => setZeroSslDraft({ ...zerosslDraft, eab_kid: e.target.value })} className={cn(controlBase, "font-mono text-[14px] tracking-tight")} />
                </div>
                <div className="space-y-2">
                  <label className="text-[14px] font-black uppercase tracking-widest opacity-50 dark:opacity-40 ml-1">{t('admin.domain.eabHmac')}</label>
                  <Input type="password" value={zerosslDraft.eab_hmac_key} onChange={(e) => setZeroSslDraft({ ...zerosslDraft, eab_hmac_key: e.target.value })} className={cn(controlBase, "font-mono text-[14px] tracking-tight")} />
                </div>
              </div>
            </div>
          </div>

          <div className={sectionCardBase}>
             <label className="flex items-start gap-4 cursor-pointer group">
                <div className="pt-1"><Switch checked={zerosslDraft.enabled} onChange={(v) => setZeroSslDraft({ ...zerosslDraft, enabled: v })} /></div>
                <div>
                   <div className="text-sm font-black uppercase tracking-widest group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors opacity-80">{t('admin.domain.statusEnabled')}</div>
                   <div className="text-[14px] opacity-60 dark:opacity-30 font-bold uppercase tracking-tighter">{t('admin.domain.availableForZerossl')}</div>
                </div>
             </label>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-white/5">
            <Button variant="outline" onClick={() => setZeroSslModalOpen(false)} className="h-14 px-8 rounded-2xl border-zinc-300 dark:border-white/5 bg-white dark:bg-white/5 font-black uppercase tracking-widest text-sm shadow-sm text-foreground">{t('common.cancel')}</Button>
            <Button onClick={saveZeroSslQuick} className="h-14 px-10 rounded-2xl bg-gradient-to-br from-primary to-primary/90 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 border-t border-white/20 font-bold tracking-wider text-primary-foreground">{t('admin.domain.create')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DomainAcmeDdnsAdmin;
