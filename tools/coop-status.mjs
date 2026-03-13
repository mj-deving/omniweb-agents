#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const statusPath = path.join(root, "claude-codex-coop", "STATUS.md");

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

const args = parseArgs(process.argv);
const updated = new Date().toISOString();
const owner = args.owner || "unassigned";
const focus = args.focus || "n/a";
const next = args.next || "n/a";
const blockers = args.blockers || "none";

const body = [
  "# Coop Status",
  "",
  `- Updated: ${updated}`,
  `- Owner: ${owner}`,
  "- Branch intent: active development",
  `- Current focus: ${focus}`,
  `- Next expected step: ${next}`,
  `- Blockers: ${blockers}`,
  ""
].join("\n");

fs.mkdirSync(path.dirname(statusPath), { recursive: true });
fs.writeFileSync(statusPath, body);
console.log(`status updated: ${path.relative(root, statusPath)}`);
