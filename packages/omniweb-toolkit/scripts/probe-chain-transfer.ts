#!/usr/bin/env npx tsx
/**
 * probe-chain-transfer.ts - bounded raw DEM transfer proof lane.
 *
 * Preview is no-spend by default. Live transfer requires --broadcast, an
 * explicit sender credential target, an owned recipient target, and amount <=
 * 5 DEM. Success requires tx evidence plus sender and recipient balance
 * readback; tx confirmation alone is reported as degraded.
 */

import { isAbsolute, resolve } from "node:path";
import { getNumberArg, getStringArg, hasFlag, loadConnect, REPO_ROOT } from "./_shared.js";
import {
  assertExplicitCredentialTargetExists,
  emitJsonReport,
  redactProbeCommand,
  summarizeProbeRuntimeTarget,
  validateRequiredValueFlags,
} from "./_probe-targeting.js";
import { classifyDemTransferAmount } from "../../../src/toolkit/sdk-bridge.js";
import { safeTransfer } from "../src/write.js";

const args = process.argv.slice(2);
const MAX_TRANSFER_DEM = 5;
const DEFAULT_AMOUNT_DEM = 1;
const DEFAULT_VERIFY_TIMEOUT_MS = 90_000;
const DEFAULT_VERIFY_POLL_MS = 5_000;

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/probe-chain-transfer.ts --agent-name NAME --recipient-agent-name NAME [options]

Options:
  --agent-name NAME             Sender credentials profile; required
  --env-path PATH               Sender credentials file; alternative to --agent-name
  --recipient-agent-name NAME   Owned recipient credentials profile; preferred
  --recipient-address ADDRESS   Controlled recipient address; requires --recipient-label
  --recipient-label TEXT        Public label for controlled recipient-address mode
  --amount DEM                  Integer DEM amount; default 1, maximum 5
  --broadcast                   Execute one live transfer after preview gates pass
  --state-dir PATH              Override sender state directory
  --proof-out PATH              Write the JSON proof report to this path
  --verify-timeout-ms N         Max tx confirmation polling time; default 90000
  --verify-poll-ms N            Tx confirmation poll interval; default 5000
  --help, -h                    Show this help

