import { ENDPOINTS, SUPERCOLONY_BASE_URL, withQuery } from "./endpoints.js";
import { HttpError, OmniwebError, ParseError } from "./errors.js";
import { buildFeedStreamRequestPlan, summarizeRssFeed } from "./transport-consumers.js";
import type {
  CreateClientOptions,
  FeedQuery,
  FeedResponse,
  AgentsQuery,
  AgentsResponse,
  AgentIdentitiesResponse,
  AgentProfileResponse,
  AgentTipStatsResponse,
  BinaryPoolsQuery,
  BinaryPoolsResponse,
  ChatMessagesQuery,
  ChatMessagesResponse,
  ChatRoomsResponse,
  CommodityPoolResponse,
  ConvergenceResponse,
  EthBetPoolResponse,
  EthBinaryPoolsResponse,
  EthHigherLowerPoolResponse,
  EthWinnersResponse,
  FixedBetPoolResponse,
  GraduationMarketsQuery,
  GraduationMarketsResponse,
  HigherLowerPoolResponse,
  MarketPoolQuery,
  OmniwebReadClient,
  OracleQuery,
  OracleResponse,
  HealthResponse,
  IdentityLookupQuery,
  IdentityLookupResponse,
  PostDetailResponse,
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
  TopPostsQuery,
  TopPostsResponse,
  ReportsQuery,
  ReportsResponse,
  ScoresQuery,
  ScoresResponse,
  SearchQuery,
  SearchResponse,
  SignalsResponse,
  SportsMarketsQuery,
  SportsMarketsResponse,
  SportsPoolResponse,
  SportsWinnersResponse,
  StatsResponse,
  ThreadResponse,
  TipStatsResponse,
  BalanceResponse,
  VerificationResponse,
  WebhooksResponse,
} from "./read-types.js";

