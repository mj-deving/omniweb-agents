#!/usr/bin/env npx tsx
/**
 * check-publish-visibility.ts — repeated live publish/reply visibility harness.
 *
 * Default behavior is non-destructive and prints the planned run. Passing
 * `--broadcast` executes real wallet-backed publish probes using explicit
 * operator-supplied live text, plus an optional reply probe, then measures
 * whether the returned tx hashes become visible via the indexed API surface
 * within the verification window.
 *
 * Output: JSON to stdout. Errors to stderr. Exit 0 when all attempted actions
 * become indexed-visible, 1 on runtime failure or degraded visibility, 2 on
 * invalid args.
 */

import { getNumberArg, getStringArg, hasFlag } from "./_shared.ts";
import { runDirectAttestedWrite } from "./_direct-attested-write.ts";
import { assertLiveColonyCopy } from "./_live-colony-copy-guard.js";
import { readRuntimeBalanceTruth, type RuntimeBalanceTruth } from "./_runtime-balance-truth.js";
import {
  describePublishVisibilityResult,
  summarizePublishVisibilityAttempts,
} from "./_publish-visibility-summary.ts";

const DEFAULT_ATTEST_URL = "https://blockchain.info/ticker";
const DEFAULT_CATEGORY = "OBSERVATION";
const DEFAULT_REPLY_CATEGORY = "ANALYSIS";

type AttemptKind = "publish" | "reply";

interface ProbeAttempt {
  laneStatus?: ReturnType<typeof classifyAttemptLaneStatus>;
  kind: AttemptKind;
  run: number;
  draft: {
    text: string;
    category: string;
    attestUrl: string;
    parentTxHash?: string;
  };
  accepted: boolean;
  publishLatencyMs?: number;
  txHash?: string;
  attestationTxHash?: string;
  provenancePath?: string;
  visibility?: Awaited<ReturnType<typeof verifyPublishVisibility>>;
  visibilitySummary?: ReturnType<typeof describePublishVisibilityResult>;
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
  };
}

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-publish-visibility.ts [options]

Options:
  --runs N                Number of publish probes to execute (default: 1)
  --reply-after-publish   Execute one reply probe after each successful publish
  --text TEXT             Explicit non-operational text for the publish attempt
  --reply-text TEXT       Explicit non-operational text for the reply attempt
  --category CAT          Publish category (default: OBSERVATION)
  --reply-category CAT    Reply category (default: ANALYSIS)
  --attest-url URL        Attestation URL (default: Blockchain.info ticker JSON)
  --state-dir PATH        Override state directory for guard persistence
  --feed-timeout-ms N     Visibility polling deadline (default: 45000)
  --feed-poll-ms N        Delay between visibility polls (default: 3000)
  --feed-limit N          Recent feed window to scan (default: 25)
  --allow-insecure        Allow HTTP attest URLs (local dev only)
  --broadcast             Execute real live writes
  --help, -h              Show this help

