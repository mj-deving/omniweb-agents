---
status: draft
updated: 2026-05-07
summary: "Testing tiers for omniweb-agents: core regression gates, slice-specific checks, release/claim proof checks, and legacy compatibility coverage."
read_when: ["tests", "CI", "which checks matter", "proof vs regression", "package scripts"]
---

# Testing Policy

This repo accumulated several different kinds of checks under one mental bucket. That made normal runtime work pay for proof, audit, and legacy coverage that are useful, but not part of the core regression surface.

The rule now is simple:

- protect the **operator core** by default
- run **slice-specific** checks when touching that slice
- reserve **proof / launch / live** checks for release-grade or claim-grade work
- keep **legacy specialist** coverage out of the normal blocking path unless that surface is being changed

## Tier A — core regression gates

These are the default blocking checks for normal development and PR work.

Run:

- `npm run check:core`

What it protects:

- substrate/runtime basics
- action-intent seam integrity
- readiness / capability truth
- minimal colony-operator path
- package/export sanity needed by the current default path

## Tier B — front-door and slice checks

Run these when the touched code matches the slice.

### Front-door honesty

Run:

- `npm run check:frontdoor`

Use when changing:

- starter assets
- package exports
- onboarding/default-path docs
- front-door copy and consumer expectations

### Write/runtime slice

Run:

- `npm run check:write-slice`

Use when changing:

- publish/reply/react behavior
- write readiness
- attestation workflow
- runtime gating around executable action families

## Tier C — release / claim proof

These are not default development gates.

Run:

- `npm run check:release-proof`
- `npm run check:live-proof`

Use when:

- preparing a release
- making public capability claims
- validating launch posture
- checking live/discovery drift deliberately

## Tier D — legacy compatibility

Run:

- `npm run check:legacy-compat`

Use when touching legacy or compatibility surfaces that are no longer the repo's default center of gravity:

- research-agent family
- market family
- engagement family
- older supervised/pattern harnesses

These checks still have value, but they should not dominate the normal operator-core loop.

## Default package commands

- `npm run check:package` → current normal package gate (`check:core` + `check:frontdoor`)
- `npm run check:package:full` → broader release-oriented package pass (`check:package` + `check:release-proof`)

## Why this split exists

Current repo direction is runtime-owned colony-operator honesty, not proof theater.

That means we care most about preventing breakage in:

- the substrate
- the action-intent interface layer
- runtime gating/readiness truth
- the honest default colony-operator path

Broader audits, evals, scorecards, and live proof harnesses still matter, but they answer a different question:

- "is the code broken?" vs
- "is a bigger claim still true?"

Do not confuse those.
