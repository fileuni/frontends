import type { TFunction } from 'i18next';
import { deepClone, ensureRecord, isRecord, type ConfigObject } from '@/lib/configObject';
import {
  type ArchiveSectionDraft,
  type CacheSectionDraft,
  type ConnectorDraft,
  type PolicyDraft,
  type PoolDraft,
  type TomlAdapter,
  type VfsDriver,
  driverUsesSlashRoot,
  normalizeOptionsForDriver,
  storageDriverOptions,
} from './vfsStorageDraftShared';

type Translate = TFunction;

export interface VfsDraftCollections {
  connectors: ConnectorDraft[];
  pools: PoolDraft[];
  defaultPool: string;
  policies: PolicyDraft[];
}

export interface ParsedVfsStorageDraft extends VfsDraftCollections {
  cacheSection: CacheSectionDraft;
  archiveSection: ArchiveSectionDraft;
  error: string | null;
}

type ApplyVfsDraftParams = VfsDraftCollections & {
  content: string;
  tomlAdapter: TomlAdapter;
  cacheSection: CacheSectionDraft;
  archiveSection: ArchiveSectionDraft;
};

export type ApplyVfsDraftResult =
  | { ok: true; content: string }
  | { ok: false; reason: 'parse_root' | 'parse_failed'; message: string };

const makeId = (() => {
  let seed = 0;
  return (prefix: string): string => {
    seed += 1;
    return `${prefix}-${Date.now()}-${seed}`;
  };
})();

const kvFromOptions = (raw: unknown): Array<{ key: string; value: string }> => {
  if (!isRecord(raw)) {
    return [];
  }
  return Object.entries(raw)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ key, value }));
};

const kvToOptions = (pairs: Array<{ key: string; value: string }>): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const pair of pairs) {
    const key = pair.key.trim();
    if (!key) continue;
    out[key] = pair.value;
  }
  return out;
};

export const defaultCacheSection: CacheSectionDraft = {
  readEnable: false,
  readBackend: 'memory',
  readLocalDir: '{RUNTIMEDIR}/cache/vfs-read',
  readCapacityBytes: '134217728',
  readMaxFileSizeBytes: '2097152',
  readTtlSecs: '1800',
  writeEnable: false,
  writeBackend: 'local_dir',
  writeLocalDir: '{RUNTIMEDIR}/cache/vfs-write',
  writeCapacityBytes: '100663296',
  writeMaxFileSizeBytes: '262144',
  writeFlushConcurrency: '2',
  writeFlushIntervalMs: '30',
  writeFlushDeadlineSecs: '360',
};

export const defaultArchiveSection: ArchiveSectionDraft = {
  enable: false,
  exe7zipPath: '7z',
  defaultCompressionFormat: 'zip',
  maxConcurrency: '2',
  maxCpuThreads: '2',
  timeoutSecs: '300',
};

const stringArrayOrEmpty = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
};

const readCacheSection = (hub: Record<string, unknown>): CacheSectionDraft => {
  const readCache = isRecord(hub["read_cache"]) ? hub["read_cache"] : {};
  const writeCache = isRecord(hub["write_cache"]) ? hub["write_cache"] : {};
  return {
    readEnable: typeof readCache["enable"] === 'boolean' ? readCache["enable"] : defaultCacheSection.readEnable,
    readBackend: readCache["backend"] === 'local_dir' ? 'local_dir' : defaultCacheSection.readBackend,
    readLocalDir: typeof readCache["local_dir"] === 'string' ? readCache["local_dir"] : defaultCacheSection.readLocalDir,
    readCapacityBytes: String(readCache["capacity_bytes"] ?? defaultCacheSection.readCapacityBytes),
    readMaxFileSizeBytes: String(readCache["max_file_size_bytes"] ?? defaultCacheSection.readMaxFileSizeBytes),
    readTtlSecs: String(readCache["ttl_secs"] ?? defaultCacheSection.readTtlSecs),
    writeEnable: typeof writeCache["enable"] === 'boolean' ? writeCache["enable"] : defaultCacheSection.writeEnable,
    writeBackend: writeCache["backend"] === 'memory' ? 'memory' : defaultCacheSection.writeBackend,
    writeLocalDir: typeof writeCache["local_dir"] === 'string' ? writeCache["local_dir"] : defaultCacheSection.writeLocalDir,
    writeCapacityBytes: String(writeCache["capacity_bytes"] ?? defaultCacheSection.writeCapacityBytes),
    writeMaxFileSizeBytes: String(writeCache["max_file_size_bytes"] ?? defaultCacheSection.writeMaxFileSizeBytes),
    writeFlushConcurrency: String(writeCache["flush_concurrency"] ?? defaultCacheSection.writeFlushConcurrency),
    writeFlushIntervalMs: String(writeCache["flush_interval_ms"] ?? defaultCacheSection.writeFlushIntervalMs),
    writeFlushDeadlineSecs: String(writeCache["flush_deadline_secs"] ?? defaultCacheSection.writeFlushDeadlineSecs),
  };
};

