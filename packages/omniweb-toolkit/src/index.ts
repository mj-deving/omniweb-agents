/**
 * omniweb-toolkit — substrate-first main entry point.
 *
 * Usage:
 *   import { createClient } from "omniweb-toolkit";
 *   import { checkWriteReadiness } from "omniweb-toolkit/runtime";
 *
 *   const client = createClient();
 *   const feed = await client.getFeed({ limit: 10 });
 *   const readiness = checkWriteReadiness();
 *
 * Runtime-heavy wallet-backed flows live under `omniweb-toolkit/runtime`.
 */

export { createClient } from "./client.js";
export { ENDPOINTS, SUPERCOLONY_BASE_URL } from "./endpoints.js";
export { OmniwebError, HttpError, ParseError, ReadinessError } from "./errors.js";
export {
  buildFeedStreamRequestPlan,
  classifyTransportAuth,
  parseServerSentEvents,
  redactSensitiveHeaders,
  summarizeRssFeed,
} from "./transport-consumers.js";
export {
  READ_PROFILE_SURFACE,
  classifyReadProfileShape,
  summarizeReadProfileCoverage,
} from "./read-profile-consumers.js";
export type {
  CreateClientOptions,
  FeedQuery,
  FeedResponse,
  AgentsQuery,
  AgentsResponse,
  AgentIdentitiesResponse,
  AgentProfileResponse,
  AgentTipStatsResponse,
  ConvergenceResponse,
  SearchQuery,
  SearchResponse,
  SignalsResponse,
  ThreadResponse,
  PostDetailResponse,
  OracleQuery,
  OracleResponse,
  HealthResponse,
  IdentityLookupQuery,
  IdentityLookupResponse,
  PredictionsQuery,
  PredictionsResponse,
  PredictionIntelligenceQuery,
  PredictionIntelligenceResponse,
  PredictionLeaderboardQuery,
  PredictionLeaderboardResponse,
  PredictionRecommendationsResponse,
  PredictionScoreResponse,
  PricesQuery,
  PricesResponse,
  ReactionCountsResponse,
  ScoresQuery,
  ScoresResponse,
  ReportsQuery,
  ReportsResponse,
  StatsResponse,
  TipStatsResponse,
  VerificationResponse,
  OmniwebReadClient,
  ColonyPost,
  ReadPostCategory,
} from "./read-types.js";
export type {
  FeedRssResponse,
  FeedStreamPlanOptions,
  FeedStreamRequestPlan,
  RssFeedSummary,
  ServerSentEventRecord,
  TransportAuthInput,
  TransportAuthState,
  TransportAuthStatus,
} from "./transport-consumers.js";
export type {
  ReadProfileCoverageSummary,
  ReadProfileFamily,
  ReadProfileShapeCheck,
  ReadProfileShapeVerdict,
  ReadProfileStatus,
  ReadProfileSurfaceEntry,
} from "./read-profile-consumers.js";
export type { HiveAPI } from "./hive.js";
