---
summary: "No-spend inventory of identity, DAHR/TLSN attestation, messaging, network/governance, L2PS, and crypto/ZK-adjacent SDK surfaces against current package coverage and safe future boundaries."
read_when: ["identity inventory", "attestation inventory", "TLSN", "messaging inventory", "network peers", "L2PS", "crypto ZK"]
owner_bead: "omniweb-agents-3005.5"
status: "inventory-only"
date: "2026-05-22"
---

# Identity Attestation Messaging Network And Crypto Inventory - 2026-05-22

This is the maintained no-spend map for the remaining advanced Demos SDK surface in the full OmniWeb inventory: identity, DAHR/TLSN attestations, messaging, network/governance/peer reads, L2PS privacy, and crypto/ZK-adjacent helpers. It classifies raw SDK methods against current `omniweb-toolkit` coverage without adding wrappers, CLI commands, identity mutation, TLSN proof storage, messaging send, crypto APIs, or live proof lanes.

This document is intentionally inventory-only:

- no identity add/remove/link mutation
- no TLSN token request or proof storage
- no messaging send or webhook mutation
- no L2PS encrypted transaction broadcast
- no governance, validator, staking, or peer mutation
- no new crypto or ZK wrapper
- no CLI command
- no capability-manifest schema change
- no live write, broadcast, or DEM spend

Sources checked:

- `docs/research/demos-sdk-capabilities.md`
- `.ai/guides/sdk-rpc-reference.md`
- `packages/omniweb-toolkit/src/identity-api.ts`
- `packages/omniweb-toolkit/src/tlsn-runtime.ts`
- `packages/omniweb-toolkit/src/chat-webhook-consumers.ts`
- `src/lib/auth/identity.ts`
- `src/toolkit/supercolony/chain-identity.ts`
- `src/toolkit/sdk-bridge.ts`
- `packages/omniweb-toolkit/scripts/probe-identity-surfaces.ts`
- `packages/omniweb-toolkit/references/full-omniweb-endpoint-inventory-2026-05-22.md`
- `packages/omniweb-toolkit/references/demos-sdk-rpc-capability-inventory-2026-05-22.md`
- `packages/omniweb-toolkit/references/xm-rubic-capability-inventory-2026-05-22.md`
- locked SDK tarball: `@kynesyslabs/demosdk@2.11.5`
- tarball declarations under `/tmp/demosdk-2.11.5-inspect/package/build/abstraction/`, `build/tlsnotary/`, `build/instant_messaging/`, `build/l2ps/`, `build/encryption/`, and `build/types/`

Fresh no-spend evidence captured during this inventory:

- static SDK declarations inspected for `Identities`, `TLSNotary`, `TLSNotaryService`, `MessagingPeer`, `L2PSMessagingPeer`, `L2PS`, `Cryptography`, `PQC`, `FHE`, `UnifiedCrypto`, and `zK`
- package exports inspected from `@kynesyslabs/demosdk@2.11.5`
- direct import probe with installed dependency tree:
  - `@kynesyslabs/demosdk/abstraction`: failed with unsupported directory import under `build/types/blockchain/TransactionSubtypes`
  - `@kynesyslabs/demosdk/tlsnotary`: failed with the same unsupported directory import
  - `@kynesyslabs/demosdk/encryption`: imported and exposed `Cryptography`, `FHE`, `Hashing`, `PQC`, `UnifiedCrypto`, `getUnifiedCryptoInstance`, `ucrypto`, and `zK`
  - `@kynesyslabs/demosdk/l2ps`: imported and exposed `L2PS`
  - `@kynesyslabs/demosdk/instant-messaging` and `@kynesyslabs/demosdk/instant_messaging`: not defined by package `exports`
- no live command, identity mutation, TLSN token request, proof storage, messaging send, peer mutation, L2PS broadcast, or DEM spend was executed

## Status Vocabulary

