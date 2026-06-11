import {
  buildToolkitCapabilityManifest,
  type ToolkitCapabilityManifest,
  type ToolkitCapabilityManifestEntry,
  type ToolkitCapabilityStatus,
} from "./capability-manifest.js";
import {
  buildColonyOperatorCapabilityTruth,
  type ColonyOperatorActionFamily,
  type ColonyOperatorActionTruth,
  type ColonyOperatorCapabilityTruth,
} from "./colony-operator-capability-truth.js";
import type { ColonyOperatorExecutionMode, ColonyOperatorRequestedAction } from "./colony-operator-entrypoint.js";
import {
  evaluateToolkitGuardrails,
  evaluateToolkitGuardrailsSync,
  type ToolkitGuardrailEvaluationInput,
  type ToolkitGuardrailEvaluationReport,
  type ToolkitGuardrailFinding,
  type ToolkitGuardrailStatus,
} from "./guardrails.js";
import type { MinimalActionType, ResolvedIntent } from "./intent-types.js";
import type { RuntimeCapabilityResult, WriteReadinessOptions } from "./readiness.js";
import { uniqueNonEmptyStrings } from "./unique-strings.js";

export type ToolkitActionAdmissibilityStatus =
  | "allowed"
  | "dry_run_only"
  | "explicit_execute_required"
  | "supervised"
  | "blocked"
  | "degraded"
  | "unsupported";

export type ToolkitActionAdmissibilityDecision =
  | "execute_now"
  | "plan_only"
  | "requires_explicit_execute"
  | "requires_supervision"
  | "blocked"
  | "degraded"
  | "unsupported";

export type ToolkitActionExecutionGate =
  | "none"
  | "dry_run_only"
  | "explicit_execute"
  | "supervision"
  | "blocked"
  | "degraded"
  | "unsupported";

export type ToolkitActionAdmissibilityReasonCode =
  | "action_family_missing"
  | "capability_unsupported"
  | "capability_blocked"
  | "guardrail_blocked"
  | "identity_supervision_required"
  | "explicit_execute_required"
  | "capability_lifecycle_pending"
  | "capability_degraded"
  | "dry_run_only"
  | "admissible";

export interface ToolkitActionAdmissibilityManifest {
  generatedAt: string;
  source: "omniweb-toolkit";
  authority: "toolkit-runtime";
  statusVocabulary: ToolkitActionAdmissibilityStatus[];
  decisionVocabulary: ToolkitActionAdmissibilityDecision[];
  executionGateVocabulary: ToolkitActionExecutionGate[];
  reasonCodeVocabulary: ToolkitActionAdmissibilityReasonCode[];
  runtimeTruth: {
    capabilityManifestField: "toolkitCapabilityManifest";
    actionTruthField: "capabilityTruth.actions";
    guardrailEvaluationField: "guardrailEvaluation";
    admissibilityField: "admissibility";
  };
  decisionPrecedence: ToolkitActionAdmissibilityStatus[];
  coverage: {
    consumesCapabilityTruth: true;
    consumesGuardrailTruth: true;
    consumesResolvedIntent: true;
    consumesRequestedAction: true;
  };
}

export interface ToolkitActionAdmissibilityInput extends WriteReadinessOptions {
  now?: Date;
  mode?: ColonyOperatorExecutionMode;
  explicitExecute?: boolean;
  actionFamily?: ColonyOperatorActionFamily | string;
  actionTruth?: ColonyOperatorActionTruth;
  requestedAction?: ColonyOperatorRequestedAction;
  resolution?: ResolvedIntent;
  runtimeCapabilities?: RuntimeCapabilityResult;
  capabilityTruth?: ColonyOperatorCapabilityTruth;
  toolkitCapabilityManifest?: ToolkitCapabilityManifest;
  guardrailEvaluation?: ToolkitGuardrailEvaluationReport;
  guardrails?: Omit<ToolkitGuardrailEvaluationInput, "now" | "mode" | "explicitExecute" | "actionFamily" | "actionTruth" | "requestedAction" | "resolution" | "runtimeCapabilities" | "toolkitCapabilityManifest">;
}

