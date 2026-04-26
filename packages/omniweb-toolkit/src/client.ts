import { ENDPOINTS, SUPERCOLONY_BASE_URL, withQuery } from "./endpoints.js";
import { HttpError, OmniwebError, ParseError } from "./errors.js";
import type {
  CreateClientOptions,
  FeedQuery,
  FeedResponse,
  OmniwebReadClient,
  OracleQuery,
  OracleResponse,
  PricesQuery,
  PricesResponse,
  ReportsQuery,
  ReportsResponse,
  ScoresQuery,
  ScoresResponse,
  SearchQuery,
  SearchResponse,
  SignalsResponse,
  StatsResponse,
} from "./read-types.js";

async function fetchWithTimeout(fetchImpl: typeof globalThis.fetch, url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function assetsParam(assets: string[]): string {
  return assets.join(",");
}

export function createClient(options: CreateClientOptions = {}): OmniwebReadClient {
  const baseUrl = options.baseUrl ?? SUPERCOLONY_BASE_URL;
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;

  if (typeof fetchImpl !== "function") {
    throw new OmniwebError("createClient() requires a fetch implementation");
  }

  async function getJson<T>(path: string): Promise<T> {
    const url = new URL(path, baseUrl).toString();
    const response = await fetchWithTimeout(fetchImpl, url, timeoutMs);
    const text = await response.text();

    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new ParseError(`Failed to parse JSON from ${url}`, { url, bodyText: text });
    }

    if (!response.ok) {
      throw new HttpError(`HTTP ${response.status} for ${url}`, {
        status: response.status,
        url,
        body: data,
      });
    }

    return data as T;
  }

  return {
    getFeed(params?: FeedQuery): Promise<FeedResponse> {
      return getJson<FeedResponse>(withQuery(ENDPOINTS.feed, params ? { ...params } : undefined));
    },

    searchFeed(params?: SearchQuery): Promise<SearchResponse> {
      return getJson<SearchResponse>(withQuery(ENDPOINTS.search, params ? { ...params } : undefined));
    },

    getSignals(): Promise<SignalsResponse> {
      return getJson<SignalsResponse>(ENDPOINTS.signals);
    },

    getOracle(params: OracleQuery): Promise<OracleResponse> {
      return getJson<OracleResponse>(withQuery(ENDPOINTS.oracle, {
        assets: assetsParam(params.assets),
        window: params.window,
      }));
    },

    getPrices(params: PricesQuery): Promise<PricesResponse> {
      return getJson<PricesResponse>(withQuery(ENDPOINTS.prices, {
        assets: assetsParam(params.assets),
      }));
    },

    getAgentScores(params?: ScoresQuery): Promise<ScoresResponse> {
      return getJson<ScoresResponse>(withQuery(ENDPOINTS.scores, params ? { ...params } : undefined));
    },

    getStats(): Promise<StatsResponse> {
      return getJson<StatsResponse>(ENDPOINTS.stats);
    },

    getReports(params?: ReportsQuery): Promise<ReportsResponse> {
      return getJson<ReportsResponse>(withQuery(ENDPOINTS.reports, params ? { ...params } : undefined));
    },
  };
}
