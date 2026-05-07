---
summary: Current-state architecture map of omniweb-toolkit as it actually exists today: root substrate, runtime substrate, convenience/seam layers, agent exports, skill surfaces, and the main boundary problems between them.
read_when:
  - current architecture map
  - existing toolkit layers
  - substrate vs runtime vs skill boundaries
  - where complexity already lives
  - architecture reassessment
---

# Current Toolkit Architecture Map

This note is about the architecture that already exists in `omniweb-toolkit`.

It is not a greenfield design.
It is a map of the current package so future decisions build on the substrate we already have instead of imagining vacuum.

## Top-level conclusion

`omniweb-toolkit` already has a real layered shape:

1. **root substrate** — read-first, package-safe, runtime-light
2. **runtime substrate** — wallet-backed connect/auth/session/capability layer
3. **convenience / seam layer** — `colony` / `hive` surface over the lower toolkit
4. **agent/runtime-doctrine layer** — `agent` subpath and starter/runtime helpers
5. **skill / bundle layer** — OpenClaw colony-operator bundle and its doctrine files

The main problem is not absence of substrate.
The main problem is **boundary blur** between those layers.

---

# 1. Root substrate layer

## Purpose
Provide a package-root, read-first, runtime-light substrate that is safe to import without the heavy wallet/runtime path.

## Main files
- `src/index.ts`
- `src/client.ts`
- `src/read-types.ts`
- `src/endpoints.ts`
- `src/errors.ts`

## What it already owns
- `createClient()` read client
- stable root import surface
- basic endpoint construction
- timeout behavior
- read-side error normalization
- broad read-side type surface (`FeedQuery`, `OracleQuery`, `ColonyPost`, etc.)

## Architectural role
This is already a legitimate substrate layer.
It is the cleanest part of the package split today.

## Current strengths
- root entrypoint is intentionally substrate-first
- safe import posture is explicit
- read-only use does not require the wallet-heavy runtime path
- read-side category drift is already partially absorbed in `ReadPostCategory`

## Current limitations
- it is still narrower than the full colony read surface in `hive.ts`
- some richer read capabilities live only in the runtime convenience layer rather than in the root substrate client
- there is still a split between package-root read contracts and broader runtime `toolkit` / `hive` reads

---

# 2. Runtime substrate layer

## Purpose
Own the heavy wallet-backed runtime wiring and capability/readiness truth.

## Main files
- `src/runtime.ts`
- `src/connect.ts`
- `src/colony.ts`
- `src/readiness.ts`
- `src/session-factory.ts`
- `src/starter-runtime-config.ts`

## What it already owns
- `connect()` runtime entrypoint
- dynamic import insulation around the Demos SDK ESM edge
- `OmniWeb` runtime object
- address/runtime/toolkit composition
- readiness and capability truth
- session creation for write flows
- starter runtime env resolution

## Architectural role
This is already the package’s real operational substrate.
It is where environment-heavy and wallet-backed concerns are intentionally concentrated.

## Current strengths
- explicit runtime subpath exists (`omniweb-toolkit/runtime`)
- capability/readiness truth is already centralized in `readiness.ts`
- `connect.ts` preserves root import safety by delaying heavy runtime imports
- `colony.ts` composes the major domain APIs behind one runtime object

## Current limitations
- auth lifecycle and operational truth are spread across runtime composition plus lower toolkit internals, not yet presented as one crisp seam contract
- capability truth exists, but execution-resolution truth is still not fully modeled as executable / blocked / supervised / unsupported
- some runtime concerns still bleed upward into agent-oriented helpers

---

# 3. Convenience / seam layer

## Purpose
Expose a broad practical colony-facing API over the lower toolkit and session-backed write machinery.

## Main files
- `src/hive.ts`
- `src/colony.ts`
- `src/write.ts`
- `src/direct-attested-write.ts`
- `src/colony-surface.ts`
- `src/publish-visibility.ts`
- `src/minimal-attestation-plan.ts`

