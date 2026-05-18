import type { OmniWeb } from "./colony.js";
import {
  buildColonyOperatorCapabilityTruth,
  type ColonyOperatorActionIntentContract,
  type ColonyOperatorActionFamily,
  type ColonyOperatorActionTruth,
  type ColonyOperatorCapabilityTruth,
  type ColonyOperatorTruthStatus,
} from "./colony-operator-capability-truth.js";
import type { MinimalActionType, ResolvedIntent } from "./intent-types.js";
import {
  runMinimalAgentCycle,
  type MinimalAgentState,
  type MinimalCycleRecord,
  type MinimalExecutionOutcome,
  type MinimalObserveFn,
  type MinimalVerificationOptions,
  type RunMinimalAgentCycleOptions,
} from "./minimal-agent.js";

export type ColonyOperatorExecutionMode = "dry-run" | "execute";
export type ColonyOperatorLifecyclePlanStatus =
  | "not-required"
  | "planned"
  | "recorded"
  | "store-not-configured";

export interface ColonyOperatorLifecyclePlan {
  required: boolean;
  status: ColonyOperatorLifecyclePlanStatus;
  actionFamily: ColonyOperatorActionFamily;
  expectedReadback: string[];
  recordId: string | null;
  recordPath: string | null;
  proofPath: string | null;
}

export interface ColonyOperatorExecutionEnvelope<TState extends MinimalAgentState = MinimalAgentState> {
  generatedAt: string;
  mode: ColonyOperatorExecutionMode;
  selectedAction: {
    actionFamily: ColonyOperatorActionFamily;
    status: string;
    lifecycleStatus: string;
    executionPathFamily: string;
    reasonCodes: string[];
    intent: ColonyOperatorActionIntentContract;
  };
  skippedAlternatives: Array<{
    actionFamily: ColonyOperatorActionFamily;
    status: string;
    lifecycleStatus: string;
    reasonCodes: string[];
    intent: ColonyOperatorActionIntentContract;
  }>;
  capabilitySummary: ColonyOperatorCapabilitySummary;
  capabilityTruth: ColonyOperatorCapabilityTruth;
  lifecyclePlan: ColonyOperatorLifecyclePlan;
  execution: {
    cycleId: string;
    dryRun: boolean;
    status: MinimalExecutionOutcome["status"];
    txHash: string | null;
    attestationTxHash: string | null;
    demSpendEstimate: number;
    productReadback: {
      attempted: boolean;
      visible: boolean;
      indexedVisible: boolean;
      verificationPath: string | null;
    };
    error: MinimalExecutionOutcome["error"] | null;
  };
  cycle: MinimalCycleRecord<TState>;
}

export interface ColonyOperatorCapabilitySummary {
  selectedFamily: ColonyOperatorActionFamily;
  executableFamilies: ColonyOperatorActionFamily[];
  supervisedFamilies: ColonyOperatorActionFamily[];
  blockedFamilies: ColonyOperatorActionFamily[];
  lifecyclePendingFamilies: ColonyOperatorActionFamily[];
  unsupportedFamilies: ColonyOperatorActionFamily[];
  explicitExecuteFamilies: ColonyOperatorActionFamily[];
  spendFamilies: ColonyOperatorActionFamily[];
  noSpendDefault: boolean;
  allRequiredFamiliesHaveIntent: boolean;
}

export interface ColonyOperatorLifecycleStore {
  create(input: {
    actionFamily: "publish" | "reply" | "react" | "tip" | "vote" | "bet-fixed" | "bet-hl";
    walletAddress?: string | null;
    command?: string;
    commit?: string | null;
    budget: {
      amount?: number;
      unit?: "DEM" | "write-rate-slot" | "none";
      spendStatus: "no-spend" | "planned" | "executed" | "unknown";
    };
    txHash?: string;
    attestationTxHash?: string;
    targetPostHash?: string;
    expectedReadback: string[];
    status: "planned" | "broadcasted" | "pending-chain" | "pending-indexer" | "indexed" | "resolved" | "degraded" | "failed";
    metadata?: Record<string, unknown>;
  }): Promise<{
    id: string;
    status: string;
    txHash?: string;
    attestationTxHash?: string;
  }>;
  update?(id: string, patch: {
    status?: "planned" | "broadcasted" | "pending-chain" | "pending-indexer" | "indexed" | "resolved" | "degraded" | "failed";
    transitionReason?: string;
    observation?: {
      surface: string;
      status: "planned" | "broadcasted" | "pending-chain" | "pending-indexer" | "indexed" | "resolved" | "degraded" | "failed";
      ok: boolean;
      summary: string;
      data?: unknown;
    };
    finalVerdict?: {
      verdict: "pass" | "degraded" | "expired" | "failed";
      rationale: string;
      at: string;
    };
  }): Promise<{
    id: string;
    status: string;
    txHash?: string;
    attestationTxHash?: string;
  }>;
  writeProofPacket?(record: unknown): Promise<string>;
  recordsDir?: string;
}

