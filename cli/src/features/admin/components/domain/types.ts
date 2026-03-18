export type DomainAcmeDdnsView = 'ddns' | 'ssl';

export interface ProviderProfileItem {
  key: string;
  name: string;
  vendor_type?: 'domain' | 'ddns_only';
  supports_acme_dns01: boolean;
  supports_ddns: boolean;
  credential_fields?: Array<{
    key: string;
    label: string;
    required: boolean;
    field_type: 'text' | 'password';
    placeholder?: string | null;
    helper?: string | null;
  }>;
  config_fields?: Array<{
    key: string;
    label: string;
    required: boolean;
    field_type: 'text' | 'password';
    placeholder?: string | null;
    helper?: string | null;
  }>;
}

export interface ProviderAccountItem {
  id: string;
  name: string;
  provider_key: string;
  enabled: boolean;
  config_json: string;
  has_credential: boolean;
  auth_ok?: boolean;
  auth_error?: string | null;
}

export interface ProviderTestDnsResult {
  fqdn: string;
  status: string;
  message: string;
  observed: boolean;
}

export interface ProviderTestAuthResult {
  status: string;
  message: string;
}

export interface DdnsEntryItem {
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
  last_error?: string | null;
  last_run_at?: string | null;
  last_ipv4?: string | null;
  last_ipv6?: string | null;
}

export interface DdnsRunLogItem {
  id: string;
  ddns_entry_id: string;
  run_at: string;
  status: string;
  provider_key: string;
  message: string;
  ipv4?: string | null;
  ipv6?: string | null;
}

export interface DdnsCheckResult {
  id: string;
  fqdn: string;
  ipv4_enabled: boolean;
  ipv6_enabled: boolean;
  desired_ipv4?: string | null;
  desired_ipv6?: string | null;
  dns_ipv4: string[];
  dns_ipv6: string[];
  dns_used_server?: string | null;
  dns_error_ipv4?: string | null;
  dns_error_ipv6?: string | null;
  ip_changed_ipv4: boolean;
  ip_changed_ipv6: boolean;
  dns_mismatch_ipv4: boolean;
  dns_mismatch_ipv6: boolean;
  need_update_ipv4: boolean;
  need_update_ipv6: boolean;
}

export interface CertRunLogItem {
  id: string;
  cert_id: string;
  run_at: string;
  status: string;
  message: string;
  expires_at?: string | null;
}

export interface CertPreflightItem {
  key: string;
  status: 'ok' | 'warn' | 'fail' | string;
  message: string;
}

export interface CertPreflightResult {
  cert_id: string;
  name: string;
  overall_status: 'ok' | 'warn' | 'fail' | string;
  items: CertPreflightItem[];
}

export interface CertificateItem {
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
  last_error?: string | null;
}

export interface CertRunAllCheckResponse {
  renew_before_days: number;
  force_update: boolean;
  results: Array<{ id: string; status: string }>;
}

export interface ZeroSslAccountItem {
  id: string;
  name: string;
  eab_kid: string;
  enabled: boolean;
}

export interface ProviderDraft {
  id?: string;
  name: string;
  provider_key: string;
  credential_json_enc: string;
  config_json: string;
  enabled: boolean;
}

export interface DdnsDraft {
  id?: string;
  name: string;
  provider_account_id: string;
  fqdns: string;
  zone: string;
  host: string;
  ttl: number;
  proxied: boolean;
  enabled: boolean;
  ipv4_enabled: boolean;
  ipv6_enabled: boolean;
  ipv4_source_json: string;
  ipv6_source_json: string;
  webhook_json: string;
  force_update: boolean;
}

export interface SslDraft {
  id?: string;
  name: string;
  ca_provider: string;
  challenge_type: 'dns01' | 'http01';
  provider_account_id: string;
  domains_json: string;
  account_email: string;
  export_path: string;
  enabled: boolean;
  auto_renew: boolean;
  dns_config_json?: string;
}

export interface ZeroSslDraft {
  id?: string;
  name: string;
  eab_kid: string;
  eab_hmac_key: string;
  enabled: boolean;
}

export const isDdnsEntryItem = (
  item: DdnsEntryItem | CertificateItem,
): item is DdnsEntryItem => {
  return 'fqdn' in item;
};

export type RowActionsTarget =
  | { kind: 'ddns'; item: DdnsEntryItem }
  | { kind: 'ssl'; item: CertificateItem };

export const newProviderDraft = (): ProviderDraft => ({
  name: '',
  provider_key: 'cloudflare',
  credential_json_enc: '{}',
  config_json: '{}',
  enabled: true,
});

export const newDdnsDraft = (): DdnsDraft => ({
  name: '',
  provider_account_id: '',
  fqdns: '',
  zone: '',
  host: '@',
  ttl: 120,
  proxied: false,
  enabled: true,
  ipv4_enabled: true,
  ipv6_enabled: false,
  ipv4_source_json:
    '{"type":"url","urls":["https://api.ipify.org","https://ifconfig.me/ip","https://ipv4.icanhazip.com"]}',
  ipv6_source_json:
    '{"type":"url","urls":["https://api64.ipify.org","https://ifconfig.me/ip","https://ipv6.icanhazip.com"]}',
  webhook_json: '{}',
  force_update: false,
});

export const newSslDraft = (): SslDraft => ({
  name: '',
  ca_provider: 'letsencrypt',
  challenge_type: 'dns01',
  provider_account_id: '',
  domains_json: '[]',
  account_email: '',
  export_path: '',
  enabled: true,
  auto_renew: true,
});

export const normalizeChallengeType = (value: string): 'dns01' | 'http01' => {
  return value === 'http01' ? 'http01' : 'dns01';
};

export const newZeroSslDraft = (): ZeroSslDraft => ({
  name: '',
  eab_kid: '',
  eab_hmac_key: '',
  enabled: true,
});
