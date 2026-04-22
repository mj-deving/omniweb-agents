#!/usr/bin/env npx tsx

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  buildPendingVerdictEntry,
  DEFAULT_PENDING_VERDICT_PATH,
  enqueuePendingVerdict,
} from "./_supervised-verdict-queue.ts";
import { scheduleSupervisedVerdict } from "./_supervised-publish-verdict.js";
import { getNumberArg, getStringArg, hasFlag, loadConnect, loadPackageExport } from "./_shared.ts";
import {
  chooseFixedBetProbe,
  fixedBetReadbackSatisfied,
  type BettingPoolSnapshot,
  type OracleAssetSignal,
} from "./_market-write-shared.ts";

const DEFAULT_ASSETS = ["BTC", "ETH", "SOL"];
const DEFAULT_FIXED_HORIZONS = ["30m", "4h", "24h", "10m"];
const DEFAULT_POLL_MS = 3_000;
const DEFAULT_VERIFY_TIMEOUT_MS = 45_000;
const DEFAULT_VERIFY_POLL_MS = 5_000;
const DEFAULT_VERIFY_LIMIT = 50;
const DEFAULT_BET_TIMEOUT_MS = 20_000;
const DEFAULT_MIN_BALANCE = 5;

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-market-action-bet.ts [options]

Options:
  --broadcast                   Execute the real fixed-price bet and publish the ACTION post
  --assets CSV                  Assets to inspect (default: ${DEFAULT_ASSETS.join(",")})
  --state-dir PATH              Override state directory for runtime guards
  --allow-insecure              Forwarded to connect() for local debugging only
  --bet-timeout-ms N            Readback timeout for bet verification (default: ${DEFAULT_BET_TIMEOUT_MS})
  --poll-ms N                   Poll interval for bet verification (default: ${DEFAULT_POLL_MS})
  --verify-timeout-ms N         Publish visibility timeout (default: ${DEFAULT_VERIFY_TIMEOUT_MS})
  --verify-poll-ms N            Publish visibility poll interval (default: ${DEFAULT_VERIFY_POLL_MS})
  --verify-limit N              Feed limit for publish visibility (default: ${DEFAULT_VERIFY_LIMIT})
  --record-pending-verdict      Queue a delayed verdict follow-up for the ACTION publish
  --pending-verdict-queue PATH  Override the pending verdict queue path
  --pending-verdict-delay-ms N  Override the delayed verdict window
  --out PATH                    Write the JSON report to a file as well as stdout
  --help, -h                    Show this help
