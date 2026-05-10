import { describe, expect, it } from "vitest";
import { summarizePublishVisibilityAttempts } from "../../packages/omniweb-toolkit/scripts/_publish-visibility-summary.ts";

describe("summarizePublishVisibilityAttempts", () => {
  it("distinguishes feed recent, feed category, post-detail-only, chain-only, and unresolved outcomes", () => {
    const summary = summarizePublishVisibilityAttempts([
      {
        kind: "publish",
        accepted: true,
        visibility: {
          attempted: true,
          visible: true,
          indexedVisible: true,
          postDetailVisible: false,
          chainVisible: false,
          visibilitySurface: "feed_indexed",
          feedScope: "recent",
          polls: 1,
          elapsedMs: 10,
          verificationPath: "feed",
        },
      },
      {
        kind: "publish",
        accepted: true,
        visibility: {
          attempted: true,
          visible: true,
          indexedVisible: true,
          postDetailVisible: true,
          chainVisible: false,
          visibilitySurface: "feed_indexed",
          feedScope: "category",
          polls: 2,
          elapsedMs: 20,
          verificationPath: "feed",
        },
      },
      {
        kind: "reply",
        accepted: true,
        visibility: {
          attempted: true,
          visible: true,
          indexedVisible: false,
          postDetailVisible: true,
          chainVisible: false,
          visibilitySurface: "post_detail",
          polls: 3,
          elapsedMs: 30,
          verificationPath: "post_detail",
        },
      },
      {
        kind: "reply",
        accepted: true,
        visibility: {
          attempted: true,
          visible: true,
          indexedVisible: false,
          postDetailVisible: false,
          chainVisible: true,
          visibilitySurface: "chain",
          polls: 4,
          elapsedMs: 40,
          verificationPath: "chain",
        },
      },
      {
        kind: "publish",
        accepted: false,
        visibility: {
          attempted: true,
          visible: false,
          indexedVisible: false,
          postDetailVisible: false,
          chainVisible: false,
          visibilitySurface: "none",
          polls: 5,
          elapsedMs: 50,
          error: "not_seen",
        },
      },
    ]);

    expect(summary).toMatchObject({
      attemptedCount: 5,
      acceptedCount: 4,
      feedIndexedRecentCount: 1,
      feedIndexedCategoryCount: 1,
      feedIndexedCount: 2,
      postDetailOnlyCount: 1,
      chainOnlyCount: 1,
      notVisibleCount: 1,
      failedCount: 3,
    });

    expect(summary.byKind.publish).toMatchObject({
      attempted: 3,
      accepted: 2,
      feedIndexedRecent: 1,
      feedIndexedCategory: 1,
      postDetailOnly: 0,
      chainOnly: 0,
      notVisible: 1,
      failed: 1,
    });

    expect(summary.byKind.reply).toMatchObject({
      attempted: 2,
      accepted: 2,
      feedIndexedRecent: 0,
      feedIndexedCategory: 0,
      postDetailOnly: 1,
      chainOnly: 1,
      notVisible: 0,
      failed: 2,
    });
  });
});
