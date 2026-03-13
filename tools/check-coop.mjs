#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const STATUS_FILE = "claude-codex-coop/STATUS.md";
const HANDOFF_FILE = "claude-codex-coop/logs/SESSION-HANDOFFS.md";
const CLAIMS_FILE = "claude-codex-coop/CLAIMS.json";
const ACK_FILE = "claude-codex-coop/ACKS.json";

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

function runGit(args, allowFailure = false) {
  const res = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (res.status !== 0 && !allowFailure) {
    const err = (res.stderr || res.stdout || "git command failed").trim();
    throw new Error(`git ${args.join(" ")} -> ${err}`);
  }
  return {
    ok: res.status === 0,
    stdout: (res.stdout || "").trim(),
    stderr: (res.stderr || "").trim(),
  };
}

function getDefaultRangeForSolo() {
  const upstream = runGit(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], true);
  if (upstream.ok && upstream.stdout) return `${upstream.stdout}..HEAD`;

  const hasHeadParent = runGit(["rev-parse", "HEAD~1"], true);
  if (hasHeadParent.ok) return "HEAD~1..HEAD";

  return "HEAD..HEAD";
}

function getRange(args) {
  if (args.range) return args.range;
  const mode = args.mode || "solo";

  if (mode === "ci") {
    const baseSha = args.base || process.env.BASE_SHA || "";
    const headSha = args.head || process.env.HEAD_SHA || "HEAD";
    if (baseSha && !/^0+$/.test(baseSha)) return `${baseSha}..${headSha}`;
    return "HEAD~1..HEAD";
  }

  return getDefaultRangeForSolo();
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

function fileContains(pathRel, patterns) {
  const abs = path.join(root, pathRel);
  if (!fs.existsSync(abs)) return false;
  const txt = fs.readFileSync(abs, "utf8");
  return patterns.every((p) => p.test(txt));
}

function cleanPathToken(input) {
  const token = String(input || "").trim().replace(/^\.?\//, "").replace(/[`,]/g, "");
  if (!token) return "";
  if (token.startsWith(root)) {
    return token.slice(root.length + 1).replace(/^\.?\//, "");
  }
  return token;
}

function escapeRegex(input) {
  return input.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function patternToRegex(pattern) {
  const p = cleanPathToken(pattern);
  const source = "^" + escapeRegex(p).replace(/\*/g, ".*") + "$";
  return new RegExp(source);
}

function patternMatchesFile(pattern, file) {
  const p = cleanPathToken(pattern);
  const f = cleanPathToken(file);
  if (!p || !f) return false;

  if (p.endsWith("/")) return f.startsWith(p);
  if (p.includes("*")) return patternToRegex(p).test(f);

  const abs = path.join(root, p);
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
    return f === p || f.startsWith(`${p}/`);
  }
  return f === p;
}

function pathFromChangedFileLine(line) {
  const raw = String(line || "").replace(/^\s*-\s+/, "").trim();
  if (!raw || /^none listed$/i.test(raw)) return null;
  const first = raw.split(/\s+/)[0].replace(/:$/, "");
  const token = cleanPathToken(first);
  if (!token) return null;
  if (token.includes("/") || token.includes(".") || token.includes("*")) return token;
  return null;
}

function latestHandoffChangedFiles() {
  const abs = path.join(root, HANDOFF_FILE);
  if (!fs.existsSync(abs)) return [];
  const text = fs.readFileSync(abs, "utf8");

  const headings = [...text.matchAll(/^##\s+/gm)];
  if (headings.length === 0) return [];
  const lastIdx = headings[headings.length - 1].index;
  const section = text.slice(lastIdx);
  const lines = section.split("\n");

  const out = [];
  let inChanged = false;
  for (const line of lines) {
    if (/^Changed files:\s*$/.test(line)) {
      inChanged = true;
      continue;
    }
    if (inChanged && /^(Validation:|Next:|Blockers:)\s*$/.test(line)) break;
    if (inChanged && /^\s*-\s+/.test(line)) {
      const p = pathFromChangedFileLine(line);
      if (p) out.push(p);
    }
  }
  return [...new Set(out)];
}

function readStatusOwner() {
  const abs = path.join(root, STATUS_FILE);
  if (!fs.existsSync(abs)) return "";
  const text = fs.readFileSync(abs, "utf8");
  const match = text.match(/^- Owner:\s+(.+)$/m);
  if (!match) return "";
  return match[1].trim().toLowerCase();
}

function loadActiveClaims() {
  const abs = path.join(root, CLAIMS_FILE);
  if (!fs.existsSync(abs)) return [];
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (e) {
    fail(`unable to parse ${CLAIMS_FILE}`, [`${e.message}`]);
  }
  const claims = Array.isArray(parsed.claims) ? parsed.claims : [];
  const now = Date.now();
  return claims.filter((c) => Number.isFinite(Date.parse(String(c.expiresAt || ""))) && Date.parse(String(c.expiresAt)) > now);
}

function loadAcks() {
  const abs = path.join(root, ACK_FILE);
  if (!fs.existsSync(abs)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(abs, "utf8"));
    const rows = Array.isArray(parsed?.acks) ? parsed.acks : [];
    return rows.filter((r) => typeof r?.agent === "string" && typeof r?.timestamp === "string");
  } catch {
    return [];
  }
}

function latestAckFor(agentName) {
  const target = String(agentName || "").toLowerCase();
  if (!target) return null;
  const rows = loadAcks()
    .filter((r) => String(r.agent || "").toLowerCase() === target)
    .sort((a, b) => Date.parse(String(b.timestamp || "")) - Date.parse(String(a.timestamp || "")));
  return rows[0] || null;
}

function fail(msg, extra = []) {
  console.error(`coop-check: FAIL - ${msg}`);
  for (const line of extra) console.error(`  ${line}`);
  process.exit(1);
}

function pass(msg, extra = []) {
  console.log(`coop-check: PASS - ${msg}`);
  for (const line of extra) console.log(`  ${line}`);
}

const args = parseArgs(process.argv);
const mode = args.mode || "solo";
const useWorktree = args.worktree === "true";
const range = getRange(args);
const requireClaim = args["require-claim"] !== "false";
const softAck = args["soft-ack"] === "true" || process.env.COOP_SOFT_ACK === "1";
const softAckHoursRaw = args["soft-ack-hours"] || process.env.COOP_SOFT_ACK_HOURS || "24";
const softAckHours = Number(softAckHoursRaw);

const changed = useWorktree ? changedFilesFromWorktree() : changedFilesFromRange(range);

if (changed.length === 0) {
  pass("no changed files in evaluated scope", [`mode=${mode}`, `range=${range}`]);
  process.exit(0);
}

const substantive = changed.filter((f) => !f.startsWith("claude-codex-coop/"));
if (substantive.length === 0) {
  pass("only coop files changed", [`mode=${mode}`, `range=${range}`]);
  process.exit(0);
}

const hasStatusChange = changed.includes(STATUS_FILE);
const hasHandoffChange = changed.includes(HANDOFF_FILE);
if (!hasStatusChange || !hasHandoffChange) {
  fail("substantive changes require coop status + handoff updates", [
    `mode=${mode}`,
    `range=${range}`,
    `missing=${[
      !hasStatusChange ? STATUS_FILE : null,
      !hasHandoffChange ? HANDOFF_FILE : null,
    ].filter(Boolean).join(", ")}`,
    "fix: run `npm run coop:status ...` and `npm run coop:handoff ...`",
  ]);
}

if (useWorktree) {
  const absHandoff = path.join(root, HANDOFF_FILE);
  const text = fs.existsSync(absHandoff) ? fs.readFileSync(absHandoff, "utf8") : "";
  if (!/^##\s+/m.test(text)) {
    fail("handoff file present but missing at least one entry heading", [
      "expected a line like: ## 2026-... | agent",
    ]);
  }
} else {
  const handoffDiff = runGit(["diff", range, "--", HANDOFF_FILE], true);
  if (!handoffDiff.ok || !/^\+##\s+/m.test(handoffDiff.stdout)) {
    fail("handoff file changed but no new handoff entry heading detected", [
      `mode=${mode}`,
      `range=${range}`,
      "expected a new line like: +## 2026-... | agent",
    ]);
  }
}

const statusLooksValid = fileContains(STATUS_FILE, [
  /^- Updated:\s+/m,
  /^- Owner:\s+(?!unassigned\b).+/m,
  /^- Current focus:\s+(?!n\/a\b).+/m,
  /^- Next expected step:\s+(?!n\/a\b).+/m,
]);
if (!statusLooksValid) {
  fail("STATUS.md is missing required non-placeholder fields", [
    "required: Updated, Owner (!= unassigned), Current focus (!= n/a), Next expected step (!= n/a)",
  ]);
}

const owner = readStatusOwner();

const declared = latestHandoffChangedFiles();
const missingFromHandoff = substantive.filter((f) => !declared.some((p) => patternMatchesFile(p, f)));
if (missingFromHandoff.length > 0) {
  fail("handoff changed-files list omits substantive file(s)", [
    `missing=${missingFromHandoff.join(",")}`,
    "fix: include every changed substantive path (or parent directory/wildcard) in latest handoff Changed files list",
  ]);
}

if (requireClaim) {
  const activeClaims = loadActiveClaims();
  const ownerClaims = activeClaims.filter((c) => String(c.agent || "").toLowerCase() === owner);

  if (!owner || owner === "unassigned") {
    fail("status owner is missing/invalid for claim enforcement", [
      `owner=${owner || "(empty)"}`,
    ]);
  }

  if (ownerClaims.length === 0) {
    fail("no active claim for STATUS owner", [
      `owner=${owner}`,
      "fix: run `npm run coop:claim -- --agent <owner> --task \"...\" --files \"path1,path2\"`",
    ]);
  }

  const ownerPatterns = ownerClaims.flatMap((c) => Array.isArray(c.files) ? c.files : []);
  const outOfScope = substantive.filter((f) => !ownerPatterns.some((p) => patternMatchesFile(p, f)));
  if (outOfScope.length > 0) {
    fail("substantive file(s) are outside owner claim scope", [
      `owner=${owner}`,
      `files=${outOfScope.join(",")}`,
      "fix: expand owner claim scope before editing/pushing",
    ]);
  }

  const conflicts = [];
  for (const file of substantive) {
    const ownerShared = ownerClaims.some((c) => c.shared === true && (c.files || []).some((p) => patternMatchesFile(p, file)));
    for (const claim of activeClaims) {
      const claimAgent = String(claim.agent || "").toLowerCase();
      if (claimAgent === owner) continue;
      const matched = (claim.files || []).some((p) => patternMatchesFile(p, file));
      if (!matched) continue;
      if (claim.shared === true || ownerShared) continue;
      conflicts.push(`${file} vs ${claimAgent}:${claim.lane || "default"}`);
    }
  }
  if (conflicts.length > 0) {
    fail("active claim conflict detected", [
      ...[...new Set(conflicts)],
      "fix: coordinate scope split or set both claims as shared=true for intentional pair-editing",
    ]);
  }
}

if (softAck) {
  const ageLimitHours = Number.isFinite(softAckHours) && softAckHours > 0 ? softAckHours : 24;
  const ageLimitMs = ageLimitHours * 60 * 60 * 1000;
  const latestAck = latestAckFor(owner);
  if (!latestAck) {
    console.warn(`coop-check: WARN - no coop read ack found for owner "${owner}"`);
    console.warn("  soft-guard only: push is allowed");
    console.warn("  fix: run `npm run coop:latest` then `npm run coop:ack -- --agent " + owner + "`");
  } else {
    const ackMs = Date.parse(String(latestAck.timestamp || ""));
    if (!Number.isFinite(ackMs)) {
      console.warn(`coop-check: WARN - invalid ack timestamp for owner "${owner}"`);
      console.warn("  soft-guard only: push is allowed");
    } else {
      const ageMs = Date.now() - ackMs;
      if (ageMs > ageLimitMs) {
        const ageHours = +(ageMs / (60 * 60 * 1000)).toFixed(1);
        console.warn(`coop-check: WARN - latest ack for "${owner}" is stale (${ageHours}h > ${ageLimitHours}h)`);
        console.warn("  soft-guard only: push is allowed");
        console.warn("  fix: run `npm run coop:latest` then `npm run coop:ack -- --agent " + owner + "`");
      }
    }
  }
}

pass("coop updates and claim coverage present for substantive changes", [
  `mode=${mode}`,
  `range=${range}`,
  `substantive_count=${substantive.length}`,
  `declared_in_latest_handoff=${declared.length}`,
]);
