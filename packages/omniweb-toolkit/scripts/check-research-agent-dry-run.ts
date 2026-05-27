#!/usr/bin/env -S bunx tsx

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { PACKAGE_ROOT, hasFlag } from "./_shared.js";

const args = process.argv.slice(2);
const keepStdout = hasFlag(args, "--stdout");

const allowedArgs = new Set(["--stdout", "--help", "-h"]);
if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: bunx tsx packages/omniweb-toolkit/scripts/check-research-agent-dry-run.ts [options]

Run the exported OpenClaw research-agent minimal starter in forced dry-run mode from the source workspace and assert the deferred-runtime no-spend path.

Options:
  --stdout   Print the full starter stdout after the JSON summary
  --help, -h Show this help

Output: JSON dry-run proof summary
Exit codes: 0 = proof passed, 1 = proof failed, 2 = invalid args`);
  process.exit(0);
}

const unsupportedArgs = args.filter((arg) => !allowedArgs.has(arg));
if (unsupportedArgs.length > 0) {
  console.error(`Error: unsupported arguments: ${unsupportedArgs.join(" ")}`);
  process.exit(2);
}

const bundleRoot = resolve(PACKAGE_ROOT, "agents/openclaw/research-agent");
const command = ["node", "skills/omniweb-research-agent/minimal-agent-starter.mjs"];
const started = Date.now();
const result = spawnSync(command[0], command.slice(1), {
  cwd: bundleRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    OMNIWEB_STARTER_MODE: "dry-run",
  },
});

const stdout = result.stdout ?? "";
const stderr = result.stderr ?? "";
const exitCode = result.status ?? 1;

const checks = {
  selectedDryRun: stdout.includes("Selected mode: dry-run"),
  deferredRuntimeBanner: stdout.includes("OmniWeb Minimal Starter — deferred dry-run runtime"),
  liveStatsRead: stdout.includes("Observed colony stats:"),
  noSpendMessage: stdout.includes("Dry-run runtime only. No wallet-backed action attempted."),
  noFallbackToBundle: !stdout.includes("Degrading to bundle mode instead."),
};

const ok = exitCode === 0 && Object.values(checks).every(Boolean);

const summary = {
  checkedAt: new Date().toISOString(),
  ok,
  bundleRoot,
  command,
  exitCode,
  durationMs: Date.now() - started,
  checks,
  contract: {
    deferredDryRunRuntimeProof: ok,
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
