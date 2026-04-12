import React from 'react';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import { cn } from '@/lib/utils';

type DecorativeBackgroundVariant = 'none' | 'diagonal' | 'diagonal-reverse';

type RenderCtx = {
  isDark: boolean;
};

type Props = {
  children: React.ReactNode | ((ctx: RenderCtx) => React.ReactNode);

  outerClassName?: string;
  cardClassName?: string;
  bodyClassName?: string;
  cardMaxWidthClass?: string;

  topPadding?: boolean;
  animate?: boolean;

  decorativeBackground?: DecorativeBackgroundVariant;
  decorativeOpacityClassName?: string;

  accentBarClassName?: string;
};

const renderChildren = (children: Props['children'], ctx: RenderCtx) => {
  if (typeof children === 'function') {
    return children(ctx);
  }
  return children;
};

export const PublicCenteredCard: React.FC<Props> = ({
  children,
  outerClassName,
  cardClassName,
  bodyClassName,
  cardMaxWidthClass = 'max-w-[420px]',
  topPadding = true,
  animate = true,
  decorativeBackground = 'diagonal',
  decorativeOpacityClassName = 'opacity-20',
  accentBarClassName,
}) => {
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === 'dark';

  const decorative = decorativeBackground !== 'none' ? (
    <div className={cn('absolute inset-0 pointer-events-none', decorativeOpacityClassName)}>
      {decorativeBackground === 'diagonal' ? (
        <>
          <div className="absolute top-[-300px] right-[-300px] w-[800px] h-[800px] rounded-full bg-primary/10 blur-[100px]" />
          <div className="absolute bottom-[-300px] left-[-300px] w-[800px] h-[800px] rounded-full bg-blue-500/10 blur-[100px]" />
        </>
      ) : (
        <>
          <div className="absolute -top-[300px] -left-[300px] w-[800px] h-[800px] rounded-full bg-blue-500/5 blur-[100px]" />
          <div className="absolute -bottom-[300px] right-[-300px] w-[800px] h-[800px] rounded-full bg-primary/5 blur-[100px]" />
        </>
      )}
    </div>
  ) : null;

  return (
    <div
      className={cn(
        'relative flex min-h-[calc(100dvh-var(--public-header-offset,0px))] flex-col items-center justify-start bg-background px-3 overflow-x-hidden overflow-y-auto sm:px-6',
        topPadding
          ? 'pt-[calc(clamp(1rem,6dvh,4rem)+var(--safe-area-top,0px))] pb-[calc(1rem+var(--safe-area-bottom,0px))] sm:pt-[calc(clamp(1.5rem,8dvh,5rem)+var(--safe-area-top,0px))] sm:pb-[calc(1.5rem+var(--safe-area-bottom,0px))] md:pt-[calc(clamp(2rem,10dvh,6rem)+var(--safe-area-top,0px))] md:pb-[calc(2rem+var(--safe-area-bottom,0px))]'
          : 'pt-[calc(clamp(0.75rem,3dvh,1.5rem)+var(--safe-area-top,0px))] pb-[calc(0.75rem+var(--safe-area-bottom,0px))] sm:pt-[calc(clamp(1rem,4dvh,2rem)+var(--safe-area-top,0px))] sm:pb-[calc(1rem+var(--safe-area-bottom,0px))] md:pt-[calc(clamp(1.25rem,5dvh,2rem)+var(--safe-area-top,0px))] md:pb-[calc(1.5rem+var(--safe-area-bottom,0px))]',
        outerClassName,
      )}
    >
      {decorative}

        <div
          className={cn(
            'relative z-10 w-full',
            cardMaxWidthClass,
            animate && 'animate-in fade-in slide-in-from-bottom-4 duration-700',
          )}
      >
        <div
          className={cn(
            'backdrop-blur-xl border rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl transition-all',
            isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200',
            cardClassName,
          )}
        >
          {accentBarClassName && (
            <div className={cn('h-1.5 opacity-80', accentBarClassName)} />
          )}

          <div className={cn('p-5 pt-6 sm:p-10 sm:pt-12', bodyClassName)}>
            {renderChildren(children, { isDark })}
          </div>
        </div>
      </div>
    </div>
  );
};
