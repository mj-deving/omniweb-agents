---
task: Unified loop architecture plan with decomposed concerns
slug: 20260313-loop-architecture-v2
effort: extended
phase: verify
progress: 18/18
mode: interactive
started: 2026-03-13T14:00:00Z
updated: 2026-03-13T14:15:00Z
---

## Context

Marius identified that the current 8-phase hardcoded loop (AUDIT→SCAN→ENGAGE→GATE→PUBLISH→VERIFY→REVIEW→HARDEN) is overfit. Source registry is tangled into the core loop. Review/harden run every session but often no-op. The original 4-phase base-loop.yaml is conceptually right but never actually parsed by runtime code.

Goal: Create a unified plan that decomposes concerns into a lean core loop + standalone skills, with existing subplans referenced rather than duplicated.

### Risks
- Breaking existing autonomous session workflow during refactor
- Review/harden findings mechanism used by improvements.ts tracker — must preserve or migrate
- Source registry deeply coupled to publish pipeline and gate pre-check
- Three agents with different needs — decomposition must be flexible enough for all

## Criteria

- [x] ISC-1: Plan defines lean core loop with 4 or fewer mandatory phases
- [x] ISC-2: Plan defines which phases are core vs. optional extensions
- [x] ISC-3: Source registry concern fully extracted from core loop into skill boundary
- [x] ISC-4: Source skill API surface defined (preflight, match, discover, test)
- [x] ISC-5: Review/harden replaced by observation log + on-demand improve skill
- [x] ISC-6: Observation log format defined (what gets written, where, when)
- [x] ISC-7: On-demand improve skill interface defined (read log, classify, propose, implement)
- [x] ISC-8: base-loop.yaml disposition decided (delete)
- [x] ISC-9: Per-agent extension config format defined (loop.extensions in strategy.yaml)
- [x] ISC-10: Migration path from current 8-phase to new architecture defined
- [x] ISC-11: state.ts PHASE_ORDER refactoring approach defined
- [x] ISC-12: Existing subplans (loop-v2, source-registry-v2) mapped to unified plan phases
- [x] ISC-13: Loop-v2 items assigned to correct concern (core loop vs. source skill)
- [x] ISC-14: Codex review findings from source-registry-v2 addressed in plan
- [x] ISC-15: Implementation order defined with dependencies
- [x] ISC-16: Plan references subplans by path, not duplicating content
- [x] ISC-17: Improvements.ts tracker interaction with new observe/improve model defined
- [x] ISC-18: Plan written to Plans/ directory as working reference

## Decisions

1. **3-phase core** (SENSE → ACT → CONFIRM) over 4-phase (adding LEARN) because learning is not a per-session activity — it's an on-demand concern
2. **observe() is a lightweight inline function**, not a phase — it appends JSONL during any phase when something noteworthy happens
3. **improve is a standalone CLI tool**, not a loop phase — invoked when the operator wants to batch-process observations
4. **base-loop.yaml deleted** — the right abstraction but never implemented; superseded by the new 3-phase core
5. **Feature flag migration** — `--loop-version 1|2` allows gradual rollout without breaking autonomous sessions
6. **Source registry keeps its own plan** — unified plan references it, doesn't duplicate it
7. **Phase 0 (observe) ships first** — zero risk, enables all subsequent work

## Verification

All 18 criteria verified present in `Plans/unified-loop-architecture-v2.md`:
- ISC-1/2: 3-phase core (SENSE/ACT/CONFIRM) + 4 extensions (calibrate/sources/observe/improve)
- ISC-3/4: Sources extracted with API: preflight(), match(), discover(), test()
- ISC-5/6/7: Observation log JSONL format + improve CLI defined
- ISC-8: base-loop.yaml → delete
- ISC-9: strategy.yaml `loop.extensions` format
- ISC-10/11: Feature flag migration, new CorePhase type
- ISC-12/13: Subplan items mapped in tables
- ISC-14: All 13 Codex findings addressed
- ISC-15: 9-phase dependency graph with session estimates
- ISC-16: References Plans/ paths
- ISC-17: observe writes, improve reads, improvements.ts tracker preserved
- ISC-18: Written to Plans/unified-loop-architecture-v2.md
