import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { client, extractData, handleApiError } from '@/lib/api';
import { useToastStore } from '@fileuni/shared';

type DomainPanel = 'ddns' | 'acme';

interface ProviderAccountItem {
  id: string;
  name: string;
  provider_key: string;
  enabled: boolean;
}

interface DdnsEntryItem {
  id: string;
  name: string;
  fqdn: string;
  enabled: boolean;
  last_status?: string | null;
}

interface CertificateItem {
  id: string;
  name: string;
  enabled: boolean;
  expires_at?: string | null;
  last_status?: string | null;
}

export const DomainAcmeDdnsAdmin: React.FC = () => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const [panel, setPanel] = useState<DomainPanel>('ddns');
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<ProviderAccountItem[]>([]);
  const [ddnsEntries, setDdnsEntries] = useState<DdnsEntryItem[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);

  const title = useMemo(() => {
    if (panel === 'acme') {
      return t('admin.acme.title');
    }
    return t('admin.ddns.title');
  }, [panel, t]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [providerData, ddnsData, certData] = await Promise.all([
        extractData<ProviderAccountItem[]>(client.GET('/api/v1/admin/domain-acme-ddns/providers/accounts')),
        extractData<DdnsEntryItem[]>(client.GET('/api/v1/admin/domain-acme-ddns/ddns/entries')),
        extractData<CertificateItem[]>(client.GET('/api/v1/admin/domain-acme-ddns/certs')),
      ]);
      setProviders(Array.isArray(providerData) ? providerData : []);
      setDdnsEntries(Array.isArray(ddnsData) ? ddnsData : []);
      setCertificates(Array.isArray(certData) ? certData : []);
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadAll();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card/40 p-3">
        <div className="text-sm font-semibold opacity-80">Domain Automation</div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={panel === 'ddns' ? 'default' : 'outline'}
            onClick={() => setPanel('ddns')}
          >
            {t('admin.ddns.title')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={panel === 'acme' ? 'default' : 'outline'}
            onClick={() => setPanel('acme')}
          >
            {t('admin.acme.title')}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider opacity-60">{title}</div>
        <Button size="sm" variant="outline" onClick={loadAll} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/30 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-sm">
          <div>
            <div className="opacity-60">Provider Accounts</div>
            <div className="text-2xl font-black">{providers.length}</div>
          </div>
          <div>
            <div className="opacity-60">DDNS Entries</div>
            <div className="text-2xl font-black">{ddnsEntries.length}</div>
          </div>
          <div>
            <div className="opacity-60">Certificates</div>
            <div className="text-2xl font-black">{certificates.length}</div>
          </div>
        </div>
      </div>

      {panel === 'ddns' ? (
        <div className="rounded-xl border border-border/50 bg-card/30 p-4">
          <div className="mb-3 text-sm font-bold uppercase tracking-wider opacity-70">DDNS</div>
          <div className="space-y-2 text-sm">
            {ddnsEntries.length === 0 ? (
              <div className="opacity-60">No DDNS entries</div>
            ) : (
              ddnsEntries.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    <div className="opacity-60">{item.fqdn}</div>
                  </div>
                  <div className="text-xs uppercase opacity-70">{item.last_status || (item.enabled ? 'idle' : 'disabled')}</div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card/30 p-4">
          <div className="mb-3 text-sm font-bold uppercase tracking-wider opacity-70">Certificates</div>
          <div className="space-y-2 text-sm">
            {certificates.length === 0 ? (
              <div className="opacity-60">No certificates</div>
            ) : (
              certificates.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    <div className="opacity-60">{item.expires_at || 'no expiry'}</div>
                  </div>
                  <div className="text-xs uppercase opacity-70">{item.last_status || (item.enabled ? 'idle' : 'disabled')}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DomainAcmeDdnsAdmin;
