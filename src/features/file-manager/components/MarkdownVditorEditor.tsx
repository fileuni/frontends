import React, { useEffect, useRef, useState } from 'react';
import Vditor from 'vditor';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils.ts';
import { Loader2, Save, Eye, Edit3 } from 'lucide-react';
import { client, BASE_URL } from '@/lib/api.ts';
import { getFileDownloadToken } from '@/lib/fileTokens.ts';
import { useToastStore } from '@/shared';
import { FilePreviewHeader } from './FilePreviewHeader.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { useAutoSave } from '../hooks/useAutoSave.ts';

interface Props {
  path: string;
  isDark?: boolean;
  headerExtra?: React.ReactNode;
  onClose?: () => void;
  cdnBase?: string;
}

const getVditorLang = (lang: string): "zh_CN" | "en_US" | "ja_JP" | "ko_KR" => {
  if (lang.startsWith('zh')) return 'zh_CN';
  if (lang.startsWith('en')) return 'en_US';
  return 'en_US';
};

const AUTO_SAVE_TICK_MS = 5_000;
const AUTO_SAVE_IDLE_MS = 1_500;
const AUTO_SAVE_MAX_INTERVAL_MS = 30_000;
const AUTO_SAVE_ERROR_TOAST_COOLDOWN_MS = 30_000;

/**
 * Markdown Editor and Previewer (Vditor powered)
 */
export const MarkdownVditorEditor = ({
  path,
  isDark = false,
  headerExtra,
  onClose,
  cdnBase
}: Props) => {
  const { t, i18n } = useTranslation();
  const { addToast } = useToastStore();
  const vditorRef = useRef<HTMLDivElement>(null);
  const [vd, setVd] = useState<Vditor>();
  const [isInitializing, setIsInitializing] = useState(true);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const lastSavedContentRef = useRef('');
  const lastSavedAtRef = useRef<number>(0);
  const lastEditAtRef = useRef<number>(0);
  const loadedPathRef = useRef('');
  const savingRef = useRef(false);
  const lastAutoSaveErrorAtRef = useRef<number>(0);

  useEffect(() => {
    setIsEditing(false);
  }, [path]);

  useEffect(() => {
    let canceled = false;
    const fetchContent = async () => {
      setLoading(true);
      setIsInitializing(true);
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
        // If Vditor is already initialized, set value directly
        if (vd) vd.setValue(next);
      } catch (e) {
        if (!canceled) {
          console.error("Load failed:", e);
          addToast(t('filemanager.errors.loadFailed'), "error");
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    };

    fetchContent();
    // Remove vd from deps to prevent loop
    return () => {
      canceled = true;
    };
  }, [path]);

  const resolvedCdnBase = (cdnBase || 'https://cdn.jsdelivr.net').replace(/\/+$/, '');
  const currentCdn = `${resolvedCdnBase}/npm/vditor`;

  useEffect(() => {
    if (!vditorRef.current || loading) return undefined;

    const linkId = 'vditor-css-link';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `${currentCdn}/dist/index.css`;
      document.head.appendChild(link);
    }

    const vditor = new Vditor(vditorRef.current, {
      height: '100%',
      width: '100%',
      value: content, // Use loaded content at initialization
      mode: 'sv', 
      theme: isDark ? 'dark' : 'classic',
      icon: 'material',
      lang: getVditorLang(i18n.language),
      cdn: currentCdn, 
      cache: { enable: false },
      placeholder: t('filemanager.preview.markdownPlaceholder'),
      preview: {
        theme: { current: isDark ? 'dark' : 'light' },
        hljs: { style: isDark ? 'github-dark' : 'github', lineNumber: true },
        math: { engine: 'KaTeX', inlineDigit: true },
        markdown: { toc: true, mark: true, footnotes: true },
      },
      toolbarConfig: { pin: true, hide: !isEditing },
      input: (val) => {
        setContent(val);
        lastEditAtRef.current = Date.now();
      },
      after: () => {
        setVd(vditor);
        setIsInitializing(false);
      }
    });

    return () => { vditor?.destroy(); };
    // Only reinitialize Vditor when editing state or theme changes
  }, [loading, isEditing, isDark, currentCdn, i18n.language]);

  const saveContent = async (reason: 'manual' | 'auto') => {
    if (savingRef.current) return;
    if (loadedPathRef.current !== path) return;
    const snapshot = vd ? vd.getValue() : content;

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
      await saveContent('auto');
    },
  });

  return (
    <div className={cn("h-screen w-screen flex flex-col overflow-hidden", isDark ? "dark bg-[#09090b] text-white" : "bg-white text-zinc-900")}>
      <FilePreviewHeader 
        path={path}
        isDark={isDark}
        subtitle={t('filemanager.editor.markdownEngine')}
        onClose={onClose}
        extra={
          <div className="flex items-center gap-3">
            {headerExtra}
            
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
                      ? (isDark ? "bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20" : "bg-amber-100 shadow-inner text-amber-700 border border-amber-200") 
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
        {(loading || isInitializing) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-inherit z-50 text-center backdrop-blur-sm">
            <Loader2 className="animate-spin text-primary" size={40} />
            <p className="text-sm font-black uppercase tracking-widest opacity-40">{t('filemanager.editor.connectingCdn')}</p>
          </div>
        )}
        <div ref={vditorRef} className={cn("w-full h-full overflow-hidden", !isEditing && "vditor-pure-preview")} />
      </main>

      <style>{`
        .vditor { border: none !important; background-color: transparent !important; }
        .vditor-toolbar { background-color: transparent !important; border-bottom: 1px solid var(--border) !important; }
        .vditor-pure-preview .vditor-toolbar, .vditor-pure-preview .vditor-status { display: none !important; }
        .vditor-pure-preview .vditor-content > .vditor-sv { width: 0 !important; flex: none !important; padding: 0 !important; border: none !important; opacity: 0 !important; pointer-events: none !important; margin: 0 !important; }
        .vditor-pure-preview .vditor-content > .vditor-preview { display: block !important; flex: 1 !important; width: 100% !important; max-width: 1000px !important; margin: 0 auto !important; padding: 40px !important; border: none !important; background-color: transparent !important; opacity: 1 !important; }
        .vditor--dark .vditor-reset { color: #e2e8f0 !important; }
      `}</style>
    </div>
  );
};
