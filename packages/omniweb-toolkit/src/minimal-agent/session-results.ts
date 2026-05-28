import type {
  MinimalAgentState,
  MinimalCycleRecord,
} from "../minimal-agent.js";
import { getObservedScore } from "../minimal-agent-verifier.js";
import type { SessionLedgerResult } from "../session-ledger.js";
import {
  asPublishVisibilityResult,
  asTipVerification,
} from "./cycle-summary.js";

export function buildSessionResult<TState extends MinimalAgentState>(
  record: MinimalCycleRecord<TState>,
  scorecardSummary: Record<string, unknown> | null,
): SessionLedgerResult {
  const publishVisibility = asPublishVisibilityResult(record.outcome.execution.verification);
  const tipVerification = asTipVerification(record.outcome.execution.verification);

  return {
    version: 1,
    session_id: record.sessionId,
    started_at: record.startedAt,
    finished_at: record.finishedAt,
    status: record.outcome.execution.status,
    resolution_status: record.outcome.resolution?.status ?? null,
    actions_taken: [record.decision.kind],
    dem_spent: record.outcome.execution.demSpendEstimate ?? 0,
    scorecard_summary: scorecardSummary,
    stop_reasons: buildStopReasons(record),
    tx_hash: record.outcome.execution.txHash,
    indexed_visible: record.outcome.execution.verification?.indexedVisible,
    verification_path: record.outcome.execution.verification?.verificationPath ?? null,
    visibility_surface: publishVisibility?.visibilitySurface ?? null,
    post_detail_visible: publishVisibility?.postDetailVisible ?? null,
    chain_visible: publishVisibility?.chainVisible ?? null,
    tip_confirmation_surface: tipVerification?.tipConfirmationSurface ?? null,
    tip_stats_converged: tipVerification?.tipStatsConverged ?? null,
    recipient_tip_stats_converged: tipVerification?.recipientTipStatsConverged ?? null,
    balance_spend_observed: tipVerification?.spendObserved ?? null,
  };
}

export function buildScorecardSummary<TState extends MinimalAgentState>(
  record: MinimalCycleRecord<TState>,
): Record<string, unknown> | null {
  const verification = record.outcome.execution.verification;
  const publishVisibility = asPublishVisibilityResult(verification);
  const observedScore = getObservedScore(verification);
  if (typeof observedScore === "number") {
    return {
      observed_score: observedScore,
      indexed_visible: verification?.indexedVisible ?? false,
      verification_path: verification?.verificationPath ?? null,
      visibility_surface: publishVisibility?.visibilitySurface ?? null,
      post_detail_visible: publishVisibility?.postDetailVisible ?? null,
      chain_visible: publishVisibility?.chainVisible ?? null,
    };
  }

  return null;
}

export function buildStopReasons<TState extends MinimalAgentState>(
  record: MinimalCycleRecord<TState>,
): string[] {
  const reasons = new Set<string>();
  const errorMessage = record.outcome.execution.error?.message?.toLowerCase() ?? "";
  const capabilityReadiness = record.outcome.resolution?.capability?.readiness;

  if (record.decision.kind === "skip") {
    reasons.add(record.decision.reason);
  }
  if (
    capabilityReadiness === "missing_credentials"
    || errorMessage.includes("no credentials file")
    || errorMessage.includes("demos_mnemonic")
  ) {
    reasons.add("env_missing");
  }
  if (capabilityReadiness === "missing_dependencies") {
    reasons.add("missing_dependencies");
  }
  if (
    errorMessage.includes("timeout")
    || errorMessage.includes("fetch failed")
    || errorMessage.includes("request failed")
    || errorMessage.includes("network")
  ) {
    reasons.add("network_drift");
  }
  if (errorMessage.startsWith("placeholder_attest_url")) {
    reasons.add("placeholder_attest_url");
  }
  const verification = record.outcome.execution.verification;
  const publishVisibility = asPublishVisibilityResult(verification);
  const tipVerification = asTipVerification(verification);
  if (publishVisibility?.visible && !publishVisibility.indexedVisible) {
    reasons.add("indexer_lag");
  }
  if (tipVerification?.tipConfirmationSurface === "balance_spend") {
    reasons.add("tip_readback_fallback");
  }
  if (tipVerification?.tipConfirmationSurface === "none") {
    reasons.add("tip_readback_unconfirmed");
  }
  if (record.outcome.resolution?.status === "blocked") {
    reasons.add("runtime_capability_blocked");
  }
  if (record.outcome.resolution?.status === "unsupported") {
    reasons.add("action_family_unsupported");
  }

  return Array.from(reasons);
}
