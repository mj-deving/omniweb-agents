import type { OmniWeb } from "./colony.js";
import {
  buildColonyOperatorCapabilityTruth,
  type ColonyOperatorActionIntentContract,
  type ColonyOperatorActionFamily,
  type ColonyOperatorActionTruth,
  type ColonyOperatorCapabilityTruth,
  type ColonyOperatorTruthStatus,
} from "./colony-operator-capability-truth.js";
import {
  buildToolkitCapabilityManifest,
  type ToolkitCapabilityManifest,
  type ToolkitCapabilityManifestEntry,
} from "./capability-manifest.js";
import {
  evaluateToolkitGuardrailsSync,
  type ToolkitGuardrailEvaluationReport,
} from "./guardrails.js";
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
  capabilityDiscovery: ColonyOperatorCapabilityDiscovery;
  capabilityTruth: ColonyOperatorCapabilityTruth;
  toolkitCapabilityManifest: ToolkitCapabilityManifest;
  guardrailEvaluation: ToolkitGuardrailEvaluationReport;
  multiActionPlan: ColonyOperatorMultiActionPlan;
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

export interface ColonyOperatorCapabilityDiscovery {
  generatedAt: string;
  source: "omniweb-toolkit";
  recommendedMode: ToolkitCapabilityManifest["recommendedMode"];
  authReady: boolean;
  writeReady: boolean;
  blockers: ToolkitCapabilityManifest["blockers"];
  compact: {
    totalCapabilities: number;
    domains: string[];
    readCapabilities: number;
    writeCapabilities: number;
    availableReadCapabilities: string[];
    availableWriteCapabilities: string[];
    supervisedCapabilities: string[];
    advancedCapabilities: string[];
    blockedCapabilities: string[];
    lifecycleAwareCapabilities: string[];
    richResponseCapabilities: string[];
    proofResponseCapabilities: string[];
    defaultBoundaries: {
      noSpendDefault: boolean;
      liveExecutionRequiresExplicitExecute: boolean;
      strategyLayer: "skill/playbook";
      protocolLayer: "toolkit/runtime";
    };
  };
  operatorActionFamilies: Pick<
    ColonyOperatorCapabilitySummary,
    | "executableFamilies"
    | "supervisedFamilies"
    | "blockedFamilies"
    | "lifecyclePendingFamilies"
    | "explicitExecuteFamilies"
    | "spendFamilies"
  >;
  fullDetailAccess: {
    manifestField: "toolkitCapabilityManifest";
    capabilityIds: string[];
    includes: Array<"methods" | "params" | "requirements" | "responseDepth" | "proofTier" | "lifecycle" | "status">;
  };
  responseDepthAccess: ColonyOperatorResponseDepthAccess;
}

export type ColonyOperatorResponseDepthSurfaceId =
  | "post-detail-thread"
  | "signals-convergence"
  | "price-history"
  | "pool-state"
  | "reactions-tip-stats"
  | "identity-link-readbacks"
  | "lifecycle-proof-packets";

export type ColonyOperatorResponseDepthPreservationStatus = "preserved" | "partial";

export interface ColonyOperatorResponseDepthSurface {
  id: ColonyOperatorResponseDepthSurfaceId;
  label: string;
  capabilityIds: string[];
  methods: string[];
  responseDepths: ToolkitCapabilityManifestEntry["responseDepth"][];
  proofTiers: ToolkitCapabilityManifestEntry["proofTier"][];
  readbackSurfaces: string[];
  envelopeFields: string[];
  preservationStatus: ColonyOperatorResponseDepthPreservationStatus;
}

export interface ColonyOperatorResponseDepthAccess {
  manifestField: "toolkitCapabilityManifest";
  preservedFields: Array<"toolkitCapabilityManifest" | "cycle" | "lifecyclePlan">;
  surfaces: ColonyOperatorResponseDepthSurface[];
  missingSurfaces: ColonyOperatorResponseDepthSurfaceId[];
}

export interface ColonyOperatorRequestedAction {
  actionFamily: ColonyOperatorActionFamily;
  params?: Record<string, unknown>;
  timeframe?: string;
  rationale?: string;
}

export type ColonyOperatorPlannedActionGate =
  | "dry_run_only"
  | "explicit_execute_required"
  | "supervised_authorization_required"
  | "blocked"
  | "unsupported";

