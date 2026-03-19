export const isSensitiveKeyName = (key: string): boolean => {
  const k = (key || '').trim().toLowerCase();
  if (!k) return false;

  if (k.includes('token')) return true;
  if (k.includes('secret')) return true;
  if (k.includes('password') || k.includes('passwd')) return true;
  if (k.includes('private')) return true;
  if (k.includes('hmac')) return true;

  if (k === 'key') return true;
  if (k === 'ak' || k === 'sk') return true;

  if (k.endsWith('_key') || k.endsWith('-key')) return true;
  if (k.endsWith('_secret') || k.endsWith('-secret')) return true;
  if (k.endsWith('_ak') || k.endsWith('-ak')) return true;
  if (k.endsWith('_sk') || k.endsWith('-sk')) return true;

  return false;
};
