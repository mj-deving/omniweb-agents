---
summary: "Design-only proposal for future OmniWeb capability-manifest metadata and JSON CLI namespaces after the 2026-05-22 full endpoint inventory."
read_when: ["future manifest", "CLI namespace design", "capability manifest roadmap", "non-colony CLI", "omniweb namespace plan"]
owner_bead: "omniweb-agents-3005.6"
status: "design-only"
date: "2026-05-22"
---

# Future OmniWeb Manifest And CLI Namespace Design - 2026-05-22

This is the design closeout for `omniweb-agents-3005.6`. It proposes how the package should widen capability discovery and JSON CLI namespaces after the full OmniWeb inventory, without implementing that widening in this bead.

This document is intentionally design-only:

- no public API wrapper
- no CLI command
- no capability-manifest type change
- no SDK import probe
- no live write
- no broadcast
- no DEM spend
- no npm release or production-hosting claim

## Sources Checked

- `packages/omniweb-toolkit/src/capability-manifest.ts`
- `packages/omniweb-toolkit/src/cli/commands.ts`
- `packages/omniweb-toolkit/references/discovery-and-manifests.md`
- `packages/omniweb-toolkit/references/capabilities-guide.md`
- `packages/omniweb-toolkit/references/toolkit-guardrails.md`
- `packages/omniweb-toolkit/references/full-omniweb-endpoint-inventory-2026-05-22.md`
- `packages/omniweb-toolkit/references/demos-sdk-rpc-capability-inventory-2026-05-22.md`
- `packages/omniweb-toolkit/references/demoswork-capability-inventory-2026-05-22.md`
- `packages/omniweb-toolkit/references/xm-rubic-capability-inventory-2026-05-22.md`
- `packages/omniweb-toolkit/references/storage-ipfs-escrow-capability-inventory-2026-05-22.md`
- `packages/omniweb-toolkit/references/identity-attestation-messaging-network-crypto-inventory-2026-05-22.md`

## Current Baseline

The current runtime object already has these maintained top-level domains:

- `omni.colony`
- `omni.identity`
- `omni.escrow`
- `omni.storage`
- `omni.ipfs`
- `omni.chain`
- `omni.toolkit`
- `omni.runtime`

The current capability manifest has typed `domain` values for `colony`, `identity`, `escrow`, `storage`, `ipfs`, and `chain`. It is already useful for operator discovery because it records method names, parameters, runtime requirements, proof tier, lifecycle/readback surfaces, and status policy.

The current JSON CLI is intentionally narrower. It exposes no-spend/read-only `colony` commands and one preview-oriented brief command. It does not execute writes, identity mutations, storage/IPFS/escrow broadcasts, raw transfers, bridge operations, DemosWork, L2PS, messaging sends, or crypto/ZK helpers.

That split should remain. The manifest can become the broader capability truth surface before the CLI becomes broader execution surface.

## Design Principles

1. Keep discovery separate from execution.
2. Keep read namespaces ahead of write namespaces.
3. Keep writes behind existing probes until product readback is proven.
4. Never expose a generic raw RPC or bridge escape hatch as an agent default.
5. Treat importability as a separate readiness axis from method existence.
6. Prefer additive manifest metadata over breaking current `capabilityDiscovery.operatorHelp()` consumers.
7. Preserve the current CLI guarantee: JSON envelopes, no side effects by default.
8. Preserve explicit live flags and budget gates for every spend or mutation path.

## Proposed Namespace Boundaries

| Namespace | Future role | CLI exposure order | Execution boundary |
| --- | --- | --- | --- |
| `colony` | Maintained social, market, scoring, discovery, and common agent workflow surface | Keep existing read CLI first; add no write CLI until a separate execution bead designs it | Existing runtime APIs and probes remain the write path. |
| `chain` | Native Demos account, balance, block, transaction, and carefully bounded transfer family | Start with `chain address`, `chain balance`, `chain block-number`; add `chain tx` and `chain blocks` only after fixtures | `chain transfer` stays out of CLI until `0ctx.8` proves owned-recipient balance readback. |
| `identity` | Demos and SuperColony identity lookup, profile, and supervised linking | Start with read-only lookup and identity-list commands | Link/register/remove stays supervised and explicit; no automatic identity mutation. |
| `storage` | Storage-program reads and later preview/live create/set lanes | Read commands can follow existing `omni.storage.read/list/search/hasField/readField` wrappers after fixture checks | Create/set remains probe-only until `5mnk.2` completes live readback. |
| `ipfs` | IPFS upload/pin/unpin preview and later live proof lanes | No CLI until quote/readback blockers are classified; first command should be quote/preview only | Upload/pin/unpin stays behind `5mnk.3`, explicit `--broadcast`, concrete quote, and public non-secret payload. |
| `escrow` | Escrow readback, preview, send, claim, and refund lanes | Read/preview only after claimable/balance behavior is classified | Send/claim/refund stays behind `5mnk.4`, controlled target, amount ceiling, and readback/degraded verdict. |
| `demoswork` | Workflow compile/validate surface, not a job runner yet | No CLI until SDK import is fixed; first command should be compile/validate-only | Signing, confirm, broadcast, native/XM/Web2 execution remain future gated work. |
| `xm` | Cross-chain read adapters and later chain-specific proof lanes | No CLI until isolated import guard plus read fixtures pass | Wallet creation, signing, transfer, contract write, and identity mutation remain out of scope. |
| `bridge` | Rubic/native bridge quote and later execution lanes | Quote-only after import guard and fixture; no execute command by default | Execution requires budget, slippage, source/destination readback, and wrong-chain safeguards. |
| `network` | Public-safe node, peer, and topology diagnostics | No CLI until redaction and audience are explicit | Governance, validator, staking, and peer mutation are not CLI defaults. |
| `messaging` | Chat/message reads, controlled-room previews, and future send proof | Read-only only after auth/readback fixtures; no send by default | Send requires controlled room, cleanup/expiry, and readback in `0ctx.7`. |
| `l2ps` | Privacy and encrypted-transaction design surface | Manifest inventory only for now | Key material, encrypted tx broadcast, and message send require a threat model first. |
| `crypto` | Local crypto/ZK/PQC/FHE inventory and future fixture surface | Manifest inventory only for now | Key generation, file IO, proof storage, and identity binding require explicit redaction and threat-model work. |

