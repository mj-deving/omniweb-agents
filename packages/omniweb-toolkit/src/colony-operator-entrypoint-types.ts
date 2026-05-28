import type {
  ColonyOperatorActionFamily,
  ColonyOperatorActionIntentContract,
  ColonyOperatorActionTruth,
  ColonyOperatorCapabilityTruth,
} from "./colony-operator-capability-truth.js";
import type {
  ToolkitCapabilityManifest,
  ToolkitCapabilityManifestEntry,
} from "./capability-manifest.js";
import type { ToolkitGuardrailEvaluationReport } from "./guardrails.js";
import type { ToolkitActionAdmissibilityReport } from "./action-admissibility.js";
import type { MinimalActionType, ResolvedIntent } from "./intent-types.js";
import type {
  MinimalAgentState,
  MinimalCycleRecord,
  MinimalExecutionOutcome,
  MinimalObserveFn,
  MinimalVerificationOptions,
  RunMinimalAgentCycleOptions,
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
  observedContextSummary: ColonyOperatorObservedContextSummary;
  selectedAction: {
    actionFamily: ColonyOperatorActionFamily;
    status: string;
    lifecycleStatus: string;
    executionPathFamily: string;
    reasonCodes: string[];
    intent: ColonyOperatorActionIntentContract;
    admissibility: ToolkitActionAdmissibilityReport;
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
  admissibility: ToolkitActionAdmissibilityReport;
  multiActionPlan: ColonyOperatorMultiActionPlan;
  actionSurface: ColonyOperatorActionSurface;
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
  finalVerdict: ColonyOperatorFinalVerdict;
  cycle: MinimalCycleRecord<TState>;
}

export interface ColonyOperatorObservedContextSummary {
  source: "minimal-agent-cycle";
  cycleId: string;
  decisionKind: MinimalCycleRecord["decision"]["kind"];
  selectedActionFamily: ColonyOperatorActionFamily;
  actionType: string | null;
  policyId: string | null;
  routeId: string | null;
  matchedConditions: string[];
  liveReadSurfaces: string[];
  facts: Record<string, unknown> | null;
  promptObjective: string | null;
  observedFacts: string[];
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
    includes: Array<
      | "methods"
      | "params"
      | "methodParams"
      | "requirements"
      | "methodRequirements"
      | "responseDepth"
      | "proofTier"
      | "lifecycle"
      | "status"
    >;
  };
  operatorHelp: ColonyOperatorToolkitHelp;
  responseDepthAccess: ColonyOperatorResponseDepthAccess;
}

export interface ColonyOperatorToolkitHelpCommand {
  command: string;
  capabilityId: string;
  domain: ToolkitCapabilityManifestEntry["domain"];
  kind: ToolkitCapabilityManifestEntry["kind"];
  status: ToolkitCapabilityManifestEntry["status"];
  params: ToolkitCapabilityManifestEntry["params"];
  requirements: ToolkitCapabilityManifestEntry["requirements"];
  responseDepth: ToolkitCapabilityManifestEntry["responseDepth"];
  proofTier: ToolkitCapabilityManifestEntry["proofTier"];
  readbackSurfaces: string[];
  writesLifecycleRecord: boolean;
  noSpend: boolean;
  noMutation: boolean;
  requiresExplicitExecute: boolean;
  usage: string;
  notes: string[];
}

export interface ColonyOperatorToolkitHelp {
  format: "toolkit-help.v1";
  manifestField: "toolkitCapabilityManifest";
  intent: "discover_toolkit_surface";
  defaultMode: "read-first-no-spend";
  filters: {
    domains: ToolkitCapabilityManifestEntry["domain"][];
    kinds: ToolkitCapabilityManifestEntry["kind"][];
    statuses: ToolkitCapabilityManifestEntry["status"][];
    responseDepths: ToolkitCapabilityManifestEntry["responseDepth"][];
    proofTiers: ToolkitCapabilityManifestEntry["proofTier"][];
  };
  commands: ColonyOperatorToolkitHelpCommand[];
  readCommands: ColonyOperatorToolkitHelpCommand[];
  writeCommands: ColonyOperatorToolkitHelpCommand[];
  commandCount: number;
  readCommandCount: number;
  writeCommandCount: number;
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
  timeParameters: ToolkitCapabilityManifestEntry["params"];
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
  admissibility: ToolkitActionAdmissibilityReport;
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

export interface ColonyOperatorActionSurface {
  maintainedFamilies: ColonyOperatorActionFamily[];
  selectedFamily: ColonyOperatorActionFamily;
  surfacedAlternativeFamilies: ColonyOperatorActionFamily[];
  allMaintainedFamiliesSurfaced: boolean;
  perActionStatus: ColonyOperatorPerActionStatus[];
  defaultNoSpend: boolean;
  liveExecutionAllowed: boolean;
}

export interface ColonyOperatorPerActionStatus {
  actionFamily: ColonyOperatorActionFamily;
  selected: boolean;
  status: ColonyOperatorActionTruth["status"];
  lifecycleStatus: ColonyOperatorActionTruth["lifecycleStatus"];
  executionPathFamily: ColonyOperatorActionTruth["executionPathFamily"];
  proofLevel: ColonyOperatorActionTruth["proofLevel"];
  capability: {
    requiresWallet: boolean;
    requiresAttestation: boolean;
    requiresTargetPost: boolean;
    requiresMarketContext: boolean;
    spendsDem: boolean;
    writesLifecycleRecord: boolean;
  };
  guardrails: {
    status: ToolkitGuardrailEvaluationReport["status"];
    blockedReasonCodes: string[];
    supervisedRequirements: string[];
    degradedReasonCodes: string[];
  };
  lifecycle: {
    status: ColonyOperatorActionTruth["lifecycleStatus"];
    expectedReadback: string[];
  };
  supervision: {
    required: boolean;
    requirements: string[];
  };
  explicitExecute: {
    required: boolean;
    satisfied: boolean;
    gate: ColonyOperatorPlannedActionGate;
  };
  admissibility: Pick<
    ToolkitActionAdmissibilityReport,
    "status" | "decision" | "executionGate" | "canPlan" | "canExecuteNow" | "reasonCodes"
  >;
  finalLiveExecutionGate: ColonyOperatorPlannedAction["liveExecutionGate"];
}

export interface ColonyOperatorFinalVerdict {
  verdict: "no-spend-proof" | "execution-pass" | "execution-degraded" | "execution-failed";
  mode: ColonyOperatorExecutionMode;
  spendStatus: "no-spend" | "planned" | "executed" | "unknown";
  selectedActionFamily: ColonyOperatorActionFamily;
  liveExecutionAttempted: boolean;
  liveExecutionAllowed: boolean;
  rationale: string;
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

export type {
  ColonyOperatorActionFamily,
  ColonyOperatorActionIntentContract,
  ColonyOperatorActionTruth,
  ColonyOperatorCapabilityTruth,
  MinimalActionType,
  MinimalAgentState,
  MinimalCycleRecord,
  MinimalExecutionOutcome,
  MinimalObserveFn,
  ResolvedIntent,
  ToolkitActionAdmissibilityReport,
  ToolkitCapabilityManifest,
  ToolkitCapabilityManifestEntry,
  ToolkitGuardrailEvaluationReport,
};
