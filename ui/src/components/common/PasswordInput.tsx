import React, { useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { IconInput } from '@/components/common/IconInput.tsx';
import { PasswordStrengthMeter } from '@/components/common/PasswordStrengthMeter.tsx';

type Props = Omit<React.ComponentProps<typeof IconInput>, 'type' | 'right'> & {
  defaultVisible?: boolean;
  rightExtra?: React.ReactNode;
  showStrength?: boolean;
  strengthClassName?: string;
};

export const PasswordInput: React.FC<Props> = ({
  defaultVisible = false,
  rightExtra,
  showStrength = false,
  strengthClassName,
  wrapperClassName,
  inputClassName,
  value,
  disabled,
  ...rest
}) => {
  const [visible, setVisible] = useState(defaultVisible);

  const pwd = useMemo(() => {
    if (typeof value === 'string') return value;
    return value == null ? '' : String(value);
  }, [value]);

  return (
    <>
      <IconInput
        {...rest}
        value={value}
        disabled={disabled}
        type={visible ? 'text' : 'password'}
        wrapperClassName={wrapperClassName}
        inputClassName={cn(inputClassName)}
        right={(
          <div className="flex items-center gap-2">
            {rightExtra}
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              disabled={disabled}
              className={cn(
                'opacity-30 hover:opacity-100 transition-opacity',
                disabled && 'pointer-events-none',
              )}
              aria-label={visible ? 'Hide' : 'Show'}
              title={visible ? 'Hide' : 'Show'}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        )}
      />

      {showStrength ? <PasswordStrengthMeter password={pwd} className={strengthClassName} /> : null}
    </>
  );
};
