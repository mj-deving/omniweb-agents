#!/usr/bin/env npx tsx

import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { getNumberArg, getStringArg, hasFlag, loadPackageExport, PACKAGE_ROOT } from "./_shared.js";
import { createWriteLifecycleStore, readCurrentGitCommit } from "./_write-lifecycle.js";

interface OperatorEnvelope {
  mode: "dry-run" | "execute";
  observedContextSummary: Record<string, unknown>;
  selectedAction: {
    actionFamily: string;
    status: string;
    lifecycleStatus: string;
    executionPathFamily: string;
    reasonCodes: string[];
  };
  actionSurface: {
    surfacedAlternativeFamilies: string[];
    perActionStatus: unknown[];
    allMaintainedFamiliesSurfaced: boolean;
    defaultNoSpend: boolean;
    liveExecutionAllowed: boolean;
  };
  finalVerdict: Record<string, unknown>;
  lifecyclePlan: {
    required: boolean;
    status: string;
    recordId: string | null;
    recordPath: string | null;
    proofPath: string | null;
  };
  execution: {
    cycleId: string;
    dryRun: boolean;
    status: string;
    txHash: string | null;
    attestationTxHash: string | null;
    demSpendEstimate: number;
    productReadback: {
      attempted: boolean;
      visible: boolean;
      indexedVisible: boolean;
      verificationPath: string | null;
    };
    error: unknown;
  };
}

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/run-colony-operator-cycle.ts [options]

Run one maintained Colony Operator cycle. Default is no-spend dry-run. Passing
--execute first runs a no-spend preflight and only proceeds if the selected
action is publish or reply.

The JSON report includes observed read context, selected action, surfaced
alternatives across maintained action families, per-action capability /
guardrail / lifecycle / supervision / explicit-execute / admissibility status,
and a final no-spend or execution verdict.

Options:
  --execute               Execute one live publish/reply cycle after preflight
  --state-dir PATH        State directory for cycle and lifecycle artifacts
  --proof-out PATH        Write lifecycle proof packet to this path
  --env-path PATH         Explicit credential/env file for wallet runtime
  --agent-name NAME       Use ~/.config/demos/credentials-NAME if present
  --feed-timeout-ms N     Product readback polling deadline (default: 90000)
  --feed-poll-ms N        Product readback polling interval (default: 5000)
  --feed-limit N          Feed window to scan (default: 50)
  --help, -h              Show this help

