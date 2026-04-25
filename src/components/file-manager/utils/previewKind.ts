import type { FileInfo } from '../types/index.ts';

export const PREVIEW_KIND_NONE = 'none' as const;
export const PREVIEW_KIND_OFFICE = 'office' as const;

export type PreviewKind = NonNullable<FileInfo['preview_kind']>;

const IMAGE_PREVIEW_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif']);
const VIDEO_PREVIEW_EXTS = new Set(['mp4', 'webm', 'mov', 'flv', 'avi', 'mkv', 'wmv']);
const AUDIO_PREVIEW_EXTS = new Set(['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma']);
const TEXT_PREVIEW_EXTS = new Set([
  'txt', 'json', 'js', 'ts', 'tsx', 'jsx', 'rs', 'py', 'yml', 'yaml', 'toml',
  'html', 'css', 'sql', 'sh', 'bash', 'xml', 'conf', 'ini', 'log', 'csv', 'tsv',
  'latex', 'cnf', 'cfg', 'dockerfile', 'makefile',
]);
const TEX_PREVIEW_EXTS = new Set(['tex', 'latex']);
const MARKDOWN_PREVIEW_EXTS = new Set(['md']);
const PDF_PREVIEW_EXTS = new Set(['pdf']);
const OFFICE_PREVIEW_EXTS = new Set([
  'docx', 'dotx', 'docm', 'dotm', 'xlsx', 'xltx', 'xlsm', 'xltm', 'csv', 'tsv',
  'pptx', 'potx', 'pptm', 'ppsx',
]);

const getExtension = (name: string): string => {
  const parts = name.split('.');
  if (parts.length <= 1) return '';
  return parts[parts.length - 1]?.toLowerCase() || '';
};

export const resolvePreviewKindFromName = (name: string, isDir: boolean): PreviewKind => {
  if (isDir) return PREVIEW_KIND_NONE;
  const ext = getExtension(name);
  if (IMAGE_PREVIEW_EXTS.has(ext)) return 'image';
  if (VIDEO_PREVIEW_EXTS.has(ext)) return 'video';
  if (AUDIO_PREVIEW_EXTS.has(ext)) return 'audio';
  if (MARKDOWN_PREVIEW_EXTS.has(ext)) return 'markdown';
  if (TEX_PREVIEW_EXTS.has(ext)) return 'tex';
  if (TEXT_PREVIEW_EXTS.has(ext)) return 'text';
  if (PDF_PREVIEW_EXTS.has(ext)) return 'pdf';
  if (OFFICE_PREVIEW_EXTS.has(ext)) return PREVIEW_KIND_OFFICE;
  return PREVIEW_KIND_NONE;
};

export const getPreviewKind = (file: Pick<FileInfo, 'name' | 'is_dir' | 'preview_kind'>): PreviewKind => {
  return file.preview_kind ?? resolvePreviewKindFromName(file.name, file.is_dir);
};

export const isPreviewSupported = (file: Pick<FileInfo, 'name' | 'is_dir' | 'preview_kind'>): boolean => {
  return getPreviewKind(file) !== PREVIEW_KIND_NONE;
};

export const isOfficePreviewKind = (file: Pick<FileInfo, 'name' | 'is_dir' | 'preview_kind'>): boolean => {
  return getPreviewKind(file) === PREVIEW_KIND_OFFICE;
};
