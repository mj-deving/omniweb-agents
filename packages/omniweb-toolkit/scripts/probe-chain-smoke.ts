#!/usr/bin/env -S bunx tsx
/**
 * probe-chain-smoke.ts — non-mutating chain sign/read smoke for omniweb-toolkit.
 *
 * Signs a deterministic message with the selected wallet, redacts the signature,
 * attempts verifyMessage() only when string signature + public key shapes are
 * available, and reads balance/block height.
 */

import { getStringArg, hasFlag, loadConnect } from "./_shared.js";
import {
  assertExplicitCredentialTargetExists,
  emitJsonReport,
  extractSignatureString,
  publicKeyToHex,
  redactProbeCommand,
  summarizeProbeRuntimeTarget,
  summarizeSignatureShape,
  validateRequiredValueFlags,
} from "./_probe-targeting.js";

const DEFAULT_MESSAGE_LABEL = "omniweb-toolkit-chain-smoke";
const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: bunx tsx packages/omniweb-toolkit/scripts/probe-chain-smoke.ts [options]

Options:
  --message-label TEXT Label included in the signed smoke-test message
  --env-path PATH      Override wallet credentials file passed to connect()
  --agent-name NAME    Use a named credentials profile if present
  --state-dir PATH     Override state directory
  --proof-out PATH     Write the JSON proof report to this path
  --help, -h           Show this help

Output: JSON chain smoke report with redacted signature material
Exit codes: 0 = sign/read green or verify shape honestly classified, 1 = runtime failure, 2 = invalid args`);
  process.exit(0);
}

const flagError = validateRequiredValueFlags(args, [
  "--message-label",
  "--env-path",
  "--agent-name",
  "--state-dir",
  "--proof-out",
]);
if (flagError) {
  console.error(flagError);
  process.exit(2);
}

const messageLabel = getStringArg(args, "--message-label") ?? DEFAULT_MESSAGE_LABEL;
const envPath = getStringArg(args, "--env-path") || undefined;
const agentName = getStringArg(args, "--agent-name") || undefined;
const stateDir = getStringArg(args, "--state-dir") || undefined;
const proofOut = getStringArg(args, "--proof-out") || undefined;
const runtimeTarget = summarizeProbeRuntimeTarget({ envPath, agentName, stateDir });
const command = redactProbeCommand(process.argv);

try {
  assertExplicitCredentialTargetExists({ envPath, agentName, stateDir });
  const connect = await loadConnect();
  const omni = await connect({ envPath, agentName, stateDir });
  const address = omni.address;
  const message = `${messageLabel}:${address}`;
  const sign = await omni.chain.signMessage(message);
  const signature = sign.ok ? extractSignatureString(sign.signature) : null;
  const signatureShape = summarizeSignatureShape(sign.ok ? sign.signature : null);
  const identity = await readIdentity(omni.runtime.demos);
  const publicKey = publicKeyToHex(identity?.publicKey ?? omni.runtime.demos?.keypair?.publicKey);
  const verifyAttempted = typeof signature === "string" && typeof publicKey === "string";
  const verified = verifyAttempted
    ? await omni.chain.verifyMessage(message, signature, publicKey)
    : false;
  const verifyUnsupportedReason = verified
    ? null
    : verifyAttempted
      ? "verifyMessage returned false for extracted string signature and public key"
      : missingVerifyShapeReason(signature, publicKey);
  const balance = await omni.chain.getBalance(address);
  const blockNumber = await omni.chain.getBlockNumber();

  emitJsonReport({
    attemptedBroadcast: false,
    ok: Boolean(sign.ok) && Boolean(balance.ok) && blockNumber !== null,
    command,
    address,
    runtimeTarget,
    messageLabel,
    sign: {
      ok: Boolean(sign.ok),
      ...signatureShape,
      error: sign.ok ? null : sign.error,
    },
    verify: {
      attempted: verifyAttempted,
      verified,
      unsupportedReason: verifyUnsupportedReason,
      publicKeySource: publicKey ? "wallet-runtime-redacted" : null,
    },
    balance,
    blockNumber,
  }, proofOut);
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

async function readIdentity(demos: any): Promise<Record<string, unknown> | null> {
  try {
    const identity = await demos?.crypto?.getIdentity?.();
    return identity && typeof identity === "object" ? identity : null;
  } catch {
    return null;
  }
}

function missingVerifyShapeReason(signature: string | null, publicKey: string | null): string {
  if (!signature && !publicKey) return "missing extracted string signature and public key";
  if (!signature) return "missing extracted string signature";
  return "missing public key";
}
