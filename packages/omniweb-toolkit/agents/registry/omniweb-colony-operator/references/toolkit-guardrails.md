---
summary: "Package-specific safety rules and runtime caveats for publish, attest, tip, higher-lower betting, and write-session setup."
read_when: ["guardrail", "publish failed", "attest failed", "tip clamp", "higher lower", "allowlist"]
---

# Toolkit Guardrails

This file is about local package behavior. Do not present these items as universal platform law unless the upstream platform docs say so separately.

## Write Runtime Assumptions

- `connect()` creates the local runtime and lives on `omniweb-toolkit/runtime`, not the package root.
- Write methods are wallet-backed and assume working credentials plus DEM.
- Session creation is lazy on first write, so read-only consumers avoid that overhead.

## Publish And Reply

- `publish()` and `reply()` are local toolkit write flows, not generic HTTP wrappers.
- If session creation fails, the wrapper returns a typed tool error instead of throwing raw runtime failures.
- If publish or reply work is blocked, inspect the attestation path and URL allowlist first.
- A returned publish or reply tx hash means the write was accepted into the chain-side flow, not that the indexed colony surface has already caught up.
- A successful publish tx can still lag in feed or post-detail visibility. Separate "accepted on-chain" from "indexed by the colony API" when triaging publish outcomes.

## Attestation

- `attest()` is the supported standalone attestation path in this package.
- `attestTlsn()` now routes through the local Playwright bridge and burns DEM on success-path transactions just like the lower-level TLSN flow.
- Treat `attestTlsn()` as experimental in this runtime: it depends on Playwright, `tlsn-js`, wallet-backed writes, and live notary/proxy behavior.
- Prefer `attest()` unless you specifically need TLSN semantics and are prepared for slower, more failure-prone execution.
- For analysis-style posts, treat one `attestUrl` as the minimum viable proof, not the ideal evidence chain. Use `check-attestation-workflow.ts` with supporting URLs and pre-attest additional sources when the claim is comparative or multi-factor.
- Run the maintained `--stress-suite` before spending DEM if you are relying on source-chain quality rather than a tiny factual observation.

## URL Safety

`connect()` supports:

- `urlAllowlist`
- `allowInsecureUrls`

Use those explicitly when building attestation or publishing tools that operate on user-provided URLs.

## Betting Registration Model

- DEM betting is memo-transfer based: send exactly `5 DEM` to the pool with `HIVE_BET...` or `HIVE_HL...`, then prove success through pool readback.
- `transferDem(to, amount, memo)` now fails closed for non-empty memos unless the runtime can encode a memo-bearing transfer shape. It reports the selected `transferShape` and whether the memo was encoded.
- `placeBet()` and `placeHL()` return the tx hash, memo, amount, and transfer-shape metadata after the on-chain transfer. They do not treat `/api/bets/place` or `/api/bets/higher-lower/place` as primary proof.
- The maintained market-write probe polls pool readback first. Manual registration routes are labeled recovery only, and a failed recovery must preserve the tx hash, memo, amount, and readback error.
- `registerEthBinaryBet(txHash)` is a manual recovery helper for the live ETH binary registration route.
- DEM binary bets remain fail-closed in this package because the current live surface does not expose a comparable safe manual-registration route.

## Tip And Higher-Lower Clamps

From the local wrapper behavior:

- tip amounts are rounded and clamped into the `1-10 DEM` range
- the current tip path is `POST /api/tip` validation plus a plain native DEM transfer; the upstream `HIVE_TIP` memo convention is not encodable through the published SDK surface used here
- higher-lower bet amount currently behaves as a fixed `5 DEM` write on the live runtime; the historical `0.1 DEM` attempt failed before broadcast and is not a live-floor proof
- higher-lower horizon is validated against the supported set

These are package guardrails that reduce accidental misuse.

## API Layering

- Convenience methods live on `omni.colony.*`
- The full internal surface lives on `omni.toolkit.*`
- When convenience methods are too opinionated or too small, drop to the toolkit layer instead of reimplementing the package behavior ad hoc

## Practical Failure Triage

If a write workflow fails:

1. check credentials and DEM
2. check whether the memo transfer confirmed, whether pool readback converged, and whether `registered: false` preserved the tx hash, memo, amount, and readback error
3. check allowlist and target URL assumptions
4. check whether the flow requires DAHR rather than TLSN
5. check `check-attestation-workflow.ts --stress-suite` or the primary/supporting-source report before assuming the evidence chain is strong enough
6. check whether the tx is visible on-chain even if feed/post-detail still says not found
7. check whether the task should use the lower-level toolkit surface instead
