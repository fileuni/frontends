import React, { useEffect, useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { loadCodeEditorLanguage } from '@/lib/codeEditor';

interface EditorPadding {
  top?: number;
  bottom?: number;
}

interface EditorOptions {
  readOnly?: boolean;
  fontSize?: number;
  fontFamily?: string;
  wordWrap?: 'on' | 'off';
  lineNumbers?: 'on' | 'off';
  lineNumbersMinChars?: number;
  renderLineHighlight?: 'all' | 'none';
  padding?: EditorPadding;
}

interface Props {
  height?: string;
  width?: string;
  language?: string;
  value?: string;
  theme?: string;
  options?: EditorOptions;
  extensions?: Extension[];
  className?: string;
  onChange?: (value: string) => void;
  onCreateEditor?: (view: EditorView) => void;
}

const DEFAULT_FONT_FAMILY = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

export const CodeMirrorEditor: React.FC<Props> = ({
  height = '100%',
  width = '100%',
  language,
  value,
  theme,
  options,
  extensions,
  className,
  onChange,
  onCreateEditor,
}) => {
  const [languageExtensions, setLanguageExtensions] = useState<Extension[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadCodeEditorLanguage(language).then((loaded) => {
      if (!cancelled) {
        setLanguageExtensions(loaded);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [language]);

  const isDark = theme === 'dark' || theme === 'vs-dark';
  const fontSize = options?.fontSize || 14;
  const fontFamily = options?.fontFamily || DEFAULT_FONT_FAMILY;
  const topPadding = options?.padding?.top ?? 16;
  const bottomPadding = options?.padding?.bottom ?? 24;
  const lineNumbersMinChars = options?.lineNumbersMinChars ?? 3;
  const highlightActiveLine = options?.renderLineHighlight !== 'none';

  const mergedExtensions = useMemo(() => {
    const themeExtension = EditorView.theme({
      '&': {
        height,
        width,
        fontSize: `${fontSize}px`,
        backgroundColor: isDark ? '#09090b' : '#ffffff',
        color: isDark ? '#f4f4f5' : '#18181b',
      },
      '.cm-editor': {
        height: '100%',
        backgroundColor: isDark ? '#09090b' : '#ffffff',
      },
      '.cm-scroller': {
        minHeight: '100%',
        fontFamily,
        lineHeight: '1.6',
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        overscrollBehavior: 'contain',
      },
      '.cm-content': {
        minHeight: '100%',
        padding: `${topPadding}px 0 ${bottomPadding}px`,
        caretColor: isDark ? '#fbbf24' : '#b45309',
      },
      '.cm-lineNumbers .cm-gutterElement': {
        minWidth: `${lineNumbersMinChars}ch`,
      },
      '.cm-gutters': {
        backgroundColor: isDark ? '#09090b' : '#ffffff',
        color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(24,24,27,0.38)',
        borderRight: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(24,24,27,0.08)',
      },
      '.cm-activeLine, .cm-activeLineGutter': {
        backgroundColor: highlightActiveLine
          ? (isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(217, 119, 6, 0.08)')
          : 'transparent',
      },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
        backgroundColor: isDark ? 'rgba(251, 191, 36, 0.24)' : 'rgba(251, 191, 36, 0.22)',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: isDark ? '#fbbf24' : '#b45309',
      },
      '.cm-tooltip, .cm-panels': {
        backgroundColor: isDark ? '#18181b' : '#ffffff',
        color: isDark ? '#fafafa' : '#18181b',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(24,24,27,0.08)',
      },
    }, { dark: isDark });

    return [
      ...(options?.wordWrap === 'on' ? [EditorView.lineWrapping] : []),
      ...languageExtensions,
      themeExtension,
      ...(extensions || []),
    ];
  }, [bottomPadding, extensions, fontFamily, fontSize, height, highlightActiveLine, isDark, languageExtensions, lineNumbersMinChars, options?.wordWrap, topPadding, width]);

  return (
    <CodeMirror
      value={value || ''}
      height={height}
      width={width}
      theme={isDark ? 'dark' : 'light'}
      editable={!options?.readOnly}
      extensions={mergedExtensions}
      basicSetup={{
        lineNumbers: options?.lineNumbers !== 'off',
        foldGutter: false,
        dropCursor: false,
        allowMultipleSelections: false,
        highlightActiveLine,
        highlightActiveLineGutter: highlightActiveLine,
      }}
      className={className}
      onCreateEditor={onCreateEditor}
      onChange={(nextValue) => onChange?.(nextValue)}
    />
  );
};
