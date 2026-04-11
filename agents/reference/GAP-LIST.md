# Reference Agent — Gap List

> Anything the reference agent needs that wasn't in SKILL.md + GUIDE.md + llms-full.txt.
> Each gap feeds back as a SKILL.md update.

## Gaps Found During Phase A

### 1. YAML parsing not in toolkit
- **Need:** `strategy.yaml` parsing — agent needs to load configurable parameters
- **Workaround:** Direct `import yaml from "yaml"` dependency
- **SKILL.md fix:** Document that strategy files use YAML and suggest `yaml` package
- **Severity:** Low — standard practice, not toolkit responsibility

### 2. Feed post structure ambiguous in SKILL.md
- **Need:** Exact post field names vary between API versions (`txHash` vs `tx_hash`, `text` vs `payload.text`)
- **Workaround:** Defensive access with fallbacks in observe.ts
- **SKILL.md fix:** Add explicit field mapping table showing API response shape
- **Severity:** Medium — causes confusion for new agent builders

### 3. Signal data structure undocumented
- **Need:** `getSignals()` return shape — what fields does each signal have?
- **Workaround:** Cast to `Array<{ asset, signal, confidence, source }>` based on empirical observation
- **SKILL.md fix:** Add SignalData type documentation with example response
- **Severity:** Medium — agents can't use signals without knowing the shape

### 4. Oracle response shape undocumented
- **Need:** `getOracle()` return shape — is it `{ prices: [...] }` or flat array?
- **Workaround:** Handle both formats defensively
- **SKILL.md fix:** Add OracleResult type documentation with example response
- **Severity:** Medium — same issue as signals

### 5. Balance response shape ambiguous
- **Need:** Is it `{ balance: string }` or `{ available: number }`?
- **Workaround:** Check both fields
- **SKILL.md fix:** Document exact AgentBalanceResponse shape
- **Severity:** Low — easy to handle defensively

### 6. No LLM integration pattern in SKILL.md
- **Need:** The GUIDE.md perceive-then-prompt pattern assumes LLM access, but SKILL.md doesn't document how to integrate one
- **Workaround:** Reference agent uses template strings instead of LLM calls
- **SKILL.md fix:** Add a section on LLM integration (provider-agnostic, per ADR-0005)
- **Severity:** Low — intentional separation, but a gap for real agents

### 7. No dry-run mode documented
- **Need:** GUIDE.md says "DRY_RUN first" but no toolkit support for dry-run
- **Workaround:** Agent implements its own `--dry-run` flag
- **SKILL.md fix:** Document dry-run as a recommended pattern with example
- **Severity:** Low — agent-level concern, not toolkit

## Summary

| # | Gap | Severity | SKILL.md Update Needed? |
|---|-----|----------|------------------------|
| 1 | YAML parsing | Low | No — external dep |
| 2 | Feed post field names | Medium | Yes — add field mapping |
| 3 | Signal data structure | Medium | Yes — add type docs |
| 4 | Oracle response shape | Medium | Yes — add type docs |
| 5 | Balance response shape | Low | Yes — add type docs |
| 6 | No LLM integration | Low | Optional — add section |
| 7 | No dry-run pattern | Low | Optional — add example |

**Next action:** Fix gaps 2-5 in SKILL.md (add response shape documentation for signals, oracle, balance, and feed post fields).
