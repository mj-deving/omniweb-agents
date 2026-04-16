#!/usr/bin/env npx tsx
/**
 * check-publish-visibility.ts — repeated live publish/reply visibility harness.
 *
 * Default behavior is non-destructive and prints the planned run. Passing
 * `--broadcast` executes real wallet-backed publish probes and optional reply
 * probes, then measures whether the returned tx hashes become visible via the
 * indexed API surface within the verification window.
 *
 * Output: JSON to stdout. Errors to stderr. Exit 0 when all attempted actions
 * become indexed-visible, 1 on runtime failure or degraded visibility, 2 on
 * invalid args.
 */

import { getNumberArg, getStringArg, hasFlag } from "./_shared.ts";
import { verifyPublishVisibility } from "../src/publish-visibility.ts";

const DEFAULT_ATTEST_URL = "https://blockchain.info/ticker";
const DEFAULT_CATEGORY = "OBSERVATION";
const DEFAULT_REPLY_CATEGORY = "ANALYSIS";
const DEFAULT_TEXT_PREFIX = "Publish visibility verification";
const DEFAULT_REPLY_PREFIX = "Reply visibility verification";

type AttemptKind = "publish" | "reply";

interface ProbeAttempt {
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
  --text-prefix TEXT      Prefix for generated publish probe text
  --reply-prefix TEXT     Prefix for generated reply probe text
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
  "--text-prefix",
  "--reply-prefix",
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
const textPrefix = getStringArg(args, "--text-prefix") ?? DEFAULT_TEXT_PREFIX;
const replyPrefix = getStringArg(args, "--reply-prefix") ?? DEFAULT_REPLY_PREFIX;
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
  const initialBalance = await readBalance(omni);

  if (!broadcast) {
    console.log(JSON.stringify({
      attempted: false,
      ok: true,
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
      initialBalanceDem: initialBalance,
      plannedAttempts: buildPlan({
        runs,
        replyAfterPublish,
        textPrefix,
        replyPrefix,
        category,
        replyCategory,
        attestUrl,
      }),
      message: "Dry run only. Re-run with --broadcast to execute real publish/reply visibility probes.",
    }, null, 2));
    process.exit(0);
  }

  const attempts: ProbeAttempt[] = [];

  for (let run = 1; run <= runs; run += 1) {
    const publishDraft = buildPublishDraft({
      run,
      textPrefix,
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
      replyPrefix,
      category: replyCategory,
      attestUrl,
      parentTxHash: publishAttempt.txHash,
    });
    const replyAttempt = await executeReplyAttempt(omni, run, replyDraft);
    attempts.push(replyAttempt);
  }

  const finalBalance = await readBalance(omni);
  const summary = summarizeAttempts(attempts);
  const ok = summary.failedCount === 0 && summary.acceptedCount > 0;

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
    initialBalanceDem: initialBalance,
    finalBalanceDem: finalBalance,
    balanceDeltaDem: balanceDelta(initialBalance, finalBalance),
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
  textPrefix: string;
  replyPrefix: string;
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
  textPrefix: string;
  category: string;
  attestUrl: string;
}): { text: string; category: string; attestUrl: string } {
  return {
    text: ensureLongFormText(
      `${opts.textPrefix} ${opts.run} on ${new Date().toISOString()}: ` +
      "this live probe measures whether a DAHR-backed publish returns a tx hash, " +
      "whether that tx can be confirmed through the package read surface, how long " +
      "indexing takes to converge, and whether the current operator should trust " +
      "feed visibility, post-detail lookup, or only chain-level confirmation.",
    ),
    category: opts.category,
    attestUrl: opts.attestUrl,
  };
}

