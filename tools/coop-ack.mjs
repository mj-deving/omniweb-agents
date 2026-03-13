#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const STATUS_FILE = path.join(root, "claude-codex-coop", "STATUS.md");
const HANDOFF_FILE = path.join(root, "claude-codex-coop", "logs", "SESSION-HANDOFFS.md");
const ACK_FILE = path.join(root, "claude-codex-coop", "ACKS.json");

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = "true";
    }
  }
  return out;
}

function readStatusUpdated() {
  if (!fs.existsSync(STATUS_FILE)) return null;
  const text = fs.readFileSync(STATUS_FILE, "utf8");
  const match = text.match(/^- Updated:\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function readLatestHandoffHeading() {
  if (!fs.existsSync(HANDOFF_FILE)) return null;
  const text = fs.readFileSync(HANDOFF_FILE, "utf8");
  const matches = [...text.matchAll(/^##\s+.+$/gm)];
  if (matches.length === 0) return null;
  return String(matches[matches.length - 1][0] || "").trim();
}

function loadAckFile() {
  if (!fs.existsSync(ACK_FILE)) {
    return { version: 1, acks: [] };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(ACK_FILE, "utf8"));
    const acks = Array.isArray(parsed?.acks) ? parsed.acks : [];
    return { version: 1, acks };
  } catch {
    return { version: 1, acks: [] };
  }
}

function main() {
  const args = parseArgs(process.argv);
  const agent = args.agent || process.env.AGENT_NAME || "unknown";
  const source = args.source || "manual";
  const note = args.note || "";
  const now = new Date().toISOString();

  const statusUpdated = readStatusUpdated();
  const latestHandoffHeading = readLatestHandoffHeading();

  const file = loadAckFile();
  const entry = {
    agent,
    timestamp: now,
    source,
    note,
    statusUpdated,
    latestHandoffHeading,
  };

  file.acks.push(entry);
  // Keep only recent history.
  file.acks = file.acks.slice(-200);

  fs.mkdirSync(path.dirname(ACK_FILE), { recursive: true });
  fs.writeFileSync(ACK_FILE, JSON.stringify(file, null, 2) + "\n");

  console.log(`ack recorded: ${path.relative(root, ACK_FILE)} (${agent} @ ${now})`);
}

main();
