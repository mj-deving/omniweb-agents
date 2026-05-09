import type { ReactionType } from "../../../src/toolkit/types.js";
import type { RuntimeActionCapability, RuntimeActionFamily } from "./readiness.js";

export type MinimalActionType = RuntimeActionFamily;
export type PolicyActionType = MinimalActionType | "skip";

export interface PolicyActionTarget {
  postTxHash?: string;
  parentTxHash?: string;
  marketId?: string;
  asset?: string;
}

export interface PolicyActionDraft {
  category?: string;
  text?: string;
  reaction?: Exclude<ReactionType, null>;
  amount?: number;
  confidence?: number;
  tags?: string[];
}

export type PolicyEvidenceStrength = "none" | "inherit" | "dahr" | "tlsn";

export interface PolicyEvidenceRequest {
  primary?: string;
  supporting?: string[];
  strength?: PolicyEvidenceStrength;
}

export interface PolicyActionAudit {
  policyId?: string;
  routeId?: string;
  matchedConditions?: string[];
  observedInputs?: string[];
}

export interface PolicyActionRequest {
  actionType: PolicyActionType;
  target?: PolicyActionTarget;
  draft?: PolicyActionDraft;
  evidenceRequest?: PolicyEvidenceRequest;
  audit?: PolicyActionAudit;
}

export interface MinimalActionIntent {
  type: MinimalActionType;
  category?: string;
  text?: string;
  attestUrl?: string;
  tags?: string[];
  confidence?: number;
  parentTxHash?: string;
  targetTxHash?: string;
  reaction?: Exclude<ReactionType, null>;
  amount?: number;
  marketId?: string;
  asset?: string;
}

export interface MinimalActionReadiness {
  requiresWallet?: boolean;
  requiresAttestation?: boolean;
  requiresTargetPost?: boolean;
  requiresMarketContext?: boolean;
}

export type ResolvedIntentStatus = "executable" | "blocked" | "supervised" | "unsupported";

export interface ResolvedIntentTarget {
  parentTxHash?: string;
  targetTxHash?: string;
  marketId?: string;
  asset?: string;
}

export interface ResolvedIntentDraft {
  category?: string;
  text?: string;
  attestUrl?: string;
  tags?: string[];
  confidence?: number;
  reaction?: Exclude<ReactionType, null>;
  amount?: number;
}

export type IntentExecutionPathFamily =
  | "direct_attested_write"
  | "reaction"
  | "market_write"
  | "manual_supervision"
  | "unsupported"
  | "none";

export interface ResolvedEvidencePlan {
  primary?: string;
  supporting?: string[];
  mechanism?: "none" | "dahr" | "tlsn";
}

interface ResolvedIntentBase {
  status: ResolvedIntentStatus;
  actionType: MinimalActionType;
  normalizedTarget: ResolvedIntentTarget;
  normalizedDraft: ResolvedIntentDraft;
  evidencePlan?: ResolvedEvidencePlan;
  readiness?: MinimalActionReadiness;
  capability?: RuntimeActionCapability;
  reasonCodes: string[];
  missingRequirements: string[];
  executionPathFamily: IntentExecutionPathFamily;
}

export interface ExecutableIntent extends ResolvedIntentBase {
  status: "executable";
  capability: RuntimeActionCapability;
}

export interface BlockedIntent extends ResolvedIntentBase {
  status: "blocked";
}

export interface SupervisedIntent extends ResolvedIntentBase {
  status: "supervised";
}

export interface UnsupportedIntent extends ResolvedIntentBase {
  status: "unsupported";
}

export type ResolvedIntent = ExecutableIntent | BlockedIntent | SupervisedIntent | UnsupportedIntent;

export type IntentExecutionStatus = "executed" | "skipped" | "failed";

export interface IntentExecutionResult {
  status: IntentExecutionStatus;
  actionType: MinimalActionType;
  txHash?: string;
  attestationTxHash?: string;
  attestationResponseHash?: string;
  verificationPath?: string;
  visible?: boolean;
  indexedVisible?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export interface IntentResultEnvelope {
  resolution: ResolvedIntent;
  execution: IntentExecutionResult;
}
