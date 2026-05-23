import type {
  ToolkitCapabilityManifest,
  ToolkitCapabilityManifestEntry,
  ToolkitCapabilityStatus,
} from "./capability-manifest.js";

export type OfficialSkillCoverageClassification =
  | "covered"
  | "partial"
  | "supervised"
  | "advanced"
  | "pending"
  | "degraded"
  | "intentionally_excluded";

export interface OfficialSkillSurfaceArea {
  id: string;
  label: string;
  sourceUrl: string;
  sourceSection: string;
  officialSurface: string[];
  expectedClassification: OfficialSkillCoverageClassification;
  capabilityIds: string[];
  notes: string[];
}

export interface OfficialSkillCoverageEntry extends OfficialSkillSurfaceArea {
  classification: OfficialSkillCoverageClassification;
  capabilityStatuses: Array<{
    id: string;
    status: ToolkitCapabilityStatus | "missing";
    methods: string[];
    responseDepth: string | "missing";
    proofTier: string | "missing";
  }>;
  missingCapabilityIds: string[];
}

export interface OfficialSkillCoverageReport {
  source: {
    officialSkillUrl: string;
    officialSkillMarkdownUrl: string;
    comparedAgainst: "toolkitCapabilityManifest";
    sourceOfTruth: "omniweb-toolkit";
  };
  generatedAt: string;
  classificationVocabulary: OfficialSkillCoverageClassification[];
  entries: OfficialSkillCoverageEntry[];
  summary: {
    totalAreas: number;
    byClassification: Record<OfficialSkillCoverageClassification, number>;
    missingCapabilityIds: string[];
    partialAreas: string[];
    supervisedAreas: string[];
    advancedAreas: string[];
    pendingAreas: string[];
    degradedAreas: string[];
    intentionallyExcludedAreas: string[];
  };
}

export interface OfficialSkillCoverageOptions {
  now?: Date;
}

export const OFFICIAL_SUPERCOLONY_SKILL_URL = "https://supercolony.ai/skill";
export const OFFICIAL_SUPERCOLONY_SKILL_MARKDOWN_URL = "https://supercolony.ai/supercolony-skill.md";

export const OFFICIAL_SKILL_COVERAGE_CLASSIFICATIONS: OfficialSkillCoverageClassification[] = [
  "covered",
  "partial",
  "supervised",
  "advanced",
  "pending",
  "degraded",
  "intentionally_excluded",
];

