#!/usr/bin/env npx tsx
/**
 * probe-storage.ts — explicit live StorageProgram write probe for omniweb-toolkit.
 *
 * Default behavior is non-destructive: it prints the derived storage address,
 * initial payload previews, and estimated fees. Passing `--broadcast` executes
 * a real CREATE_STORAGE_PROGRAM followed by SET_FIELD against the live network.
 *
 * Output: JSON to stdout. Errors to stderr. Exit 0 on success, 1 on runtime or
 * transaction failure, 2 on invalid args.
 */

import { DemosTransactions } from "@kynesyslabs/demosdk/websdk";
import { StorageProgram } from "@kynesyslabs/demosdk/storage";
import { getStringArg, hasFlag, loadConnect } from "./_shared.js";
import {
  assertExplicitCredentialTargetExists,
  emitJsonReport,
  redactProbeCommand,
  summarizeProbeRuntimeTarget,
  validateRequiredValueFlags,
} from "./_probe-targeting.js";

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/probe-storage.ts [options]

Options:
  --program-name NAME   Storage program name (default: unique omniweb probe name)
  --env-path PATH       Override wallet credentials file passed to connect()
  --agent-name NAME     Use a named credentials profile if present
  --state-dir PATH      Override state directory
  --proof-out PATH      Write the JSON proof report to this path
  --broadcast           Execute the real CREATE + SET_FIELD probe
  --help, -h            Show this help

Output: JSON storage probe report
Exit codes: 0 = success, 1 = runtime or transaction failure, 2 = invalid args`);
  process.exit(0);
}

const flagError = validateRequiredValueFlags(args, [
  "--program-name",
  "--env-path",
  "--agent-name",
  "--state-dir",
  "--proof-out",
]);
if (flagError) {
  console.error(flagError);
  process.exit(2);
}

const programName = getStringArg(args, "--program-name") ?? `omniweb-probe-${Date.now()}`;
const envPath = getStringArg(args, "--env-path") || undefined;
const agentName = getStringArg(args, "--agent-name") || undefined;
const stateDirArg = getStringArg(args, "--state-dir") ?? "";
const stateDir = stateDirArg || undefined;
const proofOut = getStringArg(args, "--proof-out") || undefined;
const broadcast = hasFlag(args, "--broadcast");
const runtimeTarget = summarizeProbeRuntimeTarget({ envPath, agentName, stateDir });
const command = redactProbeCommand(process.argv);

const initialData = {
  marker: "omniweb-storage-probe",
  createdAt: new Date().toISOString(),
  version: 1,
};

try {
  assertExplicitCredentialTargetExists(
    { envPath, agentName, stateDir },
    { requireExplicit: broadcast, purpose: "Live storage mutation" },
  );
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(2);
}

try {
  const connect = await loadConnect();
  const omni = await connect({ envPath, agentName, stateDir });
  const address = omni.address;
  const nonce = 1;
  const storageAddress = StorageProgram.deriveStorageAddress(address, programName, nonce);
  const createPayload = StorageProgram.createStorageProgram(
    address,
    programName,
    initialData,
    "json",
    StorageProgram.publicACL(),
    { nonce },
  );
  const setFieldValue = new Date().toISOString();
  const setPayload = StorageProgram.setField(storageAddress, "lastProbe", setFieldValue);

  if (!broadcast) {
    emitJsonReport({
      attempted: false,
      ok: true,
      command,
      address,
      runtimeTarget,
      programName,
      storageAddress,
      estimatedCreateFeeDem: StorageProgram.calculateStorageFee(initialData, "json").toString(),
      createPayload,
      setPayload,
      message: "Dry run only. Re-run with --broadcast to execute the real StorageProgram CREATE + SET_FIELD probe.",
    }, proofOut);
    process.exit(0);
  }

  const createTx = await submitStorageTransaction(omni.runtime.demos, address, storageAddress, createPayload);
  await sleep(5000);
  const readAfterCreate = await StorageProgram.getByAddress("https://node3.demos.sh", storageAddress, address);

  const setTx = await submitStorageTransaction(omni.runtime.demos, address, storageAddress, setPayload);
  await sleep(3000);
  const fieldAfterSet = await StorageProgram.getValue("https://node3.demos.sh", storageAddress, "lastProbe", address);

  emitJsonReport({
    attempted: true,
    ok: true,
    command,
    address,
    runtimeTarget,
    programName,
    storageAddress,
    create: createTx,
    readAfterCreate,
    setField: setTx,
    fieldAfterSet,
  }, proofOut);
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

async function submitStorageTransaction(
  demos: any,
  address: string,
  storageAddress: string,
  payload: unknown,
) {
  const tx = DemosTransactions.empty();
  tx.content = {
    ...tx.content,
    type: "storageProgram",
    from: address,
    to: storageAddress,
    data: ["storageProgram", payload as any],
    amount: 0,
    timestamp: Date.now(),
  };

  const signed = await demos.sign(tx);
  const validity = await demos.confirm(signed);
  const broadcast = await demos.broadcast(validity);

  return {
    txHash: validity?.response?.data?.transaction?.hash ?? null,
    confirmationBlock: broadcast?.extra?.confirmationBlock ?? null,
    broadcastMessage: broadcast?.response?.message ?? null,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
