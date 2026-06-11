#!/usr/bin/env -S bunx tsx

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  PublishDraftSchema,
  checkAndRecordDedup,
  getWriteRateRemaining,
  validateInput,
  validateUrl,
} from "../src/publish-readiness-support.js";
import {
  REPO_ROOT,
  getNumberArg,
  getStringArg,
  hasFlag,
  loadConnect,
  loadPackageExport,
} from "./_shared.ts";
import {
  analyzeAttestUrlDiagnostics,
  buildAttestUrlWarnings,
} from "./_publish-readiness-shared.js";
import { runDirectSupervisedPublish } from "./_supervised-direct-publish.ts";
import {
  buildPendingVerdictEntry,
  DEFAULT_PENDING_VERDICT_PATH,
  enqueuePendingVerdict,
} from "./_supervised-verdict-queue.ts";
import { scheduleSupervisedVerdict } from "./_supervised-publish-verdict.js";

const DEFAULT_CATEGORY = "ANALYSIS";
const DEFAULT_CONFIDENCE = 70;
const DEFAULT_SOURCE_AGENT = "sentinel";
const SUPPORTED_SOURCE_AGENTS = ["sentinel", "crawler", "pioneer"] as const;

type SourceAgent = typeof SUPPORTED_SOURCE_AGENTS[number];

type SourceRecord = {
  id: string;
  name: string;
  provider: string;
  status: string;
  trustTier: string;
  responseFormat: string;
  dahr_safe?: boolean;
  tlsn_safe?: boolean;
  note?: string | null;
  url: string;
  rating: {
    overall: number;
  };
};

type SourceView = {
  sources: SourceRecord[];
};

type WorkflowCheckResult = {
  name: string;
  pass: boolean;
  severity: "blocker" | "warning" | "info";
  detail: string;
};

type AttestationWorkflowReport = {
  ok: boolean;
  sourceCatalog: {
    sourceCount: number;
  };
  blockers?: WorkflowCheckResult[];
  warnings?: WorkflowCheckResult[];
  [key: string]: unknown;
};

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: bunx tsx packages/omniweb-toolkit/scripts/check-supervised-analysis.ts [options]

Options:
  --text TEXT                  Required ANALYSIS post body
  --attest-url URL             Required primary attestation URL used for publish()
  --supporting-url URL         Supporting evidence URL (repeatable; use at least one)
  --topic TEXT                 Optional topic label for attestation workflow scoring
  --confidence N               Optional confidence percentage (0-100, default: 70)
  --source-name TEXT           Optional source label for audit output
  --source-agent NAME          Source-catalog scope: sentinel | crawler | pioneer (default: sentinel)
  --env-path PATH              Override wallet credentials file passed to connect()
  --agent-name NAME            Use ~/.config/demos/credentials-NAME if present
  --state-dir PATH             Forwarded to connect()/state persistence
  --allow-insecure             Forwarded to runtime + attestation preflight for local debugging only
  --record-pending-verdict     Queue a delayed follow-up using the ANALYSIS verdict schedule
  --pending-verdict-queue P    Override the pending verdict queue path
  --verify-timeout-ms N        Visibility verification timeout (default: 45000)
  --verify-poll-ms N           Visibility poll interval (default: 5000)
  --verify-limit N             Feed limit for visibility checks (default: 50)
  --dry-run                    Build the cycle record without spending DEM
  --out PATH                   Write the JSON report to a file as well as stdout
  --help, -h                   Show this help
