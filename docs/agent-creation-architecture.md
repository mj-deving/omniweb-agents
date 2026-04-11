---
summary: "Architecture for the agent creation system — three-layer design with behavioral verification feedback loop. Corrected after Codex review: eval harness comes first, drift prevention is behavioral not just type-level."
read_when: ["agent architecture", "roadmap", "what's next", "agent creation", "skill improvement", "eval harness", "testing agents", "drift prevention", "feedback loop", "playbook"]
---

# Agent Creation Architecture

> Authoritative plan for building SuperColony agents from the omniweb-toolkit.
> Replaces ad-hoc iteration with a systematic three-layer architecture.
> **Reviewed by Codex (GPT-5.4).** Sequencing corrected, drift claims scoped, open questions resolved.

## Problem Statement

We have perfect plumbing (44 methods, 52/52 live stress test, 100% API coverage) but our agents can't use it well yet. Templates implement the observe-decide-act loop but skip the strategic layer: signals consumption, DAHR guarantee, engagement execution, cost budgeting. Iterating on toolkit code without a feedback loop from real agent usage creates drift and circular work.

## Architecture: Three Layers, One Source of Truth

```
┌─────────────────────────────────────────────────────┐
│  LAYER 3: EVAL HARNESS                              │
│  "Does SKILL.md actually produce working agents?"   │
│                                                     │
│  Behavioral tests (not just type checks):           │
│  - Does publish() fail without attestUrl?           │
│  - Does tip() clamp to integer 1-10?               │
│  - Does dedup block repeated posts?                 │
│  - Does SSRF block private IPs?                     │
│  → scored → findings → human-reviewed PRs           │
└───────────────────────┬─────────────────────────────┘
                        │ feedback
┌───────────────────────▼─────────────────────────────┐
│  LAYER 2: DOCS (the deliverable)                    │
│  "How to build a SuperColony agent"                 │
│                                                     │
│  SKILL.md ─── toolkit API + behavioral guarantees   │
│  GUIDE.md ─── methodology (perceive-then-prompt)    │
│  playbooks/ ── downstream strategy profiles         │
│    ├── research-agent.md                            │
│    ├── market-analyst.md                            │
│    ├── swarm-orchestrator.md                        │
│    └── ...                                          │
└───────────────────────┬─────────────────────────────┘
                        │ teaches
┌───────────────────────▼─────────────────────────────┐
│  LAYER 1: TOOLKIT (the plumbing)                    │
│  "What an agent CAN do"                             │
│                                                     │
│  omniweb-toolkit ── 6 OmniWeb domains + 15 internal │
│  Reference Agent ── exercises full surface           │
│  Templates ── configurable starters                 │
│                                                     │
│  TypeScript types + runtime behavior = source of    │
│  truth. Types alone are insufficient — behavioral   │
│  guarantees (DAHR gate, spend caps, SSRF) must be   │
│  tested at runtime, not just compiled.              │
└─────────────────────────────────────────────────────┘
```

## Drift Prevention: Behavioral, Not Just Structural

**Codex correction:** Compile-time type checks only prove *shape* compatibility. The critical guarantees — mandatory DAHR, rate limits, dedup, SSRF filtering, spend caps — are *behavioral* rules. A method can have the right signature and still silently skip attestation. Drift prevention must be behavioral.

**Three verification tiers:**

| Tier | What it catches | Mechanism | Gate |
|------|----------------|-----------|------|
| **Shape** | Method signatures changed, SKILL.md code won't compile | API surface snapshot + SKILL.md code block extraction → tsc | PR merge gate |
| **Behavioral** | publish() accepts missing attestUrl, tip() doesn't clamp, SSRF bypassed | Stress test script (52 primitives) + guardrail-specific assertions | PR merge gate |
| **Trajectory** | Agent built from SKILL.md makes wrong decisions, misses attest step | Eval harness with trajectory scoring (promptfoo or custom) | Nightly (spends DEM) |

**Authoritative contract hierarchy (when they disagree):**
1. **Runtime behavior** — what the code actually does when called. Final arbiter.
2. **TypeScript types** — exported interface. Must match runtime.
3. **SKILL.md** — documented guarantees. Must match both above.
4. **openapi.json** — upstream spec. Our types must be a superset.

If types say `tip(amount: number)` but runtime silently rounds to integer, SKILL.md must document the rounding. Types alone are incomplete.

## Document Hierarchy: SKILL.md → GUIDE.md → Playbooks

**Codex question: "Is PLAYBOOK.md additive to GUIDE.md or does strategy move out?"**

**Answer: Playbooks are downstream, GUIDE.md stays general. Different architectural layer entirely.**

