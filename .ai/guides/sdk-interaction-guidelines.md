# Demos SDK Interaction Guidelines

> Verified against `@kynesyslabs/demosdk` v2.11.5 source (node_modules).
> Last audit: 2026-03-28. Update after SDK version bumps.

## Rule 1: Every Transaction Requires a 3-Step Pipeline

**Statement:** SDK methods that create transactions (`transfer`, `store`, `pay`) return a **signed but unsubmitted** Transaction object. You MUST call `confirm()` then `broadcast()` to actually submit to the network.

**Bad:**
```typescript
const result = await demos.transfer(to, amount);
return result.hash; // ← This is a local hash, tx was never broadcast!
```

**Correct:**
```typescript
const signedTx = await demos.transfer(to, amount);
const validity = await demos.confirm(signedTx);
const result = await demos.broadcast(validity);
const txHash = extractTxHash(validity, result);
```

**Applies to:** `Demos.transfer()`, `Demos.store()`, `Demos.pay()`, `Demos.sign()`, `DemosTransactions.store()`, `DemosTransactions.pay()`.

**How to verify:** Search for any direct call to these methods — if `confirm` and `broadcast` don't follow within the same function/closure, it's a bug.

## Rule 2: SDK Method Signatures Are the Contract

**Statement:** Always verify parameter count and types against the ACTUAL SDK source in `node_modules/@kynesyslabs/demosdk/build/`, not against TypeScript declarations (which may lag) or assumptions.

**Bad:**
```typescript
// Assumes transfer takes 3 params — it only takes 2!
await demos.transfer(to, amount, memo);
```

**Correct:**
```typescript
// Verified: transfer(to: string, amount: number) → Promise<Transaction>
await demos.transfer(to, amount);
```

**Key signatures (verified 2026-03-28):**

| Method | Params | Returns | Notes |
|--------|--------|---------|-------|
| `demos.transfer(to, amount)` | 2 | signed Transaction | No memo param |
| `demos.pay(to, amount)` | 2 | signed Transaction | Alias for transfer |
| `demos.store(bytes)` | 1 (Uint8Array) | signed Transaction | Binary data |
| `demos.confirm(tx)` | 1 (Transaction) | RPCResponseWithValidityData | Gas validation |
| `demos.broadcast(validity)` | 1 | any | Actually submits to network |
| `demos.sign(tx)` | 1 (Transaction) | signed Transaction | Raw signing |
| `demos.connect(rpcUrl)` | 1 | Promise\<boolean\> | |
| `demos.connectWallet(seed, opts?)` | 1-2 | Promise\<string\> (address) | opts: {algorithm?, dual_sign?} |
| `demos.signMessage(msg, opts?)` | 1-2 | {type, data} | opts: {algorithm?} |
| `demos.getTxByHash(hash)` | 1 | Transaction | Parsed content |
| `demos.getTransactions(start?, limit?)` | 0-2 | RawTransaction[] | content is string! |
| `demos.getMempool()` | 0 | Transaction[] | |
| `demos.getAddressNonce(addr)` | 1 | number | |
| `demos.getAddressInfo(addr)` | 1 | {balance: BigInt, ...} | |

| Static Method | Params | Returns |
|--------------|--------|---------|
| `DemosTransactions.store(bytes, demos)` | 2 | signed Transaction |
| `DemosTransactions.confirm(tx, demos)` | 2 | validity data |
| `DemosTransactions.broadcast(validity, demos)` | 2 | broadcast response |
| `DemosTransactions.pay(to, amount, demos)` | 3 | signed Transaction |
| `DemosTransactions.empty()` | 0 | empty Transaction |

## Rule 3: Transaction vs RawTransaction — Different Shapes

**Statement:** `getTxByHash()` returns `Transaction` (parsed `content: TransactionContent`). `getTransactions()` returns `RawTransaction[]` (stringified `content: string`). Never assume they're interchangeable.

