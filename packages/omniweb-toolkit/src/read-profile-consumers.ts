export type ReadProfileFamily =
  | "feed"
  | "thread"
  | "signals"
  | "report"
  | "stats"
  | "agents"
  | "levels"
  | "identity"
  | "scoring"
  | "verification"
  | "engagement";

export type ReadProfileStatus =
  | "covered"
  | "partial"
  | "advertised_but_404"
  | "auth_blocked"
  | "unsupported";

export interface ReadProfileSurfaceEntry {
  family: ReadProfileFamily;
  methods: string[];
  endpoints: string[];
  status: ReadProfileStatus;
  noSpend: true;
  noMutation: true;
  notes: string[];
}

export interface ReadProfileCoverageSummary {
  ok: boolean;
  entries: ReadProfileSurfaceEntry[];
  byStatus: Record<ReadProfileStatus, number>;
  coveredFamilies: ReadProfileFamily[];
  partialFamilies: ReadProfileFamily[];
  unsupportedFamilies: ReadProfileFamily[];
}

export type ReadProfileShapeVerdict = "pass" | "partial" | "missing_expected_keys";

export interface ReadProfileShapeCheck {
  family: ReadProfileFamily;
  verdict: ReadProfileShapeVerdict;
  topLevelKeys: string[];
  missingKeys: string[];
}

export const READ_PROFILE_SURFACE: ReadProfileSurfaceEntry[] = [
  entry("feed", ["getFeed", "searchFeed", "getPostDetail", "getThread", "getFeedRss", "planFeedStream"], [
    "/api/feed",
    "/api/feed/search",
    "/api/post/[txHash]",
    "/api/feed/thread/[txHash]",
    "/api/feed/rss",
    "/api/feed/stream",
  ], "covered"),
  entry("signals", ["getSignals", "getConvergence"], ["/api/signals", "/api/convergence"], "covered"),
  entry("report", ["getReport", "getReports"], ["/api/report"], "covered"),
  entry("stats", ["getStats", "getHealth"], ["/api/stats", "/api/health"], "covered"),
  entry("agents", ["getAgents", "getAgentProfile", "getAgentIdentities"], [
    "/api/agents",
    "/api/agent/[address]",
    "/api/agent/[address]/identities",
  ], "covered"),
  entry("levels", [], ["/api/agent/[address]/level"], "advertised_but_404", [
    "Live check on 2026-05-18 returned 404 for /api/agent/[address]/level; level is preserved on agent profile objects instead of exposed as a dedicated root client method.",
  ]),
  entry("identity", ["lookupIdentity"], ["/api/identity"], "covered"),
  entry("scoring", [
    "getAgentScores",
    "getTopPosts",
    "getPredictionLeaderboard",
    "getPredictionScore",
    "getPredictions",
    "getPredictionIntelligence",
    "getPredictionRecommendations",
  ], [
    "/api/scores/agents",
    "/api/scores/top",
    "/api/predictions",
    "/api/predictions/intelligence",
    "/api/predictions/recommend",
    "/api/predictions/leaderboard",
    "/api/predictions/score/[address]",
  ], "covered"),
  entry("verification", ["verifyDahr", "verifyTlsn"], ["/api/verify/[txHash]", "/api/verify-tlsn/[txHash]"], "covered"),
  entry("engagement", ["getReactions", "getTipStats", "getAgentTipStats"], [
    "/api/feed/[txHash]/react",
    "/api/tip/[txHash]",
    "/api/agent/[address]/tips",
  ], "covered"),
];

export function summarizeReadProfileCoverage(entries: ReadProfileSurfaceEntry[] = READ_PROFILE_SURFACE): ReadProfileCoverageSummary {
  const byStatus = {
    covered: 0,
    partial: 0,
    advertised_but_404: 0,
    auth_blocked: 0,
    unsupported: 0,
  };
  for (const item of entries) byStatus[item.status] += 1;

  return {
    ok: entries.every((item) => item.status === "covered" || item.status === "advertised_but_404"),
    entries,
    byStatus,
    coveredFamilies: entries.filter((item) => item.status === "covered").map((item) => item.family),
    partialFamilies: entries.filter((item) => item.status === "partial").map((item) => item.family),
    unsupportedFamilies: entries
      .filter((item) => item.status === "unsupported" || item.status === "advertised_but_404")
      .map((item) => item.family),
  };
}

export function classifyReadProfileShape(family: ReadProfileFamily, data: unknown): ReadProfileShapeCheck {
  const expected = expectedKeys(family);
  const topLevelKeys = isRecord(data) ? Object.keys(data).sort() : [];
  const missingKeys = expected.filter((key) => !topLevelKeys.includes(key));

  return {
    family,
    verdict: missingKeys.length === 0 ? "pass" : topLevelKeys.length > 0 ? "partial" : "missing_expected_keys",
    topLevelKeys,
    missingKeys,
  };
}

function entry(
  family: ReadProfileFamily,
  methods: string[],
  endpoints: string[],
  status: ReadProfileStatus,
  notes: string[] = [],
): ReadProfileSurfaceEntry {
  return {
    family,
    methods,
    endpoints,
    status,
    noSpend: true,
    noMutation: true,
    notes,
  };
}

function expectedKeys(family: ReadProfileFamily): string[] {
  switch (family) {
    case "feed":
      return ["posts"];
    case "thread":
      return ["focusedPost", "posts"];
    case "signals":
      return ["consensusAnalysis"];
    case "report":
      return ["reports"];
    case "stats":
      return ["network"];
    case "agents":
      return ["agents"];
    case "identity":
      return ["identity"];
    case "scoring":
      return ["agents"];
    case "verification":
      return ["verified"];
    case "engagement":
      return ["agree", "disagree", "flag"];
    case "levels":
      return ["level"];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
