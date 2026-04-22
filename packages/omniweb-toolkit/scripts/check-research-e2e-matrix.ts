#!/usr/bin/env npx tsx

import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  DEFAULT_PENDING_VERDICT_PATH,
  buildPendingVerdictEntry,
  enqueuePendingVerdict,
} from "./_supervised-verdict-queue.ts";
import {
  buildResearchMatrixEvaluationFamilies,
  chooseResearchMatrixOpportunity,
  selectResearchMatrixBroadcastFamily,
} from "./_research-matrix-broadcast.ts";
import { loadConnect, loadPackageExport } from "./_shared.ts";
import { scheduleSupervisedVerdict } from "./_supervised-publish-verdict.js";

type MatrixFamily =
  | "funding-structure"
  | "etf-flows"
  | "spot-momentum"
  | "network-activity"
  | "stablecoin-supply"
  | "macro-liquidity"
  | "vix-credit";

type MatrixDraftCategory = "ANALYSIS" | "OBSERVATION";

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

interface MatrixFamilyResult {
  family: MatrixFamily;
  status:
    | "no_live_candidate"
    | "attestation_plan_not_ready"
    | "evidence_not_ready"
    | "draft_rejected"
    | "match_failed"
    | "draft_ready"
    | "published"
    | "publish_failed";
  topic?: string;
  opportunityKind?: string;
  rationale?: string;
  reason?: string;
  evidenceSource?: string | null;
  supportingSources?: string[];
  promptProvider?: string | null;
  draft?: {
    text: string;
    category: string;
    confidence: number;
  };
  qualityGate?: unknown;
  match?: unknown;
  verification?: unknown;
  publish?: {
    txHash?: string;
    provenance?: unknown;
    error?: unknown;
  };
  verdictSchedule?: ReturnType<typeof scheduleSupervisedVerdict>;
  pendingVerdict?: {
    id: string;
    queuePath: string;
    checkAt: string;
    inserted: boolean;
  };
  notes?: string[];
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
  };
  matchingFeedPosts: FeedSample[];
  contradictionSignals?: string[];
  attestationPlan: any;
}

const SUPPORTED_FAMILIES: MatrixFamily[] = [
  "funding-structure",
  "etf-flows",
  "spot-momentum",
  "network-activity",
  "stablecoin-supply",
  "macro-liquidity",
  "vix-credit",
];

const args = process.argv.slice(2);
const workerMode = args.includes("--worker-mode");

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-research-e2e-matrix.ts [options]

Options:
  --broadcast-family FAMILY   Execute one real publish for the named family
  --broadcast-fallback-families A,B,C
                            If the requested family is not draft_ready, fall back to the first
                            listed family that is draft_ready. Only used when --broadcast-family
                            is present.
  --preferred-category CAT    Bias drafting toward ANALYSIS or OBSERVATION
  --publish-timeout-ms N      Bound live publish wait before returning publish_failed
  --record-pending-verdict    Queue a delayed verdict follow-up for a successful live publish
  --pending-verdict-queue P   Override the pending verdict queue path
  --pending-verdict-delay-ms N Override the category delay for the queued verdict entry
  --out PATH                  Write the JSON report to a file as well as stdout
  --verify-timeout-ms N       Visibility verification timeout when broadcasting (default: 45000)
  --verify-poll-ms N          Visibility poll interval when broadcasting (default: 5000)
  --verify-limit N            Feed limit for visibility checks (default: 50)
  --env-path PATH             Override wallet credentials file passed to connect()
  --agent-name NAME           Use ~/.config/demos/credentials-NAME if present
  --state-dir PATH            Forwarded to connect()
  --allow-insecure            Forwarded to connect() for local debugging only
  --help, -h                  Show this help
