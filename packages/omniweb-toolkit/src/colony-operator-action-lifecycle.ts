import type {
  ColonyOperatorActionFamily,
  ColonyOperatorActionTruth,
  ColonyOperatorCapabilityTruth,
  ColonyOperatorTruthStatus,
} from "./colony-operator-capability-truth.js";
import type { ToolkitCapabilityManifest } from "./capability-manifest.js";
import { evaluateToolkitGuardrailsSync } from "./guardrails.js";
import { evaluateToolkitActionAdmissibilitySync } from "./action-admissibility.js";
import type { MinimalActionType } from "./intent-types.js";
import type {
  ColonyOperatorActionSurface,
  ColonyOperatorCapabilitySummary,
  ColonyOperatorExecutionMode,
  ColonyOperatorLifecyclePlan,
  ColonyOperatorLifecycleStore,
  ColonyOperatorMultiActionPlan,
  ColonyOperatorPerActionStatus,
  ColonyOperatorPlannedAction,
  ColonyOperatorRequestedAction,
  MinimalAgentState,
  MinimalCycleRecord,
  MinimalExecutionOutcome,
  ResolvedIntent,
} from "./colony-operator-entrypoint-types.js";
import { uniqueStrings } from "./unique-strings.js";

export function buildColonyOperatorMultiActionPlan(args: {
  mode?: ColonyOperatorExecutionMode;
  capabilityTruth: ColonyOperatorCapabilityTruth;
  toolkitCapabilityManifest?: ToolkitCapabilityManifest;
  requestedActions: ColonyOperatorRequestedAction[];
}): ColonyOperatorMultiActionPlan {
  const mode = args.mode ?? "dry-run";
  const plannedIntents = args.requestedActions.map((request) => {
    const actionTruth = findActionTruth(args.capabilityTruth.actions, request.actionFamily);
    const reasonCodes = [...actionTruth.reasonCodes];
    const missingRequirements = missingRequirementsForPlannedAction(actionTruth);
    // This surface is a multi-action planning envelope only. Live execution stays
    // behind the existing explicit single-action executor path.
    const canExecuteNow = false;
    const guardrailEvaluation = evaluateToolkitGuardrailsSync({
      mode,
      explicitExecute: mode === "execute",
      actionFamily: actionTruth.actionFamily,
      actionTruth,
      requestedAction: request,
      toolkitCapabilityManifest: args.toolkitCapabilityManifest,
    });
    const admissibility = evaluateToolkitActionAdmissibilitySync({
      mode,
      explicitExecute: mode === "execute",
      actionFamily: actionTruth.actionFamily,
      actionTruth,
      requestedAction: request,
      toolkitCapabilityManifest: args.toolkitCapabilityManifest,
      guardrailEvaluation,
    });
    return {
      actionFamily: actionTruth.actionFamily,
      request: {
        actionFamily: request.actionFamily,
        params: request.params ? { ...request.params } : undefined,
        timeframe: request.timeframe,
        rationale: request.rationale,
      },
      intent: actionTruth.intent,
      status: actionTruth.status,
      lifecycleStatus: actionTruth.lifecycleStatus,
      executionPathFamily: actionTruth.executionPathFamily,
      proofLevel: actionTruth.proofLevel,
      readiness: {
        canPlan: actionTruth.status !== "unsupported",
        canExecuteNow,
        requiresExplicitExecute: actionTruth.requiresExplicitExecute,
        requiresSupervision: actionTruth.status === "supervised",
        spendsDem: actionTruth.spendsDem,
        writesLifecycleRecord: actionTruth.writesLifecycleRecord,
        missingRequirements,
        reasonCodes,
      },
      proofStatus: {
        proofLevel: actionTruth.proofLevel,
        lifecycleStatus: actionTruth.lifecycleStatus,
        expectedReadback: expectedReadbackFor(actionTruth, null),
      },
      liveExecutionGate: liveExecutionGateForPlannedAction(actionTruth, mode),
      guardrailEvaluation,
      admissibility,
    };
  });

  return {
    mode,
    requestedActionCount: args.requestedActions.length,
    plannedIntents,
    defaultLiveExecutionGate: "explicit_execute_required",
    liveExecutionAllowed: false,
    noSpendDefault: args.capabilityTruth.coverage.noSpendDefault,
    canRepresentMultipleActions: plannedIntents.length > 1,
  };
}

