import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import { keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { tags } from '@lezer/highlight';
import { useTranslation } from 'react-i18next';
import { Edit3, Eye, LayoutPanelLeft, Loader2, Save } from 'lucide-react';
import { BASE_URL, client } from '@/lib/api';
import { getFileDownloadToken } from '@/lib/fileTokens';
import { Button } from '@/components/ui/Button';
import { useToastStore } from '@/stores/toast';
import { cn } from '@/lib/utils';
import { FilePreviewHeader } from './FilePreviewHeader';
import { MarkdownPreviewSurface } from './MarkdownPreviewSurface';
import { useAutoSave } from '../hooks/useAutoSave';

interface SaveResult {
  path?: string;
  fileName?: string;
}

interface Props {
  path: string;
  isDark?: boolean;
  headerExtra?: React.ReactNode;
  onClose?: () => void;
  fileName?: string;
  subtitle?: string;
  hideDownload?: boolean;
  closeButtonClassName?: string;
  defaultEditing?: boolean;
  loadContent?: (path: string) => Promise<string>;
  saveContentRequest?: (payload: { path: string; content: string }) => Promise<SaveResult | void>;
  onEditorReady?: () => void;
  previewTransform?: (html: string) => string;
}

type LayoutMode = 'edit' | 'preview' | 'split';

const AUTO_SAVE_TICK_MS = 5_000;
const AUTO_SAVE_IDLE_MS = 1_500;
const AUTO_SAVE_MAX_INTERVAL_MS = 30_000;
const AUTO_SAVE_ERROR_TOAST_COOLDOWN_MS = 30_000;
const MOBILE_BREAKPOINT = '(max-width: 960px)';

const darkMarkdownHighlight = HighlightStyle.define([
  { tag: [tags.heading], color: '#fbbf24', fontWeight: '700' },
  { tag: [tags.strong], color: '#fde68a', fontWeight: '700' },
  { tag: [tags.emphasis], color: '#fdba74', fontStyle: 'italic' },
  { tag: [tags.link, tags.url], color: '#7dd3fc', textDecoration: 'underline' },
  { tag: [tags.quote], color: '#c4b5fd', fontStyle: 'italic' },
  { tag: [tags.list], color: '#fca5a5' },
  { tag: [tags.monospace, tags.processingInstruction], color: '#86efac' },
  { tag: [tags.literal, tags.string], color: '#a5f3fc' },
]);

const lightMarkdownHighlight = HighlightStyle.define([
  { tag: [tags.heading], color: '#b45309', fontWeight: '700' },
  { tag: [tags.strong], color: '#92400e', fontWeight: '700' },
  { tag: [tags.emphasis], color: '#c2410c', fontStyle: 'italic' },
  { tag: [tags.link, tags.url], color: '#1d4ed8', textDecoration: 'underline' },
  { tag: [tags.quote], color: '#7c3aed', fontStyle: 'italic' },
  { tag: [tags.list], color: '#dc2626' },
  { tag: [tags.monospace, tags.processingInstruction], color: '#047857' },
  { tag: [tags.literal, tags.string], color: '#0369a1' },
]);

const wrapSelection = (
  view: EditorView,
  before: string,
  after: string,
  fallback: string,
) => {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to) || fallback;
  const insert = `${before}${selected}${after}`;
  const anchor = from + before.length;
  const head = anchor + selected.length;
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor, head },
  });
  view.focus();
};

const prefixSelectionLines = (view: EditorView, prefix: string) => {
  const { from, to } = view.state.selection.main;
  const raw = view.state.sliceDoc(from, to) || 'item';
  const insert = raw
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
  const anchor = from;
  const head = from + insert.length;
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor, head },
  });
  view.focus();
};

const insertSnippet = (view: EditorView, snippet: string) => {
  const { from, to } = view.state.selection.main;
  const cursor = from + snippet.length;
  view.dispatch({
    changes: { from, to, insert: snippet },
    selection: { anchor: cursor, head: cursor },
  });
  view.focus();
};

