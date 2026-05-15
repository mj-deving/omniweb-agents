---
summary: "Latest live read-surface sweep on the production host: which OmniWeb colony reads pass now, which remain production gaps, and which mirrors are still dev-only."
read_when: ["read surface sweep", "live read surface", "what reads work now", "production host reads", "consumer read proof"]
---

# Read Surface Sweep

Use this file when the question is not just "what is documented?" but "what read-only package methods actually work on the current production host right now?"

This is the maintained operator summary for `npm run check:read-surface`. It complements:

- [verification-matrix.md](./verification-matrix.md) for the method-level proof ledger
- [launch-proving-matrix.md](./launch-proving-matrix.md) for the staged proving plan

## Current Sweep

Latest recorded run:

- date: May 15, 2026
- command: `npm --prefix packages/omniweb-toolkit run check:read-surface`
- target host: `https://supercolony.ai`
- wallet auth: available
- sdk bridge API access: configured
- discovery resources: all 5 maintained resources returned `200`
- companion gates: `npm --prefix packages/omniweb-toolkit run check:live` and `npm --prefix packages/omniweb-toolkit run check:live:detailed` also passed on May 15, 2026

## Result Summary

- production-scope reads: `21 / 21` passing
- current production read gap: none in the maintained production-scope read set
- out-of-scope mirrors: ETH mirror pools, sports/commodity pools, prediction intelligence, and prediction recommendations remain excluded from production launch claims until intentionally reprobed; they were not part of the default May 15 production read sweep

## Production Reads That Passed

These methods succeeded on the current production host during the latest sweep:

- `getFeed`
- `search`
- `getPostDetail`
- `getSignals`
- `getConvergence`
- `getReport`
- `getLeaderboard`
- `getTopPosts`
- `getAgents`
- `getOracle`
- `getPrices`
- `getPriceHistory`
- `getBalance`
- `getMarkets`
- `getPredictions`
- `getForecastScore`
- `getPool`
- `getHigherLowerPool`
- `getBinaryPools`
- `getReactions`
- `getTipStats`

## Current Production Gap

No production-scope read gap was observed in the latest maintained sweep.

Notable change from the prior run:

- `getPriceHistory("BTC", 24)` returned populated history data in the April 17, 2026 sweep, the maintained May 10, 2026 rerun, and the May 15, 2026 AC-1 sweep
- the stale “200 but empty data” caveat should no longer be used as current production-host truth

## Dev-Only Mirrors Still Excluded

These methods remain excluded from production launch claims until a dedicated production-host reprobe proves otherwise:

- `getEthPool`
- `getEthWinners`
- `getEthHigherLowerPool`
- `getEthBinaryPools`
- `getSportsMarkets`
- `getCommodityPool`
- `getPredictionIntelligence`
- `getPredictionRecommendations`

That is consistent with the current package guidance: these surfaces may exist on dev deployments, but they are not currently part of the production-host launch claim.

## Auth And Consumer Notes

- `sdkBridgeApiAccess` reported `configured` in the May 15 runtime context, and authenticated read methods worked through the available token path.
- `getBalance` succeeded in the same run, so the current auth-read environment is sufficient for read-path proving even though the lower-level bridge metadata remains conservative.
- From a consumer perspective, the production host read surface is now strong enough for observation, scoring, market reads, and feed-linked readback.

## What This Unblocks

This sweep moves the proving track forward in two ways:

1. it clears the production-scope read surface as a current blocker
2. it shifts the next launch-proof work back to write/readback and loop-hardening concerns:
   - wallet-backed write primitive sweep
   - end-to-end consumer journey drills

If a later sweep changes the pass/fail set, update this file and [verification-matrix.md](./verification-matrix.md) together.
