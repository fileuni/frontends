import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MonacoEditor, isMonacoSupported } from '@fileuni/shared';
import { client, BASE_URL } from '@/lib/api.ts';
import { getFileDownloadToken } from '@/lib/fileTokens.ts';
import { 
  Loader2, Save, Edit3, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { useToastStore } from '@fileuni/shared';
import { cn } from '@/lib/utils.ts';
import { FilePreviewHeader } from './FilePreviewHeader.tsx';
import { useAutoSave } from '../hooks/useAutoSave.ts';

interface Props {
  path: string;
  isDark?: boolean;
  isForced?: boolean;
  headerExtra?: React.ReactNode;
  onClose?: () => void;
}

// Extension to Monaco Language Map
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

const AUTO_SAVE_TICK_MS = 5_000;
const AUTO_SAVE_IDLE_MS = 1_500;
const AUTO_SAVE_MAX_INTERVAL_MS = 30_000;
const AUTO_SAVE_ERROR_TOAST_COOLDOWN_MS = 30_000;

/**
 * Common Text Preview and Editor (Monaco powered).
 */
export const TextPreviewAndEditor = ({ path, isDark, headerExtra, onClose }: Props) => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();

  const [mounted, setMounted] = useState(typeof window !== 'undefined');
  const [forcePlainTextarea, setForcePlainTextarea] = useState(false);
  
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const lastSavedContentRef = useRef('');
  const lastSavedAtRef = useRef<number>(0);
  const lastEditAtRef = useRef<number>(0);
  const loadedPathRef = useRef('');
  const savingRef = useRef(false);
  const lastAutoSaveErrorAtRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsEditing(false);
  }, [path]);
  
  const fileName = path.split('/').pop() || 'File';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const language = LANGUAGE_MAP[ext] || 'plaintext';

  const monacoAvailable = mounted && isMonacoSupported();
  const useMonaco = monacoAvailable && !forcePlainTextarea;

  useEffect(() => {
    let canceled = false;
    const fetchContent = async () => {
      setLoading(true);
      try {
        const token = await getFileDownloadToken(path);
        if (canceled) return;
        const url = `${BASE_URL}/api/v1/file/get-content?file_download_token=${encodeURIComponent(token)}&inline=true&mode=text`;
        const res = await fetch(url);
        const text = await res.text();
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
  }, [path]);

  const saveContent = async (reason: 'manual' | 'auto') => {
    if (savingRef.current) return;
    if (loadedPathRef.current !== path) return;
    const snapshot = content;

    if (reason === 'auto') {
      if (snapshot === lastSavedContentRef.current) return;

      const now = Date.now();
      const idleOk = now - lastEditAtRef.current >= AUTO_SAVE_IDLE_MS;
      const forceOk = now - lastSavedAtRef.current >= AUTO_SAVE_MAX_INTERVAL_MS;
      if (!idleOk && !forceOk) return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const { data, error } = await client.PUT('/api/v1/file/content', {
        body: { path, content: snapshot, is_base64: false }
      });

      if (error) {
        const errObj = error as Record<string, unknown>;
        throw new Error((errObj.msg as string) || t('filemanager.editor.autoSaveFailed'));
      }

      if (!data?.success) {
        const msgRaw = data?.msg;
        const msg = typeof msgRaw === 'string' ? msgRaw : undefined;
        throw new Error(msg ?? t('filemanager.editor.autoSaveFailed'));
      }

      lastSavedContentRef.current = snapshot;
      lastSavedAtRef.current = Date.now();

      if (reason === 'manual') {
        addToast(t('filemanager.previewModal.saveSuccess'), 'success');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('filemanager.editor.autoSaveFailed');

      if (reason === 'manual') {
        addToast(msg, 'error');
      } else {
        const now = Date.now();
        if (now - lastAutoSaveErrorAtRef.current >= AUTO_SAVE_ERROR_TOAST_COOLDOWN_MS) {
          lastAutoSaveErrorAtRef.current = now;
          addToast(msg, 'error');
        }
      }
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  useAutoSave({
    enabled: true,
    intervalMs: AUTO_SAVE_TICK_MS,
    task: async () => {
      if (loading) return;
      if (savingRef.current) return;
      if (loadedPathRef.current !== path) return;
      if (content === lastSavedContentRef.current) return;
      await saveContent('auto');
    },
  });

  return (
    <div className={cn("h-screen w-screen flex flex-col overflow-hidden", isDark ? "dark bg-[#09090b] text-white" : "bg-white text-zinc-900")}>
        <FilePreviewHeader 
        path={path}
        isDark={isDark}
        subtitle={language}
        onClose={onClose}
          extra={
            <div className="flex items-center gap-3">
              {headerExtra}

              {monacoAvailable && (
                <Button
                  variant="outline"
                  className={cn(
                    "h-10 px-4 rounded-xl text-sm font-black uppercase",
                    isDark
                      ? "border-white/10 bg-white/5 hover:bg-white/10 text-white"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900"
                  )}
                  onClick={() => setForcePlainTextarea((v) => !v)}
                  title={useMonaco ? (t('common.editorEngine.switchToTextarea') || 'Switch to Textarea') : (t('common.editorEngine.switchToMonaco') || 'Switch to Monaco')}
                >
                  {useMonaco ? (t('common.editorEngine.textarea') || 'Textarea') : (t('common.editorEngine.monaco') || 'Monaco')}
                </Button>
              )}
              
              {!loading && (
                <div className={cn(
                  "flex items-center p-1 rounded-2xl",
                  isDark ? "bg-white/5 border border-white/5 shadow-inner" : "bg-zinc-100 border border-zinc-200"
                )}>
                 <button 
                  onClick={() => setIsEditing(false)}
                  className={cn(
                    "px-5 h-9 rounded-xl text-sm font-black uppercase transition-all flex items-center gap-2", 
                    !isEditing 
                      ? (isDark ? "bg-white/10 text-white shadow-lg" : "bg-white shadow-md text-zinc-900 border border-zinc-200") 
                      : "opacity-40 hover:opacity-100 text-foreground"
                  )}
                 >
                   <Eye size={18} /> {t('filemanager.actions.preview')}
                 </button>
                 <button 
                  onClick={() => setIsEditing(true)}
                  className={cn(
                    "px-5 h-9 rounded-xl text-sm font-black uppercase transition-all flex items-center gap-2", 
                    isEditing 
                      ? "bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20" 
                      : "opacity-40 hover:opacity-100 text-foreground"
                  )}
                 >
                   <Edit3 size={18} /> {t('filemanager.preview.edit')}
                 </button>
              </div>
            )}

            {isEditing && (
              <Button 
                variant="primary" 
                className="h-10 px-6 rounded-xl text-sm font-black uppercase bg-primary text-white hover:brightness-110 shadow-xl shadow-primary/20 transition-all border-none" 
                onClick={() => { void saveContent('manual'); }} 
                disabled={saving || loading}
              >
                {saving ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                {t('common.save')}
              </Button>
            )}
          </div>
        }
      />

      <main className="flex-1 min-h-0 relative">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
            <Loader2 className="animate-spin text-primary" size={40} />
            <p className="text-sm font-black uppercase tracking-[0.3em]">Opening {fileName}...</p>
          </div>
        ) : (
          useMonaco ? (
            <MonacoEditor
              height="100%"
              language={language}
              value={content}
              theme={isDark ? 'vs-dark' : 'light'}
              options={{
                readOnly: !isEditing,
                fontSize: 14,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                minimap: { enabled: true },
                automaticLayout: true,
                wordWrap: 'on',
                lineNumbers: 'on',
                renderLineHighlight: isEditing ? 'all' : 'none',
                padding: { top: 20 },
                scrollBeyondLastLine: false,
                scrollbar: {
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8
                }
              }}
              onChange={(val) => {
                setContent(val || '');
                lastEditAtRef.current = Date.now();
              }}
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
