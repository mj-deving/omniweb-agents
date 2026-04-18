---
summary: "Root-cause analysis memo for research publish readback misses — PR #125-#127 review, indexed vs missing tx forensics, doc audit, and recommended next probe."
read_when: ["readback root cause", "indexing miss diagnosis", "publish verification audit", "research readback memo"]
---

# Research Readback Root-Cause Memo — April 18, 2026

## 1. PR Review Findings (B1)

### PR #125 (fsg.1): "Document research readback divergence"

**State**: OPEN, targeting `main`. 14 files changed.

No behavioral regressions found. Adds the `check-post-readback.ts` probe script and the `research-readback-divergence-2026-04-18.md` reference doc. Clean Codex review (thumbs-up, no specific suggestions).

**Finding — merge conflict hazard**: 11 files overlap between #125 and #126, both targeting `main`:

- `config/sources/catalog.json`
- `packages/omniweb-toolkit/SKILL.md`
- `packages/omniweb-toolkit/TOOLKIT.md`
- `packages/omniweb-toolkit/references/topic-coverage-sweep-2026-04-18.md`
- `packages/omniweb-toolkit/src/research-draft.ts`
- `packages/omniweb-toolkit/src/research-family-dossiers.ts`
- `packages/omniweb-toolkit/src/research-source-profile.ts`
- `src/lib/sources/providers/specs/treasury.yaml`
- `tests/packages/minimal-attestation-plan.test.ts`
- `tests/packages/research-draft.test.ts`
- `tests/packages/research-source-profile.test.ts`

Whichever lands first will force a rebase on the other. These are additive changes (not conflicting edits to the same lines in most cases), but the overlap still requires a serial merge strategy.

### PR #126 (fsg.2): "Add author feed publish fallback"

**State**: OPEN, targeting `main`. 16 files changed.

**Core behavioral change**: Adds `author_feed` as a third verification path in `publish-visibility.ts`. The cascade becomes: generic feed → post_detail → author_feed → chain. Only activates when `omni.address` is set. Also extends `PublishVisibilityOmni` with `address?: string` and `getFeed` with `author?: string`.

No regressions found. The `author_feed` path is correctly guarded. Test coverage added in `publish-visibility.test.ts`. Clean Codex review.

### PR #127 (fsg.3): "Record research verification rerun"

**State**: OPEN, stacked on #126 (base = `omniweb-agents-fsg.2`). 41 files changed.

**Finding — scope creep**: This PR mixes at least five distinct concerns:

1. Rerun documentation (small, appropriate for stacking)
2. Starter.ts rewrite (+288/-71 across three locations)
3. New research modules: `research-colony-substrate.ts`, `research-self-history.ts`, `research-source-match.ts`, `research-opportunities.ts`, `research-evidence.ts` expansion
4. Further `publish-visibility.ts` hardening: `readFeedMatch` helper, `feedScope` field, category-scoped feed after post_detail
5. Policy module overhaul: `src/toolkit/sources/policy.ts` (+163/-94)

This is well beyond "one bead = one branch = one PR" scope. The rerun doc stacking is valid, but items 2-5 should have been separate PRs.

The `readFeedMatch` helper is a clean DRY extraction. The `feedScope` field and category-scoped feed path are sound and address the `0adf1ee5` stablecoin readback finding. No regressions in the publish-visibility hardening itself.

Clean Codex review on all three PRs.

### Merge Order Recommendation

1. Merge #125 first (documentation + probe tooling only)
2. Rebase and merge #126 (the behavioral author_feed change)
3. Split #127: land the rerun doc on top of #126, defer the starter rewrite and new modules to separate PRs

## 2. Indexed vs Missing TX Forensics (B2)

### Data Table

**Indexed (recovered via authenticated post_detail and/or author-scoped feed):**

| tx (short) | family | block | score | post_detail (auth) | author_feed | initial verification |
|---|---|---|---|---|---|---|
| `0adf1ee5` | stablecoin-supply | 2109004 | 80 | yes | yes | FAILED (lastIndexed: 2109003) |
| `44f24253` | funding-structure | 2108918 | 80 | yes | yes | SUCCEEDED via post_detail |
| `b9f72cf4` | older | 2105432 | 80 | yes | yes | not in generic window |
| `e7e12d6a` | launch proof | 2102086 | 80 | yes | yes | not in generic window |

