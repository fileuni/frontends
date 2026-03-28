// VFS Storage Configuration Modal
// Visual editor for vfs_storage_hub.{connectors,pools,policies,default_pool}

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, HardDrive, Layers, Plus, Settings2, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import { deepClone, ensureRecord, isRecord, type ConfigObject } from '@/lib/configObject';
import { useEscapeToCloseTopLayer } from '@/hooks/useEscapeToCloseTopLayer';
import { PasswordInput } from '@/components/common/PasswordInput';
import { Button } from '@/components/ui/Button';

type TomlAdapter = {
  parse: (source: string) => unknown;
  stringify: (value: unknown) => string;
};

type VfsDriver = 'fs' | 's3' | 'webdav' | 'dropbox' | 'onedrive' | 'gdrive' | 'memory' | 'android_saf' | 'ios_scoped_fs';

type RemoteConnectorDriver = 's3' | 'webdav' | 'dropbox' | 'onedrive' | 'gdrive';

type ConnectorOptionField = {
  key: string;
  secret?: boolean;
  fullWidth?: boolean;
};

type KvPair = {
  key: string;
  value: string;
};

type ConnectorDraft = {
  id: string;
  name: string;
  driver: VfsDriver;
  root: string;
  enable: boolean;
  options: KvPair[];
};

type PoolDraft = {
  id: string;
  name: string;
  primary_connector: string;
  backup_connector: string;
  enable_write_cache: boolean;
  enable: boolean;
  options: KvPair[];
};

type PolicyDraft = {
  id: string;
  role_id: string;
  pool_name: string;
  default_quota: string;
  max_private_mounts: string;
  min_mount_sync_interval_minutes: string;
  max_mount_sync_timeout_secs: string;
};

type CacheSectionDraft = {
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

type ArchiveSectionDraft = {
  enable: boolean;
  exe7zipPath: string;
  defaultCompressionFormat: string;
  maxConcurrency: string;
  maxCpuThreads: string;
  timeoutSecs: string;
};

type ActiveTab = 'pools' | 'connectors' | 'policies';

type ViewMode = 'main' | 'advanced';

export interface VfsStorageConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  tomlAdapter: TomlAdapter;
  content: string;
  onContentChange: (value: string) => void;
  mode?: 'modal' | 'panel';
  onPickDirectory?: () => Promise<{
    driver: string;
    root: string;
    display?: string | null;
  } | null>;
}

const makeId = (() => {
  let seed = 0;
  return (prefix: string): string => {
    seed += 1;
    return `${prefix}-${Date.now()}-${seed}`;
  };
})();

const kvFromOptions = (raw: unknown): KvPair[] => {
  if (!isRecord(raw)) {
    return [];
  }
  return Object.entries(raw)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ key, value }));
};

const kvToOptions = (pairs: KvPair[]): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const pair of pairs) {
    const k = pair.key.trim();
    if (!k) continue;
    out[k] = pair.value;
  }
  return out;
};

const normalizeOptionsForDriver = (driver: VfsDriver, pairs: KvPair[]): KvPair[] => {
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

  // Drop legacy keys when normalized counterparts exist.
  const normalizedHasAccessKeyId = next.some((pair) => pair.key === 'access_key_id');
  const normalizedHasSecretAccessKey = next.some((pair) => pair.key === 'secret_access_key');
  if (normalizedHasAccessKeyId) {
    next = next.filter((pair) => pair.key !== 'access_key');
  }
  if (normalizedHasSecretAccessKey) {
    next = next.filter((pair) => pair.key !== 'secret_key');
  }
  return next;
};

const remoteConnectorFields: Record<RemoteConnectorDriver, ConnectorOptionField[]> = {
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

const isRemoteConnectorDriver = (driver: VfsDriver): driver is RemoteConnectorDriver => {
  return driver in remoteConnectorFields;
};

const driverUsesSlashRoot = (driver: VfsDriver): boolean => {
  return isRemoteConnectorDriver(driver);
};

const getConnectorOptionFields = (driver: VfsDriver): ConnectorOptionField[] => {
  return isRemoteConnectorDriver(driver) ? remoteConnectorFields[driver] : [];
};

const getConnectorFieldLabelKey = (driver: RemoteConnectorDriver, key: string): string => {
  return `setup.storagePool.${driver}.${key}`;
};

const getConnectorFieldHintKey = (driver: RemoteConnectorDriver, key: string): string => {
  return driver === 's3'
    ? `setup.storagePool.s3Hints.${key}`
    : `setup.storagePool.${driver}Hints.${key}`;
};

const getOption = (pairs: KvPair[], key: string): string => {
  const found = pairs.find((pair) => pair.key === key);
  return found ? found.value : '';
};

const upsertOption = (pairs: KvPair[], key: string, value: string): KvPair[] => {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    return pairs;
  }
  const nextValue = value;
  const existingIndex = pairs.findIndex((pair) => pair.key === normalizedKey);
  if (existingIndex < 0) {
    if (nextValue.trim().length === 0) return pairs;
    return [...pairs, { key: normalizedKey, value: nextValue }].sort((a, b) => a.key.localeCompare(b.key));
  }
  const next = pairs.slice();
  if (nextValue.trim().length === 0) {
    next.splice(existingIndex, 1);
    return next;
  }
  next[existingIndex] = { key: normalizedKey, value: nextValue };
  return next;
};

const buildLocalDefaults = (): {
  connectors: ConnectorDraft[];
  pools: PoolDraft[];
  defaultPool: string;
  policies: PolicyDraft[];
} => {
  const connectorName = 'local-fs';
  const poolName = 'default-pool';
  return {
    connectors: [
      {
        id: makeId('connector'),
        name: connectorName,
        driver: 'fs',
        root: '{APPDATADIR}/vfs',
        enable: true,
        options: [],
      },
    ],
    pools: [
      {
        id: makeId('pool'),
        name: poolName,
        primary_connector: connectorName,
        backup_connector: connectorName,
        enable_write_cache: false,
        enable: true,
        options: [],
      },
    ],
    defaultPool: poolName,
    policies: [],
  };
};

const parseVfsDraftFromContent = (
  content: string,
  tomlAdapter: TomlAdapter,
): {
  connectors: ConnectorDraft[];
  pools: PoolDraft[];
  defaultPool: string;
  policies: PolicyDraft[];
  error: string | null;
} => {
  try {
    const parsed = tomlAdapter.parse(content);
    if (!isRecord(parsed)) {
      return { ...buildLocalDefaults(), error: 'TOML root must be an object' };
    }

    const root = parsed;
    const vfsHub = isRecord(root.vfs_storage_hub) ? root.vfs_storage_hub : {};

    const connectorsRaw = vfsHub.connectors;
    const poolsRaw = vfsHub.pools;
    const policiesRaw = vfsHub.policies;
    const defaultPoolRaw = vfsHub.default_pool;

    const defaults = buildLocalDefaults();

    const connectors: ConnectorDraft[] = Array.isArray(connectorsRaw)
      ? connectorsRaw
        .filter(isRecord)
        .map((conn) => {
          const driver: VfsDriver = (typeof conn.driver === 'string' ? conn.driver : 'fs') as VfsDriver;
          const rawRoot = typeof conn.root === 'string' ? conn.root : '';
          const root = driverUsesSlashRoot(driver) && rawRoot.trim().length === 0
            ? '/'
            : rawRoot;
          return {
            id: makeId('connector'),
            name: typeof conn.name === 'string' ? conn.name : '',
            driver,
            root,
            enable: typeof conn.enable === 'boolean' ? conn.enable : true,
            options: normalizeOptionsForDriver(driver, kvFromOptions(conn.options)),
          };
        })
      : [];

    const pools: PoolDraft[] = Array.isArray(poolsRaw)
      ? poolsRaw
        .filter(isRecord)
        .map((pool) => ({
          id: makeId('pool'),
          name: typeof pool.name === 'string' ? pool.name : '',
          primary_connector: typeof pool.primary_connector === 'string' ? pool.primary_connector : '',
          backup_connector: typeof pool.backup_connector === 'string' ? pool.backup_connector : '',
          enable_write_cache: typeof pool.enable_write_cache === 'boolean' ? pool.enable_write_cache : false,
          enable: typeof pool.enable === 'boolean' ? pool.enable : true,
          options: kvFromOptions(pool.options),
        }))
      : [];

    const policies: PolicyDraft[] = Array.isArray(policiesRaw)
      ? policiesRaw
        .filter(isRecord)
        .map((policy) => ({
          id: makeId('policy'),
          role_id: typeof policy.role_id === 'string' ? policy.role_id : '',
          pool_name: typeof policy.pool_name === 'string' ? policy.pool_name : '',
          default_quota: typeof policy.default_quota === 'number' ? String(policy.default_quota) : '',
          max_private_mounts: typeof policy.max_private_mounts === 'number' ? String(policy.max_private_mounts) : '',
          min_mount_sync_interval_minutes: typeof policy.min_mount_sync_interval_minutes === 'number' ? String(policy.min_mount_sync_interval_minutes) : '',
          max_mount_sync_timeout_secs: typeof policy.max_mount_sync_timeout_secs === 'number' ? String(policy.max_mount_sync_timeout_secs) : '',
        }))
      : [];

    const effectiveConnectors = connectors.length > 0 ? connectors : defaults.connectors;
    const effectivePools = pools.length > 0 ? pools : defaults.pools;
    const poolNames = new Set(effectivePools.map((p) => p.name).filter((v) => v.trim().length > 0));
    const resolvedDefaultPool = typeof defaultPoolRaw === 'string' && defaultPoolRaw.trim().length > 0
      ? defaultPoolRaw
      : defaults.defaultPool;
    const effectiveDefaultPool = poolNames.has(resolvedDefaultPool)
      ? resolvedDefaultPool
      : (effectivePools[0]?.name || defaults.defaultPool);

    // Ensure policies exists as array on apply (validation requires it).
    return {
      connectors: effectiveConnectors,
      pools: effectivePools,
      defaultPool: effectiveDefaultPool,
      policies,
      error: null,
    };
  } catch (error) {
    return { ...buildLocalDefaults(), error: error instanceof Error ? error.message : String(error) };
  }
};

