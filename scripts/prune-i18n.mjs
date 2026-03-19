import fs from 'node:fs';
import path from 'node:path';

// Convenience wrapper around sync-i18n behavior.
// This keeps non-English locales as "diff-only" packs to avoid duplicating English.

const projectRoot = path.resolve(process.cwd());

const run = async () => {
  const scriptPath = path.join(projectRoot, 'scripts', 'sync-i18n.mjs');
  // eslint-disable-next-line no-console
  console.log('[i18n] pruning (diff-only) ...');
  // Dynamic import to run the sync script.
  await import(`file://${scriptPath}`);
};

await run();
