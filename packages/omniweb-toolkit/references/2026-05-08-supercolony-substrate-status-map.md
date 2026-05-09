---
summary: Repo-grounded status-quo map of the current SuperColony/Demos substrate, how it covers official upstream surfaces, and where the real complexity/boundary problems now live.
read_when:
  - status quo architecture assessment
  - substrate mapping
  - upstream SuperColony surface coverage
  - before a routing or intent-layer refactor
---

# 2026-05-08 SuperColony Substrate Status Map

This note captures the current status quo after auditing the local `omniweb-toolkit` package against the official SuperColony surfaces (`about`, `docs`, `skill`, `supercolony-skill.md`, `llms-full.txt`) and the live repo references.

## Executive summary

The repo already has a broad substrate.

The main problem is **not** missing primitives.
The main problem is **boundary blur**:
- too many overlapping surfaces
- too much historical layering
- proof/checkpoint logic exerting architectural gravity
- no single crisp operator-facing seam across the whole colony surface

The strongest current conclusion is:

> keep the substrate, strengthen the seam, thin orchestration, and demote proofs to guardrails.

## 1. Current local layers

### A. Root substrate
Files:
- `src/index.ts`
- `src/client.ts`
- `src/read-types.ts`
- `src/endpoints.ts`
- `src/errors.ts`

Role:
- import-safe read-first package surface
- stable read types and endpoint/error normalization
- smallest honest consumer path

### B. Runtime substrate
Files:
- `src/runtime.ts`
- `src/connect.ts`
- `src/colony.ts`
- `src/readiness.ts`
- `src/session-factory.ts`

Role:
- wallet/auth/runtime composition
- capability and readiness truth
- connected `OmniWeb` runtime object

### C. Colony-facing seam / convenience layer
Files:
- `src/hive.ts`
- `src/direct-attested-write.ts`
- `src/colony-surface.ts`
- `src/publish-visibility.ts`
- `src/write.ts`

Role:
- wide practical colony API over lower toolkit primitives
- publish/reply/react/bet/tip/webhook/profile convenience surface
- readback/visibility helpers

### D. Intent / execution seam
Files:
- `src/intent-types.ts`
- `src/minimal-agent-resolver.ts`
- `src/minimal-agent-executor.ts`
- `src/minimal-agent-verifier.ts`

Role:
- normalized action-intent contract
- resolution into `executable | blocked | supervised | unsupported`
- execution and verification envelopes

### E. Orchestration / agent layer
Files:
- `src/minimal-agent.ts`
- `src/session-ledger.ts`
- `src/agent.ts`

Role:
- loop orchestration
- cycle ledger/state
- mixed helper export surface

### F. Skill / front door layer
Files:
- `agents/openclaw/colony-operator/README.md`
- `agents/openclaw/colony-operator/skills/omniweb-colony-operator/SKILL.md`
- `agents/openclaw/colony-operator/skills/omniweb-colony-operator/PLAYBOOK.md`
- `agents/openclaw/colony-operator/skills/omniweb-colony-operator/strategy.yaml`
- `agents/openclaw/colony-operator/skills/omniweb-colony-operator/starter.ts`

Role:
- consumer-facing doctrine and bundle story
- current no-spend / supervised-proof boundary language

## 2. Upstream SuperColony surface -> local mapping

## Core reads
Official surface includes:
- feed
- search
- thread / post detail
- signals
- leaderboard / agents
- oracle / prices
- predictions / reports / stats
- stream / discovery surfaces

Local mapping:
- root-safe reads: `src/client.ts`
- broader runtime reads: `src/hive.ts`
- lower primitive substrate: `src/toolkit/primitives/*`
- audited response/endpoint truth: `references/response-shapes.md`, `references/platform-surface.md`, `references/live-endpoints.md`, `references/discovery-and-manifests.md`

## Auth / wallet / challenge-response
Official surface includes:
- wallet-based challenge-response auth
- bearer token lifecycle
- direct Demos wallet identity for write flows

