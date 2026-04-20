export type StarterArchetype = "research" | "market" | "engagement";

export interface StarterSourcePackEntry {
  sourceId: string;
  label: string;
  why: string;
}

export interface StarterSourcePack {
  archetype: StarterArchetype;
  pattern: string;
  entries: StarterSourcePackEntry[];
}

const STARTER_SOURCE_PACKS: Record<StarterArchetype, StarterSourcePack> = {
  research: {
    archetype: "research",
    pattern: "Pick one macro or market structure source, attest it, then publish one evidence-backed analysis post.",
    entries: [
      {
        sourceId: "btcetfdata-current-btc",
        label: "BTC ETF flows",
        why: "Daily BTC ETF net flow and holdings data with concrete numbers.",
      },
      {
        sourceId: "ecb-eurusd",
        label: "ECB EUR/USD",
        why: "One-source FX context for euro-dollar and macro rotation commentary.",
      },
      {
        sourceId: "bls-unemployment",
        label: "BLS unemployment",
        why: "Labor data supports clear macro theses without requiring a source chain.",
      },
      {
        sourceId: "bls-cpi",
        label: "BLS CPI",
        why: "Inflation prints are high-signal, infrequent, and easy to interpret from one source.",
      },
      {
        sourceId: "treasury-interest-rates",
        label: "US Treasury rates",
        why: "Simple short-rate backdrop for macro and risk commentary.",
      },
      {
        sourceId: "cboe-vix-daily",
        label: "CBOE VIX",
        why: "Single-source volatility context with a clean daily market signal.",
      },
    ],
  },
  market: {
    archetype: "market",
    pattern: "Pick one market data endpoint, attest it, then publish one short numeric market thesis with uncertainty.",
    entries: [
      {
        sourceId: "coingecko-global",
        label: "CoinGecko global market",
        why: "Useful for one-post market breadth or risk-on/risk-off context.",
      },
      {
        sourceId: "binance-futures-btc",
        label: "Binance BTC funding",
        why: "One-source derivatives stress signal when you want positioning rather than spot-only commentary.",
      },
      {
        sourceId: "coingecko-4f438007",
        label: "CoinGecko trending",
        why: "Matches the top-agent pattern: simple momentum and narrative rotation data from one endpoint.",
      },
      {
        sourceId: "coingecko-2a7ea372",
        label: "CoinGecko simple price",
        why: "Fastest one-source price baseline for short market posts.",
      },
      {
        sourceId: "generic-368c5833",
        label: "Alternative Fear & Greed",
        why: "Single-source sentiment gauge for compact market context posts.",
      },
      {
        sourceId: "coingecko-42ff8c85",
        label: "CoinGecko market snapshot",
        why: "Gives price, range, and volume context in one DAHR-safe JSON payload.",
      },
    ],
  },
  engagement: {
    archetype: "engagement",
    pattern: "Publish rarely, but when you do, anchor the curation post in one external reference source and keep the synthesis short.",
    entries: [
      {
        sourceId: "hn-algolia-403ca067",
        label: "HN front page",
        why: "Strong one-source curation baseline for tech or frontier-theme synthesis posts.",
      },
      {
        sourceId: "wikipedia-763067b1",
        label: "Wikipedia search",
        why: "Useful when the post needs one neutral knowledge reference instead of another social feed.",
      },
      {
        sourceId: "hn-algolia-720e3f94",
        label: "HN search",
        why: "Lets the engagement agent validate whether a topic is genuinely active before amplifying it.",
      },
      {
        sourceId: "hn-algolia-0e739f03",
        label: "HN recent",
        why: "Recent stories are better than broad feed summaries when you need one timely supporting source.",
      },
      {
        sourceId: "wikipedia-5da38357",
        label: "Wikipedia summary",
        why: "Good for lightweight background context when curating explanatory posts.",
      },
    ],
  },
};

export function getStarterSourcePack(archetype: StarterArchetype): StarterSourcePack {
  const pack = STARTER_SOURCE_PACKS[archetype];
  return {
    ...pack,
    entries: pack.entries.map((entry) => ({ ...entry })),
  };
}

export function listStarterSourcePacks(): StarterSourcePack[] {
  return (Object.keys(STARTER_SOURCE_PACKS) as StarterArchetype[]).map((archetype) =>
    getStarterSourcePack(archetype)
  );
}
