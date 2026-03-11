/**
 * Review findings persistence — stores structured Q1-Q4 review data
 * across sessions for the AUDIT → REVIEW feedback loop.
 *
 * Storage: ~/.{agent}-review-findings.json (FIFO, last 5 sessions)
 */

import { readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";

// ── Constants ──────────────────────────────────────

const DEFAULT_FINDINGS_PATH = resolve(homedir(), ".sentinel-review-findings.json");
const MAX_SESSIONS = 5;

// ── Types ──────────────────────────────────────────

export type Q1FailureType = "score_miss" | "gate_fail" | "publish_error" | "attest_error";
export type Q4StaleType = "unaudited" | "calibration_drift" | "assumption_conflict";

export interface ReviewFindings {
  sessionNumber: number;
  timestamp: string;
  q1_failures: Array<{
    txHash?: string;        // optional — gate/attest failures have no txHash
    category?: string;      // optional — gate failures have no category
    reason: string;
    type?: Q1FailureType;   // classification for HARDEN
  }>;
  q2_suggestions: string[];
  q3_insights: Array<{
    txHash: string;
    category: string;
    delta: number;
  }>;
  q4_stale: Array<{
    txHash?: string;        // optional — calibration/assumption items have no txHash
    description: string;
    type?: Q4StaleType;     // classification for HARDEN
  }>;
}

interface FindingsFile {
  version: number;
  sessions: ReviewFindings[];
}

// ── I/O ────────────────────────────────────────────

function loadFile(findingsPath: string = DEFAULT_FINDINGS_PATH): FindingsFile {
  if (!existsSync(findingsPath)) {
    return { version: 1, sessions: [] };
  }
  try {
    const data = JSON.parse(readFileSync(findingsPath, "utf-8"));
    if (!data.version || !Array.isArray(data.sessions)) {
      return { version: 1, sessions: [] };
    }
    return data;
  } catch {
    return { version: 1, sessions: [] };
  }
}

function saveFile(data: FindingsFile, findingsPath: string = DEFAULT_FINDINGS_PATH): void {
  const tmpPath = findingsPath + ".tmp";
  writeFileSync(tmpPath, JSON.stringify(data, null, 2) + "\n");
  renameSync(tmpPath, findingsPath);
}

// ── Public API ─────────────────────────────────────

/**
 * Save review findings for a completed session.
 * Maintains FIFO of last MAX_SESSIONS sessions.
 */
export function saveReviewFindings(findings: ReviewFindings, findingsPath: string = DEFAULT_FINDINGS_PATH): void {
  const data = loadFile(findingsPath);

  // Remove existing entry for this session number (idempotent)
  data.sessions = data.sessions.filter(
    (s) => s.sessionNumber !== findings.sessionNumber
  );

  // Append new findings
  data.sessions.push(findings);

  // FIFO: keep only last MAX_SESSIONS
  if (data.sessions.length > MAX_SESSIONS) {
    data.sessions = data.sessions.slice(-MAX_SESSIONS);
  }

  saveFile(data, findingsPath);
}

/**
 * Load the most recent review findings (from the previous session).
 * Returns null if no findings exist.
 */
export function loadLatestFindings(findingsPath: string = DEFAULT_FINDINGS_PATH): ReviewFindings | null {
  const data = loadFile(findingsPath);
  if (data.sessions.length === 0) return null;
  return data.sessions[data.sessions.length - 1];
}

/**
 * Load all stored review findings (up to MAX_SESSIONS).
 */
export function loadAllFindings(findingsPath: string = DEFAULT_FINDINGS_PATH): ReviewFindings[] {
  return loadFile(findingsPath).sessions;
}
