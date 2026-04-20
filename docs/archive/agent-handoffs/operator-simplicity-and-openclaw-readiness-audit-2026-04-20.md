# Operator Simplicity & OpenClaw Readiness Audit

**Date:** 2026-04-20
**Bead:** omniweb-agents-nkw
**Scope:** Review operator usability, routing clarity, archetype consistency, and OpenClaw skill readiness. No product code edits.

---

## 1. Findings First

### The system is powerful but not simple

The `omniweb-toolkit` package exposes the right primitives — `connect()`, 6 domains, typed methods, attestation-first publish. The architecture is sound. But the operator experience has accreted layers that obscure the simple path:

| What | Count | Problem |
|------|-------|---------|
| Package top-level docs | 4 (SKILL, GUIDE, TOOLKIT, README) | Each one repeats the onboarding path slightly differently |
| Reference files | 36 | No prioritization — a new operator sees 36 equally-weighted markdown files |
| Scripts | 41 | No obvious "run this first" vs "expert diagnostics" |
| Starter assets | 5 | Ranges from 134 lines (skeleton) to 1212 lines (research). The 1212-line file is labeled a "starter" |
| Playbooks | 4 (3 archetypes + schema) | These are strategy layers that imply you need a strategy before your first post |
| OpenClaw bundles | 3 | Each bundle contains 10 files including its own SKILL.md, GUIDE.md, PLAYBOOK.md, RUNBOOK.md |

A new operator needs to read 4 docs, choose among 5 starters, find the right script among 41, navigate 36 references, and understand the relationship between SKILL/GUIDE/TOOLKIT/README — all before their first publish.

### The actual happy path is buried

The actual shortest path to a working agent is:

```ts
import { connect } from "omniweb-toolkit";
import { runMinimalAgentLoop } from "omniweb-toolkit/agent";

const omni = await connect();
const feed = await omni.colony.getFeed({ limit: 10 });
await omni.colony.publish({ text: "...", category: "ANALYSIS", attestUrl: "..." });
```

This 5-line path is documented in SKILL.md's Quick Start (lines 80-102) but it's on page 2 of the activation router, below 77 lines of archetype routing, boundary caveats, and consumer onboarding paths.

### What's genuinely good

- `GUIDE.md` methodology is correct and well-written
- The `getStarterSourcePack()` helper correctly nudges one-source behavior
- `minimal-agent-starter.mjs` (219 lines) is appropriately simple
- The validation ladder (`check:playbook:*`) is well-structured
- OpenClaw bundle generation is automated and self-validating
- The proof harness (`leaderboard-pattern-proof.ts`) validates the simple pattern
- The archetype playbooks have consistent structure
- `strategy-schema.yaml` is well-documented and composable

---

## 2. Current Default Path (As It Actually Exists)

### What a new operator encounters in order

1. **README.md** — Quick Start shows 4 reads in parallel. Points to SKILL.md.
2. **SKILL.md** — 245 lines. Routes through source boundaries, default workflow, access paths, consumer onboarding (7 steps), quick start, core methods (38 reads + 18 writes listed), gotchas (10 items), "Load These Files When" (40 conditions), deterministic scripts (34 entries with 11-step progression).
3. **TOOLKIT.md** — 177 lines. Repeats the fast consumer path (7 steps again), lists assets, lists checks, repeats script progression.
4. **GUIDE.md** — 333 lines. Methodology. This is the one that's actually distinct and useful on its own.

**The problem:** Steps 1-3 are all saying the same thing with slightly different emphasis. None of them say: "Run this one command. Here's what happens. Now customize."

### The implicit default today

An experienced internal operator actually does:

1. `connect()` → read feed/signals → decide → publish or skip
2. Use `check:playbook:<archetype>` to validate
3. Use `probe-publish.ts --broadcast` when ready to spend DEM

This is never stated as a 3-step path anywhere in the docs.

---

## 3. Routing Graph Audit By Action Family

### Read / Observe

| Question | Answer |
|----------|--------|
| Intended path | `connect()` → `omni.colony.getFeed/getSignals/getLeaderboard/etc.` |
| Clearly documented? | **Yes** — Quick Start in SKILL.md, TOOLKIT.md, README.md all show this |
| Conflicting paths? | **No** — read is unambiguous |
| Still implicit? | Only which reads matter for which archetype (solved by playbooks) |

**Verdict: Good enough.**

### Publish

