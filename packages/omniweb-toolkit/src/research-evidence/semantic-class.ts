import type { ResearchEvidenceSourceKind } from "./source-kind.js";

export type ResearchEvidenceSemanticClass =
  | "market"
  | "macro"
  | "liquidity"
  | "network"
  | "metadata"
  | "generic";

export function classifyResearchEvidenceSemanticClass(
  sourceKind: ResearchEvidenceSourceKind,
  values: Record<string, string>,
  derivedMetrics: Record<string, string>,
): ResearchEvidenceSemanticClass {
  if (
    sourceKind === "binance-24hr-ticker"
    || sourceKind === "binance-premium-index"
    || sourceKind === "binance-open-interest"
    || sourceKind === "coingecko-market-chart"
    || sourceKind === "coingecko-coins-markets"
    || sourceKind === "coingecko-simple-price"
    || sourceKind === "btcetfdata-current"
    || sourceKind === "cboe-vix-history"
  ) {
    return "market";
  }

  if (sourceKind === "treasury-interest-rates") {
    return "macro";
  }

  if (sourceKind === "fred-liquidity-series") {
    return "liquidity";
  }

  if (sourceKind === "defillama-protocols") {
    return "liquidity";
  }

  if (sourceKind === "defillama-stablecoins") {
    return "liquidity";
  }

  if (sourceKind === "blockchair-stats") {
    return "network";
  }

  const keys = Object.keys(values).concat(Object.keys(derivedMetrics)).map((key) => key.toLowerCase());
  const has = (patterns: RegExp[]) => patterns.some((pattern) => keys.some((key) => pattern.test(key)));

  if (has([/price/, /volume/, /funding/, /openinterest/, /holdings/, /flow/, /vix/, /high/, /low/, /spread/])) {
    return "market";
  }

  if (has([/rate/, /yield/, /treasury/, /bill/, /note/, /curve/])) {
    return "macro";
  }

  if (has([/supply/, /circulating/, /peg/, /stablecoin/, /deviation/])) {
    return "liquidity";
  }

  const metadataPatterns = [/nbhits/, /nbpages/, /page$/, /hitsperpage/, /processingtimems/, /query/, /count$/, /total$/];
  if (keys.length > 0 && keys.every((key) => metadataPatterns.some((pattern) => pattern.test(key)))) {
    return "metadata";
  }

  return "generic";
}
