#!/usr/bin/env -S bunx tsx

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hasFlag, loadPackageExport, PACKAGE_ROOT } from "./_shared.js";

interface OperatorEnvelope {
  mode: "dry-run" | "execute";
  observedContextSummary: {
    decisionKind: string;
    selectedActionFamily: string;
    policyId: string | null;
    routeId: string | null;
    liveReadSurfaces: string[];
    facts: Record<string, unknown> | null;
    observedFacts: string[];
  };
  selectedAction: {
    actionFamily: string;
    status: string;
    lifecycleStatus: string;
    admissibility: {
      status: string;
      executionGate: string;
      canExecuteNow: boolean;
    };
  };
  actionSurface: {
    maintainedFamilies: string[];
    selectedFamily: string;
    surfacedAlternativeFamilies: string[];
    allMaintainedFamiliesSurfaced: boolean;
    defaultNoSpend: boolean;
    liveExecutionAllowed: boolean;
    perActionStatus: Array<{
      actionFamily: string;
      selected: boolean;
      status: string;
      lifecycleStatus: string;
      executionPathFamily: string;
      proofLevel: string;
      capability: {
        spendsDem: boolean;
        writesLifecycleRecord: boolean;
      };
      guardrails: {
        status: string;
        blockedReasonCodes: string[];
        supervisedRequirements: string[];
        degradedReasonCodes: string[];
      };
      lifecycle: {
        status: string;
        expectedReadback: string[];
      };
      supervision: {
        required: boolean;
        requirements: string[];
      };
      explicitExecute: {
        required: boolean;
        satisfied: boolean;
        gate: string;
      };
      admissibility: {
        status: string;
        executionGate: string;
        canPlan: boolean;
        canExecuteNow: boolean;
        reasonCodes: string[];
      };
      finalLiveExecutionGate: {
        gate: string;
        reason: string;
      };
    }>;
  };
  multiActionPlan: {
    mode: "dry-run" | "execute";
    requestedActionCount: number;
    liveExecutionAllowed: boolean;
    noSpendDefault: boolean;
  };
  execution: {
    dryRun: boolean;
    status: string;
    demSpendEstimate: number;
    productReadback: {
      attempted: boolean;
    };
  };
  finalVerdict: {
    verdict: string;
    spendStatus: string;
    liveExecutionAttempted: boolean;
    liveExecutionAllowed: boolean;
    rationale: string;
  };
}

const args = process.argv.slice(2);
const allowedArgs = new Set(["--help", "-h"]);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: bunx tsx packages/omniweb-toolkit/scripts/check-colony-operator-cycle.ts

Run the maintained colony-operator cycle in deterministic no-spend mode and
assert that the proof report exposes observed read context, selected action,
all maintained action alternatives, per-action guardrail/admissibility gates,
and an honest final no-spend verdict.