| Question | Answer |
|----------|--------|
| Intended path | `connect()` → `omni.colony.publish({ text, category, attestUrl })` |
| Clearly documented? | **Partially** — write flow example exists but is buried after all the read docs |
| Conflicting paths? | **Yes** — `probe-publish.ts`, `check-publish-readiness.ts`, `check-attestation-workflow.ts` all exist. Operator doesn't know which to run first |
| Still implicit? | The progression from "I have a draft" to "it's live on chain with attestation" requires reading 3+ scripts and GUIDE.md to understand |

**Verdict: Needs a single "publish checklist" that replaces reading 3 scripts.**

### React / Reply / Tip

| Question | Answer |
|----------|--------|
| Intended path | `omni.colony.react(txHash, type)`, `omni.colony.reply(...)`, `omni.colony.tip(txHash, amount)` |
| Clearly documented? | **Yes** — method signatures in SKILL.md, strategy in playbooks |
| Conflicting paths? | **No** |
| Still implicit? | When to react vs reply vs tip is strategy, not routing — correctly delegated to playbooks |

**Verdict: Good enough.**

### Market Write / Bet

| Question | Answer |
|----------|--------|
| Intended path | `omni.colony.placeHL(asset, direction, { horizon })` or `omni.colony.placeBet(...)` |
| Clearly documented? | **Partially** — methods listed, but the registration step, memo construction, and pool lookup aren't shown in one flow |
| Conflicting paths? | **Mild** — `probe-market-writes.ts` vs the inline playbook guidance |
| Still implicit? | The full flow (check pool → build memo → place bet → register → verify) is never shown end-to-end in one place |

**Verdict: Needs one "betting flow" example. Not urgent — most agents don't bet.**

### Attestation / Readiness

| Question | Answer |
|----------|--------|
| Intended path | `omni.colony.attest({ url })` before `publish()`, or `attestUrl` passed inline |
| Clearly documented? | **Partially** — `check-attestation-workflow.ts` is the validation path, but its relationship to `check-publish-readiness.ts` is unclear |
| Conflicting paths? | **Yes** — there are 3 scripts that validate different aspects of attestation readiness: `check-publish-readiness.ts`, `check-attestation-workflow.ts`, and `probe-publish.ts`. Their scopes overlap |
| Still implicit? | Whether you need `check-attestation-workflow` vs just passing `attestUrl` to `publish()` |

**Verdict: Needs merge or a clear "which check when" one-liner.**

### Playbook Validation

| Question | Answer |
|----------|--------|
| Intended path | `npm run check:playbook:<archetype>` |
| Clearly documented? | **Yes** — in each playbook and SKILL.md |
| Conflicting paths? | **No** — this is the one unambiguous aggregated check |
| Still implicit? | Nothing |

**Verdict: This is the best-designed operator flow in the system.**

### Live Proof

| Question | Answer |
|----------|--------|
| Intended path | Use the `probe-*` scripts or `check:write-surface` |
| Clearly documented? | **Yes** — progression in SKILL.md and TOOLKIT.md |
| Conflicting paths? | **Mild** — 7 probe scripts + the write-surface sweep. Not always clear which to use |
| Still implicit? | When you're "done" proving — `references/publish-proof-protocol.md` exists for this but isn't discoverable |

**Verdict: Adequate for expert use. Not obvious for new operator.**

---

## 4. Shared Routine Audit Across Archetypes

### What's shared (good)

| Pattern | Research | Market | Engagement | Shared? |
|---------|----------|--------|------------|---------|
| `runMinimalAgentLoop()` | ✅ | ✅ | ✅ | Same entry point |
| `MinimalObserveContext` / `MinimalObserveResult` | ✅ | ✅ | ✅ | Same types |
| `getStarterSourcePack(archetype)` | ✅ | ✅ | ✅ | Same API |
| Cooldown logic | ✅ (30 min) | ✅ (30 min) | ✅ (2 hr) | Same pattern, different constants |
| Skip-on-read-failure | ✅ | ✅ | ✅ | Same pattern |
| Feed sample extraction | ✅ | ✅ | ✅ | **Duplicated** (each has its own `samplePost` function) |
| `check:playbook:*` validation | ✅ | ✅ | ✅ | Same runner, per-archetype config |
| Playbook structure | ✅ | ✅ | ✅ | Same 5 sections (Identity, Starting Kit, Observe, Decide, Act) |
| Strategy schema | ✅ | ✅ | ✅ | Same base with partial overrides |

### Where they diverge (avoidably)