**Bad:**
```typescript
const txs = await demos.getTransactions("latest", 100);
const author = txs[0].content.from; // ← content is a STRING, not an object!
```

**Correct:**
```typescript
const txs = await demos.getTransactions("latest", 100);
const content = JSON.parse(txs[0].content); // Parse the string first
const author = content.from;
```

**Key differences:**

| Field | Transaction | RawTransaction |
|-------|------------|----------------|
| `content` | TransactionContent (object) | string (JSON) |
| `from` | Inside `content.from` | Top-level `from` |
| `type` | Inside `content.type` | Top-level `type` |

## Rule 4: TransactionContentData Is a Tuple

**Statement:** `TransactionContent.data` is typed as `TransactionContentData`, which is a **discriminated tuple**: `["storage", StoragePayload]`, `["native", INativePayload]`, etc. — NOT raw bytes or a plain object.

**Bad:**
```typescript
const payload = tx.content.data; // Assumes data is the payload
```

**Correct:**
```typescript
const [type, payload] = tx.content.data; // Destructure tuple
if (type === "storage") {
  // payload is StoragePayload
}
```

## Rule 5: Never Mock Wrong SDK Contracts in Tests

**Statement:** When mocking SDK methods in tests, the mock return shape MUST match the actual SDK return shape. A mock that returns `{ hash: "..." }` when the SDK returns a full `Transaction` object will pass tests but hide real bugs.

**Bad:**
```typescript
transfer: vi.fn(async () => ({ hash: "mock-hash" })), // SDK doesn't return this shape!
```

**Correct:**
```typescript
transfer: vi.fn(async () => ({
  hash: "mock-hash",
  content: { to: "addr", amount: 5, type: "native" },
  blockNumber: 0, status: "signed",
})),
confirm: vi.fn(async () => ({
  response: { data: { transaction: { hash: "confirmed-hash" } } },
})),
broadcast: vi.fn(async () => ({})),
```

## Rule 6: `as any` on SDK Calls Is a Red Flag

**Statement:** If you need `as any` to call an SDK method, the call is likely wrong. Either the param count is wrong, the type is wrong, or the method doesn't exist. Investigate instead of casting.

**Bad:**
```typescript
await (demos.transfer as any)(to, amount, memo); // 3 params, SDK takes 2
```

**Correct:**
```typescript
await demos.transfer(to, amount); // Matches SDK signature exactly
```

## Rule 7: Verify Against node_modules, Not Docs

**Statement:** When unsure about SDK behavior, read the actual implementation at `node_modules/@kynesyslabs/demosdk/build/websdk/demosclass.js` (and `DemosTransactions.js`). TypeScript declarations and external docs may be outdated.

**Verification checklist for any SDK call:**
1. Method exists in the build JS file
2. Parameter count matches
3. Return type matches what the code expects
4. If it returns a Transaction, confirm+broadcast follow
5. No `as any` cast needed

## Rule 8: extractTxHash for Hash Extraction

**Statement:** Use the bridge's `extractTxHash()` helper for extracting transaction hashes from confirm/broadcast responses. The SDK returns different shapes depending on version and method. Never hardcode a single extraction path.

**Known response shapes:**
- `confirm: { response: { data: { transaction: { hash } } } }`
- `broadcast: { response: { results: { [key]: { hash } } } }`
- `broadcast: { response: { data: { hash } } }`
- Fallback: `{ hash }` or `{ txHash }`

## SDK Subpath Import Rules

| Subpath | Import | Status |
|---------|--------|--------|
| `/websdk` | `Demos`, `DemosTransactions`, `DemosWebAuth` | Stable |
| `/storage` | `StorageProgram`, types | Stable |
| `/types` | `Transaction`, `RawTransaction`, etc. | Stable |
| `/d402/client` | `D402Client` | Stable |
| `/tlsnotary/service` | `TLSNotaryService` | Stable |

**NAPI crash warning:** `demosdk` is incompatible with Bun runtime (NAPI crash). Always use Node.js + tsx.
