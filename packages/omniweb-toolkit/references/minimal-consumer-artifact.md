---
summary: "V0 contract for the smallest real external consumer artifact and how capability should expand from it."
read_when: ["minimal consumer artifact", "start small", "outside-in packaging", "research-agent install path", "what is the real v0"]
---

# Minimal Consumer Artifact Contract

This file exists to stop drift between three different things that are easy to conflate:

1. the packed `omniweb-toolkit` package consumer path
2. the exported OpenClaw workspace bundles under `agents/openclaw/`
3. the eventual stronger goal of a truly simple outside install + runtime path

## Current V0 Verdict

The **current smallest proven external consumer artifact** is:

- a packed `omniweb-toolkit` package tarball
- installed into a clean temporary consumer workspace
- imported by package name
- exercised through a safe no-spend proof

That path is already maintained by:

- `npm run check:package-consumer`

## What V0 Proves Today

`check:package-consumer` proves that a fresh consumer can:

- install the packed package into a clean workspace
- import `omniweb-toolkit`, `omniweb-toolkit/agent`, and `omniweb-toolkit/types` by package name
- render a deterministic plan-only dry-run prompt with explicit no-publish / no-spend rules
- run one safe live read
- receive write-readiness feedback that reports missing env instead of trying to spend DEM

This is enough to call the package path a **real external consumer artifact**.

## What V0 Is Not

V0 is **not** the same thing as:

- a copied exported OpenClaw bundle acting as a full standalone npm consumer package
- a full live-write runtime path
- clone-and-go wallet-backed OmniWeb execution
- a published npm install story from the public registry

Those are later capability layers.

## Relationship To The Exported OpenClaw Bundle

The exported `agents/openclaw/research-agent/` bundle has a different honest role:

- it is a **lightweight OpenClaw workspace artifact**
- it supports no-install inspection, skill loading, explanation, and lightweight starter smoke
- it should degrade safely instead of assuming heavy runtime deps

That bundle is truthful and useful, but it is not the current v0 package-consumer artifact.

## Expansion Rule

Do not jump straight from v0 to "full dependency load" or "everything should work live".

Expand capability in this order:

1. **v0 package consumer** — install, import, dry-run prompt, one safe read, missing-env readiness
2. **simpler research-agent-facing entrypoint** on top of the package proof
3. **lightweight OpenClaw bundle parity** where the same minimal behavior is easy to reach
4. **dry-run runtime enrichment** with deferred optional deps
5. **live-read runtime proof**
6. **wallet-backed live-write proof**

Each layer should be proven before the next one becomes part of the public claim.

## Error Handling Rule

When a new layer fails:

- narrow the failure to the smallest truthful claim
- cut a specific follow-up bead
- fix the layer without pretending the whole stack is already solved

That is the intended development model for this package.

## Current Implementation Step

The minimal research-agent path now has four proven layers:

- importable subpath: `omniweb-toolkit/research-agent-minimal`
- packaged example: `examples/research-agent-minimal.mjs`
- maintained package proof: `npm run check:research-agent-consumer`
- maintained deferred dry-run proof: `npm run check:research-agent-dry-run`
- maintained explicit live-read proof: `npm run check:research-agent-live-read`
- maintained explicit live-write gate proof: `npm run check:research-agent-live-write-gate`
- current proof scope: clean tarball install, package-name import, no-spend dry-run behavior, one safe live read in the package-consumer path, honest missing-env readiness reporting, successful forced deferred dry-run runtime from the source workspace when optional deps are present, explicit read-only starter proof without wallet-backed execution, and explicit live-write failure when wallet/runtime prerequisites are absent

That keeps the evolution path honest: prove each layer separately instead of pretending the copied OpenClaw bundle or the package surface already guarantees the full stack.
