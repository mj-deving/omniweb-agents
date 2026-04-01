# Red Team Analysis: Chain-First Toolkit Migration

## Attack Surface Summary

5 vectors analyzed against 6 source files. 2 Critical, 2 High, 1 Medium findings.

---

## VECTOR 1: getTxByHash Timing/Propagation for Verify

**Severity:** HIGH
**Likelihood:** Medium (happens on every fresh broadcast, guaranteed during network congestion)

### Attack Description

The plan replaces feed-based verification (`/api/feed?limit=50`) with `getTxByHash(hash)`. The current code at `verify.ts:39-49` retries with delays [3s, 5s, 10s] (18s total budget). The plan keeps this retry logic.

**The core problem:** `getTxByHash` queries the connected RPC node's local state. Between transaction broadcast and block inclusion, there is a propagation window where:

1. **Mempool-only state (0-15s):** The tx exists in mempool but `getTxByHash` may only return confirmed txs. The plan adds `getMempool()` check for this, but mempool queries are node-local -- if the tx was broadcast to a different node, this node's mempool won't have it either.

2. **Block propagation delay (0-5s):** Even after block inclusion, the queried RPC node may not have received that block yet. This is worse than the feed API's indexing delay because the feed API was running on the same infrastructure as the block producer.

3. **False negatives are guaranteed:** Unlike the feed API which had a ~50-post window (temporal), `getTxByHash` is binary -- either the node knows about the tx or it doesn't. A tx that is confirmed on chain but not yet propagated to `demosnode.discus.sh` returns null, which the plan maps to `confirmed: false`.

### Specific Code Paths

- `verify.ts:43-45` -- `checkConfirmation` returns `{ confirmed: false }` on null, triggering retry
- Plan Step 2: `if (!tx) -> confirmed: false (retry)` -- correct behavior but insufficient budget
- `sdk-bridge.ts:374-391` -- `queryTransaction` already silently returns null on failure, masking propagation issues

### Comparison to Feed API

The feed API had its own indexing delay (typically 5-30s), but it was **deterministic** -- once indexed, always found within the 50-post window. The chain approach has **non-deterministic** propagation that depends on network topology, node sync state, and block time variance. The retry budget of 18s may be insufficient for slow block times.

### Recommended Mitigations

1. **Increase retry budget to 30s** with delays [2s, 4s, 8s, 16s] -- exponential backoff matching worst-case block time
2. **Check both mempool AND confirmed state** on each attempt (plan mentions mempool on first attempt only -- should be every attempt)
3. **Add a `blockHeight` freshness check** -- query the node's current block height first; if it's behind the network, warn that verification may be stale
4. **Return a three-state result** instead of boolean: `confirmed | pending | not_found` -- callers can distinguish "definitely not on chain" from "node hasn't seen it yet"

---

## VECTOR 2: Malicious RPC Node

**Severity:** CRITICAL
**Likelihood:** Low (requires node compromise), but impact is fund theft

### Attack Description

The plan elevates `getTxByHash` to the **sole trust anchor** for two critical operations:

1. **verify.ts:** Confirms whether a transaction exists and is valid
2. **tip.ts:** Resolves the `from` address to determine who receives tip funds

Currently (`tip.ts:46-58`), RPC resolution via `bridge.queryTransaction` is the preferred path, with feed API as fallback. The plan **removes the fallback entirely** (Step 3), making the RPC node the single point of trust.

**If `demosnode.discus.sh` is compromised or MitM'd:**

- **Tip theft:** Attacker returns a fabricated `getTxByHash` response with `from: attackerAddress`. The toolkit sends DEM to the attacker instead of the post author. This is the **direct financial impact** vector.
  - Current code path: `tip.ts:52-53` -- `if (txResult?.sender) recipientAddress = txResult.sender`
  - Plan path: `recipientAddress = tx.from` with no cross-verification

- **Fake confirmation:** Attacker returns a fake confirmed status for a tx that was never broadcast. This could be used to convince an agent that a publish succeeded when it didn't, causing the agent to tip non-existent posts.

- **No client-side signature verification:** The SDK bridge (`sdk-bridge.ts:374-391`) does not verify the transaction's cryptographic signature. It takes whatever the RPC node returns at face value. The `DemosRpcMethods` interface (`sdk-bridge.ts:38-46`) shows `queryTx` returns `{ sender?: string }` -- just a string, no signature proof.

