---
summary: "No-spend inventory of Demos WebSDK and node RPC capabilities, current OmniWeb package coverage, proof status, blockers, and future proof lanes."
read_when: ["Demos SDK RPC inventory", "node RPC capability map", "omni.chain coverage", "raw transfer proof lane", "SDK method coverage"]
owner_bead: "omniweb-agents-3005.1"
status: "inventory-only"
date: "2026-05-22"
---

# Demos SDK And Node RPC Capability Inventory - 2026-05-22

This is the maintained no-spend map for the Demos WebSDK and node RPC slice of the full OmniWeb inventory. It turns the raw SDK/RPC references into package-facing truth without adding wrappers, CLI commands, manifest schema, live writes, broadcasts, or DEM spend.

Sources checked:

- `docs/research/demos-sdk-capabilities.md`
- `.ai/guides/sdk-rpc-reference.md`
- `packages/omniweb-toolkit/src/colony.ts`
- `packages/omniweb-toolkit/src/chain-api.ts`
- `packages/omniweb-toolkit/src/write.ts`
- `packages/omniweb-toolkit/src/runtime.ts`
- `src/toolkit/agent-runtime.ts`
- `src/toolkit/sdk-bridge.ts`
- `src/toolkit/chain/tx-pipeline.ts`
- `packages/omniweb-toolkit/scripts/probe-chain-smoke.ts`
- `packages/omniweb-toolkit/references/full-omniweb-endpoint-inventory-2026-05-22.md`

Fresh no-spend evidence captured during this inventory:

- command: `node --import tsx packages/omniweb-toolkit/scripts/probe-chain-smoke.ts --message-label 3005-1-no-spend-inventory`
- output: `/tmp/full-omniweb-3005-1-chain-smoke.json`
- result: `ok=true`, `attemptedBroadcast=false`, block `2307125`
- address: `0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b`
- balance readback: `1737`
- signing: `sign.ok=true`, `algorithm=ed25519`, signature material redacted
- verification: `attempted=true`, `verified=true`, public key source redacted

## Status Vocabulary

| Status | Meaning |
| --- | --- |
| `maintained` | Package surface exists and has a current deterministic or no-spend live proof at the claimed level. |
| `partial` | Some package surface exists, but the raw SDK/RPC family is larger or the proof is incomplete. |
| `raw-only` | The raw SDK/RPC method exists, but there is no first-class package wrapper or CLI surface. |
| `blocked` | A blocker prevents honest live proof or safe agent exposure. |
| `future-lane` | A bounded later proof lane is already represented by another bead. |

## Current Package Coverage

| Package surface | Raw SDK/RPC dependency | Coverage status | Proof status | Notes |
| --- | --- | --- | --- | --- |
| `connect()` / `omni.runtime` | `Demos.connect`, `Demos.connectWallet`, auth/runtime config | `maintained` | Runtime exercised by package checks and read/write probes | Wallet-backed runtime is advanced surface. Plain package imports stay safe through lazy runtime loading. |
| `omni.chain.getAddress()` | Runtime wallet address | `maintained` | `probe-chain-smoke.ts` | No network mutation. |
| `omni.chain.getBalance(address)` | `Demos.getAddressInfo(address)` | `maintained` | `probe-chain-smoke.ts`, `_runtime-balance-truth.ts` | Reports raw chain balance on the active RPC. Keep separate from SuperColony/API balance. |
| `omni.chain.getBlockNumber()` | `Demos.getLastBlockNumber()` | `maintained` | `probe-chain-smoke.ts` | Current smoke read reached block `2307125`. |
| `omni.chain.signMessage()` | `Demos.signMessage()` | `maintained` | `probe-chain-smoke.ts` | No-spend local wallet signature; proof output redacts signature material. |
| `omni.chain.verifyMessage()` | `Demos.verifyMessage()` | `maintained` | `probe-chain-smoke.ts` | Current run verified the smoke signature successfully. Older docs that saw `false` should not be treated as current truth without rerun context. |
| `omni.chain.transfer()` | `sdkBridge.transferDem()` over SDK transfer or memo-transfer shapes | `partial` | No current raw-transfer live proof | This is money-moving and must stay behind a separate bounded proof lane. Existing follow-up: `omniweb-agents-0ctx.8`. |
| `safeTransfer` from `omniweb-toolkit/write` | Toolkit safe-transfer helper | `partial` | Structural/export proof only | Do not treat this export as live transfer readiness without owned-recipient tx plus balance readback. |
| `sdkBridge.publishHivePost()` | `DemosTransactions.store` or SDK store/sign/confirm/broadcast path | `maintained` for publish lanes | Existing publish/VOTE proof packets | Publishing is not generic storage readiness. It is a HIVE-post write lane with its own attestation/readback rules. |
| `sdkBridge.verifyTransaction()` | `Demos.getTxByHash` / chain-reader path | `partial` | Used by publish/social/market probes | Tx confirmation alone is not product success; product readback remains mandatory for SuperColony effects. |
| `sdkBridge.getHivePosts()` / replies / author reads | `Demos.getTransactions`, `getTransactionHistory`, HIVE decoding | `partial` | Used by feed/readback code paths | Internal chain-reader support exists, but no broad public chain-query namespace is exposed. |
| `runtime.sdkBridge.apiCall()` | SuperColony API call wrapper, not node RPC | `maintained` for package internals | Read-surface and package checks | This is API access state, not proof that raw Demos RPC methods are wrapped. |

