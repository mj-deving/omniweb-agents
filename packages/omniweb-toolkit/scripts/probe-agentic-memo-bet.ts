#!/usr/bin/env npx tsx
/**
 * probe-agentic-memo-bet.ts — direct SuperColony agentic DEM bet probe.
 *
 * This intentionally bypasses the toolkit primitive layer and exercises the
 * official headless contract from https://supercolony.ai/supercolony-skill.md:
 * send 5 DEM to the active pool with a HIVE_BET memo on the native transfer.
 *
 * Default behavior is confirm-only and does not broadcast. Passing --execute
 * broadcasts one 5 DEM bet and polls pool readback.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Demos, DemosTransactions } from "@kynesyslabs/demosdk/websdk";
import { buildBetMemo, normalizeHorizon } from "../../../src/toolkit/supercolony/bet-memos.js";
import { getNumberArg, getStringArg, hasFlag } from "./_shared.js";

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
const execute = hasFlag(args, "--execute");

if (amount < DEFAULT_AMOUNT) {
  console.error(`Error: --amount must be at least ${DEFAULT_AMOUNT} DEM for SuperColony bets`);
  process.exit(2);
}

try {
  const env = { ...readEnv(envPath), ...process.env };
  const mnemonic = env.DEMOS_MNEMONIC;
  if (!mnemonic) {
    throw new Error(`DEMOS_MNEMONIC not found in ${resolve(envPath)} or process env`);
  }

  const before = await fetchPool(colonyUrl, asset, horizon);
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
      next: "Re-run with --execute to broadcast one real 5 DEM bet and poll pool readback.",
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
  });
  const chainAfter = await getLastBlock(demos);

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
  }, null, 2));
  process.exit(readback.ok ? 0 : 1);
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
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
}): Promise<{
  ok: boolean;
  polls: number;
  matchedBy: "txHash" | "bettor-price" | "pool-count" | null;
  before: ReturnType<typeof summarizePool>;
  after: ReturnType<typeof summarizePool>;
}> {
  const deadline = Date.now() + opts.timeoutMs;
  let polls = 0;
  let after = opts.before;
  let matchedBy: "txHash" | "bettor-price" | "pool-count" | null = null;

  while (Date.now() <= deadline) {
    await sleep(polls === 0 ? 0 : opts.pollMs);
    polls += 1;
    after = await fetchPool(opts.colonyUrl, opts.asset, opts.horizon);
    matchedBy = poolMatch(after, opts);
    if (matchedBy) break;
  }

  return {
    ok: matchedBy !== null,
    polls,
    matchedBy,
    before: summarizePool(opts.before),
    after: summarizePool(after),
  };
}

function poolMatch(
  pool: PoolSnapshot,
  expected: { txHash: string; bettor: string; predictedPrice: number; before: PoolSnapshot },
): "txHash" | "bettor-price" | "pool-count" | null {
  const normalizedTxHash = expected.txHash.toLowerCase();
  const normalizedBettor = expected.bettor.toLowerCase();
  for (const bet of pool.bets) {
    const betTxHash = readString(bet.txHash) ?? readString(bet.tx_hash) ?? readString(bet.transactionHash);
    if (betTxHash?.toLowerCase() === normalizedTxHash) return "txHash";
    const bettor = readString(bet.bettor) ?? readString(bet.address) ?? readString(bet.agent) ?? readString(bet.author);
    const price = readNumber(bet.predictedPrice) ?? readNumber(bet.price) ?? readNumber(bet.prediction);
    if (bettor?.toLowerCase() === normalizedBettor && price === expected.predictedPrice) {
      return "bettor-price";
    }
  }
  if (pool.totalBets > expected.before.totalBets || pool.totalDem >= expected.before.totalDem + DEFAULT_AMOUNT) {
    return "pool-count";
  }
  return null;
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
