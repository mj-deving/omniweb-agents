#!/usr/bin/env npx tsx

import { spawn } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 10_000;
const MODULE_TARGETS = [
  "@kynesyslabs/demosdk/xmcore",
  "@kynesyslabs/demosdk/xm-websdk",
  "@kynesyslabs/demosdk/xm-localsdk",
  "@kynesyslabs/demosdk/bridge",
  "@kynesyslabs/demosdk/demoswork",
] as const;

interface ProbeResult {
  module: string;
  attempted: boolean;
  ok: boolean;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  error: string | null;
  exportKeys: string[];
  testedAt: string;
}

interface ChildPayload {
  module: string;
  ok: boolean;
  error?: string;
  exportKeys?: string[];
  testedAt?: string;
}

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: node --import tsx ./scripts/probe-import-boundary.ts

Imports the DemosWork/XM/Rubic raw SDK module targets in isolated child
processes so native crashes cannot kill the parent process.

Output: JSON report with one result per module target.
Exit codes:
  0 = probe completed and emitted JSON, even when module imports fail
  2 = unsupported arguments

Safety:
  No wallet creation, private-key import, signing, bridge execution, workflow
  execution, broadcast, or spend is performed.`);
  process.exit(0);
}

if (args.length > 0) {
  console.error(`Error: unsupported arguments: ${args.join(" ")}`);
  process.exit(2);
}

const results: ProbeResult[] = [];

for (const moduleName of MODULE_TARGETS) {
  results.push(await probeModule(moduleName));
}

const ok = results.every((result) => result.ok);

console.log(JSON.stringify({
  ok,
  checkedAt: new Date().toISOString(),
  timeoutMs: DEFAULT_TIMEOUT_MS,
  results,
  contract: {
    childProcessPerModule: true,
    importsOnly: true,
    walletCreated: false,
    privateKeyImported: false,
    signingAttempted: false,
    bridgeExecutionAttempted: false,
    workflowExecutionAttempted: false,
    broadcastAttempted: false,
    spendAttempted: false,
  },
}, null, 2));

process.exit(0);

function probeModule(moduleName: string): Promise<ProbeResult> {
  const testedAt = new Date().toISOString();
  const child = spawn(process.execPath, [
    "--input-type=module",
    "--eval",
    renderChildProbe(),
  ], {
    env: {
      ...process.env,
      PROBE_MODULE: moduleName,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  let settled = false;

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      resolve({
        module: moduleName,
        attempted: true,
        ok: false,
        exitCode: null,
        signal: "SIGTERM",
        error: `probe timed out after ${DEFAULT_TIMEOUT_MS}ms`,
        exportKeys: [],
        testedAt,
      });
    }, DEFAULT_TIMEOUT_MS);

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        module: moduleName,
        attempted: true,
        ok: false,
        exitCode: null,
        signal: null,
        error: error.message,
        exportKeys: [],
        testedAt,
      });
    });

    child.on("close", (exitCode, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(normalizeChildResult({
        moduleName,
        testedAt,
        exitCode,
        signal,
        stdout,
        stderr,
      }));
    });
  });
}

function normalizeChildResult(input: {
  moduleName: string;
  testedAt: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}): ProbeResult {
  const payload = parseChildPayload(input.stdout);
  const fallbackError = compactError(input.stderr)
    ?? (input.signal ? `child exited with signal ${input.signal}` : null)
    ?? (input.exitCode && input.exitCode !== 0 ? `child exited with code ${input.exitCode}` : null);

  return {
    module: input.moduleName,
    attempted: true,
    ok: input.exitCode === 0 && input.signal === null && payload?.ok === true,
    exitCode: input.exitCode,
    signal: input.signal,
    error: payload?.ok === true ? null : payload?.error ?? fallbackError ?? "child exited before JSON payload",
    exportKeys: payload?.exportKeys?.slice(0, 50) ?? [],
    testedAt: payload?.testedAt ?? input.testedAt,
  };
}

function parseChildPayload(stdout: string): ChildPayload | null {
  const lastLine = stdout.trim().split("\n").filter(Boolean).at(-1);
  if (!lastLine) return null;

  try {
    const parsed = JSON.parse(lastLine) as ChildPayload;
    return typeof parsed.module === "string" && typeof parsed.ok === "boolean"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function compactError(stderr: string): string | null {
  const trimmed = stderr.trim();
  if (!trimmed) return null;
  return trimmed.split("\n").slice(-6).join("\n").slice(0, 1200);
}

function renderChildProbe(): string {
  return `
const moduleName = process.env.PROBE_MODULE;
const testedAt = new Date().toISOString();
try {
  const imported = await import(moduleName);
  console.log(JSON.stringify({
    module: moduleName,
    ok: true,
    exportKeys: Object.keys(imported).sort().slice(0, 50),
    testedAt
  }));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.log(JSON.stringify({
    module: moduleName,
    ok: false,
    error: message,
    exportKeys: [],
    testedAt
  }));
  process.exitCode = 1;
}
`;
}
