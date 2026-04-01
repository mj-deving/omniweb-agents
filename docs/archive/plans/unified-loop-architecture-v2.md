# Unified Loop Architecture v2

> Lean core loop + decomposed skill concerns. Replaces the monolithic 8-phase loop
> with a 3-phase core and opt-in extensions.
>
> **This document is the single source of truth.** Where subplans conflict with values
> specified here (thresholds, enums, weights), this document takes precedence.
> Subplans should be updated to match before implementation begins.

**Date:** 2026-03-13 (Phase 3 updated 2026-03-13)
**Status:** Phases 0A-2 complete. Phase 3 spec finalized (Codex-reviewed, decisions made).
**Subplans referenced:**
- `Plans/loop-v2-optimization.md` — runtime efficiency, scan profiles, retry policy
- `Plans/source-registry-v2.md` — source catalog, discovery, testing, content matching
- `Plans/source-registry-v2-review.md` — Codex review findings (13 items)
- `claude-codex-coop/REVIEW-phase3.md` — Phase 3 design review (10 findings)

**Reviews:**
- 2026-03-13: Codex (gpt-5.3-codex) architectural review — 8 findings, 5 questions. All addressed below.
- 2026-03-13: Codex (gpt-5.3-codex) Phase 3 design review — 3 P0, 3 P1, 3 P2, 1 P3. All addressed in Phase 3 spec.

## The Problem

The current session-runner.ts hardcodes an 8-phase sequential loop:

```
AUDIT → SCAN → ENGAGE → GATE → PUBLISH → VERIFY → REVIEW → HARDEN
```

Issues:
1. **Overfit** — every agent runs all 8 phases regardless of need
2. **Source registry tangled into core** — gate pre-check, source discovery, attestation policy all inline
3. **Review/harden per-session** — often no-ops in autonomous mode, wasting time
4. **base-loop.yaml unused** — `extends:` in strategy.yaml never parsed by runtime
5. **No extensibility** — adding a new concern means editing session-runner.ts

## Architecture: 3-Phase Core + Extensions

### Core Loop (mandatory, every agent, every session)

```
┌──────────┐     ┌─────────────────────────────────┐     ┌──────────┐
│  SENSE   │ ──> │              ACT                 │ ──> │ CONFIRM  │
│          │     │                                   │     │          │
│ • feed   │     │ ┌─────────┐ ┌──────┐ ┌────────┐ │     │ • verify │
│ • scan   │     │ │ engage  │→│ gate │→│publish │ │     │   posts  │
│ • score  │     │ └─────────┘ └──────┘ └────────┘ │     │ • log    │
│          │     │  substage    substage  substage  │     │   results│
└──────────┘     └─────────────────────────────────┘     └──────────┘
```

**SENSE** = current SCAN. Read the environment. Output: ranked opportunities, room temperature.
**ACT** = current ENGAGE + GATE + PUBLISH, organized as three named **substages** with independent telemetry.
**CONFIRM** = current VERIFY. Verify actions landed. Log results to session log.

### ACT Substage Telemetry (Codex finding #4)

GATE folds into ACT but retains first-class observability. Each substage emits:

```typescript
interface SubstageResult {
  substage: "engage" | "gate" | "publish";
  status: "success" | "skipped" | "failed";
  durationMs: number;
  failureCode?: string;     // e.g., "GATE_DUPLICATE", "PUBLISH_TLSN_TIMEOUT"
  detail?: string;          // human-readable context
}

// Failure codes per substage (from loop-v2 P0.2):
// engage: ENGAGE_NO_TARGETS, ENGAGE_RATE_LIMITED
// gate:   GATE_DUPLICATE, GATE_LOW_SIGNAL, GATE_NO_SOURCE, GATE_NOVELTY_FAIL
// publish: PUBLISH_TLSN_TIMEOUT, PUBLISH_DAHR_REJECT, PUBLISH_NO_MATCHING_SOURCE,
//          PUBLISH_LLM_FAIL, PUBLISH_BROADCAST_FAIL, PUBLISH_INDEXER_FAIL
```

The session report aggregates substage metrics. The phase-level budget wraps all three
substages with a combined timeout.

### Extensions (opt-in per agent)

Extensions hook into the core loop at defined points. Agents declare which extensions
they use in their strategy.yaml. The session-runner invokes them if present.

```yaml
# agents/sentinel/strategy.yaml (new format)
loop:
  extensions:
    - calibrate        # runs before SENSE
    - sources          # runs during ACT (preflight + match)
    - observe          # inline during all phases (lightweight)
  # note: no 'improve' — that's an on-demand skill, not a loop extension
```

#### Extension: `calibrate`

**Hook point:** Before SENSE
**What:** Fetches scores/reactions for previous posts, updates prediction offset.
**Currently:** The AUDIT phase.
**Why optional:** A new agent with no history doesn't need this. An agent running a
quick scan-only session doesn't need it. Pioneer could skip it on sessions focused
on pure signal hunting.

#### Extension: `sources`

**Hook point:** During ACT (two touchpoints)
1. **Pre-draft:** `sources.preflight(topic)` — fast check that an attestable source exists
2. **Post-draft:** `sources.match(postText, postTags)` — find source that substantiates the post

