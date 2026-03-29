import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { PasswordInput } from "@/components/common/PasswordInput";
import type {
  CompressionDraft,
  ThumbnailDraft,
  ThumbnailImageBackend,
  TomlAdapter,
} from "./ExternalDependencyConfigModal";
import { SettingSegmentedControl } from "./SettingSegmentedControl";
import {
  applyCompressionDraft,
  applyThumbnailDraft,
  parseCompressionDraft,
  parseThumbnailDraft,
} from "./ExternalDependencyConfigModal";
import { useConfigDraftBinding } from "./useConfigDraftBinding";

interface BaseProps {
  tomlAdapter: TomlAdapter;
  content: string;
  onContentChange: (value: string) => void;
}

export const ThumbnailInlinePanel: React.FC<BaseProps> = ({
  tomlAdapter,
  content,
  onContentChange,
}) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const createDraft = useCallback(
    (source: string) => parseThumbnailDraft(source, tomlAdapter),
    [tomlAdapter],
  );
  const buildContent = useCallback(
    (source: string, nextDraft: ThumbnailDraft) => {
      return applyThumbnailDraft(source, tomlAdapter, nextDraft);
    },
    [tomlAdapter],
  );
  const { draft, setDraft } = useConfigDraftBinding<ThumbnailDraft>({
    content,
    onContentChange,
    createDraft,
    buildContent,
  });

  const inputClass = cn(
    "mt-2 h-11 w-full rounded-xl border px-3 text-sm font-mono",
    isDark
      ? "border-white/10 bg-black/30 text-white"
      : "border-slate-300 bg-white text-slate-900",
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div
        className={cn(
          "rounded-2xl border p-4 space-y-4",
          isDark
            ? "border-white/10 bg-white/[0.03]"
            : "border-slate-200 bg-white",
        )}
      >
        <div>
          <div
            className={cn(
              "text-xs font-black uppercase tracking-wide",
              isDark ? "text-slate-400" : "text-slate-700",
            )}
          >
            {t("admin.config.thumbnail.imageBackend")}
          </div>
          <div className="mt-2">
            <SettingSegmentedControl<ThumbnailImageBackend>
              value={draft.imageBackend}
              options={[
                {
                  value: "builtin",
                  label: t("admin.config.thumbnail.imageBackendBuiltin"),
                },
                {
                  value: "external",
                  label: t("admin.config.thumbnail.imageBackendExternal"),
                },
              ]}
              onChange={(value) =>
                setDraft((prev) => ({ ...prev, imageBackend: value }))
              }
              className="w-full justify-between"
              buttonClassName="flex-1"
            />
          </div>
          <div
            className={cn(
              "mt-2 text-xs leading-6",
              isDark ? "text-slate-400" : "text-slate-600",
            )}
          >
            {t("admin.config.thumbnail.imageBackendHint")}
          </div>
        </div>

        {[
          [
            "admin.config.thumbnail.vipsPath",
            draft.vipsPath,
            (value: string) =>
              setDraft((prev) => ({ ...prev, vipsPath: value })),
            "vips",
          ],
          [
            "admin.config.thumbnail.imagemagickPath",
            draft.imagemagickPath,
            (value: string) =>
              setDraft((prev) => ({ ...prev, imagemagickPath: value })),
            "convert",
          ],
          [
            "admin.config.thumbnail.ffmpegPath",
            draft.ffmpegPath,
            (value: string) =>
              setDraft((prev) => ({ ...prev, ffmpegPath: value })),
            "ffmpeg",
          ],
          [
            "admin.config.thumbnail.libreofficePath",
            draft.libreofficePath,
            (value: string) =>
              setDraft((prev) => ({ ...prev, libreofficePath: value })),
            "soffice",
          ],
        ].map(([label, value, onChange, placeholder]) => (
          <div key={String(label)}>
            <div
              className={cn(
                "text-xs font-black uppercase tracking-wide",
                isDark ? "text-slate-400" : "text-slate-700",
              )}
            >
              {t(String(label))}
            </div>
            <input
              value={String(value)}
              onChange={(event) =>
                (onChange as (value: string) => void)(event.target.value)
              }
              className={inputClass}
              placeholder={String(placeholder)}
            />
          </div>
        ))}
      </div>

      <div
        className={cn(
          "rounded-2xl border p-4 space-y-4",
          isDark
            ? "border-white/10 bg-white/[0.03]"
            : "border-slate-200 bg-white",
        )}
      >
        <div>
          <div
            className={cn(
              "text-xs font-black uppercase tracking-wide",
              isDark ? "text-slate-400" : "text-slate-600",
            )}
          >
            {t("admin.config.thumbnail.videoSeekSeconds")}
          </div>
          <input
            value={draft.videoSeekSeconds}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                videoSeekSeconds: event.target.value,
              }))
            }
            className={inputClass}
            inputMode="numeric"
            placeholder="3"
          />
        </div>
        <div>
          <div
            className={cn(
              "text-xs font-black uppercase tracking-wide",
              isDark ? "text-slate-400" : "text-slate-600",
            )}
          >
            {t("admin.config.thumbnail.videoSeekRatio")}
          </div>
          <input
            value={draft.videoSeekRatio}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                videoSeekRatio: event.target.value,
              }))
            }
            className={inputClass}
            inputMode="decimal"
            placeholder="0.3"
          />
        </div>
        <div
          className={cn(
            "rounded-xl border p-3 text-sm leading-6",
            isDark
              ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-100"
              : "border-cyan-200 bg-cyan-50 text-cyan-900",
          )}
        >
          {t("admin.config.thumbnail.helper")}
        </div>
      </div>
    </div>
  );
};

