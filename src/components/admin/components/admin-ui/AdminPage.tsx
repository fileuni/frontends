import React from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  className?: string;
  withBottomPadding?: boolean;
};

export const AdminPage = ({ children, className, withBottomPadding = true }: Props) => {
  return (
    <div className={cn('space-y-6 sm:space-y-8', withBottomPadding && 'pb-20', className)}>
      {children}
    </div>
  );
};
