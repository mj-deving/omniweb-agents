/**
 * Kraken hooks — pair resolution and dynamic result key extraction.
 *
 * Kraken uses non-standard pair naming (XXBTZUSD, XETHZUSD, SOLUSD)
 * and wraps all results in { error: [], result: { PAIRNAME: {...} } }.
 * The dynamic key means the declarative engine can't use a fixed jsonPath
 * to reach the data — this hook extracts it.
 */

import type { SourceRecordV2 } from "../../catalog.js";
import type {
  BuildCandidatesContext,
  FetchedResponse,
  EvidenceEntry,
  ParsedAdapterResponse,
} from "../types.js";
import type { OperationSpec } from "../declarative-engine.js";

/** Map common names/symbols to Kraken pair identifiers */
const PAIR_MAP: Record<string, string> = {
  bitcoin: "XXBTZUSD",
  btc: "XXBTZUSD",
  xbt: "XXBTZUSD",
  ethereum: "XETHZUSD",
  eth: "XETHZUSD",
  solana: "SOLUSD",
  sol: "SOLUSD",
  cardano: "ADAUSD",
  ada: "ADAUSD",
  polkadot: "DOTUSD",
  dot: "DOTUSD",
  ripple: "XXRPZUSD",
  xrp: "XXRPZUSD",
  dogecoin: "XDGUSD",
  doge: "XDGUSD",
  litecoin: "XLTCZUSD",
  ltc: "XLTCZUSD",
  chainlink: "LINKUSD",
  link: "LINKUSD",
  avalanche: "AVAXUSD",
  avax: "AVAXUSD",
};

/**
 * Resolve the Kraken pair variable from topic/vars.
 * Maps common crypto names to Kraken's pair format.
 */
export function resolveVariables(
  input: BuildCandidatesContext,
  _operation: OperationSpec,
  resolved: Record<string, string>,
): Record<string, string> {
  // If pair is already resolved by the engine, try to map it
  const pair = resolved.pair || input.vars.pair || input.vars.asset || input.topic;
  if (!pair) return resolved;

  const normalized = pair.trim().toLowerCase();
  const mapped = PAIR_MAP[normalized];

  return {
    ...resolved,
    pair: mapped || pair.toUpperCase(),
  };
}

/**
 * Extract entries from Kraken's dynamic result keys.
 * Kraken responses look like: { error: [], result: { XXBTZUSD: { ... } } }
 * The engine's object-entries mode handles this, but the postParse hook
 * enriches entries with the pair name as the identifier.
 */
export function postParse(
  _source: SourceRecordV2,
  _response: FetchedResponse,
  parsedRoot: unknown,
  entries: EvidenceEntry[],
): ParsedAdapterResponse {
  if (entries.length > 0) return { entries };

  // Fallback: if the engine couldn't extract entries (dynamic keys),
  // manually extract from result object
  if (typeof parsedRoot !== "object" || parsedRoot === null) return { entries: [] };

  const root = parsedRoot as Record<string, unknown>;
  if (Array.isArray(root.error) && root.error.length > 0) return { entries: [] };

  const result = root.result;
  if (typeof result !== "object" || result === null) return { entries: [] };

  const extracted: EvidenceEntry[] = [];
  for (const [pairKey, pairData] of Object.entries(result as Record<string, unknown>)) {
    if (typeof pairData !== "object" || pairData === null) continue;

    const data = pairData as Record<string, unknown>;

    // Handle ticker data (has 'c' for close, 'v' for volume, etc.)
    if (data.c || data.a || data.b) {
      const close = Array.isArray(data.c) ? data.c[0] : data.c;
      const volume = Array.isArray(data.v) ? data.v[0] : data.v;

      extracted.push({
        id: pairKey,
        title: `${pairKey} ticker`,
        bodyText: `${pairKey}: ${close}`,
        topics: ["crypto", "price", pairKey.toLowerCase()],
        metrics: {
          price: typeof close === "string" ? close : String(close ?? 0),
          volume: typeof volume === "string" ? volume : String(volume ?? 0),
        },
        raw: pairData,
      });
      continue;
    }

    // Handle OHLC data (array of tuples)
    if (Array.isArray(pairData)) {
      for (const tuple of pairData as unknown[][]) {
        if (!Array.isArray(tuple) || tuple.length < 6) continue;
        extracted.push({
          id: `${pairKey}-${tuple[0]}`,
          title: `${pairKey} OHLC`,
          bodyText: `${pairKey} open=${tuple[1]} high=${tuple[2]} low=${tuple[3]} close=${tuple[4]}`,
          topics: ["crypto", "ohlc", pairKey.toLowerCase()],
          metrics: {
            time: Number(tuple[0]),
            open: String(tuple[1]),
            high: String(tuple[2]),
            low: String(tuple[3]),
            close: String(tuple[4]),
            volume: String(tuple[5]),
          },
          raw: tuple,
        });
      }
      continue;
    }
  }

  return { entries: extracted };
}