| Divergence | Research | Market | Engagement | Justified? |
|-----------|----------|--------|------------|------------|
| Starter complexity | 1212 lines | 433 lines | 430 lines | **No.** The research starter is a production runtime disguised as a starter. The market/engagement starters are actually starters. |
| Observe reads | feed + signals + leaderboard + balance + primary evidence + supporting evidence + colony substrate + self-history | signals + oracle + prices + feed + balance | feed + leaderboard + balance + per-post reactions | **Partially.** Research legitimately needs more context, but the starter shouldn't default to maximum. |
| Draft construction | `buildResearchDraft()` — 5 sub-builders, family doctrine lookup, slip patterns, evidence delta, colony substrate | `buildMarketDraft()` — opportunity + oracle divergence context | `buildEngagementDraft()` — opportunity + feed context | **Partially.** Research is genuinely more complex, but the default path should start simpler. |
| `samplePost()` | Custom per-archetype | Custom per-archetype | Custom per-archetype | **No.** These do the same thing with minor field additions. Should be shared. |
| Post template | Implicit in draft builder | Implicit in draft builder | Implicit in draft builder | **No divergence** — all use the prompt-then-output model |

### Where they diverge (justified)

| Divergence | Why |
|-----------|-----|
| Market uses oracle/prices | The oracle API is the data source for market analysis |
| Engagement uses per-post reactions | Engagement decisions require reaction counts |
| Research uses evidence delta + self-history | Research agents need to avoid repeating recent analysis |
| Market bets, others don't | Prediction markets are the market archetype's domain |
| Engagement tips/reacts more than publishes | That's the engagement identity |

### Bottom line

The shared routine is ~80% there. The main gaps:
1. `samplePost()` is duplicated 3x (mechanical fix)
2. Research starter is 3x the size of the others (needs a "simple research starter" that matches the others in complexity)
3. No shared "observe boilerplate" extracted (each starter reinvents feed extraction differently)

---

## 5. OpenClaw Skill Readiness Assessment

### What feels polished

- **Bundle generation is automated.** `export:openclaw` and `check:openclaw` form a clean lifecycle.
- **Each bundle is self-contained.** `openclaw.json`, `IDENTITY.md`, skill folder, strategy.yaml.
- **Skill folder structure is correct.** SKILL.md + GUIDE.md + PLAYBOOK.md + supporting files.
- **Validation commands exist in the bundle's own `package.json`.**
- **Three archetypes ship.** Research, market, engagement — covers the main product surface.

### What feels internal/confusing/overgrown

1. **10 files per skill bundle is a lot.** A typical OpenClaw skill has 1-3 files. These bundles have: SKILL.md, GUIDE.md, PLAYBOOK.md, RUNBOOK.md, strategy.yaml, starter.ts, minimal-agent-starter.mjs, agent-loop-skeleton.ts, example.trace.json, references/. That's an internal development workspace exported as a "skill."

2. **SKILL.md inside the bundle is the full 245-line SKILL.md from the package.** An OpenClaw consumer doesn't need the full activation router — they need "here's the 5-line quick start, here's what you can do, here's the constraint."

3. **The research skill bundle includes the 1212-line research-agent-starter.ts.** No OpenClaw consumer expects a 1212-line file labeled "starter."

4. **The bundle includes both `minimal-agent-starter.mjs` AND `starter.ts` AND `agent-loop-skeleton.ts`.** Three starting points in one skill is not "opinionated" — it's "figure it out yourself."

5. **The references/ subfolder ships audit-dated markdown.** Files like `research-agent-launch-proof-2026-04-17.md` are internal provenance artifacts, not consumer-facing skill content.

6. **The RUNBOOK.md file doesn't exist in the upstream package docs** — it's generated for the OpenClaw export. Its relationship to GUIDE.md and PLAYBOOK.md isn't clear.

7. **Strategy.yaml in the bundle is a merged version** of the base schema + the archetype override. This is good in principle but undocumented — the consumer doesn't know if they should edit it.

### Is the exported surface aligned with canonical package docs?

**Partially.** The bundle generation pulls from the right source files, and `check:openclaw` validates drift. But the result is "everything relevant exported" rather than "curated for external consumption." The alignment is structural, not editorial.

### Top blockers to "ready"

1. **No single "here's what this skill does in 10 seconds" in the bundle.**
2. **Too many files — skill surface should be 3-5 files max for OpenClaw.**
3. **The research starter is an internal production runtime, not a consumer example.**
4. **No runnable example that goes connect → observe → publish in under 30 lines.**
5. **npm package is not yet published** — all `file:../../..` paths break outside this repo.

---

## 6. Highest-Leverage Next Changes

Ordered by impact on operator simplicity × effort:

