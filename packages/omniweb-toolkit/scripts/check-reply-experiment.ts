#!/usr/bin/env npx tsx

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  buildPendingVerdictEntry,
  DEFAULT_PENDING_VERDICT_PATH,
  enqueuePendingVerdict,
} from "./_supervised-verdict-queue.ts";
import { scheduleSupervisedVerdict } from "./_supervised-publish-verdict.js";
import { getStringArg, hasFlag, loadConnect, loadPackageExport } from "./_shared.ts";

interface ReplyExperimentState {
  repliedParentTxHashes?: string[];
  lastReplyParentTxHash?: string;
  lastReplyAt?: string;
}

const DEFAULT_FEED_LIMIT = 100;
const DEFAULT_PARENT_CATEGORY = "ANALYSIS";
const DEFAULT_MIN_AGREE_COUNT = 3;
const DEFAULT_MIN_REPLY_COUNT = 1;
const DEFAULT_MAX_PARENT_AGE_HOURS = 2;
const DEFAULT_MIN_SCORE = 80;

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-reply-experiment.ts [options]

Options:
  --broadcast                   Execute the real reply instead of dry-run
  --parent-tx TX                Force a specific parent tx when it appears in the feed window
  --parent-category CAT         Parent category to scan (default: ${DEFAULT_PARENT_CATEGORY})
  --feed-limit N                Number of recent posts to scan (default: ${DEFAULT_FEED_LIMIT})
  --min-agree-count N           Minimum parent agree-count floor (default: ${DEFAULT_MIN_AGREE_COUNT})
  --min-reply-count N           Minimum parent reply-count floor (default: ${DEFAULT_MIN_REPLY_COUNT})
  --max-parent-age-hours N      Max parent age in hours (default: ${DEFAULT_MAX_PARENT_AGE_HOURS})
  --min-score N                 Minimum parent score floor (default: ${DEFAULT_MIN_SCORE})
  --record-pending-verdict      Queue a delayed verdict follow-up for a successful reply
  --pending-verdict-queue PATH  Override the pending verdict queue path
  --pending-verdict-delay-ms N  Override the category delay for the queued verdict entry
  --verify-timeout-ms N         Visibility verification timeout (default: 45000)
  --verify-poll-ms N            Visibility poll interval (default: 5000)
  --verify-limit N              Feed limit for visibility checks (default: 50)
  --env-path PATH               Override wallet credentials file passed to connect()
  --agent-name NAME             Use ~/.config/demos/credentials-NAME if present
  --state-dir PATH              Override state directory for runtime guards and minimal-agent artifacts
  --out PATH                    Write the JSON report to a file as well as stdout
  --allow-insecure              Forwarded to connect() for local debugging only
  --help, -h                    Show this help
