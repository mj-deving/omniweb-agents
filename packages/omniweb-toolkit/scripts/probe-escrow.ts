#!/usr/bin/env npx tsx
/**
 * probe-escrow.ts — explicit live escrow send probe for omniweb-toolkit.
 *
 * Default behavior is non-destructive: it reports the intended target and amount.
 * Passing `--broadcast` executes a real `sendToIdentity()` escrow transfer.
 *
 * Output: JSON to stdout. Errors to stderr. Exit 0 on success, 1 on runtime or
 * escrow failure, 2 on invalid args.
 */

import { getNumberArg, getStringArg, hasFlag, loadConnect } from "./_shared.js";
import {
  assertExplicitCredentialTargetExists,
  emitJsonReport,
  redactProbeCommand,
  summarizeProbeRuntimeTarget,
  validateRequiredValueFlags,
} from "./_probe-targeting.js";

const args = process.argv.slice(2);

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
  --broadcast          Execute the real escrow send
  --help, -h           Show this help

Output: JSON escrow probe report
Exit codes: 0 = success, 1 = runtime or escrow failure, 2 = invalid args`);
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
]);
if (flagError) {
  console.error(flagError);
  process.exit(2);
}

const platform = getStringArg(args, "--platform");
const username = getStringArg(args, "--username");
const amount = getNumberArg(args, "--amount") ?? 0.1;
const message = getStringArg(args, "--message");
const envPath = getStringArg(args, "--env-path") || undefined;
const agentName = getStringArg(args, "--agent-name") || undefined;
const stateDirArg = getStringArg(args, "--state-dir");
const stateDir = stateDirArg || undefined;
const proofOut = getStringArg(args, "--proof-out") || undefined;
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

try {
  assertExplicitCredentialTargetExists(
    { envPath, agentName, stateDir },
    { requireExplicit: broadcast, purpose: "Live escrow mutation" },
  );
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(2);
}

try {
  const connect = await loadConnect();
  const omni = await connect({ envPath, agentName, stateDir });

  if (!broadcast) {
    emitJsonReport({
      attempted: false,
      ok: true,
      command,
      address: omni.address,
      runtimeTarget,
      platform,
      username,
      amount,
      message,
      note: "Dry run only. Re-run with --broadcast to execute the real escrow send.",
    }, proofOut);
    process.exit(0);
  }

  const result = await omni.escrow.sendToIdentity(platform as "github" | "twitter" | "telegram", username, amount, {
    message,
  });

  if (!result.ok) {
    emitJsonReport({
      attempted: true,
      ok: false,
      command,
      address: omni.address,
      runtimeTarget,
      platform,
      username,
      amount,
      message,
      result,
    }, proofOut);
    process.exit(1);
  }

  emitJsonReport({
    attempted: true,
    ok: true,
    command,
    address: omni.address,
    runtimeTarget,
    platform,
    username,
    amount,
    message,
    txHash: result.txHash,
  }, proofOut);
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