`);
  process.exit(0);
}

const broadcast = hasFlag(args, "--broadcast");
const assets = ((getStringArg(args, "--assets") ?? DEFAULT_ASSETS.join(","))
  .split(",")
  .map((value) => value.trim().toUpperCase())
  .filter(Boolean));
const stateDirArg = getStringArg(args, "--state-dir");
const allowInsecureUrls = hasFlag(args, "--allow-insecure");
const betTimeoutMs = getPositiveIntegerArg("--bet-timeout-ms", DEFAULT_BET_TIMEOUT_MS);
const pollMs = getPositiveIntegerArg("--poll-ms", DEFAULT_POLL_MS);
const verifyTimeoutMs = getPositiveIntegerArg("--verify-timeout-ms", DEFAULT_VERIFY_TIMEOUT_MS);
const verifyPollMs = getPositiveIntegerArg("--verify-poll-ms", DEFAULT_VERIFY_POLL_MS);
const verifyLimit = getPositiveIntegerArg("--verify-limit", DEFAULT_VERIFY_LIMIT);
const recordPendingVerdict = hasFlag(args, "--record-pending-verdict");
const pendingVerdictQueuePath = getStringArg(args, "--pending-verdict-queue") ?? DEFAULT_PENDING_VERDICT_PATH;
const pendingVerdictDelayMs = getOptionalPositiveIntegerArg("--pending-verdict-delay-ms");
const outputPath = getStringArg(args, "--out");

const getDefaultMinimalStateDir = await loadPackageExport<(cwd?: string) => string>(
  "../dist/agent.js",
  "../src/agent.ts",
  "getDefaultMinimalStateDir",
);
const buildMinimalAttestationPlanFromUrls = await loadPackageExport<any>(
  "../dist/agent.js",
  "../src/agent.ts",
  "buildMinimalAttestationPlanFromUrls",
);
const verifyPublishVisibility = await loadPackageExport<any>(
  "../dist/publish-visibility.js",
  "../src/publish-visibility.ts",
  "verifyPublishVisibility",
);
const buildMarketActionDraft = await loadPackageExport<any>(
  "../dist/agent.js",
  "../src/agent.ts",
  "buildMarketActionDraft",
);
const stateDir = stateDirArg ?? getDefaultMinimalStateDir();
const connect = await loadConnect();
const omni = await connect({ stateDir, allowInsecureUrls });

const [oracleResult, balanceResult, pools] = await Promise.all([
  omni.colony.getOracle({ assets }),
  omni.colony.getBalance(),
  loadFixedPools(omni, assets),
]);

if (!oracleResult?.ok) {
  throw new Error(`Oracle read failed: ${oracleResult?.error ?? "unknown_error"}`);
}

const balance = Number(balanceResult?.ok ? balanceResult.data?.balance : 0);
const candidate = chooseFixedBetProbe(pools, normalizeOracleAssets(oracleResult.data));

if (candidate == null || !Number.isFinite(balance) || balance < DEFAULT_MIN_BALANCE) {
  const report = {
    ok: false,
    checkedAt: new Date().toISOString(),
    broadcast,
    operatorPath: "market-action-bet",
    stateDir,
    balance,
    candidate,
    reason: candidate == null ? "no_market_action_candidate" : "low_balance",
  };
  await maybeWriteOutput(outputPath, report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

const previewDraft = buildMarketActionDraft({
  asset: candidate.asset,
  horizon: candidate.horizon,
  txHash: "pending-live-tx",
  currentPrice: candidate.currentPrice,
  predictedPrice: candidate.predictedPrice,
  sentimentScore: candidate.sentimentScore,
});

if (!broadcast) {
  const report = {
    ok: true,
    checkedAt: new Date().toISOString(),
    broadcast,
    operatorPath: "market-action-bet",
    stateDir,
    balance,
    candidate,
    previewDraft,
    message: "Dry run only. Re-run with --broadcast to place the fixed-price bet and publish the ACTION post.",
  };
  await maybeWriteOutput(outputPath, report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const beforePool = await fetchBettingPool(omni, candidate.asset, candidate.horizon);
const betResult = await omni.colony.placeBet(candidate.asset, candidate.predictedPrice, {
  horizon: candidate.horizon,
});
const betVerification = betResult?.ok
  ? await verifyFixedBetReadback(omni, candidate, beforePool, betResult.data?.txHash, {
    timeoutMs: betTimeoutMs,
    pollMs,
  })
  : { attempted: false };

if (!betResult?.ok || betResult.data?.registered !== true || !betVerification.attempted || !betVerification.ok) {
  const report = {
    ok: false,
    checkedAt: new Date().toISOString(),
    broadcast,
    operatorPath: "market-action-bet",
    stateDir,
    balance,
    candidate,
    previewDraft,
    betResult: summarizeBetResult(betResult),
    betVerification,
    reason: !betResult?.ok
      ? "bet_failed"
      : betResult.data?.registered !== true
        ? "bet_not_registered"
        : "bet_readback_unconfirmed",
  };
  await maybeWriteOutput(outputPath, report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

const actionDraft = buildMarketActionDraft({
  asset: candidate.asset,
  horizon: candidate.horizon,
  txHash: betResult.data.txHash,
  currentPrice: candidate.currentPrice,
  predictedPrice: candidate.predictedPrice,
  sentimentScore: candidate.sentimentScore,
});

if (!actionDraft.ok) {
  const report = {
    ok: false,
    checkedAt: new Date().toISOString(),
    broadcast,
    operatorPath: "market-action-bet",
    stateDir,
    balance,
    candidate,
    betResult: summarizeBetResult(betResult),
    betVerification,
    actionDraft,
    reason: actionDraft.reason,
  };
  await maybeWriteOutput(outputPath, report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

const attestUrl = buildCoinGeckoSimplePriceUrl(candidate.asset);
const attestationPlan = buildMinimalAttestationPlanFromUrls({
  topic: `${candidate.asset} fixed-price action`,
  agent: "market-action-bet",
  urls: [attestUrl],
  minSupportingSources: 0,
});

if (!attestationPlan.ready) {
  const report = {
    ok: false,
    checkedAt: new Date().toISOString(),
    broadcast,
    operatorPath: "market-action-bet",
    stateDir,
    candidate,
    betResult: summarizeBetResult(betResult),
    betVerification,
    actionDraft,
    attestationPlan,
    reason: "attestation_plan_not_ready",
  };
  await maybeWriteOutput(outputPath, report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

const publishResult = await omni.colony.publish({
  text: actionDraft.text,
  category: actionDraft.category,
  attestUrl,
  tags: actionDraft.tags,
});

const publishVerification = publishResult.ok
  ? await verifyPublishVisibility(
    omni,
    publishResult.data?.txHash,
    actionDraft.text,
    {
      timeoutMs: verifyTimeoutMs,
      pollMs: verifyPollMs,
      limit: verifyLimit,
    },
  )
  : null;

let pendingVerdict: {
  id: string;
  queuePath: string;
  checkAt: string;
  inserted: boolean;
} | null = null;

if (recordPendingVerdict && publishResult.ok && publishResult.data?.txHash) {
  const queued = await enqueuePendingVerdict(
    buildPendingVerdictEntry({
      txHash: publishResult.data.txHash,
      category: actionDraft.category,
      text: actionDraft.text,
      startedAt: new Date().toISOString(),
      sourceRunPath: outputPath ? resolve(outputPath) : null,
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
  ok: publishResult.ok,
  checkedAt: new Date().toISOString(),
  broadcast,
  operatorPath: "market-action-bet",
  stateDir,
  balance,
  candidate,
  actionDraft,
  attestationPlan,
  betResult: summarizeBetResult(betResult),
  betVerification,
  publishResult: summarizePublishResult(publishResult),
  publishVerification,
  verdictSchedule: publishResult.ok ? scheduleSupervisedVerdict(actionDraft.category, new Date().toISOString()) : null,
  pendingVerdict,
};

await maybeWriteOutput(outputPath, report);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);

async function loadFixedPools(
  omniInstance: any,
  requestedAssets: string[],
): Promise<BettingPoolSnapshot[]> {
  const pools: BettingPoolSnapshot[] = [];
  for (const asset of requestedAssets) {
    for (const horizon of DEFAULT_FIXED_HORIZONS) {
      const pool = await fetchBettingPool(omniInstance, asset, horizon);
      if (pool) pools.push(pool);
    }
  }
  return pools;
}

async function fetchBettingPool(
  omniInstance: any,
  asset: string,
  horizon: string,
): Promise<BettingPoolSnapshot | null> {
  const result = await omniInstance.colony.getPool({ asset, horizon });
  if (!result?.ok) return null;
  return {
    asset: result.data.asset,
    horizon: result.data.horizon,
    totalBets: result.data.totalBets,
    totalDem: result.data.totalDem,
    bets: Array.isArray(result.data.bets)
      ? result.data.bets.map((bet: any) => ({
        txHash: bet.txHash,
        predictedPrice: bet.predictedPrice,
        amount: bet.amount,
      }))
      : [],
  };
}

function normalizeOracleAssets(data: any): OracleAssetSignal[] {
  const assetsValue = Array.isArray(data?.assets) ? data.assets : [];
  return assetsValue
    .map((asset: any) => ({
      ticker: typeof asset?.ticker === "string" ? asset.ticker : "",
      sentimentScore: typeof asset?.sentiment?.score === "number" ? asset.sentiment.score : 0,
      currentPrice: typeof asset?.price?.usd === "number" ? asset.price.usd : Number.NaN,
    }))
    .filter((asset: OracleAssetSignal) => asset.ticker && Number.isFinite(asset.currentPrice));
}

async function verifyFixedBetReadback(
  omniInstance: any,
  plan: ReturnType<typeof chooseFixedBetProbe> extends infer T ? Exclude<T, null> : never,
  before: BettingPoolSnapshot | null,
  txHash: string | undefined,
  opts: { timeoutMs: number; pollMs: number },
): Promise<{
  attempted: true;
  ok: boolean;
  polls: number;
  before: BettingPoolSnapshot | null;
  after: BettingPoolSnapshot | null;
}> {
  const deadline = Date.now() + opts.timeoutMs;
  let polls = 0;
  let after = before;

  while (Date.now() <= deadline) {
    polls += 1;
    after = await fetchBettingPool(omniInstance, plan.asset, plan.horizon);
    if (before && after && txHash && fixedBetReadbackSatisfied(before, after, txHash)) {
      return { attempted: true, ok: true, polls, before, after };
    }
    if (Date.now() + opts.pollMs > deadline) break;
    await sleep(opts.pollMs);
  }

  return { attempted: true, ok: false, polls, before, after };
}

function buildCoinGeckoSimplePriceUrl(asset: string): string {
  const normalized = asset.trim().toUpperCase();
  const id = normalized === "BTC"
    ? "bitcoin"
    : normalized === "ETH"
      ? "ethereum"
      : normalized === "SOL"
        ? "solana"
        : normalized.toLowerCase();
  return `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`;
}

function summarizeBetResult(
  result: {
    ok: boolean;
    data?: { txHash?: string; amount?: number; registered?: boolean; registrationError?: string };
    error?: unknown;
  } | null,
): Record<string, unknown> {
  if (result == null) {
    return { ok: false, error: "null_result" };
  }
  return result.ok
    ? { ok: true, ...result.data }
    : { ok: false, error: result.error };
}

function summarizePublishResult(
  result: {
    ok: boolean;
    data?: { txHash?: string };
    error?: { code?: string; message?: string; retryable?: boolean };
  },
): Record<string, unknown> {
  return result.ok
    ? { ok: true, txHash: result.data?.txHash }
    : { ok: false, error: result.error };
}

function getPositiveIntegerArg(flag: string, fallback: number): number {
  const parsed = getNumberArg(args, flag);
  if (parsed === undefined) return fallback;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
}

function getOptionalPositiveIntegerArg(flag: string): number | undefined {
  const parsed = getNumberArg(args, flag);
  if (parsed === undefined) return undefined;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
}

async function maybeWriteOutput(path: string | undefined, report: unknown): Promise<void> {
  if (!path) return;
  const resolvedPath = resolve(path);
  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}
