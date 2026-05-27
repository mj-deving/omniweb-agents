#!/usr/bin/env -S bunx tsx

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ensureLocalPackageResolution, hasFlag, loadPackageExport, PACKAGE_ROOT } from "./_shared.js";

interface OperatorEnvelope {
  selectedAction: {
    actionFamily: string;
    status: string;
    lifecycleStatus: string;
  };
  skippedAlternatives: Array<{
    actionFamily: string;
    status: string;
    lifecycleStatus: string;
    reasonCodes: string[];
  }>;
  capabilityTruth: {
    actions: Array<{
      actionFamily: string;
      status: string;
      lifecycleStatus: string;
      executionPathFamily: string;
      reasonCodes: string[];
      intent?: {
        actionFamily: string;
        actionType: string;
        marketKind?: string;
        status: string;
        executionPathFamily: string;
        requirements: {
          wallet: boolean;
          attestation: boolean;
          targetPost: boolean;
          marketContext: boolean;
          explicitExecute: boolean;
        };
        effects: {
          spendsDem: boolean;
          writesLifecycleRecord: boolean;
        };
      };
    }>;
    coverage: {
      allRequiredFamiliesPresent: boolean;
      allRequiredFamiliesHaveIntent: boolean;
      presentFamilies: string[];
      intentFamilies: string[];
    };
  };
  execution: {
    status: string;
    demSpendEstimate: number;
  };
}

const args = process.argv.slice(2);
const allowedArgs = new Set(["--help", "-h"]);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: bunx tsx packages/omniweb-toolkit/scripts/check-colony-operator-decision-coverage.ts

Run no-spend operator scenarios and assert decision coverage: skip/publish/reply/react are selectable, tip/VOTE/bet-fixed are emitted as explicit non-selected alternatives, bet-hl remains lifecycle-pending, and every maintained family has a generic action-intent contract.

