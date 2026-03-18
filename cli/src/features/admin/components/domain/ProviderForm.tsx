import React, { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { useTranslation } from 'react-i18next';
import { KeyValueForm, parseJsonObjectToStringMap } from './KeyValueForm';

interface ProviderFormProps {
  providerKey: string;
  credentialJson: string;
  configJson: string;
  onChangeCredential: (json: string) => void;
  onChangeConfig: (json: string) => void;
  isEdit?: boolean;
  providerProfile?: {
    credential_fields?: Array<{
      key: string;
      label: string;
      required: boolean;
      field_type: 'text' | 'password';
      placeholder?: string | null;
      helper?: string | null;
    }> | null;
    config_fields?: Array<{
      key: string;
      label: string;
      required: boolean;
      field_type: 'text' | 'password';
      placeholder?: string | null;
      helper?: string | null;
    }> | null;
  };
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

// Reuse standard high-visibility control base
const controlBase = "h-11 rounded-xl border border-zinc-400/60 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all shadow-sm font-bold text-foreground placeholder:opacity-30";

const buildFieldDefsFromProfile = (
  profile: ProviderFormProps['providerProfile'],
): FieldDef[] | null => {
  if (!profile) return null;
  const defs: FieldDef[] = [];
  for (const f of profile.credential_fields || []) {
    defs.push({
      key: f.key,
      label: f.label,
      required: !!f.required,
      type: f.field_type === 'password' ? 'password' : 'text',
      placeholder: f.placeholder || undefined,
      helper: f.helper || undefined,
      isConfig: false,
    });
  }
  for (const f of profile.config_fields || []) {
    defs.push({
      key: f.key,
      label: f.label,
      required: !!f.required,
      type: f.field_type === 'password' ? 'password' : 'text',
      placeholder: f.placeholder || undefined,
      helper: f.helper || undefined,
      isConfig: true,
    });
  }
  return defs.length > 0 ? defs : null;
};

export const ProviderForm: React.FC<ProviderFormProps> = ({
  providerKey,
  credentialJson,
  configJson,
  onChangeCredential,
  onChangeConfig,
  isEdit = false,
  providerProfile,
}) => {
  const { t } = useTranslation();
  const [fields, setFields] = useState<Record<string, string>>({});

  useEffect(() => {
    const cred = parseJsonObjectToStringMap(credentialJson);
    const conf = parseJsonObjectToStringMap(configJson);
    setFields({ ...cred, ...conf });
  }, [providerKey, credentialJson, configJson]);

  const handleFieldChange = (key: string, value: string) => {
    const newFields = { ...fields, [key]: value };
    setFields(newFields);

    const fieldDefs = buildFieldDefsFromProfile(providerProfile) || [];
    const credObj: Record<string, string> = {};
    const confObj: Record<string, string> = {};

    fieldDefs.forEach(def => {
      if (newFields[def.key]) {
        if (def.isConfig) {
          confObj[def.key] = newFields[def.key];
        } else {
          credObj[def.key] = newFields[def.key];
        }
      }
    });

    // Update semantics:
    // - create: always send a full json object string (possibly {})
    // - edit: treat json as a patch; empty string means "keep existing" on backend
    if (isEdit && Object.keys(credObj).length === 0) onChangeCredential('');
    else onChangeCredential(JSON.stringify(credObj));
    onChangeConfig(JSON.stringify(confObj));
  };

  const currentDefs = buildFieldDefsFromProfile(providerProfile);

  const fallbackCred = useMemo(() => parseJsonObjectToStringMap(credentialJson), [credentialJson]);
  const fallbackConf = useMemo(() => parseJsonObjectToStringMap(configJson), [configJson]);

  if (!currentDefs) {
    return (
      <div className="space-y-6 text-foreground">
        <div className="space-y-2">
          <label className="text-[14px] font-black uppercase tracking-widest opacity-50 dark:opacity-40 ml-1">{t('admin.domain.credentialJson')}</label>
          <KeyValueForm
            value={fallbackCred}
            onChange={(obj) => onChangeCredential(JSON.stringify(obj))}
            addLabel="Add credential"
            keyPlaceholder="credential_key"
            valuePlaceholder="credential_value"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[14px] font-black uppercase tracking-widest opacity-50 dark:opacity-40 ml-1">{t('admin.domain.configJson')}</label>
          <KeyValueForm
            value={fallbackConf}
            onChange={(obj) => onChangeConfig(JSON.stringify(obj))}
            addLabel="Add config"
            keyPlaceholder="config_key"
            valuePlaceholder="config_value"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {currentDefs.map((def) => (
          <div key={def.key} className="space-y-1.5">
            <label className="text-[14px] font-black uppercase tracking-widest text-foreground/50 dark:text-foreground/40 ml-1">
              {def.label}
              {def.required && !isEdit && <span className="text-red-500 ml-1">*</span>}
            </label>
            <Input
              type={def.type || 'text'}
              placeholder={def.placeholder}
              value={fields[def.key] || ''}
                  onChange={(e) => handleFieldChange(def.key, e.target.value)}
              className={controlBase}
            />
            {def.helper && <div className="text-[14px] opacity-50 dark:opacity-30 italic text-foreground/60">{def.helper}</div>}
            {isEdit && def.type === 'password' && (
              <div className="text-[14px] opacity-50 dark:opacity-30 italic text-foreground/60">
                Leave blank to keep current value.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
