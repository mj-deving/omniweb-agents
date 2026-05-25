---
summary: "Four-column evidence model for Demos docs-backed hardening lanes."
read_when: ["04c5.5", "readiness evidence model", "Demos docs backed hardening", "no-spend proof"]
owner_bead: "omniweb-agents-04c5.5"
status: "active-model"
date: "2026-05-25"
---

# Hardening Readiness Evidence Model - 2026-05-25

Use this model before promoting any Demos-domain surface from raw inventory or
wrapper existence into a maintained package lane, public API, CLI namespace, live
proof packet, or executable hardening task.

The model is intentionally stricter than the older verification matrix labels.
Existing package code can prove package behavior, but it does not prove official
platform support, SDK import stability, or no-spend safety by itself.

## Required Evidence Columns

Every hardening row must carry these four columns.

1. `official-docs`
   - Official Demos docs, SDK API reference, `llms.txt`, or other
     `docs.kynesys.xyz` source.
   - Missing official docs are recorded as gaps. Do not fill gaps by inference
     from package history or old local inventory.
   - Official docs outrank older package reference limits when they conflict
     unless a newer SDK/source check proves the package-specific exception.

2. `sdk-api-source`
   - Installed SDK import behavior, SDK API reference details, or inspected SDK
     source shape.
   - Import crashes, missing subpath exports, native-module failures, and ESM
     blockers are package-runtime blockers until isolated or fixed.
   - Source construction is not readiness unless lifecycle, fee, signing, and
     readback behavior are also proven.

3. `package-behavior`
   - Current `omniweb-toolkit` exports, wrappers, probes, scripts, manifest
     entries, and package reference behavior.
   - Wrapper existence proves only that the package has code. It does not prove
     that a surface is maintained, no-spend, officially documented, or safe to
     execute.
   - Read wrappers, quote helpers, compile helpers, signing helpers, and execute
     helpers must be classified separately.

4. `no-spend-proof`
   - Committed dry-run, import-only, quote-only, readback-only, or existing-tx
     recheck evidence that does not spend, upload, broadcast, mutate identity,
     create hosted infrastructure, or touch secrets.
   - A tx hash alone is chain evidence, not product success. Product readback or
     an explicit degraded verdict is required for write lifecycle claims.
   - Spendful wrapper tests, payload construction, and local deterministic
     address calculation do not count as no-spend proof.

## Verdict Vocabulary

- `maintained`: all four columns support a package-owned surface and its safety
  boundaries.
- `maintained-read`: maintained read path only; no write or mutation readiness.
- `preview-green`: no-spend preview passed, but live execution still needs a
  later packet with explicit target, budget, command, readback, and stop rules.
- `raw-only`: official or SDK behavior exists, but the package should not claim
  a maintained wrapper yet.
- `design-needed`: namespace, units, quote shape, compile shape, lifecycle,
  policy, or readback semantics are not designed enough for package promotion.
- `degraded`: chain or runtime evidence exists, but product readback,
  lifecycle, or supported wrapper evidence is incomplete.
- `blocked`: required official docs, SDK/source behavior, package behavior, or
  no-spend proof is missing or failing.
- `excluded`: intentionally out of the current proof lane even if some evidence
  exists.

## Promotion Rules

- Do not promote a surface to `maintained` unless all four columns are green or
  explicitly scoped.
- Do not mix read-only, quote-only, compile-only, execute, spend, upload,
  signing, cross-chain, and product-readback paths in one verdict.
- Do not treat official domain existence as package readiness.
- Do not treat package wrapper existence as no-spend proof.
- Do not treat old proof packets as live authority after their packet closed.
- Do not create a live packet unless the row already names target, budget,
  command, mutation or tx evidence, product readback criteria, stop rules, and
  ledger impact.

## Current 04c5 Rows

Storage Programs:

- `official-docs`: present. Current official docs describe Storage Programs and
  list 128KB payload, 64 nesting levels, and 256-character keys.
- `sdk-api-source`: storage subpath imports under Bun; static helpers exist.
- `package-behavior`: maintained read wrappers exist; write probes are isolated.
- `no-spend-proof`: green no-spend storage preview exists with no broadcast.
- verdict: `maintained-read`, `preview-green`, `design-needed` for broad writes.

IPFS:

- `official-docs`: missing named official IPFS page from the docs index.
- `sdk-api-source`: installed SDK IPFS subpath is not importable under Bun.
- `package-behavior`: upload, pin, and unpin wrappers are spendful write paths.
- `no-spend-proof`: quote path returned `Unknown message`; no owned CID or
  readback proof exists.
- verdict: `blocked`, `raw-only`.

Escrow:

- `official-docs`: missing named official Escrow page from the docs index.
- `sdk-api-source`: installed SDK escrow subpath is not importable under Bun.
- `package-behavior`: send, claim, and refund are mutations; read wrappers are
  best-effort and currently degraded.
- `no-spend-proof`: existing tx recheck remains degraded because product
  claimable/balance readback is unsupported or inconclusive.
- verdict: `degraded`, `blocked`, `design-needed`.

XM:

- `official-docs`: present for cross-chain/XM concepts and supported chains.
- `sdk-api-source`: import path crashes through native module loading in Bun.
- `package-behavior`: no package namespace, CLI, manifest entry, or fixture.
- `no-spend-proof`: static/import evidence only; no read fixture or gas/wallet
  model.
- verdict: `raw-only`, `blocked`, `design-needed`.

Rubic:

- `official-docs`: present for quote and execute bridge flows.
- `sdk-api-source`: bridge import behavior is unstable in the current runtime.
- `package-behavior`: no bridge namespace, quote helper, execute helper, slippage
  policy, or readback contract.
- `no-spend-proof`: no committed no-wallet quote fixture exists.
- verdict: `raw-only`; quote is `design-needed`; execute is `blocked`.

DemosWork:

- `official-docs`: present for scripts, work steps, and operation order.
- `sdk-api-source`: import crashes or ESM blockers prevent safe package runtime
  use.
- `package-behavior`: no package API, CLI, manifest entry, compile helper, or
  runner.
- `no-spend-proof`: static inventory only; no deterministic compile fixture or
  execution/readback proof.
- verdict: `raw-only`, `blocked`, `design-needed`.

## Next-Lane Gate

The next executable hardening lane should choose the narrowest row where the
four columns show the most real progress and the live boundary can remain
no-spend first. Based on the 04c5 rows, escrow readback wrapper hardening remains
the default candidate because it has an existing tx and a concrete degraded
readback blocker, but it must stay readback-only until a later packet explicitly
authorizes any send, claim, refund, or DEM spend.
