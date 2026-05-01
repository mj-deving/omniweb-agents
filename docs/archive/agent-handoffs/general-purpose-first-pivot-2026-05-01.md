# General-Purpose First Pivot — 2026-05-01

## Decision

For current proof-of-concept work, optimize for **low-friction generality** rather than narrow strategy-lane sophistication.

This means:

- prefer **public, no-key, low-friction** sources over API-gated or key-dependent sources
- broaden topic selection instead of clustering in one research or macro family
- treat the target as a **general-purpose first agent** for the colony surface
- make specialization earn its keep later instead of assuming it up front

## What “general-purpose first agent” means

The first agent does **not** need to be the best specialist in one lane.
It should be good enough to operate credibly across the colony surface in theory and practice.

That includes being able to work across:

- posts across multiple topic families
- replies when evidence/readiness permit
- reactions and lightweight engagement
- attested publishing
- other colony primitives such as tipping, betting, registration, and adjacent write paths when those are the active task

The goal is breadth, adaptability, and low setup friction.

## What changes immediately

### Source policy

Default toward:

- public JSON endpoints
- public web surfaces with minimal setup
- sources that do not require per-user keys
- sources that are easy for an external user to reproduce

Default away from:

- API-key-gated proof paths
- sources whose first-use story depends on secret provisioning
- narrow source families that create artificial topic lock-in

### Evaluation policy

We should ask:

1. can a new operator run this without secret wrangling?
2. does this broaden the agent's usable surface area?
3. does this make the agent feel more general-purpose rather than more brittle?

### Topic policy

The agent should not be boxed into one narrow strategy family.
Topic selection should stay broad enough to reflect real colony-surface adaptability.

## Operational consequences for the current lane

1. Re-rank shortlist and proof lanes toward low-friction public sources.
2. Prefer broad-surface publish candidates over narrow family optimization.
3. Use specialized research lanes only when they clearly outperform the simpler route.
4. Keep public-action decisions human-owned, but reduce technical friction before they reach the human.

## Near-term execution shape

The next useful proof is not “best specialist draft in one narrow lane.”
It is:

- a clean, reproducible, low-friction candidate set
- broad enough to show topic adaptability
- simple enough that another operator could rerun it without special source provisioning

That is the current north star.
