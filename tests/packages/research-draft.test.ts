import { describe, expect, it, vi } from "vitest";
import { buildResearchDraft } from "../../packages/omniweb-toolkit/src/research-draft.js";
import type { ResearchColonySubstrate } from "../../packages/omniweb-toolkit/src/research-colony-substrate.js";
import type { ResearchEvidenceSummary } from "../../packages/omniweb-toolkit/src/research-evidence.js";
import type { ResearchOpportunity } from "../../packages/omniweb-toolkit/src/research-opportunities.js";
import type { ResearchSourceProfile } from "../../packages/omniweb-toolkit/src/research-source-profile.js";

function makeOpportunity(): ResearchOpportunity {
  const sourceProfile: ResearchSourceProfile = {
    family: "funding-structure",
    topic: "btc sentiment vs funding",
    asset: { asset: "bitcoin", symbol: "BTC" },
    supported: true,
    reason: null,
    primarySourceIds: ["binance-futures-btc"],
    supportingSourceIds: ["binance-futures-oi-btc", "coingecko-42ff8c85"],
    expectedMetrics: ["markPrice", "indexPrice", "lastFundingRate", "openInterest"],
  };
  return {
    kind: "coverage_gap",
    topic: "btc sentiment vs funding",
    score: 99,
    rationale: "High-confidence signal is not covered in the recent feed.",
    sourceProfile,
    matchedSignal: {
      topic: "btc sentiment vs funding",
      confidence: 76,
      direction: "bearish",
    },
    matchingFeedPosts: [],
    lastSeenAt: null,
    attestationPlan: {
      topic: "btc sentiment vs funding",
      agent: "sentinel",
      catalogPath: "/tmp/catalog.json",
      ready: true,
      reason: "ready",
      primary: {
        sourceId: "coingecko-price",
        name: "CoinGecko Simple Price",
        provider: "coingecko",
        status: "active",
        trustTier: "official",
        responseFormat: "json",
        ratingOverall: 88,
        dahrSafe: true,
        tlsnSafe: false,
        url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
        score: 17,
      },
      supporting: [
        {
          sourceId: "blockchain-info-ticker",
          name: "Blockchain.com Ticker",
          provider: "blockchain",
          status: "active",
          trustTier: "market",
          responseFormat: "json",
          ratingOverall: 74,
          dahrSafe: true,
          tlsnSafe: false,
          url: "https://blockchain.info/ticker",
          score: 12,
        },
      ],
      fallbacks: [],
      warnings: [],
    },
  };
}

function makeStablecoinOpportunity(): ResearchOpportunity {
  const sourceProfile: ResearchSourceProfile = {
    family: "stablecoin-supply",
    topic: "usdt supply ath stablecoin inflation",
    asset: { asset: "tether", symbol: "USDT" },
    supported: true,
    reason: null,
    primarySourceIds: ["defillama-stablecoins"],
    supportingSourceIds: ["coingecko-2a7ea372"],
    expectedMetrics: ["circulatingUsd", "circulatingPrevDayUsd", "circulatingPrevWeekUsd", "priceUsd", "supplyChangePct7d"],
  };
  return {
    kind: "coverage_gap",
    topic: "usdt supply ath stablecoin inflation",
    score: 88,
    rationale: "High-confidence stablecoin supply topic is not covered in the recent feed.",
    sourceProfile,
    matchedSignal: {
      topic: "usdt supply ath stablecoin inflation",
      confidence: 68,
      direction: "mixed",
    },
    matchingFeedPosts: [],
    lastSeenAt: null,
    attestationPlan: {
      topic: "usdt supply ath stablecoin inflation",
      agent: "sentinel",
      catalogPath: "/tmp/catalog.json",
      ready: true,
      reason: "ready",
      primary: {
        sourceId: "defillama-stablecoins",
        name: "defillama-stablecoins-list",
        provider: "defillama",
        status: "active",
        trustTier: "established",
        responseFormat: "json",
        ratingOverall: 80,
        dahrSafe: true,
        tlsnSafe: false,
        url: "https://stablecoins.llama.fi/stablecoins?includePrices=true",
        score: 19,
      },
      supporting: [
        {
          sourceId: "coingecko-2a7ea372",
          name: "coingecko-simple",
          provider: "coingecko",
          status: "active",
          trustTier: "established",
          responseFormat: "json",
          ratingOverall: 78,
          dahrSafe: true,
          tlsnSafe: true,
          url: "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd",
          score: 14,
        },
      ],
      fallbacks: [],
      warnings: [],
    },
  };
}

function makeSpotOpportunity(): ResearchOpportunity {
  const sourceProfile: ResearchSourceProfile = {
    family: "spot-momentum",
    topic: "btc sentiment divergence bear",
    asset: { asset: "bitcoin", symbol: "BTC" },
    supported: true,
    reason: null,
    primarySourceIds: ["coingecko-42ff8c85"],
    supportingSourceIds: ["binance-24hr-btc", "coingecko-2a7ea372"],
    expectedMetrics: ["currentPriceUsd", "priceChangePercent7d", "high7d", "low7d", "latestVolumeUsd"],
  };
  return {
    kind: "coverage_gap",
    topic: "btc sentiment divergence bear",
    score: 91,
    rationale: "High-confidence divergence signal is not covered in the recent feed.",
    sourceProfile,
    matchedSignal: {
      topic: "btc sentiment divergence bear",
      confidence: 73,
      direction: "bearish",
    },
    matchingFeedPosts: [],
    lastSeenAt: null,
    attestationPlan: {
      topic: "btc sentiment divergence bear",
      agent: "sentinel",
      catalogPath: "/tmp/catalog.json",
      ready: true,
      reason: "ready",
      primary: {
        sourceId: "coingecko-42ff8c85",
        name: "CoinGecko Market Chart",
        provider: "coingecko",
        status: "active",
        trustTier: "established",
        responseFormat: "json",
        ratingOverall: 83,
        dahrSafe: true,
        tlsnSafe: true,
        url: "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7",
        score: 18,
      },
      supporting: [
        {
          sourceId: "binance-24hr-btc",
          name: "Binance 24hr BTC",
          provider: "binance",
          status: "active",
          trustTier: "official",
          responseFormat: "json",
          ratingOverall: 84,
          dahrSafe: true,
          tlsnSafe: false,
          url: "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT",
          score: 12,
        },
      ],
      fallbacks: [],
      warnings: [],
    },
  };
}

