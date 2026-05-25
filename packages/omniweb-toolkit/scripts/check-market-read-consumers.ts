#!/usr/bin/env npx tsx
/**
 * check-market-read-consumers.ts — No-spend proof for the root market-read matrix.
 */

import {
  loadPackageExport,
} from "./_shared.js";

type MarketReadFamily = string;
type MarketReadSurfaceEntry = {
  family: string;
  noSpend: boolean;
  noMutation: boolean;
  timeParameters: Array<{ name: string; defaultValue?: string; examples?: string[] }>;
  status?: string;
};
type MarketReadCoverage = {
  ok: boolean;
  coveredFamilies: string[];
  driftedFamilies: string[];
  unsupportedFamilies: string[];
};
type MarketReadShapeCheck = { verdict: string };

const MARKET_READ_SURFACE = await loadPackageExport<MarketReadSurfaceEntry[]>(
  "../dist/index.js",
  "../src/index.js",
  "MARKET_READ_SURFACE",
);
const classifyMarketReadShape = await loadPackageExport<
  (family: string, payload: Record<string, unknown>) => MarketReadShapeCheck
>(
  "../dist/index.js",
  "../src/index.js",
  "classifyMarketReadShape",
);
const summarizeMarketReadCoverage = await loadPackageExport<() => MarketReadCoverage>(
  "../dist/index.js",
  "../src/index.js",
  "summarizeMarketReadCoverage",
);

const coverage = summarizeMarketReadCoverage();
const shapeChecks = [
  classifyMarketReadShape("fixed-price", {
    totalDem: 0,
    totalBets: 0,
    asset: "BTC",
    horizon: "30m",
    poolAddress: "0xpool",
    roundEnd: 1779130800000,
    bets: [],
  }),
  classifyMarketReadShape("higher-lower", {
    asset: "BTC",
    horizon: "30m",
    totalHigher: 0,
    totalLower: 0,
    totalDem: 0,
    poolAddress: "0xpool",
    currentPrice: 76243.13,
  }),
  classifyMarketReadShape("binary", {
    pools: {
      "565064": {
        marketId: "565064",
        totalYes: 0,
        totalNo: 0,
        totalDem: 0,
      },
    },
    count: 501,
  }),
  classifyMarketReadShape("eth-fixed-price", {
    error: "ETH betting not enabled (contract not deployed)",
  }),
  classifyMarketReadShape("eth-winners", { winners: [], count: 0 }),
  classifyMarketReadShape("eth-higher-lower", {
    error: "ETH Higher/Lower betting not enabled (contract not deployed)",
  }),
  classifyMarketReadShape("eth-binary", { pools: {}, count: 0, enabled: false }),
  classifyMarketReadShape("sports-markets", {
    markets: [{ fixtureId: "football_espn_740956" }],
    poolAddress: "0xpool",
  }),
  classifyMarketReadShape("sports-pool", {
    fixtureId: "football_espn_740956",
    fixture: {},
    winnerPool: {},
    scorePool: {},
    poolAddress: "0xpool",
  }),
  classifyMarketReadShape("sports-winners", { winners: [], count: 0 }),
  classifyMarketReadShape("commodity", {
    asset: "XAU",
    name: "Gold",
    category: "Precious Metals",
    unit: "troy oz",
    horizon: "30m",
    poolAddress: "0xpool",
    currentPrice: 4545.7,
  }),
  classifyMarketReadShape("graduation", {
    error: "SqliteError: no such table: graduation_markets",
  }),
  classifyMarketReadShape("prediction-intelligence", {
    scores: [],
    total: 0,
    engineVersion: "test",
  }),
  classifyMarketReadShape("prediction-recommendations", {
    recommendations: [],
    total: 0,
  }),
  classifyMarketReadShape("prediction-scoring", {
    predictions: [],
  }),
];