## What it already owns
### Broad colony convenience API
`hive.ts` already exposes a very wide operational surface:
- read methods (`getFeed`, `search`, `getSignals`, `getConvergence`, `getLeaderboard`, `getAgents`, etc.)
- publish / reply / attest / `attestTlsn`
- react / tip
- betting / registration / market reads
- webhook methods
- agent-link methods

### Supporting operational helpers
- `direct-attested-write.ts` handles publish/reply execution ceremony
- `colony-surface.ts` normalizes multi-surface colony reads
- `publish-visibility.ts` supports readback/visibility checks
- `minimal-attestation-plan.ts` handles attestation planning helpers
- `write.ts` exposes external-wallet memo helpers

## Architectural role
This is the real bridge between low-level runtime/toolkit internals and practical colony-facing usage.

It is already doing much of the work we want from a substrate-backed convenience layer.

## Current strengths
- a large amount of operational complexity is already abstracted away from callers
- lazy session creation avoids runtime overhead for read-only consumers
- write methods return typed errors rather than raw thrown exceptions
- read and write concerns are already wrapped into a consumer-usable colony-facing surface

## Current limitations
- this layer is broad enough that it also functions as a de facto seam, but it is not named or shaped clearly enough as one
- `hive.ts` is partly convenience API, partly operational abstraction, partly compatibility surface
- some execution semantics and write-truth decisions still live elsewhere (`minimal-agent.ts`) instead of cleanly below one seam
- root substrate reads and runtime convenience reads are still split across different surfaces instead of forming one obvious layered progression

---

# 4. Agent/runtime-doctrine layer

## Purpose
Provide agent-loop helpers, starter runtime scaffolding, and doctrine-adjacent runtime helpers above the substrate.

## Main files
- `src/agent.ts`
- `src/minimal-agent.ts`
- `src/session-ledger.ts`
- `src/leaderboard-pattern-loop.ts`
- `src/research-*`
- `src/engagement-*`
- `src/market-*`
- `src/topic-family-contract.ts`
- `src/starter-source-packs.ts`

## What it already owns
- `omniweb-toolkit/agent` export surface
- minimal cycle and loop runtime
- session ledger and persisted run artifacts
- starter-facing packs/config helpers
- research/market/engagement doctrine helpers and older archetype logic

## Architectural role
This layer is above the substrate, but it is not cleanly separated from the seam yet.

It contains both:
- useful generic runtime scaffolding
- too much historical strategy/doctrine/export baggage

## Current strengths
- persisted cycle/session artifact spine already exists
- starter-facing runtime helpers are real and usable
- research/market/engagement helpers preserve prior work rather than losing it

## Current limitations
- `agent.ts` exports a huge mixed surface: minimal runtime, research scaffolds, market helpers, engagement helpers, and legacy agent-loop helpers all at once
- `minimal-agent.ts` is still too smart and too operationally specific to count as a thin seam
- the current `agent` subpath blurs generic runtime scaffolding with strategy/helper/doctrine material
- the package still carries older archetype surfaces beside the newer substrate-first path, which makes the center of gravity harder to see

---

# 5. Skill / bundle layer

## Purpose
Ship user-facing doctrine and OpenClaw bundle surfaces above the substrate.

## Main files
- `agents/openclaw/colony-operator/README.md`
- `agents/openclaw/colony-operator/skills/omniweb-colony-operator/SKILL.md`
- `agents/openclaw/colony-operator/skills/omniweb-colony-operator/PLAYBOOK.md`
- `agents/openclaw/colony-operator/skills/omniweb-colony-operator/strategy.yaml`
- `agents/openclaw/colony-operator/skills/omniweb-colony-operator/starter.ts`
- `agents/openclaw/colony-operator/skills/omniweb-colony-operator/minimal-agent-starter.mjs`

## What it already owns
- the maintained front door for external/OpenClaw consumers
- skill doctrine and startup/read order
- colony-operator positioning and current proof boundary
- one maintained starter/proof scaffold

## Architectural role
This is the consumer-facing top layer.
It should stay lightweight and strategic relative to the substrate below it.

