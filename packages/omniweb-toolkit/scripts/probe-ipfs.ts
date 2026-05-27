#!/usr/bin/env -S bunx tsx
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

import { getNumberArg, getStringArg, hasFlag, loadConnect, loadPackageModule } from "./_shared.js";
import {
  assertExplicitCredentialTargetExists,
  emitJsonReport,
  redactProbeCommand,
  summarizeProbeRuntimeTarget,
  validateRequiredValueFlags,
} from "./_probe-targeting.js";

interface IPFSQuoteSupport {
  concrete: boolean;
  quotedFeeDem: number | null;
  withinBudget: boolean | null;
  budgetDem: number | null;
  reasonCodes: string[];
}
type IPFSQuoteClassifierModule = {
  classifyIPFSPayloadSafety(content: string | Uint8Array): { ok: boolean; reasonCodes: string[] };
  classifyIPFSQuoteSupport(input: Record<string, unknown>): IPFSQuoteSupport;
  classifyIPFSSuccessorReadiness(input: Record<string, unknown>): Record<string, unknown>;
};

const {
  classifyIPFSPayloadSafety,
  classifyIPFSQuoteSupport,
  classifyIPFSSuccessorReadiness,
} = await loadPackageModule<IPFSQuoteClassifierModule>(
  "../dist/ipfs-quote-classifier.js",
  "../src/ipfs-quote-classifier.js",
);

const DEFAULT_FILENAME = "omniweb-toolkit-ipfs-probe.txt";
const DEFAULT_TEXT =
  "Operational IPFS upload verification for omniweb-toolkit on 2026-04-15. This is a small public artifact used to confirm that the packaged IPFS upload path remains functional after the refactor cycle.";

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: bunx tsx packages/omniweb-toolkit/scripts/probe-ipfs.ts [options]

Options:
  --content TEXT       Content to upload (default: built-in probe text)
  --filename NAME      Filename metadata for the upload (default: omniweb-toolkit-ipfs-probe.txt)
  --env-path PATH      Override wallet credentials file passed to connect()
  --agent-name NAME    Use a named credentials profile if present
  --state-dir PATH     Override state directory
  --budget-dem N       Explicit maximum DEM fee for live upload
  --readback TEXT      Expected post-upload readback surface
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
  "--budget-dem",
  "--readback",
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
const budgetDem = getNumberArg(args, "--budget-dem");
const readbackExpectation = getStringArg(args, "--readback") || undefined;
const proofOut = getStringArg(args, "--proof-out") || undefined;
const broadcast = hasFlag(args, "--broadcast");
const runtimeTarget = summarizeProbeRuntimeTarget({ envPath, agentName, stateDir });
const command = redactProbeCommand(process.argv);
const quoteAttempt = {
  runtimePath: "omni.runtime.demos.ipfs.quote",
  sdkNodeCallMessage: "ipfsQuote",
  args: {
    file_size_bytes: Buffer.byteLength(content),
    operation: "IPFS_ADD",
  },
};

if (budgetDem !== undefined && (!Number.isFinite(budgetDem) || budgetDem <= 0)) {
  console.error("Error: --budget-dem must be a positive finite number");
  process.exit(2);
}

try {
  assertExplicitCredentialTargetExists(
    { envPath, agentName, stateDir },
    { requireExplicit: broadcast, purpose: "Live IPFS mutation" },
  );
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(2);
}