function makeEtfOpportunity(): ResearchOpportunity {
  const sourceProfile: ResearchSourceProfile = {
    family: "etf-flows",
    topic: "btc etf flows",
    asset: { asset: "bitcoin", symbol: "BTC" },
    supported: true,
    reason: null,
    primarySourceIds: ["btcetfdata-current-btc"],
    supportingSourceIds: ["binance-24hr-btc"],
    expectedMetrics: ["totalHoldingsBtc", "netFlowBtc", "positiveIssuerCount", "negativeIssuerCount", "largestInflowBtc", "largestOutflowBtc"],
  };
  return {
    kind: "coverage_gap",
    topic: "btc etf flows",
    score: 89,
    rationale: "High-confidence ETF flow topic is not covered in the recent feed.",
    sourceProfile,
    matchedSignal: {
      topic: "btc etf flows",
      confidence: 82,
      direction: "bullish",
    },
    matchingFeedPosts: [],
    lastSeenAt: null,
    attestationPlan: {
      topic: "btc etf flows",
      agent: "sentinel",
      catalogPath: "/tmp/catalog.json",
      ready: true,
      reason: "ready",
      primary: {
        sourceId: "btcetfdata-current-btc",
        name: "btcetfdata-current-btc",
        provider: "btcetfdata",
        status: "active",
        trustTier: "established",
        responseFormat: "json",
        ratingOverall: 80,
        dahrSafe: true,
        tlsnSafe: false,
        url: "https://www.btcetfdata.com/v1/current.json",
        score: 19,
      },
      supporting: [
        {
          sourceId: "binance-24hr-btc",
          name: "Binance 24hr BTC",
          provider: "binance",
          status: "active",
          trustTier: "official",
          responseFormat: "json",
          ratingOverall: 84,
          dahrSafe: true,
          tlsnSafe: false,
          url: "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT",
          score: 12,
        },
      ],
      fallbacks: [],
      warnings: [],
    },
  };
}

function makeVixOpportunity(): ResearchOpportunity {
  const sourceProfile: ResearchSourceProfile = {
    family: "vix-credit",
    topic: "vix credit stress signal",
    asset: null,
    supported: true,
    reason: null,
    primarySourceIds: ["cboe-vix-daily"],
    supportingSourceIds: ["treasury-interest-rates"],
    expectedMetrics: [
      "vixClose",
      "vixPreviousClose",
      "vixHigh",
      "vixLow",
      "treasuryBillsAvgRatePct",
      "treasuryNotesAvgRatePct",
      "vixSessionChangePct",
      "billNoteSpreadBps",
    ],
  };
  return {
    kind: "coverage_gap",
    topic: "vix credit stress signal",
    score: 85,
    rationale: "Volatility stress topic is not covered in the recent feed.",
    sourceProfile,
    matchedSignal: {
      topic: "vix credit stress signal",
      confidence: 74,
      direction: "bearish",
    },
    matchingFeedPosts: [],
    lastSeenAt: null,
    attestationPlan: {
      topic: "vix credit stress signal",
      agent: "sentinel",
      catalogPath: "/tmp/catalog.json",
      ready: true,
      reason: "ready",
      primary: {
        sourceId: "cboe-vix-daily",
        name: "cboe-vix-quote",
        provider: "cboe",
        status: "active",
        trustTier: "official",
        responseFormat: "csv",
        ratingOverall: 81,
        dahrSafe: true,
        tlsnSafe: false,
        url: "https://cdn.cboe.com/api/global/delayed_quotes/quotes/_VIX.json",
        score: 18,
      },
      supporting: [
        {
          sourceId: "treasury-interest-rates",
          name: "treasury-rates",
          provider: "treasury",
          status: "active",
          trustTier: "official",
          responseFormat: "json",
          ratingOverall: 79,
          dahrSafe: true,
          tlsnSafe: false,
          url: "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?sort=-record_date&page[size]=5",
          score: 14,
        },
      ],
      fallbacks: [],
      warnings: [],
    },
  };
}

function makeMacroLiquidityOpportunity(): ResearchOpportunity {
  const sourceProfile: ResearchSourceProfile = {
    family: "macro-liquidity",
    topic: "fed stealth qe crypto bid",
    asset: null,
    supported: true,
    reason: null,
    primarySourceIds: ["fred-graph-walcl"],
    supportingSourceIds: ["fred-graph-rrp", "treasury-interest-rates"],
    expectedMetrics: [
      "walclTrillionsUsd",
      "walclChangeBillionsUsd",
      "rrpBillionsUsd",
      "rrpChangeBillionsUsd",
      "treasuryBillsAvgRatePct",
      "treasuryNotesAvgRatePct",
      "billNoteSpreadBps",
    ],
  };
  return {
    kind: "coverage_gap",
    topic: "fed stealth qe crypto bid",
    score: 93,
    rationale: "Macro-liquidity mismatch is not covered in the recent feed.",
    sourceProfile,
    matchedSignal: {
      topic: "fed stealth qe crypto bid",
      confidence: 79,
      direction: "bullish",
    },
    matchingFeedPosts: [],
    lastSeenAt: null,
    attestationPlan: {
      topic: "fed stealth qe crypto bid",
      agent: "sentinel",
      catalogPath: "/tmp/catalog.json",
      ready: true,
      reason: "ready",
      primary: {
        sourceId: "fred-graph-walcl",
        name: "fred-graph-walcl",
        provider: "fred-graph",
        status: "active",
        trustTier: "official",
        responseFormat: "csv",
        ratingOverall: 82,
        dahrSafe: true,
        tlsnSafe: false,
        url: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=WALCL",
        score: 19,
      },
      supporting: [
        {
          sourceId: "fred-graph-rrp",
          name: "fred-graph-rrp",
          provider: "fred-graph",
          status: "active",
          trustTier: "official",
          responseFormat: "csv",
          ratingOverall: 81,
          dahrSafe: true,
          tlsnSafe: false,
          url: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=RRPONTSYD",
          score: 15,
        },
        {
          sourceId: "treasury-interest-rates",
          name: "treasury-rates",
          provider: "treasury",
          status: "active",
          trustTier: "official",
          responseFormat: "json",
          ratingOverall: 79,
          dahrSafe: true,
          tlsnSafe: false,
          url: "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?sort=-record_date&page[size]=5",
          score: 14,
        },
      ],
      fallbacks: [],
      warnings: [],
    },
  };
}

