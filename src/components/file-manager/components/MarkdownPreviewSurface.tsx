import React, { useEffect, useMemo, useRef } from 'react';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { marked } from 'marked';
import { cn } from '@/lib/utils';

interface Props {
  content: string;
  isDark?: boolean;
  previewTransform?: (html: string) => string;
  className?: string;
}

marked.setOptions({
  gfm: true,
  breaks: true,
});

export const MarkdownPreviewSurface: React.FC<Props> = ({
  content,
  isDark = false,
  previewTransform,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const html = useMemo(() => {
    const raw = marked.parse(content || '') as string;
    const transformed = previewTransform ? previewTransform(raw) : raw;
    return DOMPurify.sanitize(transformed, {
      ADD_ATTR: ['target', 'rel', 'class'],
    });
  }, [content, previewTransform]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.querySelectorAll('pre code').forEach((node) => {
      hljs.highlightElement(node as HTMLElement);
    });
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'h-full overflow-auto px-5 py-6',
        isDark ? 'bg-[#0b0b10] text-zinc-100' : 'bg-[#fcfbf7] text-zinc-900',
        className,
      )}
    >
      <article
        className={cn(
          'prose prose-sm sm:prose-base max-w-none prose-pre:overflow-x-auto prose-pre:rounded-2xl prose-pre:border prose-pre:px-4 prose-pre:py-3 prose-code:before:hidden prose-code:after:hidden prose-img:rounded-2xl prose-video:rounded-2xl',
          isDark
            ? 'prose-invert prose-headings:text-zinc-50 prose-a:text-amber-300 prose-strong:text-zinc-100 prose-pre:bg-zinc-950 prose-pre:border-white/10 prose-blockquote:border-amber-500/50 prose-blockquote:text-zinc-300'
            : 'prose-stone prose-headings:text-zinc-900 prose-a:text-amber-700 prose-pre:bg-white prose-pre:border-zinc-200 prose-blockquote:border-amber-600/50 prose-blockquote:text-zinc-600',
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};