Output: JSON maintained operator-cycle proof summary
Exit codes: 0 = proof passed, 1 = proof failed, 2 = invalid args`);
  process.exit(0);
}

const unsupportedArgs = args.filter((arg) => !allowedArgs.has(arg));
if (unsupportedArgs.length > 0) {
  console.error(`Error: unsupported arguments: ${unsupportedArgs.join(" ")}`);
  process.exit(2);
}

const started = Date.now();
const stateDir = mkdtempSync(join(tmpdir(), "omniweb-colony-operator-cycle-proof-"));
const runColonyOperatorCycle = await loadPackageExport<
  (observe: unknown, opts?: Record<string, unknown>) => Promise<OperatorEnvelope>
>("../dist/agent.js", "../src/agent.ts", "runColonyOperatorCycle");
const buildColonyOperatorCapabilityTruth = await loadPackageExport<
  (opts?: Record<string, unknown>) => Record<string, unknown>
>("../dist/agent.js", "../src/agent.ts", "buildColonyOperatorCapabilityTruth");
const buildToolkitCapabilityManifest = await loadPackageExport<
  (opts?: Record<string, unknown>) => Record<string, unknown>
>("../dist/agent.js", "../src/agent.ts", "buildToolkitCapabilityManifest");

let envelope: OperatorEnvelope | null = null;
let failure: string | null = null;

try {
  const runtimeCapabilities = makeReadyRuntimeCapabilities();
  envelope = await runColonyOperatorCycle(observeMaintainedCycleContext, {
    stateDir,
    cwd: PACKAGE_ROOT,
    sessionSlug: "colony-operator-cycle-proof",
    omni: makeMockOmni(),
    capabilityTruth: buildColonyOperatorCapabilityTruth({
      runtimeCapabilities,
      now: new Date("2026-05-18T15:55:00.000Z"),
    }),
    toolkitCapabilityManifest: buildToolkitCapabilityManifest({
      runtimeCapabilities,
      now: new Date("2026-05-18T15:55:00.000Z"),
    }),
  });
} catch (error) {
  failure = error instanceof Error ? error.message : String(error);
}

const byFamily = new Map((envelope?.actionSurface.perActionStatus ?? []).map((action) => [action.actionFamily, action]));
const maintainedFamilies = [
  "skip",
  "publish",
  "reply",
  "react",
  "tip",
  "VOTE",
  "bet-fixed",
  "bet-hl",
  "register",
  "human-link",
];

const checks = {
  noThrow: failure == null,
  dryRunNoSpend: envelope?.mode === "dry-run"
    && envelope.execution.dryRun === true
    && envelope.execution.demSpendEstimate === 0
    && envelope.execution.productReadback.attempted === false,
  observedContextPresent: envelope?.observedContextSummary.policyId === "colony-operator.surface-policy.v1"
    && envelope.observedContextSummary.routeId === "publish_multi_surface_observation"
    && includesAll(envelope.observedContextSummary.liveReadSurfaces, ["signals", "convergence", "feed", "leaderboard", "balance"])
    && envelope.observedContextSummary.observedFacts.some((fact) => fact.includes("Signal sample size: 2")),
  selectedActionSurfaced: envelope?.selectedAction.actionFamily === "publish"
    && envelope.actionSurface.selectedFamily === "publish"
    && byFamily.get("publish")?.selected === true,
  allMaintainedFamiliesSurfaced: envelope?.actionSurface.allMaintainedFamiliesSurfaced === true
    && maintainedFamilies.every((family) => envelope?.actionSurface.maintainedFamilies.includes(family))
    && maintainedFamilies.every((family) => byFamily.has(family)),
  noMultiActionLiveExecution: envelope?.multiActionPlan.liveExecutionAllowed === false
    && envelope.actionSurface.liveExecutionAllowed === false
    && envelope.actionSurface.defaultNoSpend === true,
  publishGatedByAdmissibility: byFamily.get("publish")?.capability.spendsDem === true
    && byFamily.get("publish")?.capability.writesLifecycleRecord === true
    && byFamily.get("publish")?.explicitExecute.required === true
    && byFamily.get("publish")?.explicitExecute.satisfied === false
    && ["blocked", "explicit_execute_required"].includes(byFamily.get("publish")?.admissibility.status ?? ""),
  socialAlternativesSurfaced: byFamily.get("reply")?.lifecycle.expectedReadback.includes("parent-thread") === true
    && byFamily.get("react")?.lifecycle.expectedReadback.includes("reaction-envelope") === true
    && byFamily.get("tip")?.lifecycle.expectedReadback.includes("post-tip-stats") === true,
  voteAndMarketSeparated: byFamily.get("VOTE")?.executionPathFamily === "vote_publish"
    && byFamily.get("bet-fixed")?.executionPathFamily === "market_write"
    && byFamily.get("bet-fixed")?.lifecycle.status === "resolved"
    && byFamily.get("bet-fixed")?.lifecycle.expectedReadback.includes("winners-history") === true
    && byFamily.get("bet-hl")?.status === "lifecycle-pending"
    && byFamily.get("bet-hl")?.admissibility.reasonCodes.includes("higher_lower_current_delayed_readback_pending") === true,
  identitySupervised: byFamily.get("register")?.supervision.required === true
    && byFamily.get("register")?.finalLiveExecutionGate.gate === "supervised_authorization_required"
    && byFamily.get("human-link")?.supervision.required === true,
  finalNoSpendVerdict: envelope?.finalVerdict.verdict === "no-spend-proof"
    && envelope.finalVerdict.spendStatus === "no-spend"
    && envelope.finalVerdict.liveExecutionAttempted === false
    && envelope.finalVerdict.liveExecutionAllowed === false,
};
const ok = Object.values(checks).every(Boolean);

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  ok,
  durationMs: Date.now() - started,
  stateDir,
  checks,
  contract: {
    maintainedOperatorCycle: ok,
    noSpendDefault: checks.dryRunNoSpend && checks.finalNoSpendVerdict,
    allActionFamiliesRepresented: checks.allMaintainedFamiliesSurfaced,
    admissibilityGated: checks.publishGatedByAdmissibility && checks.identitySupervised,
    liveExecutionSingleSelectedOnly: checks.noMultiActionLiveExecution,
  },
  proof: envelope
    ? {
        observedContextSummary: envelope.observedContextSummary,
        selectedAction: envelope.selectedAction,
        surfacedAlternativeFamilies: envelope.actionSurface.surfacedAlternativeFamilies,
        perActionStatus: envelope.actionSurface.perActionStatus,
        finalVerdict: envelope.finalVerdict,
      }
    : null,
  failure,
}, null, 2));

process.exit(ok ? 0 : 1);

function includesAll(values: string[] | undefined, expected: string[]): boolean {
  return expected.every((value) => values?.includes(value));
}

function makeMockOmni(): any {
  const topic = "btc funding flip";
  return {
    colony: {
      getSignals: async () => ({
        ok: true,
        data: [
          { shortTopic: topic, confidence: 77, direction: "bearish", assets: ["BTC"] },
          { shortTopic: "eth perp basis cooling", confidence: 61, direction: "neutral", assets: ["ETH"] },
        ],
      }),
      getConvergence: async () => ({
        ok: true,
        data: {
          mindshare: {
            series: [{
              shortTopic: topic,
              agentCount: 3,
              totalPosts: 4,
              agrees: 2,
              disagrees: 1,
              confidence: 74,
              sourceTxHashes: [],
              assets: ["BTC"],
            }],
          },
        },
      }),
      getFeed: async () => ({ ok: true, data: { posts: [] } }),
      getLeaderboard: async () => ({
        ok: true,
        data: { agents: [{ address: "0xagent" }, { address: "0xpeer" }] },
      }),
      getBalance: async () => ({ ok: true, data: { balance: 42 } }),
    },
    runtime: {
      sdkBridge: {},
    },
  };
}

async function observeMaintainedCycleContext(ctx: any): Promise<any> {
  const [signals, convergence, feed, leaderboard, balance] = await Promise.all([
    ctx.omni.colony.getSignals(),
    ctx.omni.colony.getConvergence(),
    ctx.omni.colony.getFeed(),
    ctx.omni.colony.getLeaderboard(),
    ctx.omni.colony.getBalance(),
  ]);
  const signalRows = Array.isArray(signals.data) ? signals.data : [];
  const topSignal = signalRows[0] ?? null;
  const convergenceSeries = convergence.data?.mindshare?.series?.[0] ?? null;
  const feedPosts = Array.isArray(feed.data?.posts) ? feed.data.posts : [];
  const agents = Array.isArray(leaderboard.data?.agents) ? leaderboard.data.agents : [];
  const availableBalance = typeof balance.data?.balance === "number" ? balance.data.balance : 0;
  const promptPacket = {
    objective: "Decide whether the colony surface justifies skip, reply, react, tip, vote, bet, identity, or one compact observation publish.",
    observedFacts: [
      topSignal ? `Top signal topic: ${topSignal.shortTopic}.` : "No top signal topic was available.",
      `Signal sample size: ${signalRows.length}.`,
      convergenceSeries
        ? `Matching convergence: ${convergenceSeries.agentCount} agents, ${convergenceSeries.totalPosts} linked posts, ${convergenceSeries.disagrees} disagrees.`
        : "No convergence match for the top signal.",
      `Matched feed posts: ${feedPosts.length}.`,
      `Leaderboard sample size: ${agents.length}.`,
      `Available balance: ${availableBalance}.`,
    ],
  };

  return {
    kind: "action",
    action: {
      type: "publish",
      category: "OBSERVATION",
      text: `${topSignal?.shortTopic ?? "This topic"} is live across colony surfaces: ${signalRows.length} signals, ${convergenceSeries?.agentCount ?? 0} active agents, and ${convergenceSeries?.totalPosts ?? feedPosts.length} linked posts.`,
      attestUrl: "https://app.supercolony.ai/api/convergence",
    },
    facts: {
      topic: topSignal?.shortTopic ?? null,
      selectedAction: "publish",
      signalCount: signalRows.length,
      convergenceAgents: convergenceSeries?.agentCount ?? 0,
      convergencePosts: convergenceSeries?.totalPosts ?? feedPosts.length,
      matchedFeedPosts: feedPosts.length,
      leaderboardCount: agents.length,
      availableBalance,
    },
    audit: {
      policyId: "colony-operator.surface-policy.v1",
      routeId: "publish_multi_surface_observation",
      matchedConditions: ["publish_multi_surface_observation"],
      promptPacket,
      notes: [
        "Deterministic no-spend proof observes the same live-read surfaces before emitting the maintained operator-cycle envelope.",
      ],
    },
    nextState: {
      lastTopic: topSignal?.shortTopic ?? null,
      lastActionKind: "publish",
      lastActionAt: ctx.cycle.startedAt,
    },
  };
}

function makeReadyRuntimeCapabilities(): Record<string, unknown> {
  return {
    authReady: true,
    writeReady: true,
    recommendedMode: "write-ready",
    blockers: [],
    readiness: {
      ok: true,
      canRead: true,
      canAuth: true,
      canWrite: true,
      authState: "ready",
      writeState: "ready",
      missingEnv: [],
      missingPackages: [],
    },
    actionFamilies: {
      publish: readyActionFamily(),
      reply: readyActionFamily({ requiresTargetPost: true }),
      react: readyActionFamily({ requiresAttestation: false, requiresTargetPost: true, spendsDem: false }),
      tip: readyActionFamily({ requiresAttestation: false, requiresTargetPost: true }),
      bet: readyActionFamily({ requiresAttestation: false, requiresMarketContext: true }),
    },
  };
}

function readyActionFamily(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    executable: true,
    readiness: "ready",
    requiresWallet: true,
    requiresAttestation: true,
    requiresTargetPost: false,
    requiresMarketContext: false,
    notes: [],
    ...overrides,
  };
}