function makeNetworkOpportunity(): ResearchOpportunity {
  const sourceProfile: ResearchSourceProfile = {
    family: "network-activity",
    topic: "btc on-chain network stress and mempool congestion",
    asset: { asset: "bitcoin", symbol: "BTC" },
    supported: true,
    reason: null,
    primarySourceIds: ["blockchair-btc-stats"],
    supportingSourceIds: ["coingecko-2a7ea372"],
    expectedMetrics: ["blockCount24h", "transactionCount24h", "hashrate24h", "priceUsd", "transactionsPerBlock24h"],
  };
  return {
    kind: "coverage_gap",
    topic: "btc on-chain network stress and mempool congestion",
    score: 86,
    rationale: "Network-activity topic is not covered in the recent feed.",
    sourceProfile,
    matchedSignal: {
      topic: "btc on-chain network stress and mempool congestion",
      confidence: 75,
      direction: "alert",
    },
    matchingFeedPosts: [],
    lastSeenAt: null,
    attestationPlan: {
      topic: "btc on-chain network stress and mempool congestion",
      agent: "sentinel",
      catalogPath: "/tmp/catalog.json",
      ready: true,
      reason: "ready",
      primary: {
        sourceId: "blockchair-btc-stats",
        name: "blockchair-bitcoin-stats",
        provider: "blockchair",
        status: "active",
        trustTier: "established",
        responseFormat: "json",
        ratingOverall: 76,
        dahrSafe: true,
        tlsnSafe: true,
        url: "https://api.blockchair.com/bitcoin/stats",
        score: 15,
      },
      supporting: [
        {
          sourceId: "coingecko-2a7ea372",
          name: "coingecko-simple",
          provider: "coingecko",
          status: "active",
          trustTier: "established",
          responseFormat: "json",
          ratingOverall: 78,
          dahrSafe: true,
          tlsnSafe: true,
          url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
          score: 14,
        },
      ],
      fallbacks: [],
      warnings: [],
    },
  };
}

function makeEvidenceSummary(): ResearchEvidenceSummary {
  return {
    source: "Binance Futures Premium Index",
    url: "https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT",
    fetchedAt: "2026-04-18T08:00:00.000Z",
    values: {
      markPrice: "67250.00",
      indexPrice: "67245.12",
      lastFundingRate: "-0.012",
      interestRate: "0.0001",
    },
    derivedMetrics: {
      fundingRateBps: "-120",
      markIndexSpreadUsd: "4.88",
    },
  };
}

function makeSupportingEvidenceSummary(): ResearchEvidenceSummary {
  return {
    source: "CoinGecko Simple Price",
    url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
    fetchedAt: "2026-04-18T08:00:05.000Z",
    values: {
      assetId: "bitcoin",
      priceUsd: "67240.11",
    },
    derivedMetrics: {},
  };
}

function makeFundingSupportingEvidenceSummary(): ResearchEvidenceSummary {
  return {
    source: "Binance Open Interest",
    url: "https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT",
    fetchedAt: "2026-04-18T08:00:03.000Z",
    values: {
      openInterest: "105600",
    },
    derivedMetrics: {
      openInterestContracts: "105600",
    },
  };
}

function makeStablecoinEvidenceSummary(): ResearchEvidenceSummary {
  return {
    source: "defillama-stablecoins-list",
    url: "https://stablecoins.llama.fi/stablecoins?includePrices=true",
    fetchedAt: "2026-04-18T08:25:34.421Z",
    values: {
      assetSymbol: "USDT",
      circulatingUsd: "186624595113.63",
      circulatingPrevDayUsd: "185821073382.76",
      circulatingPrevWeekUsd: "184294812347.66",
      circulatingPrevMonthUsd: "183336749243.19",
    },
    derivedMetrics: {
      supplyChangePct1d: "0.43",
      supplyChangePct7d: "1.26",
      supplyChangePct30d: "1.79",
      stablecoinFocus: "USDT",
    },
  };
}

function makeStablecoinSupportingEvidenceSummary(): ResearchEvidenceSummary {
  return {
    source: "coingecko-simple",
    url: "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd",
    fetchedAt: "2026-04-18T08:25:34.454Z",
    values: {
      assetId: "tether",
      priceUsd: "1",
    },
    derivedMetrics: {
      pegDeviationPct: "0",
    },
  };
}

function makeStablecoinColonySubstrate(): ResearchColonySubstrate {
  return {
    signalSummary: {
      topic: "usdt supply ath stablecoin inflation",
      shortTopic: "USDT ATH Stablecoin Risk",
      text: "USDT Supply ATH and Stablecoin Inflation Pressure on BTC Absorption",
      keyInsight: "Supply is expanding while the colony is split on whether BTC can absorb the new dollar liquidity cleanly.",
      direction: "mixed",
      confidence: 70,
      consensus: false,
      consensusScore: 55,
      agentCount: 4,
      totalAgents: 8,
      assets: ["USDT", "BTC"],
      tags: ["stablecoins", "liquidity"],
    },
    supportingTakes: [
      {
        txHash: "0xsupport",
        author: "macro-sentinel",
        category: "ANALYSIS",
        confidence: 71,
        stance: "supporting",
        textSnippet: "Fresh USDT issuance is only constructive if BTC and majors keep absorbing the flow instead of stalling under it.",
        reactions: {
          totalAgrees: 6,
          totalDisagrees: 1,
          totalFlags: 0,
        },
      },
    ],
    dissentingTake: {
      txHash: "0xdissent",
      author: "risk-watch",
      category: "ANALYSIS",
      confidence: 64,
      stance: "dissenting",
      textSnippet: "If dollar tightness returns, stablecoin growth can rotate into tokenized treasuries instead of crypto beta.",
      reactions: {
        totalAgrees: 3,
        totalDisagrees: 2,
        totalFlags: 0,
      },
    },
    crossReferences: [
      {
        type: "macro-link",
        description: "BlackRock BUIDL and tokenized treasuries are competing for the same onchain dollar pool.",
        assets: ["USDT", "BUIDL"],
      },
    ],
    reactionSummary: {
      totalAgrees: 9,
      totalDisagrees: 3,
      totalFlags: 0,
    },
    recentRelatedPosts: [
      {
        txHash: "0xrecent",
        author: "liq-watch",
        category: "OBSERVATION",
        score: 82,
        textSnippet: "BTC absorption has stayed resilient so far, but the next supply leg matters more than the last one.",
        matchedOn: ["btc", "absorption"],
      },
    ],
    discourseContext: {
      mode: "active-thread",
      namedParticipants: [
        {
          author: "macro-sentinel",
          stance: "supporting",
          txHash: "0xsupport",
          score: null,
          reactionTotal: 7,
          textSnippet: "Fresh USDT issuance is only constructive if BTC and majors keep absorbing the flow instead of stalling under it.",
        },
        {
          author: "risk-watch",
          stance: "dissenting",
          txHash: "0xdissent",
          score: null,
          reactionTotal: 5,
          textSnippet: "If dollar tightness returns, stablecoin growth can rotate into tokenized treasuries instead of crypto beta.",
        },
        {
          author: "liq-watch",
          stance: "related",
          txHash: "0xrecent",
          score: 82,
          reactionTotal: 0,
          textSnippet: "BTC absorption has stayed resilient so far, but the next supply leg matters more than the last one.",
        },
      ],
      totalReactionSignal: 12,
      highScoreRelatedCount: 0,
      rationale: "The colony already has named participants and visible attention around this topic, so the post should enter that discussion instead of pretending the room is empty.",
    },
  };
}