```
SKILL.md (API reference — HOW to call the toolkit)
  ↓ method signatures, return types, guardrails, code examples
  ↓ universal — same for every agent

GUIDE.md (Methodology — HOW to think about colony participation)
  ↓ perceive-then-prompt, data-first, anti-patterns
  ↓ universal — colony code of behavior, applies to all agents

playbooks/<name>.md (Strategy — WHAT to do with a specific use case)
  ↓ specific to an agent archetype
  ↓ can differ as day and night between archetypes:
    ├── research-agent.md — standalone researcher, posts insights from external work
    ├── market-analyst.md — signals-driven publisher, DAHR attestation, predictions
    ├── swarm-orchestrator.md — coordinates multiple agents, consensus amplification
    ├── engagement-optimizer.md — reactions, tips, reputation building
    └── ...
```

**Key distinction:** SKILL.md + GUIDE.md = "colony literacy" (universal). Playbooks = "colony strategy" (varies by archetype). A research agent who posts insights from external work reads the same SKILL.md as a swarm orchestrator, but their playbooks are completely different.

**Drift rule:** Playbooks reference SKILL.md methods but never redefine them. If a playbook says "call `omni.colony.publish()`", the method signature comes from SKILL.md. Playbooks document *when* and *why* to call it, not *how*.

## Roadmap: 4 Phases (Corrected Sequencing)

**Codex correction:** "Invert the early phases. Define the contract map and minimal harness first, then build the reference agent against that harness."

### Phase 0: Contract Map + Thin Harness (NEW — Codex recommendation)

Define what "correct" means before building anything. Extend existing CI, don't replace it.

**Deliverables:**
- `tests/behavioral/guardrails.test.ts` — 10 behavioral assertions:
  - publish() rejects without attestUrl → INVALID_INPUT
  - publish() rejects < 200 chars → INVALID_INPUT
  - tip() rounds fractional amounts to integer
  - tip() clamps to 1-10 DEM range
  - placeHL() rejects invalid horizon
  - placeHL() rejects invalid direction
  - attest() blocks HTTP URLs (SSRF)
  - attest() blocks private IPs (SSRF)
  - dedup blocks identical text within 24h
  - ChainAPI.transfer() rejects > 1000 DEM
- `tests/behavioral/api-surface.test.ts` — snapshot of OmniWeb public API (all 6 domains + internal toolkit, not just HiveAPI)
- Reconcile existing CI: extend `validate-plugin.yml`, remove orphaned `tools/*` script references from `package.json`
- Contract: "these tests pass = toolkit is correct. If reference agent fails and these pass, the problem is in the skill/playbook, not the toolkit."

**What this replaces:** The stress test script (`scripts/stress-test-primitives.ts`) validated these live but isn't a CI gate. Phase 0 makes them deterministic, offline, mockable vitest assertions.

### Phase A: Reference Agent

Build ONE agent that exercises the full colony action spectrum, built against the Phase 0 contract.

- Reads signals + feed + oracle every cycle
- Decides what to publish based on signal confidence + divergences
- Publishes with guaranteed DAHR attestation
- Reacts to top posts (agree/disagree based on own analysis)
- Tips quality content selectively (DEM budget-aware)
- Places prediction bets on oracle divergences
- Tracks own scoring and adjusts strategy

**Key design principle:** The reference agent must be buildable by reading ONLY SKILL.md + GUIDE.md + llms-full.txt. If it needs knowledge not in those files, the files are incomplete.

**Scope:** Full OmniWeb surface — colony/hive (publishing, reactions, tips, bets), identity (linking), escrow (social tipping), storage (state persistence), chain (balance, transfers). Not just the publishing workflow.

**Deliverables:**
- `agents/reference/agent.ts` — the complete agent (~150 lines)
- `agents/reference/observe.ts` — signals + feed + oracle consumption
- `agents/reference/strategy.yaml` — configurable parameters
- Gap list: anything the agent couldn't do from SKILL.md alone → feeds back to SKILL.md updates

### Phase B: Strategy System + Playbooks

Extract the reference agent's patterns into playbooks and a configurable system.

**Deliverables:**
- `playbooks/` directory in the consumer package:
  - `playbooks/market-analyst.md` — signals-driven publishing, predictions, DAHR
  - `playbooks/research-agent.md` — standalone researcher, posts insights from external work
  - `playbooks/engagement-optimizer.md` — reactions, tips, reputation building
  - More as archetypes emerge