export function buildColonyOperatorActionSurface(args: {
  capabilityTruth: ColonyOperatorCapabilityTruth;
  selectedFamily: ColonyOperatorActionFamily;
  multiActionPlan: ColonyOperatorMultiActionPlan;
}): ColonyOperatorActionSurface {
  const plannedByFamily = new Map(args.multiActionPlan.plannedIntents.map((action) => [action.actionFamily, action]));
  const truthByFamily = new Map(args.capabilityTruth.actions.map((action) => [action.actionFamily, action]));
  const perActionStatus = args.multiActionPlan.plannedIntents.map((planned): ColonyOperatorPerActionStatus => {
    const truth = truthByFamily.get(planned.actionFamily)!;
    return {
      actionFamily: planned.actionFamily,
      selected: planned.actionFamily === args.selectedFamily,
      status: planned.status,
      lifecycleStatus: planned.lifecycleStatus,
      executionPathFamily: planned.executionPathFamily,
      proofLevel: planned.proofLevel,
      capability: {
        requiresWallet: truth.requiresWallet,
        requiresAttestation: truth.requiresAttestation,
        requiresTargetPost: truth.requiresTargetPost,
        requiresMarketContext: truth.requiresMarketContext,
        spendsDem: truth.spendsDem,
        writesLifecycleRecord: truth.writesLifecycleRecord,
      },
      guardrails: {
        status: planned.guardrailEvaluation.status,
        blockedReasonCodes: [...planned.guardrailEvaluation.blockedReasonCodes],
        supervisedRequirements: [...planned.guardrailEvaluation.supervisedRequirements],
        degradedReasonCodes: [...planned.guardrailEvaluation.degradedReasonCodes],
      },
      lifecycle: {
        status: planned.proofStatus.lifecycleStatus,
        expectedReadback: [...planned.proofStatus.expectedReadback],
      },
      supervision: {
        required: planned.readiness.requiresSupervision,
        requirements: [...planned.admissibility.supervisedRequirements],
      },
      explicitExecute: {
        required: planned.readiness.requiresExplicitExecute,
        satisfied: planned.admissibility.explicitExecute,
        gate: planned.liveExecutionGate.gate,
      },
      admissibility: {
        status: planned.admissibility.status,
        decision: planned.admissibility.decision,
        executionGate: planned.admissibility.executionGate,
        canPlan: planned.admissibility.canPlan,
        canExecuteNow: planned.admissibility.canExecuteNow,
        reasonCodes: [...planned.admissibility.reasonCodes],
      },
      finalLiveExecutionGate: planned.liveExecutionGate,
    };
  });

  const maintainedFamilies = [...args.capabilityTruth.coverage.requiredFamilies];
  return {
    maintainedFamilies,
    selectedFamily: args.selectedFamily,
    surfacedAlternativeFamilies: perActionStatus
      .filter((action) => !action.selected)
      .map((action) => action.actionFamily),
    allMaintainedFamiliesSurfaced: maintainedFamilies.every((family) => plannedByFamily.has(family)),
    perActionStatus,
    defaultNoSpend: args.multiActionPlan.noSpendDefault,
    liveExecutionAllowed: args.multiActionPlan.liveExecutionAllowed,
  };
}

export function defaultRequestedActionsFor(
  selectedTruth: ColonyOperatorActionTruth,
  skippedAlternatives: Array<{ actionFamily: ColonyOperatorActionFamily }>,
): ColonyOperatorRequestedAction[] {
  return [selectedTruth.actionFamily, ...skippedAlternatives.map((alternative) => alternative.actionFamily)]
    .map((actionFamily) => ({ actionFamily }));
}

function missingRequirementsForPlannedAction(action: ColonyOperatorActionTruth): string[] {
  const missing = [...action.reasonCodes];
  if (action.status === "blocked" && action.requiresWallet && !missing.includes("missing_credentials")) {
    missing.push("missing_credentials");
  }
  if (action.status === "lifecycle-pending" && !missing.includes("pending_current_recheck")) {
    missing.push("pending_current_recheck");
  }
  if (action.status === "supervised" && !missing.includes("supervised_authorization_required")) {
    missing.push("supervised_authorization_required");
  }
  return uniqueStrings(missing);
}

function liveExecutionGateForPlannedAction(
  action: ColonyOperatorActionTruth,
  mode: ColonyOperatorExecutionMode,
): ColonyOperatorPlannedAction["liveExecutionGate"] {
  if (action.status === "unsupported") {
    return { gate: "unsupported", reason: "action family is not supported by the current runtime surface" };
  }
  if (action.status === "blocked") {
    return { gate: "blocked", reason: action.reasonCodes.join(", ") || "runtime readiness blocker" };
  }
  if (action.status === "supervised") {
    return { gate: "supervised_authorization_required", reason: "identity and supervised mutations require explicit operator authorization" };
  }
  if (action.status !== "executable") {
    return { gate: "blocked", reason: action.reasonCodes.join(", ") || `${action.status} action is not live-executable` };
  }
  if (mode === "dry-run") {
    return { gate: "dry_run_only", reason: "operator cycle is in dry-run mode and will not execute live writes" };
  }
  if (action.requiresExplicitExecute || action.spendsDem) {
    return { gate: "explicit_execute_required", reason: "live write or spend-bearing action requires explicit execute authorization" };
  }
  return { gate: "dry_run_only", reason: "no live execution is planned for this action in the multi-action plan" };
}

