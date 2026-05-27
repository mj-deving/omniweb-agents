#!/usr/bin/env -S bunx tsx

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { hasFlag, loadPackageExport, PACKAGE_ROOT } from "./_shared.js";

interface AdmissibilityReport {
  status: string;
  executionGate: string;
  canExecuteNow: boolean;
  reasonCodes: string[];
}

interface GuardrailReport {
  status: string;
  blockedReasonCodes: string[];
}

interface ResolvedIntentEnvelope {
  execution: {
    status: string;
    actionType: string;
    admissibility?: AdmissibilityReport;
    guardrailEvaluation?: GuardrailReport;
  };
}

interface MinimalExecutionOutcome {
  status: string;
  admissibility?: AdmissibilityReport;
  guardrailEvaluation?: GuardrailReport;
}

interface CapabilityTruth {
  actions: Array<Record<string, unknown>>;
  coverage: {
    noSpendDefault: boolean;
  };
}

interface MultiActionPlan {
  plannedIntents: Array<{
    actionFamily: string;
    liveExecutionGate: {
      gate: string;
      reason: string;
    };
    admissibility?: AdmissibilityReport;
  }>;
}

interface OperatorEnvelope {
  selectedAction: {
    actionFamily: string;
    admissibility?: AdmissibilityReport;
  };
  admissibility?: AdmissibilityReport;
  multiActionPlan: MultiActionPlan;
  cycle: {
    outcome: {
      execution: MinimalExecutionOutcome;
    };
  };
}

const args = process.argv.slice(2);
const allowedArgs = new Set(["--help", "-h"]);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: bunx tsx packages/omniweb-toolkit/scripts/check-colony-operator-admissibility-hardening.ts

Assert that maintained colony-operator runtime execution cannot bypass toolkit action admissibility.

