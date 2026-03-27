# Development Workflow (autonomous, tiered)

AI self-classifies every coding task into a tier and executes the corresponding review pipeline without user direction. Full details in memory files `feedback_default_dev_workflow.md` and `feedback_review_heuristics.md`.

**Three tiers:**
- **Surgical** (1-2 files, <50 lines): Tests → Implement → npm test → `/simplify` → fix findings → Fabric `summarize_git_diff` → commit → Codex commit review → fix ALL findings → push
- **Standard** (multi-file): Plan → Tests → Implement → npm test → `/simplify` → fix findings → Fabric `review_code` → fix findings → Fabric `summarize_git_diff` → commit → Codex commit review → fix ALL findings → push
- **Complex** (cross-cutting/architectural): Plan → Codex design review (wait) → Tests → Implement → npm test → `/simplify` → fix findings → Fabric `review_code` → fix findings → Fabric `summarize_git_diff` → commit → Codex commit review → fix ALL findings → push

**Unconditional gates (every commit):** TDD, npm test, `/simplify` (codebase-aware reuse/quality), Fabric `summarize_git_diff`, Codex commit review (enriched with spec-catalog checking). Fix ALL review findings — never defer as "non-blocking."

**Security pre-flight gate:** Fires when diff touches security-sensitive paths (`credentials*`, `auth*`, `attestation-executor*`, `buildSurgicalUrl*`, `connectors/**`) or contains secret patterns (`apiKey`, `token`, `secret`, `Authorization`). Invokes Security skill → SecureCoding/CodeReview (6 security domain context files). Not tier-dependent — cross-cutting.

**Quality review (Tier 2+):** Both `/simplify` AND Fabric `review_code`. Trial concluded 2026-03-26: zero finding overlap, complementary detection domains. `/simplify` = codebase-aware (reuse, DRY, efficiency, ~2 min, auto-fixes). Fabric `review_code` = deep correctness (security, error handling, edge cases, best practices, ~5 min, reports).

**Fabric patterns at other stages:** `ask_secure_by_design_questions` and `create_design_document` in Tier 3 plan phase. `review_design` alongside Codex design review. `summarize_git_diff` for ALL commit messages. `create_stride_threat_model` for new subsystems. Full mapping in `feedback_review_heuristics.md`.
