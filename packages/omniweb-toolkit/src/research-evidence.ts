import { fetchWithTimeout } from "../../../src/toolkit/network/fetch-with-timeout.js";
import { fetchSource } from "../../../src/toolkit/sources/fetch.js";
import type { FetchedResponse } from "../../../src/toolkit/providers/types.js";
import { inferAssetAlias } from "../../../src/toolkit/chain/asset-helpers.js";
import type { MinimalAttestationCandidate } from "./minimal-attestation-plan.js";
import { parseResearchEvidencePayload } from "./research-evidence/payload.js";
import {
  classifyResearchEvidenceSemanticClass,
  type ResearchEvidenceSemanticClass,
} from "./research-evidence/semantic-class.js";
import {
  classifyResearchEvidenceSource,
  type ResearchEvidenceSourceKind,
} from "./research-evidence/source-kind.js";
import {
  extractResearchEvidenceValues,
  inferFredLiquiditySeries,
} from "./research-evidence/value-adapters.js";
import {
  basisPointSpread,
  compactMetrics,
  deriveNetFlowDirection,
  divideValues,
  isRecord,
  numericValue,
  parseNumber,
  percentChange,
  scaleValue,
  subtractValues,
} from "./research-evidence/value-utils.js";

const DEFAULT_RESEARCH_EVIDENCE_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_VALUES = 5;

export interface ResearchEvidenceSummary {
  source: string;
  url: string;
  fetchedAt: string;
  values: Record<string, string>;
  derivedMetrics: Record<string, string>;
  semanticClass?: ResearchEvidenceSemanticClass;
}

export interface FetchResearchEvidenceSummarySuccess {
  ok: true;
  summary: ResearchEvidenceSummary;
  prefetchedResponse?: FetchedResponse;
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
  topic?: string;
  timeoutMs?: number;
  maxValues?: number;
}

export {
  classifyResearchEvidenceSemanticClass,
  type ResearchEvidenceSemanticClass,
} from "./research-evidence/semantic-class.js";

