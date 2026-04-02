import type { ColonyDatabase } from "./schema.js";
import type { CachedPost } from "./posts.js";
import { mapPostRows, type PostRow } from "./posts.js";

export interface DedupResult {
  isDuplicate: boolean;
  matches: CachedPost[];
  reason?: string;
}

export interface DedupOptions {
  windowHours?: number;
  limit?: number;
}

const DEFAULT_WINDOW_HOURS = 24;
const SELF_DEDUP_WINDOW_HOURS = 12;

/** Extract meaningful search terms from a claim string for FTS5 matching. */
function extractSearchTerms(claim: string): string {
  return claim
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 8)
    .join(" ");
}

function sinceTimestamp(windowHours: number): string {
  return new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
}

function emptyResult(): DedupResult {
  return { isDuplicate: false, matches: [] };
}

const POST_COLUMNS = `p.tx_hash, p.author, p.block_number, p.timestamp, p.reply_to, p.tags, p.text, p.raw_data,
       p.tx_id, p.from_ed25519, p.nonce, p.amount, p.network_fee, p.rpc_fee, p.additional_fee`;

/**
 * Check if a claim/topic has been recently covered in the colony.
 * Uses FTS5 full-text search within a time window. Fails open on query errors.
 */
export function checkClaimDedup(
  db: ColonyDatabase,
  claim: string,
  opts?: DedupOptions,
): DedupResult {
  if (!claim.trim()) return emptyResult();

  const searchTerms = extractSearchTerms(claim);
  if (!searchTerms) return emptyResult();

  const windowHours = opts?.windowHours ?? DEFAULT_WINDOW_HOURS;
  const limit = opts?.limit ?? 5;

  try {
    const rows = db.prepare(`
      SELECT ${POST_COLUMNS}
      FROM posts_fts fts
      JOIN posts p ON p.rowid = fts.rowid
      WHERE posts_fts MATCH ?
        AND p.timestamp >= ?
      ORDER BY fts.rank
      LIMIT ?
    `).all(searchTerms, sinceTimestamp(windowHours), limit) as PostRow[];

    const matches = mapPostRows(rows);
    return {
      isDuplicate: matches.length > 0,
      matches,
      reason: matches.length > 0
        ? `Similar content found in ${matches.length} post(s) within ${windowHours}h`
        : undefined,
    };
  } catch {
    return emptyResult();
  }
}

/**
 * Check if WE already posted on a similar topic recently.
 * Shorter window than colony-wide dedup to avoid self-spam perception.
 */
export function checkSelfDedup(
  db: ColonyDatabase,
  claim: string,
  ourAddress: string,
  windowHours = SELF_DEDUP_WINDOW_HOURS,
): DedupResult {
  if (!claim.trim() || !ourAddress) return emptyResult();

  const searchTerms = extractSearchTerms(claim);
  if (!searchTerms) return emptyResult();

  try {
    const rows = db.prepare(`
      SELECT ${POST_COLUMNS}
      FROM posts_fts fts
      JOIN posts p ON p.rowid = fts.rowid
      WHERE posts_fts MATCH ?
        AND p.author = ?
        AND p.timestamp >= ?
      ORDER BY fts.rank
      LIMIT 3
    `).all(searchTerms, ourAddress, sinceTimestamp(windowHours)) as PostRow[];

    const matches = mapPostRows(rows);
    return {
      isDuplicate: matches.length > 0,
      matches,
      reason: matches.length > 0
        ? `We already posted on this topic ${matches.length} time(s) within ${windowHours}h`
        : undefined,
    };
  } catch {
    return emptyResult();
  }
}