### Why This Is Worse Than Current Architecture

Currently, tip resolution has **two independent paths** (`tip.ts:46-85`): RPC (chain) and feed API (indexer). An attacker would need to compromise BOTH to redirect tips. The migration removes this redundancy.

### Recommended Mitigations

1. **CRITICAL: Verify transaction signatures client-side.** After `getTxByHash` returns, extract the raw transaction, verify its cryptographic signature against the claimed `from` address. If the SDK doesn't expose this, it's a blocking gap for the migration.
2. **For tips specifically:** Cross-reference the resolved address against a second source when available (mempool tx if still there, or optional API enrichment). Never trust a single source for fund-routing decisions.
3. **Pin the RPC node's TLS certificate** or verify its identity through a secondary channel.
4. **Add a configurable `rpcNodes: string[]` array** and query at least 2 nodes for tip resolution, requiring consensus.

---

## VECTOR 3: Undefined Reactions Crashing Downstream

**Severity:** CRITICAL
**Likelihood:** High (guaranteed crash on every chain-only scan)

### Attack Description

The plan changes `ScanPost.reactions` from `{ agree: number; disagree: number }` to have `number | undefined` fields. The plan states this is a "type-level change, not runtime break." **This is wrong. It is a guaranteed runtime crash.**

### Crash Sites (Confirmed by Code Inspection)

**Direct property access without null guards -- will throw `TypeError: Cannot read properties of undefined`:**

1. **`src/toolkit/tools/scan.ts:52`** -- `post.reactions.agree + post.reactions.disagree` -- the toolkit's OWN code crashes. `undefined + undefined = NaN`, and `NaN < 5` is `false`, so it won't crash but will silently skip ALL opportunity detection (every post gets NaN comparison).

   Actually, re-examining: `undefined + undefined` = `NaN` in JS. `NaN < 5` = `false`. `NaN >= 20` = `false`. So no crash, but **zero opportunities detected ever** in chain-only mode. The plan says "identifyOpportunities() skips reaction-dependent heuristics when reactions are unknown" but the current code has NO skip logic -- it just evaluates to NaN and silently produces wrong results.

2. **`src/lib/tips.ts:163`** -- `post.reactions.agree + post.reactions.disagree` -- NaN propagation into tip amount calculation. `computeTipAmount` would compute `amount = 1` always (NaN >= 15 is false), masking the data quality issue.

3. **`src/lib/tips.ts:176`** -- Same NaN issue in `buildCandidate`. `reactionsScore = Math.min(NaN * 2, 20)` = `NaN`. This NaN propagates into the final tip score, potentially causing incorrect tip prioritization.

4. **`src/lib/pipeline/feed-filter.ts:280`** -- `post.reactions.agree + post.reactions.disagree` -- NaN in topic index building. `totalReactions` accumulates NaN, corrupting the entire topic stats.

5. **`cli/scan-feed.ts:228`** -- `p.reactions.agree + p.reactions.disagree` -- NaN in CLI output totals.

6. **`cli/scan-feed.ts:391`** -- Same pattern.

**Guarded access (safe but produces wrong results):**

7. **`cli/session-runner.ts:1364`** -- `(p.reactions?.agree || 0) + (p.reactions?.disagree || 0)` -- safe, returns 0.
8. **`cli/event-runner.ts:242-243`** -- `Number(p?.reactions?.agree || 0)` -- safe, returns 0.
9. **`cli/gate.ts:639`** -- `(post.reactions?.agree || 0)` -- safe, returns 0.

### The Real Problem

The plan says "reactions become `number | undefined`" but doesn't specify whether `reactions` itself becomes `undefined` or just `reactions.agree`/`reactions.disagree`. If `reactions` is `undefined`, then `post.reactions.agree` throws `TypeError`. If `reactions` is `{ agree: undefined, disagree: undefined }`, the NaN propagation path above applies.

**Either way, there are 6+ call sites that produce incorrect behavior without code changes.**

### JSON Serialization Issue

`JSON.stringify({ agree: undefined })` produces `{}` (undefined fields are omitted). `JSON.stringify({ agree: 0 })` produces `{"agree":0}`. Any code that deserializes and checks `"agree" in obj` will behave differently. State stored to `FileStateStore` with undefined reactions cannot be reliably round-tripped.

