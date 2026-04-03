import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const srcRoot = path.join(projectRoot, 'src');

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.astro']);
const EXCLUDED_DIRS = new Set(['i18n', 'types']);

function collectSourceFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const nextPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (dir === srcRoot && EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }
      collectSourceFiles(nextPath, acc);
      continue;
    }
    if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      acc.push(nextPath);
    }
  }
  return acc;
}

function flattenKeys(value, prefix = '', acc = []) {
  if (Array.isArray(value)) {
    return acc;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        flattenKeys(nested, nextPrefix, acc);
      } else {
        acc.push(nextPrefix);
      }
    }
  }
  return acc;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const enModule = await import(pathToFileURL(path.join(projectRoot, 'src/i18n/en/index.ts')).href);
const definedKeys = new Set(flattenKeys(enModule.default).sort());
const sourceFiles = collectSourceFiles(srcRoot);
const sourceEntries = sourceFiles.map((filePath) => ({
  filePath,
  relativePath: path.relative(projectRoot, filePath),
  content: readFileSync(filePath, 'utf8'),
}));

const dynamicKeyFindings = [];
const usedLiteralKeys = new Set();

const literalCallPattern = /\b(?:i18next\.)?t\(\s*(['"])([^'"\n]+)\1/g;
const arrayCallPattern = /\b(?:i18next\.)?t\(\s*\[([\s\S]*?)\]\s*[,)]/g;
const arrayItemPattern = /(['"])([^'"\n]+)\1/g;
const reportDir = path.join(projectRoot, 'dist');
const dynamicReportPath = path.join(reportDir, 'i18n-dynamic-keys.txt');
const unusedReportPath = path.join(reportDir, 'i18n-unused-keys.txt');

for (const entry of sourceEntries) {
  const { relativePath, content } = entry;

  for (const match of content.matchAll(literalCallPattern)) {
    usedLiteralKeys.add(match[2]);
  }

  for (const match of content.matchAll(arrayCallPattern)) {
    const items = [...match[1].matchAll(arrayItemPattern)].map((item) => item[2]);
    for (const key of items) {
      usedLiteralKeys.add(key);
    }
  }

  for (const [index, line] of content.split('\n').entries()) {
    const normalized = line.trim();
    const directCall = normalized.match(/(?:^|\W)(?:i18next\.)?t\(\s*(.+)$/);
    if (!directCall) {
      continue;
    }

    const firstChar = directCall[1]?.trim().charAt(0);
    if (!firstChar || firstChar === '"' || firstChar === '\'' || firstChar === '[') {
      continue;
    }
    if (firstChar === '`' && !directCall[1].includes('${')) {
      continue;
    }
    dynamicKeyFindings.push(`${relativePath}:${index + 1} -> ${normalized.slice(0, 160)}`);
  }
}

const missingKeys = [...usedLiteralKeys].filter((key) => key.includes('.') && !definedKeys.has(key)).sort();
assert(missingKeys.length === 0, `i18n keys referenced in source but missing in translation schema:\n${missingKeys.join('\n')}`);

const combinedSource = sourceEntries.map((entry) => entry.content).join('\n');
const unusedKeys = [...definedKeys]
  .filter((key) => !combinedSource.includes(`'${key}'`) && !combinedSource.includes(`"${key}"`) && !combinedSource.includes(`\`${key}\``))
  .sort();

mkdirSync(reportDir, { recursive: true });
writeFileSync(dynamicReportPath, dynamicKeyFindings.length === 0 ? 'No dynamic translation keys found.\n' : `${dynamicKeyFindings.join('\n')}\n`, 'utf8');
const reportBody = unusedKeys.length === 0 ? 'No unused keys found.\n' : `${unusedKeys.join('\n')}\n`;
writeFileSync(unusedReportPath, reportBody, 'utf8');

assert(
  dynamicKeyFindings.length === 0,
  `dynamic translation keys are not allowed:\n${dynamicKeyFindings.join('\n')}`,
);

console.log(
  `i18n usage check passed. Dynamic key count: ${dynamicKeyFindings.length}. Unused key count: ${unusedKeys.length}`,
);
console.log(`dynamic key report: ${path.relative(projectRoot, dynamicReportPath)}`);
console.log(`unused key report: ${path.relative(projectRoot, unusedReportPath)}`);
