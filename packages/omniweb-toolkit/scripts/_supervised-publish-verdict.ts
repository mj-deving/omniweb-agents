export interface SupervisedVerdictPolicy {
  category: string;
  immediateLabel: string;
  followUpLabel: string;
  followUpEarliestMs: number;
  followUpLatestMs: number;
}

export interface ScheduledSupervisedVerdict extends SupervisedVerdictPolicy {
  publishedAt: string;
  followUpEarliestAt: string;
  followUpLatestAt: string;
}

export interface SupervisedVerdictWindowStatus {
  status: "too_early" | "due" | "overdue";
  ageMs: number;
  remainingUntilDueMs: number;
  overdueByMs: number;
}

const ANALYSIS_POLICY: SupervisedVerdictPolicy = {
  category: "ANALYSIS",
  immediateLabel: "Immediate post-index snapshot only; not the final supervised verdict.",
  followUpLabel: "Two-hour delayed verdict window for supervised ANALYSIS publishes.",
  followUpEarliestMs: 2 * 60 * 60 * 1000,
  followUpLatestMs: 2 * 60 * 60 * 1000,
};

const PREDICTION_POLICY: SupervisedVerdictPolicy = {
  category: "PREDICTION",
  immediateLabel: "Immediate post-index snapshot only; PREDICTION needs a longer supervised window.",
  followUpLabel: "Four-to-six-hour delayed verdict window for supervised PREDICTION publishes.",
  followUpEarliestMs: 4 * 60 * 60 * 1000,
  followUpLatestMs: 6 * 60 * 60 * 1000,
};

const DEFAULT_POLICY: SupervisedVerdictPolicy = ANALYSIS_POLICY;

export function getSupervisedVerdictPolicy(category: string | null | undefined): SupervisedVerdictPolicy {
  const normalized = String(category ?? "").trim().toUpperCase();
  if (normalized === "PREDICTION") {
    return PREDICTION_POLICY;
  }
  if (normalized === "ANALYSIS") {
    return ANALYSIS_POLICY;
  }
  return {
    ...DEFAULT_POLICY,
    category: normalized || DEFAULT_POLICY.category,
  };
}

export function scheduleSupervisedVerdict(
  category: string | null | undefined,
  publishedAt: string | Date,
): ScheduledSupervisedVerdict {
  const policy = getSupervisedVerdictPolicy(category);
  const publishedDate = publishedAt instanceof Date ? publishedAt : new Date(publishedAt);
  if (Number.isNaN(publishedDate.getTime())) {
    throw new Error(`Invalid publishedAt value: ${String(publishedAt)}`);
  }

  return {
    ...policy,
    publishedAt: publishedDate.toISOString(),
    followUpEarliestAt: new Date(publishedDate.getTime() + policy.followUpEarliestMs).toISOString(),
    followUpLatestAt: new Date(publishedDate.getTime() + policy.followUpLatestMs).toISOString(),
  };
}

export function evaluateSupervisedVerdictWindow(
  category: string | null | undefined,
  publishedAt: string | Date,
  observedAt: string | Date,
): SupervisedVerdictWindowStatus {
  const schedule = scheduleSupervisedVerdict(category, publishedAt);
  const publishedDate = new Date(schedule.publishedAt);
  const observedDate = observedAt instanceof Date ? observedAt : new Date(observedAt);
  if (Number.isNaN(observedDate.getTime())) {
    throw new Error(`Invalid observedAt value: ${String(observedAt)}`);
  }

  const ageMs = observedDate.getTime() - publishedDate.getTime();
  const remainingUntilDueMs = Math.max(0, schedule.followUpEarliestMs - ageMs);
  const overdueByMs = Math.max(0, ageMs - schedule.followUpLatestMs);

  if (ageMs < schedule.followUpEarliestMs) {
    return {
      status: "too_early",
      ageMs,
      remainingUntilDueMs,
      overdueByMs: 0,
    };
  }

  if (ageMs > schedule.followUpLatestMs) {
    return {
      status: "overdue",
      ageMs,
      remainingUntilDueMs: 0,
      overdueByMs,
    };
  }

  return {
    status: "due",
    ageMs,
    remainingUntilDueMs: 0,
    overdueByMs: 0,
  };
}

export interface SupervisedReactionEnvelope {
  agree: number;
  disagree: number;
  flag: number;
}

export interface SupervisedVerdictMetrics {
  score: number | null;
  replyCount: number | null;
  reactions: SupervisedReactionEnvelope;
  reactionTotal: number;
}

export function extractSupervisedVerdictMetrics(post: unknown): SupervisedVerdictMetrics {
  const record = post && typeof post === "object" ? post as Record<string, unknown> : {};
  const score = readNumber(record.score);
  const replyCount = readNumber(record.replyCount ?? record.reply_count);
  const reactions = readReactionCounts(record);

  return {
    score,
    replyCount,
    reactions,
    reactionTotal: reactions.agree + reactions.disagree + reactions.flag,
  };
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readReactionCounts(record: Record<string, unknown>): SupervisedReactionEnvelope {
  const reactions = record.reactions;
  const payloadReactions = (record.payload as { reactions?: unknown } | undefined)?.reactions;
  const source = reactions && typeof reactions === "object"
    ? reactions as Record<string, unknown>
    : payloadReactions && typeof payloadReactions === "object"
      ? payloadReactions as Record<string, unknown>
      : {};

  return {
    agree: readNumber(source.agree) ?? 0,
    disagree: readNumber(source.disagree) ?? 0,
    flag: readNumber(source.flag) ?? 0,
  };
}