const validateDraft = (
  t: (key: string, params?: Record<string, unknown>) => string,
  connectors: ConnectorDraft[],
  pools: PoolDraft[],
  defaultPool: string,
  policies: PolicyDraft[],
): string[] => {
  const errors: string[] = [];

  if (connectors.length === 0) {
    errors.push(t('admin.config.storage.validation.errors.atLeastOneConnector'));
  }

  const connectorNames = connectors.map((c) => c.name.trim()).filter((v) => v.length > 0);
  const connectorNameSet = new Set(connectorNames);
  if (connectorNames.length !== connectorNameSet.size) {
    errors.push(t('admin.config.storage.validation.errors.connectorNamesUnique'));
  }

  connectors.forEach((c, index) => {
    if (!c.name.trim()) errors.push(t('admin.config.storage.validation.errors.connectorNameRequired', { index }));
    if (!c.driver.trim()) errors.push(t('admin.config.storage.validation.errors.connectorDriverRequired', { index }));
    if (!c.root.trim()) errors.push(t('admin.config.storage.validation.errors.connectorRootRequired', { index }));
  });

  if (pools.length === 0) {
    errors.push(t('admin.config.storage.validation.errors.atLeastOnePool'));
  }

  const poolNames = pools.map((p) => p.name.trim()).filter((v) => v.length > 0);
  const poolNameSet = new Set(poolNames);
  if (poolNames.length !== poolNameSet.size) {
    errors.push(t('admin.config.storage.validation.errors.poolNamesUnique'));
  }

  pools.forEach((p, index) => {
    if (!p.name.trim()) errors.push(t('admin.config.storage.validation.errors.poolNameRequired', { index }));
    if (!p.primary_connector.trim()) errors.push(t('admin.config.storage.validation.errors.poolPrimaryRequired', { index }));
    if (p.primary_connector.trim() && !connectorNameSet.has(p.primary_connector.trim())) {
      errors.push(t('admin.config.storage.validation.errors.poolPrimaryUnknown', { index, name: p.primary_connector }));
    }
    if (p.backup_connector.trim() && !connectorNameSet.has(p.backup_connector.trim())) {
      errors.push(t('admin.config.storage.validation.errors.poolBackupUnknown', { index, name: p.backup_connector }));
    }
  });

  if (!defaultPool.trim()) {
    errors.push(t('admin.config.storage.validation.errors.defaultPoolRequired'));
  } else if (!poolNameSet.has(defaultPool.trim())) {
    errors.push(t('admin.config.storage.validation.errors.defaultPoolNotFound', { name: defaultPool }));
  }

  policies.forEach((policy, index) => {
    if (!policy.role_id.trim()) errors.push(t('admin.config.storage.validation.errors.policyRoleRequired', { index }));
    if (!policy.pool_name.trim()) errors.push(t('admin.config.storage.validation.errors.policyPoolRequired', { index }));
    if (policy.pool_name.trim() && !poolNameSet.has(policy.pool_name.trim())) {
      errors.push(t('admin.config.storage.validation.errors.policyPoolUnknown', { index, name: policy.pool_name }));
    }
    const quota = Number.parseInt(policy.default_quota.trim(), 10);
    if (!Number.isFinite(quota) || quota < 0) {
      errors.push(t('admin.config.storage.validation.errors.policyQuotaInvalid', { index }));
    }
    const maxPrivateMounts = Number.parseInt(policy.max_private_mounts.trim(), 10);
    if (!Number.isFinite(maxPrivateMounts) || maxPrivateMounts < 0) {
      errors.push(t('admin.config.storage.validation.errors.policyMaxPrivateMountsInvalid', { index }));
    }
    const minSyncInterval = Number.parseInt(policy.min_mount_sync_interval_minutes.trim(), 10);
    if (!Number.isFinite(minSyncInterval) || minSyncInterval <= 0) {
      errors.push(t('admin.config.storage.validation.errors.policyMinMountSyncIntervalInvalid', { index }));
    }
    const maxSyncTimeout = Number.parseInt(policy.max_mount_sync_timeout_secs.trim(), 10);
    if (!Number.isFinite(maxSyncTimeout) || maxSyncTimeout <= 0) {
      errors.push(t('admin.config.storage.validation.errors.policyMaxMountSyncTimeoutInvalid', { index }));
    }
  });

  return errors;
};

