import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Shield, Mail, Globe, Settings, Plus, Trash2, Cpu, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CertificateFormProps {
  name: string;
  onChangeName: (name: string) => void;
  domainsJson: string;
  onChangeDomains: (json: string) => void;
  challengeType: 'dns01' | 'http01';
  onChangeChallengeType: (type: 'dns01' | 'http01') => void;
  caProvider: string;
  onChangeCaProvider: (provider: string) => void;
  accountEmail: string;
  onChangeAccountEmail: (email: string) => void;
  dnsConfigJson: string;
  onChangeDnsConfig: (json: string) => void;
  providerAccountId?: string;
  onChangeProviderAccountId: (id: string) => void;
  providers: { id: string; name: string; provider_key: string }[];
  zeroSslAccounts: { id: string; name: string }[];
  exportPath?: string;
  onChangeExportPath: (path: string) => void;
  onOpenProviderModal?: () => void;
  onOpenZeroSslModal?: () => void;
}

const SectionHeader = ({ icon: Icon, title, desc }: { icon: any, title: string, desc?: string }) => (
  <div className="flex items-start gap-3 mb-4">
    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
      <Icon size={16} />
    </div>
    <div>
      <h4 className="text-sm font-black uppercase tracking-widest opacity-80 leading-none mb-1">{title}</h4>
      {desc && <p className="text-[10px] opacity-40 font-bold uppercase tracking-tighter leading-none">{desc}</p>}
    </div>
  </div>
);

