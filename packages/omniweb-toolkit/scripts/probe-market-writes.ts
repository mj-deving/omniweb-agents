#!/usr/bin/env npx tsx
/**
 * probe-market-writes.ts — maintained live proof path for placeHL and placeBet.
 *
 * Default behavior is non-destructive: inspect current oracle + pool state and
 * report the candidate market actions that would be used for a live proof.
 * Passing `--execute` performs one higher-lower bet and one fixed-price bet.
 *
 * Output: JSON to stdout. Errors to stderr.
 * Exit codes: 0 = success, 1 = runtime/proof failure, 2 = invalid args.
 */

import { getNumberArg, getStringArg, hasFlag } from "./_shared.js";
import { normalizeBalance } from "./_write-proof-shared.js";
import {
  buildBetMemo,
  buildHigherLowerMemo,
} from "../../../src/toolkit/supercolony/bet-memos.js";
import {
  DEFAULT_TRANSFER_SHAPE,
  DEFAULT_MEMO_TRANSFER_SHAPE,
  WALLET_NATIVE_TRANSFER_SHAPE,
  extractWalletNativeTxHash,
  normalizeTransferShape,
} from "../../../src/toolkit/sdk-bridge.js";
import {
  chooseFixedBetProbe,
  chooseHigherLowerProbe,
  evaluateFixedBetReadback,
  higherLowerReadbackSatisfied,
  type BettingPoolSnapshot,
  type FixedBetProbePlan,
  type HigherLowerPoolSnapshot,
  type FixedBetReadbackEvaluation,
  type OracleAssetSignal,
} from "./_market-write-shared.js";

const DEFAULT_ASSETS = ["BTC", "ETH", "SOL"];
const DEFAULT_HL_AMOUNT = 5;
const DEFAULT_HL_HORIZONS = ["24h", "4h", "30m", "10m"];
const DEFAULT_FIXED_HORIZONS = ["30m", "4h", "24h", "10m"];
const DEFAULT_POLL_MS = 3_000;
const DEFAULT_HL_TIMEOUT_MS = 20_000;
const DEFAULT_FIXED_TIMEOUT_MS = 20_000;
const DEFAULT_PROVIDER_URL = "https://www.supercolony.ai/predictions";

type OmniInstance = Awaited<ReturnType<Awaited<ReturnType<typeof loadConnect>>>>;
type ReadbackVerification = {
  attempted: true;
  ok: boolean;
  polls: number;
  before: HigherLowerPoolSnapshot | BettingPoolSnapshot | null;
  after: HigherLowerPoolSnapshot | BettingPoolSnapshot | null;
  matchedBy?: FixedBetReadbackEvaluation["matchedBy"];
};
type RecoveryResult = {
  attempted: true;
  label: "manual_registration_recovery";
  registration: Record<string, unknown>;
  verification: ReadbackVerification;
};

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/probe-market-writes.ts [options]

Options:
  --assets CSV             Assets to inspect (default: ${DEFAULT_ASSETS.join(",")})
  --hl-amount N            Higher-lower DEM amount (default: ${DEFAULT_HL_AMOUNT})
  --hl-timeout-ms N        Readback timeout for higher-lower verification (default: ${DEFAULT_HL_TIMEOUT_MS})
  --fixed-timeout-ms N     Readback timeout for fixed-price verification (default: ${DEFAULT_FIXED_TIMEOUT_MS})
  --poll-ms N              Poll interval for readback polling (default: ${DEFAULT_POLL_MS})
  --only MODE              One of both, hl, fixed (default: both)
  --fixed-horizons CSV     Fixed-price horizons to inspect, in preference order (default: ${DEFAULT_FIXED_HORIZONS.join(",")})
  --transfer-shape S       Agentic transfer shape: native-args-memo, native-content-memo, native-data-memo, or wallet-provider-send-transaction (default: ${DEFAULT_TRANSFER_SHAPE}); wallet-native-transfer is human/browser diagnostic only
  --memo-transfer-shape S  Memo-bearing transfer shape: native-args-memo, native-content-memo, native-data-memo, or wallet-provider-send-transaction (default: ${DEFAULT_MEMO_TRANSFER_SHAPE})
  --provider-url URL       Browser page used to capture window.__demosProviderCaptured || window.demos for wallet-native-transfer (default: ${DEFAULT_PROVIDER_URL})
  --state-dir PATH         Override state directory for runtime guards
  --execute                Perform the real market-write proof sweep
  --help, -h               Show this help

