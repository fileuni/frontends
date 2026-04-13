import { useEffect, useMemo, useRef, useState } from 'react';
import { CodeMirrorEditor } from '@/components/editors/CodeMirrorEditor';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Button } from '@/components/ui/Button.tsx';
import { FilePreviewHeader } from './FilePreviewHeader.tsx';
import { client, extractData } from '@/lib/api.ts';
import { fetchTextFileContent, getFilePreviewImageUrl } from '@/lib/fileTokens.ts';
import { useToastStore } from '@/stores/toast';
import { useConfigStore } from '@/stores/config.ts';
import { cn } from '@/lib/utils.ts';
import { Loader2, Save, Eye, ChevronDown } from 'lucide-react';
import {
  notifyEditorSaveError,
  saveTextFileContent,
  shouldSkipAutoSave,
  TEXT_EDITOR_AUTO_SAVE,
} from './editorSaveShared.ts';
import { buildJsdelivrNpmUrl } from '../utils/officeLite.ts';
import { useAutoSave } from '../hooks/useAutoSave.ts';

type LatexPreviewMode = 'latexmk' | 'latexjs' | 'codemirror';

interface Props {
  path: string;
  isDark?: boolean;
  onClose?: () => void;
}

type LatexJsGlobal = {
  HtmlGenerator: new (opts?: Record<string, unknown>) => {
    stylesAndScripts: (base?: string) => Node;
    domFragment: () => DocumentFragment;
  };
  parse: (text: string, options: { generator: unknown }) => unknown;
};

const LATEXJS_VERSION = '0.12.6';

const getLatexPreviewModeLabel = (t: TFunction, mode: LatexPreviewMode): string => {
  switch (mode) {
    case 'latexmk':
      return t('filemanager.texPreview.mode.latexmk');
    case 'latexjs':
      return t('filemanager.texPreview.mode.latexjs');
    case 'codemirror':
      return t('filemanager.texPreview.mode.codemirror');
    default:
      return mode;
  }
};

const loadLatexScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Latex.js requires a browser environment'));
      return;
    }
    const existing = document.querySelector(`script[data-latexjs-script="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.dataset['latexjsScript'] = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
};

const ensureLatexJs = (src: string): Promise<LatexJsGlobal> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Latex.js requires a browser environment'));
  }
  const w = window as Window & {
    __latexJsReadyMap?: Partial<Record<string, Promise<LatexJsGlobal>>>;
    latexjs?: LatexJsGlobal;
  };
  const readyMap = w.__latexJsReadyMap ?? {};
  w.__latexJsReadyMap = readyMap;
  const existing = readyMap[src];
  if (existing) return existing;
  const nextPromise = (async () => {
    await loadLatexScript(src);
    const latexjs = w.latexjs;
    if (!latexjs) {
      throw new Error('Latex.js is not available');
    }
    return latexjs;
  })();
  readyMap[src] = nextPromise;
  return nextPromise;
};

export const TexPreviewAndEditor = ({ path, isDark, onClose }: Props) => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const { capabilities } = useConfigStore();

  const [forcePlainTextarea, setForcePlainTextarea] = useState(false);

  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [fallbackPreviewUrl, setFallbackPreviewUrl] = useState<string | null>(null);

  const lastSavedContentRef = useRef('');
  const lastSavedAtRef = useRef<number>(0);
  const lastEditAtRef = useRef<number>(0);
  const loadedPathRef = useRef('');
  const savingRef = useRef(false);
  const lastAutoSaveErrorAtRef = useRef<number>(0);

  const defaultMode = (capabilities?.latex_preview_mode || 'codemirror') as LatexPreviewMode;
  const enableLatexmk = capabilities?.enable_latexmk === true;
  const enableLatexjs = capabilities?.enable_latexjs === true;
  const enableCodeMirror = capabilities?.enable_codemirror === true;
  const availableModes = useMemo<LatexPreviewMode[]>(() => {
    const modes: LatexPreviewMode[] = [];
    if (enableLatexmk) modes.push('latexmk');
    if (enableLatexjs) modes.push('latexjs');
    if (enableCodeMirror) modes.push('codemirror');
    return modes.length > 0 ? modes : ['codemirror'];
  }, [enableCodeMirror, enableLatexmk, enableLatexjs]);
  const initialMode = availableModes.includes(defaultMode)
    ? defaultMode
    : (availableModes[0] ?? 'codemirror');
  const [previewMode, setPreviewMode] = useState<LatexPreviewMode>(initialMode);
  const [modeOpen, setModeOpen] = useState(false);
  const canRender = previewMode === 'latexmk' || (previewMode === 'latexjs' && Boolean(capabilities?.jsdelivr_mirror_base));

  const useCodeEditor = !forcePlainTextarea;

  const fileName = path.split('/').pop() || 'LaTeX';
  const jsdelivrBase = capabilities?.jsdelivr_mirror_base;
  const latexCdnBase = jsdelivrBase
    ? buildJsdelivrNpmUrl(jsdelivrBase, `latex.js@${LATEXJS_VERSION}`)
    : null;
  const latexScriptUrl = latexCdnBase ? `${latexCdnBase}/dist/latex.js` : null;
  const latexAssetsBase = latexCdnBase ? `${latexCdnBase}/dist/` : null;

  useEffect(() => {
    let canceled = false;
    const fetchContent = async () => {
      setLoading(true);
      try {
        const text = await fetchTextFileContent(path);
        if (canceled) return;
        const next = text || '';
        setContent(next);
        lastSavedContentRef.current = next;
        lastSavedAtRef.current = Date.now();
        loadedPathRef.current = path;
      } catch (_error) {
        if (!canceled) {
          addToast(t('filemanager.errors.loadFailed') || 'Failed to load file content', 'error');
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
  }, [addToast, fileName, path, t]);

  useEffect(() => {
    let canceled = false;
    void getFilePreviewImageUrl(path)
      .then((url) => {
        if (!canceled) {
          setFallbackPreviewUrl(url);
        }
      })
      .catch(() => {
        if (!canceled) {
          setFallbackPreviewUrl(null);
        }
      });
    return () => {
      canceled = true;
    };
  }, [path]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!availableModes.includes(previewMode)) {
      const fallbackMode = availableModes[0];
      if (fallbackMode) {
        setPreviewMode(fallbackMode);
      }
    }
  }, [availableModes, previewMode]);

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
      await saveTextFileContent({
        path,
        content: snapshot,
        fallbackMessage: t('filemanager.editor.autoSaveFailed'),
      });

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

  const renderWithLatexmk = async () => {
    setRendering(true);
    try {
      const payload = await extractData<{ content_base64: string; content_type: string }>(client.POST('/api/v1/file/preview/latex', {
        body: { path, content }
      }));
      const binary = atob(payload.content_base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: payload.content_type || 'application/pdf' });
      const url = URL.createObjectURL(blob);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(url);
      setPreviewHtml(null);
    } catch (_error: unknown) {
      const msg = _error instanceof Error ? _error.message : 'Render failed';
      addToast(msg, 'error');
    } finally {
      setRendering(false);
    }
  };

  const renderWithLatexjs = async () => {
    if (!latexScriptUrl || !latexAssetsBase) {
      addToast(t('filemanager.preview.unavailable') || 'Preview unavailable', 'error');
      return;
    }
    setRendering(true);
    try {
      const latexjs = await ensureLatexJs(latexScriptUrl);
      const generator = new latexjs.HtmlGenerator({ hyphenate: false });
      latexjs.parse(content, { generator });
      const doc = document.implementation.createHTMLDocument('latex-preview');
      const assetsNode = generator.stylesAndScripts(latexAssetsBase);
      doc.head.appendChild(doc.importNode(assetsNode, true));
      const fragment = generator.domFragment();
      doc.body.appendChild(doc.importNode(fragment, true));
      const html = doc.documentElement
        ? doc.documentElement.outerHTML
        : new XMLSerializer().serializeToString(doc);
      setPreviewHtml(html);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
    } catch (_error: unknown) {
      const msg = _error instanceof Error ? _error.message : 'Render failed';
      addToast(msg, 'error');
    } finally {
      setRendering(false);
    }
  };

  const handleRender = async () => {
    if (!canRender) return;
    if (previewMode === 'latexmk') {
      await renderWithLatexmk();
    } else if (previewMode === 'latexjs') {
      await renderWithLatexjs();
    }
  };

  const previewPanel = useMemo(() => {
    if (!canRender) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center gap-5 px-6 text-center">
          {fallbackPreviewUrl && (
            <img
              src={fallbackPreviewUrl}
              alt="LaTeX preview fallback"
              className="max-h-[65%] w-full max-w-4xl rounded-3xl border border-white/10 object-contain"
            />
          )}
          <div className="space-y-2">
            <p className="text-sm font-bold tracking-[0.2em] opacity-75">
              {t('filemanager.texPreview.disabled') || 'Preview disabled'}
            </p>
            <p className="text-xs font-bold tracking-[0.14em] opacity-50">
              Demo runtime on Cloudflare does not provide local TeX rendering tools.
            </p>
          </div>
        </div>
      );
    }

    if (rendering) {
      return (
        <div className="h-full w-full flex items-center justify-center gap-2 text-sm font-bold tracking-[0.2em] opacity-60">
          <Loader2 size={18} className="animate-spin" />
          {t('filemanager.texPreview.rendering') || 'Rendering'}
        </div>
      );
    }

    if (previewMode === 'latexmk') {
      if (!previewUrl) {
        return (
          <div className="h-full w-full flex items-center justify-center text-sm font-bold tracking-[0.2em] opacity-40">
            {t('filemanager.texPreview.noPreview') || 'No preview'}
          </div>
        );
      }
      return (
        <iframe
          title="latex-preview"
          src={previewUrl}
          className="w-full h-full border-0 rounded-2xl bg-white"
        />
      );
    }

    if (previewMode === 'latexjs') {
      if (!previewHtml) {
        return (
          <div className="h-full w-full flex items-center justify-center text-sm font-bold tracking-[0.2em] opacity-40">
            {t('filemanager.texPreview.noPreview') || 'No preview'}
          </div>
        );
      }
      return (
        <iframe
          title="latex-preview"
          srcDoc={previewHtml}
          className="w-full h-full border-0 rounded-2xl bg-white"
        />
      );
    }

    return null;
  }, [canRender, fallbackPreviewUrl, previewHtml, previewMode, previewUrl, rendering, t]);

  return (
    <div className={cn('h-screen w-screen flex flex-col overflow-hidden', isDark ? 'dark bg-[#09090b] text-white' : 'bg-white text-zinc-900')}>
      <FilePreviewHeader
        path={path}
        isDark={isDark}
        subtitle={t('filemanager.texPreview.subtitle') || 'LaTeX'}
        onClose={onClose}
        extra={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
               className="h-10 px-4 rounded-xl text-sm font-black"
              onClick={() => setForcePlainTextarea((v) => !v)}
              title={useCodeEditor ? (t('common.editorEngine.switchToTextarea') || 'Switch to Textarea') : (t('common.editorEngine.switchToCodeMirror') || 'Switch to CodeMirror')}
            >
              {useCodeEditor ? (t('common.editorEngine.textarea') || 'Textarea') : (t('common.editorEngine.codemirror') || 'CodeMirror')}
            </Button>
            <div className="relative">
              <Button
                variant="outline"
                className="h-10 px-4 rounded-xl text-sm font-black flex items-center gap-2"
                onClick={() => setModeOpen(!modeOpen)}
              >
                {getLatexPreviewModeLabel(t, previewMode) || previewMode}
                <ChevronDown size={18} />
              </Button>
              {modeOpen && (
                <div className="absolute right-0 top-12 z-50 w-40 rounded-2xl border border-border bg-background shadow-xl overflow-hidden">
                  {availableModes.map(mode => (
                    <button
                      type="button"
                      key={mode}
                      className="w-full px-4 py-2 text-left text-sm font-black hover:bg-accent"
                      onClick={() => {
                        setPreviewMode(mode);
                        setModeOpen(false);
                        if (previewUrl) {
                          URL.revokeObjectURL(previewUrl);
                          setPreviewUrl(null);
                        }
                        setPreviewHtml(null);
                      }}
                    >
                      {getLatexPreviewModeLabel(t, mode) || mode}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {canRender && (
              <Button
                variant="outline"
                className="h-10 px-6 rounded-xl text-sm font-black"
                onClick={handleRender}
                disabled={rendering || loading}
              >
                {rendering ? <Loader2 size={18} className="animate-spin mr-2" /> : <Eye size={18} className="mr-2" />}
                {t('filemanager.texPreview.render') || 'Render'}
              </Button>
            )}
            <Button
              variant="primary"
              className="h-10 px-6 rounded-xl text-sm font-black"
              onClick={() => { void saveContent('manual'); }}
              disabled={saving || loading}
            >
              {saving ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
              {t('common.save')}
            </Button>
          </div>
        }
      />

      <main className="flex-1 min-h-0 flex flex-col md:flex-row gap-4 p-4">
        <section className="flex-1 min-h-0 rounded-2xl border border-border overflow-hidden">
          {loading ? (
            <div className="h-full w-full flex items-center justify-center gap-2 text-sm font-bold tracking-[0.2em] opacity-60">
              <Loader2 size={18} className="animate-spin" />
              {t('filemanager.editor.opening') || 'Opening'}
            </div>
          ) : (
            useCodeEditor ? (
              <CodeMirrorEditor
                height="100%"
                language="latex"
                value={content}
                theme={isDark ? 'dark' : 'light'}
                options={{
                  readOnly: false,
                  fontSize: 14,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  renderLineHighlight: 'all',
                  padding: { top: 16, bottom: 24 },
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
                spellCheck={false}
                onChange={(e) => {
                  setContent(e.target.value);
                  lastEditAtRef.current = Date.now();
                }}
              />
            )
          )}
        </section>

        <section className={cn('flex-1 min-h-0 rounded-2xl border border-border overflow-hidden', isDark ? 'bg-black/20' : 'bg-white')}>
          {previewPanel}
        </section>
      </main>
    </div>
  );
};