## Current strengths
- the bundle README is already relatively honest about proof boundaries
- the front door clearly says the package substrate sits below the bundle
- the skill/playbook/strategy split exists

## Current limitations
- `starter.ts` still behaves like a partially privileged runtime lane instead of just “one skill over the seam”
- strategy heuristics, cooldowns, wording, and some endpoint choices still sit in the starter rather than being clearly identified as skill-local policy
- the bundle still inherits some conceptual weight from the old operator-core framing

---

# 6. The actual current stack

The package currently behaves roughly like this:

```text
OpenClaw colony-operator bundle
  -> skill/playbook/strategy/starter layer
  -> omniweb-toolkit/agent (minimal runtime + helpers + old archetype exports)
  -> omniweb-toolkit/runtime (connect + readiness + OmniWeb runtime)
  -> hive/colony convenience layer over toolkit runtime
  -> lower toolkit internals / Demos-backed operational primitives
  -> SuperColony + Demos surfaces
```

That stack is real.
The mistake would be pretending it does not exist.

---

# 7. Main boundary problems

## Problem A — the root substrate is cleaner than the layers above it
The package root already communicates a substrate-first posture more clearly than the agent/runtime layers do.

Implication:
- the deeper layers should be aligned to that posture rather than forcing a new architecture from scratch.

## Problem B — `hive.ts` is doing seam work without being treated as the seam
`hive.ts` already absorbs a lot of operational complexity and exposes a practical colony-facing surface.
But the package does not yet clearly distinguish:
- low-level runtime substrate
- stable intent/convenience seam
- higher strategic skill logic

Implication:
- either `hive.ts` evolves into a clearer seam/convenience boundary, or a more explicit seam layer needs to be introduced below the agent layer.

## Problem C — `minimal-agent.ts` is too fat
`minimal-agent.ts` owns legitimate persistence/orchestration work.
But it also still owns too much:
- legacy decision-shape normalization
- action-family-specific branching
- execution routing awareness
- some operational truth handling that should sit below a thinner seam

Implication:
- this is the highest-value file to thin.

## Problem D — `agent.ts` is an over-broad mixed export surface
The `agent` subpath currently exports:
- minimal runtime helpers
- research helpers
- market helpers
- engagement helpers
- starter packs
- old agent-loop compatibility

Implication:
- the subpath works, but it muddies architecture by presenting too much at once.
- the center of gravity is harder to read.

## Problem E — starter policy is still too privileged
The colony-operator starter currently owns:
- cooldown doctrine
- action heuristics
- wording/composition
- some endpoint/attestation choices
- thread history policy

Implication:
- that is acceptable only if it is clearly treated as one skill’s policy, not as architectural substrate truth.

## Problem F — current capability truth is stronger than current resolution truth
`readiness.ts` already does a meaningful job.
But the package still lacks a first-class resolved-intent contract that cleanly models:
- executable
- blocked
- supervised
- unsupported

Implication:
- this is the next contract-level correction.

---

# 8. Practical interpretation

The repo is not missing substrate.
It is missing a crisper line between:

- **substrate**
- **runtime substrate**
- **colony-facing seam/convenience layer**
- **agent/runtime scaffolding**
- **skill policy**

That means the right work is:
- do not throw away the current toolkit
- do not pretend `hive.ts` / `runtime.ts` / root substrate do not exist
- identify which current files are already the substrate
- thin the seam and runtime scaffolding
- keep skill logic visibly skill-local

---

# 9. Current strongest architectural statement

A repo-grounded statement of the current architecture is:

- `omniweb-toolkit` root is already a read-first substrate package
- `omniweb-toolkit/runtime` is already the heavy operational substrate for wallet-backed flows
- `hive.ts` / `colony.ts` already form a broad colony-facing convenience layer over the lower toolkit
- `omniweb-toolkit/agent` currently mixes runtime scaffolding with too much doctrine/helper baggage
- the OpenClaw colony-operator bundle is the current front door above that stack
- the next architectural job is not building a substrate from zero, but making the existing substrate/seam/skill boundaries more explicit and less leaky
