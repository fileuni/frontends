import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());
const i18nRoot = path.join(projectRoot, 'src', 'i18n');
const baseLang = 'en';

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const walkStrings = (obj, prefix, out) => {
  if (!prefix) prefix = '';
  if (!out) out = new Map();
  if (!isPlainObject(obj)) return out;
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (isPlainObject(v)) walkStrings(v, key, out);
    else if (typeof v === 'string') out.set(key, v);
  }
  return out;
};

const namespaces = fs
  .readdirSync(path.join(i18nRoot, baseLang))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .sort();

const base = new Map();
for (const ns of namespaces) {
  const p = path.join(i18nRoot, baseLang, `${ns}.json`);
  const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
  base.set(ns, walkStrings(obj));
}

const langs = fs
  .readdirSync(i18nRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((l) => l !== baseLang)
  .sort();

for (const lang of langs) {
  // eslint-disable-next-line no-console
  console.log(`\n== ${lang} ==`);
  for (const ns of namespaces) {
    const p = path.join(i18nRoot, lang, `${ns}.json`);
    if (!fs.existsSync(p)) continue;
    const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
    const cur = walkStrings(obj);
    const ref = base.get(ns);

    let total = 0;
    let same = 0;
    for (const [k, v] of ref.entries()) {
      total += 1;
      if (cur.get(k) === v) same += 1;
    }

    if (same > 0) {
      // eslint-disable-next-line no-console
      console.log(`${ns}: ${same}/${total} same as en`);
    }
  }
}
