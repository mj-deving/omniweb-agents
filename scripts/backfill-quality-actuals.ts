#!/usr/bin/env npx tsx
/**
 * Backfill quality data entries with actual_reactions from session logs.
 *
 * Two matching strategies:
 *   1. txHash join — exact match when quality entry has txHash
 *   2. Fuzzy timestamp — within 60s window + matching topic (for old entries without txHash)
 *
 * Usage:
 *   npx tsx scripts/backfill-quality-actuals.ts --agent sentinel --pretty
 *   npx tsx scripts/backfill-quality-actuals.ts --agent sentinel --dry-run
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// ── Types (exported for testing) ────────────────────

export interface QualityEntry {
  timestamp: string;
  agent: string;
  topic: string;
  category: string;
  quality_score: number;
  quality_max: number;
  quality_breakdown: Record<string, number>;
  predicted_reactions: number;
  confidence: number;
  text_length: number;
  isReply: boolean;
  hasAttestation: boolean;
  txHash?: string;
  actual_reactions?: number;
}

export interface SessionLogEntry {
  timestamp: string;
  txHash: string;
  category: string;
  topic: string;
  actual_reactions?: number;
  [key: string]: unknown;
}

// ── Matching Logic ──────────────────────────────────

const FUZZY_WINDOW_MS = 60_000; // 60 seconds

/**
 * Match quality entries to session logs by exact txHash.
 * Returns entries with actual_reactions populated where matched.
 */
export function matchByTxHash(
  qualityEntries: QualityEntry[],
  sessionLogs: SessionLogEntry[]
): QualityEntry[] {
  const logByTx = new Map<string, SessionLogEntry>();
  for (const log of sessionLogs) {
    if (log.txHash && log.actual_reactions !== undefined) {
      logByTx.set(log.txHash, log);
    }
  }

  return qualityEntries.map((entry) => {
    if (!entry.txHash) return entry;
    const match = logByTx.get(entry.txHash);
    if (match) {
      return { ...entry, actual_reactions: match.actual_reactions };
    }
    return entry;
  });
}

/**
 * Fuzzy match quality entries WITHOUT txHash to session logs by timestamp + topic.
 * Window: 60 seconds. Returns entries with actual_reactions and txHash populated where matched.
 */
export function fuzzyMatchByTimestamp(
  qualityEntries: QualityEntry[],
  sessionLogs: SessionLogEntry[]
): QualityEntry[] {
  return qualityEntries.map((entry) => {
    // Only fuzzy-match entries that don't already have txHash or actual_reactions
    if (entry.txHash || entry.actual_reactions !== undefined) return entry;

    const entryTime = new Date(entry.timestamp).getTime();

    const match = sessionLogs.find((log) => {
      if (!log.actual_reactions && log.actual_reactions !== 0) return false;
      const logTime = new Date(log.timestamp).getTime();
      const timeDiff = Math.abs(logTime - entryTime);
      return timeDiff <= FUZZY_WINDOW_MS && log.topic === entry.topic;
    });

    if (match) {
      return { ...entry, actual_reactions: match.actual_reactions, txHash: match.txHash };
    }
    return entry;
  });
}

// ── File I/O ────────────────────────────────────────

function readJsonl<T>(filePath: string): T[] {
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, "utf-8").trim();
  if (!content) return [];
  return content.split("\n").map((line) => JSON.parse(line));
}

function writeJsonl<T>(filePath: string, entries: T[]): void {
  const content = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
  writeFileSync(filePath, content, { mode: 0o600 });
}

// ── CLI ─────────────────────────────────────────────

function parseArgs(): { agent: string; pretty: boolean; dryRun: boolean } {
  const args = process.argv.slice(2);
  let agent = "sentinel";
  let pretty = false;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--agent" && args[i + 1]) {
      agent = args[++i];
    } else if (args[i] === "--pretty") {
      pretty = true;
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    }
  }

  return { agent, pretty, dryRun };
}

async function main(): Promise<void> {
  const { agent, pretty, dryRun } = parseArgs();
  const configDir = join(homedir(), ".config", "demos");

  const qualityPath = join(configDir, `quality-data-${agent}.jsonl`);
  const sessionLogPath = join(configDir, `${agent}-session-log.jsonl`);

  if (!existsSync(qualityPath)) {
    console.error(`No quality data file found: ${qualityPath}`);
    process.exit(1);
  }

  const qualityEntries = readJsonl<QualityEntry>(qualityPath);
  const sessionLogs = readJsonl<SessionLogEntry>(sessionLogPath);

  const beforeCount = qualityEntries.filter((e) => e.actual_reactions !== undefined).length;

  // Pass 1: txHash join
  let updated = matchByTxHash(qualityEntries, sessionLogs);

  // Pass 2: fuzzy timestamp match for entries without txHash
  updated = fuzzyMatchByTimestamp(updated, sessionLogs);

  const afterCount = updated.filter((e) => e.actual_reactions !== undefined).length;
  const newMatches = afterCount - beforeCount;

  if (pretty) {
    console.log(`\nBackfill: ${agent}`);
    console.log(`  Quality entries: ${qualityEntries.length}`);
    console.log(`  Session logs: ${sessionLogs.length}`);
    console.log(`  Already matched: ${beforeCount}`);
    console.log(`  New matches: ${newMatches}`);
    console.log(`  Total matched: ${afterCount}`);
    console.log(`  Unmatched: ${updated.length - afterCount}`);
  }

  if (!dryRun && newMatches > 0) {
    writeJsonl(qualityPath, updated);
    if (pretty) console.log(`  Written to: ${qualityPath}`);
  } else if (dryRun && pretty) {
    console.log(`  (dry-run — no changes written)`);
  } else if (newMatches === 0 && pretty) {
    console.log(`  (no new matches — file unchanged)`);
  }

  if (!pretty) {
    console.log(JSON.stringify({ agent, total: qualityEntries.length, newMatches, totalMatched: afterCount }, null, 2));
  }
}

// Only run CLI when executed directly (not imported by tests)
const isDirectExecution = process.argv[1]?.includes("backfill-quality-actuals");
if (isDirectExecution) {
  main().catch((e) => {
    console.error(`FATAL: ${e.message}`);
    process.exit(1);
  });
}
