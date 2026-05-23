---
summary: "No-spend inventory of omniweb-toolkit write, mutation, and DEM-spend surfaces with gates, budgets, readbacks, cleanup paths, and follow-up beads."
read_when: ["write spend surface sweep", "mutation inventory", "DEM spend gates", "live write planning", "broadcast safety"]
owner_bead: "omniweb-agents-0ctx"
base_commit: "b6e897bf"
---

# Write/Spend Surface Sweep - 2026-05-21

This is the no-spend counterpart to the colony surface sweep. It inventories every current package or maintained-script path that can mutate state, consume a SuperColony write-rate slot, broadcast a Demos transaction, spend DEM, change identity/admin state, create webhook state, or write to wider Demos domains.

No live writes, broadcasts, DEM spends, webhook create/delete calls, identity confirmations, storage/IPFS/escrow sends, tips, bets, publishes, replies, VOTE posts, transfers, or attest probes were executed for this sweep.

## Scope And Source Files Checked

- `packages/omniweb-toolkit/src/hive.ts`: `omni.colony` write methods and delegates.
- `packages/omniweb-toolkit/src/colony.ts`: top-level `connect()` domain surface.
- `packages/omniweb-toolkit/src/chain-api.ts`, `escrow-api.ts`, `storage-api.ts`, `ipfs-api.ts`, `identity-api.ts`: non-colony mutation-capable domains.
- `packages/omniweb-toolkit/src/write.ts` and root `src/toolkit/safe-transfer.ts`: exported chain transfer helpers.
- Root `src/toolkit/primitives/actions.ts`, `agents.ts`, and `webhooks.ts`: lower-level mutation primitives behind `HiveAPI`.
- Maintained proof scripts under `packages/omniweb-toolkit/scripts/`, especially `check-write-surface-sweep.ts`, `probe-social-writes.ts`, `probe-market-writes.ts`, `probe-agentic-memo-bet.ts`, `check-vote-publish.ts`, `check-publish-readiness.ts`, `check-publish-visibility.ts`, `probe-identity-surfaces.ts`, `probe-escrow.ts`, `probe-storage.ts`, `probe-ipfs.ts`, `probe-chain-smoke.ts`, `check-chat-webhook-consumers.ts`, and `check-market-write-intents.ts`.
- Existing proof docs: `write-surface-sweep.md`, `colony-surface-sweep-2026-05-21.md`, `full-action-spectrum-social-write-proof-2026-05-19.md`, `full-action-spectrum-market-write-proof-2026-05-19.md`, `full-action-spectrum-identity-admin-proof-2026-05-19.md`, `full-action-spectrum-domain-write-proof-2026-05-19.md`, and `write-lifecycle.md`.

## Budget Defaults For Future Proof Beads

These are planning ceilings only. They are not authorization to execute.

| Family | Default future ceiling |
| --- | --- |
| Publish, reply, VOTE, standalone DAHR attest | `1 write-rate-slot` per proof |
| TLSN attest | `unknown-quote-required`, no live proof until storage fee is previewed and capped |
| React | `0 DEM`, mutation-only, owned/current target required |
| Tip | `1 DEM` |
| Fixed-price BET | `5 DEM` |
| Higher/lower BET | `5 DEM` unless preview proves a lower configured minimum |
| Escrow send | `0.1 DEM` to an owned or controlled recipient |
| Storage create/set | `1 DEM`, only after preview reports concrete fee |
| IPFS upload/pin | `unknown-quote-required`, no live run until preview gives a concrete quote within an explicit ceiling |
| Chain transfer | `0.1 DEM` to an owned or controlled wallet |
| Identity/admin and webhook mutations | expected `0 DEM`, but require controlled target, cleanup path, and explicit confirmation |

## Matrix

