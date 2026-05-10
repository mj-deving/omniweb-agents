import type { PublishVisibilityResult } from "../src/publish-visibility.ts";

export type PublishAttemptKind = "publish" | "reply";

export interface PublishAttemptLike {
  kind: PublishAttemptKind;
  accepted: boolean;
  visibility?: PublishVisibilityResult;
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

    const visibility = attempt.visibility;
    const surface = visibility?.visibilitySurface ?? "none";

    if (surface === "feed_indexed") {
      if (visibility?.feedScope === "category") {
        bucket.feedIndexedCategory += 1;
      } else {
        bucket.feedIndexedRecent += 1;
      }
    } else if (surface === "post_detail") {
      bucket.postDetailOnly += 1;
    } else if (surface === "chain") {
      bucket.chainOnly += 1;
    } else {
      bucket.notVisible += 1;
    }

    if (!attempt.accepted || !visibility?.indexedVisible) {
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