**Runtime API** (read-path only, safe for hot loop):
```typescript
// tools/lib/sources/index.ts — runtime exports
export { preflight } from "./policy.js";    // topic → boolean + reason
export { match } from "./matcher.js";        // post + tags → best source
```

**Admin API** (maintenance-path, separate import, never called from session loop):
```typescript
// tools/lib/sources/admin.ts — maintenance exports
export { discover } from "./discovery.js";   // topic → candidate sources
export { test } from "./testing.js";         // source → health check result
export { updateRatings } from "./rating.js"; // batch rating update
```

This separation prevents accidental latency coupling — discover/test can do network
calls, retries, and file writes that would be unsafe in the publish hot path.
(Codex finding #5)

**Currently:** Scattered across attestation-policy.ts, source-discovery.ts, gate pre-check in session-runner.ts.
**Extraction:** Becomes a standalone module with two API boundaries (runtime vs admin).

Full design: `Plans/source-registry-v2.md` (with Codex review adjustments below).

#### Extension: `observe`

**Hook point:** Inline during all phases (lightweight append-only)
**What:** When the loop notices something noteworthy — an error, an inefficiency, a pattern,
a source failure — it appends a structured entry to the observation log.
**Currently:** Split across REVIEW (Q1-Q4 questions) and HARDEN (classification).

**Observation log format:**

```jsonl
{"id":"obs-16-1741871400-a3f2","ts":"2026-03-13T14:30:00Z","session":16,"phase":"act","substage":"publish","type":"error","text":"TLSN timeout after 180s on hn-algolia","source":"publish-pipeline.ts:234","resolved":null}
{"id":"obs-16-1741871460-b7e1","ts":"2026-03-13T14:31:00Z","session":16,"phase":"act","substage":"publish","type":"pattern","text":"DAHR fallback succeeded in 3.2s","source":"publish-pipeline.ts:290","resolved":null}
{"id":"obs-16-1741871700-c9d4","ts":"2026-03-13T14:35:00Z","session":16,"phase":"confirm","substage":null,"type":"insight","text":"Reply to high-rx parent got 5rx in 2min","source":"session-runner.ts:1450","resolved":null}
```

**Location:** `~/.{agent}/observations.jsonl` (append-only, per-agent)

**Entry schema:**
```typescript
interface Observation {
  id: string;             // deterministic: "obs-{session}-{unixSec}-{4hex}"
  ts: string;             // ISO timestamp
  session: number;        // session number
  phase: string;          // which core phase noticed this
  substage?: string;      // ACT substage if applicable (engage/gate/publish)
  type: "error" | "pattern" | "insight" | "inefficiency" | "source-issue";
  text: string;           // human-readable description (one line)
  source?: string;        // file:line that triggered it
  data?: unknown;         // optional structured data (timing, counts, etc.)
  resolved?: string | null; // null = unresolved, ISO timestamp = when resolved
}
```

**ID generation:** `obs-${session}-${Math.floor(Date.now()/1000)}-${crypto.randomBytes(2).toString('hex')}`

Deterministic enough for dedup (session + timestamp), random suffix for collisions.
The `resolved` field is set by the improve skill when an observation is acted on.
(Codex finding #2)

**Dedup/reopen semantics:**
- Observations with same `type` + normalized `text` (lowercase, strip numbers) within
  a sliding window (5 sessions) are grouped into one **issue** by the improve skill.
- A resolved observation can be reopened if the same pattern recurs after resolution.
- The improve skill writes a resolution entry linking `observation.id` → `improvement.id`.

**How code emits observations:**
```typescript
import { observe } from "./lib/observe.js";

// Anywhere in the loop:
observe("error", "TLSN timeout after 180s on hn-algolia", {
  phase: "act",
  substage: "publish",
  source: "publish-pipeline.ts:234",
  data: { timeoutMs: 180000, endpoint: "hn-algolia" }
});
```

Lightweight. No LLM. No classification. Just structured append. The classification
happens later, on demand, in the improve skill.

### On-Demand: `improve` Skill

**NOT a loop extension. A separate skill invoked when the operator wants to improve.**

```bash
# Read observations, classify, propose fixes
npx tsx tools/improve.ts --agent sentinel --since 5-sessions-ago --pretty

# Auto-apply safe fixes (CODE-FIX, GUARDRAIL)
npx tsx tools/improve.ts --agent sentinel --auto-apply --dry-run

# Show unresolved observations
npx tsx tools/improve.ts --agent sentinel --unresolved

# Show observation history for a specific issue
npx tsx tools/improve.ts --agent sentinel --trace obs-16-1741871400-a3f2
```

**What it does:**
1. Reads `observations.jsonl` (filtered by recency, type, or unresolved status)
2. Groups related observations by fingerprint (same type + normalized text within 5-session window) into **issues**
3. Classifies issues using LLM: CODE-FIX | GUARDRAIL | STRATEGY | INFO (same taxonomy as current HARDEN)
4. For CODE-FIX and GUARDRAIL: proposes specific changes (or auto-applies with --auto-apply)
5. For STRATEGY: presents evidence to operator, asks for approval
6. Marks resolved observations with timestamp and links to improvement ID
7. Detects reopened issues (same fingerprint recurring after resolution)

**Relationship to improvements.ts:**
The existing improvements.ts tracker (proposed → approved → applied → verified) stays.
The improve skill writes to it. The observation log is the _input_; the improvements
tracker is the _output_. Current REVIEW+HARDEN do both in one pass — we're separating
them into write (observe) and read+act (improve).

```
CURRENT:
  loop → REVIEW (generate findings) → HARDEN (classify + propose)

NEW:
  loop → observe() calls inline (generate findings as they happen)
  operator → improve skill on demand (classify + propose + apply)
```

## Canonical Source Data Contract (Codex finding #1)

**This is the authoritative enum.** `source-registry-v2.md` must be updated to match before coding.

```typescript
type SourceStatus =
  | "quarantined"   // auto-discovered, not yet validated — 3 successful tests to promote
  | "active"        // healthy, eligible for runtime use
  | "degraded"      // rating < 40 or 3 consecutive failures — auto-retry daily
  | "stale"         // 14 days degraded, no recovery — weekly retry
  | "deprecated"    // 30 days stale — no retries, manual reactivate only
  | "archived";     // manually removed but preserved for reactivation (Codex finding #11)
```

**Lifecycle transitions:**
```
quarantined ──(3 tests pass)──> active
active ──(rating < 40 or 3 fails)──> degraded
degraded ──(14 days, no recovery)──> stale
stale ──(30 days)──> deprecated
any ──(manual)──> archived
archived ──(manual)──> quarantined (re-enters validation)
```

**Authoritative thresholds (Codex finding #7):**
- Content match threshold: **50** (unified, supersedes 40 and 60+ in subplan)
- Engagement rating weight: **10%** (down from 20%, with per-topic normalization)
- Rating formula: uptime 25% + relevance 30% + freshness 15% + sizeStability 10% + engagement 10% + trustTier 10%

## base-loop.yaml Disposition

**Decision: Delete.** It's never parsed by runtime. The 4-phase concept (OBSERVE → ACT → VERIFY → LEARN)
was directionally correct but became dead documentation when the 8-phase runner was built.
The new architecture supersedes it with a 3-phase core that's actually enforced by code.

The `extends:` and `basePhase:` fields in agent strategy.yaml files should be removed
during migration. Agent strategy files will use the new `loop.extensions` format.

## Subplan Integration

### From `loop-v2-optimization.md`

| Item | Assigned to | Implementation phase | Notes |
|------|------------|---------------------|-------|
| P0.1 Publish preflight | **sources (current loop)** | **Phase 0A** | Ships into current 8-phase loop first |
| P0.2 Phase budgets/taxonomy | **core loop (current)** | **Phase 0B** | Ships into current 8-phase loop first |
| P1.3 Scan profiles (fast/deep) | **core loop (SENSE)** | Phase 2 | Agent config declares scan profile |
| P1.4 Endpoint health tracking | **core loop (SENSE)** | Phase 2 | Skip failing endpoints within a scan |
| P2.5 Cross-sourced evidence | **sources extension** | Phase 5 | Evidence diversity as content matcher signal |
| P2.6 Safety hard, opportunity soft | **core loop (ACT)** | — | Already implemented; validate in new arch |
| P3.7 Gate in-process | **core loop (ACT)** | Phase 2 | Gate becomes inline substage, not subprocess |
| P3.8 Retry policy by error class | **core loop (ACT)** | Phase 2 | Publish retry logic stays in publish-pipeline.ts |
| P4.9 Phase/failure metrics | **core loop** | Phase 0B + Phase 2 | Substage telemetry from finding #4 |

### From `source-registry-v2.md`

All 6 phases of the source registry plan become the **sources extension** implementation.
Phase ordering adjusted per Codex review finding #9:

| Phase | Content | Adjusted |
|-------|---------|----------|
| 1. Foundation | YAML→JSON catalog, inverted index | No change |
| 2. Provider Adapters | Smart URL generation per provider | Moved before testing (was Phase 3) |
| 3. Testing/Rating | Standalone test CLI, health checks | Moved after adapters (was Phase 2) |
| 4. Content Matcher | Post-generation source verification | No change |
| 5. Discovery | Internet scraping for new sources | No change |
| 6. Lifecycle | Auto-promote/demote/deprecate | No change |

### Codex Review Findings Addressed (source-registry-v2 review)

| # | Finding | Resolution |
|---|---------|------------|
| 1 | No quarantine for auto-discovered | `quarantined` status added; promoted after 3 successful tests |
| 2 | `discovered` missing from enum | Replaced by `quarantined` — clearer intent (see canonical enum above) |
| 3 | DAHR rejects XML/RSS | Provider adapters normalize XML/RSS to JSON before DAHR attestation |
| 4 | Engagement weight gameable | Reduced to 10%, per-topic normalization, new `trustTier` 10% weight |
| 5 | Matcher threshold inconsistent | 50 uniformly (see canonical thresholds above) |
| 6 | Claim extraction brittle | Accept as v1 limitation; LLM-assisted extraction in v2 |
| 7 | Generic adapter fallback unsafe | Generic adapter only for quarantined/testing; active sources require provider adapter |
| 8 | No concurrency locking | File-level lock (flock) during catalog writes |
| 9 | Phase reorder | Done (adapters before testing) |
| 10 | Missing data model fields | Add timeout, retry config, trust tier to SourceRecordV2 |
| 11 | Permanent source loss | `archived` status added (manual reactivation) |
| 12 | O(1) claim overstated | Documented as O(m+k) |
| 13 | Two-pass matching | Adopted: pre-retrieve top-K → generate → post-verify |

### Codex Review Findings Addressed (unified plan review)

| # | Finding | Resolution |
|---|---------|------------|
| 1 | Source status enum inconsistent across docs | Canonical enum defined in this doc; subplans update before coding |
| 2 | Observation schema lacks ID/fingerprint | `id` field added, fingerprint-based dedup, resolution linking defined |
| 3 | P0 wins blocked behind risky refactor | Reordered: Phase 0A/0B ship P0 wins into current loop FIRST |
| 4 | GATE needs substage telemetry | SubstageResult interface + failure codes defined |
| 5 | Sources API too broad for runtime | Split into runtime API (preflight/match) and admin API (discover/test) |
| 6 | Parallel-run migration unsafe | Changed to shadow mode with publish-disable |
| 7 | Threshold drift across documents | This doc is authoritative; canonical thresholds section added |
| 8 | P2.5 cross-sourced evidence unowned | Assigned to Phase 5 (content matcher) |

### Codex Review Findings Addressed (Phase 3 design review)

| # | Finding | Severity | Resolution |
|---|---------|----------|------------|
| 1 | Runtime/admin boundary unresolved — session-runner calls discovery/persist at runtime | P0 | Discovery removed from runtime. Admin-only via `tools/source-discover.ts` CLI. Topics without cataloged source skipped with observation. |
| 2 | `match()` underspecified — missing topic, candidates, failure semantics | P0 | Full `MatchInput`/`MatchResult` types defined. Failure → skip publish, no silent fallback. |
| 3 | Extension wiring has no implementation surface | P0 | Minimal typed `LoopExtensionHooks` dispatcher added as Phase 3 Step 1. Three hook points. |
| 4 | Agent-specificity undefined for unified catalog | P1 | Per-source `scope` field + per-agent `source-config.yaml` + `AgentSourceView` loader. |
| 5 | Schema ownership inconsistent across docs | P1 | Canonical `SourceRecordV2` defined in Phase 3 spec. Subplans must update before coding. |
| 6 | Import graph between attestation-policy and sources undefined | P1 | Explicit import graph: `resolveAttestationPlan` stays in attestation-policy.ts, source helpers move to `sources/`. |
| 7 | Inverted index persistence overspecified | P2 | In-memory rebuild on load. 140 sources doesn't justify file-backed index. |
| 8 | Migration fallback rules ambiguous | P2 | Explicit `SourceRegistryMode` enum. `catalog-preferred` during migration, `catalog-only` after validation. |
| 9 | Name-based dedupe insufficient | P2 | Migration deduplicates by `provider + normalized urlPattern`. |
| 10 | Compatibility shims need time-boxing | P3 | Shims removed in follow-up cleanup after `catalog-only` mode validated. |

## Implementation Order

### Phase 0A: Quick Wins — Publish Preflight (1 session)

**Goal:** Ship P0.1 from loop-v2 into the CURRENT 8-phase loop. Immediate value, zero architectural risk.

1. Add `sources.preflight(topic)` check into `runPublishAutonomous()` before LLM draft call
2. Return reason codes: `NO_MATCHING_SOURCE`, `TLSN_REQUIRED_NO_TLSN_SOURCE`, `SOURCE_PRECHECK_HTTP_ERROR`
3. Skip topic early with reason code logged to session report
4. Wire into existing gate pre-check path (extends current `runGateAutonomous()`)

**Dependencies:** None
**Risk:** Minimal — additive check, existing publish path unchanged if preflight passes
**Validates:** Source preflight API shape before full extraction

### Phase 0B: Quick Wins — Observability + Phase Budgets (1 session)

**Goal:** Ship P0.2 + P4.9 from loop-v2 + observation infrastructure into current loop.

1. Create `tools/lib/observe.ts` — append-only JSONL writer with ID generation
2. Add `observe()` calls to publish-pipeline.ts (errors, fallbacks, timings)
3. Add `observe()` calls to room-temp.ts (scan inefficiencies)
4. Add `observe()` calls to session-runner.ts (phase failures, skips)
5. Add per-phase deadline wrappers to session-runner.ts
6. Add substage-level failure codes to ENGAGE/GATE/PUBLISH within existing phases
7. Emit phase duration + failure code to session report

**Dependencies:** None
**Risk:** Minimal — additive only, no behavior changes
**Validates:** Observation format and substage telemetry before core refactor

### Phase 1: Improve Skill (1 session)

**Goal:** On-demand observation processing. Ships early so observations from Phase 0B
sessions get processed. Also validates the observe/improve separation works before
we remove REVIEW+HARDEN.

1. Create `tools/improve.ts` CLI
2. Read observations.jsonl, group by fingerprint into issues
3. LLM classification (CODE-FIX, GUARDRAIL, STRATEGY, INFO)
4. Integration with existing improvements.ts tracker
5. Auto-apply mode for safe fix categories (--auto-apply --dry-run)
6. Mark resolved observations with timestamp + improvement ID link
7. --trace command for observation history

**Dependencies:** Phase 0B (observations must exist)
**Best scheduled:** After 2-3 sessions have run with observe() active

### Phase 2: Core Loop Refactor (2-3 sessions)

**Goal:** Replace 8-phase PHASE_ORDER with 3-phase core + extension hooks.

1. Define new `CorePhase` type: `"sense" | "act" | "confirm"`
2. Define `SubstageResult` interface (from finding #4)
3. Define `Extension` interface with hook points
4. Refactor state.ts: new phase model (keep old as compatibility shim)
5. Refactor session-runner.ts: 3-phase main loop with extension invocation
6. Move AUDIT logic into `calibrate` extension
7. Inline GATE as ACT substage with dedicated telemetry
8. Move ENGAGE as ACT substage (before gate)
9. Keep VERIFY as CONFIRM
10. Remove REVIEW and HARDEN phases — observations are inline (Phase 0B), improve is on-demand (Phase 1)
11. Update agent strategy.yaml files to new `loop.extensions` format
12. Delete `strategies/base-loop.yaml`
13. Add scan profiles fast/deep (P1.3)
14. Add endpoint health tracking (P1.4)
15. Gate in-process (P3.7) — already substage, just remove subprocess call
16. Retry policy by error class (P3.8)

**Dependencies:** Phase 0B (observe exists) + Phase 1 (improve exists, so REVIEW/HARDEN removal is safe)
**Risk:** Highest risk phase — breaks autonomous sessions
**Mitigation:** Feature flag `--loop-version 1|2` to switch between old and new

### Phase 3: Sources Extraction (3-4 sessions)

**Goal:** Extract source concerns from core loop into standalone module with two API boundaries.
Build minimal extension dispatcher. Remove runtime discovery/persistence from session loop.

**Reviews:**
- 2026-03-13: Codex (gpt-5.3-codex) Phase 3 design review — 3 P0, 3 P1 findings. All addressed below.
  Full review: `claude-codex-coop/REVIEW-phase3.md`

#### Step 1: Extension Dispatcher (session 1)

Build the minimal typed extension hook system that `sources` (and future extensions) plug into.

```typescript
// tools/lib/extensions.ts
interface LoopExtensionHooks {
  beforeSense?(ctx: BeforeSenseContext): Promise<void>;
  beforePublishDraft?(ctx: BeforePublishDraftContext): Promise<PublishGateDecision | void>;
  afterPublishDraft?(ctx: AfterPublishDraftContext): Promise<SourceMatchDecision | void>;
}

// Compile-time registry — no dynamic loading
const EXTENSION_REGISTRY: Record<KnownExtension, LoopExtensionHooks> = {
  calibrate: { beforeSense: runCalibrateHook },
  sources: {
    beforePublishDraft: runSourcesPreflightHook,
    afterPublishDraft: runSourcesMatchHook,
  },
  observe: {},  // inline, not hook-driven
};
```

Hook placement in `runV2Loop()`:
- `beforeSense` — where `calibrate` currently runs (top of loop)
- `beforePublishDraft` — inside `runPublishAutonomous()`, before `generatePost()` (existing Step 0 preflight position)
- `afterPublishDraft` — inside `runPublishAutonomous()`, after draft validation, before attestation selection

Migrate existing hardcoded `calibrate` to use the dispatcher.

#### Step 2: Catalog + Index (session 1-2)

Create `tools/lib/sources/catalog.ts`:

```typescript
// Canonical record schema (extends current SourceRecord)
interface SourceRecordV2 {
  // Identity
  id: string;                          // deterministic: provider + normalized urlPattern
  name: string;                        // preserve current field
  provider: string;                    // "coingecko" | "hn-algolia" | ...
  url: string;                         // preserve current template URL
  urlPattern: string;                  // normalized template (for dedupe)

  // Backward-compatible metadata
  topics?: string[];
  tlsn_safe?: boolean;
  dahr_safe?: boolean;
  max_response_kb?: number;
  note?: string;

  // Lookup metadata
  topicAliases?: string[];
  domainTags: string[];
  responseFormat: "json" | "xml" | "rss" | "html";

  // Agent scoping
  scope: {
    visibility: "global" | "scoped";
    agents?: AgentName[];              // required when visibility = "scoped"
    importedFrom: AgentName[];         // provenance from YAML migration
  };

  // Runtime fetch policy
  runtime: {
    timeoutMs: number;
    retry: { maxAttempts: number; backoffMs: number; retryOn: Array<"timeout" | "5xx" | "429"> };
  };

  // Quality and lifecycle
  trustTier: "official" | "established" | "community" | "experimental";
  status: SourceStatus;               // uses canonical enum from this doc
  rating: {
    overall: number; uptime: number; relevance: number; freshness: number;
    sizeStability: number; engagement: number; trust: number;
    lastTestedAt?: string; testCount: number; successCount: number; consecutiveFailures: number;
  };
  lifecycle: {
    discoveredAt: string;
    discoveredBy: "manual" | "import" | "auto-discovery";
    promotedAt?: string; deprecatedAt?: string; archivedAt?: string;
    lastUsedAt?: string; lastFailedAt?: string; failureReason?: string;
  };
}

interface SourceCatalogFileV2 {
  version: 2;
  generatedAt: string;
  aliasesVersion: number;
  sources: SourceRecordV2[];
}
```

Inverted index (in-memory, rebuilt on load — 140 sources doesn't justify persistence):

```typescript
interface SourceIndex {
  byId: Map<string, SourceRecordV2>;
  byTopicToken: Map<string, Set<string>>;   // token → source IDs
  byDomainTag: Map<string, Set<string>>;
  byProvider: Map<string, Set<string>>;
  byAgent: Map<AgentName, Set<string>>;
  byMethod: { TLSN: Set<string>; DAHR: Set<string> };
}
```

Agent-specific views via per-agent config + per-source scope:

```typescript
// agents/{name}/source-config.yaml
interface AgentSourceConfig {
  agent: AgentName;
  minRating: number;
  allowStatuses: SourceStatus[];        // default: ["active", "degraded"]
  maxCandidatesPerTopic: number;        // default: 5
}

// Returned by loadAgentSourceView()
interface AgentSourceView {
  agent: AgentName;
  catalogVersion: 2 | 1;
  sources: SourceRecordV2[];
  index: SourceIndex;
}
```

Registry mode: `"catalog-preferred" | "catalog-only" | "yaml-only"`
- `catalog-preferred` (default during migration): use catalog.json if valid, else YAML fallback
- `catalog-only`: require catalog.json
- `yaml-only`: legacy behavior

#### Step 3: Source Policy + Match (session 2)

**Import graph — what moves, what stays:**

```
tools/lib/attestation-policy.ts (STAYS, trimmed)
  keeps: AttestationType, AttestationPlan, isHighSensitivityTopic(), resolveAttestationPlan()
  removes: SourceRecord, loadSourceRegistry, selectSourceForTopic, preflight, all tokenize helpers
  adds: temporary re-exports for migration only

tools/lib/sources/catalog.ts (NEW)
  owns: SourceRecordV2, SourceCatalogFileV2, normalizeSourceRecord(), loadCatalog(),
        loadAgentSourceView(), buildSourceIndex(), tokenizeTopic(), sourceTopicTokens(),
        resolveUrlTemplate()

tools/lib/sources/policy.ts (NEW)
  owns: preflight(), selectSourceForTopic() (internal helper)
  imports: resolveAttestationPlan() from ../attestation-policy.js
  imports: loadAgentSourceView()/index from ./catalog.js

tools/lib/sources/matcher.ts (NEW)
  owns: match(), extractClaims(), scoreMatch()
  threshold: 50 (canonical)

tools/lib/sources/discovery.ts (MOVED from source-discovery.ts)
  owns: discover(), generateCandidateUrls(), scoreContentRelevance()
  admin-only — NOT imported by session-runner

tools/lib/sources/index.ts — runtime re-exports: preflight, match, loadAgentSourceView
tools/lib/sources/admin.ts — admin re-exports: discover, test, updateRatings
```

**`preflight()` enhanced return type** (Codex P0 — must return candidates for match):

```typescript
interface PreflightResult {
  pass: boolean;
  reason: string;
  reasonCode: "PASS" | "NO_MATCHING_SOURCE" | "TLSN_REQUIRED_NO_TLSN_SOURCE" | "SOURCE_PRECHECK_HTTP_ERROR";
  candidates: PreflightCandidate[];   // NEW: top-K sources for match() to use
  plan: AttestationPlan;              // NEW: attestation plan for downstream
}
```

**`match()` API** (Codex P0 — fully specified):

```typescript
interface MatchInput {
  topic: string;
  postText: string;
  postTags: string[];
  candidates: PreflightCandidate[];   // from preflight result
  sourceView: AgentSourceView;
}

interface MatchResult {
  pass: boolean;
  reason: string;
  reasonCode: "PASS" | "NO_POST_MATCH" | "MATCH_FETCH_FAILED" | "MATCH_THRESHOLD_NOT_MET";
  best?: {
    sourceId: string; method: AttestationMethod; url: string;
    score: number; matchedClaims: string[]; evidence: string[];
  };
  considered: Array<{ sourceId: string; score?: number; error?: string }>;
}
```

**match() failure behavior:** If match fails → skip publish with `PUBLISH_NO_MATCHING_SOURCE`.
No silent fallback to preflight source. Log observation for improve skill.

#### Step 4: Session-Runner Wiring + Migration (session 3)

**session-runner.ts import changes:**

```typescript
// BEFORE:
import { loadSourceRegistry, resolveAttestationPlan, selectSourceForTopic, preflight, type AttestationType } from "./lib/attestation-policy.js";
import { discoverSourceForTopic, persistSourceToRegistry } from "./lib/source-discovery.js";

// AFTER:
import { resolveAttestationPlan, type AttestationType } from "./lib/attestation-policy.js";
import { loadAgentSourceView, preflight, match } from "./lib/sources/index.js";
```

**Runtime discovery removal:** `discoverSourceForTopic()` and `persistSourceToRegistry()` are
removed from session-runner.ts entirely. Discovery becomes admin-only — run as a separate
pre-session step via `tools/source-discover.ts` CLI. Topics with no cataloged source are
skipped with observation log entry. This enforces the runtime/admin boundary.

**agent-config.ts additions:**
- `paths.sourceCatalog` — path to catalog.json
- `paths.sourceConfig` — path to per-agent source-config.yaml
- `sourceRegistryMode` — catalog-preferred | catalog-only | yaml-only

**Migration CLI** (`tools/source-migrate.ts`):

```bash
npx tsx tools/source-migrate.ts \
  --sentinel agents/sentinel/sources-registry.yaml \
  --crawler agents/crawler/sources-registry.yaml \
  --pioneer agents/pioneer/sources-registry.yaml \
  --out sources/catalog.json \
  --emit-agent-configs
```

Migration rules:
- Deduplicate by `provider + normalized urlPattern` (not by name)
- Populate `scope.importedFrom` and `scope.agents`
- If source in one YAML → `scope.visibility = "scoped"`, `scope.agents = [that agent]`
- If source in multiple YAMLs → `scope.visibility = "scoped"`, `scope.agents = union`
- Imported records: `status = "active"`, `trustTier = "established"`, neutral rating defaults
- Emit initial `agents/*/source-config.yaml` files
- Emit migration report (duplicates, collisions, records needing manual review)

**Migration rollout:**
1. Run migration in `catalog-preferred` mode
2. Validate runtime against migrated catalog (shadow session)
3. Flip to `catalog-only`
4. Remove compatibility shims in follow-up cleanup

#### Validation Commands

```bash
# Type check
npx tsc --noEmit

# Migration
npx tsx tools/source-migrate.ts --sentinel agents/sentinel/sources-registry.yaml \
  --crawler agents/crawler/sources-registry.yaml --pioneer agents/pioneer/sources-registry.yaml \
  --out sources/catalog.json --emit-agent-configs

# Verify session still works
npx tsx tools/session-runner.ts --agent sentinel --loop-version 2 --dry-run --pretty

# Shadow mode (no publish)
npx tsx tools/session-runner.ts --agent sentinel --loop-version 2 --shadow --oversight autonomous --pretty
```

**Dependencies:** Phase 2 (v2 loop architecture)
**Risk:** Breaking attestation flow during migration
**Mitigation:**
- `catalog-preferred` mode falls back to YAML if catalog.json invalid
- Backward-compatible re-exports from attestation-policy.ts during transition
- Shadow mode to validate before live publish
- Registry mode logged on session start for observability

### Phase 4: Provider Adapters (2-3 sessions)

**Goal:** Smart per-provider URL generation and response parsing.

Implementation per `Plans/source-registry-v2.md` Phase 3, with adjustments:
- Generic adapter restricted to quarantined sources only (finding #7)
- XML/RSS adapters include JSON normalization for DAHR compatibility (finding #3)
- 10 Tier 1 adapters (HN, CoinGecko, Binance, Kraken, DefiLlama, GitHub, arXiv, Wikipedia, World Bank, PubMed)

**Dependencies:** Phase 3 (catalog format)

### Phase 5: Cross-Sourced Evidence + Matcher Hardening (1-2 sessions)

**Goal:** Evidence diversity scoring + matcher improvements based on real-world usage.

Note: Core `match()` implementation moved to Phase 3 (Step 3). Phase 5 hardens it.

Enhancements:
- Evidence diversity as a matcher signal: prefer sources from independent domains
- Multiple independent attestation domains boost content match score (P2.5 from loop-v2)
- LLM-assisted claim extraction (upgrade from v1 brittle keyword matching)
- Matcher threshold tuning based on Phase 3-4 operational data

**Dependencies:** Phase 4 (adapters for structured extraction)

### Phase 6: Testing + Rating (1-2 sessions)

**Goal:** Standalone source testing CLI with automated rating.

Implementation per `Plans/source-registry-v2.md` Phase 2 (reordered here).
Now that adapters exist, testing uses adapter-specific parsing.
Uses admin API only (`tools/lib/sources/admin.ts`).

**Dependencies:** Phase 4 (adapters)

### Phase 7: Discovery + Lifecycle (2 sessions)

**Goal:** Automated source discovery and health management.

Implementation per `Plans/source-registry-v2.md` Phases 5-6.
- Discovery with quarantine (sources start `quarantined`, promoted after 3 tests)
- Full lifecycle state machine (see canonical enum above)
- `archived` status for preservation without active retries

**Dependencies:** Phase 6 (testing infrastructure)

## Dependency Graph

```
Phase 0A (preflight — current loop)  ←── immediate value, zero risk
Phase 0B (observe + budgets — current loop)  ←── immediate value, zero risk
  │
  └──> Phase 1 (improve skill)  ←── validates observe/improve before refactor
         │
         └──> Phase 2 (core loop refactor)  ←── highest risk, now de-risked
                │
                ├──> Phase 3 (sources extraction)
                │      │
                │      └──> Phase 4 (provider adapters)
                │             │
                │             ├──> Phase 5 (matcher hardening + P2.5)
                │             │
                │             └──> Phase 6 (testing/rating)
                │                    │
                │                    └──> Phase 7 (discovery/lifecycle)
                │
                └──> (Phase 2 complete — loop optimizations already included)

Total: ~13-18 sessions
```

Key improvement over v1 ordering: P0 wins ship into the current loop immediately
(Phases 0A/0B). The improve skill validates the observe/improve separation (Phase 1)
before REVIEW/HARDEN are removed (Phase 2). This means if observe/improve doesn't
work well, we still have the old loop to fall back to.

## Strategy.yaml New Format

```yaml
# agents/sentinel/strategy.yaml
name: sentinel-loop
description: "Verification-focused loop for SuperColony gap detection"

loop:
  # Core phases are always SENSE → ACT → CONFIRM
  extensions:
    - calibrate          # fetch old scores, update prediction offset
    - sources            # preflight + content matching
    - observe            # inline observation logging

  # SENSE configuration
  sense:
    scan_profile: fast   # fast | deep (from loop-v2 P1.3)
    modes: [since-last, lightweight, topic-search]  # current scan modes
    quality_floor: 70

  # ACT configuration (with substage telemetry)
  act:
    max_posts: 3
    max_engage: 5
    budget_seconds: 900     # 15 min total ACT budget
    substages:
      engage:
        enabled: true
        budget_seconds: 300
      gate:
        enabled: true
        checklist:
          - "Topic has >=3 posts in last 12h"
          - "Unique attested source available"
          - "Can reference >=1 specific agent"
          - "Category is ANALYSIS or PREDICTION"
          - "Text >200 chars with confidence set"
          - "Not duplicate of last 50 posts"
          - "Calibrated predicted_reactions >= 17"
      publish:
        enabled: true
        prefer_tlsn: true
        fallback_dahr: true
        target_score: 100
        budget_seconds: 600

  # CONFIRM configuration
  confirm:
    verify_indexer: true
    verify_onchain: true     # fallback if indexer fails
    indexer_wait_seconds: 30

# Scoring, calibration, oversight — unchanged from current format
scoring: ...
calibration: ...
oversightGate: ...
```

## What Gets Deleted

| File/Concept | Disposition | When |
|-------------|-------------|------|
| `strategies/base-loop.yaml` | Delete — never parsed by runtime | Phase 2 |
| `extends:` field in strategy.yaml | Remove — no inheritance mechanism | Phase 2 |
| `basePhase:` field in strategy.yaml phases | Remove — core phases are implicit | Phase 2 |
| REVIEW phase in session-runner.ts | Remove — replaced by inline observe() | Phase 2 (after Phase 1 validates improve) |
| HARDEN phase in session-runner.ts | Remove — replaced by on-demand improve skill | Phase 2 (after Phase 1 validates improve) |
| `tools/session-review.ts` | Keep — improve skill reuses its analysis logic | — |
| Per-agent `sources-registry.yaml` | Remove after catalog.json migration validated in `catalog-only` mode | Phase 3 |
| `tools/lib/source-discovery.ts` | Moved to `tools/lib/sources/discovery.ts` — old file becomes re-export shim, then deleted | Phase 3 |
| Source helpers in `attestation-policy.ts` | Moved to `tools/lib/sources/` — re-exports during migration, then removed | Phase 3 |
| Runtime discovery in `session-runner.ts` | Removed — discovery becomes admin-only via `tools/source-discover.ts` CLI | Phase 3 |

## Migration Safety

1. **Phase 0A/0B ship into current loop** — no architectural changes, immediate value
2. **Phase 1 validates observe/improve** — if the separation doesn't work, REVIEW/HARDEN stay
3. **Feature flag:** `--loop-version 1|2` on session-runner.ts (Phase 2)
4. **Shadow mode:** `--loop-version 2 --shadow` runs new loop but suppresses publish — compare
   outputs without risking duplicate on-chain posts (Codex finding #6)
5. **Source fallback:** `catalog-preferred` mode loads YAML if catalog.json missing/invalid (Phase 3). Registry mode logged on session start.
6. **Observation backfill:** First improve invocation may have sparse data — that's fine
7. **No big bang:** Each phase ships independently and can be tested in isolation

## Pre-Implementation Checklist

Before Phase 0A begins, these housekeeping items must be done:

- [x] Update `Plans/source-registry-v2.md` status enum to match canonical enum in this doc
- [x] Update `Plans/source-registry-v2.md` engagement weight from 20% to 10%
- [x] Update `Plans/source-registry-v2.md` matcher threshold from "start with 60+" to 50
- [x] Update `Plans/source-registry-v2.md` rating formula to include trustTier 10%
- [x] Confirm `Plans/loop-v2-optimization.md` P0.1/P0.2 acceptance criteria match Phase 0A/0B

Before Phase 3 begins:

- [ ] Update `Plans/source-registry-v2.md` SourceRecord schema to match `SourceRecordV2` in Phase 3
- [ ] Update `Plans/source-registry-v2.md` content match threshold to 50 (was inconsistent 40/60+)
- [ ] Verify 3 YAML registries load correctly: `npx tsx -e "import {loadSourceRegistry} from './tools/lib/attestation-policy.js'; console.log(loadSourceRegistry('agents/sentinel/sources-registry.yaml').length)"`
- [ ] Confirm `--loop-version 2` works end-to-end: `npx tsx tools/session-runner.ts --agent sentinel --loop-version 2 --dry-run --pretty`