const OFFICIAL_SKILL_SURFACE: OfficialSkillSurfaceArea[] = [
  {
    id: "integration-packages",
    label: "Integration packages",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "Integration Packages",
    officialSurface: ["supercolony-mcp", "eliza-plugin-supercolony", "langchain-supercolony"],
    expectedClassification: "intentionally_excluded",
    capabilityIds: [],
    notes: [
      "This package is the local toolkit/runtime authority, not the official MCP, Eliza, or LangChain distribution.",
    ],
  },
  {
    id: "feed",
    label: "Reading the feed",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "Reading the Feed",
    officialSurface: ["/api/feed", "category", "author", "asset", "excludeCategories", "cursor", "limit"],
    expectedClassification: "covered",
    capabilityIds: ["colony.feed"],
    notes: ["Manifest owns read params and readback surfaces for standard feed reads."],
  },
  {
    id: "feed-search",
    label: "Feed search",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "Reading the Feed",
    officialSurface: ["/api/feed/search", "asset", "category", "since", "agent", "text", "limit"],
    expectedClassification: "covered",
    capabilityIds: ["colony.search"],
    notes: ["Manifest exposes search as a maintained read capability."],
  },
  {
    id: "post-thread",
    label: "Post detail and thread",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "API Endpoints",
    officialSurface: ["/api/feed/thread/[txHash]", "/api/post/[txHash]", "parent", "replies"],
    expectedClassification: "covered",
    capabilityIds: ["colony.post-detail"],
    notes: ["Post detail is the rich readback surface for thread and delayed feed visibility."],
  },
  {
    id: "signals",
    label: "Signals and convergence",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "ColonySignal / API Endpoints",
    officialSurface: ["/api/signals", "/api/convergence", "/api/report"],
    expectedClassification: "covered",
    capabilityIds: ["colony.signals"],
    notes: ["Manifest preserves the deeper signals, convergence, and report methods."],
  },
  {
    id: "rss",
    label: "Public RSS feed",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "API Endpoints",
    officialSurface: ["/api/feed/rss", "public Atom XML feed"],
    expectedClassification: "partial",
    capabilityIds: ["colony.feed"],
    notes: ["Feed content is covered, but RSS/Atom transport is not a dedicated manifest capability yet."],
  },
  {
    id: "sse-stream",
    label: "Real-time SSE stream",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "Real-Time SSE Stream",
    officialSurface: ["/api/feed/stream", "connected", "post", "reaction", "signal", "auth_expired", "Last-Event-ID"],
    expectedClassification: "partial",
    capabilityIds: ["colony.feed", "colony.signals", "colony.engagement-reads"],
    notes: ["Underlying read shapes are covered, but live SSE transport and replay cursor handling are not manifest-owned yet."],
  },
  {
    id: "publish",
    label: "Publishing posts",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "Quick Start (Publishing) / Post Payload",
    officialSurface: ["store HIVE payload", "OBSERVATION", "ANALYSIS", "PREDICTION", "sourceAttestations"],
    expectedClassification: "covered",
    capabilityIds: ["colony.publish"],
    notes: ["Live execution remains explicitly gated; the capability is covered by lifecycle proof metadata."],
  },
  {
    id: "dahr-attestation",
    label: "DAHR attestation",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "DAHR Attestation",
    officialSurface: ["demos.web2.createDahr", "responseHash", "txHash", "sourceAttestations"],
    expectedClassification: "covered",
    capabilityIds: ["colony.attest"],
    notes: ["DAHR attestation is represented as a wallet-backed verification capability."],
  },
  {
    id: "tlsnotary-attestation",
    label: "TLSNotary attestation",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "Post Payload / Cost",
    officialSurface: ["tlsnAttestations", "TLSNotary proofs"],
    expectedClassification: "advanced",
    capabilityIds: ["colony.attest-tlsn"],
    notes: ["TLSNotary is intentionally advanced because it depends on optional proof tooling."],
  },
  {
    id: "prediction-intelligence",
    label: "Prediction intelligence reads",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "Prediction Markets / Forecast Scoring",
    officialSurface: ["/api/prices", "/api/oracle", "/api/predictions/leaderboard", "/api/predictions/score/[address]"],
    expectedClassification: "covered",
    capabilityIds: ["colony.markets.read", "colony.scoring"],
    notes: ["Manifest keeps price history, oracle, prediction intelligence, and forecast scoring reachable."],
  },
  {
    id: "fixed-price-betting",
    label: "DEM fixed-price betting",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "Prediction Markets",
    officialSurface: ["/api/bets/pool", "/api/bets/place", "HIVE_BET:ASSET:PRICE[:HORIZON]"],
    expectedClassification: "covered",
    capabilityIds: ["colony.bet-fixed", "colony.pools.read"],
    notes: ["The primary DEM market write lane has lifecycle proof and pool readback surfaces."],
  },
  {
    id: "higher-lower-betting",
    label: "DEM higher/lower betting",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "Higher/Lower (Direction Bets)",
    officialSurface: ["/api/bets/higher-lower/pool", "/api/bets/higher-lower/place", "HIVE_HL:ASSET:HIGHER|LOWER:HORIZON"],
    expectedClassification: "pending",
    capabilityIds: ["colony.bet-higher-lower", "colony.pools.read"],
    notes: [
      "PR3 proved the maintained H/L write through pool readback at the fixed 5 DEM path.",
      "The official-skill coverage row remains pending for default operator execution until a widened operator-cycle/delayed-winners recheck is deliberate.",
      "The failed 0.1 DEM fractional attempt is not evidence for a lower floor.",
    ],
  },
  {
    id: "bet-registration-recovery",
    label: "Bet registration recovery",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "Prediction Markets / API Endpoints",
    officialSurface: ["/api/bets/place", "/api/bets/higher-lower/place", "fallback txHash registration"],
    expectedClassification: "advanced",
    capabilityIds: ["colony.bet-recovery"],
    notes: ["Registration helpers are recovery routes, not the default execution lane."],
  },
  {
    id: "binary-commodity-sports-markets",
    label: "Binary, commodity, and sports markets",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "Binary Markets / Commodity Betting / Sports Betting",
    officialSurface: ["/api/bets/binary/*", "/api/bets/commodity/*", "/api/bets/sports/*"],
    expectedClassification: "partial",
    capabilityIds: ["colony.pools.read", "colony.bet-fixed", "colony.bet-higher-lower"],
    notes: ["Some pool/read shapes are present, but dedicated binary, graduation, commodity, and sports write params are not fully first-class."],
  },
  {
    id: "eth-betting",
    label: "ETH betting on Base Sepolia",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "ETH Betting (Base Sepolia)",
    officialSurface: ["contractWrite", "linked EVM wallet", "Base Sepolia", "ETH pool APIs"],
    expectedClassification: "partial",
    capabilityIds: ["chain.core", "colony.pools.read"],
    notes: ["Advanced chain and pool reads exist, but ETH contractWrite betting is not a dedicated manifest capability."],
  },
  {
    id: "agent-identity",
    label: "Agent registration and human linking",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "Agent Identity / Linking Agents to Human Account",
    officialSurface: ["/api/agents/register", "/api/user/agents/challenge", "/api/user/agents/claim", "/api/user/agents/approve"],
    expectedClassification: "supervised",
    capabilityIds: ["colony.identity", "colony.identity-reads"],
    notes: ["Identity mutation remains supervised and explicit; readbacks stay available."],
  },
  {
    id: "web2-identity",
    label: "Web2 identity lookup and proof",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "Agent Identity",
    officialSurface: ["/api/identity", "twitter", "github", "discord", "telegram"],
    expectedClassification: "advanced",
    capabilityIds: ["identity.web2", "colony.identity-reads"],
    notes: ["Cross-platform proof creation is advanced; identity reads are still surfaced."],
  },
  {
    id: "agent-level-profile",
    label: "Agent profile, level, and stats",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "Agent Levels / API Endpoints",
    officialSurface: ["/api/agents", "/api/agent/[address]", "/api/agent/[address]/level", "/api/stats"],
    expectedClassification: "partial",
    capabilityIds: ["colony.identity-reads", "colony.account-stats", "colony.scoring"],
    notes: ["Profile, stats, and scoring are reachable, but level progression is not a dedicated capability yet."],
  },
  {
    id: "chat",
    label: "Agent chat",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "Agent Chat",
    officialSurface: ["/api/chat/rooms", "/api/chat/messages", "/api/chat/send"],
    expectedClassification: "partial",
    capabilityIds: ["colony.chat"],
    notes: ["Chat room/message reads are represented; chat-send remains outside maintained write actions."],
  },
  {
    id: "reactions",
    label: "Reactions",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "API Endpoints",
    officialSurface: ["/api/feed/[txHash]/react", "agree", "disagree", "flag"],
    expectedClassification: "covered",
    capabilityIds: ["colony.react", "colony.engagement-reads"],
    notes: ["Write lifecycle and readback stats are both represented."],
  },
  {
    id: "tipping",
    label: "Tipping",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "Tipping (Agent-Only)",
    officialSurface: ["/api/tip", "/api/tip/[postTxHash]", "HIVE_TIP"],
    expectedClassification: "covered",
    capabilityIds: ["colony.tip", "colony.engagement-reads", "colony.account-stats"],
    notes: ["Tip execution and post/recipient stat readbacks are manifest-owned."],
  },
  {
    id: "webhooks",
    label: "Webhooks",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "Webhooks",
    officialSurface: ["/api/webhooks", "signal", "mention", "reply"],
    expectedClassification: "advanced",
    capabilityIds: ["colony.webhooks"],
    notes: ["Webhook registration is an advanced runtime capability."],
  },
  {
    id: "proof-storage",
    label: "Advanced proof storage",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "Cost",
    officialSurface: ["TLSNotary proofs cost more (token + proof storage)"],
    expectedClassification: "degraded",
    capabilityIds: ["storage.programs"],
    notes: ["Storage-program reads are present but explicitly degraded because RPC readback can drift and needs reconstruction."],
  },
  {
    id: "health-diagnostics",
    label: "Health diagnostics",
    sourceUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
    sourceSection: "API Endpoints",
    officialSurface: ["/api/health", "SSE diagnostics"],
    expectedClassification: "intentionally_excluded",
    capabilityIds: [],
    notes: ["Health diagnostics are operational probes, not an operator capability surface."],
  },
];

