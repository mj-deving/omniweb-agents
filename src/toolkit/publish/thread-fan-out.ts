import type { StructuredClaim } from "./types.js";

export interface ThreadPlan {
  /** The root post claim (highest attestability score). */
  rootClaim: StructuredClaim;
  /** Reply claims, each needing its own attestation cycle. Ordered by attestability. */
  replyClaims: StructuredClaim[];
  /** Total claims extracted from the draft. */
  totalClaims: number;
  /** Whether fan-out was applied (false if single claim or zero factual claims). */
  fanOutApplied: boolean;
}

export interface ThreadFanOutConfig {
  /** Maximum claims per thread including root (default: 5). */
  maxClaimsPerThread: number;
}

const DEFAULT_MAX_CLAIMS = 5;

/**
 * Score a claim's attestability — higher = more suitable as root post.
 *
 * Factual numeric claims score highest (most verifiable).
 * Claims with source field bindings score higher (easier attestation hunt).
 * Editorial claims score lowest.
 */
export function scoreAttestability(claim: StructuredClaim): number {
  let score = 0;
  if (claim.type === "factual") score += 50;
  if (claim.value !== null && claim.value !== undefined) score += 30;
  if (claim.sourceField) score += 20;
  return score;
}

/**
 * Plan thread fan-out for a draft's extracted claims.
 *
 * Returns a ThreadPlan that the publish pipeline uses to:
 * 1. Publish root post with the strongest (most attestable) claim
 * 2. Publish reply posts for remaining claims (each independently attested)
 *
 * Single-claim drafts bypass fan-out (fanOutApplied: false).
 * Zero-claim inputs throw — caller should ditch before calling fan-out.
 */
export function planThreadFanOut(
  claims: StructuredClaim[],
  config?: Partial<ThreadFanOutConfig>,
): ThreadPlan {
  const maxClaims = config?.maxClaimsPerThread ?? DEFAULT_MAX_CLAIMS;

  if (claims.length === 0) {
    throw new Error("Cannot plan thread fan-out with zero claims");
  }

  if (claims.length === 1) {
    return {
      rootClaim: claims[0],
      replyClaims: [],
      totalClaims: 1,
      fanOutApplied: false,
    };
  }

  const sorted = [...claims].sort((a, b) => scoreAttestability(b) - scoreAttestability(a));
  const rootClaim = sorted[0];
  const replyClaims = sorted.slice(1, maxClaims);

  return {
    rootClaim,
    replyClaims,
    totalClaims: claims.length,
    fanOutApplied: true,
  };
}