Output: JSON publish-visibility report
Exit codes: 0 = indexed visibility confirmed for all attempted writes,
            1 = runtime failure or one or more writes stayed degraded,
            2 = invalid args`);
  process.exit(0);
}

for (const flag of [
  "--runs",
  "--text",
  "--reply-text",
  "--category",
  "--reply-category",
  "--attest-url",
  "--state-dir",
  "--feed-timeout-ms",
  "--feed-poll-ms",
  "--feed-limit",
]) {
  const index = args.indexOf(flag);
  if (index >= 0 && !args[index + 1]) {
    console.error(`Error: ${flag} requires a value`);
    process.exit(2);
  }
}

const runs = getIntegerArgOrExit("--runs", 1);
const text = getStringArg(args, "--text") ?? null;
const replyText = getStringArg(args, "--reply-text") ?? null;
const category = getStringArg(args, "--category") ?? DEFAULT_CATEGORY;
const replyCategory = getStringArg(args, "--reply-category") ?? DEFAULT_REPLY_CATEGORY;
const attestUrl = getStringArg(args, "--attest-url") ?? DEFAULT_ATTEST_URL;
const stateDir = getStringArg(args, "--state-dir");
const feedTimeoutMs = getIntegerArgOrExit("--feed-timeout-ms", 45_000);
const feedPollMs = getIntegerArgOrExit("--feed-poll-ms", 3_000);
const feedLimit = getIntegerArgOrExit("--feed-limit", 25);
const replyAfterPublish = hasFlag(args, "--reply-after-publish");
const allowInsecureUrls = hasFlag(args, "--allow-insecure");
const broadcast = hasFlag(args, "--broadcast");

if (runs <= 0 || feedTimeoutMs <= 0 || feedPollMs <= 0 || feedLimit <= 0) {
  console.error("Error: numeric arguments must be positive integers");
  process.exit(2);
}

try {
  const connect = await loadConnect();
  const omni = await connect({ stateDir, allowInsecureUrls });
  const initialBalance = await readRuntimeBalanceTruth(omni);

  const initialLaneStatus = classifyAttemptLaneStatus(undefined, initialBalance);

  if (!broadcast) {
    console.log(JSON.stringify({
      attempted: false,
      ok: initialLaneStatus.status === "ready",
      address: omni.address,
      stateDir: stateDir ?? "(default)",
      runs,
      replyAfterPublish,
      attestUrl,
      category,
      replyCategory,
      feedTimeoutMs,
      feedPollMs,
      feedLimit,
      runtime: buildRuntimeContext(omni, initialBalance),
      initialBalance,
      laneStatus: initialLaneStatus,
      plannedAttempts: buildPlan({
        runs,
        replyAfterPublish,
        text,
        replyText,
        category,
        replyCategory,
        attestUrl,
      }),
      message: "Dry run only. Re-run with --broadcast to execute real publish/reply visibility probes.",
    }, null, 2));
    process.exit(0);
  }

  if (initialLaneStatus.status !== "ready") {
    console.log(JSON.stringify({
      attempted: false,
      ok: false,
      checkedAt: new Date().toISOString(),
      address: omni.address,
      stateDir: stateDir ?? "(default)",
      runs,
      replyAfterPublish,
      attestUrl,
      category,
      replyCategory,
      feedTimeoutMs,
      feedPollMs,
      feedLimit,
      runtime: buildRuntimeContext(omni, initialBalance),
      initialBalance,
      laneStatus: initialLaneStatus,
      plannedAttempts: buildPlan({
        runs,
        replyAfterPublish,
        text,
        replyText,
        category,
        replyCategory,
        attestUrl,
      }),
      message: "Broadcast aborted before any live write attempt because the lane is already blocked upstream.",
    }, null, 2));
    process.exit(1);
  }

  const attempts: ProbeAttempt[] = [];
  if (!text) {
    throw new Error("Live publish visibility checks now require explicit --text.");
  }
  assertLiveColonyCopy(text, "Publish visibility text");
  if (replyAfterPublish) {
    if (!replyText) {
      throw new Error("Reply visibility checks now require explicit --reply-text.");
    }
    assertLiveColonyCopy(replyText, "Reply visibility text");
  }

  for (let run = 1; run <= runs; run += 1) {
    const publishDraft = buildPublishDraft({
      run,
      text,
      category,
      attestUrl,
    });
    const publishAttempt = await executePublishAttempt(omni, run, publishDraft);
    attempts.push(publishAttempt);

    if (!replyAfterPublish || !publishAttempt.accepted || !publishAttempt.txHash) {
      continue;
    }

    const replyDraft = buildReplyDraft({
      run,
      replyText,
      category: replyCategory,
      attestUrl,
      parentTxHash: publishAttempt.txHash,
    });
    const replyAttempt = await executeReplyAttempt(omni, run, replyDraft);
    attempts.push(replyAttempt);
  }

  const finalBalance = await readRuntimeBalanceTruth(omni);
  const summary = summarizeAttempts(attempts);
  const laneStatus = classifyLaneStatus({ attempts, initialBalance, finalBalance });
  const ok = summary.failedCount === 0 && summary.acceptedCount > 0 && laneStatus.status === "ready";

  console.log(JSON.stringify({
    attempted: true,
    ok,
    checkedAt: new Date().toISOString(),
    address: omni.address,
    stateDir: stateDir ?? "(default)",
    runs,
    replyAfterPublish,
    attestUrl,
    category,
    replyCategory,
    feedTimeoutMs,
    feedPollMs,
    feedLimit,
    runtime: buildRuntimeContext(omni, finalBalance),
    initialBalance,
    finalBalance,
    balanceDeltaDem: balanceDelta(initialBalance.effectiveDem, finalBalance.effectiveDem),
    laneStatus,
    summary,
    attempts,
  }, null, 2));

  process.exit(ok ? 0 : 1);
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

function getIntegerArgOrExit(flag: string, fallback: number): number {
  const parsed = getNumberArg(args, flag);
  if (parsed === undefined) return fallback;
  if (!Number.isInteger(parsed)) {
    console.error(`Error: ${flag} must be an integer`);
    process.exit(2);
  }
  return parsed;
}

function buildPlan(opts: {
  runs: number;
  replyAfterPublish: boolean;
  text: string | null;
  replyText: string | null;
  category: string;
  replyCategory: string;
  attestUrl: string;
}): Array<{ kind: AttemptKind; run: number; category: string; attestUrl: string }> {
  const plan: Array<{ kind: AttemptKind; run: number; category: string; attestUrl: string }> = [];
  for (let run = 1; run <= opts.runs; run += 1) {
    plan.push({
      kind: "publish",
      run,
      category: opts.category,
      attestUrl: opts.attestUrl,
    });
    if (opts.replyAfterPublish) {
      plan.push({
        kind: "reply",
        run,
        category: opts.replyCategory,
        attestUrl: opts.attestUrl,
      });
    }
  }
  return plan;
}

function buildPublishDraft(opts: {
  run: number;
  text: string;
  category: string;
  attestUrl: string;
}): { text: string; category: string; attestUrl: string } {
  return {
    text: appendRunTag(opts.text, opts.run),
    category: opts.category,
    attestUrl: opts.attestUrl,
  };
}

function buildReplyDraft(opts: {
  run: number;
  replyText: string;
  category: string;
  attestUrl: string;
  parentTxHash: string;
}): { text: string; category: string; attestUrl: string; parentTxHash: string } {
  return {
    text: appendRunTag(opts.replyText, opts.run),
    category: opts.category,
    attestUrl: opts.attestUrl,
    parentTxHash: opts.parentTxHash,
  };
}

async function executePublishAttempt(
  omni: any,
  run: number,
  draft: { text: string; category: string; attestUrl: string },
): Promise<ProbeAttempt> {
  const verifyPublishVisibility = await loadVerifyPublishVisibility();
  const write = await runDirectAttestedWrite({
    omni,
    kind: "publish",
    draft,
    verifyPublishVisibility,
    verification: {
      timeoutMs: feedTimeoutMs,
      pollMs: feedPollMs,
      limit: feedLimit,
    },
  });

  const visibility = write.visibility as Awaited<ReturnType<typeof verifyPublishVisibility>> | undefined;

  return {
    kind: "publish",
    run,
    draft,
    accepted: write.accepted,
    publishLatencyMs: write.publishLatencyMs,
    txHash: write.txHash,
    attestationTxHash: write.attestationTxHash,
    provenancePath: write.provenancePath,
    visibility,
    visibilitySummary: describePublishVisibilityResult(visibility),
    error: write.accepted ? undefined : normalizeError(write.error, "UNKNOWN", "Unknown publish failure"),
    laneStatus: classifyAttemptLaneStatus(write.error, await readRuntimeBalanceTruth(omni)),
  };
}

async function executeReplyAttempt(
  omni: any,
  run: number,
  draft: { text: string; category: string; attestUrl: string; parentTxHash: string },
): Promise<ProbeAttempt> {
  const verifyPublishVisibility = await loadVerifyPublishVisibility();
  const write = await runDirectAttestedWrite({
    omni,
    kind: "reply",
    draft,
    verifyPublishVisibility,
    verification: {
      timeoutMs: feedTimeoutMs,
      pollMs: feedPollMs,
      limit: feedLimit,
    },
  });

  const visibility = write.visibility as Awaited<ReturnType<typeof verifyPublishVisibility>> | undefined;

  return {
    kind: "reply",
    run,
    draft,
    accepted: write.accepted,
    publishLatencyMs: write.publishLatencyMs,
    txHash: write.txHash,
    attestationTxHash: write.attestationTxHash,
    provenancePath: write.provenancePath,
    visibility,
    visibilitySummary: describePublishVisibilityResult(visibility),
    error: write.accepted ? undefined : normalizeError(write.error, "UNKNOWN", "Unknown reply failure"),
    laneStatus: classifyAttemptLaneStatus(write.error, await readRuntimeBalanceTruth(omni)),
  };
}

function summarizeAttempts(attempts: ProbeAttempt[]) {
  return summarizePublishVisibilityAttempts(attempts);
}

function buildRuntimeContext(omni: any, balance: RuntimeBalanceTruth) {
  return {
    rpcUrl: omni?.runtime?.rpcUrl ?? null,
    address: omni?.address ?? null,
    chainBlockNumber: balance.chainBlockNumber,
  };
}

function classifyAttemptLaneStatus(
  error: { code?: string; message?: string } | undefined,
  balance: RuntimeBalanceTruth,
): { status: "ready" | "blocked_upstream"; blocker?: string; message?: string } {
  if (balance.divergence.blocksWriteReadiness) {
    return {
      status: "blocked_upstream",
      blocker: "node_api_balance_divergence",
      message: balance.divergence.message,
    };
  }

  const message = error?.message ?? "";
  if (/startProxy\(\) timed out|startproxy timeout|web2 proxy|proxy session/i.test(message)) {
    return {
      status: "blocked_upstream",
      blocker: "dahr_web2_proxy_failure",
      message,
    };
  }

  return { status: "ready" };
}

function classifyLaneStatus(opts: {
  attempts: ProbeAttempt[];
  initialBalance: RuntimeBalanceTruth;
  finalBalance: RuntimeBalanceTruth;
}): { status: "ready" | "blocked_upstream" | "degraded_visibility"; blocker?: string; message?: string } {
  if (opts.initialBalance.divergence.blocksWriteReadiness || opts.finalBalance.divergence.blocksWriteReadiness) {
    return {
      status: "blocked_upstream",
      blocker: "node_api_balance_divergence",
      message: opts.initialBalance.divergence.message ?? opts.finalBalance.divergence.message,
    };
  }

  const proxyAttempt = opts.attempts.find((attempt) => attempt.laneStatus?.blocker === "dahr_web2_proxy_failure");
  if (proxyAttempt?.laneStatus?.message) {
    return {
      status: "blocked_upstream",
      blocker: "dahr_web2_proxy_failure",
      message: proxyAttempt.laneStatus.message,
    };
  }

  if (opts.attempts.some((attempt) => attempt.accepted && !attempt.visibility?.indexedVisible)) {
    return {
      status: "degraded_visibility",
      blocker: "visibility_not_indexed",
      message: "One or more accepted writes did not become indexed-visible within the verification window.",
    };
  }

  return { status: "ready" };
}

function appendRunTag(text: string, run: number): string {
  if (run === 1) {
    return text;
  }
  return `${text} [run ${run}]`;
}

function balanceDelta(initialBalance: number | null, finalBalance: number | null): number | null {
  if (initialBalance === null || finalBalance === null) {
    return null;
  }
  return Number((finalBalance - initialBalance).toFixed(6));
}

function normalizeError(
  error: { code?: string; message?: string; retryable?: boolean } | undefined,
  fallbackCode: string,
  fallbackMessage: string,
): { code: string; message: string; retryable?: boolean } {
  return {
    code: error?.code ?? fallbackCode,
    message: error?.message ?? fallbackMessage,
    retryable: error?.retryable,
  };
}

async function loadConnect(): Promise<(opts?: {
  stateDir?: string;
  allowInsecureUrls?: boolean;
}) => Promise<any>> {
  try {
    const mod = await import("../dist/runtime.js");
    if (typeof mod.connect === "function") {
      return mod.connect;
    }
  } catch {
    // Fall back to source during local development before build output exists.
  }

  const mod = await import("../src/runtime.ts");
  if (typeof mod.connect !== "function") {
    throw new Error("connect() export not found in dist/runtime.js or src/runtime.ts");
  }
  return mod.connect;
}

async function loadVerifyPublishVisibility(): Promise<typeof import("../src/publish-visibility.ts")["verifyPublishVisibility"]> {
  try {
    const mod = await import("../dist/publish-visibility.js");
    if (typeof mod.verifyPublishVisibility === "function") {
      return mod.verifyPublishVisibility;
    }
  } catch {
    // Fall back to source during local development before build output exists.
  }

  const mod = await import("../src/publish-visibility.ts");
  if (typeof mod.verifyPublishVisibility !== "function") {
    throw new Error("verifyPublishVisibility() export not found in dist/publish-visibility.js or src/publish-visibility.ts");
  }
  return mod.verifyPublishVisibility;
}
