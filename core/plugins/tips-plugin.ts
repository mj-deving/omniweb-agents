/**
 * Tips plugin — autonomous tipping based on post quality scoring.
 *
 * Evaluates posts in the feed and tips high-quality ones (score >= 80,
 * attestation required). Guardrails: max 2/recipient/day, 3-session
 * warmup, 5-min cooldown, 1-10 DEM per tip.
 *
 * State file: ~/.{agent}/tips-state.json
 * Delegates to: tools/lib/tips.ts
 */

import type { FrameworkPlugin } from "../types.js";

export function createTipsPlugin(): FrameworkPlugin {
  return {
    name: "tips",
    version: "1.0.0",
    description: "Autonomous tipping based on post quality scoring",
    hooks: {},
  };
}