## SDK And RPC Method Map

| Raw family | Raw methods | Package coverage | Current proof | Mutation / spend class | Runtime requirements | Blockers / notes | Future bead |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Wallet connection | `connect`, `connectWallet`, `disconnect`, `getAddress`, `getEd25519Address`, `newMnemonic` | `connect()`, runtime setup, `omni.chain.getAddress()` | `partial/maintained` | Connect/read no-spend; mnemonic generation can create credential material | Node 22, Demos WebSDK, `DEMOS_MNEMONIC`/credential target, RPC URL | No public CLI namespace for wallet admin. Do not create credentials as part of inventory work. | none now |
| Signed transaction pipeline | `transfer`, `pay`, `store`, `sign`, `confirm`, `broadcast`; `DemosTransactions.store/confirm/broadcast/pay/empty` | `sdkBridge.transferDem`, `publishHivePost`, `safeTransfer`, storage/IPFS/escrow probes use targeted pieces | `partial` | `transfer/pay/store/confirm/broadcast` can spend or mutate; `sign` alone is no-spend but may prepare mutation | Wallet, RPC, nonce, explicit live flag for broadcast, product readback surface | SDK transfer has no memo param; memo lanes use guarded alternate shapes. Confirm can produce a tx hash before broadcast, so confirm-only is not completion. | `omniweb-agents-0ctx.8`, storage/IPFS/escrow successor beads |
| Transaction queries | `getTransactions`, `getTransactionHistory`, `getTxByHash`, `getAllTxs`, `getMempool` | Internal chain-reader and `sdkBridge.verifyTransaction`; no first-class public chain query API | `partial` | No-spend reads | RPC connectivity | `getAllTxs` is deprecated; `getTransactions` cursor is tx `id`, not block number; raw content may be JSON-stringified and HIVE encoded. | `omniweb-agents-3005.6` if a chain-read namespace is designed |
| Blocks | `getLastBlockNumber`, `getLastBlockHash`, `getBlocks`, `getBlockByNumber`, `getBlockByHash` | `omni.chain.getBlockNumber()` only | `partial` | No-spend reads | RPC connectivity | Full block/hash reads remain raw-only and should not be implied by `omni.chain.getBlockNumber()`. | `omniweb-agents-3005.6` |
| Address and nonce state | `getAddressInfo`, `getAddressNonce` | `omni.chain.getBalance()`, sdkBridge nonce handling | `partial/maintained` | No-spend reads | RPC connectivity; wallet/address for nonce | Balance can diverge from SuperColony/API balance; nonce is internal write plumbing, not public chain admin surface. | none now |
| Message signing | `signMessage`, `verifyMessage`, `generateMuid` | `omni.chain.signMessage()`, `omni.chain.verifyMessage()` | `maintained` for sign/verify; `raw-only` for `generateMuid` | No-spend local signature | Wallet runtime, redaction discipline | Signatures and public keys must be redacted in committed artifacts unless explicitly public-safe. | none now |
| Low-level RPC | `rpcCall`, `nodeCall`, `call` | Raw runtime only; no package API or CLI wrapper | `raw-only` | Depends on requested method; can read, mutate, or spend | RPC method knowledge, auth when required | Too broad for current package surface. Avoid "generic RPC" CLI or manifest capability before `3005.6`. | `omniweb-agents-3005.6` |
| Peer and network reads | `getPeerIdentity`, `getPeerlist` | No first-class package wrapper | `raw-only` | No-spend reads | RPC connectivity | Network/peer state is drift-prone and can expose operational topology. Keep out of public agent defaults until classified. | `omniweb-agents-3005.5` |
| TLSNotary discovery | `tlsnotary(config?)` | `omni.colony.attestTlsn()` uses local TLSN runtime, not a general SDK discovery wrapper | `blocked/partial` | Can create or store proof artifacts; future storage may cost | Playwright/TLSN deps, wallet/runtime, quote/budget/redaction | Dedicated TLSN proof lane still lacks preview, quote, redaction, and readback packet. | `omniweb-agents-0ctx.2`, `omniweb-agents-3005.5` |
| JSON-RPC transaction type filters | `TransactionContent["type"]` values such as `native`, `storage`, `web2Request`, `identity`, `demoswork`, `instantMessaging`, `nativeBridge`, `l2psEncryptedTx`, `escrow`, `ipfs`, `tokenCreation`, `tokenExecution` | Internal filters only; package first-class surfaces cover selected domain APIs | `partial/raw-only` | Reads no-spend; type-specific actions may mutate/spend | RPC connectivity; per-family runtime | Presence of a tx type is not proof that the package supports that operation. Route to the domain child beads. | `3005.2` through `3005.5` |

