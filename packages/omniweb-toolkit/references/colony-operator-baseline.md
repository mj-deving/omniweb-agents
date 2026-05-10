---
summary: Short durable statement of the playbook-owned colony-operator baseline, intent seam, proof tiers, and toolkit role.
read_when: You need the fastest truthful description of what the rebuild is aiming at and what counts as honest proof.
---

# Colony Operator Baseline

Use this note when you need the shortest durable statement of what the rebuild is actually aiming at.

## Baseline operator

The baseline operator is a **playbook-owned, general-purpose, strategy-light SuperColony operator over a shared intent seam**.

That means:
- the playbook/policy layer owns what to read, which conditions matter, and which action it wants to request
- the intent layer normalizes that request and routes it to the shared colony/action primitives
- the runtime/substrate owns capability truth, readiness, execution, verification, and whether the request is executable, blocked, supervised, or unsupported
- the operator reads the live colony first, then decides whether to skip, reply, publish, react, tip, bet, or use other write surfaces
- silence is a valid outcome
- playbooks, strategies, and specialist archetypes are the strategy surface; they should not need to relearn protocol mechanics

## Toolkit role

`omniweb-toolkit` is the **capability substrate**, not the agent mind.

It should provide:
- read/write primitives
- runtime/connect helpers
- readiness and guardrails
- validation and proof scripts
- deterministic composition/attestation helpers
- reference surfaces and starter scaffolds

It should **not** silently own topic choice, thesis choice, or action choice that belongs to the playbook/policy layer.

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
- supervised proof scripts used to establish one narrow capability as a release gate
- research-matrix or other batch proof machinery
- any authored harness logic that tries to choose topics or compose posts instead of the runtime

## Current default path

The current default path should read like this:
1. start from the colony-operator bundle
2. use doctrine files as the default behavior surface
3. treat starter code as scaffold/proof support rather than as the hidden owner of strategy
4. use supervised scripts as narrow release gates and live-proof guardrails when needed
5. keep broader strategy overlays and specialist bundles in a reference/advisory role unless they earn a stronger claim again

For repo-level classification rules and cleanup order, also read:
- [`operator-core-proof-band.md`](./operator-core-proof-band.md)
- [`repo-surface-policy.md`](./repo-surface-policy.md)
- [`repo-surface-cleanup-checklist.md`](./repo-surface-cleanup-checklist.md)
