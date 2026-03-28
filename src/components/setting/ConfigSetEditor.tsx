import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import * as toml from 'smol-toml';
import type { components as ApiComponents } from '@/types/api.ts';
import type { components as ConfigSetComponents } from '@/types/config_set_api.ts';
import type { ConfigError, ConfigNoteEntry } from '@/components/setting/ConfigRawEditor';
import { ConfigWorkbenchShell } from '@/components/setting/ConfigWorkbenchShell';
import { SettingWorkbenchSurface } from '@/components/setting/SettingWorkbenchSurface';
import { SettingSurfaceControls } from '@/components/setting/SettingSurfaceControls';
import { ConfigPathActionButton } from '@/components/setting/ConfigPathActionButton';
import type { ExternalToolDiagnosisResponse } from '@/components/setting/ExternalDependencyConfigModal';
import { buildSettingCommonActions } from '@/components/setting/SettingCommonActions';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import { useToastStore } from '@/stores/toast';
import { client, extractData, handleApiError } from '@/lib/api';
import { CheckCircle, ShieldAlert } from 'lucide-react';

type ConfigSetStatusResponse = ConfigSetComponents['schemas']['ConfigSetStatusResponse'];
type ConfigTemplateResponse = ConfigSetComponents['schemas']['ConfigTemplateResponse'];
type ConfigNotesResponse = ConfigSetComponents['schemas']['ConfigNotesResponse'];
type BackendCapabilitiesResponse = ApiComponents['schemas']['SystemCapabilities'];
type ConfigSetApplyResponse = ConfigSetComponents['schemas']['ConfigSetApplyResponse'];
type ConfigValidationError = ConfigError;

const isConfigValidationError = (value: unknown): value is ConfigValidationError => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.message !== 'string') return false;
  if (typeof candidate.line !== 'number') return false;
  if (typeof candidate.column !== 'number') return false;
  if (candidate.key !== undefined && candidate.key !== null && typeof candidate.key !== 'string') {
    return false;
  }
  return true;
};

const normalizeValidationErrors = (raw: unknown): ConfigValidationError[] => {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isConfigValidationError);
};

const extractValidationErrorsFromException = (error: unknown): ConfigValidationError[] => {
  if (typeof error !== 'object' || error === null) return [];
  const payload = (error as Record<string, unknown>).data;
  return normalizeValidationErrors(payload);
};

