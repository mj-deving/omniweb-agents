import type { MinimalActionType } from "../intent-types.js";
import type {
  MinimalAgentState,
  MinimalAuditPayload,
  MinimalCycleContext,
  MinimalCycleRecord,
  MinimalCycleSummary,
  MinimalObserveResult,
  MinimalTipVerification,
} from "../minimal-agent.js";
import { getObservedScore } from "../minimal-agent-verifier.js";
import type { PublishVisibilityResult } from "../publish-visibility.js";

export function summarizeCycle<TState extends MinimalAgentState>(
  record: MinimalCycleRecord<TState>,
): MinimalCycleSummary {
  return summarizeCycleFields({
    cycle: {
      id: record.cycleId,
      iteration: record.iteration,
      startedAt: record.startedAt,
      stateDir: record.stateDir,
      sessionId: record.sessionId,
      sessionDir: record.sessionDir,
      dryRun: record.dryRun,
    },
    finishedAt: record.finishedAt,
    decision: record.decision,
    outcome: record.outcome,
  });
}

export function summarizeCycleFields<TState extends MinimalAgentState>(args: {
  cycle: MinimalCycleContext;
  finishedAt: string;
  decision: MinimalObserveResult<TState>;
  outcome: MinimalCycleRecord<TState>["outcome"];
}): MinimalCycleSummary {
  const publishVisibility = asPublishVisibilityResult(args.outcome.execution.verification);
  const tipVerification = asTipVerification(args.outcome.execution.verification);

  return {
    id: args.cycle.id,
    iteration: args.cycle.iteration,
    startedAt: args.cycle.startedAt,
    finishedAt: args.finishedAt,
    decisionKind: args.decision.kind,
    actionType: getDecisionActionType(args.decision),
    status: args.outcome.execution.status,
    txHash: args.outcome.execution.txHash,
    attestationTxHash: args.outcome.execution.attestationTxHash,
    attestationResponseHash: args.outcome.execution.attestationResponseHash,
    verificationPath: args.outcome.execution.verification?.verificationPath,
    visibilitySurface: publishVisibility?.visibilitySurface,
    visible: args.outcome.execution.verification?.visible,
    indexedVisible: args.outcome.execution.verification?.indexedVisible,
    postDetailVisible: publishVisibility?.postDetailVisible,
    chainVisible: publishVisibility?.chainVisible,
    tipConfirmationSurface: tipVerification?.tipConfirmationSurface,
    tipStatsConverged: tipVerification?.tipStatsConverged,
    recipientTipStatsConverged: tipVerification?.recipientTipStatsConverged,
    spendObserved: tipVerification?.spendObserved,
    observedScore: getObservedScore(args.outcome.execution.verification),
    errorStage: args.outcome.execution.error?.stage,
    errorMessage: args.outcome.execution.error?.message,
  };
}

