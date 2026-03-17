/**
 * Lifecycle plugin — source health testing and state transitions.
 *
 * Manages the source lifecycle state machine:
 *   quarantined -> active  (3 consecutive passes)
 *   active -> degraded     (3 fails or rating < 40)
 *   degraded -> active     (recovery: 3 passes + rating >= 60)
 *   quarantined -> archived (5 consecutive failures)
 *
 * The beforeSense hook is registered at runtime by session-runner
 * because it needs catalog path and write access. This plugin
 * documents the pattern for runtime-registered hooks.
 */

import type { FrameworkPlugin } from "../types.js";

export function createLifecyclePlugin(): FrameworkPlugin {
  return {
    name: "lifecycle",
    version: "1.0.0",
    description: "Source lifecycle health testing and state transitions",

    // beforeSense hook is registered at runtime by session-runner
    // because it needs catalog path and write access.
    // This plugin documents the pattern for runtime-registered hooks.
    hooks: {},
  };
}