export function getOfficialSkillSurfaceAreas(): OfficialSkillSurfaceArea[] {
  return OFFICIAL_SKILL_SURFACE.map((area) => ({
    ...area,
    officialSurface: [...area.officialSurface],
    capabilityIds: [...area.capabilityIds],
    notes: [...area.notes],
  }));
}

export function buildOfficialSkillCoverageReport(
  manifest: ToolkitCapabilityManifest,
  options: OfficialSkillCoverageOptions = {},
): OfficialSkillCoverageReport {
  const capabilityById = new Map(manifest.capabilities.map((capability) => [capability.id, capability]));
  const entries = OFFICIAL_SKILL_SURFACE.map((area) => buildCoverageEntry(area, capabilityById));
  const byClassification = emptyClassificationCounts();
  for (const entry of entries) byClassification[entry.classification] += 1;
  const missingCapabilityIds = Array.from(new Set(entries.flatMap((entry) => entry.missingCapabilityIds))).sort();

  return {
    source: {
      officialSkillUrl: OFFICIAL_SUPERCOLONY_SKILL_URL,
      officialSkillMarkdownUrl: OFFICIAL_SUPERCOLONY_SKILL_MARKDOWN_URL,
      comparedAgainst: "toolkitCapabilityManifest",
      sourceOfTruth: "omniweb-toolkit",
    },
    generatedAt: (options.now ?? new Date()).toISOString(),
    classificationVocabulary: [...OFFICIAL_SKILL_COVERAGE_CLASSIFICATIONS],
    entries,
    summary: {
      totalAreas: entries.length,
      byClassification,
      missingCapabilityIds,
      partialAreas: idsByClassification(entries, "partial"),
      supervisedAreas: idsByClassification(entries, "supervised"),
      advancedAreas: idsByClassification(entries, "advanced"),
      pendingAreas: idsByClassification(entries, "pending"),
      degradedAreas: idsByClassification(entries, "degraded"),
      intentionallyExcludedAreas: idsByClassification(entries, "intentionally_excluded"),
    },
  };
}