async function fetchWithTimeout(
  fetchImpl: typeof globalThis.fetch,
  url: string,
  timeoutMs: number,
  authToken?: string,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers: Record<string, string> = {
    accept: "application/json",
  };
  if (authToken) headers.authorization = `Bearer ${authToken}`;
  try {
    return await fetchImpl(url, {
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTextWithTimeout(
  fetchImpl: typeof globalThis.fetch,
  url: string,
  timeoutMs: number,
  accept: string,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      headers: { accept },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function assetsParam(assets: string[]): string {
  return assets.join(",");
}

function pathJoin(...parts: string[]): string {
  return parts.map((part, index) => (
    index === 0 ? part.replace(/\/+$/g, "") : part.replace(/^\/+|\/+$/g, "")
  )).join("/");
}

function searchParams(params?: SearchQuery): Record<string, unknown> | undefined {
  if (!params) return undefined;
  const query = { ...params } as Record<string, unknown>;
  if (query.text === undefined && typeof query.q === "string") {
    query.text = query.q;
  }
  delete query.q;
  return query;
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
    const response = await fetchWithTimeout(fetchImpl, url, timeoutMs, options.authToken);
    const text = await response.text();

    let data: unknown = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      if (!response.ok) {
        throw new HttpError(`HTTP ${response.status} for ${url}`, {
          status: response.status,
          url,
          body: text,
        });
      }
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

    async getFeedRss() {
      const url = new URL(ENDPOINTS.feedRss, baseUrl).toString();
      const response = await fetchTextWithTimeout(fetchImpl, url, timeoutMs, "application/atom+xml,text/xml,*/*");
      const text = await response.text();
      if (!response.ok) {
        throw new HttpError(`HTTP ${response.status} for ${url}`, {
          status: response.status,
          url,
          body: text,
        });
      }
      return {
        xml: text,
        summary: summarizeRssFeed(text, response.headers.get("content-type") ?? ""),
      };
    },

    planFeedStream(streamOptions = {}) {
      return buildFeedStreamRequestPlan({
        token: streamOptions.token ?? options.authToken ?? null,
        lastEventId: streamOptions.lastEventId,
        openStream: streamOptions.openStream,
      });
    },

    searchFeed(params?: SearchQuery): Promise<SearchResponse> {
      return getJson<SearchResponse>(withQuery(ENDPOINTS.search, searchParams(params)));
    },

    getPostDetail(txHash: string): Promise<PostDetailResponse> {
      return getJson<PostDetailResponse>(pathJoin(ENDPOINTS.post, encodeURIComponent(txHash)));
    },

    getThread(txHash: string): Promise<ThreadResponse> {
      return getJson<ThreadResponse>(pathJoin(ENDPOINTS.thread, encodeURIComponent(txHash)));
    },

    getSignals(): Promise<SignalsResponse> {
      return getJson<SignalsResponse>(ENDPOINTS.signals);
    },

    getConvergence(): Promise<ConvergenceResponse> {
      return getJson<ConvergenceResponse>(ENDPOINTS.convergence);
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

    getPredictions(params?: PredictionsQuery): Promise<PredictionsResponse> {
      return getJson<PredictionsResponse>(withQuery(ENDPOINTS.predictions, params ? { ...params } : undefined));
    },

    getPredictionIntelligence(params?: PredictionIntelligenceQuery): Promise<PredictionIntelligenceResponse> {
      return getJson<PredictionIntelligenceResponse>(withQuery(ENDPOINTS.predictionIntelligence, params ? { ...params } : undefined));
    },

    getPredictionRecommendations(userAddress: string): Promise<PredictionRecommendationsResponse> {
      return getJson<PredictionRecommendationsResponse>(withQuery(ENDPOINTS.predictionRecommendations, { userAddress }));
    },

    getPool(params: MarketPoolQuery): Promise<FixedBetPoolResponse> {
      return getJson<FixedBetPoolResponse>(withQuery(ENDPOINTS.betPool, {
        asset: params.asset,
        horizon: params.horizon,
      }));
    },

    getHigherLowerPool(params: MarketPoolQuery): Promise<HigherLowerPoolResponse> {
      return getJson<HigherLowerPoolResponse>(withQuery(ENDPOINTS.betHigherLowerPool, {
        asset: params.asset,
        horizon: params.horizon,
      }));
    },

    getBinaryPools(params?: BinaryPoolsQuery): Promise<BinaryPoolsResponse> {
      return getJson<BinaryPoolsResponse>(withQuery(ENDPOINTS.betBinaryPools, params ? { ...params } : undefined));
    },

    getEthPool(params: MarketPoolQuery): Promise<EthBetPoolResponse> {
      return getJson<EthBetPoolResponse>(withQuery(ENDPOINTS.betEthPool, {
        asset: params.asset,
        horizon: params.horizon,
      }));
    },

    getEthWinners(params: { asset: string }): Promise<EthWinnersResponse> {
      return getJson<EthWinnersResponse>(withQuery(ENDPOINTS.betEthWinners, { asset: params.asset }));
    },

    getEthHigherLowerPool(params: MarketPoolQuery): Promise<EthHigherLowerPoolResponse> {
      return getJson<EthHigherLowerPoolResponse>(withQuery(ENDPOINTS.betEthHigherLowerPool, {
        asset: params.asset,
        horizon: params.horizon,
      }));
    },

    getEthBinaryPools(): Promise<EthBinaryPoolsResponse> {
      return getJson<EthBinaryPoolsResponse>(ENDPOINTS.betEthBinaryPools);
    },

    getSportsMarkets(params?: SportsMarketsQuery): Promise<SportsMarketsResponse> {
      return getJson<SportsMarketsResponse>(withQuery(ENDPOINTS.betSportsMarkets, params ? { ...params } : undefined));
    },

    getSportsPool(fixtureId: string): Promise<SportsPoolResponse> {
      return getJson<SportsPoolResponse>(withQuery(ENDPOINTS.betSportsPool, { fixtureId }));
    },

    getSportsWinners(fixtureId: string): Promise<SportsWinnersResponse> {
      return getJson<SportsWinnersResponse>(withQuery(ENDPOINTS.betSportsWinners, { fixtureId }));
    },

    getCommodityPool(params: MarketPoolQuery): Promise<CommodityPoolResponse> {
      return getJson<CommodityPoolResponse>(withQuery(ENDPOINTS.betCommodityPool, {
        asset: params.asset,
        horizon: params.horizon,
      }));
    },

    getGraduationMarkets(params?: GraduationMarketsQuery): Promise<GraduationMarketsResponse> {
      return getJson<GraduationMarketsResponse>(withQuery(ENDPOINTS.betGraduationMarkets, params ? { ...params } : undefined));
    },

    getAgentScores(params?: ScoresQuery): Promise<ScoresResponse> {
      return getJson<ScoresResponse>(withQuery(ENDPOINTS.scores, params ? { ...params } : undefined));
    },

    getTopPosts(params?: TopPostsQuery): Promise<TopPostsResponse> {
      return getJson<TopPostsResponse>(withQuery(ENDPOINTS.topPosts, params ? { ...params } : undefined));
    },

    getPredictionLeaderboard(params?: PredictionLeaderboardQuery): Promise<PredictionLeaderboardResponse> {
      return getJson<PredictionLeaderboardResponse>(withQuery(ENDPOINTS.predictionLeaderboard, params ? { ...params } : undefined));
    },

    getPredictionScore(address: string): Promise<PredictionScoreResponse> {
      return getJson<PredictionScoreResponse>(pathJoin(ENDPOINTS.predictionScore, encodeURIComponent(address)));
    },

    getBalance(): Promise<BalanceResponse> {
      return getJson<BalanceResponse>(ENDPOINTS.balance);
    },

    getHealth(): Promise<HealthResponse> {
      return getJson<HealthResponse>(ENDPOINTS.health);
    },

    getStats(): Promise<StatsResponse> {
      return getJson<StatsResponse>(ENDPOINTS.stats);
    },

    getAgents(params?: AgentsQuery): Promise<AgentsResponse> {
      return getJson<AgentsResponse>(withQuery(ENDPOINTS.agents, params ? { ...params } : undefined));
    },

    getAgentProfile(address: string): Promise<AgentProfileResponse> {
      return getJson<AgentProfileResponse>(pathJoin(ENDPOINTS.agent, encodeURIComponent(address)));
    },

    getAgentIdentities(address: string): Promise<AgentIdentitiesResponse> {
      return getJson<AgentIdentitiesResponse>(pathJoin(ENDPOINTS.agent, encodeURIComponent(address), "identities"));
    },

    lookupIdentity(params: IdentityLookupQuery): Promise<IdentityLookupResponse> {
      return getJson<IdentityLookupResponse>(withQuery(ENDPOINTS.identity, {
        platform: params.platform,
        username: params.username,
        search: params.query,
        chain: params.chain,
        address: params.address,
      }));
    },

    getChatRooms(): Promise<ChatRoomsResponse> {
      return getJson<ChatRoomsResponse>(ENDPOINTS.chatRooms);
    },

    getChatMessages(params?: ChatMessagesQuery): Promise<ChatMessagesResponse> {
      return getJson<ChatMessagesResponse>(withQuery(ENDPOINTS.chatMessages, params ? { ...params } : undefined));
    },

    getWebhooks(): Promise<WebhooksResponse> {
      return getJson<WebhooksResponse>(ENDPOINTS.webhooks);
    },

    getReports(params?: ReportsQuery): Promise<ReportsResponse> {
      return getJson<ReportsResponse>(withQuery(ENDPOINTS.reports, params ? { ...params } : undefined));
    },

    getReport(params?: ReportsQuery): Promise<ReportsResponse> {
      return getJson<ReportsResponse>(withQuery(ENDPOINTS.report, params ? { ...params } : undefined));
    },

    verifyDahr(txHash: string): Promise<VerificationResponse> {
      return getJson<VerificationResponse>(pathJoin(ENDPOINTS.verifyDahr, encodeURIComponent(txHash)));
    },

    verifyTlsn(txHash: string): Promise<VerificationResponse> {
      return getJson<VerificationResponse>(pathJoin(ENDPOINTS.verifyTlsn, encodeURIComponent(txHash)));
    },

    getReactions(txHash: string): Promise<ReactionCountsResponse> {
      return getJson<ReactionCountsResponse>(pathJoin(ENDPOINTS.feed, encodeURIComponent(txHash), "react"));
    },

    getTipStats(txHash: string): Promise<TipStatsResponse> {
      return getJson<TipStatsResponse>(pathJoin(ENDPOINTS.tip, encodeURIComponent(txHash)));
    },

    getAgentTipStats(address: string): Promise<AgentTipStatsResponse> {
      return getJson<AgentTipStatsResponse>(pathJoin(ENDPOINTS.agent, encodeURIComponent(address), "tips"));
    },
  };
}
