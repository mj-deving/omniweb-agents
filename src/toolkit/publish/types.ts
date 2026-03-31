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

type _AssertClaimIdentity = z.output<typeof ClaimIdentitySchema> extends ClaimIdentity ? true : never;
type _AssertStructuredClaim = z.output<typeof StructuredClaimSchema> extends StructuredClaim ? true : never;
type _AssertClaimExtractionResult = z.output<typeof ClaimExtractionResultSchema> extends ClaimExtractionResult ? true : never;
type _AssertPublishAttestation = z.output<typeof PublishAttestationSchema> extends PublishAttestation ? true : never;
type _AssertFaithfulnessResult = z.output<typeof FaithfulnessResultSchema> extends FaithfulnessResult ? true : never;
type _AssertPipelineInput = z.output<typeof PipelineInputSchema> extends PipelineInput ? true : never;
type _AssertPipelineResult = z.output<typeof PipelineResultSchema> extends PipelineResult ? true : never;

type _AssertClaimIdentityRev = ClaimIdentity extends z.input<typeof ClaimIdentitySchema> ? true : never;
type _AssertStructuredClaimRev = StructuredClaim extends z.input<typeof StructuredClaimSchema> ? true : never;
type _AssertClaimExtractionResultRev = ClaimExtractionResult extends z.input<typeof ClaimExtractionResultSchema> ? true : never;
type _AssertPublishAttestationRev = PublishAttestation extends z.input<typeof PublishAttestationSchema> ? true : never;
type _AssertFaithfulnessResultRev = FaithfulnessResult extends z.input<typeof FaithfulnessResultSchema> ? true : never;
type _AssertPipelineInputRev = PipelineInput extends z.input<typeof PipelineInputSchema> ? true : never;
type _AssertPipelineResultRev = PipelineResult extends z.input<typeof PipelineResultSchema> ? true : never;