| Method / script / CLI entrypoint | Mutation class and spend class | Expected cost and later hard budget ceiling | Required live flag or confirmation gate | Preview command | Live command template, documented only | Current proof/readback status | Required product readback | Cleanup/refund/recheck path | Recommended follow-up bead |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `omni.colony.publish()` / `check-publish-visibility.ts` | Colony social write; write-rate slot; optional DAHR attestation write | Expected `1 write-rate-slot`; ceiling `1 write-rate-slot` per proof | `--broadcast` on maintained visibility script; direct API callers need an explicit operator gate | `node --import tsx packages/omniweb-toolkit/scripts/check-publish-visibility.ts --runs 1 --text "<draft>" --attest-url <url> --proof-out <path>` without `--broadcast` | Same command plus `--broadcast --record-lifecycle` | Current bounded-pass: May 19 PR2 publishes indexed through recent feed. Older April proof had feed/detail visibility gaps. | Publish tx plus post-detail or recent-feed/author-feed readback matching the tx; tx confirmation alone is insufficient | `--record-lifecycle` plus no-spend `--recheck <id-or-tx>`; no cleanup for public post | Existing lifecycle path is adequate; no new bead unless future publish readback regresses |
| `omni.colony.reply()` / `probe-social-writes.ts` / top-reply preview CLI | Colony social reply; write-rate slot; optional DAHR attestation write | Expected `1 write-rate-slot`; ceiling `1 write-rate-slot` per proof | `--execute` on social probe; direct API callers need explicit target and operator gate | `npm --silent --prefix packages/omniweb-toolkit run omniweb -- colony brief top-reply --min-score 90 --exemplars 2 --feed-limit 20` or `probe-social-writes.ts` without `--execute` | `node --import tsx packages/omniweb-toolkit/scripts/probe-social-writes.ts --execute --reply-text "<text>" --reply-attest-url <url> --record-lifecycle --proof-out <path>` | Current bounded-pass/degraded: May 19 reply accepted and post-detail readback passed, but recent-feed visibility stayed degraded. | Parent tx, reply tx, post-detail or thread readback containing reply tx; recent-feed alone is not required but should be reported | Lifecycle `--record-lifecycle`; no-spend delayed recheck through visibility/social proof scripts | Existing `omniweb-agents-6rc3.1` should add no-spend reply preview coverage before any CLI execution wrapper |
| `omni.colony.publishVote()` / `check-vote-publish.ts` | Colony VOTE write; write-rate slot; optional DAHR attest | Expected `1 write-rate-slot`; ceiling `1 write-rate-slot` per proof | `--broadcast`; requires positive `--reference-price` and `--predicted-price` | `node --import tsx packages/omniweb-toolkit/scripts/check-vote-publish.ts --verify-limit 75 --asset BTC` | Same plus `--broadcast --reference-price <n> --predicted-price <n> --confidence <n> --attest-url <url> --record-lifecycle --proof-out <path>` | Historical May 15 bounded-pass by VOTE search tx match; May 19 attempts failed/degraded before a current tx. | `search({ category: "VOTE" })` matching broadcast tx and balance/write-rate accounting | Lifecycle `--record-lifecycle`; no-spend `--recheck <id-or-tx>` | `omniweb-agents-0ctx.1` |
| `omni.colony.attest()` / `check-publish-readiness.ts --probe-attest` | Standalone DAHR attestation write; write-rate/resource slot; no DEM transfer expected | Expected `1 write-rate-slot`; ceiling `1 write-rate-slot` per proof | `--probe-attest` is the live attest gate | `node --import tsx packages/omniweb-toolkit/scripts/check-publish-readiness.ts --attest-url <url> --text "<draft>"` without `--probe-attest` | Same plus `--probe-attest` | May 19 PR2 standalone DAHR attestation passed with tx and response hash. | Attestation tx hash plus response hash and sanitized attested source URL | No cleanup; proof can be referenced by later publish packets | No new bead; keep using readiness gate |
| `omni.colony.attestTlsn()` / TLSN Playwright bridge | TLSN verification write; on-chain proof storage; possible storage fee | Unknown until proof size/quote; ceiling `unknown-quote-required` until preview exists | No maintained dedicated proof script; any future run must require explicit execute/broadcast gate and fee cap | None currently dedicated; only code path exists through `attestTlsn` bridge | Documented future template only: dedicated TLSN probe with URL, storage quote, fee cap, and no secrets | Current status blocked/experimental. May 19 PR3 left W10 blocked. | TLSN proof storage tx, storage fee, redacted proof metadata, and verification of attested URL | No cleanup for stored proof; recheck should verify tx and decoded proof metadata | `omniweb-agents-0ctx.2` |
| `omni.colony.react()` / `probe-social-writes.ts` | Colony reaction mutation; no DEM spend | Expected `0 DEM`; ceiling `0 DEM`; consumes no transfer spend | `--execute` on social probe; target must be owned/current and untouched by the wallet | `node --import tsx packages/omniweb-toolkit/scripts/probe-social-writes.ts --feed-limit 500 --reaction-timeout-ms 45000 --poll-ms 3000` | Same plus `--execute --record-lifecycle --proof-out <path>` | Historical May 15 reaction readback passed; May 19 skipped because no untouched attested post met floors. | `getReactions(txHash)` before/after with wallet's reaction and aggregate delta | Re-run no-spend candidate scan; no automatic cleanup for reaction state | `omniweb-agents-0ctx.3` |
| `omni.colony.tip()` / `probe-social-writes.ts --include-tip` / `check-tip-visibility.ts` | DEM transfer to post author; social/economic mutation | Expected `1 DEM`; ceiling `1 DEM` | `--execute --include-tip` for social probe, or a dedicated tip visibility script with explicit tip amount | `node --import tsx packages/omniweb-toolkit/scripts/probe-social-writes.ts --include-tip --feed-limit 500` without `--execute`; or `check-tip-visibility.ts` without live gate | Same plus `--execute --include-tip --tip-amount 1 --record-lifecycle --proof-out <path>` | Historical May 15 tip emitted tx but tip stats, recipient stats, and balance readback stayed degraded; May 19 skipped before spend. | Transfer tx plus post `getTipStats`, recipient tip stats, or balance delta; tx confirmation alone is insufficient | No refund path; no-spend candidate scan before retry; lifecycle/recheck if script records it | `omniweb-agents-0ctx.3` |
| `omni.colony.placeBet()` / `probe-market-writes.ts --only fixed` / `probe-agentic-memo-bet.ts` | DEM fixed-price market transfer with HIVE_BET memo; pool mutation | Expected `5 DEM`; ceiling `5 DEM` | `--execute`; agentic memo bet also requires credential env and controlled amount | `node --import tsx packages/omniweb-toolkit/scripts/probe-market-writes.ts --assets BTC,ETH,SOL --only fixed --fixed-horizons 30m,4h,24h` | `node --import tsx packages/omniweb-toolkit/scripts/probe-agentic-memo-bet.ts --asset <asset> --horizon <horizon> --predicted-price <n> --amount 5 --execute --record-lifecycle --proof-out <path>` | Current bounded-pass: May 19 PR3 active pool matched tx hash and moved totals. | Active fixed pool readback matching tx hash and pool totals; resolved winners later when applicable | `probe-agentic-memo-bet.ts --check-tx <hash>` or `--recheck <id-or-tx>` no-spend | No new bead; current proof says product readback is required |
| `omni.colony.placeHL()` / `probe-market-writes.ts --only hl` | DEM higher/lower market transfer with HIVE_HL memo; pool mutation | Expected `5 DEM`; ceiling `5 DEM` unless preview proves lower minimum | `--execute`; integer amount only in current evidence | `node --import tsx packages/omniweb-toolkit/scripts/probe-market-writes.ts --assets BTC,ETH,SOL --only hl --hl-amount 5` | Same plus `--execute --state-dir <state> --poll-ms 3000` | Current bounded-pass: May 19 PR3 higher/lower pool moved `totalLower`, `totalDem`, and `lowerCount`. | Higher/lower pool readback matching tx and side/amount deltas | Market proof recheck path; no refund path | `omniweb-agents-0ctx.4` to align amount-floor docs and manifest status |
| `omni.colony.registerBet()` / `registerHL()` | Recovery registration mutation for an owned source market tx; not standalone spend proof | Expected `0 DEM` new transfer, but mutates registration state | No standalone CLI; only targeted recovery scripts should run with an owned tx hash after product readback identifies the source tx | No-spend readback using pool tx hash checks | Documented future targeted replay only against owned txs | Current degraded: May 19 PR3 replay against PR3-owned native memo txs returned `wrong_tx_type`. | Product pool readback for the original source tx remains mandatory; registration response alone is not proof of a live market write | No spend; retry only with owned tx and current pool window | `omniweb-agents-0ctx.5` |
| `omni.colony.registerEthBinaryBet()` | Recovery registration for ETH binary bet | Unknown; no paired safe send path | Blocked until both an owned ETH binary tx and paired safe send path exist | None safe today | None until paired send and owned tx proof exist | Unsupported/excluded. | Owned binary-bet tx plus ETH binary pool readback; registration response alone is insufficient | None today | `omniweb-agents-0ctx.5` |
| `omni.colony.register()` / `probe-identity-surfaces.ts` | Public profile identity/admin mutation; expected no DEM transfer | Expected `0 DEM`; requires controlled throwaway/default wallet target | `--execute --confirm-identity-mutation` | `node --import tsx packages/omniweb-toolkit/scripts/probe-identity-surfaces.ts --phase register --register-name <name>` without live flags | Same plus `--execute --confirm-identity-mutation` | May 19 PR4 throwaway register passed with caveat: maintained script also touched configured default wallet due missing agent selection. | Agent profile/readback for the intended wallet and public fields, plus wallet identity confirmation | Restore/cleanup profile only when cooldown allows; use throwaway wallet for future proof | `omniweb-agents-0ctx.6` |
| `createAgentLinkChallenge()` / `claimAgentLink()` / `approveAgentLink()` / `unlinkAgent()` | Official human-link identity/admin mutations; expected no DEM transfer | Expected `0 DEM`; controlled throwaway target only | `--execute --confirm-identity-mutation`; challenge/signature material must be redacted | `probe-identity-surfaces.ts --phase human-link` without live flags | Same plus `--execute --confirm-identity-mutation` | May 19 PR4 throwaway link/claim/approve/readback/unlink passed. | Linked-agent readback before cleanup and absence after unlink | `unlinkAgent()` cleanup and linked-agent recheck | `omniweb-agents-0ctx.6` for script targeting hardening |
| Deprecated `linkIdentity()` / `omni.identity.link()` | Deprecated identity mutation with public proof URL | Expected `0 DEM`; public proof URL required | No maintained live gate; excluded from launch path | Classification only | No live command until product decision revives it | Unsupported/excluded in PR4; official human-link flow is preferred. | Public proof verification and lookup readback if revived | Unlink/cleanup if platform supports it | No new bead; keep deprecated |
| `omni.colony.createWebhook()` / `deleteWebhook()` | Webhook admin mutation; no DEM spend expected | Expected `0 DEM`; cleanup required | No maintained live gate; future proof must require explicit execute plus controlled callback URL | `node --import tsx packages/omniweb-toolkit/scripts/check-chat-webhook-consumers.ts` | Documented future template: create controlled HTTPS callback webhook, list/readback, delete same id, list/readback | Blocked: May 19 PR4 had list/read proof, no controlled receiver or owned webhook id. | `getWebhooks()` showing created id, callback event receipt if applicable, and post-delete absence | Delete owned webhook id and re-list | Existing `omniweb-agents-6rc3.5` |
| Chat send / consumer surfaces | Potential chat message mutation; current maintained checks are read/classification only | Expected `0 DEM` if implemented; no live path currently approved | No live chat-send gate in maintained package scripts | `node --import tsx packages/omniweb-toolkit/scripts/check-chat-webhook-consumers.ts` | None documented until API path and controlled room/cleanup policy exist | Current checks classify chat/webhook consumers; no maintained chat-send mutation proof. | Created message visible in controlled room and cleanup/expiry policy | Controlled room and message deletion/expiry if supported | `omniweb-agents-0ctx.7` |
| `omni.escrow.sendToIdentity()` / `probe-escrow.ts` | Escrow DEM send to identity target | Expected `0.1 DEM`; ceiling `0.1 DEM` to owned/controlled recipient | `--broadcast` | `node --import tsx packages/omniweb-toolkit/scripts/probe-escrow.ts --platform github --username <controlled-user> --amount 0.1 --message "<public message>" --proof-out <preview.json>` | Same plus `--broadcast --proof-out <live.json>` | May 19 PR5 dry-run only; claimable/balance wrappers returned method-not-implemented. Existing Phase 24 child has target. | Escrow send result plus claimable/balance readback or explicit degraded wrapper classification | Claim/refund/controlled-recipient check if supported; otherwise recheck read wrappers | Existing `omniweb-agents-5mnk.4`, now blocked by this sweep |
| `omni.storage.create()` / `setField()` / `probe-storage.ts` | On-chain StorageProgram create plus field write | Expected `1 DEM`; ceiling `1 DEM` only after preview fee | `--broadcast` | `node --import tsx packages/omniweb-toolkit/scripts/probe-storage.ts --program-name <controlled-name> --proof-out <preview.json>` | Same plus `--broadcast --proof-out <live.json>` | May 19 PR5 dry-run derived address and estimated fee; no write. Existing Phase 24 child has target. | Storage address plus `read`, `hasField`, and `readField` for written field | Re-read derived storage address; no general delete/refund path | Existing `omniweb-agents-5mnk.2`, now blocked by this sweep |
| `omni.ipfs.upload()` / `probe-ipfs.ts` | IPFS upload/pin plus chain verification where available | Unknown until quote; ceiling `unknown-quote-required` until concrete quote exists | `--broadcast` | `node --import tsx packages/omniweb-toolkit/scripts/probe-ipfs.ts --filename <file> --content "<public content>" --proof-out <preview.json>` | Same plus `--broadcast --proof-out <live.json>` | May 19 PR5 quote returned `Unknown message`; no upload. Existing Phase 24 child has target but budget should remain quote-gated. | CID/upload id plus chain verification or honest degraded classification | Pin/unpin only for owned CID if supported; recheck CID/tx | Existing `omniweb-agents-5mnk.3`, now blocked by this sweep |
| `omni.chain.transfer()` / exported `safeTransfer()` | Raw DEM transfer; chain mutation/spend | Expected `0.1 DEM`; ceiling `0.1 DEM` to owned/controlled wallet | No package proof script live transfer gate today; future run must add explicit `--broadcast` or equivalent | `probe-chain-smoke.ts` sign/read only, or future transfer preview | Documented future template only: controlled self/owned transfer with amount cap and readback | May 19 PR5 raw transfer dry-run blocked; May 21 raw-chain sign/read proof passed no-spend. | Balance delta or transfer tx readback for controlled recipient; tx confirmation alone is insufficient | Controlled recipient balance recheck; no refund unless self-transfer | `omniweb-agents-0ctx.8` |
| `omni.chain.signMessage()` / `verifyMessage()` / `probe-chain-smoke.ts` | Signature/read smoke; no mutation, no DEM spend | `0 DEM`; no live budget | No live flag; script is no-broadcast sign/read only | `node --import tsx packages/omniweb-toolkit/scripts/probe-chain-smoke.ts --message-label <label> --proof-out <path>` | Not applicable | May 21 raw-chain sign/read smoke passed with redacted signature, balance, and block readback. | Verify result plus redacted signature and block/balance reads | Re-run no-spend if signer/runtime drifts | No new bead |

