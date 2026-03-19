import React from 'react';
import { cn } from '@/lib/utils';

type Props = {
  label?: string;
  className?: string;
};

export const DashboardLoading: React.FC<Props> = ({ label, className }) => {
  return (
    <div className={cn('h-64 flex items-center justify-center', className)}>
      {label ? (
        <span className="opacity-50 font-black uppercase tracking-widest">{label}</span>
      ) : (
        <span className="loading-spinner w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
};
