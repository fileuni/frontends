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

function getNamespaceFiles(langDir) {
  return fs
    .readdirSync(langDir)
    .filter((f) => f.endsWith('.json'))
    .filter((f) => f !== 'translation.json')
    .sort();
}

function toValidIdent(raw) {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '_');
  return /^[a-zA-Z_]/.test(cleaned) ? cleaned : `_${cleaned}`;
}

function writeIndexTs(langDir, namespaces) {
  const imports = namespaces
    .map((ns) => {
      const ident = toValidIdent(ns);
      return `import ${ident} from './${ns}.json';`;
    })
    .join('\n');

  const obj = namespaces
    .map((ns) => {
      const ident = toValidIdent(ns);
      return `  ${JSON.stringify(ns)}: ${ident},`;
    })
    .join('\n');

  const content = `${imports}\n\nconst translation = {\n${obj}\n} as const;\n\nexport default translation;\n`;
  fs.writeFileSync(path.join(langDir, 'index.ts'), content, 'utf8');
}

const baseDir = path.join(i18nRoot, BASE_LANG);
const baseNamespaces = getNamespaceFiles(baseDir).map((f) => f.replace(/\.json$/, ''));

const baseKeySet = new Set();
for (const ns of baseNamespaces) {
  const baseNsObj = readJson(path.join(baseDir, `${ns}.json`));
  for (const k of flattenKeys(baseNsObj, ns)) baseKeySet.add(k);
}

for (const lang of TARGET_LANGS) {
  const langDir = path.join(i18nRoot, lang);
  let totalKeys = 0;
  const langKeySet = new Set();

  for (const ns of baseNamespaces) {
    const baseNsPath = path.join(baseDir, `${ns}.json`);
    const targetNsPath = path.join(langDir, `${ns}.json`);

    const baseNs = readJson(baseNsPath);
    const targetNs = fs.existsSync(targetNsPath) ? readJson(targetNsPath) : {};
    const syncedNs = syncFromBase(baseNs, targetNs);
    writeJson(targetNsPath, syncedNs);

    const keys = flattenKeys(syncedNs, ns);
    totalKeys += keys.length;
    for (const k of keys) langKeySet.add(k);
  }

  writeIndexTs(langDir, baseNamespaces);

  const missing = [...baseKeySet].filter((k) => !langKeySet.has(k));
  const extra = [...langKeySet].filter((k) => !baseKeySet.has(k));

  if (missing.length || extra.length) {
    // eslint-disable-next-line no-console
    console.log(`[${lang}] missing=${missing.length} extra=${extra.length}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[${lang}] ok (${totalKeys} leaf keys)`);
  }
}
