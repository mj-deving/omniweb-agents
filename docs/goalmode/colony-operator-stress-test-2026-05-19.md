---
type: goal-launch
status: live-tranche-ready-after-safety-closeout
created: 2026-05-19
source_contract: docs/ROADMAP.md#phase-23-colony-operator-capability-stress-test-and-goalmode-readiness
owner_bead: omniweb-agents-operator-stress
summary: "Long-running GoalMode launch packet for colony operator capability stress-test and write-preview readiness, with follow-on testnet live-write tranche prepared."
---

# Colony Operator Stress-Test GoalMode Packet

## Objective

Execute `omniweb-agents-operator-stress` as a long-running GoalMode lane. Prove that a fresh colony operator can use toolkit-owned discovery to understand current read/write capability, stress-test every read surface without spend, produce reviewable proposed action packets for every write command without mutation, and only then decide whether a later reviewed live-write tranche is safe.

Default mode is read-only plus write previews. Live writes are not part of the first stress pass unless the active child bead explicitly authorizes them with budget, target, command flag, and readback criteria.

## Run Status

Status as of the May 21, 2026 testnet live-write preparation:

- AC-1: complete. PR #458 created the Beads graph, GoalMode packet, dependency wiring, Roadmap state, and re-entry mirror updates.
- AC-2: complete. PR #459 captured `operator-help-dump.json` with 120 commands, 92 reads, and 28 writes.
- AC-3: complete. PR #459 captured `read-command-matrix.json`: 48 green, 33 thin, 6 auth-gated, 5 degraded, and 0 missing-param/dev-only/broken read rows.
- AC-4: complete with degraded evidence. Maintained read checks passed, and targeted horizon samples recorded 30m/4h/24h pool horizons passing while sampled 1h/12h fixed and higher/lower pool horizons returned HTTP 400.
- AC-5: complete. PR #460 captured proposed action packets for all 28 write commands with no spend, no mutation, no broadcast, and live gates on every row.
- AC-6: complete for the next tranche. `omniweb-agents-km3g` closed via PR #462, and the configured/default wallet restore follow-up `omniweb-agents-wck6` closed via PR #464.
- AC-7: complete for the next tranche. `omniweb-agents-vhat` closed via PR #463 with explicit escrow/storage/IPFS targeting and chain sign/verify proof.
- AC-8: ready for bounded testnet execution. `omniweb-agents-operator-stress.5` remains the owner bead; the follow-on launch packet is `docs/goalmode/testnet-live-write-tranche-2026-05-21.md`.
- AC-9: no-spend closeout is complete via `omniweb-agents-operator-stress.6`; the live tranche must produce its own closeout after execution.

Proof directory:

- `packages/omniweb-toolkit/references/operator-stress-2026-05-19/`

## Source Truth

- Branch from fresh `origin/main`.
- Use Beads as the durable execution ledger.
- Owner epic: `omniweb-agents-operator-stress`.
- Current discovery surface: `capabilityDiscovery.operatorHelp`.
- Safety closeout:
  - `omniweb-agents-km3g` closed via PR #462 with explicit identity probe targeting.
  - `omniweb-agents-vhat` closed via PR #463 with explicit domain probe targeting.
  - `omniweb-agents-wck6` closed via PR #464 with configured/default wallet profile restore readback.

Do not record secrets, mnemonics, signatures, tokens, private URLs, or local credential paths in docs, proof packets, or Beads.

## Acceptance Anchors

AC-1. Fresh base and durable graph.

Evidence target: checkout is current with `origin/main`, `bd dolt pull` has run, `bd dep cycles --json` is clean, `docs/ROADMAP.md` names Phase 23, and `bd show omniweb-agents-operator-stress --json` shows the child graph.

AC-2. Operator help dump captured.

Evidence target: dump `capabilityDiscovery.operatorHelp` from current package code and record command counts, read/write split, filters, and proof path.

AC-3. Read commands classified.