| Status | Meaning |
| --- | --- |
| `maintained` | Package surface exists and has current validation/proof at the claimed level. |
| `partial` | Some package surface exists, but raw SDK coverage or proof/readback is incomplete. |
| `raw-only` | Raw SDK method exists, but the package has no first-class wrapper or CLI surface. |
| `blocked` | Import, runtime, credential, quote, target, or readback blocker prevents honest execution. |
| `supervised` | Mutation is supported only through explicit human/operator authorization and proof packet. |
| `future-lane` | Candidate work must wait for a later explicit design or proof bead. |

## Current Package Coverage

| Surface | Current package state | Proof status | Notes |
| --- | --- | --- | --- |
| `omni.identity.lookup` | Web2 lookup for Twitter/X, GitHub, Discord, and Telegram via direct RPC helpers | `partial` | Avoids the SDK abstraction barrel because it can fail/crash. Does not expose UD, Nomis, Human Passport, Ethos, PQC, referral, or full XM identity reads. |
| `omni.identity.getIdentities` | Direct `getIdentities` RPC wrapper for one Demos address | `partial` | Safe read when RPC responds; result shape remains broad and not a full family-specific public contract. |
| `omni.identity.createProof` | Creates Demos Web2 proof payload | `partial` | No-spend local/signing helper, but using it in a public platform proof is not itself an identity-link proof. |
| `omni.identity.link` | Twitter/GitHub identity link helper requiring public proof URL | `supervised/partial` | Mutates durable identity state through signed identity transaction confirm/broadcast. No new live mutation in this bead. |
| `probe-identity-surfaces.ts` | Maintained supervised identity proof lane for register and human-link flows | `maintained/supervised` | Requires `--execute --confirm-identity-mutation` plus explicit credential target for live mutation. |
| `sdkBridge.attestDahr` and publish/reply/VOTE attestation paths | DAHR proxy attestation used by maintained publish workflows | `maintained` | Validated by existing SDK bridge and attestation workflow tests. It is not a general TLSN proof storage lane. |
| `omni.colony.attestTlsn` / `tlsn-runtime.ts` | Local TLSN bridge wrapped behind session URL allowlist and wallet requirement | `blocked/partial` | Current dedicated TLSN lane still needs preview, quote, budget, redaction, and readback in `0ctx.2`. |
| `read-profile` verification helpers | Verification read classification for DAHR/TLSN endpoints | `maintained-read` | Read-side classification only; not proof creation or proof storage. |
| `createClient().getChatRooms/getChatMessages` and chat/webhook consumer plans | Chat and webhook reads/plans are represented | `partial` | Reads are auth-gated; send/create/update/delete are plan-only and explicit-execute-gated. |
| `omni.chain.getBlockNumber/getBalance/signMessage/verifyMessage` | Selected chain reads and local sign/verify | `partial` | Peer list, node identity, governance, validator, and staking surfaces remain raw-only. |
| L2PS, SDK messaging peers, encryption, PQC, FHE, ZK helpers | No first-class package surface | `raw-only` | `encryption` and `l2ps` import, but package has no threat model, wrapper, redaction rules, storage/readback convention, or public namespace. |

## Identity Map