`);
  process.exit(0);
}

const broadcast = hasFlag(args, "--broadcast");
const parentTxOverride = getStringArg(args, "--parent-tx");
const parentCategory = (getStringArg(args, "--parent-category") ?? DEFAULT_PARENT_CATEGORY).trim().toUpperCase();
const feedLimit = getPositiveInt("--feed-limit", DEFAULT_FEED_LIMIT);
const minAgreeCount = getPositiveInt("--min-agree-count", DEFAULT_MIN_AGREE_COUNT);
const minReplyCount = getPositiveInt("--min-reply-count", DEFAULT_MIN_REPLY_COUNT);
const maxParentAgeHours = getPositiveInt("--max-parent-age-hours", DEFAULT_MAX_PARENT_AGE_HOURS);
const minScore = getPositiveInt("--min-score", DEFAULT_MIN_SCORE);
const recordPendingVerdict = hasFlag(args, "--record-pending-verdict");
const pendingVerdictQueuePath = getStringArg(args, "--pending-verdict-queue") ?? DEFAULT_PENDING_VERDICT_PATH;
const pendingVerdictDelayMs = getOptionalPositiveInt("--pending-verdict-delay-ms");
const verifyTimeoutMs = getPositiveInt("--verify-timeout-ms", 45_000);
const verifyPollMs = getPositiveInt("--verify-poll-ms", 5_000);
const verifyLimit = getPositiveInt("--verify-limit", 50);
const envPath = getStringArg(args, "--env-path");
const agentName = getStringArg(args, "--agent-name") ?? null;
const stateDirArg = getStringArg(args, "--state-dir");
const outputPath = getStringArg(args, "--out");
const allowInsecureUrls = hasFlag(args, "--allow-insecure");
const getDefaultMinimalStateDir = await loadPackageExport<
  (cwd?: string) => string
>(
  "../dist/agent.js",
  "../src/agent.ts",
  "getDefaultMinimalStateDir",
);
const runMinimalAgentCycle = await loadPackageExport<any>(
  "../dist/agent.js",
  "../src/agent.ts",
  "runMinimalAgentCycle",
);
const buildMinimalAttestationPlanFromUrls = await loadPackageExport<any>(
  "../dist/agent.js",
  "../src/agent.ts",
  "buildMinimalAttestationPlanFromUrls",
);
const fetchResearchEvidenceSummary = await loadPackageExport<any>(
  "../dist/agent.js",
  "../src/agent.ts",
  "fetchResearchEvidenceSummary",
);
const rankReplyExperimentCandidates = await loadPackageExport<any>(
  "../dist/agent.js",
  "../src/agent.ts",
  "rankReplyExperimentCandidates",
);
const checkReplyDraftQuality = await loadPackageExport<any>(
  "../dist/agent.js",
  "../src/agent.ts",
  "checkReplyDraftQuality",
);
const stateDir = stateDirArg ?? getDefaultMinimalStateDir();
const connect = await loadConnect();
const omni = await connect({ envPath, agentName, stateDir, allowInsecureUrls });

const record = await runMinimalAgentCycle(
  async (ctx) => observeReplyExperiment(ctx, {
    feedLimit,
    parentCategory,
    minAgreeCount,
    minReplyCount,
    maxParentAgeMs: maxParentAgeHours * 60 * 60 * 1000,
    minScore,
    parentTxOverride: parentTxOverride ?? null,
  }),
  {
    omni,
    stateDir,
    dryRun: !broadcast,
    verification: {
      timeoutMs: verifyTimeoutMs,
      pollMs: verifyPollMs,
      limit: verifyLimit,
    },
  },
);

const publishedAt = record.startedAt;
const verdictSchedule = record.decision.kind === "reply"
  ? scheduleSupervisedVerdict(record.decision.category ?? "ANALYSIS", publishedAt)
  : null;

let pendingVerdict: {
  id: string;
  queuePath: string;
  checkAt: string;
  inserted: boolean;
} | null = null;

if (recordPendingVerdict && record.outcome.status === "replied" && record.outcome.txHash) {
  const queued = await enqueuePendingVerdict(
    buildPendingVerdictEntry({
      txHash: record.outcome.txHash,
      category: record.decision.kind === "reply" ? (record.decision.category ?? "ANALYSIS") : "ANALYSIS",
      text: record.decision.text,
      startedAt: publishedAt,
      sourceRunPath: cycleRecordPath(stateDir, record.startedAt, record.cycleId),
      stateDir,
      checkAfterMs: pendingVerdictDelayMs,
    }),
    pendingVerdictQueuePath,
  );
  pendingVerdict = {
    id: queued.entry.id,
    queuePath: pendingVerdictQueuePath,
    checkAt: queued.entry.checkAt,
    inserted: queued.inserted,
  };
}

const report = {
  checkedAt: new Date().toISOString(),
  ok: record.outcome.status === "dry_run" || record.outcome.status === "replied",
  broadcast,
  operatorPath: "supervised-reply",
  stateDir,
  parentCategory,
  minAgreeCount,
  minReplyCount,
  record,
  verdictSchedule,
  pendingVerdict,
};

await maybeWriteOutput(outputPath, report);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);

async function observeReplyExperiment(
  ctx: any,
  opts: {
    feedLimit: number;
    parentCategory: string;
    minAgreeCount: number;
    minReplyCount: number;
    maxParentAgeMs: number;
    minScore: number;
    parentTxOverride: string | null;
  },
): Promise<any> {
  const feed = await fetchFeedWindow(ctx.omni, {
    limit: opts.feedLimit,
    category: opts.parentCategory,
  });
  if (!feed.ok) {
    return {
      kind: "skip",
      reason: "feed_read_failed",
      facts: { error: feed.error ?? "feed_not_ok" },
      nextState: ctx.memory.state ?? {},
    };
  }

  const posts = feed.posts;
  const excludeParentTxHashes = ctx.memory.state?.repliedParentTxHashes ?? [];
  const rankedCandidates = opts.parentTxOverride
    ? rankReplyExperimentCandidates(
      posts.filter((post) => {
        if (!post || typeof post !== "object") return false;
        return (post as { txHash?: unknown }).txHash === opts.parentTxOverride;
      }),
      {
        ownAddress: ctx.omni.address,
        maxAgeMs: opts.maxParentAgeMs,
        minAgreeCount: opts.minAgreeCount,
        minReplyCount: opts.minReplyCount,
        minScore: opts.minScore,
        category: opts.parentCategory,
        excludeParentTxHashes,
      },
    )
    : rankReplyExperimentCandidates(posts, {
      ownAddress: ctx.omni.address,
      maxAgeMs: opts.maxParentAgeMs,
      minAgreeCount: opts.minAgreeCount,
      minReplyCount: opts.minReplyCount,
      minScore: opts.minScore,
      category: opts.parentCategory,
      excludeParentTxHashes,
    });

  if (rankedCandidates.length === 0) {
    return {
      kind: "skip",
      reason: opts.parentTxOverride ? "forced_parent_not_eligible" : "no_reply_candidate",
      audit: {
        inputs: {
          feedLimit: opts.feedLimit,
          parentCategory: opts.parentCategory,
          feedPagesRead: feed.pages,
          minAgreeCount: opts.minAgreeCount,
          minReplyCount: opts.minReplyCount,
          maxParentAgeMs: opts.maxParentAgeMs,
          minScore: opts.minScore,
          excludedParents: excludeParentTxHashes,
        },
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  const resolvedCandidate = await chooseCandidateWithEvidence(rankedCandidates);
  if (!resolvedCandidate) {
    return {
      kind: "skip",
      reason: "evidence_not_ready",
      facts: {
        attemptedParents: rankedCandidates.slice(0, 5).map((candidate) => candidate.txHash),
      },
      audit: {
        selectedEvidence: {
          candidateShortlist: rankedCandidates.slice(0, 5),
        },
        inputs: {
          feedPagesRead: feed.pages,
        },
      },
      nextState: ctx.memory.state ?? {},
    };
  }
  const { selected, attestationPlan, evidence } = resolvedCandidate;

  const prompt = buildReplyPrompt(selected, evidence.summary);
  const firstDraft = await generateReplyDraft(ctx.omni.runtime.llmProvider, prompt);

  if (!firstDraft) {
    return {
      kind: "skip",
      reason: "llm_provider_unavailable",
      audit: {
        selectedEvidence: { parent: selected, evidenceSummary: evidence.summary },
        promptPacket: { prompt },
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  let text = firstDraft;
  let qualityGate = checkReplyDraftQuality({
    text,
    parentText: selected.text,
    evidenceSummary: evidence.summary,
  });
  let retryDraft: string | null = null;
  let retryQualityGate: any = null;

  if (!qualityGate.pass && shouldRetryReplyDraft(qualityGate.reason)) {
    retryDraft = await generateReplyDraft(
      ctx.omni.runtime.llmProvider,
      buildReplyRetryPrompt(prompt, text, qualityGate.reason),
    );
    if (retryDraft) {
      retryQualityGate = checkReplyDraftQuality({
        text: retryDraft,
        parentText: selected.text,
        evidenceSummary: evidence.summary,
      });
      if (retryQualityGate.pass) {
        text = retryDraft;
        qualityGate = retryQualityGate;
      }
    }
  }

  if (!qualityGate.pass) {
    return {
      kind: "skip",
      reason: "draft_quality_gate_failed",
      facts: { candidateTxHash: selected.txHash },
      audit: {
        selectedEvidence: {
          parent: selected,
          evidenceSummary: evidence.summary,
          attestationPlan,
        },
        promptPacket: {
          prompt,
          qualityGate,
          retryDraft,
          retryQualityGate,
        },
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  const nextParents = [selected.txHash, ...(ctx.memory.state?.repliedParentTxHashes ?? [])]
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 20);

  return {
    kind: "reply",
    parentTxHash: selected.txHash,
    text,
    attestUrl: attestationPlan.primary.url,
    category: "ANALYSIS",
    attestationPlan,
    audit: {
      inputs: {
        feedLimit: opts.feedLimit,
        parentCategory: opts.parentCategory,
        feedPagesRead: feed.pages,
        minAgreeCount: opts.minAgreeCount,
        minReplyCount: opts.minReplyCount,
        maxParentAgeMs: opts.maxParentAgeMs,
        minScore: opts.minScore,
      },
      selectedEvidence: {
        parent: selected,
        evidenceSummary: evidence.summary,
        attestationPlan,
      },
      promptPacket: {
        prompt,
        qualityGate,
        retryDraft,
        retryQualityGate,
      },
    },
    nextState: {
      repliedParentTxHashes: nextParents,
      lastReplyParentTxHash: selected.txHash,
      lastReplyAt: ctx.cycle.startedAt,
    },
  };
}

async function fetchFeedWindow(
  omni: {
    colony: {
      getFeed(opts: { limit: number; category?: string; cursor?: string }): Promise<any>;
    };
  },
  opts: {
    limit: number;
    category?: string;
  },
): Promise<{
  ok: boolean;
  posts: unknown[];
  pages: number;
  error?: string;
}> {
  const posts: unknown[] = [];
  let cursor: string | undefined;
  let pages = 0;

  while (posts.length < opts.limit) {
    const batchSize = Math.min(100, opts.limit - posts.length);
    const result = await omni.colony.getFeed({
      limit: batchSize,
      category: opts.category,
      cursor,
    });
    if (!result?.ok) {
      return {
        ok: false,
        posts,
        pages,
        error: result?.error ?? "feed_not_ok",
      };
    }

    const batch = Array.isArray(result.data?.posts) ? result.data.posts : [];
    if (batch.length === 0) {
      break;
    }

    posts.push(...batch);
    pages += 1;

    if (!result.data?.hasMore) {
      break;
    }

    const last = batch[batch.length - 1];
    const nextCursor = last && typeof last === "object" ? (last as { txHash?: unknown }).txHash : undefined;
    if (typeof nextCursor !== "string" || nextCursor.length === 0) {
      break;
    }
    cursor = nextCursor;
  }

  return {
    ok: true,
    posts,
    pages,
  };
}

async function chooseCandidateWithEvidence(
  candidates: any[],
): Promise<{
  selected: any;
  attestationPlan: any;
  evidence: { ok: true; summary: any };
} | null> {
  for (const candidate of candidates) {
    const attestationPlan = buildMinimalAttestationPlanFromUrls({
      topic: candidate.text.slice(0, 120),
      urls: candidate.sourceAttestationUrls,
      minSupportingSources: 0,
    });
    if (!attestationPlan.primary) continue;

    const evidence = await fetchResearchEvidenceSummary({
      source: attestationPlan.primary,
      topic: candidate.text,
    });
    if (!evidence.ok) continue;

    return {
      selected: candidate,
      attestationPlan,
      evidence,
    };
  }

  return null;
}

function buildReplyPrompt(
  candidate: ReplyExperimentCandidate,
  evidenceSummary: {
    source: string;
    url: string;
    fetchedAt: string;
    values: Record<string, string>;
    derivedMetrics: Record<string, string>;
  },
): string {
  const parentRef = `${candidate.author} ${candidate.txHash.slice(0, 12)}`;
  const valueLines = Object.entries(evidenceSummary.values)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");
  const derivedLines = Object.entries(evidenceSummary.derivedMetrics)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");

  return [
    `Parent post (${parentRef})`,
    `Score/agrees/replies: ${candidate.score ?? "n/a"} / ${candidate.agreeCount} / ${candidate.replyCount}`,
    `Parent text: ${candidate.text}`,
    "",
    `Fresh attested evidence from ${evidenceSummary.source} (${evidenceSummary.url}) fetched ${evidenceSummary.fetchedAt}:`,
    valueLines || "- no primary values extracted",
    derivedLines ? `Derived metrics:\n${derivedLines}` : "",
    "",
    "Write one compact ANALYSIS reply.",
    "Requirements:",
    "- Add one new numeric data point not already visible in the parent text.",
    "- Sharpen, qualify, or overturn the parent read with a committed implication.",
    "- Use plain prose only; no labels, bullets, markdown, or operational narration.",
    "- Avoid hedged dismissals like 'just drift', 'noise', or 'nothing is happening'.",
    "- End with the watcher or invalidation condition if you can do it without bloat.",
    "- Stay between 200 and 320 characters.",
  ].filter(Boolean).join("\n");
}

function normalizeDraftText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/^Reply:\s*/i, "")
    .trim();
}

async function generateReplyDraft(
  provider: { complete(prompt: string, opts: Record<string, unknown>): Promise<string> } | null | undefined,
  prompt: string,
): Promise<string | null> {
  if (!provider) return null;
  const text = await provider.complete(prompt, {
    system: "You write compact, evidence-bound colony replies. Reuse at least one exact numeric value from the evidence packet, add one new numeric data point beyond the parent text, sharpen or qualify the parent claim with a committed implication, and keep the reply in roughly the 200-320 character band. No operational language, no markdown, and no hedged dismissals.",
    maxTokens: 110,
    modelTier: "standard",
  });
  return normalizeDraftText(text);
}

function shouldRetryReplyDraft(reason: string | null | undefined): boolean {
  const value = reason ?? "";
  return value.includes("evidence-number-overlap") || value.includes("new-data-point-vs-parent");
}

function buildReplyRetryPrompt(prompt: string, firstDraft: string, failureReason: string | null | undefined): string {
  return [
    prompt,
    "",
    "Your first draft failed the hard reply gate.",
    `Failure: ${failureReason ?? "unknown"}`,
    `First draft: ${firstDraft}`,
    "",
    "Rewrite the reply now.",
    "Hard requirements for the rewrite:",
    "- Reuse at least one exact numeric value from the evidence packet verbatim.",
    "- Add one new numeric value not already visible in the parent text.",
    "- Keep the reply between 200 and 320 characters.",
    "- Keep the implication committed and readable.",
  ].join("\n");
}

function getPositiveInt(flag: string, fallback: number): number {
  const raw = getStringArg(args, flag);
  if (raw == null) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${flag} value: ${raw}`);
  }
  return parsed;
}

function getOptionalPositiveInt(flag: string): number | undefined {
  const raw = getStringArg(args, flag);
  if (raw == null) return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${flag} value: ${raw}`);
  }
  return parsed;
}

function cycleRecordPath(stateDir: string, startedAt: string, cycleId: string): string {
  return resolve(stateDir, "runs", startedAt.slice(0, 10), `${cycleId}.json`);
}

async function maybeWriteOutput(path: string | undefined, report: unknown): Promise<void> {
  if (!path) return;
  const resolved = resolve(path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}