Evidence target: every `operatorHelp.readCommands` entry has command, capability id, params, response depth, proof tier, no-spend/no-mutation flags, readback surfaces, depth expectation, time knobs, and one classification: `green`, `thin`, `missing-param`, `auth-gated`, `dev-only`, `degraded`, or `broken`.

AC-4. Maintained read sweeps run.

Evidence target: run the maintained no-spend checks and record failures honestly:

```bash
npm --prefix packages/omniweb-toolkit run check:live
npm --prefix packages/omniweb-toolkit run check:live:detailed
npm --prefix packages/omniweb-toolkit run check:read-surface
npm --prefix packages/omniweb-toolkit run check:colony-operator-entrypoint
npm --prefix packages/omniweb-toolkit run check:colony-operator-response-depth
```

Run targeted horizon/time samples for market and price-history reads. Preserve dev-only, auth-gated, deployment-disabled, and degraded verdicts instead of flattening them into pass/fail.

AC-5. Write commands have proposed action packets.

Evidence target: every `operatorHelp.writeCommands` entry has a proposed action packet with command, params, spend/mutation class, explicit live flag, required controlled target, no-spend preview output or blocked reason, primary readback, secondary readback, lifecycle expectations, and final preview verdict. Use `execution preview` or `proposed action packet`; do not call these generic action plans.

AC-6. Identity/profile safety is resolved or STUCK.

Evidence target: `omniweb-agents-km3g` is closed with proof, or this lane records a STUCK verdict with current evidence. Do not run profile mutation, register, human-link, unlink, or configured-wallet restore through this lane while `km3g` is open unless a later child bead explicitly supersedes the blocker with stronger evidence.

AC-7. Domain probe targeting safety is resolved or STUCK.

Evidence target: `omniweb-agents-vhat` is closed with proof, or this lane records a STUCK verdict with current evidence. Do not run escrow, storage, IPFS, raw transfer, or raw chain live probes while `vhat` is open unless a later child bead explicitly supersedes the blocker with stronger evidence.

AC-8. Optional live-write tranche is gated.

Evidence target: `omniweb-agents-operator-stress.5` remains the active live-write owner until the tranche closes. The May 21 packet records the user's broad approval for bounded testnet live operations without per-operation human prompts. Any live write must still have an active child bead/run record, budget or mutation target, exact command with `--execute`, `--broadcast`, `--confirm-identity-mutation`, or equivalent flag, and product readback proof. Tx confirmation alone is not success.

AC-9. Final report and ledger closeout.

Evidence target: final report updates Roadmap/Beads with what is green, thin, missing-param, auth-gated, dev-only, degraded, broken, blocked, or STUCK. Close or update child beads honestly, push Beads, and do not claim npm release, public registry proof, production hosted activation, broad live-write authority, or "all operations work."

## Execution Order

1. `omniweb-agents-operator-stress.0`: roadmap propagation.
2. `omniweb-agents-operator-stress.1`: this GoalMode packet.
3. `omniweb-agents-operator-stress.2`: read-surface stress run.
4. `omniweb-agents-operator-stress.3`: write-preview proposed action packets.
5. `omniweb-agents-operator-stress.4`: credential/profile safety blocker wiring.
6. `omniweb-agents-operator-stress.5`: bounded testnet live-write tranche using `docs/goalmode/testnet-live-write-tranche-2026-05-21.md`.
7. `omniweb-agents-operator-stress.6`: final closeout and blocked/STUCK propagation.

Dependency shape:

- `.1` blocks `.2`.
- `.2` blocks `.3`.
- `.3` blocks `.5`.
- `.4` blocks `.5`.
- `omniweb-agents-km3g` blocks `.5`.
- `omniweb-agents-vhat` blocks `.5`.
- `.3` blocks `.6`.

## OperatorHelp Dump Command

Use a current package import path and write a proof artifact under a new ignored or tracked proof directory appropriate to the child bead:

