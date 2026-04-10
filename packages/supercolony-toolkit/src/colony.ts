/**
 * Colony — the runtime object returned by connect().
 *
 * Bundles the full toolkit (15 domains), the hive convenience API,
 * the raw AgentRuntime, and the wallet address.
 */

import { createAgentRuntime } from "../../../src/toolkit/agent-runtime.js";
import type { AgentRuntime } from "../../../src/toolkit/agent-runtime.js";
import type { Toolkit } from "../../../src/toolkit/primitives/types.js";
import { createHiveAPI } from "./hive.js";
import type { HiveAPI } from "./hive.js";

export interface ConnectOptions {
  envPath?: string;
  agentName?: string;
  /** Override state directory for write guard persistence */
  stateDir?: string;
  /** URL allowlist for attestation — only these origins can be attested */
  urlAllowlist?: string[];
  /** Allow insecure (HTTP) URLs — for local dev only */
  allowInsecureUrls?: boolean;
}

export interface Colony {
  toolkit: Toolkit;
  hive: HiveAPI;
  runtime: AgentRuntime;
  address: string;
}

export async function connect(opts?: ConnectOptions): Promise<Colony> {
  const runtime = await createAgentRuntime(opts);
  return {
    toolkit: runtime.toolkit,
    hive: createHiveAPI(runtime, {
      stateDir: opts?.stateDir,
      urlAllowlist: opts?.urlAllowlist,
      allowInsecureUrls: opts?.allowInsecureUrls,
    }),
    runtime,
    address: runtime.address,
  };
}
