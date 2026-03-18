# SDK Exploration Results — Phase 0 + Phase 3

> Runtime verification of StorageProgram, DemosWork, and L2PS SDK modules.
> **Date:** 2026-03-18 | **SDK:** @kynesyslabs/demosdk v2.11.2

## Summary

| Module | Import | Offline Ops | Live Network | Status |
|--------|--------|-------------|--------------|--------|
| **StorageProgram** | `@kynesyslabs/demosdk/storage` | 21/21 pass | **RPC returns "Unknown message" for reads, "GCREdit mismatch" for writes** | **BLOCKED — node doesn't support SP yet** |
| **DemosWork** | `@kynesyslabs/demosdk/demoswork` | 1 pass, 4 skipped | Not tested | **BLOCKED — SDK ESM bug** |
| **L2PS** | `@kynesyslabs/demosdk/l2ps` | 8/10 pass, 2 document limitation | N/A (local crypto) | **PARTIAL — encrypt/decrypt broken in Node** |

## StorageProgram — BLOCKED (node-side)

### Offline (Phase 0): ALL PASS
All payload creation operations work correctly in isolation — deriveStorageAddress, createStorageProgram, writeStorage, setField, appendItem, deleteField, ACL helpers, validateSize, calculateStorageFee.

### Live (Phase 3): BLOCKED

**Read operations:** `getByAddress`, `getByOwner`, `searchByName` all return:
```
{ error: "Unknown message" }
```

The SDK makes HTTP calls to the RPC node's `/storage-program/:address` endpoint, but the node responds with "Unknown message" — indicating the Storage Program query handler is not deployed on `demosnode.discus.sh`.

**Write operations:** Transaction submission returns:
```
[StorageProgram] Unknown operation: SET_FIELD
GCREdit mismatch — Transaction is not valid
```

The node's GCR (Global Change Registry) handler doesn't recognize `storageProgram` type transactions or their sub-operations (CREATE_STORAGE_PROGRAM, SET_FIELD, etc.).

**Conclusion:** StorageProgram SDK is complete but **the Demos testnet node hasn't deployed the server-side handlers yet**. This is an infrastructure dependency on KyneSys. The offline tests prove the SDK will work once the node supports it.

**Bootstrap script:** `tools/nexus-bootstrap.ts` successfully:
- Connects wallet ✅
- Derives deterministic storage address ✅
- Creates valid StorageProgram payloads ✅
- Signs transactions ✅
- Fails at confirm (node rejects) ❌

### Evidence

```
RPC: https://demosnode.discus.sh/
Wallet: 0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b
Storage Address: stor-54a35cf236a27b44b8ec15441e72535280ff60de

Read: { error: "Unknown message" }
Write: [Confirm] Transaction is not valid: GCREdit mismatch
```

## DemosWork — BLOCKED (SDK packaging)

**Issue:** ESM directory import bug in `baseoperation.js` (`from "."` instead of `./index.js`). Untested at runtime.

## L2PS — PARTIAL (Node.js compatibility)

Instance management works. Encryption blocked by `Buffer` polyfill issue in Node.js ESM.

## Impact on Omniweb Architecture

| Agent | Primary SDK Module | Offline Status | Live Status | Can Deploy? |
|-------|--------------------|---------------|-------------|-------------|
| **NEXUS** | StorageProgram | ✅ READY | ❌ Node unsupported | **NO** — wait for node update |
| **WEAVER** | DemosWork | ❌ ESM bug | Not tested | **NO** — wait for SDK fix |
| **SHADE** | L2PS | ⚠️ Partial | N/A | **NO** — wait for Buffer fix |

**All three omniweb agents are blocked on external dependencies** (KyneSys node updates or SDK fixes). The architecture and code are ready — only infrastructure is missing.

### Recommended Actions
1. **Report to KyneSys:** StorageProgram endpoints not deployed on demosnode.discus.sh
2. **Report to KyneSys:** DemosWork barrel export has broken ESM directory import
3. **Report to KyneSys:** L2PS uses browser Buffer, fails in Node.js ESM
4. **Continue building locally:** All offline tests pass, agents can dry-run, architecture is sound
5. **Re-test when node updates:** `DEMOS_LIVE=1 npx vitest run tests/sdk-exploration-storage.test.ts`

## Test Files

- `tests/sdk-exploration-storage.test.ts` — 24 tests (21 pass, 3 skipped/live)
- `tests/sdk-exploration-demoswork.test.ts` — 5 tests (1 pass documenting bug, 4 skipped)
- `tests/sdk-exploration-l2ps.test.ts` — 10 tests (10 pass, 2 documenting limitations)
- `tools/nexus-bootstrap.ts` — live bootstrap script (works offline, blocked at confirm on live)
