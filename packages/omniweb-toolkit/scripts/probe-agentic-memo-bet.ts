#!/usr/bin/env npx tsx
/**
 * probe-agentic-memo-bet.ts — direct SuperColony agentic DEM bet probe.
 *
 * This intentionally bypasses the toolkit primitive layer and exercises the
 * official headless contract from https://supercolony.ai/supercolony-skill.md:
 * send 5 DEM to the active pool with a HIVE_BET memo on the native transfer.
 *
 * Default behavior is confirm-only and does not broadcast. Passing --execute
 * broadcasts one 5 DEM bet and polls active-pool plus resolved winners readback.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Demos, DemosTransactions } from "@kynesyslabs/demosdk/websdk";
import { buildBetMemo, normalizeHorizon } from "../../../src/toolkit/supercolony/bet-memos.js";
import { getNumberArg, getStringArg, hasFlag } from "./_shared.js";
import {
  buildWriteLifecycleProofPacket,
  classifyLifecycleStatus,
  createWriteLifecycleStore,
  finalVerdictForStatus,
  lifecycleFlagEnabled,
  readCurrentGitCommit,
} from "./_write-lifecycle.ts";

const DEFAULT_ASSET = "BTC";
const DEFAULT_HORIZON = "30m";
const DEFAULT_AMOUNT = 5;
const DEFAULT_PREDICTED_PRICE = 90_000;
const DEFAULT_RPC_URL = "https://demosnode.discus.sh/";
const DEFAULT_COLONY_URL = "https://supercolony.ai";
const DEFAULT_POLL_MS = 3_000;
const DEFAULT_TIMEOUT_MS = 30_000;

type JsonRecord = Record<string, unknown>;

interface PoolSnapshot {
  asset: string;
  horizon: string;
  poolAddress: string;
  totalBets: number;
  totalDem: number;
  roundEnd?: number;
  bets: JsonRecord[];
}

interface WinnersSnapshot {
  asset: string;
  count: number;
  winners: JsonRecord[];
}

type ReadbackMatch =
  | "active-txHash"
  | "active-bettor-price"
  | "active-pool-count"
  | "winner-txHash"
  | "winner-bettor-price"
  | null;

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: node --import tsx packages/omniweb-toolkit/scripts/probe-agentic-memo-bet.ts [options]

Options:
  --asset SYMBOL            Asset to bet on (default: ${DEFAULT_ASSET})
  --horizon HORIZON         One of 10m, 30m, 4h, 24h (default: ${DEFAULT_HORIZON})
  --predicted-price PRICE   Fixed-price prediction (default: ${DEFAULT_PREDICTED_PRICE})
  --amount DEM              DEM amount (default: ${DEFAULT_AMOUNT}; SuperColony minimum is 5)
  --env PATH                Env file containing DEMOS_MNEMONIC (default: .env)
  --rpc-url URL             Demos RPC URL (default: ${DEFAULT_RPC_URL})
  --colony-url URL          SuperColony base URL (default: ${DEFAULT_COLONY_URL})
  --poll-ms N               Execute-mode pool polling interval (default: ${DEFAULT_POLL_MS})
  --timeout-ms N            Execute-mode pool polling timeout (default: ${DEFAULT_TIMEOUT_MS})
  --check-tx HASH           Check active-pool/winners readback for an existing tx without signing or spending
  --record-lifecycle        Persist a write lifecycle record under --state-dir/write-lifecycle
  --recheck ID_OR_TX        Recheck an existing lifecycle record or tx hash without signing or spending
  --state-dir PATH          State directory for lifecycle records (does not affect wallet auth here)
  --proof-out PATH          Write the lifecycle proof packet to this path
  --bettor ADDRESS          Optional bettor address for --check-tx fallback matching
  --execute                 Broadcast one real DEM bet; omitted means confirm-only/no spend
  --help, -h                Show this help

Output: JSON proof report. No separate /api/bets/place call is made.`);
  process.exit(0);
}

for (const flag of [
  "--asset",
  "--horizon",
  "--predicted-price",
  "--amount",
  "--env",
  "--rpc-url",
  "--colony-url",
  "--poll-ms",
  "--timeout-ms",
  "--check-tx",
  "--recheck",
  "--state-dir",
  "--proof-out",
  "--bettor",
]) {
  const index = args.indexOf(flag);
  if (index >= 0 && !args[index + 1]) {
    console.error(`Error: ${flag} requires a value`);
    process.exit(2);
  }
}

const asset = (getStringArg(args, "--asset") ?? DEFAULT_ASSET).trim().toUpperCase();
const horizon = normalizeHorizon(getStringArg(args, "--horizon") ?? DEFAULT_HORIZON);
const predictedPrice = getPositiveNumberArg("--predicted-price", DEFAULT_PREDICTED_PRICE);
const amount = getPositiveNumberArg("--amount", DEFAULT_AMOUNT);
const envPath = getStringArg(args, "--env") ?? ".env";
const rpcUrl = getStringArg(args, "--rpc-url") ?? process.env.DEMOS_RPC_URL ?? process.env.RPC_URL ?? DEFAULT_RPC_URL;
const colonyUrl = stripTrailingSlash(
  getStringArg(args, "--colony-url") ?? process.env.SUPERCOLONY_API_URL ?? process.env.SUPERCOLONY_API ?? DEFAULT_COLONY_URL,
);
const pollMs = getPositiveIntegerArg("--poll-ms", DEFAULT_POLL_MS);
const timeoutMs = getPositiveIntegerArg("--timeout-ms", DEFAULT_TIMEOUT_MS);
const recheckId = getStringArg(args, "--recheck");
const checkTx = getStringArg(args, "--check-tx") ?? recheckId;
const stateDir = getStringArg(args, "--state-dir");
const proofOut = getStringArg(args, "--proof-out");
const recordLifecycle = lifecycleFlagEnabled(args) || Boolean(recheckId);
const checkBettor = getStringArg(args, "--bettor") ?? "";
const execute = hasFlag(args, "--execute");

if (amount < DEFAULT_AMOUNT) {
  console.error(`Error: --amount must be at least ${DEFAULT_AMOUNT} DEM for SuperColony bets`);
  process.exit(2);
}

try {
  const lifecycleStore = recordLifecycle ? createWriteLifecycleStore({ stateDir }) : null;
  const recheckRecord = recheckId && lifecycleStore ? await lifecycleStore.get(recheckId) : null;
  const effectiveCheckTx = recheckRecord?.txHash ?? checkTx;
  const effectiveBettor = recheckRecord?.walletAddress ?? checkBettor;
  const effectiveAsset = (recheckRecord?.asset ?? asset).trim().toUpperCase();
  const effectiveHorizon = normalizeHorizon(recheckRecord?.horizon ?? horizon);
  const effectivePredictedPrice = recheckRecord?.predictedPrice ?? predictedPrice;
  const effectiveAmount = recheckRecord?.budget.amount ?? amount;
  const effectiveMemo = recheckRecord?.memo ?? buildBetMemo(effectiveAsset, effectivePredictedPrice, { horizon: effectiveHorizon });
  const before = await fetchPool(colonyUrl, effectiveAsset, effectiveHorizon);

  if (effectiveCheckTx) {
    const readback = await pollPoolReadback({
      colonyUrl,
      asset: effectiveAsset,
      horizon: effectiveHorizon,
      txHash: effectiveCheckTx,
      bettor: effectiveBettor ?? "",
      predictedPrice: effectivePredictedPrice,
      before,
      timeoutMs,
      pollMs,
      amount: effectiveAmount,
    });
    const lifecycle = lifecycleStore
      ? await persistBetLifecycle({
          store: lifecycleStore,
          existingRecordId: recheckRecord?.id,
          address: effectiveBettor || null,
          txHash: effectiveCheckTx,
          asset: effectiveAsset,
          horizon: effectiveHorizon,
          predictedPrice: effectivePredictedPrice,
          amount: effectiveAmount,
          memo: effectiveMemo,
          readback,
          spendStatus: "no-spend",
          proofOut,
        })
      : null;
    console.log(JSON.stringify({
      attempted: false,
      ok: readback.ok,
      mode: "readback-check-no-broadcast",
      officialPath: "native memo transfer; no /api/bets/place registration call",
      txHash: effectiveCheckTx,
      expected: {
        asset: effectiveAsset,
        horizon: effectiveHorizon,
        predictedPrice: effectivePredictedPrice,
        amount: effectiveAmount,
        bettor: effectiveBettor || null,
      },
      readback,
      lifecycle,
    }, null, 2));
    process.exit(readback.ok ? 0 : 1);
  }

  const env = { ...readEnv(envPath), ...process.env };
  const mnemonic = env.DEMOS_MNEMONIC;
  if (!mnemonic) {
    throw new Error(`DEMOS_MNEMONIC not found in ${resolve(envPath)} or process env`);
  }

  const memo = buildBetMemo(asset, predictedPrice, { horizon });
  const demos = new Demos();
  await demos.connect(rpcUrl);
  await demos.connectWallet(mnemonic);
  const address = demos.getAddress();
  const signed = await withMutedConsoleLog(() => buildSignedNativeMemoTransfer(demos, before.poolAddress, amount, memo));
  const confirmed = await withMutedConsoleLog(() => DemosTransactions.confirm(signed, demos));
  const confirmData = readRecord(readRecord(confirmed)?.response)?.data;
  const confirmRecord = readRecord(confirmData);

  if (!execute) {
    console.log(JSON.stringify({
      attempted: false,
      ok: Boolean(confirmRecord?.valid),
      mode: "confirm-only-no-broadcast",
      officialPath: "native memo transfer; no /api/bets/place registration call",
      address,
      pool: summarizePool(before),
      transfer: {
        to: before.poolAddress,
        amount,
        memo,
        txHash: signed.hash,
        requestShape: signed.content.data,
      },
      confirm: {
        valid: confirmRecord?.valid ?? null,
        message: confirmRecord?.message ?? null,
      },
      next: "Re-run with --execute to broadcast one real 5 DEM bet and poll active-pool plus winners readback.",
    }, null, 2));
    process.exit(confirmRecord?.valid ? 0 : 1);
  }

  const chainBefore = await getLastBlock(demos);
  const broadcast = await DemosTransactions.broadcast(confirmed, demos);
  const broadcastRecord = readRecord(broadcast);
  const confirmationBlock = readNumber(readRecord(broadcastRecord?.extra)?.confirmationBlock);
  const txHash = signed.hash;
  const readback = await pollPoolReadback({
    colonyUrl,
    asset,
    horizon,
    txHash,
    bettor: address,
    predictedPrice,
    before,
    timeoutMs,
    pollMs,
    amount,
  });
  const chainAfter = await getLastBlock(demos);
  const lifecycle = lifecycleStore
    ? await persistBetLifecycle({
        store: lifecycleStore,
        address,
        txHash,
        asset,
        horizon,
        predictedPrice,
        amount,
        memo,
        readback,
        spendStatus: "executed",
        chain: {
          beforeLastBlock: chainBefore,
          afterLastBlock: chainAfter,
          confirmationBlock: confirmationBlock ?? null,
        },
        proofOut,
      })
    : null;

  console.log(JSON.stringify({
    attempted: true,
    ok: readback.ok,
    mode: "execute-broadcast",
    officialPath: "native memo transfer; no /api/bets/place registration call",
    address,
    poolBefore: summarizePool(before),
    transfer: {
      to: before.poolAddress,
      amount,
      memo,
      txHash,
      requestShape: signed.content.data,
    },
    confirm: {
      valid: confirmRecord?.valid ?? null,
      message: confirmRecord?.message ?? null,
    },
    broadcast: summarizeBroadcast(broadcast),
    chain: {
      beforeLastBlock: chainBefore,
      afterLastBlock: chainAfter,
      confirmationBlock: confirmationBlock ?? null,
      reachedConfirmationBlock: confirmationBlock === undefined || chainAfter === null ? null : chainAfter >= confirmationBlock,
    },
    readback,
    lifecycle,
  }, null, 2));
  process.exit(readback.ok ? 0 : 1);
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
}

async function persistBetLifecycle(opts: {
  store: ReturnType<typeof createWriteLifecycleStore>;
  existingRecordId?: string;
  address: string | null;
  txHash: string;
  asset: string;
  horizon: string;
  predictedPrice: number;
  amount: number;
  memo: string;
  readback: Awaited<ReturnType<typeof pollPoolReadback>>;
  spendStatus: "no-spend" | "executed";
  chain?: Record<string, unknown>;
  proofOut?: string;
}): Promise<Record<string, unknown>> {
  const matchedBy = opts.readback.matchedBy;
  const status = classifyLifecycleStatus({
    txHash: opts.txHash,
    chainConfirmed: Boolean(opts.chain),
    indexed: matchedBy?.startsWith("active-") ?? false,
    resolved: matchedBy?.startsWith("winner-") ?? false,
    expired: !opts.readback.ok,
  });
  const record = opts.existingRecordId
    ? await opts.store.update(opts.existingRecordId, {
        txHash: opts.txHash,
        status,
        transitionReason: opts.readback.ok ? `BET readback matched by ${matchedBy}` : "BET delayed readback expired",
        observation: {
          surface: matchedBy?.startsWith("winner-") ? "winners-history" : "active-pool",
          status,
          ok: opts.readback.ok,
          summary: opts.readback.ok ? `BET readback matched by ${matchedBy}` : "BET readback did not match active pool or winners/history",
          data: opts.readback,
        },
        finalVerdict: finalVerdictForStatus(status)
          ? {
              verdict: finalVerdictForStatus(status)!,
              rationale: opts.readback.ok ? `BET readback matched by ${matchedBy}` : "BET readback expired",
              at: new Date().toISOString(),
            }
          : undefined,
      })
    : await opts.store.create({
        actionFamily: "bet-fixed",
        walletAddress: opts.address,
        command: process.argv.join(" "),
        commit: readCurrentGitCommit(),
        budget: { amount: opts.amount, unit: "DEM", ceiling: opts.amount, spendStatus: opts.spendStatus },
        txHash: opts.txHash,
        asset: opts.asset,
        horizon: opts.horizon,
        memo: opts.memo,
        predictedPrice: opts.predictedPrice,
        expectedReadback: ["chain-rpc", "active-pool", "winners-history"],
        status,
        nextRecheck: { afterMs: opts.readback.ok ? 0 : 90_000, policy: matchedBy?.startsWith("winner-") ? "round-rollover" : "delayed-indexing" },
        metadata: { officialPath: "native memo transfer; no /api/bets/place registration call" },
      });
  const updated = opts.existingRecordId ? record : await opts.store.update(record.id, {
    status,
    transitionReason: opts.readback.ok ? `BET readback matched by ${matchedBy}` : "BET readback expired",
    observation: {
      surface: matchedBy?.startsWith("winner-") ? "winners-history" : "active-pool",
      status,
      ok: opts.readback.ok,
      summary: opts.readback.ok ? `BET readback matched by ${matchedBy}` : "BET readback did not match active pool or winners/history",
      data: opts.readback,
    },
    finalVerdict: finalVerdictForStatus(status)
      ? {
          verdict: finalVerdictForStatus(status)!,
          rationale: opts.readback.ok ? `BET readback matched by ${matchedBy}` : "BET readback expired",
          at: new Date().toISOString(),
        }
      : undefined,
  });
  const withChain = opts.chain
    ? await opts.store.update(updated.id, {
        observation: {
          surface: "chain-rpc",
          status: "chain-confirmed",
          ok: true,
          summary: "Demos RPC block state captured for broadcast attempt",
          data: opts.chain,
        },
      })
    : updated;
  const proofPacket = buildWriteLifecycleProofPacket(withChain);
  const proofPath = await opts.store.writeProofPacket(withChain, proofPacket, opts.proofOut);
  return { record: withChain, proofPath, proofPacket };
}

async function buildSignedNativeMemoTransfer(
  demos: Demos,
  to: string,
  amount: number,
  memo: string,
): Promise<{ hash: string; content: JsonRecord }> {
  const address = demos.getAddress();
  const nonce = await resolveNextNonce(demos, address);
  const tx = DemosTransactions.empty() as { content: JsonRecord };
  tx.content.to = to;
  tx.content.nonce = nonce;
  tx.content.amount = amount;
  tx.content.type = "native";
  tx.content.timestamp = Date.now();
  tx.content.data = [
    "native",
    {
      nativeOperation: "send",
      args: [to, amount, memo],
    },
  ];
  return await demos.sign(tx) as { hash: string; content: JsonRecord };
}

async function resolveNextNonce(demos: Demos, address: string): Promise<number> {
  const candidates: number[] = [];
  const info = await demos.getAddressInfo(address);
  const infoNonce = readNumber(readRecord(info)?.nonce);
  if (infoNonce !== undefined) candidates.push(infoNonce);
  const rpcNonce = await demos.getAddressNonce(address);
  if (Number.isInteger(rpcNonce) && rpcNonce >= 0) candidates.push(rpcNonce);
  if (candidates.length === 0) {
    throw new Error(`Could not resolve nonce for ${address}`);
  }
  return Math.max(...candidates) + 1;
}

async function fetchPool(colonyUrl: string, asset: string, horizon: string): Promise<PoolSnapshot> {
  const url = `${colonyUrl}/api/bets/pool?asset=${encodeURIComponent(asset)}&horizon=${encodeURIComponent(horizon)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`pool fetch failed ${response.status}: ${body.slice(0, 500)}`);
  }
  const parsed = JSON.parse(body) as JsonRecord;
  const poolAddress = readString(parsed.poolAddress);
  if (!poolAddress) {
    throw new Error(`pool response missing poolAddress for ${asset}/${horizon}`);
  }
  return {
    asset: readString(parsed.asset) ?? asset,
    horizon: readString(parsed.horizon) ?? horizon,
    poolAddress,
    totalBets: readNumber(parsed.totalBets) ?? 0,
    totalDem: readNumber(parsed.totalDem) ?? 0,
    roundEnd: readNumber(parsed.roundEnd) ?? undefined,
    bets: Array.isArray(parsed.bets) ? parsed.bets.filter(isRecord) : [],
  };
}

async function pollPoolReadback(opts: {
  colonyUrl: string;
  asset: string;
  horizon: string;
  txHash: string;
  bettor: string;
  predictedPrice: number;
  before: PoolSnapshot;
  timeoutMs: number;
  pollMs: number;
  amount: number;
}): Promise<{
  ok: boolean;
  polls: number;
  matchedBy: ReadbackMatch;
  before: ReturnType<typeof summarizePool>;
  activeAfter: ReturnType<typeof summarizePool>;
  winners: {
    count: number;
    matched: ReturnType<typeof summarizeWinner> | null;
  };
}> {
  const deadline = Date.now() + opts.timeoutMs;
  let polls = 0;
  let after = opts.before;
  let winners: WinnersSnapshot = { asset: opts.asset, count: 0, winners: [] };
  let matchedWinner: JsonRecord | null = null;
  let matchedBy: ReadbackMatch = null;

  while (Date.now() <= deadline) {
    await sleep(polls === 0 ? 0 : opts.pollMs);
    polls += 1;
    after = await fetchPool(opts.colonyUrl, opts.asset, opts.horizon);
    winners = await fetchWinners(opts.colonyUrl, opts.asset);

    const poolMatchedBy = poolMatch(after, opts);
    if (poolMatchedBy) {
      matchedBy = poolMatchedBy;
      break;
    }

    const winnerMatchResult = winnerMatch(winners.winners, opts);
    if (winnerMatchResult.matchedBy) {
      matchedBy = winnerMatchResult.matchedBy;
      matchedWinner = winnerMatchResult.winner;
      break;
    }

    if (matchedBy) break;
  }

  return {
    ok: matchedBy !== null,
    polls,
    matchedBy,
    before: summarizePool(opts.before),
    activeAfter: summarizePool(after),
    winners: {
      count: winners.count,
      matched: matchedWinner ? summarizeWinner(matchedWinner) : null,
    },
  };
}

function poolMatch(
  pool: PoolSnapshot,
  expected: { txHash: string; bettor: string; predictedPrice: number; before: PoolSnapshot; amount: number },
): "active-txHash" | "active-bettor-price" | "active-pool-count" | null {
  const normalizedTxHash = expected.txHash.toLowerCase();
  const normalizedBettor = expected.bettor.toLowerCase();
  for (const bet of pool.bets) {
    const betTxHash = readString(bet.txHash) ?? readString(bet.tx_hash) ?? readString(bet.transactionHash);
    if (betTxHash?.toLowerCase() === normalizedTxHash) return "active-txHash";
    const bettor = readString(bet.bettor) ?? readString(bet.address) ?? readString(bet.agent) ?? readString(bet.author);
    const price = readNumber(bet.predictedPrice) ?? readNumber(bet.price) ?? readNumber(bet.prediction);
    if (bettor?.toLowerCase() === normalizedBettor && price === expected.predictedPrice) {
      return "active-bettor-price";
    }
  }
  const totalBetsIncreased = pool.totalBets > expected.before.totalBets;
  const totalDemIncreasedByAmount = pool.totalDem >= expected.before.totalDem + expected.amount;
  if (totalBetsIncreased && totalDemIncreasedByAmount) {
    return "active-pool-count";
  }
  return null;
}

function winnerMatch(
  winners: JsonRecord[],
  expected: { txHash: string; bettor: string; predictedPrice: number; horizon: string },
): { matchedBy: "winner-txHash" | "winner-bettor-price" | null; winner: JsonRecord | null } {
  const normalizedTxHash = expected.txHash.toLowerCase();
  const normalizedBettor = expected.bettor.toLowerCase();
  for (const winner of winners) {
    const winnerTxHash = readString(winner.txHash) ?? readString(winner.tx_hash) ?? readString(winner.transactionHash);
    if (winnerTxHash?.toLowerCase() === normalizedTxHash) {
      return { matchedBy: "winner-txHash", winner };
    }

    const bettor = readString(winner.bettor) ?? readString(winner.address) ?? readString(winner.agent) ?? readString(winner.author);
    const price = readNumber(winner.predictedPrice) ?? readNumber(winner.price) ?? readNumber(winner.prediction);
    const horizon = readString(winner.horizon);
    if (bettor?.toLowerCase() === normalizedBettor && price === expected.predictedPrice && horizon === expected.horizon) {
      return { matchedBy: "winner-bettor-price", winner };
    }
  }

  return { matchedBy: null, winner: null };
}

function summarizePool(pool: PoolSnapshot) {
  return {
    asset: pool.asset,
    horizon: pool.horizon,
    poolAddress: pool.poolAddress,
    totalBets: pool.totalBets,
    totalDem: pool.totalDem,
    roundEnd: pool.roundEnd,
    betCount: pool.bets.length,
  };
}

function summarizeWinner(winner: JsonRecord) {
  return {
    txHash: readString(winner.txHash) ?? readString(winner.tx_hash) ?? readString(winner.transactionHash) ?? null,
    asset: readString(winner.asset) ?? null,
    bettor: readString(winner.bettor) ?? readString(winner.address) ?? readString(winner.agent) ?? readString(winner.author) ?? null,
    predictedPrice: readNumber(winner.predictedPrice) ?? readNumber(winner.price) ?? readNumber(winner.prediction) ?? null,
    amount: readNumber(winner.amount) ?? null,
    roundEnd: readNumber(winner.roundEnd) ?? null,
    status: readString(winner.status) ?? null,
    payout: readNumber(winner.payout) ?? null,
    payoutTxHash: readString(winner.payoutTxHash) ?? null,
    blockNumber: readNumber(winner.blockNumber) ?? null,
    horizon: readString(winner.horizon) ?? null,
  };
}

async function fetchWinners(colonyUrl: string, asset: string): Promise<WinnersSnapshot> {
  const url = `${colonyUrl}/api/bets?view=winners&asset=${encodeURIComponent(asset)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`winners fetch failed ${response.status}: ${body.slice(0, 500)}`);
  }
  const parsed = JSON.parse(body) as unknown;
  if (Array.isArray(parsed)) {
    return {
      asset,
      count: parsed.length,
      winners: parsed.filter(isRecord),
    };
  }
  const record = readRecord(parsed);
  if (!record) {
    return { asset, count: 0, winners: [] };
  }
  const winners = Array.isArray(record.winners) ? record.winners.filter(isRecord) : [];
  return {
    asset: readString(record.asset) ?? asset,
    count: readNumber(record.count) ?? winners.length,
    winners,
  };
}

function summarizeBroadcast(value: unknown): unknown {
  const record = readRecord(value);
  if (!record) return value;
  return {
    response: record.response,
    extra: record.extra,
    hash: record.hash,
    txHash: record.txHash,
  };
}

async function getLastBlock(demos: Demos): Promise<number | null> {
  try {
    const value = await demos.getLastBlockNumber();
    return readNumber(value) ?? null;
  } catch {
    return null;
  }
}

function readEnv(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[match[1]] = value;
  }
  return out;
}

function getPositiveNumberArg(flag: string, fallback: number): number {
  const parsed = getNumberArg(args, flag) ?? fallback;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.error(`Error: invalid ${flag} value ${parsed}`);
    process.exit(2);
  }
  return parsed;
}

function getPositiveIntegerArg(flag: string, fallback: number): number {
  const parsed = getPositiveNumberArg(flag, fallback);
  if (!Number.isInteger(parsed)) {
    console.error(`Error: invalid ${flag} value ${parsed}; expected integer`);
    process.exit(2);
  }
  return parsed;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function readRecord(value: unknown): JsonRecord | null {
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

async function withMutedConsoleLog<T>(fn: () => Promise<T>): Promise<T> {
  const originalLog = console.log;
  try {
    console.log = () => undefined;
    return await fn();
  } finally {
    console.log = originalLog;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}
