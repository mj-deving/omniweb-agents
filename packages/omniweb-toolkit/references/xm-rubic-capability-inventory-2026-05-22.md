---
summary: "No-spend inventory of XM cross-chain adapters, cross-chain identity hooks, Rubic bridge methods, current package coverage, blockers, and future proof boundaries."
read_when: ["XM inventory", "cross-chain", "Rubic bridge", "xmcore", "native bridge", "cross-chain identity"]
owner_bead: "omniweb-agents-3005.3"
status: "inventory-only"
date: "2026-05-22"
---

# XM And Rubic Capability Inventory - 2026-05-22

This is the maintained no-spend map for the XM cross-chain and Rubic bridge slice of the full OmniWeb inventory. It classifies the raw SDK chain adapters, cross-chain identity hooks, and bridge helpers against current package coverage without adding wrappers, CLI commands, wallet expansion, bridge execution, cross-chain spend, or live proof lanes.

This document is intentionally inventory-only:

- no `omni.xm` or `omni.bridge` namespace
- no CLI command
- no public capability-manifest change
- no wallet creation or import
- no cross-chain transaction signing
- no bridge quote execution
- no live writes
- no DEM or non-DEM spend

Sources checked:

- `docs/research/demos-sdk-capabilities.md`
- `.ai/guides/sdk-rpc-reference.md`
- `src/plugins/chain-query-plugin.ts`
- `src/toolkit/chain/napi-guard.ts`
- `packages/omniweb-toolkit/references/full-omniweb-endpoint-inventory-2026-05-22.md`
- `packages/omniweb-toolkit/references/demos-sdk-rpc-capability-inventory-2026-05-22.md`
- `packages/omniweb-toolkit/references/demoswork-capability-inventory-2026-05-22.md`
- locked SDK tarball: `@kynesyslabs/demosdk@2.11.5`
- tarball files under `/tmp/demosdk-2.11.5-inspect/package/build/multichain/`, `build/bridge/`, `build/abstraction/`, and `build/types/`

Fresh no-spend evidence captured during this inventory:

- static SDK exports inspected from `@kynesyslabs/demosdk@2.11.5` package `exports`: `./xmcore`, chain-specific `./xmcore/*`, `./xm-websdk`, `./xm-localsdk`, `./bridge`, and `./abstraction`
- static declarations inspected: `build/multichain/core/*.d.ts`, `build/multichain/websdk/*.d.ts`, `build/bridge/*.d.ts`, `build/types/bridge/*.d.ts`, `build/types/abstraction/index.d.ts`, and `build/abstraction/Identities.d.ts`
- direct import probe with installed dependency tree: `node -e "Promise.all([import('@kynesyslabs/demosdk/xmcore'), import('@kynesyslabs/demosdk/bridge')])..."`
- import result: process exited `139` with segmentation fault; no repo artifact was committed from the probe

## Status Vocabulary

| Status | Meaning |
| --- | --- |
| `raw-only` | Raw SDK method exists, but `omniweb-toolkit` has no first-class wrapper or CLI surface. |
| `blocked` | Runtime import or proof blocker prevents honest execution. |
| `read-candidate` | Method may be no-spend if used as a read with safe RPC configuration, but has no package proof lane yet. |
| `write-spend` | Method signs, transfers, writes contracts, bridges assets, or otherwise risks funds/state. |
| `future-lane` | Candidate work must wait for a later explicit design or proof bead. |

## Current Package Coverage

| Surface | Current package state | Proof status | Notes |
| --- | --- | --- | --- |
| `packages/omniweb-toolkit` public API | No first-class XM or bridge API | `raw-only/blocked` | The package intentionally exposes no `omni.xm`, no `omni.bridge`, no cross-chain CLI, and no manifest schema for this family. |
| `src/plugins/chain-query-plugin.ts` | Root framework provider outside package surface | `partial/raw-only` | It queries Demos native `getAddressInfo` through JSON-RPC; despite its description, it does not wrap XM chain adapters or bridge methods. |
| `src/toolkit/chain/napi-guard.ts` | Guard for `@kynesyslabs/demosdk/xmcore` import crashes | `blocked evidence` | It forks a child process because an XM native/NAPI crash can kill the agent. The fresh import probe for this inventory exited 139. |
| Cross-chain identity package surfaces | `omni.identity.*` wraps selected Demos identity reads/writes, not full XM identity | `partial` | Raw `Identities.getXmIdentities`, `getDemosIdsByWeb3Identity`, `inferXmIdentity`, and `removeXmIdentity` remain broader than package identity helpers. |
| Rubic/native bridge surfaces | None | `raw-only/blocked` | No package quote, mock-trade, execute-trade, gasless bridge, or atomic deposit/bridge lane exists. |

## XM Chain Adapter Map

