import type { PublishVisibilityResult } from "../src/publish-visibility.ts";

export type PublishAttemptKind = "publish" | "reply";
export type PublishVisibilityOutcome =
  | "feed-indexed-recent"
  | "feed-indexed-category"
  | "post-detail-only"
  | "chain-only"
  | "unresolved-within-window";
export type PublishVisibilityResolution =
  | "immediate-recent"
  | "delayed-recent"
  | "category-follow-up"
  | "post-detail-only"
  | "chain-only"
  | "unresolved-within-window";

export interface PublishAttemptLike {
  kind: PublishAttemptKind;
  accepted: boolean;
  visibility?: PublishVisibilityResult;
}

export interface PublishVisibilityOutcomeSummary {
  outcome: PublishVisibilityOutcome;
  resolution: PublishVisibilityResolution;
  indexedVisible: boolean;
  visible: boolean;
  visibilitySurface: PublishVisibilityResult["visibilitySurface"];
  verificationPath: PublishVisibilityResult["verificationPath"] | null;
  feedScope: PublishVisibilityResult["feedScope"] | null;
  polls: number;
  usedDelayedPolling: boolean;
  usedCategoryFollowUp: boolean;
  postDetailVisible: boolean;
  chainVisible: boolean;
}

export interface PublishVisibilityBucketSummary {
  attempted: number;
  accepted: number;
  feedIndexedRecent: number;
  feedIndexedCategory: number;
  postDetailOnly: number;
  chainOnly: number;
  notVisible: number;
  failed: number;
}

export interface PublishVisibilityAttemptSummary {
  attemptedCount: number;
  acceptedCount: number;
  feedIndexedRecentCount: number;
  feedIndexedCategoryCount: number;
  feedIndexedCount: number;
  postDetailOnlyCount: number;
  chainOnlyCount: number;
  notVisibleCount: number;
  failedCount: number;
  byKind: Record<PublishAttemptKind, PublishVisibilityBucketSummary>;
}

function createBucket(): PublishVisibilityBucketSummary {
  return {
    attempted: 0,
    accepted: 0,
    feedIndexedRecent: 0,
    feedIndexedCategory: 0,
    postDetailOnly: 0,
    chainOnly: 0,
    notVisible: 0,
    failed: 0,
  };
}

export function describePublishVisibilityResult(
  visibility?: PublishVisibilityResult,
): PublishVisibilityOutcomeSummary {
  if (!visibility) {
    return {
      outcome: "unresolved-within-window",
      resolution: "unresolved-within-window",
      indexedVisible: false,
      visible: false,
      visibilitySurface: "none",
      verificationPath: null,
      feedScope: null,
      polls: 0,
      usedDelayedPolling: false,
      usedCategoryFollowUp: false,
      postDetailVisible: false,
      chainVisible: false,
    };
  }

  if (visibility.visibilitySurface === "feed_indexed") {
    return {
      outcome: visibility.feedScope === "category" ? "feed-indexed-category" : "feed-indexed-recent",
      resolution: visibility.feedScope === "category"
        ? "category-follow-up"
        : visibility.polls > 1
          ? "delayed-recent"
          : "immediate-recent",
      indexedVisible: visibility.indexedVisible,
      visible: visibility.visible,
      visibilitySurface: visibility.visibilitySurface,
      verificationPath: visibility.verificationPath ?? null,
      feedScope: visibility.feedScope ?? null,
      polls: visibility.polls,
      usedDelayedPolling: visibility.polls > 1,
      usedCategoryFollowUp: visibility.feedScope === "category",
      postDetailVisible: visibility.postDetailVisible,
      chainVisible: visibility.chainVisible,
    };
  }

  if (visibility.visibilitySurface === "post_detail") {
    return {
      outcome: "post-detail-only",
      resolution: "post-detail-only",
      indexedVisible: visibility.indexedVisible,
      visible: visibility.visible,
      visibilitySurface: visibility.visibilitySurface,
      verificationPath: visibility.verificationPath ?? null,
      feedScope: visibility.feedScope ?? null,
      polls: visibility.polls,
      usedDelayedPolling: visibility.polls > 1,
      usedCategoryFollowUp: false,
      postDetailVisible: visibility.postDetailVisible,
      chainVisible: visibility.chainVisible,
    };
  }

  if (visibility.visibilitySurface === "chain") {
    return {
      outcome: "chain-only",
      resolution: "chain-only",
      indexedVisible: visibility.indexedVisible,
      visible: visibility.visible,
      visibilitySurface: visibility.visibilitySurface,
      verificationPath: visibility.verificationPath ?? null,
      feedScope: visibility.feedScope ?? null,
      polls: visibility.polls,
      usedDelayedPolling: visibility.polls > 1,
      usedCategoryFollowUp: false,
      postDetailVisible: visibility.postDetailVisible,
      chainVisible: visibility.chainVisible,
    };
  }

  return {
    outcome: "unresolved-within-window",
    resolution: "unresolved-within-window",
    indexedVisible: visibility.indexedVisible,
    visible: visibility.visible,
    visibilitySurface: visibility.visibilitySurface,
    verificationPath: visibility.verificationPath ?? null,
    feedScope: visibility.feedScope ?? null,
    polls: visibility.polls,
    usedDelayedPolling: visibility.polls > 1,
    usedCategoryFollowUp: false,
    postDetailVisible: visibility.postDetailVisible,
    chainVisible: visibility.chainVisible,
  };
}

export function summarizePublishVisibilityAttempts(
  attempts: PublishAttemptLike[],
): PublishVisibilityAttemptSummary {
  const byKind: Record<PublishAttemptKind, PublishVisibilityBucketSummary> = {
    publish: createBucket(),
    reply: createBucket(),
  };

  for (const attempt of attempts) {
    const bucket = byKind[attempt.kind];
    bucket.attempted += 1;

    if (attempt.accepted) {
      bucket.accepted += 1;
    }

    const outcome = describePublishVisibilityResult(attempt.visibility).outcome;
    if (outcome === "feed-indexed-category") {
      bucket.feedIndexedCategory += 1;
    } else if (outcome === "feed-indexed-recent") {
      bucket.feedIndexedRecent += 1;
    } else if (outcome === "post-detail-only") {
      bucket.postDetailOnly += 1;
    } else if (outcome === "chain-only") {
      bucket.chainOnly += 1;
    } else {
      bucket.notVisible += 1;
    }

    if (!attempt.accepted || !attempt.visibility?.indexedVisible) {
      bucket.failed += 1;
    }
  }

  const values = Object.values(byKind);
  return {
    attemptedCount: attempts.length,
    acceptedCount: attempts.filter((attempt) => attempt.accepted).length,
    feedIndexedRecentCount: values.reduce((sum, bucket) => sum + bucket.feedIndexedRecent, 0),
    feedIndexedCategoryCount: values.reduce((sum, bucket) => sum + bucket.feedIndexedCategory, 0),
    feedIndexedCount: values.reduce((sum, bucket) => sum + bucket.feedIndexedRecent + bucket.feedIndexedCategory, 0),
    postDetailOnlyCount: values.reduce((sum, bucket) => sum + bucket.postDetailOnly, 0),
    chainOnlyCount: values.reduce((sum, bucket) => sum + bucket.chainOnly, 0),
    notVisibleCount: values.reduce((sum, bucket) => sum + bucket.notVisible, 0),
    failedCount: values.reduce((sum, bucket) => sum + bucket.failed, 0),
    byKind,
  };
}
