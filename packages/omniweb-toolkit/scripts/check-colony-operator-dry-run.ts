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
    kind: "skip" | "reply" | "publish";
    reason?: string | null;
    facts?: Record<string, unknown>;
  };
  memoryAfter: Record<string, unknown>;
  outcome: {
    status: "skipped" | "dry_run" | "published" | "replied" | "failed";
    demSpendEstimate?: number;
  };
}

const args = process.argv.slice(2);
const keepRecord = hasFlag(args, "--record", "-r");

const allowedArgs = new Set(["--record", "-r", "--help", "-h"]);
if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-colony-operator-dry-run.ts [options]

Run one dry-run cycle of the primary colony-operator starter and assert that the maintained MVP path stays no-spend while producing a real runtime artifact.

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
  noSpendEstimate: (record?.outcome.demSpendEstimate ?? -1) === 0,
  outcomeIsSafe: record?.outcome.status === "dry_run" || record?.outcome.status === "skipped",
  decisionIsObservable: record?.decision.kind === "skip" || record?.decision.kind === "reply" || record?.decision.kind === "publish",
  persistedLatestRecord: persistedRecord?.cycleId === record?.cycleId,
  stateRecorded: persistedRecord?.memoryAfter != null,
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
    spendsDem: false,
    liveWriteProven: false,
  },
  result: record
    ? {
        cycleId: record.cycleId,
        iteration: record.iteration,
        decisionKind: record.decision.kind,
        decisionReason: record.decision.reason ?? null,
        outcomeStatus: record.outcome.status,
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
