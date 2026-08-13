---
summary: "Inventory of the public package write subpath root imports before any adapter or runtime-boundary refactor."
topic_hint:
  - "package write boundary"
  - "write subpath imports"
  - "root toolkit imports"
  - "public export coverage"
---

# Package Write Boundary Inventory - 2026-06-15

Inventory artifact for `omniweb-agents-s993.2`.

Scope exclusions:

- no package source behavior changes
- no package export changes
- no root toolkit source movement
- no live probes, wallet setup, `--execute`, `--broadcast`, or spend

## Source Surface

Checked file:

- `packages/omniweb-toolkit/src/write.ts`

Current root-toolkit import proof:

```bash
rg -n "from ['\\\"]../../../src/toolkit/(sdk-bridge|safe-transfer|supercolony|types)" packages/omniweb-toolkit/src/write.ts
```

Current matches:

```text
6:} from "../../../src/toolkit/supercolony/bet-memos.js";
16:} from "../../../src/toolkit/sdk-bridge.js";
17:export { safeTransfer } from "../../../src/toolkit/safe-transfer.js";
23:} from "../../../src/toolkit/sdk-bridge.js";
27:} from "../../../src/toolkit/safe-transfer.js";
39:} from "../../../src/toolkit/types.js";
86:} from "../../../src/toolkit/supercolony/types.js";
```

Import classes:

- value exports from `src/toolkit/supercolony/bet-memos.ts`:
  `buildBetMemo`, `buildHigherLowerMemo`, `buildBinaryBetMemo`,
  `VALID_BET_HORIZONS`
- value exports from `src/toolkit/sdk-bridge.ts`:
  `DEFAULT_TRANSFER_SHAPE`, `WALLET_NATIVE_TRANSFER_SHAPE`,
  `classifyDemTransferAmount`, `executeWalletNativeTransfer`,
  `extractWalletNativeTxHash`, `getInjectedDemosProvider`,
  `normalizeTransferShape`
- value export from `src/toolkit/safe-transfer.ts`: `safeTransfer`
- type exports from `src/toolkit/sdk-bridge.ts`:
  `DemTransferAmountSupport`, `DemosProviderLike`, `TransferShape`
- type exports from `src/toolkit/safe-transfer.ts`:
  `SafeTransferOptions`, `TransferInputSource`
- type exports from `src/toolkit/types.ts`: publish, reply, attest, source
  attestation, and tool result contracts
- type exports from `src/toolkit/supercolony/types.ts`: prediction,
  market, pool, bet-registration, and registered-transfer contracts

## Public Export Impact

`packages/omniweb-toolkit/package.json` exposes `./write` as a public subpath:

```json
"./write": {
  "import": "./dist/write.js",
  "types": "./dist/write.d.ts"
}
```

`packages/omniweb-toolkit/tsup.config.ts` builds that subpath from
`src/write.ts`, so any source move must preserve the `dist/write.js` and
`dist/write.d.ts` contract.

`bun run --cwd packages/omniweb-toolkit check:public-export-coverage` passed and
reported `./write` as covered by:

- `packages/omniweb-toolkit/scripts/check-hosted-operator-consumer.ts`
- `packages/omniweb-toolkit/scripts/check-write-surface-sweep.ts`
- `tests/packages/market-write-proof.test.ts`
- `tests/packages/social-write-proof.test.ts`

Consumer/documentation references also name `omniweb-toolkit/write` directly,
including README import-surface text, verification matrix helper exports, and
the hosted-operator consumer proof. Treat `./write` as compatibility-sensitive
public API.

## Candidate Adapter Boundary

An adapter-only follow-up is bounded if it keeps these constraints:

- create one package-local internal adapter module, for example
  `packages/omniweb-toolkit/src/write-adapter.ts`
- move the direct root-toolkit re-exports from `write.ts` into that adapter
- keep `write.ts` as the public subpath entrypoint and re-export the same names
  from the adapter
- keep package exports, type names, value names, and runtime semantics unchanged
- scope importer proof to `write.ts` plus the adapter file only, not the whole
  package source tree

This boundary would localize the root-toolkit dependency behind one package
adapter file. It would not prove removal of the root runtime dependency, and it
must not move DEM/write behavior into package code.

## Decision For `omniweb-agents-s993.3`

ALLOW: proceed to `omniweb-agents-s993.3` only for an adapter-only refactor that
preserves the `./write` public surface exactly and reruns export/release checks.

STOP: do not proceed in `s993.3` if the change requires export rename/removal,
semantic write behavior changes, root toolkit source movement, live probes,
wallet/provider setup, `--execute`, `--broadcast`, or spend.

Required follow-up proof:

```bash
rg -n "from ['\\\"]../../../src/toolkit" \
  packages/omniweb-toolkit/src/write.ts \
  packages/omniweb-toolkit/src/write-adapter.ts
bun run --cwd packages/omniweb-toolkit check:public-export-coverage
bun run --cwd packages/omniweb-toolkit check:release
```
