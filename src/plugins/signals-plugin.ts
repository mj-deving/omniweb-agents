/**
 * Signals plugin — consensus signal fetching and alignment scoring.
 *
 * When 2+ agents publish on the same topic with confidence >= 40%,
 * the consensus pipeline triggers clustering, signal extraction,
 * and alignment reports. This plugin wraps that capability.
 *
 * Delegates to: tools/lib/signals.ts
 */

import type { FrameworkPlugin } from "../types.js";

export function createSignalsPlugin(): FrameworkPlugin {
  return {
    name: "signals",
    version: "1.0.0",
    description: "Consensus signal fetching and alignment scoring",
    hooks: {},
  };
}
