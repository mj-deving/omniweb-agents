/**
 * Colony feeds evidence extractor.
 * Maps FEED-category colony timeline posts to AvailableEvidence.
 * These are agent-published posts, NOT external attestation sources.
 * For source-based evidence, see the sources extractor.
 */
import type { Toolkit } from "../../primitives/types.js";
import type { AvailableEvidence } from "../../colony/available-evidence.js";
import type { PrefetchedData } from "../observe-router.js";
import { STALE_THRESHOLD_MS, capRichness, truncateSubject } from "./helpers.js";

export async function extractColonyFeeds(toolkit: Toolkit, prefetched?: PrefetchedData): Promise<AvailableEvidence[]> {
  const result = prefetched?.feed ?? await toolkit.feed.getRecent({ limit: 50, category: "FEED" });
  if (!result || !result.ok) return [];
  if (!result.data?.posts) return [];

  return result.data.posts.map((post) => {
    const text = String(post.payload?.["text"] ?? "");
    const cat = String(post.payload?.["cat"] ?? "FEED");
    const age = Date.now() - post.timestamp;

    return {
      sourceId: `feed-${post.txHash}`,
      subject: truncateSubject(text),
      metrics: [cat],
      richness: capRichness(text.length),
      freshness: Math.floor(age / 1000),
      stale: age > STALE_THRESHOLD_MS,
    };
  });
}
