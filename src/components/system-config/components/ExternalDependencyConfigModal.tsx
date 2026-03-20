import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Loader2, Search, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import { useEscapeToCloseTopLayer } from '@/hooks/useEscapeToCloseTopLayer';
import { deepClone, ensureRecord, isRecord } from '@/lib/configObject';
import { useToastStore } from '@/stores/toast';

type TomlAdapter = {
  parse: (source: string) => unknown;
  stringify: (value: unknown) => string;
};

export type ExternalToolDiagnosisItem = {
  tool_id: string;
  group: string;
  display_name: string;
  config_key: string;
  supported: boolean;
  available: boolean;
  current_value?: string | null;
  current_value_works: boolean;
  resolved_path?: string | null;
  suggested_value?: string | null;
  suggestion_source: string;
  candidates: string[];
  message: string;
  recommendation: string;
};

export type ExternalToolDiagnosisResponse = {
  runtime_os: string;
  supported: boolean;
  is_mobile_platform: boolean;
  tools: ExternalToolDiagnosisItem[];
};

type DiagnoseExternalTools = (
  configuredValues: Record<string, string>,
) => Promise<ExternalToolDiagnosisResponse>;

type ThumbnailDraft = {
  vipsPath: string;
  imagemagickPath: string;
  ffmpegPath: string;
  libreofficePath: string;
  videoSeekSeconds: string;
  videoSeekRatio: string;
};

type CompressionDraft = {
  enabled: boolean;
  exe7zPath: string;
};

type ToolInputDescriptor = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

const DEFAULT_THUMBNAIL_DRAFT: ThumbnailDraft = {
  vipsPath: 'vips',
  imagemagickPath: 'convert',
  ffmpegPath: 'ffmpeg',
  libreofficePath: 'soffice',
  videoSeekSeconds: '3',
  videoSeekRatio: '0.3',
};

const DEFAULT_COMPRESSION_DRAFT: CompressionDraft = {
  enabled: true,
  exe7zPath: '7z',
};

const normalizeRuntimeOs = (runtimeOs?: string): string => {
  if (runtimeOs && runtimeOs.trim().length > 0) {
    return runtimeOs.trim().toLowerCase();
  }
  if (typeof navigator === 'undefined') {
    return 'linux';
  }
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = (nav.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent).toLowerCase();
  if (platform.includes('android')) return 'android';
  if (platform.includes('iphone') || platform.includes('ipad') || platform.includes('ios')) return 'ios';
  if (platform.includes('linux')) return 'linux';
  if (platform.includes('win')) return 'windows';
  if (platform.includes('mac') || platform.includes('darwin')) return 'macos';
  if (platform.includes('freebsd')) return 'freebsd';
  return 'linux';
};

const parseThumbnailDraft = (content: string, tomlAdapter: TomlAdapter): ThumbnailDraft => {
  try {
    const parsed = tomlAdapter.parse(content);
    if (!isRecord(parsed)) return DEFAULT_THUMBNAIL_DRAFT;
    const root = parsed;
    const fileManagerApi = isRecord(root.file_manager_api) ? root.file_manager_api : {};
    const thumbnail = isRecord(fileManagerApi.thumbnail) ? fileManagerApi.thumbnail : {};
    const tools = isRecord(thumbnail.tools) ? thumbnail.tools : {};
    const video = isRecord(thumbnail.video) ? thumbnail.video : {};
    const asString = (value: unknown, fallback: string) => typeof value === 'string' ? value : fallback;
    const asNumberString = (value: unknown, fallback: string) => typeof value === 'number' && Number.isFinite(value) ? String(value) : fallback;
    return {
      vipsPath: asString(tools.vips_path, DEFAULT_THUMBNAIL_DRAFT.vipsPath),
      imagemagickPath: asString(tools.imagemagick_path, DEFAULT_THUMBNAIL_DRAFT.imagemagickPath),
      ffmpegPath: asString(tools.ffmpeg_path, DEFAULT_THUMBNAIL_DRAFT.ffmpegPath),
      libreofficePath: asString(tools.libreoffice_path, DEFAULT_THUMBNAIL_DRAFT.libreofficePath),
      videoSeekSeconds: asNumberString(video.seek_seconds, DEFAULT_THUMBNAIL_DRAFT.videoSeekSeconds),
      videoSeekRatio: asNumberString(video.seek_ratio, DEFAULT_THUMBNAIL_DRAFT.videoSeekRatio),
    };
  } catch {
    return DEFAULT_THUMBNAIL_DRAFT;
  }
};

