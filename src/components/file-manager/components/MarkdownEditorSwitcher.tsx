import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { isMonacoSupported } from '@/lib/monaco';
import { MarkdownVditorEditor } from './MarkdownVditorEditor';
import { SimpleMarkdownEditor } from './SimpleMarkdownEditor';
import { TextPreviewAndEditor } from './TextPreviewAndEditor';

type MarkdownEngine = 'simple' | 'vditor' | 'monaco';

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
}

const MOBILE_BREAKPOINT = '(max-width: 960px)';
const ENGINE_STORAGE_KEY = 'fileuni:markdown-editor-engine';

const getDefaultEngine = (): MarkdownEngine => {
  if (typeof window === 'undefined') return 'vditor';
  return window.matchMedia(MOBILE_BREAKPOINT).matches ? 'simple' : 'vditor';
};

export const MarkdownEditorSwitcher: React.FC<Props> = (props) => {
  const [engine, setEngine] = useState<MarkdownEngine>(getDefaultEngine);
  const [monacoAvailable, setMonacoAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setMonacoAvailable(isMonacoSupported());
    const stored = window.localStorage.getItem(ENGINE_STORAGE_KEY) as MarkdownEngine | null;
    if (stored === 'simple' || stored === 'vditor' || stored === 'monaco') {
      setEngine(stored);
      return;
    }
    setEngine(getDefaultEngine());
  }, []);

  const handleEngineChange = (next: MarkdownEngine) => {
    setEngine(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ENGINE_STORAGE_KEY, next);
    }
  };

  const engineExtra = useMemo(() => (
    <div className="flex items-center gap-2">
      {props.headerExtra}
      <div className={cn(
        'flex items-center gap-1 rounded-2xl border p-1',
        props.isDark ? 'border-white/10 bg-white/5' : 'border-zinc-200 bg-white/80',
      )}>
        <Button
          variant={engine === 'simple' ? 'primary' : 'ghost'}
          size="sm"
          className="h-9 px-3 rounded-xl text-xs uppercase"
          onClick={() => handleEngineChange('simple')}
        >
          Simple MD
        </Button>
        <Button
          variant={engine === 'vditor' ? 'primary' : 'ghost'}
          size="sm"
          className="h-9 px-3 rounded-xl text-xs uppercase"
          onClick={() => handleEngineChange('vditor')}
        >
          Vditor
        </Button>
        {monacoAvailable && (
          <Button
            variant={engine === 'monaco' ? 'primary' : 'ghost'}
            size="sm"
            className="h-9 px-3 rounded-xl text-xs uppercase"
            onClick={() => handleEngineChange('monaco')}
          >
            Monaco
          </Button>
        )}
      </div>
    </div>
  ), [engine, monacoAvailable, props.headerExtra, props.isDark]);

  if (engine === 'simple') {
    return <SimpleMarkdownEditor {...props} headerExtra={engineExtra} />;
  }

  if (engine === 'monaco' && monacoAvailable) {
    return (
      <TextPreviewAndEditor
        {...props}
        headerExtra={engineExtra}
        languageOverride="markdown"
        markdownPreview={true}
        preferMonaco={true}
      />
    );
  }

  return <MarkdownVditorEditor {...props} headerExtra={engineExtra} />;
};