Output: JSON hardening proof
Exit codes: 0 = proof passed, 1 = proof failed, 2 = invalid args`);
  process.exit(0);
}

const unsupportedArgs = args.filter((arg) => !allowedArgs.has(arg));
if (unsupportedArgs.length > 0) {
  console.error(`Error: unsupported arguments: ${unsupportedArgs.join(" ")}`);
  process.exit(2);
}

const executeResolvedIntent = await loadPackageExport<
  (opts: Record<string, unknown>) => Promise<ResolvedIntentEnvelope>
>("../dist/agent.js", "../src/agent.ts", "executeResolvedIntent");
const executeMinimalAction = await loadPackageExport<
  (opts: Record<string, unknown>) => Promise<MinimalExecutionOutcome>
>("../dist/agent.js", "../src/agent.ts", "executeMinimalAction");
const normalizeDecisionToResolvedIntent = await loadPackageExport<
  (decision: Record<string, unknown>, opts?: Record<string, unknown>) => Record<string, unknown> | null
>("../dist/agent.js", "../src/agent.ts", "normalizeDecisionToResolvedIntent");
const buildColonyOperatorCapabilityTruth = await loadPackageExport<
  (opts?: Record<string, unknown>) => CapabilityTruth
>("../dist/agent.js", "../src/agent.ts", "buildColonyOperatorCapabilityTruth");
const buildColonyOperatorMultiActionPlan = await loadPackageExport<
  (opts: Record<string, unknown>) => MultiActionPlan
>("../dist/agent.js", "../src/agent.ts", "buildColonyOperatorMultiActionPlan");
const runColonyOperatorCycle = await loadPackageExport<
  (observe: unknown, opts?: Record<string, unknown>) => Promise<OperatorEnvelope>
>("../dist/agent.js", "../src/agent.ts", "runColonyOperatorCycle");

const started = Date.now();
const sourceChecks = checkSourceContracts();
const runtimeChecks = await checkRuntimeContracts();
const ok = Object.values(sourceChecks).every(Boolean) && Object.values(runtimeChecks).every(Boolean);

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  ok,
  durationMs: Date.now() - started,
  sourceChecks,
  runtimeChecks,
  contract: {
    executeResolvedIntentFinalGate: sourceChecks.failClosedBeforeDispatch && runtimeChecks.blockedPublishNoSideEffects,
    executionResultsPreserveAdmissibility: runtimeChecks.dryRunCarriesAdmissibility
      && runtimeChecks.skippedCarriesAdmissibility
      && runtimeChecks.blockedCarriesAdmissibility
      && runtimeChecks.allowedReactCarriesAdmissibility,
    plannerSurfacesExposeAdmissibility: runtimeChecks.selectedActionCarriesAdmissibility
      && runtimeChecks.multiActionPlanCarriesAdmissibility,
    liveExecutionGateIsMetadata: runtimeChecks.liveExecutionGatePresentButNonAuthoritative,
    lowLevelOperatorToolsInScope: false,
    spendsDem: false,
    liveWriteProven: false,
  },
}, null, 2));

process.exit(ok ? 0 : 1);

function checkSourceContracts(): Record<string, boolean> {
  const actionExecutor = readFileSync(resolve(PACKAGE_ROOT, "src", "action-executor.ts"), "utf8");
  const minimalAgent = readFileSync(resolve(PACKAGE_ROOT, "src", "minimal-agent.ts"), "utf8");
  const colonyOperatorEntrypoint = readFileSync(resolve(PACKAGE_ROOT, "src", "colony-operator-entrypoint.ts"), "utf8");

  const admissibilityCall = actionExecutor.indexOf("await evaluateToolkitActionAdmissibility");
  const failClosedBranch = actionExecutor.indexOf("if (admissibility.status !== \"allowed\")");
  const dispatches = [
    "executeDirectAttestedWriteIntent({",
    "executeReactionIntent({",
    "executeTipIntent({",
    "executeMarketWriteIntent({",
  ].map((needle) => actionExecutor.indexOf(needle));

  return {
    importsAdmissibilityEvaluator: actionExecutor.includes("evaluateToolkitActionAdmissibility")
      && actionExecutor.includes("from \"./action-admissibility.js\""),
    callsAdmissibilityEvaluator: admissibilityCall >= 0,
    failClosedBeforeDispatch: admissibilityCall >= 0
      && failClosedBranch > admissibilityCall
      && dispatches.every((position) => position > failClosedBranch),
    blockedPathPreservesAdmissibility: actionExecutor.includes("message: `admissibility_${admissibility.status}")
      && actionExecutor.includes("admissibility,\n      })"),
    dryRunAndSkippedPathsPreserveAdmissibility: countOccurrences(actionExecutor, "guardrailEvaluation,\n        admissibility,") >= 2,
    successfulDispatchPreservesAdmissibility: actionExecutor.includes("withRuntimeGateReports(")
      && countOccurrences(actionExecutor, "withRuntimeGateReports(") >= 5,
    minimalOutcomePreservesAdmissibility: minimalAgent.includes("admissibility?: ToolkitActionAdmissibilityReport")
      && actionExecutor.includes("admissibility: execution.admissibility"),
    selectedActionSurfacePreservesAdmissibility: colonyOperatorEntrypoint.includes("selectedAction: {")
      && colonyOperatorEntrypoint.includes("admissibility: selectedAdmissibility"),
    multiActionPlanPreservesAdmissibility: colonyOperatorEntrypoint.includes("const admissibility = evaluateToolkitActionAdmissibilitySync")
      && colonyOperatorEntrypoint.includes("liveExecutionGate: liveExecutionGateForPlannedAction")
      && colonyOperatorEntrypoint.includes("admissibility,"),
  };
}