**Missing (not found even with authenticated endpoints):**

| tx (short) | family | block (est.) | score | post_detail (auth) | author_feed | initial verification |
|---|---|---|---|---|---|---|
| `835a6c5c` | spot-momentum/xrp | ~2109138 | n/a | 404 | absent (limit=250) | FAILED |
| `a4edc442` | vix-credit | ~2109138 | n/a | 404 | absent (limit=250) | FAILED |
| `fd868d54` | vix-credit | ~2109139 | n/a | 404 | absent (limit=250) | FAILED |

### Shared Factors

- **Category**: ALL seven txs are `ANALYSIS`. Category is not a differentiator.
- **Attestation**: ALL seven have valid DAHR attestation txs. Attestation presence is not a differentiator.
- **Publish latency**: Indexed: 4.9-7.7s. Missing: 4.9-27s. Mostly overlapping, though `fd868d5` had unusually high 27s latency.

### Differentiating Factors

1. **Block height**: Indexed txs span blocks 2102086-2109004. Missing txs cluster at blocks 2109138-2109139. There's a ~134-block gap between the latest indexed tx and the first missing tx.

2. **Timing**: The indexed `44f24253` was published at ~10:41 UTC. The missing txs were all published between ~13:40-14:39 UTC — approximately 3-4 hours later on the same day.

3. **`lastIndexedBlock`**: The indexer reported `lastIndexedBlock: 2109138-2109139` during the missing-tx verification windows. This means the indexer claims to have reached those blocks but did NOT index the posts. This is the strongest signal — it rules out simple "indexer hasn't caught up yet" explanations.

4. **Feed volume**: The feed sample from the k2r run (published at ~14:14 UTC) shows the generic feed was dominated by FEED-category bot posts from `0x4dd919...` with many duplicate titles posted milliseconds apart. High FEED-category volume was pushing ANALYSIS posts out of the generic feed window, but this explains only the generic-feed miss, not the post_detail 404.

### Falsifiable Hypotheses

**H1: Indexer tx-type blind spot** (Confidence: 45%)
The indexer processes blocks but has a selective filter on transaction types. Some Demos SDK publish transactions may use a different on-chain encoding or method signature than the indexer expects. The later publishes hit a different code path in the SDK (possibly due to different worktree SDK states or a subtle SDK version difference).

*Falsification*: Query the raw chain for the three missing tx hashes directly (via Demos RPC, not the SuperColony API). Compare the raw transaction format byte-for-byte with the indexed txs. If the on-chain format is identical, this hypothesis is eliminated.

**H2: Indexer reorg/gap during specific block range** (Confidence: 30%)
The indexer experienced a brief disruption, restart, or reorg handling error in the block range 2109005-2109140. It advanced its `lastIndexedBlock` counter past these blocks but didn't fully process the hive transactions within them. This is a known failure mode in block-indexing systems.

*Falsification*: Query the chain for additional hive posts from other agents in the block range 2109100-2109200. If OTHER agents' posts from the same block range are indexed normally, this hypothesis weakens significantly. If they're also missing, it strengthens.

**H3: Rate limiting or dedup on the write path** (Confidence: 15%)
The publish endpoint accepted the transactions and returned valid tx hashes, but a rate limiter or deduplication check on the indexer side silently dropped them. The three missing txs were all published within ~1 hour of each other, and two of them are on the same topic (vix-credit).

*Falsification*: Check if the two vix-credit txs have sufficiently different text content. If they do (and they appear to from the /tmp artifacts — different drafts), content-dedup is unlikely. Check publish rate limits in the Demos SDK or SuperColony docs.

**H4: Transient indexer outage in the afternoon window** (Confidence: 10%)
The indexer was down or degraded specifically during the 13:30-15:00 UTC window on April 18. Posts published during this window were accepted on-chain but never picked up by the indexer.

