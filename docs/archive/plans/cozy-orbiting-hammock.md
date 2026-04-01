# Plan: Minimal Demo Configs, Dry-Run, Executor Extraction

## Context

WS1-WS4 are complete. The new Skill-Dojo agents (defi-markets, infra-ops) are **framework demos** — they exist to prove the FrameworkPlugin/EventPlugin type system works, not to be production SuperColony publishers. They need minimal config (just enough to satisfy the loader and pass dry-runs), not full sentinel-style strategies.

Additionally, `executeAction` in event-runner.ts is a 200-line inline closure that should be extracted for testability. Two latent bugs were found during analysis (`recordPublish` missing agent param, `saveWriteRateLedger` extra arg).

**Key correction:** The original plan assumed these agents would publish to SuperColony. They don't. Config should be minimal demo scaffolding, not production strategy.

## Execution Order

### Batch 1: Minimal Demo Configs + Clean Up SC References

**Clean up (modify 4 files):**
- `agents/defi-markets/AGENT.yaml` — remove `skills: [supercolony]`, update displayName to drop "SuperColony"
- `agents/infra-ops/AGENT.yaml` — same cleanup
- `agents/defi-markets/persona.md` — trim SC-specific post format guidelines, keep voice/identity only
- `agents/infra-ops/persona.md` — trim SC-specific post format guidelines, keep voice/severity classification

**Create minimal configs (6 new files):**
- `agents/defi-markets/strategy.yaml` — minimal: extends base-loop, 4 abstract phases (observe/act/verify/learn), no SC-specific sub-phases
- `agents/defi-markets/sources-registry.yaml` — 2-3 example DeFi sources (defillama-tvl, coingecko-simple)
- `agents/defi-markets/source-config.yaml` — agent name + basic topic limits
- `agents/infra-ops/strategy.yaml` — minimal: same structure, infra-oriented descriptions
- `agents/infra-ops/sources-registry.yaml` — 2-3 example infra sources (etherscan-gas, hn-algolia)
- `agents/infra-ops/source-config.yaml` — agent name + basic topic limits

**Design decisions:**
- Strategy files use the 4 base phases (observe/act/verify/learn) NOT the 8 sentinel sub-phases (audit/scan/engage/gate/publish/verify/review/harden)
- Sources-registry has minimal entries — just enough to prove the loader works, 2-3 per agent
- No scoring block, no calibration, no engagement rules, no gate checklist — those are SC-specific
- persona.md retains domain identity/voice but drops post format examples, tag guidelines, engagement philosophy

**Test:** `tests/agent-config-yaml.test.ts` — YAML loads without errors for all agent dirs

**Commit + review after this batch.**

### Batch 2: Dry-Run

```bash
npx tsx tools/session-runner.ts --agent defi-markets --dry-run --pretty
npx tsx tools/session-runner.ts --agent infra-ops --dry-run --pretty
```

Goal: proves config loads without errors. Dry-run won't do meaningful work (no SC publishing), but validates the loader doesn't crash.

Fix any config loading errors. Commit if fixes needed.

### Batch 3: Executor Extraction (TDD)

**Files to create/modify:**
- `tools/lib/action-executor.ts` (NEW) — `ActionExecutorContext` interface + `createActionExecutor()` factory
- `tests/action-executor.test.ts` (NEW) — 11 behavioral test suites
- `tools/event-runner.ts` (MODIFY) — remove inline executeAction (lines 306-506), wire factory

**Architecture: Dependency Injection via Factory**

```typescript
interface ActionExecutorContext {
  agentName: string;
  address: string;
  dryRun: boolean;
  getToken: () => Promise<string>;   // encapsulates refresh
  dailyReactive: number;
  hourlyReactive: number;
  calibrationOffset: number;
  personaMdPath: string;
  strategyYamlPath: string;
  llm: LLMProvider | null;
  ownTxHashes: Set<string>;          // shared mutable ref
  // Platform abstractions (SDK-free — demos captured in closures at wiring time)
  apiCall: ApiCallFn;
  generatePost: GeneratePostFn;
  attestAndPublish: AttestAndPublishFn;   // no Demos param — closure
  transfer: TransferFn;                    // no Demos param — closure
  // Rate limiting
  loadWriteRateLedger, canPublish, recordPublish, saveWriteRateLedger;
  // Telemetry
  observe, info, warn;
}

function createActionExecutor(ctx): (event, action) => Promise<void>
```

