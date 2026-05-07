# id3h — Cold external-consumer test report (2026-05-06)

## Purpose

Test what a fresh external consumer infers from the current omniweb-agents front door, without Beads/history/internal doctrine.

## Method

Two-pass check:

1. **Blind pass** — fresh no-context coworker limited to consumer-facing entry surfaces.
2. **Minimal-clarification pass** — same task, but with only three truths added:
   - `colony-operator` is the intended primary front door
   - research/market/engagement archetypes are legacy specialist surfaces
   - `react` is a real first-class supported action through the truthful front door

## Front-door surfaces used

- root `README.md`
- `packages/omniweb-toolkit/{README.md,GUIDE.md,SKILL.md,package.json}`
- `packages/omniweb-toolkit/agents/openclaw/README.md`
- `packages/omniweb-toolkit/agents/openclaw/colony-operator/{README.md,AGENTS.md}`
- `packages/omniweb-toolkit/agents/openclaw/colony-operator/skills/omniweb-colony-operator/{SKILL.md,PLAYBOOK.md}`

## Blind-pass outcome

The blind consumer did **not** form the intended colony-operator-first story.

It drifted into an older package/toolkit/research-agent story and inferred the wrong first success path. The coworker treated the repo primarily as a broad toolkit plus supervised/write-check workflow, not as a colony-operator-first front door.

### Main blind-pass failures

1. **Wrong product/default-path story**
   - The consumer centered `omniweb-toolkit` and broad package/runtime surfaces rather than `colony-operator`.
   - It proposed a generic package-consumer / research-agent / supervised-observation path as the honest first success path.

2. **Legacy/specialist surfaces still pull too hard**
   - Root/front-door docs still make research-agent and archetype-era proof language easy to mistake for the main path.

3. **Current action truth is not legible enough from the front door**
   - Even with `react` now wired through the truthful front door, the blind consumer did not cleanly infer the current action story.

4. **Aspirational/full-surface language bleeds into current-truth reading**
   - Colony-operator docs mix:
     - full intended MVP surface
     - current no-spend proof floor
     - supervised root-publish checkpoint
   - A cold consumer can read this as current operational default rather than staged proof boundaries.

## Minimal-clarification outcome

After explicitly stating that colony-operator is primary, specialist archetypes are legacy, and react is first-class, the consumer recovered much of the intended story.

### What became clear after clarification

- colony-operator is the correct front door
- legacy archetypes are not the default path
- react belongs in the truthful current action story

### What stayed confusing even after clarification

1. **Top-level/product identity still over-centers the toolkit**
   - The package/substrate identity is clearer than the actual consumer default path.

2. **Doc ordering still makes current truth compete with historical/adjacent surfaces**
   - Users can still meet the broad toolkit story before the colony-operator story is locked in.

3. **Current truth vs future ceiling is still too mixed**
   - The docs do not separate:
     - what is the intended full MVP
     - what is the current truthful front door
     - what is only a supervised/manual checkpoint

## Diagnosis

### Wording/doc-order problems

- root README still tells an older toolkit/archetype story first
- package README still acts like the main consumer identity surface instead of a substrate explanation under the front door
- OpenClaw bundle README still introduces multiple bundles before fully locking the colony-operator path

### Deeper front-door architecture problems

- the public/documented entry story is still split across repo root, package root, package-level skill docs, and bundle docs rather than collapsing into one unmistakable default path
- current-proof surfaces and future-capability surfaces are still colocated closely enough that a cold consumer can mistake ceiling for floor

## Concrete follow-up work created from this test

1. Rewrite the root and package front door so colony-operator is unmistakably the default consumer path.
2. Separate current truthful action surface from aspirational full-MVP and supervised checkpoint language in colony-operator docs.
3. Demote legacy specialist archetypes harder in onboarding/navigation so they cannot be mistaken for the main path.

## Verdict

A cold consumer can eventually recover the intended story, but **not from the current front door alone without help**.

The biggest issue is not missing code; it is that the repo still presents too many adjacent truths at once:
- substrate truth
- legacy archetype truth
- supervised checkpoint truth
- future full-surface truth
- current colony-operator default truth

That blend is enough to misroute a fresh consumer even after the recent doctrine cleanup.
