# Plan: HARDEN Phase Implementation + Provider-Agnostic LLM

## Context

Session 11 established HARDEN as Phase 8 in the loop. It exists in `strategy.yaml` and `operational-playbook.md` but is NOT implemented in code. Additionally, `llm.ts` hardcodes the Anthropic SDK, and `AGENT.yaml` says nothing about LLM requirements. Marius wants:
1. HARDEN as a real executable phase in `session-runner.ts`
2. Agent definition and tooling independent of LLM provider and auth type
3. Works in any environment: Claude, GPT, Codex, local models, or no LLM at all

### Codex Review v1 Findings (all addressed in v2)

1. **STRATEGY must stay human-gated in ALL modes** — autonomous auto-apply violated AGENT.yaml hard rules
2. **REVIEW doesn't produce what HARDEN expects** — Q1 only catches score misses, Q4 only flags stale posts; richer failure classes missing from `session-review.ts`
3. **HARDEN execution model underspecified** — no target files, no patch strategy, no integration with `proposed → approved → applied → verified` lifecycle
4. **Backward compat fallback preserves Anthropic coupling** — runner must explicitly resolve and pass provider, not silently fall back
5. **resolveProvider() ambiguity with multiple keys** — needs explicit `LLM_PROVIDER` when ambiguous

### Codex Review v2 Findings (all addressed in v3)

6. **REVIEW enrichment misplaced** — `session-review.ts` is a log-only tool (reads JSONL, no session state access). Can't enrich Q1 with `state.phases.*.error` because it never receives `state`.
7. **improvements.ts is tracker, not executor** — `apply` just sets `status: "applied"`, it cannot generate diffs or edit files. Plan v2 implied it could execute fixes.
8. **CLI autodetection missing** — `codex`/`claude`/`ollama` on PATH with OAuth auth but no env vars → `resolveProvider()` returns null. OAuth CLI users (like Marius) get no LLM.
9. **State migration gap** — resuming a pre-v2 session with 7 phases crashes because `state.phases.harden` is undefined.
10. **Q1/Q4 schema too rigid** — `txHash` and `category` are mandatory in Q1Failure/Q4StaleItem, but gate/attest failures and calibration drift entries don't have them.

### Auth Model Insight

Marius uses OAuth setup tokens (Claude Code, Codex CLI), not pay-per-use API keys. This means:
- **CLI adapters are the primary path** — `codex exec`, `claude`, `ollama` all handle their own auth
- **SDK adapters with API keys are for server/CI environments** — secondary
- **OAuth tokens can be passed as bearer auth** to SDKs, but the CLI wrapper is simpler and auth-agnostic
- Resolution order should prefer CLI tools (already authed) over SDK+key

## Changes (8 steps, in dependency order)

### Step 1: `tools/lib/llm-provider.ts` (NEW FILE)

Minimal provider abstraction:

```typescript
export interface LLMProvider {
  /** The only method — every LLM is just prompt→text */
  complete(prompt: string, options?: {
    system?: string;
    maxTokens?: number;
  }): Promise<string>;

  /** Human-readable name for logging ("anthropic", "codex-cli", "ollama") */
  readonly name: string;
}

export function resolveProvider(envPath?: string): LLMProvider | null { ... }
```

Four adapters (each ~15-25 lines):
- **CLIProvider** — subprocess adapter for any CLI that accepts prompt on stdin/args. Covers `codex exec`, `claude`, `ollama run`, or any custom `LLM_CLI_COMMAND`. Handles its own auth (OAuth, local, whatever).
- **AnthropicProvider** — wraps `@anthropic-ai/sdk`, activated by `ANTHROPIC_API_KEY` (API key or OAuth token)
- **OpenAIProvider** — wraps `openai` SDK (dynamic import, optional dep), activated by `OPENAI_API_KEY`
- *(No stub adapter — `null` means no LLM, callers handle)*

**Resolution order in `resolveProvider()` — explicit-first, CLI-preferred, autodetect-aware:**

