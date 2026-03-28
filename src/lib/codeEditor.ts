import type { Extension } from '@codemirror/state';
import { LanguageDescription, StreamLanguage } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { toml as tomlMode } from '@codemirror/legacy-modes/mode/toml';

const languageCache = new Map<string, Promise<Extension[]>>();

const languageAliases: Record<string, string> = {
  plaintext: 'plaintext',
  text: 'plaintext',
  txt: 'plaintext',
  shell: 'shell',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  ps1: 'powershell',
  md: 'markdown',
  yml: 'yaml',
  rs: 'rust',
  py: 'python',
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'tsx',
  conf: 'properties',
  cfg: 'properties',
  cnf: 'properties',
  ini: 'properties',
  tex: 'stex',
  latex: 'stex',
};

const normalizeLanguage = (language?: string): string => {
  const normalized = (language || 'plaintext').trim().toLowerCase();
  return languageAliases[normalized] || normalized;
};

const getLanguageDescription = (language: string): LanguageDescription | null => {
  const normalized = normalizeLanguage(language);
  const directMatch = languages.find((item) => {
    const names = [item.name, ...(item.alias || [])]
      .filter(Boolean)
      .map((value) => value.toLowerCase());
    return names.includes(normalized);
  });
  if (directMatch) {
    return directMatch;
  }

  return (
    LanguageDescription.matchFilename(languages, `file.${normalized}`)
    ?? LanguageDescription.matchFilename(languages, normalized)
    ?? null
  );
};

const getStaticLanguageExtensions = (language: string): Extension[] | null => {
  const normalized = normalizeLanguage(language);
  if (normalized === 'plaintext') {
    return [];
  }
  if (normalized === 'toml-config' || normalized === 'toml') {
    return [StreamLanguage.define(tomlMode)];
  }
  return null;
};

export const loadCodeEditorLanguage = (language?: string): Promise<Extension[]> => {
  const cacheKey = normalizeLanguage(language);
  const cached = languageCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const pending = (async () => {
    const staticExtensions = getStaticLanguageExtensions(cacheKey);
    if (staticExtensions) {
      return staticExtensions;
    }

    const description = getLanguageDescription(cacheKey);
    if (!description) {
      return [];
    }

    try {
      const support = await description.load();
      return support ? [support] : [];
    } catch (error) {
      console.warn(`Failed to load CodeMirror language support for ${cacheKey}:`, error);
      return [];
    }
  })();

  languageCache.set(cacheKey, pending);
  return pending;
};
