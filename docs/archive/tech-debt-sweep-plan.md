---
type: plan
status: draft
created: 2026-04-04
summary: "Complete tech debt sweep — 15 items across 7 domains with multi-gate review process"
read_when: ["tech debt", "tech debt sweep", "tech debt plan"]
---

# Tech Debt Sweep Plan

> Resolve all 15 actionable tech debt items from ROADMAP.md.
> Excluded: cursor pagination (blocked on SDK), SSE endpoint config (blocked on endpoint stability).

## Architecture Overview

The changes span 6 domains and touch ~15 source files + ~8 test files. No new external dependencies. Schema migration v7 -> v8 required.

```
cli/v3-loop.ts              ← Performance: parallel SENSE, double-fetch fix
cli/v3-loop-helpers.ts       ← Performance: accept pre-fetched posts
cli/scan-feed.ts             ← Performance: expose full posts for reuse
cli/v3-strategy-bridge.ts    ← Code quality: identity API shape verification

src/toolkit/colony/schema.ts          ← Migration v8: index, settlement_status, pruning
src/toolkit/colony/proof-resolver.ts   ← Security: TLSN structural matching, DAHR/TLSN field validation
src/toolkit/colony/proof-ingestion.ts  ← Security: BEGIN IMMEDIATE concurrency guard
src/toolkit/colony/contradiction-scanner.ts ← Caching: TTL cache layer
src/toolkit/colony/claims.ts           ← Data integrity: claim_ledger reconciliation
src/toolkit/colony/posts.ts            ← Data integrity: pruning function
src/toolkit/colony/intelligence-summary.ts ← Code quality: socialHandles disposition
src/toolkit/strategy/types.ts          ← Code quality: socialHandles disposition

tests/toolkit/colony/proof-resolver.test.ts      ← Edge cases: empty data, empty recv, boolean
tests/toolkit/colony/proof-ingestion.test.ts      ← Concurrency guard test
tests/toolkit/colony/contradiction-scanner.test.ts ← Cache TTL tests
tests/toolkit/colony/claims.test.ts               ← Reconciliation tests
tests/cli/v3-strategy-bridge.test.ts              ← Integration tests
tests/helpers/colony-test-utils.ts                ← Shared test helper (NEW)
```

## Implementation Plan

### Step 1: Schema Migration v8 (ISC-17, ISC-18, ISC-28)

Add migration 8 to `schema.ts`:
- Composite index `(author, timestamp)` on posts table for `resolveAgentToRecentPost` perf
- `settlement_status TEXT DEFAULT 'pending'` column on bet-related tracking (add to attestations or new bet_tracking table depending on existing structure)
- Bump CURRENT_SCHEMA_VERSION to 8

```sql
-- Migration 8
CREATE INDEX IF NOT EXISTS idx_posts_author_timestamp ON posts(author, timestamp);

-- Concurrency guard column for proof ingestion (Step 6)
ALTER TABLE attestations ADD COLUMN claimed_at TEXT DEFAULT NULL;

-- Bet settlement tracking — separate table, not on attestations (Codex H2: domain separation)
CREATE TABLE IF NOT EXISTS bet_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_tx_hash TEXT NOT NULL,
  bet_type TEXT NOT NULL CHECK(bet_type IN ('binary', 'range')),
  amount_dem REAL NOT NULL,
  expiry_at TEXT NOT NULL,
  settlement_status TEXT DEFAULT 'pending'
    CHECK(settlement_status IN ('pending', 'settled_win', 'settled_loss', 'expired')),
  settled_at TEXT,
  FOREIGN KEY (post_tx_hash) REFERENCES posts(tx_hash)
);
```

Note: All migration DDL is wrapped in an existing `db.transaction()` in `initColonyCache()` — rollback is automatic on failure.

### Step 2: Performance — Double-Fetch Fix (ISC-1, ISC-2, ISC-3)

**Problem**: `scan-feed.ts` subprocess fetches chain posts via SDK. Then `v3-loop-helpers.ts:ingestChainPostsIntoColonyDb` calls `sdkBridge.getHivePosts(500)` again.