export interface ToolkitActionAdmissibilityReport {
  generatedAt: string;
  source: "omniweb-toolkit";
  authority: "toolkit-runtime";
  actionFamily: string | null;
  actionType: MinimalActionType | null;
  status: ToolkitActionAdmissibilityStatus;
  decision: ToolkitActionAdmissibilityDecision;
  executionGate: ToolkitActionExecutionGate;
  canPlan: boolean;
  canExecuteNow: boolean;
  explicitExecute: boolean;
  mode: ColonyOperatorExecutionMode;
  capability: {
    actionTruthStatus: ColonyOperatorActionTruth["status"] | ResolvedIntent["status"] | "missing";
    lifecycleStatus: ColonyOperatorActionTruth["lifecycleStatus"] | null;
    capabilityId: string | null;
    capabilityStatus: ToolkitCapabilityStatus | "missing";
    proofTier: ToolkitCapabilityManifestEntry["proofTier"] | ColonyOperatorActionTruth["proofLevel"] | null;
    requiresExplicitExecute: boolean;
    requiresSupervision: boolean;
    spendsDem: boolean;
    writesLifecycleRecord: boolean;
  };
  guardrails: {
    status: ToolkitGuardrailStatus;
    blockedReasonCodes: string[];
    supervisedRequirements: string[];
    degradedReasonCodes: string[];
    findings: ToolkitActionAdmissibilityGuardrailFinding[];
  };
  reasonCodes: string[];
  supervisedRequirements: string[];
  degradedReasonCodes: string[];
}

export type ToolkitActionAdmissibilityGuardrailFinding = Pick<
  ToolkitGuardrailFinding,
  "code" | "domain" | "severity" | "status" | "message" | "source" | "evidence" | "sanitizedValue"
>;

const STATUS_VOCABULARY: ToolkitActionAdmissibilityStatus[] = [
  "allowed",
  "dry_run_only",
  "explicit_execute_required",
  "supervised",
  "blocked",
  "degraded",
  "unsupported",
];

const DECISION_VOCABULARY: ToolkitActionAdmissibilityDecision[] = [
  "execute_now",
  "plan_only",
  "requires_explicit_execute",
  "requires_supervision",
  "blocked",
  "degraded",
  "unsupported",
];

const EXECUTION_GATE_VOCABULARY: ToolkitActionExecutionGate[] = [
  "none",
  "dry_run_only",
  "explicit_execute",
  "supervision",
  "blocked",
  "degraded",
  "unsupported",
];

const REASON_CODE_VOCABULARY: ToolkitActionAdmissibilityReasonCode[] = [
  "action_family_missing",
  "capability_unsupported",
  "capability_blocked",
  "guardrail_blocked",
  "identity_supervision_required",
  "explicit_execute_required",
  "capability_lifecycle_pending",
  "capability_degraded",
  "dry_run_only",
  "admissible",
];

const AUTHORIZATION_GUARDRAIL_CODES = new Set([
  "explicit_execute_required_for_spend",
  "explicit_execute_required_for_write",
]);

const ACTION_FAMILY_CAPABILITY_IDS: Record<ColonyOperatorActionFamily, string | null> = {
  skip: null,
  publish: "colony.publish",
  reply: "colony.reply",
  react: "colony.react",
  tip: "colony.tip",
  VOTE: "colony.publish-vote",
  "bet-fixed": "colony.bet-fixed",
  "bet-hl": "colony.bet-higher-lower",
  register: "colony.identity",
  "human-link": "colony.identity",
};

export function buildToolkitActionAdmissibilityManifest(
  opts: { now?: Date } = {},
): ToolkitActionAdmissibilityManifest {
  return {
    generatedAt: (opts.now ?? new Date()).toISOString(),
    source: "omniweb-toolkit",
    authority: "toolkit-runtime",
    statusVocabulary: [...STATUS_VOCABULARY],
    decisionVocabulary: [...DECISION_VOCABULARY],
    executionGateVocabulary: [...EXECUTION_GATE_VOCABULARY],
    reasonCodeVocabulary: [...REASON_CODE_VOCABULARY],
    runtimeTruth: {
      capabilityManifestField: "toolkitCapabilityManifest",
      actionTruthField: "capabilityTruth.actions",
      guardrailEvaluationField: "guardrailEvaluation",
      admissibilityField: "admissibility",
    },
    decisionPrecedence: [
      "unsupported",
      "blocked",
      "supervised",
      "explicit_execute_required",
      "degraded",
      "dry_run_only",
      "allowed",
    ],
    coverage: {
      consumesCapabilityTruth: true,
      consumesGuardrailTruth: true,
      consumesResolvedIntent: true,
      consumesRequestedAction: true,
    },
  };
}

