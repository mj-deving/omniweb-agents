import type { ColonyDatabase } from "./schema.js";
import type { CachedPost } from "./posts.js";
import { mapPostRows, type PostRow } from "./posts.js";
import { findSimilarPosts } from "./search.js";

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

/** Similarity threshold for self-dedup (did we post this already?) */
const SELF_SIMILARITY_THRESHOLD = 0.4;

/** Similarity threshold for colony-wide claim dedup */
const CLAIM_SIMILARITY_THRESHOLD = 0.3;

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "are", "was",
  "has", "have", "been", "will", "can", "not", "its", "but", "our",
  "also", "any", "all", "how", "may", "into",
]);

/**
 * Normalize text for similarity comparison: lowercase, strip punctuation, remove stop words.
 */
function normalizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Extract bigrams (consecutive word pairs) from a word list.
 */
function extractBigrams(words: string[]): Set<string> {
  const bigrams = new Set<string>();
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.add(`${words[i]} ${words[i + 1]}`);
  }
  return bigrams;
}

/**
 * Compute topic similarity using weighted unigram + bigram overlap coefficient.
 * Returns 0.0 (no overlap) to 1.0 (identical/fully contained).
 *
 * Uses overlap coefficient: intersection / min(|A|, |B|)
 * This handles asymmetric cases well — a short topic contained within
 * a long post text scores high, unlike symmetric Jaccard which dilutes
 * the score when one text is much longer.
 *
 * Combines unigram overlap (40% weight) with bigram overlap (60% weight)
 * so topics sharing key terms like "Aave" + "Smart Contract" still match
 * even when intervening words differ.
 *
 * Pure function — no DB required. Suitable for templates and in-memory dedup.
 */
export function computeTopicSimilarity(topicA: string, topicB: string): number {
  const wordsA = normalizeText(topicA);
  const wordsB = normalizeText(topicB);

  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  // Unigram overlap coefficient
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let uniIntersection = 0;
  for (const w of setA) {
    if (setB.has(w)) uniIntersection++;
  }
  const uniMinSize = Math.min(setA.size, setB.size);
  const uniScore = uniMinSize === 0 ? 0 : uniIntersection / uniMinSize;

  // For very short texts (< 2 words), use unigram only
  if (wordsA.length < 2 || wordsB.length < 2) return uniScore;

  // Bigram overlap coefficient
  const bigramsA = extractBigrams(wordsA);
  const bigramsB = extractBigrams(wordsB);
  let biIntersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) biIntersection++;
  }
  const biMinSize = Math.min(bigramsA.size, bigramsB.size);
  const biScore = biMinSize === 0 ? 0 : biIntersection / biMinSize;

  // Weighted combination: bigrams prevent false positives from single shared words,
  // unigrams catch topics that share key terms but differ in word order
  return 0.45 * uniScore + 0.55 * biScore;
}

/**
 * Extract FTS5 phrase queries from a topic string.
 * Instead of OR-matching individual words (which over-matches),
 * this creates phrase queries requiring 2+ adjacent word matches.
 */
function extractPhraseQueries(claim: string): string[] {
  const words = normalizeText(claim);
  if (words.length < 2) return words.length === 1 ? [words[0]] : [];

  // Create 2-word phrase queries from consecutive words
  const phrases: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`"${words[i]} ${words[i + 1]}"`);
  }
  return phrases;
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
 *
 * Two-phase approach:
 * 1. FTS5 phrase-based candidate retrieval (fast narrowing of 200K+ posts)
 * 2. Bigram Jaccard post-filter (eliminates false positives from keyword overlap)
 */
