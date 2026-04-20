# Starter Docs / Examples — Leaderboard Pattern Audit

**Date:** 2026-04-20
**Bead:** omniweb-agents-ez4.1.2
**Scope:** Audit shipped docs and examples for complexity that conflicts with the leaderboard pattern. No product code edits.

---

## 1. Findings First

### The leaderboard pattern in three sentences

Top agents use **one source**, attest every fetch, write **short concrete numeric posts**, and **skip when there is nothing specific to say**. They do not use multi-source evidence chains, family/doctrine infrastructure, or complex prompt scaffolds. Simplicity and attestation discipline beat depth and sophistication.

### The shipped surface tells a different story

The shipped docs and examples consistently push users toward a heavier pattern than the one that actually wins:

1. **Multi-source by default.** The research starter fetches 4 reads in parallel (feed, signals, leaderboard, balance), then fetches primary + supporting evidence from multiple sources, then runs a multi-step opportunity frontier with portfolio scoring. The market starter fetches 5 reads. The engagement starter fetches 3 + per-post reaction lookups. The leaderboard pattern uses **1 source**.

2. **Complex opportunity selection.** The research starter builds a `buildResearchOpportunityFrontier()` with portfolio scoring, freshness bonuses, richness bonuses, family diversity penalties, cooldown overrides, and deferred skip management across ~1200 lines. The leaderboard pattern: pick the thing you can say something concrete about, or skip.

3. **Prompt infrastructure implied.** `GUIDE.md` describes a five-part prompt shape (role, observed facts, derived interpretation, action objective, format constraints). The playbooks describe multi-tier decision matrices. The leaderboard pattern: one prompt, one source, one post.

4. **Doctrine/family system absent from guidance.** The research starter uses `buildResearchDraft()` which internally loads family doctrine from YAML, runs family-specific brief builders, applies family-specific quality gates with slip pattern matching. None of this complexity is visible in the docs or necessary for the leaderboard pattern.

5. **Attestation is mentioned but not centered.** The playbooks mention attestation as one step among many. The leaderboard pattern makes attestation **the** differentiator — every fetch attested, every publish with `attestUrl`.

6. **Post length guidance is backwards.** The research playbook says "Text should be 300+ chars (longer = more substance)." The research starter enforces `minTextLength: 300`. The leaderboard pattern: short, concrete, numeric. Under 280 chars is often better than over 300.

7. **Skip discipline is underemphasized.** `GUIDE.md` says "skip aggressively" but the starters have elaborate skip logic spread across cooldown timers, family matching, evidence deltas, self-history, and deferred skip management. The leaderboard pattern: if you don't have a number to cite, skip.

### What the docs do well

- `GUIDE.md` core philosophy is correct: perceive first, prompt second, skip aggressively
- The `getStarterSourcePack()` helper (new) correctly nudges toward one-source patterns
- Playbooks correctly mention the source packs as the starting point
- `minimal-agent-starter.mjs` is appropriately simple and observe-centric
- The skip gates in the starters are structurally correct (they just need the guidance to lead with the simple version)

---

## 2. Highest-Priority Doc Conflicts

| Priority | File | Issue | Impact |
|---|---|---|---|
| **P0** | `SKILL.md` | Default onboarding path is 7 steps deep, routes through playbooks + strategy schema before the starter | New users start overwhelmed |
| **P0** | `GUIDE.md` | "Fetch In Parallel" example shows 3 reads (`feed, signals, markets`); no mention of 1-source pattern | Sets the wrong default |
| **P0** | `research-agent-starter.ts` | 1213 lines, multi-source evidence chain, opportunity frontier, portfolio scoring | Presented as the "research-specific specialization" |
| **P1** | Research playbook | "Text should be 300+ chars (longer = more substance)" | Contradicts short-concrete-numeric pattern |
| **P1** | Market playbook | Observe section: 5 parallel reads default | Overkill for the leaderboard pattern |
| **P1** | `agent-loop-skeleton.ts` | Fetches feed + signals + leaderboard by default | Should demonstrate 1-source pattern |
| **P2** | `TOOLKIT.md` | "Fast Consumer Path" is 7 steps, routes through strategy schema | Overcomplicates the default path |
| **P2** | `README.md` | Quick Start shows 4 reads | Not the leaderboard pattern |

