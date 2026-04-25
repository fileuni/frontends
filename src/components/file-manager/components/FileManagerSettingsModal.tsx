import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  ChevronDown,
  Cloud,
  Copy,
  Eye,
  EyeOff,
  HardDrive,
  Info,
  KeyRound,
  RefreshCw,
  Server,
  Shield,
  Trash2,
  Upload,
} from 'lucide-react';
import { GlassModalShell } from '@fileuni/ts-shared/modal-shell';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button.tsx';
import { Switch } from '@/components/ui/Switch.tsx';
import { useFileStore } from '../store/useFileStore.ts';
import { client, extractData } from '@/lib/api.ts';
import { copyTextWithToast, showApiErrorToast } from '@/lib/feedback.ts';
import { useConfigStore } from '@/stores/config.ts';
import { useAuthzStore } from '@/stores/authz.ts';
import { useFileActions } from '../hooks/useFileActions.ts';
import {
  useUserFileSettingsStore,
  type UserFileSettingsUpdate,
} from '@/stores/userFileSettings.ts';
import { useToastStore } from '@/stores/toast';
import { cn } from '@/lib/utils.ts';

type SshKeyInfo = {
  id: string;
  key_name: string;
  public_key: string;
  fingerprint: string;
  key_type: string;
  created_at: string;
  last_used_at?: string | null;
};

type ProtocolCapabilities = {
  webdav_path?: string | null;
  sftp_port?: number | null;
  ftp_port?: number | null;
  ftp_passive_host?: string | null;
  ftp_passive_ports_start?: number | null;
  ftp_passive_ports_end?: number | null;
};

const resolveText = (
  translate: (key: string) => string,
  key: string,
  fallback: string,
): string => {
  const value = translate(key);
  return value === key ? fallback : value;
};

const formatHostPort = (host: string, port: number): string => {
  const normalizedHost = host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
  return `${normalizedHost}:${port}`;
};

const formatTimestamp = (value: string | null | undefined): string => {
  if (!value) {
    return '-';
  }
  const next = new Date(value);
  return Number.isNaN(next.getTime()) ? value : next.toLocaleString();
};

const keyNameForNextEntry = (index: number): string => `device-key-${index + 1}`;