Output: JSON market-write proof report
Exit codes: 0 = success, 1 = runtime or proof failure, 2 = invalid args`);
  process.exit(0);
}

for (const flag of ["--assets", "--hl-amount", "--hl-timeout-ms", "--fixed-timeout-ms", "--poll-ms", "--state-dir", "--only", "--fixed-horizons", "--transfer-shape", "--memo-transfer-shape", "--provider-url"]) {
  const index = args.indexOf(flag);
  if (index >= 0 && !args[index + 1]) {
    console.error(`Error: ${flag} requires a value`);
    process.exit(2);
  }
}

const assetList = ((getStringArg(args, "--assets") ?? DEFAULT_ASSETS.join(","))
  .split(",")
  .map((value) => value.trim().toUpperCase())
  .filter(Boolean));
const hlAmount = getPositiveNumberArg("--hl-amount", DEFAULT_HL_AMOUNT);
const hlTimeoutMs = getPositiveIntegerArg("--hl-timeout-ms", DEFAULT_HL_TIMEOUT_MS);
const fixedTimeoutMs = getPositiveIntegerArg("--fixed-timeout-ms", DEFAULT_FIXED_TIMEOUT_MS);
const pollMs = getPositiveIntegerArg("--poll-ms", DEFAULT_POLL_MS);
const stateDir = getStringArg(args, "--state-dir") || undefined;
const execute = hasFlag(args, "--execute");
const onlyMode = (getStringArg(args, "--only") ?? "both").toLowerCase();
const fixedHorizons = parseCsvArg("--fixed-horizons", DEFAULT_FIXED_HORIZONS);
const providerUrl = getStringArg(args, "--provider-url") ?? DEFAULT_PROVIDER_URL;
let transferShape: ReturnType<typeof normalizeTransferShape>;
try {
  transferShape = normalizeTransferShape(
    getStringArg(args, "--transfer-shape")
      ?? getStringArg(args, "--memo-transfer-shape")
      ?? process.env.OMNIWEB_TRANSFER_SHAPE
      ?? process.env.OMNIWEB_MEMO_TRANSFER_SHAPE,
  );
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
}
process.env.OMNIWEB_TRANSFER_SHAPE = transferShape;
process.env.OMNIWEB_MEMO_TRANSFER_SHAPE = transferShape;

for (const [label, value] of [
  ["--hl-amount", hlAmount],
  ["--hl-timeout-ms", hlTimeoutMs],
  ["--fixed-timeout-ms", fixedTimeoutMs],
  ["--poll-ms", pollMs],
] as const) {
  if (!Number.isFinite(value) || value <= 0) {
    console.error(`Error: invalid ${label} value ${value}`);
    process.exit(2);
  }
}

if (!["both", "hl", "fixed"].includes(onlyMode)) {
  console.error(`Error: invalid --only value ${onlyMode}`);
  process.exit(2);
}

if (transferShape === WALLET_NATIVE_TRANSFER_SHAPE && onlyMode === "hl") {
  console.error("Error: wallet-native-transfer currently supports only fixed-price pool proof; use --only fixed");
  process.exit(2);
}

const effectiveOnlyMode = transferShape === WALLET_NATIVE_TRANSFER_SHAPE && onlyMode === "both" ? "fixed" : onlyMode;

try {
  const connect = await loadConnect();
  const omni = await connect({ stateDir });

  const [oracleResult, balanceResult, pools] = await Promise.all([
    omni.colony.getOracle({ assets: assetList }),
    omni.colony.getBalance(),
    loadMarketPools(omni, assetList, fixedHorizons),
  ]);

  if (!oracleResult?.ok) {
    throw new Error(`Oracle read failed: ${oracleResult?.error ?? "unknown_error"}`);
  }

  const oracleAssets = normalizeOracleAssets(oracleResult.data);
  const hlPlan = effectiveOnlyMode === "fixed" ? null : chooseHigherLowerProbe(pools.higherLower, oracleAssets, hlAmount);
  const fixedPlan = effectiveOnlyMode === "hl" ? null : chooseFixedBetProbe(pools.fixed, oracleAssets);

  if ((effectiveOnlyMode !== "fixed" && !hlPlan) || (effectiveOnlyMode !== "hl" && !fixedPlan)) {
    throw new Error("No viable live market-write candidate was found on the current host");
  }

  const balanceBefore = normalizeBalance(balanceResult?.ok ? balanceResult.data?.balance : null);
  const hlBefore = hlPlan ? await fetchHigherLowerPool(omni, hlPlan.asset, hlPlan.horizon) : null;
  const fixedBefore = fixedPlan ? await fetchBettingPool(omni, fixedPlan.asset, fixedPlan.horizon) : null;

  if (!execute) {
    console.log(JSON.stringify({
      attempted: false,
      ok: true,
      address: omni.address,
      balanceBefore,
      transferShape,
      provider: transferShape === WALLET_NATIVE_TRANSFER_SHAPE ? {
        required: true,
        url: providerUrl,
        source: "window.__demosProviderCaptured || window.demos",
      } : undefined,
      fixedOnly: transferShape === WALLET_NATIVE_TRANSFER_SHAPE,
      higherLower: hlPlan ? {
        plan: hlPlan,
        transfer: {
          to: hlBefore?.poolAddress ?? null,
          amount: hlPlan.amount,
          memo: buildHigherLowerMemo(hlPlan.asset, hlPlan.direction, { horizon: hlPlan.horizon }),
          shape: transferShape,
        },
        before: hlBefore,
      } : undefined,
      fixedBet: fixedPlan ? {
        plan: fixedPlan,
        transfer: {
          to: fixedBefore?.poolAddress ?? null,
          amount: 5,
          memo: buildBetMemo(fixedPlan.asset, fixedPlan.predictedPrice, { horizon: fixedPlan.horizon }),
          shape: transferShape,
          ...(transferShape === WALLET_NATIVE_TRANSFER_SHAPE && fixedBefore?.poolAddress
            ? { providerRequest: buildWalletNativeTransferRequest(fixedBefore.poolAddress, 5) }
            : {}),
          registrationPayload: {
            txHash: "<transfer tx hash>",
            asset: fixedPlan.asset,
            predictedPrice: fixedPlan.predictedPrice,
            horizon: fixedPlan.horizon,
            amount: 5,
          },
        },
        before: fixedBefore,
      } : undefined,
      message: transferShape === WALLET_NATIVE_TRANSFER_SHAPE
        ? "Dry run only. wallet-native-transfer is a human/browser diagnostic candidate, not the agentic proof path."
        : "Dry run only. Re-run with --execute to perform the live higher-lower and fixed-price bet proof.",
    }, null, 2));
    process.exit(0);
  }

  if (transferShape === WALLET_NATIVE_TRANSFER_SHAPE) {
    if (!fixedPlan || !fixedBefore) {
      throw new Error("wallet-native-transfer requires a fixed-price pool candidate");
    }
    const walletNative = await executeWalletNativeFixedProof(omni, fixedPlan, fixedBefore, {
      providerUrl,
      timeoutMs: fixedTimeoutMs,
      pollMs,
    });
    const balanceAfterResult = await omni.colony.getBalance();
    const balanceAfter = normalizeBalance(balanceAfterResult?.ok ? balanceAfterResult.data?.balance : null);
    const ok = walletNative.transfer.ok && !!walletNative.verification.attempted && walletNative.verification.ok;

    console.log(JSON.stringify({
      attempted: true,
      ok,
      address: omni.address,
      balanceBefore,
      balanceAfter,
      estimatedSpend: balanceBefore != null && balanceAfter != null ? balanceBefore - balanceAfter : null,
      transferShape,
      provider: {
        required: true,
        url: providerUrl,
        source: "window.__demosProviderCaptured || window.demos",
      },
      fixedBet: {
        plan: fixedPlan,
        pool: {
          asset: fixedBefore.asset,
          horizon: fixedBefore.horizon,
          poolAddress: fixedBefore.poolAddress ?? null,
        },
        transfer: walletNative.transfer,
        registration: walletNative.registration,
        verification: walletNative.verification,
      },
      message: ok
        ? "wallet-native-transfer pool readback matched on the human/browser diagnostic path"
        : "wallet-native-transfer did not prove the agentic DEM pool path; keep agentic predictions on publishVote()/PREDICTION while headless DEM pool readback remains unavailable.",
    }, null, 2));

    process.exit(ok ? 0 : 1);
  }

  const hlResult = hlPlan
    ? await omni.colony.placeHL(hlPlan.asset, hlPlan.direction, {
        amount: hlPlan.amount,
        horizon: hlPlan.horizon,
      })
    : null;
  let hlVerification = hlPlan && hlResult?.ok
    ? await verifyHigherLowerReadback(omni, hlPlan, hlBefore, {
        timeoutMs: hlTimeoutMs,
        pollMs,
      })
    : { attempted: false };
  const hlRecovery = hlPlan && hlResult?.ok && hlVerification.attempted && !hlVerification.ok
    ? await recoverHigherLowerRegistration(omni, hlPlan, hlBefore, hlResult.data.txHash, {
        timeoutMs: hlTimeoutMs,
        pollMs,
      })
    : null;
  if (hlRecovery?.verification?.attempted) {
    hlVerification = hlRecovery.verification;
  }

  const fixedResult = fixedPlan
    ? await omni.colony.placeBet(fixedPlan.asset, fixedPlan.predictedPrice, {
        horizon: fixedPlan.horizon,
      })
    : null;
  let fixedVerification = fixedPlan && fixedResult?.ok
    ? await verifyFixedBetReadback(omni, fixedPlan, fixedBefore, fixedResult.data?.txHash, {
        timeoutMs: fixedTimeoutMs,
        pollMs,
      })
    : { attempted: false };
  const fixedRecovery = fixedPlan && fixedResult?.ok && fixedVerification.attempted && !fixedVerification.ok
    ? await recoverFixedRegistration(omni, fixedPlan, fixedBefore, fixedResult.data.txHash, {
        timeoutMs: fixedTimeoutMs,
        pollMs,
      })
    : null;
  if (fixedRecovery?.verification?.attempted) {
    fixedVerification = fixedRecovery.verification;
  }

  const balanceAfterResult = await omni.colony.getBalance();
  const balanceAfter = normalizeBalance(balanceAfterResult?.ok ? balanceAfterResult.data?.balance : null);

  const hlOk = !hlPlan || (!!hlResult?.ok && !!hlVerification.attempted && hlVerification.ok);
  const fixedOk = !fixedPlan || (!!fixedResult?.ok && !!fixedVerification.attempted && fixedVerification.ok);
  const overallOk = hlOk && fixedOk;

  console.log(JSON.stringify({
    attempted: true,
    ok: overallOk,
    address: omni.address,
    balanceBefore,
    balanceAfter,
    estimatedSpend: balanceBefore != null && balanceAfter != null ? balanceBefore - balanceAfter : null,
    transferShape,
    higherLower: hlPlan ? {
      plan: hlPlan,
      result: summarizeResult(hlResult),
      verification: hlVerification,
      manualRegistrationRecovery: hlRecovery,
    } : undefined,
    fixedBet: fixedPlan ? {
      plan: fixedPlan,
      result: summarizeResult(fixedResult),
      verification: fixedVerification,
      manualRegistrationRecovery: fixedRecovery,
    } : undefined,
  }, null, 2));

  process.exit(overallOk ? 0 : 1);
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

async function loadMarketPools(
  omni: OmniInstance,
  assets: string[],
  fixedHorizons: string[],
): Promise<{ higherLower: HigherLowerPoolSnapshot[]; fixed: BettingPoolSnapshot[] }> {
  const higherLower: HigherLowerPoolSnapshot[] = [];
  const fixed: BettingPoolSnapshot[] = [];

  for (const asset of assets) {
    for (const horizon of DEFAULT_HL_HORIZONS) {
      const pool = await fetchHigherLowerPool(omni, asset, horizon);
      if (pool) higherLower.push(pool);
    }
    for (const horizon of fixedHorizons) {
      const pool = await fetchBettingPool(omni, asset, horizon);
      if (pool) fixed.push(pool);
    }
  }

  return { higherLower, fixed };
}

function normalizeOracleAssets(data: any): OracleAssetSignal[] {
  const assets = Array.isArray(data?.assets) ? data.assets : [];
  return assets
    .map((asset: any) => ({
      ticker: typeof asset?.ticker === "string" ? asset.ticker : "",
      sentimentScore: typeof asset?.sentiment?.score === "number" ? asset.sentiment.score : 0,
      currentPrice: typeof asset?.price?.usd === "number" ? asset.price.usd : Number.NaN,
    }))
    .filter((asset: OracleAssetSignal) => asset.ticker && Number.isFinite(asset.currentPrice));
}

async function fetchHigherLowerPool(
  omni: OmniInstance,
  asset: string,
  horizon: string,
): Promise<HigherLowerPoolSnapshot | null> {
  const result = await omni.colony.getHigherLowerPool({ asset, horizon });
  if (!result?.ok) return null;
  return {
    asset: result.data.asset,
    horizon: result.data.horizon,
    totalHigher: result.data.totalHigher,
    totalLower: result.data.totalLower,
    totalDem: result.data.totalDem,
    higherCount: result.data.higherCount,
    lowerCount: result.data.lowerCount,
    referencePrice: result.data.referencePrice,
    poolAddress: result.data.poolAddress,
    currentPrice: result.data.currentPrice,
  };
}

async function fetchBettingPool(
  omni: OmniInstance,
  asset: string,
  horizon: string,
): Promise<BettingPoolSnapshot | null> {
  const result = await omni.colony.getPool({ asset, horizon });
  if (!result?.ok) return null;
  return {
    asset: result.data.asset,
    horizon: result.data.horizon,
    totalBets: result.data.totalBets,
    totalDem: result.data.totalDem,
    poolAddress: result.data.poolAddress,
    roundEnd: result.data.roundEnd,
    bets: Array.isArray(result.data.bets)
      ? result.data.bets.map((bet) => ({
          txHash: bet.txHash,
          bettor: bet.bettor,
          predictedPrice: bet.predictedPrice,
          amount: bet.amount,
          roundEnd: bet.roundEnd,
        }))
      : [],
  };
}

async function verifyHigherLowerReadback(
  omni: OmniInstance,
  plan: ReturnType<typeof chooseHigherLowerProbe> extends infer T ? Exclude<T, null> : never,
  before: HigherLowerPoolSnapshot | null,
  opts: { timeoutMs: number; pollMs: number },
): Promise<ReadbackVerification> {
  const deadline = Date.now() + opts.timeoutMs;
  let polls = 0;
  let after = before;

  while (Date.now() <= deadline) {
    polls += 1;
    after = await fetchHigherLowerPool(omni, plan.asset, plan.horizon);
    if (before && after && higherLowerReadbackSatisfied(before, after, plan.direction, plan.amount)) {
      return { attempted: true, ok: true, polls, before, after };
    }
    if (Date.now() + opts.pollMs > deadline) break;
    await sleep(opts.pollMs);
  }

  return { attempted: true, ok: false, polls, before, after };
}

async function verifyFixedBetReadback(
  omni: OmniInstance,
  plan: ReturnType<typeof chooseFixedBetProbe> extends infer T ? Exclude<T, null> : never,
  before: BettingPoolSnapshot | null,
  txHash: string | undefined,
  opts: { timeoutMs: number; pollMs: number },
): Promise<ReadbackVerification> {
  const deadline = Date.now() + opts.timeoutMs;
  let polls = 0;
  let after = before;

  while (Date.now() <= deadline) {
    polls += 1;
    after = await fetchBettingPool(omni, plan.asset, plan.horizon);
    const evaluation = before && after && txHash ? evaluateFixedBetReadback(before, after, txHash, {
      predictedPrice: plan.predictedPrice,
      roundEnd: before.roundEnd,
      bettor: omni.address,
    }) : null;
    if (evaluation?.ok) {
      return { attempted: true, ok: true, polls, before, after, matchedBy: evaluation.matchedBy };
    }
    if (Date.now() + opts.pollMs > deadline) break;
    await sleep(opts.pollMs);
  }

  return { attempted: true, ok: false, polls, before, after };
}

function buildWalletNativeTransferRequest(recipientAddress: string, amount: number) {
  return {
    method: "nativeTransfer" as const,
    params: [{ recipientAddress, amount }],
  };
}

async function executeWalletNativeFixedProof(
  omni: OmniInstance,
  plan: FixedBetProbePlan,
  before: BettingPoolSnapshot,
  opts: { providerUrl: string; timeoutMs: number; pollMs: number },
): Promise<{
  transfer: Record<string, unknown> & { ok: boolean };
  registration: Record<string, unknown> | null;
  verification: ReadbackVerification;
}> {
  if (!before.poolAddress) {
    return {
      transfer: {
        ok: false,
        error: "fixed-price pool has no poolAddress",
      },
      registration: null,
      verification: { attempted: true, ok: false, polls: 0, before, after: before },
    };
  }

  const transfer = await runWalletNativeTransferInBrowser(opts.providerUrl, before.poolAddress, 5);
  if (!transfer.ok || typeof transfer.txHash !== "string") {
    return {
      transfer,
      registration: null,
      verification: { attempted: true, ok: false, polls: 0, before, after: before },
    };
  }

  const registration = await omni.colony.registerBet(transfer.txHash, plan.asset, plan.predictedPrice, {
    horizon: plan.horizon,
    amount: 5,
  });
  const verification = await verifyFixedBetReadback(omni, plan, before, transfer.txHash, {
    timeoutMs: opts.timeoutMs,
    pollMs: opts.pollMs,
  });

  return {
    transfer,
    registration: summarizeResult(registration),
    verification,
  };
}

async function runWalletNativeTransferInBrowser(
  providerUrl: string,
  recipientAddress: string,
  amount: number,
): Promise<Record<string, unknown> & { ok: boolean; txHash?: string }> {
  const request = buildWalletNativeTransferRequest(recipientAddress, amount);
  let browser: { close(): Promise<void> } | null = null;

  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(providerUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

    const providerState = await page.evaluate(() => {
      const globalObject = window as unknown as Record<string, unknown>;
      const provider = globalObject.__demosProviderCaptured ?? globalObject.demos;
      return {
        available: !!provider && typeof provider === "object" && typeof (provider as Record<string, unknown>).request === "function",
        source: globalObject.__demosProviderCaptured ? "window.__demosProviderCaptured" : globalObject.demos ? "window.demos" : null,
      };
    });

    if (!providerState.available) {
      return {
        ok: false,
        error: "provider unavailable: window.__demosProviderCaptured || window.demos is missing or lacks request()",
        providerUrl,
        providerSource: providerState.source,
        request,
      };
    }

    const providerResult = await page.evaluate(async (walletRequest) => {
      const globalObject = window as unknown as Record<string, unknown>;
      const provider = globalObject.__demosProviderCaptured ?? globalObject.demos;
      try {
        const response = await (provider as { request(args: typeof walletRequest): Promise<unknown> }).request(walletRequest);
        return { ok: true, response };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    }, request);

    if (!providerResult.ok) {
      return {
        ok: false,
        error: providerResult.error,
        providerUrl,
        request,
      };
    }

    const txHash = extractWalletNativeTxHash(providerResult.response);
    if (!txHash) {
      return {
        ok: false,
        error: "wallet-native transfer response did not include a tx hash",
        providerUrl,
        request,
        response: providerResult.response,
      };
    }

    return {
      ok: true,
      providerUrl,
      request,
      response: providerResult.response,
      txHash,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      providerUrl,
      request,
    };
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

async function recoverHigherLowerRegistration(
  omni: OmniInstance,
  plan: ReturnType<typeof chooseHigherLowerProbe> extends infer T ? Exclude<T, null> : never,
  before: HigherLowerPoolSnapshot | null,
  txHash: string,
  opts: { timeoutMs: number; pollMs: number },
): Promise<RecoveryResult> {
  const registration = await omni.colony.registerHL(txHash, plan.asset, plan.direction, { horizon: plan.horizon });
  const verification = await verifyHigherLowerReadback(omni, plan, before, opts);
  return {
    attempted: true,
    label: "manual_registration_recovery",
    registration: summarizeResult(registration),
    verification,
  };
}

async function recoverFixedRegistration(
  omni: OmniInstance,
  plan: ReturnType<typeof chooseFixedBetProbe> extends infer T ? Exclude<T, null> : never,
  before: BettingPoolSnapshot | null,
  txHash: string,
  opts: { timeoutMs: number; pollMs: number },
): Promise<RecoveryResult> {
  const registration = await omni.colony.registerBet(txHash, plan.asset, plan.predictedPrice, { horizon: plan.horizon });
  const verification = await verifyFixedBetReadback(omni, plan, before, txHash, opts);
  return {
    attempted: true,
    label: "manual_registration_recovery",
    registration: summarizeResult(registration),
    verification,
  };
}

function summarizeResult(
  result: {
    ok: boolean;
    data?: {
      txHash?: string;
      memo?: string;
      amount?: number;
      registered?: boolean;
      memoEncoded?: boolean;
      transferShape?: string;
      registrationError?: string;
      readbackError?: string;
    };
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

function getPositiveIntegerArg(flag: string, fallback: number): number {
  const parsed = getNumberArg(args, flag);
  if (parsed === undefined) return fallback;
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function getPositiveNumberArg(flag: string, fallback: number): number {
  const parsed = getNumberArg(args, flag);
  return parsed === undefined ? fallback : parsed;
}

function parseCsvArg(flag: string, fallback: string[]): string[] {
  return (getStringArg(args, flag) ?? fallback.join(","))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

async function loadConnect(): Promise<(opts?: {
  stateDir?: string;
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

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
