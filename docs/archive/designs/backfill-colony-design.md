# Design: cli/backfill-colony.ts — Colony History Backfill (Phase 5.3)

## Purpose
One-time CLI tool to fetch full HIVE chain history and populate the colony DB.
Run manually, not as part of the session loop.

## Architecture
- Single file: `cli/backfill-colony.ts`
- Opens colony DB, connects wallet, paginates through chain history
- Batch inserts with error isolation (dead-letter routing)
- Resume support via colony DB cursor

## CLI Interface
```bash
npx tsx cli/backfill-colony.ts --agent sentinel [--limit 5000] [--batch-size 1000] [--env .env]
```

### Flags
- `--agent <name>` — required, for wallet/env resolution
- `--limit <N>` — max posts to fetch (default: unlimited/all available)
- `--batch-size <N>` — posts per DB transaction (default: 1000)
- `--env <path>` — env file path (default: agent's .env)
- `--dry-run` — show what would be ingested without writing
- `--pretty` — formatted progress output (default)
- `--json` — JSON summary at end

## Core Algorithm
```typescript
async function backfill(sdkBridge: SdkBridge, db: ColonyDatabase, options: BackfillOptions): Promise<BackfillResult> {
  const stats = { fetched: 0, inserted: 0, skipped: 0, deadLettered: 0 };

  // SDK getTransactions paginates by blockNumber
  let start: number | "latest" = "latest";
  let totalFetched = 0;

  while (totalFetched < (options.limit ?? Infinity)) {
    // Fetch page of raw transactions
    const txs = await rpc.getTransactions(start, PAGE_SIZE);
    if (!txs || txs.length === 0) break;

    // Filter for HIVE storage transactions, decode using hive-codec
    // NOTE: use decodeHiveData from hive-codec.ts (not decodeHiveTransaction which doesn't exist)
    const hivePosts = txs
      .filter(tx => tx.type === "storage")
      .map(tx => {
        const content = typeof tx.content === 'string' ? safeParse(tx.content) : tx.content;
        const decoded = decodeHiveData(content?.data);
        return { ...tx, hive: decoded };
      })
      .filter(result => result.hive?.action === "post");

    // Batch insert with error isolation
    db.pragma("foreign_keys = OFF");
    try {
      const batch = db.transaction((posts) => {
        for (const post of posts) {
          try {
            insertPost(db, mapToColonyPost(post));
            stats.inserted++;
          } catch (err) {
            insertDeadLetter(db, post.txHash, JSON.stringify(post), post.blockNumber, String(err));
            stats.deadLettered++;
          }
        }
      });
      batch(hivePosts);
    } finally {
      db.pragma("foreign_keys = ON");
    }

    totalFetched += txs.length;
    stats.fetched += hivePosts.length;

    // Progress reporting
    reportProgress(stats, totalFetched);

    // Pagination: advance to before the earliest block in this batch
    const lastTx = txs[txs.length - 1];
    if (lastTx?.blockNumber != null && lastTx.blockNumber > 1) {
      start = lastTx.blockNumber - 1;
    } else {
      break;
    }
  }

  return stats;
}
```

## Resume Support
- Uses a SEPARATE cursor key `backfill_cursor` in `_meta` (distinct from `cursor` used by forward V3 loop ingestion)
- After each batch, update `backfill_cursor` with the lowest block number processed
- On start, read `backfill_cursor` — if > 0, begin pagination from that block
- Reset with `--reset-cursor` flag
- The existing `cursor` key is reserved for forward/incremental ingestion when SDK adds `sinceBlock`

## Error Handling
- Individual `insertPost` failures → `dead_letters` table (not batch-aborting)
- Network errors → retry up to 3 times with backoff, then abort with stats
- Decode failures → dead-letter with raw payload preserved

## Progress Reporting
```
[backfill] Page 1: 100 txs fetched, 42 HIVE posts, 40 inserted, 2 dead-lettered
[backfill] Page 2: 200 txs fetched, 85 HIVE posts, 83 inserted, 2 dead-lettered
...
[backfill] Complete: 5000 txs scanned, 2100 posts inserted, 8 dead-lettered, 15 skipped (duplicate)
```

## Test Strategy
- Test file: `tests/cli/backfill-colony.test.ts`
- Use real SQLite (in-memory via initColonyCache(":memory:")) for integration tests
- Mock SDK bridge `getTransactions` with paginated responses
- Test: batch insert, dead-letter routing, resume from cursor, progress reporting
- Test: decode failure → dead letter, not crash

## Dependencies (existing)
- `src/toolkit/sdk-bridge.ts` — SdkBridge
- `src/toolkit/colony/schema.ts` — initColonyCache, ColonyDatabase
- `src/toolkit/colony/posts.ts` — insertPost, countPosts
- `src/toolkit/colony/dead-letters.ts` — insertDeadLetter
- `src/toolkit/hive-codec.ts` — decodeHiveData
- `src/toolkit/chain-reader.ts` — for raw tx type reference
- `src/lib/network/sdk.ts` — connectWallet
- `src/lib/agent-config.ts` — resolveAgentName, loadAgentConfig

## Boundary Compliance
- CLI lives in `cli/` — uses toolkit modules only
- No strategy code imports
- Uses existing colony DB schema (no migrations needed — tables exist)

## Files to Create
- `cli/backfill-colony.ts` — main CLI
- `tests/cli/backfill-colony.test.ts` — tests
