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

const DEFAULT_FILENAME = "omniweb-toolkit-ipfs-probe.txt";
const DEFAULT_TEXT =
  "Operational IPFS upload verification for omniweb-toolkit on 2026-04-15. This is a small public artifact used to confirm that the packaged IPFS upload path remains functional after the refactor cycle.";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/probe-ipfs.ts [options]

Options:
  --content TEXT       Content to upload (default: built-in probe text)
  --filename NAME      Filename metadata for the upload (default: omniweb-toolkit-ipfs-probe.txt)
  --state-dir PATH     Override state directory
  --broadcast          Execute the real upload and chain verification
  --help, -h           Show this help

Output: JSON IPFS probe report
Exit codes: 0 = success, 1 = runtime or upload failure, 2 = invalid args`);
  process.exit(0);
}

function getStringArg(flag: string, fallback: string): string {
  const index = args.indexOf(flag);
  if (index < 0) return fallback;
  return args[index + 1] ?? fallback;
}

for (const flag of ["--content", "--filename", "--state-dir"]) {
  const index = args.indexOf(flag);
  if (index >= 0 && !args[index + 1]) {
    console.error(`Error: ${flag} requires a value`);
    process.exit(2);
  }
}

const content = getStringArg("--content", DEFAULT_TEXT);
const filename = getStringArg("--filename", DEFAULT_FILENAME);
const stateDirArg = getStringArg("--state-dir", "");
const stateDir = stateDirArg || undefined;
const broadcast = args.includes("--broadcast");

try {
  const connect = await loadConnect();
  const omni = await connect({ stateDir });
  const sizeBytes = Buffer.byteLength(content);

  let quote: unknown = null;
  let quoteError: string | undefined;
  try {
    quote = await omni.runtime.demos.ipfs.quote(sizeBytes, "IPFS_ADD");
  } catch (error) {
    quoteError = error instanceof Error ? error.message : String(error);
  }

  if (!broadcast) {
    console.log(JSON.stringify({
      attempted: false,
      ok: true,
      address: omni.address,
      filename,
      sizeBytes,
      quote,
      quoteError,
      message: "Dry run only. Re-run with --broadcast to execute the real IPFS upload probe.",
    }, null, 2));
    process.exit(0);
  }

  const upload = await omni.ipfs.upload(content, { filename });
  if (!upload.ok || !upload.txHash) {
    console.log(JSON.stringify({
      attempted: true,
      ok: false,
      address: omni.address,
      filename,
      sizeBytes,
      quote,
      quoteError,
      upload,
    }, null, 2));
    process.exit(1);
  }

  const verification = await omni.runtime.sdkBridge.verifyTransaction(upload.txHash);

  console.log(JSON.stringify({
    attempted: true,
    ok: true,
    address: omni.address,
    filename,
    sizeBytes,
    quote,
    quoteError,
    txHash: upload.txHash,
    confirmationBlock: upload.confirmationBlock,
    broadcastMessage: upload.broadcastMessage,
    verification,
  }, null, 2));
} catch (err) {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

async function loadConnect(): Promise<(opts?: {
  stateDir?: string;
}) => Promise<any>> {
  try {
    const mod = await import("../dist/index.js");
    if (typeof mod.connect === "function") {
      return mod.connect;
    }
  } catch {
    // Fall back to source during local development before build output exists.
  }

  const mod = await import("../src/index.ts");
  if (typeof mod.connect !== "function") {
    throw new Error("connect() export not found in dist/index.js or src/index.ts");
  }
  return mod.connect;
}
