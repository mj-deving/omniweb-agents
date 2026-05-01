#!/usr/bin/env npx tsx

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadConnect, loadPackageExport } from "./_shared.ts";

interface FeedSample {
  txHash: string | null;
  category: string | null;
  text: string;
  author: string | null;
  timestamp: number | null;
}

interface SignalSample {
  topic: string | null;
  confidence: number | null;
  direction: string | null;
}

interface LiveSurface {
  posts: FeedSample[];
  signals: SignalSample[];
  leaderboardAgents: unknown[];
  availableBalance: number;
  readStatus: {
    feed: { ok: boolean; error: string | null };
    signals: { ok: boolean; error: string | null };
    leaderboard: { ok: boolean; error: string | null };
    balance: { ok: boolean; error: string | null };
  };
}

interface ResearchOpportunityLike {
  kind: string;
  topic: string;
  score: number;
  rationale: string;
  sourceProfile: {
    family: string;
    supported: boolean;
  };
  matchedSignal: {
    confidence: number | null;
    direction?: string | null;
  };
  matchingFeedPosts: FeedSample[];
  contradictionSignals?: string[];
  attestationPlan?: {
    ready: boolean;
    reason?: string | null;
    supporting?: unknown[];
  };
}

interface ColonySurfaceSummary {
  checkedAt: string;
  feedCount: number;
  signalCount: number;
  leaderboardCount: number;
  availableBalance: number;
  expansionCandidateSource: string;
  topOpportunityTopics: Array<{
    topic: string;
    kind: string;
    score: number;
    family: string;
    rationale: string;
  }>;
  expansionCandidates: Array<{
    family: string;
    topicCount: number;
    totalScore: number;
    averageConfidence: number;
    sampleTopics: string[];
    rationale: string;
  }>;
}

interface StarterDecision {
  selectedTopic: string | null;
  reason: string;
  supportedClaims: string[];
  unsupportedClaims: string[];
  evidencePosture: string;
  recommendedAction: string;
  confidence: number;
  riskPosture: string;
  requiredChecks: string[];
  abstainReason: string | null;
}

interface StarterArtifact {
  checkedAt: string;
  ok: boolean;
  surface: LiveSurface;
  summary: ColonySurfaceSummary;
  decision: StarterDecision;
  nextStep: {
    kind: string;
    message: string;
    selectedTopic: string | null;
    requiredChecks: string[];
    riskPosture: string;
  };
}

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-research-starter-loop.ts [options]

Options:
  --out PATH               Write the JSON artifact to a file as well as stdout
  --env-path PATH          Override wallet credentials file passed to connect()
  --agent-name NAME        Use ~/.config/demos/credentials-NAME if present
  --state-dir PATH         Forwarded to connect()
  --feed-limit N           Feed sample size (default: 30)
  --leaderboard-limit N    Leaderboard sample size (default: 10)
  --allow-insecure         Forwarded to connect() for local debugging only
  --help, -h               Show this help