interface FileManagerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FileManagerSettingsModal = ({
  isOpen,
  onClose,
}: FileManagerSettingsModalProps) => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const { capabilities } = useConfigStore();
  const hasPermission = useAuthzStore((state) => state.hasPermission);
  const {
    settings,
    fetchSettings,
    updateSettings,
    isLoading: settingsLoading,
  } = useUserFileSettingsStore();
  const protocolCaps = capabilities as (typeof capabilities & ProtocolCapabilities) | null;
  const browserHost = typeof window === 'undefined' ? 'localhost' : window.location.hostname;
  const currentPath = useFileStore((state) => state.getCurrentPath());
  const { clearThumbnailCache, clearThumbnailCacheAllUsers } = useFileActions();
  const browserOrigin = typeof window === 'undefined' ? '' : window.location.origin;
  const [showS3Modal, setShowS3Modal] = useState(false);
  const [showSftpModal, setShowSftpModal] = useState(false);
  const [showS3SecretKey, setShowS3SecretKey] = useState(false);
  const [s3Keys, setS3Keys] = useState<{
    access_key: string | null;
    secret_key: string | null;
  }>({
    access_key: null,
    secret_key: null,
  });
  const [sshKeys, setSshKeys] = useState<SshKeyInfo[]>([]);
  const [loadingSshKeys, setLoadingSshKeys] = useState(false);
  const [savingSshKey, setSavingSshKey] = useState(false);
  const [removingKeyId, setRemovingKeyId] = useState<string | null>(null);
  const [regeneratingS3, setRegeneratingS3] = useState(false);
  const [sshKeyDraft, setSshKeyDraft] = useState('');
  const [openProtocolKey, setOpenProtocolKey] = useState<'webdav' | 'ftp' | 'sftp' | 's3' | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const modalTitle = resolveText(
    t,
    'filemanager.thumbnail.settingsTitle',
    'File Management Settings',
  );
  const thumbnailSectionTitle = resolveText(
    t,
    'filemanager.settings.thumbnailTitle',
    'Thumbnail Settings',
  );
  const s3AccessKeyLabel = resolveText(
    t,
    'security.accessKey',
    'Access Key/Access ID',
  );
  const protocolSectionTitle = resolveText(
    t,
    'filemanager.settings.protocolsTitle',
    'File Protocol Access',
  );
  const protocolSectionDesc = resolveText(
    t,
    'filemanager.settings.protocolsDesc',
    'Review each enabled protocol, its access address, and the sign-in method for your account.',
  );
  const refreshHint = resolveText(
    t,
    'filemanager.settings.refreshHint',
    'Changes to thumbnail switches take effect after you refresh the file list.',
  );
  const endpointLabel = resolveText(t, 'filemanager.settings.endpointLabel', 'Endpoint');
  const accessLabel = resolveText(t, 'filemanager.settings.accessLabel', 'Access');
  const detailsLabel = resolveText(t, 'filemanager.settings.detailsLabel', 'Details');
  const disabledProtocolText = resolveText(
    t,
    'filemanager.settings.protocolDisabled',
    'This protocol is currently disabled.',
  );
  const sshKeyActionLabel = resolveText(t, 'filemanager.settings.sshKeyAction', 'SSH Key');
  const s3AccessActionLabel = resolveText(
    t,
    'filemanager.settings.s3AccessAction',
    'Access Key/Access ID',
  );
  const sftpModalTitle = resolveText(t, 'filemanager.settings.sftpModalTitle', 'SFTP SSH Keys');
  const sftpModalDesc = resolveText(
    t,
    'filemanager.settings.sftpModalDesc',
    'Upload or paste an SSH public key so this account can sign in to SFTP with the matched private key.',
  );
  const configuredKeysLabel = resolveText(
    t,
    'filemanager.settings.configuredKeys',
    'Configured Keys',
  );
  const pastePublicKeyLabel = resolveText(
    t,
    'filemanager.settings.pastePublicKey',
    'Paste Public Key',
  );
  const currentAccessModeLabel = resolveText(
    t,
    'filemanager.settings.currentAccessMode',
    'Current access mode',
  );
  const noSshKeyText = resolveText(
    t,
    'filemanager.settings.noSshKey',
    'No SSH public key is configured yet.',
  );
  const saveSshKeySuccess = resolveText(
    t,
    'filemanager.settings.saveSshKeySuccess',
    'SSH public key saved.',
  );
  const removeSshKeySuccess = resolveText(
    t,
    'filemanager.settings.removeSshKeySuccess',
    'SSH public key removed.',
  );
  const importSshKeySuccess = resolveText(
    t,
    'filemanager.settings.importSshKeySuccess',
    'SSH public key loaded from file.',
  );
  const missingSshKeyText = resolveText(
    t,
    'filemanager.settings.missingSshKey',
    'Paste an SSH public key first.',
  );
  const s3KeyCopiedText = resolveText(
    t,
    'filemanager.settings.s3KeyCopied',
    'Access key copied.',
  );
  const s3SecretCopiedText = resolveText(
    t,
    'filemanager.settings.s3SecretCopied',
    'Secret key copied.',
  );
  const createdAtLabel = resolveText(t, 'filemanager.settings.createdAt', 'Created');
  const lastUsedLabel = resolveText(t, 'filemanager.settings.lastUsed', 'Last used');

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    void fetchSettings(true);
  }, [fetchSettings, isOpen]);

  useEffect(() => {
    setS3Keys({
      access_key: settings?.s3_access_key ?? null,
      secret_key: settings?.s3_secret_key ?? null,
    });
  }, [settings?.s3_access_key, settings?.s3_secret_key]);

  useEffect(() => {
    if (!isOpen || capabilities?.enable_sftp !== true) {
      return;
    }
    void (async () => {
      setLoadingSshKeys(true);
      try {
        const data = await extractData<SshKeyInfo[]>(client.GET('/api/v1/file/ssh-key'));
        setSshKeys(Array.isArray(data) ? data : []);
      } catch (error) {
        showApiErrorToast(addToast, t, error);
      } finally {
        setLoadingSshKeys(false);
      }
    })();
  }, [addToast, capabilities?.enable_sftp, isOpen, t]);

  const thumbCaps = capabilities?.thumbnail;
  const isAdmin = hasPermission('admin.access');
  const allowDirectoryModeOverride = thumbCaps?.allow_user_directory_mode_override === true;
  const allowShowThumbnailDirs = thumbCaps?.allow_user_show_hidden_thumbnail_dirs === true;
  const allowedDirectoryModes = thumbCaps?.allowed_directory_modes ?? ['user_root', 'per_directory'];
  const effectiveDirectoryMode = settings?.thumbnail_directory_mode ?? thumbCaps?.default_directory_mode ?? 'user_root';
  const effectiveShowThumbnailDirs = allowShowThumbnailDirs
    ? settings?.show_thumbnail_directories === true
    : thumbCaps?.default_show_thumbnail_directories === true;
  const visibleToggleItems: Array<{
    key: keyof UserFileSettingsUpdate;
    label: string;
  }> = useMemo(() => {
    const items = [
      {
        key: 'thumbnail_disable_image' as const,
        label: resolveText(t, 'filemanager.thumbnail.types.image', 'Images'),
        enabled: thumbCaps?.image === true,
      },
      {
        key: 'thumbnail_disable_video' as const,
        label: resolveText(t, 'filemanager.thumbnail.types.video', 'Videos'),
        enabled: thumbCaps?.video === true,
      },
      {
        key: 'thumbnail_disable_pdf' as const,
        label: resolveText(t, 'filemanager.thumbnail.types.pdf', 'PDF'),
        enabled: thumbCaps?.pdf === true,
      },
      {
        key: 'thumbnail_disable_office' as const,
        label: resolveText(t, 'filemanager.thumbnail.types.office', 'Office'),
        enabled: thumbCaps?.office === true,
      },
      {
        key: 'thumbnail_disable_text' as const,
        label: resolveText(t, 'filemanager.thumbnail.types.text', 'Text'),
        enabled: thumbCaps?.text === true,
      },
      {
        key: 'thumbnail_disable_markdown' as const,
        label: resolveText(t, 'filemanager.thumbnail.types.markdown', 'Markdown'),
        enabled: thumbCaps?.text === true,
      },
      {
        key: 'thumbnail_disable_tex' as const,
        label: resolveText(t, 'filemanager.thumbnail.types.tex', 'LaTeX'),
        enabled: thumbCaps?.tex === true,
      },
    ];
    return items.filter((item) => item.enabled).map(({ enabled: _enabled, ...rest }) => rest);
  }, [t, thumbCaps]);

  const ftpEndpoint = protocolCaps?.ftp_port
    ? formatHostPort(browserHost, protocolCaps.ftp_port)
    : null;
  const sftpEndpoint = protocolCaps?.sftp_port
    ? formatHostPort(browserHost, protocolCaps.sftp_port)
    : null;
  const webdavUrl = protocolCaps?.webdav_path
    ? `${browserOrigin}${protocolCaps.webdav_path}`
    : null;
  const s3Endpoint = capabilities?.s3_port
    ? `${capabilities.s3_use_https ? 'https' : 'http'}://${formatHostPort(browserHost, capabilities.s3_port)}`
    : null;
  const ftpPassiveSummary =
    protocolCaps?.ftp_passive_ports_start && protocolCaps?.ftp_passive_ports_end
      ? `${protocolCaps.ftp_passive_host || browserHost}:${protocolCaps.ftp_passive_ports_start}-${protocolCaps.ftp_passive_ports_end}`
      : null;
  const sftpPasswordEnabled = settings?.sftp_enable_password !== false;
  const hasSshKey = sshKeys.length > 0;

  const handleRegenerateS3 = async () => {
    const confirmMessage = resolveText(
      t,
      'security.rotateConfirm',
      'Regenerate the current S3 access key and secret key?',
    );
    if (!window.confirm(confirmMessage)) {
      return;
    }
    setRegeneratingS3(true);
    try {
      const nextKeys = await extractData<{ access_key: string; secret_key: string }>(
        client.POST('/api/v1/file/s3-keys/regenerate'),
      );
      setS3Keys(nextKeys);
      setShowS3SecretKey(false);
      await fetchSettings(true);
      await addToast(
        resolveText(t, 'security.rotateSuccess', 'S3 credentials updated successfully.'),
        'success',
      );
    } catch (error) {
      showApiErrorToast(addToast, t, error);
    } finally {
      setRegeneratingS3(false);
    }
  };

  const handleSaveSshKey = async () => {
    const nextKey = sshKeyDraft.trim();
    if (!nextKey) {
      await addToast(missingSshKeyText, 'error');
      return;
    }
    setSavingSshKey(true);
    try {
      await extractData(
        client.POST('/api/v1/file/ssh-key', {
          body: {
            key_name: keyNameForNextEntry(sshKeys.length),
            public_key: nextKey,
          },
        }),
      );
      const keys = await extractData<SshKeyInfo[]>(client.GET('/api/v1/file/ssh-key'));
      setSshKeys(Array.isArray(keys) ? keys : []);
      setSshKeyDraft('');
      await addToast(saveSshKeySuccess, 'success');
    } catch (error) {
      showApiErrorToast(addToast, t, error);
    } finally {
      setSavingSshKey(false);
    }
  };

  const handleDeleteSshKey = async (keyId: string) => {
    setRemovingKeyId(keyId);
    try {
      await extractData(client.DELETE('/api/v1/file/ssh-key', { body: { id: keyId } }));
      const keys = await extractData<SshKeyInfo[]>(client.GET('/api/v1/file/ssh-key'));
      setSshKeys(Array.isArray(keys) ? keys : []);
      await addToast(removeSshKeySuccess, 'success');
    } catch (error) {
      showApiErrorToast(addToast, t, error);
    } finally {
      setRemovingKeyId(null);
    }
  };

  const handleImportKeyFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const content = await file.text();
      setSshKeyDraft(content.trim());
      await addToast(importSshKeySuccess, 'success');
    } catch (error) {
      showApiErrorToast(addToast, t, error);
    } finally {
      event.target.value = '';
    }
  };

  const protocolCards: Array<{
    key: 'webdav' | 'ftp' | 'sftp' | 's3';
    icon: typeof HardDrive;
    title: string;
    enabled: boolean;
    endpoint: string | null;
    accessNote: string;
    extra: string | null;
    action: React.ReactNode;
  }> = [
    {
      key: 'webdav',
      icon: HardDrive,
      title: 'WebDAV',
      enabled: capabilities?.enable_webdav === true,
      endpoint: webdavUrl,
      accessNote: resolveText(
        t,
        'filemanager.settings.webdavAccess',
        'Sign in with your account username and password.',
      ),
      extra: protocolCaps?.webdav_path
        ? `${resolveText(t, 'filemanager.settings.pathSuffix', 'Path suffix')}: ${protocolCaps.webdav_path}`
        : null,
      action: null,
    },
    {
      key: 'ftp',
      icon: Server,
      title: 'FTP',
      enabled: capabilities?.enable_ftp === true,
      endpoint: ftpEndpoint,
      accessNote: resolveText(
        t,
        'filemanager.settings.ftpAccess',
        'Sign in with your account username and password.',
      ),
      extra: ftpPassiveSummary
        ? resolveText(
            t,
            'filemanager.settings.ftpPassiveWithRange',
            'Active mode is available. Passive mode uses {{value}}.',
          ).replace('{{value}}', ftpPassiveSummary)
        : resolveText(
            t,
            'filemanager.settings.ftpPassiveDefault',
            'Active and passive mode are available.',
          ),
      action: null,
    },
    {
      key: 'sftp',
      icon: Shield,
      title: 'SFTP',
      enabled: capabilities?.enable_sftp === true,
      endpoint: sftpEndpoint,
      accessNote: hasSshKey
        ? sftpPasswordEnabled
          ? resolveText(
              t,
              'filemanager.settings.sftpPasswordOrKey',
              'Use your password or a matched private key.',
            )
          : resolveText(
              t,
              'filemanager.settings.sftpKeyOnly',
              'Password login is disabled. Use a matched private key.',
            )
        : sftpPasswordEnabled
          ? resolveText(
              t,
              'filemanager.settings.sftpPasswordOnlyForNow',
              'No public key is configured yet. Use your password for now.',
            )
          : resolveText(
              t,
              'filemanager.settings.sftpNeedPublicKey',
              'No public key is configured yet. Add a public key before using SFTP.',
            ),
      extra: hasSshKey
        ? resolveText(
            t,
            'filemanager.settings.sshKeyConfiguredCount',
            '{{count}} public key configured.',
          ).replace('{{count}}', String(sshKeys.length))
        : resolveText(
            t,
            'filemanager.settings.noPublicKeyConfigured',
            'No public key configured.',
          ),
      action: (
          <Button variant="outline" size="sm" onClick={() => setShowSftpModal(true)} className="rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white">
            <KeyRound size={16} className="mr-2" />
            {sshKeyActionLabel}
          </Button>
      ),
    },
    {
      key: 's3',
      icon: Cloud,
      title: 'S3',
      enabled: capabilities?.enable_s3 === true,
      endpoint: s3Endpoint,
      accessNote: resolveText(
        t,
        'filemanager.settings.s3Access',
        'Use your access key ID and secret key to sign in.',
      ),
      extra: s3Keys.access_key
        ? `${s3AccessActionLabel}: ${s3Keys.access_key}`
        : resolveText(
            t,
            'filemanager.settings.noS3KeyYet',
            'No access key generated yet.',
          ),
      action: (
          <Button variant="outline" size="sm" onClick={() => setShowS3Modal(true)} className="rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white">
            <KeyRound size={16} className="mr-2" />
            {s3AccessActionLabel}
          </Button>
      ),
    },
  ];

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <GlassModalShell
        title={modalTitle}
        subtitle={protocolSectionDesc}
        icon={<HardDrive size={24} />}
        onClose={onClose}
        compact="all"
        maxWidthClassName="max-w-5xl"
        bodyClassName="space-y-6 lg:space-y-8"
        zIndexClassName="z-[250]"
        closeButton={(
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-2xl h-12 w-12 p-0 hover:bg-white/5 shrink-0">
            <span className="text-2xl opacity-40 leading-none">×</span>
          </Button>
        )}
        footer={(
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2 opacity-30 italic sm:max-w-[70%]">
              <Info size={18} className="shrink-0" />
              <span className="text-sm font-medium leading-tight">{refreshHint}</span>
            </div>
            <Button onClick={onClose} className="rounded-2xl w-full sm:w-auto px-8 h-12 font-black text-sm shadow-xl shadow-primary/20 shrink-0">
              {t('common.close')}
            </Button>
          </div>
        )}
      >
            <section className="space-y-5">
              <div className="space-y-3">
                <h4 className="text-sm font-black tracking-[0.2em] text-primary/60 border-b border-white/5 pb-2">
                  {thumbnailSectionTitle}
                </h4>
                <div className="flex items-start gap-3 rounded-3xl border border-primary/15 bg-primary/10 px-4 py-4 text-sm text-white/75">
                  <Info size={18} className="mt-0.5 shrink-0 text-primary" />
                  <p className="leading-relaxed">{refreshHint}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 shadow-inner sm:col-span-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-white tracking-wide">
                        {resolveText(t, 'filemanager.thumbnail.directoryMode', 'Thumbnail Directory Mode')}
                      </div>
                      <div className="mt-1 text-xs text-white/50 leading-relaxed">
                        {resolveText(t, 'filemanager.thumbnail.directoryModeHint', 'Choose one shared thumbnail directory in your root or one thumbnail directory inside each folder.')}
                      </div>
                    </div>
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-white/35">
                      {allowDirectoryModeOverride ? t('common.enabled') : t('common.disabled')}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {[
                      {
                        value: 'user_root',
                        title: resolveText(t, 'filemanager.thumbnail.modeUserRoot', 'Unified Directory'),
                        desc: resolveText(t, 'filemanager.thumbnail.modeUserRootHint', 'Store thumbnails in /.fileuni-thumbnail under your root directory.'),
                      },
                      {
                        value: 'per_directory',
                        title: resolveText(t, 'filemanager.thumbnail.modePerDirectory', 'Multi Directory'),
                        desc: resolveText(t, 'filemanager.thumbnail.modePerDirectoryHint', 'Create a .fileuni-thumbnail directory inside each folder that generates thumbnails.'),
                      },
                    ]
                      .filter((option) => allowedDirectoryModes.includes(option.value))
                      .map((option) => {
                      const active = effectiveDirectoryMode === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          disabled={settingsLoading || !allowDirectoryModeOverride || thumbCaps?.enabled !== true}
                          onClick={() => void updateSettings({ thumbnail_directory_mode: option.value } as UserFileSettingsUpdate)}
                          className={cn(
                            'rounded-2xl border px-4 py-3 text-left transition-colors',
                            active ? 'border-primary bg-primary/15 text-white' : 'border-white/10 bg-white/[0.02] text-white/75',
                            (settingsLoading || !allowDirectoryModeOverride || thumbCaps?.enabled !== true) && 'opacity-50 cursor-not-allowed',
                          )}
                        >
                          <div className="text-sm font-black tracking-wide">{option.title}</div>
                          <div className="mt-1 text-xs leading-relaxed text-white/55">{option.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 shadow-inner sm:col-span-2">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-white tracking-wide">
                      {resolveText(t, 'filemanager.thumbnail.showDirectory', 'Show Thumbnail Directories')}
                    </div>
                    <div className="mt-1 text-xs text-white/50 leading-relaxed">
                      {resolveText(t, 'filemanager.thumbnail.showDirectoryHint', 'Show or hide internal thumbnail directories in the file list.')}
                    </div>
                  </div>
                  <Switch
                    checked={effectiveShowThumbnailDirs}
                    disabled={settingsLoading || !allowShowThumbnailDirs}
                    onChange={(value) => void updateSettings({ show_thumbnail_directories: value } as UserFileSettingsUpdate)}
                  />
                </div>

                {visibleToggleItems.map((item) => {
                  const rawValue = settings?.[item.key];
                  const disabledValue = typeof rawValue === 'boolean' ? rawValue : false;
                  const checked = !disabledValue;
                  return (
                    <div
                      key={item.key as string}
                      className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 shadow-inner"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-black text-white tracking-wide">{item.label}</div>
                        <div className="text-xs font-bold uppercase tracking-[0.16em] text-white/35 mt-1">
                          {checked ? t('common.enabled') : t('common.disabled')}
                        </div>
                      </div>
                      <Switch
                        checked={checked}
                        disabled={settingsLoading}
                        onChange={(value) =>
                          void updateSettings({
                            [item.key]: !value,
                          } as UserFileSettingsUpdate)
                        }
                      />
                    </div>
                  );
                })}
                {visibleToggleItems.length === 0 && (
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/60 sm:col-span-2">
                    {resolveText(
                      t,
                      'filemanager.thumbnail.noTypes',
                      'No thumbnail types are available for this server.',
                    )}
                  </div>
                )}

                {thumbCaps?.enabled === true && (
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 shadow-inner sm:col-span-2">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-black text-white tracking-wide">
                          {resolveText(t, 'filemanager.thumbnail.clearDir', 'Clear Folder Thumbnails')}
                        </div>
                        <div className="mt-1 text-xs text-white/50 leading-relaxed">
                          {resolveText(t, 'filemanager.thumbnail.clearDirHint', 'Delete thumbnails for the current folder or remove all thumbnails. New thumbnails will be generated again when needed.')}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-2xl"
                          onClick={() => void clearThumbnailCache(currentPath)}
                        >
                          {resolveText(t, 'filemanager.thumbnail.clearDir', 'Clear Folder Thumbnails')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-2xl"
                          onClick={() => void clearThumbnailCache()}
                        >
                          {resolveText(t, 'filemanager.thumbnail.clearAll', 'Clear All Thumbnails')}
                        </Button>
                        {isAdmin && (
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-2xl text-red-400 border-red-400/20 hover:bg-red-500/10"
                            onClick={() => void clearThumbnailCacheAllUsers()}
                          >
                            {resolveText(t, 'filemanager.thumbnail.clearAllUsers', 'Clear All Users Thumbnails')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-5">
              <div className="space-y-3">
                <h4 className="text-sm font-black tracking-[0.2em] text-primary/60 border-b border-white/5 pb-2">
                  {protocolSectionTitle}
                </h4>
              </div>
              <div className="space-y-2">
                {protocolCards.map(({ key, icon: Icon, title, enabled, endpoint, accessNote, extra, action }) => {
                  const expanded = openProtocolKey === key;
                  return (
                    <div
                      key={key}
                      className={cn(
                        'rounded-[1.75rem] border transition-colors overflow-hidden',
                        enabled
                          ? 'border-primary/20 bg-primary/10 shadow-[0_20px_60px_rgba(0,0,0,0.22)]'
                          : 'border-white/10 bg-white/[0.03] opacity-90',
                      )}
                    >
                      <button
                        type="button"
                        className="w-full px-4 py-3 sm:px-4 sm:py-3.5 text-left flex items-start gap-3"
                        onClick={() => setOpenProtocolKey((prev) => (prev === key ? null : key))}
                      >
                        <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner shrink-0">
                          <Icon size={17} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm sm:text-[15px] font-black text-white tracking-tight">{title}</div>
                              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/35 mt-1">
                                {enabled ? t('common.enabled') : t('common.disabled')}
                              </div>
                            </div>
                            <ChevronDown
                              size={18}
                              className={cn(
                                'mt-1 shrink-0 text-white/45 transition-transform duration-200',
                                expanded && 'rotate-180',
                              )}
                            />
                          </div>
                          <div className="mt-2 text-xs sm:text-sm font-mono break-all text-white/72 pr-2 line-clamp-2 sm:line-clamp-1 leading-snug">
                            {endpoint || '-'}
                          </div>
                        </div>
                      </button>

                      {expanded && (
                        <div className="px-4 pb-3 sm:px-4 sm:pb-4 border-t border-white/5">
                          <div className="pt-3 space-y-3 text-sm">
                            <div>
                              <div className="opacity-40 font-black uppercase tracking-[0.16em] text-[11px]">{endpointLabel}</div>
                              <div className="font-mono break-all mt-1 text-white/85 text-xs sm:text-sm leading-snug">{endpoint || '-'}</div>
                            </div>
                            <div>
                              <div className="opacity-40 font-black uppercase tracking-[0.16em] text-[11px]">{accessLabel}</div>
                              <div className="mt-1 text-white/75 leading-relaxed text-xs sm:text-sm">{enabled ? accessNote : disabledProtocolText}</div>
                            </div>
                            {extra ? (
                              <div>
                                <div className="opacity-40 font-black uppercase tracking-[0.16em] text-[11px]">{detailsLabel}</div>
                                <div className="mt-1 break-all text-white/75 leading-relaxed text-xs sm:text-sm">{extra}</div>
                              </div>
                            ) : null}
                            {enabled && action ? <div className="pt-1">{action}</div> : null}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
      </GlassModalShell>

      {showS3Modal ? (
        <GlassModalShell
          title={resolveText(t, 'security.s3Title', 'S3 Access Keys')}
          subtitle={resolveText(
            t,
            'security.s3Desc',
            'Use this access key ID and secret key with the S3 endpoint shown in the main settings panel.',
          )}
          icon={<Cloud size={24} />}
          onClose={() => setShowS3Modal(false)}
          compact="header"
          nested
          maxWidthClassName="max-w-2xl"
          bodyClassName="space-y-5"
          closeButton={(
            <Button variant="ghost" size="sm" onClick={() => setShowS3Modal(false)} className="rounded-2xl h-12 w-12 p-0 hover:bg-white/5 shrink-0">
              <span className="text-2xl opacity-40 leading-none">×</span>
            </Button>
          )}
        >
        <div className="space-y-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-bold uppercase tracking-[0.16em] opacity-60">
                {s3AccessKeyLabel}
              </div>
              <div className="rounded-2xl border bg-muted/20 px-4 py-3 font-mono break-all">
                {s3Keys.access_key || resolveText(t, 'security.notGenerated', 'Not generated')}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void copyTextWithToast({
                      text: s3Keys.access_key || '',
                      addToast,
                      t,
                      successMessage: s3KeyCopiedText,
                    })
                  }
                  disabled={!s3Keys.access_key}
                >
                  <Copy size={16} className="mr-2" />
                  {t('common.copy')}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-bold uppercase tracking-[0.16em] opacity-60">
                {resolveText(t, 'security.secretKey', 'Secret Key')}
              </div>
              <div className="flex gap-2 items-stretch">
                <div className="rounded-2xl border bg-muted/20 px-4 py-3 font-mono break-all flex-1">
                  {s3Keys.secret_key
                    ? showS3SecretKey
                      ? s3Keys.secret_key
                      : '••••••••••••••••••••••••••••••••'
                    : resolveText(t, 'security.notGenerated', 'Not generated')}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowS3SecretKey((value) => !value)}
                  disabled={!s3Keys.secret_key}
                  aria-label={showS3SecretKey ? 'Hide secret key' : 'Show secret key'}
                >
                  {showS3SecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void copyTextWithToast({
                      text: s3Keys.secret_key || '',
                      addToast,
                      t,
                      successMessage: s3SecretCopiedText,
                    })
                  }
                  disabled={!s3Keys.secret_key}
                >
                  <Copy size={16} className="mr-2" />
                  {t('common.copy')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRegenerateS3()}
                  disabled={regeneratingS3}
                >
                  <RefreshCw size={16} className={cn('mr-2', regeneratingS3 && 'animate-spin')} />
                  {resolveText(t, 'security.rotateKeys', 'Regenerate Keys')}
                </Button>
              </div>
            </div>
          </div>
        </div>
        </GlassModalShell>
      ) : null}

      {showSftpModal ? (
        <GlassModalShell
          title={sftpModalTitle}
          subtitle={sftpModalDesc}
          icon={<Shield size={24} />}
          onClose={() => setShowSftpModal(false)}
          compact="header"
          nested
          maxWidthClassName="max-w-3xl"
          bodyClassName="space-y-5"
          closeButton={(
            <Button variant="ghost" size="sm" onClick={() => setShowSftpModal(false)} className="rounded-2xl h-12 w-12 p-0 hover:bg-white/5 shrink-0">
              <span className="text-2xl opacity-40 leading-none">×</span>
            </Button>
          )}
        >
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-bold uppercase tracking-[0.16em] opacity-60">
                {configuredKeysLabel}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} className="mr-2" />
                {resolveText(t, 'filemanager.upload', 'Upload')}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pub,text/plain"
                className="hidden"
                onChange={(event) => void handleImportKeyFile(event)}
              />
            </div>
            <div className="space-y-3">
              {loadingSshKeys ? (
                <div className="rounded-2xl border px-4 py-3 text-sm opacity-70">
                  {t('common.loading')}...
                </div>
              ) : sshKeys.length === 0 ? (
                <div className="rounded-2xl border px-4 py-3 text-sm opacity-70">
                  {noSshKeyText}
                </div>
              ) : (
                sshKeys.map((item) => (
                  <div key={item.id} className="rounded-2xl border px-4 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black">{item.key_name}</div>
                        <div className="text-xs opacity-60">{item.key_type}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-500"
                        onClick={() => void handleDeleteSshKey(item.id)}
                        disabled={removingKeyId === item.id}
                      >
                        <Trash2 size={16} className="mr-2" />
                        {t('common.delete')}
                      </Button>
                    </div>
                    <div className="text-xs font-mono opacity-70 break-all">{item.fingerprint}</div>
                    <div className="text-xs opacity-60">
                      {createdAtLabel}: {formatTimestamp(item.created_at)}
                      {item.last_used_at ? ` | ${lastUsedLabel}: ${formatTimestamp(item.last_used_at)}` : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
            <div className="space-y-3">
              <div className="text-sm font-bold uppercase tracking-[0.16em] opacity-60">
                {pastePublicKeyLabel}
              </div>
            <textarea
              value={sshKeyDraft}
              onChange={(event) => setSshKeyDraft(event.target.value)}
              placeholder="ssh-ed25519 AAAA... your-device"
              className="min-h-36 w-full rounded-2xl border bg-background px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSftpModal(false)}>
                {t('common.close')}
              </Button>
              <Button onClick={() => void handleSaveSshKey()} disabled={savingSshKey}>
                {savingSshKey ? t('common.processing') : t('common.save')}
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border bg-muted/20 px-4 py-3 text-sm opacity-80">
            <div className="font-bold">{currentAccessModeLabel}</div>
            <div className="mt-1">
              {hasSshKey
                ? sftpPasswordEnabled
                  ? resolveText(
                      t,
                      'filemanager.settings.sftpPasswordAndKeyMode',
                      'Password login and matched private key login are both available.',
                    )
                  : resolveText(
                      t,
                      'filemanager.settings.sftpOnlyKeyMode',
                      'Only matched private key login is available.',
                    )
                : sftpPasswordEnabled
                  ? resolveText(
                      t,
                      'filemanager.settings.sftpOnlyPasswordMode',
                      'Only password login is available right now.',
                    )
                  : resolveText(
                      t,
                      'filemanager.settings.sftpPasswordDisabledNeedKey',
                      'Password login is disabled. Add a public key to use SFTP.',
                    )}
            </div>
          </div>
        </div>
        </GlassModalShell>
      ) : null}
    </>
  );
};
