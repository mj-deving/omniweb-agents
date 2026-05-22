---
summary: "Inventory-first map of the full agent-facing OmniWeb endpoint surface across SuperColony, Demos SDK/RPC, and adjacent Demos modules."
read_when: ["full omniweb inventory", "endpoint map", "Demos SDK coverage", "capability roadmap", "CLI namespace planning"]
owner_bead: "omniweb-agents-3005"
status: "inventory-only"
date: "2026-05-22"
---

# Full OmniWeb Endpoint Inventory - 2026-05-22

This is the first full-scope inventory for the agent-facing OmniWeb substrate. It maps what exists in the current package, what exists only in raw Demos/SuperColony sources, what is proven, and what needs follow-up before new wrappers, CLI namespaces, manifest types, or live proof lanes are added.

This document is intentionally inventory-only:

- no new wrappers
- no new CLI commands
- no live writes
- no DEM spend
- no capability-manifest type changes
- no claim of npm, production-hosted, mainnet, or blanket live-operation readiness

Colony Operator remains the first maintained consumer. It is not the whole product identity. The package direction is a shared, agent-first OmniWeb endpoint substrate spanning SuperColony, Demos SDK/WebSDK, node RPC, DemosWork, cross-chain, storage, IPFS, escrow, identity, attestations, privacy, messaging, network, bridge, and cryptography-adjacent surfaces.

## Sources Checked

- `packages/omniweb-toolkit/src/colony.ts`
- `packages/omniweb-toolkit/src/hive.ts`
- `packages/omniweb-toolkit/src/cli/commands.ts`
- `packages/omniweb-toolkit/src/capability-manifest.ts`
- `packages/omniweb-toolkit/src/chain-api.ts`
- `packages/omniweb-toolkit/src/identity-api.ts`
- `packages/omniweb-toolkit/src/escrow-api.ts`
- `packages/omniweb-toolkit/src/storage-api.ts`
- `packages/omniweb-toolkit/src/ipfs-api.ts`
- `packages/omniweb-toolkit/src/tlsn-runtime.ts`
- `docs/research/demos-sdk-capabilities.md`
- `.ai/guides/sdk-rpc-reference.md`
- `packages/omniweb-toolkit/references/demos-sdk-rpc-capability-inventory-2026-05-22.md`
- `packages/omniweb-toolkit/references/demoswork-capability-inventory-2026-05-22.md`
- `packages/omniweb-toolkit/references/xm-rubic-capability-inventory-2026-05-22.md`
- `docs/research/supercolony-api-reference.md`
- `docs/research/supercolony-discovery/openapi.json`
- `packages/omniweb-toolkit/references/colony-surface-sweep-2026-05-21.md`
- `packages/omniweb-toolkit/references/write-spend-surface-sweep-2026-05-21.md`
- `packages/omniweb-toolkit/references/verification-matrix.md`
- `packages/omniweb-toolkit/references/platform-surface.md`

## Status Vocabulary

| Status | Meaning |
| --- | --- |
| `maintained` | Package surface exists and has current validation/proof at the claimed level. |
| `partial` | Some package surface exists, but the raw family is larger or the proof is incomplete. |
| `raw-only` | Raw Demos/SuperColony source exists, but the package has no first-class wrapper. |
| `blocked` | A blocker prevents honest execution or proof. |
| `design-needed` | Inventory exists, but the public interface or CLI namespace should be designed before implementation. |

## Current Toolkit And CLI Baseline

The current runtime `connect()` object exposes:

- `omni.colony` / `omni.hive`
- `omni.identity`
- `omni.escrow`
- `omni.storage`
- `omni.ipfs`
- `omni.chain`
- `omni.toolkit`
- `omni.runtime`

The current JSON CLI is no-spend/read-only and exposes these colony commands:

- `colony feed`
- `colony search`
- `colony post`
- `colony signals`
- `colony convergence`
- `colony report`
- `colony leaderboard`
- `colony top-posts`
- `colony oracle`
- `colony prices`
- `colony price-history`
- `colony markets`
- `colony predictions`
- `colony pool`
- `colony higher-lower-pool`
- `colony binary-pools`
- `colony reactions`
- `colony tip-stats`
- `colony brief top-reply`

