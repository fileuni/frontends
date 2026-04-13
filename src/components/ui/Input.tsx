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
        'ui-input w-full h-12 rounded-xl border px-4 outline-none',
        'text-base font-semibold placeholder:font-normal',
        'transition-[background-color,border-color,box-shadow,color] duration-200 ease-out',
        className
      )}
      {...props}
    />
  );
});