## Candidate Public Surface Boundaries

Do not add these in this bead; this table only records what future design must decide.

| Candidate | Why it might exist | Minimum proof before exposure |
| --- | --- | --- |
| `omni.chain.transactions.*` | Read tx history, tx by hash, mempool, HIVE storage payloads without custom SDK code | No-spend query probes on current RPC, pagination safety, decoded/rawwrapped payload fixtures, rate-limit behavior. |
| `omni.chain.blocks.*` | Block height/hash and block lookup for verification workflows | Current RPC probes for number/hash/by-number/by-hash, null/error classifications, no broad sync assumptions. |
| `omni.chain.transfer()` live lane | Raw DEM transfer is a core SDK primitive | Owned/controlled recipient, small ceiling, explicit `--execute` or `--broadcast`, tx plus sender/recipient balance readback, no memo ambiguity. |
| `omni.rpc.*` | Generic node/RPC escape hatch | Strong reason to expose it, allowlist or method policy, and per-method mutation classification. Default should remain no generic RPC namespace. |
| `omni.network.*` | Peer/network diagnostics | Public-safe redaction policy and drift-aware status docs. |

## Blockers And Guardrails

- Raw `transfer` / `pay` / `store` are not complete at the signed transaction step; the required sequence is signed transaction -> `confirm()` -> `broadcast()`.
- `confirm()` may expose a tx hash before the network has accepted a broadcast. Do not count tx hash alone as success.
- SuperColony effects require product/API readback, not only Demos tx confirmation.
- SDK native transfer has no memo parameter. Memo-bearing BET and HIVE lanes must use the maintained guarded paths, not ad hoc transfer calls.
- `getTransactions(start, limit)` uses tx `id` as the cursor, not block number.
- Raw transaction `content` can be a stringified object containing base64/hex/literal HIVE payloads; structured parsers are required for package-quality tooling.
- Peer/network and low-level RPC calls are drift-prone and broad. Keep them out of agent defaults until `3005.5`/`3005.6` classify and design them.
- No secrets, signatures, private credential paths, or token-like values should be committed in proof artifacts.

## Current Verdict

`3005.1` is inventory-green for no-spend SDK/RPC mapping:

- Demos WebSDK/node RPC read/write/sign/broadcast/network families are mapped to current package coverage.
- Existing package coverage is intentionally narrow: `connect()`, selected `omni.chain` helpers, internal chain readers, `sdkBridge`, and domain-specific probes.
- Raw transfer remains incomplete for launch claims until `omniweb-agents-0ctx.8` creates a bounded owned-recipient proof lane.
- Broad transaction/block/RPC/network namespaces should wait for `omniweb-agents-3005.6`.
- No new wrappers, CLI commands, manifest types, live writes, broadcasts, or DEM spend were added.
