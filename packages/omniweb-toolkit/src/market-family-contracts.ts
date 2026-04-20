import {
  createTopicFamilyRegistry,
  defineTopicFamilyContract,
  getTopicFamilyContract,
  type TopicFamilyContract,
  type TopicFamilyRegistry,
} from "./topic-family-contract.js";
import { loadOracleDivergenceDoctrine } from "./market-family-doctrine.js";

export type MarketTopicFamily = "oracle-divergence";

export type MarketTopicFamilyContract = TopicFamilyContract<MarketTopicFamily>;

const oracleDivergenceDoctrine = loadOracleDivergenceDoctrine();

export const ORACLE_DIVERGENCE_CONTRACT: MarketTopicFamilyContract = defineTopicFamilyContract({
  family: "oracle-divergence",
  displayName: "Oracle Divergence",
  sourcePlan: {
    primarySourceIds: ["supercolony-oracle-divergence"],
    supportingSourceIds: ["coingecko-simple-price", "binance-ticker-price"],
    expectedMetrics: [
      "severity",
      "agentDirection",
      "marketDirection",
      "agentConfidence",
      "priceUsd",
      "change24h",
    ],
  },
  promptDoctrine: {
    baseline: oracleDivergenceDoctrine.baseline,
    focus: oracleDivergenceDoctrine.focus,
  },
  claimBounds: {
    defensible: [
      "Describe the disagreement between agent sentiment and observed price action.",
      "Say why the dislocation is worth monitoring now.",
      "State what would confirm or weaken the dislocation next.",
    ],
    blocked: oracleDivergenceDoctrine.blocked,
    requiresExtra: oracleDivergenceDoctrine.requiresExtra,
  },
  metricSemantics: oracleDivergenceDoctrine.metricSemantics,
  quality: {
    slipPatterns: [
      {
        pattern: /\b(?:agents?|oracle|consensus)\b.{0,60}\b(?:right|correct|accurate)\b.{0,40}\b(?:market|price)\b.{0,40}\b(?:wrong|mispriced|incorrect)\b/i,
        detail: "claims agents are right and the market is wrong — not defensible from sentiment data alone",
      },
      {
        pattern: /\bedge\b.{0,40}\b(?:divergence|mismatch|dislocation)\b|\b(?:divergence|mismatch|dislocation)\b.{0,40}\bedge\b/i,
        detail: "describes the divergence as a tradeable edge even though the packet is only descriptive",
      },
      {
        pattern: /\b(?:high|elevated)\s+severity\b.{0,60}\b(?:means|proves|confirms|guarantees)\b/i,
        detail: "treats divergence severity as proof of a specific outcome even though the grading is opaque",
      },
      {
        pattern: /\b(?:\d+|multiple|several)\s+agents?\s+agree\b.{0,60}\b(?:means|proves|confirms|strong signal)\b/i,
        detail: "treats agent count as evidence of independent agreement without model-diversity evidence",
      },
    ],
  },
});

export const MARKET_TOPIC_FAMILY_CONTRACTS: TopicFamilyRegistry<MarketTopicFamily> = createTopicFamilyRegistry([
  ORACLE_DIVERGENCE_CONTRACT,
]);

export function getMarketTopicFamilyContract(
  family: MarketTopicFamily,
): MarketTopicFamilyContract {
  return getTopicFamilyContract(MARKET_TOPIC_FAMILY_CONTRACTS, family);
}
