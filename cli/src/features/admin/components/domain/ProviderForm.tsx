import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/Input';

interface ProviderFormProps {
  providerKey: string;
  credentialJson: string;
  configJson: string;
  onChangeCredential: (json: string) => void;
  onChangeConfig: (json: string) => void;
}

interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'password';
  required?: boolean;
  isConfig?: boolean; // if true, maps to config_json
  helper?: string;
}

const PROVIDER_FIELDS: Record<string, FieldDef[]> = {
  aliyun: [
    { key: 'access_key_id', label: 'AccessKey ID', required: true },
    { key: 'access_key_secret', label: 'AccessKey Secret', type: 'password', required: true },
  ],
  tencentcloud: [
    { key: 'secret_id', label: 'SecretId', required: true },
    { key: 'secret_key', label: 'SecretKey', type: 'password', required: true },
  ],
  dnspod: [
    { key: 'token_id', label: 'Token ID', required: true },
    { key: 'token_key', label: 'Token Key', type: 'password', required: true },
  ],
  cloudflare: [
    { key: 'api_token', label: 'API Token', type: 'password', placeholder: 'Recommended' },
    { key: 'email', label: 'Email', placeholder: 'Legacy mode only' },
    { key: 'api_key', label: 'Global API Key', type: 'password', placeholder: 'Legacy mode only' },
    { key: 'zone_id', label: 'Zone ID', placeholder: 'Optional', isConfig: true },
  ],
  aws: [
    { key: 'access_key_id', label: 'AccessKey ID', required: true },
    { key: 'secret_access_key', label: 'Secret Access Key', type: 'password', required: true },
    { key: 'hosted_zone_id', label: 'Hosted Zone ID', required: true },
    { key: 'session_token', label: 'Session Token', type: 'password', placeholder: 'Optional' },
  ],
  huaweicloud: [
    { key: 'token', label: 'IAM Token', type: 'password' },
    { key: 'zone_id', label: 'Zone ID', placeholder: 'Optional' },
    { key: 'username', label: 'Username', placeholder: 'Password mode only' },
    { key: 'password', label: 'Password', type: 'password', placeholder: 'Password mode only' },
    { key: 'domain_name', label: 'Domain Name', placeholder: 'Password mode only' },
  ],
  volcengine: [
    { key: 'access_key_id', label: 'AccessKey ID', required: true },
    { key: 'secret_access_key', label: 'Secret Access Key', type: 'password', required: true },
  ],
  google: [
    { key: 'access_token', label: 'Access Token', type: 'password', required: true },
    { key: 'project_id', label: 'Project ID', required: true, isConfig: true },
    { key: 'managed_zone', label: 'Managed Zone', required: true, isConfig: true },
  ],
  azure: [
    { key: 'subscription_id', label: 'Subscription ID', required: true },
    { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'Token mode' },
    { key: 'tenant_id', label: 'Tenant ID', placeholder: 'SP mode' },
    { key: 'client_id', label: 'Client ID', placeholder: 'SP mode' },
    { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'SP mode' },
    { key: 'resource_group', label: 'Resource Group', placeholder: 'Optional' },
    { key: 'zone_name', label: 'Zone Name', placeholder: 'Optional' },
  ],
  godaddy: [
    { key: 'key', label: 'API Key', required: true },
    { key: 'secret', label: 'API Secret', type: 'password', required: true },
  ],
  gandi: [
    { key: 'api_key', label: 'API Key', type: 'password' },
    { key: 'bearer_token', label: 'Bearer Token', type: 'password' },
  ],
  digitalocean: [
    { key: 'api_token', label: 'API Token', type: 'password', required: true },
  ],
  vultr: [
    { key: 'api_key', label: 'API Key', type: 'password', required: true },
  ],
  linode: [
    { key: 'api_token', label: 'API Token', type: 'password', required: true },
  ],
  duckdns: [
    { key: 'token', label: 'Token', type: 'password', required: true },
    { key: 'domain', label: 'Domain', placeholder: 'Optional default domain' },
  ],
  callback: [
    { key: 'url', label: 'Webhook URL', required: true },
    { key: 'method', label: 'Method', placeholder: 'POST' },
  ],
};

export const ProviderForm: React.FC<ProviderFormProps> = ({
  providerKey,
  credentialJson,
  configJson,
  onChangeCredential,
  onChangeConfig,
}) => {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<'form' | 'raw'>('form');

  // Load initial values when providerKey changes or JSONs are reset externally
  useEffect(() => {
    try {
      const cred = JSON.parse(credentialJson || '{}');
      const conf = JSON.parse(configJson || '{}');
      setFields({ ...cred, ...conf });
    } catch {
      // If JSON is invalid, switch to raw mode
      setMode('raw');
    }
  }, [providerKey]); // Intentionally not depending on Jsons to avoid loop, assumes parent resets on provider change

  const handleFieldChange = (key: string, value: string, isConfig: boolean) => {
    const newFields = { ...fields, [key]: value };
    setFields(newFields);

    const fieldDefs = PROVIDER_FIELDS[providerKey] || [];
    
    // Split fields back into credential/config based on definitions
    const credObj: Record<string, string> = {};
    const confObj: Record<string, string> = {};

    // First put all known fields into their respective objects
    fieldDefs.forEach(def => {
      if (newFields[def.key]) {
        if (def.isConfig) {
          confObj[def.key] = newFields[def.key];
        } else {
          credObj[def.key] = newFields[def.key];
        }
      }
    });

    // Handle unknown fields? For now, we only support form fields. 
    // If user switches to raw, they can add extras.

    onChangeCredential(JSON.stringify(credObj));
    onChangeConfig(JSON.stringify(confObj));
  };

  const currentDefs = PROVIDER_FIELDS[providerKey];

  if (!currentDefs || mode === 'raw') {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          {currentDefs && (
            <button
              type="button"
              className="text-xs text-primary underline"
              onClick={() => setMode('form')}
            >
              Switch to Form Mode
            </button>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium opacity-70">Credential JSON</label>
          <textarea
            className="w-full min-h-[100px] rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm"
            value={credentialJson}
            onChange={(e) => onChangeCredential(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium opacity-70">Config JSON</label>
          <textarea
            className="w-full min-h-[100px] rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm"
            value={configJson}
            onChange={(e) => onChangeConfig(e.target.value)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          className="text-xs text-primary underline"
          onClick={() => setMode('raw')}
        >
          Switch to Raw JSON Mode
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {currentDefs.map((def) => (
          <div key={def.key} className="space-y-1">
            <label className="text-xs font-medium opacity-70">
              {def.label}
              {def.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <Input
              type={def.type || 'text'}
              placeholder={def.placeholder}
              value={fields[def.key] || ''}
              onChange={(e) => handleFieldChange(def.key, e.target.value, !!def.isConfig)}
            />
            {def.helper && <div className="text-[10px] opacity-50">{def.helper}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};