export interface ColonyOperatorPlannedAction {
  actionFamily: ColonyOperatorActionFamily;
  request: ColonyOperatorRequestedAction;
  intent: ColonyOperatorActionIntentContract;
  status: ColonyOperatorActionTruth["status"];
  lifecycleStatus: ColonyOperatorActionTruth["lifecycleStatus"];
  executionPathFamily: ColonyOperatorActionTruth["executionPathFamily"];
  proofLevel: ColonyOperatorActionTruth["proofLevel"];
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
    proofLevel: ColonyOperatorActionTruth["proofLevel"];
    lifecycleStatus: ColonyOperatorActionTruth["lifecycleStatus"];
    expectedReadback: string[];
  };
  liveExecutionGate: {
    gate: ColonyOperatorPlannedActionGate;
    reason: string;
  };
  guardrailEvaluation: ToolkitGuardrailEvaluationReport;
}

export interface ColonyOperatorMultiActionPlan {
  mode: ColonyOperatorExecutionMode;
  requestedActionCount: number;
  plannedIntents: ColonyOperatorPlannedAction[];
  defaultLiveExecutionGate: "explicit_execute_required";
  liveExecutionAllowed: boolean;
  noSpendDefault: boolean;
  canRepresentMultipleActions: boolean;
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
  toolkitCapabilityManifest?: ToolkitCapabilityManifest;
  requestedActions?: ColonyOperatorRequestedAction[];
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
  const toolkitCapabilityManifest = opts.toolkitCapabilityManifest ?? buildToolkitCapabilityManifest({
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
  const capabilitySummary = summarizeCapabilityTruth(capabilityTruth, selectedTruth.actionFamily);
  const multiActionPlan = buildColonyOperatorMultiActionPlan({
    mode,
    capabilityTruth,
    toolkitCapabilityManifest,
    requestedActions: opts.requestedActions ?? defaultRequestedActionsFor(selectedTruth, skippedAlternatives),
  });
  const selectedGuardrailEvaluation = multiActionPlan.plannedIntents.find((action) => action.actionFamily === selectedTruth.actionFamily)
    ?.guardrailEvaluation
    ?? evaluateToolkitGuardrailsSync({
      mode,
      explicitExecute: mode === "execute",
      actionFamily: selectedTruth.actionFamily,
      actionTruth: selectedTruth,
      toolkitCapabilityManifest,
    });

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
    capabilitySummary,
    capabilityDiscovery: buildColonyOperatorCapabilityDiscovery(toolkitCapabilityManifest, capabilitySummary),
    capabilityTruth,
    toolkitCapabilityManifest,
    guardrailEvaluation: selectedGuardrailEvaluation,
    multiActionPlan,
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

export function buildColonyOperatorCapabilityDiscovery(
  manifest: ToolkitCapabilityManifest,
  capabilitySummary?: ColonyOperatorCapabilitySummary,
): ColonyOperatorCapabilityDiscovery {
  return {
    generatedAt: manifest.generatedAt,
    source: manifest.source,
    recommendedMode: manifest.recommendedMode,
    authReady: manifest.authReady,
    writeReady: manifest.writeReady,
    blockers: manifest.blockers,
    compact: {
      totalCapabilities: manifest.capabilities.length,
      domains: manifest.coverage.domains,
      readCapabilities: manifest.coverage.readCapabilities,
      writeCapabilities: manifest.coverage.writeCapabilities,
      availableReadCapabilities: capabilityIdsWith(manifest.capabilities, {
        kind: "read",
        statuses: ["available", "degraded"],
      }),
      availableWriteCapabilities: capabilityIdsWith(manifest.capabilities, {
        kind: "write",
        statuses: ["available", "pending"],
      }),
      supervisedCapabilities: manifest.coverage.supervisedCapabilities,
      advancedCapabilities: manifest.coverage.advancedCapabilities,
      blockedCapabilities: manifest.coverage.blockedCapabilities,
      lifecycleAwareCapabilities: manifest.coverage.lifecycleAwareCapabilities,
      richResponseCapabilities: manifest.capabilities
        .filter((capability) => capability.responseDepth === "rich" || capability.responseDepth === "full")
        .map((capability) => capability.id),
      proofResponseCapabilities: manifest.capabilities
        .filter((capability) => capability.responseDepth === "proof" || capability.responseDepth === "lifecycle")
        .map((capability) => capability.id),
      defaultBoundaries: {
        noSpendDefault: capabilitySummary?.noSpendDefault ?? true,
        liveExecutionRequiresExplicitExecute: manifest.capabilities
          .some((capability) => capability.requirements.write && capability.requirements.explicitExecute),
        strategyLayer: "skill/playbook",
        protocolLayer: "toolkit/runtime",
      },
    },
    operatorActionFamilies: {
      executableFamilies: capabilitySummary?.executableFamilies ?? [],
      supervisedFamilies: capabilitySummary?.supervisedFamilies ?? [],
      blockedFamilies: capabilitySummary?.blockedFamilies ?? [],
      lifecyclePendingFamilies: capabilitySummary?.lifecyclePendingFamilies ?? [],
      explicitExecuteFamilies: capabilitySummary?.explicitExecuteFamilies ?? [],
      spendFamilies: capabilitySummary?.spendFamilies ?? [],
    },
    fullDetailAccess: {
      manifestField: "toolkitCapabilityManifest",
      capabilityIds: manifest.capabilities.map((capability) => capability.id),
      includes: ["methods", "params", "requirements", "responseDepth", "proofTier", "lifecycle", "status"],
    },
    responseDepthAccess: buildColonyOperatorResponseDepthAccess(manifest),
  };
}

export function buildColonyOperatorResponseDepthAccess(
  manifest: ToolkitCapabilityManifest,
): ColonyOperatorResponseDepthAccess {
  const surfaces = RESPONSE_DEPTH_SURFACE_REQUIREMENTS.map((requirement) => {
    const capabilities = requirement.capabilityIds
      .map((id) => manifest.capabilities.find((capability) => capability.id === id))
      .filter((capability): capability is ToolkitCapabilityManifestEntry => capability != null);
    const methods = uniqueStrings(capabilities.flatMap((capability) => capability.methods));
    const responseDepths = uniqueStrings(capabilities.map((capability) => capability.responseDepth));
    const proofTiers = uniqueStrings(capabilities.map((capability) => capability.proofTier));
    const readbackSurfaces = uniqueStrings(capabilities.flatMap((capability) => capability.lifecycle.readbackSurfaces));
    const preservationStatus: ColonyOperatorResponseDepthPreservationStatus = capabilities.length === requirement.capabilityIds.length
      && requirement.requiredMethods.every((method) => methods.includes(method))
      && requirement.requiredReadbackSurfaces.every((surface) => readbackSurfaces.includes(surface))
      && capabilities.some((capability) => requirement.acceptableResponseDepths.includes(capability.responseDepth))
      ? "preserved"
      : "partial";

    return {
      id: requirement.id,
      label: requirement.label,
      capabilityIds: capabilities.map((capability) => capability.id),
      methods,
      responseDepths,
      proofTiers,
      readbackSurfaces,
      envelopeFields: [...requirement.envelopeFields],
      preservationStatus,
    };
  });

  return {
    manifestField: "toolkitCapabilityManifest",
    preservedFields: ["toolkitCapabilityManifest", "cycle", "lifecyclePlan"],
    surfaces,
    missingSurfaces: surfaces
      .filter((surface) => surface.preservationStatus !== "preserved")
      .map((surface) => surface.id),
  };
}

function capabilityIdsWith(
  capabilities: ToolkitCapabilityManifestEntry[],
  filters: {
    kind: ToolkitCapabilityManifestEntry["kind"];
    statuses: ToolkitCapabilityManifestEntry["status"][];
  },
): string[] {
  return capabilities
    .filter((capability) => capability.kind === filters.kind && filters.statuses.includes(capability.status))
    .map((capability) => capability.id);
}

interface ResponseDepthSurfaceRequirement {
  id: ColonyOperatorResponseDepthSurfaceId;
  label: string;
  capabilityIds: string[];
  requiredMethods: string[];
  requiredReadbackSurfaces: string[];
  acceptableResponseDepths: ToolkitCapabilityManifestEntry["responseDepth"][];
  envelopeFields: string[];
}

const RESPONSE_DEPTH_SURFACE_REQUIREMENTS: ResponseDepthSurfaceRequirement[] = [
  {
    id: "post-detail-thread",
    label: "post detail and parent thread",
    capabilityIds: ["colony.post-detail"],
    requiredMethods: ["omni.colony.getPostDetail"],
    requiredReadbackSurfaces: ["post-detail", "thread"],
    acceptableResponseDepths: ["rich", "full"],
    envelopeFields: ["toolkitCapabilityManifest.capabilities", "cycle.outcome.execution.verification", "execution.productReadback"],
  },
  {
    id: "signals-convergence",
    label: "signals, convergence, and reports",
    capabilityIds: ["colony.signals"],
    requiredMethods: ["omni.colony.getSignals", "omni.colony.getConvergence", "omni.colony.getReport"],
    requiredReadbackSurfaces: ["signals", "convergence", "reports"],
    acceptableResponseDepths: ["rich", "full"],
    envelopeFields: ["toolkitCapabilityManifest.capabilities", "cycle.observation"],
  },
  {
    id: "price-history",
    label: "oracle prices and price history",
    capabilityIds: ["colony.markets.read"],
    requiredMethods: ["omni.colony.getPriceHistory"],
    requiredReadbackSurfaces: ["price-history"],
    acceptableResponseDepths: ["rich", "full"],
    envelopeFields: ["toolkitCapabilityManifest.capabilities", "cycle.observation"],
  },
  {
    id: "pool-state",
    label: "active pool, higher/lower pool, and winners history",
    capabilityIds: ["colony.pools.read"],
    requiredMethods: ["omni.colony.getPool", "omni.colony.getHigherLowerPool"],
    requiredReadbackSurfaces: ["active-pool", "higher-lower-pool", "winners-history"],
    acceptableResponseDepths: ["rich", "full"],
    envelopeFields: ["toolkitCapabilityManifest.capabilities", "cycle.outcome.execution.verification"],
  },
  {
    id: "reactions-tip-stats",
    label: "reaction summary and tip statistics",
    capabilityIds: ["colony.engagement-reads"],
    requiredMethods: ["omni.colony.getReactions", "omni.colony.getTipStats", "omni.colony.getAgentTipStats"],
    requiredReadbackSurfaces: ["reaction-summary", "post-tip-stats", "agent-tip-stats"],
    acceptableResponseDepths: ["standard", "rich", "full"],
    envelopeFields: ["toolkitCapabilityManifest.capabilities", "cycle.outcome.execution.verification"],
  },
  {
    id: "identity-link-readbacks",
    label: "identity lookup, linked agents, and post-cleanup readback",
    capabilityIds: ["colony.identity-reads", "colony.identity"],
    requiredMethods: ["omni.colony.lookupIdentity", "omni.colony.getLinkedAgents", "omni.colony.unlinkAgent"],
    requiredReadbackSurfaces: ["identity-lookup", "linked-agents", "post-cleanup-readback"],
    acceptableResponseDepths: ["rich", "proof"],
    envelopeFields: ["toolkitCapabilityManifest.capabilities", "capabilityTruth.actions"],
  },
  {
    id: "lifecycle-proof-packets",
    label: "write lifecycle records and proof packets",
    capabilityIds: [
      "colony.publish",
      "colony.reply",
      "colony.publish-vote",
      "colony.react",
      "colony.tip",
      "colony.bet-fixed",
      "colony.bet-higher-lower",
    ],
    requiredMethods: [
      "omni.colony.publish",
      "omni.colony.reply",
      "omni.colony.publishVote",
      "omni.colony.react",
      "omni.colony.tip",
      "omni.colony.placeBet",
      "omni.colony.placeHL",
    ],
    requiredReadbackSurfaces: [
      "chain",
      "attestation",
      "post-detail",
      "thread",
      "reaction-summary",
      "post-tip-stats",
      "active-pool",
      "higher-lower-pool",
      "resolved-winners",
    ],
    acceptableResponseDepths: ["lifecycle", "proof"],
    envelopeFields: ["lifecyclePlan.recordId", "lifecyclePlan.proofPath", "cycle.outcome.execution", "toolkitCapabilityManifest.capabilities"],
  },
];

function uniqueStrings<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function defaultRequestedActionsFor(
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
