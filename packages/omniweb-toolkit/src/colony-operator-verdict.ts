import type { ColonyOperatorActionFamily } from "./colony-operator-capability-truth.js";
import type {
  ColonyOperatorExecutionMode,
  ColonyOperatorFinalVerdict,
  ColonyOperatorLifecyclePlan,
  MinimalExecutionOutcome,
} from "./colony-operator-entrypoint-types.js";

export function buildFinalVerdict(args: {
  mode: ColonyOperatorExecutionMode;
  selectedFamily: ColonyOperatorActionFamily;
  execution: MinimalExecutionOutcome;
  lifecyclePlan: ColonyOperatorLifecyclePlan;
  liveExecutionAllowed: boolean;
}): ColonyOperatorFinalVerdict {
  if (args.mode === "dry-run") {
    return {
      verdict: "no-spend-proof",
      mode: args.mode,
      spendStatus: "no-spend",
      selectedActionFamily: args.selectedFamily,
      liveExecutionAttempted: false,
      liveExecutionAllowed: false,
      rationale: "dry-run emitted observed context, selected action, full action surface, and no-spend gates without executing a live write",
    };
  }

  const verification = args.execution.verification as Record<string, unknown> | undefined;
  const productVisible = verification?.visible === true;
  const liveExecutionAttempted = liveExecutionAttemptedFor(args.execution);
  if (!liveExecutionAttempted) {
    return {
      verdict: "no-spend-proof",
      mode: args.mode,
      spendStatus: "no-spend",
      selectedActionFamily: args.selectedFamily,
      liveExecutionAttempted: false,
      liveExecutionAllowed: args.liveExecutionAllowed,
      rationale: "execute mode produced no live action attempt because the selected action was skipped or gated before dispatch",
    };
  }

  const executionFailed = args.execution.status === "failed";
  const verdict: ColonyOperatorFinalVerdict["verdict"] = executionFailed
    ? "execution-failed"
    : productVisible && args.lifecyclePlan.status === "recorded"
      ? "execution-pass"
      : "execution-degraded";
  const spendStatus: ColonyOperatorFinalVerdict["spendStatus"] = executionFailed
    ? "unknown"
    : args.execution.demSpendEstimate && args.execution.demSpendEstimate > 0
      ? "executed"
      : "no-spend";

  return {
    verdict,
    mode: args.mode,
    spendStatus,
    selectedActionFamily: args.selectedFamily,
    liveExecutionAttempted,
    liveExecutionAllowed: args.liveExecutionAllowed,
    rationale: verdict === "execution-pass"
      ? "single selected action executed and product readback/lifecycle proof recorded"
      : verdict === "execution-degraded"
        ? "single selected action ran but product readback or lifecycle proof did not fully converge"
        : "single selected action failed before a complete product proof",
  };
}

function liveExecutionAttemptedFor(execution: MinimalExecutionOutcome): boolean {
  if (execution.status === "dry_run" || execution.status === "skipped") return false;
  if (execution.txHash || execution.attestationTxHash) return true;
  if (
    execution.status === "published"
    || execution.status === "replied"
    || execution.status === "reacted"
    || execution.status === "tipped"
    || execution.status === "market_written"
  ) {
    return true;
  }
  return execution.status === "failed" && execution.admissibility?.canExecuteNow === true;
}