const readArchiveSection = (hub: Record<string, unknown>): ArchiveSectionDraft => {
  const fileCompress = isRecord(hub["file_compress"]) ? hub["file_compress"] : {};
  return {
    enable: typeof fileCompress["enable"] === 'boolean' ? fileCompress["enable"] : defaultArchiveSection.enable,
    exe7zipPath: typeof fileCompress["exe_7zip_path"] === 'string' ? fileCompress["exe_7zip_path"] : defaultArchiveSection.exe7zipPath,
    defaultCompressionFormat: typeof fileCompress["default_compression_format"] === 'string' ? fileCompress["default_compression_format"] : defaultArchiveSection.defaultCompressionFormat,
    maxConcurrency: String(fileCompress["process_manager_max_concurrency"] ?? defaultArchiveSection.maxConcurrency),
    maxCpuThreads: String(fileCompress["max_cpu_threads"] ?? defaultArchiveSection.maxCpuThreads),
    timeoutSecs: String(fileCompress["timeout_secs"] ?? defaultArchiveSection.timeoutSecs),
  };
};

export const isVfsDriver = (value: string): value is VfsDriver => {
  return storageDriverOptions.includes(value as VfsDriver);
};

export const canPickRootForDriver = (driver: VfsDriver, hasPicker: boolean): boolean => {
  if (!hasPicker) {
    return false;
  }
  return driver === 'fs' || driver === 'android_saf' || driver === 'ios_scoped_fs';
};

