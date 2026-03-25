import React from 'react';
import { cn } from '@/lib/utils';

interface Props {
  content: string;
  isDark?: boolean;
  className?: string;
}

export const PlainTextPreviewSurface: React.FC<Props> = ({
  content,
  isDark = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'h-full overflow-auto px-5 py-6',
        isDark ? 'bg-[#0b0b10] text-zinc-100' : 'bg-[#fcfbf7] text-zinc-900',
        className,
      )}
    >
      <pre className="m-0 whitespace-pre-wrap break-words font-mono text-sm leading-6">{content}</pre>
    </div>
  );
};