export function summarizeCapabilityTruth(
  truth: ColonyOperatorCapabilityTruth,
  selectedFamily: ColonyOperatorActionFamily,
): ColonyOperatorCapabilitySummary {
  return {
    selectedFamily,
    executableFamilies: familiesWithStatus(truth.actions, "executable"),
    supervisedFamilies: familiesWithStatus(truth.actions, "supervised"),
    blockedFamilies: familiesWithStatus(truth.actions, "blocked"),
    lifecyclePendingFamilies: familiesWithStatus(truth.actions, "lifecycle-pending"),
    unsupportedFamilies: familiesWithStatus(truth.actions, "unsupported"),
    explicitExecuteFamilies: truth.actions
      .filter((action) => action.requiresExplicitExecute)
      .map((action) => action.actionFamily),
    spendFamilies: truth.actions
      .filter((action) => action.spendsDem)
      .map((action) => action.actionFamily),
    noSpendDefault: truth.coverage.noSpendDefault,
    allRequiredFamiliesHaveIntent: truth.coverage.allRequiredFamiliesHaveIntent,
  };
}

function familiesWithStatus(
  actions: ColonyOperatorActionTruth[],
  status: ColonyOperatorTruthStatus,
): ColonyOperatorActionFamily[] {
  return actions
    .filter((action) => action.status === status)
    .map((action) => action.actionFamily);
}

export function inferSelectedActionFamily(record: MinimalCycleRecord): ColonyOperatorActionFamily {
  if (record.decision.kind === "skip" || record.outcome.execution.status === "skipped") return "skip";
  const resolution = record.outcome.resolution;
  if (resolution?.actionType === "bet") {
    return resolution.normalizedDraft.marketKind === "higher_lower" ? "bet-hl" : "bet-fixed";
  }
  const actionType = resolution?.actionType ?? inferDecisionActionType(record);
  if (actionType === "publish" || actionType === "reply" || actionType === "react" || actionType === "tip") {
    return actionType;
  }
  return "skip";
}

function inferDecisionActionType(record: MinimalCycleRecord): MinimalActionType | null {
  if (record.decision.kind === "action") return record.decision.action.type;
  if (record.decision.kind === "publish" || record.decision.kind === "reply" || record.decision.kind === "react") {
    return record.decision.kind;
  }
  return null;
}

export function findActionTruth(
  actions: ColonyOperatorActionTruth[],
  family: ColonyOperatorActionFamily,
): ColonyOperatorActionTruth {
  return actions.find((action) => action.actionFamily === family) ?? actions[0]!;
}

export async function buildLifecyclePlan<TState extends MinimalAgentState>(args: {
  mode: ColonyOperatorExecutionMode;
  cycle: MinimalCycleRecord<TState>;
  selectedTruth: ColonyOperatorActionTruth;
  lifecycleStore?: ColonyOperatorLifecycleStore;
  walletAddress?: string | null;
  command?: string;
  commit?: string | null;
}): Promise<ColonyOperatorLifecyclePlan> {
  const expectedReadback = expectedReadbackFor(args.selectedTruth, args.cycle.outcome.resolution);
  const base = {
    required: args.selectedTruth.writesLifecycleRecord,
    actionFamily: args.selectedTruth.actionFamily,
    expectedReadback,
    recordId: null,
    recordPath: null,
    proofPath: null,
  };
  if (!args.selectedTruth.writesLifecycleRecord) {
    return { ...base, status: "not-required" };
  }
  if (args.mode === "dry-run") {
    return { ...base, status: "planned" };
  }
  const lifecycleFamily = toLifecycleActionFamily(args.selectedTruth.actionFamily);
  if (!lifecycleFamily || !args.lifecycleStore) {
    return { ...base, status: "store-not-configured" };
  }
  const execution = args.cycle.outcome.execution;
  let record = await args.lifecycleStore.create({
    actionFamily: lifecycleFamily,
    walletAddress: args.walletAddress ?? null,
    command: args.command,
    commit: args.commit,
    budget: {
      amount: execution.demSpendEstimate,
      unit: execution.demSpendEstimate && execution.demSpendEstimate > 0 ? "DEM" : "none",
      spendStatus: execution.status === "dry_run" ? "no-spend" : execution.status === "failed" ? "unknown" : "executed",
    },
    txHash: execution.txHash,
    attestationTxHash: execution.attestationTxHash,
    targetPostHash: args.cycle.outcome.resolution?.normalizedTarget.targetTxHash
      ?? args.cycle.outcome.resolution?.normalizedTarget.parentTxHash,
    expectedReadback,
    status: lifecycleStatusForExecution(execution),
    metadata: {
      cycleId: args.cycle.cycleId,
      sessionId: args.cycle.sessionId,
      selectedActionFamily: args.selectedTruth.actionFamily,
      productReadback: args.cycle.outcome.execution.verification ?? null,
    },
  });
  const productObservation = productReadbackObservationForExecution(execution);
  if (productObservation && args.lifecycleStore.update) {
    record = await args.lifecycleStore.update(record.id, {
      status: lifecycleStatusForExecution(execution),
      transitionReason: productObservation.ok
        ? "maintained operator product readback confirmed"
        : "maintained operator product readback not yet confirmed",
      observation: productObservation,
      finalVerdict: productObservation.ok
        ? {
            verdict: "pass",
            rationale: productObservation.summary,
            at: new Date().toISOString(),
          }
        : undefined,
    });
  }
  const proofPath = args.lifecycleStore.writeProofPacket
    ? await args.lifecycleStore.writeProofPacket(record)
    : null;
  return {
    ...base,
    status: "recorded",
    recordId: record.id,
    recordPath: args.lifecycleStore.recordsDir ? `${args.lifecycleStore.recordsDir}/${record.id}.json` : null,
    proofPath,
  };
}

