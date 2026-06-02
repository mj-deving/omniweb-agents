import type { MinimalAttestationCandidate } from "../minimal-attestation-plan.js";

export type ResearchEvidenceSourceKind =
  | "binance-24hr-ticker"
  | "binance-premium-index"
  | "binance-open-interest"
  | "coingecko-market-chart"
  | "coingecko-coins-markets"
  | "coingecko-simple-price"
  | "btcetfdata-current"
  | "blockchair-stats"
  | "defillama-protocols"
  | "defillama-stablecoins"
  | "fred-liquidity-series"
  | "treasury-interest-rates"
  | "cboe-vix-history"
  | "generic";

export function classifyResearchEvidenceSource(source: MinimalAttestationCandidate): ResearchEvidenceSourceKind {
  const sourceId = source.sourceId.toLowerCase();
  const provider = source.provider.toLowerCase();
  const name = source.name.toLowerCase();

  if (sourceId === "cboe-vix-daily" || provider === "cboe") {
    return "cboe-vix-history";
  }

  if (sourceId === "treasury-interest-rates" || (provider === "treasury" && name.includes("rates"))) {
    return "treasury-interest-rates";
  }

  if (sourceId.startsWith("fred-graph-") || provider === "fred-graph") {
    return "fred-liquidity-series";
  }

  if (sourceId === "defillama-stablecoins" || (provider === "defillama" && name.includes("stablecoins"))) {
    return "defillama-stablecoins";
  }

  if (sourceId === "defillama-protocols" || (provider === "defillama" && name.includes("protocols"))) {
    return "defillama-protocols";
  }

  if (sourceId.startsWith("blockchair-") || provider === "blockchair") {
    return "blockchair-stats";
  }

  if (sourceId.startsWith("btcetfdata-current") || provider === "btcetfdata") {
    return "btcetfdata-current";
  }

  if (sourceId === "coingecko-42ff8c85" || (provider === "coingecko" && name.includes("market"))) {
    return "coingecko-market-chart";
  }

  if (sourceId === "coingecko-coins-markets" || (provider === "coingecko" && name.includes("coins-markets"))) {
    return "coingecko-coins-markets";
  }

  if (sourceId === "coingecko-2a7ea372" || (provider === "coingecko" && name.includes("simple"))) {
    return "coingecko-simple-price";
  }

  if (sourceId.startsWith("binance-24hr-") || (provider === "binance" && name.includes("24hr"))) {
    return "binance-24hr-ticker";
  }

  if (sourceId.startsWith("binance-futures-oi-") || (provider === "binance-futures" && name.includes("open-interest"))) {
    return "binance-open-interest";
  }

  if (sourceId.startsWith("binance-futures-") || (provider === "binance-futures" && name.includes("premium"))) {
    return "binance-premium-index";
  }

  // Compatibility fallback for feed-derived or older opaque candidates.
  if (isCboeVixUrl(source.url)) return "cboe-vix-history";
  if (isTreasuryRatesUrl(source.url)) return "treasury-interest-rates";
  if (isFredGraphSeriesUrl(source.url)) return "fred-liquidity-series";
  if (isDefiLlamaStablecoinsUrl(source.url)) return "defillama-stablecoins";
  if (isDefiLlamaProtocolsUrl(source.url)) return "defillama-protocols";
  if (isBlockchairStatsUrl(source.url)) return "blockchair-stats";
  if (isBtcEtfDataCurrentUrl(source.url)) return "btcetfdata-current";
  if (isCoinGeckoMarketChartUrl(source.url)) return "coingecko-market-chart";
  if (isCoinGeckoCoinsMarketsUrl(source.url)) return "coingecko-coins-markets";
  if (isCoinGeckoSimplePriceUrl(source.url)) return "coingecko-simple-price";
  if (isBinance24hrTickerUrl(source.url)) return "binance-24hr-ticker";
  if (isBinanceOpenInterestUrl(source.url)) return "binance-open-interest";
  if (isBinancePremiumIndexUrl(source.url)) return "binance-premium-index";
  return "generic";
}

function isBinancePremiumIndexUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "fapi.binance.com" && parsed.pathname.includes("/premiumIndex");
  } catch {
    return false;
  }
}

function isBinance24hrTickerUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "api.binance.com" && parsed.pathname.includes("/ticker/24hr");
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

function isCoinGeckoCoinsMarketsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "api.coingecko.com" && parsed.pathname.includes("/coins/markets");
  } catch {
    return false;
  }
}

function isCoinGeckoSimplePriceUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "api.coingecko.com" && parsed.pathname.includes("/simple/price");
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

function isDefiLlamaStablecoinsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "stablecoins.llama.fi" && parsed.pathname === "/stablecoins";
  } catch {
    return false;
  }
}

function isDefiLlamaProtocolsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "api.llama.fi" && parsed.pathname === "/protocols";
  } catch {
    return false;
  }
}

function isBlockchairStatsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "api.blockchair.com" && parsed.pathname.endsWith("/stats");
  } catch {
    return false;
  }
}

function isTreasuryRatesUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "api.fiscaldata.treasury.gov" && parsed.pathname.includes("/avg_interest_rates");
  } catch {
    return false;
  }
}

function isFredGraphSeriesUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "fred.stlouisfed.org" && parsed.pathname === "/graph/fredgraph.csv";
  } catch {
    return false;
  }
}

function isCboeVixUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "cdn.cboe.com"
      && (
        parsed.pathname.endsWith("/VIX_History.csv")
        || parsed.pathname.endsWith("/delayed_quotes/quotes/_VIX.json")
      );
  } catch {
    return false;
  }
}
