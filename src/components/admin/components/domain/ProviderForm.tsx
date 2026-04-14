import React, { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/common/PasswordInput.tsx';
import { useTranslation } from 'react-i18next';
import { KeyValueForm, parseJsonObjectToStringMap } from './KeyValueForm';
import { isSensitiveKeyName } from '@/lib/secretKeys.ts';

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
  } | null;
}

interface FieldDef {
  key: string;
  label: string;
  placeholder?: string | undefined;
  type?: 'text' | 'password' | undefined;
  required?: boolean | undefined;
  isConfig?: boolean | undefined; // if true, maps to config_json
  helper?: string | undefined;
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
  providerKey: _providerKey,
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
    setFields({ ...conf, ...cred });
  }, [credentialJson, configJson]);

  const handleFieldChange = (key: string, value: string) => {
    const newFields = { ...fields, [key]: value };
    setFields(newFields);

    const fieldDefs = buildFieldDefsFromProfile(providerProfile) || [];
    const changedDef = fieldDefs.find((def) => def.key === key);
    if (!changedDef) return;

    const credentialKeys = new Set(
      fieldDefs.filter((def) => !def.isConfig).map((def) => def.key),
    );
    const configKeys = new Set(
      fieldDefs.filter((def) => def.isConfig).map((def) => def.key),
    );

    const credObj = parseJsonObjectToStringMap(credentialJson);
    const confObj = parseJsonObjectToStringMap(configJson);
    const target = changedDef.isConfig ? confObj : credObj;

    if (value.trim()) {
      target[key] = value;
    } else {
      delete target[key];
    }

    for (const credentialKey of credentialKeys) {
      delete confObj[credentialKey];
    }
    for (const configKey of configKeys) {
      delete credObj[configKey];
    }

    // Update semantics:
    // - create: always send a full json object string (possibly {})
    // - edit: treat json as a patch; empty string means "keep existing" on backend
    if (isEdit && Object.keys(credObj).length === 0) onChangeCredential('');
    else onChangeCredential(JSON.stringify(credObj));
    onChangeConfig(JSON.stringify(confObj));
  };

  const currentDefs = buildFieldDefsFromProfile(providerProfile);
  const renderField = (def: FieldDef) => (
    <div key={def.key} className="space-y-1.5">
      <div className="text-[14px] font-black tracking-widest text-foreground/50 dark:text-foreground/40 ml-1">
        {def.label}
        {def.required && !isEdit && <span className="text-red-500 ml-1">*</span>}
      </div>
      {(def.type === 'password' || isSensitiveKeyName(def.key)) ? (
        <PasswordInput
          value={fields[def.key] || ''}
          onChange={(e) => handleFieldChange(def.key, e.target.value)}
          placeholder={def.placeholder}
          required={def.required && !isEdit}
          inputClassName={controlBase}
        />
      ) : (
        <Input
          type="text"
          placeholder={def.placeholder}
          value={fields[def.key] || ''}
          onChange={(e) => handleFieldChange(def.key, e.target.value)}
          className={controlBase}
        />
      )}
      {def.helper && <div className="text-[14px] opacity-50 dark:opacity-30 italic text-foreground/60">{def.helper}</div>}
      {isEdit && (def.type === 'password' || isSensitiveKeyName(def.key)) && (
        <div className="text-[14px] opacity-50 dark:opacity-30 italic text-foreground/60">
          {t('admin.domain.providerCredentialEditPlaceholder') || 'Leave secret fields blank to keep current value.'}
        </div>
      )}
    </div>
  );

  const fallbackCred = useMemo(() => parseJsonObjectToStringMap(credentialJson), [credentialJson]);
  const fallbackConf = useMemo(() => parseJsonObjectToStringMap(configJson), [configJson]);

  if (!currentDefs) {
    return (
      <div className="space-y-6 text-foreground">
        <div className="space-y-2">
          <div className="text-[14px] font-black tracking-widest opacity-50 dark:opacity-40 ml-1">{t('admin.domain.credentialJson')}</div>
          <KeyValueForm
            value={fallbackCred}
            onChange={(obj) => onChangeCredential(JSON.stringify(obj))}
            addLabel="Add credential"
            keyPlaceholder="credential_key"
            valuePlaceholder="credential_value"
          />
        </div>
        <div className="space-y-2">
          <div className="text-[14px] font-black tracking-widest opacity-50 dark:opacity-40 ml-1">{t('admin.domain.configJson')}</div>
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

  const credentialDefs = currentDefs.filter((def) => !def.isConfig);
  const configDefs = currentDefs.filter((def) => def.isConfig);
  const primaryCredentialDefs = credentialDefs.some((def) => def.required)
    ? credentialDefs.filter((def) => def.required)
    : credentialDefs;
  const secondaryCredentialDefs = credentialDefs.filter((def) => !primaryCredentialDefs.includes(def));
  const primaryConfigDefs = configDefs.filter((def) => def.required);
  const secondaryConfigDefs = configDefs.filter((def) => !def.required);
  const advancedDefs = [...secondaryCredentialDefs, ...secondaryConfigDefs];
  const advancedOpen = advancedDefs.some((def) => (fields[def.key] || '').trim().length > 0);

  return (
    <div className="space-y-6">
      {primaryCredentialDefs.length > 0 && (
        <div className="space-y-4">
          <div className="text-[14px] font-black tracking-widest opacity-50 dark:opacity-40 ml-1">
            {t('admin.domain.authConfig')}
          </div>
          <div className="grid grid-cols-1 gap-4">
            {primaryCredentialDefs.map(renderField)}
          </div>
        </div>
      )}

      {primaryConfigDefs.length > 0 && (
        <div className="space-y-4">
          <div className="text-[14px] font-black tracking-widest opacity-50 dark:opacity-40 ml-1">
            {t('admin.domain.configJson')}
          </div>
          <div className="grid grid-cols-1 gap-4">
            {primaryConfigDefs.map(renderField)}
          </div>
        </div>
      )}

      {advancedDefs.length > 0 && (
        <details open={advancedOpen} className="rounded-2xl border border-zinc-200 dark:border-white/5 bg-zinc-50/60 dark:bg-white/[0.02] px-4 py-3">
          <summary className="cursor-pointer list-none text-[14px] font-black tracking-widest text-foreground/70">
            {t('admin.domain.advAutomation')}
          </summary>
          <div className="mt-4 space-y-6">
            {secondaryCredentialDefs.length > 0 && (
              <div className="space-y-4">
                <div className="text-[14px] font-black tracking-widest opacity-50 dark:opacity-40 ml-1">
                  {t('admin.domain.credentialJson')}
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {secondaryCredentialDefs.map(renderField)}
                </div>
              </div>
            )}
            {secondaryConfigDefs.length > 0 && (
              <div className="space-y-4">
                <div className="text-[14px] font-black tracking-widest opacity-50 dark:opacity-40 ml-1">
                  {t('admin.domain.configJson')}
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {secondaryConfigDefs.map(renderField)}
                </div>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
};