| Raw identity surface | Representative methods | Mutation / spend class | Current package coverage | Current blockers | Safe future boundary |
| --- | --- | --- | --- | --- | --- |
| Web2 identity add/remove | `addTwitterIdentity`, `addGithubIdentity`, `addDiscordIdentity`, `addTelegramIdentity`, `inferWeb2Identity`, `removeWeb2Identity` | Identity mutation; signed transaction; durable profile state | `omni.identity.link` only covers selected Twitter/GitHub paths; supervised colony register/human-link lane exists | Abstraction import currently fails; public proofs need controlled URLs, redaction, and explicit mutation confirmation | Keep live mutation in supervised identity beads with before/after readback and cleanup policy. |
| Web2 identity via TLSN | `addWeb2IdentityViaTLSN`, `removeWeb2IdentityViaTLSN` | Identity mutation plus TLSN proof and possible proof storage cost | No package wrapper | Requires TLSN presentation, byte ranges, revealed data, username/user ID, wallet, and redaction | Depends on `0ctx.2` TLSN proof lane before any public identity wrapper. |
| Web2 and Web3 lookups | `getDemosIdsByTwitter/Github/Discord/Telegram`, `getDemosIdsByWeb2Identity`, `getDemosIdsByWeb3Identity`, `getDemosIdsByIdentity` | No-spend reads | Direct RPC lookup helpers cover a subset | Chain/platform naming and result shape need fixtures for broad public API | Candidate read-only extension after `3005.6` namespace design, not ad hoc wrappers. |
| Generic identity reads | `getIdentities`, `getWeb2Identities`, `getXmIdentities`, `getUDIdentities`, `getUserPoints`, `getReferralInfo`, `validateReferralCode` | No-spend reads | `omni.identity.getIdentities` covers only broad address read | Family-specific result shapes are not stabilized in package docs | Add only after shape fixtures and readback semantics are documented. |
| XM identity | `inferXmIdentity`, `removeXmIdentity`, `getXmIdentities`, `getDemosIdsByWeb3Identity` | Reads or identity mutation depending method | Cross-chain identity inventory is linked from `3005.3`; no package XM namespace | XM import instability and wallet/signature redaction | Route through identity plus XM guardrails; no generic bridge/identity merge. |
| Unstoppable Domain | `generateUDChallenge`, `resolveUDDomain`, `addUnstoppableDomainIdentity`, `removeUnstoppableDomainIdentity`, `getUDIdentities` | Reads plus external wallet signature and durable identity mutation | No package wrapper | Requires EVM/Solana signer, signed challenge, resolution data, and cleanup/readback | Start with resolve/challenge read-only fixture before any mutation. |
| Nomis, Human Passport, Ethos | `getNomisScore`, `addNomisIdentity`, `removeNomisIdentity`, `getHumanPassportScore`, `addHumanPassportIdentity`, `removeHumanPassportIdentity`, `getEthosScore`, `addEthosIdentity`, `removeEthosIdentity` | Reputation reads plus durable identity mutation | No package wrapper | External score semantics and thresholds are not package-modeled | Read-only score fixtures first; mutation stays supervised. |
| PQC identity | `bindPqcIdentity`, `removePqcIdentity` | Durable identity mutation bound to cryptographic key material | No package wrapper | Key generation, algorithm choice, redaction, and recovery semantics are not modeled | Wait for crypto threat model and supervised identity lane. |

## Attestation And TLSN Map

| Raw attestation surface | Representative methods | Mutation / spend class | Current package coverage | Current blockers | Safe future boundary |
| --- | --- | --- | --- | --- | --- |
| DAHR proxy attestation | `demos.web2.createDahr().startProxy()` through `sdkBridge.attestDahr` | Attestation write/proof path used by publish workflows | Maintained for publish/reply/VOTE paths | Source quality, URL safety, source format, and auth/rate-limit failures must be handled | Keep as the maintained DAHR path for supported publish workflows. |
| TLSNotary browser proof | `TLSNotary.initialize`, `attest`, `attestQuick`, `verify`, `getTranscript` | Local/browser proof generation; can feed identity/proof storage | `omni.colony.attestTlsn` wraps a local bridge, not a broad SDK wrapper | SDK `tlsnotary` import currently fails; browser/WASM/worker/proxy runtime required | Dedicated no-spend preview in `0ctx.2` before proof storage or identity use. |
| TLSNotary token and proof storage | `TLSNotaryService.requestAttestation`, `createTLSNotary`, `storeProof`, confirmation variants | Burns DEM for token and proof storage; can store on-chain/IPFS | No general package wrapper | Needs concrete quote, hard budget, redaction plan, target URL, and readback | Existing `0ctx.2` only. No live token request or storage in inventory lanes. |
| Verification reads | SuperColony verify endpoints and read-profile verification classifiers | No-spend reads | Read-profile and publish proof workflows classify verification | Not a substitute for creating a new proof | Maintain as readback/verification support. |

Current TLSN cost facts from the SDK reference: token request is 1 DEM, and proof storage is 1 DEM plus 1 DEM per KB. Treat this as spend-bearing until a preview records a concrete quote.

## Messaging And Chat Map

