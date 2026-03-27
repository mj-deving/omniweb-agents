/**
 * discoverSources() — browse the bundled source catalog.
 *
 * Read-only, no session required (optional — for custom catalog path).
 * Returns sources filtered by domain, sorted by health score.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { DiscoverSourcesOptions, DiscoverSourcesResult, Source, ToolResult } from "../types.js";
import { ok, err, demosError } from "../types.js";
import { DemosSession } from "../session.js";

// Module-level catalog cache (keyed by path — catalog is static per process)
const catalogCache = new Map<string, Source[]>();

// Bundled catalog path (relative to project root)
const BUNDLED_CATALOG_PATH = resolve(
  fileURLToPath(import.meta.url).replace(/\/src\/toolkit\/tools\/.*$/, ""),
  "config",
  "sources",
  "catalog.json",
);

/**
 * Discover available data sources from the bundled catalog.
 */
export async function discoverSources(
  session: DemosSession | null,
  opts?: DiscoverSourcesOptions,
): Promise<ToolResult<DiscoverSourcesResult>> {
  const start = Date.now();
  if (session) session.touch();

  try {
    const catalogPath = session?.sourceCatalogPath ?? BUNDLED_CATALOG_PATH;
    const sources = await loadCatalog(catalogPath);

    const filtered = opts?.domain
      ? sources.filter((s) => s.domain === opts.domain)
      : sources;

    const active = filtered.filter((s) => s.status !== "quarantined");
    const sorted = active.sort((a, b) => (b.healthScore ?? 0) - (a.healthScore ?? 0));

    const result = ok<DiscoverSourcesResult>(
      { sources: sorted },
      { path: "local", latencyMs: Date.now() - start },
    );

    if (session?.onToolCall) {
      session.onToolCall({ tool: "discoverSources", durationMs: Date.now() - start, result });
    }

    return result;
  } catch (e) {
    return err(
      demosError("INVALID_INPUT", `Failed to load source catalog: ${(e as Error).message}`, false),
      { path: "local", latencyMs: Date.now() - start },
    );
  }
}

async function loadCatalog(catalogPath: string): Promise<Source[]> {
  // Check cache first
  const cached = catalogCache.get(catalogPath);
  if (cached) return cached;

  const raw = await readFile(catalogPath, "utf-8");
  const catalog = JSON.parse(raw);

  const entries = Array.isArray(catalog) ? catalog : catalog.sources ?? [];
  const sources: Source[] = entries.map((entry: Record<string, unknown>) => ({
    id: (entry.id as string) ?? "",
    name: (entry.name as string) ?? (entry.id as string) ?? "",
    domain: (entry.domain as string) ?? (Array.isArray(entry.domainTags) ? (entry.domainTags as string[])[0] : "unknown"),
    url: (entry.url as string) ?? "",
    status: normalizeStatus(entry.status as string),
    healthScore: typeof entry.healthScore === "number"
      ? entry.healthScore
      : (entry.rating && typeof (entry.rating as Record<string, unknown>).overall === "number"
        ? (entry.rating as Record<string, number>).overall
        : undefined),
  }));

  catalogCache.set(catalogPath, sources);
  return sources;
}

function normalizeStatus(status: string | undefined): "active" | "degraded" | "quarantined" {
  if (status === "active" || status === "degraded" || status === "quarantined") {
    return status;
  }
  return "active";
}
