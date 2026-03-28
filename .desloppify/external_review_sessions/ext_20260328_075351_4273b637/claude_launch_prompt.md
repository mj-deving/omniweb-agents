# Claude Blind Reviewer Launch Prompt

You are an isolated blind reviewer. Do not use prior chat context, prior score history, or target-score anchoring.

Session id: ext_20260328_075351_4273b637
Session token: d7c2754301cab9058e43ab1ccc2268f2
Blind packet: /home/mj/projects/demos-agents/.desloppify/review_packet_blind.json
Template JSON: /home/mj/projects/demos-agents/.desloppify/external_review_sessions/ext_20260328_075351_4273b637/review_result.template.json
Output JSON path: /home/mj/projects/demos-agents/.desloppify/external_review_sessions/ext_20260328_075351_4273b637/review_result.json

--- Batch 1: test_strategy ---
Rationale: test_strategy review
DIMENSION TO EVALUATE:

## test_strategy
Untested critical paths, coupling, snapshot overuse, fragility patterns
Look for:
- Critical paths with zero test coverage (high-importer files, core business logic)
- Test-production coupling: tests that break when implementation details change
- Snapshot test overuse: >50% of tests are snapshot-based
- Missing integration tests: unit tests exist but no cross-module verification
- Test fragility: tests that depend on timing, ordering, or external state
Skip:
- Low-value files intentionally untested (types, constants, index files)
- Generated code that shouldn't have custom tests

Previously flagged issues — navigation aid, not scoring evidence:
Check whether open issues still exist. Do not re-report resolved or deferred items.
If several past issues share a root cause, call that out.

  Still open (2):
    - [open] src/lib/sources/catalog.ts (698 LOC, 17 importers) has no dedicated test file
    - [open] src/lib/agent-config.ts (571 LOC, 8 importers) has no dedicated test file

Explore past review issues:
  desloppify show review --no-budget              # all open review issues
  desloppify show review --status deferred         # deferred issues

RELEVANT FINDINGS — explore with CLI:
These detectors found patterns related to this dimension. Explore the findings,
then read the actual source code.

  desloppify show test_coverage --no-budget      # 93 findings

Report actionable issues in issues[]. Use concern_verdict and concern_fingerprint
for findings you want to confirm or dismiss.

--- Batch 2: incomplete_migration ---
Rationale: incomplete_migration review
DIMENSION TO EVALUATE:

## incomplete_migration
Old+new API coexistence, deprecated-but-called symbols, stale migration shims
Look for:
- Old and new API patterns coexisting: class+functional components, axios+fetch, moment+dayjs
- Deprecated symbols still called by active code (@deprecated, DEPRECATED markers)
- Compatibility shims that no caller actually needs anymore
- Mixed JS/TS files for the same module (incomplete TypeScript migration)
- Stale migration TODOs: TODO/FIXME referencing 'migrate', 'legacy', 'old api', 'remove after'
Skip:
- Active, intentional migrations with tracked progress
- Backward-compatibility for external consumers (published APIs, libraries)
- Gradual rollouts behind feature flags with clear ownership

Previously flagged issues — navigation aid, not scoring evidence:
Check whether open issues still exist. Do not re-report resolved or deferred items.
If several past issues share a root cause, call that out.

  Still open (3):
    - [open] CLI runners import deprecated legacy write-rate-limit instead of toolkit guards
    - [open] 8 deprecated guard functions exported from index.ts without timeline enforcement
    - [open] 10 re-export shims in src/lib/ persist as deprecated migration artifacts

Explore past review issues:
  desloppify show review --no-budget              # all open review issues
  desloppify show review --status deferred         # deferred issues

RELEVANT FINDINGS — explore with CLI:
These detectors found patterns related to this dimension. Explore the findings,
then read the actual source code.

  desloppify show deprecated --no-budget      # 10 findings

Report actionable issues in issues[]. Use concern_verdict and concern_fingerprint
for findings you want to confirm or dismiss.

--- Batch 3: package_organization ---
Rationale: package_organization review
DIMENSION TO EVALUATE:

