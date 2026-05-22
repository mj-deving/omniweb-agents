---
summary: "No-spend inventory of DemosWork orchestration capabilities, current package coverage, runtime blockers, and safe future integration boundaries."
read_when: ["DemosWork inventory", "workflow orchestration", "BaseOperation", "ConditionalOperation", "work steps", "demoswork capability map"]
owner_bead: "omniweb-agents-3005.2"
status: "inventory-only"
date: "2026-05-22"
---

# DemosWork Capability Inventory - 2026-05-22

This is the maintained no-spend map for the DemosWork orchestration slice of the full OmniWeb inventory. It classifies the raw SDK workflow surface against current package coverage and records the runtime blockers that must be resolved before any public wrapper, CLI namespace, job runner, or live workflow execution exists.

This document is intentionally inventory-only:

- no DemosWork wrapper
- no CLI command
- no public capability-manifest change
- no workflow execution
- no transaction signing
- no broadcast
- no DEM spend

Sources checked:

- `docs/research/demos-sdk-capabilities.md`
- `.ai/guides/sdk-rpc-reference.md`
- `src/plugins/demoswork-plugin.ts`
- `src/adapters/skill-dojo/multi-step-operations.ts`
- `packages/omniweb-toolkit/references/full-omniweb-endpoint-inventory-2026-05-22.md`
- `packages/omniweb-toolkit/references/demos-sdk-rpc-capability-inventory-2026-05-22.md`
- locked SDK tarball: `@kynesyslabs/demosdk@2.11.5`
- tarball files under `/tmp/demosdk-2.11.5-inspect/package/build/demoswork/`

Fresh no-spend evidence captured during this inventory:

- command: `npm pack @kynesyslabs/demosdk@2.11.5 --pack-destination /tmp/demosdk-2.11.5-inspect`
- static files inspected: `build/demoswork/index.d.ts`, `work.d.ts`, `workstep.d.ts`, `operations/index.d.ts`, `operations/conditional/index.d.ts`, `validator/index.d.ts`, `types/demoswork/*.d.ts`, `types/blockchain/TransactionSubtypes/DemosworkTransaction.d.ts`
- import probe: `node -e "import('/tmp/demosdk-2.11.5-inspect/package/build/demoswork/index.js')..."`
- import result: `ERR_UNSUPPORTED_DIR_IMPORT` resolving `build/demoswork/operations/` from `build/demoswork/operations/baseoperation.js`

## Status Vocabulary

| Status | Meaning |
| --- | --- |
| `raw-only` | Raw SDK type or helper exists, but `omniweb-toolkit` has no first-class package wrapper or CLI surface. |
| `blocked` | Current runtime import or proof blocker prevents honest execution. |
| `composition-only` | Safe to reason about as a local script shape, but not proven as an executable package lane. |
| `future-lane` | Candidate integration must wait for a later bead or explicit design/proof lane. |

## Current Package Coverage

| Surface | Current package state | Proof status | Notes |
| --- | --- | --- | --- |
| `packages/omniweb-toolkit` public API | No DemosWork API | `raw-only/blocked` | The package intentionally exposes no `omni.demoswork`, no workflow CLI, and no manifest schema for this family. |
| Root `src/plugins/demoswork-plugin.ts` | Framework provider outside package surface | `blocked fallback` | It lazy-imports `@kynesyslabs/demosdk/demoswork`; on import failure it returns an unavailable result. It is not a package wrapper. |
| `src/adapters/skill-dojo/multi-step-operations.ts` | Stub action outside package surface | `blocked fallback` | `validate()` returns false and `execute()` returns a DemosWork ESM bug error. |
| SDK tarball exports | `DemosWork`, `BaseOperation`, `ConditionalOperation`, `Condition`, work-step classes, prepare helpers, `runSanityChecks` | `static-only` | Export declarations are present in `@kynesyslabs/demosdk@2.11.5`, but direct Node ESM import still fails before use. |

## Raw DemosWork Method And Class Map