export const VfsStorageConfigModal: React.FC<VfsStorageConfigModalProps> = ({
  isOpen,
  onClose,
  tomlAdapter,
  content,
  onContentChange,
  mode = 'modal',
  onPickDirectory,
}) => {
  const { t } = useTranslation();
  const resolvedTheme = useResolvedTheme();

  const [pickingConnectorId, setPickingConnectorId] = useState<string | null>(null);
  const isDark = resolvedTheme === 'dark';

  const isVfsDriver = (value: string): value is VfsDriver => {
    return (
      value === 'fs'
      || value === 's3'
      || value === 'webdav'
      || value === 'dropbox'
      || value === 'onedrive'
      || value === 'gdrive'
      || value === 'memory'
      || value === 'android_saf'
      || value === 'ios_scoped_fs'
    );
  };

  const canPickRootForDriver = (driver: VfsDriver): boolean => {
    if (!onPickDirectory) {
      return false;
    }
    // The mobile storage picker returns android_saf / ios_scoped_fs.
    // Allow starting from fs for a smoother "pick -> switch driver" workflow.
    return driver === 'fs' || driver === 'android_saf' || driver === 'ios_scoped_fs';
  };

  const pickConnectorRoot = async (connectorId: string) => {
    if (!onPickDirectory) {
      return;
    }
    setPickingConnectorId(connectorId);
    try {
      const picked = await onPickDirectory();
      if (!picked) {
        return;
      }
      const nextDriver = isVfsDriver(picked.driver) ? picked.driver : null;
      updateConnector(connectorId, (prev) => {
        const driver: VfsDriver = nextDriver ?? prev.driver;
        return {
          ...prev,
          driver,
          root: picked.root,
          options: normalizeOptionsForDriver(driver, prev.options),
        };
      });
    } finally {
      setPickingConnectorId(null);
    }
  };

  const [tab, setTab] = useState<ActiveTab>('pools');
  const [view, setView] = useState<ViewMode>('main');
  const [connectors, setConnectors] = useState<ConnectorDraft[]>([]);
  const [pools, setPools] = useState<PoolDraft[]>([]);
  const [defaultPool, setDefaultPool] = useState('');
  const [policies, setPolicies] = useState<PolicyDraft[]>([]);
  const [cacheSection, setCacheSection] = useState<CacheSectionDraft>({
    readEnable: false,
    readBackend: 'memory',
    readLocalDir: '{APPDATADIR}/cache/vfs-read',
    readCapacityBytes: '134217728',
    readMaxFileSizeBytes: '2097152',
    readTtlSecs: '1800',
    writeEnable: false,
    writeBackend: 'local_dir',
    writeLocalDir: '{APPDATADIR}/cache/vfs-write',
    writeCapacityBytes: '100663296',
    writeMaxFileSizeBytes: '262144',
    writeFlushConcurrency: '2',
    writeFlushIntervalMs: '30',
    writeFlushDeadlineSecs: '360',
  });
  const [archiveSection, setArchiveSection] = useState<ArchiveSectionDraft>({
    enable: false,
    exe7zipPath: '7z',
    defaultCompressionFormat: 'zip',
    maxConcurrency: '2',
    maxCpuThreads: '2',
    timeoutSecs: '300',
  });
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEscapeToCloseTopLayer({
    active: isOpen,
    enabled: true,
    onEscape: onClose,
  });

  useEffect(() => {
    if (!isOpen) return;
    setValidationErrors([]);
    const parsed = parseVfsDraftFromContent(content, tomlAdapter);
    setConnectors(parsed.connectors);
    setPools(parsed.pools);
    setDefaultPool(parsed.defaultPool);
    setPolicies(parsed.policies);
    try {
      const root = tomlAdapter.parse(content);
      if (isRecord(root)) {
        const hub = isRecord(root.vfs_storage_hub) ? root.vfs_storage_hub : {};
        const readCache = isRecord(hub.read_cache) ? hub.read_cache : {};
        const writeCache = isRecord(hub.write_cache) ? hub.write_cache : {};
        const fileCompress = isRecord(hub.file_compress) ? hub.file_compress : {};
        setCacheSection({
          readEnable: typeof readCache.enable === 'boolean' ? readCache.enable : false,
          readBackend: readCache.backend === 'local_dir' ? 'local_dir' : 'memory',
          readLocalDir: typeof readCache.local_dir === 'string' ? readCache.local_dir : '{APPDATADIR}/cache/vfs-read',
          readCapacityBytes: String(readCache.capacity_bytes ?? 134217728),
          readMaxFileSizeBytes: String(readCache.max_file_size_bytes ?? 2097152),
          readTtlSecs: String(readCache.ttl_secs ?? 1800),
          writeEnable: typeof writeCache.enable === 'boolean' ? writeCache.enable : false,
          writeBackend: writeCache.backend === 'memory' ? 'memory' : 'local_dir',
          writeLocalDir: typeof writeCache.local_dir === 'string' ? writeCache.local_dir : '{APPDATADIR}/cache/vfs-write',
          writeCapacityBytes: String(writeCache.capacity_bytes ?? 100663296),
          writeMaxFileSizeBytes: String(writeCache.max_file_size_bytes ?? 262144),
          writeFlushConcurrency: String(writeCache.flush_concurrency ?? 2),
          writeFlushIntervalMs: String(writeCache.flush_interval_ms ?? 30),
          writeFlushDeadlineSecs: String(writeCache.flush_deadline_secs ?? 360),
        });
        setArchiveSection({
          enable: typeof fileCompress.enable === 'boolean' ? fileCompress.enable : false,
          exe7zipPath: typeof fileCompress.exe_7zip_path === 'string' ? fileCompress.exe_7zip_path : '7z',
          defaultCompressionFormat: typeof fileCompress.default_compression_format === 'string' ? fileCompress.default_compression_format : 'zip',
          maxConcurrency: String(fileCompress.process_manager_max_concurrency ?? 2),
          maxCpuThreads: String(fileCompress.max_cpu_threads ?? 2),
          timeoutSecs: String(fileCompress.timeout_secs ?? 300),
        });
      }
    } catch {
      // ignore
    }
    setError(parsed.error);
    setView('main');
    setTab('pools');
  }, [content, isOpen, tomlAdapter]);

  const connectorNames = useMemo(() => {
    return connectors
      .map((c) => c.name.trim())
      .filter((v) => v.length > 0);
  }, [connectors]);

  const poolNames = useMemo(() => {
    return pools
      .map((p) => p.name.trim())
      .filter((v) => v.length > 0);
  }, [pools]);

  const mainPool = useMemo(() => {
    const wanted = defaultPool.trim();
    if (wanted.length > 0) {
      const found = pools.find((p) => p.name.trim() === wanted);
      if (found) return found;
    }
    return pools[0] ?? null;
  }, [defaultPool, pools]);

  const mainConnector = useMemo(() => {
    if (!mainPool) return null;
    const wanted = mainPool.primary_connector.trim();
    if (wanted.length === 0) return null;
    return connectors.find((c) => c.name.trim() === wanted) ?? null;
  }, [connectors, mainPool]);

  const driverLabel = (driver: VfsDriver): string => {
    return t(`admin.config.storage.drivers.${driver}`);
  };

  const renderConnectorOptionFields = (
    connector: ConnectorDraft,
    update: (updater: (prev: ConnectorDraft) => ConnectorDraft) => void,
  ) => {
    if (!isRemoteConnectorDriver(connector.driver)) {
      return null;
    }

    const driver = connector.driver;
    const fields = getConnectorOptionFields(driver);
    const inputClassName = cn(
      'h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold',
      isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
    );

    return (
      <div className={cn(
        'mt-3 rounded-xl border p-3',
        isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50',
      )}>
        <div className={cn('text-xs font-black uppercase tracking-widest opacity-60 mb-2', isDark ? 'text-slate-300' : 'text-slate-600')}>
          {t('admin.config.storage.connectors.commonOptions')}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fields.map((field) => {
            const label = t(getConnectorFieldLabelKey(driver, field.key));
            const hint = t(getConnectorFieldHintKey(driver, field.key));
            const inputId = `${connector.id}-${field.key}`;

            return (
              <div
                key={`${connector.id}-${field.key}`}
                className={cn(
                  'text-sm',
                  field.fullWidth && 'md:col-span-2',
                  isDark ? 'text-slate-300' : 'text-slate-700',
                )}
              >
                <label htmlFor={inputId} className="font-black">
                  {label}
                </label>
                {field.secret ? (
                  <PasswordInput
                    id={inputId}
                    wrapperClassName="mt-1"
                    inputClassName={inputClassName}
                    value={getOption(connector.options, field.key)}
                    onChange={(event) => update((prev) => ({
                      ...prev,
                      options: upsertOption(prev.options, field.key, event.target.value),
                    }))}
                  />
                ) : (
                  <input
                    id={inputId}
                    className={cn('mt-1', inputClassName)}
                    value={getOption(connector.options, field.key)}
                    onChange={(event) => update((prev) => ({
                      ...prev,
                      options: upsertOption(prev.options, field.key, event.target.value),
                    }))}
                  />
                )}
                <div className={cn('mt-1 text-xs font-bold opacity-60', isDark ? 'text-slate-400' : 'text-slate-500')}>
                  {hint}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const applyToConfig = () => {
    setValidationErrors([]);
    if (error) {
      setValidationErrors([
        t('admin.config.storage.validation.errors.parseFailed', { message: error }),
      ]);
      return;
    }
    const errs = validateDraft(t, connectors, pools, defaultPool, policies);
    if (errs.length > 0) {
      setValidationErrors(errs);
      return;
    }

    const parsed = tomlAdapter.parse(content);
    if (!isRecord(parsed)) {
      setValidationErrors([t('admin.config.storage.validation.errors.parseRoot')]);
      return;
    }
    const nextConfig = deepClone(parsed);
    const vfsHub = ensureRecord(nextConfig, 'vfs_storage_hub');

    vfsHub.connectors = connectors.map((c) => ({
      name: c.name.trim(),
      driver: c.driver,
      root: c.root.trim(),
      enable: c.enable,
      options: kvToOptions(c.options),
    }));

    vfsHub.pools = pools.map((p) => {
      const base: ConfigObject = {
        name: p.name.trim(),
        primary_connector: p.primary_connector.trim(),
        enable_write_cache: p.enable_write_cache,
        enable: p.enable,
        options: kvToOptions(p.options),
      };
      if (p.backup_connector.trim().length > 0) {
        base.backup_connector = p.backup_connector.trim();
      }
      return base;
    });

    vfsHub.default_pool = defaultPool.trim();
    vfsHub.policies = policies.map((policy) => ({
      role_id: policy.role_id.trim(),
      pool_name: policy.pool_name.trim(),
      default_quota: Number.parseInt(policy.default_quota.trim(), 10),
      max_private_mounts: Number.parseInt(policy.max_private_mounts.trim(), 10),
      min_mount_sync_interval_minutes: Number.parseInt(policy.min_mount_sync_interval_minutes.trim(), 10),
      max_mount_sync_timeout_secs: Number.parseInt(policy.max_mount_sync_timeout_secs.trim(), 10),
    }));

    const readCache = ensureRecord(vfsHub, 'read_cache');
    readCache.enable = cacheSection.readEnable;
    readCache.backend = cacheSection.readBackend;
    readCache.local_dir = cacheSection.readLocalDir;
    readCache.capacity_bytes = Number.parseInt(cacheSection.readCapacityBytes, 10) || 134217728;
    readCache.max_file_size_bytes = Number.parseInt(cacheSection.readMaxFileSizeBytes, 10) || 2097152;
    readCache.ttl_secs = Number.parseInt(cacheSection.readTtlSecs, 10) || 1800;

    const writeCache = ensureRecord(vfsHub, 'write_cache');
    writeCache.enable = cacheSection.writeEnable;
    writeCache.backend = cacheSection.writeBackend;
    writeCache.local_dir = cacheSection.writeLocalDir;
    writeCache.capacity_bytes = Number.parseInt(cacheSection.writeCapacityBytes, 10) || 100663296;
    writeCache.max_file_size_bytes = Number.parseInt(cacheSection.writeMaxFileSizeBytes, 10) || 262144;
    writeCache.flush_concurrency = Number.parseInt(cacheSection.writeFlushConcurrency, 10) || 2;
    writeCache.flush_interval_ms = Number.parseInt(cacheSection.writeFlushIntervalMs, 10) || 30;
    writeCache.flush_deadline_secs = Number.parseInt(cacheSection.writeFlushDeadlineSecs, 10) || 360;

    const fileCompress = ensureRecord(vfsHub, 'file_compress');
    fileCompress.enable = archiveSection.enable;
    fileCompress.exe_7zip_path = archiveSection.exe7zipPath;
    fileCompress.default_compression_format = archiveSection.defaultCompressionFormat;
    fileCompress.process_manager_max_concurrency = Number.parseInt(archiveSection.maxConcurrency, 10) || 2;
    fileCompress.max_cpu_threads = Number.parseInt(archiveSection.maxCpuThreads, 10) || 2;
    fileCompress.timeout_secs = Number.parseInt(archiveSection.timeoutSecs, 10) || 300;

    const nextContent = tomlAdapter.stringify(nextConfig);
    onContentChange(nextContent);
    onClose();
  };

  const resetToLocalDefaults = () => {
    const defaults = buildLocalDefaults();
    setConnectors(defaults.connectors);
    setPools(defaults.pools);
    setDefaultPool(defaults.defaultPool);
    setPolicies(defaults.policies);
    setValidationErrors([]);
    setError(null);
    setTab('pools');
  };

  const updateConnector = (id: string, updater: (prev: ConnectorDraft) => ConnectorDraft) => {
    setConnectors((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  };

  const renameConnector = (id: string, nextName: string) => {
    setConnectors((prev) => {
      const current = prev.find((c) => c.id === id);
      const oldName = current?.name ?? '';
      const next = prev.map((c) => (c.id === id ? { ...c, name: nextName } : c));
      if (!oldName.trim() || oldName === nextName) {
        return next;
      }
      setPools((poolsPrev) => poolsPrev.map((p) => ({
        ...p,
        primary_connector: p.primary_connector === oldName ? nextName : p.primary_connector,
        backup_connector: p.backup_connector === oldName ? nextName : p.backup_connector,
      })));
      return next;
    });
  };

  const removeConnector = (id: string) => {
    setConnectors((prev) => {
      const removing = prev.find((c) => c.id === id);
      const next = prev.filter((c) => c.id !== id);
      const removedName = removing?.name ?? '';
      const fallbackName = next[0]?.name ?? '';
      if (removedName.trim().length > 0) {
        setPools((poolsPrev) => poolsPrev.map((p) => ({
          ...p,
          primary_connector: p.primary_connector === removedName ? fallbackName : p.primary_connector,
          backup_connector: p.backup_connector === removedName ? '' : p.backup_connector,
        })));
      }
      return next;
    });
  };

  const addConnector = () => {
    const baseName = 'connector';
    const existing = new Set(connectorNames);
    let index = 1;
    let name = `${baseName}-${index}`;
    while (existing.has(name)) {
      index += 1;
      name = `${baseName}-${index}`;
    }
    setConnectors((prev) => ([
      ...prev,
      {
        id: makeId('connector'),
        name,
        driver: 'fs',
        root: '{APPDATADIR}/vfs',
        enable: true,
        options: [],
      },
    ]));
  };

  const updatePool = (id: string, updater: (prev: PoolDraft) => PoolDraft) => {
    setPools((prev) => prev.map((p) => (p.id === id ? updater(p) : p)));
  };

  const renamePool = (id: string, nextName: string) => {
    setPools((prev) => {
      const current = prev.find((p) => p.id === id);
      const oldName = current?.name ?? '';
      const next = prev.map((p) => (p.id === id ? { ...p, name: nextName } : p));
      if (!oldName.trim() || oldName === nextName) {
        return next;
      }
      setDefaultPool((prevDefault) => (prevDefault === oldName ? nextName : prevDefault));
      setPolicies((prevPolicies) => prevPolicies.map((policy) => ({
        ...policy,
        pool_name: policy.pool_name === oldName ? nextName : policy.pool_name,
      })));
      return next;
    });
  };

  const removePool = (id: string) => {
    setPools((prev) => {
      const removing = prev.find((p) => p.id === id);
      const next = prev.filter((p) => p.id !== id);
      const removedName = removing?.name ?? '';
      const fallbackName = next[0]?.name ?? '';
      if (removedName.trim().length > 0) {
        setDefaultPool((prevDefault) => (prevDefault === removedName ? fallbackName : prevDefault));
        setPolicies((prevPolicies) => prevPolicies.map((policy) => ({
          ...policy,
          pool_name: policy.pool_name === removedName ? fallbackName : policy.pool_name,
        })));
      }
      return next;
    });
  };

  const addPool = () => {
    const baseName = 'pool';
    const existing = new Set(poolNames);
    let index = 1;
    let name = `${baseName}-${index}`;
    while (existing.has(name)) {
      index += 1;
      name = `${baseName}-${index}`;
    }
    const defaultConnector = connectorNames[0] ?? 'local-fs';
    setPools((prev) => ([
      ...prev,
      {
        id: makeId('pool'),
        name,
        primary_connector: defaultConnector,
        backup_connector: '',
        enable_write_cache: false,
        enable: true,
        options: [],
      },
    ]));
    if (!defaultPool.trim()) {
      setDefaultPool(name);
    }
  };

  const addPolicy = () => {
    const fallbackPool = defaultPool.trim() || poolNames[0] || 'default-pool';
    setPolicies((prev) => ([
      ...prev,
        {
          id: makeId('policy'),
          role_id: '0',
          pool_name: fallbackPool,
          default_quota: '0',
          max_private_mounts: '0',
          min_mount_sync_interval_minutes: '5',
          max_mount_sync_timeout_secs: '900',
        },
      ]));
  };

  const removePolicy = (id: string) => {
    setPolicies((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePolicy = (id: string, updater: (prev: PolicyDraft) => PolicyDraft) => {
    setPolicies((prev) => prev.map((p) => (p.id === id ? updater(p) : p)));
  };

  if (mode === 'modal' && !isOpen) return null;

  const contentView = (
    <>
      <div className={cn(
        'rounded-xl border p-3 sm:p-4',
        isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white',
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className={cn('text-xs font-black uppercase tracking-widest opacity-60', isDark ? 'text-slate-200' : 'text-slate-600')}>
            {t('admin.config.storage.fields.defaultPool')}
          </div>
          <select
            className={cn(
              'h-10 rounded-lg border px-3 text-sm font-mono font-bold w-full sm:w-auto',
              isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
            )}
            value={defaultPool}
            onChange={(e) => setDefaultPool(e.target.value)}
          >
            {pools.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name || '(unnamed)'}
              </option>
            ))}
          </select>
          <div className={cn('text-xs font-bold opacity-60 sm:ml-auto', isDark ? 'text-slate-400' : 'text-slate-500')}>
            vfs_storage_hub
          </div>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className={cn(
          'rounded-xl border p-3 sm:p-4',
          isDark ? 'border-rose-500/30 bg-rose-500/10 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-900',
        )}>
          <div className="text-xs font-black uppercase tracking-widest mb-2">
            {t('admin.config.storage.validation.title')}
          </div>
          <div className="space-y-1 text-sm font-mono font-bold">
            {validationErrors.map((msg) => (
              <div key={`${msg}-${validationErrors.length}`}>- {msg}</div>
            ))}
          </div>
        </div>
      )}

      <div className={cn('grid grid-cols-2 gap-2')}>
        <button
          type="button"
          className={cn(
            'h-10 rounded-lg text-sm font-black border transition-all shadow-sm inline-flex items-center justify-center gap-2',
            view === 'main'
              ? 'bg-primary text-white border-primary'
              : (isDark ? 'bg-black/20 text-slate-300 border-white/10 hover:bg-white/10' : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50'),
          )}
          onClick={() => setView('main')}
        >
          <HardDrive size={16} />
          {t('admin.config.storage.views.main')}
        </button>
        <button
          type="button"
          className={cn(
            'h-10 rounded-lg text-sm font-black border transition-all shadow-sm inline-flex items-center justify-center gap-2',
            view === 'advanced'
              ? 'bg-primary text-white border-primary'
              : (isDark ? 'bg-black/20 text-slate-300 border-white/10 hover:bg-white/10' : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50'),
          )}
          onClick={() => setView('advanced')}
        >
          <Settings2 size={16} />
          {t('admin.config.storage.views.advanced')}
        </button>
      </div>
    </>
  );

  const showAllSections = mode === 'panel';

  return (
    <div
      className={cn(
        mode === 'modal'
          ? 'fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300'
          : 'relative w-full'
      )}
      {...(mode === 'modal' ? { role: 'dialog', 'aria-modal': 'true' as const } : {})}
    >
      {mode === 'modal' && (
        <button
          type="button"
          aria-label={t('common.cancel')}
          className={cn(
            'absolute inset-0 backdrop-blur-2xl transition-all duration-300',
            isDark ? 'bg-black/95' : 'bg-slate-900/80',
          )}
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          mode === 'modal'
            ? 'relative w-full max-w-5xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300 min-h-0 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]'
            : 'relative w-full rounded-2xl border shadow-xl overflow-hidden flex flex-col min-h-0',
          isDark
            ? 'bg-slate-950 border-white/10 text-slate-100 ring-1 ring-white/5'
            : 'bg-white border-gray-200 text-slate-900',
        )}
      >
        <div
          className={cn(
            'flex items-center justify-between gap-2 border-b px-4 py-4 sm:px-6 shrink-0',
            isDark ? 'border-white/10 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50',
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn('p-2 rounded-lg', isDark ? 'bg-cyan-500/10' : 'bg-cyan-50')}>
              <HardDrive size={18} className="text-cyan-500 shrink-0" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black uppercase tracking-widest truncate">
                {t('admin.config.storage.title')}
              </h3>
              <p className={cn('text-[10px] font-bold uppercase tracking-widest mt-0.5', isDark ? 'text-slate-500' : 'text-slate-400')}>
                {t('admin.config.storage.subtitle')}
              </p>
            </div>
          </div>
          {mode === 'modal' && (
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'h-8 w-8 rounded-lg border inline-flex items-center justify-center transition-colors',
                isDark ? 'border-white/15 text-slate-300 hover:bg-white/10' : 'border-gray-200 text-slate-600 hover:bg-gray-100',
              )}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar p-4 sm:p-6 space-y-4">
          {contentView}

          {view === 'main' && !showAllSections && (
            <div className={cn(
              'rounded-2xl border p-3 sm:p-4',
              isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white',
            )}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={cn('text-xs font-black uppercase tracking-widest opacity-60', isDark ? 'text-slate-300' : 'text-slate-600')}>
                    {t('admin.config.storage.main.hint')}
                  </div>
                </div>
                <button
                  type="button"
                  className={cn(
                    'h-9 px-3 rounded-lg border text-sm font-black inline-flex items-center gap-2 transition-all shrink-0',
                    isDark ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10' : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
                  )}
                  onClick={() => {
                    setView('advanced');
                    setTab('connectors');
                  }}
                >
                  <Settings2 size={16} />
                  {t('admin.config.storage.main.openAdvanced')}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
                  {t('admin.config.storage.pools.primary')}
                  <select
                    className={cn(
                      'mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold',
                      isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
                    )}
                    value={mainPool?.primary_connector || ''}
                    onChange={(e) => {
                      if (!mainPool) return;
                      updatePool(mainPool.id, (prev) => ({ ...prev, primary_connector: e.target.value }));
                    }}
                  >
                    <option value="">{t('common.none')}</option>
                    {connectors
                      .map((c) => c.name.trim())
                      .filter((name) => name.length > 0)
                      .map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                  </select>
                </label>

                <div className={cn('text-xs font-bold leading-relaxed self-end opacity-70', isDark ? 'text-slate-400' : 'text-slate-600')}>
                  {t('admin.config.storage.main.desc')}
                </div>
              </div>

              {!mainConnector ? (
                <div className={cn(
                  'mt-3 rounded-xl border p-3 text-sm font-bold',
                  isDark ? 'border-white/10 bg-black/20 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700',
                )}>
                  {t('admin.config.storage.main.noPrimaryConnector')}
                </div>
              ) : (
                <div className={cn(
                  'mt-3 rounded-2xl border p-3 sm:p-4',
                  isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white',
                )}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-black uppercase tracking-wide truncate">
                        {mainConnector.name || t('admin.config.storage.connectors.connector')}
                      </div>
                      <div className={cn('text-xs font-bold uppercase tracking-widest mt-0.5 opacity-60', isDark ? 'text-slate-400' : 'text-slate-500')}>
                        {driverLabel(mainConnector.driver)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
                      {t('admin.config.storage.fields.name')}
                      <input
                        className={cn(
                          'mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold focus:outline-none focus:ring-2',
                          isDark ? 'border-white/15 bg-black/30 text-white focus:ring-cyan-500/30' : 'border-slate-300 bg-white text-slate-900 focus:ring-cyan-500/20 shadow-sm',
                        )}
                        value={mainConnector.name}
                        onChange={(e) => renameConnector(mainConnector.id, e.target.value)}
                      />
                    </label>

                    <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
                      {t('admin.config.storage.fields.driver')}
                      <select
                        className={cn(
                          'mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold',
                          isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
                        )}
                        value={mainConnector.driver}
                        onChange={(e) => {
                          const nextDriver = e.target.value as VfsDriver;
                          updateConnector(mainConnector.id, (prev) => ({
                            ...prev,
                            driver: nextDriver,
                            root: driverUsesSlashRoot(nextDriver)
                              ? (driverUsesSlashRoot(prev.driver)
                                ? prev.root
                                : '/')
                              : prev.root,
                            options: normalizeOptionsForDriver(nextDriver, prev.options),
                          }));
                        }}
                      >
                        {(['fs', 's3', 'webdav', 'dropbox', 'onedrive', 'gdrive', 'memory', 'android_saf', 'ios_scoped_fs'] as VfsDriver[]).map((driver) => (
                          <option key={driver} value={driver}>
                            {driverLabel(driver)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className={cn('text-sm font-black md:col-span-2', isDark ? 'text-slate-300' : 'text-slate-700')}>
                      {t('admin.config.storage.fields.root')}
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          className={cn(
                            'w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold focus:outline-none focus:ring-2',
                            isDark ? 'border-white/15 bg-black/30 text-white focus:ring-cyan-500/30' : 'border-slate-300 bg-white text-slate-900 focus:ring-cyan-500/20 shadow-sm',
                          )}
                          value={mainConnector.root}
                          placeholder={t(`admin.config.storage.placeholders.root.${mainConnector.driver}`)}
                          onChange={(e) => updateConnector(mainConnector.id, (prev) => ({ ...prev, root: e.target.value }))}
                        />
                        {canPickRootForDriver(mainConnector.driver) && (
                          <button
                            type="button"
                            className={cn(
                              'h-10 px-3 rounded-lg border text-sm font-black shrink-0 transition-all',
                              isDark
                                ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20'
                                : 'border-cyan-200 bg-cyan-50 text-cyan-900 hover:bg-cyan-100',
                            )}
                            onClick={() => { void pickConnectorRoot(mainConnector.id); }}
                            disabled={pickingConnectorId === mainConnector.id}
                          >
                            {pickingConnectorId === mainConnector.id
                              ? t('common.processing')
                              : t('admin.config.storage.actions.pickDirectory')}
                          </button>
                        )}
                      </div>
                      <div className={cn('text-xs font-bold mt-1 opacity-60', isDark ? 'text-slate-400' : 'text-slate-500')}>
                        {t(`admin.config.storage.hints.root.${mainConnector.driver}`)}
                      </div>
                    </label>

                    <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
                      {t('admin.config.storage.fields.enabled')}
                      <div className="mt-1">
                        <input
                          type="checkbox"
                          className="h-5 w-5"
                          checked={mainConnector.enable}
                          onChange={(e) => updateConnector(mainConnector.id, (prev) => ({ ...prev, enable: e.target.checked }))}
                        />
                      </div>
                    </label>

                    <div className="md:col-span-2" />
                  </div>

                  {renderConnectorOptionFields(mainConnector, (updater) => updateConnector(mainConnector.id, updater))}
                </div>
              )}
            </div>
          )}

          {(view === 'advanced' || showAllSections) && (
            <>
              {!showAllSections && (
              <div className={cn(
                'grid grid-cols-1 sm:grid-cols-3 gap-2',
              )}>
                <button
                  type="button"
                  className={cn(
                    'h-10 rounded-lg text-sm font-black border transition-all shadow-sm inline-flex items-center justify-center gap-2',
                    tab === 'pools'
                      ? (isDark ? 'bg-primary text-white border-primary' : 'bg-primary text-white border-primary')
                      : (isDark ? 'bg-black/20 text-slate-300 border-white/10 hover:bg-white/10' : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50'),
                  )}
                  onClick={() => setTab('pools')}
                >
                  <Layers size={16} />
                  {t('admin.config.storage.tabs.pools')}
                </button>
                <button
                  type="button"
                  className={cn(
                    'h-10 rounded-lg text-sm font-black border transition-all shadow-sm inline-flex items-center justify-center gap-2',
                    tab === 'connectors'
                      ? (isDark ? 'bg-primary text-white border-primary' : 'bg-primary text-white border-primary')
                      : (isDark ? 'bg-black/20 text-slate-300 border-white/10 hover:bg-white/10' : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50'),
                  )}
                  onClick={() => setTab('connectors')}
                >
                  <Database size={16} />
                  {t('admin.config.storage.tabs.connectors')}
                </button>
                <button
                  type="button"
                  className={cn(
                    'h-10 rounded-lg text-sm font-black border transition-all shadow-sm inline-flex items-center justify-center gap-2',
                    tab === 'policies'
                      ? (isDark ? 'bg-primary text-white border-primary' : 'bg-primary text-white border-primary')
                      : (isDark ? 'bg-black/20 text-slate-300 border-white/10 hover:bg-white/10' : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50'),
                  )}
                  onClick={() => setTab('policies')}
                >
                  <Layers size={16} />
                  {t('admin.config.storage.tabs.policies')}
                </button>
              </div>
              )}

              {(showAllSections || tab === 'connectors') && (
                <div className="space-y-3">
                  {showAllSections && <div className={cn('text-sm font-black uppercase tracking-wide', isDark ? 'text-slate-100' : 'text-slate-900')}>{t('admin.config.storage.sections.connectors')}</div>}
                  <div className="flex items-center justify-between">
                    <div className={cn('text-xs font-black uppercase tracking-widest opacity-60', isDark ? 'text-slate-300' : 'text-slate-600')}>
                      {t('admin.config.storage.connectors.title')}
                    </div>
                    <button
                      type="button"
                      className={cn(
                        'h-9 px-3 rounded-lg border text-sm font-black inline-flex items-center gap-2 transition-all',
                        isDark ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10' : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
                      )}
                      onClick={addConnector}
                    >
                      <Plus size={16} />
                      {t('admin.config.storage.actions.addConnector')}
                    </button>
                  </div>

                  {connectors.map((c, idx) => (
                    <div
                      key={c.id}
                      className={cn(
                        'rounded-2xl border p-3 sm:p-4',
                        isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-black uppercase tracking-wide truncate">
                            {c.name || `${t('admin.config.storage.connectors.connector')} #${idx + 1}`}
                          </div>
                          <div className={cn('text-xs font-bold uppercase tracking-widest mt-0.5 opacity-60', isDark ? 'text-slate-400' : 'text-slate-500')}>
                            {driverLabel(c.driver)}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={cn(
                            'h-9 px-3 rounded-lg border text-sm font-black inline-flex items-center gap-2 transition-all',
                            isDark ? 'border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20' : 'border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100',
                          )}
                          onClick={() => removeConnector(c.id)}
                          disabled={connectors.length <= 1}
                          title={connectors.length <= 1 ? t('admin.config.storage.validation.minimumOneConnector') : undefined}
                        >
                          <Trash2 size={16} />
                          {t('common.delete')}
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
                          {t('admin.config.storage.fields.name')}
                          <input
                            className={cn(
                              'mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold focus:outline-none focus:ring-2',
                              isDark ? 'border-white/15 bg-black/30 text-white focus:ring-cyan-500/30' : 'border-slate-300 bg-white text-slate-900 focus:ring-cyan-500/20 shadow-sm',
                            )}
                            value={c.name}
                            onChange={(e) => renameConnector(c.id, e.target.value)}
                          />
                        </label>

                        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
                          {t('admin.config.storage.fields.driver')}
                          <select
                            className={cn(
                              'mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold',
                              isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
                            )}
                            value={c.driver}
                            onChange={(e) => {
                              const nextDriver = e.target.value as VfsDriver;
                              updateConnector(c.id, (prev) => ({
                                ...prev,
                                driver: nextDriver,
                                root: driverUsesSlashRoot(nextDriver)
                                  ? (driverUsesSlashRoot(prev.driver)
                                    ? prev.root
                                    : '/')
                                  : prev.root,
                                options: normalizeOptionsForDriver(nextDriver, prev.options),
                              }));
                            }}
                          >
                            {(['fs', 's3', 'webdav', 'dropbox', 'onedrive', 'gdrive', 'memory', 'android_saf', 'ios_scoped_fs'] as VfsDriver[]).map((driver) => (
                              <option key={driver} value={driver}>
                                {driverLabel(driver)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className={cn('text-sm font-black md:col-span-2', isDark ? 'text-slate-300' : 'text-slate-700')}>
                          {t('admin.config.storage.fields.root')}
                          <div className="mt-1 flex items-center gap-2">
                            <input
                              className={cn(
                                'w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold focus:outline-none focus:ring-2',
                                isDark ? 'border-white/15 bg-black/30 text-white focus:ring-cyan-500/30' : 'border-slate-300 bg-white text-slate-900 focus:ring-cyan-500/20 shadow-sm',
                              )}
                              value={c.root}
                              placeholder={t(`admin.config.storage.placeholders.root.${c.driver}`)}
                              onChange={(e) => updateConnector(c.id, (prev) => ({ ...prev, root: e.target.value }))}
                            />
                            {canPickRootForDriver(c.driver) && (
                              <button
                                type="button"
                                className={cn(
                                  'h-10 px-3 rounded-lg border text-sm font-black shrink-0 transition-all',
                                  isDark
                                    ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20'
                                    : 'border-cyan-200 bg-cyan-50 text-cyan-900 hover:bg-cyan-100',
                                )}
                                onClick={() => { void pickConnectorRoot(c.id); }}
                                disabled={pickingConnectorId === c.id}
                              >
                                {pickingConnectorId === c.id
                                  ? t('common.processing')
                                  : t('admin.config.storage.actions.pickDirectory')}
                              </button>
                            )}
                          </div>
                          <div className={cn('text-xs font-bold mt-1 opacity-60', isDark ? 'text-slate-400' : 'text-slate-500')}>
                            {t(`admin.config.storage.hints.root.${c.driver}`)}
                          </div>
                        </label>

                        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
                          {t('admin.config.storage.fields.enabled')}
                          <div className="mt-1">
                            <input
                              type="checkbox"
                              className="h-5 w-5"
                              checked={c.enable}
                              onChange={(e) => updateConnector(c.id, (prev) => ({ ...prev, enable: e.target.checked }))}
                            />
                          </div>
                        </label>

                        <div className="md:col-span-2" />
                      </div>

                      {renderConnectorOptionFields(c, (updater) => updateConnector(c.id, updater))}

                      <div className={cn(
                        'mt-3 rounded-xl border p-3',
                        isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50',
                      )}>
                        <div className="flex items-center justify-between">
                          <div className={cn('text-xs font-black uppercase tracking-widest opacity-60', isDark ? 'text-slate-300' : 'text-slate-600')}>
                            {t('admin.config.storage.fields.options')}
                          </div>
                          <button
                            type="button"
                            className={cn(
                              'h-8 px-2 rounded-lg border text-xs font-black inline-flex items-center gap-2 transition-all',
                              isDark ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10' : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
                            )}
                            onClick={() => updateConnector(c.id, (prev) => ({ ...prev, options: [...prev.options, { key: '', value: '' }] }))}
                          >
                            <Plus size={14} />
                            {t('admin.config.storage.actions.addOption')}
                          </button>
                        </div>

                        <div className="mt-2 space-y-2">
                          {c.options.map((pair, pairIndex) => (
                            <div key={`${c.id}-${pair.key}-${pair.value}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                              <input
                                className={cn(
                                  'h-10 rounded-lg border px-3 text-sm font-mono font-bold',
                                  isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
                                )}
                                placeholder={t('admin.config.storage.placeholders.optionKey')}
                                value={pair.key}
                                onChange={(e) => {
                                  const nextKey = e.target.value;
                                  updateConnector(c.id, (prev) => {
                                    const next = prev.options.slice();
                                    next[pairIndex] = { ...next[pairIndex], key: nextKey };
                                    return { ...prev, options: next };
                                  });
                                }}
                              />
                              <input
                                className={cn(
                                  'h-10 rounded-lg border px-3 text-sm font-mono font-bold',
                                  isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
                                )}
                                placeholder={t('admin.config.storage.placeholders.optionValue')}
                                value={pair.value}
                                onChange={(e) => {
                                  const nextValue = e.target.value;
                                  updateConnector(c.id, (prev) => {
                                    const next = prev.options.slice();
                                    next[pairIndex] = { ...next[pairIndex], value: nextValue };
                                    return { ...prev, options: next };
                                  });
                                }}
                              />
                              <button
                                type="button"
                                className={cn(
                                  'h-10 w-10 rounded-lg border inline-flex items-center justify-center',
                                  isDark ? 'border-white/15 text-slate-200 hover:bg-white/10' : 'border-slate-300 text-slate-700 hover:bg-slate-100',
                                )}
                                onClick={() => {
                                  updateConnector(c.id, (prev) => {
                                    const next = prev.options.slice();
                                    next.splice(pairIndex, 1);
                                    return { ...prev, options: next };
                                  });
                                }}
                                aria-label={t('common.delete')}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(showAllSections || tab === 'pools') && (
                <div className="space-y-3">
                  {showAllSections && <div className={cn('text-sm font-black uppercase tracking-wide', isDark ? 'text-slate-100' : 'text-slate-900')}>{t('admin.config.storage.sections.pools')}</div>}
                  <div className="flex items-center justify-between">
                    <div className={cn('text-xs font-black uppercase tracking-widest opacity-60', isDark ? 'text-slate-300' : 'text-slate-600')}>
                      {t('admin.config.storage.pools.title')}
                    </div>
                    <button
                      type="button"
                      className={cn(
                        'h-9 px-3 rounded-lg border text-sm font-black inline-flex items-center gap-2 transition-all',
                        isDark ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10' : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
                      )}
                      onClick={addPool}
                    >
                      <Plus size={16} />
                      {t('admin.config.storage.actions.addPool')}
                    </button>
                  </div>

                  {pools.map((p, idx) => (
                    <div
                      key={p.id}
                      className={cn(
                        'rounded-2xl border p-3 sm:p-4',
                        isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-black uppercase tracking-wide truncate">
                            {p.name || `${t('admin.config.storage.pools.pool')} #${idx + 1}`}
                          </div>
                          <div className={cn('text-xs font-bold uppercase tracking-widest mt-0.5 opacity-60', isDark ? 'text-slate-400' : 'text-slate-500')}>
                            {t('admin.config.storage.pools.primary')}: {p.primary_connector || '-'}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={cn(
                            'h-9 px-3 rounded-lg border text-sm font-black inline-flex items-center gap-2 transition-all',
                            isDark ? 'border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20' : 'border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100',
                          )}
                          onClick={() => removePool(p.id)}
                          disabled={pools.length <= 1}
                          title={pools.length <= 1 ? t('admin.config.storage.validation.minimumOnePool') : undefined}
                        >
                          <Trash2 size={16} />
                          {t('common.delete')}
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
                          {t('admin.config.storage.fields.name')}
                          <input
                            className={cn(
                              'mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold focus:outline-none focus:ring-2',
                              isDark ? 'border-white/15 bg-black/30 text-white focus:ring-cyan-500/30' : 'border-slate-300 bg-white text-slate-900 focus:ring-cyan-500/20 shadow-sm',
                            )}
                            value={p.name}
                            onChange={(e) => renamePool(p.id, e.target.value)}
                          />
                        </label>

                        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
                          {t('admin.config.storage.pools.primary')}
                          <select
                            className={cn(
                              'mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold',
                              isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
                            )}
                            value={p.primary_connector}
                            onChange={(e) => updatePool(p.id, (prev) => ({ ...prev, primary_connector: e.target.value }))}
                          >
                            {connectors.map((c) => (
                              <option key={c.id} value={c.name}>
                                {c.name || '(unnamed)'}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
                          {t('admin.config.storage.pools.backup')}
                          <select
                            className={cn(
                              'mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold',
                              isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
                            )}
                            value={p.backup_connector}
                            onChange={(e) => updatePool(p.id, (prev) => ({ ...prev, backup_connector: e.target.value }))}
                          >
                            <option value="">{t('common.none')}</option>
                            {connectors.map((c) => (
                              <option key={c.id} value={c.name}>
                                {c.name || '(unnamed)'}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
                          {t('admin.config.storage.fields.enabled')}
                          <div className="mt-1">
                            <input
                              type="checkbox"
                              className="h-5 w-5"
                              checked={p.enable}
                              onChange={(e) => updatePool(p.id, (prev) => ({ ...prev, enable: e.target.checked }))}
                            />
                          </div>
                        </label>

                        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
                          {t('admin.config.storage.pools.writeCache')}
                          <div className="mt-1">
                            <input
                              type="checkbox"
                              className="h-5 w-5"
                              checked={p.enable_write_cache}
                              onChange={(e) => updatePool(p.id, (prev) => ({ ...prev, enable_write_cache: e.target.checked }))}
                            />
                          </div>
                        </label>
                      </div>

                      <div className={cn(
                        'mt-3 rounded-xl border p-3',
                        isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50',
                      )}>
                        <div className="flex items-center justify-between">
                          <div className={cn('text-xs font-black uppercase tracking-widest opacity-60', isDark ? 'text-slate-300' : 'text-slate-600')}>
                            {t('admin.config.storage.fields.options')}
                          </div>
                          <button
                            type="button"
                            className={cn(
                              'h-8 px-2 rounded-lg border text-xs font-black inline-flex items-center gap-2 transition-all',
                              isDark ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10' : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
                            )}
                            onClick={() => updatePool(p.id, (prev) => ({ ...prev, options: [...prev.options, { key: '', value: '' }] }))}
                          >
                            <Plus size={14} />
                            {t('admin.config.storage.actions.addOption')}
                          </button>
                        </div>
                        <div className="mt-2 space-y-2">
                          {p.options.map((pair, pairIndex) => (
                            <div key={`${p.id}-${pair.key}-${pair.value}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                              <input
                                className={cn(
                                  'h-10 rounded-lg border px-3 text-sm font-mono font-bold',
                                  isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
                                )}
                                placeholder={t('admin.config.storage.placeholders.optionKey')}
                                value={pair.key}
                                onChange={(e) => {
                                  const nextKey = e.target.value;
                                  updatePool(p.id, (prev) => {
                                    const next = prev.options.slice();
                                    next[pairIndex] = { ...next[pairIndex], key: nextKey };
                                    return { ...prev, options: next };
                                  });
                                }}
                              />
                              <input
                                className={cn(
                                  'h-10 rounded-lg border px-3 text-sm font-mono font-bold',
                                  isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
                                )}
                                placeholder={t('admin.config.storage.placeholders.optionValue')}
                                value={pair.value}
                                onChange={(e) => {
                                  const nextValue = e.target.value;
                                  updatePool(p.id, (prev) => {
                                    const next = prev.options.slice();
                                    next[pairIndex] = { ...next[pairIndex], value: nextValue };
                                    return { ...prev, options: next };
                                  });
                                }}
                              />
                              <button
                                type="button"
                                className={cn(
                                  'h-10 w-10 rounded-lg border inline-flex items-center justify-center',
                                  isDark ? 'border-white/15 text-slate-200 hover:bg-white/10' : 'border-slate-300 text-slate-700 hover:bg-slate-100',
                                )}
                                onClick={() => {
                                  updatePool(p.id, (prev) => {
                                    const next = prev.options.slice();
                                    next.splice(pairIndex, 1);
                                    return { ...prev, options: next };
                                  });
                                }}
                                aria-label={t('common.delete')}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(showAllSections || tab === 'policies') && (
                <div className="space-y-3">
                  {showAllSections && <div className={cn('text-sm font-black uppercase tracking-wide', isDark ? 'text-slate-100' : 'text-slate-900')}>{t('admin.config.storage.sections.policies')}</div>}
                  <div className="flex items-center justify-between">
                    <div className={cn('text-xs font-black uppercase tracking-widest opacity-60', isDark ? 'text-slate-300' : 'text-slate-600')}>
                      {t('admin.config.storage.policies.title')}
                    </div>
                    <button
                      type="button"
                      className={cn(
                        'h-9 px-3 rounded-lg border text-sm font-black inline-flex items-center gap-2 transition-all',
                        isDark ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10' : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
                      )}
                      onClick={addPolicy}
                    >
                      <Plus size={16} />
                      {t('admin.config.storage.actions.addPolicy')}
                    </button>
                  </div>

                  <div className={cn('text-sm font-bold opacity-70', isDark ? 'text-slate-400' : 'text-slate-600')}>
                    {t('admin.config.storage.policies.hint')}
                  </div>

                  {policies.length === 0 && (
                    <div className={cn(
                      'rounded-xl border p-3',
                      isDark ? 'border-white/10 bg-black/20 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700',
                    )}>
                      {t('admin.config.storage.policies.empty')}
                    </div>
                  )}

                  {policies.map((policy, idx) => (
                    <div
                      key={policy.id}
                      className={cn(
                        'rounded-2xl border p-3 sm:p-4',
                        isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-black uppercase tracking-wide truncate">
                            {t('admin.config.storage.policies.policy')} #{idx + 1}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={cn(
                            'h-9 px-3 rounded-lg border text-sm font-black inline-flex items-center gap-2 transition-all',
                            isDark ? 'border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20' : 'border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100',
                          )}
                          onClick={() => removePolicy(policy.id)}
                        >
                          <Trash2 size={16} />
                          {t('common.delete')}
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
                          {t('admin.config.storage.policies.roleId')}
                          <input
                            className={cn(
                              'mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold',
                              isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
                            )}
                            value={policy.role_id}
                            onChange={(e) => updatePolicy(policy.id, (prev) => ({ ...prev, role_id: e.target.value }))}
                          />
                        </label>

                        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
                          {t('admin.config.storage.policies.poolName')}
                          <select
                            className={cn(
                              'mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold',
                              isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
                            )}
                            value={policy.pool_name}
                            onChange={(e) => updatePolicy(policy.id, (prev) => ({ ...prev, pool_name: e.target.value }))}
                          >
                            {pools.map((p) => (
                              <option key={p.id} value={p.name}>
                                {p.name || '(unnamed)'}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
                          {t('admin.config.storage.policies.defaultQuota')}
                          <input
                            className={cn(
                              'mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold',
                              isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
                            )}
                            placeholder="0"
                            value={policy.default_quota}
                            onChange={(e) => updatePolicy(policy.id, (prev) => ({ ...prev, default_quota: e.target.value }))}
                          />
                        </label>

                        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
                          {t('admin.config.storage.policies.maxPrivateMounts')}
                          <input
                            className={cn(
                              'mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold',
                              isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
                            )}
                            placeholder="0"
                            value={policy.max_private_mounts}
                            onChange={(e) => updatePolicy(policy.id, (prev) => ({ ...prev, max_private_mounts: e.target.value }))}
                          />
                        </label>

                        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
                          {t('admin.config.storage.policies.minMountSyncIntervalMinutes')}
                          <input
                            className={cn(
                              'mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold',
                              isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
                            )}
                            placeholder="5"
                            value={policy.min_mount_sync_interval_minutes}
                            onChange={(e) => updatePolicy(policy.id, (prev) => ({ ...prev, min_mount_sync_interval_minutes: e.target.value }))}
                          />
                        </label>

                        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
                          {t('admin.config.storage.policies.maxMountSyncTimeoutSecs')}
                          <input
                            className={cn(
                              'mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold',
                              isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
                            )}
                            placeholder="900"
                            value={policy.max_mount_sync_timeout_secs}
                            onChange={(e) => updatePolicy(policy.id, (prev) => ({ ...prev, max_mount_sync_timeout_secs: e.target.value }))}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {false && showAllSections && (
                <div className="space-y-3">
                  <div className={cn('text-sm font-black uppercase tracking-wide', isDark ? 'text-slate-100' : 'text-slate-900')}>{t('admin.config.storage.sections.cache')}</div>
                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className={cn('rounded-2xl border p-4 space-y-3', isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white')}>
                      <div className={cn('text-xs font-black uppercase tracking-widest opacity-60', isDark ? 'text-slate-300' : 'text-slate-600')}>{t('admin.config.storage.cache.read')}</div>
                      <label className="flex items-center gap-3 text-sm font-black"><input type="checkbox" checked={cacheSection.readEnable} onChange={(e) => setCacheSection((prev) => ({ ...prev, readEnable: e.target.checked }))} />{t('admin.config.storage.cache.enable')}</label>
                      <select className={cn('h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold', isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900')} value={cacheSection.readBackend} onChange={(e) => setCacheSection((prev) => ({ ...prev, readBackend: e.target.value as 'memory' | 'local_dir' }))}>
                        <option value="memory">memory</option>
                        <option value="local_dir">local_dir</option>
                      </select>
                      <input className={cn('h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold', isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900')} value={cacheSection.readLocalDir} onChange={(e) => setCacheSection((prev) => ({ ...prev, readLocalDir: e.target.value }))} placeholder="local_dir" />
                      <input className={cn('h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold', isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900')} value={cacheSection.readCapacityBytes} onChange={(e) => setCacheSection((prev) => ({ ...prev, readCapacityBytes: e.target.value }))} placeholder="capacity_bytes" />
                      <input className={cn('h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold', isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900')} value={cacheSection.readMaxFileSizeBytes} onChange={(e) => setCacheSection((prev) => ({ ...prev, readMaxFileSizeBytes: e.target.value }))} placeholder="max_file_size_bytes" />
                      <input className={cn('h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold', isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900')} value={cacheSection.readTtlSecs} onChange={(e) => setCacheSection((prev) => ({ ...prev, readTtlSecs: e.target.value }))} placeholder="ttl_secs" />
                    </div>
                    <div className={cn('rounded-2xl border p-4 space-y-3', isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white')}>
                      <div className={cn('text-xs font-black uppercase tracking-widest opacity-60', isDark ? 'text-slate-300' : 'text-slate-600')}>{t('admin.config.storage.cache.write')}</div>
                      <label className="flex items-center gap-3 text-sm font-black"><input type="checkbox" checked={cacheSection.writeEnable} onChange={(e) => setCacheSection((prev) => ({ ...prev, writeEnable: e.target.checked }))} />{t('admin.config.storage.cache.enable')}</label>
                      <select className={cn('h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold', isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900')} value={cacheSection.writeBackend} onChange={(e) => setCacheSection((prev) => ({ ...prev, writeBackend: e.target.value as 'memory' | 'local_dir' }))}>
                        <option value="memory">memory</option>
                        <option value="local_dir">local_dir</option>
                      </select>
                      <input className={cn('h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold', isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900')} value={cacheSection.writeLocalDir} onChange={(e) => setCacheSection((prev) => ({ ...prev, writeLocalDir: e.target.value }))} placeholder="local_dir" />
                      <input className={cn('h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold', isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900')} value={cacheSection.writeCapacityBytes} onChange={(e) => setCacheSection((prev) => ({ ...prev, writeCapacityBytes: e.target.value }))} placeholder="capacity_bytes" />
                      <input className={cn('h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold', isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900')} value={cacheSection.writeFlushConcurrency} onChange={(e) => setCacheSection((prev) => ({ ...prev, writeFlushConcurrency: e.target.value }))} placeholder="flush_concurrency" />
                      <input className={cn('h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold', isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900')} value={cacheSection.writeFlushIntervalMs} onChange={(e) => setCacheSection((prev) => ({ ...prev, writeFlushIntervalMs: e.target.value }))} placeholder="flush_interval_ms" />
                    </div>
                  </div>
                </div>
              )}

              {false && showAllSections && (
                <div className="space-y-3">
                  <div className={cn('text-sm font-black uppercase tracking-wide', isDark ? 'text-slate-100' : 'text-slate-900')}>{t('admin.config.storage.sections.archive')}</div>
                  <div className={cn('rounded-2xl border p-4 space-y-3', isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white')}>
                    <label className="flex items-center gap-3 text-sm font-black"><input type="checkbox" checked={archiveSection.enable} onChange={(e) => setArchiveSection((prev) => ({ ...prev, enable: e.target.checked }))} />{t('admin.config.storage.archive.enable')}</label>
                    <input className={cn('h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold', isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900')} value={archiveSection.exe7zipPath} onChange={(e) => setArchiveSection((prev) => ({ ...prev, exe7zipPath: e.target.value }))} placeholder="exe_7zip_path" />
                    <input className={cn('h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold', isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900')} value={archiveSection.defaultCompressionFormat} onChange={(e) => setArchiveSection((prev) => ({ ...prev, defaultCompressionFormat: e.target.value }))} placeholder="default_compression_format" />
                    <div className="grid gap-3 md:grid-cols-3">
                      <input className={cn('h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold', isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900')} value={archiveSection.maxConcurrency} onChange={(e) => setArchiveSection((prev) => ({ ...prev, maxConcurrency: e.target.value }))} placeholder="process_manager_max_concurrency" />
                      <input className={cn('h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold', isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900')} value={archiveSection.maxCpuThreads} onChange={(e) => setArchiveSection((prev) => ({ ...prev, maxCpuThreads: e.target.value }))} placeholder="max_cpu_threads" />
                      <input className={cn('h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold', isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900')} value={archiveSection.timeoutSecs} onChange={(e) => setArchiveSection((prev) => ({ ...prev, timeoutSecs: e.target.value }))} placeholder="timeout_secs" />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div
          className={cn(
            'border-t px-4 py-4 sm:px-6 flex items-center justify-between gap-2',
            isDark ? 'border-white/10 bg-black/20' : 'border-slate-100 bg-slate-50/50',
          )}
        >
          <button
            type="button"
            onClick={resetToLocalDefaults}
            className={cn(
              'h-10 px-4 rounded-lg border text-sm font-black transition-all',
              isDark ? 'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20' : 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100',
            )}
          >
            {t('admin.config.storage.actions.resetLocal')}
          </button>

          <div className="flex items-center gap-2">
            {mode === 'modal' && (
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'h-10 px-4 rounded-lg border text-sm font-black transition-all',
                  isDark ? 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                )}
              >
                {t('common.cancel')}
              </button>
            )}
            <Button
              onClick={applyToConfig}
              className="h-10 px-6 rounded-lg shadow-xl shadow-primary/20"
            >
              {t('admin.config.storage.actions.apply')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