async function checkRuntimeContracts(): Promise<Record<string, boolean>> {
  const runtime = readyRuntime();
  const unsafePublishOmni = makeMockOmni();
  const unsafePublish = normalizeDecisionToResolvedIntent({
    kind: "publish",
    category: "OBSERVATION",
    text: "Unsafe local proof.",
    attestUrl: "https://127.0.0.1/proof",
  }, { runtimeCapabilities: runtime });
  const blockedEnvelope = await executeResolvedIntent({
    omni: unsafePublishOmni.omni,
    resolution: unsafePublish,
    verification: verification(),
  });

  const dryRunReactOmni = makeMockOmni();
  const reactDecision = {
    kind: "action",
    action: { type: "react", targetTxHash: "0xpost", reaction: "agree" },
    readiness: { requiresWallet: true, requiresTargetPost: true },
  };
  const reactResolution = normalizeDecisionToResolvedIntent(reactDecision, { runtimeCapabilities: runtime });
  const dryRunEnvelope = await executeResolvedIntent({
    omni: dryRunReactOmni.omni,
    resolution: reactResolution,
    dryRun: true,
    verification: verification(),
  });

  const skippedPublishOmni = makeMockOmni();
  const blockedRuntime = readyRuntime({
    publish: {
      executable: false,
      readiness: "missing_credentials",
    },
  });
  const blockedResolution = normalizeDecisionToResolvedIntent({
    kind: "publish",
    category: "OBSERVATION",
    text: "Credential-blocked proof.",
    attestUrl: "https://example.com/proof",
  }, { runtimeCapabilities: blockedRuntime });
  const skippedEnvelope = await executeResolvedIntent({
    omni: skippedPublishOmni.omni,
    resolution: blockedResolution,
    verification: verification(),
  });

  const allowedReactOmni = makeMockOmni();
  const allowedEnvelope = await executeResolvedIntent({
    omni: allowedReactOmni.omni,
    resolution: reactResolution,
    verification: verification(),
  });

  const minimalDryRunOmni = makeMockOmni();
  const minimalDryRun = await executeMinimalAction({
    omni: minimalDryRunOmni.omni,
    decision: reactDecision,
    actionDecision: reactDecision,
    resolution: reactResolution,
    dryRun: true,
    verification: verification(),
  });

  const capabilityTruth = buildColonyOperatorCapabilityTruth({
    runtimeCapabilities: runtime,
    now: new Date("2026-05-18T13:00:00.000Z"),
  });
  const multiActionPlan = buildColonyOperatorMultiActionPlan({
    mode: "execute",
    capabilityTruth,
    requestedActions: [
      { actionFamily: "publish", params: { text: "Publish proof" }, timeframe: "now" },
      { actionFamily: "bet-hl", params: { asset: "ETH", direction: "higher" }, timeframe: "24h" },
      { actionFamily: "register", params: { agentAddress: "0xoperator" }, timeframe: "supervised" },
    ],
  });
  const byFamily = Object.fromEntries(multiActionPlan.plannedIntents.map((intent) => [intent.actionFamily, intent]));

  const operatorEnvelope = await runColonyOperatorCycle(
    async () => reactDecision,
    {
      omni: makeMockOmni().omni,
      stateDir: mkdtempSync(join(tmpdir(), "omniweb-admissibility-hardening-")),
      sessionSlug: "admissibility-hardening",
      capabilityTruth,
      requestedActions: [
        { actionFamily: "react", params: { targetTxHash: "0xpost", reaction: "agree" }, timeframe: "now" },
        { actionFamily: "publish", params: { text: "Publish proof" }, timeframe: "later" },
      ],
      verification: verification(),
    },
  );

  return {
    blockedPublishNoSideEffects: unsafePublishOmni.calls.publish === 0
      && blockedEnvelope.execution.status === "failed"
      && blockedEnvelope.execution.admissibility?.status === "blocked",
    blockedCarriesAdmissibility: blockedEnvelope.execution.admissibility?.status === "blocked"
      && blockedEnvelope.execution.guardrailEvaluation?.status === "block",
    dryRunCarriesAdmissibility: dryRunReactOmni.calls.react === 0
      && dryRunEnvelope.execution.status === "dry_run"
      && dryRunEnvelope.execution.admissibility?.status === "explicit_execute_required",
    skippedCarriesAdmissibility: skippedPublishOmni.calls.publish === 0
      && skippedEnvelope.execution.status === "skipped"
      && typeof skippedEnvelope.execution.admissibility?.status === "string",
    allowedReactReachesExecutor: allowedReactOmni.calls.react === 1
      && allowedEnvelope.execution.status === "executed",
    allowedReactCarriesAdmissibility: allowedEnvelope.execution.admissibility?.status === "allowed"
      && allowedEnvelope.execution.admissibility.canExecuteNow === true
      && allowedEnvelope.execution.guardrailEvaluation?.status === "pass",
    minimalDryRunOutcomeCarriesAdmissibility: minimalDryRunOmni.calls.react === 0
      && minimalDryRun.status === "dry_run"
      && minimalDryRun.admissibility?.status === "explicit_execute_required",
    selectedActionCarriesAdmissibility: typeof operatorEnvelope.selectedAction.actionFamily === "string"
      && typeof operatorEnvelope.selectedAction.admissibility?.status === "string"
      && operatorEnvelope.admissibility?.status === operatorEnvelope.selectedAction.admissibility.status,
    operatorCycleOutcomeCarriesAdmissibility: operatorEnvelope.cycle.outcome.execution.admissibility?.status === "explicit_execute_required",
    multiActionPlanCarriesAdmissibility: multiActionPlan.plannedIntents.length === 3
      && typeof byFamily.publish?.admissibility?.status === "string"
      && byFamily["bet-hl"]?.admissibility?.reasonCodes.includes("higher_lower_current_delayed_readback_pending") === true
      && byFamily.register?.admissibility?.status === "supervised",
    liveExecutionGatePresentButNonAuthoritative: byFamily.publish?.liveExecutionGate.gate === "explicit_execute_required"
      && byFamily.publish.admissibility?.status === "allowed"
      && byFamily.register?.liveExecutionGate.gate === "supervised_authorization_required"
      && byFamily.register.admissibility?.status === "supervised",
  };
}

