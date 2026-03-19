/**
 * Capped ownTxHashes management — prevents unbounded memory growth
 * in long-lived event-runner processes.
 *
 * - addCapped: maintains a max-size Set (FIFO eviction)
 * - loadOwnTxHashes: loads last N hashes from session log
 * - pruneSessionLog: truncates JSONL log to last N lines
 */

import { resolve } from "node:path";
import { homedir } from "node:os";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const DEFAULT_MAX_HASHES = 500;
const DEFAULT_MAX_LOG_LINES = 1000;

/**
 * Add a value to a Set, evicting the oldest entry if size exceeds maxSize.
 * Sets in JS preserve insertion order, so first element is oldest.
 */
export function addCapped(set: Set<string>, value: string, maxSize: number = DEFAULT_MAX_HASHES): void {
  set.add(value);
  if (set.size > maxSize) {
    // Delete the first (oldest) entry
    const oldest = set.values().next().value;
    if (oldest !== undefined) set.delete(oldest);
  }
}

/**
 * Load TX hashes from the session log. Only loads the last `maxEntries` lines
 * to prevent unbounded memory usage.
 */
export function loadOwnTxHashes(agentName: string, maxEntries: number = DEFAULT_MAX_HASHES): Set<string> {
  const logPath = sessionLogPath(agentName);
  const hashes = new Set<string>();
  if (!existsSync(logPath)) return hashes;

  try {
    const lines = readFileSync(logPath, "utf-8").split("\n").filter((l) => l.trim() !== "");
    // Only process the last maxEntries lines (tail behavior)
    const startIdx = Math.max(0, lines.length - maxEntries);
    for (let i = startIdx; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      try {
        const entry = JSON.parse(trimmed);
        if (entry.txHash && typeof entry.txHash === "string") {
          hashes.add(entry.txHash);
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // Log file unreadable — return empty set
  }
  return hashes;
}

/**
 * Prune session log to the last `maxLines` entries.
 * Prevents the JSONL file from growing without bound.
 */
export function pruneSessionLog(agentName: string, maxLines: number = DEFAULT_MAX_LOG_LINES): number {
  const logPath = sessionLogPath(agentName);
  if (!existsSync(logPath)) return 0;

  try {
    const content = readFileSync(logPath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim() !== "");
    if (lines.length <= maxLines) return 0;

    const pruned = lines.length - maxLines;
    const kept = lines.slice(-maxLines);
    writeFileSync(logPath, kept.join("\n") + "\n", "utf-8");
    return pruned;
  } catch {
    return 0;
  }
}

/** Resolve the session log path for an agent. */
export function sessionLogPath(agentName: string): string {
  return resolve(homedir(), `.${agentName}-session-log.jsonl`);
}
