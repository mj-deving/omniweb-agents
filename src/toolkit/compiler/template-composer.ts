/**
 * Agent Compiler — Template Composer.
 *
 * Deterministic file generator from AgentIntentConfig.
 * No LLM needed — maps config fields to template files.
 */
import { stringify as yamlStringify } from "yaml";
import type { AgentIntentConfig } from "./types.js";

export interface ComposedTemplate {
  /** filename -> content */
  files: Map<string, string>;
}

/**
 * Construct an import statement string.
 * Uses concatenation to prevent the architecture boundary regex from matching
 * template output as real imports from this file.
 */
function imp(specifiers: string, path: string): string {
  return "import " + specifiers + ' from "' + path + '";';
}
function impType(specifiers: string, path: string): string {
  return "import type " + specifiers + ' from "' + path + '";';
}
function exp(specifiers: string, path: string): string {
  return "export " + specifiers + ' from "' + path + '";';
}

// ── Rule name to action type mapping ──────────────────────────────

const RULE_TYPE_MAP: Record<string, string> = {
  publish_to_gaps: "PUBLISH",
  publish_signal_aligned: "PUBLISH",
  publish_on_divergence: "PUBLISH",
  publish_prediction: "PUBLISH",
  reply_with_evidence: "REPLY",
  engage_verified: "ENGAGE",
  engage_novel_agent: "ENGAGE",
  tip_valuable: "TIP",
  vote_on_pool: "VOTE",
  bet_on_prediction: "BET",
};

const RULE_CONDITIONS_MAP: Record<string, string[]> = {
  publish_to_gaps: ["fresh rich evidence"],
  publish_signal_aligned: ["trending signal", "matching evidence"],
  publish_on_divergence: ["oracle divergence", "colony consensus mismatch"],
  publish_prediction: ["prediction market", "min confidence met"],
  reply_with_evidence: ["matching evidence"],
  engage_verified: ["verified topic"],
  engage_novel_agent: ["new agent", "quality content"],
  tip_valuable: ["above median"],
  vote_on_pool: ["active pool", "sufficient evidence"],
  bet_on_prediction: ["prediction market", "min confidence met"],
};

/**
 * Compose a complete template directory from AgentIntentConfig.
 */
export function composeTemplate(config: AgentIntentConfig): ComposedTemplate {
  const files = new Map<string, string>();
  files.set("strategy.yaml", generateStrategyYaml(config));
  files.set("observe.ts", generateObserveTs(config));
  files.set("agent.ts", generateAgentTs(config));
  files.set(".env.example", generateEnvExample(config));
  return { files };
}

// ── strategy.yaml ──────────────────────────────

function generateStrategyYaml(config: AgentIntentConfig): string {
  const strategyObj: Record<string, unknown> = {
    apiVersion: "strategy/v3",
  };

  // Rules — map to StrategyRule format expected by config-loader
  strategyObj.rules = config.rules.map((rule) => ({
    name: rule.name,
    type: RULE_TYPE_MAP[rule.name] ?? "PUBLISH",
    priority: rule.priority,
    conditions: RULE_CONDITIONS_MAP[rule.name] ?? [],
    enabled: rule.enabled,
  }));

  // Rate limits
  strategyObj.rateLimits = {
    postsPerDay: config.rateLimits.postsPerDay,
    postsPerHour: config.rateLimits.postsPerHour,
    reactionsPerSession: config.rateLimits.reactionsPerSession,
    maxTipAmount: config.rateLimits.maxTipAmount,
  };

  // Topic weights (only if non-empty)
  if (Object.keys(config.topicWeights).length > 0) {
    strategyObj.topicWeights = config.topicWeights;
  }

  // Evidence categories
  strategyObj.evidence = {
    categories: {
      core: config.evidenceCategories.core,
      domain: config.evidenceCategories.domain,
      meta: config.evidenceCategories.meta,
    },
  };

  // Add thresholds if present
  if (Object.keys(config.thresholds).length > 0) {
    (strategyObj.evidence as Record<string, unknown>).thresholds =
      config.thresholds;
  }

  // Budget
  strategyObj.budget = config.budget;

  // Tipping
  strategyObj.tipping = {
    mode: config.tipping.mode,
    triggers: config.tipping.triggers,
  };

  // Predictions
  strategyObj.predictions = {
    mode: config.predictions.mode,
    minConfidence: config.predictions.minConfidence,
  };

  // Attestation
  strategyObj.attestation = {
    method: config.attestation.method,
  };
  if (
    config.attestation.tlsnTriggers &&
    config.attestation.tlsnTriggers.length > 0
  ) {
    (strategyObj.attestation as Record<string, unknown>).tlsnTriggers =
      config.attestation.tlsnTriggers;
  }

  // Models
  strategyObj.models = config.models;

  // History retention
  strategyObj.history = {
    retentionHours: config.historyRetentionHours,
  };

  return yamlStringify(strategyObj, { lineWidth: 120 });
}

