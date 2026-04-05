import React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type LoadingProps = {
  label: React.ReactNode;
  className?: string;
};

export const AdminLoadingState = ({ label, className }: LoadingProps) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-20 opacity-40', className)}>
      <RefreshCw className="animate-spin mb-4" size={28} />
      <p className="text-sm font-black tracking-widest">{label}</p>
    </div>
  );
};

type EmptyProps = {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
};

export const AdminEmptyState = ({ icon, title, description, className }: EmptyProps) => {
  return (
    <div className={cn('py-16 text-center opacity-60', className)}>
      {icon ? <div className="mx-auto mb-4 flex justify-center">{icon}</div> : null}
      <div className="text-sm font-black tracking-widest">{title}</div>
      {description ? <div className="mt-2 text-sm opacity-70">{description}</div> : null}
    </div>
  );
};
