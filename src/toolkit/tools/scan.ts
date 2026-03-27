/**
 * scan() — fetch and analyze SuperColony feed posts.
 *
 * Supports local feed fetch and optional Skill Dojo fallback.
 */

import type { ScanOptions, ScanResult, ScanPost, ScanOpportunity, ToolResult } from "../types.js";
import { ok, err, demosError } from "../types.js";
import { DemosSession } from "../session.js";
import { withToolWrapper, localProvenance } from "./tool-wrapper.js";

/**
 * Scan the SuperColony feed for posts and opportunities.
 */
export async function scan(
  session: DemosSession,
  opts?: ScanOptions,
): Promise<ToolResult<ScanResult>> {
  return withToolWrapper(session, "scan", "NETWORK_ERROR", async (start) => {
    const limit = opts?.limit ?? 50;

    try {
      const posts = await fetchFeed(session, limit, opts?.domain);
      const opportunities = identifyOpportunities(posts);
      return ok<ScanResult>({ posts, opportunities }, localProvenance(start));
    } catch (localErr) {
      // Fall back to Skill Dojo if enabled
      if (session.skillDojoFallback) {
        try {
          const posts = await fetchFromSkillDojo(session, limit, opts?.domain);
          return ok<ScanResult>(
            { posts, opportunities: identifyOpportunities(posts) },
            { path: "skill-dojo", latencyMs: Date.now() - start },
          );
        } catch {
          // Both failed — fall through to error
        }
      }

      return err(
        demosError("NETWORK_ERROR", `Scan failed: ${(localErr as Error).message}`, true),
        localProvenance(start),
      );
    }
  });
}

function identifyOpportunities(posts: ScanPost[]): ScanOpportunity[] {
  const opportunities: ScanOpportunity[] = [];
  for (const post of posts) {
    if (post.reactions.agree + post.reactions.disagree < 5 && post.text.length > 100) {
      opportunities.push({
        type: "reply",
        post,
        reason: "Low engagement post with substantive content",
        score: 0.7,
      });
    }
  }
  return opportunities;
}

async function fetchFeed(_session: DemosSession, _limit: number, _domain?: string): Promise<ScanPost[]> {
  // TODO(toolkit-mvp): integrate SDK bridge
  throw new Error("Scan integration pending — connect SDK bridge");
}

async function fetchFromSkillDojo(_session: DemosSession, _limit: number, _domain?: string): Promise<ScanPost[]> {
  throw new Error("Skill Dojo integration pending");
}
