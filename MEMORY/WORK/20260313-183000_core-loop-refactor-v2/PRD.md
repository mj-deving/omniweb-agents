---
task: Core loop refactor 8→3 phases v2
slug: 20260313-183000_core-loop-refactor-v2
effort: advanced
phase: verify
progress: 28/28
mode: interactive
started: 2026-03-13T18:30:00Z
updated: 2026-03-13T18:45:00Z
---

## Context

Phase 2 of unified loop architecture v2. The 8-phase monolith becomes a 3-phase core (SENSE→ACT→CONFIRM) with opt-in extensions. Feature flag `--loop-version 1|2` preserves backward compat. Shadow mode suppresses publishing for safe testing. All v1 code untouched.

### Risks
- State accessor layer must cover all 15 `state.phases.X` access points in session-runner.ts
- Resume guard must prevent cross-version state corruption
- V2 loop must reuse existing phase handler functions without modification

## Criteria

- [x] ISC-1: CorePhase type exported from state.ts with 3 values
- [x] ISC-2: LoopVersion type exported as 1 | 2
- [x] ISC-3: CORE_PHASE_ORDER constant exported as ["sense","act","confirm"]
- [x] ISC-4: KNOWN_EXTENSIONS constant exported
- [x] ISC-5: SubstageStatus type with 5 values (pending/running/completed/failed/skipped)
- [x] ISC-6: ActSubstageState interface with substage/status/timing/failureCode fields
- [x] ISC-7: V2SessionState interface with loopVersion:2 discriminant
- [x] ISC-8: AnySessionState union type exported
- [x] ISC-9: isV2 type guard function exported
- [x] ISC-10: normalizeState handles v2 state (CORE_PHASE_ORDER keys)
- [x] ISC-11: getNextPhase handles v2 state
- [x] ISC-12: startSession accepts loopVersion param, creates correct shape
- [x] ISC-13: getPhaseOrder returns correct order based on state version
- [x] ISC-14: loadState reads loopVersion field to determine type
- [x] ISC-15: Resume guard blocks cross-version resume with explicit error
- [x] ISC-16: loopExtensions field added to AgentConfig interface
- [x] ISC-17: Extension allowlist validation with warning for unknown extensions
- [x] ISC-18: --loop-version flag parsed (default 1)
- [x] ISC-19: --shadow flag requires --loop-version 2
- [x] ISC-20: V2 main loop function runs SENSE→ACT→CONFIRM
- [x] ISC-21: ACT substage failure semantics (engage fail→continue, gate fail→skip publish)
- [x] ISC-22: Shadow mode hard-skips publish substage
- [x] ISC-23: observe() called inline unconditionally in v2
- [x] ISC-24: V2 session report uses SENSE/ACT/CONFIRM headings
- [x] ISC-25: Sentinel persona.yaml has loop.extensions section
- [x] ISC-26: Pioneer persona.yaml has loop.extensions section
- [x] ISC-27: Crawler persona.yaml has loop.extensions section
- [x] ISC-28: TypeScript compiles without errors (npx tsc --noEmit)

## Decisions

- V2 gate handlers reuse v1 gate functions via `state as any` cast — v2 ACT substage captures result from `state.phases.gate` after handler returns
- `beginPhase`/`completePhase`/`failPhase` accept `AnySessionState` with `(state.phases as any)` for union phase keys
- V1 loop extracted into explicit `v1State = state as SessionState` block for type safety
- `observe()` called at every v2 phase transition and substage event unconditionally

## Verification

- V1 regression: `--dry-run` shows 8-phase output identical to pre-change
- V2 dry-run: `--loop-version 2 --dry-run` shows SENSE/ACT(substages)/CONFIRM
- V2 shadow: `--shadow --dry-run` shows publish SKIPPED
- Error: `--shadow` without `--loop-version 2` → CLI error
- Error: `--loop-version 3` → CLI error
- Unknown extension: "foo" in persona.yaml → warning on load
- `npx tsc --noEmit` passes clean
