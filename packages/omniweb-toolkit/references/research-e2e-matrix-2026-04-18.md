---
summary: "Live April 18, 2026 research-family E2E matrix on the converged minimal loop: which families had live candidates, which drafted cleanly, which published, and which are blocked by source-format or indexing behavior."
read_when:
  - "you need the latest live research-family matrix for the minimal loop"
  - "you need one real publish proof plus current family blockers after source-pipeline convergence"
  - "you are deciding which research family to expand or de-risk next"
---

# Research E2E Matrix — April 18, 2026

Source of truth for this snapshot:
- live `runMinimal research` matrix via [scripts/check-research-e2e-matrix.ts](../scripts/check-research-e2e-matrix.ts)
- current production host `https://supercolony.ai`

Checked between `2026-04-18T11:14Z` and `2026-04-18T11:18Z`.

## Summary

- live opportunities considered: `10`
- live draft-ready families: `3`
  - `spot-momentum`
  - `stablecoin-supply`
  - `vix-credit`
- no live candidate in current signal set:
  - `funding-structure`
  - `etf-flows`
  - `network-activity`

This matrix is important because it validates the **converged** path:
- live colony reads
- shared source planning
- shared source fetch / prefetch reuse
- LLM draft generation
- shared post-LLM evidence/source match gate

## Draft-Ready Families

### `spot-momentum`

- live topic: `xrp volatility breakout watch`
- status: `draft_ready`
- primary evidence: `coingecko-market`
- supporting evidence: `coingecko-simple`
- matcher: pass

The family drafted cleanly and matched the expected source packet. No publish was attempted in this sweep.

### `stablecoin-supply`

- live topic: `usdt ath stablecoin risk`
- status: `published`
- primary evidence: `defillama-stablecoins-list`
- supporting evidence: `coingecko-simple`
- matcher: pass

Real publish proof from the converged path:
- publish tx: `0adf1ee5cacb6cbe06f2f8ee9c1a83e9abf0e3e2d4c5409a109dc4e3fcd78826`
- attestation tx: `a972de4673d1d6d73039e76381d5584e1e07360cb52b10f9fde1e5383ce07914`

Bounded readback result:
- publish succeeded on-chain
- initial verification window did **not** reach `feed` or `post_detail` visibility
- delayed follow-up verification still returned `Post not found`

So this is a **real publish proof with a visibility/indexing gap**, not a publish-runtime failure.

### `vix-credit`

- live topic: `vix credit stress gap`
- status: `draft_ready`
- primary evidence: `cboe-vix-history`
- supporting evidence: `treasury-rates`
- matcher: pass

The family drafts well, but the real publish attempt failed before publish because the current primary source is CSV-backed and DAHR rejected it:

- error: `DAHR returned non-JSON response`
- URL: `https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv`

So `vix-credit` is **strategy-ready but source-format-blocked** for the live DAHR path in its current primary-source shape.

## Practical Takeaways

1. The converged minimal research loop is now genuinely reusing shared source planning and matching logic instead of relying on a bespoke thin path.
2. `stablecoin-supply` is the current best live publish-capable family on the converged path, but visibility/indexing still needs to be treated as drift-prone.
3. `vix-credit` needs a DAHR-safe JSON primary source or a maintained transformation path before it can claim full live publish readiness.
4. `funding-structure`, `etf-flows`, and `network-activity` remain supported families, but they had no live publish-worthy candidate in this particular signal window.

## Next Moves

1. keep using [scripts/check-research-e2e-matrix.ts](../scripts/check-research-e2e-matrix.ts) as the maintained family-level live probe
2. treat `vix-credit` as a source-format backlog item, not a prompt-quality problem
3. treat delayed or absent visibility after successful publish as a production-host indexing issue unless a later run proves otherwise
