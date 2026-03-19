import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());
const i18nRoot = path.join(projectRoot, 'src', 'i18n');

const BASE_LANG = 'en';
const TARGET_LANGS = ['zh', 'es', 'de', 'fr', 'ru', 'ja'];

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function syncFromBase(base, target) {
  if (Array.isArray(base)) {
    return Array.isArray(target) ? target : base;
  }
  if (isPlainObject(base)) {
    const out = {};
    const t = isPlainObject(target) ? target : {};
    for (const key of Object.keys(base)) {
      out[key] = syncFromBase(base[key], t[key]);
    }
    return out;
  }
  // primitive
  if (typeof base === 'string') {
    return typeof target === 'string' ? target : base;
  }
  if (typeof base === 'number') {
    return typeof target === 'number' ? target : base;
  }
  if (typeof base === 'boolean') {
    return typeof target === 'boolean' ? target : base;
  }
  return target === undefined ? base : target;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function flattenKeys(obj, prefix = '') {
  const out = [];
  if (Array.isArray(obj)) return out;
  if (!isPlainObject(obj)) return out;
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (isPlainObject(v)) out.push(...flattenKeys(v, p));
    else out.push(p);
  }
  return out;
}

const basePath = path.join(i18nRoot, BASE_LANG, 'translation.json');
const base = readJson(basePath);
const baseKeys = new Set(flattenKeys(base));

for (const lang of TARGET_LANGS) {
  const targetPath = path.join(i18nRoot, lang, 'translation.json');
  const target = readJson(targetPath);
  const synced = syncFromBase(base, target);
  writeJson(targetPath, synced);

  const keys = new Set(flattenKeys(synced));
  const missing = [...baseKeys].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !baseKeys.has(k));

  if (missing.length || extra.length) {
    // eslint-disable-next-line no-console
    console.log(`[${lang}] missing=${missing.length} extra=${extra.length}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[${lang}] ok (${keys.size} leaf keys)`);
  }
}