### 1. Create one "Start Here" page that replaces reading 4 docs (HIGH LEVERAGE)

Write a single `QUICKSTART.md` or rewrite the README.md to be:
- Line 1: what this is (one sentence)
- Line 3: `npm install omniweb-toolkit` (or checkout path)
- Line 5-20: minimal working agent (connect → read → decide → publish)
- Line 22-30: how to validate it worked
- Line 32: "For archetypes and advanced use, see SKILL.md"

Currently the information is spread across README (Quick Start), TOOLKIT (Fast Consumer Path), SKILL (Consumer Onboarding Paths), and GUIDE (Practical Package Default). All four say roughly the same thing.

### 2. Demote TOOLKIT.md — merge its unique content into README or SKILL (MEDIUM)

TOOLKIT.md exists because README was too high-level and SKILL was too detailed. Now that all four docs overlap, TOOLKIT adds noise. Merge its "Fast Consumer Path" and "Deterministic Checks" into README. Delete TOOLKIT.md. Three docs → two docs (README for humans, SKILL for agents).

### 3. Create a simple research starter (HIGH LEVERAGE)

The current `research-agent-starter.ts` is 1212 lines — it's an internal production runtime. Create `research-agent-simple-starter.ts` (~200 lines) that:
- Uses `getStarterSourcePack("research")` for one source
- Follows the same pattern as market/engagement starters (400 lines)
- Matches the leaderboard pattern

Keep the 1212-line version as `research-agent-full-starter.ts` or similar, labeled "advanced."

### 4. Trim OpenClaw bundles to 5 files max (HIGH LEVERAGE for skill product)

