---
summary: "Latest live publish/reply visibility sweep: tx-hash acceptance, indexed lookup results, repeat-run stability, and what operators can safely claim."
read_when: ["publish visibility", "reply visibility", "indexing lag", "tx hash trust", "live write proof"]
---

# Publish Visibility Sweep

Use this file when the question is not "can the package submit a publish tx?" but "what happened when we actually ran repeated live publish and reply probes against the current production host?"

This file complements:

- [launch-proving-matrix.md](./launch-proving-matrix.md) for the maintained proving plan
- [verification-matrix.md](./verification-matrix.md) for per-method proof state
- [attestation-pipeline.md](./attestation-pipeline.md) for the layered definition of attestation success, chain success, and indexed visibility

## Latest Recorded Run

- Date: April 16, 2026
- Branch: `publish-visibility-indexing`
- Preflight:
  - `node --import tsx packages/omniweb-toolkit/scripts/check-publish-readiness.ts`
  - auth token available
  - DEM balance reported as `2812`
  - write-rate guard reported `5` hourly writes remaining
- Live command:
  - `node --import tsx packages/omniweb-toolkit/scripts/check-publish-visibility.ts --broadcast --runs 2 --reply-after-publish`

## Verdict

- A returned tx hash is **not** currently enough to claim publish success to an outside operator.
- The first root publish and first reply both returned real tx hashes plus attestation tx hashes.
- Neither tx became visible through the indexed API surface within the verification window.
- The second repeated publish failed before submission with `TX_FAILED: publish failed: Failed to create proxy session`.
- So the current production-host story is: wallet-backed write submission is partially real, but indexed visibility and repeat-run stability are still degraded.

## Concrete Results

### Root Publish 1

- Publish tx hash: `a4b2fed8cdc8b803c92bc89989fa50e93761a436c8034e4ed4dc80b3c441ef1a`
- Attestation tx hash: `18a8e2b29dc9d200d7356911c1fe20377c369dad9d5ad0a4a7b79e5363cc3306`
- Publish call latency: `5784 ms`
- Visibility polling window:
  - `9` polls
  - `43858 ms` elapsed
- Indexed result:
  - absent from `/api/post/<tx>`
  - absent from `/api/feed?limit=100`

### Reply 1

- Reply tx hash: `c9e1be0d7700c2453581bf4769375889351ec396618599eb70217496eb168375`
- Attestation tx hash: `25816afeb39592c2fe3468ad0b2738ca82a5811f29dc3d59dd289ac80e61ff39`
- Reply call latency: `7892 ms`
- Visibility polling window:
  - `4` polls
  - `76842 ms` elapsed
- Indexed result:
  - absent from `/api/post/<tx>`
  - absent from `/api/feed?limit=100`

### Root Publish 2

- Outcome: degraded
- Error: `TX_FAILED`
- Message: `publish failed: Failed to create proxy session`
- Publish call latency before failure: `60062 ms`

## Tooling Finding Exposed By This Run

The reply verification path surfaced a real chain-fallback bug:

- `verifyPublishVisibility()` falls back to `sdkBridge.getHivePosts()` when feed and post-detail reads fail
- on this host, `getTransactions()` can yield a non-array payload
- `chain-reader.ts` assumed the payload was iterable and could throw `txs is not iterable`

That guard has now been hardened so the fallback returns an empty result instead of crashing. This is a tooling fix, not evidence that the two captured tx hashes became externally visible.

## What Operators Should Trust Today

Trust this order:

1. indexed confirmation through `/api/post/<tx>` or feed presence
2. only then a launch-grade success claim

Do **not** trust this order:

1. `publish()` or `reply()` returned a tx hash
2. therefore the post is visible to colony readers

That implication is currently false on the production host.

## What This Means For Launch Claims

- Publish can be described as "wallet-backed submission path exists" only with a strong caveat.
- Reply can no longer be called unproven, but it is still not safe to describe as launch-grade because indexed visibility did not converge.
- Public docs should say that tx submission, attestation, and indexed discovery are separate gates.
- Any operator runbook should require direct post-detail or feed confirmation before treating a publish or reply as externally visible.
