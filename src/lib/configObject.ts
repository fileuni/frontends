export type ConfigObject = Record<string, unknown>;

export const isRecord = (value: unknown): value is ConfigObject => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const ensureRecord = (target: ConfigObject, key: string): ConfigObject => {
  const value = target[key];
  if (isRecord(value)) {
    return value;
  }
  const next: ConfigObject = {};
  target[key] = next;
  return next;
};

export const deepClone = <T,>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};
