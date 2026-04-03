/**
 * Batch proof ingestion — resolves unverified attestations against the chain.
 *
 * Queries attestations with chain_verified=0, resolves each via proof-resolver,
 * updates DB with results. Runs incrementally (configurable limit per batch).
 */

import type { ColonyDatabase } from "./schema.js";
import type { ChainReaderRpc } from "../chain-reader.js";
import { resolveAttestation, compareProofToSnapshot, type ResolutionResult } from "./proof-resolver.js";

export interface IngestionResult {
  resolved: number;
  verified: number;
  failed: number;
  skipped: number;
}

export interface IngestionOptions {
  /** Max attestations to resolve per batch (default: 20). */
  limit?: number;
}

interface UnresolvedRow {
  id: number;
  attestation_tx_hash: string;
  data_snapshot: string | null;
}

const DEFAULT_LIMIT = 20;

/**
 * Process unresolved attestations by resolving them against the chain.
 *
 * For each unresolved attestation:
 * 1. Call resolveAttestation() to fetch and classify the on-chain tx
 * 2. Compare resolved data against self-reported snapshot
 * 3. Update DB with chain_verified status, chain_method, chain_data, resolved_at
 */
export async function ingestProofs(
  db: ColonyDatabase,
  rpc: ChainReaderRpc,
  options?: IngestionOptions,
): Promise<IngestionResult> {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const result: IngestionResult = { resolved: 0, verified: 0, failed: 0, skipped: 0 };

  const rows = db.prepare(
    `SELECT id, attestation_tx_hash, data_snapshot
     FROM attestations
     WHERE chain_verified = 0
     ORDER BY id DESC
     LIMIT ?`,
  ).all(limit) as UnresolvedRow[];

  if (rows.length === 0) {
    return result;
  }

  const updateStmt = db.prepare(
    `UPDATE attestations
     SET chain_verified = ?, chain_method = ?, chain_data = ?, resolved_at = ?
     WHERE id = ?`,
  );

  const now = new Date().toISOString();

  for (const row of rows) {
    let resolution: ResolutionResult;
    try {
      resolution = await resolveAttestation(rpc, row.attestation_tx_hash);
    } catch {
      result.failed += 1;
      updateStmt.run(-1, null, null, now, row.id);
      continue;
    }

    if (!resolution.verified) {
      // Distinguish retryable from permanent failures
      const permanent = resolution.reason === "tx_not_found" || resolution.reason === "unknown_attestation_type";
      if (permanent) {
        updateStmt.run(-1, null, JSON.stringify({ reason: resolution.reason }), now, row.id);
        result.failed += 1;
      } else {
        // Retryable (rpc_error, rpc_unavailable, tx_not_confirmed) — leave as 0
        result.skipped += 1;
      }
      continue;
    }

    // Parse self-reported snapshot for comparison
    let snapshot: Record<string, unknown> | null = null;
    if (row.data_snapshot) {
      try {
        snapshot = JSON.parse(row.data_snapshot);
      } catch {
        snapshot = null;
      }
    }

    const comparison = compareProofToSnapshot(resolution, snapshot);

    updateStmt.run(
      1,
      resolution.method,
      JSON.stringify({ ...resolution.chainData, _comparison: comparison }),
      now,
      row.id,
    );

    result.resolved += 1;
    result.verified += 1;
  }

  return result;
}
