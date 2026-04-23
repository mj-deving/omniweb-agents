# Fast-Iteration Session Playbook

**Date:** 2026-04-22
**Bead:** `omniweb-agents-cmc`
**Scope:** Runnable operating playbook for supervised live experimentation under the new doctrine (15m verdict for non-prediction, 30m pickup for prediction, deadline for prediction-correctness). Audit / operating doctrine. No product-code edits.

**Companion docs** (required context, read first):
- `docs/archive/agent-handoffs/immediate-pickup-strategy-audit-2026-04-22.md` — empirical basis for verdict window
- `docs/archive/agent-handoffs/macro-stress-shape-catalog-2026-04-22.md` — sub-shape inventory
- `docs/archive/agent-handoffs/cross-category-priority-audit-2026-04-22.md` — missing on disk as of 2026-04-23; historical reference only, do not infer contents

---

## 0. Framing

This playbook is the *operating* layer on top of the three prior audits. It does not re-litigate which lane / category / sub-shape works — those audits established that. It specifies **what a Codex session looks like minute-by-minute** under the fast-iteration doctrine.

**Evidence grading**:
- **[Proven]** — direct observation in the data (colony pull, prior audits)
- **[Inferred]** — consistent with cross-sectional data but not longitudinally verified
- **[Tactical]** — user-chosen operating convention, not empirically optimal

The 15m verdict rule itself is **[tactical]**. The empirical analysis suggested 45-60min; the user has chosen 15m to prioritize iteration velocity over false-negative minimization. The playbook respects that choice and adapts the verdict ladder accordingly.

---

## 1. Findings First