export const buildLocalDefaults = (): VfsDraftCollections => {
  const connectorName = 'local-fs';
  const poolName = 'default-pool';
  return {
    connectors: [
      {
        id: makeId('connector'),
        name: connectorName,
        driver: 'fs',
        root: '{RUNTIMEDIR}/vfs',
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

export const buildDefaultVfsStorageState = (): ParsedVfsStorageDraft => ({
  ...buildLocalDefaults(),
  cacheSection: { ...defaultCacheSection },
  archiveSection: { ...defaultArchiveSection },
  error: null,
});

export const createConnectorDraft = (name: string): ConnectorDraft => ({
  id: makeId('connector'),
  name,
  driver: 'fs',
  root: '{RUNTIMEDIR}/vfs',
  enable: true,
  options: [],
});

export const createPoolDraft = (name: string, defaultConnector: string): PoolDraft => ({
  id: makeId('pool'),
  name,
  primary_connector: defaultConnector,
  backup_connector: '',
  enable_write_cache: false,
  enable: true,
  options: [],
});

export const createPolicyDraft = (poolName: string): PolicyDraft => ({
  id: makeId('policy'),
  role_id: '0',
  pool_name: poolName,
  default_quota: '0',
  max_private_mounts: '0',
  min_mount_sync_interval_minutes: '5',
  max_mount_sync_timeout_secs: '900',
});

export const parseVfsStorageDraftFromContent = (
  content: string,
  tomlAdapter: TomlAdapter,
): ParsedVfsStorageDraft => {
  try {
    const parsed = tomlAdapter.parse(content);
    if (!isRecord(parsed)) {
      return { ...buildDefaultVfsStorageState(), error: 'TOML root must be an object' };
    }

    const vfsHub = isRecord(parsed["vfs_storage_hub"]) ? parsed["vfs_storage_hub"] : {};
    const connectorsRaw = vfsHub["connectors"];
    const poolsRaw = vfsHub["pools"];
    const policiesRaw = vfsHub["policies"];
    const defaultPoolRaw = vfsHub["default_pool"];
    const defaults = buildLocalDefaults();

    const connectors: ConnectorDraft[] = Array.isArray(connectorsRaw)
      ? connectorsRaw
        .filter(isRecord)
        .map((connector) => {
          const driver = typeof connector["driver"] === 'string' && isVfsDriver(connector["driver"])
            ? connector["driver"]
            : 'fs';
          const rawRoot = typeof connector["root"] === 'string' ? connector["root"] : '';
          return {
            id: makeId('connector'),
            name: typeof connector["name"] === 'string' ? connector["name"] : '',
            driver,
            root: driverUsesSlashRoot(driver) && rawRoot.trim().length === 0 ? '/' : rawRoot,
            enable: typeof connector["enable"] === 'boolean' ? connector["enable"] : true,
            options: normalizeOptionsForDriver(driver, kvFromOptions(connector["options"])),
          };
        })
      : [];

    const pools: PoolDraft[] = Array.isArray(poolsRaw)
      ? poolsRaw
        .filter(isRecord)
        .map((pool) => ({
          id: makeId('pool'),
          name: typeof pool["name"] === 'string' ? pool["name"] : '',
          primary_connector: typeof pool["primary_connector"] === 'string' ? pool["primary_connector"] : '',
          backup_connector: typeof pool["backup_connector"] === 'string' ? pool["backup_connector"] : '',
          enable_write_cache: typeof pool["enable_write_cache"] === 'boolean' ? pool["enable_write_cache"] : false,
          enable: typeof pool["enable"] === 'boolean' ? pool["enable"] : true,
          options: kvFromOptions(pool["options"]),
        }))
      : [];

    const policies: PolicyDraft[] = Array.isArray(policiesRaw)
      ? policiesRaw
        .filter(isRecord)
        .map((policy) => ({
          id: makeId('policy'),
          role_id: typeof policy["role_id"] === 'string' ? policy["role_id"] : '',
          pool_name: typeof policy["pool_name"] === 'string' ? policy["pool_name"] : '',
          default_quota: typeof policy["default_quota"] === 'number' ? String(policy["default_quota"]) : '',
          max_private_mounts: typeof policy["max_private_mounts"] === 'number' ? String(policy["max_private_mounts"]) : '',
          min_mount_sync_interval_minutes: typeof policy["min_mount_sync_interval_minutes"] === 'number' ? String(policy["min_mount_sync_interval_minutes"]) : '',
          max_mount_sync_timeout_secs: typeof policy["max_mount_sync_timeout_secs"] === 'number' ? String(policy["max_mount_sync_timeout_secs"]) : '',
        }))
      : [];

    const effectiveConnectors = connectors.length > 0 ? connectors : defaults.connectors;
    const effectivePools = pools.length > 0 ? pools : defaults.pools;
    const poolNames = new Set(effectivePools.map((pool) => pool.name).filter((value) => value.trim().length > 0));
    const resolvedDefaultPool = typeof defaultPoolRaw === 'string' && defaultPoolRaw.trim().length > 0
      ? defaultPoolRaw
      : defaults.defaultPool;

    return {
      connectors: effectiveConnectors,
      pools: effectivePools,
      defaultPool: poolNames.has(resolvedDefaultPool) ? resolvedDefaultPool : (effectivePools[0]?.name || defaults.defaultPool),
      policies,
      cacheSection: readCacheSection(vfsHub),
      archiveSection: readArchiveSection(vfsHub),
      error: null,
    };
  } catch (error) {
    return {
      ...buildDefaultVfsStorageState(),
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export const validateVfsDraft = (
  t: Translate,
  draft: VfsDraftCollections,
): string[] => {
  const { connectors, pools, defaultPool, policies } = draft;
  const errors: string[] = [];

  if (connectors.length === 0) {
    errors.push(t('admin.config.storage.validation.errors.atLeastOneConnector'));
  }

  const connectorNames = connectors.map((connector) => connector.name.trim()).filter((value) => value.length > 0);
  const connectorNameSet = new Set(connectorNames);
  if (connectorNames.length !== connectorNameSet.size) {
    errors.push(t('admin.config.storage.validation.errors.connectorNamesUnique'));
  }

  connectors.forEach((connector, index) => {
    if (!connector.name.trim()) errors.push(t('admin.config.storage.validation.errors.connectorNameRequired', { index }));
    if (!connector.driver.trim()) errors.push(t('admin.config.storage.validation.errors.connectorDriverRequired', { index }));
    if (!connector.root.trim()) errors.push(t('admin.config.storage.validation.errors.connectorRootRequired', { index }));
  });

  if (pools.length === 0) {
    errors.push(t('admin.config.storage.validation.errors.atLeastOnePool'));
  }

  const poolNames = pools.map((pool) => pool.name.trim()).filter((value) => value.length > 0);
  const poolNameSet = new Set(poolNames);
  if (poolNames.length !== poolNameSet.size) {
    errors.push(t('admin.config.storage.validation.errors.poolNamesUnique'));
  }

  pools.forEach((pool, index) => {
    if (!pool.name.trim()) errors.push(t('admin.config.storage.validation.errors.poolNameRequired', { index }));
    if (!pool.primary_connector.trim()) errors.push(t('admin.config.storage.validation.errors.poolPrimaryRequired', { index }));
    if (pool.primary_connector.trim() && !connectorNameSet.has(pool.primary_connector.trim())) {
      errors.push(t('admin.config.storage.validation.errors.poolPrimaryUnknown', { index, name: pool.primary_connector }));
    }
    if (pool.backup_connector.trim() && !connectorNameSet.has(pool.backup_connector.trim())) {
      errors.push(t('admin.config.storage.validation.errors.poolBackupUnknown', { index, name: pool.backup_connector }));
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

export const applyVfsDraftToContent = ({
  content,
  tomlAdapter,
  connectors,
  pools,
  defaultPool,
  policies,
  cacheSection,
  archiveSection,
}: ApplyVfsDraftParams): ApplyVfsDraftResult => {
  try {
    const parsed = tomlAdapter.parse(content);
    if (!isRecord(parsed)) {
      return { ok: false, reason: 'parse_root', message: 'TOML root must be an object' };
    }

    const nextConfig = deepClone(parsed);
    const vfsHub = ensureRecord(nextConfig, 'vfs_storage_hub');
    const originalVfsHub = isRecord(parsed["vfs_storage_hub"]) ? parsed["vfs_storage_hub"] : {};
    const originalConnectors = Array.isArray(originalVfsHub["connectors"])
      ? originalVfsHub["connectors"].filter(isRecord)
      : [];
    const originalPools = Array.isArray(originalVfsHub["pools"])
      ? originalVfsHub["pools"].filter(isRecord)
      : [];
    const originalPolicies = Array.isArray(originalVfsHub["policies"])
      ? originalVfsHub["policies"].filter(isRecord)
      : [];

    vfsHub["connectors"] = connectors.map((connector) => {
      const connectorName = connector.name.trim();
      const originalConnector = originalConnectors.find(
        (item) => typeof item["name"] === 'string' && item["name"] === connectorName,
      );
      return {
        ...originalConnector,
        name: connectorName,
        driver: connector.driver,
        root: connector.root.trim(),
        enable: connector.enable,
        options: kvToOptions(connector.options),
      };
    });

    vfsHub["pools"] = pools.map((pool) => {
      const poolName = pool.name.trim();
      const originalPool = originalPools.find(
        (item) => typeof item["name"] === 'string' && item["name"] === poolName,
      );
      const nextPool: ConfigObject = {
        ...(originalPool ?? {}),
        name: poolName,
        primary_connector: pool.primary_connector.trim(),
        enable_write_cache: pool.enable_write_cache,
        enable: pool.enable,
        options: kvToOptions(pool.options),
      };
      if (pool.backup_connector.trim().length > 0) {
        nextPool["backup_connector"] = pool.backup_connector.trim();
      }
      return nextPool;
    });

    vfsHub["default_pool"] = defaultPool.trim();
    vfsHub["policies"] = policies.map((policy) => {
      const roleId = policy.role_id.trim();
      const poolName = policy.pool_name.trim();
      const originalPolicy = originalPolicies.find(
        (item) =>
          typeof item["role_id"] === 'string' &&
          item["role_id"] === roleId &&
          typeof item["pool_name"] === 'string' &&
          item["pool_name"] === poolName,
      );
      return {
        ...(originalPolicy ?? {}),
        role_id: roleId,
        pool_name: poolName,
        default_quota: Number.parseInt(policy.default_quota.trim(), 10),
        max_private_mounts: Number.parseInt(policy.max_private_mounts.trim(), 10),
        min_mount_sync_interval_minutes: Number.parseInt(policy.min_mount_sync_interval_minutes.trim(), 10),
        max_mount_sync_timeout_secs: Number.parseInt(policy.max_mount_sync_timeout_secs.trim(), 10),
      };
    });

    const readCache = ensureRecord(vfsHub, 'read_cache');
    readCache["enable"] = cacheSection.readEnable;
    readCache["backend"] = cacheSection.readBackend;
    readCache["local_dir"] = cacheSection.readLocalDir;
    readCache["capacity_bytes"] = Number.parseInt(cacheSection.readCapacityBytes, 10) || 134217728;
    readCache["max_file_size_bytes"] = Number.parseInt(cacheSection.readMaxFileSizeBytes, 10) || 2097152;
    readCache["cache_thumbnail_paths"] =
      typeof readCache["cache_thumbnail_paths"] === 'boolean'
        ? readCache["cache_thumbnail_paths"]
        : false;
    readCache["skip_extensions"] = stringArrayOrEmpty(readCache["skip_extensions"]);
    readCache["ttl_secs"] = Number.parseInt(cacheSection.readTtlSecs, 10) || 1800;

    const writeCache = ensureRecord(vfsHub, 'write_cache');
    writeCache["enable"] = cacheSection.writeEnable;
    writeCache["backend"] = cacheSection.writeBackend;
    writeCache["local_dir"] = cacheSection.writeLocalDir;
    writeCache["capacity_bytes"] = Number.parseInt(cacheSection.writeCapacityBytes, 10) || 100663296;
    writeCache["max_file_size_bytes"] = Number.parseInt(cacheSection.writeMaxFileSizeBytes, 10) || 262144;
    writeCache["cache_thumbnail_paths"] =
      typeof writeCache["cache_thumbnail_paths"] === 'boolean'
        ? writeCache["cache_thumbnail_paths"]
        : false;
    writeCache["skip_extensions"] = stringArrayOrEmpty(writeCache["skip_extensions"]);
    writeCache["flush_concurrency"] = Number.parseInt(cacheSection.writeFlushConcurrency, 10) || 2;
    writeCache["flush_interval_ms"] = Number.parseInt(cacheSection.writeFlushIntervalMs, 10) || 30;
    writeCache["flush_deadline_secs"] = Number.parseInt(cacheSection.writeFlushDeadlineSecs, 10) || 360;
    writeCache["abnormal_spill_dir"] =
      typeof writeCache["abnormal_spill_dir"] === 'string'
        ? writeCache["abnormal_spill_dir"]
        : '{RUNTIMEDIR}/cache/vfs-write-abnormal';

    const fileCompress = ensureRecord(vfsHub, 'file_compress');
    fileCompress["enable"] = archiveSection.enable;
    fileCompress["exe_7zip_path"] = archiveSection.exe7zipPath;
    fileCompress["default_compression_format"] = archiveSection.defaultCompressionFormat;
    fileCompress["process_manager_max_concurrency"] = Number.parseInt(archiveSection.maxConcurrency, 10) || 2;
    fileCompress["max_cpu_threads"] = Number.parseInt(archiveSection.maxCpuThreads, 10) || 2;
    fileCompress["timeout_secs"] = Number.parseInt(archiveSection.timeoutSecs, 10) || 300;

    return { ok: true, content: tomlAdapter.stringify(nextConfig) };
  } catch (error) {
    return {
      ok: false,
      reason: 'parse_failed',
      message: error instanceof Error ? error.message : String(error),
    };
  }
};