## package_organization
Directory layout quality and navigability: whether placement matches ownership and change boundaries
Look for:
- Use holistic_context.structure as objective evidence: root_files (fan_in/fan_out + role), directory_profiles (file_count/avg fan-in/out), and coupling_matrix (cross-directory edges)
- Straggler roots: root-level files with low fan-in (<5 importers) that share concern/theme with other files should move under a focused package
- Import-affinity mismatch: file imports/references are mostly from one sibling domain (>60%), but file lives outside that domain
- Coupling-direction failures: reciprocal/bidirectional directory edges or obvious downstream→upstream imports indicate boundary placement problems
- Flat directory overload: >10 files with mixed concerns and low cohesion should be split into purpose-driven subfolders
- Ambiguous folder naming: directory names do not reflect contained responsibilities
Skip:
- Root-level files that ARE genuinely core — high fan-in (≥5 importers), imported across multiple subdirectories (cli.py, state.py, utils.py, config.py)
- Small projects (<20 files) where flat structure is appropriate
- Framework-imposed directory layouts (src/, lib/, dist/, __pycache__/)
- Test directories mirroring production structure
- Aesthetic preferences without measurable navigation, ownership, or coupling impact

Previously flagged issues — navigation aid, not scoring evidence:
Check whether open issues still exist. Do not re-report resolved or deferred items.
If several past issues share a root cause, call that out.

  Still open (1):
    - [open] src/lib/ has 41 mixed-concern files in flat layout — 4x the 10-file threshold

Explore past review issues:
  desloppify show review --no-budget              # all open review issues
  desloppify show review --status deferred         # deferred issues

RELEVANT FINDINGS — explore with CLI:
These detectors found patterns related to this dimension. Explore the findings,
then read the actual source code.

  desloppify show flat_dirs --no-budget      # 2 findings

Report actionable issues in issues[]. Use concern_verdict and concern_fingerprint
for findings you want to confirm or dismiss.

--- Batch 4: design_coherence ---
Rationale: design_coherence review
DIMENSION TO EVALUATE:

## design_coherence
Are structural design decisions sound — functions focused, abstractions earned, patterns consistent?
Look for:
- Functions doing too many things — multiple distinct responsibilities in one body
- Parameter lists that should be config/context objects — many related params passed together
- Files accumulating issues across many dimensions — likely mixing unrelated concerns
- Deep nesting that could be flattened with early returns or extraction
- Repeated structural patterns that should be data-driven
Skip:
- Functions that are long but have a single coherent responsibility
- Parameter lists where grouping would obscure meaning — do NOT recommend config/context objects or dependency injection wrappers just to reduce parameter count; only group when the grouping has independent semantic meaning
- Files that are large because their domain is genuinely complex, not because they mix concerns
- Nesting that is inherent to the problem (e.g., recursive tree processing)
- Do NOT recommend extracting callable parameters or injecting dependencies for 'testability' — direct function calls are simpler and preferred unless there is a concrete decoupling need

Previously flagged issues — navigation aid, not scoring evidence:
Check whether open issues still exist. Do not re-report resolved or deferred items.
If several past issues share a root cause, call that out.

  Still open (16):
    - [open] 26 orphaned files totaling 3500+ LOC have zero importers
    - [open] attestation-executor.ts is 119 LOC orphaned file with zero importers
    - [open] omniweb-action-executor.ts is 292 LOC orphaned file with zero importers
    - [open] colony-intelligence.ts is 237 LOC orphaned file with zero importers
    - [open] mentions.ts is 148 LOC orphaned file with zero importers
    - [open] transcript.ts is 175 LOC orphaned file with zero importers
    - [open] tx-queue.ts is 121 LOC orphaned file with zero importers
    - [open] budget-plugin.ts is 58 LOC orphaned file with zero importers
    - [open] network/sdk.ts has catch block returning default object — silent failure
    - [open] network/skill-dojo-client.ts has catch block returning default object
    - [open] state.ts has 8 as-any casts fighting Record<PhaseName, PhaseState> type
    - [open] tlsn-playwright-bridge.ts has 13 as-any casts for untyped Demos SDK methods
    - [open] sources/health.ts has catch block returning default object
    - [open] lifecycle.ts has high cyclomatic complexity (>15 branches)
    - [open] pipeline/signals.ts has 4 explicit any types
    - [open] pipeline/source-discovery.ts has 4 explicit any types

