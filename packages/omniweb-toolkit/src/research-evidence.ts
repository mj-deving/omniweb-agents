import { fetchWithTimeout } from "../../../src/toolkit/network/fetch-with-timeout.js";
import type { MinimalAttestationCandidate } from "./minimal-attestation-plan.js";

const DEFAULT_RESEARCH_EVIDENCE_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_VALUES = 5;

export interface ResearchEvidenceSummary {
  source: string;
  url: string;
  fetchedAt: string;
  values: Record<string, string>;
}

export interface FetchResearchEvidenceSummarySuccess {
  ok: true;
  summary: ResearchEvidenceSummary;
}

export interface FetchResearchEvidenceSummaryFailure {
  ok: false;
  reason: "fetch_failed" | "unexpected_status" | "invalid_json" | "no_usable_values";
  note: string;
  status?: number;
}

export type FetchResearchEvidenceSummaryResult =
  | FetchResearchEvidenceSummarySuccess
  | FetchResearchEvidenceSummaryFailure;

export interface FetchResearchEvidenceSummaryOptions {
  source: MinimalAttestationCandidate;
  timeoutMs?: number;
  maxValues?: number;
}

export async function fetchResearchEvidenceSummary(
  opts: FetchResearchEvidenceSummaryOptions,
): Promise<FetchResearchEvidenceSummaryResult> {
  try {
    const response = await fetchWithTimeout(
      opts.source.url,
      opts.timeoutMs ?? DEFAULT_RESEARCH_EVIDENCE_TIMEOUT_MS,
      {
        headers: {
          accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      return {
        ok: false,
        reason: "unexpected_status",
        status: response.status,
        note: `Source fetch returned HTTP ${response.status} for ${opts.source.name}.`,
      };
    }

    const payload = await response.json() as unknown;
    const values = extractResearchEvidenceValues(opts.source.url, payload, opts.maxValues ?? DEFAULT_MAX_VALUES);

    if (Object.keys(values).length === 0) {
      return {
        ok: false,
        reason: "no_usable_values",
        note: `Source fetch succeeded for ${opts.source.name}, but no usable numeric values were extracted.`,
      };
    }

    return {
      ok: true,
      summary: {
        source: opts.source.name,
        url: opts.source.url,
        fetchedAt: new Date().toISOString(),
        values,
      },
    };
  } catch (error) {
    const note = error instanceof SyntaxError
      ? `Source fetch returned invalid JSON for ${opts.source.name}.`
      : `Source fetch failed for ${opts.source.name}: ${String(error)}`;
    return {
      ok: false,
      reason: error instanceof SyntaxError ? "invalid_json" : "fetch_failed",
      note,
    };
  }
}

function extractResearchEvidenceValues(
  url: string,
  payload: unknown,
  maxValues: number,
): Record<string, string> {
  if (isBinancePremiumIndexUrl(url)) {
    const premiumValues = extractBinancePremiumValues(payload);
    if (Object.keys(premiumValues).length > 0) {
      return premiumValues;
    }
  }

  if (!isRecord(payload)) {
    return {};
  }

  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(payload)) {
    const normalized = normalizeScalarValue(value);
    if (!normalized) continue;
    entries.push([key, normalized]);
    if (entries.length >= maxValues) break;
  }

  return Object.fromEntries(entries);
}

function isBinancePremiumIndexUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "fapi.binance.com" && parsed.pathname.includes("/premiumIndex");
  } catch {
    return false;
  }
}

function extractBinancePremiumValues(payload: unknown): Record<string, string> {
  if (!isRecord(payload)) {
    return {};
  }

  const preferredKeys = [
    "markPrice",
    "indexPrice",
    "lastFundingRate",
    "interestRate",
  ] as const;

  const values: Array<[string, string]> = [];
  for (const key of preferredKeys) {
    const normalized = normalizeScalarValue(payload[key]);
    if (!normalized) continue;
    values.push([key, normalized]);
  }

  return Object.fromEntries(values);
}

function normalizeScalarValue(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    if (isNumericString(trimmed)) return trimmed;
  }

  return null;
}

function isNumericString(value: string): boolean {
  return /^-?\d+(?:\.\d+)?$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