export const CompressionInlinePanel: React.FC<BaseProps> = ({
  tomlAdapter,
  content,
  onContentChange,
}) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const createDraft = useCallback(
    (source: string) => parseCompressionDraft(source, tomlAdapter),
    [tomlAdapter],
  );
  const buildContent = useCallback(
    (source: string, nextDraft: CompressionDraft) => {
      return applyCompressionDraft(source, tomlAdapter, nextDraft);
    },
    [tomlAdapter],
  );
  const { draft, setDraft } = useConfigDraftBinding<CompressionDraft>({
    content,
    onContentChange,
    createDraft,
    buildContent,
  });

  const inputClass = cn(
    "mt-2 h-11 w-full rounded-xl border px-3 text-sm font-mono",
    isDark
      ? "border-white/10 bg-black/30 text-white"
      : "border-slate-300 bg-white text-slate-900",
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div
        className={cn(
          "rounded-2xl border p-4 space-y-4",
          isDark
            ? "border-white/10 bg-white/[0.03]"
            : "border-slate-200 bg-white",
        )}
      >
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-slate-300"
            checked={draft.enabled}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, enabled: event.target.checked }))
            }
          />
          <div>
            <div className="text-sm font-black uppercase tracking-wide">
              {t("admin.config.compression.enable")}
            </div>
            <div
              className={cn(
                "text-sm mt-1 leading-6",
                isDark ? "text-slate-400" : "text-slate-700",
              )}
            >
              {t("admin.config.compression.enableHint")}
            </div>
          </div>
        </label>
        <div>
          <div
            className={cn(
              "text-xs font-black uppercase tracking-wide",
              isDark ? "text-slate-400" : "text-slate-600",
            )}
          >
            7-Zip
          </div>
          <input
            value={draft.exe7zPath}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, exe7zPath: event.target.value }))
            }
            className={inputClass}
            placeholder="7z"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <div
              className={cn(
                "text-xs font-black uppercase tracking-wide",
                isDark ? "text-slate-400" : "text-slate-600",
              )}
            >
              Format
            </div>
            <input
              value={draft.defaultCompressionFormat}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  defaultCompressionFormat: event.target.value,
                }))
              }
              className={inputClass}
              placeholder="zip"
            />
          </div>
          <div>
            <div
              className={cn(
                "text-xs font-black uppercase tracking-wide",
                isDark ? "text-slate-400" : "text-slate-600",
              )}
            >
              Concurrency
            </div>
            <input
              value={draft.maxConcurrency}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  maxConcurrency: event.target.value,
                }))
              }
              className={inputClass}
              placeholder="2"
            />
          </div>
          <div>
            <div
              className={cn(
                "text-xs font-black uppercase tracking-wide",
                isDark ? "text-slate-400" : "text-slate-600",
              )}
            >
              CPU Threads
            </div>
            <input
              value={draft.maxCpuThreads}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  maxCpuThreads: event.target.value,
                }))
              }
              className={inputClass}
              placeholder="2"
            />
          </div>
        </div>
      </div>
      <div
        className={cn(
          "rounded-2xl border p-4 space-y-4",
          isDark
            ? "border-white/10 bg-white/[0.03]"
            : "border-slate-200 bg-white",
        )}
      >
        <div
          className={cn(
            "text-sm leading-6",
            isDark ? "text-slate-300" : "text-slate-700",
          )}
        >
          {t("admin.config.compression.disabledHint")}
        </div>
      </div>
    </div>
  );
};

