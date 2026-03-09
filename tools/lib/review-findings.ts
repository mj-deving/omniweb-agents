/**
 * Review findings persistence — stores structured Q1-Q4 review data
 * across sessions for the AUDIT → REVIEW feedback loop.
 *
 * Storage: ~/.sentinel-review-findings.json (FIFO, last 5 sessions)
 */

import { readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";

// ── Constants ──────────────────────────────────────

const FINDINGS_PATH = resolve(homedir(), ".sentinel-review-findings.json");
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

function loadFile(): FindingsFile {
  if (!existsSync(FINDINGS_PATH)) {
    return { version: 1, sessions: [] };
  }
  try {
    const data = JSON.parse(readFileSync(FINDINGS_PATH, "utf-8"));
    if (!data.version || !Array.isArray(data.sessions)) {
      return { version: 1, sessions: [] };
    }
    return data;
  } catch {
    return { version: 1, sessions: [] };
  }
}

function saveFile(data: FindingsFile): void {
  const tmpPath = FINDINGS_PATH + ".tmp";
  writeFileSync(tmpPath, JSON.stringify(data, null, 2) + "\n");
  renameSync(tmpPath, FINDINGS_PATH);
}

// ── Public API ─────────────────────────────────────

/**
 * Save review findings for a completed session.
 * Maintains FIFO of last MAX_SESSIONS sessions.
 */
export function saveReviewFindings(findings: ReviewFindings): void {
  const data = loadFile();

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

  saveFile(data);
}

/**
 * Load the most recent review findings (from the previous session).
 * Returns null if no findings exist.
 */
export function loadLatestFindings(): ReviewFindings | null {
  const data = loadFile();
  if (data.sessions.length === 0) return null;
  return data.sessions[data.sessions.length - 1];
}

/**
 * Load all stored review findings (up to MAX_SESSIONS).
 */
export function loadAllFindings(): ReviewFindings[] {
  return loadFile().sessions;
}