Six findings specific to the playbook (as distinct from the prior audits' sub-shape / category findings).

1. **The 15m rule cannot use ≥5-reaction as the winner threshold.** **[Proven]** in the 1,495-post snapshot: 0% of attested ANALYSIS aged 0-15min have ≥5 reactions; 29% have ≥1 reaction. At T+15m the only reasonable binary is *pulse detected (≥1)* vs *no pulse (0)*. The ≥5-reaction threshold applies at T+30m onward.

2. **Session throughput is constrained by sub-shape inventory, not by verdict time.** **[Inferred]** — with the 15m verdict and ~5min novelty scan + compose + publish, theoretical min spacing between publishes is ~20-25 minutes. But the sub-shape catalog identifies four viable sub-shapes (WALCL/RRP, VIX+curve+historical, curve un-inversion, front-end fresh). Five publishes in a session would require re-using a sub-shape, which cannibalizes. **The binding constraint is 4 sub-shapes, not 4 hours.**

3. **The cannibalization threshold is thesis-level, not topic-level.** **[Proven]** — three independent-author near-twins on Eightco all stalled at 80; our publish #2 stalled same-thesis 14 minutes after publish #1. **[Inferred]** — "same sub-shape, different metric" appears tolerated (two winners in the liquidity-vs-Fed-stance cell used different metrics). **The novelty gate must check the specific thesis, not the sub-shape.**

4. **The 0-reaction-at-15m verdict is aggressive; it accepts a known false-kill rate.** **[Tactical]** — per the immediate-pickup audit, some reactive posts declare between T+15 and T+30. The 15m rule kills those prematurely. Operational acceptance: iteration velocity matters more than capturing slow-pulse posts.

5. **A 3-publish session can complete in ~75 minutes wall clock.** **[Inferred]** — 3 × (5min prep + 5min publish + 15min verdict) = 75 min. Four publishes need ~100 min. This changes the operational picture from "one publish per afternoon" to "a session is an afternoon's worth of experiments in 90 min."

6. **The post-session scorecard is the primary learning artifact.** One row per publish. No time-series tracking. The scorecard is what makes the next session's rotation decision possible; without it, rotation becomes guesswork.

---

## 2. The Fast-Session Model

### Model in one sentence

*A session is a sequence of 3-4 supervised publishes in different sub-shapes, each with a 15-minute (ANALYSIS / OBSERVATION / REPLY) or 30-minute (PREDICTION reactions) verdict checkpoint and an explicit kill condition, yielding one scorecard row per publish and completing in ~75-100 minutes wall clock.*

### Category rules

| Category | Verdict type | Verdict age | Terminal signal |
|---|---|---|---|
| **ANALYSIS** | Reaction pulse | T+15min | 0 reactions = flat, ≥1 = pulse |
| **OBSERVATION** | Reaction pulse | T+15min | Same |
| **REPLY** | Reaction pulse | T+15min | Same |
| **PREDICTION** | Reaction pulse | T+30min | 0 reactions = flat, ≥1 = pulse |
| **PREDICTION correctness** | Deadline | Explicit | Market / DAHR resolution |

**ALERT / QUESTION / OPINION / FEED / VOTE / SIGNAL: not in-session**. Per the cross-category priority audit.

### Session states

- **Armed** — pre-session checks passed, rotation schedule loaded, balance confirmed
- **Running** — in a publish cycle
- **Idle** — between publishes, after a verdict, before next pre-publish
- **Killed** — one of the session-level kill conditions fired
- **Closed** — scorecard written, bead notes added, Beads pushed

---

## 3. Optimal Session Size and Cadence

### Session size

- **Default**: 3 publishes. **[Tactical]** — matches the C1/C2/C3 structure from the macro-stress shape catalog, keeps DEM risk bounded, fits in 75 min.
- **Expand to 4** if: DEM balance ≥ 4, all 4 sub-shapes in today's rotation are fresh (none used in last 24h), prior publish landed a pulse (increases confidence the colony state is reactive).
- **Never 5+**. Reusing a sub-shape within the session will cannibalize. **[Inferred]** from near-twin cannibalization.
- **1-2 is acceptable** for a short session or when evidence is thin — don't force a third publish if the novelty gate is blocking candidates.

### DEM budget per session

- 1 publish ≈ ~1 DEM
- 3-publish session: ~3 DEM
- Sub-shape rotation research: 0 DEM (reads only)
- **Stop-session budget floor**: 2 DEM remaining after publish N means no publish N+1 unless rotation is completely stuck

### Wall-clock cadence

Per publish:

```
T+0min:   Novelty scan (read last 2h colony feed)           [≤5 min]
T+5min:   Compose draft (gate all 6 preflight rules)        [≤5 min]
T+10min:  Publish (attest + broadcast)                      [≤2 min]
T+12min:  Start 15-minute verdict timer
T+27min:  Verdict checkpoint — record reaction count        [≤2 min]
T+29min:  Scorecard row written
```

Between publishes: 0-5 min idle (next publish can start while the prior's verdict timer runs in parallel, staggered).

**Parallelism note**: a session can have 2 in-flight publishes at different verdict stages. Don't exceed 2 in-flight — it becomes confusing to track. **[Tactical]**.

### Session wall clock

| Size | Serialized | With parallel staggering |
|---|---|---|
| 1 publish | ~30 min | 30 min |
| 2 publishes | ~60 min | ~45 min |
| 3 publishes | ~90 min | ~65 min |
| 4 publishes | ~120 min | ~85 min |

---

## 4. In-Session Sequence

The runnable sequence. Each step should be invocable without interpretation.

### Step 0 — Pre-session checks

Before publishing anything:

```bash
# 1. Balance check
npx tsx packages/omniweb-toolkit/scripts/... (or omni.colony.getBalance)
# Target: balance ≥ 3 DEM for a 3-publish session

# 2. Feed state snapshot (t=0 reference for novelty scan)
curl -sS https://supercolony.ai/api/feed?limit=100 > /tmp/session-T0-feed.json

# 3. Load rotation schedule (see §5)
# Pick 3 sub-shapes from today's rotation. Confirm none was used in prior 24h session.
```

If any pre-check fails, **do not open the session**.

### Step 1 — Candidate generation (per publish)

For each of the 3 chosen sub-shapes in rotation order:

1. **Pull fresh evidence** for the sub-shape's primary metric (e.g., WALCL latest reading via FRED attestation). Freshness requirement: metric moved at least "meaningfully" since last publish of this sub-shape. **[Proven]** — stale-number cannibalization sunk publish #2.

2. **Compose compact draft** — single measurement + single contradiction + forward claim + falsifier, ≤220 characters. **[Proven]** — fast winners cluster at 150-220 chars; stalls cluster at 233-280.

3. **If the metric has not moved meaningfully**: skip this sub-shape for this session. Do not force a publish on stale numbers.

### Step 2 — Anti-cannibalization scan

Before each publish:

```text
Scan /tmp/session-T0-feed.json AND a fresh /api/feed?limit=100 for:
  A. Any post by OUR wallet in the last 24h with the same sub-shape or metric → BLOCK (self-history gate enforces this; verify it triggered)
  B. Any INDEPENDENT-author post in the last 2h using the same primary metric → BLOCK, rotate sub-shape
  C. Any INDEPENDENT-author post in the last 2h with the same primary contradiction frame → BLOCK, rotate
  D. A total of 5+ macro ANALYSIS posts from different authors in the last 30min → BLOCK (colony is saturated; wait 30-60min)
```

If any blocker fires, **rotate to the next sub-shape in the rotation schedule**. If all three planned sub-shapes are blocked, close the session early with a "colony saturated" note.

### Step 3 — Preflight gates (6 must pass)

All must pass before publish:

1. **Shape**: single-contradiction, ≤220 chars, exactly one forward claim, explicit or implicit falsifier
2. **Source**: attestation ready, primary numeric value cited in prose
3. **Self-redundancy**: self-history gate `skipSuggested=false` (per `research-self-history.ts`)
4. **Colony novelty**: §step-2 scan passed
5. **Category fit**: ANALYSIS unless the post is pure measurement-without-interpretation (then OBSERVATION)
6. **Sub-shape freshness**: last-used by us ≥24h ago; metric moved meaningfully since

All gates must be green. **Any red = rotate or close**, never publish with a yellow.

### Step 4 — Publish

Via the maintained publish path:

```bash
npx tsx packages/omniweb-toolkit/scripts/check-research-e2e-matrix.ts \
  --broadcast-family <sub-shape-family> \
  --verify-timeout-ms 45000 \
  --out /tmp/session-pub-N.json
```

Record: `txHash`, `blockNumber`, `timestamp`, `category`, `attestUrl`, draft text, 6-gate pass states.

### Step 5 — Verdict checkpoint

At exactly **T+15 min after the publish timestamp** (ANALYSIS/OBSERVATION/REPLY) or **T+30 min** (PREDICTION reactions):

```bash
curl -sS "https://supercolony.ai/api/feed?limit=100" \
  | node -e 'const j = JSON.parse(require("fs").readFileSync(0,"utf8"));
             const p = (j.posts||[]).find(x=>x.txHash==="<our-txhash>");
             console.log(JSON.stringify({score:p?.score, reactions:p?.reactions, replyCount:p?.replyCount}))'
```

Record one scorecard row:

```json
{
  "sessionId": "<iso-timestamp>",
  "publishIndex": 1,
  "txHash": "...",
  "subShape": "liquidity-vs-Fed-stance",
  "metric": "WALCL",
  "textLength": 185,
  "publishedAt": "...",
  "verdictAt": "<T+15min>",
  "reactions": { "agree": 1, "disagree": 0 },
  "score": 80,
  "verdictClass": "pulse",
  "demSpent": 1
}
```

`verdictClass` is one of:
- `"pulse"` — ≥1 reaction at T+15 (winner-candidate; let terminal state emerge organically)
- `"flat"` — 0 reactions at T+15 (terminal for planning)
- `"partial"` *(only at T+30m optional re-check)* — 1-4 reactions; indicative but below ≥5-winner

### Step 6 — Sub-shape rotation decision

Immediately after the verdict is recorded:

- If `pulse` on publish N: remove sub-shape N from today's rotation (don't re-run same sub-shape in session). Proceed to publish N+1 with the next sub-shape.
- If `flat` on publish N: remove sub-shape N from today's rotation. Proceed to publish N+1 with the next sub-shape. **Do not retry the same sub-shape with a variant.** **[Proven]** — elaborated retries stall.
- Either way: sub-shape cooldown for the next 24h (per §5).

### Step 7 — Session close

After 3 publishes (or early close):

1. Aggregate the 3 scorecard rows into `docs/research/live-session-testing/<yyyy-mm-dd>-fast-session-<n>/scorecard.json`
2. Write a short session README with: rotation used, verdict outcomes, observations about colony state
3. Add bead note summarizing outcomes
4. `bd dolt push`
5. Commit the session directory per durable-handoff-commits policy

---

## 5. Cross-Session Rotation

### The 4-shape rotation

The four sub-shapes from the macro-stress shape catalog, indexed:

- **A — Liquidity-vs-Fed-stance**: WALCL, RRP, TGA, M2 (rotating metric). **[Proven]** cross-author (M2 winner `b382ee36` 90/11).
- **B — VIX + curve + historical base rate**. **[Proven]** cross-author but high-dislike tolerance.
- **C — Curve un-inversion / re-steepening**. **[Proven]** in prior repeatability window.
- **D — Front-end inversion + pivot (bills vs notes)**. **[Proven]** (our publish #1); **[Inferred]** currently cooling.

### The 4-day rotation default

| Day | Slot 1 | Slot 2 | Slot 3 | Optional Slot 4 |
|---|---|---|---|---|
| Day N | A | B | C | D |
| Day N+1 | B | C | D | A |
| Day N+2 | C | D | A | B |
| Day N+3 | D | A | B | C |

Each sub-shape appears in every session. Each sub-shape has a 24h cooldown between uses. **[Tactical]** — this is an operational scaffold, not an empirical optimum.

### Per-metric rotation within sub-shape A

Sub-shape A has four viable metrics. Rotate across days:

| Day | Metric for Slot 1 |
|---|---|
| Day N | WALCL |
| Day N+4 | RRP |
| Day N+8 | TGA |
| Day N+12 | M2 |

Rationale: M2 winner `b382ee36` is live — do not re-publish M2 in the next 24-48h. WALCL and RRP are the cleanest near-sibling metrics.

### When rotation breaks

If the novelty gate blocks all 4 sub-shapes on a given day:
- **Colony saturation signal** — the current colony is already densely covered in our lanes.
- Close the session without publishing. Wait 4-8 hours for rotation to clear.
- This is the rate limiter that prevents us from publishing into a saturated surface.

If a sub-shape stalls (`flat`) twice in two consecutive sessions:
- **Sub-shape cooling signal** — move it to weekly rotation instead of 4-day.
- Replace with a new candidate sub-shape (see §8 on sub-shape promotion).

---

## 6. Kill Conditions and Stop Rules

### Per-publish kills

| Signal | Action |
|---|---|
| Preflight gate fails | Rotate sub-shape; do not publish |
| Novelty scan blocks all 3 sub-shapes | Close session early |
| Publish fails at broadcast | Record error, rotate to next sub-shape |
| Verdict at T+15m: 0 reactions | Record `flat`, remove from today's rotation, proceed |
| Verdict at T+15m: ≥1 reaction | Record `pulse`, remove from today's rotation, proceed |

### Per-session kills

| Signal | Action |
|---|---|
| 3 consecutive `flat` verdicts | **Close session.** Diagnose (likely colony state issue or sub-shape pool exhaustion). Do not force publish 4. |
| DEM balance drops below 2 | Close after current publish's verdict |
| Novelty gate blocks all remaining candidates | Close session |
| Publish path errors 2× in a row | Close session; escalate to operator investigation |

### Per-day kills

| Signal | Action |
|---|---|
| Session closes with 3 flats | **No second session that day.** Wait 24h minimum. Diagnose colony state or rotate sub-shapes out. |
| Session closes with 2 pulses | Optionally run a second session 4+ hours later with rotation advanced one day. |
| Session closes with 3 pulses | Next day's session proceeds normally (don't over-trade one good day). |

### What is NOT a kill

- A `pulse` with low terminal reactions (e.g., 1 agree / 0 dis at T+15m stays at 1 agree at T+30m): this is acceptable; do not retroactively reclassify to `flat`.
- An unexpected reactor at T+30m on a post that was `flat` at T+15m: **do not chase this**. Record it as a retrospective data point for the scorecard, but do not change the 15m-verdict rule based on it. **[Tactical]** — rule stability matters more than chasing late signals.
- A `disagree` reaction counts as a pulse. 1 disagree at T+15m = `pulse`. The colony engaging with the post — even negatively — is a pulse. **[Proven]** — `2d327693` hit 90 with 7 disagrees alongside 6 agrees.

---

## 7. What Codex Should Stop Doing

Concrete list. Each item is a removed behavior, not a generic "avoid X."

### A — Stop waiting on ANALYSIS / OBSERVATION / REPLY reaction drift past 15 minutes

- **Stop**: scheduling re-checks at T+30m, T+1h, T+2h, T+24h for reaction outcomes.
- **Stop**: writing `pending-verdicts.json` entries with reaction-count deadlines.
- **Stop**: treating "needs more time" as a state for a post that was flat at T+15m.

### B — Stop retrying stalled sub-shapes within a session

- **Stop**: publishing a "better-worded" variant of a sub-shape that just stalled at T+15m.
- **Stop**: elaborating a flat post by adding indicators or context.
- **Stop**: posting a "clearer" version of the flat thesis as a correction or follow-up.

### C — Stop running 5+ publishes per session

- **Stop**: scheduling a 5th sub-shape by reusing a just-completed sub-shape with a different metric.
- **Stop**: extending a session past 2 hours wall clock.
- **Stop**: adding a "bonus" publish because there's budget remaining.

### D — Stop measurements that presume slow drift

- **Stop**: building score-progression dashboards that track a single post's score over T+30m, T+1h, T+2h.
- **Stop**: per-post verdict-history queries beyond a single T+15m (or T+30m for prediction reactions) snapshot.
- **Stop**: treating 80 → 90 as a "might happen" state worth planning around.

### E — Stop entering sub-shapes that the cross-category priority audit already deprioritized

- **Stop**: publishing OPINION, FEED, VOTE, SIGNAL as experiment candidates.
- **Stop**: running ALERT / QUESTION publishes as standalone experiments.
- **Stop**: REPLY as a recurring experiment (only fire REPLY when a directly-in-lane parent post has clear discourse value).

### F — Stop near-twin publishing on same-metric or same-thesis within 2h

- **Stop**: publishing M2-based thesis within 24h of `b382ee36`'s 90/11 winner.
- **Stop**: publishing bills-vs-notes thesis within 24h of our publish #1.
- **Stop**: publishing a near-twin of any independent-author's ≥90 post from the last 2h.

### G — Stop long-form ANALYSIS for immediate-pickup purposes

- **Stop**: drafts > 230 characters for the main research pipeline. **[Inferred]** from the 150-220 char winner band.
- **Stop**: drafts that chain 3+ indicators.
- **Stop**: drafts that describe without committing to a single forward claim.

---

## 8. Minimal Doctrine Going Forward

One page. Memorizable. Every line is a constraint Codex can check.

### The 10-line doctrine

1. **Session = 3 publishes in 3 different sub-shapes, ~75-90 min wall clock, ~3 DEM.** Optional 4th publish only if all gates green and DEM ≥ 4.
2. **Verdict at T+15min** for ANALYSIS / OBSERVATION / REPLY. **T+30min** for PREDICTION reactions. **Deadline** for PREDICTION correctness.
3. **Verdict ladder at T+15m**: `pulse` (≥1 reaction) or `flat` (0). The ≥5-reaction winner threshold applies at T+30m, not T+15m.
4. **Six preflight gates** before every publish: shape (≤220 char single-contradiction), source (attested, values cited), self-redundancy (gate not triggered), colony novelty (no same-thesis/metric in last 2h), category fit, sub-shape 24h cooldown. All green. No yellow publishing.
5. **Rotate sub-shapes** A→B→C→D across 4 days. Never repeat a sub-shape within one session. Never re-use a sub-shape within 24h.
6. **Rotate metrics within sub-shape A** across days: WALCL / RRP / TGA / M2, 4-day metric cycle.
7. **Kill conditions**: 3 consecutive flats in a session → close; DEM < 2 → close; novelty gate blocks all → close; publish errors 2× → close.
8. **One scorecard row per publish.** No time-series tracking. No post-T+15m re-checks for reactions.
9. **Stop doing**: delayed drift waits, stalled-sub-shape retries, 5+ publishes, 230+ char drafts, dead categories (OPINION/FEED/VOTE/SIGNAL/ALERT/QUESTION), near-twin publishing inside 2h.
10. **Daily kill**: session closes with 3 flats → no second session that day.

### Evidence-grade reminder

Treat this doctrine as:
- **[Proven]** constraints: the six preflight gates (each grounded in direct prior-audit evidence).
- **[Inferred]** constraints: the 3-publish session size, the ≤220 char band, the no-elaborated-retry rule.
- **[Tactical]** constraints: the 15m verdict window, the 4-day rotation schedule, the 3-consecutive-flat session kill.

The doctrine is intentionally light. The gates are mechanical; the rotation is a schedule; the kills are concrete. The only non-mechanical judgment is *selecting the specific text of each compact-claim draft* — and that is where the research-agent / LLM path already works.

### When to re-evaluate the doctrine

- **After 5 sessions** at this cadence. Aggregate scorecard; compute winners/flats/pulses per sub-shape. Re-rank the 4-shape rotation.
- **If the colony's publication rate changes**. The 2h novelty window is tactical; if the colony's post rate doubles, the window shrinks to 1h.
- **If a new sub-shape emerges** (per a future shape catalog refresh) with ≥2 cross-author 90s in one window. Promote it into the 4-shape rotation; rotate out the weakest current shape.
- **If the 15m rule produces too many false-kills** — measurable if pulse-verdict-class posts frequently reach ≥5 reactions while flat-verdict-class posts frequently do too. If this imbalance shows up across 10+ scorecard rows, widen to T+30m.

---

## Summary

- A fast-iteration session is 3 publishes in different sub-shapes with 15m verdicts, yielding 3 scorecard rows in ~75-90 minutes.
- The 15m verdict uses `pulse` (≥1 reaction) vs `flat` (0) — the ≥5-winner threshold does not apply at T+15m empirically. **[Proven]**
- The binding session-size constraint is 4 available sub-shapes, not 4 hours of wall clock. 5+ publishes cannibalize.
- Cross-session rotation cycles A→B→C→D daily; each sub-shape has a 24h cooldown; metric rotation within sub-shape A cycles over 4 days.
- Kill conditions are concrete and scoped: per-publish (preflight gate fails, novelty blocks), per-session (3 consecutive flats, DEM < 2, publish errors 2×), per-day (session closes with 3 flats → no second session).
- Codex stops: delayed drift waits, sub-shape retries within session, 5+ publishes, 230+ char drafts, dead categories, same-metric near-twins within 2h, score-progression dashboards.
- The minimal doctrine is 10 lines. Every line is a check Codex can mechanically apply. The only judgment call is the compact-claim text, where the existing research-draft pipeline already carries the load.
- Evidence grades are preserved throughout: **[Proven]** for the gates, **[Inferred]** for the session size and length band, **[Tactical]** for the 15m window and 4-day rotation.
