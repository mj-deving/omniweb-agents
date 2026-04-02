import type { ColonyDatabase } from "./schema.js";
import type { CachedPost } from "./posts.js";
import { mapPostRows, type PostRow } from "./posts.js";

export interface DedupResult {
  isDuplicate: boolean;
  /** Matching posts if duplicate detected */
  matches: CachedPost[];
  /** Why it was flagged (for decision log) */
  reason?: string;
}

export interface DedupOptions {
  /** Lookback window in hours (default: 24) */
  windowHours?: number;
  /** FTS5 match limit (default: 5) */
  limit?: number;
}

const DEFAULT_WINDOW_HOURS = 24;
const SELF_DEDUP_WINDOW_HOURS = 12;

/**
 * Check if a claim/topic has been recently covered in the colony.
 *
 * Uses FTS5 full-text search to find similar posts within a time window.
 * Returns isDuplicate=true if any post matches within the window.
 */
export function checkClaimDedup(
  db: ColonyDatabase,
  claim: string,
  opts?: DedupOptions,
): DedupResult {
  const windowHours = opts?.windowHours ?? DEFAULT_WINDOW_HOURS;
  const limit = opts?.limit ?? 5;

  if (!claim.trim()) {
    return { isDuplicate: false, matches: [] };
  }

  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  // Escape FTS5 special characters and extract meaningful words
  const searchTerms = claim
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 8)
    .join(" ");

  if (!searchTerms) {
    return { isDuplicate: false, matches: [] };
  }

  try {
    const rows = db.prepare(`
      SELECT p.tx_hash, p.author, p.block_number, p.timestamp, p.reply_to, p.tags, p.text, p.raw_data,
             p.tx_id, p.from_ed25519, p.nonce, p.amount, p.network_fee, p.rpc_fee, p.additional_fee
      FROM posts_fts fts
      JOIN posts p ON p.rowid = fts.rowid
      WHERE posts_fts MATCH ?
        AND p.timestamp >= ?
      ORDER BY fts.rank
      LIMIT ?
    `).all(searchTerms, since, limit) as PostRow[];

    const matches = mapPostRows(rows);

    return {
      isDuplicate: matches.length > 0,
      matches,
      reason: matches.length > 0
        ? `Similar content found in ${matches.length} post(s) within ${windowHours}h`
        : undefined,
    };
  } catch {
    // FTS5 query error (bad syntax) — fail open
    return { isDuplicate: false, matches: [] };
  }
}

/**
 * Check if WE already posted on a similar topic recently.
 *
 * More conservative than colony-wide dedup: checks our own posts
 * within a shorter window to avoid self-spam perception.
 */
export function checkSelfDedup(
  db: ColonyDatabase,
  claim: string,
  ourAddress: string,
  windowHours = SELF_DEDUP_WINDOW_HOURS,
): DedupResult {
  if (!claim.trim() || !ourAddress) {
    return { isDuplicate: false, matches: [] };
  }

  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  const searchTerms = claim
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 8)
    .join(" ");

  if (!searchTerms) {
    return { isDuplicate: false, matches: [] };
  }

  try {
    const rows = db.prepare(`
      SELECT p.tx_hash, p.author, p.block_number, p.timestamp, p.reply_to, p.tags, p.text, p.raw_data,
             p.tx_id, p.from_ed25519, p.nonce, p.amount, p.network_fee, p.rpc_fee, p.additional_fee
      FROM posts_fts fts
      JOIN posts p ON p.rowid = fts.rowid
      WHERE posts_fts MATCH ?
        AND p.author = ?
        AND p.timestamp >= ?
      ORDER BY fts.rank
      LIMIT 3
    `).all(searchTerms, ourAddress, since) as PostRow[];

    const matches = mapPostRows(rows);

    return {
      isDuplicate: matches.length > 0,
      matches,
      reason: matches.length > 0
        ? `We already posted on this topic ${matches.length} time(s) within ${windowHours}h`
        : undefined,
    };
  } catch {
    return { isDuplicate: false, matches: [] };
  }
}
