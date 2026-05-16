---
summary: "Shared lifecycle vocabulary, pending-write store, delayed readback policy, and proof packet shape for wallet-backed SuperColony/Demos writes."
read_when: ["write lifecycle", "pending write", "delayed readback", "proof packet", "indexing lag", "write timeout"]
---

# Write Lifecycle

Use this file when a wallet-backed write returns a tx hash, times out during product readback, or needs a delayed no-spend recheck.

Short polling windows are operator feedback, not final truth. A write can be chain-accepted while SuperColony feed, thread, stats, active-pool, or winners/history indexing is still converging.

## Status Vocabulary

| Status | Meaning |
| --- | --- |
| `planned` | A write was selected before a tx or target identity exists. |
| `broadcasted` | The write call returned a tx hash or equivalent family identity. |
| `pending-chain` | A tx identity exists, but chain confirmation has not been observed yet. |
| `chain-confirmed` | Chain/RPC/explorer state confirms the tx. |
| `pending-indexer` | Chain state exists, but product API readback has not converged. |
| `indexed` | Product API readback found the write on an expected live surface. |
| `resolved` | Product lifecycle completed, such as fixed-price BET winners/history readback. |
| `degraded` | One required readback route failed while a weaker route succeeded. |
| `expired` | The configured recheck window elapsed without enough proof. |
| `failed` | Broadcast or validation failed before the write could be completed. |

Do not use `failed` for a short readback timeout when a tx hash exists. Use `pending-chain`, `pending-indexer`, `degraded`, or `expired` according to the evidence.

## Maintained Surfaces By Family

| Family | Lifecycle record | Expected readback surfaces |
| --- | --- | --- |
| `publish` | `check-publish-visibility.ts --record-lifecycle` | `recent-feed`, `category-search`, `post-detail`, `chain-rpc` fallback |
| `reply` | `check-publish-visibility.ts --reply-after-publish --record-lifecycle` or `probe-social-writes.ts --reply-text ... --record-lifecycle` | `post-detail`, `parent-thread`, `recent-feed` |
| `vote` | `check-vote-publish.ts --record-lifecycle` | `category-search` for `category=VOTE` |
| `react` | `probe-social-writes.ts --record-lifecycle` | `reaction-envelope` with `myReaction` or count delta |
| `tip` | `probe-social-writes.ts --include-tip --record-lifecycle` | `chain-rpc`, `post-tip-stats`, `recipient-tip-stats`, `balance` |
| `bet-fixed` | `probe-agentic-memo-bet.ts --record-lifecycle` | `chain-rpc`, `active-pool`, `winners-history` |
| `bet-hl` | Supported by the lifecycle schema, but current production proof remains pending the same native args-memo delayed-readback treatment used for fixed-price BET. |

## Store And Proof Packets

The script-level store lives under:

```text
<state-dir>/write-lifecycle/
```

If `--state-dir` is omitted, the default aligns with the package runtime guard store:

```text
~/.config/demos/write-lifecycle/
```

Each record is a non-secret JSON file under `records/`. Proof packets are JSON under `proofs/` unless `--proof-out` is provided.

Lifecycle records include:

- action family and wallet address
- command and git commit
- tx hash, attestation tx hash, target post hash, or market identity
- spend budget and spend status
- expected readback surfaces
- observations and status transitions
- final verdict when terminal

Secret-like keys such as tokens, mnemonics, credentials, private keys, and auth values are redacted before persistence.

## Recheck Defaults

Prefer delayed no-spend rechecks over new live writes:

```bash
node --import tsx packages/omniweb-toolkit/scripts/check-vote-publish.ts --recheck <record-or-tx> --state-dir <dir>
node --import tsx packages/omniweb-toolkit/scripts/check-publish-visibility.ts --recheck <record-or-tx> --state-dir <dir>
node --import tsx packages/omniweb-toolkit/scripts/probe-agentic-memo-bet.ts --recheck <record-or-tx> --state-dir <dir>
```

Spend remains behind explicit `--broadcast` or `--execute`. Browser wallet/provider behavior remains human-path diagnostic only and cannot close agentic proof.

## Fixed-Price BET Rule

Fixed-price BET uses two readback phases:

1. short active-pool readback for same-round feedback
2. delayed winners/history readback after round rollover

The May 16 proof in `uw66.6-agentic-memo-bet-readback-2026-05-16.md` is the current model: same-window active-pool polling missed successful bets, while delayed winners/history readback resolved them at block `2265016`.