`);
  process.exit(0);
}

const broadcastFamily = getOptionalArg("--broadcast-family");
if (broadcastFamily && !SUPPORTED_FAMILIES.includes(broadcastFamily as MatrixFamily)) {
  console.error(`Unsupported --broadcast-family value: ${broadcastFamily}`);
  process.exit(2);
}
const broadcastFallbackFamilies = getOptionalFamilyList("--broadcast-fallback-families");
const preferredCategory = getOptionalCategory("--preferred-category");

const outputPath = getOptionalArg("--out");
const recordPendingVerdict = args.includes("--record-pending-verdict");
const pendingVerdictQueuePath = getOptionalArg("--pending-verdict-queue") ?? DEFAULT_PENDING_VERDICT_PATH;
const pendingVerdictDelayMs = getOptionalInt("--pending-verdict-delay-ms");
const publishTimeoutMs = getPositiveInt("--publish-timeout-ms", 60_000);
const familyTimeoutMs = getPositiveInt("--family-timeout-ms", 90_000);
const verifyTimeoutMs = getPositiveInt("--verify-timeout-ms", 45_000);
const verifyPollMs = getPositiveInt("--verify-poll-ms", 5_000);
const verifyLimit = getPositiveInt("--verify-limit", 50);
const envPath = getOptionalArg("--env-path");
const agentName = getOptionalArg("--agent-name");

if (broadcastFamily && !workerMode) {
  const report = await runBoundedFamilyWorker({
    family: broadcastFamily as MatrixFamily,
    fallbackFamilies: broadcastFallbackFamilies,
    timeoutMs: familyTimeoutMs,
    outputPath,
  });
  await maybeWriteOutput(outputPath, report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const getPrimaryAttestUrl = await loadPackageExport<
  (plan: { primary?: { url?: string | null } | null } | null | undefined) => string | null
>(
  "../dist/agent.js",
  "../src/agent.ts",
  "getPrimaryAttestUrl",
);

const getPrimaryAttestationCandidate = await loadPackageExport<
  <T extends { primary?: unknown } | null | undefined>(plan: T) => T extends { primary?: infer U } ? Exclude<U, undefined> | null : null
>(
  "../dist/agent.js",
  "../src/agent.ts",
  "getPrimaryAttestationCandidate",
);
const stateDir = getOptionalArg("--state-dir");
const allowInsecureUrls = args.includes("--allow-insecure");

const connect = await loadConnect();
const deriveResearchOpportunities = await loadPackageExport<
  (opts: { signals: SignalSample[]; posts: FeedSample[] }) => ResearchOpportunityLike[]
>(
  "../dist/agent.js",
  "../src/agent.ts",
  "deriveResearchOpportunities",
);
const fetchResearchEvidenceSummary = await loadPackageExport<
  (opts: { source: any; topic: string }) => Promise<any>
>(
  "../dist/agent.js",
  "../src/agent.ts",
  "fetchResearchEvidenceSummary",
);
const buildResearchDraft = await loadPackageExport<
  (opts: {
    opportunity: ResearchOpportunityLike;
    feedCount: number;
    leaderboardCount: number;
    availableBalance: number;
    evidenceSummary: any;
    supportingEvidenceSummaries?: any[];
    selfHistory?: unknown;
    llmProvider?: unknown;
    minTextLength?: number;
  }) => Promise<any>
>(
  "../dist/agent.js",
  "../src/agent.ts",
  "buildResearchDraft",
);
const buildResearchSelfHistory = await loadPackageExport<
  (opts: {
    history: Array<{
      topic: string;
      family: string | null;
      publishedAt: string;
      opportunityKind: string;
      textSnippet: string | null;
      evidenceValues: Record<string, string>;
    }>;
    topic: string;
    family: string | null;
    now: string;
    currentEvidenceValues: Record<string, string>;
  }) => unknown
>(
  "../dist/agent.js",
  "../src/agent.ts",
  "buildResearchSelfHistory",
);
const loadResearchPublishHistory = await loadPackageExport<
  (stateDir: string) => Promise<Array<{
    topic: string;
    family: string | null;
    publishedAt: string;
    opportunityKind: string;
    textSnippet: string | null;
    evidenceValues: Record<string, string>;
  }>>
>(
  "../dist/agent.js",
  "../src/agent.ts",
  "loadResearchPublishHistory",
);
const appendResearchPublishHistory = await loadPackageExport<
  (stateDir: string, entry: {
    topic: string;
    family: string | null;
    publishedAt: string;
    opportunityKind: string;
    textSnippet: string | null;
    evidenceValues: Record<string, string>;
  }) => Promise<Array<{
    topic: string;
    family: string | null;
    publishedAt: string;
    opportunityKind: string;
    textSnippet: string | null;
    evidenceValues: Record<string, string>;
  }>>
>(
  "../dist/agent.js",
  "../src/agent.ts",
  "appendResearchPublishHistory",
);
const matchResearchDraftToPlan = await loadPackageExport<
  (opts: {
    topic: string;
    text: string;
    tags: string[];
    attestationPlan: any;
    evidenceReads: any[];
  }) => Promise<any>
>(
  "../dist/agent.js",
  "../src/agent.ts",
  "matchResearchDraftToPlan",
);
const verifyPublishVisibility = await loadPackageExport<
  (omni: any, txHash: string | undefined, text: string, opts: {
    timeoutMs: number;
    pollMs: number;
    limit: number;
  }) => Promise<any>
>(
  "../dist/publish-visibility.js",
  "../src/publish-visibility.ts",
  "verifyPublishVisibility",
);
const omni = await connect({ envPath, agentName, stateDir, allowInsecureUrls });
const startedAt = new Date().toISOString();
let publishHistory = stateDir ? await loadResearchPublishHistory(stateDir) : [];

const [feedRead, signalsRead, leaderboardRead, balanceRead] = await Promise.allSettled([
  omni.colony.getFeed({ limit: 30 }),
  omni.colony.getSignals(),
  omni.colony.getLeaderboard({ limit: 10 }),
  omni.colony.getBalance(),
]);

const reads = {
  feed: unwrap(feedRead),
  signals: unwrap(signalsRead),
  leaderboard: unwrap(leaderboardRead),
  balance: unwrap(balanceRead),
};

if (!reads.feed.ok || !reads.signals.ok || !reads.balance.ok) {
  const failure = {
    checkedAt: startedAt,
    ok: false,
    reason: "core_reads_failed",
    readStatus: {
      feed: describeRead(reads.feed),
      signals: describeRead(reads.signals),
      leaderboard: describeRead(reads.leaderboard),
      balance: describeRead(reads.balance),
    },
  };
  await maybeWriteOutput(outputPath, failure);
  console.log(JSON.stringify(failure, null, 2));
  process.exit(1);
}

const posts = extractFeedPosts(reads.feed.data);
const signals = extractSignals(reads.signals.data);
const leaderboardAgents = extractLeaderboardAgents(reads.leaderboard.data);
const availableBalance = extractAvailableBalance(reads.balance.data);
const opportunities = deriveResearchOpportunities({
  signals,
  posts,
});

const evaluationFamilies = buildResearchMatrixEvaluationFamilies({
  requestedFamily: broadcastFamily ? broadcastFamily as MatrixFamily : null,
  fallbackFamilies: broadcastFallbackFamilies,
  supportedFamilies: SUPPORTED_FAMILIES,
});
const candidatesByFamily = new Map<MatrixFamily, ResearchOpportunityLike>();
for (const family of evaluationFamilies) {
  const candidate = chooseResearchMatrixOpportunity(
    family,
    opportunities as Array<ResearchOpportunityLike & { sourceProfile: { family: MatrixFamily | string } }>,
  );
  if (candidate) {
    candidatesByFamily.set(family, candidate);
  }
}

const familyResults: MatrixFamilyResult[] = [];
const readyPublishContexts = new Map<MatrixFamily, {
  draft: Awaited<ReturnType<typeof buildResearchDraft>> & { ok: true };
  opportunity: ResearchOpportunityLike;
  evidenceValues: Record<string, string>;
}>();
for (const family of evaluationFamilies) {
  const opportunity = candidatesByFamily.get(family);
  if (!opportunity) {
    familyResults.push({
      family,
      status: "no_live_candidate",
      reason: "No current live colony signal mapped to this supported research family.",
    });
    continue;
  }

  const primaryAttestationCandidate = getPrimaryAttestationCandidate(opportunity.attestationPlan);
  if (!opportunity.attestationPlan.ready || !primaryAttestationCandidate) {
    familyResults.push({
      family,
      status: "attestation_plan_not_ready",
      topic: opportunity.topic,
      opportunityKind: opportunity.kind,
      rationale: opportunity.rationale,
      reason: opportunity.attestationPlan.reason,
      notes: opportunity.attestationPlan.warnings,
    });
    continue;
  }

  const evidenceReads = await Promise.allSettled([
    fetchResearchEvidenceSummary({ source: primaryAttestationCandidate, topic: opportunity.topic }),
    ...opportunity.attestationPlan.supporting.map((source) =>
      fetchResearchEvidenceSummary({ source, topic: opportunity.topic })),
  ]);
  const primaryEvidence = evidenceReads[0];
  const supportingEvidence = evidenceReads.slice(1);
  const supportingNotes = supportingEvidence.flatMap((entry, index) => {
    const source = opportunity.attestationPlan.supporting[index];
    if (!source) return [];
    if (entry.status === "rejected") return [`Supporting evidence fetch failed for ${source.name}: ${String(entry.reason)}`];
    if (!entry.value.ok) return [`Supporting evidence unavailable for ${source.name}: ${entry.value.note}`];
    return [];
  });

  if (!primaryEvidence || primaryEvidence.status !== "fulfilled" || !primaryEvidence.value.ok) {
    familyResults.push({
      family,
      status: "evidence_not_ready",
      topic: opportunity.topic,
      opportunityKind: opportunity.kind,
      rationale: opportunity.rationale,
      reason: primaryEvidence?.status === "fulfilled"
        ? primaryEvidence.value.note
        : `Primary evidence fetch failed: ${String(primaryEvidence?.reason)}`,
      notes: supportingNotes,
    });
    continue;
  }

  const supportingSummaries = supportingEvidence.flatMap((entry) =>
    entry.status === "fulfilled" && entry.value.ok ? [entry.value.summary] : []);
  const selfHistory = buildResearchSelfHistory({
    history: publishHistory,
    topic: opportunity.topic,
    family: opportunity.sourceProfile.family,
    now: startedAt,
    currentEvidenceValues: primaryEvidence.value.summary.values,
  });
  const prefetchResults = evidenceReads.flatMap((entry) =>
    entry.status === "fulfilled" ? [entry.value] : []);
  const draft = await buildResearchDraft({
    opportunity,
    feedCount: posts.length,
    leaderboardCount: leaderboardAgents.length,
    availableBalance,
    evidenceSummary: primaryEvidence.value.summary,
    supportingEvidenceSummaries: supportingSummaries,
    selfHistory,
    preferredCategory,
    llmProvider: omni.runtime.llmProvider,
    minTextLength: 200,
  });

  if (!draft.ok) {
    familyResults.push({
      family,
      status: "draft_rejected",
      topic: opportunity.topic,
      opportunityKind: opportunity.kind,
      rationale: opportunity.rationale,
      reason: draft.reason,
      qualityGate: draft.qualityGate,
      promptProvider: omni.runtime.llmProvider?.name ?? null,
      notes: draft.notes,
    });
    continue;
  }

  const match = await matchResearchDraftToPlan({
    topic: opportunity.topic,
    text: draft.text,
    tags: draft.tags,
    attestationPlan: opportunity.attestationPlan,
    evidenceReads: prefetchResults,
  });

  if (!match.pass) {
    familyResults.push({
      family,
      status: "match_failed",
      topic: opportunity.topic,
      opportunityKind: opportunity.kind,
      rationale: opportunity.rationale,
      reason: match.reason,
      evidenceSource: primaryEvidence.value.summary.source,
      supportingSources: supportingSummaries.map((entry) => entry.source),
      draft: {
        text: draft.text,
        category: draft.category,
        confidence: draft.confidence,
      },
      qualityGate: draft.qualityGate,
      match,
      notes: supportingNotes,
    });
    continue;
  }

  const readyResult: MatrixFamilyResult = {
    family,
    status: "draft_ready",
    topic: opportunity.topic,
    opportunityKind: opportunity.kind,
    rationale: opportunity.rationale,
    evidenceSource: primaryEvidence.value.summary.source,
    supportingSources: supportingSummaries.map((entry) => entry.source),
    promptProvider: omni.runtime.llmProvider?.name ?? null,
    draft: {
      text: draft.text,
      category: draft.category,
      confidence: draft.confidence,
    },
    qualityGate: draft.qualityGate,
    match,
    notes: supportingNotes,
  };
  readyPublishContexts.set(family, {
    draft,
    opportunity,
    evidenceValues: primaryEvidence.value.summary.values,
  });
  familyResults.push(readyResult);
}

const publishSelection = selectResearchMatrixBroadcastFamily({
  requestedFamily: broadcastFamily ? broadcastFamily as MatrixFamily : null,
  fallbackFamilies: broadcastFallbackFamilies,
  readyFamilies: familyResults
    .filter((result) => result.status === "draft_ready")
    .map((result) => result.family),
});

if (publishSelection.selectedFamily) {
  const selectedResult = familyResults.find((result) => result.family === publishSelection.selectedFamily);
  const selectedContext = readyPublishContexts.get(publishSelection.selectedFamily);
  if (selectedResult && selectedContext) {
    const attestUrl = getPrimaryAttestUrl(selectedContext.opportunity.attestationPlan);
    if (!attestUrl) {
      selectedResult.status = "publish_failed";
      selectedResult.publish = {
        error: { message: "missing_primary_attest_url" },
        provenance: null,
      };
    } else {
      if (publishSelection.usedFallback && publishSelection.requestedFamily) {
        selectedResult.notes = [
          ...(selectedResult.notes ?? []),
          `broadcast fallback from ${publishSelection.requestedFamily} -> ${publishSelection.selectedFamily}`,
        ];
      }
      const publishedAt = new Date().toISOString();
      const publishResult = await runMatrixLivePublish({
        text: selectedContext.draft.text,
        category: selectedContext.draft.category,
        attestUrl,
        confidence: selectedContext.draft.confidence,
        envPath,
        agentName,
        stateDir,
        allowInsecureUrls,
        timeoutMs: publishTimeoutMs,
      });

      if (!publishResult.ok) {
        selectedResult.status = "publish_failed";
        selectedResult.publish = {
          error: publishResult.error ?? null,
          provenance: publishResult.provenance,
        };
      } else {
        const verification = await verifyPublishVisibility(
          omni,
          publishResult.data?.txHash,
          selectedContext.draft.text,
          {
            timeoutMs: verifyTimeoutMs,
            pollMs: verifyPollMs,
            limit: verifyLimit,
          },
        );
        selectedResult.status = "published";
        selectedResult.publish = {
          txHash: publishResult.data?.txHash,
          provenance: publishResult.provenance,
        };
        selectedResult.verification = verification;
        selectedResult.verdictSchedule = scheduleSupervisedVerdict(selectedContext.draft.category, publishedAt);
        if (recordPendingVerdict && publishResult.data?.txHash) {
          const queued = await enqueuePendingVerdict(
            buildPendingVerdictEntry({
              txHash: publishResult.data.txHash,
              category: selectedContext.draft.category,
              text: selectedContext.draft.text,
              startedAt: publishedAt,
              sourceRunPath: outputPath ? resolve(outputPath) : null,
              stateDir: stateDir ?? null,
              checkAfterMs: pendingVerdictDelayMs,
            }),
            pendingVerdictQueuePath,
          );
          selectedResult.pendingVerdict = {
            id: queued.entry.id,
            queuePath: pendingVerdictQueuePath,
            checkAt: queued.entry.checkAt,
            inserted: queued.inserted,
          };
        }
        if (stateDir) {
          publishHistory = await appendResearchPublishHistory(stateDir, {
            topic: selectedContext.opportunity.topic,
            family: selectedContext.opportunity.sourceProfile.family,
            publishedAt,
            opportunityKind: selectedContext.opportunity.kind,
            textSnippet: selectedContext.draft.text.slice(0, 240),
            evidenceValues: selectedContext.evidenceValues,
          });
        }
      }
    }
  }
}

const report = {
  checkedAt: startedAt,
  ok: true,
  broadcastFamily: broadcastFamily ?? null,
  broadcastFallbackFamilies,
  broadcastPublishedFamily: publishSelection.selectedFamily,
  broadcastUsedFallback: publishSelection.usedFallback,
  availableBalance,
  readStatus: {
    feed: describeRead(reads.feed),
    signals: describeRead(reads.signals),
    leaderboard: describeRead(reads.leaderboard),
    balance: describeRead(reads.balance),
  },
  opportunitiesConsidered: opportunities.length,
  familyResults,
};

await maybeWriteOutput(outputPath, report);
console.log(JSON.stringify(report, null, 2));
process.exit(0);

function getOptionalArg(flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function getPositiveInt(flag: string, fallback: number): number {
  const raw = getOptionalArg(flag);
  if (raw == null) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${flag} value: ${raw}`);
  }
  return parsed;
}

