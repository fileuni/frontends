import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Cloud,
  Copy,
  Eye,
  EyeOff,
  HardDrive,
  KeyRound,
  RefreshCw,
  Server,
  Shield,
  Trash2,
  Upload,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Switch } from '@/components/ui/Switch.tsx';
import { client, extractData } from '@/lib/api.ts';
import { copyTextWithToast, showApiErrorToast } from '@/lib/feedback.ts';
import { useConfigStore } from '@/stores/config.ts';
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
  const {
    settings,
    fetchSettings,
    updateSettings,
    isLoading: settingsLoading,
  } = useUserFileSettingsStore();
  const protocolCaps = capabilities as (typeof capabilities & ProtocolCapabilities) | null;
  const browserHost = typeof window === 'undefined' ? 'localhost' : window.location.hostname;
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const modalTitle = resolveText(
    t,
    'filemanager.thumbnail.settingsTitle',
    'File Management Settings',
  );
  const modalDesc = resolveText(
    t,
    'filemanager.thumbnail.settingsDesc',
    'Manage thumbnail behavior and review the available file protocol access methods for this account.',
  );
  const thumbnailSectionTitle = resolveText(
    t,
    'filemanager.settings.thumbnailTitle',
    'Thumbnail Settings',
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
      await addToast('Paste an SSH public key first.', 'error');
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
      await addToast('SSH public key saved.', 'success');
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
      await addToast('SSH public key removed.', 'success');
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
      await addToast('SSH public key loaded from file.', 'success');
    } catch (error) {
      showApiErrorToast(addToast, t, error);
    } finally {
      event.target.value = '';
    }
  };

  const protocolCards = [
    {
      key: 'webdav',
      icon: HardDrive,
      title: 'WebDAV',
      enabled: capabilities?.enable_webdav === true,
      endpoint: webdavUrl,
      accessNote: 'Sign in with your account username and password.',
      extra: protocolCaps?.webdav_path
        ? `Path suffix: ${protocolCaps.webdav_path}`
        : null,
      action: null,
    },
    {
      key: 'ftp',
      icon: Server,
      title: 'FTP',
      enabled: capabilities?.enable_ftp === true,
      endpoint: ftpEndpoint,
      accessNote: 'Sign in with your account username and password.',
      extra: ftpPassiveSummary
        ? `Active mode is available. Passive mode uses ${ftpPassiveSummary}.`
        : 'Active and passive mode are available.',
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
          ? 'Use your password or a matched private key.'
          : 'Password login is disabled. Use a matched private key.'
        : sftpPasswordEnabled
          ? 'No public key is configured yet. Use your password for now.'
          : 'No public key is configured yet. Add a public key before using SFTP.',
      extra: hasSshKey
        ? `${sshKeys.length} public key${sshKeys.length > 1 ? 's' : ''} configured.`
        : 'No public key configured.',
      action: (
        <Button variant="outline" size="sm" onClick={() => setShowSftpModal(true)}>
          <KeyRound size={16} className="mr-2" />
          SSH Key
        </Button>
      ),
    },
    {
      key: 's3',
      icon: Cloud,
      title: 'S3',
      enabled: capabilities?.enable_s3 === true,
      endpoint: s3Endpoint,
      accessNote: 'Use your access key ID and secret key to sign in.',
      extra: s3Keys.access_key ? `Access key: ${s3Keys.access_key}` : 'No access key generated yet.',
      action: (
        <Button variant="outline" size="sm" onClick={() => setShowS3Modal(true)}>
          <KeyRound size={16} className="mr-2" />
          Access Key
        </Button>
      ),
    },
  ];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={modalTitle}
        maxWidth="max-w-5xl"
      >
        <div className="space-y-6">
          <p className="text-sm opacity-70">{modalDesc}</p>

          <section className="space-y-3">
            <div>
              <h4 className="text-base font-black tracking-tight">{thumbnailSectionTitle}</h4>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {visibleToggleItems.map((item) => {
                const rawValue = settings?.[item.key];
                const disabledValue = typeof rawValue === 'boolean' ? rawValue : false;
                const checked = !disabledValue;
                return (
                  <div
                    key={item.key as string}
                    className="flex items-center justify-between gap-4 rounded-2xl border px-4 py-3"
                  >
                    <div className="text-sm font-bold">{item.label}</div>
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
                <div className="rounded-2xl border px-4 py-3 text-sm opacity-70">
                  {resolveText(
                    t,
                    'filemanager.thumbnail.noTypes',
                    'No thumbnail types are available for this server.',
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <div className="space-y-1">
              <h4 className="text-base font-black tracking-tight">{protocolSectionTitle}</h4>
              <p className="text-sm opacity-70">{protocolSectionDesc}</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {protocolCards.map(({ key, icon: Icon, title, enabled, endpoint, accessNote, extra, action }) => (
                <div
                  key={key}
                  className={cn(
                    'rounded-2xl border p-4 space-y-4',
                    enabled ? 'border-primary/20 bg-primary/5' : 'bg-muted/20',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-background border flex items-center justify-center">
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="text-base font-black">{title}</div>
                        <div className="text-xs font-bold uppercase tracking-[0.16em] opacity-60">
                          {enabled ? t('common.enabled') : t('common.disabled')}
                        </div>
                      </div>
                    </div>
                    {enabled ? action : null}
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="opacity-50 font-bold uppercase tracking-[0.16em]">Endpoint</div>
                      <div className="font-mono break-all mt-1">{endpoint || '-'}</div>
                    </div>
                    <div>
                      <div className="opacity-50 font-bold uppercase tracking-[0.16em]">Access</div>
                      <div className="mt-1">{enabled ? accessNote : 'This protocol is currently disabled.'}</div>
                    </div>
                    {extra ? (
                      <div>
                        <div className="opacity-50 font-bold uppercase tracking-[0.16em]">Details</div>
                        <div className="mt-1 break-all">{extra}</div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </Modal>

      <Modal
        isOpen={showS3Modal}
        onClose={() => setShowS3Modal(false)}
        title={resolveText(t, 'security.s3Title', 'S3 Access Keys')}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5">
          <p className="text-sm opacity-70">
            {resolveText(
              t,
              'security.s3Desc',
              'Use this access key ID and secret key with the S3 endpoint shown in the main settings panel.',
            )}
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-bold uppercase tracking-[0.16em] opacity-60">
                {resolveText(t, 'security.accessKey', 'Access Key')}
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
                      successMessage: 'Access key copied.',
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
                      successMessage: 'Secret key copied.',
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
      </Modal>

      <Modal
        isOpen={showSftpModal}
        onClose={() => setShowSftpModal(false)}
        title="SFTP SSH Keys"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-5">
          <p className="text-sm opacity-70">
            Upload or paste an SSH public key so this account can sign in to SFTP with the matched private key.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-bold uppercase tracking-[0.16em] opacity-60">
                Configured Keys
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
                  No SSH public key is configured yet.
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
                      Created: {formatTimestamp(item.created_at)}
                      {item.last_used_at ? ` | Last used: ${formatTimestamp(item.last_used_at)}` : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-sm font-bold uppercase tracking-[0.16em] opacity-60">
              Paste Public Key
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
            <div className="font-bold">Current access mode</div>
            <div className="mt-1">
              {hasSshKey
                ? sftpPasswordEnabled
                  ? 'Password login and matched private key login are both available.'
                  : 'Only matched private key login is available.'
                : sftpPasswordEnabled
                  ? 'Only password login is available right now.'
                  : 'Password login is disabled. Add a public key to use SFTP.'}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
