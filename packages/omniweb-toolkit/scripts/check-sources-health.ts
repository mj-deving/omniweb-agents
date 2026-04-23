#!/usr/bin/env npx tsx

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fetchText, getStringArg, hasFlag, PACKAGE_ROOT } from "./_shared.js";

export interface HealthManifestEntry {
  id: string;
  sourceName: string;
  attestUrl: string;
  jsonPath: string;
  auth?: string | null;
  burst?: string | null;
  manifestPath?: string;
}

export interface SourceHealthResult {
  id: string;
  sourceName: string;
  manifestPath: string;
  attestUrl: string;
  resolvedUrl: string | null;
  jsonPath: string;
  auth: string | null;
  burst: string | null;
  ok: boolean;
  status: number;
  contentType: string | null;
  placeholderKeys: string[];
  missingEnvKeys: string[];
  jsonParseOk: boolean;
  jsonPathResolved: boolean;
  resolvedSamples: unknown[];
  error: string | null;
}

export interface SourceHealthReport {
  checkedAt: string;
  ok: boolean;
  manifest: string;
  entriesChecked: number;
  failures: number;
  results: SourceHealthResult[];
}

interface ManifestShape {
  sessionFiles?: string[];
  sources?: Array<Record<string, unknown>>;
  entries?: Array<Record<string, unknown>>;
}

export function loadManifestEntries(
  manifestPath: string,
  options?: { includeSessionFiles?: boolean },
): HealthManifestEntry[] {
  return loadManifestEntriesRecursive(resolve(manifestPath), {
    includeSessionFiles: options?.includeSessionFiles ?? false,
    visited: new Set<string>(),
  });
}

function loadManifestEntriesRecursive(
  resolvedManifest: string,
  options: { includeSessionFiles: boolean; visited: Set<string> },
): HealthManifestEntry[] {
  if (options.visited.has(resolvedManifest)) {
    return [];
  }
  options.visited.add(resolvedManifest);

  const manifest = JSON.parse(readFileSync(resolvedManifest, "utf8")) as ManifestShape;
  const entries: HealthManifestEntry[] = [];

  if (Array.isArray(manifest.sources)) {
    for (const entry of manifest.sources) {
      entries.push(normalizeEntry(entry, resolvedManifest, "sourceId"));
    }
  }

  if (Array.isArray(manifest.entries)) {
    for (const entry of manifest.entries) {
      entries.push(normalizeEntry(entry, resolvedManifest, "id"));
    }
  }

  if (options.includeSessionFiles && Array.isArray(manifest.sessionFiles)) {
    for (const sessionFile of manifest.sessionFiles) {
      const sessionPath = resolve(dirname(resolvedManifest), sessionFile);
      entries.push(...loadManifestEntriesRecursive(sessionPath, options));
    }
  }

  return entries;
}

function normalizeEntry(
  entry: Record<string, unknown>,
  manifestPath: string,
  idField: "sourceId" | "id",
): HealthManifestEntry {
  const idValue = entry[idField];
  const sourceName = typeof entry.sourceName === "string" ? entry.sourceName : null;
  const attestUrl = typeof entry.attestUrl === "string" ? entry.attestUrl : null;
  const jsonPath = typeof entry.jsonPath === "string"
    ? entry.jsonPath
    : typeof entry.verifyJsonPath === "string"
      ? entry.verifyJsonPath
      : null;

  if (!sourceName || !attestUrl || !jsonPath) {
    throw new Error(
      `Malformed manifest entry in ${manifestPath}: sourceName, attestUrl, and jsonPath/verifyJsonPath are required`,
    );
  }

  return {
    id: typeof idValue === "number" || typeof idValue === "string"
      ? String(idValue)
      : sourceName,
    sourceName,
    attestUrl,
    jsonPath,
    auth: typeof entry.auth === "string" ? entry.auth : null,
    burst: typeof entry.burst === "string" ? entry.burst : null,
    manifestPath,
  };
}

export function expandEnvPlaceholders(url: string): {
  resolvedUrl: string | null;
  placeholderKeys: string[];
  missingEnvKeys: string[];
} {
  const placeholderKeys = Array.from(url.matchAll(/\$\{([A-Z0-9_]+)\}/g)).map((match) => match[1]);
  const missingEnvKeys = placeholderKeys.filter((key) => !process.env[key]);
  if (missingEnvKeys.length > 0) {
    return { resolvedUrl: null, placeholderKeys, missingEnvKeys };
  }

  const resolvedUrl = url.replace(/\$\{([A-Z0-9_]+)\}/g, (_, key: string) => process.env[key] ?? "");
  return { resolvedUrl, placeholderKeys, missingEnvKeys };
}

