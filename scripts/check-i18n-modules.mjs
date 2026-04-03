import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const i18nRoot = path.join(projectRoot, 'src/i18n');

function collectJsonFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const nextPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectJsonFiles(nextPath, acc);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.json')) {
      acc.push(nextPath);
    }
  }
  return acc;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function typeOf(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function compareShape(base, target, where) {
  const baseType = typeOf(base);
  const targetType = typeOf(target);
  if (baseType !== targetType) {
    throw new Error(`${where}: expected type ${baseType}, got ${targetType}`);
  }

  if (baseType === 'array') {
    assert(base.length === target.length, `${where}: expected array length ${base.length}, got ${target.length}`);
    for (let i = 0; i < base.length; i += 1) {
      compareShape(base[i], target[i], `${where}[${i}]`);
    }
    return;
  }

  if (baseType === 'object') {
    const baseKeys = Object.keys(base).sort();
    const targetKeys = Object.keys(target).sort();
    assert(
      baseKeys.join('|') === targetKeys.join('|'),
      `${where}: key mismatch\nexpected: ${baseKeys.join(', ')}\nactual: ${targetKeys.join(', ')}`,
    );
    for (const key of baseKeys) {
      compareShape(base[key], target[key], `${where}.${key}`);
    }
  }
}

function extractPlaceholders(value) {
  const placeholders = new Set();
  if (typeof value !== 'string') {
    return placeholders;
  }
  for (const match of value.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)) {
    placeholders.add(match[1]);
  }
  for (const match of value.matchAll(/(?<!\{)\{([a-zA-Z0-9_.-]+)\}(?!\})/g)) {
    placeholders.add(match[1]);
  }
  return placeholders;
}

function comparePlaceholders(base, target, where) {
  const baseType = typeOf(base);
  if (baseType === 'array') {
    for (let i = 0; i < base.length; i += 1) {
      comparePlaceholders(base[i], target[i], `${where}[${i}]`);
    }
    return;
  }
  if (baseType === 'object') {
    for (const key of Object.keys(base)) {
      comparePlaceholders(base[key], target[key], `${where}.${key}`);
    }
    return;
  }
  if (baseType !== 'string') {
    return;
  }

  const basePlaceholders = [...extractPlaceholders(base)].sort();
  const targetPlaceholders = [...extractPlaceholders(target)].sort();
  assert(
    basePlaceholders.join('|') === targetPlaceholders.join('|'),
    `${where}: placeholder mismatch\nexpected: ${basePlaceholders.join(', ')}\nactual: ${targetPlaceholders.join(', ')}`,
  );
}

function importLocalModule(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  return import(pathToFileURL(absolutePath).href);
}

const localeJsonFiles = existsSync(i18nRoot) ? collectJsonFiles(i18nRoot) : [];
if (localeJsonFiles.length > 0) {
  const listed = localeJsonFiles
    .map((filePath) => path.relative(projectRoot, filePath))
    .sort()
    .join('\n');
  throw new Error(`legacy i18n json files remain:\n${listed}`);
}

const [core, adapter, en, zhCn, es, de, fr, ru, ja] = await Promise.all([
  importLocalModule('src/i18n/core.ts'),
  importLocalModule('src/i18n/locale-adapter.ts'),
  importLocalModule('src/i18n/en/index.ts'),
  importLocalModule('src/i18n/zh-cn/index.ts'),
  importLocalModule('src/i18n/es/index.ts'),
  importLocalModule('src/i18n/de/index.ts'),
  importLocalModule('src/i18n/fr/index.ts'),
  importLocalModule('src/i18n/ru/index.ts'),
  importLocalModule('src/i18n/ja/index.ts'),
]);

const translationByResourceLocale = {
  en: en.default,
  'zh-cn': zhCn.default,
  es: es.default,
  de: de.default,
  fr: fr.default,
  ru: ru.default,
  ja: ja.default,
};

assert(
  core.SUPPORTED_LOCALES.length === adapter.FRONTEND_RESOURCE_LOCALES.length,
  'supported locale count mismatch between canonical locales and frontend resource locales',
);

const mappedLocales = core.SUPPORTED_LOCALES.map((locale) => adapter.toFrontendResourceLocale(locale));
assert(
  new Set(mappedLocales).size === adapter.FRONTEND_RESOURCE_LOCALES.length,
  'frontend canonical-to-resource locale mapping must be one-to-one',
);

assert(adapter.normalizeFrontendStoredLocale('zh-cn') === 'zh-cn', 'zh-cn must remain canonical');
assert(adapter.toFrontendResourceLocale('zh-cn') === 'zh-cn', 'zh-cn must map to zh-cn resource locale');

for (const resourceLocale of adapter.FRONTEND_RESOURCE_LOCALES) {
  compareShape(translationByResourceLocale.en, translationByResourceLocale[resourceLocale], `translation.${resourceLocale}`);
  comparePlaceholders(translationByResourceLocale.en, translationByResourceLocale[resourceLocale], `translation.${resourceLocale}`);
}

console.log('i18n module check passed.');