Output: JSON decision-coverage proof summary
Exit codes: 0 = proof passed, 1 = proof failed, 2 = invalid args`);
  process.exit(0);
}

const unsupportedArgs = args.filter((arg) => !allowedArgs.has(arg));
if (unsupportedArgs.length > 0) {
  console.error(`Error: unsupported arguments: ${unsupportedArgs.join(" ")}`);
  process.exit(2);
}

const runColonyOperatorCycle = await loadPackageExport<
  (observe: unknown, opts?: Record<string, unknown>) => Promise<OperatorEnvelope>
>("../dist/agent.js", "../src/agent.ts", "runColonyOperatorCycle");
ensureLocalPackageResolution(resolve(PACKAGE_ROOT, "agents/openclaw/colony-operator"));
const starterModule = await import(pathToFileURL(resolve(
  PACKAGE_ROOT,
  "agents/openclaw/colony-operator/skills/omniweb-colony-operator/starter.ts",
)).href);

const started = Date.now();
let failure: string | null = null;
let envelopes: Array<{ scenario: string; envelope: OperatorEnvelope }> = [];

try {
  envelopes = await Promise.all([
    runScenario("skip", makeOmni({ signals: [], convergenceSeries: [], feedPosts: [] })),
    runScenario("publish", makeOmni({ feedPosts: [] })),
    runScenario("reply", makeOmni({
      feedPosts: [makePost({
        txHash: "0xreply-target",
        disagree: 3,
        agree: 1,
        replyCount: 2,
        attested: true,
      })],
    })),
    runScenario("react", makeOmni({
      feedPosts: [makePost({
        txHash: "0xreact-target",
        disagree: 0,
        agree: 3,
        replyCount: 0,
        attested: true,
      })],
    })),
  ]);
} catch (error) {
  failure = error instanceof Error ? error.message : String(error);
}

const selectedFamilies = new Set(envelopes.map(({ envelope }) => envelope.selectedAction.actionFamily));
const latestTruth = envelopes[0]?.envelope.capabilityTruth;
const allAlternativeFamilies = new Set(envelopes.flatMap(({ envelope }) =>
  envelope.skippedAlternatives.map((alternative) => alternative.actionFamily)
));
const voteTruth = latestTruth?.actions.find((action) => action.actionFamily === "VOTE");
const fixedBetTruth = latestTruth?.actions.find((action) => action.actionFamily === "bet-fixed");
const higherLowerTruth = latestTruth?.actions.find((action) => action.actionFamily === "bet-hl");

const checks = {
  noThrow: failure == null,
  skipSelectable: selectedFamilies.has("skip"),
  publishSelectable: selectedFamilies.has("publish"),
  replySelectable: selectedFamilies.has("reply"),
  reactSelectable: selectedFamilies.has("react"),
  tipSurfacedAsAlternative: allAlternativeFamilies.has("tip"),
  voteSurfacedAsSeparateAlternative: allAlternativeFamilies.has("VOTE"),
  fixedBetSurfacedAsAlternative: allAlternativeFamilies.has("bet-fixed"),
  higherLowerStatusOnly: allAlternativeFamilies.has("bet-hl")
    && higherLowerTruth?.status === "lifecycle-pending"
    && higherLowerTruth.reasonCodes.includes("higher_lower_current_delayed_readback_pending"),
  voteSeparatedFromPoolBet: voteTruth?.executionPathFamily === "vote_publish"
    && fixedBetTruth?.executionPathFamily === "market_write"
    && higherLowerTruth?.executionPathFamily === "market_write",
  capabilityTruthComplete: latestTruth?.coverage.allRequiredFamiliesPresent === true,
  genericIntentContractComplete: latestTruth?.coverage.allRequiredFamiliesHaveIntent === true
    && latestTruth.actions.every((action) => action.intent?.actionFamily === action.actionFamily),
  voteIntentSeparatedFromBet: voteTruth?.intent?.actionType === "vote"
    && fixedBetTruth?.intent?.actionType === "bet"
    && fixedBetTruth.intent.marketKind === "fixed_price"
    && higherLowerTruth?.intent?.actionType === "bet"
    && higherLowerTruth.intent.marketKind === "higher_lower",
  noSpendAcrossCoverageProof: envelopes.every(({ envelope }) => envelope.execution.demSpendEstimate === 0),
};
const ok = Object.values(checks).every(Boolean);

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  ok,
  durationMs: Date.now() - started,
  checks,
  selectedFamilies: Array.from(selectedFamilies).sort(),
  surfacedAlternatives: Array.from(allAlternativeFamilies).sort(),
  intentFamilies: latestTruth?.coverage.intentFamilies ?? [],
  statusOnlyFamilies: higherLowerTruth ? [{
    actionFamily: higherLowerTruth.actionFamily,
    status: higherLowerTruth.status,
    lifecycleStatus: higherLowerTruth.lifecycleStatus,
    reasonCodes: higherLowerTruth.reasonCodes,
    intent: higherLowerTruth.intent,
  }] : [],
  scenarios: envelopes.map(({ scenario, envelope }) => ({
    scenario,
    selectedAction: envelope.selectedAction,
    executionStatus: envelope.execution.status,
    skippedAlternativeCount: envelope.skippedAlternatives.length,
  })),
  failure,
}, null, 2));

process.exit(ok ? 0 : 1);

async function runScenario(scenario: string, omni: any): Promise<{ scenario: string; envelope: OperatorEnvelope }> {
  const stateDir = mkdtempSync(join(tmpdir(), `omniweb-colony-operator-${scenario}-`));
  const envelope = await runColonyOperatorCycle(starterModule.observe, {
    stateDir,
    cwd: PACKAGE_ROOT,
    sessionSlug: `colony-operator-${scenario}-coverage`,
    omni,
  });
  return { scenario, envelope };
}

function makePost(opts: {
  txHash: string;
  disagree: number;
  agree: number;
  replyCount: number;
  attested: boolean;
}) {
  return {
    txHash: opts.txHash,
    author: "0xagent",
    timestamp: Date.UTC(2026, 4, 3, 18, 0, 0),
    replyCount: opts.replyCount,
    score: 80,
    reactions: { agree: opts.agree, disagree: opts.disagree, flag: 0 },
    payload: {
      cat: "ANALYSIS",
      text: "BTC funding split remains active.",
      sourceAttestations: opts.attested ? [{ url: "https://api.coingecko.com/api/v3/simple/price" }] : [],
    },
  };
}

function makeOmni(opts: {
  signals?: any[];
  convergenceSeries?: any[];
  feedPosts?: any[];
} = {}): any {
  const topic = "BTC funding split";
  const signals = opts.signals ?? [
    { shortTopic: topic, confidence: 78, direction: "bearish", assets: ["BTC"] },
    { shortTopic: "ETH ETF drift", confidence: 61, direction: "mixed", assets: ["ETH"] },
  ];
  const feedPosts = opts.feedPosts ?? [makePost({
    txHash: "0xthread",
    disagree: 0,
    agree: 1,
    replyCount: 0,
    attested: true,
  })];
  const convergenceSeries = opts.convergenceSeries ?? [{
    shortTopic: topic,
    direction: "bearish",
    agentCount: 4,
    totalAgents: 5,
    totalPosts: 6,
    agrees: 3,
    disagrees: 1,
    counts: [],
    sourceTxHashes: feedPosts.map((post) => post.txHash),
    assets: ["BTC"],
    confidence: 74,
  }];

  return {
    colony: {
      getSignals: async () => ({ ok: true, data: signals }),
      getConvergence: async () => ({ ok: true, data: { mindshare: { series: convergenceSeries } } }),
      getFeed: async () => ({ ok: true, data: { posts: feedPosts } }),
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