export async function evaluateToolkitActionAdmissibility(
  input: ToolkitActionAdmissibilityInput = {},
): Promise<ToolkitActionAdmissibilityReport> {
  const context = buildAdmissibilityContext(input);
  const guardrailEvaluation = input.guardrailEvaluation ?? await evaluateToolkitGuardrails(buildGuardrailInput(input, context));
  return finalizeAdmissibility(input, context, guardrailEvaluation);
}

export function evaluateToolkitActionAdmissibilitySync(
  input: ToolkitActionAdmissibilityInput = {},
): ToolkitActionAdmissibilityReport {
  const context = buildAdmissibilityContext(input);
  const guardrailEvaluation = input.guardrailEvaluation ?? evaluateToolkitGuardrailsSync(buildGuardrailInput(input, context));
  return finalizeAdmissibility(input, context, guardrailEvaluation);
}

function buildAdmissibilityContext(input: ToolkitActionAdmissibilityInput): {
  mode: ColonyOperatorExecutionMode;
  explicitExecute: boolean;
  actionFamily: string | null;
  actionType: MinimalActionType | null;
  actionTruth: ColonyOperatorActionTruth | undefined;
  capabilityEntry: ToolkitCapabilityManifestEntry | undefined;
} {
  const mode = input.mode ?? (input.explicitExecute === true ? "execute" : "dry-run");
  const explicitExecute = input.explicitExecute === true || mode === "execute";
  const actionFamily = normalizeActionFamily(input.actionFamily)
    ?? input.actionTruth?.actionFamily
    ?? normalizeActionFamily(input.requestedAction?.actionFamily)
    ?? actionFamilyForResolvedIntent(input.resolution);
  const capabilityTruth = input.capabilityTruth ?? (
    actionFamily && !input.resolution
      ? buildColonyOperatorCapabilityTruth(input)
      : undefined
  );
  const actionTruth = input.actionTruth
    ?? capabilityTruth?.actions.find((action) => action.actionFamily === actionFamily);
  const capabilityManifest = input.toolkitCapabilityManifest ?? (
    actionFamily && !input.resolution && !input.actionTruth && !input.capabilityTruth
      ? buildToolkitCapabilityManifest(input)
      : undefined
  );
  const capabilityId = actionFamily ? ACTION_FAMILY_CAPABILITY_IDS[actionFamily as ColonyOperatorActionFamily] : null;
  const capabilityEntry = capabilityId
    ? capabilityManifest?.capabilities.find((capability) => capability.id === capabilityId)
    : undefined;
  const intentActionType = actionTruth?.intent.actionType;
  return {
    mode,
    explicitExecute,
    actionFamily: actionFamily ?? null,
    actionType: input.resolution?.actionType ?? (isMinimalActionType(intentActionType) ? intentActionType : null),
    actionTruth,
    capabilityEntry,
  };
}

function buildGuardrailInput(
  input: ToolkitActionAdmissibilityInput,
  context: ReturnType<typeof buildAdmissibilityContext>,
): ToolkitGuardrailEvaluationInput {
  return {
    ...(input.guardrails ?? {}),
    now: input.now,
    mode: context.mode,
    explicitExecute: context.explicitExecute,
    actionFamily: context.actionFamily ?? undefined,
    actionTruth: context.actionTruth,
    requestedAction: input.requestedAction,
    resolution: input.resolution,
    runtimeCapabilities: input.runtimeCapabilities,
    toolkitCapabilityManifest: input.toolkitCapabilityManifest,
  };
}

