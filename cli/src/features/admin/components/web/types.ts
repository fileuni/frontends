export type RouteMode = 'static' | 'proxy';

export interface SiteBinding {
  listen_ip: string;
  listen_port: number;
  hostnames: string[];
  is_default: boolean;
}

export interface SitePayload {
  name: string;
  enabled: boolean;
  bindings: SiteBinding[];
  tls_enabled: boolean;
  tls_acme_cert_id?: string;
  tls_cert_path?: string;
  tls_key_path?: string;
  route_mode: RouteMode;
  static_root?: string;
  proxy_upstream?: string;
  proxy_tls_insecure_skip_verify: boolean;
}

export interface SiteView extends SitePayload {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface SiteDraft {
  id?: string;
  name: string;
  enabled: boolean;
  bindings: SiteBinding[];
  tls_enabled: boolean;
  tls_acme_cert_id: string;
  tls_cert_path: string;
  tls_key_path: string;
  route_mode: RouteMode;
  static_root: string;
  proxy_upstream: string;
  proxy_tls_insecure_skip_verify: boolean;
}

export interface ListenerDiagnostic {
  listenerKey: string;
  currentBindings: SiteBinding[];
  remoteBindings: Array<{ site: string; binding: SiteBinding }>;
  errors: string[];
}

export interface DomainCertAssetView {
  id: string;
  name: string;
  domains_json?: string | null;
  expires_at?: string | null;
  status?: string | null;
}

export interface DomainAssetView {
  fqdn: string;
  status?: string | null;
}
