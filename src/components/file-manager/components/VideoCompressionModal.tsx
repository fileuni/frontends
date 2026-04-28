import { useEffect, useMemo, useRef, useState, type ComponentPropsWithoutRef } from 'react';
import { GlassModalShell } from '@fileuni/ts-shared/modal-shell';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Switch } from '@/components/ui/Switch.tsx';
import { useTranslation } from 'react-i18next';
import { Clapperboard, X } from 'lucide-react';

type VideoCodec = 'h264' | 'hevc' | 'av1';
type OutputContainer = 'mp4' | 'mkv';
type ResolutionPreset = '1080p' | '720p' | '480p' | '360p';
type MaxFps = 60 | 30 | 24;
type SubmitEvent = Parameters<NonNullable<ComponentPropsWithoutRef<'form'>['onSubmit']>>[0];

export interface VideoCompressionSubmitPayload {
  paths: string[];
  includeSubdirectories: boolean;
  outputContainer: OutputContainer;
  videoCodec: VideoCodec;
  profile?: string;
  crf: number;
  maxWidth: number;
  maxHeight: number;
  maxFps: MaxFps;
  outputSuffix: string;
  deleteSource: boolean;
  overwriteExisting: boolean;
}

interface Props {
  isOpen: boolean;
  paths: string[];
  hasDirectories: boolean;
  onClose: () => void;
  onSubmit: (payload: VideoCompressionSubmitPayload) => Promise<void>;
}

const CODEC_PROFILE_OPTIONS: Record<VideoCodec, Array<{ value: string; label: string }>> = {
  h264: [
    { value: 'baseline', label: 'Baseline' },
    { value: 'main', label: 'Main' },
    { value: 'high', label: 'High' },
  ],
  hevc: [
    { value: 'main', label: 'Main' },
    { value: 'main10', label: 'Main 10' },
  ],
  av1: [
    { value: 'main', label: 'Main' },
    { value: 'high', label: 'High' },
    { value: 'professional', label: 'Professional' },
  ],
};

const RESOLUTION_PRESETS: Record<ResolutionPreset, { width: number; height: number }> = {
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 },
  '360p': { width: 640, height: 360 },
};

