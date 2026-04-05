import { ChevronRight, Users } from 'lucide-react';

import { cn } from '@/lib/utils';
import { normalizeEmailInput, normalizePhoneInput } from '@/lib/contactNormalize';

export const normalizeLoginIdentifierInput = (identifier: string) => {
  const trimmed = identifier.trim();
  if (trimmed.includes('@')) {
    return normalizeEmailInput(trimmed);
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return trimmed;
  }
  const normalized = normalizePhoneInput(trimmed);
  if (normalized.length > 5 && /^\+?\d+$/.test(normalized)) {
    return normalized;
  }
  return trimmed;
};

type SavedAccountsShortcutProps = {
  count: number;
  isDark: boolean;
  title: string;
  description: string;
  onClick: () => void;
};

export const SavedAccountsShortcut = ({
  count,
  isDark,
  title,
  description,
  onClick,
}: SavedAccountsShortcutProps) => {
  if (count <= 0) return null;

  return (
    <button
      type="button"
      className={cn(
        'mb-8 p-4 rounded-3xl border flex items-center justify-between group cursor-pointer transition-all',
        isDark ? 'bg-primary/5 border-primary/10 hover:bg-primary/10' : 'bg-primary/5 border-primary/20 hover:bg-primary/10',
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Users size={20} />
        </div>
        <div>
          <p className={cn('text-sm font-black leading-tight', isDark ? 'text-white' : 'text-gray-900')}>
            {title}
          </p>
          <p className="text-sm opacity-40 font-bold tracking-tighter">{description}</p>
        </div>
      </div>
      <ChevronRight size={18} className="opacity-20 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};
