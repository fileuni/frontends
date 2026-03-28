export type TomlAdapter = {
  parse: (source: string) => unknown;
  stringify: (value: unknown) => string;
};

export type VfsDriver = 'fs' | 's3' | 'webdav' | 'dropbox' | 'onedrive' | 'gdrive' | 'memory' | 'android_saf' | 'ios_scoped_fs';

export type RemoteConnectorDriver = 's3' | 'webdav' | 'dropbox' | 'onedrive' | 'gdrive';

export type ConnectorOptionField = {
  key: string;
  secret?: boolean;
  fullWidth?: boolean;
};

export type KvPair = {
  key: string;
  value: string;
};

export type ConnectorDraft = {
  id: string;
  name: string;
  driver: VfsDriver;
  root: string;
  enable: boolean;
  options: KvPair[];
};

export type PoolDraft = {
  id: string;
  name: string;
  primary_connector: string;
  backup_connector: string;
  enable_write_cache: boolean;
  enable: boolean;
  options: KvPair[];
};

export type PolicyDraft = {
  id: string;
  role_id: string;
  pool_name: string;
  default_quota: string;
  max_private_mounts: string;
  min_mount_sync_interval_minutes: string;
  max_mount_sync_timeout_secs: string;
};

export type CacheSectionDraft = {
  readEnable: boolean;
  readBackend: 'memory' | 'local_dir';
  readLocalDir: string;
  readCapacityBytes: string;
  readMaxFileSizeBytes: string;
  readTtlSecs: string;
  writeEnable: boolean;
  writeBackend: 'memory' | 'local_dir';
  writeLocalDir: string;
  writeCapacityBytes: string;
  writeMaxFileSizeBytes: string;
  writeFlushConcurrency: string;
  writeFlushIntervalMs: string;
  writeFlushDeadlineSecs: string;
};

export type ArchiveSectionDraft = {
  enable: boolean;
  exe7zipPath: string;
  defaultCompressionFormat: string;
  maxConcurrency: string;
  maxCpuThreads: string;
  timeoutSecs: string;
};

export type ActiveTab = 'pools' | 'connectors' | 'policies';

export type ViewMode = 'main' | 'advanced';

export const storageDriverOptions: VfsDriver[] = ['fs', 's3', 'webdav', 'dropbox', 'onedrive', 'gdrive', 'memory', 'android_saf', 'ios_scoped_fs'];

export const remoteConnectorFields: Record<RemoteConnectorDriver, ConnectorOptionField[]> = {
  s3: [
    { key: 'endpoint' },
    { key: 'region' },
    { key: 'bucket' },
    { key: 'access_key_id' },
    { key: 'secret_access_key', secret: true },
  ],
  webdav: [
    { key: 'endpoint', fullWidth: true },
    { key: 'username' },
    { key: 'password', secret: true },
  ],
  dropbox: [
    { key: 'access_token', secret: true },
    { key: 'refresh_token', secret: true },
    { key: 'client_id' },
    { key: 'client_secret', secret: true },
  ],
  onedrive: [
    { key: 'access_token', secret: true },
    { key: 'refresh_token', secret: true },
    { key: 'client_id' },
    { key: 'client_secret', secret: true },
  ],
  gdrive: [
    { key: 'access_token', secret: true },
    { key: 'refresh_token', secret: true },
    { key: 'client_id' },
    { key: 'client_secret', secret: true },
  ],
};

export const isRemoteConnectorDriver = (driver: VfsDriver): driver is RemoteConnectorDriver => {
  return driver in remoteConnectorFields;
};

export const driverUsesSlashRoot = (driver: VfsDriver): boolean => {
  return isRemoteConnectorDriver(driver);
};

export const getConnectorOptionFields = (driver: VfsDriver): ConnectorOptionField[] => {
  return isRemoteConnectorDriver(driver) ? remoteConnectorFields[driver] : [];
};

export const getConnectorFieldLabelKey = (driver: RemoteConnectorDriver, key: string): string => {
  return `setup.storagePool.${driver}.${key}`;
};

export const getConnectorFieldHintKey = (driver: RemoteConnectorDriver, key: string): string => {
  return driver === 's3'
    ? `setup.storagePool.s3Hints.${key}`
    : `setup.storagePool.${driver}Hints.${key}`;
};

export const getOption = (pairs: KvPair[], key: string): string => {
  const found = pairs.find((pair) => pair.key === key);
  return found ? found.value : '';
};

export const upsertOption = (pairs: KvPair[], key: string, value: string): KvPair[] => {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    return pairs;
  }
  const existingIndex = pairs.findIndex((pair) => pair.key === normalizedKey);
  if (existingIndex < 0) {
    if (value.trim().length === 0) return pairs;
    return [...pairs, { key: normalizedKey, value }].sort((a, b) => a.key.localeCompare(b.key));
  }
  const next = pairs.slice();
  if (value.trim().length === 0) {
    next.splice(existingIndex, 1);
    return next;
  }
  next[existingIndex] = { key: normalizedKey, value };
  return next;
};

export const normalizeOptionsForDriver = (driver: VfsDriver, pairs: KvPair[]): KvPair[] => {
  if (driver !== 's3') {
    return pairs;
  }
  const hasAccessKeyId = pairs.some((pair) => pair.key === 'access_key_id');
  const hasSecretAccessKey = pairs.some((pair) => pair.key === 'secret_access_key');
  const hasLegacyAccessKey = pairs.some((pair) => pair.key === 'access_key');
  const hasLegacySecretKey = pairs.some((pair) => pair.key === 'secret_key');

  let next = pairs;
  if (!hasAccessKeyId && hasLegacyAccessKey) {
    next = next.map((pair) => (pair.key === 'access_key' ? { ...pair, key: 'access_key_id' } : pair));
  }
  if (!hasSecretAccessKey && hasLegacySecretKey) {
    next = next.map((pair) => (pair.key === 'secret_key' ? { ...pair, key: 'secret_access_key' } : pair));
  }

  if (next.some((pair) => pair.key === 'access_key_id')) {
    next = next.filter((pair) => pair.key !== 'access_key');
  }
  if (next.some((pair) => pair.key === 'secret_access_key')) {
    next = next.filter((pair) => pair.key !== 'secret_key');
  }
  return next;
};
