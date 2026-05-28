import type {
  MinimalAgentState,
  MinimalCycleRecord,
} from "../minimal-agent.js";
import {
  writeSessionLedgerJson,
} from "../session-ledger.js";
import {
  buildScorecardSummary,
  buildSessionResult,
} from "./session-results.js";

export async function persistSessionLedger<TState extends MinimalAgentState>(
  record: MinimalCycleRecord<TState>,
): Promise<void> {
  const inputs = {
    version: 1,
    session_id: record.sessionId,
    cycle_id: record.cycleId,
    started_at: record.startedAt,
    dry_run: record.dryRun,
    state_dir: record.stateDir,
    session_dir: record.sessionDir,
    previous_cycle: record.memoryBefore.lastCycle,
  };

  const actionType = record.decision.kind === "action"
    ? record.decision.action.type
    : record.decision.kind;

  const decisions = {
    version: 1,
    session_id: record.sessionId,
    kind: record.decision.kind,
    action_type: actionType,
    facts: record.decision.facts ?? {},
    attestation_plan: record.decision.attestationPlan ?? null,
    next_state_keys: Object.keys(record.memoryAfter.state ?? {}),
  };

  const action = {
    version: 1,
    session_id: record.sessionId,
    action: actionType,
    resolution: record.outcome.resolution,
    status: record.outcome.execution.status,
    tx_hash: record.outcome.execution.txHash ?? null,
    target_tx_hash: record.decision.kind === "react"
      ? record.decision.targetTxHash
      : record.decision.kind === "action" && record.decision.action.type === "react"
        ? record.decision.action.targetTxHash ?? null
        : null,
    dem_spent: record.outcome.execution.demSpendEstimate ?? 0,
    verification: record.outcome.execution.verification ?? null,
    error: record.outcome.execution.error ?? null,
  };

  await writeSessionLedgerJson(record.sessionDir, "inputs.json", inputs);
  await writeSessionLedgerJson(record.sessionDir, "decisions.json", decisions);
  await writeSessionLedgerJson(record.sessionDir, `actions/01-${actionType}.json`, action);
  const scorecardSummary = buildScorecardSummary(record);
  if (scorecardSummary) {
    await writeSessionLedgerJson(record.sessionDir, "scorecard.json", scorecardSummary);
  }
  await writeSessionLedgerJson(record.sessionDir, "result.json", buildSessionResult(record, scorecardSummary));
}
