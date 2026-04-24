import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassModalShell } from '@fileuni/ts-shared/modal-shell';
import { useUploadStore } from '../store/useUploadStore.ts';
import { useFileStore } from '../store/useFileStore.ts';
import {
  X, Upload, FileUp, FolderUp,
  Info, AlertCircle, Database
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { cn } from '@/lib/utils.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 专业上传模态框 / Professional Upload Modal
 * 支持多文件上传、目录上传以及拖拽上传，并清晰显示目标路径。
 */
export const UploadModal = ({ isOpen, onClose }: Props) => {
  const { t } = useTranslation();
  const { addTasks } = useUploadStore();
  const store = useFileStore();
  const currentPath = store.getCurrentPath();

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);
  const directoryInputProps = {
    webkitdirectory: "",
    directory: "",
  } as React.InputHTMLAttributes<HTMLInputElement>;

  const handleFiles = (files: FileList | null) => {
    if (files && files.length > 0) {
      addTasks(files, currentPath);
      onClose();
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  if (!isOpen) return null;

  return (
    <GlassModalShell
      title={t('filemanager.upload')}
      subtitle={(
        <span className="flex items-center gap-1.5 text-[11px] font-mono normal-case">
          <Database size={10} />
          <span className="truncate">{currentPath || '/'}</span>
        </span>
      )}
      icon={<Upload size={20} />}
      onClose={onClose}
      maxWidthClassName="max-w-xl"
      compact="body"
      closeButton={(
        <Button variant="ghost" size="sm" onClick={onClose} className="rounded-xl h-10 w-10 p-0 hover:bg-zinc-100/80 dark:hover:bg-white/10 text-foreground/50 dark:text-white/40">
          <X size={20} />
        </Button>
      )}
      footer={(
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-foreground/45 dark:text-white/35 whitespace-nowrap">
            {t('filemanager.messages.escCloseHint')}
          </p>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose} className="rounded-xl px-6 h-11 font-bold">
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}
    >
      <div data-testid="upload-modal" className="space-y-8">
        <button
          type="button"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "border-2 border-dashed rounded-3xl p-7 sm:p-12 flex flex-col items-center justify-center transition-all duration-300 relative group w-full backdrop-blur-md",
            isDragging
              ? "border-primary bg-primary/10 scale-[1.02] shadow-[0_20px_60px_rgba(59,130,246,0.16)]"
              : "border-zinc-200 dark:border-white/10 bg-white/55 dark:bg-white/[0.03] hover:bg-white/70 dark:hover:bg-white/[0.05] hover:border-primary/30"
          )}
        >
          <div className={cn(
            "mb-6 flex h-20 w-20 items-center justify-center rounded-full transition-all duration-500 backdrop-blur-md",
            isDragging ? "bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/20" : "bg-white/70 dark:bg-white/[0.06] text-foreground/40 dark:text-white/30 group-hover:text-primary group-hover:bg-primary/10 border border-zinc-200/70 dark:border-white/10"
          )}>
            <FileUp size={40} />
          </div>
          <h4 className="mb-2 text-center font-bold text-foreground dark:text-white transition-colors group-hover:text-primary">
            {isDragging ? t('filemanager.messages.dropToUpload') || "Release to Upload" : t('filemanager.messages.dragFilesHere') || "Drag files or folders here"}
          </h4>
          <p className="max-w-[280px] text-center text-sm text-foreground/50 dark:text-white/40">
            {t('filemanager.messages.uploadInstruction') || "Support multiple files and directory structure preservation."}
          </p>

          <input
            type="file"
            aria-label="Select files to upload"
            ref={fileInputRef}
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <input
            type="file"
            aria-label="Select folder to upload"
            ref={dirInputRef}
            {...directoryInputProps}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </button>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group flex h-14 items-center justify-center gap-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white/65 dark:bg-white/[0.04] text-foreground dark:text-white transition-all active:scale-95 hover:bg-white/80 dark:hover:bg-white/[0.08] shadow-sm backdrop-blur-sm"
          >
            <FileUp size={18} className="text-blue-500 opacity-70 transition-all group-hover:opacity-100 group-hover:scale-110" />
            <span className="text-sm font-bold text-foreground dark:text-white/90">{t('filemanager.actions.uploadFiles') || "Select Files"}</span>
          </button>
          <button
            type="button"
            onClick={() => dirInputRef.current?.click()}
            className="group flex h-14 items-center justify-center gap-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white/65 dark:bg-white/[0.04] text-foreground dark:text-white transition-all active:scale-95 hover:bg-white/80 dark:hover:bg-white/[0.08] shadow-sm backdrop-blur-sm"
          >
            <FolderUp size={18} className="text-amber-500 opacity-70 transition-all group-hover:opacity-100 group-hover:scale-110" />
            <span className="text-sm font-bold text-foreground dark:text-white/90">{t('filemanager.actions.uploadDirectory') || "Select Folder"}</span>
          </button>
        </div>

        <div className="space-y-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white/55 dark:bg-white/[0.03] p-4 backdrop-blur-md">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-primary mt-0.5 shrink-0" />
            <p className="text-sm leading-relaxed italic text-foreground/50 dark:text-white/40">
              {t('filemanager.messages.uploadTip1') || "Directories will be uploaded recursively maintaining their original structure."}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm leading-relaxed italic text-foreground/50 dark:text-white/40">
              {t('filemanager.messages.uploadTip2') || "Existing files with same names will be automatically renamed to avoid data loss."}
            </p>
          </div>
        </div>
      </div>
    </GlassModalShell>
  );
};
