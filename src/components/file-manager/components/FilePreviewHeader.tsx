import React from 'react';
import { useTranslation } from 'react-i18next';
import { Download, X, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { downloadFileByPath } from '@/lib/fileTokens.ts';
import { useThemeStore } from '@/stores/theme';

interface FilePreviewHeaderProps {
  path: string;
  fileName?: string | undefined;
  loading?: boolean | undefined;
  extra?: React.ReactNode | undefined;
  icon?: React.ReactNode | undefined;
  subtitle?: string | undefined;
  isDark?: boolean | undefined;
  onClose?: (() => void) | undefined;
  onDownload?: (() => Promise<void> | void) | undefined;
  hideDownload?: boolean | undefined;
  closeButtonClassName?: string | undefined;
}

/**
 * 统一的文件预览页眉组件 / Unified File Preview Header Component
 * 遵循 Navbar 色彩规范，确保在明暗模式下均具有高辨识度
 */
export const FilePreviewHeader = ({
  path,
  fileName: propFileName,
  loading,
  extra,
  icon,
  subtitle,
  isDark: propIsDark,
  onClose,
  onDownload,
  hideDownload = false,
  closeButtonClassName,
}: FilePreviewHeaderProps) => {
  const { t } = useTranslation();
  const { theme } = useThemeStore();
  const fileName = propFileName || path.split('/').pop() || 'File';

  const isDark = propIsDark ?? (theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches));

  const handleDownload = async () => {
    if (onDownload) {
      await onDownload();
      return;
    }
    try {
      await downloadFileByPath(path, fileName);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const defaultOnClose = () => {
    if (onClose) {
      onClose();
    } else {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      if (params.has('preview_path')) {
        params.delete('preview_path');
        window.location.hash = params.toString();
      } else {
        window.history.back();
      }
    }
  };

  return (
    <header className={cn(
      "shrink-0 border-b flex flex-col gap-3 px-3 py-3 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0 z-50 transition-all duration-300",
      isDark ? "bg-zinc-950 text-white border-white/5" : "bg-white text-zinc-900 border-gray-200 shadow-sm"
    )}>
      {/* Left Info */}
      <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
        <div className={cn(
          "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform hover:rotate-6",
          isDark ? "bg-white/5 text-primary" : "bg-primary/10 text-primary shadow-inner"
        )}>
          {icon || <FileText size={20} />}
        </div>
        <div className="min-w-0">
          <h3 className="font-black truncate text-sm tracking-tight">{fileName}</h3>
          <p className={cn(
            "text-sm font-black tracking-[0.2em]",
            isDark ? "text-white/30" : "text-gray-400"
          )}>
            {subtitle || "File Preview"}
          </p>
        </div>
      </div>
      
      {/* Right Actions */}
      <div className="flex w-full min-w-0 flex-wrap items-center justify-start gap-2 sm:w-auto sm:flex-nowrap sm:justify-end sm:gap-3">
        {/* Extra buttons (Edit, Save, etc.) - No broad text overrides here */}
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto sm:flex-initial sm:overflow-visible">
          {extra}
        </div>
        
        {extra && <div className={cn("hidden sm:block w-px h-6", isDark ? "bg-white/10" : "bg-gray-200")} />}
        
        <div className="flex shrink-0 items-center gap-2">
          {!hideDownload && (
            <button 
              type="button"
              onClick={() => { void handleDownload(); }}
              disabled={loading}
              title={t('common.download')}
              className={cn(
                "p-2.5 rounded-xl transition-all border",
                isDark 
                  ? "bg-white/5 border-white/10 text-primary hover:bg-white/10 shadow-lg shadow-black/20" 
                  : "bg-gray-100 border-gray-200 text-primary hover:bg-gray-200 shadow-sm"
              )}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            </button>
          )}

          <button 
            type="button"
            onClick={defaultOnClose}
            title={t('common.close')}
            className={cn(
              "p-2.5 rounded-xl transition-all border",
              isDark 
                ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white" 
                : "bg-red-50 border-red-100 text-red-600 hover:bg-red-500 hover:text-white",
              closeButtonClassName
            )}
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
