import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Modal } from '@/components/ui/Modal.tsx';
import { Switch } from '@/components/ui/Switch.tsx';
import { client, extractData, handleApiError } from '@/lib/api.ts';
import { useToastStore } from '@fileuni/shared';
import { useTranslation } from 'react-i18next';

type DdnsRecord = {
  id: string;
  name: string;
  enabled: boolean;
  provider: string;
  zone: string;
  record: string;
  record_type: string;
  ttl: number;
  proxied: boolean;
  provider_config_json: Record<string, unknown>;
  ipv4_enabled: boolean;
  ipv6_enabled: boolean;
  ipv4_source_json: Record<string, unknown>;
  ipv6_source_json: Record<string, unknown>;
  webhook_json: Record<string, unknown>;
  force_update: boolean;
  last_ipv4?: string;
  last_ipv6?: string;
  last_status?: string;
  last_error?: string;
};

type ProviderProfile = {
  key: string;
  name: string;
  mode: string;
  description: string;
  config_snippet_json: string;
  id_label: string;
  secret_label: string;
  ext_param_label: string;
  help_url: string;
  api_endpoint: string;
  signer: string;
  supports_ipv4: boolean;
  supports_ipv6: boolean;
};

type IpProbeProfile = {
  key: string;
  name: string;
  version: string;
  url: string;
  source: string;
};

type NetInterfaceItem = {
  name: string;
  addresses: string[];
};

type ProviderUiSpec = {
  key: string;
  name: string;
  idLabel: string;
  secretLabel: string;
  extLabel: string;
  extPlaceholder: string;
  helpUrl: string;
};

type ProviderForm = {
  id: string;
  secret: string;
  ext: string;
  callbackUrl: string;
  callbackBody: string;
  allowPrivateTarget: boolean;
};

type IpForm = {
  enabled: boolean;
  getType: 'url' | 'netInterface' | 'cmd';
  url: string;
  interfaceName: string;
  command: string;
  domainsText: string;
  ipv6Regex: string;
};

type WebhookForm = {
  enabled: boolean;
  url: string;
  requestBody: string;
  headersText: string;
  allowPrivateTarget: boolean;
};

type DdnsConfigDraft = {
  key: string;
  name: string;
  enabled: boolean;
  provider: string;
  ttl: number;
  proxied: boolean;
  forceUpdate: boolean;
  providerForm: ProviderForm;
  ipv4: IpForm;
  ipv6: IpForm;
  webhook: WebhookForm;
};

type ConfigSummary = {
  key: string;
  name: string;
  enabled: boolean;
  provider: string;
  ttl: number;
  recordIds: string[];
  lastIpv4?: string;
  lastIpv6?: string;
  lastStatus?: string;
  lastError?: string;
};

const defaultIpv4Urls = (lang: string): string =>
  (lang.toLowerCase().startsWith('zh')
    ? [
        'https://myip.ipip.net',
        'https://ddns.oray.com/checkip',
        'https://ip.3322.net',
        'https://4.ipw.cn',
        'https://v4.yinghualuo.cn/bejson',
      ]
    : [
        'https://api.ipify.org',
        'https://ddns.oray.com/checkip',
        'https://ip.3322.net',
        'https://4.ipw.cn',
        'https://v4.yinghualuo.cn/bejson',
      ]).join(', ');

const defaultIpv6Urls = (lang: string): string =>
  (lang.toLowerCase().startsWith('zh')
    ? ['https://speed.neu6.edu.cn/getIP.php', 'https://v6.ident.me', 'https://6.ipw.cn', 'https://v6.yinghualuo.cn/bejson']
    : ['https://api64.ipify.org', 'https://speed.neu6.edu.cn/getIP.php', 'https://v6.ident.me', 'https://6.ipw.cn', 'https://v6.yinghualuo.cn/bejson']).join(', ');

const PROVIDER_SPECS: ProviderUiSpec[] = [
  {
    key: 'alidns',
    name: 'alidns',
    idLabel: 'AccessKey ID',
    secretLabel: 'AccessKey Secret',
    extLabel: '',
    extPlaceholder: '',
    helpUrl: 'https://ram.console.aliyun.com/manage/ak',
  },
  {
    key: 'cloudflare',
    name: 'cloudflare',
    idLabel: '',
    secretLabel: 'Token',
    extLabel: '',
    extPlaceholder: '',
    helpUrl: 'https://dash.cloudflare.com/profile/api-tokens',
  },
  {
    key: 'tencentcloud',
    name: 'tencentcloud',
    idLabel: 'SecretId',
    secretLabel: 'SecretKey',
    extLabel: '',
    extPlaceholder: '',
    helpUrl: 'https://console.cloud.tencent.com/cam/capi',
  },
  {
    key: 'dnspod',
    name: 'dnspod',
    idLabel: 'ID',
    secretLabel: 'Token',
    extLabel: '',
    extPlaceholder: '',
    helpUrl: 'https://console.dnspod.cn/account/token/token',
  },
  {
    key: 'callback',
    name: 'callback',
    idLabel: 'URL',
    secretLabel: 'RequestBody',
    extLabel: '',
    extPlaceholder: '',
    helpUrl: 'https://github.com/jeessy2/ddns-go#callback',
  },
  {
    key: 'vercel',
    name: 'vercel',
    idLabel: '',
    secretLabel: 'Token',
    extLabel: 'Team ID',
    extPlaceholder: 'team_xxxxxx',
    helpUrl: 'https://vercel.com/account/tokens',
  },
];