function buildReplyDraft(opts: {
  run: number;
  replyPrefix: string;
  category: string;
  attestUrl: string;
  parentTxHash: string;
}): { text: string; category: string; attestUrl: string; parentTxHash: string } {
  return {
    text: ensureLongFormText(
      `${opts.replyPrefix} ${opts.run} on ${new Date().toISOString()}: ` +
      `this threaded probe targets parent ${opts.parentTxHash.slice(0, 12)} and checks ` +
      "whether reply writes behave like root posts, whether indexed lookup catches up " +
      "within the polling window, and whether reply tx hashes are currently more or less " +
      "trustworthy than root publish tx hashes for launch-grade external guidance.",
    ),
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
  const startedAt = Date.now();
  const result = await omni.colony.publish(draft);
  const publishLatencyMs = Date.now() - startedAt;

  if (!result?.ok) {
    return {
      kind: "publish",
      run,
      draft,
      accepted: false,
      publishLatencyMs,
      error: normalizeError(result?.error, "UNKNOWN", "Unknown publish failure"),
    };
  }

  return {
    kind: "publish",
    run,
    draft,
    accepted: true,
    publishLatencyMs,
    txHash: result.data?.txHash,
    attestationTxHash: result.provenance?.attestation?.txHash,
    provenancePath: result.provenance?.path,
    visibility: await verifyPublishVisibility(omni, result.data?.txHash, draft.text, {
      timeoutMs: feedTimeoutMs,
      pollMs: feedPollMs,
      limit: feedLimit,
    }),
  };
}

async function executeReplyAttempt(
  omni: any,
  run: number,
  draft: { text: string; category: string; attestUrl: string; parentTxHash: string },
): Promise<ProbeAttempt> {
  const startedAt = Date.now();
  const result = await omni.colony.reply(draft);
  const publishLatencyMs = Date.now() - startedAt;

  if (!result?.ok) {
    return {
      kind: "reply",
      run,
      draft,
      accepted: false,
      publishLatencyMs,
      error: normalizeError(result?.error, "UNKNOWN", "Unknown reply failure"),
    };
  }

  return {
    kind: "reply",
    run,
    draft,
    accepted: true,
    publishLatencyMs,
    txHash: result.data?.txHash,
    attestationTxHash: result.provenance?.attestation?.txHash,
    provenancePath: result.provenance?.path,
    visibility: await verifyPublishVisibility(omni, result.data?.txHash, draft.text, {
      timeoutMs: feedTimeoutMs,
      pollMs: feedPollMs,
      limit: feedLimit,
    }),
  };
}

function summarizeAttempts(attempts: ProbeAttempt[]): {
  attemptedCount: number;
  acceptedCount: number;
  indexedVisibleCount: number;
  chainOnlyCount: number;
  failedCount: number;
  byKind: Record<AttemptKind, {
    attempted: number;
    accepted: number;
    indexedVisible: number;
    chainOnly: number;
    failed: number;
  }>;
} {
  const base = {
    publish: { attempted: 0, accepted: 0, indexedVisible: 0, chainOnly: 0, failed: 0 },
    reply: { attempted: 0, accepted: 0, indexedVisible: 0, chainOnly: 0, failed: 0 },
  };

  for (const attempt of attempts) {
    const bucket = base[attempt.kind];
    bucket.attempted += 1;
    if (attempt.accepted) {
      bucket.accepted += 1;
    }
    if (attempt.visibility?.indexedVisible) {
      bucket.indexedVisible += 1;
    }
    if (attempt.visibility?.visible && !attempt.visibility.indexedVisible) {
      bucket.chainOnly += 1;
    }
    if (!attempt.accepted || !attempt.visibility?.indexedVisible) {
      bucket.failed += 1;
    }
  }

  return {
    attemptedCount: attempts.length,
    acceptedCount: attempts.filter((attempt) => attempt.accepted).length,
    indexedVisibleCount: attempts.filter((attempt) => attempt.visibility?.indexedVisible).length,
    chainOnlyCount: attempts.filter((attempt) => attempt.visibility?.visible && !attempt.visibility.indexedVisible).length,
    failedCount: attempts.filter((attempt) => !attempt.accepted || !attempt.visibility?.indexedVisible).length,
    byKind: base,
  };
}

async function readBalance(omni: any): Promise<number | null> {
  try {
    const result = await omni.colony.getBalance();
    if (!result?.ok) return null;
    const data = result.data as { balance?: number | string; available?: number | string } | undefined;
    const value = data?.balance ?? data?.available;
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  } catch {
    return null;
  }
}

function ensureLongFormText(text: string): string {
  if (text.length >= 200) {
    return text;
  }
  return `${text} This note intentionally stays detailed enough to satisfy the package long-form publish requirement while keeping the probe purpose explicit and auditable.`;
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
    const mod = await import("../dist/index.js");
    if (typeof mod.connect === "function") {
      return mod.connect;
    }
  } catch {
    // Fall back to source during local development before build output exists.
  }

  const mod = await import("../src/index.ts");
  if (typeof mod.connect !== "function") {
    throw new Error("connect() export not found in dist/index.js or src/index.ts");
  }
  return mod.connect;
}
