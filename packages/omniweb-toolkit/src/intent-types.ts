import type { ReactionType } from "../../../src/toolkit/types.js";
import type { RuntimeActionCapability, RuntimeActionFamily } from "./readiness.js";

export type MinimalActionType = RuntimeActionFamily;

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

interface ResolvedIntentBase {
  status: ResolvedIntentStatus;
  actionType: MinimalActionType;
  normalizedTarget: ResolvedIntentTarget;
  normalizedDraft: ResolvedIntentDraft;
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
