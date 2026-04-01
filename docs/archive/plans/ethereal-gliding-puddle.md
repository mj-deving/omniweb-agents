# Phase 2: Core Loop Refactor 8→3 Phases — Implementation Plan

## Context

Phase 2 of unified loop architecture v2. The 8-phase monolith (AUDIT→SCAN→ENGAGE→GATE→PUBLISH→VERIFY→REVIEW→HARDEN) becomes a 3-phase core (SENSE→ACT→CONFIRM) with opt-in extensions. Feature flag `--loop-version 1|2` preserves backward compatibility. Shadow mode suppresses publishing for safe testing.

**Dependencies satisfied:** Phase 0A (preflight), Phase 0B (observe.ts), Phase 1 (improve skill) — all complete.

**Codex review:** 10 findings addressed below. Key decisions:
- Discriminated union for state types (not `Record<string>` + `as any`)
- Grep audit for all `state.phases.` access before merging
- Per-substage failure semantics + status model
- Extension allowlist validation with warning (not silent ignore)
- Explicit block on cross-version resume
- Strategy cleanup deferred to follow-up commit after burn-in
- `observe` is mandatory in v2 (not optional extension)

## Critical Files

| File | Change |
|------|--------|
| `tools/lib/state.ts` | Add v2 types with discriminated union |
| `tools/session-runner.ts` | Feature flag, v2 loop, extension hooks, v2 session report |
| `tools/lib/agent-config.ts` | Add `loopExtensions` to AgentConfig with allowlist validation |
| `agents/sentinel/persona.yaml` | Add `loop.extensions` section |
| `agents/crawler/persona.yaml` | Add `loop.extensions` section |
| `agents/pioneer/persona.yaml` | Add `loop.extensions` section |

