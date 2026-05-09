import { describeRuntimeCapabilities } from "./readiness.js";
import type { RuntimeActionCapability, RuntimeCapabilityResult, WriteReadinessOptions } from "./readiness.js";
import type {
  ExecutableIntent,
  MinimalActionIntent,
  MinimalActionReadiness,
  PolicyActionRequest,
  PolicyEvidenceStrength,
  ResolvedEvidencePlan,
  ResolvedIntent,
} from "./intent-types.js";
import type {
  ActionIntentDecision,
  MinimalAgentState,
  MinimalObserveResult,
} from "./minimal-agent.js";

function hasMeaningfulValue(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function compactObject<T extends Record<string, unknown>>(value: T): T | undefined {
  return Object.values(value).some(hasMeaningfulValue) ? value : undefined;
}

function normalizePolicyAudit(
  audit: ActionIntentDecision["audit"] | undefined,
): PolicyActionRequest["audit"] | undefined {
  if (!audit) return undefined;
  return compactObject({
    policyId: audit.policyId,
    routeId: audit.routeId,
    matchedConditions: audit.matchedConditions?.length
      ? [...audit.matchedConditions]
      : audit.notes?.length
        ? [...audit.notes]
        : undefined,
    observedInputs: audit.inputs ? Object.keys(audit.inputs) : undefined,
  });
}

function buildPolicyActionRequest(action: MinimalActionIntent, audit?: PolicyActionRequest["audit"]): PolicyActionRequest {
  const target = compactObject({
    postTxHash: action.targetTxHash,
    parentTxHash: action.parentTxHash,
    marketId: action.marketId,
    asset: action.asset,
  });
  const draft = compactObject({
    category: action.category,
    text: action.text,
    reaction: action.reaction,
    amount: action.amount,
    confidence: action.confidence,
    tags: action.tags,
  });
  const evidenceRequest = compactObject({
    primary: action.attestUrl,
    strength: action.attestUrl ? "inherit" as const : undefined,
  });

  return {
    actionType: action.type,
    ...(target ? { target } : {}),
    ...(draft ? { draft } : {}),
    ...(evidenceRequest ? { evidenceRequest } : {}),
    ...(audit ? { audit } : {}),
  };
}

function deriveDefaultReadiness(request: PolicyActionRequest): MinimalActionReadiness | undefined {
  switch (request.actionType) {
    case "publish":
      return { requiresWallet: true, requiresAttestation: true };
    case "reply":
      return { requiresWallet: true, requiresAttestation: true, requiresTargetPost: true };
    case "react":
      return { requiresWallet: true, requiresTargetPost: true };
    case "tip":
      return { requiresWallet: true, requiresTargetPost: true };
    case "bet":
      return { requiresWallet: true, requiresMarketContext: true };
    default:
      return undefined;
  }
}

function mergeReadiness(
  base: MinimalActionReadiness | undefined,
  override: MinimalActionReadiness | undefined,
): MinimalActionReadiness | undefined {
  return compactObject({
    requiresWallet: override?.requiresWallet ?? base?.requiresWallet,
    requiresAttestation: override?.requiresAttestation ?? base?.requiresAttestation,
    requiresTargetPost: override?.requiresTargetPost ?? base?.requiresTargetPost,
    requiresMarketContext: override?.requiresMarketContext ?? base?.requiresMarketContext,
  });
}

function resolveEvidenceMechanism(
  strength: PolicyEvidenceStrength | undefined,
): ResolvedEvidencePlan["mechanism"] | undefined {
  if (strength === "none" || strength === "dahr" || strength === "tlsn") {
    return strength;
  }
  return undefined;
}

function buildResolvedEvidencePlan(request: PolicyActionRequest): ResolvedEvidencePlan | undefined {
  return compactObject({
    primary: request.evidenceRequest?.primary,
    supporting: request.evidenceRequest?.supporting?.length
      ? [...request.evidenceRequest.supporting]
      : undefined,
    mechanism: resolveEvidenceMechanism(request.evidenceRequest?.strength),
  });
}

function normalizePolicyActionRequestToActionIntent(
  request: PolicyActionRequest,
): MinimalActionIntent | null {
  if (request.actionType === "skip") {
    return null;
  }

  return {
    type: request.actionType,
    category: request.draft?.category,
    text: request.draft?.text,
    attestUrl: request.evidenceRequest?.primary,
    tags: request.draft?.tags,
    confidence: request.draft?.confidence,
    parentTxHash: request.target?.parentTxHash,
    targetTxHash: request.target?.postTxHash,
    reaction: request.draft?.reaction,
    amount: request.draft?.amount,
    marketId: request.target?.marketId,
    asset: request.target?.asset,
  };
}

export function normalizeDecisionToPolicyActionRequest<TState extends MinimalAgentState = MinimalAgentState>(
  decision: MinimalObserveResult<TState>,
): PolicyActionRequest {
  const audit = normalizePolicyAudit(decision.audit);

  if (decision.kind === "skip") {
    return {
      actionType: "skip",
      ...(audit ? { audit } : {}),
    };
  }

  if (decision.kind === "action") {
    return buildPolicyActionRequest(decision.action, audit);
  }

  if (decision.kind === "react") {
    return {
      actionType: "react",
      target: {
        postTxHash: decision.targetTxHash,
      },
      draft: {
        reaction: decision.reaction,
      },
      ...(audit ? { audit } : {}),
    };
  }

  if (decision.kind === "publish") {
    return {
      actionType: "publish",
      draft: {
        category: decision.category,
        text: decision.text,
        tags: decision.tags,
        confidence: decision.confidence,
      },
      evidenceRequest: {
        primary: decision.attestUrl,
        strength: "inherit",
      },
      ...(audit ? { audit } : {}),
    };
  }

  return {
    actionType: "reply",
    target: {
      parentTxHash: decision.parentTxHash,
    },
    draft: {
      category: decision.category,
      text: decision.text,
    },
    evidenceRequest: {
      primary: decision.attestUrl,
      strength: "inherit",
    },
    ...(audit ? { audit } : {}),
  };
}

export function normalizeDecisionToActionIntent<TState extends MinimalAgentState = MinimalAgentState>(
  decision: MinimalObserveResult<TState>,
): ActionIntentDecision<TState> | null {
  if (decision.kind === "skip") return null;

  if (decision.kind === "action") {
    return decision;
  }

  const request = normalizeDecisionToPolicyActionRequest(decision);
  const action = normalizePolicyActionRequestToActionIntent(request);
  if (!action) {
    return null;
  }

  return {
    kind: "action",
    action,
    facts: decision.facts,
    audit: decision.audit,
    attestationPlan: decision.attestationPlan,
    nextState: decision.nextState,
    readiness: deriveDefaultReadiness(request),
  };
}

function normalizeActionIntentToResolvedIntent(
  action: MinimalActionIntent,
  readiness?: MinimalActionReadiness,
  capability?: RuntimeActionCapability,
  evidencePlan?: ResolvedEvidencePlan,
): ResolvedIntent {
  const normalizedTarget = {
    parentTxHash: action.parentTxHash,
    targetTxHash: action.targetTxHash,
    marketId: action.marketId,
    asset: action.asset,
  };
  const normalizedDraft = {
    category: action.category,
    text: action.text,
    attestUrl: action.attestUrl,
    tags: action.tags,
    confidence: action.confidence,
    reaction: action.reaction,
    amount: action.amount,
  };

  if (capability) {
    if (capability.readiness === "unsupported" || capability.executable === false) {
      return {
        status: "unsupported",
        actionType: action.type,
        normalizedTarget,
        normalizedDraft,
        evidencePlan,
        readiness,
        capability,
        reasonCodes: ["action_family_unsupported"],
        missingRequirements: [],
        executionPathFamily: "unsupported",
      };
    }

    if (capability.readiness !== "ready") {
      return {
        status: "blocked",
        actionType: action.type,
        normalizedTarget,
        normalizedDraft,
        evidencePlan,
        readiness,
        capability,
        reasonCodes: ["runtime_capability_blocked"],
        missingRequirements: capability.readiness === "missing_credentials"
          ? ["credentials"]
          : capability.readiness === "missing_dependencies"
            ? ["dependencies"]
            : [],
        executionPathFamily: capability.proofLevel === "architectural_placeholder"
          ? "unsupported"
          : action.type === "react"
            ? "reaction"
            : "direct_attested_write",
      };
    }
  }

  if (action.type === "tip" || action.type === "bet") {
    return {
      status: "unsupported",
      actionType: action.type,
      normalizedTarget,
      normalizedDraft,
      evidencePlan,
      readiness,
      reasonCodes: ["action_family_not_implemented"],
      missingRequirements: ["runtime_executor"],
      executionPathFamily: "unsupported",
    };
  }

  const executionPathFamily = action.type === "react"
    ? "reaction"
    : action.type === "publish" || action.type === "reply"
      ? "direct_attested_write"
      : "none";

  return {
    status: "executable",
    actionType: action.type,
    normalizedTarget,
    normalizedDraft,
    evidencePlan,
    readiness,
    capability: capability ?? {
      declared: true,
      executable: true,
      readiness: "ready",
      requiresWallet: readiness?.requiresWallet === true,
      requiresAttestation: readiness?.requiresAttestation === true,
      requiresTargetPost: readiness?.requiresTargetPost === true,
      requiresMarketContext: readiness?.requiresMarketContext === true,
      proofLevel: "real_runtime_action_family",
      notes: [],
    },
    reasonCodes: [],
    missingRequirements: [],
    executionPathFamily,
  } satisfies ExecutableIntent;
}

export interface ResolveActionRequestOptions extends WriteReadinessOptions {
  runtimeCapabilities?: RuntimeCapabilityResult;
  readiness?: MinimalActionReadiness;
}

export function resolveActionRequest(
  request: PolicyActionRequest,
  options: ResolveActionRequestOptions = {},
): ResolvedIntent | null {
  const action = normalizePolicyActionRequestToActionIntent(request);
  if (!action) {
    return null;
  }

  const readiness = mergeReadiness(deriveDefaultReadiness(request), options.readiness);
  const capability = options.runtimeCapabilities?.actionFamilies[action.type]
    ?? describeRuntimeCapabilities(options).actionFamilies[action.type];

  return normalizeActionIntentToResolvedIntent(action, readiness, capability, buildResolvedEvidencePlan(request));
}

export interface NormalizeDecisionToResolvedIntentOptions extends ResolveActionRequestOptions {}

export function normalizeDecisionToResolvedIntent<TState extends MinimalAgentState = MinimalAgentState>(
  decision: MinimalObserveResult<TState>,
  options: NormalizeDecisionToResolvedIntentOptions = {},
): ResolvedIntent | null {
  const request = normalizeDecisionToPolicyActionRequest(decision);
  return resolveActionRequest(request, {
    ...options,
    readiness: decision.kind === "action"
      ? mergeReadiness(options.readiness, decision.readiness)
      : options.readiness,
  });
}