The CLI intentionally does not execute writes. Publish, reply, react, tip, bet, identity, storage, IPFS, escrow, or chain transfer work stays behind maintained probes, runtime APIs, explicit live flags, credential targeting, budgets, and product readback.

## Inventory Matrix

| Endpoint family | Raw source / modules | Current toolkit surface | Current CLI surface | Proof status | Mutation / spend class | Runtime requirements | Known blockers | Next bead |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SuperColony / Colony | `openapi.json`, `llms-full.txt`, `supercolony-api-reference.md`, `HiveAPI`, `createClient()` | Broad `omni.colony.*`, read client, capability manifest, operatorHelp, lifecycle/admissibility | Broad no-spend colony read CLI listed above; no write CLI | `maintained` for core reads and many writes; mixed for dev-only mirrors, runtime-basic reads, webhooks, current social targets | Reads are no-spend; writes include write-rate slots, identity/admin mutation, webhook mutation, DEM spend for tip/BET/HL | Public reads or wallet/auth runtime depending method | Proof-doc drift for some mirror/intelligence reads; webhook receiver absent; current social targets thin | Existing `omniweb-agents-6rc3.2`, `.3`, `.4`, `.5`; existing `omniweb-agents-0ctx.1`, `.3`, `.4`, `.5`, `.7` |
| Demos WebSDK and node RPC | `docs/research/demos-sdk-capabilities.md`, `.ai/guides/sdk-rpc-reference.md`, `@kynesyslabs/demosdk/websdk`, `references/demos-sdk-rpc-capability-inventory-2026-05-22.md` | `omni.chain.*`, `sdkBridge`, runtime connect/auth, raw toolkit internals | None beyond colony reads | `partial`: chain sign/read smoke green; raw transfer live proof absent; many SDK/RPC methods are raw-only | Reads/signatures are no-spend; transfer/store/confirm/broadcast can mutate/spend | Node RPC, wallet/mnemonic for signed operations, SDK sign -> confirm -> broadcast pipeline | Transfer memo mismatch risk; tx confirmation alone is not product success; node/RPC drift | `omniweb-agents-3005.1` inventory-green; existing `omniweb-agents-0ctx.8` remains the raw-transfer proof lane |
| DemosWork | SDK `demoswork` module: `DemosWork`, operations, conditions, native/Web2/XM steps; `references/demoswork-capability-inventory-2026-05-22.md` | No first-class package surface; root plugin/stub only returns unavailable when SDK import fails | None | `raw-only/blocked`: SDK classes and helpers are statically mapped, but `@kynesyslabs/demosdk@2.11.5` DemosWork import fails in Node ESM with `ERR_UNSUPPORTED_DIR_IMPORT` | Local composition is no-spend; `prepareDemosWorkPayload` signs a `demoswork` transaction; native/XM/Web2 steps may read, mutate, or spend when executed | SDK import fix, wallet/RPC for signed payloads, per-step runtime and readback model | No package namespace, no CLI, no proof model, missing compile-only fixtures, no execution/readback lifecycle | `omniweb-agents-3005.2` inventory-green; future execution remains blocked until SDK import and proof-lifecycle work |
| XM cross-chain and Rubic bridge | SDK `xmcore`: EVM, Solana, BTC, TON, NEAR, MultiversX, TRON, XRPL, IBC, Aptos, TEN, common chain interface; SDK `bridge`: `RubicBridge`, native bridge helpers; `references/xm-rubic-capability-inventory-2026-05-22.md` | No first-class package surface except adjacent identity helpers and root raw/stub providers; `src/toolkit/chain/napi-guard.ts` exists because XM import can crash | None | `raw-only/blocked`: raw chain adapters and bridge methods are mapped, but direct installed-dependency import of `@kynesyslabs/demosdk/xmcore`/`bridge` segfaulted in the no-spend probe | Reads, signing, transfers, contract writes, bridge quotes/execution, cross-chain spend, and identity mutations depending method | Chain-specific RPCs/wallets/fees, bridge quotes, slippage/budget policy, isolated import guard, product/readback model | No package namespace, import instability, no budget/readback model, high spend and wrong-chain risk | `omniweb-agents-3005.3` inventory-green; future execution remains blocked until import guard and read-only fixtures exist |
| Storage programs / GCR | SDK `storage.StorageProgram`; package storage client; recent storage tx fallback | `omni.storage.read/list/search/hasField/readField`; maintained `probe-storage.ts` for create/set preview/live | None | `partial`: reads have fallback; storage no-spend preview for `colony-operator` is green; no live storage broadcast in current successor | Reads no-spend; create/set writes can cost DEM; current preview estimated 1 DEM create fee | Explicit existing `--agent-name` or `--env-path` before live broadcast | Previous `mj-codex-proof-agent` target missing; live create/set still needs one explicit broadcast and product readback | New `omniweb-agents-3005.4`; existing `omniweb-agents-5mnk.2` |
| IPFS | SDK `ipfs.IPFSOperations`; package `ipfs-api.ts`; `probe-ipfs.ts` | `omni.ipfs.upload/pin/unpin` | None | `partial/blocked`: dry-runs exist; quote returned `Unknown message`; no current upload/pin proof | Upload/pin/unpin can mutate and spend; cost quote required before live | Wallet/auth/runtime, concrete quote, public non-secret content, explicit `--broadcast` | Quote/readback unresolved; no owned CID live proof | New `omniweb-agents-3005.4`; existing `omniweb-agents-5mnk.3` |
| Escrow | SDK `escrow.EscrowTransaction`, `EscrowQueries`; package `escrow-api.ts`; `probe-escrow.ts` | `omni.escrow.sendToIdentity/claimEscrow/refundExpired/getClaimable/getEscrowBalance` | None | `partial/blocked`: dry-run target exists; claimable/balance wrappers degraded or unavailable in current proof | Sends spend DEM; claim/refund mutate escrow state | Wallet/auth/runtime, owned or controlled recipient, explicit `--broadcast`, readback or degraded classification | Claimable/balance readback weak; no current send proof | New `omniweb-agents-3005.4`; existing `omniweb-agents-5mnk.4` |
| Identity / Web2 / XM / UD / Nomis / PQC | SDK `Identities` module; SuperColony agent link APIs; package `identity-api.ts`; `probe-identity-surfaces.ts` | `omni.identity.lookup/link/getIdentities/createProof`; `omni.colony.register`, human-link methods, colony identity reads | None | `partial`: SuperColony register/human-link live-proven as supervised; raw SDK identity families much larger | Reads no-spend; link/register/human-link mutate durable identity/profile state | Wallet/auth/runtime for mutation; explicit identity confirmation; redaction | Deprecated `linkIdentity`; public proof URLs/claims need controlled targets; many raw identity methods unwrapped | New `omniweb-agents-3005.5`; existing closed `omniweb-agents-0ctx.6` remains safety prerequisite |
| DAHR / TLSNotary | SuperColony verify endpoints; SDK `tlsnotary`; package DAHR readiness/publish path; `tlsn-runtime.ts` | `omni.colony.attest`, `omni.colony.attestTlsn`, publish/reply/VOTE attestation integration | None | `maintained` for DAHR attestation/publish paths; `blocked` for dedicated TLSN proof lane | DAHR/TLSN may write/store proof; TLSN fee quote required | Wallet/auth/runtime, reviewed URL, Playwright/TLSN deps for TLSN, redacted proof material | TLSN lacks preview, quote, budget, redaction and readback packet | New `omniweb-agents-3005.5`; existing `omniweb-agents-0ctx.2` |
| L2PS | SDK `l2ps.L2PS`; docs note browser Buffer blocker | No package surface | None | `raw-only/blocked` | Privacy transaction lane; likely mutation/spend depending operation | Browser-compatible runtime and SDK readiness | Current doc says `encryptTx` uses Browser Buffer; no package runtime strategy | New `omniweb-agents-3005.5` |
| Messaging / IMP | SDK `instantMessaging.MessagingPeer`; SuperColony chat reads through `createClient()` | `createClient().getChatRooms/getChatMessages` in manifest; no `omni.*` messaging API | None | `partial`: chat reads classified; no maintained send lane | Reads no-spend; future send would mutate message state | Signaling server, keypair, room/peer target, cleanup/expiry policy | No controlled room, no send/readback proof, no CLI/API namespace | New `omniweb-agents-3005.5`; existing `omniweb-agents-0ctx.7` |
| Bridge / Rubic | SDK `bridge.RubicBridge`: `getTrade`, `executeTrade`, `executeMockTrade` | No package surface | None | `raw-only` | Quote read vs bridge execution spend; cross-chain transfer risk | Wallet/runtime on source and destination chains, quote/slippage limits | No controlled test target, no budget/readback model, no namespace design | New `omniweb-agents-3005.3` |
| Governance, validators, peers, network reads | Demos WebSDK/node RPC: peer identity/list, node calls, blocks, transactions; SDK references mention governance/validator builders in broader docs | `omni.chain.getBlockNumber/getBalance/sign/verify`, raw runtime SDK access | None | `partial`: chain sign/read smoke green; peer/governance/validator surface is raw-only | Reads no-spend; governance/validator builders can mutate/stake/spend | RPC connectivity, wallet for signed actions, product/readback definition | No package inventory or proof classification; avoid implying validator/governance readiness | New `omniweb-agents-3005.1`; new `omniweb-agents-3005.5` for network/governance classification |
| Encryption / ZK-adjacent helpers | SDK `encryption`, `PQC`, `FHE`, `UnifiedCrypto`, `zK.identity`, interactive ZK helpers | No package surface | None | `raw-only` | Mostly local crypto/proof generation until paired with chain/storage actions | Correct runtime environment, proof artifacts, redaction policy | No package threat model, no proof storage/readback convention | New `omniweb-agents-3005.5` |
| Future manifest and CLI namespaces | Package `capability-manifest.ts`, `cli/commands.ts`, operatorHelp | Existing manifest covers colony plus advanced domains; CLI covers colony reads only | Colony read CLI only | `design-needed` | Interface design only until inventories settle | Compatibility with current no-spend defaults and explicit live flags | Need endpoint family maps first to avoid speculative namespace/API churn | New `omniweb-agents-3005.6` |

