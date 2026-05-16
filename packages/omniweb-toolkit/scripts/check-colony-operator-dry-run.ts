#!/usr/bin/env npx tsx

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { hasFlag, loadPackageExport, PACKAGE_ROOT } from "./_shared.js";

interface MinimalCycleRecord<TState extends Record<string, unknown> = Record<string, unknown>> {
  cycleId: string;
  iteration: number;
  dryRun: boolean;
  decision: {
    kind: "skip" | "reply" | "react" | "publish" | "action";
    reason?: string | null;
    action?: {
      type?: "publish" | "reply" | "react" | "tip" | "bet";
      text?: string;
      category?: string;
    };
    facts?: Record<string, unknown>;
    audit?: {
      policyId?: string;
      routeId?: string;
      matchedConditions?: string[];
    };
  };
  memoryAfter: Record<string, unknown>;
  outcome: {
    resolution: null | {
      status?: "executable" | "blocked" | "supervised" | "unsupported";
      actionType?: "publish" | "reply" | "react" | "tip" | "bet";
      executionPathFamily?: string;
    };
    execution: {
      status: "skipped" | "dry_run" | "published" | "replied" | "reacted" | "failed";
      demSpendEstimate?: number;
    };
  };
}

interface ColonyOperatorCapabilityTruth {
  recommendedMode: string;
  authReady: boolean;
  writeReady: boolean;
  blockers: string[];
  coverage: {
    allRequiredFamiliesPresent: boolean;
    requiredFamilies: string[];
    presentFamilies: string[];
    missingFamilies: string[];
    lifecycleAwareFamilies: string[];
    identityFamilies: string[];
    noSpendDefault: boolean;
  };
  actions: Array<{
    actionFamily: string;
    status: string;
    lifecycleStatus: string;
    runtimeFamily: string;
    executionPathFamily: string;
    requiresExplicitExecute: boolean;
    writesLifecycleRecord: boolean;
    spendsDem: boolean;
    proofLevel: string;
    reasonCodes: string[];
  }>;
}

const args = process.argv.slice(2);
const keepRecord = hasFlag(args, "--record", "-r");

const allowedArgs = new Set(["--record", "-r", "--help", "-h"]);
if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-colony-operator-dry-run.ts [options]

Run one dry-run cycle of the primary colony-operator starter and assert that the maintained MVP path stays no-spend while producing a real runtime artifact. Also assert that the current starter/runtime seam can surface a generic action intent in dry-run mode.

Options:
  --record, -r   Print the full cycle record after the JSON summary
  --help, -h     Show this help

