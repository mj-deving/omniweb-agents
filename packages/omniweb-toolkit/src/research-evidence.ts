import { fetchWithTimeout } from "../../../src/toolkit/network/fetch-with-timeout.js";
import type { MinimalAttestationCandidate } from "./minimal-attestation-plan.js";

const DEFAULT_RESEARCH_EVIDENCE_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_VALUES = 5;

export interface ResearchEvidenceSummary {
  source: string;
  url: string;
  fetchedAt: string;
  values: Record<string, string>;
  derivedMetrics: Record<string, string>;
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
        derivedMetrics: deriveResearchMetrics(opts.source.url, payload, values),
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

  if (isBinanceOpenInterestUrl(url)) {
    const openInterestValues = extractBinanceOpenInterestValues(payload);
    if (Object.keys(openInterestValues).length > 0) {
      return openInterestValues;
    }
  }

  if (isCoinGeckoMarketChartUrl(url)) {
    const marketValues = extractCoinGeckoMarketChartValues(payload);
    if (Object.keys(marketValues).length > 0) {
      return marketValues;
    }
  }

  if (isBtcEtfDataCurrentUrl(url)) {
    const etfValues = extractBtcEtfFlowValues(payload);
    if (Object.keys(etfValues).length > 0) {
      return etfValues;
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

function isBinanceOpenInterestUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "fapi.binance.com" && parsed.pathname.includes("/openInterest");
  } catch {
    return false;
  }
}

function isCoinGeckoMarketChartUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "api.coingecko.com" && parsed.pathname.includes("/market_chart");
  } catch {
    return false;
  }
}

function isBtcEtfDataCurrentUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (parsed.hostname === "www.btcetfdata.com" || parsed.hostname === "btcetfdata.com")
      && parsed.pathname === "/v1/current.json";
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

function extractBinanceOpenInterestValues(payload: unknown): Record<string, string> {
  if (!isRecord(payload)) {
    return {};
  }

  const preferredKeys = [
    "openInterest",
  ] as const;

  const values: Array<[string, string]> = [];
  for (const key of preferredKeys) {
    const normalized = normalizeScalarValue(payload[key]);
    if (!normalized) continue;
    values.push([key, normalized]);
  }

  return Object.fromEntries(values);
}

function extractCoinGeckoMarketChartValues(payload: unknown): Record<string, string> {
  if (!isRecord(payload)) {
    return {};
  }

  const prices = extractSeries(payload.prices);
  const volumes = extractSeries(payload.total_volumes);
  const marketCaps = extractSeries(payload.market_caps);
  const latestPrice = prices.at(-1)?.[1];
  const firstPrice = prices[0]?.[1];
  const high7d = maxValue(prices);
  const low7d = minValue(prices);
  const latestVolume = volumes.at(-1)?.[1];
  const latestMarketCap = marketCaps.at(-1)?.[1];

  const values: Array<[string, string | null]> = [
    ["currentPriceUsd", formatNumber(latestPrice)],
    ["startingPriceUsd", formatNumber(firstPrice)],
    ["high7d", formatNumber(high7d)],
    ["low7d", formatNumber(low7d)],
    ["latestVolumeUsd", formatNumber(latestVolume)],
    ["latestMarketCapUsd", formatNumber(latestMarketCap)],
  ];

  return Object.fromEntries(values.filter((entry): entry is [string, string] => entry[1] != null));
}

function extractBtcEtfFlowValues(payload: unknown): Record<string, string> {
  if (!isRecord(payload) || !isRecord(payload.data)) {
    return {};
  }

  const entries = Object.values(payload.data)
    .filter(isRecord)
    .map((entry) => ({
      ticker: typeof entry.ticker === "string" ? entry.ticker : null,
      holdings: numericValue(entry.holdings),
      change: numericValue(entry.change),
      error: entry.error === true,
    }))
    .filter((entry) => entry.ticker != null && entry.holdings != null && entry.change != null && !entry.error);

  if (entries.length === 0) {
    return {};
  }

  const totalHoldings = entries.reduce((sum, entry) => sum + (entry.holdings ?? 0), 0);
  const netFlow = entries.reduce((sum, entry) => sum + (entry.change ?? 0), 0);
  const positive = entries.filter((entry) => (entry.change ?? 0) > 0);
  const negative = entries.filter((entry) => (entry.change ?? 0) < 0);
  const largestInflow = [...positive].sort((a, b) => (b.change ?? 0) - (a.change ?? 0))[0] ?? null;
  const largestOutflow = [...negative].sort((a, b) => (a.change ?? 0) - (b.change ?? 0))[0] ?? null;

  return compactMetrics({
    totalHoldingsBtc: formatNumber(totalHoldings),
    netFlowBtc: formatNumber(netFlow),
    issuerCount: formatNumber(entries.length),
    positiveIssuerCount: formatNumber(positive.length),
    negativeIssuerCount: formatNumber(negative.length),
    largestInflowBtc: formatNumber(largestInflow?.change ?? null),
    largestOutflowBtc: formatNumber(largestOutflow?.change ?? null),
  });
}