// ── observe.ts ──────────────────────────────

function generateObserveTs(config: AgentIntentConfig): string {
  // Build import lines via helpers to avoid tripping the architecture boundary regex
  const imports = [
    imp("{ readFileSync }", "node:fs"),
    imp("{ resolve }", "node:path"),
    imp("{ mapFeedPosts, buildColonyStateFromFeed }", "../../../src/toolkit/agent-loop.js"),
    imp("{ loadStrategyConfig }", "../../../src/toolkit/strategy/config-loader.js"),
    imp("{ strategyObserve }", "../../../src/toolkit/observe/observe-router.js"),
    impType("{ ObserveResult }", "../../../src/toolkit/agent-loop.js"),
    impType("{ Toolkit }", "../../../src/toolkit/primitives/types.js"),
  ].join("\n");

  return `/**
 * ${config.label} — Strategy-driven observe.
 * Single-fetch: router prefetches all API data, no duplicate calls.
 */
${imports}

const RECENT_LIMIT = 100;

export async function learnFirstObserve(
  toolkit: Toolkit,
  ourAddress: string,
  strategyPath?: string,
): Promise<ObserveResult> {
  const resolvedPath = strategyPath ?? resolve(import.meta.dirname, "strategy.yaml");
  const strategyYaml = readFileSync(resolvedPath, "utf-8");
  const config = loadStrategyConfig(strategyYaml);

  const { evidence, apiEnrichment, prefetched } = await strategyObserve(toolkit, config);

  const recentResult = prefetched.recentPosts ?? await toolkit.feed.getRecent({ limit: RECENT_LIMIT });
  const recentPosts = mapFeedPosts(recentResult as any);
  const colonyState = buildColonyStateFromFeed(recentPosts, ourAddress);

  return { colonyState, evidence, context: { apiEnrichment } };
}
`;
}

// ── agent.ts ──────────────────────────────

