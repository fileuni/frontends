import type { LocaleShape } from '@/i18n/core';

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

export type DeepPartial<T> = T extends Primitive
  ? T
  : T extends readonly (infer U)[]
    ? readonly DeepPartial<U>[]
    : {
        [K in keyof T]?: DeepPartial<T[K]>;
      };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergePlainObject(
  base: Record<string, unknown>,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };

  for (const [key, overrideValue] of Object.entries(overrides)) {
    if (overrideValue === undefined) {
      continue;
    }

    const baseValue = merged[key];
    merged[key] =
      isPlainObject(baseValue) && isPlainObject(overrideValue)
        ? mergePlainObject(baseValue, overrideValue)
        : overrideValue;
  }

  return merged;
}

export function mergeLocale<T>(base: T, overrides: DeepPartial<LocaleShape<T>>): LocaleShape<T> {
  if (!isPlainObject(base) || !isPlainObject(overrides)) {
    return overrides as LocaleShape<T>;
  }

  return mergePlainObject(base, overrides) as LocaleShape<T>;
}
