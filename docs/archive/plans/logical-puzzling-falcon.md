# Plan: Session Report — Auto-write + CLI Viewer

## Context

Session-runner completes and clears state, leaving no persistent human-readable record. Console output is transient. The session log only tracks posts, not phase results (scan, engage, gate). Need a way to audit what happened in any session after the fact.

## What Gets Built

### 1. Auto-write report on session completion (`session-runner.ts`)

Add `writeSessionReport(state, flags)` call before `clearState()` in session-runner.ts. Writes markdown to:

```
~/.sentinel/sessions/session-{N}-report.md   (N = state.sessionNumber)
```

Path resolved via `resolve(homedir(), ".sentinel", "sessions", ...)` — same pattern as existing `state.ts`. Directory created with `mkdirSync({ recursive: true })` if missing.

All data is already in `state.phases[*].result` at completion time — no new data fetching needed. Just format and write.

**Report write is non-fatal** — wrapped in try/catch with `info()` warning. Never blocks `clearState()`.

**Report format:**

```markdown
# Sentinel Session 7 — 2026-03-09

**Duration:** 12.3 min | **Posts:** 2 | **Reactions:** 5 (4 agree, 1 disagree)

## 1. AUDIT (0.8 min)
- 13 entries audited
- Avg prediction error: +4.4
- Scores: 80x1, 90x6, 100x4

## 2. SCAN (0.3 min)
- HIGH activity (8.3 posts/hr)
- Hot topic: perp-signals (12 reactions)
- 10 gap topics: ap-wire, CAD, action, ai-agents...

## 3. ENGAGE (0.5 min)
- 5 reactions: 4 agree, 1 disagree
- Targets: [list with author + topic]

## 4. GATE
- 2 posts gated
- Post 1: oil-supply (ANALYSIS, confidence 78) — 5/6 checks passed
- Post 2: btc-prediction (PREDICTION, confidence 65) — 6/6 checks passed

## 5. PUBLISH
- abc123... (ANALYSIS, predicted: 8 reactions)
- def456... (PREDICTION, predicted: 5 reactions)

## 6. VERIFY
- 2/2 verified in feed

## 7. REVIEW
- No improvements proposed
```

Each phase section gracefully handles missing/skipped data — if `result` is null or phase was skipped, renders "Skipped" instead of crashing.

**Implementation:** Single function `writeSessionReport(state: SessionState, flags: RunnerFlags)` added to session-runner.ts (~60 lines). Extracts data from each `state.phases[phase].result`, formats markdown lines, writes with `writeFileSync`.

**Files modified:** `tools/session-runner.ts` only

### 2. CLI viewer tool (`tools/session-report.ts`)

Standalone tool to list and display saved reports.

```bash
# List all session reports
npx tsx tools/session-report.ts --list

# Display specific session report
npx tsx tools/session-report.ts 7

# Display latest report
npx tsx tools/session-report.ts --latest
```

`--list` shows a table: session number, date, post count, duration (parsed from report header line).
`N` and `--latest` print the markdown file contents directly.
No reports found → prints message and exits 0 (not an error).

**Implementation:** ~80 lines. Reads `~/.sentinel/sessions/session-*-report.md` via `readdirSync` + filter. Path resolved via `homedir()`. No dependencies beyond Node builtins.

**Files created:** `tools/session-report.ts`

## Files

| File | Action | Lines |
|------|--------|-------|
| `tools/session-runner.ts` | Edit — add `writeSessionReport()` + call before `clearState()` | ~60 added |
| `tools/session-report.ts` | Create — CLI viewer | ~80 new |

## Codex Review (resolved)

| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| 1 | HIGH | Hardcoded session-7 in examples | Examples only — implementation uses `session-${state.sessionNumber}`. |
| 2 | MED | `~` won't expand in Node.js | Use `homedir()` + `resolve()` — same pattern as state.ts. |
| 3 | MED | Missing failure modes | Non-fatal write (try/catch), mkdir recursive, graceful missing-phase rendering, `--latest` with no reports → message + exit 0. |

## Verification

1. Manually construct a mock `SessionState` with mixed completed/skipped phases → call `writeSessionReport()` → confirm no crash and readable output
2. Run session-runner through a quick session → check `~/.sentinel/sessions/session-N-report.md` exists and is well-formatted
3. `npx tsx tools/session-report.ts --list` — shows the session
4. `npx tsx tools/session-report.ts N` — prints the report
5. `npx tsx tools/session-report.ts --latest` — same result
6. `npx tsx tools/session-report.ts --list` with no reports → prints "No session reports found" and exits 0
