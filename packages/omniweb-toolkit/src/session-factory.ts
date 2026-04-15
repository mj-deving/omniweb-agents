/**
 * Session Factory — bridges AgentRuntime to DemosSession.
 *
 * The consumer package uses AgentRuntime (lightweight, 6-step init).
 * Internal toolkit tools require DemosSession (opaque session handle
 * with guards, policies, and signing). This factory bridges the gap.
 *
 * Used lazily by HiveAPI — session only created on first write call.
 */

import type { AgentRuntime } from "../../../src/toolkit/agent-runtime.js";
import { DemosSession } from "../../../src/toolkit/session.js";
import { FileStateStore } from "../../../src/toolkit/state-store.js";

export interface SessionFactoryOptions {
  /** Override state directory for guard persistence (defaults to ~/.config/demos) */
  stateDir?: string;
  /** URL allowlist for attestation — only these origins can be attested */
  urlAllowlist?: string[];
  /** Allow insecure (HTTP) URLs — for local dev only */
  allowInsecureUrls?: boolean;
}

/**
 * Create a DemosSession from an AgentRuntime.
 *
 * Maps runtime fields to session constructor opts:
 * - runtime.address → walletAddress
 * - runtime.sdkBridge → signingHandle.bridge
 * - runtime.demos → signingHandle.demos
 * - runtime.getToken() → authToken (awaited)
 */
export async function createSessionFromRuntime(
  runtime: AgentRuntime,
  opts?: SessionFactoryOptions,
): Promise<DemosSession> {
  const authToken = await runtime.getToken() ?? "";
  const stateStore = opts?.stateDir
    ? new FileStateStore(opts.stateDir)
    : new FileStateStore();

  return new DemosSession({
    walletAddress: runtime.address,
    rpcUrl: runtime.rpcUrl,
    algorithm: runtime.algorithm,
    authToken,
    signingHandle: {
      demos: runtime.demos,
      bridge: runtime.sdkBridge,
    },
    stateStore,
    urlAllowlist: opts?.urlAllowlist,
    allowInsecureUrls: opts?.allowInsecureUrls,
  });
}
