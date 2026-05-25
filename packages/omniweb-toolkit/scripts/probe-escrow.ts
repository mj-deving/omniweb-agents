#!/usr/bin/env npx tsx
/**
 * probe-escrow.ts — explicit live escrow send probe for omniweb-toolkit.
 *
 * Default behavior is non-destructive: it reports the intended target and amount.
 * Passing `--broadcast` executes a real `sendToIdentity()` escrow transfer.
 *
 * Output: JSON to stdout. Errors to stderr. Exit 0 when a classified proof
 * report is emitted, 1 on runtime failure before reporting, 2 on invalid args.
 */

import { getNumberArg, getStringArg, hasFlag, loadConnect } from "./_shared.js";
import {
  assertExplicitCredentialTargetExists,
  emitJsonReport,
  redactProbeCommand,
  summarizeProbeRuntimeTarget,
  validateRequiredValueFlags,
} from "./_probe-targeting.js";
import {
  classifyEscrowProofReadback,
  classifyEscrowReadbackSupport,
  classifyEscrowRecheckRuntimeBlock,
  type EscrowReadbackResult,
} from "../src/escrow-readback-classifier.js";

const args = process.argv.slice(2);
const MAX_ESCROW_PROOF_AMOUNT = 5;
const DEFAULT_VERIFY_TIMEOUT_MS = 90_000;
const DEFAULT_VERIFY_POLL_MS = 5_000;
const EXISTING_ESCROW_PROOF = {
  txHash: "2c225acd869c0041606ba7c7981f3d68ce8cd97c6a7feac83a4221f125be92b1",
  platform: "github" as const,
  username: "phase24-continuation-20260521",
  amount: 0.1,
  message: "Phase 24 continuation controlled escrow proof",
};

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/probe-escrow.ts [options]

Options:
  --platform NAME      Platform: github | twitter | telegram
  --username NAME      Username on that platform
  --amount N           DEM amount to escrow (default: 0.1)
  --message TEXT       Optional escrow message
  --env-path PATH      Override wallet credentials file passed to connect()
  --agent-name NAME    Use a named credentials profile if present
  --state-dir PATH     Override state directory
  --proof-out PATH     Write the JSON proof report to this path
  --recheck-tx-hash H  Read-only recheck of an existing escrow tx hash
  --recheck-existing-proof Read-only recheck of the maintained 0ctx escrow tx
  --verify-timeout-ms N Max tx confirmation polling time; default ${DEFAULT_VERIFY_TIMEOUT_MS}
  --verify-poll-ms N  Tx confirmation poll interval; default ${DEFAULT_VERIFY_POLL_MS}
  --broadcast          Execute the real escrow send
  --help, -h           Show this help