function finalizeAdmissibility(
  input: ToolkitActionAdmissibilityInput,
  context: ReturnType<typeof buildAdmissibilityContext>,
  guardrailEvaluation: ToolkitGuardrailEvaluationReport,
): ToolkitActionAdmissibilityReport {
  const actionTruthStatus = context.actionTruth?.status ?? input.resolution?.status ?? "missing";
  const capabilityStatus = context.capabilityEntry?.status
    ?? statusFromActionTruth(context.actionTruth)
    ?? statusFromResolution(input.resolution);
  const requiresExplicitExecute = context.actionTruth?.requiresExplicitExecute
    ?? context.capabilityEntry?.requirements.explicitExecute
    ?? requiresExplicitExecuteForResolution(input.resolution);
  const spendsDem = context.actionTruth?.spendsDem
    ?? context.capabilityEntry?.requirements.spend
    ?? actionSpendsDem(input.resolution?.actionType);
  const writesLifecycleRecord = context.actionTruth?.writesLifecycleRecord
    ?? context.capabilityEntry?.lifecycle.writesLifecycleRecord
    ?? false;
  const requiresSupervision = context.actionTruth?.status === "supervised"
    || isIdentityMutation(context.actionFamily)
    || guardrailEvaluation.status === "supervised";
  const hardGuardrailBlocks = guardrailEvaluation.blockedReasonCodes
    .filter((code) => !AUTHORIZATION_GUARDRAIL_CODES.has(code));

  let status: ToolkitActionAdmissibilityStatus;
  let reasonCode: ToolkitActionAdmissibilityReasonCode;
  if (!context.actionFamily || actionTruthStatus === "unsupported" || capabilityStatus === "unsupported") {
    status = "unsupported";
    reasonCode = context.actionFamily ? "capability_unsupported" : "action_family_missing";
  } else if (actionTruthStatus === "blocked" || capabilityStatus === "blocked") {
    status = "blocked";
    reasonCode = "capability_blocked";
  } else if (hardGuardrailBlocks.length > 0) {
    status = "blocked";
    reasonCode = "guardrail_blocked";
  } else if (requiresSupervision) {
    status = "supervised";
    reasonCode = "identity_supervision_required";
  } else if ((requiresExplicitExecute || spendsDem || context.capabilityEntry?.requirements.write === true) && !context.explicitExecute) {
    status = "explicit_execute_required";
    reasonCode = "explicit_execute_required";
  } else if (actionTruthStatus === "lifecycle-pending" || capabilityStatus === "pending") {
    status = "degraded";
    reasonCode = "capability_lifecycle_pending";
  } else if (actionTruthStatus === "degraded" || capabilityStatus === "degraded" || guardrailEvaluation.status === "degraded") {
    status = "degraded";
    reasonCode = "capability_degraded";
  } else if (context.mode === "dry-run") {
    status = "dry_run_only";
    reasonCode = "dry_run_only";
  } else {
    status = "allowed";
    reasonCode = "admissible";
  }

  const reasonCodes = uniqueNonEmptyStrings([
    reasonCode,
    ...(context.actionTruth?.reasonCodes ?? []),
    ...(input.resolution?.reasonCodes ?? []),
    ...guardrailEvaluation.blockedReasonCodes,
  ]);
  const supervisedRequirements = uniqueNonEmptyStrings([
    ...guardrailEvaluation.supervisedRequirements,
    ...(status === "supervised" ? ["identity_supervision_required"] : []),
  ]);
  const degradedReasonCodes = uniqueNonEmptyStrings([
    ...guardrailEvaluation.degradedReasonCodes,
    ...(status === "degraded" ? [reasonCode] : []),
  ]);

  return {
    generatedAt: (input.now ?? new Date()).toISOString(),
    source: "omniweb-toolkit",
    authority: "toolkit-runtime",
    actionFamily: context.actionFamily,
    actionType: context.actionType,
    status,
    decision: decisionForStatus(status),
    executionGate: executionGateForStatus(status),
    canPlan: status !== "unsupported" && status !== "blocked",
    canExecuteNow: status === "allowed",
    explicitExecute: context.explicitExecute,
    mode: context.mode,
    capability: {
      actionTruthStatus,
      lifecycleStatus: context.actionTruth?.lifecycleStatus ?? null,
      capabilityId: context.actionFamily ? ACTION_FAMILY_CAPABILITY_IDS[context.actionFamily as ColonyOperatorActionFamily] ?? null : null,
      capabilityStatus,
      proofTier: context.capabilityEntry?.proofTier ?? context.actionTruth?.proofLevel ?? null,
      requiresExplicitExecute,
      requiresSupervision,
      spendsDem,
      writesLifecycleRecord,
    },
    guardrails: {
      status: guardrailEvaluation.status,
      blockedReasonCodes: [...guardrailEvaluation.blockedReasonCodes],
      supervisedRequirements: [...guardrailEvaluation.supervisedRequirements],
      degradedReasonCodes: [...guardrailEvaluation.degradedReasonCodes],
      findings: guardrailEvaluation.findings.map(sanitizeGuardrailFinding),
    },
    reasonCodes,
    supervisedRequirements,
    degradedReasonCodes,
  };
}

