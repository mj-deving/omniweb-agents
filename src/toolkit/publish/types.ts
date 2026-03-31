import { z } from "zod";

export interface ClaimIdentity {
  chain: string;
  address: string | null;
  market: string | null;
  entityId: string | null;
  metric: string;
}

export interface StructuredClaim {
  identity: ClaimIdentity;
  subject: string;
  value: number | null;
  unit: string;
  direction: "up" | "down" | "stable" | null;
  dataTimestamp: string | null;
  sourceField: string | null;
  type: "factual" | "editorial";
}

export interface ClaimExtractionResult {
  claims: StructuredClaim[];
  needsLlmTier: boolean;
  regexClaimCount: number;
}

export interface ClaimExtractionLlm {
  extractClaims(draftText: string): Promise<StructuredClaim[]>;
}

export interface PublishAttestation {
  txHash: string;
  sourceId: string;
  data: Record<string, unknown>;
  timestamp: string;
  method: "dahr" | "tlsn";
}

export interface FaithfulnessResult {
  pass: boolean;
  reason?: string;
  attestationTxHash?: string;
  matchedSubject?: string;
  matchedValue?: number;
  matchedMetric?: string;
  dataAge?: number;
  suggestedRevision?: { field: string; correctValue: number };
  contaminatedClaims?: StructuredClaim[];
}

export interface PipelineInput {
  draftText: string;
  attestations: PublishAttestation[];
}

export type PipelineDecision = "PROCEED" | "REVISE" | "DITCH";

export interface PipelineResult {
  decision: PipelineDecision;
  primaryClaim: StructuredClaim | null;
  faithfulness: FaithfulnessResult | null;
  allClaims: StructuredClaim[];
  reason: string;
}

export const ClaimIdentitySchema = z.object({
  chain: z.string().min(1),
  address: z.string().min(1).nullable(),
  market: z.string().min(1).nullable(),
  entityId: z.string().min(1).nullable(),
  metric: z.string().min(1),
}).strict();

export const StructuredClaimSchema = z.object({
  identity: ClaimIdentitySchema,
  subject: z.string().min(1),
  value: z.number().finite().nullable(),
  unit: z.string().min(1),
  direction: z.enum(["up", "down", "stable"]).nullable(),
  dataTimestamp: z.string().datetime().nullable(),
  sourceField: z.string().min(1).nullable(),
  type: z.enum(["factual", "editorial"]),
}).strict();

export const ClaimExtractionResultSchema = z.object({
  claims: z.array(StructuredClaimSchema),
  needsLlmTier: z.boolean(),
  regexClaimCount: z.number().int().nonnegative(),
}).strict();

export const PublishAttestationSchema = z.object({
  txHash: z.string().min(1),
  sourceId: z.string().min(1),
  data: z.record(z.unknown()),
  timestamp: z.string().datetime(),
  method: z.enum(["dahr", "tlsn"]),
}).strict();

export const SuggestedRevisionSchema = z.object({
  field: z.string().min(1),
  correctValue: z.number().finite(),
}).strict();

export const FaithfulnessResultSchema = z.object({
  pass: z.boolean(),
  reason: z.string().optional(),
  attestationTxHash: z.string().min(1).optional(),
  matchedSubject: z.string().min(1).optional(),
  matchedValue: z.number().finite().optional(),
  matchedMetric: z.string().min(1).optional(),
  dataAge: z.number().finite().nonnegative().optional(),
  suggestedRevision: SuggestedRevisionSchema.optional(),
  contaminatedClaims: z.array(StructuredClaimSchema).optional(),
}).strict();

export const PipelineInputSchema = z.object({
  draftText: z.string(),
  attestations: z.array(PublishAttestationSchema),
}).strict();

export const PipelineDecisionSchema = z.enum(["PROCEED", "REVISE", "DITCH"]);

export const PipelineResultSchema = z.object({
  decision: PipelineDecisionSchema,
  primaryClaim: StructuredClaimSchema.nullable(),
  faithfulness: FaithfulnessResultSchema.nullable(),
  allClaims: z.array(StructuredClaimSchema),
  reason: z.string().min(1),
}).strict();

// Enforcing bidirectional type guards — these fail compilation if schema drifts from interface.
// Using function-level type assertions: the assignment itself is the check.
function _assertSchemaSync() {
  // Forward: Zod output must be assignable to the interface
  const _ci: ClaimIdentity = {} as z.output<typeof ClaimIdentitySchema>;
  const _sc: StructuredClaim = {} as z.output<typeof StructuredClaimSchema>;
  const _cer: ClaimExtractionResult = {} as z.output<typeof ClaimExtractionResultSchema>;
  const _pa: PublishAttestation = {} as z.output<typeof PublishAttestationSchema>;
  const _fr: FaithfulnessResult = {} as z.output<typeof FaithfulnessResultSchema>;
  const _pi: PipelineInput = {} as z.output<typeof PipelineInputSchema>;
  const _pr: PipelineResult = {} as z.output<typeof PipelineResultSchema>;

  // Reverse: interface must be assignable to Zod input
  const _ciR: z.input<typeof ClaimIdentitySchema> = {} as ClaimIdentity;
  const _scR: z.input<typeof StructuredClaimSchema> = {} as StructuredClaim;
  const _cerR: z.input<typeof ClaimExtractionResultSchema> = {} as ClaimExtractionResult;
  const _paR: z.input<typeof PublishAttestationSchema> = {} as PublishAttestation;
  const _frR: z.input<typeof FaithfulnessResultSchema> = {} as FaithfulnessResult;
  const _piR: z.input<typeof PipelineInputSchema> = {} as PipelineInput;
  const _prR: z.input<typeof PipelineResultSchema> = {} as PipelineResult;

  void [_ci, _sc, _cer, _pa, _fr, _pi, _pr, _ciR, _scR, _cerR, _paR, _frR, _piR, _prR];
}
