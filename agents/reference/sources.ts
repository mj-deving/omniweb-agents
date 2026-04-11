/**
 * Attestation source registry — maps assets to verified data endpoints.
 *
 * The core principle: the attestUrl must point to the EXACT data source
 * quoted in the post text. If you quote CoinGecko prices, attest CoinGecko.
 * If you quote Demos oracle data, attest the oracle endpoint.
 *
 * Source matching flow:
 *   1. Decide which data source to quote (CoinGecko, Binance, DeFiLlama, etc.)
 *   2. Fetch data from that source
 *   3. Build post text from the fetched data (never from a different source)
 *   4. Attest that same URL via DAHR
 *   5. Publish with text + attestUrl pointing to the same endpoint
 *
 * Anti-pattern: text quotes oracle prices but attestUrl points to CoinGecko.
 * The DAHR proof then proves something the post doesn't claim.
 */

import { ASSET_MAP } from "../../src/toolkit/chain/asset-helpers.js";

export interface AttestationSource {
  /** Human-readable source name */
  name: string;
  /** URL template — {asset} is replaced with the resolved asset ID */
  urlTemplate: string;
  /** How to resolve the asset ticker to this source's ID format */
  resolveAsset: (ticker: string) => string;
  /** Extract the price from the API response */
  extractPrice: (data: unknown) => { price: number; currency: string } | null;
  /** Topics this source covers */
  topics: string[];
}

/** Resolve ticker to CoinGecko coin ID via ASSET_MAP */
function tickerToCoinId(ticker: string): string {
  const entry = ASSET_MAP.find(([, , sym]) => sym === ticker);
  return entry ? entry[1] : ticker.toLowerCase();
}

/**
 * Registry of verified attestation sources.
 * Each source defines how to build the URL, resolve asset IDs, and extract prices.
 */
export const SOURCES: Record<string, AttestationSource> = {
  coingecko: {
    name: "CoinGecko",
    urlTemplate: "https://api.coingecko.com/api/v3/simple/price?ids={asset}&vs_currencies=usd",
    resolveAsset: tickerToCoinId,
    extractPrice: (data: unknown) => {
      if (!data || typeof data !== "object") return null;
      const entries = Object.entries(data as Record<string, any>);
      if (entries.length === 0) return null;
      const [, val] = entries[0];
      if (val?.usd != null) return { price: val.usd, currency: "USD" };
      return null;
    },
    topics: ["crypto", "prices"],
  },

  binance: {
    name: "Binance",
    urlTemplate: "https://api.binance.com/api/v3/ticker/price?symbol={asset}USDT",
    resolveAsset: (ticker: string) => ticker.toUpperCase(),
    extractPrice: (data: unknown) => {
      if (!data || typeof data !== "object") return null;
      const d = data as any;
      if (d.price != null) return { price: Number(d.price), currency: "USD" };
      return null;
    },
    topics: ["crypto", "prices", "trading"],
  },

  defillama: {
    name: "DeFiLlama",
    urlTemplate: "https://api.llama.fi/tvl/{asset}",
    resolveAsset: (ticker: string) => ticker.toLowerCase(),
    extractPrice: (data: unknown) => {
      if (typeof data === "number") return { price: data, currency: "USD" };
      return null;
    },
    topics: ["defi", "tvl"],
  },
};

/** Default source for price attestation — Binance primary (CoinGecko 429s DAHR proxy) */
export const DEFAULT_SOURCE = "binance";

/**
 * Build a source-matched attestation URL for an asset.
 * Returns the URL ready for DAHR attestation.
 */
export function buildAttestUrl(
  ticker: string,
  sourceName: string = DEFAULT_SOURCE,
): string {
  const source = SOURCES[sourceName];
  if (!source) throw new Error(`Unknown attestation source: ${sourceName}`);
  const assetId = source.resolveAsset(ticker);
  return source.urlTemplate.replace("{asset}", assetId);
}

/**
 * Fetch data from a source and extract the price.
 * Returns both the raw response and the extracted price for text composition.
 */
export async function fetchSourcePrice(
  ticker: string,
  sourceName: string = DEFAULT_SOURCE,
): Promise<{
  url: string;
  source: AttestationSource;
  price: number;
  currency: string;
  rawData: unknown;
} | null> {
  const source = SOURCES[sourceName];
  if (!source) return null;

  const url = buildAttestUrl(ticker, sourceName);

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const extracted = source.extractPrice(data);
    if (!extracted) return null;

    return {
      url,
      source,
      price: extracted.price,
      currency: extracted.currency,
      rawData: data,
    };
  } catch {
    return null;
  }
}