try {
  const connect = await loadConnect();
  const omni = await connect({ envPath, agentName, stateDir });
  const sizeBytes = Buffer.byteLength(content);
  const payloadSafety = classifyIPFSPayloadSafety(content);

  let quote: unknown = null;
  let quoteError: string | undefined;
  try {
    quote = await omni.runtime.demos.ipfs.quote(sizeBytes, "IPFS_ADD");
  } catch (error) {
    quoteError = error instanceof Error ? error.message : String(error);
  }
  const quoteSupport = classifyIPFSQuoteSupport({
    quote,
    quoteError,
    budgetDem,
    quotePath: quoteAttempt.runtimePath,
    quoteMessage: quoteAttempt.sdkNodeCallMessage,
    quoteArgs: quoteAttempt.args,
  });
  const uploadCustomCharges = buildUploadCustomCharges(quoteSupport, quote);
  const previewGate = buildPreviewGate({
    quoteSupport,
    payloadSafe: payloadSafety.ok,
    budgetDem,
    readbackExpectation,
    broadcast,
  });
  const successorReadiness = classifyIPFSSuccessorReadiness({
    quoteSupport,
    payloadSafety,
    hasReadbackExpectation: Boolean(readbackExpectation),
  });

  if (!broadcast) {
    emitJsonReport({
      attempted: false,
      ok: previewGate.ok,
      status: previewGate.ok ? "PREVIEW_GREEN" : successorReadiness.status,
      command,
      address: omni.address,
      runtimeTarget,
      filename,
      sizeBytes,
      quoteAttempt,
      quote,
      quoteError,
      quoteSupport,
      payloadSafety,
      previewGate,
      successorReadiness,
      uploadPlan: buildUploadPlan({ filename, sizeBytes, quoteSupport, readbackExpectation }),
      message: "Dry run only. Re-run with --broadcast to execute the real IPFS upload probe.",
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
      filename,
      sizeBytes,
      quoteAttempt,
      quote,
      quoteError,
      quoteSupport,
      payloadSafety,
      previewGate,
      successorReadiness,
      uploadPlan: buildUploadPlan({ filename, sizeBytes, quoteSupport, readbackExpectation }),
      error: "Live IPFS upload blocked because preview gate is not green.",
    }, proofOut);
    process.exit(0);
  }

  const upload = await omni.ipfs.upload(content, { filename, customCharges: uploadCustomCharges ?? undefined });
  if (!upload.ok || !upload.txHash) {
    emitJsonReport({
      attempted: true,
      ok: false,
      command,
      address: omni.address,
      runtimeTarget,
      filename,
      sizeBytes,
      quoteAttempt,
      quote,
      quoteError,
      quoteSupport,
      payloadSafety,
      previewGate,
      uploadPlan: buildUploadPlan({ filename, sizeBytes, quoteSupport, readbackExpectation }),
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
    quoteAttempt,
    quote,
    quoteError,
    quoteSupport,
    payloadSafety,
    previewGate,
    successorReadiness,
    uploadPlan: buildUploadPlan({ filename, sizeBytes, quoteSupport, readbackExpectation }),
    txHash: upload.txHash,
    confirmationBlock: upload.confirmationBlock,
    broadcastMessage: upload.broadcastMessage,
    verification,
  }, proofOut);
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

function buildPreviewGate(input: {
  quoteSupport: IPFSQuoteSupport;
  payloadSafe: boolean;
  budgetDem?: number;
  readbackExpectation?: string;
  broadcast: boolean;
}): {
  ok: boolean;
  checks: Record<string, boolean>;
  reasons: string[];
  explicitLiveFlag: "--broadcast";
  liveRequested: boolean;
} {
  const checks = {
    publicPayload: input.payloadSafe,
    explicitBudget: Number.isFinite(input.budgetDem),
    quoteConcrete: input.quoteSupport.concrete,
    quoteWithinBudget: input.quoteSupport.withinBudget === true,
    readbackExpectationPresent: Boolean(input.readbackExpectation),
  };
  const reasons = new Set(Object.entries(checks).flatMap(([key, ok]) => {
    if (ok) return [];
    if (key === "quoteConcrete" || key === "quoteWithinBudget") return input.quoteSupport.reasonCodes;
    return [key];
  }));
  return {
    ok: reasons.size === 0,
    checks,
    reasons: [...reasons],
    explicitLiveFlag: "--broadcast",
    liveRequested: input.broadcast,
  };
}

function buildUploadCustomCharges(
  quoteSupport: IPFSQuoteSupport,
  quote: unknown,
): { maxCostDem: string; estimatedBreakdown?: { base_cost?: string; size_cost?: string } } | null {
  if (!quoteSupport.concrete || !quote || typeof quote !== "object") return null;
  const record = quote as Record<string, unknown>;
  const costDem = record.cost_dem;
  if (typeof costDem !== "string" && typeof costDem !== "number") return null;
  const breakdown = record.breakdown && typeof record.breakdown === "object"
    ? record.breakdown as Record<string, unknown>
    : undefined;
  return {
    maxCostDem: String(costDem),
    estimatedBreakdown: breakdown
      ? {
          base_cost: typeof breakdown.base_cost === "string" ? breakdown.base_cost : undefined,
          size_cost: typeof breakdown.size_cost === "string" ? breakdown.size_cost : undefined,
        }
      : undefined,
  };
}

function buildUploadPlan(input: {
  filename: string;
  sizeBytes: number;
  quoteSupport: IPFSQuoteSupport;
  readbackExpectation?: string;
}): {
  filename: string;
  sizeBytes: number;
  feeDem: number | null;
  cidAvailableBeforeUpload: false;
  cidPlan: string;
  readbackExpectation: string | null;
} {
  return {
    filename: input.filename,
    sizeBytes: input.sizeBytes,
    feeDem: input.quoteSupport.quotedFeeDem,
    cidAvailableBeforeUpload: false,
    cidPlan: "CID is not available before upload on the maintained runtime; live proof must verify tx hash plus the stated readback expectation.",
    readbackExpectation: input.readbackExpectation ?? null,
  };
}
