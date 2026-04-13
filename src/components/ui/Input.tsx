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
        'w-full h-12 px-4 rounded-xl bg-background border-2 outline-none transition-all font-bold placeholder:font-normal text-base text-foreground',
        /* Light mode: soft gray border, Dark mode: subtle white border */
        'border-gray-200 focus:border-primary/70 focus:ring-2 focus:ring-primary/20',
        'dark:border-white/10 dark:focus:border-primary/70 dark:focus:ring-primary/20',
        'hover:border-gray-300 dark:hover:border-white/20',
        className
      )}
      {...props}
    />
  );
});