## Beads Created Or Linked

New inventory epic:

- `omniweb-agents-3005`: Full OmniWeb endpoint inventory and capability map

New child/follow-up beads:

- `omniweb-agents-3005.1`: Audit Demos SDK and node RPC capability inventory
- `omniweb-agents-3005.2`: Audit DemosWork orchestration capability inventory
- `omniweb-agents-3005.3`: Audit XM cross-chain and Rubic bridge inventory
- `omniweb-agents-3005.4`: Reconcile storage IPFS and escrow inventory
- `omniweb-agents-3005.5`: Audit identity attestation messaging network and crypto inventory
- `omniweb-agents-3005.6`: Design future OmniWeb capability manifest and CLI namespaces

Existing beads linked rather than duplicated:

- `omniweb-agents-6rc3.2`: capability manifest coverage for ETH mirror HiveAPI methods
- `omniweb-agents-6rc3.3`: colony read proof doc reconciliation
- `omniweb-agents-6rc3.4`: maintained read sweep coverage for runtime-basic Hive reads
- `omniweb-agents-0ctx.1` through `.8`: write/spend gates and proof-lane hardening
- `omniweb-agents-5mnk.3`: controlled IPFS upload target and readback
- `omniweb-agents-5mnk.4`: controlled escrow send target and readback

## Recommended Sequence

1. Keep this PR inventory-only.
2. Reconcile no-spend documentation and capability truth first: `6rc3.2`, `6rc3.3`, `6rc3.4`.
3. Work the broad endpoint-family inventory children (`3005.1` through `3005.5`) before adding non-colony wrappers or namespaces.
4. Only after the family maps are stable, design manifest and CLI namespaces in `3005.6`.
5. Live proof lanes remain bounded, separate, and explicit. Storage/IPFS/escrow successor work stays in `5mnk.*`; write/spend hardening stays in `0ctx.*`.

## No-Spend Boundary

This inventory does not authorize any live operation. Future live work still requires an active bead or packet naming:

- target
- wallet or credential target
- host/RPC
- command
- explicit live flag
- budget or no-spend classification
- expected product readback
- cleanup/recheck path
- final `GREEN`, `DEGRADED`, `STUCK`, or `BLOCKED` verdict
