#!/usr/bin/env -S npx tsx
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

type Options = {
  apply: boolean;
  paths: string[];
};

const DEFAULT_PATHS = ['.ai/guides', 'docs/research'];
const SKIP_DIRS = new Set(['.git', 'node_modules', 'vendor', 'dist', 'build']);
const HINT_FIELDS = new Set(['use_when', 'read_when', 'topic_hint']);

function usage(): never {
  console.log([
    'Usage: npx tsx scripts/normalize-doc-frontmatter.ts [--apply] [--path DIR_OR_FILE ...]',
    '',
    'Default is check-only. Default paths: .ai/guides docs/research',
    '',
    'Behavior:',
    '  - non-rule docs: use_when/read_when -> topic_hint',
    '  - docs/rules docs: use_when -> read_when',
    '  - scalar comma-separated hints become YAML arrays',
    '  - duplicate hint fields are merged and de-duplicated',
  ].join('\n'));
  process.exit(0);
}

function parseArgs(argv: string[]): Options {
  const options: Options = { apply: false, paths: [] };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') usage();
    if (arg === '--apply') {
      options.apply = true;
      continue;
    }
    if (arg === '--check') {
      options.apply = false;
      continue;
    }
    if (arg === '--path') {
      const next = argv[i + 1];
      if (!next) throw new Error('--path requires a value');
      options.paths.push(next);
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.paths.length === 0) options.paths = DEFAULT_PATHS;
  return options;
}

function collectMarkdown(path: string): string[] {
  const fullPath = resolve(path);
  const stats = statSync(fullPath);

  if (stats.isFile()) return fullPath.endsWith('.md') ? [fullPath] : [];
  if (!stats.isDirectory()) return [];

  const files: string[] = [];
  for (const entry of readdirSync(fullPath)) {
    if (SKIP_DIRS.has(entry)) continue;
    files.push(...collectMarkdown(resolve(fullPath, entry)));
  }
  return files;
}

function splitFrontMatter(content: string): { yaml: string; body: string; close: string } | null {
  if (!content.startsWith('---\n')) return null;
  const end = content.indexOf('\n---', 4);
  if (end === -1) return null;

  const closeEnd = content.indexOf('\n', end + 4);
  if (closeEnd === -1) return null;

  return {
    yaml: content.slice(4, end),
    close: content.slice(end + 1, closeEnd + 1),
    body: content.slice(closeEnd + 1),
  };
}

function toHints(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(toHints);
  }
  if (typeof value !== 'string') return [];

  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function mergeHints(...values: unknown[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const value of values) {
    for (const hint of toHints(value)) {
      const key = hint.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(hint);
    }
  }

  return merged;
}

function isRulesPath(path: string): boolean {
  return path.replaceAll('\\', '/').includes('/docs/rules/');
}

function splitCommaList(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;

  for (const char of value) {
    if ((char === '"' || char === "'") && !quote) {
      quote = char;
      current += char;
      continue;
    }
    if (char === quote) {
      quote = null;
      current += char;
      continue;
    }
    if (char === ',' && !quote) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  parts.push(current);
  return parts;
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseHintValue(rawValue: string): string[] {
  const trimmed = rawValue.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return splitCommaList(trimmed.slice(1, -1)).map(unquote).filter(Boolean);
  }
  return splitCommaList(trimmed).map(unquote).filter(Boolean);
}

function parseHintFieldAt(lines: string[], index: number): { field: string; value: string[]; consumed: number } | null {
  const line = lines[index];
  const match = line.match(/^(\s*)([A-Za-z0-9_-]+):\s*(.*?)\s*$/);
  if (!match) return null;

  const [, indent, field, rawValue] = match;
  if (!HINT_FIELDS.has(field)) return null;
  if (rawValue !== '') return { field, value: parseHintValue(rawValue), consumed: 1 };

  const values: string[] = [];
  let consumed = 1;
  for (let i = index + 1; i < lines.length; i += 1) {
    const itemMatch = lines[i].match(new RegExp(`^${indent}\\s+-\\s*(.*?)\\s*$`));
    if (!itemMatch) break;
    values.push(unquote(itemMatch[1]));
    consumed += 1;
  }

  if (values.length === 0) return null;

  return { field, value: values, consumed };
}

function serializeHintField(field: string, hints: string[]): string[] {
  if (hints.length === 0) return [];
  return [
    `${field}:`,
    ...hints.map((hint) => `  - ${JSON.stringify(hint)}`),
  ];
}

function normalizeFile(path: string): { changed: boolean; content?: string; reason?: string } {
  const original = readFileSync(path, 'utf8');
  const parts = splitFrontMatter(original);
  if (!parts) return { changed: false };

  const lines = parts.yaml.split('\n');
  const targetField = isRulesPath(path) ? 'read_when' : 'topic_hint';
  const keptLines: string[] = [];
  const removedFields = new Set<string>();
  const hintValues: unknown[] = [];
  let insertAt = -1;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const parsed = parseHintFieldAt(lines, i);
    if (!parsed) {
      keptLines.push(line);
      continue;
    }

    if (insertAt === -1) insertAt = keptLines.length;
    removedFields.add(parsed.field);
    hintValues.push(parsed.value);
    i += parsed.consumed - 1;
  }

  if (!removedFields.has('use_when') && !removedFields.has('read_when')) return { changed: false };

  const hints = mergeHints(...hintValues);
  const nextLines = [...keptLines];
  nextLines.splice(insertAt, 0, ...serializeHintField(targetField, hints));

  const nextYaml = nextLines.join('\n').replace(/\n+$/, '');
  const next = `---\n${nextYaml}\n${parts.close}${parts.body}`;
  if (next === original) return { changed: false };

  return {
    changed: true,
    content: next,
    reason: `${[...removedFields].sort().join('+')} -> ${targetField}`,
  };
}

const options = parseArgs(process.argv.slice(2));
const files = options.paths.flatMap(collectMarkdown).sort();
const changes: Array<{ path: string; reason: string }> = [];

for (const file of files) {
  const result = normalizeFile(file);
  if (!result.changed || !result.content || !result.reason) continue;

  changes.push({ path: relative(process.cwd(), file), reason: result.reason });
  if (options.apply) writeFileSync(file, result.content);
}

for (const change of changes) {
  console.log(`${options.apply ? 'updated' : 'would update'} ${change.path}: ${change.reason}`);
}

if (changes.length === 0) {
  console.log('No front-matter drift found.');
} else if (!options.apply) {
  console.log(`\n${changes.length} file(s) need normalization. Re-run with --apply to write changes.`);
  process.exitCode = 1;
}
