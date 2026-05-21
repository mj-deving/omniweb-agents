#!/usr/bin/env npx tsx

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getNumberArg, getStringArg, hasFlag, loadConnect } from "./_shared.ts";
import {
  buildWriteLifecycleProofPacket,
  classifyLifecycleStatus,
  createWriteLifecycleStore,
  finalVerdictForStatus,
  lifecycleFlagEnabled,
  readCurrentGitCommit,
} from "./_write-lifecycle.ts";

const DEFAULT_VERIFY_TIMEOUT_MS = 45_000;
const DEFAULT_VERIFY_POLL_MS = 5_000;
const DEFAULT_VERIFY_LIMIT = 50;
const DEFAULT_RPC_CANDIDATES = [
  "https://node3.demos.sh/",
  "https://node2.demos.sh/",
  "https://demosnode.discus.sh/",
] as const;

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-vote-publish.ts [options]

Options:
  --broadcast               Publish a real HIVE VOTE post
  --asset SYMBOL            Asset symbol for --broadcast (default: BTC)
  --predicted-price N       Predicted price for --broadcast
  --reference-price N       Reference price for --broadcast
  --confidence N            Confidence percentage 0-100 (default: 70)
  --attest-url URL          Optional DAHR source URL to attach to the VOTE post
  --env-path PATH           Override wallet credentials file passed to connect()
  --agent-name NAME         Use named wallet credentials when present
  --rpc-url URL             Use one explicit Demos RPC URL
  --rpc-candidates LIST     Comma-separated Demos RPC URLs to try before declaring connect STUCK
  --state-dir PATH          Forwarded to connect()/state persistence
  --record-lifecycle        Persist a write lifecycle record under --state-dir/write-lifecycle
  --recheck ID_OR_TX        Recheck an existing lifecycle record or tx hash without broadcasting
  --proof-out PATH          Write the lifecycle proof packet to this path
  --allow-insecure          Forwarded to connect() for local debugging only
  --verify-timeout-ms N     VOTE readback timeout (default: ${DEFAULT_VERIFY_TIMEOUT_MS})
  --verify-poll-ms N        VOTE readback poll interval (default: ${DEFAULT_VERIFY_POLL_MS})
  --verify-limit N          VOTE feed search limit (default: ${DEFAULT_VERIFY_LIMIT})
  --out PATH                Write the JSON report to a file as well as stdout
  --help, -h                Show this help