## Concrete Gaps

1. VOTE has historical green proof but no current successful post-PR2 VOTE tx/readback after the May 19 degraded attempts.
2. TLSN attestation is exposed but lacks a dedicated preview, quote, budget ceiling, redaction, and readback proof lane.
3. React/tip still need a durable owned/current target selection bead before live mutation. A fresh dry-run found a candidate reaction target, but no committed target packet authorizes a mutation or tip spend.
4. Higher/lower docs and intent metadata still need to stop implying a fractional minimum where the live path required integer DEM.
5. Market registration recovery is degraded for current native memo txs and should be documented as recovery-only, owned-tx-only behavior.
6. Identity and domain probe scripts now require explicit existing `--agent-name` / `--env-path` targeting before future live identity, escrow, storage, or IPFS mutations; dry-runs still report the selected public address and redacted runtime target.
7. Chat-send mutation is not a maintained proof lane; current checks are read/classification only.
8. Raw chain transfer has no maintained bounded transfer proof lane even though sign/read is proven.
9. Controlled webhook receiver, storage, IPFS, and escrow live lanes already exist as beads but must be blocked by this sweep until their budgets/readbacks are reconciled.

## Follow-Up Beads

Created or reused:

- `omniweb-agents-0ctx.1`: Refresh current VOTE publish proof with no-spend preflight and category-search readback.
- `omniweb-agents-0ctx.2`: Add dedicated TLSN attestation preview/quote/redaction proof lane.
- `omniweb-agents-0ctx.3`: Select owned/current react and tip targets before any social mutation or tip spend.
- `omniweb-agents-0ctx.4`: Align higher/lower amount-floor and manifest proof status with current integer DEM evidence.
- `omniweb-agents-0ctx.5`: Document and harden market registration recovery as owned-tx-only degraded behavior.
- `omniweb-agents-0ctx.6`: Add explicit wallet/env targeting to identity and domain mutation probes.
- `omniweb-agents-0ctx.7`: Decide and gate any future controlled chat-send mutation lane.
- `omniweb-agents-0ctx.8`: Add bounded raw chain transfer preview/live proof lane with owned-recipient readback.
- Existing `omniweb-agents-6rc3.5`: controlled webhook receiver proof lane.
- Existing `omniweb-agents-5mnk.2`: controlled storage create/set target and readback.
- Existing `omniweb-agents-5mnk.3`: controlled IPFS upload target and readback.
- Existing `omniweb-agents-5mnk.4`: controlled escrow send target and readback.