function decisionForStatus(status: ToolkitActionAdmissibilityStatus): ToolkitActionAdmissibilityDecision {
  if (status === "allowed") return "execute_now";
  if (status === "dry_run_only") return "plan_only";
  if (status === "explicit_execute_required") return "requires_explicit_execute";
  if (status === "supervised") return "requires_supervision";
  if (status === "degraded") return "degraded";
  if (status === "unsupported") return "unsupported";
  return "blocked";
}

function executionGateForStatus(status: ToolkitActionAdmissibilityStatus): ToolkitActionExecutionGate {
  if (status === "allowed") return "none";
  if (status === "explicit_execute_required") return "explicit_execute";
  if (status === "supervised") return "supervision";
  if (status === "unsupported") return "unsupported";
  return status;
}

function sanitizeGuardrailFinding(finding: ToolkitGuardrailFinding): ToolkitActionAdmissibilityGuardrailFinding {
  return {
    code: finding.code,
    domain: finding.domain,
    severity: finding.severity,
    status: finding.status,
    message: finding.message,
    source: finding.source,
    evidence: finding.evidence,
    sanitizedValue: finding.sanitizedValue,
  };
}

function statusFromResolution(resolution: ResolvedIntent | undefined): ToolkitCapabilityStatus | "missing" {
  if (!resolution) return "missing";
  if (resolution.status === "executable") return "available";
  if (resolution.status === "supervised") return "supervised";
  if (resolution.status === "unsupported") return "unsupported";
  return "blocked";
}

function statusFromActionTruth(actionTruth: ColonyOperatorActionTruth | undefined): ToolkitCapabilityStatus | undefined {
  if (!actionTruth) return undefined;
  if (actionTruth.status === "executable") return "available";
  if (actionTruth.status === "lifecycle-pending") return "pending";
  if (actionTruth.status === "supervised") return "supervised";
  if (actionTruth.status === "degraded") return "degraded";
  if (actionTruth.status === "unsupported") return "unsupported";
  return "blocked";
}

function requiresExplicitExecuteForResolution(resolution: ResolvedIntent | undefined): boolean {
  if (!resolution) return false;
  return resolution.capability?.requiresWallet === true || actionSpendsDem(resolution.actionType);
}

function actionFamilyForResolvedIntent(resolution: ResolvedIntent | undefined): ColonyOperatorActionFamily | null {
  if (!resolution) return null;
  if (resolution.actionType === "bet") {
    return resolution.normalizedDraft.marketKind === "higher_lower" ? "bet-hl" : "bet-fixed";
  }
  return normalizeActionFamily(resolution.actionType);
}

function normalizeActionFamily(value: string | undefined): ColonyOperatorActionFamily | null {
  if (
    value === "skip"
    || value === "publish"
    || value === "reply"
    || value === "react"
    || value === "tip"
    || value === "VOTE"
    || value === "bet-fixed"
    || value === "bet-hl"
    || value === "register"
    || value === "human-link"
  ) {
    return value;
  }
  return null;
}

function isIdentityMutation(actionFamily: string | null): boolean {
  return actionFamily === "register" || actionFamily === "human-link";
}

function actionSpendsDem(actionType: MinimalActionType | undefined): boolean {
  return actionType === "publish" || actionType === "reply" || actionType === "tip" || actionType === "bet";
}

function isMinimalActionType(value: string | undefined): value is MinimalActionType {
  return value === "publish" || value === "reply" || value === "react" || value === "tip" || value === "bet";
}