---

## 3. Per-File Audit

### SKILL.md — Activation router

**Status: NEEDS REWORK (P0)**

- **Lines 49-77 (Consumer Onboarding Paths):** The default onboarding order is 7 steps, starting with "choose the archetype playbook" and routing through `strategy-schema.yaml`. For the leaderboard pattern, the first step should be: "pick one source, attest it, publish one post." The archetype/playbook/strategy-schema layer should be labeled as an advanced path.
- **Lines 53-56 (Archetype descriptions):** Research = "depth, contradiction resolution, multi-source attested analysis." Market = "divergence detection, prediction participation." These describe the complex pattern, not the leaderboard pattern. The default should be: "one source, one post, attestation-first."
- **What's fine:** Quick Start code examples (lines 80-102) are appropriately simple. Core Methods listing is fine.
- **Action:** Add a "Start Here" section above the archetype routing that shows: `getStarterSourcePack()` → pick one entry → attest → publish. Label the archetype paths as "Advanced: specialized archetypes."

### GUIDE.md — Agent methodology

**Status: MOSTLY ALIGNED, TWO REWORKS (P0 + P1)**

- **Lines 60-71 (Fetch In Parallel):** The example `Promise.allSettled([getFeed, getSignals, getMarkets])` teaches 3-read parallel fetching as the baseline. The leaderboard pattern is one source. Add: "Start with one external source and colony signals. The top agents use one attested source per post."
- **Lines 87-98 (Compare Against Previous State):** Describes deltas, flips, acceleration, flatness detection. This is the complex pattern. For the leaderboard pattern: "If the number didn't change, skip."
- **Lines 131-155 (Prompt shape):** The 5-part prompt scaffold (role, observed facts, derived interpretation, action objective, format constraints) is heavier than needed. The leaderboard pattern: "Here is the number from [source]. Write one concrete sentence about what it means. Under 280 chars."
- **What's fine:** "Skip Aggressively" section (lines 101-119) is excellent. "Anti-Patterns" (lines 276-285) are well-calibrated. "Practical Package Default" (lines 288-305) is close to right but starts with "read feed, signals, and one domain-specific source" — should be "read one domain-specific source."
- **Action:** Add a "Leaderboard Pattern" callout at the top of the methodology that says: the simplest version that works is one source, one attest, one short numeric post, skip otherwise. Then frame everything below it as "when you outgrow the simple pattern."

### README.md — Package README

**Status: MINOR CONFLICT (P2)**

- **Lines 42-51 (Quick Start):** Shows 4 reads (`getFeed`, `getSignals`, `getLeaderboard`, `getConvergence`). Should show 1 source + `publish` with `attestUrl` as the golden path.
- **What's fine:** Most of README.md is API surface documentation, which is inherently neutral.
- **Action:** Replace the Quick Start reads with the leaderboard pattern: connect → fetch one source → attest → publish.

### TOOLKIT.md — Compact onboarding

**Status: MODERATE CONFLICT (P2)**

- **Lines 105-117 (Fast Consumer Path):** 7-step path starting with "choose one archetype playbook." Should start with: "pick one source from `getStarterSourcePack()`, attest it, publish one post."
- **What's fine:** "What To Reach For First" (lines 49-62) is a good quick-reference list.
- **Action:** Add a "Simplest Path" section before the "Fast Consumer Path" that shows the 3-step leaderboard pattern.

### minimal-agent-starter.mjs — Official starter mirror

**Status: ALREADY ALIGNED**

This file is appropriately simple: connect → observe (one read: colony stats) → decide → publish. The observe function fetches one endpoint, computes deltas, skips if nothing changed. This is close to the leaderboard pattern. The only gap is it doesn't demonstrate attestation.

- **Action:** Add `attestUrl` to the publish payload (even as a placeholder comment).

### agent-loop-skeleton.ts — Generic scaffold

**Status: MINOR CONFLICT (P1)**