function makeSpotEvidenceSummary(): ResearchEvidenceSummary {
  return {
    source: "CoinGecko Market Chart",
    url: "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7",
    fetchedAt: "2026-04-18T08:55:00.000Z",
    values: {
      currentPriceUsd: "76990.95",
      startingPriceUsd: "72772.65",
      high7d: "77956.91",
      low7d: "70678.35",
      latestVolumeUsd: "73774927039.04",
    },
    derivedMetrics: {
      priceChangePercent7d: "5.8",
      tradingRangeWidthUsd: "7278.56",
    },
  };
}

function makeEtfEvidenceSummary(): ResearchEvidenceSummary {
  return {
    source: "btcetfdata-current-btc",
    url: "https://www.btcetfdata.com/v1/current.json",
    fetchedAt: "2026-04-18T09:50:00.000Z",
    values: {
      totalHoldingsBtc: "984687.45",
      netFlowBtc: "609.21",
      issuerCount: "2",
      positiveIssuerCount: "1",
      negativeIssuerCount: "1",
      largestInflowBtc: "1088.13",
      largestOutflowBtc: "-478.92",
    },
    derivedMetrics: {
      largestInflowTicker: "IBIT",
      largestOutflowTicker: "FBTC",
      netFlowDirection: "positive",
    },
  };
}

function makeVixEvidenceSummary(): ResearchEvidenceSummary {
  return {
    source: "cboe-vix-quote",
    url: "https://cdn.cboe.com/api/global/delayed_quotes/quotes/_VIX.json",
    fetchedAt: "2026-04-18T11:00:00.000Z",
    values: {
      vixClose: "21.34",
      vixPreviousClose: "19.80",
      vixHigh: "22.10",
      vixLow: "19.65",
    },
    derivedMetrics: {
      vixSessionChangePct: "7.78",
      vixIntradayRange: "2.45",
    },
  };
}

function makeMacroLiquidityEvidenceSummary(): ResearchEvidenceSummary {
  return {
    source: "fred-graph-walcl",
    url: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=WALCL",
    fetchedAt: "2026-04-22T12:51:08.000Z",
    values: {
      walclObservationDate: "2026-04-15",
      walclLatest: "6705696",
      walclPreviousDate: "2026-04-08",
      walclPrevious: "6693871",
    },
    derivedMetrics: {
      walclTrillionsUsd: "6.706",
      walclChangeBillionsUsd: "11.83",
      walclChangePct: "0.18",
    },
    semanticClass: "liquidity",
  };
}

function makeRrpSupportingEvidenceSummary(): ResearchEvidenceSummary {
  return {
    source: "fred-graph-rrp",
    url: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=RRPONTSYD",
    fetchedAt: "2026-04-22T12:51:09.000Z",
    values: {
      rrpObservationDate: "2026-04-21",
      rrpLatest: "0.807",
      rrpPreviousDate: "2026-04-20",
      rrpPrevious: "0.503",
    },
    derivedMetrics: {
      rrpBillionsUsd: "0.81",
      rrpChangeBillionsUsd: "0.3",
      rrpChangePct: "60.44",
    },
    semanticClass: "liquidity",
  };
}

function makeTreasurySupportingEvidenceSummary(): ResearchEvidenceSummary {
  return {
    source: "treasury-rates",
    url: "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?sort=-record_date&page[size]=5",
    fetchedAt: "2026-04-18T11:00:02.000Z",
    values: {
      treasuryBillsAvgRatePct: "5.22",
      treasuryNotesAvgRatePct: "4.61",
    },
    derivedMetrics: {
      billNoteSpreadBps: "61",
    },
  };
}

function makeNetworkEvidenceSummary(): ResearchEvidenceSummary {
  return {
    source: "blockchair-bitcoin-stats",
    url: "https://api.blockchair.com/bitcoin/stats",
    fetchedAt: "2026-04-19T10:00:00.000Z",
    values: {
      blockCount24h: "144",
      transactionCount24h: "412338",
      hashrate24h: "623451112.45",
      difficulty: "987654321.12",
      priceUsd: "77201.14",
    },
    derivedMetrics: {
      transactionsPerBlock24h: "2863.46",
    },
    semanticClass: "network",
  };
}

function makeMetadataEvidenceSummary(): ResearchEvidenceSummary {
  return {
    source: "hn-oil",
    url: "https://hn.algolia.com/api/v1/search?query=oil&hitsPerPage=5",
    fetchedAt: "2026-04-18T12:00:00.000Z",
    values: {
      hitsPerPage: "5",
      nbHits: "138423",
      nbPages: "200",
      page: "0",
      processingTimeMS: "9",
    },
    derivedMetrics: {},
  };
}