`);
  process.exit(0);
}

const text = getRequiredArg("--text");
const attestUrl = getRequiredArg("--attest-url");
const supportingUrls = getMultiStringArgs("--supporting-url");
const topic = getStringArg(args, "--topic")?.trim() || null;
const confidence = getOptionalNumber("--confidence", DEFAULT_CONFIDENCE, 0, 100);
const sourceName = getStringArg(args, "--source-name") ?? null;
const sourceAgent = parseSourceAgent(getStringArg(args, "--source-agent") ?? DEFAULT_SOURCE_AGENT);
const envPath = getStringArg(args, "--env-path");
const agentName = getStringArg(args, "--agent-name") ?? null;
const stateDir = getStringArg(args, "--state-dir");
const allowInsecureUrls = hasFlag(args, "--allow-insecure");
const recordPendingVerdict = hasFlag(args, "--record-pending-verdict");
const pendingVerdictQueuePath = getStringArg(args, "--pending-verdict-queue") ?? DEFAULT_PENDING_VERDICT_PATH;
const verifyTimeoutMs = getPositiveInt("--verify-timeout-ms", 45_000);
const verifyPollMs = getPositiveInt("--verify-poll-ms", 5_000);
const verifyLimit = getPositiveInt("--verify-limit", 50);
const dryRun = hasFlag(args, "--dry-run");
const outputPath = getStringArg(args, "--out");

if (!sourceAgent) {
  throw new Error(`Invalid --source-agent value. Expected one of: ${SUPPORTED_SOURCE_AGENTS.join(", ")}`);
}

if (supportingUrls.length === 0) {
  throw new Error("At least one --supporting-url is required for the supervised multi-source ANALYSIS lane.");
}

const loadAgentSourceView = await loadPackageExport<
  (agent: SourceAgent, catalogPath: string, overridePath: string, mode: string) => SourceView
>("../dist/attestation-workflow-support.js", "../src/attestation-workflow-support.ts", "loadAgentSourceView");
const evaluateAttestationWorkflow = await loadPackageExport<
  (input: {
    attestUrl: string;
    supportingUrls: string[];
    topic: string | null;
    text: string | null;
    category: string;
    confidence?: number;
    allowInsecure: boolean;
  }, options: { sourceView: SourceView }) => Promise<AttestationWorkflowReport>
>("../dist/attestation-workflow-check.js", "../src/attestation-workflow-check.ts", "evaluateAttestationWorkflow");
const buildMinimalAttestationPlanFromUrls = await loadPackageExport<
  (opts: {
    topic: string;
    agent: string;
    urls: string[];
  }) => unknown
>("../dist/agent.js", "../src/agent.ts", "buildMinimalAttestationPlanFromUrls");
const verifyPublishVisibility = await loadPackageExport<
  (omni: unknown, txHash: string | undefined, text: string, opts: {
    timeoutMs: number;
    pollMs: number;
    limit: number;
  }) => Promise<unknown>
>("../dist/publish-visibility.js", "../src/publish-visibility.ts", "verifyPublishVisibility");

const createSessionFromRuntime = await loadPackageExport<
  (runtime: unknown, options: { stateDir?: string; allowInsecureUrls?: boolean }) => Promise<any>
>("../dist/session-factory.js", "../src/session-factory.ts", "createSessionFromRuntime");

const connect = await loadConnect();
const omni = await connect({ envPath, agentName, stateDir, allowInsecureUrls });
const session = await createSessionFromRuntime(omni.runtime, { stateDir, allowInsecureUrls });
const authToken = await omni.runtime.getToken();
const balanceResult = await omni.colony.getBalance();
const chainBalanceResult = await omni.chain.getBalance(omni.address);
const feedResult = await omni.colony.getFeed({ limit: 3 });
const balanceOk = balanceResult?.ok === true;
const chainBalanceOk = chainBalanceResult?.ok === true;
const feedOk = feedResult?.ok === true;
const schemaError = validateInput(PublishDraftSchema, {
  text,
  category: DEFAULT_CATEGORY,
  attestUrl,
});
const urlCheck = await validateUrl(attestUrl, { allowInsecure: allowInsecureUrls });
const attestUrlDiagnostics = analyzeAttestUrlDiagnostics(attestUrl, { probeAttest: false });
const writeRate = await getWriteRateRemaining(session.stateStore, session.walletAddress);
const dedupError = await checkAndRecordDedup(session.stateStore, session.walletAddress, text, false);
const warnings = buildAttestUrlWarnings(attestUrlDiagnostics);

const balanceData = balanceOk
  ? balanceResult.data as { balance?: number; available?: number; cached?: boolean }
  : null;
const colonyBalance = Number(balanceData?.balance ?? balanceData?.available ?? 0);
const chainBalance = Number(chainBalanceResult?.balance ?? 0);
const useChainBalance = chainBalanceOk && chainBalance > 0 && (!balanceOk || colonyBalance <= 0);
const effectiveBalance = useChainBalance ? chainBalance : colonyBalance;

const publishReadinessBlockers: string[] = [];
if (!authToken) publishReadinessBlockers.push("token_unavailable");
if (!balanceOk && !chainBalanceOk) publishReadinessBlockers.push("balance_unavailable");
if (effectiveBalance <= 0) publishReadinessBlockers.push("insufficient_dem");
if (!feedOk) publishReadinessBlockers.push("feed_unavailable");
if (schemaError) publishReadinessBlockers.push("draft_invalid");
if (!urlCheck.valid) publishReadinessBlockers.push("attest_url_blocked");
if (writeRate.hourlyRemaining <= 0) publishReadinessBlockers.push("hourly_limit_reached");
if (writeRate.dailyRemaining <= 0) publishReadinessBlockers.push("daily_limit_reached");
if (dedupError) publishReadinessBlockers.push("duplicate_text");

const publishReadiness = {
  ok: publishReadinessBlockers.length === 0,
  address: omni.address,
  stateDir: stateDir ?? "(default)",
  auth: {
    tokenAvailable: !!authToken,
    sdkBridgeApiAccess: omni.runtime.sdkBridge.apiAccess,
  },
  draft: {
    category: DEFAULT_CATEGORY,
    textLength: text.length,
    attestUrl,
  },
  warnings,
  checks: {
    connect: true,
    tokenAvailable: !!authToken,
    balance: {
      ok: balanceOk || chainBalanceOk,
      dem: effectiveBalance,
      source: useChainBalance ? "chain_fallback" : "colony",
      colony: {
        ok: balanceOk,
        dem: colonyBalance,
        cached: balanceData?.cached,
        error: balanceOk ? undefined : balanceResult?.error ?? { code: "UNAVAILABLE", message: "Balance result unavailable" },
      },
      chain: {
        ok: chainBalanceOk,
        dem: chainBalance,
        error: chainBalanceOk ? undefined : chainBalanceResult?.error ?? { code: "UNAVAILABLE", message: "Chain balance unavailable" },
      },
    },
    feedRead: {
      ok: feedOk,
      count: feedOk
        ? Array.isArray((feedResult.data as { posts?: unknown[] })?.posts)
          ? (feedResult.data as { posts: unknown[] }).posts.length
          : 0
        : 0,
      error: feedOk ? undefined : feedResult?.error ?? { code: "UNAVAILABLE", message: "Feed result unavailable" },
    },
    draftSchema: schemaError
      ? { ok: false, code: schemaError.code, message: schemaError.message }
      : { ok: true },
    urlValidation: urlCheck.valid
      ? { ok: true }
      : { ok: false, reason: urlCheck.reason ?? "unknown" },
    attestUrlDiagnostics,
    writeRate,
    dedup: dedupError
      ? { ok: false, code: dedupError.code, message: dedupError.message }
      : { ok: true },
  },
  blockers: publishReadinessBlockers,
};

const catalogPath = resolve(REPO_ROOT, "config", "sources", "catalog.json");
const sourceView = loadAgentSourceView(sourceAgent, catalogPath, catalogPath, "catalog-only");
const attestationWorkflow = await evaluateAttestationWorkflow({
  attestUrl,
  supportingUrls,
  topic,
  text,
  category: DEFAULT_CATEGORY,
  confidence,
  allowInsecure: allowInsecureUrls,
}, { sourceView });

if (!publishReadiness.ok || !attestationWorkflow.ok) {
  const report = {
    ok: false,
    checkedAt: new Date().toISOString(),
    category: DEFAULT_CATEGORY,
    sourceAgent,
    topic,
    sourceName,
    primaryAttestUrl: attestUrl,
    supportingUrls,
    confidence,
    publishReadiness,
    attestationWorkflow,
    blockers: [
      ...publishReadiness.blockers,
      ...normalizeWorkflowBlockers(attestationWorkflow.blockers ?? []),
    ],
  };

  await maybeWriteOutput(outputPath, report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

const attestationPlan = buildMinimalAttestationPlanFromUrls({
  topic: topic ?? "supervised-analysis",
  agent: "analysis-check",
  urls: [attestUrl, ...supportingUrls],
});

const decision = {
  kind: "publish",
  category: DEFAULT_CATEGORY,
  text,
  attestUrl,
  confidence,
  attestationPlan,
  facts: {
    sourceName,
    primaryAttestUrl: attestUrl,
    supportingUrls,
    attestationWorkflow,
    publishReadiness,
  },
  audit: {
    promptPacket: {
      objective: "Publish one supervised multi-source ANALYSIS post with explicit primary and supporting evidence readiness.",
      topic,
      confidence,
      sourceName,
      primaryAttestUrl: attestUrl,
      supportingUrls,
      attestationWorkflow,
      publishReadiness,
    },
  },
} as const;

const record = await runDirectSupervisedPublish({
  omni,
  dryRun,
  stateDir,
  decision,
  verifyPublishVisibility,
  verification: {
    timeoutMs: verifyTimeoutMs,
    pollMs: verifyPollMs,
    limit: verifyLimit,
  },
});

let pendingVerdict: {
  id: string;
  queuePath: string;
  checkAt: string;
  inserted: boolean;
} | null = null;

if (recordPendingVerdict && record.outcome.status === "published" && record.outcome.txHash) {
  const verdictSchedule = scheduleSupervisedVerdict(DEFAULT_CATEGORY, record.startedAt);
  const queued = await enqueuePendingVerdict(buildPendingVerdictEntry({
    txHash: record.outcome.txHash,
    category: DEFAULT_CATEGORY,
    text,
    startedAt: record.startedAt,
    sourceRunPath: null,
    stateDir: record.stateDir,
    checkAfterMs: verdictSchedule.followUpEarliestMs,
  }), pendingVerdictQueuePath);

  pendingVerdict = {
    id: queued.entry.id,
    queuePath: pendingVerdictQueuePath,
    checkAt: queued.entry.checkAt,
    inserted: queued.inserted,
  };
}

const report = {
  ok: record.outcome.status === "published" || record.outcome.status === "dry_run",
  checkedAt: new Date().toISOString(),
  category: DEFAULT_CATEGORY,
  sourceAgent,
  topic,
  sourceName,
  primaryAttestUrl: attestUrl,
  supportingUrls,
  confidence,
  verdictSchedule: scheduleSupervisedVerdict(DEFAULT_CATEGORY, record.startedAt),
  pendingVerdict,
  publishReadiness,
  attestationWorkflow,
  record,
};

await maybeWriteOutput(outputPath, report);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);

function getRequiredArg(flag: string): string {
  const value = getStringArg(args, flag);
  if (!value) throw new Error(`Missing required ${flag}`);
  return value;
}

function getOptionalNumber(flag: string, fallback: number, min: number, max: number): number {
  const raw = getStringArg(args, flag);
  if (raw == null) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`Invalid ${flag} value: ${raw}`);
  }
  return parsed;
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

function getMultiStringArgs(flag: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index++) {
    if (args[index] === flag && args[index + 1]) {
      values.push(args[index + 1]);
    }
  }
  return values;
}

function parseSourceAgent(value: string): SourceAgent | null {
  return (SUPPORTED_SOURCE_AGENTS as readonly string[]).includes(value) ? value as SourceAgent : null;
}

function normalizeWorkflowBlockers(blockers: WorkflowCheckResult[]): string[] {
  return blockers.map((blocker) => blocker.name);
}

async function maybeWriteOutput(path: string | undefined, report: unknown): Promise<void> {
  if (!path) return;
  const resolvedPath = resolve(path);
  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}
