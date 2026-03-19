import fs from 'node:fs/promises';
import path from 'node:path';

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

const workspaceRoot = process.cwd();
const i18nDir = path.join(workspaceRoot, 'src', 'i18n');

const isPlainObject = (v: unknown): v is Record<string, unknown> => {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
};

const stableJsonStringify = (value: Json): string => {
  return JSON.stringify(value, null, 2) + '\n';
};

const writeFileIfChanged = async (filePath: string, content: string) => {
  try {
    const prev = await fs.readFile(filePath, 'utf8');
    if (prev === content) return;
  } catch {
    // ignore
  }
  await fs.writeFile(filePath, content, 'utf8');
};

const toValidIdent = (raw: string): string => {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '_');
  return /^[a-zA-Z_]/.test(cleaned) ? cleaned : `_${cleaned}`;
};

const main = async () => {
  const dirents = await fs.readdir(i18nDir, { withFileTypes: true });
  const langs = dirents.filter((d) => d.isDirectory()).map((d) => d.name).sort();

  for (const lang of langs) {
    const langDir = path.join(i18nDir, lang);
    const inputPath = path.join(langDir, 'translation.json');
    let raw: string;
    try {
      raw = await fs.readFile(inputPath, 'utf8');
    } catch {
      continue;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) {
      throw new Error(`Invalid translation.json for lang=${lang}: expected object`);
    }

    const namespaces = Object.keys(parsed).sort();
    for (const ns of namespaces) {
      const nsValue = (parsed as Record<string, Json>)[ns];
      const nsPath = path.join(langDir, `${ns}.json`);
      await writeFileIfChanged(nsPath, stableJsonStringify(nsValue ?? {}));
    }

    const indexImports = namespaces
      .map((ns) => {
        const ident = toValidIdent(ns);
        return `import ${ident} from './${ns}.json';`;
      })
      .join('\n');
    const indexObject = namespaces
      .map((ns) => {
        const ident = toValidIdent(ns);
        return `  ${JSON.stringify(ns)}: ${ident},`;
      })
      .join('\n');

    const indexTs = `${indexImports}\n\nconst translation = {\n${indexObject}\n} as const;\n\nexport default translation;\n`;
    await writeFileIfChanged(path.join(langDir, 'index.ts'), indexTs);
  }
};

await main();
