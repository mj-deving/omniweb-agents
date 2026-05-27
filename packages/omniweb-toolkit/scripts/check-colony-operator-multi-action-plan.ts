#!/usr/bin/env -S bunx tsx

import { hasFlag, loadPackageExport } from "./_shared.js";

interface ColonyOperatorCapabilityTruth {
  coverage: {
    noSpendDefault: boolean;
  };
  actions: Array<Record<string, unknown>>;
}

interface MultiActionPlan {
  mode: "dry-run" | "execute";
  requestedActionCount: number;
  plannedIntents: Array<{
    actionFamily: string;
    request: {
      actionFamily: string;
      params?: Record<string, unknown>;
      timeframe?: string;
      rationale?: string;
    };
    status: string;
    executionPathFamily: string;
    proofLevel: string;
    readiness: {
      canPlan: boolean;
      canExecuteNow: boolean;
      requiresExplicitExecute: boolean;
      requiresSupervision: boolean;
      spendsDem: boolean;
      writesLifecycleRecord: boolean;
      missingRequirements: string[];
      reasonCodes: string[];
    };
    proofStatus: {
      proofLevel: string;
      lifecycleStatus: string;
      expectedReadback: string[];
    };
    liveExecutionGate: {
      gate: string;
      reason: string;
    };
    guardrailEvaluation: {
      status: string;
      blockedReasonCodes: string[];
      supervisedRequirements: string[];
    };
  }>;
  defaultLiveExecutionGate: string;
  liveExecutionAllowed: boolean;
  noSpendDefault: boolean;
  canRepresentMultipleActions: boolean;
}

const args = process.argv.slice(2);
const allowedArgs = new Set(["--help", "-h"]);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: bunx tsx packages/omniweb-toolkit/scripts/check-colony-operator-multi-action-plan.ts

Assert that the colony-operator runtime can represent multiple requested actions in one dry-run plan with per-action readiness, proof status, params, timeframe, and live-execution gates.

