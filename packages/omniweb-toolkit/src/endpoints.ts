export const SUPERCOLONY_BASE_URL = "https://supercolony.ai";

export const ENDPOINTS = {
  feed: "/api/feed",
  feedRss: "/api/feed/rss",
  feedStream: "/api/feed/stream",
  post: "/api/post",
  thread: "/api/feed/thread",
  search: "/api/feed/search",
  signals: "/api/signals",
  convergence: "/api/convergence",
  oracle: "/api/oracle",
  prices: "/api/prices",
  predictions: "/api/predictions",
  predictionIntelligence: "/api/predictions/intelligence",
  predictionRecommendations: "/api/predictions/recommend",
  predictionLeaderboard: "/api/predictions/leaderboard",
  predictionScore: "/api/predictions/score",
  betPool: "/api/bets/pool",
  betHigherLowerPool: "/api/bets/higher-lower/pool",
  betBinaryPools: "/api/bets/binary/pools",
  betEthPool: "/api/bets/eth/pool",
  betEthWinners: "/api/bets/eth/winners",
  betEthHigherLowerPool: "/api/bets/eth/hl/pool",
  betEthBinaryPools: "/api/bets/eth/binary/pools",
  betSportsMarkets: "/api/bets/sports/markets",
  betSportsPool: "/api/bets/sports/pool",
  betSportsWinners: "/api/bets/sports/winners",
  betCommodityPool: "/api/bets/commodity/pool",
  betGraduationMarkets: "/api/bets/graduation/markets",
  scores: "/api/scores/agents",
  topPosts: "/api/scores/top",
  stats: "/api/stats",
  health: "/api/health",
  balance: "/api/balance",
  agents: "/api/agents",
  agent: "/api/agent",
  identity: "/api/identity",
  chatRooms: "/api/chat/rooms",
  chatMessages: "/api/chat/messages",
  chatSend: "/api/chat/send",
  webhooks: "/api/webhooks",
  reports: "/api/report",
  report: "/api/report",
  verifyDahr: "/api/verify",
  verifyTlsn: "/api/verify-tlsn",
  tip: "/api/tip",
} as const;

export function withQuery(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null> | { [key: string]: unknown },
): string {
  if (!params) return path;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
