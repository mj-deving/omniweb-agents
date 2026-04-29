---
summary: "Latest outside-in consumer journey drill results for omniweb-toolkit: archetype checks, captured-run scoring, and external-consumer install gate."
read_when: ["consumer journey", "outside-in drills", "launch credibility", "archetype proof", "what works end to end"]
---

# Consumer Journey Drills

Use this file when the question is not "what primitives exist?" but "can a real outside operator move left-to-right through the package's intended journeys today?"

This file complements:

- [launch-proving-matrix.md](./launch-proving-matrix.md) for the maintained proving plan
- [verification-matrix.md](./verification-matrix.md) for method-level proof state
- [minimal-consumer-artifact.md](./minimal-consumer-artifact.md) for the explicit v0 outside-in artifact contract and expansion order

## Latest Recorded Run

- Date: April 29, 2026
- Command set:
  - `npm --prefix packages/omniweb-toolkit run check:package-consumer`
  - `npm --prefix packages/omniweb-toolkit run check:research-agent-consumer`
  - copied `agents/openclaw/research-agent/` bundle to `/tmp`, then `npm install` and `npm run check:starter-smoke`
  - `npm --prefix packages/omniweb-toolkit run check:playbook:research`
  - `npm --prefix packages/omniweb-toolkit run check:playbook:market`
  - `npm --prefix packages/omniweb-toolkit run check:playbook:engagement`
  - `npm --prefix packages/omniweb-toolkit run check:playbook:runs`
  - `npm --prefix packages/omniweb-toolkit run check:publish`
- Aggregated harness: `npm --prefix packages/omniweb-toolkit run check:journeys`

## Current Verdict

- The three shipped archetype paths still pass their maintained journey checks on current live state.
- The stricter captured-run scorer still passes for all three shipped archetypes.
- A clean tarball consumer can install the package, import `omniweb-toolkit` by package name, run one safe live read, and receive a clean missing-env write readiness report without spending DEM.
- A fresh consumer can now also import the smallest research-agent-facing path via `omniweb-toolkit/research-agent-minimal`, preserve no-spend dry-run behavior, perform one safe live read, and still fail honestly on missing write/runtime env.
- The exported OpenClaw research-agent bundle now has an explicit lightweight parity contract at this same minimal layer: no heavy deps required just to load, one cheap public-read scaffold when available, no-spend starter behavior, and honest degradation when dry-run/live-read prerequisites are absent.
- The first registry install path is still not fully launch-ready because npm publish remains blocked by missing auth in the publishing environment.
- The strongest remaining journey blockers are still on the live write/readback side:
  - publish emits tx hashes but visibility is still inconsistent
  - reply emits tx hashes but direct post lookup still returns `404`
  - tip emits a tx hash but spend readback stays stale

## Journey Outcomes

### Research Agent Publish Journey

- Status: pass on the maintained path
- Evidence:
  - live feed read passed
  - live leaderboard read passed
  - publish-readiness gate passed with no blockers
  - packaged research trajectory example passed with overall score `93.25`
- Interpretation:
  - the research-agent path can observe, choose a gap, and clear the pre-publish gate
  - the remaining launch-risk is still post-publish visibility, not the observe or gating path itself

### Market Analyst Publish-First Journey

- Status: pass on the maintained path
- Evidence:
  - endpoint-surface check passed
  - response-shape check passed
  - live leaderboard read passed
  - publish-readiness gate passed with no blockers
  - packaged market trajectory example passed with overall score `93.25`
- Interpretation:
  - the market-analyst journey is structurally healthy and the live market-read context is current
  - the journey is still partially constrained by the same publish visibility gap if you want a launch-grade publish-first claim

### Engagement Optimizer Curation Journey

- Status: pass on the maintained path
- Evidence:
  - live feed read passed
  - live leaderboard read passed
  - response-shape check passed
  - publish-readiness gate passed with no blockers
  - packaged engagement trajectory example passed with overall score `93.25`
- Interpretation:
  - the curation and selection loop is viable today
  - the remaining live risk is on the tip readback side, not on feed discovery or score-aware selection

### Captured Archetype Runs

- Status: pass
- Evidence:
  - `research-agent.run.json`: `PASS`, score `100`
  - `market-analyst.run.json`: `PASS`, score `100`
  - `engagement-optimizer.run.json`: `PASS`, score `100`
- Interpretation:
  - the packaged run examples still represent the intended discipline for all shipped archetypes

### Package Tarball Consumer

- Status: pass
- Evidence:
  - `npm run check:package-consumer` builds and packs the package
  - the packed tarball installs into a clean temporary consumer workspace
  - the consumer imports `omniweb-toolkit`, `omniweb-toolkit/agent`, and `omniweb-toolkit/types` by package name
  - the consumer renders a plan-only dry-run prompt with explicit no-publish / no-spend rules
  - the consumer runs one safe live read through `createClient().getFeed({ limit: 1 })`
  - `checkWriteReadiness()` reports missing `DEMOS_MNEMONIC` and optional wallet/runtime substrate without spending DEM
- Interpretation:
  - the package-first alpha path is no longer only a repo-relative example path
  - OpenClaw remains distribution/documentation only until a separate runtime execution proof exists

### Research-Agent Minimal Package Consumer

- Status: pass
- Evidence:
  - `npm run check:research-agent-consumer` installs the packed tarball into a clean temporary consumer workspace
  - the consumer imports `omniweb-toolkit/research-agent-minimal` by package name
  - the path preserves no-spend dry-run behavior
  - the path performs one safe live read
  - missing `DEMOS_MNEMONIC` and optional write substrate are still reported honestly
- Interpretation:
  - the repo now has a research-agent-specific minimal package consumer proof, not just a generic package proof
  - this is still intentionally below full runtime and live-write scope

### Lightweight OpenClaw Bundle Parity

- Status: pass at the minimal layer
- Evidence:
  - a copied `agents/openclaw/research-agent/` bundle installs cleanly in a standalone temp workspace
  - `npm run check:starter-smoke` selects `bundle` mode when runtime deps are absent
  - the starter performs one cheap public stats read and emits a no-spend prompt scaffold
  - the bundle degrades honestly instead of pretending dry-run or live-read readiness
- Interpretation:
  - the exported OpenClaw workspace path is now aligned with the smallest truthful behavior layer proved on the package side
  - this is parity of behavior shape, not full standalone-package or full-runtime equivalence

### First External Consumer Install

- Status: degraded
- Evidence:
  - `check:package` passes
  - npm registry name is still available
  - `check:publish` returns `blocked_npm_auth_missing`
- Interpretation:
  - a checked-out repo consumer can validate and use the package now
  - the first npm-based outside install is still blocked by publishing environment setup, not by the package structure itself

## What Still Blocks A Stronger Public Claim

1. registry publication must move from "auth missing" to an actual published install path
2. publish visibility must converge with the returned tx hash
3. reply visibility must converge with the returned tx hash
4. tip spend must show up reliably in readback
5. outside docs should keep pointing directly at these current journey truths instead of implying all live writes are equally strong
