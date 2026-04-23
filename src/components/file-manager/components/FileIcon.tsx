import {
  AppWindow,
  BadgeInfo,
  Binary,
  Blocks,
  BookMarked,
  BookText,
  Braces,
  BrainCircuit,
  Cpu,
  Database,
  Disc3,
  DraftingCompass,
  FileAudio2,
  FileArchive,
  FileCode2,
  FileImage,
  FileJson,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideo,
  Film,
  Folder,
  Gem,
  Globe,
  Hammer,
  HardDrive,
  Image,
  Layers,
  Music,
  Moon,
  PenTool,
  Package,
  Presentation,
  ScrollText,
  Smartphone,
  SquareFunction,
  Terminal,
  Workflow,
  CodeXml,
  type LucideIcon,
} from 'lucide-react';

const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tif', 'ico', 'avif', 'heic', 'heif', 'psd', 'dng', 'raw', 'cr2', 'nef', 'arw', 'orf', 'rw2',
]);

const VIDEO_EXTENSIONS = new Set([
  'mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v', 'mpg', 'mpeg', 'ts', 'm2ts', 'mts', '3gp', '3g2', 'ogv', 'vob',
]);

const AUDIO_EXTENSIONS = new Set([
  'mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'wma', 'opus', 'mid', 'midi', 'aif', 'aiff', 'amr', 'alac',
]);

const DISK_IMAGE_EXTENSIONS = new Set([
  'iso', 'img', 'dmg', 'cue', 'nrg', 'mdf', 'mds',
]);

const MOBILE_APP_EXTENSIONS = new Set([
  'apk', 'aab', 'xapk', 'ipa',
]);

const WINDOWS_APP_EXTENSIONS = new Set([
  'exe', 'msi', 'msix', 'appx', 'appxbundle', 'scr', 'com', 'bat', 'cmd',
]);

const PACKAGE_EXTENSIONS = new Set([
  'fupkg', 'deb', 'rpm', 'pkg', 'snap', 'flatpak', 'appimage', 'jar', 'war', 'ear',
]);

const ARCHIVE_EXTENSIONS = new Set([
  'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz', 'zst', 'lz4', 'cab',
]);

const DOCUMENT_EXTENSIONS = new Set([
  'doc', 'docx', 'dot', 'dotx', 'docm', 'dotm', 'odt', 'rtf', 'pages',
]);

const SPREADSHEET_EXTENSIONS = new Set([
  'xls', 'xlsx', 'xltx', 'xlsm', 'xltm', 'csv', 'tsv', 'ods', 'numbers',
]);

const PRESENTATION_EXTENSIONS = new Set([
  'ppt', 'pptx', 'potx', 'pptm', 'pps', 'ppsx', 'odp', 'key',
]);

const EBOOK_EXTENSIONS = new Set([
  'epub', 'mobi', 'azw', 'azw3', 'fb2',
]);

const TEXT_EXTENSIONS = new Set([
  'txt', 'log', 'ini', 'conf', 'cfg', 'env', 'properties',
]);

const WEB_CODE_EXTENSIONS = new Set([
  'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'css', 'scss', 'sass', 'less', 'astro', 'vue', 'svelte',
]);

const JSON_EXTENSIONS = new Set([
  'json', 'jsonc', 'json5',
]);

const XML_EXTENSIONS = new Set([
  'xml', 'html', 'htm', 'xhtml', 'rss', 'wsdl', 'xsd',
]);

const SYSTEM_CODE_EXTENSIONS = new Set([
  'c', 'h', 'cc', 'cpp', 'cxx', 'hxx', 'hpp', 'cs', 'swift',
]);

const JVM_CODE_EXTENSIONS = new Set([
  'java', 'kt', 'kts', 'groovy', 'scala',
]);

const RUST_GO_EXTENSIONS = new Set([
  'rs', 'go',
]);

const SCRIPT_CODE_EXTENSIONS = new Set([
  'php', 'py', 'rb', 'lua', 'pl', 'r',
]);

const SHELL_EXTENSIONS = new Set([
  'sh', 'bash', 'zsh', 'fish', 'ps1', 'psm1',
]);

const DATABASE_EXTENSIONS = new Set([
  'sql', 'psql', 'sqlite', 'db', 'db3',
]);

const GENERIC_CODE_EXTENSIONS = new Set([
  'toml', 'yaml', 'yml', 'dart',
]);