| Raw chain adapter | Read candidates | Write / spend methods | Runtime requirements | Current blockers | Safe future boundary |
| --- | --- | --- | --- | --- | --- |
| Common XM interface | `connect`, `setRpc`, `getAddress`, `getPublicKey`, `getBalance`, `getEmptyTransaction`, `verifyMessage` | `connectWallet`, `preparePay`, `preparePays`, `prepareTransfer`, `prepareTransfers`, `signMessage`, `signTransaction`, `signTransactions` | Chain RPC, chain wallet/private key where signing is involved | `@kynesyslabs/demosdk/xmcore` import crashes in current Node runtime | Start with isolated import guard plus read-only adapter probes before any public namespace. |
| EVM | `getBalance`, `getTokenBalance`, `isAddress`, `getContractInstance`, `readFromContract`, event listeners, `waitForReceipt` | `connectWallet`, `preparePay`, `preparePays`, `createRawTransaction`, `signTransaction`, `writeToContract` | EVM RPC, chain id, gas model, private key for signing | No package namespace, no allowlist for RPC/contract/ABI, no gas or readback model | Candidate first proof: read-only contract call fixture on a public RPC with pinned ABI and no wallet. |
| Solana | `getBalance`, `fetchAccount`, `getProgramIdl` | `createWallet`, `connectWallet`, `preparePay`, `preparePays`, `runAnchorProgram`, `runRawProgram`, `signTransaction` | Solana RPC, keypair or Phantom in web runtime | Wallet creation leaks credential material; program execution can mutate state | Candidate first proof: account read fixture only; program execution remains live-gated. |
| BTC | `fetchUTXOs`, `fetchAllUTXOs`, `getFeeRate`, `getTxHex`, `getBalance`, `getLegacyAddress`, `getPublicKey`, address/network inference | `generatePrivateKey`, `connectWallet`, `preparePay`, `preparePays`, `signTransaction`, `signMessage` | BTC API/RPC, WIF or mnemonic for signing, network inference | UTXO selection, fee/noise options, change address handling, and key material are not package-modeled | Candidate first proof: address/UTXO read fixture with no wallet import. |
| TON | `getBalance`, `getPublicKey`, `estimateFee`, `cellsToSendableFile` | `connectWallet`, `preparePay`, `preparePays`, `signTransaction` | TON RPC, mnemonic/keypair, cell serialization | Fee/cell semantics and signing path have no package proof | Keep as raw-only until chain-specific fee and readback docs exist. |
| NEAR | `getBalance` | `connectWallet`, `preparePay`, `preparePays`, `createAccount`, `deleteAccount`, `signTransaction` | NEAR RPC, account id, private key, network id | Account creation/deletion are stateful and spend-bearing | Reads only until account lifecycle proof has explicit target and cleanup. |
| MultiversX | `getBalance`, `getTokenBalance`, `getNFTs` | `connectWallet`, `connectKeyFileWallet`, `preparePay`, `preparePays`, `signTransaction` | MultiversX RPC, keyfile/password or private key | Keyfile/password handling and NFT/token semantics are unmodeled | Reads only until redacted key handling and amount units are specified. |
| TRON | `getBalance`, `getInfo`, `trxToSun`, `sunToTrx` | `createWallet`, `connectWallet`, `preparePay`, `preparePays`, `sendTransaction`, `signTransaction` | TRON RPC, private key, SUN/TRX units | `createWallet` returns unencrypted private key; `sendTransaction` broadcasts | Do not expose until credential and broadcast boundaries are explicit. |
| XRPL | `getBalance`, `getEmptyTransaction`, `xrplGetLastSequence` | `connectWallet`, `preparePay`, `preparePays`, `signTransaction` | XRPL WebSocket/RPC, private key, sequence handling | Payment transaction sequence/readback model absent | Reads only until sequence and tx readback are proven. |
| IBC / Cosmos | `getBalance`, `getEmptyTransaction` | `connectWallet`, `preparePay`, `preparePays`, `ibcSend`, `signTransaction` | Cosmos RPC, denom/gas options, signer | Denom, gas, and IBC send semantics are unmodeled | Keep out of package defaults until denom-specific fixtures exist. |
| Aptos | `getAPTBalanceDirect`, `getCoinBalanceDirect`, `readFromContractDirect`, `getAPTBalance`, `getCoinBalance`, `readFromContract`, `waitForTransaction`, `isAddress` | `connectWallet`, `preparePay`, `preparePays`, `writeToContract`, `signTransaction` | Aptos RPC/network, account private key, module/function target | Direct vs Demos XM operation paths differ; write returns signed or XM script depending method | Candidate first proof: direct balance/read fixture; writes wait for chain-specific proof lane. |
| TEN | `getBalance`, `getEmptyTransaction` | `connectWallet`, `preparePay`, `preparePays`, `signTransaction` | TEN/EVM-like RPC, private key, EIP-1559 tx data | No package proof and no chain policy | Raw-only until there is a product reason and read fixture. |

## Cross-Chain Identity Map

