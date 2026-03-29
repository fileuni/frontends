import type { SiteBinding, SiteDraft, SitePayload, SiteView } from './types';

export const defaultBinding = (): SiteBinding => ({
  listen_ip: '0.0.0.0',
  listen_port: 80,
  hostnames: ['example.com'],
  is_default: false,
});

export const defaultDraft = (): SiteDraft => ({
  name: 'new-site',
  enabled: true,
  bindings: [defaultBinding()],
  tls_enabled: false,
  tls_acme_cert_id: '',
  tls_cert_path: '',
  tls_key_path: '',
  route_mode: 'static',
  static_root: './dist/site',
  proxy_upstream: 'http://127.0.0.1:8080',
  proxy_tls_insecure_skip_verify: false,
});

export const toDraft = (site: SiteView): SiteDraft => ({
  id: site.id,
  name: site.name,
  enabled: site.enabled,
  bindings: site.bindings.length > 0 ? site.bindings.map((item) => ({ ...item })) : [defaultBinding()],
  tls_enabled: site.tls_enabled,
  tls_acme_cert_id: site.tls_acme_cert_id || '',
  tls_cert_path: site.tls_cert_path || '',
  tls_key_path: site.tls_key_path || '',
  route_mode: site.route_mode,
  static_root: site.static_root || '',
  proxy_upstream: site.proxy_upstream || '',
  proxy_tls_insecure_skip_verify: site.proxy_tls_insecure_skip_verify ?? false,
});

export const normalizeHostnames = (raw: string): string[] => {
  const out = raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
  return Array.from(new Set(out));
};

export const listenerKey = (item: SiteBinding, tlsEnabled: boolean): string =>
  `${item.listen_ip}:${item.listen_port}:${tlsEnabled ? 'tls' : 'plain'}`;

export const hasHostOverlap = (left: string[], right: string[]): boolean => {
  for (const lhs of left) {
    for (const rhs of right) {
      if (lhs === rhs || lhs === '*' || rhs === '*') {
        return true;
      }
    }
  }
  return false;
};

export const toPayload = (draft: SiteDraft): SitePayload => ({
  name: draft.name.trim(),
  enabled: draft.enabled,
  bindings: draft.bindings.map((item) => ({
    listen_ip: item.listen_ip.trim(),
    listen_port: Number(item.listen_port),
    hostnames: item.hostnames,
    is_default: item.is_default,
  })),
  tls_enabled: draft.tls_enabled,
  route_mode: draft.route_mode,
  ...(draft.tls_acme_cert_id.trim()
    ? { tls_acme_cert_id: draft.tls_acme_cert_id.trim() }
    : {}),
  ...(draft.tls_cert_path.trim()
    ? { tls_cert_path: draft.tls_cert_path.trim() }
    : {}),
  ...(draft.tls_key_path.trim()
    ? { tls_key_path: draft.tls_key_path.trim() }
    : {}),
  ...(draft.route_mode === 'static' && draft.static_root.trim()
    ? { static_root: draft.static_root.trim() }
    : {}),
  ...(draft.route_mode === 'proxy' && draft.proxy_upstream.trim()
    ? { proxy_upstream: draft.proxy_upstream.trim() }
    : {}),
  proxy_tls_insecure_skip_verify:
    draft.route_mode === 'proxy' && draft.proxy_upstream.trim().startsWith('https://')
      ? draft.proxy_tls_insecure_skip_verify
      : false,
});
