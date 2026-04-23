#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";

const manifestPath = resolve(
  process.argv[2] ?? "docs/research/live-session-testing/2026-04-22-broad-sweep-20/manifest.json"
);
const root = dirname(manifestPath);
const raw = readFileSync(manifestPath, "utf8");
const manifest = JSON.parse(raw);
const startedAt = new Date().toISOString();
const completedResults = [];

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function tryWriteJson(path, stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return;
  }
  try {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end <= start) {
      return;
    }
    const candidate = trimmed.slice(start, end + 1);
    JSON.parse(candidate);
    writeFileSync(path, `${candidate}\n`);
  } catch {
    // Ignore mixed stdout; the full text is still persisted to the log file.
  }
}

function writeResultLog(result) {
  const logPath = join(root, "logs", `${result.id}.log`);
  ensureDir(dirname(logPath));
  writeFileSync(
    logPath,
    [
      `# ${result.id}`,
      `agent=${result.agentName}`,
      `kind=${result.kind}`,
      `code=${result.code}`,
      "",
      "## STDOUT",
      result.stdout.trim(),
      "",
      "## STDERR",
      result.stderr.trim()
    ].join("\n")
  );
}

function writeProgress(results) {
  const summary = {
    startedAt,
    updatedAt: new Date().toISOString(),
    total: manifest.length,
    completed: results.length,
    ok: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results: results.map((r) => ({
      id: r.id,
      agentName: r.agentName,
      kind: r.kind,
      ok: r.ok,
      code: r.code,
      outPath: r.outPath
    }))
  };
  writeFileSync(join(root, "run-summary.json"), JSON.stringify(summary, null, 2));
}

function isoAfterMinutes(minutes) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function baseArgs(item) {
  const stateDir = join(root, "state", item.agentName);
  const outPath = join(root, "results", `${item.id}.json`);
  ensureDir(dirname(outPath));
  return { stateDir, outPath };
}

function readExistingResult(path) {
  if (!existsSync(path)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function artifactShowsSuccess(path) {
  const existing = readExistingResult(path);
  if (!existing || typeof existing !== "object") {
    return false;
  }
  if (existing.record?.outcome?.status === "published") {
    return true;
  }
  if (existing.record?.outcome?.publishResult?.ok === true) {
    return true;
  }
  return existing.ok === true;
}

function validateItem(item) {
  if (!item.text || item.text.length < 200) {
    throw new Error(`${item.id}: text must be at least 200 chars, got ${item.text?.length ?? 0}`);
  }
  if (!item.attestUrl) {
    throw new Error(`${item.id}: missing attestUrl`);
  }
  if (!item.agentName) {
    throw new Error(`${item.id}: missing agentName`);
  }
}

function buildCommand(item) {
  validateItem(item);
  const { stateDir, outPath } = baseArgs(item);
  if (artifactShowsSuccess(outPath)) {
    return {
      item,
      stateDir,
      outPath,
      skip: true
    };
  }
  if (item.kind === "prediction") {
    return {
      item,
      stateDir,
      outPath,
      buildArgv() {
        const deadlineAt = isoAfterMinutes(item.deadlineOffsetMinutes ?? 30);
        return [
          "node",
          "--import",
          "tsx",
          "packages/omniweb-toolkit/scripts/check-supervised-prediction.ts",
          "--agent-name",
          item.agentName,
          "--state-dir",
          stateDir,
          "--text",
          item.text,
          "--attest-url",
          item.attestUrl,
          "--deadline-at",
          deadlineAt,
          "--confidence",
          String(item.confidence ?? 60),
          "--falsifier",
          item.falsifier,
          "--verify-url",
          item.verifyUrl,
          "--verify-json-path",
          item.verifyJsonPath,
          "--verify-operator",
          item.verifyOperator,
          "--verify-value",
          String(item.verifyValue),
          "--verify-value-type",
          item.verifyValueType ?? "number",
          "--verify-label",
          item.verifyLabel ?? item.id,
          "--source-name",
          item.sourceName ?? item.id,
          "--record-pending-verdict",
          "--verify-timeout-ms",
          "15000",
          "--verify-poll-ms",
          "1500",
          "--out",
          outPath
        ];
      }
    };
  }

  return {
    item,
    stateDir,
    outPath,
    buildArgv() {
      return [
        "node",
        "--import",
        "tsx",
        "packages/omniweb-toolkit/scripts/check-write-surface-sweep.ts",
        "--broadcast",
        "--agent-name",
        item.agentName,
        "--state-dir",
        stateDir,
        "--skip-react",
        "--skip-tip",
        "--skip-reply",
        "--skip-hl",
        "--skip-bet",
        "--publish-category",
        item.category,
        "--publish-text",
        item.text,
        "--publish-attest-url",
        item.attestUrl,
        "--verify-timeout-ms",
        "12000",
        "--verify-poll-ms",
        "1500"
      ];
    }
  };
}

function runOne(commandSpec) {
  if (commandSpec.skip) {
    return Promise.resolve({
      id: commandSpec.item.id,
      agentName: commandSpec.item.agentName,
      kind: commandSpec.item.kind,
      code: 0,
      ok: true,
      outPath: commandSpec.outPath,
      stdout: "[skipped] existing result artifact present",
      stderr: ""
    });
  }
  return new Promise((resolvePromise) => {
    const { item, outPath } = commandSpec;
    const argv = commandSpec.buildArgv();
    const child = spawn(argv[0], argv.slice(1), { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      const result = {
        id: item.id,
        agentName: item.agentName,
        kind: item.kind,
        code,
        ok: code === 0,
        outPath,
        stdout,
        stderr
      };
      tryWriteJson(outPath, stdout);
      writeResultLog(result);
      resolvePromise(result);
    });
  });
}

async function runAgentQueue(agentName, commands) {
  const results = [];
  for (const command of commands) {
    const result = await runOne(command);
    results.push(result);
    completedResults.push(result);
    writeProgress(completedResults);
  }
  return results;
}

const byAgent = new Map();
for (const item of manifest) {
  const command = buildCommand(item);
  const group = byAgent.get(item.agentName) ?? [];
  group.push(command);
  byAgent.set(item.agentName, group);
}

const agentRuns = [...byAgent.entries()].map(([agentName, commands]) =>
  runAgentQueue(agentName, commands)
);

const nestedResults = await Promise.all(agentRuns);
const results = nestedResults.flat();
const finishedAt = new Date().toISOString();
const summary = {
  startedAt,
  finishedAt,
  total: results.length,
  ok: results.filter((r) => r.ok).length,
  failed: results.filter((r) => !r.ok).length,
  results: results.map((r) => ({
    id: r.id,
    agentName: r.agentName,
    kind: r.kind,
    ok: r.ok,
    code: r.code,
    outPath: r.outPath
  }))
};

writeFileSync(join(root, "run-summary.json"), JSON.stringify(summary, null, 2));

console.log(JSON.stringify(summary, null, 2));
