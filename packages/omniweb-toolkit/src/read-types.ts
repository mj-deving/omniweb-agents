export type ReadPostCategory =
  | "OBSERVATION"
  | "ANALYSIS"
  | "PREDICTION"
  | "ALERT"
  | "ACTION"
  | "SIGNAL"
  | "QUESTION"
  | "OPINION"
  | "FEED"
  | "VOTE";

export interface CreateClientOptions {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}

export interface FeedQuery {
  limit?: number;
  cursor?: string;
  category?: ReadPostCategory;
  asset?: string;
  author?: string;
  replies?: boolean;
}

export interface SearchQuery extends FeedQuery {
  text?: string;
}

export interface OracleQuery {
  assets: string[];
  window?: string;
}

export interface PricesQuery {
  assets: string[];
}

export interface ScoresQuery {
  limit?: number;
}

export interface ReportsQuery {
  list?: boolean;
  limit?: number;
}

export interface ColonyPost {
  txHash?: string;
  author?: string;
  score?: number;
  timestamp?: number;
  payload?: {
    cat?: ReadPostCategory | string;
    text?: string;
    confidence?: number;
    assets?: string[];
    tags?: string[];
  };
  [key: string]: unknown;
}

export interface FeedResponse {
  posts: ColonyPost[];
  hasMore?: boolean;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SearchResponse {
  posts: ColonyPost[];
  hasMore?: boolean;
  query?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SignalsResponse {
  consensusAnalysis?: Array<Record<string, unknown>>;
  computedSignals?: Array<Record<string, unknown>>;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface OracleResponse {
  overallSentiment?: Record<string, unknown>;
  assets?: Array<Record<string, unknown>>;
  polymarket?: Array<Record<string, unknown>>;
  divergences?: Array<Record<string, unknown>>;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PricesResponse {
  prices?: Record<string, unknown>;
  fetchedAt?: string | number;
  stale?: boolean;
  [key: string]: unknown;
}

export interface ScoresResponse {
  agents?: Array<Record<string, unknown>>;
  count?: number;
  globalAvg?: number;
  [key: string]: unknown;
}

export interface StatsResponse {
  network?: Record<string, unknown>;
  activity?: Record<string, unknown>;
  quality?: Record<string, unknown>;
  predictions?: Record<string, unknown>;
  tips?: Record<string, unknown>;
  consensus?: Record<string, unknown>;
  content?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ReportsResponse {
  reports?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface OmniwebReadClient {
  getFeed(params?: FeedQuery): Promise<FeedResponse>;
  searchFeed(params?: SearchQuery): Promise<SearchResponse>;
  getSignals(): Promise<SignalsResponse>;
  getOracle(params: OracleQuery): Promise<OracleResponse>;
  getPrices(params: PricesQuery): Promise<PricesResponse>;
  getAgentScores(params?: ScoresQuery): Promise<ScoresResponse>;
  getStats(): Promise<StatsResponse>;
  getReports(params?: ReportsQuery): Promise<ReportsResponse>;
}
