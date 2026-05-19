---
summary: "PR5 non-colony domain proof for full action-spectrum rows D1-D8, with throwaway-wallet readiness, targeted dry-run payloads, blocked write verdicts, and chain sign/read smoke evidence."
topic_hint:
  - "action spectrum domain proof"
  - "escrow storage ipfs chain"
  - "PR5 non-colony writes"
---

# Full Action Spectrum Domain Write Proof - 2026-05-19

Owner bead: `omniweb-agents-action-spectrum.5`

Branch: `codex/action-spectrum-pr5-domain`

Mode: no-spend/no-broadcast PR5 domain sweep. Existing Beads memory `action-spectrum-live-spend-gates` explicitly authorized PR2/PR3 only and states that PR5 domain mutation needs a later bounded execution record. No PR5 budget, recipient, storage, IPFS, raw-transfer, or cleanup gate was recorded, so PR5 proves payload/readiness coverage and marks write rows blocked instead of broadcasting.

## Target

- throwaway agent name: `action-spectrum-pr4-20260519-01`
- throwaway wallet: `0x0b7468ded5583cb02c964d2bb93146b24824fe89db09f4ddefe3054383061f09`
- host: `https://supercolony.ai`
- RPC: `https://node3.demos.sh/`
- state dir: `.action-spectrum-state/pr5/agents/action-spectrum-pr4-20260519-01`
- proof dir: `packages/omniweb-toolkit/references/action-spectrum-live-proof-2026-05-19/pr5/`

Readiness passed on the throwaway wallet with `1000` testnet DEM, no colony/chain balance divergence, chain block `2285754`, and write-rate headroom. Proof files contain only public addresses, redacted credential placeholders, and no mnemonic, private key, auth token, or signature material.

## Commands

Throwaway readiness:

```bash
node --import tsx packages/omniweb-toolkit/scripts/check-publish-readiness.ts \
  --agent-name action-spectrum-pr4-20260519-01 \
  --state-dir .action-spectrum-state/pr5/agents/action-spectrum-pr4-20260519-01
```

Maintained dry-run probes:

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-escrow.ts \
  --platform github \
  --username action-spectrum-pr5-20260519 \
  --amount 0.1 \
  --message "action-spectrum-pr5 dry-run escrow target" \
  --state-dir .action-spectrum-state/pr5/agents/action-spectrum-pr4-20260519-01

node --import tsx packages/omniweb-toolkit/scripts/probe-storage.ts \
  --program-name action-spectrum-pr5-20260519 \
  --state-dir .action-spectrum-state/pr5/agents/action-spectrum-pr4-20260519-01

node --import tsx packages/omniweb-toolkit/scripts/probe-ipfs.ts \
  --filename action-spectrum-pr5-20260519.txt \
  --content "Action spectrum PR5 dry-run IPFS payload, generated 2026-05-19, no broadcast without bounded PR5 budget." \
  --state-dir .action-spectrum-state/pr5/agents/action-spectrum-pr4-20260519-01
```

The maintained escrow/storage/IPFS probes do not accept `--agent-name` / `--env-path`, so their dry-run outputs still report the configured wallet. PR5 keeps those files as script-gap evidence and uses `targeted-domain-dry-run.json`, generated via `connect({ agentName })`, as the throwaway-wallet payload proof.

Targeted no-spend readback and chain smoke:

```bash
node --input-type=module --import tsx -e '<targeted connect({ agentName }) domain dry-run/readback>'
```

## Verdicts

| Row | Verdict | Evidence |
| --- | --- | --- |
| D1 escrow send | blocked / dry-run only | Targeted dry-run used platform `github`, username `action-spectrum-pr5-20260519`, amount `0.1`, message `action-spectrum-pr5 dry-run escrow target`. No `sendToIdentity` broadcast was attempted because PR5 has no bounded escrow budget. |
| D2 escrow claim/refund | blocked / no owned escrow | No PR5 escrow was created. No claim/refund was attempted. The available query wrappers returned `Method not implemented: get_claimable_escrows` and `Method not implemented: get_escrow_balance`, which is recorded as readback surface evidence. |
| D3 storage create/set | blocked / dry-run only | Targeted dry-run derived storage address `stor-88bc0ec8b17cd2efa76540a01a9ec636bbffe7f5`, estimated create fee `1` DEM, and produced CREATE_STORAGE_PROGRAM plus SET_FIELD payloads. No broadcast was attempted without a PR5 storage budget. |
| D4 storage reads after write | degraded / no write to read | Since D3 did not broadcast, `omni.storage.read()` for `stor-88bc0ec8b17cd2efa76540a01a9ec636bbffe7f5` returned `Storage program not found`, `hasField=false`, and `readField=null`. |
| D5 IPFS upload | blocked / dry-run only | Targeted dry-run used `action-spectrum-pr5-20260519.txt`, 104 bytes. Quote returned `{ error: "Unknown message" }`. No upload broadcast was attempted without a PR5 IPFS budget. |
| D6 IPFS pin/unpin | blocked / no PR5-owned CID | No PR5 upload CID exists because D5 was not broadcast, so pin/unpin were not attempted. |
| D7 raw chain transfer | blocked / dry-run only | Targeted raw-transfer dry-run was self-transfer `0.1` DEM with memo `ACTION_SPECTRUM_PR5_DRY_RUN`. No transfer was attempted because PR5 has no spend cap/recipient gate. |
| D8 chain sign/read | degraded partial | `getBalance` returned `1000`, `getBlockNumber` returned `2285764`, and `signMessage` returned a redacted signature object. `verifyMessage` was attempted and returned `false`, so the read/sign smoke is not a full pass. |

## Proof Bundle

```text
packages/omniweb-toolkit/references/action-spectrum-live-proof-2026-05-19/pr5/
  readiness-preflight.json
  targeted-domain-dry-run.json
  domain-readback-and-blockers.json
  chain-sign-read-smoke.json
  escrow-dry-run.json
  storage-dry-run.json
  ipfs-dry-run.json
```

## Current Truth

The non-colony domain surfaces are wired enough to derive escrow, storage, IPFS, and chain payloads from a throwaway wallet, but PR5 did not have an explicit bounded execution gate. Storage/IPFS also need clearer quote and readback behavior before they should be called fully proven, and the maintained domain probes should gain explicit `--agent-name` / `--env-path` targeting before future throwaway broadcasts.
