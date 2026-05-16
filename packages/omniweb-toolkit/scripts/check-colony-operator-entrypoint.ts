#!/usr/bin/env npx tsx

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { hasFlag, loadPackageExport, PACKAGE_ROOT } from "./_shared.js";

interface OperatorEnvelope {
  mode: "dry-run" | "execute";
  selectedAction: {
    actionFamily: string;
    status: string;
    lifecycleStatus: string;
    executionPathFamily: string;
  };
  skippedAlternatives: Array<{ actionFamily: string; status: string; lifecycleStatus: string }>;
  capabilityTruth: {
    coverage: {
      allRequiredFamiliesPresent: boolean;
      noSpendDefault: boolean;
    };
  };
  lifecyclePlan: {
    required: boolean;
    status: string;
    recordId: string | null;
  };
  execution: {
    dryRun: boolean;
    status: string;
    demSpendEstimate: number;
    productReadback: {
      attempted: boolean;
      visible: boolean;
      indexedVisible: boolean;
    };
  };
}

const args = process.argv.slice(2);
const allowedArgs = new Set(["--help", "-h"]);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-colony-operator-entrypoint.ts

Run the maintained Colony Operator entrypoint in no-spend mode and assert that it returns the AC-2 execution envelope: selected action, skipped alternatives, capability truth, lifecycle plan, execution mode, and spend status.

Output: JSON maintained-entrypoint proof summary
Exit codes: 0 = proof passed, 1 = proof failed, 2 = invalid args`);
  process.exit(0);
}

const unsupportedArgs = args.filter((arg) => !allowedArgs.has(arg));
if (unsupportedArgs.length > 0) {
  console.error(`Error: unsupported arguments: ${unsupportedArgs.join(" ")}`);
  process.exit(2);
}

const stateDir = mkdtempSync(join(tmpdir(), "omniweb-colony-operator-entrypoint-"));
const started = Date.now();
const starterModule = await import(pathToFileURL(resolve(
  PACKAGE_ROOT,
  "agents/openclaw/colony-operator/skills/omniweb-colony-operator/starter.ts",
)).href);
const runColonyOperatorCycle = await loadPackageExport<
  (observe: unknown, opts?: Record<string, unknown>) => Promise<OperatorEnvelope>
>("../dist/agent.js", "../src/agent.ts", "runColonyOperatorCycle");

let envelope: OperatorEnvelope | null = null;
let failure: string | null = null;

try {
  envelope = await runColonyOperatorCycle(starterModule.observe, {
    stateDir,
    cwd: PACKAGE_ROOT,
    sessionSlug: "colony-operator-entrypoint-check",
    omni: makeMockOmni(),
  });
} catch (error) {
  failure = error instanceof Error ? error.message : String(error);
}

const checks = {
  noThrow: failure == null,
  envelopeReturned: envelope != null,
  dryRunDefault: envelope?.mode === "dry-run" && envelope.execution.dryRun === true,
  noSpendDefault: envelope?.execution.demSpendEstimate === 0 && envelope.capabilityTruth.coverage.noSpendDefault === true,
  selectedActionPresent: typeof envelope?.selectedAction.actionFamily === "string",
  skippedAlternativesPresent: Array.isArray(envelope?.skippedAlternatives) && envelope.skippedAlternatives.length >= 5,
  capabilityTruthPresent: envelope?.capabilityTruth.coverage.allRequiredFamiliesPresent === true,
  lifecyclePlanPresent: envelope?.lifecyclePlan.required === true && envelope.lifecyclePlan.status === "planned",
  noProductMutationClaimed: envelope?.execution.productReadback.attempted === false,
};
const ok = Object.values(checks).every(Boolean);

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  ok,
  durationMs: Date.now() - started,
  stateDir,
  checks,
  contract: {
    maintainedOperatorEntrypoint: ok,
    explicitExecuteRequiredForLiveWrites: checks.dryRunDefault && checks.lifecyclePlanPresent,
    spendsDem: false,
    liveWriteProven: false,
  },
  result: envelope
    ? {
        mode: envelope.mode,
        selectedAction: envelope.selectedAction,
        skippedAlternativeCount: envelope.skippedAlternatives.length,
        lifecyclePlan: envelope.lifecyclePlan,
        execution: envelope.execution,
      }
    : null,
  failure,
}, null, 2));

process.exit(ok ? 0 : 1);

function makeMockOmni(): any {
  const matchedTxHash = "0xcolony-thread-1";
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
              sourceTxHashes: [matchedTxHash],
              assets: ["BTC"],
            }],
          },
        },
      }),
      getFeed: async () => ({
        ok: true,
        data: {
          posts: [{
            txHash: matchedTxHash,
            author: "0xagent",
            timestamp: Date.UTC(2026, 4, 3, 18, 0, 0),
            replyCount: 0,
            score: 19,
            reactions: { agree: 3, disagree: 0, flag: 0 },
            payload: {
              cat: "OBSERVATION",
              text: `${topic} now has multi-surface support.`,
              sourceAttestations: [{ url: "https://app.supercolony.ai/api/signals" }],
            },
          }],
        },
      }),
      getLeaderboard: async () => ({
        ok: true,
        data: { agents: [{ address: "0xagent" }, { address: "0xpeer" }] },
      }),
      getBalance: async () => ({
        ok: true,
        data: { balance: 42 },
      }),
    },
    runtime: {
      sdkBridge: {},
    },
  };
}
