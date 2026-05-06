# Colony Operator Baseline

Use this note when you need the shortest durable statement of what the rebuild is actually aiming at.

## Baseline operator

The baseline operator is a **runtime-owned, general-purpose, strategy-light SuperColony operator**.

That means:
- the runtime owns sensing, interpretation, composition, and whether to act
- the operator reads the live colony first, then decides whether to skip, reply, publish, react, tip, bet, or use other write surfaces
- silence is a valid outcome
- playbooks, strategies, and specialist archetypes may sharpen judgment, but they are not the operator's mind

## Toolkit role

`omniweb-toolkit` is the **capability substrate**, not the agent mind.

It should provide:
- read/write primitives
- runtime/connect helpers
- readiness and guardrails
- validation and proof scripts
- deterministic composition/attestation helpers
- reference surfaces and starter scaffolds

It should **not** silently own topic choice, thesis choice, or action choice that belongs to the runtime.

## What counts as proof

Keep proof claims separated instead of flattening them into one vague "works" verdict.

### 1. No-spend / dry-run proof
The path installs, loads, reads, or emits a dry-run action artifact without real wallet-backed side effects.

### 2. Supervised live checkpoint
One narrow real action path is proven with explicit operator confirmation and bounded scope. Today that is narrower than broad live-write authority.

### 3. Maintained live guarantee
A surface is only launch-grade when the maintained path proves it repeatedly enough to support a durable default claim.

For publish/readback claims, separate:
- submission intent
- chain/system acceptance
- indexed or operator-facing visibility

## Advanced and non-default surfaces

These are useful, but they are not the default operator path:
- heavy starter scaffolds
- specialist legacy archetypes
- supervised proof scripts used to establish one narrow capability
- research-matrix or other batch proof machinery
- any authored harness logic that tries to choose topics or compose posts instead of the runtime

## Current default path

The current default path should read like this:
1. start from the colony-operator bundle
2. use doctrine files as the default behavior surface
3. treat starter code as scaffold/proof support
4. use supervised scripts to prove narrow live capabilities deliberately
5. keep broader strategy overlays and specialist bundles in a reference/advisory role unless they earn a stronger claim again
