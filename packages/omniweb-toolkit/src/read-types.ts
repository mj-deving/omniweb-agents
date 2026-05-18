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

import type { FeedRssResponse, FeedStreamPlanOptions, FeedStreamRequestPlan } from "./transport-consumers.js";

export interface CreateClientOptions {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  authToken?: string;
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
  /** @deprecated Use text. Retained for legacy search callers. */
  q?: string;
}

export interface PostLookupQuery {
  txHash: string;
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

export interface TopPostsQuery {
  category?: ReadPostCategory;
  minScore?: number;
  limit?: number;
}

export interface ReportsQuery {
  list?: boolean;
  limit?: number;
  id?: string;
}

export interface AgentsQuery {
  limit?: number;
}

export interface IdentityLookupQuery {
  platform?: string;
  username?: string;
  query?: string;
  chain?: string;
  address?: string;
}

export interface PredictionsQuery {
  status?: string;
  asset?: string;
  agent?: string;
}

export interface PredictionIntelligenceQuery {
  limit?: number;
  stats?: boolean;
}

export interface PredictionLeaderboardQuery {
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

export interface ThreadResponse {
  focusedPost?: ColonyPost;
  root?: ColonyPost;
  posts?: ColonyPost[];
  replies?: ColonyPost[];
  totalReplies?: number;
  [key: string]: unknown;
}

export interface PostDetailResponse {
  post?: ColonyPost;
  root?: ColonyPost;
  replies?: ColonyPost[];
  [key: string]: unknown;
}

export interface ConvergenceResponse {
  pulse?: Record<string, unknown>;
  mindshare?: Record<string, unknown>;
  stats?: Record<string, unknown>;
  signals?: unknown[];
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

export interface TopPostsResponse {
  posts?: ColonyPost[];
  count?: number;
  [key: string]: unknown;
}

export interface BalanceResponse {
  balance?: number | string;
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

export interface HealthResponse {
  ok?: boolean;
  status?: string;
  [key: string]: unknown;
}

export interface AgentsResponse {
  agents?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface AgentProfileResponse {
  agent?: Record<string, unknown>;
  posts?: ColonyPost[];
  reputation?: Record<string, unknown>;
  hasMore?: boolean;
  [key: string]: unknown;
}

export interface AgentIdentitiesResponse {
  xmIdentities?: Array<Record<string, unknown>>;
  web2Identities?: Array<Record<string, unknown>>;
  identities?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface IdentityLookupResponse {
  identity?: Record<string, unknown>;
  identities?: Array<Record<string, unknown>>;
  agents?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface PredictionsResponse {
  predictions?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface PredictionIntelligenceResponse {
  predictions?: Array<Record<string, unknown>>;
  stats?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PredictionRecommendationsResponse {
  recommendations?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface PredictionLeaderboardResponse {
  agents?: Array<Record<string, unknown>>;
  leaderboard?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface PredictionScoreResponse {
  composite?: number;
  breakdown?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface VerificationResponse {
  verified?: boolean;
  attestations?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface ReactionCountsResponse {
  agree?: number;
  disagree?: number;
  flag?: number;
  [key: string]: unknown;
}

export interface TipStatsResponse {
  totalTips?: number;
  totalAmount?: number;
  tips?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface AgentTipStatsResponse {
  totalReceived?: number;
  totalSent?: number;
  tips?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface OmniwebReadClient {
  getFeed(params?: FeedQuery): Promise<FeedResponse>;
  getFeedRss(): Promise<FeedRssResponse>;
  planFeedStream(options?: FeedStreamPlanOptions): FeedStreamRequestPlan;
  searchFeed(params?: SearchQuery): Promise<SearchResponse>;
  getPostDetail(txHash: string): Promise<PostDetailResponse>;
  getThread(txHash: string): Promise<ThreadResponse>;
  getSignals(): Promise<SignalsResponse>;
  getConvergence(): Promise<ConvergenceResponse>;
  getOracle(params: OracleQuery): Promise<OracleResponse>;
  getPrices(params: PricesQuery): Promise<PricesResponse>;
  getPredictions(params?: PredictionsQuery): Promise<PredictionsResponse>;
  getPredictionIntelligence(params?: PredictionIntelligenceQuery): Promise<PredictionIntelligenceResponse>;
  getPredictionRecommendations(userAddress: string): Promise<PredictionRecommendationsResponse>;
  getAgentScores(params?: ScoresQuery): Promise<ScoresResponse>;
  getTopPosts(params?: TopPostsQuery): Promise<TopPostsResponse>;
  getPredictionLeaderboard(params?: PredictionLeaderboardQuery): Promise<PredictionLeaderboardResponse>;
  getPredictionScore(address: string): Promise<PredictionScoreResponse>;
  getBalance(): Promise<BalanceResponse>;
  getHealth(): Promise<HealthResponse>;
  getStats(): Promise<StatsResponse>;
  getAgents(params?: AgentsQuery): Promise<AgentsResponse>;
  getAgentProfile(address: string): Promise<AgentProfileResponse>;
  getAgentIdentities(address: string): Promise<AgentIdentitiesResponse>;
  lookupIdentity(params: IdentityLookupQuery): Promise<IdentityLookupResponse>;
  getReports(params?: ReportsQuery): Promise<ReportsResponse>;
  getReport(params?: ReportsQuery): Promise<ReportsResponse>;
  verifyDahr(txHash: string): Promise<VerificationResponse>;
  verifyTlsn(txHash: string): Promise<VerificationResponse>;
  getReactions(txHash: string): Promise<ReactionCountsResponse>;
  getTipStats(txHash: string): Promise<TipStatsResponse>;
  getAgentTipStats(address: string): Promise<AgentTipStatsResponse>;
}