Output: JSON dry-run proof summary
Exit codes: 0 = proof passed, 1 = proof failed, 2 = invalid args`);
  process.exit(0);
}

const unsupportedArgs = args.filter((arg) => !allowedArgs.has(arg));
if (unsupportedArgs.length > 0) {
  console.error(`Error: unsupported arguments: ${unsupportedArgs.join(" ")}`);
  process.exit(2);
}

const stateDir = mkdtempSync(join(tmpdir(), "omniweb-colony-operator-dry-run-"));
const started = Date.now();

const runMinimalAgentCycle = await loadPackageExport<
  (observe: unknown, opts?: Record<string, unknown>) => Promise<MinimalCycleRecord>
>("../dist/agent.js", "../src/agent.ts", "runMinimalAgentCycle");
const buildColonyOperatorCapabilityTruth = await loadPackageExport<
  (opts?: Record<string, unknown>) => ColonyOperatorCapabilityTruth
>("../dist/agent.js", "../src/agent.ts", "buildColonyOperatorCapabilityTruth");
const capabilityTruth = buildColonyOperatorCapabilityTruth({ cwd: PACKAGE_ROOT });
const starterModule = await import(pathToFileURL(resolve(
  PACKAGE_ROOT,
  "agents/openclaw/colony-operator/skills/omniweb-colony-operator/starter.ts",
)).href);
const observe = starterModule.observe as unknown;

let record: MinimalCycleRecord | null = null;
let failure: string | null = null;

try {
  record = await runMinimalAgentCycle(observe, {
    dryRun: true,
    stateDir,
    cwd: PACKAGE_ROOT,
    sessionSlug: "colony-operator-dry-run-check",
    omni: makeMockOmni(),
  });
} catch (error) {
  failure = error instanceof Error ? error.message : String(error);
}

const latestRecordPath = resolve(stateDir, "runs", "latest.json");
const persistedRecord = record
  ? JSON.parse(readFileSync(latestRecordPath, "utf8")) as MinimalCycleRecord
  : null;

const checks = {
  cycleReturned: record != null,
  noThrow: failure == null,
  dryRunFlag: record?.dryRun === true,
  noSpendEstimate: (record?.outcome.execution.demSpendEstimate ?? -1) === 0,
  outcomeIsSafe: record?.outcome.execution.status === "dry_run" || record?.outcome.execution.status === "skipped",
  actionShapeSupported: record?.decision.kind !== "action"
    || record.decision.action?.type === "publish"
    || record.decision.action?.type === "reply"
    || record.decision.action?.type === "react"
    || record.decision.action?.type === "tip"
    || record.decision.action?.type === "bet",
  decisionIsObservable: record?.decision.kind === "skip"
    || record?.decision.kind === "reply"
    || record?.decision.kind === "react"
    || record?.decision.kind === "publish"
    || record?.decision.kind === "action",
  thinSkillBoundaryVisible: record?.decision.kind === "action",
  explicitPolicyIdPresent: record?.decision.audit?.policyId === "colony-operator.surface-policy.v1",
  explicitRouteIdPresent: typeof record?.decision.audit?.routeId === "string" && record.decision.audit.routeId.length > 0,
  matchedConditionsTracked: Array.isArray(record?.decision.audit?.matchedConditions),
  resolvedIntentPresent: record?.decision.kind !== "action"
    || record?.outcome.resolution != null,
  resolvedIntentMatchesAction: record?.decision.kind !== "action"
    || record?.outcome.resolution?.actionType === record.decision.action?.type,
  resolvedIntentExecutable: record?.decision.kind !== "action"
    || record?.outcome.resolution?.status === "executable",
  executionPathMatchesAction: record?.decision.action?.type !== "react"
    ? record?.decision.kind !== "action" || record?.outcome.resolution?.executionPathFamily === "direct_attested_write"
    : record?.outcome.resolution?.executionPathFamily === "reaction",
  persistedLatestRecord: persistedRecord?.cycleId === record?.cycleId,
  stateRecorded: persistedRecord?.memoryAfter != null,
  fullActionVocabularyPresent: capabilityTruth.coverage.allRequiredFamiliesPresent,
  voteSeparatedFromPoolBet: hasAction(capabilityTruth, "VOTE")
    && hasAction(capabilityTruth, "bet-fixed")
    && hasAction(capabilityTruth, "bet-hl"),
  higherLowerNotOverclaimed: capabilityTruth.actions.some((action) => (
    action.actionFamily === "bet-hl"
    && action.status === "lifecycle-pending"
    && action.reasonCodes.includes("higher_lower_current_delayed_readback_pending")
  )),
  lifecycleTruthPresent: ["publish", "reply", "react", "tip", "VOTE", "bet-fixed", "bet-hl"]
    .every((family) => capabilityTruth.actions.some((action) => (
      action.actionFamily === family
      && action.writesLifecycleRecord
    ))),
  identityTruthPresent: ["register", "human-link"]
    .every((family) => capabilityTruth.actions.some((action) => (
      action.actionFamily === family
      && (action.status === "blocked" || action.status === "supervised")
    ))),
};

const ok = Object.values(checks).every(Boolean);

const summary = {
  checkedAt: new Date().toISOString(),
  ok,
  durationMs: Date.now() - started,
  stateDir,
  checks,
  contract: {
    colonyOperatorBaselineProof: ok,
    colonyOperatorMvpProof: false,
    thinSkillBoundaryProven: Boolean(
      checks.thinSkillBoundaryVisible
      && checks.explicitPolicyIdPresent
      && checks.explicitRouteIdPresent
      && checks.resolvedIntentMatchesAction
      && checks.resolvedIntentExecutable,
    ),
    spendsDem: false,
    liveWriteProven: false,
    lifecycleAwareOperatorTruth: Boolean(
      checks.fullActionVocabularyPresent
      && checks.voteSeparatedFromPoolBet
      && checks.higherLowerNotOverclaimed
      && checks.lifecycleTruthPresent
      && checks.identityTruthPresent,
    ),
  },
  capabilityTruth: {
    recommendedMode: capabilityTruth.recommendedMode,
    authReady: capabilityTruth.authReady,
    writeReady: capabilityTruth.writeReady,
    blockers: capabilityTruth.blockers,
    coverage: capabilityTruth.coverage,
    actions: capabilityTruth.actions.map((action) => ({
      actionFamily: action.actionFamily,
      status: action.status,
      lifecycleStatus: action.lifecycleStatus,
      runtimeFamily: action.runtimeFamily,
      executionPathFamily: action.executionPathFamily,
      requiresExplicitExecute: action.requiresExplicitExecute,
      writesLifecycleRecord: action.writesLifecycleRecord,
      spendsDem: action.spendsDem,
      proofLevel: action.proofLevel,
      reasonCodes: action.reasonCodes,
    })),
    skippedAlternatives: capabilityTruth.actions
      .filter((action) => action.actionFamily !== summaryActionFamily(record))
      .map((action) => ({
        actionFamily: action.actionFamily,
        status: action.status,
        lifecycleStatus: action.lifecycleStatus,
        reasonCodes: action.reasonCodes,
      })),
  },
  result: record
    ? {
        cycleId: record.cycleId,
        iteration: record.iteration,
        decisionKind: record.decision.kind,
        actionType: record.decision.kind === "action" ? record.decision.action?.type ?? null : null,
        decisionReason: record.decision.reason ?? null,
        outcomeStatus: record.outcome.execution.status,
        resolvedIntentStatus: record.outcome.resolution?.status ?? null,
        resolvedActionType: record.outcome.resolution?.actionType ?? null,
        executionPathFamily: record.outcome.resolution?.executionPathFamily ?? null,
        policyId: record.decision.audit?.policyId ?? null,
        routeId: record.decision.audit?.routeId ?? null,
        matchedConditions: record.decision.audit?.matchedConditions ?? [],
        selectedTopic: record.decision.facts && typeof record.decision.facts === "object" && "topic" in record.decision.facts
          ? (record.decision.facts as { topic?: unknown }).topic ?? null
          : null,
      }
    : null,
  failure,
};

console.log(JSON.stringify(summary, null, 2));
if (keepRecord && record) {
  console.log("\n--- cycle record ---\n");
  console.log(JSON.stringify(record, null, 2));
}

process.exit(ok ? 0 : 1);

function makeMockOmni(): any {
  const matchedTxHash = "0xcolony-thread-1";
  const topic = "btc funding flip";

  return {
    colony: {
      getSignals: async () => ({
        ok: true,
        data: [
          {
            shortTopic: topic,
            confidence: 77,
            direction: "bearish",
            assets: ["BTC"],
          },
          {
            shortTopic: "eth perp basis cooling",
            confidence: 61,
            direction: "neutral",
            assets: ["ETH"],
          },
        ],
      }),
      getConvergence: async () => ({
        ok: true,
        data: {
          mindshare: {
            series: [
              {
                shortTopic: topic,
                agentCount: 3,
                totalPosts: 4,
                agrees: 2,
                disagrees: 1,
                confidence: 74,
                sourceTxHashes: [matchedTxHash],
                assets: ["BTC"],
              },
            ],
          },
        },
      }),
      getFeed: async () => ({
        ok: true,
        data: {
          posts: [
            {
              txHash: matchedTxHash,
              author: "0xagent",
              timestamp: Date.UTC(2026, 4, 3, 18, 0, 0),
              replyCount: 0,
              score: 19,
              reactions: {
                agree: 3,
                disagree: 0,
                flag: 0,
              },
              payload: {
                cat: "OBSERVATION",
                text: `${topic} now has multi-surface support.`,
                sourceAttestations: [
                  {
                    url: "https://app.supercolony.ai/api/signals",
                  },
                ],
              },
            },
          ],
        },
      }),
      getLeaderboard: async () => ({
        ok: true,
        data: {
          agents: [{ id: "a" }, { id: "b" }, { id: "c" }],
        },
      }),
      getBalance: async () => ({
        ok: true,
        data: {
          balance: 123,
        },
      }),
    },
  };
}

function hasAction(truth: ColonyOperatorCapabilityTruth, family: string): boolean {
  return truth.actions.some((action) => action.actionFamily === family);
}

function summaryActionFamily(record: MinimalCycleRecord | null): string {
  if (!record) return "none";
  if (record.decision.kind === "skip") return "skip";
  return record.decision.kind === "action" ? record.decision.action?.type ?? "unknown" : record.decision.kind;
}
