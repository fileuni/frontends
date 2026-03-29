export interface ItemsAndTotal<T> {
  items: T[];
  total: number;
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== 'object' || value === null) return null;
  return value as Record<string, unknown>;
};

const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number') return null;
  return Number.isFinite(value) ? value : null;
};

/**
 * Normalize backend list responses into `{ items, total }`.
 *
 * Supports:
 * - `T[]`
 * - `{ items: T[], total?: number }`
 * - `{ items: T[], pagination?: { total?: number } }`
 */
export const parseItemsAndTotal = <T>(value: unknown): ItemsAndTotal<T> => {
  if (Array.isArray(value)) {
    return { items: value as T[], total: value.length };
  }

  const rec = asRecord(value);
  if (!rec) return { items: [], total: 0 };

  const itemsRaw = rec['items'];
  if (!Array.isArray(itemsRaw)) return { items: [], total: 0 };

  const pagination = asRecord(rec['pagination']);
  const total =
    asFiniteNumber(rec['total']) ??
    (pagination ? asFiniteNumber(pagination['total']) : null) ??
    itemsRaw.length;

  return { items: itemsRaw as T[], total };
};