| Raw messaging surface | Representative methods | Mutation / spend class | Current package coverage | Current blockers | Safe future boundary |
| --- | --- | --- | --- | --- | --- |
| SuperColony chat reads | `/api/chat/rooms`, `/api/chat/messages`, `createClient().getChatRooms/getChatMessages` | Auth-gated no-spend reads | Manifest/help expose partial chat read coverage | Auth required; no public unauthenticated proof | Keep read-only and auth-gated. |
| SuperColony chat/webhook mutations | `/api/chat/send`, webhook create/update/delete | Remote mutation, no DEM by default but stateful | `buildChatWebhookPlan` marks explicit execute required and never executable now | No controlled room/webhook receiver, cleanup, or readback | Existing `0ctx.7` and `6rc3.5` remain future lanes. |
| SDK `MessagingPeer` | `connect`, `register`, `discoverPeers`, `requestPublicKey`, `sendMessage`, `awaitResponse`, handlers | WebSocket registration and message mutation | No package namespace; package subpath is not exported | Requires signaling server, keypair, peer target, retention/cleanup policy | Read/discover fixture first; send remains explicit controlled-room lane. |
| SDK `L2PSMessagingPeer` | `connect`, `send`, `history`, `discover`, `requestPublicKey`, handlers | Encrypted message send/history in L2PS network | No package namespace; tarball declarations only | Requires L2PS UID, ed25519 signing function, server, encrypted payload model | Keep raw-only until L2PS and messaging design are both settled. |

## Network Governance And Peer Map

| Raw network surface | Representative methods | Mutation / spend class | Current package coverage | Current blockers | Safe future boundary |
| --- | --- | --- | --- | --- | --- |
| Node RPC reads | `rpcCall`, `nodeCall`, `call`, `getPeerIdentity`, `getPeerlist` | No-spend reads | `omni.chain` covers selected chain reads only; peer/network reads are raw-only | Network topology is drift-prone and may expose operational details | Read-only diagnostics namespace only after `3005.6` decides redaction and audience. |
| Blocks and transactions | `getBlocks`, `getBlockByNumber`, `getBlockByHash`, `getTxByHash`, transaction history | No-spend reads | `omni.chain.getBlockNumber` plus internal chain reader paths | Broad transaction surfaces can leak unrelated wallet/activity data | Keep internal until result limits/redaction are explicit. |
| Governance, validators, staking | Broader docs mention governance/validator builders and validator-adjacent operations | Potential mutation/stake/spend depending operation | No package wrapper | No method-level package proof, no target, no budget/readback model | Do not expose until a raw source and no-spend read fixture are pinned. |

## L2PS Privacy Map

| Raw L2PS surface | Representative methods | Mutation / spend class | Current package coverage | Current blockers | Safe future boundary |
| --- | --- | --- | --- | --- | --- |
| L2PS instance management | `L2PS.create`, `getInstance`, `getInstances`, `setConfig`, `getConfig`, `getKeyFingerprint` | Local state and key material | No package wrapper | Private keys, IVs, network UIDs, and known RPCs need a threat model | Local compile/read fixture only; no public namespace yet. |
| Encrypted transaction wrapping | `encryptTx`, `decryptTx` for `l2psEncryptedTx` | Local encryption until paired with transaction pipeline; later mutation/broadcast | No package wrapper | Existing docs note browser Buffer/runtime concerns; no readback convention | No broadcast or transaction pipeline until privacy proof packet exists. |
| L2PS instant messaging | `L2PSMessagingPeer` send/history/discover | WebSocket message mutation and history read | No package wrapper | Needs messaging and L2PS design together | Future design after `3005.6`, not current inventory. |

The import probe showed `@kynesyslabs/demosdk/l2ps` is importable in the current installed dependency tree, but importability does not imply package readiness.

## Crypto And ZK Map

