import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import * as toml from 'smol-toml';
import { client, extractData, handleApiError } from '@/lib/api.ts';
import type { components } from '@/lib/api.ts';
import {
  type ConfigError,
  type ConfigNoteEntry as SharedConfigNoteEntry,
  SystemConfigWorkbench,
  useToastStore,
} from '@fileuni/shared';
import { useAuthzStore } from '@/stores/authz.ts';
import { useAuthStore } from '@/stores/auth.ts';
import { AdminPage } from './admin-ui';

type ConfigRawResponse = components['schemas']['ConfigRawResponse'];
type ConfigNotesResponse = components['schemas']['ConfigNotesResponse'];
type ApiConfigNoteEntry = components['schemas']['ConfigNoteEntry'];

type LicenseStatus = {
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

type ConfigValidationError = {
  message: string;
  line?: number;
  column?: number;
  key?: string | null;
};

type LineDiffStats = {
  changed: number;
  added: number;
  removed: number;
};

type ThumbnailQuickForm = {
  vipsPath: string;
  imagemagickPath: string;
  ffmpegPath: string;
  libreofficePath: string;
  videoSeekSeconds: string;
  videoSeekRatio: string;
};

const DEFAULT_THUMB_FORM: ThumbnailQuickForm = {
  vipsPath: 'vips',
  imagemagickPath: 'convert',
  ffmpegPath: 'ffmpeg',
  libreofficePath: 'soffice',
  videoSeekSeconds: '3',
  videoSeekRatio: '0.3',
};

const isConfigValidationError = (value: unknown): value is ConfigValidationError => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.message !== 'string') return false;
  if (candidate.line !== undefined && typeof candidate.line !== 'number') return false;
  if (candidate.column !== undefined && typeof candidate.column !== 'number') return false;
  if (candidate.key !== undefined && candidate.key !== null && typeof candidate.key !== 'string') return false;
  return true;
};

const normalizeValidationErrors = (raw: unknown): ConfigValidationError[] => {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isConfigValidationError);
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const extractValidationErrorsFromException = (error: unknown): ConfigValidationError[] => {
  if (typeof error !== 'object' || error === null) return [];
  const payload = (error as Record<string, unknown>).data;
  return normalizeValidationErrors(payload);
};

const calculateLineDiffStats = (before: string, after: string): LineDiffStats => {
  const beforeLines = before.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);
  const maxLen = Math.max(beforeLines.length, afterLines.length);
  let added = 0;
  let removed = 0;
  let changed = 0;

  for (let i = 0; i < maxLen; i += 1) {
    const oldLine = beforeLines[i];
    const newLine = afterLines[i];
    if (oldLine === undefined && newLine !== undefined) {
      added += 1;
    } else if (oldLine !== undefined && newLine === undefined) {
      removed += 1;
    } else if (oldLine !== newLine) {
      changed += 1;
    }
  }

  return { changed, added, removed };
};

const formatLineDiffSummary = (stats: LineDiffStats): string => {
  return `changed ${stats.changed}, added ${stats.added}, removed ${stats.removed}`;
};

