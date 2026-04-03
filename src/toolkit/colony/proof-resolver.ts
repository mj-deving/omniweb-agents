/**
 * Proof resolver — resolves attestation txHashes on-chain to verify existence and extract proof data.
 *
 * Uses ChainReaderRpc.getTxByHash() to fetch full transaction content, then determines
 * attestation type (DAHR vs TLSN) from the transaction shape.
 *
 * DAHR: tx.content.type === "web2" — node-proxied request with responseHash
 * TLSN: tx.content.type === "storage" AND data contains proof structure (serverName/recv)
 */

import type { ChainReaderRpc } from "../chain-reader.js";

export type ProofMethod = "DAHR" | "TLSN";

export interface DahrProof {
  verified: true;
  method: "DAHR";
  sourceUrl: string;
  responseHash: string;
  timestamp: number;
  chainData: Record<string, unknown>;
}

export interface TlsnProof {
  verified: true;
  method: "TLSN";
  sourceUrl: string;
  responseData: string | null;
  notaryKey: string | null;
  timestamp: number;
  chainData: Record<string, unknown>;
}

export interface ResolutionFailure {
  verified: false;
  reason: string;
}

export type ResolutionResult = DahrProof | TlsnProof | ResolutionFailure;

function isDahrTransaction(content: Record<string, unknown>): boolean {
  return content.type === "web2";
}

function isTlsnProofData(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return "serverName" in obj || "recv" in obj || "notaryKey" in obj;
}

function extractTlsnData(rawData: unknown): Record<string, unknown> | null {
  if (!rawData) return null;

  // Storage transactions may wrap data as ["storage", payload] or directly
  if (Array.isArray(rawData) && rawData[0] === "storage" && rawData[1]) {
    return extractTlsnData(rawData[1]);
  }

  if (typeof rawData === "string") {
    try {
      const parsed = JSON.parse(rawData);
      if (isTlsnProofData(parsed)) return parsed;
    } catch {
      return null;
    }
  }

  if (typeof rawData === "object" && isTlsnProofData(rawData)) {
    return rawData as Record<string, unknown>;
  }

  return null;
}

/**
 * Resolve a single attestation txHash against the chain.
 *
 * Returns typed proof data for DAHR or TLSN attestations,
 * or a failure with reason if the transaction doesn't exist or isn't a known attestation type.
 */
export async function resolveAttestation(
  rpc: ChainReaderRpc,
  attestationTxHash: string,
): Promise<ResolutionResult> {
  if (!rpc.getTxByHash) {
    return { verified: false, reason: "rpc_unavailable" };
  }

  let tx;
  try {
    tx = await rpc.getTxByHash(attestationTxHash);
  } catch {
    return { verified: false, reason: "rpc_error" };
  }

  if (!tx) {
    return { verified: false, reason: "tx_not_found" };
  }

  if (tx.status !== "confirmed") {
    return { verified: false, reason: "tx_not_confirmed" };
  }

  const content = tx.content;
  if (!content) {
    return { verified: false, reason: "tx_no_content" };
  }

  // DAHR: web2-type transaction from node proxy
  if (isDahrTransaction(content)) {
    const data = (content.data ?? {}) as Record<string, unknown>;
    return {
      verified: true,
      method: "DAHR",
      sourceUrl: String(data.url ?? ""),
      responseHash: String(data.responseHash ?? data.hash ?? ""),
      timestamp: content.timestamp as number ?? 0,
      chainData: data,
    };
  }

  // TLSN: storage-type transaction with proof structure in data
  if (content.type === "storage") {
    const proofData = extractTlsnData(content.data);
    if (proofData) {
      return {
        verified: true,
        method: "TLSN",
        sourceUrl: String(proofData.serverName ?? proofData.url ?? ""),
        responseData: proofData.recv != null ? String(proofData.recv) : null,
        notaryKey: proofData.notaryKey != null ? String(proofData.notaryKey) : null,
        timestamp: (proofData.time ?? content.timestamp ?? 0) as number,
        chainData: proofData,
      };
    }
  }

  return { verified: false, reason: "unknown_attestation_type" };
}

export type MatchStatus = "match" | "mismatch" | "partial" | "unverifiable";

/**
 * Compare chain-resolved proof data against self-reported snapshot from the post.
 *
 * DAHR: existence on chain = match (hash-level trust; data not stored on-chain).
 * TLSN: compare responseData against snapshot values if both present.
 */
export function compareProofToSnapshot(
  resolved: DahrProof | TlsnProof,
  snapshot: Record<string, unknown> | null,
): { status: MatchStatus; details: string } {
  if (!snapshot) {
    return { status: "unverifiable", details: "no self-reported snapshot to compare" };
  }

  if (resolved.method === "DAHR") {
    // DAHR proofs store only the response hash, not the data itself.
    // Existence on chain with matching URL = trust the node signed it.
    return { status: "match", details: "DAHR attestation confirmed on chain" };
  }

  // TLSN: we can compare actual response data
  if (!resolved.responseData) {
    return { status: "partial", details: "TLSN proof on chain but no response data extractable" };
  }

  // Check if key snapshot values appear in the TLSN response data
  const responseStr = resolved.responseData.toLowerCase();
  const snapshotValues = Object.values(snapshot)
    .filter((v) => v != null && typeof v !== "object")
    .map((v) => String(v).toLowerCase());

  if (snapshotValues.length === 0) {
    return { status: "unverifiable", details: "snapshot has no comparable scalar values" };
  }

  const matchCount = snapshotValues.filter((v) => v.length > 2 && responseStr.includes(v)).length;
  const matchRatio = matchCount / snapshotValues.length;

  if (matchRatio >= 0.6) {
    return { status: "match", details: `${matchCount}/${snapshotValues.length} snapshot values found in TLSN response` };
  }
  if (matchRatio > 0) {
    return { status: "partial", details: `${matchCount}/${snapshotValues.length} snapshot values found (below 60% threshold)` };
  }
  return { status: "mismatch", details: "no snapshot values found in TLSN response data" };
}
