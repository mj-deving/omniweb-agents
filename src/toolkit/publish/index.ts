export {
  ClaimIdentitySchema,
  StructuredClaimSchema,
  ClaimExtractionResultSchema,
  PublishAttestationSchema,
  SuggestedRevisionSchema,
  FaithfulnessResultSchema,
  PipelineInputSchema,
  PipelineDecisionSchema,
  PipelineResultSchema,
} from "./types.js";

export type {
  ClaimIdentity,
  StructuredClaim,
  ClaimExtractionResult,
  ClaimExtractionLlm,
  PublishAttestation,
  FaithfulnessResult,
  PipelineInput,
  PipelineDecision,
  PipelineResult,
} from "./types.js";

export { extractClaimsRegex } from "./claim-extractor.js";
export type { ClaimExtractorOptions } from "./claim-extractor.js";
export {
  METRIC_UNITS,
  DEFAULT_STALENESS_THRESHOLDS_MS,
  runFaithfulnessGate,
  findSupportingAttestation,
  subjectPresent,
  isClaimSupportedByAttestation,
} from "./faithfulness-gate.js";
export type { FaithfulnessGateOptions } from "./faithfulness-gate.js";
export { runSignalFirstPipeline } from "./signal-first-pipeline.js";
export type { SignalFirstPipelineOptions } from "./signal-first-pipeline.js";
