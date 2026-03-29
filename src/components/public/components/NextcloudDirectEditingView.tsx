import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Share2, Link2 } from 'lucide-react';
import { BASE_URL } from '@/lib/api';
import { useToastStore } from '@/stores/toast';
import { useNavigationStore } from '@/stores/navigation';
import { useThemeStore } from '@/stores/theme';
import { MarkdownEditorSwitcher } from '@/components/file-manager/components/MarkdownEditorSwitcher';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface DirectEditingState {
  id?: number;
  note_id: number;
  title: string;
  content: string;
  path?: string;
  note_path: string;
  notes_path: string;
  can_share: boolean;
  upload_enabled: boolean;
}

const isExternalUrl = (value: string) => /^(https?:|data:|blob:|mailto:|tel:|javascript:|#)/i.test(value);

export const NextcloudDirectEditingView: React.FC = () => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const { params } = useNavigationStore();
  const { theme } = useThemeStore();
  const token = params.token || '';
  const [state, setState] = useState<DirectEditingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompactLayout, setIsCompactLayout] = useState(
    typeof window !== 'undefined' && window.matchMedia('(max-width: 960px)').matches,
  );
  const loadedRef = useRef(false);
  const initialContentRef = useRef('');

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const directEditBase = useMemo(
    () => `${BASE_URL}/index.php/apps/files/directEditing/${encodeURIComponent(token)}`,
    [token],
  );

  const notifyLoaded = useCallback(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const bridge = (window as Window & {
      DirectEditingMobileInterface?: { loaded?: () => void };
    }).DirectEditingMobileInterface;
    bridge?.loaded?.();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia('(max-width: 960px)');
    const update = () => setIsCompactLayout(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    notifyLoaded();
  }, [notifyLoaded]);

  useEffect(() => {
    let cancelled = false;
    loadedRef.current = false;

    const run = async () => {
      if (!token) {
        setError('Missing direct editing token');
        setLoading(false);
        notifyLoaded();
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${directEditBase}/state`, { credentials: 'include' });
        const raw = (await response.json()) as DirectEditingState & { error?: string };
        const data: DirectEditingState = {
          ...raw,
          note_id: raw.id ?? raw.note_id,
          note_path: raw.path ?? raw.note_path,
        };
        if (!response.ok) {
          throw new Error(raw.error || 'Failed to load direct editing state');
        }
        if (cancelled) return;
        initialContentRef.current = data.content || '';
        setState(data);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load direct editing state';
        setError(message);
        addToast(message, 'error');
        notifyLoaded();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [addToast, directEditBase, notifyLoaded, token]);

  const previewTransform = useCallback(
    (html: string) => {
      return html.replace(/\b(src|href)=("([^"]*)"|'([^']*)')/g, (_full, attr, _quoted, doubleValue, singleValue) => {
        const raw = String(doubleValue ?? singleValue ?? '').trim();
        if (!raw || isExternalUrl(raw)) {
          return `${attr}="${raw}"`;
        }
        const next = `${directEditBase}/asset?path=${encodeURIComponent(raw)}`;
        return `${attr}="${next}"`;
      });
    },
    [directEditBase],
  );

  const uploadOptions = useMemo(() => {
    if (!state?.upload_enabled) return undefined;
    return {
      url: `${directEditBase}/attachment`,
      fieldName: 'file',
      multiple: false,
      accept: 'image/*,audio/*,video/*,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp4,.webm,.mov,.mp3,.wav,.m4a,.aac,.flac,.ogg,.oga,.pdf',
      format: (files: File[], responseText: string) => {
        const payload = JSON.parse(responseText) as {
          ok?: boolean;
          filename?: string;
          path?: string;
          error?: string;
        };
        if (payload.ok === false) {
          throw new Error(payload.error || 'Upload failed');
        }
        const fileName = payload.filename || files[0]?.name || 'attachment';
        const filePath = payload.path || '';
        return JSON.stringify({
          msg: '',
          code: 0,
          data: {
            errFiles: [],
            succMap: {
              [fileName]: filePath,
            },
          },
        });
      },
      error: (message: string) => {
        addToast(message || 'Upload failed', 'error');
      },
    };
  }, [addToast, directEditBase, state?.upload_enabled]);

  const handleSave = useCallback(
    async ({ content, path }: { path: string; content: string }) => {
      const response = await fetch(`${directEditBase}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content, title: state?.title }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        path?: string;
        note_path?: string;
        notePath?: string;
        title?: string;
      };
      if (!response.ok || data.ok === false) {
        throw new Error(data.error || 'Save failed');
      }
      const nextPath = data.path || data.note_path || data.notePath;
      if (data.title || nextPath) {
        setState(prev => prev ? ({
          ...prev,
          title: data.title || prev.title,
          ...(nextPath || prev.path ? { path: nextPath || prev.path } : {}),
          note_path: nextPath || prev.note_path,
        }) : prev);
      }
      const nextResult: { path: string; fileName?: string } = {
        path: nextPath || path,
      };
      const nextFileName = data.title || state?.title;
      if (nextFileName) {
        nextResult.fileName = nextFileName;
      }
      return nextResult;
    },
    [directEditBase, state?.title],
  );

  const loadContent = useCallback(async () => initialContentRef.current, []);

  const handleShare = useCallback(() => {
    const bridge = (window as Window & {
      DirectEditingMobileInterface?: { share?: () => void };
    }).DirectEditingMobileInterface;
    bridge?.share?.();
  }, []);

  const handleClose = useCallback(() => {
    const bridge = (window as Window & {
      DirectEditingMobileInterface?: { close?: () => void };
    }).DirectEditingMobileInterface;
    if (bridge?.close) {
      bridge.close();
      return;
    }
    window.history.back();
  }, []);

  if (loading) {
    return (
      <div className={cn(
        'fixed inset-0 z-[260] flex items-center justify-center backdrop-blur-md',
        isDark ? 'bg-zinc-950/95 text-white' : 'bg-stone-50/95 text-zinc-900',
      )}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary" size={42} />
          <p className="text-sm font-black uppercase tracking-[0.24em] opacity-50">
            {t('filemanager.editor.connectingCdn') || 'Loading editor'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className={cn(
        'fixed inset-0 z-[260] flex items-center justify-center px-6 text-center',
        isDark ? 'bg-zinc-950 text-white' : 'bg-stone-50 text-zinc-900',
      )}>
        <div className="max-w-xl rounded-[2rem] border border-border bg-card/90 p-8 shadow-2xl backdrop-blur-md">
          <h1 className="text-xl font-black tracking-tight">{t('common.error') || 'Error'}</h1>
          <p className="mt-3 text-sm opacity-70">{error || 'Failed to open direct editing session'}</p>
          <div className="mt-6 flex justify-center">
            <Button variant="outline" className="h-11 rounded-2xl px-6 font-black uppercase" onClick={handleClose}>
              {t('common.close') || 'Close'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[260]">
      <MarkdownEditorSwitcher
        path={state.note_path}
        fileName={state.title}
        subtitle={t('filemanager.editor.markdownEngine') || 'Markdown Engine'}
        isDark={isDark}
        onClose={handleClose}
        closeButtonClassName="icon-close"
        hideDownload={true}
        defaultEditing={true}
        headerExtra={state.can_share ? (
          <Button
            variant="outline"
            className={cn(
              'h-10 rounded-xl font-black uppercase',
              isCompactLayout ? 'w-10 px-0 justify-center' : 'px-4',
            )}
            onClick={handleShare}
            title={t('common.share') || 'Share'}
          >
            <Share2 size={16} className={cn(!isCompactLayout && 'mr-2')} />
            {!isCompactLayout && (t('common.share') || 'Share')}
          </Button>
        ) : undefined}
        loadContent={loadContent}
        saveContentRequest={handleSave}
        onEditorReady={notifyLoaded}
        previewTransform={previewTransform}
        uploadOptions={uploadOptions}
      />
      <div className={cn(
        'pointer-events-none fixed z-[261] rounded-2xl border border-border/60 bg-background/85 px-4 py-3 text-xs shadow-xl backdrop-blur-md',
        isCompactLayout ? 'hidden' : 'bottom-5 left-5',
      )}>
        <div className="flex items-center gap-2 font-black uppercase tracking-[0.18em] opacity-60">
          <Link2 size={14} />
          {state.notes_path}
        </div>
        <p className="mt-1 max-w-sm opacity-70">
          {t('filemanager.preview.markdownPlaceholder') || 'Use absolute Notes paths for embedded media so preview and mobile client resolve the same asset.'}
        </p>
      </div>
    </div>
  );
};
