#!/usr/bin/env npx tsx
/**
 * probe-ipfs.ts — explicit live IPFS upload probe for omniweb-toolkit.
 *
 * Default behavior is non-destructive: it reports the content size, filename,
 * and any available IPFS quote result. Passing `--broadcast` executes a real
 * upload using omni.ipfs.upload() and verifies that the resulting txHash is
 * visible on-chain.
 *
 * Output: JSON to stdout. Errors to stderr. Exit 0 on success, 1 on runtime or
 * upload failure, 2 on invalid args.
 */

import { getStringArg, hasFlag, loadConnect } from "./_shared.js";
import {
  assertExplicitCredentialTargetExists,
  emitJsonReport,
  redactProbeCommand,
  summarizeProbeRuntimeTarget,
  validateRequiredValueFlags,
} from "./_probe-targeting.js";

const DEFAULT_FILENAME = "omniweb-toolkit-ipfs-probe.txt";
const DEFAULT_TEXT =
  "Operational IPFS upload verification for omniweb-toolkit on 2026-04-15. This is a small public artifact used to confirm that the packaged IPFS upload path remains functional after the refactor cycle.";

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/probe-ipfs.ts [options]

Options:
  --content TEXT       Content to upload (default: built-in probe text)
  --filename NAME      Filename metadata for the upload (default: omniweb-toolkit-ipfs-probe.txt)
  --env-path PATH      Override wallet credentials file passed to connect()
  --agent-name NAME    Use a named credentials profile if present
  --state-dir PATH     Override state directory
  --proof-out PATH     Write the JSON proof report to this path
  --broadcast          Execute the real upload and chain verification
  --help, -h           Show this help

Output: JSON IPFS probe report
Exit codes: 0 = success, 1 = runtime or upload failure, 2 = invalid args`);
  process.exit(0);
}

const flagError = validateRequiredValueFlags(args, [
  "--content",
  "--filename",
  "--env-path",
  "--agent-name",
  "--state-dir",
  "--proof-out",
]);
if (flagError) {
  console.error(flagError);
  process.exit(2);
}

const content = getStringArg(args, "--content") ?? DEFAULT_TEXT;
const filename = getStringArg(args, "--filename") ?? DEFAULT_FILENAME;
const envPath = getStringArg(args, "--env-path") || undefined;
const agentName = getStringArg(args, "--agent-name") || undefined;
const stateDirArg = getStringArg(args, "--state-dir") ?? "";
const stateDir = stateDirArg || undefined;
const proofOut = getStringArg(args, "--proof-out") || undefined;
const broadcast = hasFlag(args, "--broadcast");
const runtimeTarget = summarizeProbeRuntimeTarget({ envPath, agentName, stateDir });
const command = redactProbeCommand(process.argv);

try {
  assertExplicitCredentialTargetExists({ envPath, agentName, stateDir });
  const connect = await loadConnect();
  const omni = await connect({ envPath, agentName, stateDir });
  const sizeBytes = Buffer.byteLength(content);

  let quote: unknown = null;
  let quoteError: string | undefined;
  try {
    quote = await omni.runtime.demos.ipfs.quote(sizeBytes, "IPFS_ADD");
  } catch (error) {
    quoteError = error instanceof Error ? error.message : String(error);
  }

  if (!broadcast) {
    emitJsonReport({
      attempted: false,
      ok: true,
      command,
      address: omni.address,
      runtimeTarget,
      filename,
      sizeBytes,
      quote,
      quoteError,
      message: "Dry run only. Re-run with --broadcast to execute the real IPFS upload probe.",
    }, proofOut);
    process.exit(0);
  }

  const upload = await omni.ipfs.upload(content, { filename });
  if (!upload.ok || !upload.txHash) {
    emitJsonReport({
      attempted: true,
      ok: false,
      command,
      address: omni.address,
      runtimeTarget,
      filename,
      sizeBytes,
      quote,
      quoteError,
      upload,
    }, proofOut);
    process.exit(1);
  }

  const verification = await omni.runtime.sdkBridge.verifyTransaction(upload.txHash);

  emitJsonReport({
    attempted: true,
    ok: true,
    command,
    address: omni.address,
    runtimeTarget,
    filename,
    sizeBytes,
    quote,
    quoteError,
    txHash: upload.txHash,
    confirmationBlock: upload.confirmationBlock,
    broadcastMessage: upload.broadcastMessage,
    verification,
  }, proofOut);
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
