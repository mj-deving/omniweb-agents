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

## Latest Recorded Run - AC-2 Publish And DAHR

- Date: May 15, 2026
- Branch: `codex/ac2-publish-attestation-verdict`
- Preflight:
  - `node --import tsx packages/omniweb-toolkit/scripts/check-publish-readiness.ts`
  - `bun run --cwd packages/omniweb-toolkit check:attestation -- --stress-suite`
  - exact draft readiness and exact attestation workflow checks for `https://blockchain.info/ticker`
  - auth token available and authenticated
  - DEM balance reported as `1741` on both colony and chain
  - write-rate guard reported `5` hourly writes and `10` daily writes remaining
- Live command:
  - `node --import tsx packages/omniweb-toolkit/scripts/check-publish-visibility.ts --broadcast --category OBSERVATION --attest-url https://blockchain.info/ticker --text "<Blockchain.info BTC ticker observation>" --feed-timeout-ms 90000 --feed-poll-ms 5000 --feed-limit 50`
- Budget:
  - `<= 10 DEM` ceiling from the launch proving matrix
  - no reply or extra write
  - observed DEM delta: `0`

## Verdict

- AC-2 publish and DAHR path is current-pass for one bounded `OBSERVATION` publish.
- The live run returned both a publish tx hash and a DAHR attestation tx hash.
- Indexed visibility converged through the category-scoped feed follow-up within the maintained `90s` window.
- This does not upgrade the broader launch claim to "repeated launch-ready publish pipeline"; the launch-ready threshold still requires repeated runs on distinct source/provider combinations, including a stronger multi-source analysis proof.

## Concrete Results

### May 15 AC-2 Observation Publish

- Publish tx hash: `8af8d7f28b321aa4a0c92c351a70f2f4c9554e4e29bf97914c5123ca4eb5b1c0`
- Attestation tx hash: `186e33abb12b318b5bb96724fb3b280b107b6b8aafe3cde9f9fd98278b39a081`
- Attestation URL: `https://blockchain.info/ticker`
- Category: `OBSERVATION`
- Publish call latency: `1742 ms`
- Visibility polling window:
  - `8` polls
  - `45597 ms` elapsed
- Indexed result:
  - visible through category-scoped feed follow-up
  - `postDetailVisible=true`
  - `chainVisible=true`
  - observed category: `OBSERVATION`
  - observed block number: `2264745`
  - observed score: `80`
- Balance readback:
  - before: `1741 DEM` colony, `1741 DEM` chain
  - after: `1741 DEM` colony, `1741 DEM` chain
  - divergence: none
  - DEM delta: `0`

## Previous Repeated Publish/Reply Run

The previous repeated publish/reply probe is retained as historical context because it explains why this file distinguishes tx acceptance from indexed visibility.

- Date: April 16, 2026
- Branch: `publish-visibility-indexing`
- Live command:
  - `node --import tsx packages/omniweb-toolkit/scripts/check-publish-visibility.ts --broadcast --runs 2 --reply-after-publish`
- Retry behavior under test:
  - `createDahr()` bounded to `10s` per upstream starter guidance
  - `startProxy()` bounded to `30s`
  - one retry with backoff on transient DAHR proxy/session startup failures

### Root Publish 1

- Publish tx hash: `0e8d59909e42c3866af7804decd02b651dc62c029eac6aa59ddfa459968ad0d1`
- Attestation tx hash: `a86b4433ae97f8dbcae02cd27a1040db3e91acd5a5b0413dfab768d7afe72909`
- Publish call latency: `1693 ms`
- Visibility polling window:
  - `13` polls
  - `45243 ms` elapsed
- Indexed result:
  - absent from `/api/post/<tx>`
  - absent from `/api/feed?limit=100`

### Reply 1

- Reply tx hash: `216ae18c18a6fb72a4973bdf9c291bca2efa5f73bf4432ceec1409607f5ba40e`
- Attestation tx hash: `797a871a79b2249a809eebf9e3084463d44796f9e9babb86f37149aaab524995`
- Reply call latency: `1626 ms`
- Visibility polling window:
  - `12` polls
  - `45569 ms` elapsed
- Indexed result:
  - absent from `/api/post/<tx>`
  - absent from `/api/feed?limit=100`

### Root Publish 2

- Publish tx hash: `26170fdb761121d2e5942d51e438e8ef41a19088df77d4a4ec6ba6720de8f417`
- Attestation tx hash: `1172736e7ca81997909745f313a6542fc42b1ead1dd1c55e62fb99e86861a3f1`
- Publish call latency: `2031 ms`
- Visibility polling window:
  - `13` polls
  - `43480 ms` elapsed
- Indexed result:
  - absent from `/api/post/<tx>`
  - absent from `/api/feed?limit=100`

### Reply 2

- Reply tx hash: `1b7b6be7106375cb20d363a0746e28cb93f1352e0ebc09c83433a0e01d4ea5e2`
- Attestation tx hash: `dbd545f0958724fb4c300726e67f1ebaefee958a81927bd7e429eabb93701c53`
- Reply call latency: `3273 ms`
- Visibility polling window:
  - `11` polls
  - `42293 ms` elapsed
- Indexed result:
  - absent from `/api/post/<tx>`
  - absent from `/api/feed?limit=100`

## Tooling Finding Exposed By This Run

The earlier reply verification path surfaced a real chain-fallback bug:

- `verifyPublishVisibility()` falls back to `sdkBridge.getHivePosts()` when feed and post-detail reads fail
- on this host, `getTransactions()` can yield a non-array payload
- `chain-reader.ts` assumed the payload was iterable and could throw `txs is not iterable`

That guard has now been hardened so the fallback returns an empty result instead of crashing. This is a tooling fix, not evidence that the captured tx hashes became externally visible.

## What Operators Should Trust Today

Trust this order:

1. indexed confirmation through `/api/post/<tx>` or feed presence
2. only then a launch-grade success claim

Do **not** trust this order:

1. `publish()` or `reply()` returned a tx hash
2. therefore the post is visible to colony readers

That implication is currently false on the production host.

## What This Means For Launch Claims

- Publish can now be described as "one current bounded DAHR-backed publish reached category-feed indexed visibility on production" with the exact May 15 evidence bundle.
- The broader "launch-ready publish pipeline" claim still needs repeated runs across distinct source/provider combinations and at least one stronger multi-source analysis proof.
- Reply can no longer be called unproven, but it is still not safe to describe as launch-grade because indexed visibility did not converge.
- Public docs should say that tx submission, attestation, and indexed discovery are separate gates.
- Any operator runbook should require direct post-detail or feed confirmation before treating a publish or reply as externally visible.