Output: JSON multi-action dry-run planning proof
Exit codes: 0 = proof passed, 1 = proof failed, 2 = invalid args`);
  process.exit(0);
}

const unsupportedArgs = args.filter((arg) => !allowedArgs.has(arg));
if (unsupportedArgs.length > 0) {
  console.error(`Error: unsupported arguments: ${unsupportedArgs.join(" ")}`);
  process.exit(2);
}

const buildColonyOperatorCapabilityTruth = await loadPackageExport<
  (opts?: Record<string, unknown>) => ColonyOperatorCapabilityTruth
>("../dist/agent.js", "../src/agent.ts", "buildColonyOperatorCapabilityTruth");
const buildColonyOperatorMultiActionPlan = await loadPackageExport<
  (opts: {
    mode?: "dry-run" | "execute";
    capabilityTruth: ColonyOperatorCapabilityTruth;
    requestedActions: Array<Record<string, unknown>>;
  }) => MultiActionPlan
>("../dist/agent.js", "../src/agent.ts", "buildColonyOperatorMultiActionPlan");

const started = Date.now();
const requestedActions = [
  {
    actionFamily: "publish",
    params: { category: "OBSERVATION", text: "BTC funding split follow-up" },
    timeframe: "now",
    rationale: "primary operator post",
  },
  {
    actionFamily: "tip",
    params: { targetTxHash: "0xentrypoint-publish", amount: 1 },
    timeframe: "after post-detail readback",
    rationale: "reward useful post",
  },
  {
    actionFamily: "bet-fixed",
    params: { asset: "BTC", horizon: "30m", predictedPrice: 78000 },
    timeframe: "30m",
    rationale: "fixed-price market lane",
  },
  {
    actionFamily: "bet-hl",
    params: { asset: "ETH", horizon: "24h", direction: "higher" },
    timeframe: "24h",
    rationale: "higher/lower market lane that still needs current delayed readback",
  },
  {
    actionFamily: "register",
    params: { agentAddress: "0xoperator" },
    timeframe: "supervised only",
    rationale: "identity lane must remain supervised",
  },
];

const capabilityTruth = buildColonyOperatorCapabilityTruth({
  now: new Date("2026-05-18T08:35:00.000Z"),
  runtimeCapabilities: {
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
  },
});
const dryRunPlan = buildColonyOperatorMultiActionPlan({
  mode: "dry-run",
  capabilityTruth,
  requestedActions,
});
const executePlan = buildColonyOperatorMultiActionPlan({
  mode: "execute",
  capabilityTruth,
  requestedActions,
});
const dryRunByFamily = byFamily(dryRunPlan);
const executeByFamily = byFamily(executePlan);

const checks = {
  multipleActionsRepresented: dryRunPlan.requestedActionCount === requestedActions.length
    && dryRunPlan.canRepresentMultipleActions === true
    && dryRunPlan.plannedIntents.map((intent) => intent.actionFamily).join(",") === "publish,tip,bet-fixed,bet-hl,register",
  dryRunNeverAllowsLiveExecution: dryRunPlan.mode === "dry-run"
    && dryRunPlan.liveExecutionAllowed === false
    && dryRunPlan.defaultLiveExecutionGate === "explicit_execute_required"
    && dryRunPlan.noSpendDefault === true,
  requestParamsAndTimeframesPreserved: dryRunByFamily.tip?.request.params?.targetTxHash === "0xentrypoint-publish"
    && dryRunByFamily.tip.request.timeframe === "after post-detail readback"
    && dryRunByFamily["bet-fixed"]?.request.params?.horizon === "30m"
    && dryRunByFamily["bet-hl"]?.request.rationale?.includes("higher/lower") === true,
  publishProofAndGate: dryRunByFamily.publish?.status === "executable"
    && dryRunByFamily.publish.proofLevel === "lifecycle_proven"
    && dryRunByFamily.publish.readiness.requiresExplicitExecute === true
    && dryRunByFamily.publish.readiness.spendsDem === true
    && dryRunByFamily.publish.readiness.writesLifecycleRecord === true
    && dryRunByFamily.publish.readiness.canExecuteNow === false
    && dryRunByFamily.publish.liveExecutionGate.gate === "dry_run_only"
    && includesAll(dryRunByFamily.publish.proofStatus.expectedReadback, ["recent-feed", "category-search", "post-detail"]),
  tipProofAndGate: dryRunByFamily.tip?.status === "executable"
    && dryRunByFamily.tip.executionPathFamily === "tip_transfer"
    && dryRunByFamily.tip.readiness.canExecuteNow === false
    && includesAll(dryRunByFamily.tip.proofStatus.expectedReadback, ["post-tip-stats", "recipient-tip-stats", "balance"]),
  marketProofStatuses: dryRunByFamily["bet-fixed"]?.status === "executable"
    && dryRunByFamily["bet-fixed"].executionPathFamily === "market_write"
    && includesAll(dryRunByFamily["bet-fixed"].proofStatus.expectedReadback, ["active-pool", "winners-history"])
    && dryRunByFamily["bet-hl"]?.status === "lifecycle-pending"
    && dryRunByFamily["bet-hl"].proofLevel === "pending_current_recheck"
    && dryRunByFamily["bet-hl"].liveExecutionGate.gate === "blocked"
    && includesAll(dryRunByFamily["bet-hl"].readiness.missingRequirements, ["higher_lower_current_delayed_readback_pending", "pending_current_recheck"]),
  supervisedIdentityGated: dryRunByFamily.register?.status === "supervised"
    && dryRunByFamily.register.readiness.requiresSupervision === true
    && dryRunByFamily.register.liveExecutionGate.gate === "supervised_authorization_required",
  guardrailsAttachedIndependently: dryRunByFamily.publish?.guardrailEvaluation.status === "block"
    && dryRunByFamily.publish.guardrailEvaluation.blockedReasonCodes.includes("explicit_execute_required_for_spend")
    && dryRunByFamily.tip?.guardrailEvaluation.status === "block"
    && dryRunByFamily["bet-fixed"]?.guardrailEvaluation.status === "block"
    && dryRunByFamily.register?.guardrailEvaluation.status === "supervised"
    && dryRunByFamily.register.guardrailEvaluation.supervisedRequirements.includes("identity_mutation_requires_supervision"),
  executeModeStillGated: executePlan.mode === "execute"
    && executePlan.liveExecutionAllowed === false
    && executeByFamily.publish?.liveExecutionGate.gate === "explicit_execute_required"
    && executeByFamily.tip?.liveExecutionGate.gate === "explicit_execute_required"
    && executeByFamily["bet-fixed"]?.liveExecutionGate.gate === "explicit_execute_required"
    && executeByFamily["bet-hl"]?.liveExecutionGate.gate === "blocked"
    && executeByFamily.register?.liveExecutionGate.gate === "supervised_authorization_required",
};
const ok = Object.values(checks).every(Boolean);

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  ok,
  durationMs: Date.now() - started,
  checks,
  contract: {
    multiActionDryRunPlanning: ok,
    perActionReadinessAndProofStatus: ok,
    liveExecutionExplicitlyGated: checks.dryRunNeverAllowsLiveExecution && checks.executeModeStillGated && checks.guardrailsAttachedIndependently,
    spendsDem: false,
    liveWriteProven: false,
  },
  dryRunPlan,
  executePlan: {
    mode: executePlan.mode,
    liveExecutionAllowed: executePlan.liveExecutionAllowed,
    plannedIntents: executePlan.plannedIntents.map((intent) => ({
      actionFamily: intent.actionFamily,
      status: intent.status,
      readiness: intent.readiness,
      liveExecutionGate: intent.liveExecutionGate,
      guardrailEvaluation: intent.guardrailEvaluation,
    })),
  },
}, null, 2));

process.exit(ok ? 0 : 1);

function byFamily(plan: MultiActionPlan): Record<string, MultiActionPlan["plannedIntents"][number]> {
  return Object.fromEntries(plan.plannedIntents.map((intent) => [intent.actionFamily, intent]));
}

function includesAll(values: string[] | undefined, expected: string[]): boolean {
  return expected.every((value) => values?.includes(value));
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
