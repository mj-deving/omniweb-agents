import { extractClaimsRegex } from "./claim-extractor.js";
import { findSupportingAttestation, runFaithfulnessGate } from "./faithfulness-gate.js";
import {
  PipelineInputSchema,
  PipelineResultSchema,
  type PipelineInput,
  type PipelineResult,
  type StructuredClaim,
} from "./types.js";

export interface SignalFirstPipelineOptions {
  now?: Date;
  stalenessThresholdsMs?: Partial<Record<string, number>>;
}

export function runSignalFirstPipeline(
  input: PipelineInput,
  options: SignalFirstPipelineOptions = {},
): PipelineResult {
  const parsed = PipelineInputSchema.parse(input);
  const extraction = extractClaimsRegex(parsed.draftText);

  if (extraction.claims.length === 0) {
    return PipelineResultSchema.parse({
      decision: "DITCH",
      primaryClaim: null,
      faithfulness: null,
      allClaims: [],
      reason: extraction.needsLlmTier
        ? "no regex-extracted factual claims; LLM tier required"
        : "no factual claims found",
    });
  }

  const primaryClaim = pickStrongestClaim(extraction.claims, parsed.attestations);
  if (!primaryClaim) {
    return PipelineResultSchema.parse({
      decision: "DITCH",
      primaryClaim: null,
      faithfulness: null,
      allClaims: extraction.claims,
      reason: "no attestable claims found in draft",
    });
  }

  const faithfulness = runFaithfulnessGate(
    parsed.draftText,
    primaryClaim,
    parsed.attestations,
    { allClaims: extraction.claims, now: options.now, stalenessThresholdsMs: options.stalenessThresholdsMs },
  );

  if (faithfulness.pass) {
    return PipelineResultSchema.parse({
      decision: "PROCEED",
      primaryClaim,
      faithfulness,
      allClaims: extraction.claims,
      reason: "primary claim is fully supported by attested data",
    });
  }

  if (faithfulness.suggestedRevision) {
    return PipelineResultSchema.parse({
      decision: "REVISE",
      primaryClaim,
      faithfulness,
      allClaims: extraction.claims,
      reason: faithfulness.reason ?? "value drift detected",
    });
  }

  return PipelineResultSchema.parse({
    decision: "DITCH",
    primaryClaim,
    faithfulness,
    allClaims: extraction.claims,
    reason: faithfulness.reason ?? "faithfulness gate failed",
  });
}

function pickStrongestClaim(
  claims: StructuredClaim[],
  attestations: PipelineInput["attestations"],
): StructuredClaim | null {
  const ranked = claims
    .filter((claim) => claim.type === "factual" && claim.value !== null)
    .map((claim) => ({
      claim,
      support: findSupportingAttestation(claim, attestations),
      score: scoreClaim(claim),
    }))
    .filter((entry) => entry.support !== null)
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.claim ?? null;
}

function scoreClaim(claim: StructuredClaim): number {
  let score = 1;
  if (claim.unit !== "none" && claim.unit !== "%") score += 2;
  if (claim.identity.metric === "hash_rate" || claim.identity.metric === "tvl" || claim.identity.metric === "price_usd") {
    score += 2;
  }
  if (claim.subject !== "market") score += 1;
  return score;
}
