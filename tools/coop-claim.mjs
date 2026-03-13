#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const CLAIMS_PATH = path.join(root, "claude-codex-coop", "CLAIMS.json");
const MAX_TTL_MINUTES = 60 * 24 * 14; // 14 days

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

function fail(msg) {
  console.error(`coop-claim: FAIL - ${msg}`);
  process.exit(1);
}

function pass(msg, extra = []) {
  console.log(`coop-claim: PASS - ${msg}`);
  for (const line of extra) console.log(`  ${line}`);
}

function loadClaims() {
  if (!fs.existsSync(CLAIMS_PATH)) {
    return { version: 1, claims: [] };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(CLAIMS_PATH, "utf8"));
    return {
      version: Number(parsed.version || 1),
      claims: Array.isArray(parsed.claims) ? parsed.claims : [],
    };
  } catch (e) {
    fail(`unable to parse ${path.relative(root, CLAIMS_PATH)} (${e.message})`);
  }
}

function saveClaims(data) {
  fs.mkdirSync(path.dirname(CLAIMS_PATH), { recursive: true });
  fs.writeFileSync(CLAIMS_PATH, JSON.stringify(data, null, 2) + "\n");
}

function cleanPathToken(input) {
  return String(input || "").trim().replace(/^\.?\//, "").replace(/,$/, "");
}

function parseFiles(input) {
  return String(input || "")
    .split(",")
    .map(cleanPathToken)
    .filter(Boolean);
}

function escapeRegex(input) {
  return input.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function patternToRegex(pattern) {
  const normalized = cleanPathToken(pattern);
  const source = "^" + escapeRegex(normalized).replace(/\*/g, ".*") + "$";
  return new RegExp(source);
}

function patternMatchesFile(pattern, file) {
  const normalizedPattern = cleanPathToken(pattern);
  const normalizedFile = cleanPathToken(file);
  if (!normalizedPattern || !normalizedFile) return false;

  if (normalizedPattern.endsWith("/")) {
    return normalizedFile.startsWith(normalizedPattern);
  }
  if (normalizedPattern.includes("*")) {
    return patternToRegex(normalizedPattern).test(normalizedFile);
  }
  const abs = path.join(root, normalizedPattern);
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
    return normalizedFile === normalizedPattern || normalizedFile.startsWith(`${normalizedPattern}/`);
  }
  return normalizedFile === normalizedPattern;
}

function patternsOverlap(a, b) {
  const pa = cleanPathToken(a);
  const pb = cleanPathToken(b);
  if (!pa || !pb) return false;
  if (patternMatchesFile(pa, pb)) return true;
  if (patternMatchesFile(pb, pa)) return true;
  if (!pa.includes("*") && !pb.includes("*")) {
    return pa.startsWith(`${pb}/`) || pb.startsWith(`${pa}/`);
  }
  return false;
}

function isActive(claim, nowMs) {
  const exp = Date.parse(String(claim.expiresAt || ""));
  return Number.isFinite(exp) && exp > nowMs;
}

const args = parseArgs(process.argv);
const nowMs = Date.now();
const nowIso = new Date(nowMs).toISOString();
const release = args.release === "true";
const list = args.list === "true";
const agent = (args.agent || "").trim().toLowerCase();
const lane = (args.lane || "default").trim();
const task = (args.task || "").trim();
const shared = args.shared === "true";
const rawTtl = Number(args["ttl-minutes"] || 240);
const ttlMinutes = Number.isFinite(rawTtl)
  ? Math.max(1, Math.min(MAX_TTL_MINUTES, Math.floor(rawTtl)))
  : 240;
const expiresAt = new Date(nowMs + ttlMinutes * 60_000).toISOString();
const files = parseFiles(args.files || "");

if (!release && !list) {
  if (!agent) fail("missing required --agent");
  if (!task) fail("missing required --task");
  if (files.length === 0) fail("missing required --files");
}

const data = loadClaims();
const activeClaims = data.claims.filter((c) => isActive(c, nowMs));

if (list) {
  if (activeClaims.length === 0) {
    pass("no active claims");
    process.exit(0);
  }
  pass("active claims", activeClaims.map((c) => `${c.agent}:${c.lane} files=${c.files.join(",")} exp=${c.expiresAt}`));
  process.exit(0);
}

let claims = activeClaims;

if (release) {
  if (!agent) fail("missing required --agent for --release");
  const before = claims.length;
  claims = claims.filter((c) => !(c.agent === agent && (args.lane ? c.lane === lane : true)));
  saveClaims({ version: 1, claims });
  pass("claim(s) released", [`agent=${agent}`, `released=${before - claims.length}`]);
  process.exit(0);
}

const conflicts = [];
for (const claim of claims) {
  if (claim.agent === agent) continue;
  for (const mine of files) {
    for (const theirs of (claim.files || [])) {
      if (patternsOverlap(mine, theirs)) {
        if (claim.shared === true || shared === true) continue;
        conflicts.push({ agent: claim.agent, lane: claim.lane, mine, theirs, expiresAt: claim.expiresAt });
      }
    }
  }
}

if (conflicts.length > 0) {
  const lines = conflicts.map((c) => `${c.mine} overlaps ${c.agent}:${c.lane} (${c.theirs}, exp ${c.expiresAt})`);
  fail(`conflicting claim(s) found\n  ${lines.join("\n  ")}\n  use --shared true only when intentionally collaborating on the same files`);
}

claims = claims.filter((c) => !(c.agent === agent && c.lane === lane));
claims.push({
  agent,
  lane,
  task,
  files,
  shared,
  updatedAt: nowIso,
  expiresAt,
});

saveClaims({ version: 1, claims });
pass("claim upserted", [
  `agent=${agent}`,
  `lane=${lane}`,
  `shared=${shared}`,
  `files=${files.join(",")}`,
  `expiresAt=${expiresAt}`,
]);