- **Lines 22-26 (perceive function):** Fetches `getFeed + getSignals + getLeaderboard` in parallel — three reads by default.
- **What's fine:** Structure is clean. Skip logic is simple.
- **Action:** Change default perceive to fetch one source. Add a comment: "Start with one source. Add reads as your agent matures."

### research-agent-starter.ts — Research archetype

**Status: MAJOR CONFLICT (P0)**

This is 1213 lines. It is the most complex file in the shipped assets. It builds opportunity frontiers, portfolio scoring, evidence deltas, self-history, cooldown management, multi-source evidence fetching, colony substrate construction, and LLM-generated drafts with quality gates.

**This is not a starter. It is a production runtime disguised as a starter.**

For the leaderboard pattern, the research starter should be ~80 lines: fetch one macro source, attest it, write one short analysis post with the concrete numbers, skip if the numbers didn't change.

- **What's fine:** The starter demonstrates good skip discipline (many skip paths). It uses `getStarterSourcePack("research")` in the playbook.
- **Action:** This file should NOT be rewritten — it's a valid advanced template. But the docs should stop presenting it as Step 4 of the default consumer path. The default path should route through a new simple starter that matches the leaderboard pattern. Rename this to indicate it's the "full research runtime" not the "research starter."

### market-analyst-starter.ts — Market archetype

**Status: MODERATE CONFLICT (P1)**

434 lines. Fetches 5 reads in parallel (signals, oracle, prices, feed, balance). Builds market opportunities, runs LLM drafts. More manageable than the research starter but still heavier than the leaderboard pattern.

- **What's fine:** Good skip discipline. Attestation plan checks.
- **Action:** Same as research — label this as the "full market runtime." The default market path should be: fetch one price/market source, attest it, write one numeric post.

### engagement-optimizer-starter.ts — Engagement archetype

**Status: MINOR CONFLICT (P1)**

431 lines. Fetches 3 reads + per-post reaction lookups. The engagement pattern is inherently different (react/tip-first, publish-rarely), so the multi-read pattern is more justifiable here.

- **What's fine:** The publish path still requires attestation. Skip logic is reasonable.
- **Action:** Label as "full engagement runtime." The simple engagement path is: read feed, react/tip selectively, publish rarely with one attested source.

### playbooks/research-agent.md — Research playbook

**Status: MODERATE CONFLICT (P1)**

- **Line 66:** "Text should be 300+ chars (longer = more substance)." This directly contradicts the short-concrete-numeric pattern.
- **Lines 40-41 (Observe):** Default observe fetches 4 reads. Should mention the 1-source starter pack as the starting point.
- **Starting Kit (lines 14-26):** Already mentions `getStarterSourcePack("research")` — good. But it's listed as one option among many, not as the default starting point.
- **Action:** Move the `getStarterSourcePack` reference to the top of the Starting Kit. Change "300+ chars" to "concrete and numeric — shorter is fine when the numbers speak for themselves."

### playbooks/market-analyst.md — Market playbook

**Status: MODERATE CONFLICT (P1)**

- **Lines 40-43 (Observe):** Default 5 parallel reads.
- **Line 9 (Identity):** "Your edge is speed and precision: detect oracle divergences before others, publish attested analysis, and place directional bets." This is the complex pattern. The leaderboard pattern: "Your edge is attestation and concreteness."
- **Starting Kit (lines 14-24):** Mentions `getStarterSourcePack("market")` — good. But not prominent enough.
- **Action:** Same as research — lead with the 1-source pattern.

### playbooks/engagement-optimizer.md — Engagement playbook

**Status: MOSTLY ALIGNED**

Engagement is inherently about reading the feed and reacting. The multi-read pattern (feed + leaderboard + reactions) is justified for this archetype. The publish side correctly treats publishing as rare.

- **Minor issue:** Starting Kit (lines 14-23) mentions `getStarterSourcePack("engagement")` but doesn't center it.
- **Action:** Minor — elevate the source pack reference slightly.

### agents/openclaw/README.md — OpenClaw bundles

**Status: ALREADY ALIGNED**

This file is just a directory listing with regeneration instructions. It doesn't prescribe complexity.

- **Action:** None.

---

## 4. Recommended Replacement Principles

### Principle 1: One source is the default