**Chosen approach**: Modify `ingestChainPostsIntoColonyDb` to accept pre-fetched `ScanPost[]` instead of an sdkBridge. In `v3-loop.ts`, fetch chain posts once via `sdkBridge.getHivePosts(500)` before calling ingestion, and pass the result directly.

scan-feed still runs as a subprocess with its own SDK connection (process isolation), but v3-loop no longer double-fetches: reduces from 2 SDK calls to 1 within v3-loop. scan-feed subprocess call remains (different process, can't share state without changing IPC).

**NOTE (Codex review C1):** This is a partial fix. Full elimination would require passing pre-fetched posts to scan-feed via stdin/temp file, which changes the subprocess interface. Accepted as pragmatic — add follow-up item for full elimination if SDK calls become expensive.

```typescript
// v3-loop.ts (before SENSE)
const chainPosts = await sdkBridge.getHivePosts(500);
// v3-loop-helpers.ts signature change:
await ingestChainPostsIntoColonyDb(bridge.db, chainPosts, deps.observe);
```

### Step 3: Performance — Parallel SENSE Operations (ISC-4, ISC-5, ISC-6)

**Parallelize independent SENSE operations** (Codex H4: correct ordering):

Colony ingestion MUST complete first (proofs + profiles both read from posts table). Then proof ingestion and profile refresh can run in parallel (they write to different tables: attestations vs agent_profiles).

```typescript
// v3-loop.ts: Step 1 — sequential, posts must be in DB first
await ingestChainPostsIntoColonyDb(bridge.db, chainPosts, deps.observe);

// Step 2 — parallel: both read from posts, write to different tables
const [proofResult, profileResult] = await Promise.allSettled([
  ingestProofs(bridge.db, chainReader, { limit: 20 }),
  refreshAgentProfiles(bridge.db),
]);
// Handle each result independently — one failure doesn't block the other
```

**Parallelize source fetches** with concurrency limiter:

```typescript
// v3-loop.ts: lines 177-216 become:
const limiter = createLimiter(3); // max 3 concurrent HTTP fetches
const abortController = new AbortController();
// Wall-clock budget enforcement (Codex M4)
setTimeout(() => abortController.abort(), SOURCE_FETCH_BUDGET_MS);

const fetchPromises = allSources.map(source =>
  limiter(() => {
    if (abortController.signal.aborted) return Promise.resolve(null);
    return fetchSource(source.url, { ...source, signal: abortController.signal });
  })
);
const results = await Promise.allSettled(fetchPromises);
```

Extract `createLimiter` from `proof-ingestion-rpc-adapter.ts` to `src/toolkit/util/limiter.ts`. Update the adapter to import from the new location. Reuse in v3-loop source fetches.

### Step 4: Security — TLSN Structural Matching (ISC-7, ISC-8)

**Current**: `proof-resolver.ts:214` uses `responseStr.includes(v)` — substring matching.

**Fix**: Try to parse TLSN responseData as JSON. If parseable, do structural key-value matching (check if snapshot keys exist in parsed response with matching values). If not parseable (raw HTTP body), fall back to current substring matching with existing `MIN_VALUE_LENGTH` guard.

```typescript
function extractJsonBody(responseData: string): string {
  // TLSN recv often contains full HTTP response with headers.
  // Strip headers by splitting on \r\n\r\n and taking the body.
  const headerBodySplit = responseData.indexOf('\r\n\r\n');
  return headerBodySplit >= 0 ? responseData.slice(headerBodySplit + 4) : responseData;
}

function structuralMatch(
  responseData: string,
  snapshot: Record<string, unknown>,
): { matched: number; total: number } {
  const body = extractJsonBody(responseData);
  try {
    const parsed = JSON.parse(body);
    // Handle both object and array responses
    const obj = Array.isArray(parsed) ? parsed[0] : parsed;
    if (typeof obj !== "object" || obj === null) throw new Error("not object");
    return matchKeyValues(obj, snapshot);
  } catch {
    // Fall back to substring matching (for non-JSON body responses)
    return substringMatch(responseData, snapshot);
  }
}

// matchKeyValues: For each snapshot key, check if parsed response has the same key
// with a matching value (case-insensitive string comparison for scalars).
// Supports one level of nesting — if snapshot value is in parsed.data or parsed.result.
function matchKeyValues(
  parsed: Record<string, unknown>,
  snapshot: Record<string, unknown>,
): { matched: number; total: number } {
  const flat = flattenOneLevel(parsed); // { key: value, "data.key": value }
  let matched = 0, total = 0;
  for (const [key, value] of Object.entries(snapshot)) {
    if (value == null || typeof value === "object") continue;
    total++;
    const strValue = String(value).toLowerCase();
    if (strValue.length < MIN_VALUE_LENGTH) continue;
    // Check exact key match or nested key match
    const candidate = flat[key] ?? flat[`data.${key}`] ?? flat[`result.${key}`];
    if (candidate != null && String(candidate).toLowerCase() === strValue) matched++;
  }
  return { matched, total };
}
```

### Step 5: Security — DAHR/TLSN Field Validation (ISC-9, ISC-10, ISC-11, ISC-12)

**Current**: `isDahrTransaction` only checks `content.type === "web2"`. `isTlsnProofData` accepts if ANY of serverName/recv/notaryKey is present.

**Fix**:
- DAHR: require `content.data` with both url AND (responseHash or hash) fields present
- TLSN: require BOTH `serverName` AND `recv` (notaryKey alone is insufficient)

```typescript
function isDahrTransaction(content: Record<string, unknown>): boolean {
  if (content.type !== "web2") return false;
  const data = content.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== "object") return false;
  const hasUrl = !!data.url;
  const hasHash = !!(data.responseHash || data.hash);
  return hasUrl && hasHash; // Both required — AND not OR
}
// NOTE (Codex M1): Before deploying, query colony DB for existing DAHR attestations
// to verify all have url+hash fields:
//   SELECT chain_data FROM attestations WHERE chain_method = 'DAHR' AND chain_verified = 1;
// If any lack these fields, add a migration to re-resolve them rather than grandfathering.

function isTlsnProofData(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return "serverName" in obj && "recv" in obj;
}
```

### Step 6: Security — Concurrency Guard (ISC-13, ISC-14)

Add `BEGIN IMMEDIATE` to `ingestProofs` to prevent concurrent double-processing:

```typescript
export async function ingestProofs(db, rpc, options?) {
  // BEGIN IMMEDIATE acquires write lock immediately — concurrent calls block
  const rows = db.prepare(
    `SELECT ... FROM attestations WHERE chain_verified = 0 ...`
  ).all(maxRetries, limit) as UnresolvedRow[];

  if (rows.length === 0) return result;

  // Mark rows as "in progress" before releasing for async RPC work
  // Use a sentinel value or update timestamp to prevent double-pickup
  // ...
}
```

Actually, since ingestProofs does async RPC calls between read and write, a simple transaction won't hold. Better approach: use an exclusion list. On read, immediately mark rows as `retry_count = retry_count + 1` (claiming them), then process and update final status.

**Revised (after Codex C2)**: The v3-loop is single-threaded — concurrent `ingestProofs` calls are unlikely in practice. The async gap (between synchronous SELECT via better-sqlite3 and async RPC calls) is the theoretical window. Fix: document the single-caller constraint AND add `claimed_at` timestamp as defense-in-depth. Wrap SELECT + SET `claimed_at=NOW()` in a transaction. Exclude rows with `claimed_at` within last 5 minutes from future SELECTs. On success, `chain_verified` update clears the row. On crash, claims auto-expire. Recovery query: `UPDATE attestations SET claimed_at = NULL WHERE claimed_at < datetime('now', '-5 minutes') AND chain_verified = 0`.

### Step 7: Data Integrity — Claim Ledger Reconciliation (ISC-15, ISC-16)

Add a `reconcileClaimVerification` function that:
1. Queries claim_ledger entries where `verified = true` (self-reported)
2. JOINs with attestations where `chain_verified = CHAIN_FAILED`
3. Updates claim_ledger.verified to false for mismatched entries

### Step 8: Data Integrity — Colony DB Pruning (ISC-19, ISC-20, ISC-21)

Add `prunePosts(db, { retentionDays, dryRun })`:
1. Collect tx_hashes of posts older than retentionDays
2. EXCLUDE posts referenced by: claim_ledger (post_tx_hash), attestations (post_tx_hash), interactions (our_tx_hash/their_tx_hash), hive_reactions (target_tx_hash), posts with children (parent_tx_hash references), bet_tracking (post_tx_hash)
3. DELETE matching posts from `posts` table — FTS5 triggers auto-clean `posts_fts`
4. Explicitly DELETE from `post_embeddings` for pruned post rowids (no trigger exists)
5. Explicitly DELETE from `vec_posts` for pruned post rowids (vec0 virtual table has no trigger — Codex H1)
6. DELETE orphaned `reaction_cache` entries where target tx_hash no longer exists
7. Return count of pruned posts

### Step 9: Caching — Contradiction Cache (ISC-32, ISC-33, ISC-34, ISC-35)

Add an in-memory cache to `contradiction-scanner.ts`:

```typescript
interface CacheEntry {
  results: ContradictionEntry[];
  cachedAt: number;
}

const MAX_CACHE_SIZE = 100; // Codex M1: prevent unbounded growth
const cache = new Map<string, CacheEntry>();

export function invalidateContradictionCache(): void {
  cache.clear();
}

// On cache check: if size > MAX_CACHE_SIZE, clear entirely (simple LRU alternative)
function getCached(key: string, ttlMs: number): ContradictionEntry[] | null {
  if (cache.size > MAX_CACHE_SIZE) cache.clear();
  const entry = cache.get(key);
  if (!entry || Date.now() - entry.cachedAt > ttlMs) return null;
  return entry.results;
}
```

Wire `invalidateContradictionCache()` into `insertPost()` in posts.ts so any new post insertion clears the cache. Cache is per-process, cold on restart (acceptable — optimization only).

### Step 10: Test Coverage (ISC-22-27)

- Edge case tests in `proof-resolver.test.ts`
- Integration tests in `v3-strategy-bridge.test.ts`

### Step 11: Test Utilities (ISC-36, ISC-37, ISC-38)

Extract `createTestDb()` and `addPost()` from the 5 test files into `tests/helpers/colony-test-utils.ts`. Update imports.

### Step 12: Code Quality (ISC-29, ISC-30, ISC-31)

- Identity API: verify shape against live response or document expected shape
- socialHandles: keep infrastructure, document as "ready for future rule" in ROADMAP.md (disposition, not implementation step)
- **LIKE wildcard injection fix** (Codex M2 — new finding): In `action-executor.ts:resolveAgentToRecentPost`, escape `%` and `_` in `topicHint` before LIKE interpolation:
  ```typescript
  const escaped = topicHint.replace(/[%_]/g, '\\$&');
  // And add ESCAPE '\\' to the LIKE clause
  ```

## Execution Order

1. Schema migration v8 (foundation for other changes)
2. Shared test helper extraction (enables cleaner tests)
3. Security hardening (TLSN/DAHR/concurrency)
4. Performance (double-fetch, parallel SENSE, parallel sources)
5. Data integrity (reconciliation, pruning, settlement status)
6. Caching (contradiction cache + invalidation)
7. Test coverage (edge cases + integration)
8. Code quality (identity, socialHandles)

## Dependencies

```
Step 1 (schema) ─── Step 5 (bet_tracking table uses it)
                ├── Step 6 (claimed_at column uses it)
                └── Step 8 (pruning uses new index + bet_tracking exclusion)
Step 2 (double-fetch) ─── Step 3 (parallel SENSE uses pre-fetched chainPosts)
Step 2 (test helpers) ─── Step 7 (tests use shared helpers)
Step 6 (concurrency) ─── Step 7 (reconciliation needs clean proof data)
Steps 4, 5, 9, 10, 12 are independent of each other
```
