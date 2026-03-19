/**
 * Provider adapter registry — maps provider names to adapter instances.
 *
 * All provider adapters are declarative (YAML specs loaded at init time),
 * except generic.ts which serves as the quarantine fallback adapter.
 *
 * PR4: Declarative engine shipped.
 * PR5: Hand-written adapters removed — declarative-only registry.
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ProviderAdapter } from "./types.js";
import { adapter as generic } from "./generic.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Registry ────────────────────────────────────────

// Start with generic adapter (quarantine fallback)
const ADAPTER_REGISTRY: Map<string, ProviderAdapter> = new Map([
  ["generic", generic],
]);

// Load declarative specs (async loader enables hooks for arxiv/kraken)
let declarativeLoaded = false;
try {
  const { loadDeclarativeProviderAdapters } = await import("./declarative-engine.js");
  const specsDir = resolve(__dirname, "specs");
  const declarativeAdapters = await loadDeclarativeProviderAdapters({ specDir: specsDir, strictValidation: false });

  for (const [name, adapter] of declarativeAdapters) {
    if (name === "generic") continue; // never override generic
    ADAPTER_REGISTRY.set(name, adapter);
  }
  declarativeLoaded = true;
} catch {
  // Declarative engine not available or specs dir missing — generic-only fallback
}

// ── Public API ──────────────────────────────────────

/**
 * Get the adapter for a provider. Returns null if no adapter is registered.
 */
export function getProviderAdapter(provider: string): ProviderAdapter | null {
  return ADAPTER_REGISTRY.get(provider) ?? null;
}

/**
 * Get the adapter for a provider. Throws if no adapter is registered.
 */
export function requireProviderAdapter(provider: string): ProviderAdapter {
  const adapter = ADAPTER_REGISTRY.get(provider);
  if (!adapter) {
    throw new Error(`No adapter registered for provider "${provider}"`);
  }
  return adapter;
}

/**
 * List all registered provider adapters.
 */
export function listProviderAdapters(): ProviderAdapter[] {
  return [...ADAPTER_REGISTRY.values()];
}

/**
 * Whether declarative specs were successfully loaded.
 */
export function isDeclarativeLoaded(): boolean {
  return declarativeLoaded;
}