```bash
npm ci # only if the fresh worktree has no node_modules yet
node --import tsx --input-type=module -e '
  import { buildColonyOperatorToolkitHelp, buildToolkitCapabilityManifest } from "./packages/omniweb-toolkit/src/agent.ts";
  const help = buildColonyOperatorToolkitHelp(buildToolkitCapabilityManifest());
  console.log(JSON.stringify({
    format: help.format,
    commandCount: help.commandCount,
    readCommandCount: help.readCommandCount,
    writeCommandCount: help.writeCommandCount,
    filters: help.filters,
    readCommands: help.readCommands,
    writeCommands: help.writeCommands
  }, null, 2));
'
```

If this command drifts, fix the command or use the maintained script that exposes the same `capabilityDiscovery.operatorHelp` envelope. Do not hand-copy the manifest.

## Stop Rules

Stop and record `STUCK` after three failed attempts on the same blocker when the next attempt would repeat the same evidence.

Stop immediately before:

- spending DEM outside the May 21 testnet live-write packet budget or outside a more specific active child-bead budget
- using a local credential path in docs or Beads
- mutating a long-lived identity/profile without a controlled target and cleanup/readback plan
- running domain writes without explicit target/readback proof from the maintained probe path
- treating tx confirmation as product success without product readback
- skipping Codex/GitHub review gates for PR landing

Use `DEGRADED` when:

- a read is available but thin relative to the response-depth promise
- a command needs auth on the current host
- a dev-only endpoint is not present on production
- params exist but maintained help cannot expose enough shape for safe operation
- product indexing lags or disagrees with chain evidence

## Validation Ladder

Preparation PR:

```bash
git diff --check
bd dep cycles --json
bd show omniweb-agents-operator-stress --json
bd show omniweb-agents-operator-stress.0 --json
bd show omniweb-agents-operator-stress.1 --json
```

Read stress:

```bash
npm --prefix packages/omniweb-toolkit run check:live
npm --prefix packages/omniweb-toolkit run check:live:detailed
npm --prefix packages/omniweb-toolkit run check:read-surface
npm --prefix packages/omniweb-toolkit run check:colony-operator-entrypoint
npm --prefix packages/omniweb-toolkit run check:colony-operator-response-depth
```

Write previews:

```bash
npm --prefix packages/omniweb-toolkit run check:colony-operator-multi-action-plan
npm --prefix packages/omniweb-toolkit run check:colony-operator-admissibility
npm --prefix packages/omniweb-toolkit run check:market-write-intents
```

Closeout:

```bash
git diff --check
bd ready --json
bd dep cycles --json
bd dolt push
```

## Launch Prompt

```text
Execute `omniweb-agents-operator-stress` end to end from `docs/goalmode/colony-operator-stress-test-2026-05-19.md`.

Keep Beads as the durable execution ledger. Continue across AC-1 through AC-9 until every anchor has evidence, an explicit DEGRADED verdict, or a STUCK note after three repeated failed attempts on the same blocker. Do not stop at AC-1 or the first successful read pass.

The default no-spend pass is complete. For the follow-on live tranche, use `docs/goalmode/testnet-live-write-tranche-2026-05-21.md`: the user has granted broad approval for bounded testnet live operations without per-operation human approval prompts. Keep explicit script flags mandatory, keep the packet budget, run one operation at a time, and require product readback.

Start from fresh `origin/main`, run `bd dolt pull || true`, inspect `bd ready --json`, claim the next unblocked `omniweb-agents-operator-stress.*` child, branch one PR-sized slice, run the smallest meaningful validation, open a PR, inspect CI and Codex review, update Beads with proof paths, and push Beads after durable state changes.

Hard boundaries:
- no mainnet or real-money operations
- no npm release, public registry proof, or production hosted activation
- no secret, mnemonic, signature, token, private URL, or local credential-path persistence
- no repeated spend before no-spend readback/recheck
- no tx-only success claims where product readback is the success criterion

Required outputs:
- operatorHelp dump with read/write command counts
- read-command classification matrix
- maintained read-sweep proof
- proposed action packets for every write command
- safety closeout verdicts for km3g, vhat, and wck6
- testnet live-write closeout with budget ledger, operation records, readback proof, and green/degraded/STUCK truth
```
