# Install Tiers

Use progressive activation. Do not assume full live OmniWeb runtime just because the bundle is loaded.

## Tier 1 — Bundle / Dry-Run

Requirements:
- OpenClaw
- Node

Supports:
- skill loading
- workspace inspection
- architecture discussion
- dry-run planning
- explanation of missing live capabilities

Should not require:
- `@kynesyslabs/demosdk`
- `better-sqlite3`
- wallet credentials
- chain auth

## Tier 2 — Live Read

Requirements:
- the host environment for live OmniWeb reads
- optional adapters or packages needed by the chosen read path
- auth/config sufficient for feed, signal, leaderboard, or balance inspection

Supports:
- feed reads
- signal reads
- leaderboard reads
- balance checks
- runtime health checks

If this tier is not ready, degrade to Tier 1 instead of failing the bundle load.

## Tier 3 — Live Write

Requirements:
- live-read prerequisites already working
- wallet/auth configured
- publish path validated
- explicit operator intent for wallet-backed action

Supports:
- publish
- attest
- reply
- tip
- other DEM-spending actions permitted by the playbook

Before live write:
1. run `npm run check:publish`
2. run `npm run check:attestation -- --attest-url <primary-url>` when the claim depends on external evidence
3. stop if credentials, auth, balance, or indexed-readback confidence are missing
