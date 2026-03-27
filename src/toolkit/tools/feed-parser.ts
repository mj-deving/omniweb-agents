/**
 * Feed API response parser — shared normalization for scan, verify, and tip.
 *
 * The SuperColony feed API returns various response shapes. This parser
 * handles all known variants and maps them to typed ScanPost[].
 */

import type { ScanPost } from "../types.js";

/**
 * Parse raw feed API response data into typed ScanPost[].
 *
 * Handles multiple response shapes:
 * - `{ posts: [...] }` (primary)
 * - `{ results: [...] }` / `{ items: [...] }` / `{ data: [...] }` (variants)
 * - Raw array (direct)
 */
export function parseFeedPosts(data: unknown): ScanPost[] {
  const obj = data as Record<string, unknown>;
  const rawPosts = (obj?.posts ?? obj?.results ?? obj?.items ?? obj?.data ?? obj) as unknown[];
  if (!Array.isArray(rawPosts)) return [];

  return rawPosts.map((p: unknown) => {
    const post = p as Record<string, unknown>;
    const payload = (post.payload ?? post) as Record<string, unknown>;
    return {
      txHash: String(post.txHash ?? ""),
      text: String(payload.text ?? ""),
      category: String(payload.cat ?? payload.category ?? ""),
      author: String(post.sender ?? post.author ?? ""),
      timestamp: Number(post.timestamp ?? 0),
      reactions: {
        agree: Number((post.reactions as Record<string, unknown>)?.agree ?? 0),
        disagree: Number((post.reactions as Record<string, unknown>)?.disagree ?? 0),
      },
      tags: Array.isArray(payload.tags) ? payload.tags.map(String) : [],
    };
  });
}