const WEBHOOK_EXAMPLES: Array<{ key: string; title: string; url: string; body: string }> = [
  {
    key: 'serverchan',
    title: 'serverchan',
    url: 'https://sctapi.ftqq.com/[SendKey].send?title=IP changed&desp=IPv4 #{ipv4Addr}, result #{ipv4Result}',
    body: '',
  },
  {
    key: 'dingtalk',
    title: 'dingtalk',
    url: 'https://oapi.dingtalk.com/robot/send?access_token=token',
    body: '{"msgtype":"markdown","markdown":{"title":"IP changed","text":"### IP changed\\n- IPv4 #{ipv4Addr}\\n- Result #{ipv4Result}"}}',
  },
  {
    key: 'feishu',
    title: 'feishu',
    url: 'https://open.feishu.cn/open-apis/bot/v2/hook/token',
    body: '{"msg_type":"text","content":{"text":"IPv4 #{ipv4Addr}, result #{ipv4Result}"}}',
  },
  {
    key: 'discord',
    title: 'discord',
    url: 'https://discord.com/api/webhooks/xxx/yyy',
    body: '{"content":"Domains #{ipv4Domains}, result #{ipv4Result}, ip #{ipv4Addr}"}',
  },
];

const TTL_OPTIONS: Array<{ label: string; value: number }> = [
  { label: 'auto', value: 0 },
  { label: '1s', value: 1 },
  { label: '5s', value: 5 },
  { label: '10s', value: 10 },
  { label: '1m', value: 60 },
  { label: '2m', value: 120 },
  { label: '10m', value: 600 },
  { label: '30m', value: 1800 },
  { label: '1h', value: 3600 },
];