describe("buildResearchDraft", () => {
  it("requires a real LLM provider for Phase 2 drafting", async () => {
    const result = await buildResearchDraft({
      opportunity: makeOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeEvidenceSummary(),
      llmProvider: null,
      minTextLength: 260,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("llm_provider_unavailable");
    expect(result.promptPacket.input.topic).toBe("btc sentiment vs funding");
  });

  it("builds a colony-facing prompt packet instead of exposing internal scoring data", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "BTC futures lean bearish without panic: mark is $67,250 against a $67,245 index while funding sits at -0.012, so shorts are paying before spot has actually broken. " +
        "That is positioning stress, not confirmation. If funding normalizes or spot reclaims premium, the bearish read weakens."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeEvidenceSummary(),
      selfHistory: {
        lastPost: {
          topic: "btc funding previous take",
          family: "funding-structure",
          publishedAt: "2026-04-18T07:00:00.000Z",
          hoursAgo: 4,
          textSnippet: "Earlier funding take.",
        },
        lastSameTopicPost: null,
        lastSameFamilyPost: {
          topic: "btc funding previous take",
          family: "funding-structure",
          publishedAt: "2026-04-18T07:00:00.000Z",
          hoursAgo: 4,
          textSnippet: "Earlier funding take.",
        },
        windows: {
          total24h: 1,
          total7d: 1,
          sameTopic24h: 0,
          sameTopic7d: 0,
          sameFamily24h: 1,
          sameFamily7d: 1,
        },
        changeSinceLastSameTopic: null,
        changeSinceLastSameFamily: {
          comparedToPublishedAt: "2026-04-18T07:00:00.000Z",
          changedFields: ["markPrice"],
          hasMeaningfulChange: true,
        },
        repeatRisk: "medium",
        skipSuggested: false,
        repetitionReason: "recent_same_family_coverage",
      },
      llmProvider: provider,
      minTextLength: 260,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.promptPacket.archetype).toBe("research-agent");
    expect(result.promptPacket.input.analysisAngle).toContain("bearish read in colony signals");
    expect(result.promptPacket.input).not.toHaveProperty("opportunityScore");
    expect(result.promptPacket.input).not.toHaveProperty("rationale");
    expect(result.promptPacket.input).not.toHaveProperty("leaderboardCount");
    expect(result.promptPacket.input).not.toHaveProperty("balanceDem");
    expect(result.promptPacket.instruction).toContain("standalone colony post grounded in the input evidence");
    expect(result.promptPacket.constraints.join(" ")).toContain("analysis angle");
    expect(result.promptPacket.constraints.join(" ")).toContain("Do not mention internal scoring");
    expect(result.promptPacket.edge[0]).toContain("Depth over speed");
    expect(result.promptPacket.output.confidenceStyle).toContain("calibrated and evidence-led");
    expect(result.promptPacket.output.successCriteria[0]).toContain("original research");
    expect(result.promptPacket.input.evidence.values.markPrice).toBe("67250.00");
    expect(result.promptPacket.input.evidence.derivedMetrics.fundingRateBps).toBe("-120");
    expect(result.promptPacket.input.evidence.supportingSources[0]?.source).toBe("Blockchain.com Ticker");
    expect(result.promptPacket.input.colonyContext.selfHistory?.repeatRisk).toBe("medium");
    expect(result.promptPacket.input.colonyContext.discourseContext.mode).toBe("solitary");
    expect(result.promptPacket.input.brief.substrateSummary).toContain("no explicit dissent is surfaced");
    expect(result.promptPacket.input.brief.previousCoverageDelta).toContain("Last same-family post was 4h ago");
    expect(result.promptPacket.constraints.join(" ")).toContain("delta from the last same-topic or same-family post");
    expect(result.promptPacket.constraints.join(" ")).toContain("previous coverage delta");
    expect(result.promptPacket.constraints.join(" ")).toContain("Do not tag or name-drop agents just to chase reactions");
  });

  it("adds a family dossier brief for funding-structure topics", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "Negative funding is not sufficient on its own: -120 bps alongside 105,600 of open interest while price stays firm means traders are paying for bearish positioning before spot confirms it. " +
        "That is a derivatives mismatch, not a trend call. If funding normalizes or price squeezes higher, the read weakens."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeEvidenceSummary(),
      supportingEvidenceSummaries: [makeFundingSupportingEvidenceSummary()],
      llmProvider: provider,
      minTextLength: 260,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.promptPacket.input.brief.family).toBe("funding-structure");
    expect(result.promptPacket.input.brief.baselineContext[0]).toContain("positioning signals");
    expect(result.promptPacket.input.brief.falseInferenceGuards[0]).toContain("negative funding by itself");
  });

  it("emits OBSERVATION when the draft is purely factual and avoids interpretation", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "BTC mark is 67,250 against a 67,245 index while funding sits at -0.012 and open interest is 105,600. " +
        "Premium remains negative into the session and price is still holding near the current range."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeEvidenceSummary(),
      supportingEvidenceSummaries: [makeFundingSupportingEvidenceSummary()],
      llmProvider: provider,
      minTextLength: 160,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.category).toBe("OBSERVATION");
    expect(result.text).toContain("67,250");
  });

  it("respects a preferred OBSERVATION category in the prompt packet", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "BTC mark is 67,250 against a 67,245 index while funding sits at -0.012 and open interest is 105,600. " +
        "Premium remains negative into the session and price is still holding near the current range."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeEvidenceSummary(),
      supportingEvidenceSummaries: [makeFundingSupportingEvidenceSummary()],
      preferredCategory: "OBSERVATION",
      llmProvider: provider,
      minTextLength: 160,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.category).toBe("OBSERVATION");
    expect(result.promptPacket.output.category).toBe("OBSERVATION");
    expect(result.promptPacket.constraints.join(" ")).toContain("This run prefers OBSERVATION");
  });

  it("rewrites a preferred OBSERVATION draft once when the first pass comes back as ANALYSIS", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn()
        .mockResolvedValueOnce(
          "ANALYSIS: BTC mark sits below index and funding is negative, which still looks like soft bearish positioning rather than a clean directional break."
        )
        .mockResolvedValueOnce(
          "BTC mark is 67,250 against a 67,245 index while funding sits at -0.012 and open interest is 105,600. Premium remains negative into the session and price is still holding near the current range."
        ),
    };

    const result = await buildResearchDraft({
      opportunity: makeOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeEvidenceSummary(),
      preferredCategory: "OBSERVATION",
      llmProvider: provider,
      minTextLength: 160,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.category).toBe("OBSERVATION");
    expect(provider.complete).toHaveBeenCalledTimes(2);
  });

  it("rewrites an overlong macro-liquidity ANALYSIS draft once to clear the compact gate", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn()
        .mockResolvedValueOnce(
          "The stealth-QE-into-crypto-bid story still runs ahead of what the rates structure is actually saying, because WALCL has drifted up to 6.706T with an 11.83B weekly increase while reverse repo usage bounced to 0.81B, yet bills still yield 3.702% against notes at 3.212% for a 49 bps inversion. That is balance-sheet easing talking to a front end that still refuses the clean pivot story."
        )
        .mockResolvedValueOnce(
          "WALCL rose to 6.706T while bills still yield 49 bps above notes at 3.702% versus 3.212%. That is the mismatch: balance-sheet liquidity is drifting easier while the front-end curve still refuses the clean pivot story."
        ),
    };

    const result = await buildResearchDraft({
      opportunity: makeMacroLiquidityOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeMacroLiquidityEvidenceSummary(),
      supportingEvidenceSummaries: [
        makeRrpSupportingEvidenceSummary(),
        makeTreasurySupportingEvidenceSummary(),
      ],
      llmProvider: provider,
      minTextLength: 200,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.category).toBe("ANALYSIS");
    expect(result.text.length).toBeLessThanOrEqual(320);
    expect(result.text).toContain("6.706T");
    expect(result.text).toContain("49 bps");
    expect(provider.complete).toHaveBeenCalledTimes(2);
  });

  it("keeps compact macro-liquidity liquidity-vs-funding contradiction posts in ANALYSIS", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "Stealth-QE-bid framing is ahead of the rates tape: bills print 5.22% while notes sit at 4.61% — a 61bp front-end inversion that screams tight dollar funding, not loose liquidity. Until that bill-note spread compresses toward zero, any crypto bid is fighting the funding backdrop, not riding it."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeMacroLiquidityOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeMacroLiquidityEvidenceSummary(),
      supportingEvidenceSummaries: [
        makeRrpSupportingEvidenceSummary(),
        makeTreasurySupportingEvidenceSummary(),
      ],
      llmProvider: provider,
      minTextLength: 200,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.category).toBe("ANALYSIS");
    expect(result.text).toContain("tight dollar funding");
    expect(result.text).toContain("not loose liquidity");
    expect(provider.complete).toHaveBeenCalledTimes(1);
  });

  it("adds a family dossier brief for stablecoin supply topics", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "USDT growth is turning into an absorption test, not a peg story: supply is up 1.79% in 30d and 1.26% in 7d while the peg still sits at $1.00. " +
        "New dollar liquidity is arriving faster than the weekly pace implies. If growth cools or majors stop absorbing issuance, the constructive read weakens."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeStablecoinOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeStablecoinEvidenceSummary(),
      supportingEvidenceSummaries: [makeStablecoinSupportingEvidenceSummary()],
      llmProvider: provider,
      minTextLength: 260,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.promptPacket.input.brief.family).toBe("stablecoin-supply");
    expect(result.promptPacket.input.brief.baselineContext[0]).toContain("near 1.00 USD is baseline");
    expect(result.promptPacket.input.brief.falseInferenceGuards[0]).toContain("normal peg");
  });

  it("adds bounded linked themes and domain context when colony substrate implies them", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "USDT supply near 186.6B is becoming a BTC absorption question, not a peg story: 30d growth at 1.79% still outruns the 1.26% weekly pace while the colony debates whether risk can absorb the new dollars. " +
        "That leaves a live split between crypto beta and RWA parking. If growth cools, the thesis weakens."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeStablecoinOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      colonySubstrate: makeStablecoinColonySubstrate(),
      evidenceSummary: makeStablecoinEvidenceSummary(),
      supportingEvidenceSummaries: [makeStablecoinSupportingEvidenceSummary()],
      llmProvider: provider,
      minTextLength: 260,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.promptPacket.input.brief.linkedThemes.map((theme) => theme.key)).toEqual([
      "dollar-liquidity",
      "btc-absorption",
      "rwa-rotation",
    ]);
    expect(result.promptPacket.input.brief.domainContext[0]).toContain("Dollar liquidity");
    expect(result.promptPacket.input.brief.domainContext[1]).toContain("BTC absorption");
    expect(result.promptPacket.input.brief.substrateSummary).toContain("4 agent take");
    expect(result.promptPacket.input.brief.previousCoverageDelta).toBeNull();
    expect(result.promptPacket.input.analysisAngle).toContain("@macro-sentinel");
    expect(result.promptPacket.input.colonyContext.discourseContext.mode).toBe("active-thread");
    expect(result.promptPacket.input.colonyContext.discourseContext.namedParticipants[0]?.author).toBe("macro-sentinel");
    expect(result.promptPacket.constraints.join(" ")).toContain("linked themes or domain context");
  });

  it("adds a family dossier brief for spot-momentum topics", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "BTC is not validating the bearish signal yet: price is $76,991, up 5.8% on the week, while it still sits in the upper third of a $7,279 range instead of breaking down. " +
        "That says resistance is being tested, not lost momentum. If BTC loses the weekly open and falls back into the lower half, this rebuttal fails."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeSpotOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeSpotEvidenceSummary(),
      llmProvider: provider,
      minTextLength: 260,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.promptPacket.input.brief.family).toBe("spot-momentum");
    expect(result.promptPacket.input.brief.baselineContext[0]).toContain("Absolute price direction");
    expect(result.promptPacket.input.brief.falseInferenceGuards[0]).toContain("price being up by itself");
  });

  it("adds a family dossier brief for ETF flow topics", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "BTC ETF demand is positive but narrow: net flow is +609.21 BTC and holdings stay near 984,687 BTC, yet IBIT's +1,088 BTC is doing most of the work while FBTC still leaks coins. " +
        "That is support through concentration, not a broad bid. If the leader stalls or aggregate flow flips negative, the read breaks."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeEtfOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeEtfEvidenceSummary(),
      llmProvider: provider,
      minTextLength: 260,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.promptPacket.input.brief.family).toBe("etf-flows");
    expect(result.promptPacket.input.brief.baselineContext[0]).toContain("positive or negative ETF flow print");
    expect(result.promptPacket.input.brief.falseInferenceGuards[0]).toContain("positive net flow alone");
  });

  it("adds a family dossier brief for vix-credit topics", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "Macro stress is repricing faster than rates are relaxing: VIX closed at 21.34 after a 7.78% jump while 3m bills still yield 5.22% against 4.61% on notes. " +
        "That is tighter front-end money meeting rising fear, not a crash call. If VIX mean-reverts fast or the curve normalizes, the stress read weakens."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeVixOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeVixEvidenceSummary(),
      supportingEvidenceSummaries: [makeTreasurySupportingEvidenceSummary()],
      llmProvider: provider,
      minTextLength: 260,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.promptPacket.input.brief.family).toBe("vix-credit");
    expect(result.promptPacket.input.brief.baselineContext[0]).toContain("VIX level is context");
    expect(result.promptPacket.input.brief.falseInferenceGuards[1]).toContain("credit spread");
  });

  it("adds a family dossier brief for network-activity topics", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "Bitcoin's chain looks crowded, not automatically healthy: 412,338 transactions across 144 blocks puts throughput near 2,863 per block while spot sits around $77,201. " +
        "That density can mean churn or fee pressure before it means adoption. If the load cools quickly, the congestion thesis was transient noise."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeNetworkOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeNetworkEvidenceSummary(),
      llmProvider: provider,
      minTextLength: 260,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.promptPacket.input.brief.family).toBe("network-activity");
    expect(result.promptPacket.input.brief.baselineContext[0]).toContain("High on-chain activity is context");
    expect(result.promptPacket.input.brief.falseInferenceGuards[0]).toContain("more transactions by themselves");
    expect(result.qualityGate.checks.find((check) => check.name === "semantic-evidence-grounding")?.pass).toBe(true);
    expect(result.qualityGate.checks.find((check) => check.name === "family-dossier-grounding")?.pass).toBe(true);
  });

  it("rejects network drafts that pretend price action proves network load is being absorbed", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "Bitcoin network activity is clearly bullish because price is absorbing that load while throughput density stays high. " +
        "The market is validating the congestion signal directly, so the network stress itself proves demand is healthy. " +
        "As long as price keeps absorbing the load, the thesis holds."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeNetworkOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeNetworkEvidenceSummary(),
      llmProvider: provider,
      minTextLength: 220,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("draft_quality_gate_failed");
    expect(result.qualityGate.checks.find((check) => check.name === "family-dossier-grounding")?.pass).toBe(false);
  });

  it("accepts LLM output only when it clears the quality gate", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "BTC futures lean bearish without panic: mark is $67,250 against a $67,245 index while funding sits at -0.012, so shorts are paying before spot has actually broken. " +
        "That is positioning stress, not confirmation. If funding normalizes or spot reclaims premium, the bearish read weakens."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeEvidenceSummary(),
      supportingEvidenceSummaries: [makeSupportingEvidenceSummary()],
      llmProvider: provider,
      minTextLength: 260,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.draftSource).toBe("llm");
    expect(result.qualityGate.pass).toBe(true);
    expect(result.text).not.toContain("opportunity score");
    expect(result.text).not.toContain("coverage gap");
    expect(result.qualityGate.checks.find((check) => check.name === "research-angle-grounding")?.pass).toBe(true);
    expect(result.qualityGate.checks.find((check) => check.name === "research-style")?.pass).toBe(true);
    expect(provider.complete).toHaveBeenCalledTimes(1);
  });

  it("rejects LLM output that leaks internal reasoning into the post body", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "BTC funding-rate bear case deserves attention now because a 76-confidence signal is sitting in a coverage gap with zero matching posts. " +
        "The opportunity score is high enough to justify publishing. " +
        "The next live attested fetch should confirm whether the thesis holds."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeEvidenceSummary(),
      llmProvider: provider,
      minTextLength: 260,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("draft_quality_gate_failed");
    expect(result.qualityGate.checks.find((check) => check.name === "no-internal-reasoning-leak")?.pass).toBe(false);
  });

  it("rejects LLM output that rephrases internal ranking language", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "BTC funding pressure still has a high score because the topic is underrepresented in recent feed coverage and the setup looks worth surfacing now. " +
        "The main point is that this underrepresented theme should finally get attention, even before the market has fully reacted. " +
        "That framing alone is enough to justify publication while we keep watching the next read."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeEvidenceSummary(),
      llmProvider: provider,
      minTextLength: 300,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("draft_quality_gate_failed");
    expect(result.qualityGate.checks.find((check) => check.name === "no-internal-reasoning-leak")?.pass).toBe(false);
  });

  it("rejects LLM output that never references fetched evidence values", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "BTC funding pressure still looks bearish because conviction is clearly fading even if spot is holding together for now. " +
        "The structure is negative enough to justify caution, and the broader setup still points to downside risk building under the surface. " +
        "A reversal in positioning would weaken the thesis, but until then the bear case still deserves close attention."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeEvidenceSummary(),
      llmProvider: provider,
      minTextLength: 300,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("draft_quality_gate_failed");
    expect(result.qualityGate.checks.find((check) => check.name === "evidence-value-overlap")?.pass).toBe(false);
  });

  it("accepts evidence overlap from supporting-source values too", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "BTC futures lean bearish without panic: spot is holding around $67,240 while the premium side stays negative, so the tape still shows traders paying short before spot breaks. " +
        "That is positioning drift, not generic mood. If the premium normalizes and price pushes through resistance, the bearish read weakens."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeEvidenceSummary(),
      supportingEvidenceSummaries: [makeSupportingEvidenceSummary()],
      llmProvider: provider,
      minTextLength: 260,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.qualityGate.checks.find((check) => check.name === "evidence-value-overlap")?.pass).toBe(true);
  });

  it("rejects a near-twin same-family draft when recent self-history reuses the thesis surface", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "VIX at 21.34 with bills still paying 5.22% against 4.61% for notes says stress is broadening rather than fading, so the pivot narrative is still too early. " +
        "Watch for that 61bp front-end gap to compress before treating this as a clean risk-on reset."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeVixOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeVixEvidenceSummary(),
      supportingEvidenceSummaries: [makeTreasurySupportingEvidenceSummary()],
      selfHistory: {
        lastPost: {
          topic: "vix credit stress signal",
          family: "vix-credit",
          publishedAt: "2026-04-22T06:10:00.000Z",
          hoursAgo: 0.2,
          textSnippet: "VIX at 21.34 with bills at 5.22% against notes at 4.61% says stress is still broadening and the pivot narrative is early.",
        },
        lastSameTopicPost: null,
        lastSameFamilyPost: {
          topic: "vix credit stress signal",
          family: "vix-credit",
          publishedAt: "2026-04-22T06:10:00.000Z",
          hoursAgo: 0.2,
          textSnippet: "VIX at 21.34 with bills at 5.22% against notes at 4.61% says stress is still broadening and the pivot narrative is early.",
        },
        windows: {
          total24h: 1,
          total7d: 1,
          sameTopic24h: 0,
          sameTopic7d: 0,
          sameFamily24h: 1,
          sameFamily7d: 1,
        },
        changeSinceLastSameTopic: null,
        changeSinceLastSameFamily: {
          comparedToPublishedAt: "2026-04-22T06:10:00.000Z",
          changedFields: [],
          hasMeaningfulChange: false,
        },
        repeatRisk: "medium",
        skipSuggested: false,
        repetitionReason: "recent_same_family_coverage",
      },
      llmProvider: provider,
      minTextLength: 200,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("draft_quality_gate_failed");
    expect(result.qualityGate.checks.find((check) => check.name === "no-self-redundancy")?.pass).toBe(false);
  });

  it("rejects metadata-shaped primary evidence even when the draft cites real fetched numbers", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "Oil is underpricing a real tail because the market keeps treating geopolitical escalation as background noise even with 138,423 matching items sitting across 200 pages of discussion. " +
        "That persistence is why the risk still matters now, and the search corpus itself is enough to show the market is overlooking the problem rather than pricing it. " +
        "If the discussion count falls sharply, the thesis weakens."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeMetadataEvidenceSummary(),
      llmProvider: provider,
      minTextLength: 260,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("draft_quality_gate_failed");
    expect(result.qualityGate.checks.find((check) => check.name === "evidence-value-overlap")?.pass).toBe(true);
    expect(result.qualityGate.checks.find((check) => check.name === "semantic-evidence-grounding")?.pass).toBe(false);
  });

  it("rejects drafts that replay the same colony surface inside the recent overlap window", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "Bill-note spread still says the front end is easing: 3.702 on bills versus 3.212 on 2y keeps the 49bps inversion alive while pivot chatter runs ahead of the tape. " +
        "That mismatch is still the stress signal to watch until the front end reprices."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeEvidenceSummary(),
      selfHistory: {
        lastPost: null,
        lastSameTopicPost: null,
        lastSameFamilyPost: null,
        windows: {
          total24h: 0,
          total7d: 0,
          sameTopic24h: 0,
          sameTopic7d: 0,
          sameFamily24h: 0,
          sameFamily7d: 0,
        },
        changeSinceLastSameTopic: null,
        changeSinceLastSameFamily: null,
        colonyNovelty: {
          recentOverlapCount2h: 1,
          recentOverlapCount24h: 1,
          strongestOverlapPost: {
            txHash: "0xmacro1",
            author: "0xmacro",
            category: "ANALYSIS",
            score: 88,
            publishedAt: "2026-04-22T07:40:00.000Z",
            hoursAgo: 0.8,
            textSnippet: "Bill-note spread still says the front end is easing: 3.702 on bills versus 3.212 on 2y keeps the 49bps inversion alive.",
            sharedTerms: ["bill", "note", "spread", "pivot"],
            sharedNumbers: ["3.702", "3.212", "49"],
          },
          skipSuggested: true,
          overlapReason: "recent_colony_numeric_overlap_within_2h",
        },
        repeatRisk: "high",
        skipSuggested: true,
        repetitionReason: "recent_colony_numeric_overlap_within_2h",
      },
      llmProvider: provider,
      minTextLength: 200,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("draft_quality_gate_failed");
    expect(result.qualityGate.checks.find((check) => check.name === "no-self-redundancy")?.pass).toBe(false);
  });

  it("rejects funding drafts that treat negative funding alone as proof", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "Negative funding by itself proves downside here, because traders are clearly positioned the right way and the market is only waiting to catch down to the derivatives signal. " +
        "The negative funding print guarantees the next move is lower, so there is no need to weigh price structure or open interest context beyond the sign of the rate itself. " +
        "Only a sudden reversal in funding would challenge that bearish call."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeEvidenceSummary(),
      supportingEvidenceSummaries: [makeFundingSupportingEvidenceSummary()],
      llmProvider: provider,
      minTextLength: 260,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("draft_quality_gate_failed");
    expect(result.qualityGate.checks.find((check) => check.name === "family-dossier-grounding")?.pass).toBe(false);
  });

  it("rejects stablecoin drafts that treat a normal peg as alpha", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "USDT supply expansion is constructive because the token is still sitting exactly at $1, and that alone proves the system is healthy enough to absorb new issuance without stress. " +
        "The peg staying at 1 means the latest supply growth is a clean bullish signal rather than a reserve concern, which is why the new issuance should be read as straightforward fuel for risk assets. " +
        "Only a break below the peg would challenge that interpretation."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeStablecoinOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeStablecoinEvidenceSummary(),
      supportingEvidenceSummaries: [makeStablecoinSupportingEvidenceSummary()],
      llmProvider: provider,
      minTextLength: 260,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("draft_quality_gate_failed");
    expect(result.qualityGate.checks.find((check) => check.name === "family-dossier-grounding")?.pass).toBe(false);
  });

  it("rejects vix-credit drafts that treat vix alone as a crash signal", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "High VIX proves a crash is coming here, because the volatility spike confirms recession panic and the credit spread is already signaling the same thing. " +
        "VIX alone is enough to make the call because fear metrics only move like this when the market is about to break. " +
        "Only a sudden drop in VIX would challenge that crash thesis."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeVixOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeVixEvidenceSummary(),
      supportingEvidenceSummaries: [makeTreasurySupportingEvidenceSummary()],
      llmProvider: provider,
      minTextLength: 260,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("draft_quality_gate_failed");
    expect(result.qualityGate.checks.find((check) => check.name === "family-dossier-grounding")?.pass).toBe(false);
  });

  it("rejects spot-momentum drafts that turn raw price direction into the thesis", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "Bitcoin is up 5.8 percent this week, so the market is clearly bullish again and the bearish signal no longer matters. " +
        "Price has rallied hard enough that the only real conclusion is that momentum has already resolved higher, which means the bearish take is simply wrong because the weekly move is positive. " +
        "Only a sudden crash would challenge that bullish conclusion."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeSpotOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeSpotEvidenceSummary(),
      llmProvider: provider,
      minTextLength: 260,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("draft_quality_gate_failed");
    expect(result.qualityGate.checks.find((check) => check.name === "family-dossier-grounding")?.pass).toBe(false);
  });

  it("rejects ETF drafts that treat positive net flow alone as proof of broad demand", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "Positive net flow of 609.21 BTC proves broad institutional demand is strong again, so the whole ETF complex is clearly back in accumulation mode. " +
        "The holdings base near 984,687 BTC just reinforces that conclusion and means institutions are buying aggressively across the board. " +
        "Only a turn to outright net outflows would challenge that bullish call."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeEtfOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeEtfEvidenceSummary(),
      llmProvider: provider,
      minTextLength: 260,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("draft_quality_gate_failed");
    expect(result.qualityGate.checks.find((check) => check.name === "family-dossier-grounding")?.pass).toBe(false);
  });

  it("rejects generic market commentary that ignores the divergence angle", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "Bitcoin has gained 5.8 percent this week and is now trading near 67,250 dollars inside a broad range with heavy volume. " +
        "The market still looks indecisive because price keeps oscillating between support and resistance without a clean breakout. " +
        "A move above the recent high would be constructive, while a move back toward the lower end of the range would turn the setup weaker."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeEvidenceSummary(),
      llmProvider: provider,
      minTextLength: 300,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("draft_quality_gate_failed");
    expect(result.qualityGate.checks.find((check) => check.name === "research-angle-grounding")?.pass).toBe(false);
  });

  it("rejects awkward colony-sentiment phrasing even when the numbers overlap", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "Bitcoin's 5.8% weekly move is quietly refuting the bearish half of colony sentiment because spot is still trading near 67,250 dollars rather than breaking lower. " +
        "The range structure still matters, but the phrase above captures the idea that the market is not yet validating the signal. " +
        "A reversal through the lower end of the range would restore the bear case."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeEvidenceSummary(),
      llmProvider: provider,
      minTextLength: 300,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("draft_quality_gate_failed");
    expect(result.qualityGate.checks.find((check) => check.name === "research-style")?.pass).toBe(false);
  });

  it("rejects mirrored rhetorical closes even when the analysis angle is present", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue(
        "The bearish read in colony signals is being contradicted by the tape because Bitcoin is up 5.8% this week at 67,250 dollars and still holding near the top of its range. " +
        "That mismatch matters because price and volume are leaning constructive instead of validating the breakdown thesis. " +
        "Until support breaks, the divergence is one of narrative lagging structure rather than structure lagging narrative."
      ),
    };

    const result = await buildResearchDraft({
      opportunity: makeOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeEvidenceSummary(),
      llmProvider: provider,
      minTextLength: 300,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("draft_quality_gate_failed");
    expect(result.qualityGate.checks.find((check) => check.name === "research-style")?.pass).toBe(false);
  });

  it("skips short low-quality LLM output instead of publishing a template fallback", async () => {
    const provider = {
      name: "test-provider",
      complete: vi.fn().mockResolvedValue("Too short to publish."),
    };

    const result = await buildResearchDraft({
      opportunity: makeOpportunity(),
      feedCount: 30,
      leaderboardCount: 10,
      availableBalance: 25,
      evidenceSummary: makeEvidenceSummary(),
      llmProvider: provider,
      minTextLength: 300,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("draft_quality_gate_failed");
    expect(result.notes[0]).toContain("llm_output_failed");
  });
});
