export type MarketReadFamily =
  | "fixed-price"
  | "higher-lower"
  | "binary"
  | "eth-fixed-price"
  | "eth-winners"
  | "eth-higher-lower"
  | "eth-binary"
  | "sports-markets"
  | "sports-pool"
  | "sports-winners"
  | "commodity"
  | "graduation"
  | "prediction-intelligence"
  | "prediction-recommendations"
  | "prediction-scoring";

export type MarketReadStatus =
  | "covered"
  | "partial"
  | "blocked_auth_needed"
  | "live_shape_drifted"
  | "unsupported";

export interface MarketReadSurfaceEntry {
  family: MarketReadFamily;
  methods: string[];
  endpoints: string[];
  status: MarketReadStatus;
  noSpend: true;
  noMutation: true;
  expectedKeys: string[];
  notes: string[];
}

export interface MarketReadCoverageSummary {
  ok: boolean;
  entries: MarketReadSurfaceEntry[];
  byStatus: Record<MarketReadStatus, number>;
  coveredFamilies: MarketReadFamily[];
  driftedFamilies: MarketReadFamily[];
  partialFamilies: MarketReadFamily[];
}

export interface MarketReadShapeCheck {
  family: MarketReadFamily;
  status: MarketReadStatus;
  verdict: "pass" | "partial" | "missing_expected_keys" | "expected_error_shape";
  topLevelKeys: string[];
  missingKeys: string[];
  error?: string;
}

export const MARKET_READ_SURFACE: MarketReadSurfaceEntry[] = [
  entry("fixed-price", ["getPool"], ["/api/bets/pool"], "covered", [
    "asset",
    "horizon",
    "totalBets",
    "totalDem",
    "poolAddress",
    "roundEnd",
    "bets",
  ], [
    "Live GET /api/bets/pool?asset=BTC&horizon=30m returned 200 on 2026-05-18.",
  ]),
  entry("higher-lower", ["getHigherLowerPool"], ["/api/bets/higher-lower/pool"], "covered", [
    "asset",
    "horizon",
    "totalHigher",
    "totalLower",
    "totalDem",
    "poolAddress",
    "currentPrice",
  ], [
    "Live GET /api/bets/higher-lower/pool?asset=BTC&horizon=30m returned 200 on 2026-05-18.",
  ]),
  entry("binary", ["getBinaryPools"], ["/api/bets/binary/pools"], "covered", ["pools", "count"], [
    "Live GET /api/bets/binary/pools returned 200 with keyed pools on 2026-05-18.",
  ]),
  entry("eth-fixed-price", ["getEthPool"], ["/api/bets/eth/pool"], "live_shape_drifted", [
    "asset",
    "horizon",
    "totalEth",
    "totalEthWei",
    "contractAddress",
  ], [
    "Live GET /api/bets/eth/pool?asset=BTC&horizon=30m returned 503 on 2026-05-18: ETH betting not enabled.",
  ]),
  entry("eth-winners", ["getEthWinners"], ["/api/bets/eth/winners"], "covered", ["winners", "count"], [
    "Live GET /api/bets/eth/winners?asset=BTC returned 200 on 2026-05-18 even while ETH pool deployment is disabled.",
  ]),
  entry("eth-higher-lower", ["getEthHigherLowerPool"], ["/api/bets/eth/hl/pool"], "live_shape_drifted", [
    "asset",
    "horizon",
    "totalEth",
    "totalHigher",
    "totalLower",
    "contractAddress",
  ], [
    "Live GET /api/bets/eth/hl/pool?asset=BTC&horizon=30m returned 503 on 2026-05-18: ETH Higher/Lower not enabled.",
  ]),
  entry("eth-binary", ["getEthBinaryPools"], ["/api/bets/eth/binary/pools"], "covered", ["pools", "count", "enabled"], [
    "Live GET /api/bets/eth/binary/pools returned 200 with enabled=false on 2026-05-18.",
  ]),
  entry("sports-markets", ["getSportsMarkets"], ["/api/bets/sports/markets"], "covered", ["markets", "poolAddress"], [
    "Live GET /api/bets/sports/markets?status=upcoming returned 200 with fixture markets on 2026-05-18.",
  ]),
  entry("sports-pool", ["getSportsPool"], ["/api/bets/sports/pool"], "covered", [
    "fixtureId",
    "fixture",
    "winnerPool",
    "scorePool",
    "poolAddress",
  ], [
    "Live GET /api/bets/sports/pool?fixtureId=football_espn_740956 returned 200 on 2026-05-18.",
  ]),
  entry("sports-winners", ["getSportsWinners"], ["/api/bets/sports/winners"], "covered", ["winners", "count"], [
    "Live GET /api/bets/sports/winners?fixtureId=football_espn_740956 returned 200 on 2026-05-18.",
  ]),
  entry("commodity", ["getCommodityPool"], ["/api/bets/commodity/pool"], "covered", [
    "asset",
    "name",
    "category",
    "unit",
    "horizon",
    "poolAddress",
    "currentPrice",
  ], [
    "Live GET /api/bets/commodity/pool?asset=XAU&horizon=30m returned 200 on 2026-05-18.",
  ]),
  entry("graduation", ["getGraduationMarkets"], ["/api/bets/graduation/markets"], "live_shape_drifted", ["markets"], [
    "Live GET /api/bets/graduation/markets?limit=2&status=active returned 500 on 2026-05-18: no such table graduation_markets.",
  ]),
  entry("prediction-intelligence", ["getPredictionIntelligence"], ["/api/predictions/intelligence"], "covered", [
    "scores",
    "total",
    "engineVersion",
  ]),
  entry("prediction-recommendations", ["getPredictionRecommendations"], ["/api/predictions/recommend"], "covered", [
    "recommendations",
    "total",
  ]),
  entry("prediction-scoring", ["getPredictions", "getPredictionLeaderboard", "getPredictionScore"], [
    "/api/predictions",
    "/api/predictions/leaderboard",
    "/api/predictions/score/[address]",
  ], "covered", ["predictions"]),
];