const parseCompressionDraft = (content: string, tomlAdapter: TomlAdapter): CompressionDraft => {
  try {
    const parsed = tomlAdapter.parse(content);
    if (!isRecord(parsed)) return DEFAULT_COMPRESSION_DRAFT;
    const root = parsed;
    const vfsStorageHub = isRecord(root.vfs_storage_hub) ? root.vfs_storage_hub : {};
    const fileCompress = isRecord(vfsStorageHub.file_compress) ? vfsStorageHub.file_compress : {};
    return {
      enabled: typeof fileCompress.enable === 'boolean' ? fileCompress.enable : DEFAULT_COMPRESSION_DRAFT.enabled,
      exe7zPath: typeof fileCompress.exe_7zip_path === 'string' ? fileCompress.exe_7zip_path : DEFAULT_COMPRESSION_DRAFT.exe7zPath,
    };
  } catch {
    return DEFAULT_COMPRESSION_DRAFT;
  }
};

const buildThumbnailConfiguredValues = (draft: ThumbnailDraft): Record<string, string> => ({
  'file_manager_api.thumbnail.tools.vips_path': draft.vipsPath.trim(),
  'file_manager_api.thumbnail.tools.imagemagick_path': draft.imagemagickPath.trim(),
  'file_manager_api.thumbnail.tools.ffmpeg_path': draft.ffmpegPath.trim(),
  'file_manager_api.thumbnail.tools.libreoffice_path': draft.libreofficePath.trim(),
});

const buildCompressionConfiguredValues = (draft: CompressionDraft): Record<string, string> => ({
  'vfs_storage_hub.file_compress.exe_7zip_path': draft.exe7zPath.trim(),
});

const applyThumbnailDraft = (content: string, tomlAdapter: TomlAdapter, draft: ThumbnailDraft): string => {
  const parsed = tomlAdapter.parse(content);
  if (!isRecord(parsed)) {
    throw new Error('TOML root must be an object');
  }
  const next = deepClone(parsed);
  const fileManagerApi = ensureRecord(next, 'file_manager_api');
  const thumbnail = ensureRecord(fileManagerApi, 'thumbnail');
  const tools = ensureRecord(thumbnail, 'tools');
  const video = ensureRecord(thumbnail, 'video');
  tools.vips_path = draft.vipsPath.trim();
  tools.imagemagick_path = draft.imagemagickPath.trim();
  tools.ffmpeg_path = draft.ffmpegPath.trim();
  tools.libreoffice_path = draft.libreofficePath.trim();

  const seekSeconds = Number(draft.videoSeekSeconds);
  const seekRatio = Number(draft.videoSeekRatio);
  if (Number.isFinite(seekSeconds) && seekSeconds > 0) {
    video.seek_seconds = Math.floor(seekSeconds);
  }
  if (Number.isFinite(seekRatio) && seekRatio > 0 && seekRatio <= 1) {
    video.seek_ratio = seekRatio;
  }

  return tomlAdapter.stringify(next);
};

const applyCompressionDraft = (content: string, tomlAdapter: TomlAdapter, draft: CompressionDraft): string => {
  const parsed = tomlAdapter.parse(content);
  if (!isRecord(parsed)) {
    throw new Error('TOML root must be an object');
  }
  const next = deepClone(parsed);
  const vfsStorageHub = ensureRecord(next, 'vfs_storage_hub');
  const fileCompress = ensureRecord(vfsStorageHub, 'file_compress');
  fileCompress.enable = draft.enabled;
  fileCompress.exe_7zip_path = draft.exe7zPath.trim();
  return tomlAdapter.stringify(next);
};

type ModalShellProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

const ModalShell: React.FC<ModalShellProps> = ({ isOpen, onClose, title, subtitle, children, footer }) => {
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === 'dark';

  useEscapeToCloseTopLayer({
    active: isOpen,
    enabled: true,
    onEscape: onClose,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300" role="dialog" aria-modal="true">
      <div
        className={cn(
          'absolute inset-0 backdrop-blur-2xl transition-all duration-300',
          isDark ? 'bg-black/95' : 'bg-slate-900/80',
        )}
        onClick={onClose}
      />

      <div className={cn(
        'relative w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col min-h-0 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]',
        isDark ? 'bg-slate-950 border-white/10 text-slate-100 ring-1 ring-white/5' : 'bg-white border-gray-200 text-slate-900',
      )}>
        <div className={cn(
          'flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-6 shrink-0',
          isDark ? 'border-white/10 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50',
        )}>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black uppercase tracking-widest truncate">{title}</h3>
            <p className={cn('text-xs font-bold mt-1', isDark ? 'text-slate-400' : 'text-slate-500')}>{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'h-8 w-8 rounded-lg border inline-flex items-center justify-center transition-colors shrink-0',
              isDark ? 'border-white/15 text-slate-300 hover:bg-white/10' : 'border-gray-200 text-slate-600 hover:bg-gray-100',
            )}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar p-4 sm:p-6 space-y-6">
          {children}
        </div>

        <div className={cn(
          'shrink-0 border-t px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-end gap-2',
          isDark ? 'border-white/10 bg-slate-900/60' : 'border-slate-100 bg-slate-50/70',
        )}>
          {footer}
        </div>
      </div>
    </div>
  );
};

type ToolCardProps = {
  item: ExternalToolDiagnosisItem;
};

