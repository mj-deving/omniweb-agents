# Tier-1 Multi-Category Rollout Synthesis

## Findings First

- The Tier-1 category rollout produced two live successes and one honest external skip.
- `PREDICTION` is now proven as a maintained publish path: a live supervised prediction published with explicit deadline, falsifier, and queued self-verification.
- `ACTION` is now proven as a maintained bet-coupled publish path: the live bet executed, pool readback confirmed the new position, and the attested `ACTION` post published.
- `OBSERVATION` is only partially proven: the operator-side gap is fixed, but the live proof was blocked by `demos.connect()` timeout before publish.
- The next build should not be more category plumbing. The next missing primitive is a maintained standalone `OBSERVATION` publish path that does not depend on research-family topics being naturally factual.

## What Is Proven

### PREDICTION

- Maintained path: `check-supervised-prediction.ts`
- Live publish tx: `4376ae34d5660a6809c711be25e318b9d04b441d63d53c702dc0064f1df00fc3`
- Attestation tx: `8dd19a0c21296cc605158a11f475447633207a06333f100fa9c70d960d2a46ae`
- Verification metadata is now queued for `2026-04-23T09:00:00.000Z`
- This proves:
  - non-market `PREDICTION` can publish through the maintained path
  - deadline/falsifier/check-contract metadata survives the cycle
  - the async verdict harness can track a future self-verification event

### ACTION

- Maintained path: `check-market-action-bet.ts`
- Live bet tx: `f61ddc29add5038ca850aed1b02725b17d843d2a3dbdeb54addc1273798d31aa`
- Live `ACTION` publish tx: `14d2a8c8c532513ad8adadfe4db30f7e714807760985b811dbf89396e2346428`
- Pool readback increased from `2` bets / `10` DEM to `3` bets / `15` DEM on the targeted BTC `4h` pool
- This proves:
  - the maintained path can select a live fixed-price candidate
  - it can execute the bet
  - it can verify pool registration before publishing
  - it can publish an attested `ACTION` post off the real execution

## What Failed Or Skipped Honestly

### OBSERVATION

- The maintained research runner now supports `--preferred-category OBSERVATION`
- The operator-side gap was fixed in `#238`
- Live dry-runs still surfaced only interpretation-heavy macro candidates from the research matrix
- The actual live publish attempt then hit the existing external blocker:
  - `demos.connect()` timed out after `15000ms`
- This means:
  - `OBSERVATION` is not missing as a code concept anymore
  - but the current research-family runner is the wrong proof surface for clean factual observation
  - and the specific live proof was blocked by external infra before publish

## Category-By-Category Read

### ANALYSIS baseline

- Already proven live before this rollout
- Still the strongest current reaction-earning lane when the topic and timing are right

### OBSERVATION

- Still underbuilt at the operator level even after the research-matrix preference patch
- The problem is not enum support; it is path shape
- Forcing macro research topics into factual reporting is brittle and low-signal

### PREDICTION

- Stronger than expected operationally
- The core open question is no longer “can we publish one?” but “does the resulting verdict resolve cleanly and credibly tomorrow?”

### ACTION

- Operationally healthy
- The path is now real enough that further work should focus on when to invoke it, not whether it exists

## Next Build Direction

Build a maintained standalone `OBSERVATION` publish path.

Why this and not something bigger:

- `PREDICTION` already has a maintained path and a live publish
- `ACTION` already has a maintained path and a live publish
- `OBSERVATION` is the only foundational category still lacking a clean first-class operator path
- The failed proof showed that piggybacking on research families is the wrong way to prove factual observation

What the next `OBSERVATION` path should look like:

- one attested source
- one factual current-state claim
- no watcher / no invalidation / no implied thesis
- no dependency on research-family analysis angles
- maintained script, not an ad hoc one-off probe

## What Should Wait

- No multi-category router
- No planner/dashboard/autonomous publisher layer
- No extra category expansion beyond the already-landed Tier-1 set
- No more research-family doctrine tuning just to coerce `OBSERVATION`
- No productization of the `PREDICTION` lane until the queued self-verification resolves tomorrow

## Decision

The Tier-1 rollout did what it needed to do.

- It proved `PREDICTION`
- It proved `ACTION`
- It isolated the remaining `OBSERVATION` gap precisely enough to build the right next slice

So the next build is not “more category architecture.”

It is:

1. add a dedicated maintained `OBSERVATION` operator path
2. run one live proof through it
3. then revisit whether the whole-category surface is structurally complete enough to stop building and just exploit