interface AdminPasswordInlinePanelProps {
  value: string;
  onValueChange: (password: string) => void;
  hint?: string;
  minPasswordLength?: number;
}

export const AdminPasswordInlinePanel: React.FC<
  AdminPasswordInlinePanelProps
> = ({ value, onValueChange, hint, minPasswordLength = 8 }) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const trimmedPassword = value.trim();
  const showLengthError =
    trimmedPassword.length > 0 && trimmedPassword.length < minPasswordLength;

  return (
    <div>
      <div
        className={cn(
          "text-xs font-black uppercase tracking-wide",
          isDark ? "text-slate-400" : "text-slate-600",
        )}
      >
        {t("systemConfig.setup.admin.password")}
      </div>
      <PasswordInput
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        inputClassName={cn(
          "mt-2 h-11 w-full rounded-xl border px-3 text-sm",
          isDark
            ? "border-white/10 bg-black/30 text-white"
            : "border-slate-300 bg-white text-slate-900",
        )}
        placeholder={t("systemConfig.setup.admin.password")}
      />
      {showLengthError && (
        <div className="mt-2 text-xs leading-6 text-destructive">
          {t([
            "systemConfig.setup.admin.passwordTooShort",
            "launcher.messages.password_too_short",
          ])}
        </div>
      )}
      {hint && (
        <div className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
          {hint}
        </div>
      )}
    </div>
  );
};

type CacheAccelerationDraft = {
  readEnable: boolean;
  readBackend: "memory" | "local_dir";
  readLocalDir: string;
  readCapacityBytes: string;
  readMaxFileSizeBytes: string;
  readTtlSecs: string;
  writeEnable: boolean;
  writeBackend: "memory" | "local_dir";
  writeLocalDir: string;
  writeCapacityBytes: string;
  writeMaxFileSizeBytes: string;
  writeFlushConcurrency: string;
  writeFlushIntervalMs: string;
  writeFlushDeadlineSecs: string;
};

const InlineSegmentCard: React.FC<{
  isDark: boolean;
  title: string;
  subtitle?: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}> = ({ isDark, title, subtitle, value, options, onChange }) => (
  <div
    className={cn(
      "rounded-xl border px-3 py-3",
      isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-slate-50",
    )}
  >
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div
          className={cn(
            "text-sm font-black",
            isDark ? "text-slate-100" : "text-slate-900",
          )}
        >
          {title}
        </div>
        {subtitle && (
          <div
            className={cn(
              "mt-1 text-xs leading-5",
              isDark ? "text-slate-400" : "text-slate-500",
            )}
          >
            {subtitle}
          </div>
        )}
      </div>
      <SettingSegmentedControl
        value={value}
        options={options}
        onChange={onChange}
      />
    </div>
  </div>
);

