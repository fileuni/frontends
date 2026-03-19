import React from 'react';
import { cn } from '@/lib/utils';

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  className?: string;
};

export const DashboardLinkCard: React.FC<Props> = ({ href, className, children, ...rest }) => {
  return (
    <a
      href={href}
      className={cn(
        'group block p-6 bg-white/[0.03] border border-white/5 rounded-3xl transition-all shadow-primary/5',
        'hover:bg-white/[0.06] hover:border-primary/30 hover:scale-[1.01] hover:shadow-xl',
        className,
      )}
      {...rest}
    >
      {children}
    </a>
  );
};