export const CertificateForm: React.FC<CertificateFormProps> = ({
  name,
  onChangeName,
  domainsJson,
  onChangeDomains,
  challengeType,
  onChangeChallengeType,
  caProvider,
  onChangeCaProvider,
  accountEmail,
  onChangeAccountEmail,
  dnsConfigJson,
  onChangeDnsConfig,
  providerAccountId,
  onChangeProviderAccountId,
  providers,
  zeroSslAccounts,
  exportPath,
  onChangeExportPath,
  onOpenProviderModal,
  onOpenZeroSslModal,
}) => {
  const [domains, setDomains] = useState<string[]>([]);
  const [dnsConfig, setDnsConfig] = useState<Record<string, any>>({});
  const [newDomain, setNewDomain] = useState('');

  useEffect(() => {
    try {
      const parsed = JSON.parse(domainsJson || '[]');
      if (Array.isArray(parsed)) setDomains(parsed);
    } catch {
      setDomains([]);
    }
  }, [domainsJson]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(dnsConfigJson || '{}');
      setDnsConfig(parsed);
    } catch {
      setDnsConfig({});
    }
  }, [dnsConfigJson]);

  const updateDomains = (newDomains: string[]) => {
    setDomains(newDomains);
    onChangeDomains(JSON.stringify(newDomains));
  };

  const addDomain = () => {
    if (newDomain.trim()) {
      updateDomains([...domains, newDomain.trim()]);
      setNewDomain('');
    }
  };

  const removeDomain = (index: number) => {
    const next = [...domains];
    next.splice(index, 1);
    updateDomains(next);
  };

  const updateDnsConfig = (key: string, value: string) => {
    const next = { ...dnsConfig, [key]: value };
    setDnsConfig(next);
    onChangeDnsConfig(JSON.stringify(next));
  };

  return (
    <div className="space-y-8">
      {/* Identity Group */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-white/[0.02] border border-white/5 shadow-inner">
        <div className="space-y-4">
          <SectionHeader icon={Shield} title="证书身份" desc="Certificate Identity" />
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">证书名称 / Name</label>
            <Input value={name} onChange={(e) => onChangeName(e.target.value)} placeholder="e.g. main-api-cert" className="h-11 bg-white/5 border-white/5" />
          </div>
        </div>
        <div className="space-y-4">
          <SectionHeader icon={Mail} title="联系信息" desc="Contact Info" />
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">ACME 邮箱 / Email</label>
            <Input value={accountEmail} onChange={(e) => onChangeAccountEmail(e.target.value)} placeholder="admin@example.com" className="h-11 bg-white/5 border-white/5" />
          </div>
        </div>
      </div>

      {/* Domain Management */}
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 shadow-inner space-y-4">
        <SectionHeader icon={Globe} title="域名管理" desc="Domain Management" />
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="e.g. *.fileuni.com"
              className="h-11 bg-white/5 border-white/5"
              onKeyDown={(e) => e.key === 'Enter' && addDomain()}
            />
            <Button onClick={addDomain} variant="outline" className="h-11 px-6 border-white/5 bg-white/5 hover:bg-white/10 shrink-0">
              <Plus size={16} className="mr-2" /> Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[44px] p-2 rounded-xl bg-black/20 border border-white/5">
            {domains.map((d, i) => (
              <Badge key={i} variant="outline" className="h-8 pl-3 pr-1 rounded-lg bg-primary/10 text-primary border-primary/20 flex items-center gap-2 group">
                <span className="text-xs font-mono">{d}</span>
                <button onClick={() => removeDomain(i)} className="p-1 rounded-md hover:bg-red-500 hover:text-white transition-all opacity-40 group-hover:opacity-100">
                  <Trash2 size={12} />
                </button>
              </Badge>
            ))}
            {domains.length === 0 && <div className="w-full flex items-center justify-center text-[10px] font-black uppercase tracking-widest opacity-20 py-2">No domains added</div>}
          </div>
        </div>
      </div>

      {/* Configuration Group */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-white/[0.02] border border-white/5 shadow-inner">
        <div className="space-y-6">
          <SectionHeader icon={Settings} title="颁发与验证" desc="Issuance & Challenge" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">CA 厂商 / Provider</label>
              <select className="h-11 w-full rounded-xl border border-white/5 bg-white/5 px-3 text-sm outline-none focus:border-primary/50" value={caProvider} onChange={(e) => onChangeCaProvider(e.target.value)}>
                <option value="letsencrypt">Let's Encrypt</option>
                <option value="letsencrypt-staging">Staging (Test)</option>
                <option value="zerossl">ZeroSSL</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">验证方式 / Challenge</label>
              <select className="h-11 w-full rounded-xl border border-white/5 bg-white/5 px-3 text-sm outline-none focus:border-primary/50" value={challengeType} onChange={(e) => onChangeChallengeType(e.target.value as any)}>
                <option value="dns01">DNS-01</option>
                <option value="http01">HTTP-01</option>
              </select>
            </div>
          </div>

          {challengeType === 'dns01' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">DNS 账户 / DNS Account</label>
              <div className="flex gap-2">
                <select className="flex-1 h-11 rounded-xl border border-white/5 bg-white/5 px-3 text-sm outline-none focus:border-primary/50" value={providerAccountId || ''} onChange={(e) => onChangeProviderAccountId(e.target.value)}>
                  <option value="">Select account...</option>
                  {providers.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.provider_key})</option>)}
                </select>
                <Button type="button" variant="outline" onClick={onOpenProviderModal} className="h-11 w-11 p-0 border-white/5 bg-white/5 hover:bg-white/10 shrink-0">
                  <Plus size={16} />
                </Button>
              </div>
            </div>
          )}

          {challengeType === 'http01' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Webroot 路径 / Path</label>
              <Input value={dnsConfig.webroot || dnsConfig.http_webroot || ''} onChange={(e) => updateDnsConfig('webroot', e.target.value)} placeholder="/var/www/html" className="h-11 bg-white/5 border-white/5" />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <SectionHeader icon={Cpu} title="高级与自动化" desc="Advanced & Automation" />
          
          {caProvider === 'zerossl' && (
            <div className="space-y-2 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 animate-in fade-in zoom-in-95">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                <LinkIcon size={12}/> ZeroSSL EAB 账户
              </label>
              <div className="flex gap-2">
                <select className="flex-1 h-11 rounded-xl border border-white/5 bg-white/5 px-3 text-sm outline-none focus:border-cyan-500/50" value={dnsConfig.zerossl_account_id || ''} onChange={(e) => updateDnsConfig('zerossl_account_id', e.target.value)}>
                  <option value="">Select EAB account...</option>
                  {zeroSslAccounts.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
                <Button type="button" variant="outline" onClick={onOpenZeroSslModal} className="h-11 w-11 p-0 border-cyan-500/10 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-500 shrink-0">
                  <Plus size={16} />
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">导出路径 / Export Path</label>
            <div className="relative">
              <Input value={exportPath || ''} onChange={(e) => onChangeExportPath(e.target.value)} placeholder="/etc/nginx/certs/mysite" className="h-11 bg-white/5 border-white/5 pr-10" />
              <ExternalLink size={14} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
