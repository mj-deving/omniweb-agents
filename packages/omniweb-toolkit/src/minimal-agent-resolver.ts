import { describeRuntimeCapabilities } from "./readiness.js";
import type { RuntimeActionCapability, RuntimeCapabilityResult, WriteReadinessOptions } from "./readiness.js";
import type {
  ExecutableIntent,
  MinimalActionIntent,
  MinimalActionReadiness,
  ResolvedIntent,
} from "./intent-types.js";
import type {
  ActionIntentDecision,
  MinimalAgentState,
  MinimalObserveResult,
} from "./minimal-agent.js";

export function normalizeDecisionToActionIntent<TState extends MinimalAgentState = MinimalAgentState>(
  decision: MinimalObserveResult<TState>,
): ActionIntentDecision<TState> | null {
  if (decision.kind === "skip") return null;

  if (decision.kind === "action") {
    return decision;
  }

  if (decision.kind === "react") {
    return {
      kind: "action",
      action: {
        type: "react",
        targetTxHash: decision.targetTxHash,
        reaction: decision.reaction,
      },
      facts: decision.facts,
      audit: decision.audit,
      attestationPlan: decision.attestationPlan,
      nextState: decision.nextState,
      readiness: {
        requiresWallet: true,
        requiresTargetPost: true,
      },
    };
  }

  if (decision.kind === "publish") {
    return {
      kind: "action",
      action: {
        type: "publish",
        category: decision.category,
        text: decision.text,
        attestUrl: decision.attestUrl,
        tags: decision.tags,
        confidence: decision.confidence,
      },
      facts: decision.facts,
      audit: decision.audit,
      attestationPlan: decision.attestationPlan,
      nextState: decision.nextState,
      readiness: {
        requiresWallet: true,
        requiresAttestation: true,
      },
    };
  }

  return {
    kind: "action",
    action: {
      type: "reply",
      parentTxHash: decision.parentTxHash,
      text: decision.text,
      attestUrl: decision.attestUrl,
      category: decision.category,
    },
    facts: decision.facts,
    audit: decision.audit,
    attestationPlan: decision.attestationPlan,
    nextState: decision.nextState,
    readiness: {
      requiresWallet: true,
      requiresAttestation: true,
      requiresTargetPost: true,
    },
  };
}

function normalizeActionIntentToResolvedIntent(
  action: MinimalActionIntent,
  readiness?: MinimalActionReadiness,
  capability?: RuntimeActionCapability,
): ResolvedIntent {
  const normalizedTarget = {
    parentTxHash: action.parentTxHash,
    targetTxHash: action.targetTxHash,
    marketId: action.marketId,
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
    readiness,
    reasonCodes: [],
    missingRequirements: [],
    executionPathFamily,
  } satisfies ExecutableIntent;
}

export interface NormalizeDecisionToResolvedIntentOptions extends WriteReadinessOptions {
  runtimeCapabilities?: RuntimeCapabilityResult;
}

export function normalizeDecisionToResolvedIntent<TState extends MinimalAgentState = MinimalAgentState>(
  decision: MinimalObserveResult<TState>,
  options: NormalizeDecisionToResolvedIntentOptions = {},
): ResolvedIntent | null {
  const actionDecision = normalizeDecisionToActionIntent(decision);
  if (!actionDecision) {
    return null;
  }

  const capability = options.runtimeCapabilities?.actionFamilies[actionDecision.action.type]
    ?? describeRuntimeCapabilities(options).actionFamilies[actionDecision.action.type];

  return normalizeActionIntentToResolvedIntent(actionDecision.action, actionDecision.readiness, capability);
}