| Raw identity surface | Role | Mutation / spend class | Runtime requirements | Current blockers | Safe future boundary |
| --- | --- | --- | --- | --- | --- |
| `Identities.getXmIdentities(demos, address?)` | Read cross-chain identities linked to a Demos address | No-spend read | Demos SDK instance and RPC | Package identity helpers do not expose this as a dedicated XM namespace | Candidate for `3005.5` identity inventory, not this bridge/XM execution lane. |
| `Identities.getDemosIdsByWeb3Identity(demos, chain, address)` | Reverse lookup Demos accounts by web3 identity | No-spend read | Chain string like `eth.mainnet`, Demos RPC | Chain naming and result shape need fixtures | Candidate read-only proof after identity inventory settles. |
| `Identities.inferXmIdentity(demos, payload, referralCode?)` | Bind a web3 identity from signature proof | Identity mutation; may require signing and confirmation | Wallet runtime, signed data, public key/signature, target chain/subchain | Mutates durable identity/profile state; needs supervision and redaction | Route to identity/supervision lane, not generic XM. |
| `Identities.removeXmIdentity(demos, payload)` | Remove cross-chain identity | Identity mutation | Wallet runtime and target identity payload | Destructive identity mutation with no current package proof | Keep supervised and explicit, with before/after readback. |

## Rubic And Native Bridge Map

| Raw bridge surface | Role | Mutation / spend class | Runtime requirements | Current blockers | Safe future boundary |
| --- | --- | --- | --- | --- | --- |
| `RubicBridge.getTrade(demos, chain, payload)` | Quote or discover a Rubic cross-chain trade for `NATIVE`, `USDC`, or `USDT` | Likely no-spend quote if implemented as read | Demos SDK, Rubic dependencies, source/destination chain ids, amount | Import path currently unavailable due native/optional dependency crash in combined probe; no quote fixture | First future lane should be quote-only with tiny public tokens and no wallet signing. |
| `RubicBridge.executeTrade(demos, chain, payload)` | Execute a Rubic trade | Cross-chain spend and state mutation | Wallets, source/destination chains, slippage, fees, readback | No controlled test target, no budget/readback model | Explicitly out of scope until quote-only lane and budget model exist. |
| `RubicBridge.executeMockTrade(demos, chain, trade)` | Execute SDK mock trade object | Potential mutation depending implementation | Rubic SDK trade object and wallet/runtime | Mock semantics are not package-proven; can create false confidence | Treat as raw-only until mocked-vs-live semantics are documented. |
| Native bridge `generateOperation` | Creates bridge RPC request | No-spend request construction, but spend intent | Private/public key, origin/destination chain, addresses, amount, token | Key material, amount units, and supported chains/tokens are not package-modeled | Compile-only fixtures first, no signing secrets in artifacts. |
| Native bridge `generateOperationTx` | Generates signed bridge transaction for confirm/broadcast | Signs transaction; later confirm/broadcast mutates/spends | Compiled bridge operation, Demos wallet/RPC | No signing/readback lane; bridge tx has high blast radius | Keep out of public API until staged lifecycle mirrors write-spend proof rules. |
| Native bridge gasless and atomic helpers | Generate signatures and RPC requests for gasless/atomic deposits and bridges | Signatures authorize spend/mutation even before broadcast | Private key, nonce, token/chain ids, recipient, amount, bridge fee | Secret key handling and replay/nonce risks | No package exposure before a threat model, redaction plan, and quote/readback proof exist. |

## Blockers And Guardrails

- Direct `@kynesyslabs/demosdk/xmcore` / `bridge` import with the installed dependency tree segfaulted in the fresh no-spend probe. Use isolated child-process guards before any runtime experiment.
- The current package has no XM or bridge namespace, no CLI, no manifest schema, and no proof packet for these surfaces.
- Chain adapters mix read-only methods with wallet creation, private-key import, transaction signing, contract writes, transfers, bridge execution, and account lifecycle mutations.
- Cross-chain identity is an identity mutation/readback concern, not generic chain tooling. Route it through `3005.5` and supervised identity guardrails.
- Bridge helpers have high spend and wrong-chain risk. A quote-only proof does not imply execute readiness.
- Do not commit private keys, seed phrases, signatures, raw signed transactions, bridge operations with real recipient addresses, or chain-specific auth material.
- Generic `omni.rpc`, `omni.xm`, or `omni.bridge` namespaces should wait for `3005.6` after all family inventories settle.

## Current Verdict

`3005.3` is inventory-green and execution-blocked:

- XM chain adapters, cross-chain identity hooks, Rubic bridge methods, native bridge helpers, current package coverage, runtime requirements, and blockers are mapped.
- Current package coverage is honestly `raw-only/blocked`; there is no first-class package API, CLI namespace, or manifest change.
- The immediate runtime blocker is XM/bridge import instability, observed as a segmentation fault in the no-spend import probe.
- Future work should start with isolated import guards and read-only chain fixtures; bridge execution, cross-chain transfers, identity mutation, and wallet expansion remain explicitly out of scope.
- No cross-chain spend, bridge execution, wallet expansion, live write, wrapper, CLI command, or capability-manifest change was added.