| Raw surface | Role | Mutation / spend class | Runtime requirements | Current blockers | Safe future boundary |
| --- | --- | --- | --- | --- | --- |
| `DemosWork` | Holds `DemoScript`, accepts operations with `push()`, validates with `validate()`, serializes through `toJSON()`, and hydrates through `fromJSON()` | Local composition is no-spend; execution/payload submission is a chain mutation | SDK import, Node ESM compatibility, script schema fixtures | Direct import fails with `ERR_UNSUPPORTED_DIR_IMPORT`; `toJSON()` mutates script shape and logs step payloads, so redaction/fixture discipline is required | Future wrapper should start as compile/validate-only with deterministic fixtures and no wallet runtime. |
| `prepareDemosWorkPayload(work, demos)` | Converts a serialized DemosWork script into a signed `demoswork` transaction | Signs a transaction; later confirm/broadcast would mutate chain state and may spend fees | Wallet runtime, Demos SDK instance, RPC, nonce/signing pipeline | Not importable in current Node ESM path; no package lifecycle/readback model; no budget or product success definition | Keep out of public API until preview/sign/confirm/broadcast/readback phases are separated like other write lanes. |
| `BaseOperation` / `DemosWorkOperation` | Groups steps or nested operations, tracks operation order, critical flag, dependencies, and output references | Local composition is no-spend; enclosed steps determine real risk | SDK import, deterministic script IDs, dependency validation | Import blocked; no test fixtures proving stable serialization | Future proof should validate ordering, nested operation handling, unused-step rejection, dependency IDs, and circular-dependency behavior before exposure. |
| `ConditionalOperation` / `Condition` | Branches on static values or prior work outputs using operators | Local composition is no-spend; branch actions inherit step risk | SDK import, typed operands, output reference model | Import blocked; no package examples for truthy/error branches or missing outputs | Future proof should include no-execution branch fixtures and explicit failure behavior for missing or malformed outputs. |
| `WorkStep` | Base step shape with generated id, context, content, critical flag, dependency list, and output references | No-spend as data; execution depends on subclass context | SDK import and stable schema | Import blocked; IDs are generated, so fixture normalization is required | Future compile-only wrapper must normalize or snapshot IDs without leaking runtime-specific data. |
| `NativeWorkStep` / `prepareNativeStep` | Native chain operation step over `INativePayload` | May transfer DEM, mutate native chain state, or spend fees when executed | Wallet, RPC, explicit budget, target, readback | No package proof lane; native payload semantics overlap `0ctx.8` and other write lanes | Route money-moving native work to separate bounded proof beads, not to a generic workflow runner. |
| `Web2WorkStep` / `prepareWeb2Step` | HTTP/Web2 request step with method, URL, parameters, headers, signature placeholders, and result field | GET may be read-only; non-GET or authenticated requests can create external side effects | URL allowlist, method policy, secret/header redaction, timeout policy | Default helper URL and header shape are not a package policy; no DAHR/TLSN/readback integration | Future design must separate "fetch data" from "attest data" and forbid secret headers in committed artifacts. |
| `XmWorkStep` / `prepareXMStep` | Cross-chain XM script step | Can be read-only, signing, transfer, contract write, or bridge-like spend depending script | Chain-specific RPCs, wallets, fees, proof/readback | XM/Rubic inventory is still pending in `3005.3`; no package budget model | Do not expose XM workflow execution before the XM inventory and proof lanes classify each chain/action. |
| `runSanityChecks` / `noUnusedSteps` | Static validation for unused steps and dependency UID references | No-spend local validation | Import or direct validator path, normalized fixtures | Import blocked through barrel; comments note missing conflict and circular-reference checks | Future compile-only wrapper can reuse this only after import is fixed and missing validations are either added or explicitly compensated. |

## Transaction And Proof Boundary

The SDK defines a `DemosworkTransactionContent` subtype with:

- `type: "demoswork"`
- `data: ["demoswork", DemoScript]`

That confirms DemosWork is a chain transaction family, not just local JSON. For package-quality proof, a future lane must separate:

1. compile/validate a script with no wallet
2. prepare/sign a transaction with a wallet but no broadcast
3. confirm network validity without counting tx hash as product success
4. broadcast only behind an explicit live flag
5. prove execution status or result readback through a maintained product or node surface

Until those stages exist, a composed DemosWork script is not live workflow readiness.

## Blockers And Guardrails

- The locked SDK `@kynesyslabs/demosdk@2.11.5` DemosWork barrel fails in Node ESM with `ERR_UNSUPPORTED_DIR_IMPORT` through `baseoperation.js`.
- Current package has no first-class DemosWork namespace, CLI, capability manifest entry, proof packet, or lifecycle model.
- Workflow steps can hide very different risk classes under one script: local composition, HTTP reads, external HTTP side effects, native DEM movement, cross-chain signing, and cross-chain spend.
- `runSanityChecks` currently covers unused steps and dependency UID references, but comments in the SDK note missing checks for operation reference order conflicts and circular references.
- Web2 step headers, signatures, results, and XM/native payloads can contain secrets or spend-bearing instructions. Do not commit raw runtime artifacts without redaction.
- Do not treat the root demoswork plugin fallback as package support; it is a graceful unavailable provider outside the shipped package surface.

## Current Verdict

`3005.2` is inventory-green and execution-blocked:

- DemosWork classes, operations, steps, helpers, and transaction subtype are mapped.
- Current package coverage is honestly `raw-only/blocked`; there is no package API, CLI namespace, or manifest change.
- The immediate blocker is still SDK Node ESM import failure in `@kynesyslabs/demosdk@2.11.5`.
- Future work should begin with compile/validate-only fixtures after the import path is fixed, then add explicit live-gated proof lanes only for narrowly classified workflow step families.
- No orchestration wrapper, job runner, live execution, broadcast, or DEM spend was added.
