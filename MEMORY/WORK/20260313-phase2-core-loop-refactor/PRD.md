---
task: Phase 2 core loop refactor 8→3 phases
slug: 20260313-phase2-core-loop-refactor
effort: advanced
phase: plan
progress: 0/30
mode: interactive
started: 2026-03-13T18:30:00Z
updated: 2026-03-13T18:32:00Z
---

## Context

Phase 2 of the unified loop architecture v2 plan (`Plans/unified-loop-architecture-v2.md`). Replaces the 8-phase monolith (AUDIT→SCAN→ENGAGE→GATE→PUBLISH→VERIFY→REVIEW→HARDEN) with a 3-phase core (SENSE→ACT→CONFIRM) plus opt-in extensions (calibrate, sources, observe).

Dependencies satisfied: Phase 0A (preflight), Phase 0B (observe.ts + budgets), Phase 1 (improve skill) all done. REVIEW/HARDEN removal is safe because observe() is inline and improve is on-demand.

Feature flag `--loop-version 1|2` preserves backward compatibility. Shadow mode `--shadow` runs v2 without publishing.

### Risks
- Highest risk phase — breaks autonomous sessions if v1 path regresses
- State model change could corrupt resume capability — mitigated by `loopVersion` field in state file
- Strategy.yaml format change must be backward-compatible during transition — parser handles both
- Session report format differs between v1 and v2
- extractTopicsFromScan reads state.phases.scan.result — must map correctly for v2 (state.phases.sense.result)
- Phase budget system keyed on PhaseName — needs v2 keys added

## Criteria

### State Layer (state.ts)
- [ ] ISC-1: CorePhase type exported: "sense" | "act" | "confirm"
- [ ] ISC-2: V2SessionState interface uses Record<CorePhase, PhaseState>
- [ ] ISC-3: V1 PhaseName type and PHASE_ORDER preserved unchanged
- [ ] ISC-4: getNextPhase works for v2 state (iterates SENSE→ACT→CONFIRM)
- [ ] ISC-5: normalizeState handles v2 phase model
- [ ] ISC-6: startSession accepts loopVersion parameter, creates correct phase model
- [ ] ISC-7: V2 phase budgets defined (sense, act, confirm)

### Session Runner — Feature Flag
- [ ] ISC-8: --loop-version flag parsed (values: 1, 2; default: 1)
- [ ] ISC-9: --shadow flag parsed (only valid with --loop-version 2)
- [ ] ISC-10: Help text documents --loop-version and --shadow flags
- [ ] ISC-11: V1 code path unchanged — all existing behavior preserved

### Session Runner — V2 Loop
- [ ] ISC-12: V2 main loop iterates SENSE → ACT → CONFIRM (3 phases)
- [ ] ISC-13: SENSE phase executes scan logic (reuses runScan)
- [ ] ISC-14: ACT phase executes engage substage with SubstageResult
- [ ] ISC-15: ACT phase executes gate substage with SubstageResult
- [ ] ISC-16: ACT phase executes publish substage with SubstageResult
- [ ] ISC-17: Shadow mode suppresses publish substage (skipped status)
- [ ] ISC-18: CONFIRM phase executes verify logic (reuses runVerify)

### Extensions
- [ ] ISC-19: Extension interface defined (name, hookPoint, execute)
- [ ] ISC-20: calibrate extension wraps existing AUDIT logic
- [ ] ISC-21: calibrate runs before SENSE when declared in config
- [ ] ISC-22: Extensions loaded from agent config loop.extensions field

### Strategy Files
- [ ] ISC-23: sentinel strategy.yaml has loop.extensions section
- [ ] ISC-24: crawler strategy.yaml has loop.extensions section
- [ ] ISC-25: pioneer strategy.yaml has loop.extensions section
- [ ] ISC-26: extends: field removed from all 3 strategy files
- [ ] ISC-27: basePhase: field removed from all 3 strategy files

### Cleanup
- [ ] ISC-28: strategies/base-loop.yaml deleted
- [ ] ISC-29: V2 session report uses 3-phase format (SENSE/ACT/CONFIRM)
- [ ] ISC-30: dry-run output shows v2 phases when --loop-version 2

### Anti-Criteria
- [ ] ISC-A1: V1 autonomous sessions produce identical behavior to current code
- [ ] ISC-A2: No on-chain publish occurs in shadow mode

## Decisions

## Verification
