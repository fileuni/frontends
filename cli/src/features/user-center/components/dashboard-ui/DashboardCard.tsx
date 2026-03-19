import React from 'react';
import { cn } from '@/lib/utils';

export type DashboardCardVariant = 'glass' | 'subtle' | 'info' | 'danger' | 'plain';
export type DashboardCardPadding = 'none' | 'sm' | 'md' | 'lg';

type Props = React.HTMLAttributes<HTMLDivElement> & {
  variant?: DashboardCardVariant;
  padding?: DashboardCardPadding;
  overflowHidden?: boolean;
};

const variantClass = (variant: DashboardCardVariant): string => {
  switch (variant) {
    case 'subtle':
      return 'bg-white/[0.02] border border-white/10 shadow-sm';
    case 'info':
      return 'bg-blue-500/5 border border-blue-500/10 shadow-sm';
    case 'danger':
      return 'bg-red-500/5 border border-red-500/10 shadow-sm';
    case 'plain':
      return 'bg-background border border-border shadow-sm';
    case 'glass':
    default:
      return 'bg-white/[0.03] border border-white/5 shadow-xl';
  }
};

const paddingClass = (padding: DashboardCardPadding): string => {
  switch (padding) {
    case 'sm':
      return 'p-4';
    case 'md':
      return 'p-6';
    case 'lg':
      return 'p-8';
    case 'none':
    default:
      return '';
  }
};

export const DashboardCard: React.FC<Props> = ({
  variant = 'glass',
  padding = 'none',
  overflowHidden = false,
  className,
  children,
  ...rest
}) => {
  return (
    <div
      className={cn(
        'rounded-[2.5rem]',
        variantClass(variant),
        paddingClass(padding),
        overflowHidden && 'overflow-hidden',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
};