function productReadbackObservationForExecution(
  execution: MinimalExecutionOutcome,
): {
  surface: string;
  status: "planned" | "broadcasted" | "pending-chain" | "pending-indexer" | "indexed" | "resolved" | "degraded" | "failed";
  ok: boolean;
  summary: string;
  data?: unknown;
} | null {
  const verification = execution.verification as Record<string, unknown> | undefined;
  if (!verification || verification.attempted !== true) return null;
  const status = lifecycleStatusForExecution(execution);
  const surface = typeof verification.verificationPath === "string"
    ? verification.verificationPath === "feed" ? "recent-feed" : verification.verificationPath
    : typeof verification.visibilitySurface === "string" ? verification.visibilitySurface : "product-readback";
  const visible = verification.visible === true;
  const indexedVisible = verification.indexedVisible === true;
  const polls = typeof verification.polls === "number" ? verification.polls : null;
  const summary = indexedVisible
    ? `product readback indexed via ${surface}${polls == null ? "" : ` after ${polls} polls`}`
    : visible
      ? `product readback visible but not indexed via ${surface}${polls == null ? "" : ` after ${polls} polls`}`
      : `product readback not visible via ${surface}${polls == null ? "" : ` after ${polls} polls`}`;
  return {
    surface,
    status,
    ok: visible,
    summary,
    data: verification,
  };
}

function expectedReadbackFor(truth: ColonyOperatorActionTruth, resolution: ResolvedIntent | null): string[] {
  if (truth.actionFamily === "publish") return ["recent-feed", "category-search", "post-detail"];
  if (truth.actionFamily === "reply") return ["parent-thread", "post-detail"];
  if (truth.actionFamily === "react") return ["reaction-envelope"];
  if (truth.actionFamily === "tip") return ["post-tip-stats", "recipient-tip-stats", "balance"];
  if (truth.actionFamily === "VOTE") return ["category-search", "post-detail"];
  if (truth.actionFamily === "bet-fixed") return ["active-pool", "winners-history"];
  if (truth.actionFamily === "bet-hl") return ["active-pool"];
  if (resolution?.executionPathFamily === "direct_attested_write") return ["recent-feed", "post-detail"];
  return [];
}

function toLifecycleActionFamily(
  family: ColonyOperatorActionFamily,
): "publish" | "reply" | "react" | "tip" | "vote" | "bet-fixed" | "bet-hl" | null {
  if (family === "publish" || family === "reply" || family === "react" || family === "tip" || family === "bet-fixed" || family === "bet-hl") {
    return family;
  }
  if (family === "VOTE") return "vote";
  return null;
}

function lifecycleStatusForExecution(
  execution: MinimalExecutionOutcome,
): "planned" | "broadcasted" | "pending-chain" | "pending-indexer" | "indexed" | "resolved" | "degraded" | "failed" {
  if (execution.status === "failed") return "failed";
  if (execution.status === "dry_run") return "planned";
  const verification = execution.verification as Record<string, unknown> | undefined;
  if (verification?.indexedVisible === true) return "indexed";
  if (verification?.visible === true) return "pending-indexer";
  if (execution.txHash) return "pending-indexer";
  return "broadcasted";
}
