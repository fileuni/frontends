import React, { useMemo } from 'react';
import { cn } from '@/lib/utils.ts';

const computeStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 6) strength++;
  if (password.length >= 10) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  return strength;
};

type Props = {
  password: string;
  className?: string | undefined;
};

export const PasswordStrengthMeter: React.FC<Props> = ({ password, className }) => {
  const strength = useMemo(() => computeStrength(password), [password]);
  if (!password) return null;

  return (
    <div className={cn('flex gap-1 h-1 px-1 mt-2', className)}>
      {[1, 3, 5].map((lvl) => (
        <div
          key={lvl}
          className={cn(
            'flex-1 rounded-full transition-all duration-500',
            strength >= lvl
              ? lvl === 1
                ? 'bg-red-500'
                : lvl === 3
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              : 'bg-white/10',
          )}
        />
      ))}
    </div>
  );
};