### Recommended Mitigations

1. **Do NOT change the type to `number | undefined`.** Instead, add a parallel field: `reactionsKnown: boolean`. Keep `reactions: { agree: number; disagree: number }` with values `{ agree: 0, disagree: 0 }` when unknown, and set `reactionsKnown: false`.
2. **If you must use undefined:** Fix ALL 6+ crash/NaN sites BEFORE the migration. Add a helper: `getReactions(post: ScanPost): { agree: number; disagree: number; known: boolean }` and migrate all callers.
3. **Add a runtime assertion** in `identifyOpportunities` that checks `typeof post.reactions.agree === 'number'` before arithmetic.
4. **Test the serialization round-trip** explicitly in `hive-decoder.test.ts`.

---

## VECTOR 4: Auth Token Dependency Audit

**Severity:** HIGH
**Likelihood:** Medium (silent failures in chain-only mode)

### Attack Description

The plan says chain-only mode skips `ensureAuth()` and sets `AUTH_PENDING_TOKEN`. The question: do any "chain operations" secretly depend on the auth token?

### Audit Results

**Chain operations that do NOT use auth token (confirmed safe):**

- `bridge.transferDem()` (`sdk-bridge.ts:344-357`) -- calls `rpc.transfer()` directly. Uses wallet signing, not API token. **SAFE.**
- `bridge.publishHivePost()` (`sdk-bridge.ts:298-342`) -- uses `DemosTransactions.store/confirm/broadcast`. These are chain operations using wallet signing. **SAFE.**
- `bridge.queryTransaction()` (`sdk-bridge.ts:374-391`) -- calls `rpc.queryTx()` / `rpc.getTx()`. RPC query, no auth needed. **SAFE.**

**Operations that DO use auth token:**

- `bridge.apiCall()` (`sdk-bridge.ts:261-296`) -- injects `Bearer ${authToken}` at line 277. All tools that call `apiCall` need auth.
  - `verify.ts:83` -- calls `bridge.apiCall('/api/feed?limit=50')`. **Currently depends on auth.** Plan removes this call. SAFE after migration.
  - `tip.ts:63` -- calls `bridge.apiCall('/api/feed?limit=50')`. **Currently depends on auth.** Plan removes this call. SAFE after migration.
  - `scan.ts:77` -- calls `bridge.apiCall('/api/feed?limit=...')`. **Currently depends on auth.** Plan replaces with chain scan. SAFE after migration.
  - `react.ts:23` -- calls `bridge.apiCall('/api/react', ...)`. **Depends on auth.** Plan keeps this as API-gated. **PROBLEM:** In chain-only mode, `apiAccess === "none"` returns error (correct). But what about `apiAccess === "configured"` (API URL provided but auth failed)? The plan's 3-state model has a gap.

**The hidden dependency -- DAHR attestation:**

- `bridge.attestDahr()` (`sdk-bridge.ts:205-259`) -- does NOT use auth token. It uses `rpc.web2.createDahr()` which is SDK-level, not API-level. **SAFE.**

**But ensureAuth itself has a hidden dependency:**

- `ensureAuth()` (`src/lib/auth/auth.ts:116`) calls `apiCall('/api/auth/challenge')` -- this is the **SuperColony API**, not a chain operation. In chain-only mode this will fail. The plan handles this by skipping ensureAuth entirely. **SAFE.**

### The Gap: apiAccess State Machine

The plan defines 3 states: `"none" | "configured" | "authenticated"`. But the current code (`connect.ts:242-244`) sets `AUTH_PENDING_TOKEN` when auth fails, then passes it to `createSdkBridge`. The bridge checks `authToken !== AUTH_PENDING_TOKEN` before injecting Bearer.

**Problem:** What if a user provides `supercolonyApi` but auth fails (API is down)? The state should be `"configured"` but auth is pending. If `react()` checks `apiAccess !== "none"` and proceeds, it will send requests with no Bearer token -- which may return 401 and leak information about the endpoint.

### Recommended Mitigations

1. **Map the state machine explicitly:**
   - `"none"` = no API URL provided
   - `"configured"` = API URL provided, auth not attempted or failed
   - `"authenticated"` = API URL provided, valid token obtained