`);
  process.exit(0);
}

const outputPath = getOptionalArg("--out");
const envPath = getOptionalArg("--env-path");
const agentName = getOptionalArg("--agent-name");
const stateDir = getOptionalArg("--state-dir");
const feedLimit = getPositiveInt("--feed-limit", 30);
const leaderboardLimit = getPositiveInt("--leaderboard-limit", 10);
const allowInsecureUrls = args.includes("--allow-insecure");

const connect = await loadConnect();
const collectResearchLiveSurface = await loadPackageExport<
  (opts: { colony: any; feedLimit?: number; leaderboardLimit?: number }) => Promise<LiveSurface>
>("../dist/agent.js", "../src/agent.ts", "collectResearchLiveSurface");
const deriveResearchOpportunities = await loadPackageExport<
  (opts: { signals: SignalSample[]; posts: FeedSample[] }) => ResearchOpportunityLike[]
>("../dist/agent.js", "../src/agent.ts", "deriveResearchOpportunities");
const rankLiveResearchTopics = await loadPackageExport<
  (opts: { signals: SignalSample[]; posts: FeedSample[] }) => ResearchOpportunityLike[]
>("../dist/agent.js", "../src/agent.ts", "rankLiveResearchTopics");
const buildColonySurfaceSummary = await loadPackageExport<
  (opts: {
    checkedAt: string;
    posts: FeedSample[];
    signals: SignalSample[];
    leaderboardAgents: string[];
    availableBalance: number;
    opportunities: ResearchOpportunityLike[];
    liveTopics?: ResearchOpportunityLike[];
    expansionCandidateSource?: string;
  }) => ColonySurfaceSummary
>("../dist/agent.js", "../src/agent.ts", "buildColonySurfaceSummary");
const buildResearchStarterDecision = await loadPackageExport<
  (opts: { liveSurface: Pick<LiveSurface, "readStatus">; liveTopics: ResearchOpportunityLike[]; opportunities: ResearchOpportunityLike[] }) => StarterDecision
>("../dist/agent.js", "../src/agent.ts", "buildResearchStarterDecision");

const omni = await connect({ envPath, agentName, stateDir, allowInsecureUrls });
const checkedAt = new Date().toISOString();
const surface = await collectResearchLiveSurface({
  colony: omni.colony,
  feedLimit,
  leaderboardLimit,
});
const opportunities = surface.readStatus.feed.ok && surface.readStatus.signals.ok
  ? deriveResearchOpportunities({ signals: surface.signals, posts: surface.posts })
  : [];
const liveTopics = surface.readStatus.feed.ok && surface.readStatus.signals.ok
  ? rankLiveResearchTopics({ signals: surface.signals, posts: surface.posts })
  : [];

const summary = buildColonySurfaceSummary({
  checkedAt,
  posts: surface.posts,
  signals: surface.signals,
  leaderboardAgents: surface.leaderboardAgents as string[],
  availableBalance: surface.availableBalance,
  opportunities,
  liveTopics,
  expansionCandidateSource: !surface.readStatus.feed.ok || !surface.readStatus.signals.ok || !surface.readStatus.balance.ok
    ? (liveTopics.length > 0 ? "partial_live_topic_ranker" : "none")
    : "live_topic_ranker",
});

const decision = buildResearchStarterDecision({
  liveSurface: { readStatus: surface.readStatus },
  liveTopics,
  opportunities,
});

const artifact: StarterArtifact = {
  checkedAt,
  ok: true,
  surface,
  summary,
  decision,
  nextStep: buildNextStep(decision),
};

await maybeWriteOutput(outputPath, artifact);
console.log(JSON.stringify(artifact, null, 2));

function buildNextStep(decision: StarterDecision): StarterArtifact["nextStep"] {
  switch (decision.recommendedAction) {
    case "draft":
      return {
        kind: "compose_draft",
        message: `Compose an inspectable draft for ${decision.selectedTopic ?? "the selected topic"} and verify claim wording before any live publish decision.`,
        selectedTopic: decision.selectedTopic,
        requiredChecks: decision.requiredChecks,
        riskPosture: decision.riskPosture,
      };
    case "request_more_evidence":
      return {
        kind: "gather_more_evidence",
        message: decision.reason,
        selectedTopic: decision.selectedTopic,
        requiredChecks: decision.requiredChecks,
        riskPosture: decision.riskPosture,
      };
    case "observe":
      return {
        kind: "observe_only",
        message: decision.reason,
        selectedTopic: decision.selectedTopic,
        requiredChecks: decision.requiredChecks,
        riskPosture: decision.riskPosture,
      };
    case "abstain":
    case "noop":
    default:
      return {
        kind: "abstain",
        message: decision.abstainReason ?? decision.reason,
        selectedTopic: decision.selectedTopic,
        requiredChecks: decision.requiredChecks,
        riskPosture: decision.riskPosture,
      };
  }
}

function getOptionalArg(flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index < 0) return undefined;
  return args[index + 1];
}

function getPositiveInt(flag: string, fallback: number): number {
  const raw = getOptionalArg(flag);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.error(`Invalid ${flag} value: ${raw}`);
    process.exit(2);
  }
  return parsed;
}

async function maybeWriteOutput(path: string | undefined, report: unknown): Promise<void> {
  if (!path) return;
  const absolute = resolve(process.cwd(), path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}