export interface RunColonyOperatorCycleOptions<TState extends MinimalAgentState = MinimalAgentState>
  extends Omit<RunMinimalAgentCycleOptions<TState>, "dryRun"> {
  execute?: boolean;
  capabilityTruth?: ColonyOperatorCapabilityTruth;
  lifecycleStore?: ColonyOperatorLifecycleStore;
  walletAddress?: string | null;
  command?: string;
  commit?: string | null;
  verification?: MinimalVerificationOptions;
}

export async function runColonyOperatorCycle<TState extends MinimalAgentState = MinimalAgentState>(
  observe: MinimalObserveFn<TState>,
  opts: RunColonyOperatorCycleOptions<TState> = {},
): Promise<ColonyOperatorExecutionEnvelope<TState>> {
  const mode: ColonyOperatorExecutionMode = opts.execute === true ? "execute" : "dry-run";
  const capabilityTruth = opts.capabilityTruth ?? buildColonyOperatorCapabilityTruth({
    cwd: opts.readinessOptions?.cwd ?? opts.cwd,
    env: opts.readinessOptions?.env,
    envPath: opts.readinessOptions?.envPath,
    homeDir: opts.readinessOptions?.homeDir,
    packageResolver: opts.readinessOptions?.packageResolver,
    agentName: opts.readinessOptions?.agentName,
  });
  const cycle = await runMinimalAgentCycle(observe, {
    ...opts,
    dryRun: mode === "dry-run",
  });
  const selectedFamily = inferSelectedActionFamily(cycle);
  const selectedTruth = findActionTruth(capabilityTruth.actions, selectedFamily);
  const skippedAlternatives = capabilityTruth.actions
    .filter((action) => action.actionFamily !== selectedFamily)
    .map((action) => ({
      actionFamily: action.actionFamily,
      status: action.status,
      lifecycleStatus: action.lifecycleStatus,
      reasonCodes: action.reasonCodes,
      intent: action.intent,
    }));
  const lifecyclePlan = await buildLifecyclePlan({
    mode,
    cycle,
    selectedTruth,
    lifecycleStore: opts.lifecycleStore,
    walletAddress: opts.walletAddress,
    command: opts.command,
    commit: opts.commit,
  });
  const verification = cycle.outcome.execution.verification as Record<string, unknown> | undefined;

  return {
    generatedAt: new Date().toISOString(),
    mode,
    selectedAction: {
      actionFamily: selectedTruth.actionFamily,
      status: selectedTruth.status,
      lifecycleStatus: selectedTruth.lifecycleStatus,
      executionPathFamily: selectedTruth.executionPathFamily,
      reasonCodes: selectedTruth.reasonCodes,
      intent: selectedTruth.intent,
    },
    skippedAlternatives,
    capabilitySummary: summarizeCapabilityTruth(capabilityTruth, selectedTruth.actionFamily),
    capabilityTruth,
    lifecyclePlan,
    execution: {
      cycleId: cycle.cycleId,
      dryRun: cycle.dryRun,
      status: cycle.outcome.execution.status,
      txHash: cycle.outcome.execution.txHash ?? null,
      attestationTxHash: cycle.outcome.execution.attestationTxHash ?? null,
      demSpendEstimate: cycle.outcome.execution.demSpendEstimate ?? 0,
      productReadback: {
        attempted: verification?.attempted === true,
        visible: verification?.visible === true,
        indexedVisible: verification?.indexedVisible === true,
        verificationPath: typeof verification?.verificationPath === "string" ? verification.verificationPath : null,
      },
      error: cycle.outcome.execution.error ?? null,
    },
    cycle,
  };
}

function summarizeCapabilityTruth(
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

function inferSelectedActionFamily(record: MinimalCycleRecord): ColonyOperatorActionFamily {
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

function findActionTruth(
  actions: ColonyOperatorActionTruth[],
  family: ColonyOperatorActionFamily,
): ColonyOperatorActionTruth {
  return actions.find((action) => action.actionFamily === family) ?? actions[0]!;
}

async function buildLifecyclePlan<TState extends MinimalAgentState>(args: {
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
