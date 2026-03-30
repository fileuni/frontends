import { useEffect, useMemo, useRef, useState } from 'react';
import { useConfigStore } from '@/stores/config.ts';
import { useProtectedStorageStore } from '@/stores/protectedStorage.ts';
import { BASE_URL } from '@/lib/api.ts';
import { cn } from '@/lib/utils.ts';
import type { FileInfo } from '../types/index.ts';
import { FileIcon } from './FileIcon.tsx';
import { getFileExtension, resolvePublicBaseUrl } from '../utils/officeLite.ts';
import { getThumbnailCategory } from '../utils/thumbnailUtils.ts';
import { useUserFileSettingsStore } from '@/stores/userFileSettings.ts';
import { getFileDownloadToken } from '@/lib/fileTokens.ts';
import { shouldDisableThumbnailForPath } from '../utils/protectedStorage.ts';

interface FileThumbnailProps {
  file: FileInfo;
  size?: number;
  className?: string;
}

function buildThumbnailUrl(token: string): string {
  const base = resolvePublicBaseUrl() || BASE_URL;
  return `${base}/api/v1/file/thumbnail?file_download_token=${encodeURIComponent(token)}`;
}

async function fetchThumbnailUrl(path: string): Promise<string> {
  const token = await getFileDownloadToken(path);
  return buildThumbnailUrl(token);
}

export const FileThumbnail = ({ file, size = 64, className }: FileThumbnailProps) => {
  const { capabilities } = useConfigStore();
  const protectedStatus = useProtectedStorageStore((state) => state.status);
  const { settings, fetchSettings } = useUserFileSettingsStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const ext = useMemo(() => getFileExtension(file.name), [file.name]);
  const isMarkdown = useMemo(() => ext === 'md' || ext === 'markdown', [ext]);
  const category = useMemo(() => getThumbnailCategory(ext), [ext]);
  const thumbCaps = capabilities?.thumbnail;
  const enabled = !!thumbCaps?.enabled && !!category && ((thumbCaps as unknown as Record<string, boolean>)[category]);
  const isProtectedThumbnailDisabled = shouldDisableThumbnailForPath(file.path, protectedStatus);

  const isUserDisabled = (() => {
    if (!settings || !category) return false;
    switch (category) {
      case 'image':
        return settings.thumbnail_disable_image;
      case 'model3d':
        return settings.thumbnail_disable_image;
      case 'video':
        return settings.thumbnail_disable_video;
      case 'pdf':
        return settings.thumbnail_disable_pdf;
      case 'office':
        return settings.thumbnail_disable_office;
      case 'text':
        return isMarkdown ? settings.thumbnail_disable_markdown : settings.thumbnail_disable_text;
      case 'tex':
        return settings.thumbnail_disable_tex;
      default:
        return false;
    }
  })();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setInView(entry.isIntersecting);
      },
      { rootMargin: '200px' }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!enabled || isUserDisabled || isProtectedThumbnailDisabled || !inView || src || failed || file.is_dir) return undefined;
    let canceled = false;
    fetchThumbnailUrl(file.path)
      .then((url) => {
        if (!canceled) setSrc(url);
      })
      .catch(() => {
        if (!canceled) setFailed(true);
      });
    return () => { canceled = true; };
  }, [enabled, inView, isProtectedThumbnailDisabled, isUserDisabled, src, failed, file.path, file.is_dir]);

  if (!enabled || isUserDisabled || isProtectedThumbnailDisabled || file.is_dir || !category) {
    return <FileIcon name={file.name} isDir={file.is_dir} size={Math.round(size * 0.75)} />;
  }

  const badgeSize = Math.max(12, Math.round(size * 0.28));

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={file.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <FileIcon name={file.name} isDir={false} size={Math.round(size * 0.7)} />
      )}
      <div className="absolute bottom-1 right-1 rounded-full bg-black/60 backdrop-blur border border-white/20 p-1">
        <FileIcon name={file.name} isDir={false} size={badgeSize} />
      </div>
    </div>
  );
};
