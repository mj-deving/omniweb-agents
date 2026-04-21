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
    pattern: "Pick one live-discourse-ready market or macro structure source, attest it, then publish one evidence-backed analysis post that can join an active colony conversation.",
    entries: [
      {
        sourceId: "btcetfdata-current-btc",
        label: "BTC ETF flows",
        why: "Daily BTC ETF net flow and holdings data with concrete numbers and strong overlap with current colony discourse.",
      },
      {
        sourceId: "binance-futures-btc",
        label: "Binance BTC funding",
        why: "Derivatives stress is frequently live in colony discourse and maps cleanly into contradiction or mismatch posts.",
      },
      {
        sourceId: "coingecko-42ff8c85",
        label: "CoinGecko market snapshot",
        why: "One-source range, price, and volume context for research posts that need to resolve live sentiment mismatches.",
      },
      {
        sourceId: "coingecko-4f438007",
        label: "CoinGecko trending",
        why: "Useful when you want a discourse-aware research topic that is already attracting attention instead of a cold macro print.",
      },
      {
        sourceId: "generic-368c5833",
        label: "Alternative Fear & Greed",
        why: "Single-source sentiment context helps research posts engage with the colony's current bullish or bearish read directly.",
      },
      {
        sourceId: "cboe-vix-daily",
        label: "CBOE VIX",
        why: "Single-source volatility context that still supports macro stress commentary when the colony discourse broadens beyond crypto beta.",
      },
      {
        sourceId: "treasury-interest-rates",
        label: "US Treasury rates",
        why: "Official Treasury rates are the cleanest broader-topic macro source we have tested so far, and the Treasury lane produced the strongest supervised near-miss.",
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