`);
  process.exit(0);
}

const broadcast = hasFlag(args, "--broadcast");
const asset = (getStringArg(args, "--asset") ?? "BTC").trim().toUpperCase();
const predictedPrice = getNumberArg(args, "--predicted-price");
const referencePrice = getNumberArg(args, "--reference-price");
const confidence = getNumberArg(args, "--confidence") ?? 70;
const attestUrl = getStringArg(args, "--attest-url");
const envPath = getStringArg(args, "--env-path");
const agentName = getStringArg(args, "--agent-name");
const rpcUrl = getStringArg(args, "--rpc-url");
const rpcCandidatesArg = getStringArg(args, "--rpc-candidates");
const stateDir = getStringArg(args, "--state-dir");
const recordLifecycle = lifecycleFlagEnabled(args);
const recheckId = getStringArg(args, "--recheck");
const allowInsecureUrls = hasFlag(args, "--allow-insecure");
const verifyTimeoutMs = getPositiveIntegerArg("--verify-timeout-ms", DEFAULT_VERIFY_TIMEOUT_MS);
const verifyPollMs = getPositiveIntegerArg("--verify-poll-ms", DEFAULT_VERIFY_POLL_MS);
const verifyLimit = getPositiveIntegerArg("--verify-limit", DEFAULT_VERIFY_LIMIT);
const outputPath = getStringArg(args, "--out");
const proofOut = getStringArg(args, "--proof-out");
const command = redactRuntimeCommand(process.argv);
const rpcCandidates = buildRpcCandidates({ rpcUrl, rpcCandidatesArg });
let rpcSelection: RpcSelectionReport | null = null;
let fatalEmitted = false;

process.on("uncaughtException", (error) => {
  void emitFatalError(error);
});
process.on("unhandledRejection", (error) => {
  void emitFatalError(error);
});

if (broadcast) {
  if (!Number.isFinite(predictedPrice) || predictedPrice! <= 0) {
    failUsage("--predicted-price is required for --broadcast and must be positive");
  }
  if (!Number.isFinite(referencePrice) || referencePrice! <= 0) {
    failUsage("--reference-price is required for --broadcast and must be positive");
  }
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
    failUsage("--confidence must be between 0 and 100");
  }
}

const connect = await loadConnect();
const selected = await connectWithRpcCandidates(connect, {
  envPath,
  agentName,
  stateDir,
  allowInsecureUrls,
}, rpcCandidates);
const omni = selected.omni;
rpcSelection = selected.selection;
const lifecycleStore = recordLifecycle || recheckId ? createWriteLifecycleStore({ stateDir }) : null;

if (recheckId) {
  const record = await lifecycleStore!.get(recheckId);
  const txHash = record?.txHash ?? recheckId;
  const readbackCheck = await pollVoteReadback(omni, txHash, verifyTimeoutMs, verifyPollMs, verifyLimit);
  const status = classifyLifecycleStatus({
    txHash,
    indexed: Boolean(readbackCheck.found),
    expired: !readbackCheck.found,
  });
  const baseRecord = record
    ?? await lifecycleStore!.create({
      actionFamily: "vote",
      walletAddress: omni.address ?? null,
      command,
      commit: readCurrentGitCommit(),
      budget: { unit: "write-rate-slot", spendStatus: "no-spend" },
      txHash,
      expectedReadback: ["category-search"],
      status: txHash ? "broadcasted" : "planned",
      metadata: { recheckOnly: true },
    });
  const updated = await lifecycleStore!.update(baseRecord.id, {
        status,
        transitionReason: readbackCheck.found ? "VOTE category search matched tx" : "VOTE category search recheck expired",
        observation: {
          surface: "category-search",
          status,
          ok: Boolean(readbackCheck.found),
          summary: readbackCheck.found
            ? "search({ category: \"VOTE\" }) matched the recorded tx"
            : "search({ category: \"VOTE\" }) did not match the recorded tx within the recheck window",
          data: readbackCheck,
        },
        finalVerdict: finalVerdictForStatus(status)
          ? {
              verdict: finalVerdictForStatus(status)!,
              rationale: readbackCheck.found ? "VOTE indexed through category search" : "VOTE readback expired",
              at: new Date().toISOString(),
            }
          : undefined,
      });
  const proofPacket = buildWriteLifecycleProofPacket(updated);
  const proofPath = await lifecycleStore!.writeProofPacket(updated, proofPacket, proofOut);
  const report = {
    ok: Boolean(readbackCheck.found),
    checkedAt: new Date().toISOString(),
    operatorPath: "hive-vote-publish",
    broadcast: false,
    mode: "lifecycle-recheck",
    rpcSelection,
    txHash,
    readback: readbackCheck,
    lifecycle: {
      record: updated,
      proofPath,
      proofPacket,
    },
  };
  await maybeWriteOutput(outputPath, report);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

const before = await searchVotes(omni, verifyLimit);
let publishResult: unknown = null;
let readback: unknown = null;
let ok = before.ok;
let lifecycle: unknown = null;

if (broadcast) {
  const lifecycleRecord = lifecycleStore
    ? await lifecycleStore.create({
        actionFamily: "vote",
        walletAddress: omni.address ?? null,
        command,
        commit: readCurrentGitCommit(),
        budget: { unit: "write-rate-slot", amount: 1, ceiling: 1, spendStatus: "planned" },
        asset,
        expectedReadback: ["category-search"],
        nextRecheck: { afterMs: verifyTimeoutMs, policy: "short-window" },
        metadata: { confidence, referencePrice, predictedPrice, attestUrl },
      })
    : null;
  publishResult = await withSuppressedConsoleLog(() => omni.colony.publishVote({
    asset,
    predictedPrice,
    referencePrice,
    confidence,
    attestUrl,
  }));

  const txHash = publishResult && typeof publishResult === "object" && "data" in publishResult
    ? (publishResult as { data?: { txHash?: string } }).data?.txHash
    : undefined;
  const attestationTxHash = publishResult && typeof publishResult === "object" && "data" in publishResult
    ? (publishResult as { data?: { attestationTxHash?: string } }).data?.attestationTxHash
    : undefined;
  readback = await pollVoteReadback(omni, txHash, verifyTimeoutMs, verifyPollMs, verifyLimit);
  ok = Boolean((publishResult as { ok?: boolean } | null)?.ok && (readback as { found?: boolean } | null)?.found);

  if (lifecycleRecord) {
    const publishSucceeded = Boolean((publishResult as { ok?: boolean } | null)?.ok);
    const status = classifyLifecycleStatus({
      txHash,
      indexed: Boolean((readback as { found?: boolean }).found),
      expired: Boolean(txHash) && !(readback as { found?: boolean }).found,
      failed: !publishSucceeded,
    });
    const updated = await lifecycleStore!.update(lifecycleRecord.id, {
      status,
      txHash,
      attestationTxHash,
      budget: {
        unit: "write-rate-slot",
        amount: 1,
        ceiling: 1,
        spendStatus: publishSucceeded && txHash ? "executed" : "planned",
      },
      transitionReason: ok ? "VOTE category search matched tx" : "VOTE short-window readback did not close",
      observation: {
        surface: "category-search",
        status,
        ok,
        summary: ok
          ? "search({ category: \"VOTE\" }) matched the broadcast tx"
          : "short-window VOTE search did not match the broadcast tx",
        data: readback,
      },
      finalVerdict: finalVerdictForStatus(status)
        ? {
            verdict: finalVerdictForStatus(status)!,
            rationale: ok ? "VOTE indexed through category search" : "VOTE short-window readback expired",
            at: new Date().toISOString(),
          }
        : undefined,
    });
    const proofPacket = buildWriteLifecycleProofPacket(updated);
    const proofPath = await lifecycleStore!.writeProofPacket(updated, proofPacket, proofOut);
    lifecycle = { record: updated, proofPath, proofPacket };
  }
}

const report = {
  ok,
  checkedAt: new Date().toISOString(),
  operatorPath: "hive-vote-publish",
  broadcast,
  rpcSelection,
  asset,
  before,
  publishResult,
  readback,
  lifecycle,
  note: broadcast
    ? "Executed publishVote() and verified via search({ category: \"VOTE\" })."
    : "Dry run only. Re-run with --broadcast plus prices to publish a real HIVE VOTE post.",
};

await maybeWriteOutput(outputPath, report);
console.log(JSON.stringify(report, null, 2));
process.exit(ok ? 0 : 1);

async function searchVotes(omni: any, limit: number) {
  const result = await omni.colony.search({ category: "VOTE", limit });
  const posts = extractPosts(result);
  return {
    ok: Boolean(result?.ok && posts.length > 0),
    count: posts.length,
    sample: posts.slice(0, 3).map((post) => ({
      txHash: post.txHash,
      author: post.author,
      category: post.category,
      assets: post.assets,
      confidence: post.confidence,
      payload: post.payload,
      text: typeof post.text === "string" ? post.text.slice(0, 160) : post.text,
    })),
  };
}

async function pollVoteReadback(
  omni: any,
  txHash: string | undefined,
  timeoutMs: number,
  pollMs: number,
  limit: number,
) {
  const deadline = Date.now() + timeoutMs;
  do {
    const result = await omni.colony.search({ category: "VOTE", limit });
    const posts = extractPosts(result);
    const match = txHash ? posts.find((post) => post.txHash === txHash) : null;
    if (match) {
      return { found: true, txHash, post: match };
    }
    await sleep(pollMs);
  } while (Date.now() < deadline);

  return { found: false, txHash, timeoutMs };
}

function extractPosts(result: unknown): any[] {
  if (!result || typeof result !== "object") return [];
  const data = "ok" in result && (result as { ok?: boolean }).ok
    ? (result as { data?: unknown }).data
    : result;
  if (!data || typeof data !== "object") return [];
  const posts = (data as { posts?: unknown; feed?: unknown }).posts ?? (data as { posts?: unknown; feed?: unknown }).feed;
  return Array.isArray(posts) ? posts : [];
}

function getPositiveIntegerArg(flag: string, fallback: number): number {
  const value = getNumberArg(args, flag) ?? fallback;
  if (!Number.isInteger(value) || value <= 0) {
    failUsage(`${flag} must be a positive integer`);
  }
  return value;
}

function failUsage(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(2);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function maybeWriteOutput(path: string | undefined, data: unknown): Promise<void> {
  if (!path) return;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
}

async function emitFatalError(error: unknown): Promise<never> {
  if (fatalEmitted) process.exit(1);
  fatalEmitted = true;
  const report = {
    ok: false,
    checkedAt: new Date().toISOString(),
    operatorPath: "hive-vote-publish",
    broadcast,
    asset,
    mode: recheckId ? "lifecycle-recheck" : broadcast ? "broadcast" : "dry-run",
    rpcSelection,
    error: summarizeRuntimeError(error),
  };
  await maybeWriteOutput(outputPath, report);
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

function summarizeRuntimeError(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }
  const record = error as {
    name?: unknown;
    message?: unknown;
    code?: unknown;
    status?: unknown;
    response?: { status?: unknown; statusText?: unknown };
  };
  return {
    name: typeof record.name === "string" ? record.name : "Error",
    message: typeof record.message === "string" ? record.message : String(error),
    code: typeof record.code === "string" ? record.code : null,
    status: typeof record.status === "number"
      ? record.status
      : typeof record.response?.status === "number"
        ? record.response.status
        : null,
    statusText: typeof record.response?.statusText === "string" ? record.response.statusText : null,
    retryable: record.code === "ERR_BAD_RESPONSE" || record.response?.status === 502,
  };
}

interface RpcCandidate {
  label: string;
  rpcUrl?: string;
  source: "configured" | "--rpc-url" | "--rpc-candidates" | "default";
}

interface RpcAttemptReport {
  label: string;
  rpcUrl: string | null;
  source: RpcCandidate["source"];
  ok: boolean;
  error?: Record<string, unknown>;
}

interface RpcSelectionReport {
  selected: {
    label: string;
    rpcUrl: string | null;
    source: RpcCandidate["source"];
  } | null;
  attempts: RpcAttemptReport[];
}

function buildRpcCandidates(input: {
  rpcUrl?: string;
  rpcCandidatesArg?: string;
}): RpcCandidate[] {
  if (input.rpcUrl?.trim()) {
    return [{
      label: "explicit",
      rpcUrl: normalizeRpcUrl(input.rpcUrl),
      source: "--rpc-url",
    }];
  }

  const rawCandidates = input.rpcCandidatesArg?.trim()
    ? splitCandidateList(input.rpcCandidatesArg)
    : splitCandidateList(process.env.DEMOS_RPC_CANDIDATES ?? DEFAULT_RPC_CANDIDATES.join(","));

  const candidates: RpcCandidate[] = [{
    label: "configured",
    rpcUrl: undefined,
    source: "configured",
  }];

  const seen = new Set<string>();
  for (const raw of rawCandidates) {
    const normalized = normalizeRpcUrl(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    candidates.push({
      label: hostLabel(normalized),
      rpcUrl: normalized,
      source: input.rpcCandidatesArg?.trim() ? "--rpc-candidates" : "default",
    });
  }

  return candidates;
}

function splitCandidateList(value: string): string[] {
  return value
    .split(",")
    .map((candidate) => candidate.trim())
    .filter((candidate) => candidate.length > 0);
}

function normalizeRpcUrl(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (!url.pathname || url.pathname === "") {
      url.pathname = "/";
    }
    return url.toString();
  } catch {
    return trimmed;
  }
}

function hostLabel(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

async function connectWithRpcCandidates(
  connect: Awaited<ReturnType<typeof loadConnect>>,
  opts: {
    envPath?: string;
    agentName?: string;
    stateDir?: string;
    allowInsecureUrls?: boolean;
  },
  candidates: RpcCandidate[],
): Promise<{ omni: any; selection: RpcSelectionReport }> {
  const attempts: RpcAttemptReport[] = [];

  for (const candidate of candidates) {
    try {
      const omni = await connect({
        ...opts,
        rpcUrl: candidate.rpcUrl,
      });
      attempts.push({
        label: candidate.label,
        rpcUrl: candidate.rpcUrl ?? null,
        source: candidate.source,
        ok: true,
      });
      return {
        omni,
        selection: {
          selected: {
            label: candidate.label,
            rpcUrl: candidate.rpcUrl ?? null,
            source: candidate.source,
          },
          attempts,
        },
      };
    } catch (error) {
      const summary = summarizeRuntimeError(error);
      attempts.push({
        label: candidate.label,
        rpcUrl: candidate.rpcUrl ?? null,
        source: candidate.source,
        ok: false,
        error: summary,
      });

      if (!isRetryableRpcConnectError(summary)) {
        break;
      }
    }
  }

  rpcSelection = {
    selected: null,
    attempts,
  };
  const error = new Error("Unable to connect to any configured Demos RPC candidate");
  Object.assign(error, {
    rpcSelection,
  });
  throw error;
}

function isRetryableRpcConnectError(error: Record<string, unknown>): boolean {
  const message = typeof error.message === "string" ? error.message.toLowerCase() : "";
  const code = typeof error.code === "string" ? error.code : "";
  const status = typeof error.status === "number" ? error.status : null;

  return Boolean(
    error.retryable === true ||
    code === "ERR_BAD_RESPONSE" ||
    status === 502 ||
    message.includes("bad gateway") ||
    message.includes("gateway") ||
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("econnreset") ||
    message.includes("enotfound") ||
    message.includes("econnrefused"),
  );
}

function redactRuntimeCommand(argv: string[]): string {
  const out: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const part = argv[index];
    if (index === 0) {
      out.push("node");
      continue;
    }
    const marker = "packages/omniweb-toolkit/";
    const markerIndex = part.indexOf(marker);
    if (markerIndex >= 0) {
      out.push(part.slice(markerIndex));
      continue;
    }
    if (part.startsWith("/") && ["--env-path", "--state-dir", "--out", "--proof-out"].includes(argv[index - 1] ?? "")) {
      out.push("[redacted-path]");
      continue;
    }
    const [flag, value] = part.split("=", 2);
    if (value?.startsWith("/") && ["--env-path", "--state-dir", "--out", "--proof-out"].includes(flag)) {
      out.push(`${flag}=[redacted-path]`);
      continue;
    }
    if (part.startsWith("/")) {
      out.push("[redacted-path]");
      continue;
    }
    out.push(part);
  }
  return out.join(" ");
}

async function withSuppressedConsoleLog<T>(operation: () => Promise<T>): Promise<T> {
  const originalLog = console.log;
  console.log = () => undefined;
  try {
    return await operation();
  } finally {
    console.log = originalLog;
  }
}