const ToolCard: React.FC<ToolCardProps> = ({ item }) => {
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === 'dark';
  const ok = item.available;

  return (
    <div className={cn(
      'rounded-xl border p-4 space-y-3',
      isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white shadow-sm',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black uppercase tracking-wide">{item.display_name}</div>
          <div className={cn('text-xs font-mono mt-1 break-all', isDark ? 'text-slate-400' : 'text-slate-500')}>
            {item.config_key}
          </div>
        </div>
        <span className={cn(
          'shrink-0 rounded-full border px-2.5 py-1 text-xs font-black uppercase tracking-wide',
          ok
            ? (isDark ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-emerald-300 bg-emerald-50 text-emerald-700')
            : (isDark ? 'border-amber-400/30 bg-amber-500/10 text-amber-200' : 'border-amber-300 bg-amber-50 text-amber-700'),
        )}>
          {ok ? 'OK' : 'Missing'}
        </span>
      </div>

      <div className={cn('text-sm leading-6', isDark ? 'text-slate-200' : 'text-slate-700')}>
        {item.message}
      </div>

      <div className="grid grid-cols-1 gap-2 text-xs">
        <div className={cn('rounded-lg border px-3 py-2', isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50')}>
          <div className={cn('font-black uppercase tracking-wide mb-1', isDark ? 'text-slate-400' : 'text-slate-500')}>Current</div>
          <div className="font-mono break-all">{item.current_value?.trim() ? item.current_value : '-'}</div>
        </div>
        <div className={cn('rounded-lg border px-3 py-2', isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50')}>
          <div className={cn('font-black uppercase tracking-wide mb-1', isDark ? 'text-slate-400' : 'text-slate-500')}>Detected</div>
          <div className="font-mono break-all">{item.resolved_path?.trim() ? item.resolved_path : '-'}</div>
        </div>
      </div>

      {item.candidates.length > 0 && (
        <div>
          <div className={cn('text-[11px] font-black uppercase tracking-wide mb-2', isDark ? 'text-slate-400' : 'text-slate-500')}>Candidates</div>
          <div className="flex flex-wrap gap-2">
            {item.candidates.slice(0, 4).map((candidate) => (
              <span
                key={candidate}
                className={cn(
                  'rounded-lg border px-2 py-1 text-[11px] font-mono break-all',
                  isDark ? 'border-white/10 bg-white/5 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700',
                )}
              >
                {candidate}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={cn('text-xs leading-6', isDark ? 'text-slate-300' : 'text-slate-600')}>
        {item.recommendation}
      </div>
    </div>
  );
};

export interface ThumbnailDependencyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  tomlAdapter: TomlAdapter;
  content: string;
  onContentChange: (value: string) => void;
  runtimeOs?: string;
  onDiagnoseExternalTools?: DiagnoseExternalTools;
}

export const ThumbnailDependencyConfigModal: React.FC<ThumbnailDependencyConfigModalProps> = ({
  isOpen,
  onClose,
  tomlAdapter,
  content,
  onContentChange,
  runtimeOs,
  onDiagnoseExternalTools,
}) => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === 'dark';
  const normalizedRuntimeOs = normalizeRuntimeOs(runtimeOs);
  const isMobileRuntime = normalizedRuntimeOs === 'android' || normalizedRuntimeOs === 'ios';
  const [draft, setDraft] = useState<ThumbnailDraft>(DEFAULT_THUMBNAIL_DRAFT);
  const [diagnosis, setDiagnosis] = useState<ExternalToolDiagnosisResponse | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(parseThumbnailDraft(content, tomlAdapter));
    setDiagnosis(null);
  }, [content, isOpen, tomlAdapter]);

  const toolItems = useMemo(() => diagnosis?.tools.filter((item) => item.group === 'thumbnail') ?? [], [diagnosis]);
  const toolInputs: ToolInputDescriptor[] = [
    { label: 'libvips', value: draft.vipsPath, onChange: (value) => setDraft((state) => ({ ...state, vipsPath: value })), placeholder: 'vips' },
    { label: 'ImageMagick', value: draft.imagemagickPath, onChange: (value) => setDraft((state) => ({ ...state, imagemagickPath: value })), placeholder: 'convert or magick' },
    { label: 'FFmpeg', value: draft.ffmpegPath, onChange: (value) => setDraft((state) => ({ ...state, ffmpegPath: value })), placeholder: 'ffmpeg' },
    { label: 'LibreOffice', value: draft.libreofficePath, onChange: (value) => setDraft((state) => ({ ...state, libreofficePath: value })), placeholder: 'soffice' },
  ];

  const handleDiagnose = async () => {
    if (!onDiagnoseExternalTools || diagnosing) return;
    setDiagnosing(true);
    try {
      const data = await onDiagnoseExternalTools(buildThumbnailConfiguredValues(draft));
      setDiagnosis(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Diagnosis failed';
      addToast(message, 'error');
    } finally {
      setDiagnosing(false);
    }
  };

  const handleAutofill = () => {
    if (!diagnosis?.supported) {
      addToast(t('admin.config.externalTools.mobileDisabled', { defaultValue: 'External desktop tools are not supported on Android or iOS.' }), 'warning');
      return;
    }
    const next = { ...draft };
    let changed = 0;
    for (const item of toolItems) {
      const suggested = item.suggested_value?.trim();
      if (!suggested) continue;
      if (item.tool_id === 'vips' && next.vipsPath !== suggested) {
        next.vipsPath = suggested;
        changed += 1;
      }
      if (item.tool_id === 'imagemagick' && next.imagemagickPath !== suggested) {
        next.imagemagickPath = suggested;
        changed += 1;
      }
      if (item.tool_id === 'ffmpeg' && next.ffmpegPath !== suggested) {
        next.ffmpegPath = suggested;
        changed += 1;
      }
      if (item.tool_id === 'libreoffice' && next.libreofficePath !== suggested) {
        next.libreofficePath = suggested;
        changed += 1;
      }
    }
    setDraft(next);
    addToast(
      changed > 0
        ? t('admin.config.externalTools.autofillSuccess', { defaultValue: 'Detected paths have been filled into the form.' })
        : t('admin.config.externalTools.autofillNoChange', { defaultValue: 'No detected path was available to autofill.' }),
      changed > 0 ? 'success' : 'info',
    );
  };

  const handleApply = () => {
    try {
      const nextContent = applyThumbnailDraft(content, tomlAdapter, draft);
      onContentChange(nextContent);
      addToast(t('admin.config.thumbnail.applied', { defaultValue: 'Thumbnail draft has been written into the editor.' }), 'success');
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to write thumbnail config';
      addToast(message, 'error');
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t('admin.config.thumbnail.title', { defaultValue: 'Thumbnail Tools' })}
      subtitle={t('admin.config.thumbnail.subtitle', { defaultValue: 'Manage desktop thumbnail executables and video capture strategy without editing TOML by hand.' })}
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'h-10 px-4 rounded-xl border text-sm font-black transition-colors',
              isDark ? 'border-white/15 text-slate-300 hover:bg-white/10' : 'border-slate-300 text-slate-700 hover:bg-slate-100',
            )}
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="h-10 px-4 rounded-xl bg-primary text-white text-sm font-black hover:opacity-90"
          >
            {t('common.confirm', { defaultValue: 'Confirm' })}
          </button>
        </>
      )}
    >
      {isMobileRuntime && (
        <div className={cn(
          'rounded-2xl border p-4 flex items-start gap-3',
          isDark ? 'border-amber-500/20 bg-amber-500/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-900',
        )}>
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div className="text-sm leading-6 font-semibold">
            {t('admin.config.externalTools.mobileDisabled', { defaultValue: 'Android and iOS do not support FFmpeg, ImageMagick, LibreOffice, libvips, or 7-Zip as external desktop binaries. Keep these related features disabled in mobile app deployments.' })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={cn('rounded-2xl border p-4 space-y-4', isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50')}>
          {toolInputs.map((input) => (
            <div key={input.label}>
              <label className={cn('text-xs font-black uppercase tracking-wide', isDark ? 'text-slate-400' : 'text-slate-600')}>{input.label}</label>
              <input
                value={input.value}
                onChange={(event) => input.onChange(event.target.value)}
                className={cn(
                  'mt-2 h-11 w-full rounded-xl border px-3 text-sm font-mono',
                  isDark ? 'border-white/10 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
                )}
                placeholder={input.placeholder}
              />
            </div>
          ))}
        </div>

        <div className={cn('rounded-2xl border p-4 space-y-4', isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50')}>
          <div>
            <label className={cn('text-xs font-black uppercase tracking-wide', isDark ? 'text-slate-400' : 'text-slate-600')}>
              {t('admin.config.thumbnail.videoSeekSeconds', { defaultValue: 'Video Seek Seconds' })}
            </label>
            <input
              value={draft.videoSeekSeconds}
              onChange={(event) => setDraft((state) => ({ ...state, videoSeekSeconds: event.target.value }))}
              className={cn(
                'mt-2 h-11 w-full rounded-xl border px-3 text-sm font-mono',
                isDark ? 'border-white/10 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
              )}
              inputMode="numeric"
              placeholder="3"
            />
          </div>
          <div>
            <label className={cn('text-xs font-black uppercase tracking-wide', isDark ? 'text-slate-400' : 'text-slate-600')}>
              {t('admin.config.thumbnail.videoSeekRatio', { defaultValue: 'Video Seek Ratio' })}
            </label>
            <input
              value={draft.videoSeekRatio}
              onChange={(event) => setDraft((state) => ({ ...state, videoSeekRatio: event.target.value }))}
              className={cn(
                'mt-2 h-11 w-full rounded-xl border px-3 text-sm font-mono',
                isDark ? 'border-white/10 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
              )}
              inputMode="decimal"
              placeholder="0.3"
            />
            <div className={cn('mt-2 text-xs leading-6', isDark ? 'text-slate-400' : 'text-slate-600')}>
              {t('admin.config.thumbnail.videoSeekHint', { defaultValue: 'If ratio is set, it overrides seek seconds. Recommended default is 0.3 so thumbnails avoid black opening frames.' })}
            </div>
          </div>
          <div className={cn('rounded-xl border p-3 text-sm leading-6', isDark ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-100' : 'border-cyan-200 bg-cyan-50 text-cyan-900')}>
            {t('admin.config.thumbnail.helper', { defaultValue: 'Run diagnosis after editing the paths. The result explains whether each executable really starts, not just whether the file exists.' })}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleDiagnose()}
              disabled={!onDiagnoseExternalTools || diagnosing || isMobileRuntime}
              className={cn(
                'h-10 px-4 rounded-xl border text-sm font-black inline-flex items-center gap-2 disabled:opacity-50',
                isDark ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15' : 'border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100',
              )}
            >
              {diagnosing ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {t('admin.config.externalTools.diagnose', { defaultValue: 'Diagnose' })}
            </button>
            <button
              type="button"
              onClick={handleAutofill}
              disabled={!diagnosis || diagnosing || isMobileRuntime}
              className={cn(
                'h-10 px-4 rounded-xl border text-sm font-black inline-flex items-center gap-2 disabled:opacity-50',
                isDark ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15' : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
              )}
            >
              <Sparkles size={16} />
              {t('admin.config.externalTools.autofill', { defaultValue: 'Auto Fill' })}
            </button>
          </div>
        </div>
      </div>

      {toolItems.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {toolItems.map((item) => <ToolCard key={item.tool_id} item={item} />)}
        </div>
      )}
    </ModalShell>
  );
};

export interface CompressionDependencyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  tomlAdapter: TomlAdapter;
  content: string;
  onContentChange: (value: string) => void;
  runtimeOs?: string;
  onDiagnoseExternalTools?: DiagnoseExternalTools;
}

export const CompressionDependencyConfigModal: React.FC<CompressionDependencyConfigModalProps> = ({
  isOpen,
  onClose,
  tomlAdapter,
  content,
  onContentChange,
  runtimeOs,
  onDiagnoseExternalTools,
}) => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === 'dark';
  const normalizedRuntimeOs = normalizeRuntimeOs(runtimeOs);
  const isMobileRuntime = normalizedRuntimeOs === 'android' || normalizedRuntimeOs === 'ios';
  const [draft, setDraft] = useState<CompressionDraft>(DEFAULT_COMPRESSION_DRAFT);
  const [diagnosis, setDiagnosis] = useState<ExternalToolDiagnosisResponse | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(parseCompressionDraft(content, tomlAdapter));
    setDiagnosis(null);
  }, [content, isOpen, tomlAdapter]);

  const toolItem = useMemo(
    () => diagnosis?.tools.find((item) => item.group === 'compression' && item.tool_id === '7z') ?? null,
    [diagnosis],
  );

  const handleDiagnose = async () => {
    if (!onDiagnoseExternalTools || diagnosing) return;
    setDiagnosing(true);
    try {
      const data = await onDiagnoseExternalTools(buildCompressionConfiguredValues(draft));
      setDiagnosis(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Diagnosis failed';
      addToast(message, 'error');
    } finally {
      setDiagnosing(false);
    }
  };

  const handleAutofill = () => {
    const suggested = toolItem?.suggested_value?.trim();
    if (!suggested) {
      addToast(t('admin.config.externalTools.autofillNoChange', { defaultValue: 'No detected path was available to autofill.' }), 'info');
      return;
    }
    setDraft((state) => ({ ...state, exe7zPath: suggested }));
    addToast(t('admin.config.externalTools.autofillSuccess', { defaultValue: 'Detected paths have been filled into the form.' }), 'success');
  };

  const handleApply = () => {
    try {
      const nextContent = applyCompressionDraft(content, tomlAdapter, draft);
      onContentChange(nextContent);
      addToast(t('admin.config.compression.applied', { defaultValue: 'Compression draft has been written into the editor.' }), 'success');
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to write compression config';
      addToast(message, 'error');
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t('admin.config.compression.title', { defaultValue: 'Online Compression' })}
      subtitle={t('admin.config.compression.subtitle', { defaultValue: 'Configure the 7-Zip dependency used for archive formats, extraction, and archive browsing.' })}
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'h-10 px-4 rounded-xl border text-sm font-black transition-colors',
              isDark ? 'border-white/15 text-slate-300 hover:bg-white/10' : 'border-slate-300 text-slate-700 hover:bg-slate-100',
            )}
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="h-10 px-4 rounded-xl bg-primary text-white text-sm font-black hover:opacity-90"
          >
            {t('common.confirm', { defaultValue: 'Confirm' })}
          </button>
        </>
      )}
    >
      {isMobileRuntime && (
        <div className={cn(
          'rounded-2xl border p-4 flex items-start gap-3',
          isDark ? 'border-amber-500/20 bg-amber-500/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-900',
        )}>
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div className="text-sm leading-6 font-semibold">
            {t('admin.config.externalTools.mobileDisabled', { defaultValue: 'Android and iOS do not support FFmpeg, ImageMagick, LibreOffice, libvips, or 7-Zip as external desktop binaries. Keep these related features disabled in mobile app deployments.' })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
        <div className={cn('rounded-2xl border p-4 space-y-4', isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50')}>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300"
              checked={draft.enabled}
              onChange={(event) => setDraft((state) => ({ ...state, enabled: event.target.checked }))}
            />
            <div>
              <div className="text-sm font-black uppercase tracking-wide">
                {t('admin.config.compression.enable', { defaultValue: 'Enable Online Compression' })}
              </div>
              <div className={cn('text-sm mt-1 leading-6', isDark ? 'text-slate-400' : 'text-slate-600')}>
                {t('admin.config.compression.enableHint', { defaultValue: 'When enabled, FileUni can create archives, extract more formats, and browse supported archives. Without 7-Zip, support falls back to native ZIP/TAR only.' })}
              </div>
            </div>
          </label>

          <div>
            <label className={cn('text-xs font-black uppercase tracking-wide', isDark ? 'text-slate-400' : 'text-slate-600')}>7-Zip</label>
            <input
              value={draft.exe7zPath}
              onChange={(event) => setDraft((state) => ({ ...state, exe7zPath: event.target.value }))}
              className={cn(
                'mt-2 h-11 w-full rounded-xl border px-3 text-sm font-mono',
                isDark ? 'border-white/10 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
              )}
              placeholder="7z"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleDiagnose()}
              disabled={!onDiagnoseExternalTools || diagnosing || isMobileRuntime}
              className={cn(
                'h-10 px-4 rounded-xl border text-sm font-black inline-flex items-center gap-2 disabled:opacity-50',
                isDark ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15' : 'border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100',
              )}
            >
              {diagnosing ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              {t('admin.config.externalTools.diagnose', { defaultValue: 'Diagnose' })}
            </button>
            <button
              type="button"
              onClick={handleAutofill}
              disabled={!toolItem || diagnosing || isMobileRuntime}
              className={cn(
                'h-10 px-4 rounded-xl border text-sm font-black inline-flex items-center gap-2 disabled:opacity-50',
                isDark ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15' : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
              )}
            >
              <Sparkles size={16} />
              {t('admin.config.externalTools.autofill', { defaultValue: 'Auto Fill' })}
            </button>
          </div>
        </div>

        <div className={cn('rounded-2xl border p-4 space-y-4', isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50')}>
          <div className={cn('rounded-xl border p-4 flex items-start gap-3', isDark ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-100' : 'border-indigo-200 bg-indigo-50 text-indigo-900')}>
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <div className="text-sm leading-6">
              {t('admin.config.compression.helper', { defaultValue: 'Recommended flow: keep online compression enabled on desktop deployments, run diagnosis, autofill the detected 7-Zip path, then Save & Reload in the main editor.' })}
            </div>
          </div>
          {!draft.enabled && (
            <div className={cn('rounded-xl border p-4 flex items-start gap-3', isDark ? 'border-amber-500/20 bg-amber-500/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-900')}>
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div className="text-sm leading-6">
                {t('admin.config.compression.disabledHint', { defaultValue: 'Compression is currently disabled in the draft. Users will not see the archive actions until you enable it and save the config.' })}
              </div>
            </div>
          )}
        </div>
      </div>

      {toolItem && <ToolCard item={toolItem} />}
    </ModalShell>
  );
};