export function VideoCompressionModal({
  isOpen,
  paths,
  hasDirectories,
  onClose,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const [videoCodec, setVideoCodec] = useState<VideoCodec>('h264');
  const [profile, setProfile] = useState('high');
  const [outputContainer, setOutputContainer] = useState<OutputContainer>('mp4');
  const [resolutionPreset, setResolutionPreset] = useState<ResolutionPreset>('720p');
  const [maxFps, setMaxFps] = useState<MaxFps>(30);
  const [crf, setCrf] = useState(28);
  const [outputSuffix, setOutputSuffix] = useState('_compressed');
  const [includeSubdirectories, setIncludeSubdirectories] = useState(true);
  const [deleteSource, setDeleteSource] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const suffixRef = useRef<HTMLInputElement>(null);

  const profileOptions = useMemo(() => CODEC_PROFILE_OPTIONS[videoCodec], [videoCodec]);

  useEffect(() => {
    if (!isOpen) return;
    setVideoCodec('h264');
    setProfile('high');
    setOutputContainer('mp4');
    setResolutionPreset('720p');
    setMaxFps(30);
    setCrf(28);
    setOutputSuffix('_compressed');
    setIncludeSubdirectories(true);
    setDeleteSource(false);
    setOverwriteExisting(false);
    setError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    suffixRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const firstProfile = profileOptions[0]?.value;
    if (!firstProfile) return;
    if (!profileOptions.some((option) => option.value === profile)) {
      setProfile(firstProfile);
    }
  }, [profile, profileOptions]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (paths.length === 0) return;

    setSubmitting(true);
    setError(null);
    try {
      const preset = RESOLUTION_PRESETS[resolutionPreset];
      const safeCrf = Number.isFinite(crf) ? Math.min(63, Math.max(0, crf)) : 28;
      await onSubmit({
        paths,
        includeSubdirectories,
        outputContainer,
        videoCodec,
        profile,
        crf: safeCrf,
        maxWidth: preset.width,
        maxHeight: preset.height,
        maxFps,
        outputSuffix: outputSuffix.trim() || '_compressed',
        deleteSource,
        overwriteExisting,
      });
    } catch (submitError: unknown) {
      if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError(String(submitError));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectionHint = hasDirectories
    ? (t('filemanager.videoCompress.directoryHint') || 'Search video files in the selected directories and compress them one by one.')
    : paths.length > 1
      ? (t('filemanager.videoCompress.multiHint', { count: paths.length }) || `Compress ${paths.length} selected video files with the same preset.`)
      : (t('filemanager.videoCompress.singleHint') || 'Compress the selected video file into a smaller and more compatible format.');

  return (
    <GlassModalShell
      title={t('filemanager.videoCompress.title') || 'Video Compression'}
      subtitle={t('filemanager.videoCompress.subtitle') || 'Create a smaller video copy'}
      icon={<Clapperboard size={24} />}
      onClose={onClose}
      compact="all"
      maxWidthClassName="max-w-xl"
      closeButton={(
        <Button variant="ghost" size="sm" onClick={onClose} className="h-12 w-12 rounded-2xl p-0 hover:bg-white/5 shrink-0">
          <X size={24} className="opacity-40" />
        </Button>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-bold text-red-500">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm opacity-80">
          {selectionHint}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="text-sm font-black opacity-60">
              {t('filemanager.videoCompress.codec') || 'Codec'}
            </div>
            <select
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground"
              value={videoCodec}
              onChange={(event) => setVideoCodec(event.target.value as VideoCodec)}
            >
              <option value="h264">H.264 / AVC</option>
              <option value="hevc">H.265 / HEVC</option>
              <option value="av1">AV1</option>
            </select>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-black opacity-60">
              {t('filemanager.videoCompress.container') || 'Container'}
            </div>
            <select
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground"
              value={outputContainer}
              onChange={(event) => setOutputContainer(event.target.value as OutputContainer)}
            >
              <option value="mp4">MP4</option>
              <option value="mkv">MKV</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="text-sm font-black opacity-60">
              {t('filemanager.videoCompress.profile') || 'Profile'}
            </div>
            <select
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground"
              value={profile}
              onChange={(event) => setProfile(event.target.value)}
            >
              {profileOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-black opacity-60">
              {t('filemanager.videoCompress.resolution') || 'Resolution'}
            </div>
            <select
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground"
              value={resolutionPreset}
              onChange={(event) => setResolutionPreset(event.target.value as ResolutionPreset)}
            >
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
              <option value="360p">360p</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="text-sm font-black opacity-60">
              {t('filemanager.videoCompress.maxFps') || 'Max FPS'}
            </div>
            <select
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground"
              value={String(maxFps)}
              onChange={(event) => setMaxFps(Number(event.target.value) as MaxFps)}
            >
              <option value="60">60</option>
              <option value="30">30</option>
              <option value="24">24</option>
            </select>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-black opacity-60">
              {t('filemanager.videoCompress.crf') || 'Quality (CRF)'}
            </div>
            <Input
              type="number"
              min={0}
              max={63}
              value={crf}
              onChange={(event) => setCrf(Number(event.target.value))}
              className="font-mono"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-black opacity-60">
            {t('filemanager.videoCompress.outputSuffix') || 'Output Suffix'}
          </div>
          <Input
            ref={suffixRef}
            value={outputSuffix}
            onChange={(event) => setOutputSuffix(event.target.value)}
            placeholder="_compressed"
            className="font-mono"
          />
          <p className="text-sm opacity-50">
            {t('filemanager.videoCompress.outputSuffixHint') || 'The compressed file is created next to the original file.'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {hasDirectories && (
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold">
                  {t('filemanager.videoCompress.includeSubdirectories') || 'Include Subdirectories'}
                </div>
                <div className="text-sm opacity-60">
                  {t('filemanager.videoCompress.includeSubdirectoriesHint') || 'Search nested folders when the selection contains directories.'}
                </div>
              </div>
              <Switch checked={includeSubdirectories} onChange={setIncludeSubdirectories} />
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold">
                {t('filemanager.videoCompress.overwriteExisting') || 'Overwrite Existing Files'}
              </div>
              <div className="text-sm opacity-60">
                {t('filemanager.videoCompress.overwriteExistingHint') || 'When disabled, a new unique file name is created automatically.'}
              </div>
            </div>
            <Switch checked={overwriteExisting} onChange={setOverwriteExisting} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold">
                {t('filemanager.videoCompress.deleteSource') || 'Delete Source After Success'}
              </div>
              <div className="text-sm opacity-60">
                {t('filemanager.videoCompress.deleteSourceHint') || 'Delete the original video after the compressed copy is created successfully.'}
              </div>
            </div>
            <Switch checked={deleteSource} onChange={setDeleteSource} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" className="rounded-xl" disabled={submitting}>
            {submitting ? t('common.loading') : (t('filemanager.videoCompress.submit') || 'Start Compression')}
          </Button>
        </div>
      </form>
    </GlassModalShell>
  );
}
