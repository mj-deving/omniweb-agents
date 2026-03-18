/**
 * File-based WatermarkStore — persists event source watermarks to JSON.
 *
 * Path: ~/.{agent}/event-watermarks.json
 * Format: { "sourceId": watermarkValue, ... }
 *
 * Uses atomic rename pattern (consistent with write-rate-limit.ts).
 * In-memory cache during runtime, flushed after each poll cycle.
 */

import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";
import type { WatermarkStore } from "../../core/types.js";

/**
 * Resolve the watermark file path for an agent.
 */
export function watermarkPath(agent: string): string {
  return resolve(homedir(), `.${agent}`, "event-watermarks.json");
}

/**
 * Create a file-based WatermarkStore.
 *
 * Reads from disk on first access, caches in memory,
 * writes atomically on save().
 */
export function createFileWatermarkStore(agent: string): WatermarkStore {
  const filePath = watermarkPath(agent);
  let cache: Record<string, unknown> | null = null;

  function ensureLoaded(): Record<string, unknown> {
    if (cache !== null) return cache;
    if (existsSync(filePath)) {
      try {
        cache = JSON.parse(readFileSync(filePath, "utf-8"));
      } catch {
        cache = {};
      }
    } else {
      cache = {};
    }
    return cache!;
  }

  function persist(): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const tmp = filePath + ".tmp";
    writeFileSync(tmp, JSON.stringify(cache, null, 2) + "\n");
    renameSync(tmp, filePath);
  }

  return {
    async load(sourceId: string): Promise<unknown | null> {
      const data = ensureLoaded();
      return data[sourceId] ?? null;
    },

    async save(sourceId: string, watermark: unknown): Promise<void> {
      ensureLoaded();
      cache![sourceId] = watermark;
      persist();
    },

    async loadAll(): Promise<Record<string, unknown>> {
      return { ...ensureLoaded() };
    },
  };
}

/**
 * Create an in-memory WatermarkStore (for testing).
 */
export function createMemoryWatermarkStore(): WatermarkStore {
  const store: Record<string, unknown> = {};

  return {
    async load(sourceId: string): Promise<unknown | null> {
      return store[sourceId] ?? null;
    },
    async save(sourceId: string, watermark: unknown): Promise<void> {
      store[sourceId] = watermark;
    },
    async loadAll(): Promise<Record<string, unknown>> {
      return { ...store };
    },
  };
}
