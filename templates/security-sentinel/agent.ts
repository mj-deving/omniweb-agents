#!/usr/bin/env npx tsx
/**
 * Security Sentinel Agent — monitors CVEs, advisories, and colony threat signals.
 *
 * Custom observe() is in observe.ts (testable without SDK).
 * This file wires runtime, executors, and the agent loop.
 *
 * Usage:
 *   cp .env.example .env    # Add your DEMOS_MNEMONIC
 *   npx tsx agent.ts         # Run the agent
 */
import { resolve } from "node:path";
import { createAgentRuntime } from "../../src/toolkit/agent-runtime.js";
import { runAgentLoop } from "../../src/toolkit/agent-loop.js";
import type { ObserveFn, LightExecutor, HeavyExecutor } from "../../src/toolkit/agent-loop.js";
import { securityObserve } from "./observe.js";
import { executeStrategyActions } from "../../cli/action-executor.js";
import { executePublishActions } from "../../cli/publish-executor.js";
import { loadAgentConfig } from "../../src/lib/agent-config.js";
import { loadAgentSourceView } from "../../src/toolkit/sources/catalog.js";

// ── Configuration ──────────────────────────────
const STRATEGY_PATH = resolve(import.meta.dirname, "strategy.yaml");
const INTERVAL_MS = Number(process.env.LOOP_INTERVAL_MS ?? 300_000);

// ── Observe (security-specific) ────────────────
const observe: ObserveFn = securityObserve;

// ── Executor wiring (bridges toolkit boundary) ──
const executeLightActions: LightExecutor = async (actions, runtime) => {
  return executeStrategyActions(actions, {
    bridge: {
      apiCall: runtime.authenticatedApiCall,
      publishHivePost: runtime.sdkBridge.publishHivePost.bind(runtime.sdkBridge),
      transferDem: (to: string, amount: number) => runtime.sdkBridge.transferDem(to, amount, "Security tip"),
    },
    dryRun: false,
    observe: (type, msg) => console.log(`[security-sentinel:light] ${type}: ${msg}`),
    colonyDb: runtime.colonyDb,
    ourAddress: runtime.address,
  });
};

const executeHeavyActions: HeavyExecutor = async (actions, runtime, opts) => {
  return executePublishActions(actions, {
    demos: runtime.demos,
    walletAddress: runtime.address,
    provider: runtime.llmProvider,
    agentConfig: (opts as any).agentConfig,
    sourceView: (opts as any).sourceView,
    observe: (type, msg) => console.log(`[security-sentinel:heavy] ${type}: ${msg}`),
    dryRun: false,
    colonyDb: runtime.colonyDb,
  } as any);
};

// ── Main ───────────────────────────────────────
async function main() {
  console.log("[security-sentinel] Starting...");
  const runtime = await createAgentRuntime();
  console.log(`[security-sentinel] Connected as ${runtime.address}`);

  const agentConfig = loadAgentConfig();
  const sourceView = loadAgentSourceView(agentConfig.name);

  await runAgentLoop(runtime, observe, {
    strategyPath: STRATEGY_PATH,
    intervalMs: INTERVAL_MS,
    executeLightActions,
    executeHeavyActions,
    onAction: (action, result) => {
      console.log(`[security-sentinel] ${action.type}: ${action.reason}`);
    },
    onError: (err) => {
      console.error("[security-sentinel] Action failed:", err);
    },
  });
}

main().catch((err) => {
  console.error("[security-sentinel] Fatal:", err);
  process.exit(1);
});
