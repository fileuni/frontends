import { ensureRecord, isRecord, type ConfigObject } from "@/lib/configObject";

type TomlAdapter = {
  parse: (source: string) => unknown;
  stringify: (value: unknown) => string;
};

type NormalizedContent = {
  content: string;
  changed: boolean;
};

const LOG_DEFAULTS = {
  log_level: "info",
  enable_file_log: false,
  log_file: "{RUNTIMEDIR}/logs/fileuni.log",
  log_max_size: 10485760,
  log_max_files: 10,
  log_compress: true,
  enable_async: false,
  log_template: "{level} {time} {module} {message}\\n",
} as const;

const READ_CACHE_DEFAULTS = {
  enable: false,
  backend: "memory",
  local_dir: "{RUNTIMEDIR}/cache/vfs-read",
  capacity_bytes: 134217728,
  max_file_size_bytes: 2097152,
  cache_thumbnail_paths: false,
  skip_extensions: [] as string[],
  ttl_secs: 1800,
} as const;

const WRITE_CACHE_DEFAULTS = {
  enable: false,
  backend: "local_dir",
  local_dir: "{RUNTIMEDIR}/cache/vfs-write",
  capacity_bytes: 100663296,
  max_file_size_bytes: 262144,
  cache_thumbnail_paths: false,
  skip_extensions: [] as string[],
  flush_concurrency: 2,
  flush_interval_ms: 30,
  flush_deadline_secs: 360,
  abnormal_spill_dir: "{RUNTIMEDIR}/cache/vfs-write-abnormal",
} as const;

const stringArrayOrEmpty = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
};

const assignIfChanged = (
  target: ConfigObject,
  key: string,
  nextValue: unknown,
): boolean => {
  const currentValue = target[key];
  const currentSerialized = JSON.stringify(currentValue);
  const nextSerialized = JSON.stringify(nextValue);
  if (currentSerialized === nextSerialized) {
    return false;
  }
  target[key] = nextValue;
  return true;
};