Each bundle should ship: `SKILL.md` (shortened), `strategy.yaml`, `starter.ts` (the simple one), `example.trace.json`, and optionally `GUIDE.md`. Remove: RUNBOOK.md, PLAYBOOK.md (content folded into shortened SKILL.md), `minimal-agent-starter.mjs` (it's the generic starter — consumer can get it from the package), `agent-loop-skeleton.ts` (same), `references/` (internal provenance).

### 5. Publish one "operator cheatsheet" that replaces the 11-step script progression (MEDIUM)

The current SKILL.md and TOOLKIT.md both list an 11-step script progression. Replace with a 3-tier model:
- **Tier 1 (first run):** `check:playbook:<archetype>` — one command, validates everything
- **Tier 2 (going live):** `probe-publish.ts --broadcast` — first real write
- **Tier 3 (expert diagnostics):** everything else

### 6. Extract shared `samplePost()` across archetypes (LOW EFFORT)

The market, engagement, and research starters all have their own `samplePost()` with slight variations. Extract to a shared utility.

---

## 7. What Should Be Deleted, Merged, or Demoted

### Delete

| File | Why |
|------|-----|
| `TOOLKIT.md` (after merge) | Content now lives in README + SKILL |

### Merge

| From | Into | What moves |
|------|------|------------|
| TOOLKIT.md "Fast Consumer Path" | README.md "Quick Start" | The 7-step progression |
| TOOLKIT.md "Deterministic Checks" | README.md "Package Checks" | Already duplicated there |
| TOOLKIT.md "Where To Go Next" | SKILL.md "Load These Files When" | Already duplicated |

### Demote

| File | Current status | Should be |
|------|---------------|-----------|
| `research-agent-starter.ts` (1212 lines) | Primary starter for research archetype | Labeled "advanced" or "full runtime." Simple starter becomes default |
| `references/` dated proof files | Shipped in OpenClaw bundles | Internal only — not in external bundles |
| `RUNBOOK.md` in OpenClaw bundles | Exported as part of skill | Remove — fold essential content into PLAYBOOK or SKILL |
| 7 `probe-*` scripts | Equal prominence in docs | Demote to "expert/advanced" tier — `check:playbook:*` is the default |

### Keep as-is

| File | Why |
|------|-----|
| `SKILL.md` | Correct role as activation router for agents. Trim, don't delete |
| `GUIDE.md` | Distinct purpose (methodology). Well-written |
| Playbooks (3) | Correct structure, correct content, correctly labeled as overrides |
| `strategy-schema.yaml` | Clean, well-documented, composable |
| `minimal-agent-starter.mjs` | Appropriately simple |
| `check:playbook:*` runner | Best-designed operator flow |
| Proof harness (`leaderboard-pattern-proof.ts`) | Validates the right pattern |

---

## 8. Candidate Doctrine

> Operators should not need to read more than one document to know what to run first.

> The default shipped example must match the pattern that actually wins on the leaderboard: one source, one attest, one short numeric post, skip otherwise.

> An OpenClaw skill bundle is a curated consumer artifact, not an exhaustive internal export. Five files maximum per skill.

> "Starter" means under 300 lines. If it's over 400 lines, it's a "runtime" or "full example," not a starter.

> The validation ladder has three tiers: (1) one-command archetype validation, (2) first live write, (3) expert diagnostics. Tier 1 is the default. Tiers 2 and 3 are explicitly labeled as escalation.

> SKILL.md is for agent routing. README.md is for human orientation. GUIDE.md is for methodology. These are the only three package-level docs needed. Anything else is a reference file loaded on demand.

---

## 9. What Codex Should Do Next

### PR 1: Simplify README as the single human entry point (P0)

- Rewrite README.md to open with 20-line minimal working agent
- Fold TOOLKIT.md "Fast Consumer Path" into README
- Add "Validation: run `npm run check:playbook:research`" as the one-command answer
- Remove TOOLKIT.md (or reduce to a 5-line redirect to README + SKILL)

### PR 2: Create simple research starter (P0)

- Create `assets/research-agent-simple-starter.ts` (~200-250 lines)
- Uses `getStarterSourcePack("research")` → picks entry[0] → attests → publishes or skips
- Same structural pattern as market/engagement starters
- Rename current file to `assets/research-agent-full-starter.ts`
- Update playbook and SKILL.md to route to the simple version by default

### PR 3: Trim OpenClaw bundles (P1)

- Reduce each bundle to: SKILL.md (shortened), strategy.yaml, starter.ts, example.trace.json
- Remove: RUNBOOK.md, PLAYBOOK.md, minimal-agent-starter.mjs, agent-loop-skeleton.ts, references/
- Fold essential PLAYBOOK content into the shortened SKILL.md
- Update `export-openclaw-bundles.ts` to generate the trimmed set
- Update `check-openclaw-export.ts` for new file expectations

### PR 4: Script tier labeling (P2)

- Add a `--tier` flag or section header in SKILL.md that clearly separates:
  - Tier 1: `check:playbook:*` (one command)
  - Tier 2: `probe-publish.ts --broadcast` (first live write)
  - Tier 3: everything else
- Update SKILL.md "Deterministic Scripts" section to lead with tiers

### PR 5: Extract shared `samplePost()` utility (P2)

- Extract feed post sampling to `src/feed-sample.ts` or similar
- Use from market/engagement/research starters
- No behavior change, just dedup

---

## If We Had To Ship This As An OpenClaw Skill Next Week

### What we'd ship (minimum viable)

1. **One bundle per archetype** (3 total) with:
   - `SKILL.md` (50 lines max: what it does, quick start, constraints)
   - `strategy.yaml` (the merged version, already good)
   - `starter.ts` (the simple version, ~200 lines)
   - One example trace file

2. **README in the bundle** that says:
   - Install `omniweb-toolkit` (from local path until npm publish)
   - Run the starter: `npx tsx starter.ts`
   - Validate: `npm run check:playbook:<archetype>`
   - That's it

3. **The npm package itself** (already builds and packs cleanly)

### What we'd cut (ruthlessly)

- All dated reference files from the bundle
- RUNBOOK.md, PLAYBOOK.md (fold 10 essential lines into SKILL.md)
- The 1212-line research starter (ship the simple version)
- The skeleton and minimal-agent-starter from bundles (they're generic — get them from the package)
- The 40-entry "Load These Files When" section from the bundle's SKILL.md

### What would still feel rough

- npm publish is blocked (file:// path dependency)
- The consumer has to check out this repo to use the bundles for real
- The bundle's `package.json` points to `file:../../..`
- No hosted docs site to link to from the skill (docs-site exists but is local)

### What's honestly good enough already

- The methodology (GUIDE.md) is correct and well-calibrated
- `runMinimalAgentLoop()` + `MinimalObserveResult` is a clean agent API
- `getStarterSourcePack()` correctly solves the "which source" question
- `check:playbook:*` is the right one-command validation
- The strategy schema is composable and well-documented
- The proof harness validates the pattern that wins
- Bundle generation is automated — you're not hand-maintaining these

### Timeline estimate to "shippable"

Assuming npm publish stays blocked:
- PR 1 (README): 1 session
- PR 2 (simple research starter): 1 session
- PR 3 (trim bundles): 1 session
- Remaining: npm auth configuration (external blocker)

Three focused Codex PRs and we're at "honest minimal viable skill product for local installs."
