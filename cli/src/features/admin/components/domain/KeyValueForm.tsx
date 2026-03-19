import React, { useMemo } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/common/PasswordInput.tsx';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isSensitiveKeyName } from '@/lib/secretKeys.ts';

export interface KeyValueItem {
  key: string;
  value: string;
}

const controlBase =
  "h-11 rounded-xl border border-zinc-400/60 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all shadow-sm font-bold text-foreground placeholder:opacity-30";

const toItems = (obj: Record<string, string>): KeyValueItem[] => {
  return Object.keys(obj)
    .sort((a, b) => a.localeCompare(b))
    .map((k) => ({ key: k, value: obj[k] ?? '' }));
};

const toObject = (items: KeyValueItem[]): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const item of items) {
    const k = item.key.trim();
    if (!k) continue;
    const v = item.value;
    if (typeof v !== 'string') continue;
    if (!v.trim()) continue;
    out[k] = v;
  }
  return out;
};

export const KeyValueForm: React.FC<{
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  addLabel?: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  className?: string;
}> = ({
  value,
  onChange,
  addLabel = 'Add field',
  keyPlaceholder = 'key',
  valuePlaceholder = 'value',
  className,
}) => {
  const items = useMemo(() => {
    const base = toItems(value);
    return base.length === 0 ? [{ key: '', value: '' }] : base;
  }, [value]);

  const updateItems = (nextItems: KeyValueItem[]) => {
    onChange(toObject(nextItems));
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={`${item.key}-${idx}`} className="grid grid-cols-1 md:grid-cols-[200px_1fr_44px] gap-2">
            <Input
              value={item.key}
              placeholder={keyPlaceholder}
              className={cn(controlBase, 'font-mono')}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...next[idx], key: e.target.value };
                updateItems(next);
              }}
            />
            {isSensitiveKeyName(item.key) ? (
              <PasswordInput
                value={item.value}
                placeholder={valuePlaceholder}
                inputClassName={cn(controlBase)}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...next[idx], value: e.target.value };
                  updateItems(next);
                }}
              />
            ) : (
              <Input
                value={item.value}
                placeholder={valuePlaceholder}
                className={cn(controlBase, 'font-mono')}
                type="text"
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...next[idx], value: e.target.value };
                  updateItems(next);
                }}
              />
            )}
            <Button
              type="button"
              variant="outline"
              className="h-11 w-11 p-0 rounded-xl border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-red-50 dark:hover:bg-white/10 shadow-sm"
              onClick={() => {
                const next = [...items];
                next.splice(idx, 1);
                updateItems(next.length === 0 ? [{ key: '', value: '' }] : next);
              }}
              title="Remove"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
      </div>
      <div>
        <Button
          type="button"
          variant="outline"
          className="h-11 px-6 rounded-xl border-zinc-300 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 shadow-sm font-bold"
          onClick={() => updateItems([...items, { key: '', value: '' }])}
        >
          <Plus size={16} className="mr-2" />
          {addLabel}
        </Button>
      </div>
    </div>
  );
};

export const parseJsonObjectToStringMap = (raw: string): Record<string, string> => {
  if (!raw || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const rec = parsed as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(rec)) {
      if (typeof v === 'string') out[k] = v;
      else if (typeof v === 'number' || typeof v === 'boolean') out[k] = String(v);
    }
    return out;
  } catch {
    return {};
  }
};