export const SimpleMarkdownEditor: React.FC<Props> = ({
  path,
  isDark = false,
  headerExtra,
  onClose,
  fileName,
  subtitle,
  hideDownload = false,
  closeButtonClassName,
  defaultEditing = false,
  loadContent,
  saveContentRequest,
  onEditorReady,
  previewTransform,
}) => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const editorRef = useRef<EditorView | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(defaultEditing);
  const [isCompactLayout, setIsCompactLayout] = useState(
    typeof window !== 'undefined' && window.matchMedia(MOBILE_BREAKPOINT).matches,
  );
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(
    typeof window !== 'undefined' && window.matchMedia(MOBILE_BREAKPOINT).matches ? 'edit' : 'split',
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
  }, [path, defaultEditing]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia(MOBILE_BREAKPOINT);
    const update = () => {
      const compact = media.matches;
      setIsCompactLayout(compact);
      setLayoutMode((prev) => (prev === 'split' && compact ? 'edit' : prev));
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const next = loadContent
          ? await loadContent(path)
          : await (async () => {
              const token = await getFileDownloadToken(path);
              if (cancelled) return '';
              const url = `${BASE_URL}/api/v1/file/get-content?file_download_token=${encodeURIComponent(token)}&inline=true&mode=text`;
              const response = await fetch(url);
              return await response.text();
            })();
        if (cancelled) return;
        const normalized = next || '';
        setContent(normalized);
        lastSavedContentRef.current = normalized;
        lastSavedAtRef.current = Date.now();
        loadedPathRef.current = path;
      } catch (error) {
        if (!cancelled) {
          console.error('Load failed:', error);
          addToast(t('filemanager.errors.loadFailed') || 'Failed to load file content', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [addToast, loadContent, path, t]);

  useEffect(() => {
    if (!loading && !readyNotifiedRef.current) {
      readyNotifiedRef.current = true;
      onEditorReady?.();
    }
  }, [loading, onEditorReady]);

  const saveContent = useCallback(async (reason: 'manual' | 'auto') => {
    if (savingRef.current) return;
    if (loadedPathRef.current !== path) return;
    const snapshot = editorRef.current ? editorRef.current.state.doc.toString() : content;

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
      let result: SaveResult | void;
      if (saveContentRequest) {
        result = await saveContentRequest({ path, content: snapshot });
      } else {
        const { data, error } = await client.PUT('/api/v1/file/content', {
          body: { path, content: snapshot, is_base64: false },
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
      }

      if (result && result.path) {
        loadedPathRef.current = result.path;
      }
      lastSavedContentRef.current = snapshot;
      lastSavedAtRef.current = Date.now();

      if (reason === 'manual') {
        addToast(t('filemanager.previewModal.saveSuccess'), 'success');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('filemanager.editor.autoSaveFailed');
      if (reason === 'manual') {
        addToast(message, 'error');
      } else {
        const now = Date.now();
        if (now - lastAutoSaveErrorAtRef.current >= AUTO_SAVE_ERROR_TOAST_COOLDOWN_MS) {
          lastAutoSaveErrorAtRef.current = now;
          addToast(message, 'error');
        }
      }
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  }, [addToast, content, path, saveContentRequest, t]);

  useAutoSave({
    enabled: true,
    intervalMs: AUTO_SAVE_TICK_MS,
    task: async () => {
      if (loading || savingRef.current || loadedPathRef.current !== path) return;
      const snapshot = editorRef.current ? editorRef.current.state.doc.toString() : content;
      if (snapshot === lastSavedContentRef.current) return;
      await saveContent('auto');
    },
  });

  const extensions = useMemo(() => {
    return [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      markdown(),
      EditorView.lineWrapping,
      syntaxHighlighting(isDark ? darkMarkdownHighlight : lightMarkdownHighlight),
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '15px',
          backgroundColor: isDark ? '#09090b' : '#ffffff',
          color: isDark ? '#fafaf9' : '#18181b',
        },
        '.cm-editor': {
          backgroundColor: isDark ? '#09090b' : '#ffffff',
        },
        '.cm-scroller': {
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          padding: '18px 18px 36px',
        },
        '.cm-content': {
          minHeight: '100%',
          caretColor: isDark ? '#fbbf24' : '#b45309',
        },
        '.cm-cursor, .cm-dropCursor': {
          borderLeftColor: isDark ? '#fbbf24' : '#b45309',
        },
        '.cm-gutters': {
          backgroundColor: isDark ? '#09090b' : '#ffffff',
          color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(24,24,27,0.35)',
          borderRight: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(24,24,27,0.08)',
        },
        '.cm-activeLine, .cm-activeLineGutter': {
          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(217, 119, 6, 0.08)',
        },
        '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
          backgroundColor: isDark ? 'rgba(251, 191, 36, 0.24)' : 'rgba(251, 191, 36, 0.26)',
        },
        '.cm-panels, .cm-tooltip, .cm-tooltip-autocomplete': {
          backgroundColor: isDark ? '#18181b' : '#ffffff',
          color: isDark ? '#fafaf9' : '#18181b',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(24,24,27,0.08)',
        },
      }),
    ];
  }, [isDark]);

  const handleAction = useCallback((action: () => void) => {
    const view = editorRef.current;
    if (!view) return;
    action();
    const next = view.state.doc.toString();
    setContent(next);
    lastEditAtRef.current = Date.now();
  }, []);

  const canSplit = !isCompactLayout;
  const activeLayout = canSplit ? layoutMode : layoutMode === 'preview' ? 'preview' : 'edit';

  const toolbarButtons = [
    { label: 'B', action: () => handleAction(() => wrapSelection(editorRef.current!, '**', '**', 'bold')) },
    { label: 'I', action: () => handleAction(() => wrapSelection(editorRef.current!, '*', '*', 'italic')) },
    { label: 'Link', action: () => handleAction(() => wrapSelection(editorRef.current!, '[', '](https://example.com)', 'link text')) },
    { label: 'Image', action: () => handleAction(() => wrapSelection(editorRef.current!, '![', '](/Notes/media.png)', 'alt text')) },
    { label: 'H1', action: () => handleAction(() => prefixSelectionLines(editorRef.current!, '# ')) },
    { label: 'H2', action: () => handleAction(() => prefixSelectionLines(editorRef.current!, '## ')) },
    { label: 'H3', action: () => handleAction(() => prefixSelectionLines(editorRef.current!, '### ')) },
    { label: 'H4', action: () => handleAction(() => prefixSelectionLines(editorRef.current!, '#### ')) },
    { label: 'H5', action: () => handleAction(() => prefixSelectionLines(editorRef.current!, '##### ')) },
    { label: 'H6', action: () => handleAction(() => prefixSelectionLines(editorRef.current!, '###### ')) },
    { label: 'UL', action: () => handleAction(() => prefixSelectionLines(editorRef.current!, '- ')) },
    { label: 'OL', action: () => handleAction(() => prefixSelectionLines(editorRef.current!, '1. ')) },
    { label: '[ ]', action: () => handleAction(() => prefixSelectionLines(editorRef.current!, '- [ ] ')) },
    { label: '[x]', action: () => handleAction(() => prefixSelectionLines(editorRef.current!, '- [x] ')) },
    { label: 'Quote', action: () => handleAction(() => prefixSelectionLines(editorRef.current!, '> ')) },
    { label: 'Code', action: () => handleAction(() => wrapSelection(editorRef.current!, '```\n', '\n```', 'code')) },
    { label: 'Table', action: () => handleAction(() => insertSnippet(editorRef.current!, '| Col 1 | Col 2 |\n| --- | --- |\n| Cell | Cell |')) },
  ];

  return (
    <div className={cn('h-screen w-screen flex flex-col overflow-hidden', isDark ? 'bg-[#09090b] text-white' : 'bg-white text-zinc-900')}>
      <FilePreviewHeader
        path={path}
        fileName={fileName}
        isDark={isDark}
        subtitle={subtitle || t('filemanager.editor.markdownEngine')}
        onClose={onClose}
        hideDownload={hideDownload}
        closeButtonClassName={closeButtonClassName}
        extra={
          <div className="flex items-center gap-3">
            {headerExtra}

            {!loading && (
              <div className={cn(
                'flex items-center p-1 rounded-2xl border',
                isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-100 border-zinc-200',
              )}>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setLayoutMode('preview');
                  }}
                  className={cn(
                    'px-4 h-9 rounded-xl text-sm font-black uppercase transition-all flex items-center gap-2',
                    !isEditing && activeLayout === 'preview'
                      ? (isDark ? 'bg-white/10 text-white' : 'bg-white text-zinc-900 shadow')
                      : 'opacity-50 hover:opacity-100',
                  )}
                >
                  <Eye size={16} /> {t('filemanager.actions.preview')}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setLayoutMode('edit');
                  }}
                  className={cn(
                    'px-4 h-9 rounded-xl text-sm font-black uppercase transition-all flex items-center gap-2',
                    isEditing && activeLayout === 'edit'
                      ? 'bg-amber-500 text-zinc-950 shadow'
                      : 'opacity-50 hover:opacity-100',
                  )}
                >
                  <Edit3 size={16} /> {t('filemanager.preview.edit')}
                </button>
                {canSplit && (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setLayoutMode('split');
                    }}
                    className={cn(
                      'px-4 h-9 rounded-xl text-sm font-black uppercase transition-all flex items-center gap-2',
                      activeLayout === 'split'
                        ? (isDark ? 'bg-white/10 text-white' : 'bg-white text-zinc-900 shadow')
                        : 'opacity-50 hover:opacity-100',
                    )}
                  >
                    <LayoutPanelLeft size={16} /> Split
                  </button>
                )}
              </div>
            )}

            {isEditing && (
              <Button
                variant="primary"
                className="h-10 px-6 rounded-xl text-sm font-black uppercase"
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

      <div className={cn(
        'shrink-0 border-b px-3 py-2',
        isDark ? 'border-white/10 bg-white/5' : 'border-zinc-200 bg-[#fcfbf7]',
      )}>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {toolbarButtons.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.action}
              className={cn(
                'shrink-0 rounded-xl border px-3 py-2 text-xs font-black uppercase transition-all',
                isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-zinc-200 bg-white hover:bg-zinc-50',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <main className={cn('flex-1 min-h-0', activeLayout === 'split' ? 'grid md:grid-cols-2' : 'block')}>
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
            <Loader2 className="animate-spin text-primary" size={40} />
            <p className="text-sm font-black uppercase tracking-[0.3em]">Opening {fileName || path.split('/').pop() || 'Markdown'}...</p>
          </div>
        ) : (
          <>
            {activeLayout !== 'preview' && (
              <section className={cn('h-full min-h-0', activeLayout === 'split' && (isDark ? 'border-r border-white/10' : 'border-r border-zinc-200'))}>
                <CodeMirror
                  value={content}
                  height="100%"
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: false,
                    dropCursor: false,
                    allowMultipleSelections: false,
                    highlightActiveLine: true,
                  }}
                  editable={isEditing}
                  extensions={extensions}
                  onCreateEditor={(view) => { editorRef.current = view; }}
                  onChange={(value) => {
                    setContent(value);
                    lastEditAtRef.current = Date.now();
                  }}
                />
              </section>
            )}

            {activeLayout !== 'edit' && (
              <section className="h-full min-h-0">
                <MarkdownPreviewSurface
                  content={content}
                  isDark={isDark}
                  previewTransform={previewTransform}
                />
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};