Output: JSON operator-cycle report
Exit codes: 0 = selected run succeeded or dry-run proof emitted,
            1 = preflight not eligible, live execution failed, or readback missing,
            2 = invalid args`);
  process.exit(0);
}

for (const flag of ["--state-dir", "--proof-out", "--env-path", "--agent-name", "--feed-timeout-ms", "--feed-poll-ms", "--feed-limit"]) {
  const index = args.indexOf(flag);
  if (index >= 0 && !args[index + 1]) {
    console.error(`Error: ${flag} requires a value`);
    process.exit(2);
  }
}

const execute = hasFlag(args, "--execute");
const stateDir = resolve(getStringArg(args, "--state-dir") ?? join(tmpdir(), "omniweb-colony-operator-cycle"));
const proofOut = getStringArg(args, "--proof-out");
const envPath = getStringArg(args, "--env-path");
const agentName = getStringArg(args, "--agent-name");
const feedTimeoutMs = getPositiveInt("--feed-timeout-ms", 90_000);
const feedPollMs = getPositiveInt("--feed-poll-ms", 5_000);
const feedLimit = getPositiveInt("--feed-limit", 50);
mkdirSync(stateDir, { recursive: true });

const runColonyOperatorCycle = await loadPackageExport<
  (observe: unknown, opts?: Record<string, unknown>) => Promise<OperatorEnvelope>
>("../dist/agent.js", "../src/agent.ts", "runColonyOperatorCycle");
const connect = await loadPackageExport<(opts?: Record<string, unknown>) => Promise<any>>(
  "../dist/runtime.js",
  "../src/connect.ts",
  "connect",
);
const starterModule = await import(pathToFileURL(resolve(
  PACKAGE_ROOT,
  "agents/openclaw/colony-operator/skills/omniweb-colony-operator/starter.ts",
)).href);

let report: Record<string, unknown>;
let exitCode = 0;

try {
  const omni = await connect({
    stateDir,
    envPath,
    agentName,
  });
  const common = {
    cwd: PACKAGE_ROOT,
    omni,
    walletAddress: omni.address ?? null,
    command: process.argv.join(" "),
    commit: readCurrentGitCommit(),
    readinessOptions: {
      cwd: PACKAGE_ROOT,
      envPath,
      agentName,
    },
    verification: {
      timeoutMs: feedTimeoutMs,
      pollMs: feedPollMs,
      limit: feedLimit,
    },
  };

  const preflight = await runColonyOperatorCycle(starterModule.observe, {
    ...common,
    stateDir: resolve(stateDir, "preflight"),
    sessionSlug: "colony-operator-live-preflight",
  });
  const preflightEligible = preflight.selectedAction.actionFamily === "publish"
    || preflight.selectedAction.actionFamily === "reply";

  if (!execute) {
    report = {
      ok: true,
      checkedAt: new Date().toISOString(),
      mode: "dry-run",
      executeRequested: false,
      walletAddress: omni.address ?? null,
      preflight,
      operatorCycleProof: summarizeOperatorCycleProof(preflight),
      nextAction: preflightEligible
        ? "Re-run with --execute to perform one bounded live publish/reply operator cycle."
        : "Current operator decision is not publish/reply; do not spend for M3 from this state.",
    };
  } else if (!preflightEligible) {
    exitCode = 1;
    report = {
      ok: false,
      checkedAt: new Date().toISOString(),
      mode: "execute-preflight-blocked",
      executeRequested: true,
      walletAddress: omni.address ?? null,
      preflight,
      operatorCycleProof: summarizeOperatorCycleProof(preflight),
      blocker: "selected_action_not_publish_or_reply",
      spendStatus: "no-spend",
    };
  } else {
    const baseStore = createWriteLifecycleStore({ stateDir });
    const lifecycleStore = {
      ...baseStore,
      writeProofPacket: async (record: unknown) => baseStore.writeProofPacket(record as any, undefined, proofOut),
    };
    const execution = await runColonyOperatorCycle(starterModule.observe, {
      ...common,
      execute: true,
      stateDir,
      sessionSlug: "colony-operator-live-execute",
      lifecycleStore,
    });
    const liveOk = (
      (execution.selectedAction.actionFamily === "publish" || execution.selectedAction.actionFamily === "reply")
      && execution.execution.status !== "failed"
      && execution.execution.productReadback.visible
      && execution.lifecyclePlan.status === "recorded"
    );
    exitCode = liveOk ? 0 : 1;
    report = {
      ok: liveOk,
      checkedAt: new Date().toISOString(),
      mode: "execute",
      executeRequested: true,
      walletAddress: omni.address ?? null,
      preflight,
      execution,
      operatorCycleProof: summarizeOperatorCycleProof(execution),
      spendStatus: execution.execution.demSpendEstimate > 0 ? "executed" : "no-spend",
      finalVerdict: liveOk ? "pass" : "pending-or-degraded",
    };
  }
} catch (error) {
  exitCode = 1;
  report = {
    ok: false,
    checkedAt: new Date().toISOString(),
    mode: execute ? "execute" : "dry-run",
    executeRequested: execute,
    error: error instanceof Error ? error.message : String(error),
    spendStatus: "unknown",
  };
}

console.log(JSON.stringify(report, null, 2));
process.exit(exitCode);

function getPositiveInt(flag: string, fallback: number): number {
  const value = getNumberArg(args, flag) ?? fallback;
  if (!Number.isInteger(value) || value <= 0) {
    console.error(`Error: ${flag} must be a positive integer`);
    process.exit(2);
  }
  return value;
}

function summarizeOperatorCycleProof(envelope: OperatorEnvelope): Record<string, unknown> {
  return {
    observedContextSummary: envelope.observedContextSummary,
    selectedAction: envelope.selectedAction,
    surfacedAlternativeFamilies: envelope.actionSurface.surfacedAlternativeFamilies,
    allMaintainedFamiliesSurfaced: envelope.actionSurface.allMaintainedFamiliesSurfaced,
    defaultNoSpend: envelope.actionSurface.defaultNoSpend,
    liveExecutionAllowed: envelope.actionSurface.liveExecutionAllowed,
    perActionStatus: envelope.actionSurface.perActionStatus,
    lifecyclePlan: envelope.lifecyclePlan,
    execution: envelope.execution,
    finalVerdict: envelope.finalVerdict,
  };
}
