import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { MarkdownVditorEditor } from './MarkdownVditorEditor';
import { SimpleMarkdownEditor } from './SimpleMarkdownEditor';
import { TextPreviewAndEditor } from './TextPreviewAndEditor';

type MarkdownEngine = 'textarea' | 'simple' | 'vditor' | 'codemirror';
type ContentMode = 'markdown' | 'plain';

interface SaveResult {
  path?: string;
  fileName?: string;
}

interface Props {
  path: string;
  isDark?: boolean;
  headerExtra?: React.ReactNode;
  onClose?: () => void;
  cdnBase?: string;
  fileName?: string;
  subtitle?: string;
  hideDownload?: boolean;
  closeButtonClassName?: string;
  defaultEditing?: boolean;
  loadContent?: (path: string) => Promise<string>;
  saveContentRequest?: (payload: { path: string; content: string }) => Promise<SaveResult | void>;
  onEditorReady?: () => void;
  previewTransform?: (html: string) => string;
  uploadOptions?: React.ComponentProps<typeof MarkdownVditorEditor>['uploadOptions'];
  contentMode?: ContentMode;
}

const MOBILE_BREAKPOINT = '(max-width: 960px)';
const ENGINE_STORAGE_KEY = 'fileuni:text-editor-engine';
const LEGACY_MARKDOWN_ENGINE_STORAGE_KEY = 'fileuni:markdown-editor-engine';

const getDefaultEngine = (): MarkdownEngine => {
  return 'simple';
};

const normalizeEngine = (value: string | null): MarkdownEngine | null => {
  if (value !== 'textarea' && value !== 'simple' && value !== 'vditor' && value !== 'codemirror') {
    return null;
  }
  return value;
};

export const MarkdownEditorSwitcher: React.FC<Props> = (props) => {
  const [engine, setEngine] = useState<MarkdownEngine>(getDefaultEngine);
  const [isCompactLayout, setIsCompactLayout] = useState(
    typeof window !== 'undefined' && window.matchMedia(MOBILE_BREAKPOINT).matches,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia(MOBILE_BREAKPOINT);
    const update = () => setIsCompactLayout(media.matches);
    update();
    media.addEventListener('change', update);
    const stored = normalizeEngine(window.localStorage.getItem(ENGINE_STORAGE_KEY))
      ?? normalizeEngine(window.localStorage.getItem(LEGACY_MARKDOWN_ENGINE_STORAGE_KEY));
    if (stored) {
      setEngine(stored);
    } else {
      setEngine(getDefaultEngine());
    }
    return () => media.removeEventListener('change', update);
  }, []);

  const handleEngineChange = useCallback((next: MarkdownEngine) => {
    setEngine(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ENGINE_STORAGE_KEY, next);
    }
  }, []);

  const engineExtra = useMemo(() => (
    <div className="flex min-w-0 items-center gap-2">
      {props.headerExtra}
      {isCompactLayout ? (
        <label className={cn(
          'flex h-10 min-w-0 items-center rounded-2xl border px-3 text-xs font-black tracking-[0.1em]',
          props.isDark ? 'border-white/10 bg-white/5 text-white/70' : 'border-zinc-200 bg-white/85 text-zinc-600',
        )}>
          <select
            value={engine}
            onChange={(event) => handleEngineChange(event.target.value as MarkdownEngine)}
            className={cn(
              'min-w-0 bg-transparent text-xs font-black outline-none pr-4',
              props.isDark ? 'text-white' : 'text-zinc-900',
            )}
             aria-label={props.contentMode === 'plain' ? 'Text editor engine' : 'Markdown editor engine'}
            >
              <option value="textarea">Textarea</option>
              <option value="simple">Simple</option>
              <option value="codemirror">CodeMirror</option>
              <option value="vditor">Vditor</option>
            </select>
          </label>
      ) : (
        <div className={cn(
          'flex items-center gap-1 rounded-2xl border p-1',
          props.isDark ? 'border-white/10 bg-white/5' : 'border-zinc-200 bg-white/80',
        )}>
          <Button
            variant={engine === 'textarea' ? 'primary' : 'ghost'}
            size="sm"
            className="h-9 px-3 rounded-xl text-xs"
            onClick={() => handleEngineChange('textarea')}
          >
            Textarea
          </Button>
          <Button
            variant={engine === 'simple' ? 'primary' : 'ghost'}
            size="sm"
            className="h-9 px-3 rounded-xl text-xs"
            onClick={() => handleEngineChange('simple')}
          >
            Simple
          </Button>
          <Button
            variant={engine === 'codemirror' ? 'primary' : 'ghost'}
            size="sm"
            className="h-9 px-3 rounded-xl text-xs"
            onClick={() => handleEngineChange('codemirror')}
          >
            CodeMirror
          </Button>
          <Button
            variant={engine === 'vditor' ? 'primary' : 'ghost'}
            size="sm"
            className="h-9 px-3 rounded-xl text-xs"
            onClick={() => handleEngineChange('vditor')}
          >
            Vditor
          </Button>
        </div>
      )}
    </div>
  ), [engine, handleEngineChange, isCompactLayout, props.contentMode, props.headerExtra, props.isDark]);

  if (engine === 'textarea') {
      return (
        <TextPreviewAndEditor
          {...props}
          headerExtra={engineExtra}
          markdownPreview={props.contentMode !== 'plain'}
          preferCodeEditor={false}
          hideInternalEngineToggle={true}
          {...(props.contentMode === 'plain' ? {} : { languageOverride: 'markdown' })}
        />
    );
  }

  if (engine === 'simple') {
     return <SimpleMarkdownEditor {...props} headerExtra={engineExtra} contentMode={props.contentMode || 'markdown'} />;
  }

  if (engine === 'codemirror') {
      return (
        <TextPreviewAndEditor
          {...props}
          headerExtra={engineExtra}
          markdownPreview={props.contentMode !== 'plain'}
          preferCodeEditor={true}
          hideInternalEngineToggle={true}
          {...(props.contentMode === 'plain' ? {} : { languageOverride: 'markdown' })}
        />
    );
  }

   return <MarkdownVditorEditor {...props} headerExtra={engineExtra} contentMode={props.contentMode || 'markdown'} />;
};
