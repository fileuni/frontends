import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import * as toml from 'smol-toml';
import type { components as ApiComponents } from '@/types/api.ts';
import type { components as ConfigSetComponents } from '@/types/config_set_api.ts';
import {
  type ConfigError,
  type ConfigNoteEntry,
  SystemConfigWorkbench,
  ConfigWorkbenchShell,
  useToastStore,
  useThemeStore,
  useLanguageStore,
  type Theme,
  type Language,
} from '@/shared';
import { client, extractData, handleApiError } from '@/lib/api';
import { CheckCircle, ShieldAlert, Languages, Sun, Moon, Monitor } from 'lucide-react';

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
  const { addToast } = useToastStore();
  const { theme, setTheme } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();

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
            window.location.replace('/ui');
            return;
          }
        } catch {
          if (Date.now() - startedAt > 20_000) {
            window.clearInterval(timer);
            window.location.replace('/ui');
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

  const toggleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const next = themes[(currentIndex + 1) % themes.length] ?? 'light';
    setTheme(next);
  };

  const toggleLanguage = () => {
    const langs: Language[] = ['zh', 'en'];
    const currentLanguage: Language = language === 'auto' ? 'zh' : language;
    const currentIndex = langs.indexOf(currentLanguage);
    const next = langs[(currentIndex + 1) % langs.length] ?? 'zh';
    setLanguage(next);
  };

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleLanguage}
        className="h-8 w-8 rounded-lg border inline-flex items-center justify-center transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10"
        title={t('launcher.switch_language')}
      >
        <Languages size={16} />
      </button>
      <button
        type="button"
        onClick={toggleTheme}
        className="h-8 w-8 rounded-lg border inline-flex items-center justify-center transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10"
        title={t('launcher.toggle_theme')}
      >
        <ThemeIcon size={16} />
      </button>
    </div>
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

  if (!loading && !permitted) {
    return (
      <ConfigWorkbenchShell
        title={t('configSet.wizard.title')}
        subtitle={t('configSet.wizard.subtitle')}
        configPath={configPath}
        headerActions={headerActions}
      >
        <div className="max-w-2xl mx-auto p-6 sm:p-8 bg-card border-2 border-destructive/20 rounded-3xl sm:rounded-[2.5rem] text-center shadow-2xl">
          <ShieldAlert size={80} className="mx-auto text-destructive mb-8" />
          <h2 className="text-4xl font-black mb-6">{t('configSet.locked.title')}</h2>
          <p className="text-xl opacity-70 mb-10">{permissionMessage}</p>
          <button
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
        title={t('configSet.wizard.title')}
        subtitle={t('configSet.wizard.subtitle')}
        configPath={configPath}
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
      <ConfigWorkbenchShell
        title={t('configSet.wizard.title')}
        subtitle={t('configSet.wizard.subtitle')}
        configPath={configPath}
        headerActions={headerActions}
      >
        <SystemConfigWorkbench
          tomlAdapter={toml}
          loading={loading}
          configPath={configPath}
          content={content}
          savedContent={savedContent}
          notes={notes}
          validationErrors={validationErrors}
          busy={testing}
          onChange={setContent}
          onTest={handleTest}
          onSave={handleApplyWithoutPassword}
          onCancel={handleResetToSaved}
          showCancel={false}
          allowSaveWithoutChanges={true}
          forceEnableSave={true}
          onClearValidationErrors={() => setValidationErrors([])}
          restartNotice={t('admin.config.restartNotice')}
          quickWizardEnabled={true}
          runtimeOs={runtimeOs}
          quickWizardLicense={{
            isValid: Boolean(licenseStatus?.is_valid),
            msg: licenseStatus?.msg,
            currentUsers: licenseStatus?.current_users ?? 0,
            maxUsers: licenseStatus?.max_users ?? 0,
            deviceCode: licenseStatus?.device_code ?? '',
            hwId: licenseStatus?.hw_id,
            auxId: licenseStatus?.aux_id,
            expiresAt: licenseStatus?.expires_at ?? null,
            features: licenseStatus?.features ?? [],
            licenseKey,
            saving: licenseSaving,
            onLicenseKeyChange: setLicenseKey,
            onApplyLicense: () => {
              void applyLicenseKey();
            },
          }}
          adminPasswordLabel={t('configSet.admin.changePassword')}
          onResetAdminPassword={handleQuickWizardResetAdminPassword}
          isResettingAdminPassword={resettingAdminPassword}
          adminPasswordPanelProps={{
            showWarning: false,
            showSuccess: false,
            showResetHint: false,
            confirmLabel: t('configSet.admin.changePassword'),
            pendingHint: t('configSet.admin.pendingHint'),
          }}
        />
      </ConfigWorkbenchShell>
    );
};