const BINARY_EXTENSIONS = new Set([
  'bin', 'dll', 'so', 'dylib', 'lib', 'a', 'o', 'obj', 'class', 'pyc',
]);

const renderIcon = (
  Icon: LucideIcon,
  size: number,
  className: string,
) => <Icon size={size} className={className} />;

export const FileIcon = ({ name, isDir, size = 20 }: { name: string, isDir: boolean, size?: number }) => {
  if (isDir) return <Folder size={size} className="text-yellow-500 fill-yellow-500/20" />;

  const ext = name.split('.').pop()?.toLowerCase() || '';

  switch (ext) {
    case 'svg':
      return renderIcon(DraftingCompass, size, 'text-orange-500');
    case 'psd':
      return renderIcon(Layers, size, 'text-indigo-500');
    case 'dng':
    case 'raw':
    case 'cr2':
    case 'nef':
    case 'arw':
    case 'orf':
    case 'rw2':
      return renderIcon(FileImage, size, 'text-sky-600');
    case 'mp4':
    case 'mkv':
    case 'mov':
      return renderIcon(Film, size, 'text-rose-500');
    case 'mp3':
    case 'wav':
    case 'flac':
      return renderIcon(FileAudio2, size, 'text-fuchsia-500');
    case 'iso':
      return renderIcon(Disc3, size, 'text-amber-500');
    case 'apk':
      return renderIcon(Smartphone, size, 'text-lime-600');
    case 'ipa':
      return renderIcon(Smartphone, size, 'text-sky-500');
    case 'exe':
      return renderIcon(AppWindow, size, 'text-sky-500');
    case 'msi':
      return renderIcon(AppWindow, size, 'text-cyan-600');
    case 'fupkg':
      return renderIcon(Package, size, 'text-violet-600');
    case 'pdf':
      return renderIcon(BookMarked, size, 'text-rose-500');
    case 'md':
    case 'markdown':
      return renderIcon(ScrollText, size, 'text-blue-400');
    case 'txt':
    case 'log':
      return renderIcon(ScrollText, size, 'text-slate-500');
    case 'ini':
    case 'conf':
    case 'cfg':
    case 'env':
    case 'properties':
      return renderIcon(FileText, size, 'text-slate-500');
    case 'tex':
    case 'latex':
      return renderIcon(FileType, size, 'text-blue-600');
    case 'doc':
    case 'docx':
    case 'odt':
    case 'rtf':
      return renderIcon(FileText, size, 'text-blue-500');
    case 'xls':
    case 'xlsx':
    case 'csv':
    case 'tsv':
      return renderIcon(FileSpreadsheet, size, 'text-emerald-500');
    case 'ppt':
    case 'pptx':
      return renderIcon(Presentation, size, 'text-amber-500');
    case 'epub':
    case 'mobi':
      return renderIcon(BookText, size, 'text-cyan-600');
    case 'js':
    case 'mjs':
    case 'cjs':
      return renderIcon(Braces, size, 'text-yellow-500');
    case 'jsx':
      return renderIcon(Blocks, size, 'text-cyan-500');
    case 'ts':
      return renderIcon(BadgeInfo, size, 'text-blue-500');
    case 'tsx':
      return renderIcon(Blocks, size, 'text-blue-500');
    case 'json':
      return renderIcon(FileJson, size, 'text-amber-500');
    case 'jsonc':
    case 'json5':
      return renderIcon(FileJson, size, 'text-yellow-600');
    case 'yaml':
    case 'yml':
      return renderIcon(FileCode2, size, 'text-green-500');
    case 'toml':
      return renderIcon(FileCode2, size, 'text-emerald-600');
    case 'xml':
    case 'html':
    case 'htm':
      return renderIcon(CodeXml, size, 'text-orange-500');
    case 'css':
      return renderIcon(PenTool, size, 'text-sky-500');
    case 'scss':
    case 'sass':
    case 'less':
      return renderIcon(PenTool, size, 'text-pink-500');
    case 'php':
      return renderIcon(Globe, size, 'text-violet-500');
    case 'py':
      return renderIcon(BrainCircuit, size, 'text-yellow-600');
    case 'rb':
      return renderIcon(Gem, size, 'text-red-500');
    case 'lua':
      return renderIcon(Moon, size, 'text-indigo-500');
    case 'go':
      return renderIcon(Workflow, size, 'text-cyan-600');
    case 'rs':
      return renderIcon(Hammer, size, 'text-orange-600');
    case 'java':
      return renderIcon(SquareFunction, size, 'text-red-500');
    case 'kt':
    case 'kts':
      return renderIcon(SquareFunction, size, 'text-purple-500');
    case 'c':
    case 'h':
      return renderIcon(Cpu, size, 'text-slate-600');
    case 'cc':
    case 'cpp':
    case 'cxx':
    case 'hpp':
    case 'hxx':
      return renderIcon(Cpu, size, 'text-sky-700');
    case 'cs':
      return renderIcon(Cpu, size, 'text-violet-600');
    case 'swift':
      return renderIcon(Cpu, size, 'text-orange-500');
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'fish':
      return renderIcon(Terminal, size, 'text-emerald-600');
    case 'ps1':
    case 'psm1':
      return renderIcon(Terminal, size, 'text-blue-700');
    case 'sql':
      return renderIcon(Database, size, 'text-teal-500');
    case 'sqlite':
    case 'db':
    case 'db3':
      return renderIcon(HardDrive, size, 'text-teal-600');
  }

  if (IMAGE_EXTENSIONS.has(ext)) return <Image size={size} className="text-blue-500" />;
  if (VIDEO_EXTENSIONS.has(ext)) return <FileVideo size={size} className="text-red-500" />;
  if (AUDIO_EXTENSIONS.has(ext)) return <Music size={size} className="text-pink-500" />;
  if (DISK_IMAGE_EXTENSIONS.has(ext)) return <Disc3 size={size} className="text-amber-500" />;
  if (MOBILE_APP_EXTENSIONS.has(ext)) return <Smartphone size={size} className="text-lime-600" />;
  if (WINDOWS_APP_EXTENSIONS.has(ext)) return <AppWindow size={size} className="text-sky-500" />;
  if (PACKAGE_EXTENSIONS.has(ext)) return <Package size={size} className="text-violet-500" />;
  if (ARCHIVE_EXTENSIONS.has(ext)) return <FileArchive size={size} className="text-orange-500" />;
  if (['pdf'].includes(ext)) return <FileText size={size} className="text-rose-500" />;
  if (EBOOK_EXTENSIONS.has(ext)) return <BookText size={size} className="text-cyan-600" />;
  if (['md', 'markdown'].includes(ext)) return <FileText size={size} className="text-blue-400" />;
  if (['tex', 'latex'].includes(ext)) return <FileType size={size} className="text-blue-600" />;
  if (DOCUMENT_EXTENSIONS.has(ext)) return <FileText size={size} className="text-blue-500" />;
  if (SPREADSHEET_EXTENSIONS.has(ext)) return <FileSpreadsheet size={size} className="text-emerald-500" />;
  if (PRESENTATION_EXTENSIONS.has(ext)) return <Presentation size={size} className="text-amber-500" />;
  if (TEXT_EXTENSIONS.has(ext)) return <FileText size={size} className="text-slate-500" />;
  if (WEB_CODE_EXTENSIONS.has(ext)) return <Braces size={size} className="text-cyan-500" />;
  if (JSON_EXTENSIONS.has(ext)) return <FileJson size={size} className="text-amber-500" />;
  if (XML_EXTENSIONS.has(ext)) return <CodeXml size={size} className="text-orange-500" />;
  if (SYSTEM_CODE_EXTENSIONS.has(ext)) return <Cpu size={size} className="text-slate-600" />;
  if (JVM_CODE_EXTENSIONS.has(ext)) return <SquareFunction size={size} className="text-red-500" />;
  if (RUST_GO_EXTENSIONS.has(ext)) return <Workflow size={size} className="text-orange-600" />;
  if (SCRIPT_CODE_EXTENSIONS.has(ext)) return <Globe size={size} className="text-violet-500" />;
  if (SHELL_EXTENSIONS.has(ext)) return <Terminal size={size} className="text-emerald-600" />;
  if (DATABASE_EXTENSIONS.has(ext)) return <Database size={size} className="text-teal-500" />;
  if (GENERIC_CODE_EXTENSIONS.has(ext)) return <FileCode2 size={size} className="text-green-500" />;
  if (BINARY_EXTENSIONS.has(ext)) return <Binary size={size} className="text-zinc-600" />;

  return <FileQuestion size={size} className="text-zinc-500" />;
};