function getOptionalInt(flag: string): number | undefined {
  const raw = getOptionalArg(flag);
  if (raw == null) return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${flag} value: ${raw}`);
  }
  return parsed;
}

function getOptionalFamilyList(flag: string): MatrixFamily[] {
  const raw = getOptionalArg(flag);
  if (!raw) return [];
  const values = raw.split(",").map((entry) => entry.trim()).filter(Boolean);
  const invalid = values.filter((entry) => !SUPPORTED_FAMILIES.includes(entry as MatrixFamily));
  if (invalid.length > 0) {
    throw new Error(`Invalid ${flag} value(s): ${invalid.join(", ")}`);
  }
  return [...new Set(values)] as MatrixFamily[];
}

function getOptionalCategory(flag: string): MatrixDraftCategory | null {
  const value = getOptionalArg(flag);
  if (!value) return null;
  if (value === "ANALYSIS" || value === "OBSERVATION") return value;
  console.error(`Unsupported ${flag} value: ${value}`);
  process.exit(2);
}

function unwrap<T extends { ok?: boolean }>(
  result: PromiseSettledResult<T>,
): { ok: boolean; data: T | null; error: string | null } {
  if (result.status === "rejected") {
    return {
      ok: false,
      data: null,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  }
  if (result.value?.ok !== true) {
    return {
      ok: false,
      data: result.value,
      error: "api_not_ok",
    };
  }
  return { ok: true, data: result.value, error: null };
}

function describeRead(result: { ok: boolean; error: string | null }): { ok: boolean; error: string | null } {
  return { ok: result.ok, error: result.error };
}

function extractFeedPosts(feed: unknown): FeedSample[] {
  if (!feed || typeof feed !== "object") return [];
  const posts = (feed as { data?: { posts?: unknown } }).data?.posts;
  if (!Array.isArray(posts)) return [];
  return posts.map((post) => samplePost(post));
}

function extractSignals(signals: unknown): SignalSample[] {
  if (!signals || typeof signals !== "object") return [];
  const list = (signals as { data?: unknown }).data;
  if (!Array.isArray(list)) return [];
  return list.map((signal) => ({
    topic: signalTopic(signal),
    confidence: signalConfidence(signal),
    direction:
      signal && typeof signal === "object" && typeof (signal as { direction?: unknown }).direction === "string"
        ? (signal as { direction: string }).direction
        : null,
  }));
}

function extractLeaderboardAgents(leaderboard: unknown): unknown[] {
  if (!leaderboard || typeof leaderboard !== "object") return [];
  const data = (leaderboard as { data?: unknown }).data;
  if (Array.isArray(data)) return data;
  const agents = (data as { agents?: unknown } | undefined)?.agents;
  return Array.isArray(agents) ? agents : [];
}

function extractAvailableBalance(balance: unknown): number {
  if (!balance || typeof balance !== "object") return 0;
  const direct = (balance as { balance?: unknown }).balance;
  if (typeof direct === "number") return direct;
  if (typeof direct === "string") {
    const parsed = Number.parseFloat(direct.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const nested = (balance as { data?: { balance?: unknown } }).data?.balance;
  if (typeof nested === "number") return nested;
  if (typeof nested === "string") {
    const parsed = Number.parseFloat(nested.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function signalTopic(signal: unknown): string | null {
  if (!signal || typeof signal !== "object") return null;
  const candidate = (signal as { shortTopic?: unknown; topic?: unknown }).shortTopic
    ?? (signal as { shortTopic?: unknown; topic?: unknown }).topic;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

function signalConfidence(signal: unknown): number | null {
  if (!signal || typeof signal !== "object") return null;
  const candidate = (signal as { confidence?: unknown }).confidence;
  return typeof candidate === "number" ? candidate : null;
}

function postText(post: unknown): string {
  if (!post || typeof post !== "object") return "";
  const payload = (post as { payload?: { text?: unknown } }).payload;
  const payloadText = payload?.text;
  if (typeof payloadText === "string") return payloadText;
  const direct = (post as { text?: unknown }).text;
  return typeof direct === "string" ? direct : "";
}

function samplePost(post: unknown): FeedSample {
  if (!post || typeof post !== "object") {
    return {
      txHash: null,
      category: null,
      text: "",
      author: null,
      timestamp: null,
    };
  }
  const payload = (post as { payload?: { cat?: unknown } }).payload;
  return {
    txHash: typeof (post as { txHash?: unknown }).txHash === "string" ? (post as { txHash: string }).txHash : null,
    category: typeof payload?.cat === "string" ? payload.cat : null,
    text: postText(post),
    author: typeof (post as { author?: unknown }).author === "string" ? (post as { author: string }).author : null,
    timestamp: typeof (post as { timestamp?: unknown }).timestamp === "number" ? (post as { timestamp: number }).timestamp : null,
  };
}

async function maybeWriteOutput(path: string | undefined, report: unknown): Promise<void> {
  if (!path) return;
  const absolute = resolve(process.cwd(), path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function runBoundedFamilyWorker(input: {
  family: MatrixFamily;
  fallbackFamilies: MatrixFamily[];
  timeoutMs: number;
  outputPath?: string;
}): Promise<unknown> {
  const scriptPath = resolve(process.cwd(), "packages/omniweb-toolkit/scripts/check-research-e2e-matrix.ts");
  const tsxBin = resolve(process.cwd(), "node_modules/.bin/tsx");
  const workerOut = resolve(
    process.cwd(),
    ".tmp",
    `research-matrix-worker-${input.family}-${Date.now()}.json`,
  );
  await mkdir(dirname(workerOut), { recursive: true });

  const childArgs = stripArgsWithValues(args, [
    "--out",
    "--family-timeout-ms",
    "--worker-mode",
  ]);
  childArgs.push("--worker-mode", "--out", workerOut);

  const child = spawn(tsxBin, [scriptPath, ...childArgs], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const exitCode = await new Promise<number | null>((resolveExit) => {
    const timeoutId = setTimeout(() => {
      child.kill("SIGKILL");
      resolveExit(124);
    }, input.timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timeoutId);
      resolveExit(code);
    });
    child.on("error", () => {
      clearTimeout(timeoutId);
      resolveExit(1);
    });
  });

  if (exitCode === 124) {
    await rm(workerOut, { force: true });
    return {
      checkedAt: new Date().toISOString(),
      ok: false,
      reason: "family_worker_timed_out",
      broadcastFamily: input.family,
      broadcastFallbackFamilies: input.fallbackFamilies,
      broadcastPublishedFamily: null,
      broadcastUsedFallback: false,
      familyResults: [
        {
          family: input.family,
          status: "publish_failed",
          reason: `family worker timed out after ${input.timeoutMs}ms`,
          notes: compactNotes(stdout, stderr),
        },
      ],
    };
  }

  try {
    const raw = await readFile(workerOut, "utf8");
    await rm(workerOut, { force: true });
    return JSON.parse(raw);
  } catch {
    return {
      checkedAt: new Date().toISOString(),
      ok: false,
      reason: "family_worker_missing_output",
      broadcastFamily: input.family,
      broadcastFallbackFamilies: input.fallbackFamilies,
      broadcastPublishedFamily: null,
      broadcastUsedFallback: false,
      familyResults: [
        {
          family: input.family,
          status: "publish_failed",
          reason: `family worker exited ${exitCode ?? "unknown"} without a parseable output file`,
          notes: compactNotes(stdout, stderr),
        },
      ],
    };
  }
}

async function runMatrixLivePublish(input: {
  text: string;
  category: string;
  attestUrl: string;
  confidence: number;
  envPath?: string;
  agentName?: string;
  stateDir?: string;
  allowInsecureUrls: boolean;
  timeoutMs: number;
}): Promise<{
  ok: boolean;
  data?: { txHash?: string };
  provenance?: unknown;
  error?: { code: string; message: string; retryable?: boolean };
}> {
  const helperPath = resolve(process.cwd(), "packages/omniweb-toolkit/scripts/_research-matrix-live-publish.ts");
  const tsxBin = resolve(process.cwd(), "node_modules/.bin/tsx");
  const args = [
    helperPath,
    "--text-base64", Buffer.from(input.text, "utf8").toString("base64"),
    "--category", input.category,
    "--attest-url", input.attestUrl,
    "--confidence", String(input.confidence),
  ];
  if (input.envPath) args.push("--env-path", input.envPath);
  if (input.agentName) args.push("--agent-name", input.agentName);
  if (input.stateDir) args.push("--state-dir", input.stateDir);
  if (input.allowInsecureUrls) args.push("--allow-insecure");

  return await new Promise((resolvePromise) => {
    const child = spawn(tsxBin, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (result: {
      ok: boolean;
      data?: { txHash?: string };
      provenance?: unknown;
      error?: { code: string; message: string; retryable?: boolean };
    }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolvePromise(result);
    };

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      finish({
        ok: false,
        error: {
          code: "PUBLISH_HELPER_FAILED",
          message: error.message,
          retryable: true,
        },
      });
    });

    child.on("close", () => {
      const trimmed = stdout.trim();
      if (!trimmed) {
        finish({
          ok: false,
          error: {
            code: "PUBLISH_HELPER_EMPTY",
            message: stderr.trim() || "publish helper exited without JSON output",
            retryable: true,
          },
        });
        return;
      }

      try {
        finish(JSON.parse(trimmed));
      } catch {
        finish({
          ok: false,
          error: {
            code: "PUBLISH_HELPER_INVALID_JSON",
            message: [trimmed, stderr.trim()].filter(Boolean).join("\n"),
            retryable: true,
          },
        });
      }
    });

    const timeoutId = setTimeout(() => {
      child.kill("SIGKILL");
      finish({
        ok: false,
        error: {
          code: "PUBLISH_TIMEOUT",
          message: `publish helper timed out after ${input.timeoutMs}ms`,
          retryable: true,
        },
      });
    }, input.timeoutMs);
  });
}

function stripArgsWithValues(argv: string[], flags: string[]): string[] {
  const stripped: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;
    if (token === "--worker-mode") continue;
    if (flags.includes(token)) {
      index += 1;
      continue;
    }
    stripped.push(token);
  }
  return stripped;
}

function compactNotes(stdout: string, stderr: string): string[] {
  return [stdout.trim(), stderr.trim()].filter((entry) => entry.length > 0);
}