*Falsification*: Wait 24-48 hours and recheck the three missing txs via authenticated post_detail. If they appear later, it was a transient delay. If they remain missing after 48 hours, the index for those blocks is permanently incomplete.

## 3. Doc/Skill Audit (B3)

### publish-proof-protocol.md — WELL ENCODED

The Visibility Confirmation Policy section explicitly covers:

- Three-layer confirmation (attestation → chain → indexed)
- Author-scoped feed as a maintained fallback path
- Generic feed windowing pressure and category-scoped follow-up
- How to record honest intermediate states

**Verdict**: This doc fully encodes the auth-gating and author-feed fallback doctrine.

### SKILL.md — GAP: auth-gating not surfaced

`getPostDetail` is listed as a core method but there is no note that it is auth-gated on the public surface. A consumer reading only SKILL.md would attempt unauthenticated `getPostDetail` calls and misinterpret `401` as "post not found."

**Specific gap**: The "Core Methods" section lists `getPostDetail` alongside `getFeed` and `getRss` without distinguishing access requirements.

### GUIDE.md — GAP: readback doctrine absent

GUIDE.md is the methodology guide for agent loop behavior. It covers post quality, scoring patterns, and category selection, but does NOT mention:

- That `post_detail` is auth-gated
- That generic feed checks are first-window only
- That author-scoped feed is the fallback for self-published posts
- How to interpret verification results

**Impact**: An agent following GUIDE.md alone would have no readback doctrine and would not know to use author-scoped feed for self-verification.

### TOOLKIT.md — ADEQUATE (pointer-level)

Lists `check-publish-visibility.ts` and references `feed-readback-divergence`, `publish-proof-protocol.md`. Does not inline the auth-gating doctrine, but points to the right docs.

### verification-matrix.md — PARTIAL

Notes `getFeed`/`getPostDetail` as `verified` and publish as `basic`, but does not explicitly note auth-gating of `post_detail` or the distinction between the three feed scopes.

### Doc Audit Summary

| Doc | Auth-gating encoded | Author-feed fallback encoded | Feed windowing encoded |
|---|---|---|---|
| publish-proof-protocol.md | YES | YES | YES |
| SKILL.md | NO | NO | NO |
| GUIDE.md | NO | NO | NO |
| TOOLKIT.md | pointer only | pointer only | pointer only |
| verification-matrix.md | NO | NO | NO |
| research-readback-divergence doc | YES | YES | YES |
| feed-readback-divergence doc | n/a | n/a | YES |

The doctrine is well-documented in the deep reference files but not surfaced in the consumer-facing entry points (SKILL.md, GUIDE.md).

## 4. Recommended Next Probe

### Minimized probe: chain-side tx format comparison

**Goal**: Confirm or eliminate H1 (indexer tx-type blind spot) and H2 (indexer block-range gap).

**Steps**:

1. Use the Demos SDK directly (not the SuperColony API) to fetch the raw chain transaction for one indexed tx (`44f24253`) and one missing tx (`835a6c5c`)
2. Compare: method signature, payload encoding, field names, field order
3. Independently, query the chain for ANY hive posts in block range 2109130-2109145 (from any agent) and check whether those are indexed
4. Recheck the three missing txs via authenticated `post_detail` to see if they've appeared after a delay

**Expected outcome**: If the chain tx formats are identical and other posts in the same block range are indexed, H1 and H2 are eliminated and the issue narrows to an indexer-specific content filter or transient processing error.

**Who should implement**: This is a runtime/indexer investigation, not a toolkit code change. Codex can implement the probe as a script, but the findings may point to a SuperColony platform issue that requires upstream engagement.

## 5. Conclusion

The verifier hardening in PRs #125-#127 is behaviorally correct. The author-feed fallback works as designed. The remaining readback misses are genuine indexer-side failures, not toolkit bugs.

The immediate next step is the chain-side tx format comparison probe. If that eliminates H1/H2, the toolkit's only remaining action is to surface the auth-gating and author-feed doctrine in SKILL.md and GUIDE.md (a doc-only change).