export async function checkSourceHealth(
  entry: HealthManifestEntry,
): Promise<SourceHealthResult> {
  const env = expandEnvPlaceholders(entry.attestUrl);
  if (!env.resolvedUrl) {
    return {
      id: entry.id,
      sourceName: entry.sourceName,
      manifestPath: entry.manifestPath ?? "(unknown)",
      attestUrl: entry.attestUrl,
      resolvedUrl: null,
      jsonPath: entry.jsonPath,
      auth: entry.auth ?? null,
      burst: entry.burst ?? null,
      ok: false,
      status: 0,
      contentType: null,
      placeholderKeys: env.placeholderKeys,
      missingEnvKeys: env.missingEnvKeys,
      jsonParseOk: false,
      jsonPathResolved: false,
      resolvedSamples: [],
      error: `missing_env:${env.missingEnvKeys.join(",")}`,
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(env.resolvedUrl);
  } catch (cause) {
    return {
      id: entry.id,
      sourceName: entry.sourceName,
      manifestPath: entry.manifestPath ?? "(unknown)",
      attestUrl: entry.attestUrl,
      resolvedUrl: env.resolvedUrl,
      jsonPath: entry.jsonPath,
      auth: entry.auth ?? null,
      burst: entry.burst ?? null,
      ok: false,
      status: 0,
      contentType: null,
      placeholderKeys: env.placeholderKeys,
      missingEnvKeys: env.missingEnvKeys,
      jsonParseOk: false,
      jsonPathResolved: false,
      resolvedSamples: [],
      error: cause instanceof Error ? cause.message : "invalid_url",
    };
  }

  const response = await fetchText(parsedUrl.pathname + parsedUrl.search, {
    baseUrl: `${parsedUrl.protocol}//${parsedUrl.host}`,
    accept: "application/json",
    token: "",
  });

  const contentType = extractContentType(response.body);
  let parsed: unknown = null;
  let jsonParseOk = false;
  let resolvedSamples: unknown[] = [];
  let jsonPathResolved = false;
  let error: string | null = null;

  if (response.ok) {
    try {
      parsed = JSON.parse(response.body) as unknown;
      jsonParseOk = true;
      resolvedSamples = resolveJsonPath(parsed, entry.jsonPath).slice(0, 5);
      jsonPathResolved = resolvedSamples.length > 0 && resolvedSamples.some((value) => value !== undefined && value !== null && value !== "");
      if (!jsonPathResolved) {
        error = "json_path_unresolved";
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "invalid_json";
    }
  } else {
    error = response.error ?? `http_${response.status}`;
  }

  return {
    id: entry.id,
    sourceName: entry.sourceName,
    manifestPath: entry.manifestPath ?? "(unknown)",
    attestUrl: entry.attestUrl,
    resolvedUrl: env.resolvedUrl,
    jsonPath: entry.jsonPath,
    auth: entry.auth ?? null,
    burst: entry.burst ?? null,
    ok: response.ok && jsonParseOk && jsonPathResolved,
    status: response.status,
    contentType,
    placeholderKeys: env.placeholderKeys,
    missingEnvKeys: env.missingEnvKeys,
    jsonParseOk,
    jsonPathResolved,
    resolvedSamples,
    error,
  };
}

function extractContentType(body: string): string | null {
  return body.trim().startsWith("{") || body.trim().startsWith("[") ? "application/json" : null;
}

export function resolveJsonPath(payload: unknown, jsonPath: string): unknown[] {
  const tokens = tokenizeJsonPath(jsonPath);
  let current: unknown[] = [payload];

  for (const token of tokens) {
    const next: unknown[] = [];
    for (const value of current) {
      if (token.type === "key") {
        if (value && typeof value === "object" && !Array.isArray(value) && token.key in value) {
          next.push((value as Record<string, unknown>)[token.key]);
        }
      } else if (token.type === "index") {
        if (Array.isArray(value) && token.index < value.length) {
          next.push(value[token.index]);
        }
      } else if (token.type === "wildcard") {
        if (Array.isArray(value)) {
          next.push(...value);
        }
      }
    }
    current = next;
  }

  return current;
}

type JsonPathToken =
  | { type: "key"; key: string }
  | { type: "index"; index: number }
  | { type: "wildcard" };

function tokenizeJsonPath(path: string): JsonPathToken[] {
  const tokens: JsonPathToken[] = [];
  const normalizedPath = path.replace(/^\$\./, "").replace(/^\$/, "");
  const parts = normalizedPath.split(".");
  for (const part of parts) {
    if (part === "[*]") {
      tokens.push({ type: "wildcard" });
      continue;
    }
    const keyMatch = part.match(/^([^[\]]+)/);
    if (keyMatch) {
      tokens.push({ type: "key", key: keyMatch[1] });
    }
    const bracketMatches = Array.from(part.matchAll(/\[(\*|\d+)\]/g));
    for (const match of bracketMatches) {
      if (match[1] === "*") {
        tokens.push({ type: "wildcard" });
      } else {
        tokens.push({ type: "index", index: Number(match[1]) });
      }
    }
  }
  return tokens;
}

export async function buildSourceHealthReport(
  manifestPath: string,
  options?: { includeSessionFiles?: boolean },
): Promise<SourceHealthReport> {
  const entries = loadManifestEntries(manifestPath, options);
  const results = await Promise.all(entries.map((entry) => checkSourceHealth(entry)));
  const failures = results.filter((entry) => !entry.ok).length;

  return {
    checkedAt: new Date().toISOString(),
    ok: failures === 0,
    manifest: resolve(manifestPath),
    entriesChecked: results.length,
    failures,
    results,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (hasFlag(args, "--help", "-h")) {
    console.log(`Usage: npx tsx scripts/check-sources-health.ts --manifest PATH [--include-session-files] [--out PATH]

Check that sweep manifest sources return JSON and that their declared jsonPath resolves.

Options:
  --manifest PATH           Manifest JSON file to check
  --include-session-files   If the manifest declares sessionFiles, load them too
  --out PATH                Also write the JSON report to PATH
  --help, -h                Show this help
`);
    process.exit(0);
  }

  const manifestPath = getStringArg(args, "--manifest");
  const outPath = getStringArg(args, "--out");
  if (!manifestPath) {
    console.error("Error: --manifest PATH is required");
    process.exit(2);
  }

  const report = await buildSourceHealthReport(manifestPath, {
    includeSessionFiles: args.includes("--include-session-files"),
  });
  const body = JSON.stringify(report, null, 2);

  if (outPath) {
    const resolved = resolve(outPath);
    mkdirSync(dirname(resolved), { recursive: true });
    writeFileSync(resolved, `${body}\n`, "utf8");
  }

  console.log(body);
  process.exit(report.ok ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