Explore past review issues:
  desloppify show review --no-budget              # all open review issues
  desloppify show review --status deferred         # deferred issues

Mechanical concern signals — investigate and adjudicate:
Overview (28 signals):
  design_concern: 24 — src/actions/attestation-executor.ts, src/lib/attestation/claim-extraction.ts, ...
  duplication_design: 1 — src/actions/publish-pipeline.ts
  mixed_responsibilities: 1 — src/actions/action-executor.ts
  systemic_pattern: 1 — src/lib/agent-config.ts
  systemic_smell: 1 — src/lib/auth/identity.ts

For each concern, read the source code and report your verdict in issues[]:
  - Confirm → full issue object with concern_verdict: "confirmed"
  - Dismiss → minimal object: {concern_verdict: "dismissed", concern_fingerprint: "<hash>"}
    (only these 2 fields required — add optional reasoning/concern_type/concern_file)
  - Unsure → skip it (will be re-evaluated next review)

  - [design_concern] src/actions/attestation-executor.ts
    summary: Design signals from orphaned, smells
    question: Is this file truly dead, or is it used via a non-import mechanism (dynamic import, CLI entry point, plugin)?
    evidence: Flagged by: orphaned, smells
    evidence: [orphaned] Orphaned file (119 LOC): zero importers, not an entry point
    fingerprint: 56951e0173d7bbe2
  - [design_concern] src/lib/attestation/claim-extraction.ts
    summary: Design signals from smells
    question: Review the flagged patterns — are they design problems that need addressing, or acceptable given the file's role?
    evidence: Flagged by: smells
    evidence: [smells] 2x Explicit `any` types
    fingerprint: 276637d79893f68f
  - [design_concern] src/lib/extensions.ts
    summary: Design signals from cycles, facade
    question: Review the flagged patterns — are they design problems that need addressing, or acceptable given the file's role?
    evidence: Flagged by: cycles, facade
    evidence: [cycles] Import cycle (3 files): src/lib/extensions.ts -> src/lib/util/extensions.ts -> src/plugins/calibrate-plugin.ts
    fingerprint: 1bf40c4f8c2f4c43
  - [design_concern] src/lib/mentions.ts
    summary: Design signals from orphaned, smells
    question: Is this file truly dead, or is it used via a non-import mechanism (dynamic import, CLI entry point, plugin)?
    evidence: Flagged by: orphaned, smells
    evidence: [orphaned] Orphaned file (148 LOC): zero importers, not an entry point
    fingerprint: 2c54138f0c5c11b9
  - [design_concern] src/lib/network/sdk.ts
    summary: Design signals from smells
    question: Review the flagged patterns — are they design problems that need addressing, or acceptable given the file's role?
    evidence: Flagged by: smells
    evidence: [smells] 1x Catch block returns default object (silent failure)
    fingerprint: d2b0d8fa890b94fe
  - [design_concern] src/lib/network/skill-dojo-client.ts
    summary: Design signals from smells
    question: Review the flagged patterns — are they design problems that need addressing, or acceptable given the file's role?
    evidence: Flagged by: smells
    evidence: [smells] 1x Catch block returns default object (silent failure)
    fingerprint: 560639143b64bef0
  - [design_concern] src/lib/pipeline/engage-heuristics.ts
    summary: Design signals from smells
    question: Review the flagged patterns — are they design problems that need addressing, or acceptable given the file's role?
    evidence: Flagged by: smells
    evidence: [smells] 2x Explicit `any` types
    fingerprint: 164dc3b3503fa619
  - [design_concern] src/lib/pipeline/observe.ts
    summary: Design signals from smells
    question: Review the flagged patterns — are they design problems that need addressing, or acceptable given the file's role?
    evidence: Flagged by: smells
    evidence: [smells] 1x Magic numbers (>1000 in logic)
    fingerprint: 2adaa63ec7a31e8a
  - [design_concern] src/lib/pipeline/signals.ts
    summary: Design signals from smells
    question: Review the flagged patterns — are they design problems that need addressing, or acceptable given the file's role?
    evidence: Flagged by: smells
    evidence: [smells] 4x Explicit `any` types
    fingerprint: 99037fdeeada6bb8
  - [design_concern] src/lib/pipeline/source-discovery.ts
    summary: Design signals from smells
    question: Review the flagged patterns — are they design problems that need addressing, or acceptable given the file's role?
    evidence: Flagged by: smells
    evidence: [smells] 4x Explicit `any` types
    fingerprint: 66c05d8b32241962
  - [design_concern] src/lib/predictions.ts
    summary: Design signals from orphaned, smells
    question: Is this file truly dead, or is it used via a non-import mechanism (dynamic import, CLI entry point, plugin)?
    evidence: Flagged by: orphaned, smells
    evidence: [orphaned] Orphaned file (391 LOC): zero importers, not an entry point
    fingerprint: 113391782ba4882e
  - [design_concern] src/lib/sources/health.ts
    summary: Design signals from smells
    question: Review the flagged patterns — are they design problems that need addressing, or acceptable given the file's role?
    evidence: Flagged by: smells
    evidence: [smells] 1x Catch block returns default object (silent failure)
    fingerprint: 09c163c567167a97
  - [design_concern] src/lib/sources/lifecycle.ts
    summary: Design signals from smells
    question: Review the flagged patterns — are they design problems that need addressing, or acceptable given the file's role?
    evidence: Flagged by: smells
    evidence: [smells] 1x High cyclomatic complexity (>15 branches)
    fingerprint: 5d9cd2397d3dc949
  - [design_concern] src/lib/state.ts
    summary: Design signals from smells
    question: Review the flagged patterns — are they design problems that need addressing, or acceptable given the file's role?
    evidence: Flagged by: smells
    evidence: [smells] 8x `as any` type casts
    fingerprint: 15c25f166a4753c3
  - [design_concern] src/lib/tips.ts
    summary: Design signals from orphaned, smells
    question: Is this file truly dead, or is it used via a non-import mechanism (dynamic import, CLI entry point, plugin)?
    evidence: Flagged by: orphaned, smells
    evidence: [orphaned] Orphaned file (443 LOC): zero importers, not an entry point
    fingerprint: c59f6576bc09e56b
  - [design_concern] src/lib/tlsn-playwright-bridge.ts
    summary: Design signals from smells
    question: Review the flagged patterns — are they design problems that need addressing, or acceptable given the file's role?
    evidence: Flagged by: smells
    evidence: [smells] 13x `as any` type casts
    fingerprint: f66bc965a2bac8a7
  - [design_concern] src/lib/transcript.ts
    summary: Design signals from orphaned, smells
    question: Is this file truly dead, or is it used via a non-import mechanism (dynamic import, CLI entry point, plugin)?
    evidence: Flagged by: orphaned, smells
    evidence: [orphaned] Orphaned file (175 LOC): zero importers, not an entry point
    fingerprint: 3d0801ef220d2211
  - [design_concern] src/lib/util/extensions.ts
    summary: Design signals from cycles, smells
    question: Review the flagged patterns — are they design problems that need addressing, or acceptable given the file's role?
    evidence: Flagged by: cycles, smells
    evidence: [smells] 1x Switch without default case
    fingerprint: 62f5f3833bcfe61d
  - [design_concern] src/plugins/lifecycle-plugin.ts
    summary: Design signals from smells
    question: Review the flagged patterns — are they design problems that need addressing, or acceptable given the file's role?
    evidence: Flagged by: smells
    evidence: [smells] 1x High cyclomatic complexity (>15 branches)
    fingerprint: 488c0f3f5e5d4f57
  - [design_concern] src/reactive/event-sources/sse-feed.ts
    summary: Design signals from orphaned, smells
    question: Is this file truly dead, or is it used via a non-import mechanism (dynamic import, CLI entry point, plugin)?
    evidence: Flagged by: orphaned, smells
    evidence: [orphaned] Orphaned file (244 LOC): zero importers, not an entry point
    fingerprint: c7b250c38e95483b
  - [design_concern] src/toolkit/guards/dedup-guard.ts
    summary: Design signals from smells
    question: Review the flagged patterns — are they design problems that need addressing, or acceptable given the file's role?
    evidence: Flagged by: smells
    evidence: [smells] 1x Async functions without await
    fingerprint: 0c4f3d09d44730fb
  - [design_concern] src/toolkit/guards/write-rate-limit.ts
    summary: Design signals from smells
    question: Review the flagged patterns — are they design problems that need addressing, or acceptable given the file's role?
    evidence: Flagged by: smells
    evidence: [smells] 1x Async functions without await
    fingerprint: a6607fda209ce4d1
  - [design_concern] src/toolkit/sdk-bridge.ts
    summary: Design signals from smells
    question: Review the flagged patterns — are they design problems that need addressing, or acceptable given the file's role?
    evidence: Flagged by: smells
    evidence: [smells] 1x Catch block returns default object (silent failure)
    fingerprint: 3965224138dd1f19
  - [design_concern] src/toolkit/tools/scan.ts
    summary: Design signals from smells
    question: Review the flagged patterns — are they design problems that need addressing, or acceptable given the file's role?
    evidence: Flagged by: smells
    evidence: [smells] 1x Async functions without await
    fingerprint: 9c14840d40c65d85
  - [duplication_design] src/actions/publish-pipeline.ts
    summary: Duplication pattern — assess if extraction is warranted
    question: Is the duplication worth extracting into a shared utility, or is it intentional variation?
    evidence: Flagged by: dupes, smells
    evidence: [smells] 6x Explicit `any` types
    fingerprint: f9cc9607cbc7cd87
  - [mixed_responsibilities] src/actions/action-executor.ts
    summary: Issues from 3 detectors — may have too many responsibilities
    question: This file has issues across 3 dimensions (orphaned, props, smells). Is it trying to do too many things, or is this complexity inherent to its domain? Is this file truly dead, or is it used via a non-import mechanism (dynamic import, CLI entry point, plugin)?
    evidence: Flagged by: orphaned, props, smells
    evidence: [props] Bloated context: ActionExecutorContext (22 fields)
    fingerprint: 8402699e80d43225
  - [systemic_pattern] src/lib/agent-config.ts
    summary: 5 files share the same problem pattern (smells, structural)
    question: These 5 files all have the same combination of issues (smells, structural). Is this a systemic pattern that should be addressed at the architecture level (shared base class, framework change, lint rule), or are these independent issues that happen to look similar?
    evidence: Affected files: src/lib/agent-config.ts, src/lib/pipeline/signal-detection.ts, src/lib/sources/catalog.ts, src/lib/sources/matcher.ts, src/lib/sources/providers/declarative-engine.ts
    evidence: Shared detectors: smells, structural
    fingerprint: ac32950677f7ed98
  - [systemic_smell] src/lib/auth/identity.ts
    summary: 'hardcoded_url' appears in 6 files — likely a systemic pattern
    question: The smell 'hardcoded_url' appears across 6 files. Is this a codebase-wide convention that should be addressed systemically (lint rule, shared utility, architecture change), or are these independent occurrences?
    evidence: Smell: hardcoded_url
    evidence: Affected files (6): src/lib/auth/identity.ts, src/lib/network/sdk.ts, src/lib/network/skill-dojo-client.ts, src/lib/pipeline/source-discovery.ts, src/lib/tlsn-playwright-bridge.ts, src/plugins/sdk-setup-plugin.ts
    fingerprint: f87a4a13d6a59df8

