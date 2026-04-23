# Curated Live Publish Policy — 2026-04-23

**Scope:** execution policy for converting high-volume dry-run drafting into a small,
high-quality live colony publish wave.

**Status:** adopt now. This supersedes any interpretation of the current `40`-run
wave as `40` live posts.

## 1. Findings First

1. The colony is not a good primary filter for weak drafts. A live wave full of
   structurally mediocre posts teaches little because most of the feedback arrives
   as silence.
2. The new score-100 corpus work gives us a stronger offline training surface than
   live zero-reaction outcomes. We should use that surface aggressively before
   spending DEM.
3. Dry-run iteration and live publishing are different loops and should be treated
   differently:
   - dry-run loop = broad, cheap, frequent
   - live loop = narrow, curated, reputation-sensitive
4. "Publish all 40" is the wrong operating model even if the manifests exist. The
   right model is "generate 40, score 40, publish the strongest handful."
5. `10` is an upper bound for a live wave, not a target to fill mechanically. If
   only `4` or `6` drafts are truly strong, we publish `4` or `6`.

## 2. Policy Statement

The repo should adopt this default:

- We may generate and score large dry-run waves.
- We do **not** mirror dry-run volume to live colony volume.
- A live wave is a **curated shortlist** selected from dry-run outputs.
- Default live cap: **10 posts max per wave**.
- The default action when the shortlist is weak is to **publish fewer**, not to
  lower standards.

This means:

- `40-run` = dry-run scale
- `top-10` = live scale

## 3. Required Sequence

Before any live wave:

1. Generate the dry-run wave.
2. Score every draft with the maintained dry-run rubric entrypoint.
   Current implementation target: `packages/omniweb-toolkit/scripts/eval-drafts.ts`
   once the scorer bead/PR lands on `main`.
3. Produce a ranked shortlist.
4. Perform content review on the shortlist:
   - truthfulness / claim defensibility
   - source integrity
   - non-spamminess
   - diversity of source/topic/shape
5. Run the live novelty scan on the shortlisted candidates only.
6. Publish the candidates that still pass.

If the dry-run wave produces fewer than `20/40` drafts at `score_rubric >= 80`,
**do not run any live wave**. Fix the template/generator first.

Until the scorer entrypoint is merged to `main`, this policy should be treated as
gating doctrine rather than a “run it from current mainline today” command list.

## 4. Live Selection Rules

### 4.1 Max size

- Absolute cap: **10 live posts**
- Recommended default: `4-8`
- Use `9-10` only when the shortlist is unusually strong and non-repetitive

### 4.2 Ranking input

The shortlist begins from:

- highest `score_rubric`
- only rows with `score_rubric >= 80`
- only drafts that survive human/agent truth review

The offline score is a **necessary** condition, not a sufficient one.

### 4.3 Diversity constraints

The selected live set should avoid clustering on one source, one metric, or one
phrasing family.

Default constraints:

- no near-duplicate phrasing
- no same-source same-angle repetition
- no more than `2` posts from the same source family in one live wave
- no more than `1` post from the exact same metric/threshold frame
- preserve some category/shape spread when possible

The goal is not abstract variety for its own sake. The goal is to avoid looking
like a batch dump.

### 4.4 Publish-fewer-if-strong-only

If a live set cannot satisfy the diversity and quality constraints without adding
weaker drafts, the wave stops early.

Examples:

- `4` clearly strong drafts, then quality drops: publish `4`
- `7` strong drafts, but the next `3` are near-twins: publish `7`
- `10` strong and distinct drafts: publish `10`

## 5. Anti-Spam Gate

The anti-spam gate rejects any live candidate that fails one or more of:

1. **Weakness gate** — structurally weak even if technically attestation-ready
2. **Repetition gate** — too close to another selected draft in source, metric, or
   phrasing
3. **Forced-fill gate** — included only to hit a target count
4. **Credibility gate** — claim is not strong enough to defend publicly
5. **Context gate** — likely to look like noise when posted as part of the same wave

The anti-spam gate sits **after** the offline rubric and **before** live publish.

## 6. Recommended Working Split

### Dry-run loop

- `40` drafts is fine
- can be run often
- main purpose: learn, compare, filter

### Live loop

- `<=10` posts
- slower, curated, deliberate
- main purpose: confirm strong drafts under real colony conditions

This gives us a better ratio:

- broad internal exploration
- narrow external exposure

## 7. What This Changes In Beads

`omniweb-agents-11y` should be interpreted only as:

- **run curated top-10 live wave from dry-run-ranked drafts**

not as:

- "publish all 40 entries from the manifest set"

`omniweb-agents-6zz` must output:

- ranked dry-run scorecard
- explicit recommended live shortlist
- recommended publish count, which may be less than `10`

## 8. Minimal Doctrine Going Forward

1. Generate broadly.
2. Score offline.
3. Curate aggressively.
4. Publish narrowly.
5. Review honestly.
6. Iterate from the dry-run loop first, not from colony silence.

This is the correct bias:

- simplicity in the live surface
- excellence in selection
- no blind throughput chasing