Output: JSON transfer preview/live report with redacted local paths and no secrets
Exit codes: 0 = preview/live completed with honest verdict, 1 = runtime failure, 2 = invalid args`);
  process.exit(0);
}

const flagError = validateRequiredValueFlags(args, [
  "--agent-name",
  "--env-path",
  "--recipient-agent-name",
  "--recipient-address",
  "--recipient-label",
  "--amount",
  "--state-dir",
  "--proof-out",
  "--verify-timeout-ms",
  "--verify-poll-ms",
]);
if (flagError) {
  console.error(flagError);
  process.exit(2);
}

const agentName = getStringArg(args, "--agent-name") || undefined;
const envPath = getStringArg(args, "--env-path") || undefined;
const stateDir = getStringArg(args, "--state-dir") || undefined;
const recipientAgentName = getStringArg(args, "--recipient-agent-name") || undefined;
const recipientAddressArg = getStringArg(args, "--recipient-address") || undefined;
const recipientLabel = getStringArg(args, "--recipient-label") || undefined;
const amount = getNumberArg(args, "--amount") ?? DEFAULT_AMOUNT_DEM;
const broadcast = hasFlag(args, "--broadcast");
const proofOut = normalizeProofOut(getStringArg(args, "--proof-out"));
const verifyTimeoutMs = getNumberArg(args, "--verify-timeout-ms") ?? DEFAULT_VERIFY_TIMEOUT_MS;
const verifyPollMs = getNumberArg(args, "--verify-poll-ms") ?? DEFAULT_VERIFY_POLL_MS;
const command = redactProbeCommand(process.argv);

try {
  assertExplicitCredentialTargetExists(
    { envPath, agentName, stateDir },
    { requireExplicit: true, purpose: "Raw transfer preview/live" },
  );
  validateArgs();

  const connect = await loadConnect();
  const recipient = await resolveRecipient(connect);
  const omni = await connect({ envPath, agentName, stateDir });
  const senderAddress = String(omni.address ?? "");
  if (!senderAddress) {
    throw new Error("Connected sender wallet did not expose an address");
  }
  if (senderAddress === recipient.address) {
    throw new Error("Raw transfer proof requires a distinct recipient address; self-transfer does not prove recipient readback");
  }

  const before = await readTransferBalances(omni, senderAddress, recipient.address);
  const previewGate = buildPreviewGate(before);
  const amountSupport = classifyDemTransferAmount(amount);

  if (!broadcast) {
    emitJsonReport({
      attemptedBroadcast: false,
      ok: previewGate.ok,
      status: previewGate.ok ? "PREVIEW_GREEN" : "BLOCKED",
      command,
      sender: {
        address: senderAddress,
        runtimeTarget: summarizeProbeRuntimeTarget({ envPath, agentName, stateDir }),
      },
      recipient,
      amountDem: amount,
      ceilingDem: MAX_TRANSFER_DEM,
      amountSupport,
      unitContract: buildUnitContract(amountSupport),
      memo: "",
      explicitLiveFlag: "--broadcast",
      previewGate,
      balancesBefore: before,
      readbackRequirement: [
        "tx confirmation",
        "sender balance readback",
        "recipient balance readback",
      ],
    }, proofOut);
    process.exit(0);
  }

  if (!previewGate.ok) {
    emitJsonReport({
      attemptedBroadcast: false,
      liveFlagPresent: true,
      attemptedTransfer: false,
      ok: false,
      status: "BLOCKED",
      command,
      sender: {
        address: senderAddress,
        runtimeTarget: summarizeProbeRuntimeTarget({ envPath, agentName, stateDir }),
      },
      recipient,
      amountDem: amount,
      ceilingDem: MAX_TRANSFER_DEM,
      amountSupport,
      unitContract: buildUnitContract(amountSupport),
      previewGate,
      error: "Live transfer blocked because preview gate is not green",
    }, proofOut);
    process.exit(0);
  }

  let suppressedSdkLogCount = 0;
  let transfer: Awaited<ReturnType<typeof safeTransfer>>;
  try {
    transfer = await withSuppressedSdkLogs(async () => safeTransfer({
      recipient: recipient.address,
      amount,
      memo: "",
      recipientAllowlist: [recipient.address],
      recipientSource: "operator",
      memoSource: "operator",
      execute: (to: string, transferAmount: number, memo: string) =>
        omni.runtime.sdkBridge.transferDem(to, transferAmount, memo),
    }), (count) => {
      suppressedSdkLogCount = count;
    });
  } catch (transferError) {
    const afterFailure = await readTransferBalances(omni, senderAddress, recipient.address);
    emitJsonReport({
      attemptedBroadcast: false,
      liveFlagPresent: true,
      attemptedTransfer: true,
      ok: false,
      status: "STUCK",
      command,
      sender: {
        address: senderAddress,
        runtimeTarget: summarizeProbeRuntimeTarget({ envPath, agentName, stateDir }),
      },
      recipient,
      amountDem: amount,
      ceilingDem: MAX_TRANSFER_DEM,
      amountSupport,
      unitContract: buildUnitContract(amountSupport),
      memo: "",
      explicitLiveFlag: "--broadcast",
      previewGate,
      failure: {
        stage: "transfer-confirm-or-broadcast",
        broadcastReached: false,
        sanitizedError: transferError instanceof Error ? transferError.message : String(transferError),
        suppressedSdkLogCount,
      },
      balancesBefore: before,
      balancesAfter: afterFailure,
      verdict: "No tx hash was produced. The current raw transfer contract is integer DEM only; do not retry with a different amount unless a separate bead records an explicit integer budget, target, and readback gate.",
    }, proofOut);
    process.exit(0);
  }

  const verification = await waitForTransferVerification(omni, transfer.txHash);
  const after = await readTransferBalances(omni, senderAddress, recipient.address);
  const readback = classifyReadback(before, after, amount, verification.confirmed);

  emitJsonReport({
    attemptedBroadcast: true,
    ok: readback.ok,
    status: readback.ok ? "GREEN" : "DEGRADED",
    command,
    sender: {
      address: senderAddress,
      runtimeTarget: summarizeProbeRuntimeTarget({ envPath, agentName, stateDir }),
    },
    recipient,
    amountDem: amount,
    ceilingDem: MAX_TRANSFER_DEM,
    amountSupport,
    unitContract: buildUnitContract(amountSupport),
    memo: "",
    explicitLiveFlag: "--broadcast",
    previewGate,
    transfer,
    verification,
    balancesBefore: before,
    balancesAfter: after,
    readback,
  }, proofOut);
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

function validateArgs(): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`--amount must be a positive finite number; got ${amount}`);
  }
  if (amount > MAX_TRANSFER_DEM) {
    throw new Error(`--amount ${amount} exceeds raw transfer proof ceiling ${MAX_TRANSFER_DEM} DEM`);
  }
  if (!Number.isFinite(verifyTimeoutMs) || verifyTimeoutMs < 0) {
    throw new Error("--verify-timeout-ms must be a non-negative finite number");
  }
  if (!Number.isFinite(verifyPollMs) || verifyPollMs <= 0) {
    throw new Error("--verify-poll-ms must be a positive finite number");
  }
  if (recipientAgentName && recipientAddressArg) {
    throw new Error("Use either --recipient-agent-name or --recipient-address, not both");
  }
  if (!recipientAgentName && !recipientAddressArg) {
    throw new Error("Raw transfer proof requires --recipient-agent-name or --recipient-address");
  }
  if (recipientAddressArg && !recipientLabel) {
    throw new Error("--recipient-address mode requires --recipient-label naming the controlled recipient");
  }
  if (recipientAgentName) {
    assertExplicitCredentialTargetExists({ agentName: recipientAgentName });
  }
}

function buildUnitContract(amountSupport: ReturnType<typeof classifyDemTransferAmount>): {
  supportedUnit: "integer-dem";
  baseUnitConversion: "not_proven";
  fractionalAmounts: "unsupported";
  amountSupported: boolean;
  reason?: string;
} {
  return {
    supportedUnit: "integer-dem",
    baseUnitConversion: "not_proven",
    fractionalAmounts: "unsupported",
    amountSupported: amountSupport.ok,
    reason: amountSupport.reason,
  };
}

async function resolveRecipient(connect: Awaited<ReturnType<typeof loadConnect>>): Promise<{
  address: string;
  control: "recipient-agent-name" | "controlled-address";
  label: string;
  runtimeTarget?: ReturnType<typeof summarizeProbeRuntimeTarget>;
}> {
  if (recipientAgentName) {
    const recipientOmni = await connect({ agentName: recipientAgentName });
    const address = String(recipientOmni.address ?? "");
    if (!address) {
      throw new Error("--recipient-agent-name did not resolve to a wallet address");
    }
    return {
      address,
      control: "recipient-agent-name",
      label: recipientAgentName,
      runtimeTarget: summarizeProbeRuntimeTarget({ agentName: recipientAgentName }),
    };
  }

  return {
    address: String(recipientAddressArg),
    control: "controlled-address",
    label: String(recipientLabel),
  };
}

async function readTransferBalances(omni: any, senderAddress: string, recipientAddress: string): Promise<{
  blockNumber: number | null;
  sender: BalanceReadback;
  recipient: BalanceReadback;
}> {
  const [blockNumber, sender, recipient] = await Promise.all([
    typeof omni.chain?.getBlockNumber === "function" ? omni.chain.getBlockNumber() : Promise.resolve(null),
    readBalance(omni, senderAddress),
    readBalance(omni, recipientAddress),
  ]);
  return {
    blockNumber: typeof blockNumber === "number" ? blockNumber : null,
    sender,
    recipient,
  };
}

interface BalanceReadback {
  address: string;
  ok: boolean;
  balanceDem: number | null;
  rawBalance?: string;
  error?: string;
}

async function readBalance(omni: any, address: string): Promise<BalanceReadback> {
  try {
    const result = await omni.chain.getBalance(address);
    return {
      address,
      ok: result?.ok === true,
      balanceDem: toFiniteNumber(result?.balance),
      rawBalance: result?.balance === undefined ? undefined : String(result.balance),
      error: result?.ok === true ? undefined : String(result?.error ?? "balance read failed"),
    };
  } catch (err) {
    return {
      address,
      ok: false,
      balanceDem: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function buildPreviewGate(balances: Awaited<ReturnType<typeof readTransferBalances>>): {
  ok: boolean;
  checks: Record<string, boolean>;
  reasons: string[];
  unsupported?: Record<string, string>;
} {
  const amountSupport = classifyDemTransferAmount(amount);
  const checks = {
    amountWithinCeiling: amount > 0 && amount <= MAX_TRANSFER_DEM,
    amountSupportedByTransferRuntime: amountSupport.ok,
    recipientControlled: Boolean(recipientAgentName || recipientLabel),
    senderBalanceReadable: balances.sender.ok && balances.sender.balanceDem !== null,
    recipientBalanceReadable: balances.recipient.ok && balances.recipient.balanceDem !== null,
    senderHasAmount: (balances.sender.balanceDem ?? 0) >= amount,
  };
  const reasons = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([key]) => key);
  return {
    ok: reasons.length === 0,
    checks,
    reasons,
    unsupported: amountSupport.ok ? undefined : {
      amountSupportedByTransferRuntime: amountSupport.reason ?? "unsupported transfer amount",
    },
  };
}

async function waitForTransferVerification(omni: any, txHash: string): Promise<{
  confirmed: boolean;
  blockNumber?: number;
  attempts: number;
  timeoutMs: number;
}> {
  const started = Date.now();
  let attempts = 0;
  while (Date.now() - started <= verifyTimeoutMs) {
    attempts += 1;
    try {
      const result = await omni.runtime.sdkBridge.verifyTransaction(txHash);
      if (result?.confirmed) {
        return {
          confirmed: true,
          blockNumber: typeof result.blockNumber === "number" ? result.blockNumber : undefined,
          attempts,
          timeoutMs: verifyTimeoutMs,
        };
      }
    } catch {
      // Keep polling until timeout; report final unconfirmed state honestly.
    }
    if (verifyTimeoutMs === 0) break;
    await sleep(verifyPollMs);
  }
  return { confirmed: false, attempts, timeoutMs: verifyTimeoutMs };
}

function classifyReadback(
  before: Awaited<ReturnType<typeof readTransferBalances>>,
  after: Awaited<ReturnType<typeof readTransferBalances>>,
  expectedAmount: number,
  txConfirmed: boolean,
): {
  ok: boolean;
  senderDeltaDem: number | null;
  recipientDeltaDem: number | null;
  senderBalanceMoved: boolean;
  recipientBalanceMoved: boolean;
  txConfirmed: boolean;
  confirmationSurface: "tx_and_balances" | "tx_only" | "balances_only" | "none";
} {
  const senderDeltaDem = delta(after.sender.balanceDem, before.sender.balanceDem);
  const recipientDeltaDem = delta(after.recipient.balanceDem, before.recipient.balanceDem);
  const senderBalanceMoved = senderDeltaDem !== null && senderDeltaDem <= -expectedAmount;
  const recipientBalanceMoved = recipientDeltaDem !== null && recipientDeltaDem >= expectedAmount;
  const balancesMoved = senderBalanceMoved && recipientBalanceMoved;
  const confirmationSurface = txConfirmed && balancesMoved
    ? "tx_and_balances"
    : txConfirmed
      ? "tx_only"
      : balancesMoved
        ? "balances_only"
        : "none";
  return {
    ok: txConfirmed && balancesMoved,
    senderDeltaDem,
    recipientDeltaDem,
    senderBalanceMoved,
    recipientBalanceMoved,
    txConfirmed,
    confirmationSurface,
  };
}

function delta(after: number | null, before: number | null): number | null {
  if (after === null || before === null) return null;
  return Number((after - before).toFixed(6));
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeProofOut(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  if (isAbsolute(raw)) return raw;
  return raw.startsWith("packages/") ? resolve(REPO_ROOT, raw) : raw;
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
