import { z } from "zod";

import type { StructuredClaim } from "./types.js";

export const POSITIVE_STATES: Record<string, string[]> = {
  proposal_state: ["executed", "passed", "approved", "succeeded"],
  upgrade_status: ["completed", "activated", "live"],
  listing_status: ["listed", "approved", "live"],
};

export const NEGATIVE_STATES: Record<string, string[]> = {
  proposal_state: ["defeated", "cancelled", "expired", "vetoed"],
  upgrade_status: ["failed", "cancelled", "pending"],
  listing_status: ["rejected", "delisted"],
};

export interface EventVerificationResult {
  pass: boolean;
  tier: "field_match" | "keyword" | "llm_semantic" | "none";
  promotable: boolean;
  evidence?: string;
  reason?: string;
}

export interface EventVerifierOptions {
  positiveStates?: Record<string, string[]>;
  negativeStates?: Record<string, string[]>;
  keywordThreshold?: number;
}

export const EventVerificationResultSchema = z.object({
  pass: z.boolean(),
  tier: z.enum(["field_match", "keyword", "llm_semantic", "none"]),
  promotable: z.boolean(),
  evidence: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
}).strict();

function result(r: EventVerificationResult): EventVerificationResult {
  return r;
}

export function verifyEventClaim(
  claim: StructuredClaim,
  attestedData: Record<string, unknown>,
  options: EventVerifierOptions = {},
): EventVerificationResult {
  if (claim.value !== null) {
    return result({
      pass: false,
      tier: "none",
      promotable: false,
      reason: "event verifier only applies to non-numeric claims",
    });
  }

  const positiveStates = { ...POSITIVE_STATES, ...options.positiveStates };
  const negativeStates = { ...NEGATIVE_STATES, ...options.negativeStates };
  const metric = claim.identity.metric;
  const positiveForMetric = normalizeStates(positiveStates[metric] ?? []);
  const negativeForMetric = normalizeStates(negativeStates[metric] ?? []);
  const stateField = resolveStateField(metric, claim.sourceField, attestedData);

  if (stateField) {
    const entityMatch = verifyEntityBinding(claim.identity.entityId, metric, attestedData);
    if (!entityMatch.matches) {
      return result({
        pass: false,
        tier: "field_match",
        promotable: false,
        reason: entityMatch.reason ?? `entity mismatch: claim about ${claim.identity.entityId}, data about different entity`,
      });
    }

    const fieldValue = normalizeToken(attestedData[stateField]);
    if (positiveForMetric.has(fieldValue)) {
      return result({
        pass: true,
        tier: "field_match",
        promotable: true,
        evidence: `${stateField} = ${fieldValue}`,
      });
    }

    if (negativeForMetric.has(fieldValue)) {
      return result({
        pass: false,
        tier: "field_match",
        promotable: false,
        reason: `data contradicts claim: ${stateField} = ${fieldValue}`,
      });
    }
  }

  const claimKeywords = extractKeywords(claim);
  const threshold = clampThreshold(options.keywordThreshold ?? 0.6);
  if (claimKeywords.length > 0) {
    const dataString = JSON.stringify(attestedData).toLowerCase();
    const matchCount = claimKeywords.filter((keyword) => dataString.includes(keyword)).length;
    if ((matchCount / claimKeywords.length) >= threshold) {
      return result({
        pass: true,
        tier: "keyword",
        promotable: false,
        evidence: `${matchCount}/${claimKeywords.length} keywords (editorial only)`,
      });
    }
  }

  return result({
    pass: false,
    tier: "llm_semantic",
    promotable: false,
    reason: "semantic verification not implemented; claim remains editorial",
  });
}

function normalizeStates(values: string[]): Set<string> {
  return new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean));
}

function resolveStateField(
  metric: string,
  sourceField: string | null,
  data: Record<string, unknown>,
): string | null {
  const candidates = uniqueStrings([
    sourceField,
    metric,
    toSnakeCase(metric),
    toCamelCase(metric),
    metric.split("_").at(-1) ?? null,
  ]);

  for (const candidate of candidates) {
    if (candidate in data) return candidate;
  }

  return null;
}

function verifyEntityBinding(
  entityId: string | null,
  metric: string,
  data: Record<string, unknown>,
): { matches: boolean; reason?: string } {
  if (!entityId) {
    return { matches: false, reason: "field match requires an entity identifier" };
  }

  const normalizedEntityId = entityId.trim().toLowerCase();
  const metricBase = metric.split("_").at(0) ?? metric;
  const candidates = uniqueStrings([
    `${metricBase}_id`,
    toCamelCase(`${metricBase}_id`),
    metricBase,
    "id",
    ...(metric !== metricBase ? [metric, toCamelCase(metric)] : []),
  ]);

  for (const candidate of candidates) {
    if (!(candidate in data)) continue;
    if (normalizeToken(data[candidate]) === normalizedEntityId) return { matches: true };
  }

  return {
    matches: false,
    reason: `entity mismatch: claim about ${entityId}, data about different entity`,
  };
}

function extractKeywords(claim: StructuredClaim): string[] {
  const relevantFields = [
    claim.subject,
    claim.identity.metric,
    claim.identity.entityId,
    claim.identity.market,
    claim.identity.address,
    claim.sourceField,
  ];

  const nonEmptyStrings = relevantFields.filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );

  const tokens = nonEmptyStrings
    .flatMap((value) => value.toLowerCase().split(/[^a-z0-9]+/))
    .filter((token) => token.length >= 2 || /^\d+$/.test(token))
    .filter((token) => !STOP_WORDS.has(token));

  return [...new Set(tokens)];
}

function normalizeToken(value: unknown): string {
  if (typeof value === "string") return value.trim().toLowerCase();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return String(value);
  return "";
}

function clampThreshold(value: number): number {
  if (!Number.isFinite(value)) return 0.6;
  return Math.min(1, Math.max(0, value));
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0))];
}

function toSnakeCase(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
}

function toCamelCase(value: string): string {
  return value.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "is",
  "of",
  "on",
  "or",
  "the",
  "to",
]);

function _assertSchemaSync() {
  const _forward: EventVerificationResult = {} as z.output<typeof EventVerificationResultSchema>;
  const _reverse: z.input<typeof EventVerificationResultSchema> = {} as EventVerificationResult;

  void [_forward, _reverse];
}
