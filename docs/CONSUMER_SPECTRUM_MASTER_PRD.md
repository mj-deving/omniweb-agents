---
type: master-prd
status: active
created: 2026-05-18
source_contract: docs/CONSUMER_SPECTRUM_GOAL_BRIEF.md
owner_bead: omniweb-agents-spectrum
summary: "GoalMode execution surface for the no-release consumer-spectrum and codebase reality map epic."
---

# Consumer Spectrum And Codebase Reality Map - Master PRD

## Section 0. Frontmatter

- Author: Codex
- Created: 2026-05-18
- Status: ACTIVE
- Source contract: `docs/CONSUMER_SPECTRUM_GOAL_BRIEF.md`
- Stable anchors: AC-1 through AC-10
- Owner bead: `omniweb-agents-spectrum`
- First implementation bead: `omniweb-agents-spectrum.1`
- Target stack: Node.js 22+, npm workspaces, TypeScript, `tsx`, Vitest, SuperColony production host
- No-release gate: no npm publish, no public registry install claim, no registry proof
- No-spend gate: default checks must not spend DEM or mutate identity

## Section 1. Problem

The package now has capability truth, guardrails, admissibility, and a maintained operator-cycle proof. That does not mean it is ready for release or full consumer use. The official SuperColony surface is broader than the current package map, and some advertised discovery resources currently return 404. The local codebase also contains older features, scripts, and compatibility surfaces whose reachability is unclear.

The next work must map actual truth before implementation widens or cleanup deletes code.

## Section 2. Vision

A package consumer should eventually be able to use `omniweb-toolkit` across the maintained colony spectrum:

- discovery and docs metadata
- feed, thread, search, RSS, and SSE
- signals, reports, stats, scoring, verification, and profiles
- chat and webhooks where live surfaces exist
- identity reads and supervised identity mutation paths
- reactions, tips, publish/reply/VOTE, and no-spend action planning
- fixed-price, higher/lower, binary, graduation, commodity, sports, and ETH market reads
- no-spend write intents and admissibility for all mapped market classes

## Section 3. Out Of Scope

- npm release or public registry proof.
- Live spend as part of the default epic.
- Unsupervised identity mutation.
- Deleting code without inventory classification.
- Claiming support from docs alone when live response shape disagrees.
- Treating one market family as proof for all market families.
- Treating OpenAPI absence as package failure when the official skill or live endpoint proves a separate advertised surface.

## Section 4. Architecture

### Section 4.1 Inventory Gate

`check:consumer-spectrum-inventory` is the first gate. It must:

- fetch official discovery resources that are safe to read
- parse live OpenAPI paths
- probe safe GET endpoint response shapes
- skip mutating and streaming calls by default while recording why
- classify advertised 404 resources honestly
- compare against toolkit capability manifest and official skill coverage
- emit a structured JSON report

### Section 4.2 Codebase Map

The follow-up codebase map must classify surfaces as:

- public/exported and tested
- public/exported and uncovered
- internal reachable
- scripts-only
- docs-only
- test-only
- duplicate or superseded
- stale, dead, or orphaned
- blocked by auth, external service, mutation, or spend

### Section 4.3 Widening Lanes

Only after the inventory and codebase map can later beads widen:

- public exports and local/tarball consumer coverage
- auth, RSS, and SSE transports
- reads, profiles, scoring, and verification
- chat and webhook lifecycle
- market read matrix
- no-spend market write intents and admissibility

### Section 4.4 Completion Proof

The final proof is local/tarball consumer use, not registry publication. It should install from workspace or packed tarball and exercise the maintained spectrum with honest blocked/unsupported verdicts.

## Section 5. Validation Ladder

Use the smallest meaningful gate per PR:

- `npx vitest run tests/packages/consumer-spectrum-inventory.test.ts`
- `npm --prefix packages/omniweb-toolkit run check:consumer-spectrum-inventory`
- `npx vitest run tests/packages/codebase-reachability-inventory.test.ts`
- `npm --prefix packages/omniweb-toolkit run check:codebase-reachability`
- `npx vitest run tests/packages/public-export-coverage.test.ts`
- `npm --prefix packages/omniweb-toolkit run check:public-export-coverage`
- `npx vitest run tests/packages/transport-consumers.test.ts`
- `npm --prefix packages/omniweb-toolkit run check:transport-consumers`
- `npx vitest run tests/packages/read-profile-consumers.test.ts`
- `npm --prefix packages/omniweb-toolkit run check:read-profile-consumers`
- `npx vitest run tests/packages/chat-webhook-consumers.test.ts`
- `npm --prefix packages/omniweb-toolkit run check:chat-webhook-consumers`
- `npm --prefix packages/omniweb-toolkit run check:live:detailed` when live-read changes justify the broader gate
- `npm --prefix packages/omniweb-toolkit run check:frontdoor` for package-surface changes
- `git diff --check`
- `bd ready --json`
- `bd dolt push`

## Section 6. Beads

- `omniweb-agents-spectrum.1`: inventory gate
- `omniweb-agents-spectrum.2`: codebase reachability and ballast
- `omniweb-agents-spectrum.3`: proven deadweight cleanup
- `omniweb-agents-spectrum.4`: public exports and consumer coverage
- `omniweb-agents-spectrum.5`: auth plus RSS/SSE transports
- `omniweb-agents-spectrum.6`: read/profile/scoring/verification coverage
- `omniweb-agents-spectrum.7`: chat and webhook lifecycle
- `omniweb-agents-spectrum.8`: market read matrix
- `omniweb-agents-spectrum.9`: no-spend market write intents
- `omniweb-agents-spectrum.10`: local/tarball whole-spectrum proof