function deriveResearchMetrics(
  url: string,
  payload: unknown,
  values: Record<string, string>,
): Record<string, string> {
  if (isBinancePremiumIndexUrl(url)) {
    return deriveBinancePremiumMetrics(values);
  }

  if (isBinanceOpenInterestUrl(url)) {
    return deriveBinanceOpenInterestMetrics(values);
  }

  if (isCoinGeckoMarketChartUrl(url)) {
    return deriveCoinGeckoMarketMetrics(values);
  }

  if (isBtcEtfDataCurrentUrl(url)) {
    return deriveBtcEtfFlowMetrics(payload, values);
  }

  if (isRecord(payload)) {
    return {};
  }

  return {};
}

function deriveBinancePremiumMetrics(values: Record<string, string>): Record<string, string> {
  return compactMetrics({
    fundingRateBps: scaleValue(values.lastFundingRate, 10_000),
    markIndexSpreadUsd: subtractValues(values.markPrice, values.indexPrice),
  });
}

function deriveBinanceOpenInterestMetrics(values: Record<string, string>): Record<string, string> {
  return compactMetrics({
    openInterestContracts: values.openInterest ?? null,
  });
}

function deriveCoinGeckoMarketMetrics(values: Record<string, string>): Record<string, string> {
  const current = parseNumber(values.currentPriceUsd);
  const start = parseNumber(values.startingPriceUsd);
  let changePercent: string | null = null;
  if (current != null && start != null && start !== 0) {
    changePercent = String(Number((((current - start) / start) * 100).toFixed(2)));
  }

  return compactMetrics({
    priceChangePercent7d: changePercent,
    tradingRangeWidthUsd: subtractValues(values.high7d, values.low7d),
  });
}

function deriveBtcEtfFlowMetrics(payload: unknown, values: Record<string, string>): Record<string, string> {
  const entries = isRecord(payload) && isRecord(payload.data)
    ? Object.values(payload.data).filter(isRecord)
    : [];
  const parsedEntries = entries.map((entry) => ({
    ticker: typeof entry.ticker === "string" ? entry.ticker : null,
    change: numericValue(entry.change),
  }));
  const largestInflow = parsedEntries
    .filter((entry) => entry.ticker && entry.change != null && entry.change > 0)
    .sort((a, b) => (b.change ?? 0) - (a.change ?? 0))[0];
  const largestOutflow = parsedEntries
    .filter((entry) => entry.ticker && entry.change != null && entry.change < 0)
    .sort((a, b) => (a.change ?? 0) - (b.change ?? 0))[0];

  return compactMetrics({
    largestInflowTicker: largestInflow?.ticker ?? null,
    largestOutflowTicker: largestOutflow?.ticker ?? null,
    netFlowDirection: deriveNetFlowDirection(values.netFlowBtc),
  });
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

function extractSeries(value: unknown): Array<[number, number]> {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is [number, number] =>
      Array.isArray(entry)
      && entry.length >= 2
      && typeof entry[0] === "number"
      && typeof entry[1] === "number"
      && Number.isFinite(entry[0])
      && Number.isFinite(entry[1]))
    .map((entry) => [entry[0], entry[1]]);
}

function maxValue(series: Array<[number, number]>): number | null {
  if (series.length === 0) return null;
  return Math.max(...series.map((entry) => entry[1]));
}

function minValue(series: Array<[number, number]>): number | null {
  if (series.length === 0) return null;
  return Math.min(...series.map((entry) => entry[1]));
}

function formatNumber(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return String(Number(value.toFixed(2)));
}

function parseNumber(value: string | undefined): number | null {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function numericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function scaleValue(value: string | undefined, factor: number): string | null {
  const parsed = parseNumber(value);
  if (parsed == null) return null;
  return String(Number((parsed * factor).toFixed(2)));
}

function subtractValues(left: string | undefined, right: string | undefined): string | null {
  const a = parseNumber(left);
  const b = parseNumber(right);
  if (a == null || b == null) return null;
  return String(Number((a - b).toFixed(2)));
}

function compactMetrics(metrics: Record<string, string | null>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(metrics).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0),
  );
}

function deriveNetFlowDirection(value: string | undefined): string | null {
  const parsed = parseNumber(value);
  if (parsed == null) return null;
  if (parsed > 0) return "inflow";
  if (parsed < 0) return "outflow";
  return "flat";
}