export const SystemConfigAdmin = () => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [configPath, setConfigPath] = useState('');
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [notes, setNotes] = useState<Record<string, ApiConfigNoteEntry>>({});
  const [validationErrors, setValidationErrors] = useState<ConfigValidationError[]>([]);
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [isResettingAdminPassword, setIsResettingAdminPassword] = useState(false);
  const [reloadSummary, setReloadSummary] = useState('');
  const [reloadSummaryLevel, setReloadSummaryLevel] = useState<'success' | 'warning' | 'error' | 'info'>('info');
  const { currentUserData } = useAuthStore();

  const [thumbForm, setThumbForm] = useState<ThumbnailQuickForm>({
    ...DEFAULT_THUMB_FORM,
  });
  const [thumbConfigJson, setThumbConfigJson] = useState<Record<string, unknown> | null>(null);
  const [thumbSaving, setThumbSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    const data = await extractData<ConfigRawResponse>(client.GET('/api/v1/admin/system/config/raw'));
    if (data) {
      setConfigPath(data.config_path || '');
      setContent(data.toml_content || '');
      setSavedContent(data.toml_content || '');
    }
  }, []);

  const fetchConfigJson = useCallback(async () => {
    const data = await extractData<Record<string, unknown>>(client.GET('/api/v1/admin/system/config'));
    if (!data) return;

    const getObj = (root: unknown, path: string[]): Record<string, unknown> | null => {
      let cur: unknown = root;
      for (const k of path) {
        if (typeof cur !== 'object' || cur === null) return null;
        cur = (cur as Record<string, unknown>)[k];
      }
      return (typeof cur === 'object' && cur !== null) ? (cur as Record<string, unknown>) : null;
    };

    const thumb = getObj(data, ['file_manager_api', 'thumbnail']);
    if (!thumb) return;
    setThumbConfigJson(thumb);

    const tools = getObj(thumb, ['tools']) || {};
    const video = getObj(thumb, ['video']) || {};

    const toStr = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);
    const toNumStr = (v: unknown, fallback: string) => {
      if (typeof v === 'number' && Number.isFinite(v)) return String(v);
      return fallback;
    };

    setThumbForm({
      vipsPath: toStr(tools.vips_path, DEFAULT_THUMB_FORM.vipsPath),
      imagemagickPath: toStr(tools.imagemagick_path, DEFAULT_THUMB_FORM.imagemagickPath),
      ffmpegPath: toStr(tools.ffmpeg_path, DEFAULT_THUMB_FORM.ffmpegPath),
      libreofficePath: toStr(tools.libreoffice_path, DEFAULT_THUMB_FORM.libreofficePath),
      videoSeekSeconds: toNumStr(video.seek_seconds, DEFAULT_THUMB_FORM.videoSeekSeconds),
      videoSeekRatio: toNumStr(video.seek_ratio, DEFAULT_THUMB_FORM.videoSeekRatio),
    });
  }, []);

  const fetchNotes = useCallback(async () => {
    const data = await extractData<ConfigNotesResponse>(client.GET('/api/v1/admin/system/config/notes'));
    if (data) {
      setNotes(data.notes || {});
    }
  }, []);

  const fetchLicenseStatus = useCallback(async () => {
    try {
      const data = await extractData<LicenseStatus>(client.GET('/api/v1/users/admin/license/status'));
      if (data) {
        setLicenseStatus(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const { hasPermission } = useAuthzStore();

  useEffect(() => {
    const load = async () => {
      if (!hasPermission('admin.access')) return;
      try {
        await Promise.all([fetchConfig(), fetchNotes(), fetchLicenseStatus(), fetchConfigJson()]);
      } catch (e) {
        addToast(handleApiError(e, t), 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fetchConfig, fetchNotes, fetchLicenseStatus, fetchConfigJson, addToast, t, hasPermission]);

  const handleApplyThumbnailSettings = async () => {
    if (!thumbConfigJson) {
      addToast(t('admin.config.thumbnail.loadFailed') || 'Thumbnail config unavailable', 'error');
      return;
    }
    if (thumbSaving || testing || reloading) return;

    const next = structuredClone(thumbConfigJson) as Record<string, unknown>;
    const ensureObj = (obj: Record<string, unknown>, key: string) => {
      const cur = obj[key];
      if (typeof cur === 'object' && cur !== null) return cur as Record<string, unknown>;
      const created: Record<string, unknown> = {};
      obj[key] = created;
      return created;
    };

    const tools = ensureObj(next, 'tools');
    tools.vips_path = thumbForm.vipsPath;
    tools.imagemagick_path = thumbForm.imagemagickPath;
    tools.ffmpeg_path = thumbForm.ffmpegPath;
    tools.libreoffice_path = thumbForm.libreofficePath;

    const video = ensureObj(next, 'video');
    const seekSeconds = Number(thumbForm.videoSeekSeconds);
    const seekRatio = Number(thumbForm.videoSeekRatio);
    if (Number.isFinite(seekSeconds) && seekSeconds > 0) {
      video.seek_seconds = Math.floor(seekSeconds);
    }
    if (Number.isFinite(seekRatio) && seekRatio > 0 && seekRatio <= 1) {
      video.seek_ratio = seekRatio;
    }

    setThumbSaving(true);
    try {
      const { error } = await client.PUT('/api/v1/admin/system/config', {
        body: { keys: ['file_manager_api.thumbnail'], value: next },
        headers: { 'X-No-Toast': 'true' },
      });
      if (error) throw error;
      addToast(t('admin.config.thumbnail.applied') || 'Thumbnail settings applied', 'success');
      await Promise.all([fetchConfig(), fetchConfigJson()]);
    } catch (e) {
      const errData = extractValidationErrorsFromException(e);
      if (errData.length > 0) {
        addToast(`${t('admin.config.thumbnail.applyFailed') || 'Apply failed'}: ${errData[0].message}`, 'error');
      } else {
        addToast(handleApiError(e, t), 'error');
      }
    } finally {
      setThumbSaving(false);
    }
  };

  useEffect(() => {
    if (!testing && !reloading) return undefined;
    const watchdog = setTimeout(() => {
      setTesting(false);
      setReloading(false);
      addToast('Operation timeout watchdog released busy state', 'warning');
    }, 45000);
    return () => clearTimeout(watchdog);
  }, [testing, reloading, addToast]);

  const handleTest = async () => {
    if (testing || reloading) return;
    setTesting(true);
    setValidationErrors([]);
    try {
      await withTimeout(
        extractData<{ message?: string }>(
          client.POST('/api/v1/admin/system/config/test', {
            body: { toml_content: content },
            headers: { "X-No-Toast": "true" }
          })
        ),
        20_000,
        'Config test request timeout'
      );
      addToast(t('admin.config.testSuccess'), 'success');
    } catch (e) {
      console.error('Config test exception:', e);
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

  const handleReload = async () => {
    if (reloading || testing) return;
    setReloading(true);
    setValidationErrors([]);
    setReloadSummary('');
    setReloadSummaryLevel('info');
    try {
      const currentContent = content;
      await withTimeout(
        extractData<{ message?: string }>(
          client.POST('/api/v1/admin/system/config/reload', {
            body: { toml_content: currentContent },
            headers: { "X-No-Toast": "true" }
          })
        ),
        20_000,
        'Config reload request timeout'
      );

      const refreshed = await withTimeout(
        extractData<ConfigRawResponse>(client.GET('/api/v1/admin/system/config/raw')),
        15_000,
        'Config refresh request timeout'
      );

      const serverContent = refreshed.toml_content || '';
      const serverPath = refreshed.config_path || configPath;
      setConfigPath(serverPath);
      setSavedContent(serverContent);
      setContent(serverContent);

      addToast(t('admin.config.reloadSuccess'), 'success');
      const diffSummary = formatLineDiffSummary(calculateLineDiffStats(currentContent, serverContent));
      if (serverContent !== currentContent) {
        const summary = `Config synced with server: ${diffSummary}`;
        setReloadSummary(summary);
        setReloadSummaryLevel('warning');
      } else {
        const summary = `Config synced with server: ${diffSummary}`;
        setReloadSummary(summary);
        setReloadSummaryLevel('success');
      }
    } catch (e) {
      console.error('Config reload exception:', e);
      const errData = extractValidationErrorsFromException(e);
      if (errData.length > 0) {
        setValidationErrors(errData);
        const summary = `${t('admin.config.reloadFailed')}: ${errData[0].message}`;
        setReloadSummary(summary);
        setReloadSummaryLevel('error');
        addToast(summary, 'error');
      } else {
        const summary = handleApiError(e, t);
        setReloadSummary(summary);
        setReloadSummaryLevel('error');
        addToast(summary, 'error');
      }
    } finally {
      setReloading(false);
    }
  };

  const handleUpdateLicense = async () => {
    if (!licenseKey.trim()) return;
    setSaving(true);
    try {
      const res = await client.POST('/api/v1/users/admin/license/update', {
        body: { license_key: licenseKey.trim() }
      });
      if (res.data?.success) {
        addToast(t('admin.saveSuccess'), 'success');
        setLicenseKey('');
        fetchLicenseStatus();
      }
    } catch (e) {
      addToast(handleApiError(e, t), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToSaved = () => {
    setContent(savedContent);
    setValidationErrors([]);
  };

  const handleQuickWizardResetAdminPassword = async (password: string) => {
    if (!currentUserData?.user.id) {
      throw new Error('Current user context unavailable');
    }
    setIsResettingAdminPassword(true);
    try {
      await extractData(
        client.POST('/api/v1/users/admin/users/{user_id}/reset-password', {
          params: { path: { user_id: currentUserData.user.id } },
          body: { new_password: password },
        })
      );
      addToast(t('launcher.reset_admin_password_success'), 'success');
      return currentUserData.user.username || 'admin';
    } catch (e) {
      addToast(handleApiError(e, t), 'error');
      throw e;
    } finally {
      setIsResettingAdminPassword(false);
    }
  };

  const normalizedNotes: Record<string, SharedConfigNoteEntry> = Object.fromEntries(
    Object.entries(notes).map(([key, note]) => [
      key,
      {
        desc_en: note.desc_en || '',
        desc_zh: note.desc_zh || '',
        example: note.example || '',
      },
    ]),
  );

  const editorErrors: ConfigError[] = validationErrors.map((err) => ({
    message: err.message,
    line: typeof err.line === 'number' ? err.line : 0,
    column: typeof err.column === 'number' ? err.column : 0,
    key: err.key,
  }));

  return (
    <AdminPage>
      <div className="mb-6 rounded-2xl border border-border bg-background/60 backdrop-blur p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base font-black tracking-wide">
              {t('admin.config.thumbnail.title') || 'Thumbnail Settings'}
            </div>
            <div className="text-sm opacity-70 mt-1">
              {t('admin.config.thumbnail.subtitle') || 'Configure external tools and video seek strategy. Missing/unavailable tools will block startup when enabled.'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleApplyThumbnailSettings()}
            disabled={loading || thumbSaving || testing || reloading}
            className="h-10 px-4 rounded-xl bg-primary text-white font-black disabled:opacity-50"
          >
            {thumbSaving ? (t('common.loading') || 'Loading') : (t('admin.config.thumbnail.apply') || 'Apply')}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-black uppercase opacity-60">libvips</label>
            <input
              value={thumbForm.vipsPath}
              onChange={(e) => setThumbForm(s => ({ ...s, vipsPath: e.target.value }))}
              className="mt-2 h-10 w-full rounded-xl bg-background border border-border px-3 text-sm font-mono"
              placeholder="vips"
            />
          </div>
          <div>
            <label className="text-sm font-black uppercase opacity-60">ImageMagick</label>
            <input
              value={thumbForm.imagemagickPath}
              onChange={(e) => setThumbForm(s => ({ ...s, imagemagickPath: e.target.value }))}
              className="mt-2 h-10 w-full rounded-xl bg-background border border-border px-3 text-sm font-mono"
              placeholder="convert"
            />
          </div>
          <div>
            <label className="text-sm font-black uppercase opacity-60">FFmpeg</label>
            <input
              value={thumbForm.ffmpegPath}
              onChange={(e) => setThumbForm(s => ({ ...s, ffmpegPath: e.target.value }))}
              className="mt-2 h-10 w-full rounded-xl bg-background border border-border px-3 text-sm font-mono"
              placeholder="ffmpeg"
            />
          </div>
          <div>
            <label className="text-sm font-black uppercase opacity-60">LibreOffice</label>
            <input
              value={thumbForm.libreofficePath}
              onChange={(e) => setThumbForm(s => ({ ...s, libreofficePath: e.target.value }))}
              className="mt-2 h-10 w-full rounded-xl bg-background border border-border px-3 text-sm font-mono"
              placeholder="soffice"
            />
          </div>

          <div>
            <label className="text-sm font-black uppercase opacity-60">
              {t('admin.config.thumbnail.videoSeekSeconds') || 'Video Seek Seconds'}
            </label>
            <input
              value={thumbForm.videoSeekSeconds}
              onChange={(e) => setThumbForm(s => ({ ...s, videoSeekSeconds: e.target.value }))}
              className="mt-2 h-10 w-full rounded-xl bg-background border border-border px-3 text-sm font-mono"
              placeholder="3"
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="text-sm font-black uppercase opacity-60">
              {t('admin.config.thumbnail.videoSeekRatio') || 'Video Seek Ratio'}
            </label>
            <input
              value={thumbForm.videoSeekRatio}
              onChange={(e) => setThumbForm(s => ({ ...s, videoSeekRatio: e.target.value }))}
              className="mt-2 h-10 w-full rounded-xl bg-background border border-border px-3 text-sm font-mono"
              placeholder="0.3"
              inputMode="decimal"
            />
            <div className="text-xs opacity-60 mt-2">
              {t('admin.config.thumbnail.videoSeekHint') || 'If ratio is set, it overrides seek seconds (0.0 < ratio <= 1.0).'}
            </div>
          </div>
        </div>
      </div>

      <SystemConfigWorkbench
        tomlAdapter={toml}
        loading={loading}
        configPath={configPath}
        content={content}
        savedContent={savedContent}
        notes={normalizedNotes}
        validationErrors={editorErrors}
        busy={testing || reloading}
        onChange={setContent}
        onTest={handleTest}
        onSave={handleReload}
        onCancel={handleResetToSaved}
        showCancel={false}
        onClearValidationErrors={() => setValidationErrors([])}
        restartNotice={t('admin.config.restartNotice')}
        reloadSummary={reloadSummary}
        reloadSummaryLevel={reloadSummaryLevel}
        quickWizardLicense={{
          isValid: Boolean(licenseStatus?.is_valid),
          msg: licenseStatus?.msg,
          currentUsers: licenseStatus?.current_users || 0,
          maxUsers: licenseStatus?.max_users || 0,
          deviceCode: licenseStatus?.device_code || '',
          hwId: licenseStatus?.hw_id,
          auxId: licenseStatus?.aux_id,
          expiresAt: licenseStatus?.expires_at ?? null,
          features: licenseStatus?.features ?? [],
          licenseKey,
          saving,
          onLicenseKeyChange: setLicenseKey,
          onApplyLicense: () => {
            void handleUpdateLicense();
          },
        }}
        onResetAdminPassword={handleQuickWizardResetAdminPassword}
        isResettingAdminPassword={isResettingAdminPassword}
      />
    </AdminPage>
  );
};
