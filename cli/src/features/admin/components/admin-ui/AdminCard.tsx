import React from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass';
};

export const AdminCard = ({ children, className, variant = 'default' }: Props) => {
  const base =
    variant === 'glass'
      ? 'bg-white/[0.03] border border-white/5'
      : 'bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/5';

  return (
    <div
      className={cn(
        base,
        'rounded-3xl shadow-sm backdrop-blur-sm',
        className,
      )}
    >
      {children}
    </div>
  );
};
