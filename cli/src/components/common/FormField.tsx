import React from 'react';
import { cn } from '@/lib/utils.ts';

type Props = {
  label?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: React.ReactNode;

  className?: string;
  labelClassName?: string;
  hintClassName?: string;
  errorClassName?: string;

  children: React.ReactNode;
};

export const FormField: React.FC<Props> = ({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  labelClassName,
  hintClassName,
  errorClassName,
  children,
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className={cn(
            'text-sm font-black uppercase tracking-widest opacity-40 ml-1',
            labelClassName,
          )}
        >
          {label}
          {required ? <span className="opacity-50"> *</span> : null}
        </label>
      ) : null}
      {children}
      {hint ? (
        <div className={cn('text-sm opacity-60 font-medium', hintClassName)}>{hint}</div>
      ) : null}
      {error ? (
        <div className={cn('text-sm text-red-500 font-bold', errorClassName)}>{error}</div>
      ) : null}
    </div>
  );
};
