# Claim-Driven Attestation — Phases 2-4 Implementation Plan

> Codex-reviewed: 3 High + 2 Medium findings addressed in this revision.

## Context

Phase 1 (claim extraction) is complete: `src/lib/claim-extraction.ts` extracts `ExtractedClaim[]` from post text with typed claims (price, metric, event, trend) + entities + values + units. 1100 tests pass. The spec v2 (`docs/claim-driven-attestation-spec.md`) has been Codex-reviewed with all 7 findings addressed.

**Goal:** Build surgical URL construction (Phase 2), attestation planning/execution (Phase 3), and value verification (Phase 4) as 4 independently committable increments.

**Key constraint:** Existing preflight → grounding → generation → match flow is unchanged. Claim-driven attestation is additive between match and publish. Falls back to current source-shaped attestation when no surgical operations exist.

---

## Commit 1: Surgical URL support (Phase 2)

### `src/lib/sources/providers/types.ts`
- Import `ExtractedClaim` from `../../claim-extraction.js`
- Add `SurgicalCandidate` interface:
  ```typescript
  { claim, url, estimatedSizeBytes, method, extractionPath, tolerance?,
    provider, rateLimitBucket? }
  // ↑ Codex #2: carry provider + bucket metadata for rate limiting
  ```
- Add optional `buildSurgicalUrl?(claim, source): SurgicalCandidate | null` to `ProviderAdapter`