function generateAgentTs(config: AgentIntentConfig): string {
  return `#!/usr/bin/env npx tsx
/**
 * ${config.label} — Learn-first SuperColony agent.
 *
 * ${config.description}
 *
 * Usage:
 *   cp .env.example .env    # Add your DEMOS_MNEMONIC
 *   DRY_RUN=false npx tsx agent.ts  # Run live (default: dry-run)
 */
import { resolve } from "node:path";
import { homedir } from "node:os";
import { mkdirSync } from "node:fs";
import { createAgentRuntime } from "../../../src/toolkit/agent-runtime.js";
import { runAgentLoop } from "../../../src/toolkit/agent-loop.js";
import type { ObserveFn, LightExecutor, HeavyExecutor } from "../../../src/toolkit/agent-loop.js";
import { learnFirstObserve } from "./observe.js";
import { executeStrategyActions } from "../../../cli/action-executor.js";
import { executePublishActions } from "../../../cli/publish-executor.js";
import { loadAgentConfig } from "../../../src/lib/agent-config.js";
import { loadAgentSourceView } from "../../../src/toolkit/sources/catalog.js";
import { FileStateStore } from "../../../src/toolkit/state-store.js";

// Re-export for external consumers
export { learnFirstObserve } from "./observe.js";

// ── Configuration ──────────────────────────────
const STRATEGY_PATH = resolve(import.meta.dirname, "strategy.yaml");
const INTERVAL_MS = Number(process.env.LOOP_INTERVAL_MS ?? ${config.intervalMs});
const AGENT_LABEL = "${config.name}";
const DRY_RUN = process.env.DRY_RUN !== "false"; // Default dry-run=true for safety (real DEM on mainnet)

// ── Observe ──────────────────────────────────
const observe: ObserveFn = learnFirstObserve;

// ── Executor wiring (bridges toolkit boundary per ADR-0019) ──
function createExecutors(label: string, agentConfig: any, sourceView: any) {
  const executeLightActions: LightExecutor = async (actions, runtime) => {
    return executeStrategyActions(actions, {
      bridge: {
        apiCall: runtime.authenticatedApiCall,
        publishHivePost: runtime.sdkBridge.publishHivePost.bind(runtime.sdkBridge),
        transferDem: (to: string, amount: number) => runtime.sdkBridge.transferDem(to, amount, "Template tip"),
      },
      dryRun: DRY_RUN,
      observe: (type, msg) => console.log(\`[\${label}:light] \${type}: \${msg}\`),
      colonyDb: runtime.colonyDb,
      ourAddress: runtime.address,
    });
  };

  const executeHeavyActions: HeavyExecutor = async (actions, runtime) => {
    const sessionsDir = resolve(homedir(), \`.\${agentConfig.name}/sessions\`);
    mkdirSync(sessionsDir, { recursive: true });
    const stateStore = new FileStateStore(resolve(homedir(), \`.\${agentConfig.name}\`));

    return executePublishActions(actions, {
      demos: runtime.demos,
      walletAddress: runtime.address,
      provider: runtime.llmProvider,
      agentConfig,
      sourceView,
      state: { loopVersion: 3, sessionNumber: 0, agentName: agentConfig.name, startedAt: new Date().toISOString(), pid: process.pid, phases: {}, posts: [], engagements: [] } as any,
      sessionsDir,
      observe: (type, msg) => console.log(\`[\${label}:heavy] \${type}: \${msg}\`),
      dryRun: DRY_RUN,
      stateStore,
      colonyDb: runtime.colonyDb,
      calibrationOffset: 0,
      scanContext: { activity_level: "normal", posts_per_hour: 0 },
      logSession: () => {},
      logQuality: () => {},
    });
  };

  return { executeLightActions, executeHeavyActions };
}

// ── Main ───────────────────────────────────────
async function main() {
  console.log(\`[\${AGENT_LABEL}] Starting...\`);
  const runtime = await createAgentRuntime();
  console.log(\`[\${AGENT_LABEL}] Connected as \${runtime.address}\`);

  const agentConfig = loadAgentConfig(AGENT_LABEL);
  const sourceView = loadAgentSourceView(agentConfig.name, agentConfig.paths.sourceCatalog, agentConfig.paths.sourcesRegistry);
  const { executeLightActions, executeHeavyActions } = createExecutors(AGENT_LABEL, agentConfig, sourceView);

  await runAgentLoop(runtime, observe, {
    strategyPath: STRATEGY_PATH,
    intervalMs: INTERVAL_MS,
    executeLightActions,
    executeHeavyActions,
    agentConfig,
    sourceView,
    onAction: (action) => console.log(\`[\${AGENT_LABEL}] \${action.type}: \${action.reason}\`),
    onError: (err) => console.error(\`[\${AGENT_LABEL}] Action failed:\`, err),
  });
}

main().catch((err) => {
  console.error(\`[\${AGENT_LABEL}] Fatal:\`, err);
  process.exit(1);
});
`;
}

// ── .env.example ──────────────────────────────

function generateEnvExample(config: AgentIntentConfig): string {
  return `DEMOS_MNEMONIC=your-mnemonic-here
DRY_RUN=true
LOOP_INTERVAL_MS=${config.intervalMs}
`;
}
