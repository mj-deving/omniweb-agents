---
summary: "PR6 closeout for the full action-spectrum lane, reconciling every read, write, identity/admin, Demos-domain, helper, and release-gate row without claiming npm release or public registry proof."
topic_hint:
  - "action spectrum closeout"
  - "full operation verdict"
  - "release gate"
  - "every row proven degraded blocked unsupported"
---

# Full Action Spectrum Closeout - 2026-05-19

Owner bead: `omniweb-agents-action-spectrum.6`

Mode: evidence reconciliation and release-gate closeout. PR6 does not execute live spend, mutate identity/admin state, broadcast Demos-domain writes, publish to npm, or claim public-registry install proof.

## Evidence Chain

| Slice | Scope | Proof |
| --- | --- | --- |
| PR0 | matrix and GoalMode scaffold | `docs/FULL_ACTION_SPECTRUM_MASTER_PRD.md`, `docs/FULL_ACTION_SPECTRUM_GOAL_BRIEF.md`, `docs/FULL_ACTION_SPECTRUM_GOAL_LAUNCH.md`, `full-action-spectrum-testing-matrix.md` |
| PR1 | R1-R10 and H1-H3 no-spend read/discovery refresh | [full-action-spectrum-read-discovery-proof-2026-05-19.md](./full-action-spectrum-read-discovery-proof-2026-05-19.md) |
| PR2 | W1-W6 social and prediction writes | [full-action-spectrum-social-write-proof-2026-05-19.md](./full-action-spectrum-social-write-proof-2026-05-19.md) |
| PR3 | W7-W10 market writes | [full-action-spectrum-market-write-proof-2026-05-19.md](./full-action-spectrum-market-write-proof-2026-05-19.md) |
| PR4 | I1-I3 identity and A1 admin/delivery | [full-action-spectrum-identity-admin-proof-2026-05-19.md](./full-action-spectrum-identity-admin-proof-2026-05-19.md) |
| PR5 | D1-D8 escrow/storage/IPFS/chain domain rows | [full-action-spectrum-domain-write-proof-2026-05-19.md](./full-action-spectrum-domain-write-proof-2026-05-19.md) |

## Final Row Verdicts

| Row group | Final verdict |
| --- | --- |
| R1-R10 reads/discovery | Proven or explicitly degraded/dev-only by PR1. Current production read/discovery checks passed, with drift named for advertised-but-404 resources, auth-gated chat/webhook reads, ETH deployment-disabled pools, graduation server error, and escrow query stubs. |
| H1-H3 helpers/consumer rows | Proven locally by PR1 and maintained package checks; these are no-spend helper/import/guardrail rows, not live endpoint claims. |
| W1 standalone DAHR attestation | Passed in PR2 with standalone attestation tx and response hash. |
| W2 DAHR publish | Passed in PR2 with two DAHR-backed publish txs and recent-feed indexed readback. |
| W3 reply | Degraded pass in PR2: accepted tx and delayed post-detail/thread readback, but recent-feed indexing stayed false. |
| W4 reaction | Skipped in PR2 before spend because no safe untouched candidate met the maintained floor; historical May 15 bounded reaction proof remains valid package evidence. |
| W5 tip | Skipped in PR2 before spend because no safe untipped candidate met the maintained floor; historical May 15 bounded tip tx remains chain-confirmed but stats/balance readback is degraded. |
| W6 VOTE prediction | Failed/degraded in PR2 because the current attempts did not produce a VOTE tx; historical May 15 bounded VOTE proof remains package evidence. |
| W7 fixed-price BET | Passed in PR3 with BTC 30m tx read back by active-pool tx hash after 19 polls. |
| W8 higher/lower BET | Passed in PR3 with BTC 24h LOWER tx moving pool totals and count. |
| W9 market registration recovery | Degraded/unsupported in PR3: replay against owned W7/W8 tx hashes returned `wrong_tx_type`; product pool readback remains the current proof surface, and ETH binary registration lacks a safe paired send path. |
| W10 TLSN attestation | Blocked; not broadcast. |
| I1 profile register | Passed with caveat in PR4 on a throwaway wallet: register response returned requested public fields, but follow-up profile readback only matched address and returned null/empty public fields. The maintained script also needs explicit throwaway targeting. |
| I2 official human-link | Passed in PR4 on a throwaway wallet with challenge/claim/approve/readback and unlink cleanup. |
| I3 deprecated `linkIdentity` | Unsupported/excluded in PR4; no public proof URL was published or submitted. |
| A1 webhook create/delete | List passed in PR4; create/delete blocked without a controlled public HTTPS callback receiver or PR4-owned webhook id. |
| D1 escrow send | Blocked in PR5; dry-run intent exists but no PR5 budget/recipient execution gate was recorded. |
| D2 escrow claim/refund | Blocked in PR5 because no PR5-owned escrow existed and query wrappers returned `Method not implemented`. |
| D3 storage create/set | Blocked in PR5; CREATE/SET_FIELD payloads and estimated 1 DEM cost exist, but no storage budget gate was recorded. |
| D4 storage reads after write | Degraded in PR5 because no write was broadcast; readback correctly returned absent storage. |
| D5 IPFS upload | Blocked in PR5; 104-byte dry-run quote returned `{ error: "Unknown message" }` and no IPFS budget gate was recorded. |
| D6 IPFS pin/unpin | Blocked in PR5 because no PR5-owned upload CID exists. |
| D7 raw chain transfer | Blocked in PR5; self-transfer dry-run exists but no transfer budget/recipient gate was recorded. |
| D8 chain sign/read | Degraded partial in PR5: balance and block reads passed, `signMessage` returned a redacted signature object, and `verifyMessage` returned `false`. |

## Release And Public-Registry Gate

PR6 records the package release posture only as readiness evidence:

- `check:publish` is a non-mutating npm readiness preflight and must not run `npm publish`.
- `check:package` passed after the local OpenClaw colony-operator check path was made resolvable from fresh worktrees.
- `check:release` passed with `586` packaged entries and all expected trajectory examples present.
- `check:publish` returned `releaseReady=true` and `releaseDecision=ready_to_publish_but_not_authorized`; package validation and pack dry-run passed, `npm view omniweb-toolkit version --json` reported the package name available, `npm whoami` was unauthenticated, and no publish was attempted.
- No npm release is authorized in this lane.
- No public registry install proof is claimed in this lane.
- First external consumer proof remains repo/tarball/install-path evidence until an explicit release authorization and npm auth exist.

## Open Follow-Ups

| Bead | Reason |
| --- | --- |
| `omniweb-agents-km3g` | Restore the configured wallet profile after the PR4 name-change cooldown and add explicit `--agent-name` / `--env-path` targeting to the identity probe. |
| `omniweb-agents-vhat` | Add explicit throwaway targeting to escrow/storage/IPFS probes and resolve or precisely classify the chain sign/verify smoke mismatch. |
| `omniweb-agents-xdq` | TLSN relay/runtime proof remains external. |
| `omniweb-agents-028` | npm release and public registry proof remain deferred until explicit release authorization plus npm auth. |

## Closeout Decision

The action-spectrum lane is complete as an evidence reconciliation: every row in [full-action-spectrum-testing-matrix.md](./full-action-spectrum-testing-matrix.md) is now proven, degraded, unsupported, blocked, failed, or skipped with a named evidence source. The lane does not justify a broad "all operations work" claim; it justifies a narrower claim that the repo now knows, row by row, which operations are live-proven and which require follow-up gates before they can be called proven.
