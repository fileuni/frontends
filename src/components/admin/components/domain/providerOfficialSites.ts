const PROVIDER_OFFICIAL_SITES: Record<string, string> = {
  cloudflare: 'https://www.cloudflare.com/',
  aliyun: 'https://www.aliyun.com/',
  dnspod: 'https://www.dnspod.cn/',
  tencentcloud: 'https://www.tencentcloud.com/',
  aws: 'https://aws.amazon.com/route53/',
  azure: 'https://azure.microsoft.com/products/dns/',
  google: 'https://cloud.google.com/dns',
  huaweicloud: 'https://www.huaweicloud.com/',
  volcengine: 'https://www.volcengine.com/',
  godaddy: 'https://www.godaddy.com/',
  gandi: 'https://www.gandi.net/',
  digitalocean: 'https://www.digitalocean.com/',
  vultr: 'https://www.vultr.com/',
  linode: 'https://www.linode.com/',
  duckdns: 'https://www.duckdns.org/',
};

export const getProviderOfficialSite = (
  providerKey: string,
): string | null => {
  return PROVIDER_OFFICIAL_SITES[providerKey] ?? null;
};
