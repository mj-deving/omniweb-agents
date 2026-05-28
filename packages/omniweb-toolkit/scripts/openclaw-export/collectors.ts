import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import { parse } from "yaml";
import type { ExportedFile } from "./types.js";
import { isRecord, normalizeText } from "./text.js";

const SKIPPED_EXPORT_ENTRIES = new Set([
  ".git",
  "node_modules",
]);

export function normalizePathSeparators(path: string): string {
  return path.replace(/\\/g, "/");
}

export function normalizeExportRelativePath(rootDir: string, targetPath: string): string {
  return normalizePathSeparators(relative(rootDir, targetPath));
}
export function collectTextFiles(rootDir: string): ExportedFile[] {
  if (!existsSync(rootDir)) {
    return [];
  }

  const files: ExportedFile[] = [];

  for (const entry of readdirSync(rootDir)) {
    if (SKIPPED_EXPORT_ENTRIES.has(entry)) {
      continue;
    }

    const absolutePath = resolve(rootDir, entry);
    const entryStat = lstatSync(absolutePath);

    if (entryStat.isSymbolicLink()) {
      continue;
    }

    if (entryStat.isDirectory()) {
      files.push(...collectTextFiles(absolutePath).map((file) => ({
        path: normalizeExportRelativePath(rootDir, resolve(absolutePath, file.path)),
        content: file.content,
      })));
      continue;
    }

    files.push({
      path: normalizeExportRelativePath(rootDir, absolutePath),
      content: normalizeText(readFileSync(absolutePath, "utf8")),
    });
  }

  return files.sort((left, right) => left.path.localeCompare(right.path));
}

export function extractRelativeMarkdownLinks(text: string): string[] {
  const links = [...text.matchAll(/\[[^\]]+\]\((?!https?:|mailto:|#|\/)([^)]+)\)/g)]
    .map((match) => match[1]?.trim())
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  return Array.from(new Set(links));
}

export function parseFrontmatter(text: string): Record<string, unknown> | null {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return null;
  const parsed = parse(match[1]);
  return isRecord(parsed) ? parsed : null;
}