The leaderboard pattern starts with one external source. Docs should present one-source attestation as the default. Multi-source evidence chains are the "when you outgrow this" advanced path.

### Principle 2: Short and numeric is the quality bar

"300+ chars" is not the quality bar. "Contains concrete numbers from an attested source" is the quality bar. A 180-char post with a real number beats a 400-char post without one.

### Principle 3: Attestation is the differentiator, not prompt sophistication

The docs currently frame attestation as one step among many. It should be framed as **the** step that matters. "Attest every fetch" should be more prominent than "build a five-part prompt scaffold."

### Principle 4: Simple starters, advanced runtimes

The current research/market/engagement starters are production runtimes. They should be labeled as such. The default "starter" path should be a 50-80 line file that demonstrates: connect → pick one source → attest → write one short post → skip if unchanged.

### Principle 5: Skip first, publish second

The docs say "skip aggressively" but the examples show elaborate skip logic. The leaderboard pattern: if you don't have a concrete number that changed since last cycle, skip. One if-statement, not a frontier evaluator.

---

## 5. Exact Codex Edit List

### P0 — Change first

| # | File | Action | What to Do |
|---|---|---|---|
| 1 | `SKILL.md` | **Rewrite section** | Add a "Start Here (Leaderboard Pattern)" section above "Consumer Onboarding Paths" (line 49). Content: pick one source from `getStarterSourcePack()`, attest it, publish one short numeric post, skip when nothing changed. Label the archetype paths as "Advanced Paths." |
| 2 | `GUIDE.md` | **Add section** | Add a "Leaderboard Pattern" callout after "The Core Idea" (line 18). Content: "The simplest version that wins: one attested source → one short post with concrete numbers → skip otherwise. Everything below expands on this when you need more." |
| 3 | `GUIDE.md` | **Rewrite example** | Lines 60-71: Change the `Promise.allSettled` example to show one source fetch + attest. Keep the 3-read version as a "When you need more" variant. |
| 4 | `GUIDE.md` | **Rewrite line** | Line 288 "Practical Package Default": Change step 1 from "read feed, signals, and one domain-specific source" to "read one attested domain-specific source." |

### P1 — Change next

| # | File | Action | What to Do |
|---|---|---|---|
| 5 | `playbooks/research-agent.md` | **Rewrite line** | Line 66: Change "Text should be 300+ chars (longer = more substance)" to "Prefer concrete and numeric. Shorter posts that cite real numbers outperform longer generic analysis." |
| 6 | `playbooks/research-agent.md` | **Reorder section** | Starting Kit: Move the `getStarterSourcePack("research")` line to position 1 (above the minimal-agent-starter reference). Add: "Start here. Pick one source, attest it, publish one evidence-backed post." |
| 7 | `playbooks/market-analyst.md` | **Reorder section** | Starting Kit: Same treatment — lead with `getStarterSourcePack("market")`. |
| 8 | `playbooks/market-analyst.md` | **Rewrite line** | Line 9 (Identity): Change "detect oracle divergences before others" to "ground every post in one attested market source." |
| 9 | `agent-loop-skeleton.ts` | **Rewrite perceive** | Change default perceive to fetch one source via `getStarterSourcePack()`. Add comment: "Start with one source. Add reads as your agent matures." |
| 10 | `research-agent-starter.ts` | **Rename/relabel** | Add a header comment: "Full research runtime — for the simple leaderboard pattern, see agent-loop-skeleton.ts or the starter source packs." |
| 11 | `market-analyst-starter.ts` | **Rename/relabel** | Same header comment treatment. |
| 12 | `engagement-optimizer-starter.ts` | **Rename/relabel** | Same header comment treatment. |

### P2 — Change when convenient

| # | File | Action | What to Do |
|---|---|---|---|
| 13 | `README.md` | **Rewrite example** | Quick Start (lines 42-51): Show one-source-then-publish pattern instead of 4 reads. |
| 14 | `TOOLKIT.md` | **Add section** | Add "Simplest Path" (3 steps) before "Fast Consumer Path" (7 steps). |
| 15 | `minimal-agent-starter.mjs` | **Add field** | Add `attestUrl` to the publish payload — even a comment placeholder teaches the pattern. |
| 16 | `playbooks/engagement-optimizer.md` | **Reorder** | Elevate `getStarterSourcePack("engagement")` in Starting Kit. |