**Bug fixes during extraction:**
1. `recordPublish(ledger!)` → `recordPublish(ledger, ctx.agentName, result.txHash)` (missing agent param)
2. `saveWriteRateLedger(ledger!, address)` → `saveWriteRateLedger(ledger)` (extra arg removed)

**Test suites (11):**
1. log_only — info called, no API calls
2. dry-run mode — all 5 types skip execution
3. react — correct endpoint + body
4. reply — generatePost → attestAndPublish → ownTxHashes + ledger
5. reply without LLM — warns, no publish
6. publish — attestAndPublish → ownTxHashes + ledger
7. tip — apiCall validate → transfer
8. tip validation failure — no transfer
9. budget exhaustion — publish/reply blocked, react/tip pass
10. error handling — warn + observe("failure") on thrown errors
11. token refresh — getToken called before non-log actions

**Commit + /simplify + review after this batch.**

### Batch 4: Adapter Design (lightweight)

Write TypeScript interface specs as types + doc comments for Eliza OS and OpenClaw adapter packages. No implementation.

## Critical Files

| File | Action | Purpose |
|------|--------|---------|
| `agents/defi-markets/AGENT.yaml` | MODIFY | Remove SC references |
| `agents/infra-ops/AGENT.yaml` | MODIFY | Remove SC references |
| `agents/defi-markets/persona.md` | MODIFY | Trim to identity/voice only |
| `agents/infra-ops/persona.md` | MODIFY | Trim to identity/voice + severity |
| `agents/defi-markets/strategy.yaml` | CREATE | Minimal 4-phase demo strategy |
| `agents/defi-markets/sources-registry.yaml` | CREATE | 2-3 example DeFi sources |
| `agents/defi-markets/source-config.yaml` | CREATE | Agent name + topic config |
| `agents/infra-ops/strategy.yaml` | CREATE | Minimal 4-phase demo strategy |
| `agents/infra-ops/sources-registry.yaml` | CREATE | 2-3 example infra sources |
| `agents/infra-ops/source-config.yaml` | CREATE | Agent name + topic config |
| `tests/agent-config-yaml.test.ts` | CREATE | YAML validation tests |
| `tools/lib/action-executor.ts` | CREATE | Extracted executor + context interface |
| `tests/action-executor.test.ts` | CREATE | 11 behavioral test suites |
| `tools/event-runner.ts` | MODIFY | Wire factory, remove inline executor |

## Reusable Code (already exists)

- `tools/lib/agent-config.ts:110` — buildPaths() resolves agent dir paths
- `tools/lib/write-rate-limit.ts` — loadWriteRateLedger, canPublish, recordPublish, saveWriteRateLedger
- `tools/lib/api.ts` — apiCall for SuperColony API
- `tools/publish.ts` — attestAndPublish
- `tools/lib/llm.ts` — generatePost
- `strategies/base-loop.yaml` — base loop skeleton
- `agents/persona-base.yaml` — shared persona defaults
- `agents/sentinel/strategy.yaml` — reference (NOT template) for phase structure
- `agents/sentinel/sources-registry.yaml` — reference for source entry format

## Verification

1. `npm test` — all 732+ tests pass (including new ones)
2. `npx tsx tools/session-runner.ts --agent defi-markets --dry-run --pretty` completes
3. `npx tsx tools/session-runner.ts --agent infra-ops --dry-run --pretty` completes
4. YAML files parseable — `tests/agent-config-yaml.test.ts` green
5. `npx tsx tools/event-runner.ts --agent sentinel --dry-run` still works (no regression)
6. `/simplify` review passes on Batch 3
7. No `@kynesyslabs/demosdk` import in `tools/lib/action-executor.ts`
