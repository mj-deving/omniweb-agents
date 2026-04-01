# Source Registry v2 — Codex Review

> Reviewed by: OpenAI Codex (gpt-5.3-codex)
> Date: 2026-03-13
> Plan: Plans/source-registry-v2.md

## Findings (ordered by severity)

### Critical

1. **Untrusted auto-discovered sources can be used before quarantine/testing.**
   - Discovery is integrated as runtime fallback, but discovered sources seeded at rating 50 are immediately eligible (min_source_rating: 50).
   - No explicit quarantine state, trust tier, or allowlist checks defined.
   - Risk: SSRF-like fetch targets, low-quality evidence injection, hostile endpoints.

2. **Lifecycle state model is internally inconsistent (`discovered` state referenced but not in enum).**
   - `status` enum excludes `discovered`, but lifecycle diagram and Phase 5 depend on it.
   - Will cause schema/runtime mismatch.

3. **DAHR format assumptions conflict with current attestation guardrails.**
   - Plan marks XML/RSS/HTML as first-class formats and lists arXiv/PubMed as DAHR-safe.
   - Current DAHR path rejects XML/HTML/non-JSON responses outright.
   - Many planned sources will fail at publish without a normalization layer.

4. **Rating design rewards engagement over evidence quality.**
   - `engagement` at 20% weight with no per-topic normalization.
   - Viral topics over-promote sources vs reliable niche sources.
   - Combined with discovered default 50 = min threshold 50, weak sources enter production.

### High

5. **Post-generation matcher thresholds inconsistent (40 vs 60+).**
   - No regenerate/rewrite loop when no source substantiates the draft.

6. **Claim extraction too brittle for factual substantiation.**
   - Regex misses entity normalization, units, negation, time windows.
   - Matches topical overlap without proving exact factual support.

7. **Generic adapter fallback undermines safety guarantees.**
   - Bypasses endpoint constraints (params, size limits, freshness parsing).

8. **No concurrency/locking for parallel testing + catalog writes.**

9. **Phase ordering gap: testing depends on adapters but is scheduled before them.**
   - Recommended: Foundation → Adapters → Testing/Rating → Content Matcher → Lifecycle → Discovery.

### Medium

10. **Data model missing fields:**
    - Request contract: httpMethod, headers, query defaults, placeholder schema
    - Operational: timeout, retry/backoff, rate-limit bucket key
    - Evidence: freshness-field mapping, timestamp path, unit normalization
    - Safety: trust tier, source type, legal/ToS, allowlisted domain
    - Observability: last status code, latency percentiles, consecutive failures

11. **Lifecycle may permanently lose useful long-tail sources.**
    - No archive/reactivation or topic-coverage safeguard.

12. **Performance claims overstated (not strictly O(1)).**
    - End-to-end includes tokenization, alias expansion, filtering, ranking = O(m + k).

13. **Missing test plan.**
    - Migration parity tests (old YAML vs new catalog)
    - Provider adapter contract tests with fixtures
    - Matcher precision/recall benchmarks
    - Discovery security tests (loopback/private-IP/oversized/compressed)
    - Concurrency tests for parallel rating updates

## Open Questions

1. What is the hard trust policy for discovered URLs before first attestation?
2. Should discovered sources require at least one health check + claim match before selection?
3. Is DAHR expected to support XML/RSS via normalization, or JSON-only?
4. When post-generation matching fails: regenerate constrained to sources, or drop?
5. How to normalize engagement across topic/domain volatility?
6. What lock/transaction protects catalog.json under concurrent writes?
7. Should lifecycle include `quarantined` state for newly discovered sources?

## Summary

| Question | Codex Assessment |
|----------|-----------------|
| Data model complete? | No — missing request contract, safety/governance, observability fields |
| Post-gen matching sound? | Directionally correct. Better: two-pass (pre-retrieve top-K → generate with citation constraints → post-verify) |
| Phase ordering correct? | Needs reorder: Adapters before Testing (testing quality depends on adapters) |
| Security concerns? | High risk without URL/domain/IP controls, quarantine, mandatory pre-use validation |
| Rating weights correct? | Engagement overweighted at 20%. Reduce and normalize by domain |
| What's missing? | Security model, locking model, rollback strategy, migration parity gates, matcher eval criteria |
