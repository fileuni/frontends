import React from 'react';
import { cn } from '@/lib/utils';

type Props = {
  title: React.ReactNode;
  subtitle?: React.ReactNode | undefined;
  icon?: React.ReactNode | undefined;
  actions?: React.ReactNode | undefined;

  className?: string | undefined;
  titleClassName?: string | undefined;
  subtitleClassName?: string | undefined;
};

export const DashboardSectionHeader: React.FC<Props> = ({
  title,
  subtitle,
  icon,
  actions,
  className,
  titleClassName,
  subtitleClassName,
}) => {
  return (
    <div className={cn('flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3', className)}>
      <div className="min-w-0">
        <div className={cn('text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2', titleClassName)}>
          {icon}
          <span className="min-w-0 truncate">{title}</span>
        </div>
        {subtitle ? (
          <div className={cn('text-base opacity-75 mt-1 leading-relaxed', subtitleClassName)}>
            {subtitle}
          </div>
        ) : null}
      </div>

      {actions ? <div className="shrink-0 w-full sm:w-auto">{actions}</div> : null}
    </div>
  );
};