Dependency edges added:

- `omniweb-agents-0ctx` blocks `omniweb-agents-5mnk.2`, `omniweb-agents-5mnk.3`, and `omniweb-agents-5mnk.4`.

## No-Spend Validation

Run only no-spend/read-only checks for this sweep. Live flags remain forbidden:

- No `--broadcast`
- No `--execute`
- No `--probe-attest`
- No `--confirm-identity-mutation`
- No live webhook create/delete
- No live transfer, tip, bet, escrow, storage, IPFS, publish, reply, vote, or identity mutation

| Command | Result | Notes |
| --- | --- | --- |
| `git diff --check` | pass | No whitespace errors in the doc/index diff. |
| `npm --prefix packages/omniweb-toolkit run build` | pass | Build succeeded with the existing Zod DTS warnings. |
| `npm --prefix packages/omniweb-toolkit run check:verification-matrix` | pass | `HiveAPI` method count `61`; no missing helper exports. |
| `npm --prefix packages/omniweb-toolkit run check:chat-webhook-consumers` | pass | Confirmed chat/webhook mutations are explicit-execute plans only; no remote mutation executed. |
| `npm --prefix packages/omniweb-toolkit run check:market-write-intents` | pass | Confirmed market writes are no-spend by default and live execution disabled without explicit execute. |
| `npm --prefix packages/omniweb-toolkit run check:write-surface` | pass | Dry run returned `attempted=false`, `ok=true`; no `--broadcast`. |
| `check-publish-readiness.ts` dry run | pass | First short draft failed schema without mutation; rerun with valid text passed and `attestProbe.attempted=false`. |
| `check-publish-visibility.ts` dry run | pass | Returned `attempted=false`, planned one publish, and instructed `--broadcast` for live probes. |
| `check-vote-publish.ts` dry run | pass | Returned `broadcast=false`; sampled 25 existing VOTE posts; no publish result. |
| `probe-social-writes.ts` dry run | pass | Returned `attempted=false`; found a candidate and reported readback only; tip disabled. |
| `probe-market-writes.ts` dry run | pass | Returned `attempted=false`; planned fixed and higher/lower transfers but did not execute. |
| `probe-agentic-memo-bet.ts` dry run | blocked before signing | No `DEMOS_MNEMONIC` in worktree `.env` or process env; no broadcast or spend attempted. |
| `probe-identity-surfaces.ts` dry run | pass | Returned `attempted=false` and required `--execute --confirm-identity-mutation`. |
| `probe-escrow.ts` dry run | pass | Returned `attempted=false`; named controlled recipient and amount. |
| `probe-storage.ts` dry run | pass | Returned `attempted=false`; derived storage address and `estimatedCreateFeeDem=1`. |
| `probe-ipfs.ts` dry run | pass/degraded quote | Returned `attempted=false`; quote remained `{ error: "Unknown message" }`, so live remains quote-gated. |
| `probe-chain-smoke.ts` no-broadcast | pass | Returned `attemptedBroadcast=false`; sign/verify, balance, and block readback passed. |

## Current Verdict

The package has many live write and spend surfaces, but every maintained proof path has an explicit live flag or is a direct API surface that must be wrapped by an operator gate before use. The strongest current product-readback rule is unchanged: live spend counts only when the product readback proves the effect, not when a transaction merely confirms.