export function renderCycleSummary<TState extends MinimalAgentState>(
  record: MinimalCycleRecord<TState>,
): string {
  const lines = [
    `# Cycle ${record.cycleId}`,
    "",
    `- Iteration: ${record.iteration}`,
    `- Started: ${record.startedAt}`,
    `- Finished: ${record.finishedAt}`,
    `- DurationMs: ${record.durationMs}`,
    `- DecisionKind: ${record.decision.kind}`,
    `- ActionType: ${getDecisionActionType(record.decision)}`,
    `- ResolutionStatus: ${record.outcome.resolution?.status ?? "none"}`,
    `- Outcome: ${record.outcome.execution.status}`,
    `- DryRun: ${record.dryRun}`,
  ];

  if (record.decision.kind === "skip") {
    lines.push(`- SkipReason: ${record.decision.reason}`);
  } else if (record.decision.kind === "action") {
    if (record.decision.action.type === "react") {
      if (record.decision.action.targetTxHash) {
        lines.push(`- TargetTxHash: ${record.decision.action.targetTxHash}`);
      }
      if (record.decision.action.reaction) {
        lines.push(`- Reaction: ${record.decision.action.reaction}`);
      }
    } else {
      if (record.decision.action.parentTxHash) {
        lines.push(`- ParentTxHash: ${record.decision.action.parentTxHash}`);
      }
      if (record.decision.action.targetTxHash) {
        lines.push(`- TargetTxHash: ${record.decision.action.targetTxHash}`);
      }
      if (typeof record.decision.action.amount === "number") {
        lines.push(`- Amount: ${record.decision.action.amount}`);
      }
      if (typeof record.decision.action.text === "string") {
        lines.push(`- Text: ${truncate(record.decision.action.text, 180)}`);
      }
      if (typeof record.decision.action.category === "string") {
        lines.push(`- Category: ${record.decision.action.category}`);
      }
    }
  } else if (record.decision.kind === "react") {
    lines.push(`- TargetTxHash: ${record.decision.targetTxHash}`);
    lines.push(`- Reaction: ${record.decision.reaction}`);
  } else {
    lines.push(`- Text: ${truncate(record.decision.text, 180)}`);
    if ("category" in record.decision && typeof record.decision.category === "string") {
      lines.push(`- Category: ${record.decision.category}`);
    }
  }

  if (record.outcome.execution.txHash) {
    lines.push(`- TxHash: ${record.outcome.execution.txHash}`);
  }

  if (record.outcome.execution.attestationTxHash) {
    lines.push(`- AttestationTxHash: ${record.outcome.execution.attestationTxHash}`);
  }

  if (record.outcome.execution.attestationResponseHash) {
    lines.push(`- AttestationResponseHash: ${record.outcome.execution.attestationResponseHash}`);
  }

  if (record.outcome.execution.verification) {
    const publishVisibility = asPublishVisibilityResult(record.outcome.execution.verification);
    const tipVerification = asTipVerification(record.outcome.execution.verification);
    lines.push(`- Visible: ${record.outcome.execution.verification.visible}`);
    lines.push(`- IndexedVisible: ${record.outcome.execution.verification.indexedVisible}`);
    if (publishVisibility) {
      lines.push(`- PostDetailVisible: ${publishVisibility.postDetailVisible}`);
      lines.push(`- ChainVisible: ${publishVisibility.chainVisible}`);
      lines.push(`- VisibilitySurface: ${publishVisibility.visibilitySurface}`);
    }
    if (tipVerification) {
      lines.push(`- TipConfirmationSurface: ${tipVerification.tipConfirmationSurface}`);
      lines.push(`- TipStatsConverged: ${tipVerification.tipStatsConverged}`);
      lines.push(`- RecipientTipStatsConverged: ${tipVerification.recipientTipStatsConverged}`);
      lines.push(`- BalanceSpendObserved: ${tipVerification.spendObserved}`);
    }
    lines.push(`- VerificationPath: ${record.outcome.execution.verification.verificationPath ?? "none"}`);
    lines.push(`- VerificationPolls: ${record.outcome.execution.verification.polls}`);
    const observedScore = getObservedScore(record.outcome.execution.verification);
    if (typeof observedScore === "number") {
      lines.push(`- ObservedScore: ${observedScore}`);
    }
    if (record.outcome.execution.verification.error) {
      lines.push(`- VerificationNote: ${record.outcome.execution.verification.error}`);
    }
  }

  if (record.outcome.execution.error) {
    lines.push(`- ErrorStage: ${record.outcome.execution.error.stage}`);
    lines.push(`- Error: ${record.outcome.execution.error.message}`);
  }

  if (record.outcome.resolution) {
    lines.push(`- ResolutionActionType: ${record.outcome.resolution.actionType}`);
    lines.push(`- ResolutionPath: ${record.outcome.resolution.executionPathFamily}`);
    if (record.outcome.resolution.reasonCodes.length > 0) {
      lines.push(`- ResolutionReasons: ${record.outcome.resolution.reasonCodes.join(", ")}`);
    }
    if (record.outcome.resolution.missingRequirements.length > 0) {
      lines.push(`- MissingRequirements: ${record.outcome.resolution.missingRequirements.join(", ")}`);
    }
  }

  const factKeys = Object.keys(record.decision.facts ?? {});
  if (factKeys.length > 0) {
    lines.push(`- FactKeys: ${factKeys.join(", ")}`);
  }

  if (record.decision.attestationPlan) {
    lines.push(
      `- AttestationPlan: ${record.decision.attestationPlan.ready ? "ready" : "blocked"} (${record.decision.attestationPlan.reason})`,
    );
  }

  const auditSections = collectAuditSections(record.decision.audit);
  if (auditSections.length > 0) {
    lines.push(`- AuditSections: ${auditSections.join(", ")}`);
  }

  const nextStateKeys = Object.keys(record.memoryAfter.state ?? {});
  if (nextStateKeys.length > 0) {
    lines.push(`- NextStateKeys: ${nextStateKeys.join(", ")}`);
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function getDecisionActionType<TState extends MinimalAgentState>(
  decision: MinimalObserveResult<TState>,
): MinimalActionType | "skip" {
  if (decision.kind === "skip") return "skip";
  if (decision.kind === "action") return decision.action.type;
  return decision.kind;
}

export function isCycleSummary(value: unknown): value is MinimalCycleSummary {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.iteration === "number"
    && typeof value.startedAt === "string"
    && typeof value.finishedAt === "string"
    && typeof value.decisionKind === "string"
    && typeof value.status === "string";
}

export function asPublishVisibilityResult(
  verification: MinimalCycleRecord["outcome"]["execution"]["verification"] | undefined,
): PublishVisibilityResult | undefined {
  if (!verification) {
    return undefined;
  }

  return "visibilitySurface" in verification ? verification as PublishVisibilityResult : undefined;
}

export function asTipVerification(
  verification: MinimalCycleRecord["outcome"]["execution"]["verification"] | undefined,
): MinimalTipVerification | undefined {
  if (!verification) {
    return undefined;
  }

  return "tipConfirmationSurface" in verification ? verification as MinimalTipVerification : undefined;
}

function truncate(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, limit - 3)}...`;
}

function collectAuditSections(audit: MinimalAuditPayload | undefined): string[] {
  if (!audit) return [];

  const sections: string[] = [];
  if (hasKeys(audit.inputs)) sections.push("inputs");
  if (hasKeys(audit.selectedEvidence)) sections.push("selectedEvidence");
  if (hasKeys(audit.promptPacket)) sections.push("promptPacket");
  if (Array.isArray(audit.notes) && audit.notes.length > 0) sections.push("notes");
  return sections;
}

function hasKeys(value: Record<string, unknown> | undefined): boolean {
  if (!value) return false;
  return Object.keys(value).length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