Output: JSON escrow probe report
Exit codes: 0 = classified report emitted, 1 = runtime failure before reporting, 2 = invalid args`);
  process.exit(0);
}

const flagError = validateRequiredValueFlags(args, [
  "--platform",
  "--username",
  "--amount",
  "--message",
  "--env-path",
  "--agent-name",
  "--state-dir",
  "--proof-out",
  "--recheck-tx-hash",
  "--verify-timeout-ms",
  "--verify-poll-ms",
]);
if (flagError) {
  console.error(flagError);
  process.exit(2);
}

const recheckExistingProof = hasFlag(args, "--recheck-existing-proof");
const platform = getStringArg(args, "--platform") || (recheckExistingProof ? EXISTING_ESCROW_PROOF.platform : undefined);
const username = getStringArg(args, "--username") || (recheckExistingProof ? EXISTING_ESCROW_PROOF.username : undefined);
const amount = getNumberArg(args, "--amount") ?? (recheckExistingProof ? EXISTING_ESCROW_PROOF.amount : 0.1);
const message = getStringArg(args, "--message") || (recheckExistingProof ? EXISTING_ESCROW_PROOF.message : undefined);
const envPath = getStringArg(args, "--env-path") || undefined;
const agentName = getStringArg(args, "--agent-name") || undefined;
const stateDirArg = getStringArg(args, "--state-dir");
const stateDir = stateDirArg || undefined;
const proofOut = getStringArg(args, "--proof-out") || undefined;
const recheckTxHash = getStringArg(args, "--recheck-tx-hash") || (recheckExistingProof ? EXISTING_ESCROW_PROOF.txHash : undefined);
const verifyTimeoutMs = getNumberArg(args, "--verify-timeout-ms") ?? DEFAULT_VERIFY_TIMEOUT_MS;
const verifyPollMs = getNumberArg(args, "--verify-poll-ms") ?? DEFAULT_VERIFY_POLL_MS;
const broadcast = hasFlag(args, "--broadcast");
const runtimeTarget = summarizeProbeRuntimeTarget({ envPath, agentName, stateDir });
const command = redactProbeCommand(process.argv);

if (!platform || !username) {
  console.error("Error: --platform and --username are required");
  process.exit(2);
}

if (!["github", "twitter", "telegram"].includes(platform)) {
  console.error(`Error: unsupported platform ${platform}`);
  process.exit(2);
}

if (!Number.isFinite(amount) || amount <= 0) {
  console.error(`Error: invalid amount ${amount}`);
  process.exit(2);
}
if (amount > MAX_ESCROW_PROOF_AMOUNT) {
  console.error(`Error: amount ${amount} exceeds controlled escrow proof ceiling ${MAX_ESCROW_PROOF_AMOUNT} DEM`);
  process.exit(2);
}
if (!Number.isFinite(verifyTimeoutMs) || verifyTimeoutMs < 0) {
  console.error("Error: --verify-timeout-ms must be a non-negative finite number");
  process.exit(2);
}
if (!Number.isFinite(verifyPollMs) || verifyPollMs <= 0) {
  console.error("Error: --verify-poll-ms must be a positive finite number");
  process.exit(2);
}

try {
  assertExplicitCredentialTargetExists(
    { envPath, agentName, stateDir },
    { requireExplicit: broadcast || Boolean(recheckTxHash), purpose: "Escrow live mutation or tx recheck" },
  );
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(2);
}

try {
  const connect = await loadConnect();
  const omni = await connect({ envPath, agentName, stateDir });
  const readbackBefore = await readEscrowReadback(omni, platform as "github" | "twitter" | "telegram", username);
  const previewGate = buildPreviewGate(readbackBefore, recheckTxHash ? "--recheck-tx-hash" : "--broadcast");

  if (recheckTxHash) {
    const verification = await waitForEscrowVerification(omni, recheckTxHash);
    const readbackAfter = await readEscrowReadback(omni, platform as "github" | "twitter" | "telegram", username);
    const readbackClassification = classifyEscrowProofReadback(
      readbackAfter,
      Boolean(verification.confirmed),
      verification.reason,
    );
    emitJsonReport({
      attempted: false,
      recheck: true,
      ok: readbackClassification.ok,
      status: readbackClassification.status,
      finalVerdict: readbackClassification.status,
      command,
      address: omni.address,
      runtimeTarget,
      platform,
      username,
      amount,
      ceilingDem: MAX_ESCROW_PROOF_AMOUNT,
      message,
      txHash: recheckTxHash,
      previewGate,
      verification,
      readbackBefore,
      readbackAfter,
      readbackClassification,
      note: "Read-only escrow tx verification/readback recheck; finalVerdict is GREEN only when claimable and balance wrappers prove product escrow state.",
    }, proofOut);
    process.exit(0);
  }

  if (!broadcast) {
    emitJsonReport({
      attempted: false,
      ok: true,
      status: "PREVIEW_GREEN",
      command,
      address: omni.address,
      runtimeTarget,
      platform,
      username,
      amount,
      ceilingDem: MAX_ESCROW_PROOF_AMOUNT,
      message,
      previewGate,
      readbackBefore,
      note: "Dry run only. Re-run with --broadcast to execute the real escrow send.",
    }, proofOut);
    process.exit(0);
  }

  if (!previewGate.ok) {
    emitJsonReport({
      attempted: false,
      ok: false,
      status: "BLOCKED",
      command,
      address: omni.address,
      runtimeTarget,
      platform,
      username,
      amount,
      ceilingDem: MAX_ESCROW_PROOF_AMOUNT,
      message,
      previewGate,
      readbackBefore,
      error: "Live escrow send blocked because preview gate is not green",
    }, proofOut);
    process.exit(0);
  }

  let suppressedSdkLogCount = 0;
  const result = await withSuppressedSdkLogs(async () => omni.escrow.sendToIdentity(
    platform as "github" | "twitter" | "telegram",
    username,
    amount,
    { message },
  ), (count) => {
    suppressedSdkLogCount = count;
  });
  const readbackAfter = await readEscrowReadback(omni, platform as "github" | "twitter" | "telegram", username);

  if (!result.ok) {
    emitJsonReport({
      attempted: true,
      ok: false,
      status: "STUCK",
      finalVerdict: "STUCK",
      command,
      address: omni.address,
      runtimeTarget,
      platform,
      username,
      amount,
      ceilingDem: MAX_ESCROW_PROOF_AMOUNT,
      message,
      previewGate,
      result,
      readbackBefore,
      readbackAfter,
      suppressedSdkLogCount,
      verdict: "Escrow send did not produce a tx hash; no successful live escrow proof.",
    }, proofOut);
    process.exit(0);
  }

  const verification = result.txHash && result.txHash !== "pending"
    ? await waitForEscrowVerification(omni, result.txHash)
    : { confirmed: false, reason: "tx hash missing or pending", attempts: 0, timeoutMs: verifyTimeoutMs };
  const readbackClassification = classifyEscrowProofReadback(
    readbackAfter,
    Boolean(verification.confirmed),
    verification.reason,
  );

  emitJsonReport({
    attempted: true,
    ok: readbackClassification.ok,
    status: readbackClassification.status,
    finalVerdict: readbackClassification.status,
    command,
    address: omni.address,
    runtimeTarget,
    platform,
    username,
    amount,
    ceilingDem: MAX_ESCROW_PROOF_AMOUNT,
    message,
    txHash: result.txHash,
    previewGate,
    result,
    verification,
    readbackBefore,
    readbackAfter,
    readbackClassification,
    suppressedSdkLogCount,
  }, proofOut);
} catch (err) {
  if (recheckTxHash) {
    const reason = err instanceof Error ? err.message : String(err);
    const readbackClassification = classifyEscrowRecheckRuntimeBlock(reason);
    emitJsonReport({
      attempted: false,
      recheck: true,
      ok: false,
      status: readbackClassification.status,
      finalVerdict: readbackClassification.status,
      command,
      runtimeTarget,
      platform,
      username,
      amount,
      ceilingDem: MAX_ESCROW_PROOF_AMOUNT,
      message,
      txHash: recheckTxHash,
      verification: { confirmed: false, reason, attempts: 0, timeoutMs: verifyTimeoutMs },
      readbackClassification,
      note: "Read-only escrow tx recheck could not reach runtime/readback; no escrow send attempted.",
    }, proofOut);
    process.exit(0);
  }
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

async function readEscrowReadback(
  omni: any,
  readPlatform: "github" | "twitter" | "telegram",
  readUsername: string,
): Promise<{
  claimable: EscrowReadbackResult;
  escrowBalance: EscrowReadbackResult;
  classification: ReturnType<typeof classifyEscrowReadbackSupport>["classification"];
  reasonCodes: string[];
  sanitizedErrors: string[];
}> {
  const [claimable, escrowBalance] = await Promise.all([
    callEscrowReadback(() => omni.escrow.getClaimable(readPlatform, readUsername)),
    callEscrowReadback(() => omni.escrow.getEscrowBalance(readPlatform, readUsername)),
  ]);
  return classifyEscrowReadbackSupport(claimable, escrowBalance, {
    platform: readPlatform,
    username: readUsername,
    amount,
    txHash: recheckTxHash,
  });
}

function buildPreviewGate(
  readback: Awaited<ReturnType<typeof readEscrowReadback>>,
  liveFlag: "--broadcast" | "--recheck-tx-hash",
): {
  ok: boolean;
  checks: Record<string, boolean>;
  reasons: string[];
  liveFlag: "--broadcast" | "--recheck-tx-hash";
} {
  const checks = {
    controlledTargetNamed: Boolean(platform && username),
    amountWithinCeiling: amount > 0 && amount <= MAX_ESCROW_PROOF_AMOUNT,
    readbackClassified: ["supported", "degraded-wrapper", "inconclusive-readback"].includes(readback.classification),
    explicitLiveFlag: true,
  };
  const reasons = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([key]) => key);
  return {
    ok: reasons.length === 0,
    checks,
    reasons,
    liveFlag,
  };
}

async function callEscrowReadback(fn: () => Promise<EscrowReadbackResult>): Promise<EscrowReadbackResult> {
  try {
    const result = await fn();
    return {
      ok: result?.ok === true,
      data: result?.ok === true ? result.data : undefined,
      error: result?.ok === true ? undefined : String(result?.error ?? "readback failed"),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function waitForEscrowVerification(omni: any, txHash: string): Promise<{
  confirmed: boolean;
  blockNumber?: number;
  attempts: number;
  timeoutMs: number;
  reason?: string;
}> {
  const started = Date.now();
  let attempts = 0;
  let reason: string | undefined;
  while (Date.now() - started <= verifyTimeoutMs) {
    attempts += 1;
    try {
      const verification = await omni.runtime.sdkBridge.verifyTransaction(txHash);
      if (verification?.confirmed) {
        return {
          confirmed: true,
          blockNumber: typeof verification.blockNumber === "number" ? verification.blockNumber : undefined,
          attempts,
          timeoutMs: verifyTimeoutMs,
        };
      }
      reason = "verifyTransaction did not confirm tx";
    } catch (err) {
      reason = err instanceof Error ? err.message : String(err);
    }
    if (verifyTimeoutMs === 0) break;
    await sleep(verifyPollMs);
  }
  return { confirmed: false, attempts, timeoutMs: verifyTimeoutMs, reason };
}

async function withSuppressedSdkLogs<T>(fn: () => Promise<T>, onSuppressed: (count: number) => void): Promise<T> {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  let count = 0;
  const suppress = () => {
    count += 1;
  };
  console.log = suppress;
  console.warn = suppress;
  console.error = suppress;
  try {
    return await fn();
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
    onSuppressed(count);
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
