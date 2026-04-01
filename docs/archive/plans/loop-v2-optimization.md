# Loop v2 Optimization Plan

Date: 2026-03-13  
Scope: Improve autonomous loop throughput, publish success rate, and pioneer decision quality.

## Goals

1. Reduce wasted work in publish stage (especially TLSN path).
2. Keep pioneer opportunity-seeking behavior without compromising safety.
3. Improve observability so threshold tuning is data-driven.

## P0: Stop Expensive Dead Ends

### 1) Publish Preflight Before Draft Generation
- File: `tools/session-runner.ts`
- Touchpoint: `runPublishAutonomous(...)`
- Change:
  - Add preflight source/attestation eligibility check before LLM draft call.
  - If no valid source, skip topic early with reason code.
- Reason codes:
  - `NO_MATCHING_SOURCE`
  - `TLSN_REQUIRED_NO_TLSN_SOURCE`
  - `SOURCE_PRECHECK_HTTP_ERROR`

Acceptance:
- Topics with broken source mapping are skipped before LLM draft.
- Session report includes explicit skip reason.

### 2) Phase Budgets + Failure Taxonomy
- File: `tools/session-runner.ts`
- Touchpoints: phase runners (`runScan`, `runGateAutonomous`, `runPublishAutonomous`, etc.)
- Change:
  - Add per-phase deadline wrappers and classified failure codes.
  - Persist phase duration + failure code in session state/report.

Acceptance:
- Each phase emits duration and success/fail reason.
- No generic "failed" without category.

## P1: Scan Throughput and Reliability

### 3) Scan Profiles (`fast` vs `deep`)
- Files:
  - `tools/lib/agent-config.ts`
  - `tools/room-temp.ts`
- Change:
  - Add `scan.profile` (default per agent).
  - `fast`: `since-last + lightweight`
  - `deep`: full configured modes
- Keep existing flags backward compatible.

Acceptance:
- Fast profile runs with fewer API calls than deep on same input.
- Output shape remains compatible.

### 4) Endpoint Health in Scan Invocation
- File: `tools/room-temp.ts`
- Touchpoint: `ApiBudget` and per-mode fetch paths
- Change:
  - Track per-endpoint timeout/failure in current run.
  - Skip repeated failing endpoint calls after threshold.

Acceptance:
- Repeated timeout on one endpoint does not consume entire scan budget.

## P2: Pioneer Heuristics Semantics

### 5) Define "Cross-Sourced" as Evidence Diversity
- Files:
  - `tools/lib/feed-filter.ts`
  - `tools/room-temp.ts`
  - `tools/gate.ts`
- Change:
  - Add minimal attestation-domain extraction to filtered/indexed data.
  - Use domain diversity in pioneer signal scoring.
  - Keep convergence as weak supporting signal only.

Acceptance:
- Pioneer signal score can increase due to independent evidence diversity, not only agent overlap.

### 6) Keep Safety Hard, Opportunity Soft
- Files:
  - `tools/gate.ts`
  - `tools/session-runner.ts`
- Status:
  - Implemented: opportunity-first signal scoring + autonomous soft-pass when only signal fails and safety checks pass.
- Follow-up:
  - Validate across additional live sessions and tune thresholds.

Acceptance:
- Pioneer topics are not blocked solely for being novel.
- Duplicate/category/novelty safety gates remain enforced.

## P3: Runtime Efficiency

### 7) Reduce Subprocess Churn
- File: `tools/session-runner.ts`
- Touchpoint: `runToolAndParse(...)` usage for gate loop
- Change:
  - Move gate invocation to in-process call path for per-topic checks.

Acceptance:
- Lower per-topic gate latency.
- Output parity with CLI path.

### 8) Publish Retry Policy by Error Class
- File: `tools/lib/publish-pipeline.ts`
- Change:
  - Retry transient network/timeouts only.
  - Never retry policy/validation/auth failures (401/403/429 schema errors).

Acceptance:
- Fewer repeated hard-fail attempts.
- Clear retry/no-retry behavior in logs.

## Observability (Required)

### 9) Phase and Failure Metrics
- Files:
  - `tools/session-runner.ts`
  - `tools/session-report.ts` (if needed)
  - `tools/session-review.ts` (optional summary)
- Change:
  - Emit per-phase durations.
  - Emit normalized failure codes.
  - Add compact summary block in session report.

Acceptance:
- Easy identification of p50/p95 bottlenecks and top fail classes.

## Rollout Order

1. P0.1 Publish preflight
2. P0.2 Phase budgets/taxonomy
3. P1.3 Scan profiles
4. P1.4 Endpoint health
5. P2.5 Cross-sourced evidence diversity
6. P3.7 Gate in-process
7. P3.8 Retry policy
8. Metrics polish

## Current Known Blockers (Live)

1. DAHR source failure:
- `wikipedia-current-events` returned HTTP 401 and is correctly hard-rejected.
2. High-sensitivity TLSN policy:
- `trade-sanctions` topic had no matching TLSN source mapping and failed closed.

These are source/policy issues, not gate-scoring issues.