RELEVANT FINDINGS — explore with CLI:
These detectors found patterns related to this dimension. Explore the findings,
then read the actual source code.

  desloppify show cycles --no-budget      # 2 findings
  desloppify show dupes --no-budget      # 1 findings
  desloppify show facade --no-budget      # 1 findings
  desloppify show orphaned --no-budget      # 7 findings
  desloppify show props --no-budget      # 1 findings
  desloppify show smells --no-budget      # 130 findings
  desloppify show structural --no-budget      # 5 findings
  desloppify show unused --no-budget      # 26 findings

Report actionable issues in issues[]. Use concern_verdict and concern_fingerprint
for findings you want to confirm or dismiss.

--- Batch 5: type_safety ---
Rationale: type_safety review
DIMENSION TO EVALUATE:

## type_safety
Type annotations that match runtime behavior
Look for:
- Return type annotations that don't cover all code paths (e.g., -> str but can return None)
- Parameters typed as X but called with Y (e.g., str param receiving None)
- Union types that could be narrowed (Optional used where None is never valid)
- Missing annotations on public API functions
- Type: ignore comments without explanation
- TypedDict fields marked Required but accessed via .get() with defaults — the type promises a shape the code doesn't trust
- Parameters typed as dict[str, Any] where a specific TypedDict or dataclass exists
- Enum types defined in the codebase but bypassed with raw string or int literal comparisons — see enum_bypass_patterns evidence
- Parallel type definitions: a Literal alias that duplicates an existing enum's values
Skip:
- Untyped private helpers in well-typed modules
- Dynamic framework code where typing is impractical
- Test code with loose typing