const requiredFamilies: MarketReadFamily[] = [
  "fixed-price",
  "higher-lower",
  "binary",
  "eth-fixed-price",
  "eth-winners",
  "eth-higher-lower",
  "eth-binary",
  "sports-markets",
  "sports-pool",
  "sports-winners",
  "commodity",
  "graduation",
  "prediction-intelligence",
  "prediction-recommendations",
  "prediction-scoring",
];

const checks = {
  allFamiliesPresent: requiredFamilies.every((family) => (
    MARKET_READ_SURFACE.some((entry) => entry.family === family)
  )),
  coverageOk: coverage.ok,
  allNoSpend: MARKET_READ_SURFACE.every((entry) => entry.noSpend === true),
  allNoMutation: MARKET_READ_SURFACE.every((entry) => entry.noMutation === true),
  poolHorizonKnobsAdvertised: (["fixed-price", "higher-lower", "eth-fixed-price", "eth-higher-lower", "commodity"] satisfies MarketReadFamily[]).every((family) => {
    const horizon = MARKET_READ_SURFACE.find((entry) => entry.family === family)?.timeParameters.find((parameter) => parameter.name === "horizon");
    return horizon?.defaultValue === "30m"
      && ["30m", "1h", "4h", "12h", "24h"].every((example) => horizon.examples?.includes(example));
  }),
  fixedHigherBinaryCovered: (["fixed-price", "higher-lower", "binary"] satisfies MarketReadFamily[]).every((family) => (
    coverage.coveredFamilies.includes(family)
  )),
  sportsCommodityCovered: (["sports-markets", "sports-pool", "sports-winners", "commodity"] satisfies MarketReadFamily[]).every((family) => (
    coverage.coveredFamilies.includes(family)
  )),
  ethDeploymentDriftHonest: (["eth-fixed-price", "eth-higher-lower"] satisfies MarketReadFamily[]).every((family) => (
    coverage.driftedFamilies.includes(family)
  )),
  graduationServerDriftHonest: coverage.driftedFamilies.includes("graduation"),
  shapeChecksPass: shapeChecks.every((check) => (
    check.verdict === "pass" || check.verdict === "expected_error_shape"
  )),
};
const ok = Object.values(checks).every(Boolean);

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  ok,
  checks,
  coverage,
  shapeChecks,
  liveEvidence: {
    checkedAt: "2026-05-18T18:58:47Z/2026-05-18T18:59:30Z",
    covered200: [
      "/api/bets/pool?asset=BTC&horizon=30m",
      "/api/bets/higher-lower/pool?asset=BTC&horizon=30m",
      "/api/bets/binary/pools",
      "/api/bets/eth/winners?asset=BTC",
      "/api/bets/eth/binary/pools",
      "/api/bets/sports/markets?status=upcoming",
      "/api/bets/sports/pool?fixtureId=football_espn_740956",
      "/api/bets/sports/winners?fixtureId=football_espn_740956",
      "/api/bets/commodity/pool?asset=XAU&horizon=30m",
    ],
    liveShapeDrifted: [
      {
        endpoint: "/api/bets/eth/pool?asset=BTC&horizon=30m",
        status: 503,
        error: "ETH betting not enabled (contract not deployed)",
      },
      {
        endpoint: "/api/bets/eth/hl/pool?asset=BTC&horizon=30m",
        status: 503,
        error: "ETH Higher/Lower betting not enabled (contract not deployed)",
      },
      {
        endpoint: "/api/bets/graduation/markets?limit=2&status=active",
        status: 500,
        error: "SqliteError: no such table: graduation_markets",
      },
    ],
  },
  contract: {
    ownerBead: "omniweb-agents-spectrum.8",
    noSpend: true,
    noMutation: true,
    publicRegistryProof: false,
    release: false,
    timeKnobsAdvertised: checks.poolHorizonKnobsAdvertised,
  },
}, null, 2));

process.exit(ok ? 0 : 1);