export async function fetchResearchEvidenceSummary(
  opts: FetchResearchEvidenceSummaryOptions,
): Promise<FetchResearchEvidenceSummaryResult> {
  try {
    const prefetched = await fetchResearchEvidence(opts);
    if (!prefetched.ok) {
      return prefetched;
    }

    const contentType = prefetched.response.headers["content-type"] ?? "";
    const rawText = prefetched.response.bodyText;
    const sourceKind = classifyResearchEvidenceSource(opts.source);
    const payload = parseResearchEvidencePayload(opts.source, sourceKind, contentType, rawText);
    const values = extractResearchEvidenceValues(
      opts.source,
      sourceKind,
      payload,
      opts.maxValues ?? DEFAULT_MAX_VALUES,
      opts.topic,
    );

    if (Object.keys(values).length === 0) {
      return {
        ok: false,
        reason: "no_usable_values",
        note: `Source fetch succeeded for ${opts.source.name}, but no usable numeric values were extracted.`,
      };
    }

    const derivedMetrics = deriveResearchMetrics(opts.source, sourceKind, payload, values, opts.topic);

    return {
      ok: true,
      prefetchedResponse: prefetched.response,
      summary: {
        source: opts.source.name,
        url: opts.source.url,
        fetchedAt: new Date().toISOString(),
        values,
        derivedMetrics,
        semanticClass: classifyResearchEvidenceSemanticClass(
          sourceKind,
          values,
          derivedMetrics,
        ),
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

async function fetchResearchEvidence(
  opts: FetchResearchEvidenceSummaryOptions,
): Promise<
  | { ok: true; response: FetchedResponse }
  | FetchResearchEvidenceSummaryFailure
> {
  if (opts.source.sourceRecord) {
    const fetched = await fetchSource(
      opts.source.url,
      opts.source.sourceRecord,
      {
        timeoutMs: opts.timeoutMs ?? DEFAULT_RESEARCH_EVIDENCE_TIMEOUT_MS,
      },
    );

    if (!fetched.ok || !fetched.response) {
      return {
        ok: false,
        reason: "fetch_failed",
        note: `Source fetch failed for ${opts.source.name}: ${fetched.error ?? "unknown fetch error"}`,
      };
    }

    if (fetched.response.status < 200 || fetched.response.status >= 400) {
      return {
        ok: false,
        reason: "unexpected_status",
        status: fetched.response.status,
        note: `Source fetch returned HTTP ${fetched.response.status} for ${opts.source.name}.`,
      };
    }

    return {
      ok: true,
      response: fetched.response,
    };
  }

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

  const bodyText = await response.text();
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  return {
    ok: true,
    response: {
      url: opts.source.url,
      status: response.status,
      headers,
      bodyText,
    },
  };
}

function deriveResearchMetrics(
  source: MinimalAttestationCandidate,
  sourceKind: ResearchEvidenceSourceKind,
  payload: unknown,
  values: Record<string, string>,
  topic?: string,
): Record<string, string> {
  if (sourceKind === "binance-premium-index") {
    return deriveBinancePremiumMetrics(values);
  }

  if (sourceKind === "binance-24hr-ticker") {
    return deriveBinance24hrTickerMetrics(values);
  }

  if (sourceKind === "binance-open-interest") {
    return deriveBinanceOpenInterestMetrics(values);
  }

  if (sourceKind === "coingecko-market-chart") {
    return deriveCoinGeckoMarketMetrics(values);
  }

  if (sourceKind === "coingecko-coins-markets") {
    return deriveCoinGeckoCoinsMarketsMetrics(values);
  }

  if (sourceKind === "btcetfdata-current") {
    return deriveBtcEtfFlowMetrics(payload, values);
  }

  if (sourceKind === "coingecko-simple-price") {
    return deriveCoinGeckoSimplePriceMetrics(values);
  }

  if (sourceKind === "blockchair-stats") {
    return deriveBlockchairStatsMetrics(values);
  }

  if (sourceKind === "defillama-protocols") {
    return deriveDefiLlamaProtocolMetrics(values);
  }

  if (sourceKind === "defillama-stablecoins") {
    return deriveStablecoinSupplyMetrics(values, topic);
  }

  if (sourceKind === "treasury-interest-rates") {
    return deriveTreasuryRateMetrics(values);
  }

  if (sourceKind === "fred-liquidity-series") {
    return deriveFredLiquiditySeriesMetrics(source, values);
  }

  if (sourceKind === "cboe-vix-history") {
    return deriveVixMetrics(values);
  }

  if (source.provider === "generic" && isRecord(payload)) {
    return {};
  }

  return {};
}

function deriveBinance24hrTickerMetrics(values: Record<string, string>): Record<string, string> {
  return compactMetrics({
    intradayRangeUsd: subtractValues(values.high24hUsd, values.low24hUsd),
    closeVsWeightedAvgUsd: subtractValues(values.lastPriceUsd, values.weightedAvgPriceUsd),
  });
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

function deriveCoinGeckoCoinsMarketsMetrics(values: Record<string, string>): Record<string, string> {
  return compactMetrics({
    tradingRangeWidthUsd24h: subtractValues(values.high24hUsd, values.low24hUsd),
    marketCapVolumeRatio: divideValues(values.marketCapUsd, values.volume24hUsd, 2),
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

function deriveCoinGeckoSimplePriceMetrics(values: Record<string, string>): Record<string, string> {
  const price = parseNumber(values.priceUsd);
  if (price == null) {
    return {};
  }

  const pegDeviation = Math.abs(price - 1) * 100;
  return compactMetrics({
    pegDeviationPct: String(Number(pegDeviation.toFixed(4))),
  });
}

function deriveBlockchairStatsMetrics(values: Record<string, string>): Record<string, string> {
  const blockCount = parseNumber(values.blockCount24h);
  const txCount = parseNumber(values.transactionCount24h);
  const txPerBlock = blockCount != null && txCount != null && blockCount !== 0
    ? String(Number((txCount / blockCount).toFixed(2)))
    : null;

  return compactMetrics({
    transactionsPerBlock24h: txPerBlock,
  });
}

function deriveDefiLlamaProtocolMetrics(values: Record<string, string>): Record<string, string> {
  return compactMetrics({
    tvlMomentumDeltaPct: subtractValues(values.change1dPct, values.change7dPct),
    mcapToTvlRatio: divideValues(values.mcapUsd, values.tvlUsd, 2),
  });
}

function deriveStablecoinSupplyMetrics(values: Record<string, string>, topic?: string): Record<string, string> {
  return compactMetrics({
    supplyChangePct1d: percentChange(values.circulatingUsd, values.circulatingPrevDayUsd),
    supplyChangePct7d: percentChange(values.circulatingUsd, values.circulatingPrevWeekUsd),
    supplyChangePct30d: percentChange(values.circulatingUsd, values.circulatingPrevMonthUsd),
    stablecoinFocus: inferAssetAlias(topic ?? "")?.symbol ?? values.assetSymbol ?? null,
  });
}

function deriveTreasuryRateMetrics(values: Record<string, string>): Record<string, string> {
  return compactMetrics({
    billNoteSpreadBps: basisPointSpread(values.treasuryBillsAvgRatePct, values.treasuryNotesAvgRatePct),
  });
}

function deriveFredLiquiditySeriesMetrics(
  source: MinimalAttestationCandidate,
  values: Record<string, string>,
): Record<string, string> {
  const series = inferFredLiquiditySeries(source, null, values);
  if (series === "WALCL") {
    return compactMetrics({
      walclTrillionsUsd: scaleValue(values.walclLatest, 0.000001),
      walclChangeBillionsUsd: scaleValue(subtractValues(values.walclLatest, values.walclPrevious) ?? undefined, 0.001),
      walclChangePct: percentChange(values.walclLatest, values.walclPrevious),
    });
  }

  if (series === "RRPONTSYD") {
    return compactMetrics({
      rrpBillionsUsd: scaleValue(values.rrpLatest, 1),
      rrpChangeBillionsUsd: subtractValues(values.rrpLatest, values.rrpPrevious),
      rrpChangePct: percentChange(values.rrpLatest, values.rrpPrevious),
    });
  }

  return {};
}

function deriveVixMetrics(values: Record<string, string>): Record<string, string> {
  return compactMetrics({
    vixSessionChangePct: percentChange(values.vixClose, values.vixPreviousClose),
    vixIntradayRange: subtractValues(values.vixHigh, values.vixLow),
  });
}