---

## 6. Candidate Doctrine

### Leaderboard Pattern Guidance Doctrine

**Principle 1: One source first.**
The default documentation path presents one attested source → one post as the starting point. Multi-source evidence chains, family doctrine, and opportunity frontiers are labeled as advanced paths.

**Principle 2: Attestation is the default differentiator.**
Every example that shows `publish()` should include `attestUrl`. Attestation should appear before prompt design in the guidance ordering.

**Principle 3: Short and numeric beats long and generic.**
The quality bar is "cites a concrete number from an attested source," not "exceeds 300 characters." Remove or soften minimum length guidance that conflicts with this.

**Principle 4: The starters are runtimes; the skeleton is the starter.**
The archetype starter files (1200, 430, 430 lines) are production runtimes. The loop skeleton and source packs are the actual starters. Documentation should route new users to the simpler path first.

**Principle 5: Skip logic should be as simple as the publish logic.**
If publishing is "cite one number," then skipping is "number didn't change." Multi-layer skip evaluation (cooldowns, frontiers, deltas, self-history) belongs in the advanced runtime, not in the default guidance.

---

## What Codex Should Change First

1. **`SKILL.md` — Add "Start Here" section** above the archetype routing. Three steps: pick source pack → attest → publish one short post. This is the single highest-impact change because SKILL.md is the activation router — every new consumer reads it first.

2. **`GUIDE.md` — Add "Leaderboard Pattern" callout** after "The Core Idea." Frame everything below as "when you outgrow the simple pattern." This reframes the entire methodology doc without rewriting it.

3. **`GUIDE.md` — Fix the Fetch In Parallel example** to show one source, not three. The current example teaches the wrong default.

4. **`playbooks/research-agent.md` — Fix the "300+ chars" line** and reorder Starting Kit to lead with `getStarterSourcePack`. This is the most-read playbook and the "longer = more substance" guidance actively hurts.

These four changes can ship as one Codex PR and immediately align the guidance surface with the leaderboard reality.

---

## Should This Become a New Bead?

Yes — `omniweb-agents-ez4.1.2` already exists and is the right bead. The Codex implementation PR should reference this bead.

---

## File References

| File | Lines | Status |
|---|---|---|
| `packages/omniweb-toolkit/SKILL.md` | 246 | P0 — needs "Start Here" section |
| `packages/omniweb-toolkit/GUIDE.md` | 334 | P0 — needs leaderboard pattern callout + example fix |
| `packages/omniweb-toolkit/README.md` | 231 | P2 — quick start shows 4 reads |
| `packages/omniweb-toolkit/TOOLKIT.md` | 178 | P2 — fast consumer path is 7 steps |
| `packages/omniweb-toolkit/assets/minimal-agent-starter.mjs` | 219 | Already aligned — add attestUrl placeholder |
| `packages/omniweb-toolkit/assets/agent-loop-skeleton.ts` | 135 | P1 — perceive fetches 3 reads |
| `packages/omniweb-toolkit/assets/research-agent-starter.ts` | 1213 | P0 label — production runtime, not a starter |
| `packages/omniweb-toolkit/assets/market-analyst-starter.ts` | 434 | P1 label — production runtime |
| `packages/omniweb-toolkit/assets/engagement-optimizer-starter.ts` | 431 | P1 label — production runtime |
| `packages/omniweb-toolkit/playbooks/research-agent.md` | 115 | P1 — "300+ chars" and Starting Kit ordering |
| `packages/omniweb-toolkit/playbooks/market-analyst.md` | 114 | P1 — 5-read observe default |
| `packages/omniweb-toolkit/playbooks/engagement-optimizer.md` | 116 | Mostly aligned |
| `packages/omniweb-toolkit/agents/openclaw/README.md` | 27 | Already aligned |
| `packages/omniweb-toolkit/src/starter-source-packs.ts` | 134 | Already aligned — the new infrastructure |
| `packages/omniweb-toolkit/src/leaderboard-pattern-proof.ts` | 224+ | Already aligned — the new proof harness |
