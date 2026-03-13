#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const logPath = path.join(root, "claude-codex-coop", "logs", "SESSION-HANDOFFS.md");

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    out[key] = val;
  }
  return out;
}

function runGit(args, allowFailure = false) {
  const res = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (res.status !== 0 && !allowFailure) {
    const err = (res.stderr || res.stdout || "git command failed").trim();
    throw new Error(`git ${args.join(" ")} -> ${err}`);
  }
  return {
    ok: res.status === 0,
    stdout: (res.stdout || "").trim(),
  };
}

function getDefaultRangeForSolo() {
  const upstream = runGit(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], true);
  if (upstream.ok && upstream.stdout) return `${upstream.stdout}..HEAD`;

  const hasHeadParent = runGit(["rev-parse", "HEAD~1"], true);
  if (hasHeadParent.ok) return "HEAD~1..HEAD";

  return "HEAD..HEAD";
}

function changedFilesFromRange(range) {
  const diff = runGit(["diff", "--name-only", range], true);
  if (!diff.ok) return [];
  return diff.stdout ? diff.stdout.split("\n").map((s) => s.trim()).filter(Boolean) : [];
}

function changedFilesFromWorktree() {
  const diff = runGit(["diff", "--name-only", "HEAD"], true);
  const tracked = diff.ok
    ? (diff.stdout ? diff.stdout.split("\n").map((s) => s.trim()).filter(Boolean) : [])
    : [];

  const untrackedRes = runGit(["ls-files", "--others", "--exclude-standard"], true);
  const untracked = untrackedRes.ok
    ? (untrackedRes.stdout ? untrackedRes.stdout.split("\n").map((s) => s.trim()).filter(Boolean) : [])
    : [];

  return [...new Set([...tracked, ...untracked])];
}

function parseCsv(input) {
  return String(input || "")
    .split(",")
    .map((s) => s.trim().replace(/^\.?\//, ""))
    .filter(Boolean);
}

const args = parseArgs(process.argv);
const agent = args.agent || "unknown";
const summary = args.summary || "no summary provided";
const validation = (args.validation || "").split(";").map((s) => s.trim()).filter(Boolean);
const next = args.next || "none";
const blockers = args.blockers || "none";
const autoFiles = args["auto-files"] === "true";
const useWorktree = args.worktree === "true";
const range = args.range || getDefaultRangeForSolo();
const ts = new Date().toISOString();

const manualFiles = parseCsv(args.files || "");
const detectedFiles = autoFiles
  ? (useWorktree ? changedFilesFromWorktree() : changedFilesFromRange(range))
  : [];
const files = [...new Set([...manualFiles, ...detectedFiles])].sort();

if (!fs.existsSync(logPath)) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(logPath, "# Session Handoffs\n\n");
}

const lines = [];
lines.push(`## ${ts} | ${agent}`);
lines.push("");
lines.push("Summary:");
lines.push(`- ${summary}`);
lines.push("");
lines.push("Changed files:");
if (files.length === 0) {
  lines.push("- none listed");
} else {
  for (const f of files) lines.push(`- ${f}`);
}
lines.push("");
lines.push("Validation:");
if (validation.length === 0) {
  lines.push("- not run");
} else {
  for (const v of validation) lines.push(`- ${v}`);
}
lines.push("");
lines.push("Next:");
lines.push(`- ${next}`);
lines.push("");
lines.push("Blockers:");
lines.push(`- ${blockers}`);
lines.push("\n");

fs.appendFileSync(logPath, `${lines.join("\n")}\n`);
console.log(`handoff appended: ${path.relative(root, logPath)}`);
if (autoFiles) {
  console.log(`handoff files auto-detected: ${files.length} (source=${useWorktree ? "worktree" : range})`);
}