export const CacheAccelerationInlinePanel: React.FC<BaseProps> = ({
  tomlAdapter,
  content,
  onContentChange,
}) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";
  const createDraft = useCallback(
    (source: string): CacheAccelerationDraft => {
      const root = tomlAdapter.parse(source) as Record<string, any>;
      const hub = root?.vfs_storage_hub ?? {};
      const readCache = hub.read_cache ?? {};
      const writeCache = hub.write_cache ?? {};
      return {
        readEnable: Boolean(readCache.enable),
        readBackend: readCache.backend === "local_dir" ? "local_dir" : "memory",
        readLocalDir: readCache.local_dir ?? "{RUNTIMEDIR}/cache/vfs-read",
        readCapacityBytes: String(readCache.capacity_bytes ?? 134217728),
        readMaxFileSizeBytes: String(readCache.max_file_size_bytes ?? 2097152),
        readTtlSecs: String(readCache.ttl_secs ?? 1800),
        writeEnable: Boolean(writeCache.enable),
        writeBackend: writeCache.backend === "memory" ? "memory" : "local_dir",
        writeLocalDir: writeCache.local_dir ?? "{RUNTIMEDIR}/cache/vfs-write",
        writeCapacityBytes: String(writeCache.capacity_bytes ?? 100663296),
        writeMaxFileSizeBytes: String(writeCache.max_file_size_bytes ?? 262144),
        writeFlushConcurrency: String(writeCache.flush_concurrency ?? 2),
        writeFlushIntervalMs: String(writeCache.flush_interval_ms ?? 30),
        writeFlushDeadlineSecs: String(writeCache.flush_deadline_secs ?? 360),
      };
    },
    [tomlAdapter],
  );

  const buildContent = useCallback(
    (source: string, next: CacheAccelerationDraft) => {
      const root = tomlAdapter.parse(source) as Record<string, any>;
      const hub = root.vfs_storage_hub ?? {};
      root.vfs_storage_hub = hub;
      hub.read_cache = {
        enable: next.readEnable,
        backend: next.readBackend,
        local_dir: next.readLocalDir,
        capacity_bytes:
          Number.parseInt(next.readCapacityBytes, 10) || 134217728,
        max_file_size_bytes:
          Number.parseInt(next.readMaxFileSizeBytes, 10) || 2097152,
        ttl_secs: Number.parseInt(next.readTtlSecs, 10) || 1800,
      };
      hub.write_cache = {
        enable: next.writeEnable,
        backend: next.writeBackend,
        local_dir: next.writeLocalDir,
        capacity_bytes:
          Number.parseInt(next.writeCapacityBytes, 10) || 100663296,
        max_file_size_bytes:
          Number.parseInt(next.writeMaxFileSizeBytes, 10) || 262144,
        flush_concurrency: Number.parseInt(next.writeFlushConcurrency, 10) || 2,
        flush_interval_ms: Number.parseInt(next.writeFlushIntervalMs, 10) || 30,
        flush_deadline_secs:
          Number.parseInt(next.writeFlushDeadlineSecs, 10) || 360,
      };
      return tomlAdapter.stringify(root);
    },
    [tomlAdapter],
  );

  const { draft, setDraft } = useConfigDraftBinding<CacheAccelerationDraft>({
    content,
    onContentChange,
    createDraft,
    buildContent,
  });

  const inputClass = cn(
    "mt-1 h-11 w-full rounded-xl border px-3 text-sm font-mono",
    isDark
      ? "border-white/10 bg-black/30 text-white"
      : "border-slate-300 bg-white text-slate-900",
  );
  const backendOptions = [
    { value: "memory", label: t("admin.config.storage.cache.backends.memory") },
    {
      value: "local_dir",
      label: t("admin.config.storage.cache.backends.localDir"),
    },
  ] as const;
  const enableOptions = [
    { value: "enabled", label: t("common.enabled") },
    { value: "disabled", label: t("common.disabled") },
  ] as const;
  const patch = (
    updater: (prev: CacheAccelerationDraft) => CacheAccelerationDraft,
  ) => {
    setDraft((prev) => updater(prev));
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div
        className={cn(
          "rounded-2xl border p-4 space-y-3",
          isDark
            ? "border-white/10 bg-white/[0.03]"
            : "border-slate-200 bg-white",
        )}
      >
        <div className="text-sm font-black">
          {t("admin.config.storage.cache.read")}
        </div>
        <InlineSegmentCard
          isDark={isDark}
          title={t("admin.config.storage.cache.enable")}
          subtitle={
            draft.readEnable ? t("common.enabled") : t("common.disabled")
          }
          value={draft.readEnable ? "enabled" : "disabled"}
          options={[...enableOptions]}
          onChange={(value) =>
            patch((prev) => ({ ...prev, readEnable: value === "enabled" }))
          }
        />
        <InlineSegmentCard
          isDark={isDark}
          title={t("admin.config.storage.cache.backend")}
          subtitle={
            draft.readBackend === "local_dir"
              ? t("admin.config.storage.cache.backends.localDir")
              : t("admin.config.storage.cache.backends.memory")
          }
          value={draft.readBackend}
          options={[...backendOptions]}
          onChange={(value) =>
            patch((prev) => ({
              ...prev,
              readBackend: value as "memory" | "local_dir",
            }))
          }
        />
        {draft.readBackend === "local_dir" && (
          <input
            className={inputClass}
            value={draft.readLocalDir}
            onChange={(e) =>
              patch((prev) => ({ ...prev, readLocalDir: e.target.value }))
            }
            placeholder={t("admin.config.storage.cache.localDir")}
          />
        )}
        <input
          className={inputClass}
          value={draft.readCapacityBytes}
          onChange={(e) =>
            patch((prev) => ({ ...prev, readCapacityBytes: e.target.value }))
          }
          placeholder={t("admin.config.storage.cache.capacityBytes")}
        />
        <input
          className={inputClass}
          value={draft.readMaxFileSizeBytes}
          onChange={(e) =>
            patch((prev) => ({ ...prev, readMaxFileSizeBytes: e.target.value }))
          }
          placeholder={t("admin.config.storage.cache.maxFileSizeBytes")}
        />
      </div>
      <div
        className={cn(
          "rounded-2xl border p-4 space-y-3",
          isDark
            ? "border-white/10 bg-white/[0.03]"
            : "border-slate-200 bg-white",
        )}
      >
        <div className="text-sm font-black">
          {t("admin.config.storage.cache.write")}
        </div>
        {draft.writeEnable && (
          <div
            className={cn(
              "rounded-xl border p-3 text-sm leading-6",
              isDark
                ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                : "border-rose-200 bg-rose-50 text-rose-900",
            )}
          >
            {t("systemConfig.setup.storageCache.writeRisk")}
          </div>
        )}
        <InlineSegmentCard
          isDark={isDark}
          title={t("admin.config.storage.cache.enable")}
          subtitle={
            draft.writeEnable ? t("common.enabled") : t("common.disabled")
          }
          value={draft.writeEnable ? "enabled" : "disabled"}
          options={[...enableOptions]}
          onChange={(value) =>
            patch((prev) => ({ ...prev, writeEnable: value === "enabled" }))
          }
        />
        <InlineSegmentCard
          isDark={isDark}
          title={t("admin.config.storage.cache.backend")}
          subtitle={
            draft.writeBackend === "local_dir"
              ? t("admin.config.storage.cache.backends.localDir")
              : t("admin.config.storage.cache.backends.memory")
          }
          value={draft.writeBackend}
          options={[...backendOptions]}
          onChange={(value) =>
            patch((prev) => ({
              ...prev,
              writeBackend: value as "memory" | "local_dir",
            }))
          }
        />
        {draft.writeBackend === "local_dir" && (
          <input
            className={inputClass}
            value={draft.writeLocalDir}
            onChange={(e) =>
              patch((prev) => ({ ...prev, writeLocalDir: e.target.value }))
            }
            placeholder={t("admin.config.storage.cache.localDir")}
          />
        )}
        <input
          className={inputClass}
          value={draft.writeCapacityBytes}
          onChange={(e) =>
            patch((prev) => ({ ...prev, writeCapacityBytes: e.target.value }))
          }
          placeholder={t("admin.config.storage.cache.capacityBytes")}
        />
        <input
          className={inputClass}
          value={draft.writeFlushConcurrency}
          onChange={(e) =>
            patch((prev) => ({
              ...prev,
              writeFlushConcurrency: e.target.value,
            }))
          }
          placeholder={t("admin.config.storage.cache.flushConcurrency")}
        />
      </div>
    </div>
  );
};
