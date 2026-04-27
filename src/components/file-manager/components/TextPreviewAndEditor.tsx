import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchTextFileContent } from '@/lib/fileTokens.ts';
import { 
  Loader2, Save, Edit3, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { useToastStore } from '@/stores/toast';
import { cn } from '@/lib/utils.ts';
import { FilePreviewHeader } from './FilePreviewHeader.tsx';
import { useAutoSave } from '../hooks/useAutoSave.ts';
import { MarkdownPreviewSurface } from './MarkdownPreviewSurface';
import {
  notifyEditorSaveError,
  saveTextFileContent,
  shouldSkipAutoSave,
  TEXT_EDITOR_AUTO_SAVE,
} from './editorSaveShared.ts';
import { useEditorSaveHotkey } from '../hooks/useEditorSaveHotkey.ts';

interface Props {
  path: string;
  isDark?: boolean;
  isForced?: boolean;
  headerExtra?: React.ReactNode;
  onClose?: () => void;
  fileName?: string;
  subtitle?: string;
  hideDownload?: boolean;
  closeButtonClassName?: string;
  defaultEditing?: boolean;
  loadContent?: (path: string) => Promise<string>;
  saveContentRequest?: (payload: { path: string; content: string }) => Promise<{ path?: string; fileName?: string } | void>;
  languageOverride?: string;
  markdownPreview?: boolean;
  previewTransform?: (html: string) => string;
  onEditorReady?: () => void;
}

const MOBILE_BREAKPOINT = '(max-width: 960px)';

// Extension to editor language map
const LANGUAGE_MAP: Record<string, string> = {
  'js': 'javascript', 'ts': 'typescript', 'tsx': 'typescript', 'jsx': 'javascript',
  'py': 'python', 'rs': 'rust', 'cpp': 'cpp', 'c': 'c', 'h': 'cpp', 'hpp': 'cpp',
  'java': 'java', 'go': 'go', 'php': 'php', 'rb': 'ruby', 'cs': 'csharp',
  'sql': 'sql', 'json': 'json', 'toml': 'toml', 'yaml': 'yaml', 'yml': 'yaml',
  'html': 'html', 'css': 'css', 'less': 'less', 'scss': 'scss',
  'sh': 'shell', 'bash': 'shell', 'zsh': 'shell', 'ps1': 'powershell',
  'xml': 'xml', 'conf': 'ini', 'ini': 'ini', 'cnf': 'ini', 'cfg': 'ini',
  'log': 'plaintext', 'txt': 'plaintext', 'tex': 'latex', 'latex': 'latex',
  'dockerfile': 'dockerfile', 'makefile': 'makefile', 'md': 'markdown'
};

/**
 * Common Text Preview and Editor.
 */
export const TextPreviewAndEditor = ({
  path,
  isDark,
  headerExtra,
  onClose,
  fileName: propFileName,
  subtitle,
  hideDownload = false,
  closeButtonClassName,
  defaultEditing = false,
  loadContent,
  saveContentRequest,
  languageOverride,
  markdownPreview = false,
  previewTransform,
  onEditorReady,
}: Props) => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(defaultEditing);
  const [saving, setSaving] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(
    typeof window !== 'undefined' && window.matchMedia(MOBILE_BREAKPOINT).matches,
  );

  const lastSavedContentRef = useRef('');
  const lastSavedAtRef = useRef<number>(0);
  const lastEditAtRef = useRef<number>(0);
  const loadedPathRef = useRef('');
  const savingRef = useRef(false);
  const lastAutoSaveErrorAtRef = useRef<number>(0);
  const readyNotifiedRef = useRef(false);

  useEffect(() => {
    setIsEditing(defaultEditing);
    readyNotifiedRef.current = false;
  }, [defaultEditing]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia(MOBILE_BREAKPOINT);
    const update = () => setIsCompactLayout(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  
  const fileName = propFileName || path.split('/').pop() || 'File';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const language = languageOverride || LANGUAGE_MAP[ext] || 'plaintext';

  useEffect(() => {
    let canceled = false;
    readyNotifiedRef.current = false;
    const fetchContent = async () => {
      setLoading(true);
        try {
        const text = loadContent
          ? await loadContent(path)
          : await fetchTextFileContent(path);
        if (canceled) return;
        const next = text || '';
        setContent(next);
        lastSavedContentRef.current = next;
        lastSavedAtRef.current = Date.now();
        loadedPathRef.current = path;
      } catch (e) {
        if (!canceled) {
          console.error("Load failed:", e);
          addToast(t('filemanager.errors.loadFailed') || "Failed to load file content", "error");
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    };

    fetchContent();
    document.title = `${fileName} - Editor`;
    return () => {
      canceled = true;
    };
  }, [addToast, fileName, loadContent, path, t]);

  useEffect(() => {
    if (!loading && !readyNotifiedRef.current) {
      readyNotifiedRef.current = true;
      onEditorReady?.();
    }
  }, [loading, onEditorReady]);

  const saveContent = async (reason: 'manual' | 'auto') => {
    if (savingRef.current) return;
    if (loadedPathRef.current !== path) return;
    const snapshot = content;

    if (shouldSkipAutoSave({
      reason,
      hasChanges: snapshot !== lastSavedContentRef.current,
      lastEditAt: lastEditAtRef.current,
      lastSavedAt: lastSavedAtRef.current,
      idleMs: TEXT_EDITOR_AUTO_SAVE.idleMs,
      maxIntervalMs: TEXT_EDITOR_AUTO_SAVE.maxIntervalMs,
    })) {
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      let result: { path?: string; fileName?: string } | void = undefined;
      if (saveContentRequest) {
        result = await saveContentRequest({ path, content: snapshot });
      } else {
        await saveTextFileContent({
          path,
          content: snapshot,
          fallbackMessage: t('filemanager.editor.autoSaveFailed'),
        });
      }

      if (result && result.path) {
        loadedPathRef.current = result.path;
      }

      lastSavedContentRef.current = snapshot;
      lastSavedAtRef.current = Date.now();

      if (reason === 'manual') {
        addToast(t('filemanager.previewModal.saveSuccess'), 'success');
      }
    } catch (error: unknown) {
      notifyEditorSaveError({
        reason,
        error,
        fallbackMessage: t('filemanager.editor.autoSaveFailed'),
        addToast,
        lastAutoSaveErrorAtRef,
        cooldownMs: TEXT_EDITOR_AUTO_SAVE.errorToastCooldownMs,
      });
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  useAutoSave({
    enabled: true,
    intervalMs: TEXT_EDITOR_AUTO_SAVE.tickMs,
    task: async () => {
      if (loading) return;
      if (savingRef.current) return;
      if (loadedPathRef.current !== path) return;
      if (content === lastSavedContentRef.current) return;
      await saveContent('auto');
    },
  });

  useEditorSaveHotkey({
    enabled: isEditing,
    onSave: async () => {
      await saveContent('manual');
    },
  });

  return (
    <div className={cn("h-screen w-screen flex flex-col overflow-hidden", isDark ? "dark bg-[#09090b] text-white" : "bg-white text-zinc-900")}>
        <FilePreviewHeader 
        path={path}
        fileName={fileName}
        isDark={isDark}
        subtitle={subtitle || language}
        onClose={onClose}
        hideDownload={hideDownload}
        closeButtonClassName={closeButtonClassName}
          extra={
            <div className="flex items-center gap-3">
              {headerExtra}
              
              {!loading && (
                <div className={cn(
                  "flex items-center p-1 rounded-2xl",
                  isDark ? "bg-white/5 border border-white/5 shadow-inner" : "bg-zinc-100 border border-zinc-200"
                )}>
                  <button
                   type="button"
                   onClick={() => setIsEditing(false)}
                  className={cn(
                    "h-9 rounded-xl text-sm font-black transition-all flex items-center gap-2",
                    isCompactLayout ? "w-9 px-0 justify-center" : "px-5", 
                    !isEditing 
                      ? (isDark ? "bg-white/10 text-white shadow-lg" : "bg-white shadow-md text-zinc-900 border border-zinc-200") 
                      : "opacity-40 hover:opacity-100 text-foreground"
                  )}
                  title={t('filemanager.actions.preview')}
                 >
                   <Eye size={18} /> {!isCompactLayout && t('filemanager.actions.preview')}
                 </button>
                  <button
                   type="button"
                   onClick={() => setIsEditing(true)}
                  className={cn(
                    "h-9 rounded-xl text-sm font-black transition-all flex items-center gap-2",
                    isCompactLayout ? "w-9 px-0 justify-center" : "px-5", 
                    isEditing 
                      ? "bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20" 
                      : "opacity-40 hover:opacity-100 text-foreground"
                  )}
                  title={t('filemanager.preview.edit')}
                 >
                   <Edit3 size={18} /> {!isCompactLayout && t('filemanager.preview.edit')}
                 </button>
              </div>
            )}

            {isEditing && (
              <Button 
                variant="primary" 
                className={cn(
                  "h-10 rounded-xl text-sm font-black bg-primary text-white hover:brightness-110 shadow-xl shadow-primary/20 transition-all border-none",
                  isCompactLayout ? "w-10 px-0 justify-center" : "px-6",
                )}
                onClick={() => { void saveContent('manual'); }} 
                disabled={saving || loading}
                title={t('common.save')}
              >
                {saving ? <Loader2 size={18} className={cn("animate-spin", !isCompactLayout && "mr-2")} /> : <Save size={18} className={cn(!isCompactLayout && "mr-2")} />}
                {!isCompactLayout && t('common.save')}
              </Button>
            )}
          </div>
        }
      />

      <main className="flex-1 min-h-0 relative">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
            <Loader2 className="animate-spin text-primary" size={40} />
            <p className="text-sm font-black tracking-[0.3em]">Opening {fileName}...</p>
          </div>
        ) : (
          markdownPreview && !isEditing ? (
            <MarkdownPreviewSurface
              content={content}
              isDark={isDark}
              previewTransform={previewTransform}
            />
          ) : (
            <textarea
              className={cn(
                'h-full w-full resize-none p-4 font-mono text-sm leading-6 outline-none custom-scrollbar',
                isDark ? 'bg-[#09090b] text-white' : 'bg-white text-zinc-900'
              )}
              value={content}
              readOnly={!isEditing}
              spellCheck={false}
              onChange={(e) => {
                setContent(e.target.value);
                lastEditAtRef.current = Date.now();
              }}
            />
          )
        )}
      </main>
    </div>
  );
};
