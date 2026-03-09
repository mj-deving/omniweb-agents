/**
 * Session state manager for Sentinel session-runner.
 *
 * Persists session state between phases to enable --resume after interruption.
 * State files are namespaced under ~/.sentinel/sessions/ with PID-based lockfiles.
 *
 * State lifecycle:
 *   startSession() → completePhase() × N → clearState()
 *
 * Lock lifecycle:
 *   acquireLock() at session start → releaseLock() at clearState()
 *   Stale locks (>2h or dead PID) are automatically recovered.
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  unlinkSync,
  readdirSync,
  openSync,
  closeSync,
} from "node:fs";
import { constants as fsConstants } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";

// ── Constants ──────────────────────────────────────

const SESSIONS_DIR = resolve(homedir(), ".sentinel", "sessions");
const STALE_LOCK_MS = 2 * 60 * 60 * 1000; // 2 hours

// ── Types ──────────────────────────────────────────

export type PhaseName =
  | "audit"
  | "scan"
  | "engage"
  | "gate"
  | "publish"
  | "verify"
  | "review"
  | "harden";

export type PhaseStatus = "pending" | "in_progress" | "completed" | "failed";

export interface PhaseState {
  status: PhaseStatus;
  startedAt?: string;
  completedAt?: string;
  result?: any;
  error?: string;
}

export interface SessionState {
  sessionNumber: number;
  agentName: string;
  startedAt: string;
  pid: number;
  phases: Record<PhaseName, PhaseState>;
  /** txHashes from PUBLISH step */
  posts: string[];
  /** Engagement results from ENGAGE step */
  engagements: any[];
}

const PHASE_ORDER: PhaseName[] = [
  "audit",
  "scan",
  "engage",
  "gate",
  "publish",
  "verify",
  "review",
  "harden",
];

// ── Path Helpers ───────────────────────────────────

function stateFilePath(sessionNumber: number): string {
  return resolve(SESSIONS_DIR, `sentinel-${sessionNumber}.json`);
}

function lockFilePath(sessionNumber: number): string {
  return resolve(SESSIONS_DIR, `sentinel-${sessionNumber}.lock`);
}

// ── Lock Management ────────────────────────────────

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Acquire a session lock. Fails if another process holds it.
 * Recovers stale locks (dead PID or >2h old).
 * Uses O_CREAT|O_EXCL for atomic creation (fixes TOCTOU race — Codex finding #1).
 */
export function acquireLock(sessionNumber: number): void {
  ensureDir();
  const lockPath = lockFilePath(sessionNumber);
  const lockContent = JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() });

  // Try atomic create first (O_CREAT | O_EXCL | O_WRONLY)
  try {
    const fd = openSync(lockPath, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY);
    writeFileSync(fd, lockContent);
    closeSync(fd);
    return;
  } catch (e: any) {
    if (e.code !== "EEXIST") throw e;
    // Lock file exists — check if stale
  }

  // Lock exists — check staleness (Codex finding #5: protect parse)
  let lockData: { pid: number; createdAt: string };
  try {
    lockData = JSON.parse(readFileSync(lockPath, "utf-8"));
  } catch {
    // Corrupt lock file — treat as stale
    unlinkSync(lockPath);
    const fd = openSync(lockPath, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY);
    writeFileSync(fd, lockContent);
    closeSync(fd);
    return;
  }

  // Lock is held if PID is alive (regardless of age — Codex review MED-6).
  // Only use age for dead-PID recovery (process crashed, PID recycled).
  if (isPidAlive(lockData.pid)) {
    throw new Error(
      `Session ${sessionNumber} is locked by PID ${lockData.pid} (started ${lockData.createdAt}). ` +
        `Use --resume to continue, or kill PID ${lockData.pid} to release.`
    );
  }
  // Stale lock — remove and re-acquire
  unlinkSync(lockPath);
  const fd = openSync(lockPath, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY);
  writeFileSync(fd, lockContent);
  closeSync(fd);
}

/**
 * Release a session lock. Only removes if we own it (Codex finding #2).
 */
export function releaseLock(sessionNumber: number): void {
  const lockPath = lockFilePath(sessionNumber);
  if (!existsSync(lockPath)) return;
  try {
    const lockData = JSON.parse(readFileSync(lockPath, "utf-8"));
    if (lockData.pid !== process.pid) return; // Not our lock
  } catch {
    // Corrupt lock — safe to remove
  }
  unlinkSync(lockPath);
}