Previously flagged issues — navigation aid, not scoring evidence:
Check whether open issues still exist. Do not re-report resolved or deferred items.
If several past issues share a root cause, call that out.

  Still open (2):
    - [open] tlsn-playwright-bridge.ts has 13 as-any casts for untyped SDK surface
    - [open] state.ts uses 8 as-any casts for phase record manipulation

Explore past review issues:
  desloppify show review --no-budget              # all open review issues
  desloppify show review --status deferred         # deferred issues

## Execution Constraints

Never suggest changes that:
- Do not extract code into new files or functions that would have exactly 1 consumer
- Do not use __internal or _test export hacks — test through the public API or export properly
- Do not rename for convention alone when no ambiguity exists
- Do not delete tests without equivalent replacement coverage
- Do not strip rationale comments — preserve comments explaining why, not what
- Refactors must preserve behavior — do not change test expectations in cleanup steps
- Net line count must decrease or stay flat in cleanup commitsYOUR TASK: Read the code for this batch's dimension. Judge how well the codebase serves a developer from that perspective. The dimension rubric above defines what good looks like. Cite specific observations that explain your judgment.

Mechanical scan evidence — navigation aid, not scoring evidence:
The blind packet contains `holistic_context.scan_evidence` with aggregated signals from all mechanical detectors — including complexity hotspots, error hotspots, signal density index, boundary violations, and systemic patterns. Use these as starting points for where to look beyond the seed files.

