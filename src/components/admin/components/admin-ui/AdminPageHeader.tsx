import React from 'react';
import { cn } from '@/lib/utils';

type Props = {
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode | undefined;
  actions?: React.ReactNode | undefined;
  className?: string | undefined;
  iconClassName?: string | undefined;
};

export const AdminPageHeader = ({
  icon,
  title,
  subtitle,
  actions,
  className,
  iconClassName,
}: Props) => {
  return (
    <div
      className={cn(
        'flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6',
        className,
      )}
    >
      <div className="flex items-center gap-4 min-w-0 w-full xl:w-auto">
        <div
          className={cn(
            'w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner shrink-0',
            iconClassName,
          )}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <h2 className="text-2xl font-black tracking-tight truncate">{title}</h2>
          {subtitle ? <div className="mt-1 text-sm text-foreground/60">{subtitle}</div> : null}
        </div>
      </div>

      {actions ? <div className="w-full xl:w-auto flex items-center gap-3">{actions}</div> : null}
    </div>
  );
};
