# Design: cli/hive-query.ts — On-Chain Query CLI (Phase 5.1)

## Purpose
Read-only CLI for ad-hoc on-chain inspection of HIVE data. Never writes to chain.

## Architecture
- Single file: `cli/hive-query.ts`
- Subcommand-based arg parsing (same pattern as verify.ts/audit.ts)
- Creates SdkBridge for chain reads + opens colony DB for local enrichment
- Output: `--pretty` (default, formatted tables) or `--json` (structured)

## Subcommands

### `posts --author <addr> [--limit N] [--reactions]`
- SDK: `getHivePostsByAuthor(address, { limit })`
- If `--reactions`: also call `getHiveReactions(txHashes)` and merge counts
- Output: table of posts with timestamp, text preview, tags, block number

### `performance --agent <name> [--last N]`
- SDK: `getHivePostsByAuthor(ourAddress, { limit })`
- Colony DB: look up attestations + reactions from cache
- Compute simple metrics: agree/disagree ratio, attestation count, avg text length
- NO strategy scoring (that lives in strategy code — boundary violation)

### `engagement --agent <name> [--last N]`
- SDK: `getHivePostsByAuthor(ourAddress)` → get our posts
- SDK: `getHiveReactions(ourPostTxHashes)` → get who reacted
- Output: reaction summary per post, total agree/disagree

### `colony [--hours N]`
- SDK: `getHivePosts(limit)` (default limit 100)
- Compute: unique authors, posts per hour, top tags
- Output: activity overview

### `tx <txHash>`
- SDK: `verifyTransaction(txHash)`
- Decode hive data if storage transaction
- Output: raw tx data + decoded hive payload

## Shared Infrastructure
```typescript
// Wallet connect pattern (from verify.ts)
const envPath = flags.env || resolve(process.cwd(), '.env');
const { demos, address } = await connectWallet(envPath);
const sdkBridge = createSdkBridge(demos, undefined, AUTH_PENDING_TOKEN);

// Colony DB — path derived from agent name, not hardcoded to sentinel
const agentName = flags.agent || 'sentinel';
const cacheDir = resolve(homedir(), `.${agentName}`, 'colony');
mkdirSync(cacheDir, { recursive: true });
const db = initColonyCache(resolve(cacheDir, 'cache.db'));
try {
  // ... CLI work
} finally {
  db.close();
}
```

## Flag Consistency
All subcommands that query by author support both `--agent <name>` (resolves address from config) and `--author <addr>` (raw address). If both provided, `--author` wins.

## Engagement Subcommand Note
`getHiveReactions` returns aggregate counts `{ agree, disagree }` per post, NOT individual reactor addresses. The engagement subcommand shows reaction counts per post, not "who reacted."

## Test Strategy
- Test file: `tests/cli/hive-query.test.ts`
- Mock SdkBridge and colony DB
- Test each subcommand handler function independently
- Test arg parsing
- Test both --pretty and --json output modes

## Boundary Compliance
- All code is in `cli/` (not toolkit, not strategy)
- Uses only toolkit-level SDK bridge methods
- No imports from `src/lib/` strategy code
- Simple metrics only (ratios, counts) — no scoring heuristics

## Files to Create
- `cli/hive-query.ts` — main CLI
- `tests/cli/hive-query.test.ts` — tests

## Dependencies (existing, no new packages)
- `src/toolkit/sdk-bridge.ts` — SdkBridge
- `src/toolkit/colony/schema.ts` — initColonyCache
- `src/toolkit/colony/posts.ts` — getPostsByAuthor, getRecentPosts
- `src/toolkit/colony/reactions.ts` — getReaction
- `src/lib/network/sdk.ts` — connectWallet
- `src/lib/agent-config.ts` — resolveAgentName
