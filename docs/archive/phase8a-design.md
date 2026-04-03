---
type: design
status: draft
created: 2026-04-03
summary: "Phase 8a proof ingestion — verify other agents' attestations on scan via on-chain resolution"
read_when: ["phase 8a", "proof ingestion", "attestation verification", "chain verification"]
---

# Phase 8a: Proof Ingestion Pipeline — Architecture Design

## Problem

The scanner extracts attestation references from HIVE posts and stores the self-reported `data_snapshot`. It never resolves attestation txHashes against the chain. This means we trust whatever the post author embeds — a malicious or buggy agent could claim attestations that don't exist or don't match.

## Solution

Add an independent verification layer that resolves attestation txHashes on-chain, determines proof type (DAHR/TLSN), extracts actual proof data, and compares against self-reported snapshots.

## Architecture

### New Files

| File | Classification | Purpose |
|------|---------------|---------|
| `src/toolkit/colony/proof-resolver.ts` | Toolkit (mechanism) | Resolve single attestation txHash via RPC |
| `src/toolkit/colony/proof-ingestion.ts` | Toolkit (mechanism) | Batch process unresolved attestations |

### Schema Migration (v4 → v5)

```sql
ALTER TABLE attestations ADD COLUMN chain_verified INTEGER DEFAULT 0;
ALTER TABLE attestations ADD COLUMN chain_method TEXT;
ALTER TABLE attestations ADD COLUMN chain_data TEXT;
ALTER TABLE attestations ADD COLUMN resolved_at TEXT;
CREATE INDEX IF NOT EXISTS idx_attestations_unresolved
  ON attestations(chain_verified) WHERE chain_verified = 0;
```

- `chain_verified`: tri-state (0=unresolved, 1=verified, -1=permanent failure)
- `chain_method`: actual type from chain (may differ from self-reported)
- `chain_data`: JSON string of resolved proof data
- `resolved_at`: ISO timestamp of resolution
- Partial index on unresolved rows for efficient batch queries

### Proof Resolver

```typescript
// src/toolkit/colony/proof-resolver.ts
import type { ChainReaderRpc } from "../chain-reader.js";

export type ProofMethod = "DAHR" | "TLSN";

export interface ResolvedProof {
  verified: true;
  method: ProofMethod;
  sourceUrl: string;
  timestamp: number;
  chainData: Record<string, unknown>;
}

export interface DahrProof extends ResolvedProof {
  method: "DAHR";
  responseHash: string;
}

export interface TlsnProof extends ResolvedProof {
  method: "TLSN";
  responseData: string | null;
  notaryKey: string | null;
}

export interface ResolutionFailure {
  verified: false;
  reason: string;
}

export type ResolutionResult = DahrProof | TlsnProof | ResolutionFailure;

export async function resolveAttestation(
  rpc: ChainReaderRpc,
  attestationTxHash: string,
): Promise<ResolutionResult>
```

**DAHR detection:** `tx.content.type === "web2"`. The DAHR proxy creates a web2-type transaction with `data` containing `{ url, responseHash, ... }`.

**TLSN detection:** `tx.content.type === "storage"` AND the stored data parses as a TLSN proof (has `serverName` or `recv` fields). Regular HIVE posts are also storage-type, so we check the data structure.

**Timeout handling:** The function accepts an AbortSignal-compatible timeout. If RPC fails, returns `{ verified: false, reason: "rpc_timeout" }`.

### Batch Ingestion

```typescript
// src/toolkit/colony/proof-ingestion.ts
export interface IngestionResult {
  resolved: number;
  verified: number;
  failed: number;
  skipped: number;
}

export function ingestProofs(
  db: ColonyDatabase,
  rpc: ChainReaderRpc,
  options?: { limit?: number },
): Promise<IngestionResult>
```

Queries `SELECT * FROM attestations WHERE chain_verified = 0 LIMIT ?`, resolves each, updates DB.

### Data Comparison

```typescript
export type MatchStatus = "match" | "mismatch" | "partial" | "unverifiable";

export function compareProofToSnapshot(
  resolved: ResolvedProof,
  snapshot: Record<string, unknown> | null,
): { status: MatchStatus; details: string }
```

- **DAHR match:** Attestation exists on chain → `"match"` (hash-level trust; can't re-derive data without re-fetch)
- **TLSN match:** `resolved.responseData` present AND snapshot values appear in response → `"match"`
- **TLSN mismatch:** `resolved.responseData` present AND snapshot values NOT in response → `"mismatch"`
- **Unverifiable:** No chain data to compare, or proof type unknown

### Scanner Integration

In `processBatch()` after attestation storage, call `ingestProofs(db, rpc, { limit: 20 })` to resolve the most recent unresolved attestations. This happens incrementally — each scan resolves up to 20 proofs, catching up over time.

## Test Strategy

| File | Cases |
|------|-------|
| `tests/toolkit/colony/proof-resolver.test.ts` | DAHR found, TLSN found, not found, timeout, unknown type |
| `tests/toolkit/colony/proof-ingestion.test.ts` | Batch resolve, skip resolved, handle failures, comparison |
| `tests/toolkit/colony/schema.test.ts` (extend) | v4→v5 migration, column defaults, existing data |
