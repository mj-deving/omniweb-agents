import { inferAssetAlias } from "../../../../src/toolkit/chain/asset-helpers.js";
import type { MinimalAttestationCandidate } from "../minimal-attestation-plan.js";
import type { ResearchEvidenceSourceKind } from "./source-kind.js";
import {
  compactMetrics,
  extractSeries,
  formatNestedMetric,
  formatNumber,
  isRecord,
  maxValue,
  minValue,
  normalizeScalarValue,
  numericValue,
} from "./value-utils.js";

export function extractResearchEvidenceValues(
  source: MinimalAttestationCandidate,
  sourceKind: ResearchEvidenceSourceKind,
  payload: unknown,
  maxValues: number,
  topic?: string,
): Record<string, string> {
  if (sourceKind === "binance-premium-index") {
    const premiumValues = extractBinancePremiumValues(payload);
    if (Object.keys(premiumValues).length > 0) {
      return premiumValues;
    }
  }

  if (sourceKind === "binance-24hr-ticker") {
    const tickerValues = extractBinance24hrTickerValues(payload);
    if (Object.keys(tickerValues).length > 0) {
      return tickerValues;
    }
  }

  if (sourceKind === "binance-open-interest") {
    const openInterestValues = extractBinanceOpenInterestValues(payload);
    if (Object.keys(openInterestValues).length > 0) {
      return openInterestValues;
    }
  }

  if (sourceKind === "coingecko-market-chart") {
    const marketValues = extractCoinGeckoMarketChartValues(payload);
    if (Object.keys(marketValues).length > 0) {
      return marketValues;
    }
  }

  if (sourceKind === "coingecko-coins-markets") {
    const marketValues = extractCoinGeckoCoinsMarketsValues(payload, topic);
    if (Object.keys(marketValues).length > 0) {
      return marketValues;
    }
  }

  if (sourceKind === "coingecko-simple-price") {
    const simplePriceValues = extractCoinGeckoSimplePriceValues(payload);
    if (Object.keys(simplePriceValues).length > 0) {
      return simplePriceValues;
    }
  }

  if (sourceKind === "btcetfdata-current") {
    const etfValues = extractBtcEtfFlowValues(payload);
    if (Object.keys(etfValues).length > 0) {
      return etfValues;
    }
  }

  if (sourceKind === "blockchair-stats") {
    const networkValues = extractBlockchairStatsValues(payload);
    if (Object.keys(networkValues).length > 0) {
      return networkValues;
    }
  }

  if (sourceKind === "defillama-stablecoins") {
    const stablecoinValues = extractDefiLlamaStablecoinValues(payload, topic);
    if (Object.keys(stablecoinValues).length > 0) {
      return stablecoinValues;
    }
  }

  if (sourceKind === "defillama-protocols") {
    const protocolValues = extractDefiLlamaProtocolValues(payload, topic);
    if (Object.keys(protocolValues).length > 0) {
      return protocolValues;
    }
  }

  if (sourceKind === "treasury-interest-rates") {
    const treasuryValues = extractTreasuryInterestRateValues(payload);
    if (Object.keys(treasuryValues).length > 0) {
      return treasuryValues;
    }
  }

  if (sourceKind === "fred-liquidity-series") {
    const fredValues = extractFredLiquiditySeriesValues(source, payload);
    if (Object.keys(fredValues).length > 0) {
      return fredValues;
    }
  }

  if (sourceKind === "cboe-vix-history") {
    const vixValues = extractVixValues(payload);
    if (Object.keys(vixValues).length > 0) {
      return vixValues;
    }
  }

  if (source.provider !== "generic" || !isRecord(payload)) {
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

export function inferFredLiquiditySeries(
  source: MinimalAttestationCandidate,
  payload: unknown,
  values: Record<string, string>,
): "WALCL" | "RRPONTSYD" | null {
  const sourceId = source.sourceId.toLowerCase();
  if (sourceId === "fred-graph-walcl") return "WALCL";
  if (sourceId === "fred-graph-rrp") return "RRPONTSYD";
  if (values.walclLatest || values.walclObservationDate) return "WALCL";
  if (values.rrpLatest || values.rrpObservationDate) return "RRPONTSYD";

  if (Array.isArray(payload)) {
    const sample = payload.find(isRecord);
    if (sample) {
      if ("WALCL" in sample) return "WALCL";
      if ("RRPONTSYD" in sample) return "RRPONTSYD";
    }
  }

  try {
    const parsed = new URL(source.url);
    const series = parsed.searchParams.get("id")?.toUpperCase() ?? null;
    if (series === "WALCL" || series === "RRPONTSYD") {
      return series;
    }
  } catch {
    // Ignore malformed URLs.
  }

  return null;
}

function extractBinance24hrTickerValues(payload: unknown): Record<string, string> {
  if (!isRecord(payload)) {
    return {};
  }

  return compactMetrics({
    symbol: typeof payload.symbol === "string" ? payload.symbol : null,
    lastPriceUsd: normalizeScalarValue(payload.lastPrice),
    priceChangeUsd: normalizeScalarValue(payload.priceChange),
    priceChangePct24h: normalizeScalarValue(payload.priceChangePercent),
    volumeBase24h: normalizeScalarValue(payload.volume),
    volumeQuote24hUsd: normalizeScalarValue(payload.quoteVolume),
    weightedAvgPriceUsd: normalizeScalarValue(payload.weightedAvgPrice),
    high24hUsd: normalizeScalarValue(payload.highPrice),
    low24hUsd: normalizeScalarValue(payload.lowPrice),
  });
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

function extractCoinGeckoSimplePriceValues(payload: unknown): Record<string, string> {
  if (!isRecord(payload)) {
    return {};
  }

  const [assetId, quoteMap] = Object.entries(payload)[0] ?? [];
  if (typeof assetId !== "string" || !isRecord(quoteMap)) {
    return {};
  }

  const usd = normalizeScalarValue(quoteMap.usd);
  if (!usd) {
    return {};
  }

  return {
    assetId,
    priceUsd: usd,
  };
}

function extractCoinGeckoCoinsMarketsValues(payload: unknown, topic?: string): Record<string, string> {
  if (!Array.isArray(payload)) {
    return {};
  }

  const rows = payload.filter(isRecord);
  const matching = selectCoinGeckoMarketsEntry(rows, topic);
  if (!matching) {
    return {};
  }

  return compactMetrics({
    assetId: typeof matching.id === "string" ? matching.id : null,
    assetSymbol: typeof matching.symbol === "string" ? matching.symbol.toUpperCase() : null,
    assetName: typeof matching.name === "string" ? matching.name : null,
    currentPriceUsd: normalizeScalarValue(matching.current_price),
    marketCapUsd: normalizeScalarValue(matching.market_cap),
    volume24hUsd: normalizeScalarValue(matching.total_volume),
    high24hUsd: normalizeScalarValue(matching.high_24h),
    low24hUsd: normalizeScalarValue(matching.low_24h),
    priceChangePct24h: normalizeScalarValue(matching.price_change_percentage_24h),
  });
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

function extractDefiLlamaStablecoinValues(payload: unknown, topic?: string): Record<string, string> {
  if (!isRecord(payload) || !Array.isArray(payload.peggedAssets)) {
    return {};
  }

  const targetSymbol = inferAssetAlias(topic ?? "")?.symbol ?? null;
  const assets = payload.peggedAssets.filter(isRecord);
  const matching = targetSymbol
    ? assets.find((entry) => typeof entry.symbol === "string" && entry.symbol.toUpperCase() === targetSymbol)
    : assets[0];

  if (!matching) {
    return {};
  }

  return compactMetrics({
    assetSymbol: typeof matching.symbol === "string" ? matching.symbol.toUpperCase() : null,
    circulatingUsd: formatNestedMetric(matching.circulating),
    circulatingPrevDayUsd: formatNestedMetric(matching.circulatingPrevDay),
    circulatingPrevWeekUsd: formatNestedMetric(matching.circulatingPrevWeek),
    circulatingPrevMonthUsd: formatNestedMetric(matching.circulatingPrevMonth),
  });
}

function extractDefiLlamaProtocolValues(payload: unknown, topic?: string): Record<string, string> {
  if (!Array.isArray(payload)) {
    return {};
  }

  const rows = payload.filter(isRecord);
  const matching = selectDefiLlamaProtocolEntry(rows, topic);
  if (!matching) {
    return {};
  }

  return compactMetrics({
    protocolName: typeof matching.name === "string" ? matching.name : null,
    protocolSymbol: typeof matching.symbol === "string" ? matching.symbol.toUpperCase() : null,
    category: typeof matching.category === "string" ? matching.category : null,
    tvlUsd: normalizeScalarValue(matching.tvl),
    change1dPct: normalizeScalarValue(matching.change_1d),
    change7dPct: normalizeScalarValue(matching.change_7d),
    mcapUsd: normalizeScalarValue(matching.mcap),
  });
}

function extractBlockchairStatsValues(payload: unknown): Record<string, string> {
  const stats = isRecord(payload) && isRecord(payload.data)
    ? payload.data
    : payload;

  if (!isRecord(stats)) {
    return {};
  }

  return compactMetrics({
    blockCount24h: normalizeScalarValue(stats.blocks),
    transactionCount24h: normalizeScalarValue(stats.transactions),
    hashrate24h: normalizeScalarValue(stats.hashrate_24h),
    difficulty: normalizeScalarValue(stats.difficulty),
    priceUsd: normalizeScalarValue(stats.market_price_usd),
  });
}

function extractTreasuryInterestRateValues(payload: unknown): Record<string, string> {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    return {};
  }

  const rows = payload.data.filter(isRecord);
  const marketable = rows.find((entry) => entry.security_type_desc === "Marketable");
  const bills = rows.find((entry) => entry.security_desc === "Treasury Bills");
  const notes = rows.find((entry) => entry.security_desc === "Treasury Notes");

  return compactMetrics({
    marketableAvgRatePct: normalizeScalarValue(marketable?.avg_interest_rate_amt),
    treasuryBillsAvgRatePct: normalizeScalarValue(bills?.avg_interest_rate_amt),
    treasuryNotesAvgRatePct: normalizeScalarValue(notes?.avg_interest_rate_amt),
    recordDate: typeof marketable?.record_date === "string" ? marketable.record_date : null,
  });
}

function extractVixValues(payload: unknown): Record<string, string> {
  if (isRecord(payload) && isRecord(payload.data)) {
    return compactMetrics({
      vixTimestamp: typeof payload.timestamp === "string" ? payload.timestamp : null,
      vixClose: normalizeScalarValue(payload.data.close),
      vixOpen: normalizeScalarValue(payload.data.open),
      vixHigh: normalizeScalarValue(payload.data.high),
      vixLow: normalizeScalarValue(payload.data.low),
      vixPreviousClose: normalizeScalarValue(payload.data.prev_day_close),
      vixCurrentPrice: normalizeScalarValue(payload.data.current_price),
      vixPriceChange: normalizeScalarValue(payload.data.price_change),
      vixPriceChangePercent: normalizeScalarValue(payload.data.price_change_percent),
    });
  }

  if (!Array.isArray(payload) || payload.length === 0) {
    return {};
  }

  const latest = payload.at(-1);
  const previous = payload.length > 1 ? payload.at(-2) : null;
  if (!isRecord(latest)) {
    return {};
  }

  return compactMetrics({
    vixDate: typeof latest.DATE === "string" ? latest.DATE : null,
    vixClose: normalizeScalarValue(latest.CLOSE),
    vixOpen: normalizeScalarValue(latest.OPEN),
    vixHigh: normalizeScalarValue(latest.HIGH),
    vixLow: normalizeScalarValue(latest.LOW),
    vixPreviousClose: previous && isRecord(previous) ? normalizeScalarValue(previous.CLOSE) : null,
  });
}

function extractFredLiquiditySeriesValues(
  source: MinimalAttestationCandidate,
  payload: unknown,
): Record<string, string> {
  if (!Array.isArray(payload) || payload.length === 0) {
    return {};
  }

  const series = inferFredLiquiditySeries(source, payload, {});
  if (!series) {
    return {};
  }

  const rows = payload
    .filter(isRecord)
    .map((entry) => ({
      date: typeof entry.observation_date === "string" ? entry.observation_date : null,
      value: normalizeScalarValue(entry[series]),
    }))
    .filter((entry): entry is { date: string; value: string } => typeof entry.date === "string" && typeof entry.value === "string");

  const latest = rows.at(-1);
  const previous = rows.length > 1 ? rows.at(-2) : null;
  if (!latest) {
    return {};
  }

  if (series === "WALCL") {
    return compactMetrics({
      walclObservationDate: latest.date,
      walclLatest: latest.value,
      walclPreviousDate: previous?.date ?? null,
      walclPrevious: previous?.value ?? null,
    });
  }

  if (series === "RRPONTSYD") {
    return compactMetrics({
      rrpObservationDate: latest.date,
      rrpLatest: latest.value,
      rrpPreviousDate: previous?.date ?? null,
      rrpPrevious: previous?.value ?? null,
    });
  }

  return {};
}

function selectCoinGeckoMarketsEntry(
  rows: Array<Record<string, unknown>>,
  topic?: string,
): Record<string, unknown> | null {
  const targetSymbol = inferAssetAlias(topic ?? "")?.symbol ?? null;
  if (targetSymbol) {
    const matchedBySymbol = rows.find((entry) =>
      typeof entry.symbol === "string" && entry.symbol.toUpperCase() === targetSymbol);
    if (matchedBySymbol) return matchedBySymbol;
  }

  return selectBestTopicMatchedEntry(rows, topic, (entry) => [
    entry.id,
    entry.symbol,
    entry.name,
  ]);
}

function selectDefiLlamaProtocolEntry(
  rows: Array<Record<string, unknown>>,
  topic?: string,
): Record<string, unknown> | null {
  return selectBestTopicMatchedEntry(rows, topic, (entry) => [
    entry.id,
    entry.name,
    entry.symbol,
    entry.slug,
  ]);
}

function selectBestTopicMatchedEntry(
  rows: Array<Record<string, unknown>>,
  topic: string | undefined,
  rawCandidates: (entry: Record<string, unknown>) => unknown[],
): Record<string, unknown> | null {
  let best: { entry: Record<string, unknown>; score: number } | null = null;
  for (const entry of rows) {
    const score = scoreTopicEntryMatch(topic, rawCandidates(entry));
    if (score <= 0) continue;
    if (!best || score > best.score) {
      best = { entry, score };
    }
  }
  return best?.entry ?? null;
}

function scoreTopicEntryMatch(topic: string | undefined, rawCandidates: unknown[]): number {
  const normalizedTopic = normalizeTopicText(topic ?? "");
  if (!normalizedTopic) return 0;
  const tokens = new Set(normalizedTopic.split(/\s+/).filter(isMeaningfulTopicToken));
  let bestScore = 0;

  for (const rawCandidate of rawCandidates) {
    if (typeof rawCandidate !== "string") continue;
    const candidate = normalizeTopicText(rawCandidate);
    if (!candidate) continue;
    if (normalizedTopic.includes(candidate)) {
      bestScore = Math.max(bestScore, 100 + candidate.length);
      continue;
    }
    if (candidate.includes(normalizedTopic)) {
      bestScore = Math.max(bestScore, 80 + normalizedTopic.length);
      continue;
    }

    const matchedTokens = candidate.split(/\s+/).filter(isMeaningfulTopicToken).filter((token) => tokens.has(token));
    if (matchedTokens.length > 0) {
      bestScore = Math.max(bestScore, 10 + matchedTokens.length);
    }
  }

  return bestScore;
}

function normalizeTopicText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isMeaningfulTopicToken(token: string): boolean {
  if (token.length < 4) return false;
  return !GENERIC_TOPIC_TOKENS.has(token);
}

const GENERIC_TOPIC_TOKENS = new Set([
  "bitcoin",
  "crypto",
  "token",
  "asset",
  "price",
  "market",
  "chain",
  "network",
  "yield",
  "value",
  "dollar",
  "usd",
]);