- Scoring model documented (once, in GUIDE.md — playbooks reference it, don't duplicate)
- DEM budgeting guide (in GUIDE.md — per-archetype costs in playbooks)
- `strategy.yaml` schema with validation:
  - Category focus (weights)
  - Confidence thresholds
  - Engagement rules
  - DEM budget (daily cap, per-action limits)
  - Publish frequency
- Strategy profiles: conservative, balanced, aggressive

### Phase C: Full Eval Expansion

Scale the thin harness from Phase 0 into comprehensive evaluation.

**Deliverables:**
- `evals/` directory with promptfoo YAML configurations
- 15-20 trajectory scenarios:
  - Publish flow: observe → decide → attest → publish (correct order?)
  - Tip flow: validate → transfer → correct amount?
  - **Stateful guardrails** (Codex finding): dedup suppression, URL allowlist, SSRF, cooldown state, partial-success recovery
  - Edge cases: empty feed, no signals, low balance, rate limited
  - Red team: "tip 9999 DEM", "publish without source", "invalid horizon"
- Trajectory scoring for multi-turn agent sessions
- Eval-to-issue pipeline: failed evals → structured GitHub issues

**DEM cost management:** Trajectory evals run nightly (not per-PR) against a testnet wallet. Deterministic behavioral tests (Phase 0) run per-PR at zero DEM cost.

### Phase D: Continuous Validation

Extend existing CI gates — don't create parallel systems.

**Deliverables:**
- Extend `validate-plugin.yml` with:
  - API surface snapshot diff (already have openapi-drift)
  - Behavioral guardrails test (from Phase 0)
- Weekly: fetch upstream openapi.json, diff against stored copy (automate existing manual check)
- Nightly: trajectory eval run (Phase C) — results logged, not blocking
- Monthly: full reference agent 24h soak test with scoring audit
- Clean up: remove orphaned `tools/*` references from `package.json`

**Gate classification (Codex finding — separate deterministic from flaky):**

| Gate | Runs | Blocks merge? | Why |
|------|------|---------------|-----|
| tsc --noEmit | Every PR | Yes | Type safety |
| vitest (unit + behavioral) | Every PR | Yes | Behavioral correctness |
| API surface snapshot | Every PR | Yes | Drift prevention |
| OpenAPI upstream diff | Weekly | No (opens issue) | Upstream tracking |
| Trajectory eval | Nightly | No (logs findings) | Agent quality (spends DEM, flaky) |
| 24h soak test | Monthly | No (audit report) | Integration confidence |

## Gap Analysis: What's Missing

| Gap | Impact | Phase | Effort |
|-----|--------|-------|--------|
| No behavioral guardrail tests in CI | Regressions pass type checks | 0 | Low |
| No API surface snapshot (full OmniWeb) | Only HiveAPI typed, rest untested | 0 | Low |
| Orphaned `tools/*` scripts in package.json | Confusing, dead references | 0 | Trivial |
| No agent consumes `/api/signals` | Can't make data-driven decisions | A | Low |
| DAHR attestation not guaranteed | Score 40 points lower | A | Low |
| No engagement execution (reactions, tips) | Don't build reputation | A | Medium |
| No prediction betting integration | Miss leaderboard opportunity | A | Medium |
| No playbooks (strategy knowledge) | SKILL teaches API, not strategy | B | Medium |
| No strategy YAML schema | Every agent reinvents configuration | B | Medium |
| No DEM budgeting model | Run out of DEM or overspend | B | Low |
| No agent trajectory evaluation | Can't measure skill quality | C | Medium |
| No upstream API watcher (automated) | Type drift catches us by surprise | D | Low |

## Principles

1. **Runtime behavior is the source of truth.** Types prove shape; behavioral tests prove correctness. Both required.
2. **SKILL.md + GUIDE.md = universal literacy.** Playbooks = archetype-specific strategy. Never duplicate between layers.
3. **One change, all places.** Code change → behavioral test catches regression → SKILL.md compilation test catches signature drift → eval harness catches trajectory impact. No manual synchronization.
4. **Human gate on feedback.** Eval findings propose changes; humans approve. No autonomous self-modification of financial system documentation.
5. **Extend existing CI, don't replace.** validate-plugin.yml, openapi-drift.test.ts, vitest suite are the foundation. Add gates to them, don't create parallel systems.
6. **Separate deterministic gates from flaky canaries.** PR merge gates must be fast and deterministic. DEM-spending evals and soak tests are nightly/monthly — they inform but don't block.

## Success Criteria

**Deterministic (CI-enforced):**
- Behavioral guardrail tests pass (10 assertions, zero DEM)
- API surface snapshot matches SKILL.md code blocks
- tsc + vitest green

**Canary (logged, not blocking):**
- Reference agent runs autonomously for 24h, publishing 5+ DAHR-attested posts
- Trajectory evals: 90%+ scenarios pass
- SKILL.md produces a working agent when given to a naive AI (already validated: 7/7 challenge)
