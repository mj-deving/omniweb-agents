#!/usr/bin/env -S bunx tsx

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { PACKAGE_ROOT, hasFlag } from "./_shared.js";

const args = process.argv.slice(2);
const keepStdout = hasFlag(args, "--stdout");
const skipPrepare = hasFlag(args, "--skip-prepare");
const allowedArgs = new Set(["--stdout", "--skip-prepare", "--help", "-h"]);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: bunx tsx packages/omniweb-toolkit/scripts/check-research-agent-live-read.ts [options]

Run the exported OpenClaw research-agent minimal starter in explicit live-read mode from the source workspace and assert the read-only runtime path.

Options:
  --stdout         Print the full starter stdout after the JSON summary
  --skip-prepare   Reuse existing dist artifacts instead of refreshing JS runtime build first
  --help, -h       Show this help

Output: JSON live-read proof summary
Exit codes: 0 = proof passed, 1 = proof failed, 2 = invalid args`);
  process.exit(0);
}

const unsupportedArgs = args.filter((arg) => !allowedArgs.has(arg));
if (unsupportedArgs.length > 0) {
  console.error(`Error: unsupported arguments: ${unsupportedArgs.join(" ")}`);
  process.exit(2);
}

if (!skipPrepare) {
  const prepareResult = spawnSync("node", ["./scripts/prepare-runtime-proof-build.mjs"], {
    cwd: PACKAGE_ROOT,
    encoding: "utf8",
    env: process.env,
  });

  if ((prepareResult.status ?? 1) !== 0) {
    console.error(prepareResult.stderr ?? prepareResult.stdout ?? "runtime proof build prep failed");
    process.exit(prepareResult.status ?? 1);
  }
}

const bundleRoot = resolve(PACKAGE_ROOT, "agents/openclaw/research-agent");
const command = ["node", "skills/omniweb-research-agent/minimal-agent-starter.mjs"];
const started = Date.now();
const result = spawnSync(command[0], command.slice(1), {
  cwd: bundleRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    OMNIWEB_STARTER_MODE: "live-read",
  },
});

const stdout = result.stdout ?? "";
const stderr = result.stderr ?? "";
const exitCode = result.status ?? 1;

const checks = {
  selectedLiveRead: stdout.includes("Selected mode: live-read"),
  liveReadBanner: stdout.includes("OmniWeb Minimal Starter — live-read runtime"),
  feedRead: stdout.includes("- feed posts:"),
  signalsRead: stdout.includes("- consensus signals:"),
  scoresRead: stdout.includes("- score rows:"),
  noSpendMessage: stdout.includes("Live-read runtime only. No wallet-backed action attempted."),
  noFallbackToBundle: !stdout.includes("Degrading to bundle mode instead."),
};

const ok = exitCode === 0 && Object.values(checks).every(Boolean);

const summary = {
  checkedAt: new Date().toISOString(),
  ok,
  bundleRoot,
  command,
  preparedRuntimeBuild: !skipPrepare,
  exitCode,
  durationMs: Date.now() - started,
  checks,
  contract: {
    explicitLiveReadProof: ok,
    spendsDem: false,
    liveWriteProven: false,
  },
  stdoutPreview: stdout.trim().slice(0, 2000),
  stderrPreview: stderr.trim().slice(0, 1200),
};

console.log(JSON.stringify(summary, null, 2));
if (keepStdout) {
  console.log("\n--- starter stdout ---\n");
  process.stdout.write(stdout);
}

process.exit(ok ? 0 : 1);