| Raw crypto surface | Representative methods | Mutation / spend class | Current package coverage | Current blockers | Safe future boundary |
| --- | --- | --- | --- | --- | --- |
| General crypto | `Cryptography.new`, `newFromSeed`, `save`, `saveEncrypted`, `load`, `sign`, `verify`, RSA helpers, `Hashing` | Local key generation, file IO, signing, encryption | No package wrapper | Secret handling, file paths, seed recovery, and redaction are not package-modeled | Keep internal/raw until a threat model and secret policy exist. |
| Unified crypto | `getUnifiedCryptoInstance`, `generateAllIdentities`, `generateIdentity`, `encrypt`, `decrypt`, `sign`, `verify` | Local key material and signatures | No package wrapper | Master seed lifecycle, algorithm selection, and artifact redaction | Candidate only for explicit crypto design, not generic endpoint inventory. |
| PQC/FHE | `PQC.Enigma`, FHE module | Local cryptography; may feed identity/proof lanes | No package wrapper | Algorithm maturity, key serialization, and audit requirements | Do not expose before tests, threat model, and redaction policy. |
| ZK identity and interactive proofs | `zK.identity.ZKIdentity`, `CommitmentService`, `ProofGenerator`, interactive `Prover`/`Verifier` | Local proof generation until stored or submitted | No package wrapper | Proof circuit/runtime artifacts and storage/readback are not modeled | Compile-only fixtures first; proof storage routes through storage/TLSN guardrails. |

The import probe showed `@kynesyslabs/demosdk/encryption` is importable and exposes the expected crypto/ZK groups. This remains raw-only because key material and proof artifacts need explicit handling before public package exposure.

## Existing Proof And Successor Map

| Bead / surface | Scope | Current verdict | What remains |
| --- | --- | --- | --- |
| `omniweb-agents-0ctx.2` | Dedicated TLSN attest proof lane | Open successor | Needs no-spend preview, target URL, dependency readiness, quote, redaction plan, hard budget, proof tx, and verification metadata before any live storage. |
| `omniweb-agents-0ctx.6` | Explicit identity/storage/IPFS/escrow credential targeting safety | Closed prerequisite | Future identity mutation and advanced probes must use explicit credential targets and confirmations. |
| `omniweb-agents-0ctx.7` | Future chat-send mutation gate | Open successor | Needs controlled room, cleanup/expiry policy, explicit live gate, and message readback. |
| `omniweb-agents-6rc3.5` | Controlled webhook receiver proof lane | Open successor | Needs controlled public HTTPS receiver, owned webhook id, create/list/delete readbacks, and sanitized artifacts. |
| `omniweb-agents-3005.3` | XM/Rubic and cross-chain identity adjacency | Inventory-green | Cross-chain identity remains identity-supervised, not a generic bridge surface. |
| `omniweb-agents-3005.6` | Future manifest and CLI namespace design | Next design bead | Should decide whether these families get read-only namespaces, remain raw-only, or stay internal. |

## Guardrails

- Do not expose raw identity, TLSN, messaging, L2PS, governance, validator, crypto, or ZK helpers just because their declarations exist.
- Do not treat local crypto or proof generation as product proof until a storage/readback path is specified.
- Do not commit seeds, private keys, signed identity payloads, TLSN presentations, proof ranges, revealed receive bytes, chat tokens, webhook tokens, peer keys, or L2PS private material.
- Do not run identity mutation without `--execute --confirm-identity-mutation` and an explicit credential target.
- Do not run TLSN token request or proof storage without a concrete quote and explicit spend authorization.
- Do not add broad CLI or capability-manifest namespaces before `3005.6`.

## Current Verdict

`3005.5` is inventory-green and execution-blocked/deferred:

- Identity, attestation, privacy, messaging, network, governance, and crypto/ZK families are classified with raw sources, current package surface, proof status, mutation/spend class, runtime requirements, blockers, and safe next beads.
- Current package coverage is intentionally partial: selected identity reads/writes, DAHR publish attestation, TLSN bridge hooks, chat read/planning, and selected chain reads exist; the raw SDK families are larger.
- `@kynesyslabs/demosdk/encryption` and `@kynesyslabs/demosdk/l2ps` import successfully, but remain raw-only.
- `@kynesyslabs/demosdk/abstraction` and `@kynesyslabs/demosdk/tlsnotary` fail in the current Node import probe; SDK instant messaging declarations exist but no exported package subpath is available.
- No identity mutation, TLSN token request, proof storage, messaging send, peer mutation, L2PS broadcast, wrapper, CLI command, capability-manifest schema change, live write, or DEM spend was added.