```
1. LLM_PROVIDER env var set explicitly → use that adapter, error if misconfigured
2. LLM_CLI_COMMAND env var set → CLIProvider (e.g. "codex exec", "ollama run llama3")
3. ANTHROPIC_API_KEY present (alone) → AnthropicProvider
4. OPENAI_API_KEY present (alone) → OpenAIProvider
5. Multiple keys present without LLM_PROVIDER → ERROR with message:
   "Multiple LLM credentials found. Set LLM_PROVIDER=anthropic|openai|cli to disambiguate."
6. CLI autodetect: `which codex` → CLIProvider("codex exec --full-auto -q"),
   `which claude` → CLIProvider("claude --print"),
   `which ollama` → CLIProvider("ollama run llama3")
   (first match wins — covers OAuth-authed CLIs with no env vars)
7. Nothing → return null (no LLM available)
```

This addresses Codex v1 finding #5 (ambiguity) and **v2 finding #8** (CLI autodetection) — OAuth CLI users like Marius get automatic provider resolution without setting any env vars. Autodetect is Step 6, AFTER explicit config, so it never overrides intentional env vars.

### Step 2: Refactor `tools/lib/llm.ts`

- `generatePost()` signature: **require** `provider: LLMProvider` param (no optional, no fallback)
- Remove direct `import Anthropic from "@anthropic-ai/sdk"` from llm.ts
- Remove `loadApiKey()` from llm.ts (auth is provider's responsibility)
- Prompt construction stays as-is (pure function building system + user prompt)
- JSON parsing stays as-is
- Callers (session-runner autonomous publish) must resolve provider first and pass it in. If `resolveProvider()` returns null, autonomous publish fails with clear error: "Autonomous publish requires an LLM provider. Set LLM_PROVIDER or ANTHROPIC_API_KEY."

This addresses Codex finding #4 (Anthropic coupling) — no hidden fallback, explicit provider at every call site.

**Key files:** `tools/lib/llm.ts`

### Step 3: Update `agents/sentinel/AGENT.yaml`

Add declarative `llm` section:

```yaml
llm:
  capabilities:
    - text-generation    # autonomous post drafting
    - code-review        # HARDEN finding classification
  required: false        # loop works without LLM (full/approve modes)
  resolution: runtime    # provider resolved from environment
  auth: agnostic         # supports API keys, OAuth tokens, CLI-managed auth
```

No provider names. No auth details. Just declares WHAT, not HOW.

**Key files:** `agents/sentinel/AGENT.yaml`

### Step 4: Update `tools/lib/state.ts`

- Add `"harden"` to `PhaseName` union type (8th member)
- Add `"harden"` to `PHASE_ORDER` array (8th entry)
- Update `clearState` doc comment: "Called after successful HARDEN" (not REVIEW)
- **State migration (v2 #9 + v3 #2):** Extract a shared `normalizeState(state)` function that both `loadState()` AND `findActiveSession()` call after JSON.parse. The resume path uses `findActiveSession()`, NOT `loadState()`, so normalizing only in `loadState()` would miss resumed sessions entirely.
  ```typescript
  export function normalizeState(state: SessionState): SessionState {
    // Ensure all phases in PHASE_ORDER exist
    for (const phase of PHASE_ORDER) {
      if (!state.phases[phase]) {
        state.phases[phase] = { status: "pending" };
      }
    }
    // Ensure arrays exist
    if (!state.posts) state.posts = [];
    if (!state.engagements) state.engagements = [];
    return state;
  }
  ```
  Called in both `loadState()` and `findActiveSession()` after parsing state JSON.

**Key files:** `tools/lib/state.ts`

### Step 5: REVIEW output types + HARDEN-side enrichment

**Problem (Codex v1 #2 + v2 #6):** `session-review.ts` is a log-only tool — it reads the JSONL session log and scores posts. It has NO access to `state` (the session runner's in-memory state object). Enriching it with `state.phases.*.error` would violate its design boundary.

**Fix: Two-part approach:**

**Part A — Update types in `review-findings.ts`** (schema changes only):
```typescript
export interface Q1Failure {
  txHash?: string;    // optional (v2 finding #10) — gate/attest failures have no txHash
  category?: string;  // optional (v2 finding #10) — gate failures have no category
  reason: string;
  type: "score_miss" | "gate_fail" | "publish_error" | "attest_error";  // NEW
}

export interface Q4StaleItem {
  txHash?: string;        // optional (v2 finding #10)
  description: string;
  type: "unaudited" | "calibration_drift" | "assumption_conflict";  // NEW
}
```

**Part B — `session-review.ts` adds `type` field to existing findings** (minimal change):
- `findFailures()` sets `type: "score_miss"` on all entries it produces (its only finding type — log-based)
- `findStale()` sets `type: "unaudited"` on all entries it produces (its only finding type — log-based)
- NO new params, NO session state access. `session-review.ts` stays log-only.

**Part C — HARDEN handler does the enrichment** (in Step 6, where `state` IS available):
- HARDEN reads `state.phases` to find failed phases → creates Q1Failure entries with `type: "gate_fail"`, `"publish_error"`, `"attest_error"` (no txHash)
- HARDEN reads strategy.yaml + calibration data → creates Q4StaleItem entries with `type: "calibration_drift"`, `"assumption_conflict"` (no txHash)
- These enriched entries are merged with the REVIEW Q1-Q4 findings before classification

This addresses v2 finding #6 (session-review.ts stays log-only) AND v2 finding #10 (optional txHash/category).

**Part D — Update `persistReviewFindings()` in session-runner.ts** (v3 finding #7):
- Current code at ~line 896 explicitly strips fields to only `txHash`, `category`, `reason`/`description`
- Must preserve the new `type` field during persistence, otherwise HARDEN never sees it on resume
- Update the mapping to include `type` in the persisted shape

**Part E — Guard display code against optional txHash** (v3 finding #8):
- Lines ~301, ~338 in session-runner.ts and session-review.ts slice txHash unconditionally (`txHash.slice(0,8)`)
- Must guard: `txHash ? txHash.slice(0,8) : finding.type` — show the type label when no hash exists
- Same for `category` — display `"n/a"` or the finding type when absent

**Key files:** `tools/lib/review-findings.ts` (types), `tools/session-review.ts` (add type field only), `tools/session-runner.ts` (persistence + display guards)

### Step 6: Implement HARDEN handler in `tools/session-runner.ts`

**HARDEN handler flow:**

1. Read REVIEW phase result from `state.phases.review.result`
2. Collect ALL Q1-Q4 findings:

| Source | Content | HARDEN type mapping |
|--------|---------|---------------------|
| Q1 failures (score_miss) | Prediction was off | INFO (log calibration data) |
| Q1 failures (gate_fail) | Gate checklist failed | CODE-FIX / GUARDRAIL |
| Q1 failures (publish_error) | Publish pipeline broke | CODE-FIX |
| Q1 failures (attest_error) | TLSN/DAHR failed | GUARDRAIL |
| Q2 suggestions | What could be done better | CODE-FIX / GUARDRAIL / STRATEGY |
| Q3 insights | New patterns emerged | GOTCHA / PLAYBOOK |
| Q4 stale (unaudited) | Old unaudited posts | INFO |
| Q4 stale (calibration_drift) | Calibration significantly off | PLAYBOOK |
| Q4 stale (assumption_conflict) | Strategy assumption invalidated | STRATEGY |

3. Normalize into `HardenFinding[]`: `{ source: "q1"|"q2"|"q3"|"q4", type: HardenType, text: string, rawData?: any }`
4. Classification:
   - If LLM available: classify via `provider.complete()` with prompt mapping to 6 types
   - If no LLM: use rule-based classification from source+subtype mapping above (deterministic default), then present to human for override in full/approve modes
5. **Integrate with existing improvement lifecycle** (addresses Codex v1 #3 + v2 #7):

   **Key insight (v2 finding #7):** `improvements.ts` is a TRACKER — `apply` just sets `status: "applied"`, it cannot generate diffs or edit files. Actual file edits must happen in the HARDEN handler itself.

   Workflow per finding:
   - `improvements.ts propose` → records the finding with metadata (target file, description, type)
   - **HARDEN handler executes the edit** (writes file, appends to playbook, adds guardrail code):
     - If LLM available: use `provider.complete()` to generate the diff/content
     - If no LLM: present finding to human with suggested file+location, human edits manually
   - `improvements.ts apply` → marks the improvement as applied (tracking only)
   - `improvements.ts verify` → marks as verified after success confirmation

   Per type:
   - CODE-FIX / GUARDRAIL → propose → HARDEN executes edit → apply → verify
   - GOTCHA / PLAYBOOK → propose → HARDEN appends to target doc → apply → verify
   - STRATEGY → propose ONLY (NEVER execute, even in autonomous — Codex v1 #1). Proposal includes: description, target file, evidence text (the data/reasoning that triggered it), and source finding reference. All persisted in improvements envelope for human review next session.
   - INFO → log to session report, no improvement entry
6. Execute per oversight level:

| Oversight | CODE-FIX / GUARDRAIL | GOTCHA / PLAYBOOK | STRATEGY | INFO |
|-----------|---------------------|-------------------|----------|------|
| full | Show diff, ask y/n, propose+apply | Show diff, ask y/n, propose+apply | Show evidence, ask y/n, propose only | Log |
| approve | Auto-apply, show summary | Auto-apply, show summary | Show evidence, ask y/n, propose only | Log |
| autonomous | Auto-apply silently | Auto-apply silently | **Propose only, NEVER auto-apply** | Log |

**STRATEGY is human-gated in ALL modes. No exceptions. This is an AGENT.yaml hard rule.**

7. `completePhase(state, "harden", { findings: N, classified: N, applied: N, proposed: N, skipped: N })`

**Three handler variants** (matching existing pattern):
- `runHardenFull(state, flags, rl)` — interactive, ask for each finding
- `runHardenApprove(state, flags, rl)` — auto-apply CODE-FIX/GUARDRAIL/GOTCHA/PLAYBOOK, ask for STRATEGY
- `runHardenAutonomous(state, flags)` — auto-apply non-STRATEGY, propose STRATEGY for next session

**Key files:** `tools/session-runner.ts`, `tools/lib/review-findings.ts` (types), `tools/improvements.ts` (called via subprocess)

### Step 6b: Update REVIEW→HARDEN contract in `strategy.yaml`

- Update REVIEW `outputAction` to: `"All Q1-Q4 findings feed into HARDEN phase for classification and action"`
- Add explicit `feedsInto: harden` on the review phase definition
- Ensure HARDEN phase definition documents the improvement lifecycle integration

**Key files:** `agents/sentinel/strategy.yaml`

### Step 7: Fix help text, display, report

In `session-runner.ts`:
- Line 152: `"Sentinel 8-phase loop orchestrator"`
- Line 162: add `harden` to `--skip-to` valid phases
- Lines 176-183: add `8. HARDEN (varies) — Classify and apply REVIEW findings via improvement lifecycle`
- Line 206: `Phase ${idx}/${getPhaseOrder().length}` (dynamic, not hardcoded 7 or 8)
- `getPhaseMode("harden", oversight)`: full→interactive, approve→auto-apply, autonomous→automatic
- `writeSessionReport()`: add HARDEN section showing classified/applied/proposed/skipped counts
- **Fix report correctness bug (v3 finding #12):** Line ~1012 labels `gp.confidence` as "predicted reactions" — these are different fields. Use actual `predicted_reactions` from the session log entry or publish output, not confidence score.
- Move `clearState()` call to after HARDEN completes (currently after REVIEW)

### Step 8: Fix stale plan doc references

In `Plans/phase3-session-runner-automation.md`:
- Line 5: "8-phase loop" (not 7)
- Line 33: "8-phase loop" (not 7)
- Line 199: "8-phase loop" (not 7)

(Lines 50, 406, 407 already fixed in pre-plan edits)

## Files Modified

| File | Action |
|------|--------|
| `tools/lib/llm-provider.ts` | NEW — LLMProvider interface + 3 adapters + resolveProvider() |
| `tools/lib/llm.ts` | EDIT — require LLMProvider param, remove Anthropic hardcoding |
| `tools/lib/review-findings.ts` | EDIT — add `type` field to Q1Failure and Q4StaleItem |
| `tools/session-review.ts` | EDIT — add `type` field to existing findings (stays log-only, no state access) |
| `agents/sentinel/AGENT.yaml` | EDIT — add `llm` section |
| `tools/lib/state.ts` | EDIT — add "harden" to PhaseName + PHASE_ORDER |
| `tools/session-runner.ts` | EDIT — HARDEN handler + help/display/report + provider resolution at startup |
| `agents/sentinel/strategy.yaml` | EDIT — REVIEW outputAction + HARDEN lifecycle integration |
| `Plans/phase3-session-runner-automation.md` | EDIT — 3 stale "7-phase" refs |

## Codex Findings Resolution Matrix

| # | Review | Finding | Resolution |
|---|--------|---------|------------|
| 1 | v1 | STRATEGY auto-apply in autonomous | STRATEGY human-gated in ALL modes, propose-only in autonomous |
| 2 | v1 | REVIEW doesn't produce rich enough data | Step 5: type fields on existing Q1/Q4, HARDEN handler does enrichment (not session-review.ts) |
| 3 | v1 | HARDEN execution underspecified | Step 6: HARDEN handler executes edits, improvements.ts tracks lifecycle |
| 4 | v1 | Anthropic fallback preserves coupling | Step 2: `generatePost()` requires provider param, no fallback |
| 5 | v1 | Multi-key ambiguity | Step 1: error when multiple keys without `LLM_PROVIDER` |
| 6 | v2 | session-review.ts is log-only, can't access state | Step 5: enrichment moved to HARDEN handler (has `state`), session-review.ts stays log-only |
| 7 | v2 | improvements.ts is tracker not executor | Step 6: HARDEN handler does file edits, improvements.ts tracks status only |
| 8 | v2 | CLI autodetection missing (OAuth users) | Step 1: autodetect step 6 — `which codex/claude/ollama` before returning null |
| 9 | v2 | State migration for pre-v2 sessions | Step 4: `loadState()` injects `phases.harden = {status: "pending"}` if missing |
| 10 | v2 | Q1/Q4 txHash/category mandatory but absent for non-post findings | Step 5: `txHash` and `category` optional in Q1Failure/Q4StaleItem |
| 11 | v3 | State migration only in `loadState()`, resume uses `findActiveSession()` | Step 4: shared `normalizeState()` called by both paths |
| 12 | v3 | `persistReviewFindings()` strips new `type` field | Step 5D: update persistence mapping to include `type` |
| 13 | v3 | Display code crashes on optional txHash (`.slice()` on undefined) | Step 5E: guard with conditional — show type label when no hash |
| 14 | v3 | Report labels `confidence` as `predicted_reactions` | Step 7: use actual predicted_reactions from session log |

## Verification

1. `npx tsx tools/session-runner.ts --dry-run` shows 8 phases including HARDEN
2. `npx tsx tools/session-runner.ts --help` lists HARDEN in phase sequence and `--skip-to`
3. TypeScript compiles cleanly (`npx tsc --noEmit` or tsx import check)
4. `resolveProvider()` with `ANTHROPIC_API_KEY` only → returns AnthropicProvider
5. `resolveProvider()` with `LLM_CLI_COMMAND` set → returns CLIProvider
6. `resolveProvider()` with both `ANTHROPIC_API_KEY` + `OPENAI_API_KEY` and no `LLM_PROVIDER` → errors with disambiguation message
7. `resolveProvider()` with nothing and no CLIs on PATH → returns null
8. `resolveProvider()` with nothing but `codex` on PATH → returns CLIProvider("codex exec ...") (v2 fix #8)
9. `generatePost()` without provider → TypeScript compile error (required param)
10. AGENT.yaml contains no hardcoded provider names (grep test)
11. All "7-phase" references eliminated from tracked files (grep test)
12. HARDEN in autonomous mode with a STRATEGY finding → proposes only, does NOT auto-apply
13. `normalizeState()` on a 7-phase state file → injects `phases.harden = {status: "pending"}` without crashing (v2 fix #9)
14. `findActiveSession()` also calls `normalizeState()` — resumed pre-HARDEN sessions don't crash (v3 fix #11)
15. Q1Failure with no txHash (gate failure) → compiles and serializes correctly (v2 fix #10)
16. `session-review.ts` has NO imports from `state.ts` (stays log-only, v2 fix #6)
17. `improvements.ts apply` is called AFTER HARDEN handler edits files (tracker not executor, v2 fix #7)
18. `persistReviewFindings()` preserves `type` field — round-trip test: persist → load → type still present (v3 fix #12)
19. Display of Q1 finding without txHash → shows type label, no crash (v3 fix #13)
20. Session report shows actual `predicted_reactions`, not `confidence` (v3 fix #14)
