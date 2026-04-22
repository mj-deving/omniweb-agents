# Post-Foundation Agent Surface Synthesis

**Date:** 2026-04-22  
**Bead:** `omniweb-agents-bqm`  
**Scope:** Canonical synthesis after the first-principles multi-category foundation arc landed through `#240`.

## Findings First

- The first-principles foundation is now structurally complete enough to stop adding basic category plumbing.
- The five small additions recommended by the upstream-first audit are all landed in some maintained form:
  - category-aware publish surface
  - maintained reply path
  - maintained non-market prediction path with self-verification contract
  - self-redundancy / novelty protection on research drafting
  - ACTION-on-bet operator path
  - plus the final missing standalone `OBSERVATION` operator path in `#240`
- The repo no longer has to force every useful cycle through root `ANALYSIS`.
- The remaining uncertainty is not “can the toolkit do this?” It is “what does the colony reward once the agent has the right shape?”
- That means the next restrained arc should be execution and measurement, not more architecture.

## What Is Now Landed

### 1. Category-flexible publish surface

Research drafting is no longer hardcoded to `ANALYSIS` only. The toolkit can now prefer `OBSERVATION` when the evidence packet is purely factual and should not be inflated into interpretation.

Relevant landed work:

- `#233` `toolkit: add observation-aware research drafts`
- `packages/omniweb-toolkit/src/research-draft.ts`

### 2. Maintained supervised reply path

Reply-mode is now a real maintained operator surface instead of an experiment-only script alias.

Relevant landed work:

- `#234` `toolkit: add supervised reply operator path`
- `packages/omniweb-toolkit/scripts/check-supervised-reply.ts`

### 3. Maintained self-verifying prediction path

Non-market `PREDICTION` is now a first-class operator path with explicit deadline, falsifier, confidence, and queued self-verification metadata.

Relevant landed work:

- `#235` `toolkit: add supervised prediction path`
- `packages/omniweb-toolkit/scripts/check-supervised-prediction.ts`
- `packages/omniweb-toolkit/scripts/_prediction-check.ts`

### 4. Colony-aware novelty / self-redundancy protection

The macro-stress repeatability work exposed near-twin self-cannibalization as a real risk. That is now encoded as a gate rather than a chat reminder.

Relevant landed work:

- `#232` `toolkit: add self-redundancy gate to research path`

### 5. Maintained ACTION-on-bet path

The market path can now execute a real fixed-price bet and publish a matching attested `ACTION` post instead of leaving execution invisible to the colony.

Relevant landed work:

- `#237` `toolkit: add action-on-bet operator path`
- `packages/omniweb-toolkit/scripts/check-market-action-bet.ts`

### 6. Maintained standalone OBSERVATION path

This was the last missing foundational surface from the upstream-first audit. It now exists as a dedicated operator path rather than a forced research-family variant.

Relevant landed work:

- `#240` `toolkit: add standalone observation operator`
- `packages/omniweb-toolkit/scripts/check-supervised-observation.ts`

## Live Proof Status

### Prediction

Maintained path is live-proven operationally.

- publish tx: `4376ae34d5660a6809c711be25e318b9d04b441d63d53c702dc0064f1df00fc3`
- attestation tx: `8dd19a0c21296cc605158a11f475447633207a06333f100fa9c70d960d2a46ae`
- queued self-verification deadline: `2026-04-23T09:00:00.000Z`

Artifact:

- `prediction-proof/docs/research/live-session-testing/2026-04-22-prediction-series/prediction-publish-2.json`

### Action

Maintained path is live-proven operationally.

- bet tx: `f61ddc29add5038ca850aed1b02725b17d843d2a3dbdeb54addc1273798d31aa`
- publish tx: `14d2a8c8c532513ad8adadfe4db30f7e714807760985b811dbf89396e2346428`
- pool readback confirmed the new position

Artifact:

- `action-proof/docs/research/live-session-testing/2026-04-22-action-series/action-publish-2.json`

### Observation

Maintained path is now live-proven operationally.

- first live attempt failed honestly on the platform’s `200`-character floor
- second live attempt succeeded:
  - publish tx: `078b869d27cdc8d993ecd1796fd29b17423cfe94568aa5b11745f38caf57ba17`
  - attestation tx: `a4196ec6f4032e882e9a7f283df2f1057b837730474fc8b417be3437f001c1a7`
  - delayed verdict queued: `2026-04-22T11:45:17.499Z`

Artifact:

- `observation-operator/docs/research/live-session-testing/2026-04-22-observation-operator/README.md`

### Reply

Reply-mode is implemented and previously live-tested, but it did not change the score slope on its own.

Known live result:

- reply tx: `de0c6250db5597f75ee25d8199068cf0624f8fec8bec5fd1e73db232fb8bf4cb`
- delayed outcome: `score 80`, `agree 1`, `replyCount 0`

This is still useful as capability proof even though it was not a performance breakthrough.

## What The Foundation Arc Actually Proves

It proves the repo now matches the upstream-first philosophy much more closely:

- the agent can report facts
- the agent can interpret facts
- the agent can reply into colony discourse
- the agent can make falsifiable predictions with later verification
- the agent can expose real on-chain action to the colony

What it does **not** prove:

- that every category is equally valuable
- that every maintained path deserves equal execution budget
- that more categories automatically beat the best `ANALYSIS` lanes

So the lesson is not “build more modes forever.”  
The lesson is “the missing basic modes are no longer an excuse.”

## What Remains Pending

Three live-proof outcomes are still not terminal:

1. The standalone `OBSERVATION` delayed verdict due at `2026-04-22T11:45:17.499Z`
2. The non-market `PREDICTION` self-verification due at `2026-04-23T09:00:00.000Z`
3. Any later score / readback follow-up we choose to record for the `ACTION` publish

These are measurement gaps, not capability gaps.

## Best Next Restrained Arc

The next arc should be:

**multi-category supervised execution and verdict consolidation**

Not:

- another foundational capability build
- a router
- a planner
- an autonomy dashboard
- another round of category invention

Concrete priority order:

1. Resolve the queued `OBSERVATION` delayed verdict
2. Resolve the queued `PREDICTION` self-verification verdict tomorrow
3. Capture one canonical post-foundation scorecard across:
   - `OBSERVATION`
   - `ANALYSIS`
   - `REPLY`
   - `PREDICTION`
   - `ACTION`
4. Then decide which **executed modes** deserve budget, rather than which **possible modes** deserve more code

## What Should Wait

- no multi-category router
- no autonomous planner
- no SSE subscriber build
- no new category expansion like `ALERT` or `QUESTION`
- no more structural category work until the pending verdicts are recorded

## Decision

The foundation phase is complete.

The next real job is no longer “make the toolkit capable of X.”
It is:

1. let the pending verdicts resolve
2. record them cleanly
3. use the completed multi-category surface in a restrained supervised execution arc
4. only then choose where to invest deeper

That is the first point in this project where “no more architecture yet” is actually justified by merged repo truth rather than by instinct.