### `src/lib/sources/providers/declarative-engine.ts`
- Add optional `claimTypes?: string[]` and `extractionPath?: string` to `OperationSpec`
- **extractionPath supports variable interpolation** (Codex #3): `"$.{assetId}.usd"` — resolved at plan time using the same variable transforms that build the URL
- In `createAdapterFromSpec()`: generate `buildSurgicalUrl()` that:
  - Filters operations with `claimTypes`, matches `claim.type`
  - Builds synthetic context from claim entities (`vars.asset = claim.entities[0]`)
  - Reuses existing `resolveAllVariables()` + `buildUrl()` — zero duplication
  - **Interpolates extractionPath** with resolved variables (e.g., `$.{assetId}.usd` → `$.bitcoin.usd`)
  - Sets `provider` and `rateLimitBucket` from spec metadata on the candidate
  - Returns `SurgicalCandidate` (TLSN if allowed + <16KB, else DAHR) or `null`

### YAML specs (3 files)
- `specs/binance.yaml` → `ticker-price`: add `claimTypes: [price]`, `extractionPath: "$.price"`
- `specs/coingecko.yaml` → `simple-price`: add `claimTypes: [price]`, `extractionPath: "$.{assetId}.usd"` (Codex #3: templated, not hardcoded `$.bitcoin.usd`)
- `specs/etherscan.yaml` → `gas-oracle`: add `claimTypes: [price]`, `extractionPath: "$.result.ProposeGasPrice"`

### `tests/surgical-url.test.ts` (NEW, ~12 tests)
- Returns SurgicalCandidate for price claim with BTC entity
- Returns SurgicalCandidate for ETH entity with correct extractionPath `$.ethereum.usd` (Codex #3)
- Returns null for trend claim / unresolvable entity
- Prefers TLSN for small responses
- Candidate carries provider + rateLimitBucket (Codex #2)
- YAML specs have claimTypes on target operations

---

## Commit 2: Attestation planner (Phase 3 — planning only)

> Codex #1: Pure planning + budget logic in `src/lib/` (portable). Execution stays in `src/actions/` (platform-bound).

### `src/lib/attestation-planner.ts` (NEW — planning + budget only)
- `AttestationBudget` type: `{ maxCostPerPost: 15, maxTlsnPerPost: 1, maxDahrPerPost: 3, maxAttestationsPerPost: 4 }`
- `AttestationPlan` type: `{ primary, secondary[], unattested[], estimatedCost, budget }`
- `buildAttestationPlan(claims, sourceView, config) → AttestationPlan | null`:
  - Priority: price > metric > event > statistic (trend/quote skipped)
  - Scan sourceView sources for adapters with `buildSurgicalUrl()`
  - Select best per claim (prefer TLSN for primary)
  - Return `null` if no surgical candidates → existing flow
- `resolveAttestationBudget(config)`: read `config.attestation.budget` with defaults

### `src/actions/attestation-executor.ts` (NEW — execution, platform-bound)
> Codex #1: Separated from planner. Lives in `src/actions/` alongside publish-pipeline.ts.
- `executeAttestationPlan(plan, demos) → AttestResult[]`:
  - Sequential execution
  - `acquireRateLimitToken(candidate.rateLimitBucket)` before each call (Codex #2: uses bucket from candidate)
  - TLSN→DAHR fallback on failure
  - Skip on rate-limit denial, log observation

### `src/lib/agent-config.ts`
- Add optional `budget?: { maxCostPerPost?, maxTlsnPerPost?, maxDahrPerPost?, maxAttestationsPerPost? }` to attestation config
- Validation: permissive, accept numbers, use defaults for bad values

### `tests/attestation-planner.test.ts` (NEW, ~10 tests)
- Returns null when no surgical candidates
- Selects primary from highest-priority claim
- Respects budget limits
- Budget defaults when config absent

### `tests/attestation-executor.test.ts` (NEW, ~6 tests)
- Calls attestDahr/attestTlsn sequentially (mock Demos)
- Uses candidate.rateLimitBucket for rate limiting
- Falls back on failure, skips on rate-limit denial

---

## Commit 3: Value verifier (Phase 4)

### `src/lib/attestation-planner.ts` (append — portable, no SDK deps)
- `VerificationResult` type: `{ claim, attestedValue, expectedValue, verified, drift?, failureReason? }`
- `verifyAttestedValues(attestResults, candidates) → VerificationResult[]`:
  - Match AttestResult to SurgicalCandidate by URL
  - Extract value from `attestResult.data` via resolved `extractionPath` (reuse declarative engine's `jsonPathGet`)
  - Tolerance: 2% for prices, 5% for metrics
  - Event claims: string containment; trend/quote: skip (always verified)

### `tests/attestation-planner.test.ts` (append, ~6 tests)
- Price within/outside 2% tolerance
- Metric with 5% tolerance
- Trend claims always pass
- Missing extractionPath graceful
- Nested JSON extraction with templated path

---

## Commit 4: Pipeline wiring + multi-attestation

### `cli/session-runner.ts` (lines ~2149-2236)
- Import claim extraction + planner + executor + verifier
- After match passes, insert:
  ```
  claims = extractStructuredClaimsAuto(draft.text, provider)
  plan = buildAttestationPlan(claims, sourceView, agentConfig)
  if plan:
    attestResults = executeAttestationPlan(plan, demos)
    verifications = verifyAttestedValues(attestResults, [plan.primary, ...plan.secondary])
    if any failed → clear, fall through to existing
  if empty → [existing single attestation, lines 2192-2213]
  ```
- Replace single-attestation post construction with multi-attestation array mapping

### `src/actions/publish-pipeline.ts`
- Add `preAttested` to `PublishOptions` (Codex #4: avoids breaking `attestAndPublish` signature and its typed wrappers in `action-executor.ts` + `event-runner.ts`):
  ```typescript
  export interface PublishOptions {
    feedToken?: string | null;
    preAttested?: AttestResult[];  // ← in options, not new positional param
  }
  ```
- When `preAttested` is provided, skip `attestDahr()` call, map results into arrays
- `PublishResult.attestation` reports **primary only** (Codex #5: existing singular model preserved for reporting/logging/audit)

### `cli/publish.ts` (~line 620)
- Pass-through `preAttested` in options (lower priority)

### `src/index.ts`
- Barrel exports: `buildAttestationPlan`, `verifyAttestedValues`, types
- `executeAttestationPlan` from `src/actions/` (not re-exported from `src/index.ts` — platform-bound)

### Reporting model (Codex #5)
- `PublishResult.attestation` = primary attestation only (singular, unchanged)
- Session log (`src/lib/log.ts`), audit (`cli/audit.ts`), session-review — **no changes needed**
- Multi-attestation detail is captured in observation logs, not in the post result schema
- This is a deliberate choice: the scoring bonus is boolean (any attestation present), so reporting primary is sufficient

---

## Dependency Order

```
Commit 1 (types + YAML)
  └─ Commit 2 (planner + executor) — needs SurgicalCandidate + buildSurgicalUrl
       └─ Commit 3 (verifier) — needs AttestResult + SurgicalCandidate
            └─ Commit 4 (wiring) — needs all above
```

## Codex Review Findings Addressed

| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| 1 | High | `executeAttestationPlan` in `src/lib/` violates portable core boundary | Split: planner in `src/lib/`, executor in `src/actions/` |
| 2 | High | `SurgicalCandidate` lacks provider/bucket for rate limiting | Added `provider` + `rateLimitBucket` fields |
| 3 | High | CoinGecko extractionPath `$.bitcoin.usd` is hardcoded, fails for ETH/SOL | Templated: `$.{assetId}.usd`, interpolated at plan time |
| 4 | Medium | New `preAttested` param breaks `attestAndPublish` wrappers | Put in `PublishOptions` instead of new positional param |
| 5 | Medium | `PublishResult` and downstream logs assume single attestation | Primary-only reporting model — explicit decision, no changes needed |

## Key Design Decisions

1. **Reuse variable resolution** — buildSurgicalUrl calls resolveAllVariables + buildUrl internally
2. **Null = fallback** — null from buildAttestationPlan triggers existing single-attestation path
3. **Budget in AgentConfig** — persona.yaml, not provider specs
4. **jsonPathGet reuse** — declarative engine's tested impl for value extraction
5. **Sequential execution** — avoids 429 storms; TLSN is 50-180s anyway
6. **Portable/platform split** — planner + verifier in `src/lib/`, executor in `src/actions/`
7. **Primary-only reporting** — existing log/audit/review model unchanged
8. **Templated extractionPath** — `$.{var}.field` interpolated with resolved variables

## Verification

Per commit:
1. `npx tsc --noEmit` — zero new errors in modified files
2. `npx vitest run` — all 1100+ tests pass + new
3. Codex review before push

End-to-end (Commit 4):
4. `npx tsx cli/session-runner.ts --agent sentinel --dry-run --pretty` — claim extraction + planning logs
5. Remove claimTypes from binance.yaml → verify fallback to existing attestation unchanged
