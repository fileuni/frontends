import React from 'react';
import { cn } from '@/lib/utils.ts';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, value, onChange, ...props }, ref) => {
  return (
    <input
      ref={ref}
      value={value ?? ''}
      onChange={onChange}
      className={cn(
        'w-full h-12 rounded-xl border px-4 outline-none',
        'text-base font-semibold placeholder:font-normal',
        'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 shadow-sm',
        'hover:border-slate-400 hover:bg-slate-50/80',
        'focus:border-primary focus:ring-2 focus:ring-primary/20',
        'dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-slate-500 dark:shadow-none',
        'dark:hover:border-white/20 dark:hover:bg-black/40',
        'dark:focus:border-primary/70 dark:focus:ring-primary/25',
        'disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500',
        'dark:disabled:border-white/10 dark:disabled:bg-white/5 dark:disabled:text-slate-500',
        'transition-[background-color,border-color,box-shadow,color] duration-200 ease-out',
        className
      )}
      {...props}
    />
  );
});