## Proposed Manifest Additions

Future manifest work should be additive. Existing consumers should continue to read the current fields.

Add these optional fields to each capability entry:

| Field | Purpose |
| --- | --- |
| `exposure` | Distinguish `current-api`, `current-cli`, `probe-script`, `operator-help-only`, `inventory-only`, and `blocked`. |
| `riskClass` | Classify `no-spend-read`, `local-only`, `signed-preview`, `remote-mutation`, `identity-admin`, `spend-write`, `cross-chain-spend`, and `secret-material`. |
| `sourceInventory` | Link to the dated reference file and owner bead that justify the entry. |
| `runtimeReadiness` | Record `importable`, `import-blocked`, `fixture-required`, `live-proof-required`, or `not-applicable`. |
| `liveGate` | Name the required gate: `none`, `preview-only`, `--execute`, `--broadcast`, `--confirm-identity-mutation`, `bounded-budget`, or `human-supervised`. |
| `readbackContract` | List the exact product or chain readback that turns a live action into proof. |
| `credentialPolicy` | Record whether the surface is public read, wallet runtime, explicit existing agent profile, external chain wallet, or secret-bearing local material. |
| `successorBeads` | Link proof-lane or implementation beads instead of hiding future work in prose. |

These fields prevent two common failures: treating raw SDK declarations as package support, and treating a signed or confirmed transaction as product success.

## Proposed CLI Shape

The CLI should stay JSON-first and side-effect-free by default. New read commands should return the same envelope shape as current `colony` commands and should include warnings for degraded, raw-only, or fixture-limited surfaces.

Recommended command pattern:

```text
omniweb <namespace> <resource> [read-action] [--json options]
```

Candidate no-spend commands after fixtures:

```text
omniweb chain address
omniweb chain balance --address <addr>
omniweb chain block-number
omniweb chain tx --tx-hash <hash>
omniweb chain blocks --height <n>
omniweb identity lookup --platform github --username <name>
omniweb identity identities --address <demos-address>
omniweb storage read --storage-address <addr>
omniweb storage list --limit <n>
omniweb storage search --query <text> --limit <n>
```

Candidate preview-only commands after successor proof lanes settle:

```text
omniweb storage preview-create --agent-name <existing-agent> --field <name> --value <value>
omniweb ipfs preview-upload --filename <name> --content-file <path>
omniweb escrow preview-send --platform github --username <name> --amount <dem>
```

Commands that should not exist as default CLI commands until later, if ever:

- `omniweb rpc call`
- `omniweb chain transfer`
- `omniweb bridge execute`
- `omniweb xm sign`
- `omniweb demoswork run`
- `omniweb messaging send`
- `omniweb l2ps broadcast`
- `omniweb crypto keygen`

If one of those is eventually needed, it should be introduced by a separate bead with a named target, explicit live flag, budget or no-spend classification, redaction plan, and readback contract.

## Staged Rollout

| Stage | Scope | Gate |
| --- | --- | --- |
| 0 | This document only | Design merged; no code change. |
| 1 | Add manifest metadata fields and tests using existing capabilities only | Backward-compatible manifest snapshot tests and operatorHelp checks. |
| 2 | Add no-spend read CLI for already-wrapped `chain`, `identity`, and `storage` reads | Deterministic fixtures, no wallet mutation, JSON envelope tests, package check. |
| 3 | Add preview-only advanced-domain CLI commands after successor proof lanes settle | Preview output must include target, cost/quote if relevant, live gate, and readback plan. |
| 4 | Add live execution CLI only for a single proven family at a time | Existing proof bead closed, explicit `--execute` or `--broadcast`, bounded budget, product readback, and cleanup/recheck path. |
| 5 | Revisit raw-only families such as DemosWork, XM, bridge, messaging, L2PS, and crypto | Import guard, read-only fixture, threat model, redaction policy, and product reason. |

## Acceptance Gates For Future Implementation

Before a namespace moves from design to implementation:

1. The family inventory must name raw sources, package coverage, blockers, and successor beads.
2. Any SDK import must be proven in an isolated, non-crashing path.
3. Read commands must have deterministic fixtures and response-shape docs.
4. Preview commands must be no-spend and must report the future live gate.
5. Spend or mutation commands must have a live proof bead with a hard budget and readback contract.
6. Proof artifacts must redact secrets, credential paths, signatures, private keys, signed payloads, tokens, and non-public content.
7. CLI help must keep write execution visibly separate from read discovery.

## Current Verdict

`3005.6` is design-green:

- Future namespace boundaries are proposed across colony, chain, identity, storage, IPFS, escrow, DemosWork, XM, bridge, network, messaging, L2PS, and crypto.
- Future manifest metadata is specified as additive, preserving current consumers.
- The staged rollout keeps no-spend reads first, previews second, and live execution last.
- Raw-only and blocked families remain out of public CLI/API implementation until import, fixture, threat-model, budget, and readback gates exist.
- No wrapper, CLI command, manifest schema implementation, SDK import probe, live write, broadcast, or DEM spend was added.