// ── State CRUD ─────────────────────────────────────

/**
 * Ensure sessions directory exists.
 */
function ensureDir(): void {
  if (!existsSync(SESSIONS_DIR)) {
    mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

/**
 * Normalize state to handle migrations (e.g., adding new phases).
 * Called by both loadState() and findActiveSession() to ensure
 * resumed sessions always have the full phase set.
 */
export function normalizeState(state: SessionState): SessionState {
  for (const phase of PHASE_ORDER) {
    if (!state.phases[phase]) {
      state.phases[phase] = { status: "pending" };
    }
  }
  if (!state.posts) state.posts = [];
  if (!state.engagements) state.engagements = [];
  return state;
}

/**
 * Load state for a specific session number. Returns null if not found.
 */
export function loadState(sessionNumber: number): SessionState | null {
  const path = stateFilePath(sessionNumber);
  if (!existsSync(path)) return null;
  try {
    const state = JSON.parse(readFileSync(path, "utf-8"));
    return normalizeState(state);
  } catch {
    return null;
  }
}

/**
 * Find the most recent active session (any session with a state file).
 * Returns null if no active sessions.
 */
export function findActiveSession(): SessionState | null {
  ensureDir();
  const files: string[] = readdirSync(SESSIONS_DIR);
  const sessionFiles = files
    .filter((f: string) => f.match(/^sentinel-\d+\.json$/))
    .sort((a, b) => {
      // Numeric sort by session number (Codex finding #4)
      const numA = parseInt(a.match(/sentinel-(\d+)\.json/)![1], 10);
      const numB = parseInt(b.match(/sentinel-(\d+)\.json/)![1], 10);
      return numB - numA; // descending
    });

  for (const file of sessionFiles) {
    const path = resolve(SESSIONS_DIR, file);
    try {
      const state = JSON.parse(readFileSync(path, "utf-8"));
      return normalizeState(state);
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Save session state to disk.
 */
export function saveState(state: SessionState): void {
  ensureDir();
  writeFileSync(stateFilePath(state.sessionNumber), JSON.stringify(state, null, 2));
}

/**
 * Create a fresh session state with all phases pending.
 */
export function startSession(
  sessionNumber: number,
  agentName: string = "sentinel"
): SessionState {
  ensureDir();
  acquireLock(sessionNumber);

  const phases: Record<PhaseName, PhaseState> = {} as any;
  for (const phase of PHASE_ORDER) {
    phases[phase] = { status: "pending" };
  }

  const state: SessionState = {
    sessionNumber,
    agentName,
    startedAt: new Date().toISOString(),
    pid: process.pid,
    phases,
    posts: [],
    engagements: [],
  };

  saveState(state);
  return state;
}

/**
 * Mark a phase as in_progress.
 */
export function beginPhase(state: SessionState, phase: PhaseName): SessionState {
  state.phases[phase] = {
    status: "in_progress",
    startedAt: new Date().toISOString(),
  };
  saveState(state);
  return state;
}

/**
 * Mark a phase as completed with optional result data.
 */
export function completePhase(
  state: SessionState,
  phase: PhaseName,
  result?: any
): SessionState {
  state.phases[phase] = {
    ...state.phases[phase],
    status: "completed",
    completedAt: new Date().toISOString(),
    result,
  };
  saveState(state);
  return state;
}

/**
 * Mark a phase as failed with error message.
 */
export function failPhase(
  state: SessionState,
  phase: PhaseName,
  error: string
): SessionState {
  state.phases[phase] = {
    ...state.phases[phase],
    status: "failed",
    completedAt: new Date().toISOString(),
    error,
  };
  saveState(state);
  return state;
}

/**
 * Get the next pending phase (first non-completed in order).
 * Returns null if all phases are completed.
 */
export function getNextPhase(state: SessionState): PhaseName | null {
  for (const phase of PHASE_ORDER) {
    const status = state.phases[phase].status;
    if (status === "pending" || status === "in_progress" || status === "failed") {
      return phase;
    }
  }
  return null;
}

/**
 * Get ordered list of all phases.
 */
export function getPhaseOrder(): PhaseName[] {
  return [...PHASE_ORDER];
}

/**
 * Clear session state and release lock. Called after successful HARDEN.
 */
export function clearState(sessionNumber: number): void {
  const statePath = stateFilePath(sessionNumber);
  if (existsSync(statePath)) unlinkSync(statePath);
  releaseLock(sessionNumber);
}