const newConfigKey = () => `cfg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildDefaultDraft = (defaultName: string, lang: string): DdnsConfigDraft => ({
  key: newConfigKey(),
  name: defaultName,
  enabled: true,
  provider: 'cloudflare',
  ttl: 0,
  proxied: false,
  forceUpdate: false,
  providerForm: {
    id: '',
    secret: '',
    ext: '',
    callbackUrl: '',
    callbackBody: '',
    allowPrivateTarget: false,
  },
  ipv4: {
    enabled: true,
    getType: 'url',
    url: defaultIpv4Urls(lang),
    interfaceName: '',
    command: '',
    domainsText: '',
    ipv6Regex: '',
  },
  ipv6: {
    enabled: true,
    getType: 'netInterface',
    url: defaultIpv6Urls(lang),
    interfaceName: '',
    command: '',
    domainsText: '',
    ipv6Regex: '',
  },
  webhook: {
    enabled: false,
    url: '',
    requestBody: '',
    headersText: '',
    allowPrivateTarget: false,
  },
});

const splitLines = (raw: string): string[] =>
  raw
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const parseCommaUrls = (raw: string): string[] =>
  raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const parseHeadersText = (raw: string): Record<string, string> => {
  const headers: Record<string, string> = {};
  const lines = splitLines(raw);
  for (const line of lines) {
    const index = line.indexOf(':');
    if (index <= 0) {
      continue;
    }
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (key) {
      headers[key] = value;
    }
  }
  return headers;
};

const buildProviderConfig = (draft: DdnsConfigDraft) => {
  if (draft.provider === 'callback') {
    return {
      method: draft.providerForm.callbackBody.trim().length > 0 ? 'POST' : 'GET',
      url: draft.providerForm.callbackUrl,
      headers: {},
      body: draft.providerForm.callbackBody,
      success_keyword: '',
      allow_private_target: draft.providerForm.allowPrivateTarget,
      // Keep ddns-go style fields for future provider expansion.
      provider_id: draft.providerForm.id,
      provider_secret: draft.providerForm.secret,
      provider_ext: draft.providerForm.ext,
    };
  }
  if (draft.provider === 'cloudflare') {
    return {
      api_token: draft.providerForm.secret,
      zone_id: draft.providerForm.id,
      ext_param: draft.providerForm.ext,
    };
  }
  return {
    provider_id: draft.providerForm.id,
    provider_secret: draft.providerForm.secret,
    provider_ext: draft.providerForm.ext,
  };
};

const buildSourceJson = (ip: IpForm) => ({
  method: ip.getType === 'netInterface' ? 'netInterface' : ip.getType === 'cmd' ? 'cmd' : 'url',
  urls: ip.getType === 'url' ? parseCommaUrls(ip.url) : [],
  interface_name: ip.getType === 'netInterface' ? ip.interfaceName : '',
  command: ip.getType === 'cmd' ? ip.command : '',
  fixed_ip: '',
  ipv6_reg: ip.ipv6Regex,
});

const buildWebhookJson = (webhook: WebhookForm) => ({
  enabled: webhook.enabled,
  method: webhook.requestBody.trim().length > 0 ? 'POST' : 'GET',
  url: webhook.url,
  headers: parseHeadersText(webhook.headersText),
  body_template: webhook.requestBody,
  success_keyword: '',
  allow_private_target: webhook.allowPrivateTarget,
});

const buildRecordName = (draft: DdnsConfigDraft, family: 'A' | 'AAAA', domain: string) => `${draft.name} | ${family} | ${domain}`;

const splitDomainQuery = (raw: string): { domainPart: string; customParams: string } => {
  const trimmed = raw.trim();
  const idx = trimmed.indexOf('?');
  if (idx < 0) {
    return { domainPart: trimmed, customParams: '' };
  }
  const domainPart = trimmed.slice(0, idx).trim();
  const customParams = trimmed.slice(idx + 1).trim();
  return { domainPart, customParams };
};

const normalizeDomain = (raw: string): { zone: string; host: string; customParams: string } => {
  const { domainPart, customParams } = splitDomainQuery(raw);
  if (domainPart.includes(':')) {
    const [host, zone] = domainPart.split(':');
    return { zone: zone || '', host: host || '@', customParams };
  }
  const parts = domainPart.split('.').filter((item) => item.length > 0);
  if (parts.length < 2) {
    return { zone: domainPart, host: '@', customParams };
  }
  const zone = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  const host = parts.slice(0, parts.length - 2).join('.') || '@';
  return { zone, host, customParams };
};

const matchesDraft = (record: DdnsRecord, draftKey: string) => {
  const marker = String((record.provider_config_json as Record<string, unknown>)['ddns_group_key'] || '');
  return marker === draftKey;
};

export const DdnsAdmin = () => {
  const { t, i18n } = useTranslation();
  const { addToast } = useToastStore();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<DdnsRecord[]>([]);
  const [profiles, setProfiles] = useState<ProviderProfile[]>([]);
  const [probeProfiles, setProbeProfiles] = useState<IpProbeProfile[]>([]);
  const [ipv4Interfaces, setIpv4Interfaces] = useState<NetInterfaceItem[]>([]);
  const [ipv6Interfaces, setIpv6Interfaces] = useState<NetInterfaceItem[]>([]);
  const [selectedConfigKey, setSelectedConfigKey] = useState<string>('');
  const [draft, setDraft] = useState<DdnsConfigDraft>(() => buildDefaultDraft('DDNS Config', 'en'));
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);

  const providerOptions = useMemo(() => {
    const table = new Map(PROVIDER_SPECS.map((item) => [item.key, item]));
    for (const profile of profiles) {
      table.set(profile.key, {
        key: profile.key,
        name: profile.name,
        idLabel: profile.id_label || table.get(profile.key)?.idLabel || 'ID',
        secretLabel: profile.secret_label || table.get(profile.key)?.secretLabel || 'Secret',
        extLabel: profile.ext_param_label || table.get(profile.key)?.extLabel || '',
        extPlaceholder: profile.ext_param_label || table.get(profile.key)?.extPlaceholder || '',
        helpUrl: profile.help_url || table.get(profile.key)?.helpUrl || '',
      });
    }
    return Array.from(table.values());
  }, [profiles]);

  const groups = useMemo(() => {
    const map = new Map<string, ConfigSummary>();
    for (const item of records) {
      const marker = String((item.provider_config_json as Record<string, unknown>)['ddns_group_key'] || item.id);
      const name = String((item.provider_config_json as Record<string, unknown>)['ddns_group_name'] || item.name);
      const provider = String((item.provider_config_json as Record<string, unknown>)['ddns_provider'] || item.provider);
      if (!map.has(marker)) {
        map.set(marker, {
          key: marker,
          name,
          enabled: item.enabled,
          provider,
          ttl: item.ttl,
          recordIds: [item.id],
          lastIpv4: item.last_ipv4,
          lastIpv6: item.last_ipv6,
          lastStatus: item.last_status,
          lastError: item.last_error,
        });
      } else {
        const exist = map.get(marker)!;
        exist.recordIds.push(item.id);
        exist.lastIpv4 = exist.lastIpv4 || item.last_ipv4;
        exist.lastIpv6 = exist.lastIpv6 || item.last_ipv6;
        exist.lastStatus = exist.lastStatus || item.last_status;
        exist.lastError = exist.lastError || item.last_error;
      }
    }
    return Array.from(map.values());
  }, [records]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [providerData, recordData, probeData] = await Promise.all([
        extractData<ProviderProfile[]>(client.GET('/api/v1/admin/ddns/providers')),
        extractData<DdnsRecord[]>(client.GET('/api/v1/admin/ddns/records')),
        extractData<IpProbeProfile[]>(client.GET('/api/v1/admin/ddns/ip-probes')),
      ]);
      const interfaceData = await extractData<{ ipv4: NetInterfaceItem[]; ipv6: NetInterfaceItem[] }>(
        client.GET('/api/v1/admin/ddns/net-interfaces'),
      );
      setProfiles(providerData);
      setRecords(recordData);
      setProbeProfiles(probeData);
      setIpv4Interfaces(Array.isArray(interfaceData.ipv4) ? interfaceData.ipv4 : []);
      setIpv6Interfaces(Array.isArray(interfaceData.ipv6) ? interfaceData.ipv6 : []);
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const hydrateDraftFromGroup = (groupKey: string) => {
    const groupRecords = records.filter((item) => matchesDraft(item, groupKey));
    if (groupRecords.length === 0) {
      return;
    }
    const sample = groupRecords[0];
    const providerCfg = sample.provider_config_json as Record<string, unknown>;
    const provider = String(providerCfg['ddns_provider'] || sample.provider);

    const ipv4Record = groupRecords.find((item) => item.record_type === 'A');
    const ipv6Record = groupRecords.find((item) => item.record_type === 'AAAA');

    const makeIpForm = (record: DdnsRecord | undefined, fallback: 'url' | 'netInterface' | 'cmd'): IpForm => {
      if (!record) {
        return {
          enabled: false,
          getType: fallback,
          url: fallback === 'url' ? defaultIpv4Urls(i18n.language || 'en') : '',
          interfaceName: '',
          command: '',
          domainsText: '',
          ipv6Regex: '',
        };
      }
      const source = record.ipv4_source_json || {};
      const sourceObj = source as Record<string, unknown>;
      const method = String(sourceObj.method || fallback);
      const getType: 'url' | 'netInterface' | 'cmd' =
        method === 'interface' || method === 'netInterface' ? 'netInterface' : method === 'command' || method === 'cmd' ? 'cmd' : 'url';
      const urls = Array.isArray(sourceObj.urls) ? (sourceObj.urls as string[]) : [];
      const domainsRaw = String(providerCfg[record.record_type === 'AAAA' ? 'ddns_ipv6_domains' : 'ddns_ipv4_domains'] || '');

      return {
        enabled: record.record_type === 'AAAA' ? record.ipv6_enabled : record.ipv4_enabled,
        getType,
        url: urls.join(', '),
        interfaceName: String(sourceObj.interface_name || ''),
        command: String(sourceObj.command || ''),
        domainsText: domainsRaw,
        ipv6Regex: String(sourceObj.ipv6_reg || ''),
      };
    };

    const webhook = (sample.webhook_json || {}) as Record<string, unknown>;
    const headersObj = webhook.headers && typeof webhook.headers === 'object' ? (webhook.headers as Record<string, unknown>) : {};
    const headersText = Object.entries(headersObj)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join('\n');

    const next: DdnsConfigDraft = {
      key: groupKey,
      name: String(providerCfg['ddns_group_name'] || sample.name),
      enabled: sample.enabled,
      provider,
      ttl: sample.ttl,
      proxied: sample.proxied,
      forceUpdate: sample.force_update,
      providerForm: {
        id: String(providerCfg['provider_id'] || providerCfg['zone_id'] || ''),
        secret: String(providerCfg['provider_secret'] || providerCfg['api_token'] || ''),
        ext: String(providerCfg['provider_ext'] || providerCfg['ext_param'] || ''),
        callbackUrl: String(providerCfg['callback_url'] || providerCfg['url'] || ''),
        callbackBody: String(providerCfg['callback_body'] || providerCfg['body'] || ''),
        allowPrivateTarget: Boolean(providerCfg['allow_private_target']),
      },
      ipv4: makeIpForm(ipv4Record, 'url'),
      ipv6: makeIpForm(ipv6Record, 'netInterface'),
      webhook: {
        enabled: Boolean(webhook.enabled),
        url: String(webhook.url || ''),
        requestBody: String(webhook.body_template || ''),
        headersText,
        allowPrivateTarget: Boolean(webhook.allow_private_target),
      },
    };

    setDraft(next);
    setSelectedConfigKey(groupKey);
  };

  useEffect(() => {
    if (groups.length === 0) {
      const fallback = buildDefaultDraft(t('admin.ddns.defaultConfigName'), i18n.language || 'en');
      setDraft(fallback);
      setSelectedConfigKey(fallback.key);
      return;
    }
    if (!selectedConfigKey || !groups.some((item) => item.key === selectedConfigKey)) {
      hydrateDraftFromGroup(groups[0].key);
    }
  }, [groups, selectedConfigKey, t, i18n.language]);

  const createNewDraft = () => {
    const next = buildDefaultDraft(t('admin.ddns.defaultConfigName'), i18n.language || 'en');
    setDraft(next);
    setSelectedConfigKey(next.key);
  };

  const renameCurrentDraft = () => {
    const currentName = draft.name.trim();
    const input = window.prompt(t('admin.ddns.renamePrompt'), currentName);
    if (!input) {
      return;
    }
    const name = input.trim();
    if (!name) {
      return;
    }
    setDraft((old) => ({ ...old, name }));
  };

  const deleteCurrentDraft = async () => {
    if (!selectedConfigKey) {
      return;
    }
    const ok = window.confirm(t('admin.ddns.deleteConfirm'));
    if (!ok) {
      return;
    }
    await deleteGroup(selectedConfigKey);
  };

  const applyWebhookExample = (key: string) => {
    const example = WEBHOOK_EXAMPLES.find((item) => item.key === key);
    if (!example) {
      return;
    }
    setDraft((old) => ({
      ...old,
      webhook: {
        ...old.webhook,
        enabled: true,
        url: example.url,
        requestBody: example.body,
      },
    }));
  };

  const testIpDetect = async (version: 'v4' | 'v6') => {
    try {
      const ip = version === 'v4' ? draft.ipv4 : draft.ipv6;
      const sourceJson = buildSourceJson(ip);
      const query = new URLSearchParams({
        version,
        source_json: JSON.stringify(sourceJson),
      }).toString();
      const result = await extractData<{ ip?: string }>(client.GET(`/api/v1/admin/ddns/detect-ip?${query}`));
      if (result.ip) {
        addToast(t('admin.ddns.detectSuccess', { version, ip: result.ip }), 'success');
      } else {
        addToast(t('admin.ddns.detectFailed', { version }), 'error');
      }
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const deleteGroup = async (groupKey: string) => {
    const target = groups.find((item) => item.key === groupKey);
    if (!target) {
      return;
    }
    try {
      for (const id of target.recordIds) {
        await extractData<boolean>(client.DELETE('/api/v1/admin/ddns/records/{id}', {
          params: { path: { id } },
        }));
      }
      addToast(t('admin.ddns.deleteSuccess'), 'success');
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const runGroup = async (groupKey: string) => {
    const target = groups.find((item) => item.key === groupKey);
    if (!target) {
      return;
    }
    try {
      for (const id of target.recordIds) {
        await extractData(client.POST('/api/v1/admin/ddns/records/{id}/run', {
          params: { path: { id } },
        }));
      }
      addToast(t('admin.ddns.runSuccess'), 'success');
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const testWebhook = async () => {
    try {
      await extractData(client.POST('/api/v1/admin/ddns/webhook-test', {
        body: {
          url: draft.webhook.url,
          request_body: draft.webhook.requestBody,
          headers_text: draft.webhook.headersText,
          allow_private_target: draft.webhook.allowPrivateTarget,
        },
      }));
      addToast(t('admin.ddns.webhookTestSuccess'), 'success');
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const saveDraft = async () => {
    const ipv4Domains = splitLines(draft.ipv4.domainsText);
    const ipv6Domains = splitLines(draft.ipv6.domainsText);

    if (draft.ipv4.enabled && ipv4Domains.length === 0) {
      addToast(t('admin.ddns.ipv4DomainsRequired'), 'error');
      return;
    }
    if (draft.ipv6.enabled && ipv6Domains.length === 0) {
      addToast(t('admin.ddns.ipv6DomainsRequired'), 'error');
      return;
    }

    try {
      const providerConfig = buildProviderConfig(draft) as Record<string, unknown>;
      providerConfig.ddns_group_key = draft.key;
      providerConfig.ddns_group_name = draft.name;
      providerConfig.ddns_provider = draft.provider;
      providerConfig.ddns_ipv4_domains = draft.ipv4.domainsText;
      providerConfig.ddns_ipv6_domains = draft.ipv6.domainsText;
      providerConfig.callback_url = draft.providerForm.callbackUrl;
      providerConfig.callback_body = draft.providerForm.callbackBody;

      const webhookJson = buildWebhookJson(draft.webhook);

      const existingIds = groups.find((item) => item.key === draft.key)?.recordIds || [];
      for (const id of existingIds) {
        await extractData<boolean>(client.DELETE('/api/v1/admin/ddns/records/{id}', {
          params: { path: { id } },
        }));
      }

      if (draft.ipv4.enabled) {
        for (const domainRaw of ipv4Domains) {
          const domain = normalizeDomain(domainRaw);
          const rowProviderConfig = { ...providerConfig, ddns_custom_params: domain.customParams };
          await extractData(client.POST('/api/v1/admin/ddns/records', {
            body: {
              name: buildRecordName(draft, 'A', domainRaw),
              enabled: draft.enabled,
              provider: draft.provider,
              zone: domain.zone,
              record: domain.host,
              record_type: 'A',
              ttl: draft.ttl,
              proxied: draft.proxied,
              provider_config_json: rowProviderConfig,
              ipv4_enabled: true,
              ipv6_enabled: false,
              ipv4_source_json: buildSourceJson(draft.ipv4),
              ipv6_source_json: buildSourceJson(draft.ipv6),
              webhook_json: webhookJson,
              force_update: draft.forceUpdate,
            },
          }));
        }
      }

      if (draft.ipv6.enabled) {
        for (const domainRaw of ipv6Domains) {
          const domain = normalizeDomain(domainRaw);
          const rowProviderConfig = { ...providerConfig, ddns_custom_params: domain.customParams };
          await extractData(client.POST('/api/v1/admin/ddns/records', {
            body: {
              name: buildRecordName(draft, 'AAAA', domainRaw),
              enabled: draft.enabled,
              provider: draft.provider,
              zone: domain.zone,
              record: domain.host,
              record_type: 'AAAA',
              ttl: draft.ttl,
              proxied: draft.proxied,
              provider_config_json: rowProviderConfig,
              ipv4_enabled: false,
              ipv6_enabled: true,
              ipv4_source_json: buildSourceJson(draft.ipv4),
              ipv6_source_json: buildSourceJson(draft.ipv6),
              webhook_json: webhookJson,
              force_update: draft.forceUpdate,
            },
          }));
        }
      }

      addToast(t('admin.ddns.saveSuccess'), 'success');
      setSaveConfirmOpen(false);
      await loadAll();
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  };

  const getProviderName = (key: string): string => {
    return t(`admin.ddns.providers.${key}`);
  };

  const getWebhookExampleTitle = (key: string): string => {
    return t(`admin.ddns.webhookExamples.${key}`);
  };

  const getTtlLabel = (label: string): string => {
    return t(`admin.ddns.ttlOptions.${label}`);
  };

  const providerSpec = providerOptions.find((item) => item.key === draft.provider) || providerOptions[0];
  const providerMeta = useMemo(() => profiles.find((item) => item.key === draft.provider), [profiles, draft.provider]);
  const ipv4ProbeHint = useMemo(
    () => probeProfiles.filter((item) => item.version === 'v4').map((item) => item.url).join(', '),
    [probeProfiles],
  );
  const ipv6ProbeHint = useMemo(
    () => probeProfiles.filter((item) => item.version === 'v6').map((item) => item.url).join(', '),
    [probeProfiles],
  );
  const ipv6RegexHint = useMemo(() => {
    if (draft.ipv6.getType !== 'netInterface') {
      return '';
    }
    const regex = draft.ipv6.ipv6Regex.trim();
    if (!regex) {
      return '';
    }
    const addresses = ipv6Interfaces.find((item) => item.name === draft.ipv6.interfaceName)?.addresses || [];
    if (addresses.length === 0) {
      return t('admin.ddns.ipv6RegexNoInterface');
    }
    const idxMatched = regex.match(/^@(\d+)$/);
    if (idxMatched) {
      const index = Number(idxMatched[1]) - 1;
      if (index < 0 || index >= addresses.length) {
        return t('admin.ddns.ipv6RegexOutOfRange');
      }
      return t('admin.ddns.ipv6RegexMatched', { ip: addresses[index] });
    }
    try {
      const exp = new RegExp(regex);
      const matched = addresses.find((item) => exp.test(item));
      if (matched) {
        return t('admin.ddns.ipv6RegexMatched', { ip: matched });
      }
      return t('admin.ddns.ipv6RegexNoMatch');
    } catch (_error) {
      return t('admin.ddns.ipv6RegexInvalid');
    }
  }, [draft.ipv6.getType, draft.ipv6.ipv6Regex, draft.ipv6.interfaceName, ipv6Interfaces, t]);

  if (loading) {
    return <div className="py-10 text-sm font-semibold opacity-70">{t('admin.ddns.loading')}</div>;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-20">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-black">{t('admin.ddns.title')}</h3>
            <div className="text-sm opacity-70 mt-1">{t('admin.ddns.subtitle')}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => extractData(client.POST('/api/v1/admin/ddns/run-all')).then(() => loadAll())}>
              {t('admin.ddns.runAll')}
            </Button>
            <Button variant="outline" onClick={createNewDraft}>{t('admin.ddns.newConfig')}</Button>
            <Button variant="outline" onClick={renameCurrentDraft}>{t('admin.ddns.renameConfig')}</Button>
            <Button variant="outline" onClick={deleteCurrentDraft}>{t('admin.ddns.deleteConfig')}</Button>
            <Button onClick={() => setSaveConfirmOpen(true)}>{t('admin.ddns.save')}</Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <div className="text-sm font-semibold mb-3">{t('admin.ddns.configList')}</div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
          <select
            className="h-11 rounded-xl border border-white/10 bg-black/10 px-3 text-sm"
            value={selectedConfigKey}
            onChange={(e) => hydrateDraftFromGroup(e.target.value)}
          >
            {groups.length === 0 ? (
              <option value="">{t('admin.ddns.noConfigs')}</option>
            ) : null}
            {groups.map((item) => (
              <option key={item.key} value={item.key}>
                {item.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={createNewDraft}>{t('admin.ddns.newConfig')}</Button>
            <Button size="sm" variant="outline" onClick={renameCurrentDraft}>{t('admin.ddns.renameConfig')}</Button>
            <Button size="sm" variant="outline" onClick={deleteCurrentDraft}>{t('admin.ddns.delete')}</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-3">
            <h4 className="text-base font-black">{t('admin.ddns.providerTitle')}</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input value={draft.name} onChange={(e) => setDraft((old) => ({ ...old, name: e.target.value }))} placeholder={t('admin.ddns.configNamePlaceholder')} />
              <select
                className="h-11 rounded-xl border border-white/10 bg-black/10 px-3 text-sm"
                value={draft.provider}
                onChange={(e) => setDraft((old) => ({ ...old, provider: e.target.value }))}
              >
                {providerOptions.map((item) => (
                  <option key={item.key} value={item.key}>{getProviderName(item.key)}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {providerSpec?.idLabel ? (
                <Input
                  value={draft.providerForm.id}
                  onChange={(e) => setDraft((old) => ({ ...old, providerForm: { ...old.providerForm, id: e.target.value } }))}
                  placeholder={providerSpec.idLabel}
                />
              ) : <div />}
              <Input
                value={draft.providerForm.secret}
                onChange={(e) => setDraft((old) => ({ ...old, providerForm: { ...old.providerForm, secret: e.target.value } }))}
                placeholder={providerSpec?.secretLabel || t('admin.ddns.secretPlaceholder')}
              />
            </div>

            {providerSpec?.extLabel ? (
              <Input
                value={draft.providerForm.ext}
                onChange={(e) => setDraft((old) => ({ ...old, providerForm: { ...old.providerForm, ext: e.target.value } }))}
                placeholder={providerSpec.extPlaceholder || providerSpec.extLabel}
              />
            ) : null}

            {draft.provider === 'callback' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between h-11 rounded-xl border border-white/10 bg-black/10 px-3">
                  <span className="text-sm opacity-70">{t('admin.ddns.allowPrivateTarget')}</span>
                  <Switch checked={draft.providerForm.allowPrivateTarget} onChange={(v) => setDraft((old) => ({ ...old, providerForm: { ...old.providerForm, allowPrivateTarget: v } }))} />
                </div>
                <Input
                  value={draft.providerForm.callbackUrl}
                  onChange={(e) => setDraft((old) => ({ ...old, providerForm: { ...old.providerForm, callbackUrl: e.target.value } }))}
                  placeholder={t('admin.ddns.callbackUrlPlaceholder')}
                />
                <textarea
                  className="w-full min-h-24 rounded-xl border border-white/10 bg-black/10 p-3 text-sm font-mono"
                  value={draft.providerForm.callbackBody}
                  onChange={(e) => setDraft((old) => ({ ...old, providerForm: { ...old.providerForm, callbackBody: e.target.value } }))}
                  placeholder={t('admin.ddns.callbackBodyPlaceholder')}
                />
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-sm opacity-70">{t('admin.ddns.ttlLabel')}</div>
                <select
                  className="h-11 rounded-xl border border-white/10 bg-black/10 px-3 text-sm w-full"
                  value={String(draft.ttl)}
                  onChange={(e) => setDraft((old) => ({ ...old, ttl: Number(e.target.value) || 0 }))}
                >
                  {TTL_OPTIONS.map((item) => (
                    <option key={item.label} value={item.value}>
                      {getTtlLabel(item.label)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2 items-end">
                <div className="space-y-1">
                  <div className="text-sm opacity-70">{t('admin.ddns.enabledPlaceholder')}</div>
                  <Switch checked={draft.enabled} onChange={(value) => setDraft((old) => ({ ...old, enabled: value }))} />
                </div>
                <div className="space-y-1">
                  <div className="text-sm opacity-70">{t('admin.ddns.proxiedPlaceholder')}</div>
                  <Switch checked={draft.proxied} onChange={(value) => setDraft((old) => ({ ...old, proxied: value }))} />
                </div>
                <div className="space-y-1">
                  <div className="text-sm opacity-70">{t('admin.ddns.forceUpdatePlaceholder')}</div>
                  <Switch checked={draft.forceUpdate} onChange={(value) => setDraft((old) => ({ ...old, forceUpdate: value }))} />
                </div>
              </div>
            </div>

            {providerSpec?.helpUrl ? (
              <a className="text-sm underline opacity-80" href={providerSpec.helpUrl} target="_blank" rel="noreferrer">{t('admin.ddns.providerHelp')}</a>
            ) : null}
            {providerMeta ? (
              <div className="text-sm opacity-70">
                {providerMeta.api_endpoint} | {providerMeta.signer} | IPv6: {providerMeta.supports_ipv6 ? t('admin.ddns.ipv6SupportYes') : t('admin.ddns.ipv6SupportNo')}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-3">
            <h4 className="text-base font-black">{t('admin.ddns.ipv4Title')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="h-11 rounded-xl border border-white/10 bg-black/10 px-3 text-sm flex items-center justify-between">
                <span className="text-sm opacity-70">{t('admin.ddns.enabledPlaceholder')}</span>
                <Switch checked={draft.ipv4.enabled} onChange={(value) => setDraft((old) => ({ ...old, ipv4: { ...old.ipv4, enabled: value } }))} />
              </div>
              <select className="h-11 rounded-xl border border-white/10 bg-black/10 px-3 text-sm" value={draft.ipv4.getType} onChange={(e) => setDraft((old) => ({ ...old, ipv4: { ...old.ipv4, getType: e.target.value as IpForm['getType'] } }))}>
                <option value="url">{t('admin.ddns.byApi')}</option>
                <option value="netInterface">{t('admin.ddns.byInterface')}</option>
                <option value="cmd">{t('admin.ddns.byCommand')}</option>
              </select>
              <Button variant="outline" onClick={() => testIpDetect('v4')}>{t('admin.ddns.detectIpv4')}</Button>
            </div>

            {draft.ipv4.getType === 'url' ? (
              <Input value={draft.ipv4.url} onChange={(e) => setDraft((old) => ({ ...old, ipv4: { ...old.ipv4, url: e.target.value } }))} placeholder={t('admin.ddns.ipv4UrlPlaceholder')} />
            ) : null}
            {draft.ipv4.getType === 'netInterface' ? (
              <select
                className="h-11 rounded-xl border border-white/10 bg-black/10 px-3 text-sm w-full"
                value={draft.ipv4.interfaceName}
                onChange={(e) => setDraft((old) => ({ ...old, ipv4: { ...old.ipv4, interfaceName: e.target.value } }))}
              >
                <option value="">{t('admin.ddns.interfacePlaceholder')}</option>
                {ipv4Interfaces.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name} {item.addresses.join(', ')}
                  </option>
                ))}
              </select>
            ) : null}
            {draft.ipv4.getType === 'cmd' ? (
              <Input value={draft.ipv4.command} onChange={(e) => setDraft((old) => ({ ...old, ipv4: { ...old.ipv4, command: e.target.value } }))} placeholder={t('admin.ddns.commandPlaceholder')} />
            ) : null}
            {draft.ipv4.getType === 'url' && ipv4ProbeHint ? (
              <div className="text-sm opacity-70">{ipv4ProbeHint}</div>
            ) : null}

            <textarea
              className="w-full min-h-24 rounded-xl border border-white/10 bg-black/10 p-3 text-sm font-mono"
              value={draft.ipv4.domainsText}
              onChange={(e) => setDraft((old) => ({ ...old, ipv4: { ...old.ipv4, domainsText: e.target.value } }))}
              placeholder={t('admin.ddns.domainsPlaceholder')}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-3">
            <h4 className="text-base font-black">{t('admin.ddns.ipv6Title')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="h-11 rounded-xl border border-white/10 bg-black/10 px-3 text-sm flex items-center justify-between">
                <span className="text-sm opacity-70">{t('admin.ddns.enabledPlaceholder')}</span>
                <Switch checked={draft.ipv6.enabled} onChange={(value) => setDraft((old) => ({ ...old, ipv6: { ...old.ipv6, enabled: value } }))} />
              </div>
              <select className="h-11 rounded-xl border border-white/10 bg-black/10 px-3 text-sm" value={draft.ipv6.getType} onChange={(e) => setDraft((old) => ({ ...old, ipv6: { ...old.ipv6, getType: e.target.value as IpForm['getType'] } }))}>
                <option value="url">{t('admin.ddns.byApi')}</option>
                <option value="netInterface">{t('admin.ddns.byInterface')}</option>
                <option value="cmd">{t('admin.ddns.byCommand')}</option>
              </select>
              <Button variant="outline" onClick={() => testIpDetect('v6')}>{t('admin.ddns.detectIpv6')}</Button>
            </div>

            {draft.ipv6.getType === 'url' ? (
              <Input value={draft.ipv6.url} onChange={(e) => setDraft((old) => ({ ...old, ipv6: { ...old.ipv6, url: e.target.value } }))} placeholder={t('admin.ddns.ipv6UrlPlaceholder')} />
            ) : null}
            {draft.ipv6.getType === 'netInterface' ? (
              <select
                className="h-11 rounded-xl border border-white/10 bg-black/10 px-3 text-sm w-full"
                value={draft.ipv6.interfaceName}
                onChange={(e) => setDraft((old) => ({ ...old, ipv6: { ...old.ipv6, interfaceName: e.target.value } }))}
              >
                <option value="">{t('admin.ddns.interfacePlaceholder')}</option>
                {ipv6Interfaces.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name} {item.addresses.join(', ')}
                  </option>
                ))}
              </select>
            ) : null}
            {draft.ipv6.getType === 'cmd' ? (
              <Input value={draft.ipv6.command} onChange={(e) => setDraft((old) => ({ ...old, ipv6: { ...old.ipv6, command: e.target.value } }))} placeholder={t('admin.ddns.commandPlaceholder')} />
            ) : null}
            {draft.ipv6.getType === 'url' && ipv6ProbeHint ? (
              <div className="text-sm opacity-70">{ipv6ProbeHint}</div>
            ) : null}

            <Input value={draft.ipv6.ipv6Regex} onChange={(e) => setDraft((old) => ({ ...old, ipv6: { ...old.ipv6, ipv6Regex: e.target.value } }))} placeholder={t('admin.ddns.ipv6RegexPlaceholder')} />
            {ipv6RegexHint ? <div className="text-sm opacity-70">{ipv6RegexHint}</div> : null}

            <textarea
              className="w-full min-h-24 rounded-xl border border-white/10 bg-black/10 p-3 text-sm font-mono"
              value={draft.ipv6.domainsText}
              onChange={(e) => setDraft((old) => ({ ...old, ipv6: { ...old.ipv6, domainsText: e.target.value } }))}
              placeholder={t('admin.ddns.domainsPlaceholder')}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-3">
            <h4 className="text-base font-black">{t('admin.ddns.webhookTitle')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="h-11 rounded-xl border border-white/10 bg-black/10 px-3 text-sm flex items-center justify-between">
                <span className="text-sm opacity-70">{t('admin.ddns.enabledPlaceholder')}</span>
                <Switch checked={draft.webhook.enabled} onChange={(value) => setDraft((old) => ({ ...old, webhook: { ...old.webhook, enabled: value } }))} />
              </div>
              <div className="h-11 rounded-xl border border-white/10 bg-black/10 px-3 text-sm flex items-center justify-between">
                <span className="text-sm opacity-70">{t('admin.ddns.allowPrivateTarget')}</span>
                <Switch checked={draft.webhook.allowPrivateTarget} onChange={(value) => setDraft((old) => ({ ...old, webhook: { ...old.webhook, allowPrivateTarget: value } }))} />
              </div>
              <Input value={draft.webhook.url} onChange={(e) => setDraft((old) => ({ ...old, webhook: { ...old.webhook, url: e.target.value } }))} placeholder={t('admin.ddns.webhookUrlPlaceholder')} />
            </div>

            <textarea
              className="w-full min-h-24 rounded-xl border border-white/10 bg-black/10 p-3 text-sm font-mono"
              value={draft.webhook.requestBody}
              onChange={(e) => setDraft((old) => ({ ...old, webhook: { ...old.webhook, requestBody: e.target.value } }))}
              placeholder={t('admin.ddns.webhookBodyPlaceholder')}
            />

            <textarea
              className="w-full min-h-20 rounded-xl border border-white/10 bg-black/10 p-3 text-sm font-mono"
              value={draft.webhook.headersText}
              onChange={(e) => setDraft((old) => ({ ...old, webhook: { ...old.webhook, headersText: e.target.value } }))}
              placeholder={t('admin.ddns.webhookHeadersPlaceholder')}
            />

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={testWebhook}>
                {t('admin.ddns.webhookTest')}
              </Button>
              {WEBHOOK_EXAMPLES.map((example) => (
                <Button key={example.key} variant="outline" size="sm" onClick={() => applyWebhookExample(example.key)}>
                  {getWebhookExampleTitle(example.key)}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <h4 className="text-base font-black mb-3">{t('admin.ddns.configRuntime')}</h4>
            <div className="space-y-2 text-sm">
              {groups.length === 0 ? (
                <div className="opacity-70">{t('admin.ddns.noConfigs')}</div>
              ) : groups.map((item) => (
                <div key={item.key} className="rounded-xl border border-white/10 bg-black/10 p-3 space-y-2">
                  <div className="font-semibold">{item.name}</div>
                  <div className="text-sm opacity-70">{item.provider} / TTL {item.ttl}</div>
                  <div className="text-sm opacity-70">{item.lastIpv4 || '-'} / {item.lastIpv6 || '-'}</div>
                  <div className="text-sm opacity-70">{item.lastStatus || '-'} {item.lastError ? `| ${item.lastError}` : ''}</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => runGroup(item.key)}>{t('admin.ddns.run')}</Button>
                    <Button size="sm" variant="outline" onClick={() => hydrateDraftFromGroup(item.key)}>{t('admin.ddns.edit')}</Button>
                    <Button size="sm" variant="outline" onClick={() => deleteGroup(item.key)}>{t('admin.ddns.delete')}</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 text-sm opacity-80 space-y-2">
            <div className="font-semibold text-sm">{t('admin.ddns.domainHintTitle')}</div>
            <div>{t('admin.ddns.domainHintAuto')}</div>
            <div>{t('admin.ddns.domainHintManual')}</div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={saveConfirmOpen}
        onClose={() => setSaveConfirmOpen(false)}
        title={t('admin.ddns.saveConfirmTitle')}
      >
        <div className="space-y-3">
          <div className="text-sm opacity-80">{t('admin.ddns.saveConfirmMsg')}</div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSaveConfirmOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={saveDraft}>{t('common.confirm')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