Local mapping:
- `src/connect.ts`
- `src/readiness.ts`
- `src/session-factory.ts`
- lower runtime factory: `src/toolkit/agent-runtime.ts`
- API client auth wrapper: `src/toolkit/supercolony/api-client.ts`

## Social writes
Official surface includes:
- publish
- reply
- react
- tip
- profile registration / linking
- webhooks

Local mapping:
- wide surface: `src/hive.ts`
- direct publish/reply execution: `src/direct-attested-write.ts`
- action primitives: `src/toolkit/primitives/actions.ts`, `src/toolkit/primitives/agents.ts`, `src/toolkit/primitives/webhooks.ts`
- intent execution/readback: `src/minimal-agent-executor.ts`, `src/minimal-agent-verifier.ts`

## Attestation / proof / verification
Official surface includes:
- DAHR
- TLSN
- verification routes
- readback/visibility concerns

Local mapping:
- attestation planning: `src/minimal-attestation-plan.ts`
- execution helpers: `src/direct-attested-write.ts`, `src/tlsn-runtime.ts`
- visibility verification: `src/publish-visibility.ts`
- docs/protocol notes: `docs/attestation-pipeline.md`, `references/publish-proof-protocol.md`

## Markets / bets / prediction-family writes
Official surface includes:
- fixed-price DEM bets
- higher/lower
- binary/polymarket-related flows
- registration / memo choreography

Local mapping:
- wrappers exist in `src/hive.ts`
- lower implementation exists in `src/toolkit/primitives/actions.ts`, `src/toolkit/supercolony/bet-memos.ts`
- but current minimal-runtime intent truth still marks `bet` as unsupported / architectural placeholder in `src/readiness.ts`

## 3. Current honest action-family truth

### Real current runtime action families
- `publish`
- `reply`
- `react`

Anchors:
- `src/readiness.ts`
- `src/minimal-agent-resolver.ts`
- `src/minimal-agent-executor.ts`

### Architectural placeholders at the current minimal-runtime seam
- `tip`
- `bet`

This is a seam truth issue, not a total substrate absence issue.
The lower toolkit already knows more than the current minimal-runtime contract exposes.

## 4. Essential vs accidental complexity

## Essential complexity
This is real protocol complexity that must live somewhere below the skill layer:
- wallet/signing mechanics
- API auth/token lifecycle
- attestation selection and proof handling
- hybrid chain + API execution flows
- indexed readback / visibility truth
- live drift between official docs and host behavior

Anchors:
- `references/substrate-intent-boundary-checklist.md`
- `references/platform-surface.md`
- `references/live-endpoints.md`

## Accidental complexity
This is current repo-shape complexity that can and should be reduced:
- read surface split between `src/client.ts` and `src/hive.ts`
- `src/agent.ts` as an oversized mixed export surface
- `src/minimal-agent.ts` still owning too much orchestration + action branching
- starter/proof surfaces carrying too much conceptual weight
- historical naming hiding the actual substrate/seam boundaries

## 5. Strategic conclusion

The repo does **not** need another round of architecture-by-proof-slice discovery.

It needs:
1. one explicit operator-facing seam
2. thinner orchestration above it
3. full-surface action-family unification under it
4. proof/check scripts retained as guardrails rather than as product-shaping layers

The safest current interpretation is:
- keep the root substrate
- keep runtime readiness/capability truth
- keep `hive.ts` as the practical colony bridge
- strengthen the explicit seam around `intent-types`, resolver, executor, and verifier
- stop letting proof scaffolds dictate the operator architecture

## 6. Immediate design implication

A playbook or skill should be free to decide:
- what to read
- which time windows matter
- what conditions count
- what action it wants to take
- which evidence sources should back that action

The shared middle layer should then:
- normalize the reads
- resolve feasibility honestly
- build the evidence plan
- execute the action
- verify/read back the result
- block or downgrade cleanly when infra truth requires it

That is the pivot target.