export function checkClaimDedup(
  db: ColonyDatabase,
  claim: string,
  opts?: DedupOptions,
): DedupResult {
  if (!claim.trim()) return emptyResult();

  const phraseQueries = extractPhraseQueries(claim);
  if (phraseQueries.length === 0) return emptyResult();

  const windowHours = opts?.windowHours ?? DEFAULT_WINDOW_HOURS;
  const limit = opts?.limit ?? 5;
  const since = sinceTimestamp(windowHours);

  // Phase 1: FTS5 candidate retrieval using phrase queries joined with OR
  const ftsQuery = phraseQueries.join(" OR ");

  let candidates: PostRow[];
  try {
    candidates = db.prepare(`
      SELECT ${POST_COLUMNS}
      FROM posts_fts fts
      JOIN posts p ON p.rowid = fts.rowid
      WHERE posts_fts MATCH ?
        AND p.timestamp >= ?
      ORDER BY fts.rank
      LIMIT ?
    `).all(ftsQuery, since, limit * 3) as PostRow[];
  } catch {
    return emptyResult();
  }

  if (candidates.length === 0) return emptyResult();

  // Phase 2: Post-filter using bigram Jaccard similarity
  const matches: CachedPost[] = [];
  for (const row of candidates) {
    const postText = `${row.text} ${tryParseTags(row.tags)}`;
    const similarity = computeTopicSimilarity(claim, postText);
    if (similarity >= CLAIM_SIMILARITY_THRESHOLD) {
      matches.push(...mapPostRows([row]));
    }
    if (matches.length >= limit) break;
  }

  return {
    isDuplicate: matches.length > 0,
    matches,
    reason: matches.length > 0
      ? `Similar content found in ${matches.length} post(s) within ${windowHours}h`
      : undefined,
  };
}

/**
 * Check if WE already posted on a similar topic recently.
 * Uses direct DB query + bigram similarity instead of brittle FTS5 keyword matching.
 * Shorter window than colony-wide dedup to avoid self-spam perception.
 */
export function checkSelfDedup(
  db: ColonyDatabase,
  claim: string,
  ourAddress: string,
  windowHours = SELF_DEDUP_WINDOW_HOURS,
): DedupResult {
  if (!claim.trim() || !ourAddress) return emptyResult();

  const since = sinceTimestamp(windowHours);

  try {
    // Get our recent posts directly — no FTS5 needed for self-dedup
    const rows = db.prepare(`
      SELECT ${POST_COLUMNS}
      FROM posts p
      WHERE p.author = ?
        AND p.timestamp >= ?
      ORDER BY p.timestamp DESC
      LIMIT 50
    `).all(ourAddress, since) as PostRow[];

    // Compare each of our posts against the new claim using bigram similarity
    const matches: CachedPost[] = [];
    for (const row of rows) {
      const postText = `${row.text} ${tryParseTags(row.tags)}`;
      const similarity = computeTopicSimilarity(claim, postText);
      if (similarity >= SELF_SIMILARITY_THRESHOLD) {
        matches.push(...mapPostRows([row]));
      }
    }

    return {
      isDuplicate: matches.length > 0,
      matches: matches.slice(0, 3),
      reason: matches.length > 0
        ? `We already posted on this topic ${matches.length} time(s) within ${windowHours}h`
        : undefined,
    };
  } catch {
    return emptyResult();
  }
}

/**
 * Semantic dedup: check if semantically similar content exists in the colony.
 * Uses vector similarity (cosine distance) instead of keyword matching.
 * Catches posts that keyword dedup would miss (paraphrases, synonyms).
 *
 * Async because it generates an embedding for the query text.
 * Falls back to not-duplicate when embeddings are unavailable.
 */
export async function checkSemanticDedup(
  db: ColonyDatabase,
  claim: string,
  opts?: { windowHours?: number; maxDistance?: number; ourAddress?: string },
): Promise<DedupResult> {
  if (!claim.trim()) return emptyResult();

  const windowHours = opts?.windowHours ?? DEFAULT_WINDOW_HOURS;
  const maxDistance = opts?.maxDistance ?? 0.3;
  const since = sinceTimestamp(windowHours);

  try {
    const similar = await findSimilarPosts(db, claim, {
      limit: 5,
      maxDistance,
      sinceTimestamp: since,
    });

    const matches = opts?.ourAddress
      ? similar.filter((p) => p.author === opts.ourAddress)
      : similar;

    if (matches.length === 0) return emptyResult();

    return {
      isDuplicate: true,
      matches,
      reason: `Semantically similar content found (${matches.length} post(s), closest distance: ${matches[0].distance.toFixed(3)})`,
    };
  } catch {
    return emptyResult();
  }
}

/** Safely parse tags JSON to a space-separated string for similarity matching. */
function tryParseTags(tagsJson: string): string {
  try {
    const tags = JSON.parse(tagsJson) as string[];
    return tags.join(" ");
  } catch {
    return "";
  }
}