export function summarizeMarketReadCoverage(
  entries: MarketReadSurfaceEntry[] = MARKET_READ_SURFACE,
): MarketReadCoverageSummary {
  const byStatus: Record<MarketReadStatus, number> = {
    covered: 0,
    partial: 0,
    blocked_auth_needed: 0,
    live_shape_drifted: 0,
    unsupported: 0,
  };
  for (const item of entries) byStatus[item.status] += 1;

  return {
    ok: entries.every((item) => item.status === "covered" || item.status === "live_shape_drifted"),
    entries,
    byStatus,
    coveredFamilies: entries.filter((item) => item.status === "covered").map((item) => item.family),
    driftedFamilies: entries.filter((item) => item.status === "live_shape_drifted").map((item) => item.family),
    partialFamilies: entries.filter((item) => item.status === "partial").map((item) => item.family),
  };
}

export function classifyMarketReadShape(family: MarketReadFamily, data: unknown): MarketReadShapeCheck {
  const surface = MARKET_READ_SURFACE.find((entry) => entry.family === family);
  const expectedKeys = surface?.expectedKeys ?? [];
  const topLevelKeys = isRecord(data) ? Object.keys(data).sort() : [];
  const error = isRecord(data) && typeof data.error === "string" ? data.error : undefined;
  const missingKeys = expectedKeys.filter((key) => !topLevelKeys.includes(key));

  if (surface?.status === "live_shape_drifted" && error) {
    return {
      family,
      status: surface.status,
      verdict: "expected_error_shape",
      topLevelKeys,
      missingKeys,
      error,
    };
  }

  return {
    family,
    status: surface?.status ?? "unsupported",
    verdict: missingKeys.length === 0 ? "pass" : topLevelKeys.length > 0 ? "partial" : "missing_expected_keys",
    topLevelKeys,
    missingKeys,
    error,
  };
}

function entry(
  family: MarketReadFamily,
  methods: string[],
  endpoints: string[],
  status: MarketReadStatus,
  expectedKeys: string[],
  notes: string[] = [],
): MarketReadSurfaceEntry {
  return {
    family,
    methods,
    endpoints,
    status,
    noSpend: true,
    noMutation: true,
    expectedKeys,
    notes,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
