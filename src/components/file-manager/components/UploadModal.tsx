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
        <Button variant="ghost" size="sm" onClick={onClose} className="rounded-xl h-10 w-10 p-0 hover:bg-accent text-muted-foreground">
          <X size={20} />
        </Button>
      )}
      footer={(
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground whitespace-nowrap">
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
            "border-2 border-dashed rounded-3xl p-7 sm:p-12 flex flex-col items-center justify-center transition-all duration-300 relative group w-full",
            isDragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-border bg-background/60 hover:bg-accent/40 hover:border-primary/30"
          )}
        >
          <div className={cn(
            "mb-6 flex h-20 w-20 items-center justify-center rounded-full transition-all duration-500",
            isDragging ? "bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
          )}>
            <FileUp size={40} />
          </div>
          <h4 className="mb-2 text-center font-bold text-foreground transition-colors group-hover:text-primary">
            {isDragging ? t('filemanager.messages.dropToUpload') || "Release to Upload" : t('filemanager.messages.dragFilesHere') || "Drag files or folders here"}
          </h4>
          <p className="max-w-[280px] text-center text-sm text-muted-foreground">
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
            className="group flex h-14 items-center justify-center gap-3 rounded-2xl border border-border bg-background/70 text-foreground transition-all active:scale-95 hover:bg-accent"
          >
            <FileUp size={18} className="text-blue-500 opacity-70 transition-all group-hover:opacity-100 group-hover:scale-110" />
            <span className="text-sm font-bold text-foreground">{t('filemanager.actions.uploadFiles') || "Select Files"}</span>
          </button>
          <button
            type="button"
            onClick={() => dirInputRef.current?.click()}
            className="group flex h-14 items-center justify-center gap-3 rounded-2xl border border-border bg-background/70 text-foreground transition-all active:scale-95 hover:bg-accent"
          >
            <FolderUp size={18} className="text-amber-500 opacity-70 transition-all group-hover:opacity-100 group-hover:scale-110" />
            <span className="text-sm font-bold text-foreground">{t('filemanager.actions.uploadDirectory') || "Select Folder"}</span>
          </button>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-4 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-primary mt-0.5 shrink-0" />
            <p className="text-sm leading-relaxed italic text-muted-foreground">
              {t('filemanager.messages.uploadTip1') || "Directories will be uploaded recursively maintaining their original structure."}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm leading-relaxed italic text-muted-foreground">
              {t('filemanager.messages.uploadTip2') || "Existing files with same names will be automatically renamed to avoid data loss."}
            </p>
          </div>
        </div>
      </div>
    </GlassModalShell>
  );
};
