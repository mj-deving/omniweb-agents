/**
 * Attestation verification status — queries chain_verified state for engagement decisions.
 *
 * Phase 8c: Verified engagement. Returns a VerificationGate enum instead of boolean
 * so callers can make nuanced decisions (Codex review fix H2).
 *
 * Gate semantics:
 * - "verified": at least one attestation has chain_verified=1
 * - "unresolved": all attestations have chain_verified=0 (not yet checked)
 * - "failed": at least one attestation has chain_verified=-1, none have 1
 * - "no_attestation": post has no attestation records at all
 *
 * ENGAGE allows "verified" or "unresolved". TIP requires "verified" only.
 */

import type { ColonyDatabase } from "./schema.js";
import type { VerificationGate } from "../strategy/types.js";

/**
 * Get the verification gate for a specific post.
 * Returns the most permissive state if the post has multiple attestations
 * (any verified attestation → "verified").
 */
export function getPostVerificationGate(db: ColonyDatabase, postTxHash: string): VerificationGate {
  const rows = db.prepare(
    "SELECT chain_verified FROM attestations WHERE post_tx_hash = ?",
  ).all(postTxHash) as Array<{ chain_verified: number }>;

  if (rows.length === 0) return "no_attestation";

  // Any verified attestation is sufficient
  if (rows.some((r) => r.chain_verified === 1)) return "verified";

  // Any failed (and none verified)
  if (rows.some((r) => r.chain_verified === -1)) return "failed";

  // All unresolved
  return "unresolved";
}

/**
 * Count chain-verified posts per author.
 * Returns a Record where each key is a lowercased author address,
 * value is the number of their posts that have at least one verified attestation.
 */
export function getVerifiedPostCountsByAuthor(
  db: ColonyDatabase,
  authors: string[],
): Record<string, number> {
  if (authors.length === 0) return {};

  const result: Record<string, number> = {};

  // Initialize all authors to 0
  for (const author of authors) {
    result[author.trim().toLowerCase()] = 0;
  }

  // Query verified counts in one pass — no N+1
  const placeholders = authors.map(() => "?").join(",");
  const rows = db.prepare(`
    SELECT LOWER(p.author) as author, COUNT(DISTINCT a.post_tx_hash) as count
    FROM attestations a
    JOIN posts p ON a.post_tx_hash = p.tx_hash
    WHERE a.chain_verified = 1
      AND LOWER(p.author) IN (${placeholders})
    GROUP BY LOWER(p.author)
  `).all(...authors.map((a) => a.trim().toLowerCase())) as Array<{ author: string; count: number }>;

  for (const row of rows) {
    result[row.author] = row.count;
  }

  return result;
}