Phase 1 — Observe:
1. Read the blind packet's `system_prompt` — scoring rules and calibration.
2. Study the dimension rubric (description, look_for, skip).
3. Review the existing characteristics list — which are settled? Which are positive? What needs updating?
4. Explore the codebase freely. Use scan evidence, historical issues, and mechanical findings as navigation aids.
5. Adjudicate mechanical concern signals (confirm/dismiss with fingerprint).
6. Augment the characteristics list via context_updates: positive patterns (positive: true), neutral characteristics, design insights.
7. Collect defects for issues[].
8. Respect scope controls: exclude files/directories marked by `exclude`, `suppress`, or non-production zone overrides.
9. Output a Phase 1 summary: list ALL characteristics for this dimension (existing + new, mark [+] for positive) and all defects collected. This is your consolidated reference for Phase 2.

Phase 2 — Judge (after Phase 1 is complete):
10. Keep issues and scoring scoped to this batch's dimension.
11. Return 0-50 issues for this batch (empty array allowed).
12. For package_organization, ground scoring in objective structure signals from `holistic_context.structure` (root_files fan_in/fan_out roles, directory_profiles, coupling_matrix). Prefer thresholded evidence (for example: fan_in < 5 for root stragglers, import-affinity > 60%, directories > 10 files with mixed concerns).
13. Suggestions must include a staged reorg plan (target folders, move order, and import-update/validation commands).
14. Also consult `holistic_context.structure.flat_dir_issues` for directories flagged as overloaded, fragmented, or thin-wrapper patterns.
15. For design_coherence, use evidence from `holistic_context.scan_evidence.signal_density` — files where multiple mechanical detectors fired. Investigate what design change would address multiple signals simultaneously. Check `scan_evidence.complexity_hotspots` for files with high responsibility cluster counts.
16. Workflow integrity checks: when reviewing orchestration/queue/review flows,
17. xplicitly look for loop-prone patterns and blind spots:
18. - repeated stale/reopen churn without clear exit criteria or gating,
19. - packet/batch data being generated but dropped before prompt execution,
20. - ranking/triage logic that can starve target-improving work,
21. - reruns happening before existing open review work is drained.
22. If found, propose concrete guardrails and where to implement them.
23. Complete `dimension_judgment`: write dimension_character (synthesizing characteristics and defects) then score_rationale. Set the score LAST.
24. Output context_updates with your Phase 1 observations. Use `add` with a clear header (5-10 words) and description (1-3 sentences focused on WHY, not WHAT). Positive patterns get `positive: true`. New insights can be `settled: true` when confident. Use `settle` to promote existing unsettled insights. Use `remove` for insights no longer true. Omit context_updates if no changes.
25. Do not edit repository files.
26. Return ONLY valid JSON, no markdown fences.