export const normalizeSystemConfigRequiredSections = (
  source: string,
  tomlAdapter: TomlAdapter,
): NormalizedContent => {
  try {
    const parsed = tomlAdapter.parse(source);
    if (!isRecord(parsed)) {
      return { content: source, changed: false };
    }

    const root = parsed;
    let changed = false;

    const log = ensureRecord(root, "log");
    changed =
      assignIfChanged(
        log,
        "log_level",
        typeof log["log_level"] === "string" && log["log_level"].trim().length > 0
          ? log["log_level"]
          : LOG_DEFAULTS.log_level,
      ) || changed;
    changed =
      assignIfChanged(
        log,
        "enable_file_log",
        typeof log["enable_file_log"] === "boolean"
          ? log["enable_file_log"]
          : LOG_DEFAULTS.enable_file_log,
      ) || changed;
    changed =
      assignIfChanged(
        log,
        "log_file",
        typeof log["log_file"] === "string"
          ? log["log_file"]
          : LOG_DEFAULTS.log_file,
      ) || changed;
    changed =
      assignIfChanged(
        log,
        "log_max_size",
        typeof log["log_max_size"] === "number" && log["log_max_size"] > 0
          ? log["log_max_size"]
          : LOG_DEFAULTS.log_max_size,
      ) || changed;
    changed =
      assignIfChanged(
        log,
        "log_max_files",
        typeof log["log_max_files"] === "number" && log["log_max_files"] > 0
          ? log["log_max_files"]
          : LOG_DEFAULTS.log_max_files,
      ) || changed;
    changed =
      assignIfChanged(
        log,
        "log_compress",
        typeof log["log_compress"] === "boolean"
          ? log["log_compress"]
          : LOG_DEFAULTS.log_compress,
      ) || changed;
    changed =
      assignIfChanged(
        log,
        "enable_async",
        typeof log["enable_async"] === "boolean"
          ? log["enable_async"]
          : LOG_DEFAULTS.enable_async,
      ) || changed;
    changed =
      assignIfChanged(
        log,
        "log_template",
        typeof log["log_template"] === "string" && log["log_template"].length > 0
          ? log["log_template"]
          : LOG_DEFAULTS.log_template,
      ) || changed;

    const vfsHub = ensureRecord(root, "vfs_storage_hub");
    const readCache = ensureRecord(vfsHub, "read_cache");
    const writeCache = ensureRecord(vfsHub, "write_cache");

    changed =
      assignIfChanged(
        readCache,
        "enable",
        typeof readCache["enable"] === "boolean"
          ? readCache["enable"]
          : READ_CACHE_DEFAULTS.enable,
      ) || changed;
    changed =
      assignIfChanged(
        readCache,
        "backend",
        readCache["backend"] === "memory" || readCache["backend"] === "local_dir"
          ? readCache["backend"]
          : READ_CACHE_DEFAULTS.backend,
      ) || changed;
    changed =
      assignIfChanged(
        readCache,
        "local_dir",
        typeof readCache["local_dir"] === "string"
          ? readCache["local_dir"]
          : READ_CACHE_DEFAULTS.local_dir,
      ) || changed;
    changed =
      assignIfChanged(
        readCache,
        "capacity_bytes",
        typeof readCache["capacity_bytes"] === "number" && readCache["capacity_bytes"] > 0
          ? readCache["capacity_bytes"]
          : READ_CACHE_DEFAULTS.capacity_bytes,
      ) || changed;
    changed =
      assignIfChanged(
        readCache,
        "max_file_size_bytes",
        typeof readCache["max_file_size_bytes"] === "number" &&
          readCache["max_file_size_bytes"] > 0
          ? readCache["max_file_size_bytes"]
          : READ_CACHE_DEFAULTS.max_file_size_bytes,
      ) || changed;
    changed =
      assignIfChanged(
        readCache,
        "cache_thumbnail_paths",
        typeof readCache["cache_thumbnail_paths"] === "boolean"
          ? readCache["cache_thumbnail_paths"]
          : READ_CACHE_DEFAULTS.cache_thumbnail_paths,
      ) || changed;
    changed =
      assignIfChanged(
        readCache,
        "skip_extensions",
        stringArrayOrEmpty(readCache["skip_extensions"]),
      ) || changed;
    changed =
      assignIfChanged(
        readCache,
        "ttl_secs",
        typeof readCache["ttl_secs"] === "number" && readCache["ttl_secs"] > 0
          ? readCache["ttl_secs"]
          : READ_CACHE_DEFAULTS.ttl_secs,
      ) || changed;

    changed =
      assignIfChanged(
        writeCache,
        "enable",
        typeof writeCache["enable"] === "boolean"
          ? writeCache["enable"]
          : WRITE_CACHE_DEFAULTS.enable,
      ) || changed;
    changed =
      assignIfChanged(
        writeCache,
        "backend",
        writeCache["backend"] === "memory" || writeCache["backend"] === "local_dir"
          ? writeCache["backend"]
          : WRITE_CACHE_DEFAULTS.backend,
      ) || changed;
    changed =
      assignIfChanged(
        writeCache,
        "local_dir",
        typeof writeCache["local_dir"] === "string"
          ? writeCache["local_dir"]
          : WRITE_CACHE_DEFAULTS.local_dir,
      ) || changed;
    changed =
      assignIfChanged(
        writeCache,
        "capacity_bytes",
        typeof writeCache["capacity_bytes"] === "number" && writeCache["capacity_bytes"] > 0
          ? writeCache["capacity_bytes"]
          : WRITE_CACHE_DEFAULTS.capacity_bytes,
      ) || changed;
    changed =
      assignIfChanged(
        writeCache,
        "max_file_size_bytes",
        typeof writeCache["max_file_size_bytes"] === "number" &&
          writeCache["max_file_size_bytes"] > 0
          ? writeCache["max_file_size_bytes"]
          : WRITE_CACHE_DEFAULTS.max_file_size_bytes,
      ) || changed;
    changed =
      assignIfChanged(
        writeCache,
        "cache_thumbnail_paths",
        typeof writeCache["cache_thumbnail_paths"] === "boolean"
          ? writeCache["cache_thumbnail_paths"]
          : WRITE_CACHE_DEFAULTS.cache_thumbnail_paths,
      ) || changed;
    changed =
      assignIfChanged(
        writeCache,
        "skip_extensions",
        stringArrayOrEmpty(writeCache["skip_extensions"]),
      ) || changed;
    changed =
      assignIfChanged(
        writeCache,
        "flush_concurrency",
        typeof writeCache["flush_concurrency"] === "number" &&
          writeCache["flush_concurrency"] > 0
          ? writeCache["flush_concurrency"]
          : WRITE_CACHE_DEFAULTS.flush_concurrency,
      ) || changed;
    changed =
      assignIfChanged(
        writeCache,
        "flush_interval_ms",
        typeof writeCache["flush_interval_ms"] === "number" &&
          writeCache["flush_interval_ms"] > 0
          ? writeCache["flush_interval_ms"]
          : WRITE_CACHE_DEFAULTS.flush_interval_ms,
      ) || changed;
    changed =
      assignIfChanged(
        writeCache,
        "flush_deadline_secs",
        typeof writeCache["flush_deadline_secs"] === "number" &&
          writeCache["flush_deadline_secs"] > 0
          ? writeCache["flush_deadline_secs"]
          : WRITE_CACHE_DEFAULTS.flush_deadline_secs,
      ) || changed;
    changed =
      assignIfChanged(
        writeCache,
        "abnormal_spill_dir",
        typeof writeCache["abnormal_spill_dir"] === "string"
          ? writeCache["abnormal_spill_dir"]
          : WRITE_CACHE_DEFAULTS.abnormal_spill_dir,
      ) || changed;

    if (!changed) {
      return { content: source, changed: false };
    }
    return {
      content: tomlAdapter.stringify(root),
      changed: true,
    };
  } catch {
    return { content: source, changed: false };
  }
};