function verification(): Record<string, number> {
  return { timeoutMs: 1, pollMs: 1, limit: 1 };
}

function makeMockOmni(): {
  omni: Record<string, unknown>;
  calls: Record<"publish" | "react" | "tip" | "placeBet" | "placeHL", number>;
} {
  const calls = {
    publish: 0,
    react: 0,
    tip: 0,
    placeBet: 0,
    placeHL: 0,
  };
  let reactionReads = 0;
  return {
    calls,
    omni: {
      colony: {
        publish: async () => {
          calls.publish += 1;
          return { ok: true, data: { txHash: "0xpublish" } };
        },
        reply: async () => ({ ok: true, data: { txHash: "0xreply" } }),
        react: async () => {
          calls.react += 1;
          return { ok: true };
        },
        tip: async () => {
          calls.tip += 1;
          return { ok: true, data: { txHash: "0xtip" } };
        },
        placeBet: async () => {
          calls.placeBet += 1;
          return { ok: true, data: { txHash: "0xbet" } };
        },
        placeHL: async () => {
          calls.placeHL += 1;
          return { ok: true, data: { txHash: "0xhl" } };
        },
        getReactions: async () => {
          reactionReads += 1;
          return {
            ok: true,
            data: reactionReads <= 1
              ? { agree: 0, disagree: 0, flag: 0, myReaction: null }
              : { agree: 1, disagree: 0, flag: 0, myReaction: "agree" },
          };
        },
        getPostDetail: async () => ({ ok: true, data: { authorAddress: "0xrecipient" } }),
        getTipStats: async () => ({ ok: true, data: { totalTips: 0, totalDem: 0 } }),
        getAgentTipStats: async () => ({ ok: true, data: { tipsReceived: { count: 0, totalDem: 0 } } }),
        getBalance: async () => ({ ok: true, data: { balance: 10 } }),
        getPool: async () => ({ ok: true, data: { entries: [] } }),
        getHigherLowerPool: async () => ({ ok: true, data: { entries: [] } }),
      },
    },
  };
}

function readyRuntime(actionOverrides: Record<string, Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    canRead: true,
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
      credentialSourcesChecked: [],
      runtimeCredentialSource: null,
      notes: [],
    },
    actionFamilies: {
      publish: readyActionFamily(actionOverrides.publish),
      reply: readyActionFamily({ requiresTargetPost: true, ...actionOverrides.reply }),
      react: readyActionFamily({ requiresAttestation: false, requiresTargetPost: true, spendsDem: false, ...actionOverrides.react }),
      tip: readyActionFamily({ requiresAttestation: false, requiresTargetPost: true, ...actionOverrides.tip }),
      bet: readyActionFamily({ requiresAttestation: false, requiresMarketContext: true, ...actionOverrides.bet }),
    },
  };
}

function readyActionFamily(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    declared: true,
    executable: true,
    readiness: "ready",
    requiresWallet: true,
    requiresAttestation: true,
    requiresTargetPost: false,
    requiresMarketContext: false,
    proofLevel: "real_runtime_action_family",
    notes: [],
    ...overrides,
  };
}

function countOccurrences(value: string, needle: string): number {
  return value.split(needle).length - 1;
}
