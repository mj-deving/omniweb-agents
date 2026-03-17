/**
 * Observe plugin — observation logging via inline JSONL append.
 *
 * Observe is an inline operation (appendFileSync), not hook-driven.
 * This plugin exists for registry completeness and documentation —
 * it ensures the observe capability is discoverable alongside other
 * plugins even though its invocation pattern differs.
 *
 * Delegates to: tools/lib/observe.ts
 */

import type { FrameworkPlugin } from "../types.js";

export function createObservePlugin(): FrameworkPlugin {
  return {
    name: "observe",
    version: "1.0.0",
    description:
      "Observation logging — inline JSONL append, no hook-driven lifecycle",
    // Observe is inline (appendFileSync), not hook-driven.
    // This plugin exists for registry completeness and documentation.
    hooks: {},
  };
}