function buildCoverageEntry(
  area: OfficialSkillSurfaceArea,
  capabilityById: Map<string, ToolkitCapabilityManifestEntry>,
): OfficialSkillCoverageEntry {
  const capabilityStatuses = area.capabilityIds.map((id) => {
    const capability = capabilityById.get(id);
    if (!capability) {
      return {
        id,
        status: "missing" as const,
        methods: [],
        responseDepth: "missing" as const,
        proofTier: "missing" as const,
      };
    }
    return {
      id,
      status: capability.status,
      methods: [...capability.methods],
      responseDepth: capability.responseDepth,
      proofTier: capability.proofTier,
    };
  });

  return {
    ...area,
    officialSurface: [...area.officialSurface],
    capabilityIds: [...area.capabilityIds],
    notes: [...area.notes],
    classification: area.expectedClassification,
    capabilityStatuses,
    missingCapabilityIds: capabilityStatuses
      .filter((capability) => capability.status === "missing")
      .map((capability) => capability.id),
  };
}

function emptyClassificationCounts(): Record<OfficialSkillCoverageClassification, number> {
  return Object.fromEntries(
    OFFICIAL_SKILL_COVERAGE_CLASSIFICATIONS.map((classification) => [classification, 0]),
  ) as Record<OfficialSkillCoverageClassification, number>;
}

function idsByClassification(
  entries: OfficialSkillCoverageEntry[],
  classification: OfficialSkillCoverageClassification,
): string[] {
  return entries.filter((entry) => entry.classification === classification).map((entry) => entry.id);
}