export const ConfigSetEditor: React.FC = () => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === 'dark';
  const { addToast } = useToastStore();

  const [permitted, setPermitted] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState('');

  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [configPath, setConfigPath] = useState('');
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [runtimeOs, setRuntimeOs] = useState<string>('');
  const [notes, setNotes] = useState<Record<string, ConfigNoteEntry>>({});
  const [validationErrors, setValidationErrors] = useState<ConfigError[]>([]);

  type ConfigSetLicenseStatusResponse = {
    is_valid: boolean;
    msg: string;
    device_code: string;
    hw_id: string;
    aux_id: string;
    current_users: number;
    max_users: number;
    expires_at?: string | null;
    features: string[];
  };

  const [licenseStatus, setLicenseStatus] = useState<ConfigSetLicenseStatusResponse | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseSaving, setLicenseSaving] = useState(false);

  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminAction, setAdminAction] = useState<string>('existing_admin');
  const [passwordHint, setPasswordHint] = useState<string | null>(null);
  const [pendingAdminPassword, setPendingAdminPassword] = useState('');
  const [resettingAdminPassword, setResettingAdminPassword] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await extractData<ConfigSetStatusResponse>(
        client.GET('/api/v1/config-set/status')
      );
      setPermitted(data.is_permitted);
      setPermissionMessage(data.message);
    } catch (e) {
      console.error('Failed to fetch config-set status', e);
      setPermitted(false);
      setPermissionMessage('Failed to check config-set permissions');
    }
  }, []);

  const fetchTemplate = useCallback(async () => {
    try {
      const data = await extractData<ConfigTemplateResponse>(
        client.GET('/api/v1/config-set/template')
      );
      setConfigPath(data.current_config_path);
      setContent(data.current_config_content);
      setSavedContent(data.current_config_content);

      try {
        const parsed = toml.parse(data.current_config_content) as unknown;
        if (typeof parsed === 'object' && parsed !== null) {
          const root = parsed as Record<string, unknown>;
          const license = root.license;
          if (typeof license === 'object' && license !== null) {
            const licenseKeyInToml = (license as Record<string, unknown>).license_key;
            if (typeof licenseKeyInToml === 'string' && licenseKeyInToml.trim().length > 0) {
              setLicenseKey(licenseKeyInToml);
            }
          }
        }
      } catch {
        // ignore
      }
    } catch (e) {
      addToast(handleApiError(e, t), 'error');
    }
  }, [addToast, t]);

  const fetchNotes = useCallback(async () => {
    try {
      const data = await extractData<ConfigNotesResponse>(
        client.GET('/api/v1/config-set/notes')
      );
      setNotes(((data.notes ?? {}) as unknown) as Record<string, ConfigNoteEntry>);
    } catch (e) {
      console.error('Failed to fetch config notes', e);
    }
  }, []);

  const fetchCapabilities = useCallback(async () => {
    try {
      const data = await extractData<BackendCapabilitiesResponse>(
        client.GET('/api/v1/system/backend-capabilities-handshake')
      );
      setRuntimeOs(typeof data.runtime_os === 'string' ? data.runtime_os : '');
    } catch (e) {
      console.error('Failed to fetch backend capabilities', e);
      setRuntimeOs('');
    }
  }, []);

  const refreshLicenseStatus = useCallback(async () => {
    try {
      const data = await extractData<ConfigSetLicenseStatusResponse>(
        client.GET('/api/v1/config-set/license/status')
      );
      setLicenseStatus(data);
    } catch (e) {
      // License endpoints may be unavailable on older servers; ignore.
      console.warn('Failed to fetch config-set license status', e);
    }
  }, []);

  const applyLicenseKey = useCallback(async () => {
    const trimmed = licenseKey.trim();
    if (!trimmed) return;
    setLicenseSaving(true);
    try {
      const data = await extractData<ConfigSetLicenseStatusResponse>(
        client.POST('/api/v1/config-set/license/update', {
          body: { license_key: trimmed },
        })
      );
      setLicenseStatus(data);
      addToast(t('admin.config.saveSuccess'), 'success');
    } catch (e) {
      addToast(handleApiError(e, t), 'error');
    } finally {
      setLicenseSaving(false);
    }
  }, [addToast, licenseKey, t]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await fetchStatus();
        await Promise.all([fetchTemplate(), fetchNotes(), fetchCapabilities(), refreshLicenseStatus()]);
      } catch (e) {
        console.error('Config-set init failed', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fetchStatus, fetchTemplate, fetchNotes, fetchCapabilities, refreshLicenseStatus]);

  const finishAndReturnToHome = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await extractData(client.POST('/api/v1/config-set/finish'));
      const startedAt = Date.now();
      const timer = window.setInterval(async () => {
        try {
          const data = await extractData<BackendCapabilitiesResponse>(
            client.GET('/api/v1/system/backend-capabilities-handshake')
          );
          if (data.is_config_set_mode !== true) {
            window.clearInterval(timer);
            window.location.replace('/');
            return;
          }
        } catch {
          if (Date.now() - startedAt > 20_000) {
            window.clearInterval(timer);
            window.location.replace('/');
          }
        }
      }, 1000);
    } catch (e) {
      setFinishing(false);
      addToast(handleApiError(e, t), 'error');
    }
  };

  const handleTest = async () => {
    if (testing) return;
    setTesting(true);
    setValidationErrors([]);
    try {
      await extractData(
        client.POST('/api/v1/config-set/config-test', {
          body: { toml_content: content },
        })
      );
      addToast(t('admin.config.testSuccess'), 'success');
    } catch (e) {
      const errData = extractValidationErrorsFromException(e);
      if (errData.length > 0) {
        setValidationErrors(errData);
        addToast(`${t('admin.config.testFailed')}: ${errData[0].message}`, 'error');
      } else {
        addToast(handleApiError(e, t), 'error');
      }
    } finally {
      setTesting(false);
    }
  };

  const handleApplyWithoutPassword = async () => {
    if (testing) return;
    setTesting(true);
    setValidationErrors([]);
    try {
      const res = await extractData<ConfigSetApplyResponse>(
        client.POST('/api/v1/config-set/apply', {
          body: {
            config_path: configPath,
            toml_content: content,
            admin_password: pendingAdminPassword,
          },
        })
      );
      if (res?.admin_username) setAdminUsername(res.admin_username);
      if (res?.admin_action) setAdminAction(res.admin_action);
      setPasswordHint(res?.password_hint ?? null);
      setPendingAdminPassword('');
      addToast(t('configSet.logs.success') || 'Configuration saved successfully', 'success');
      setCompleted(true);
    } catch (e) {
      const errData = extractValidationErrorsFromException(e);
      if (errData.length > 0) {
        setValidationErrors(errData);
        addToast(`${t('configSet.logs.failed')}: ${errData[0].message}`, 'error');
      } else {
        addToast(handleApiError(e, t), 'error');
      }
    } finally {
      setTesting(false);
    }
  };

  const handleResetToSaved = () => {
    setContent(savedContent);
    setValidationErrors([]);
  };

  const handleQuickWizardResetAdminPassword = async (password: string) => {
    setResettingAdminPassword(true);
    try {
      setPendingAdminPassword(password);
      return adminUsername;
    } finally {
      setResettingAdminPassword(false);
    }
  };

  const handleDiagnoseExternalTools = useCallback(async (configuredValues: Record<string, string>): Promise<ExternalToolDiagnosisResponse> => {
    return extractData<ExternalToolDiagnosisResponse>(
      client.POST('/api/v1/config-set/external-tools/diagnose', {
        body: { configured_values: configuredValues },
      }),
    );
  }, []);

  const handleCheckDatabase = useCallback(async ({ databaseType, connectionString }: { databaseType: 'sqlite' | 'postgres'; connectionString: string }) => {
    try {
      await extractData(
        client.POST('/api/v1/config-set/check-db', {
          body: { db_type: databaseType, connection_string: connectionString },
        }),
      );
      addToast(t('admin.config.testSuccess'), 'success');
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  }, [addToast, t]);

  const handleCheckCache = useCallback(async ({ cacheType, connectionString }: { cacheType: string; connectionString: string }) => {
    try {
      await extractData(
        client.POST('/api/v1/config-set/check-kv', {
          body: { kv_type: cacheType, connection_string: connectionString },
        }),
      );
      addToast(t('admin.config.testSuccess'), 'success');
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    }
  }, [addToast, t]);

  const headerActions = (
    <SettingSurfaceControls compact={true} />
  );

  const finalMessage =
    (adminAction === 'created_default'
      ? t('configSet.final.adminCreatedDefault', { user: adminUsername, password: passwordHint || 'admin888' })
      : adminAction === 'created_with_password'
        ? t('configSet.final.adminCreatedWithPassword', { user: adminUsername, password: passwordHint || '' })
        : adminAction === 'reset_password'
          ? t('configSet.final.adminReset', { user: adminUsername, password: passwordHint || '' })
          : adminAction === 'existing_admin'
            ? t('configSet.final.adminExisting', { user: adminUsername })
            : '');

  const handleConfigPathAction = () => {
    void addToast(
      t('launcher.runtime_dir_change_hint'),
      { type: 'info', duration: 'long' },
    );
  };

  const settingActions = buildSettingCommonActions({
    t,
    isDark,
    tomlAdapter: toml,
    content,
    onContentChange: setContent,
    runtimeOs,
    onTestDatabase: handleCheckDatabase,
    onTestCache: handleCheckCache,
    adminPassword: {
      onApply: async (password) => handleQuickWizardResetAdminPassword(password),
      loading: resettingAdminPassword,
      hint: t('setup.admin.resetRuleHint'),
    },
    license: {
      status: licenseStatus,
      licenseKey,
      onLicenseKeyChange: setLicenseKey,
      onApplyLicense: () => { void applyLicenseKey(); },
      saving: licenseSaving,
    },
    storage: {
      onPrimaryAction: () => { void handleApplyWithoutPassword(); },
      primaryActionLabel: t('setup.guide.card3Action'),
    },
  });

  if (!loading && !permitted) {
    return (
      <ConfigWorkbenchShell
        title={t('admin.config.title')}
        headerActions={headerActions}
      >
        <div className="max-w-2xl mx-auto p-6 sm:p-8 bg-card border-2 border-destructive/20 rounded-3xl sm:rounded-[2.5rem] text-center shadow-2xl">
          <ShieldAlert size={80} className="mx-auto text-destructive mb-8" />
          <h2 className="text-4xl font-black mb-6">{t('configSet.locked.title')}</h2>
          <p className="text-xl opacity-70 mb-10">{permissionMessage}</p>
          <button
            type="button"
            onClick={() => { void fetchStatus(); }}
            className="px-10 py-4 bg-primary text-primary-foreground rounded-2xl font-black shadow-xl"
          >
            {t('common.retry')}
          </button>
        </div>
      </ConfigWorkbenchShell>
    );
  }

  if (completed) {
    return (
      <ConfigWorkbenchShell
        title={t('admin.config.title')}
        configPath={configPath}
        configPathAction={<ConfigPathActionButton onClick={handleConfigPathAction} label={t('setup.guide.card1Action')} />}
        headerActions={headerActions}
      >
        <div className="max-w-2xl mx-auto p-6 sm:p-8 bg-card border-2 border-emerald-500/20 rounded-3xl sm:rounded-[2.5rem] text-center shadow-2xl">
          <CheckCircle size={80} className="mx-auto text-emerald-500 mb-8" />
          <h2 className="text-4xl font-black mb-6">{t('configSet.final.title')}</h2>
          <p className="text-xl opacity-70 mb-10">
            {finalMessage || t('configSet.final.subtitle', { user: adminUsername })}
          </p>
          <div className="max-w-md mx-auto p-4 sm:p-5 bg-muted/50 rounded-xl text-left space-y-3 border border-border mb-8">
            <p className="text-sm font-semibold uppercase tracking-wide opacity-60">
              {t('configSet.final.nextSteps')}
            </p>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <p key={i} className="text-sm leading-6">
                  {i}. {t(`configSet.final.step${i}`)}
                </p>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => { void finishAndReturnToHome(); }}
            disabled={finishing}
            className="px-6 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {finishing ? t('common.processing') : t('common.confirm')}
          </button>
        </div>
      </ConfigWorkbenchShell>
    );
  }

  return (
    <SettingWorkbenchSurface
      title={t('admin.config.title')}
      configPath={configPath}
      configPathAction={<ConfigPathActionButton onClick={handleConfigPathAction} label={t('setup.guide.card1Action')} />}
      headerExtras={headerActions}
      settingActions={settingActions}
      testAction={{
        label: t('setup.editor.check'),
        onClick: () => { void handleTest(); },
        disabled: testing,
      }}
      primaryAction={{
        label: t('setup.guide.card3Action'),
        onClick: () => { void handleApplyWithoutPassword(); },
        disabled: testing,
      }}
      workbenchProps={{
        tomlAdapter: toml,
        loading,
        configPath,
        content,
        savedContent,
        notes,
        validationErrors,
        busy: testing,
        onChange: setContent,
        onTest: handleTest,
        onSave: handleApplyWithoutPassword,
        onCancel: handleResetToSaved,
        showCancel: false,
        allowSaveWithoutChanges: true,
        forceEnableSave: true,
        editorTitle: t('setup.editor.title'),
        testLabel: t('setup.editor.check'),
        onClearValidationErrors: () => setValidationErrors([]),
        runtimeOs,
        onDiagnoseExternalTools: handleDiagnoseExternalTools,
      }}
    />
  );
};
