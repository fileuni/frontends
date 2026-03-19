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

// Generate a translation "diff" object.
// Keep only keys that are translated (value differs from base).
// Missing keys fall back to English at runtime.
function diffFromBase(base, target) {
  if (Array.isArray(base)) {
    if (!Array.isArray(target)) return undefined;
    return JSON.stringify(target) === JSON.stringify(base) ? undefined : target;
  }
  if (isPlainObject(base)) {
    const out = {};
    const t = isPlainObject(target) ? target : {};
    for (const key of Object.keys(base)) {
      const child = diffFromBase(base[key], t[key]);
      if (child !== undefined) out[key] = child;
    }
    return Object.keys(out).length ? out : undefined;
  }

  // primitive
  if (typeof base === 'string') {
    if (typeof target !== 'string') return undefined;
    return target === base ? undefined : target;
  }
  if (typeof base === 'number') {
    if (typeof target !== 'number') return undefined;
    return target === base ? undefined : target;
  }
  if (typeof base === 'boolean') {
    if (typeof target !== 'boolean') return undefined;
    return target === base ? undefined : target;
  }
  if (base === null) {
    return target === null || target === undefined ? undefined : target;
  }
  return target === undefined || target === base ? undefined : target;
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
  let keptKeys = 0;

  for (const ns of baseNamespaces) {
    const baseNsPath = path.join(baseDir, `${ns}.json`);
    const targetNsPath = path.join(langDir, `${ns}.json`);

    const baseNs = readJson(baseNsPath);
    const targetNs = fs.existsSync(targetNsPath) ? readJson(targetNsPath) : {};
    const diffNs = diffFromBase(baseNs, targetNs) ?? {};
    writeJson(targetNsPath, diffNs);

    totalKeys += flattenKeys(baseNs, ns).length;
    keptKeys += flattenKeys(diffNs, ns).length;
  }

  writeIndexTs(langDir, baseNamespaces);

  // eslint-disable-next-line no-console
  console.log(`[${lang}] kept=${keptKeys}/${totalKeys} translated leaf keys (diff-only)`);
}