Scope enums:
- impact_scope: "local" | "module" | "subsystem" | "codebase"
- fix_scope: "single_edit" | "multi_file_refactor" | "architectural_change"

Output schema:
{
  "session": {"id": "<preserve from template>", "token": "<preserve from template>"},
  "assessments": {"<dimension>": <0-100 with one decimal place>},
  "dimension_notes": {
    "<dimension>": {
      "evidence": ["specific code observations"],
      "impact_scope": "local|module|subsystem|codebase",
      "fix_scope": "single_edit|multi_file_refactor|architectural_change",
      "confidence": "high|medium|low"
    }
  },
  "dimension_judgment": {
    "<dimension>": {
      "dimension_character": "2-3 sentences characterizing the overall nature of this dimension, synthesizing both positive characteristics and defects",
      "score_rationale": "2-3 sentences explaining the score, referencing global anchors"
    }
  },
  "issues": [{
    "dimension": "<dimension>",
    "identifier": "short_id",
    "summary": "one-line defect summary",
    "related_files": ["relative/path.py"],
    "evidence": ["specific code observation"],
    "suggestion": "concrete fix recommendation",
    "confidence": "high|medium|low",
    "impact_scope": "local|module|subsystem|codebase",
    "fix_scope": "single_edit|multi_file_refactor|architectural_change",
    "root_cause_cluster": "optional_cluster_name",
    "concern_verdict": "confirmed|dismissed  // for concern signals only",
    "concern_fingerprint": "abc123  // required when dismissed; copy from signal fingerprint",
    "reasoning": "why dismissed  // optional, for dismissed only"
  }],
  "context_updates": {
    "<dimension>": {
      "add": [{"header": "short label", "description": "why this is the way it is", "settled": true|false, "positive": true|false}],
      "remove": ["header of insight to remove"],
      "settle": ["header of insight to mark as settled"],
      "unsettle": ["header of insight to unsettle"]
    }  // omit or leave empty when no context changes
  }
}

Session requirements:
1. Keep `session.id` exactly `ext_20260328_075351_4273b637`.
2. Keep `session.token` exactly `d7c2754301cab9058e43ab1ccc2268f2`.
3. Do not include provenance metadata (CLI injects canonical provenance).

