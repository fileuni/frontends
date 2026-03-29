import React from 'react';
import { cn } from '@/lib/utils.ts';
import { Input } from '@/components/ui/Input.tsx';

type Props = Omit<React.ComponentProps<typeof Input>, 'className'> & {
  icon?: React.ReactNode;
  right?: React.ReactNode;

  wrapperClassName?: string | undefined;
  inputClassName?: string | undefined;
};

export const IconInput = React.forwardRef<HTMLInputElement, Props>(
  ({ icon, right, wrapperClassName, inputClassName, ...props }, ref) => {
    const hasIcon = Boolean(icon);
    const hasRight = Boolean(right);

    return (
      <div className={cn('relative group', wrapperClassName)}>
        {hasIcon ? (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:text-primary group-focus-within:opacity-100 transition-all">
            {icon}
          </div>
        ) : null}
        <Input
          ref={ref}
          {...props}
          className={cn(hasIcon && 'pl-12', hasRight && 'pr-12', inputClassName)}
        />
        {hasRight ? (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">{right}</div>
        ) : null}
      </div>
    );
  },
);

IconInput.displayName = 'IconInput';