2. **react.ts must require `"authenticated"`, not just `"configured"`** -- sending unauthenticated requests to the API is worse than returning an honest error.
3. **Add integration test** for the `configured-but-unauthenticated` state.

---

## VECTOR 5: Transition Period Mixed-Mode Attacks

**Severity:** MEDIUM
**Likelihood:** Low-Medium (requires specific timing during multi-session migration)

### Attack Description

The migration is planned across ~3 sessions. During this period, the codebase will have tools in different states:

- **Session 1:** connect + bridge migrated (chain-first infra available)
- **Session 1.5:** verify + tip migrated to chain
- **Session 2:** scan migrated to chain
- **Session 2.5:** react stays API-gated

### Inconsistency Vectors

**1. Data source mismatch (Session 1.5-2):**

After verify and tip are migrated but scan still uses API:
- `scan()` returns posts from the feed API (indexed, may lag behind chain)
- `verify()` checks the chain directly (may see txs not yet in feed)
- `tip()` resolves authors from chain (may see different addresses than feed reports)

**Scenario:** Agent scans feed (API), finds post X with author A. Agent tips post X, but tip resolves author from chain as B (different address format or different field mapping). Tip goes to B instead of A. This is not malicious but could send funds to wrong addresses if the hive-decoder maps `from` differently than `parseFeedPosts` maps `author`.

**2. Migration order matters for security:**

The plan migrates in order: connect -> verify -> tip -> scan -> react. This is **almost correct** but has a subtle issue:

- **Verify should migrate AFTER tip**, not before. Reason: if verify is chain-based but tip still uses feed for author resolution, an agent could verify a tx on-chain (chain says confirmed) but tip resolution falls back to feed API which returns a different/stale author. Verify gave false confidence that the data is trustworthy.

- **react should stay last** (correct in plan). Since it's API-only, migrating it last avoids creating a false impression of chain-first completeness.

**3. Test isolation:**

Mixed-mode testing is fragile. Tests for chain-only verify running alongside API-dependent scan tests creates implicit coupling:
- If the mock API server is down in CI, scan tests fail but verify tests pass -- this inconsistency may mask bugs where verify's chain result disagrees with scan's API result.
- The planned `compatibility-matrix.test.ts` only tests connect states, not cross-tool consistency.

**4. Rollback risk:**

If scan migration fails (Session 2) and must be reverted, verify and tip are already on chain. There's no documented rollback path for partial migration.

### Recommended Mitigations

1. **Migrate verify and tip in the same atomic session** -- do not leave one chain-based and one API-based for author resolution. The plan already groups them in "0.5 session" which is good, but make it explicit: they MUST ship together.
2. **Add a cross-tool consistency test**: scan a post via API, then verify it via chain, then resolve its author via chain. Assert all three agree on txHash, author, and confirmation status.
3. **Document rollback path**: If scan migration breaks, revert scan.ts only. Verify+tip remain chain-first (they're independent of scan's data source).
4. **Feature flag the chain path**: `bridge.preferChain: boolean`. If false, all tools use API (pre-migration behavior). This allows instant rollback without code revert.
5. **Ensure hive-decoder produces identical `author` field** as `parseFeedPosts` -- add a specific test comparing chain-decoded vs API-decoded for the same post.

---

## Summary Matrix

| Vector | Severity | Likelihood | Key Risk |
|--------|----------|------------|----------|
| V1: getTxByHash timing | HIGH | Medium | False negatives during propagation window |
| V2: Malicious RPC node | CRITICAL | Low | Tip theft via forged sender address |
| V3: Undefined reactions | CRITICAL | High | NaN propagation in 6+ code paths, silent data corruption |
| V4: Auth token deps | HIGH | Medium | State machine gap for configured-but-unauthenticated |
| V5: Mixed-mode transition | MEDIUM | Low-Medium | Data source mismatch during multi-session rollout |

## Top 3 Actions Before Migration Begins

1. **Fix Vector 3 first.** The reactions type change has guaranteed downstream breakage. Choose the `reactionsKnown: boolean` approach and fix all 6+ call sites.
2. **Address Vector 2 for tips.** At minimum, add multi-node consensus for tip author resolution. Fund-routing decisions must never trust a single RPC response.
3. **Ship verify + tip atomically** (Vector 5) and add cross-tool consistency tests.