**Deferred to follow-up (Codex #8):** strategy.yaml cleanup, base-loop.yaml deletion.

## Implementation Steps

### Step 1: state.ts — V2 Types (Discriminated Union)

Add alongside existing v1 types (v1 completely untouched):

```typescript
export type CorePhase = "sense" | "act" | "confirm";
export type LoopVersion = 1 | 2;
export const CORE_PHASE_ORDER: CorePhase[] = ["sense", "act", "confirm"];
export const KNOWN_EXTENSIONS = ["calibrate", "sources", "observe"] as const;

// Substage status for ACT phase (Codex #3)
export type SubstageStatus = "pending" | "running" | "completed" | "failed" | "skipped";
export interface ActSubstageState {
  substage: "engage" | "gate" | "publish";
  status: SubstageStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  failureCode?: string;
  result?: any;
}

// V2 state is a SEPARATE interface, not a widened v1 (Codex #1)
export interface V2SessionState {
  loopVersion: 2;
  sessionNumber: number;
  agentName: string;
  startedAt: string;
  pid: number;
  phases: Record<CorePhase, PhaseState>;
  substages: ActSubstageState[];  // ACT substage telemetry
  posts: string[];
  engagements: any[];
}

// Union type for all state
export type AnySessionState = SessionState | V2SessionState;

function isV2(state: AnySessionState): state is V2SessionState {
  return (state as any).loopVersion === 2;
}
```

Functions updated:
- `normalizeState()`: overloaded — v1 normalizes PHASE_ORDER keys, v2 normalizes CORE_PHASE_ORDER
- `getNextPhase()`: v2 iterates CORE_PHASE_ORDER
- `startSession()`: accepts `loopVersion` param, creates correct state shape
- `getPhaseOrder()`: returns correct order based on state
- `loadState()`: reads `loopVersion` field to determine type

**Resume guard (Codex #6):** `--resume` checks state file's `loopVersion` matches `--loop-version` flag. Mismatch → explicit error with instructions.

### Step 2: agent-config.ts — Extension Config with Allowlist

```typescript
loopExtensions?: string[];  // ["calibrate", "sources", "observe"]
```

Parse from persona.yaml `loop.extensions`. **Validate against allowlist (Codex #4):**
```typescript
const KNOWN_EXTENSIONS = new Set(["calibrate", "sources", "observe"]);
for (const ext of extensions) {
  if (!KNOWN_EXTENSIONS.has(ext)) {
    console.warn(`Warning: unknown loop extension "${ext}" in ${filePath} — ignored`);
  }
}
```

### Step 3: session-runner.ts — Feature Flag + V2 Loop

**Flag parsing:**
- `--loop-version 1|2` (default: 1)
- `--shadow` (requires `--loop-version 2`, suppresses publish substage)
- `--shadow` without `--loop-version 2` → explicit CLI error (Codex verification #1)

**State access adapter layer (Codex #2):**
Before implementation, grep audit all `state.phases.` direct access in session-runner.ts. Create typed accessor functions:
```typescript
function getScanResult(state: AnySessionState): any {
  if (isV2(state)) return state.phases.sense?.result;
  return state.phases.scan?.result;
}
function getGateResult(state: AnySessionState): any {
  if (isV2(state)) {
    const actResult = state.phases.act?.result;
    return actResult?.gate;
  }
  return state.phases.gate?.result;
}
function getEngageResult(state: AnySessionState): any {
  if (isV2(state)) {
    const actResult = state.phases.act?.result;
    return actResult?.engage;
  }
  return state.phases.engage?.result;
}
```

**V2 main loop** (new function `runV2Loop`):
```
1. Extension: calibrate (if declared) — reuses runAudit()
2. SENSE — reuses runScan(), stores in state.phases.sense
3. ACT — sequential substages with per-substage status tracking:
   a. engage → SubstageState, reuses runEngage()
   b. gate → SubstageState, reuses runGateX()
   c. publish → SubstageState, reuses runPublishX() (HARD SKIP in shadow — no prep/API calls)
   ACT result = { engage: engageResult, gate: gateResult, publish: publishResult, substages: [...] }
4. CONFIRM — reuses runVerify(), stores in state.phases.confirm
```

`observe()` is called inline unconditionally in v2 (Codex open Q #2 — mandatory, not optional).

**ACT substage failure semantics (Codex #3):**
- engage fails → continue to gate (engagement is non-critical)
- gate fails → skip publish, ACT status = "completed" with gate failure logged
- publish fails → ACT status = "failed" (critical path)
- Each substage persisted to `state.substages[]` with status/durationMs/failureCode
- Resume from ACT skips completed substages (check substage status)

**Shadow mode guard (Codex #5):**
```typescript
if (shadow) {
  // Hard guard — skip publish entirely, no LLM calls, no wallet connect, no API calls
  substages.push({ substage: "publish", status: "skipped", durationMs: 0 });
  observe("insight", "Publish skipped (shadow mode)", { phase: "act", substage: "publish" });
}
```
Plus `publishSuppressed: true` flag in session state for audit trail.

**V2 session report:** Uses SENSE/ACT(with substage breakdown)/CONFIRM headings.

**Substage budgets (Codex #7):**
```typescript
const V2_SUBSTAGE_BUDGETS = {
  engage: 300,   // 5 min
  gate: 300,     // 5 min
  publish: 900,  // 15 min
};
const V2_PHASE_BUDGETS: Record<CorePhase, number> = {
  sense: 180,    // 3 min
  act: 1500,     // 25 min (sum of substages)
  confirm: 120,  // 2 min
};
```

### Step 4: Persona YAML Updates

Add to each agent's persona.yaml:
```yaml
loop:
  extensions:
    - calibrate
    - sources
    - observe
```

### Step 5: Deferred Cleanup (separate commit after burn-in)

- Remove `extends:` and `basePhase:` from strategy.yaml files
- Delete `strategies/base-loop.yaml`
- Remove REVIEW/HARDEN from help text

## Verification

### Happy Path
1. **V1 regression:** `npx tsx tools/session-runner.ts --agent sentinel --dry-run --oversight autonomous` → 8-phase output, identical to current
2. **V2 dry-run:** `npx tsx tools/session-runner.ts --agent sentinel --loop-version 2 --dry-run --oversight autonomous` → 3-phase output (SENSE/ACT/CONFIRM) with substage breakdown
3. **V2 shadow dry-run:** `--loop-version 2 --shadow --dry-run` → publish substage shows SKIPPED

### Error Cases (Codex #9)
4. **Invalid flag combo:** `--shadow` without `--loop-version 2` → CLI error
5. **Unknown loop-version:** `--loop-version 3` → CLI error
6. **Cross-version resume:** Save v1 state, try `--resume --loop-version 2` → explicit error
7. **Unknown extension:** Add `"foo"` to persona.yaml `loop.extensions` → warning on load

### All oversight modes (Codex verification #3)
8. V2 dry-run with `--oversight full` → shows interactive mode indicators
9. V2 dry-run with `--oversight approve` → shows auto-suggest indicators

### TypeScript
10. `npx tsc --noEmit` passes for state.ts and session-runner.ts
11. State file format verified: `loopVersion: 2`, sense/act/confirm keys, substages array

### Rollback (Codex verification #5)
12. Switch back to `--loop-version 1` after v2 run → v1 session works normally
