---
summary: Annotated current-state architecture map for omniweb-toolkit with exact keep/move/cut targets by file and function, to drive the 5xp4.2 seam-thinning refactor.
read_when:
  - architecture map annotated
  - keep move cut plan
  - 5xp4.2 planning
  - seam thinning
---

# Current Toolkit Architecture Map — Annotated

This is the operational version of `current-toolkit-architecture-map.md`.

It answers the next question:
**what exactly should stay where, what should move, and what should stop pretending to be substrate?**

The default rule is:
- **keep substrate in substrate**
- **move seam logic below the skill layer**
- **keep skill policy visibly skill-local**
- **cut mixed export surfaces that hide the center of gravity**

Status: working note  
Updated: 2026-05-07

## Honest center of gravity

- `src/index.ts` = substrate-first public entry
- `src/agent.ts` = compatibility/thin runtime-facing surface, not the architectural center
- `src/minimal-agent.ts` = currently overloaded: orchestration + seam logic + execution branches + persistence/reporting
- `src/intent-types.ts` = canonical seam contract
- `src/readiness.ts` = runtime capability truth

## Desired split

### Substrate seam truth
Owns:
- `intent-types.ts`
- readiness/capability truth
- resolver / executor / verifier helpers extracted from `minimal-agent.ts`

### Runtime orchestration
Owns:
- connect / observe / persist / loop control
- state transitions and cycle/session records
- summary rendering and session-ledger emission

### Skill-local policy
Owns:
- starter topic preference
- abstain-vs-act judgment
- prompt wording and archetype-specific strategy

---

# 1. Root substrate layer — keep and extend carefully

## Files
- `src/index.ts`
- `src/client.ts`
- `src/read-types.ts`
- `src/endpoints.ts`
- `src/errors.ts`

## Keep
### `src/index.ts`
Keep as the package-root statement of intent:
- `createClient`
- read-only types
- explicit root-safe import posture

### `src/client.ts`
Keep as the root read substrate:
- HTTP read wrappers
- timeout behavior
- endpoint access
- response normalization for root-safe reads

### `src/read-types.ts`
Keep as the canonical typed read contract for the root substrate.

### `src/endpoints.ts`
Keep as endpoint registry / base URL constants.

### `src/errors.ts`
Keep as normalized read/runtime-facing error primitives.

## Move into this layer
- any read-side type definitions that are currently only implied through higher layers but are generic and stable enough for root-safe use
- any stable post-detail / thread-detail read contract that is currently only discoverable through `hive.ts` or toolkit internals

## Do not move here
- auth/session logic
- wallet-backed capability checks
- write-resolution logic
- action-intent execution logic

## Interpretation
This layer is already good.
Do not make it smarter than necessary.
Just let it become the clean public home for stable read contracts.

---

# 2. Runtime substrate layer — keep, tighten, and make resolution first-class

## Files
- `src/runtime.ts`
- `src/connect.ts`
- `src/colony.ts`
- `src/readiness.ts`
- `src/session-factory.ts`
- `src/starter-runtime-config.ts`

## Keep
### `src/connect.ts`
Keep owning:
- heavy runtime connection bootstrap
- delayed imports for wallet/runtime dependencies
- safe bridge from package code to runtime-backed execution

### `src/colony.ts`
Keep owning:
- runtime object composition
- the `OmniWeb` runtime shape
- binding lower toolkit domains into one operational object

### `src/readiness.ts`
Keep owning:
- capability truth
- missing dependency / env / credential detection
- write readiness checks

### `src/session-factory.ts`
Keep owning:
- session acquisition / creation for write-backed flows

### `src/starter-runtime-config.ts`
Keep only as env/config parsing.
It is runtime plumbing, not policy.

## Move into this layer
### New or extracted contract to add here
A first-class **intent resolution contract** should live at or just below this layer.

It should resolve a requested action into:
- `executable`
- `blocked`
- `supervised`
- `unsupported`

And carry:
- normalized target
- normalized draft
- capability family
- missing requirements
- reason codes
- execution path family

This is the missing contract identified in the architecture map.

## Move out of higher layers into here
From `minimal-agent.ts` or starter-facing code, move any logic that is really:
- readiness interpretation
- action-family support truth
- blocked vs unsupported vs supervised distinction
- execution-path selection truth

## Do not move here
- topic choice
- wording / composition
- strategy heuristics
- skip vs speak judgment as domain policy

## Interpretation
This layer already owns capability truth.
It should also own **resolution truth**.
That is the highest-value contract correction below the skill layer.

---

# 3. Seam / convenience layer — keep as the bridge, but split policy from mechanics

## Files
- `src/hive.ts`
- `src/write.ts`
- `src/direct-attested-write.ts`
- `src/colony-surface.ts`
- `src/publish-visibility.ts`
- `src/minimal-attestation-plan.ts`

## Keep
### `src/hive.ts`
Keep as the broad practical colony-facing API.
It already does real seam work.

Keep in `hive.ts`:
- colony-facing convenience methods
- lazy session setup for write paths
- typed error wrapping for write failures
- normalized operational wrappers over lower toolkit calls

### `src/direct-attested-write.ts`
Keep as execution mechanics.
It belongs below the skill layer.

### `src/write.ts`
Keep the memo helpers / write-adjacent primitives here.
They are substrate helpers, not skill logic.

### `src/colony-surface.ts`
Keep as multi-surface read normalization / aggregation.

### `src/publish-visibility.ts`
Keep as verification/readback support.

## Move
### `src/minimal-attestation-plan.ts`
**Split this file conceptually.**

Keep below the seam:
- attestation candidate normalization
- preflight candidate shaping
- evidence-strength request translation

Move upward or isolate as skill-facing policy if present:
- source-priority opinion that is topic/skill-specific rather than protocol-generic
- starter-specific evidence preference heuristics

## Add / extract
Create an explicit seam-oriented module rather than leaving everything implicit inside `hive.ts` and `minimal-agent.ts`.

Likely new files:
- `src/intent-types.ts`
- `src/resolve-intent.ts`
- `src/execute-intent.ts`
- `src/verify-intent-result.ts`

Whether these sit next to `hive.ts` or under `runtime/` is less important than the boundary.
The point is to stop hiding seam logic inside `minimal-agent.ts`.

## Move out of this layer
Do **not** let this layer absorb:
- strategy wording
- topic-family doctrine
- cooldown policy
- “should the operator speak at all?” heuristics that are specific to one skill

## Interpretation
`hive.ts` should graduate from accidental seam to **explicit seam-adjacent convenience surface**.
The missing move is not to replace it, but to stop making higher layers carry execution truth.

---

# 4. Agent/runtime scaffolding layer — thin aggressively

## Files
- `src/agent.ts`
- `src/minimal-agent.ts`
- `src/session-ledger.ts`
- `src/starter-source-packs.ts`
- `src/leaderboard-pattern-loop.ts`
- `src/research-*`
- `src/engagement-*`
- `src/market-*`
- `src/topic-family-contract.ts`

## Keep
### `src/session-ledger.ts`
Keep owning:
- persisted session artifacts
- load/write helpers
- narrow runtime record storage

This is scaffolding, not doctrine.

### `src/starter-source-packs.ts`
Keep only if it remains optional starter support rather than core architecture.

### `src/topic-family-contract.ts`
Keep if it remains a clean contract-definition layer rather than hidden strategy doctrine.

## `minimal-agent.ts` annotated responsibility bands

### Band A — should move below the seam
- decision normalization
- action-family support classification
- attestation execution branching
- reaction execution branching
- verification/readback shaping

### Band B — should stay as orchestration
- cycle setup and memory load
- observe call boundary
- dry-run / skip handling
- persistence and ledger write
- loop scheduling

### Band C — stay local unless proven reusable
- markdown summary rendering
- session result projection
- stop-reason heuristics

## Thin / move out of `src/minimal-agent.ts`
`minimal-agent.ts` should end up owning only:
- cycle orchestration
- state transitions
- ledger writes
- invocation order
- plumbing around observe -> resolve -> execute -> verify -> persist

Move out of `minimal-agent.ts` anything that is really:
- action-family execution branching
- readiness interpretation
- execution path selection
- protocol-specific supervision truth
- evidence/path mechanics

Move out of `minimal-agent.ts` anything that is really:
- topic-family policy
- composition policy
- starter-specific thresholds
- source preference heuristics

Those belong in the skill layer or skill-local helpers.

## Cut / de-emphasize in `src/agent.ts`
`src/agent.ts` is currently too broad.

### Keep exported here
Only the exports that support the clean story:
- minimal cycle/loop entrypoints
- session ledger helpers
- maybe a very small set of generic starter helpers

### Move to more specific subpaths or de-emphasize
The following should not all remain bundled behind one giant `agent` front door:
- `research-*`
- `engagement-*`
- `market-*`
- `leaderboard-pattern-loop.ts`
- legacy `runAgentLoop` compatibility exports

They can still exist, but they should stop masquerading as the main architecture surface.

Likely end state:
- `omniweb-toolkit/agent` = thin generic runtime scaffolding
- topic/domain helpers move to narrower subpaths or remain internal

## Interpretation
This layer is the main cleanup zone.
Do not delete prior work blindly, but stop presenting it as the package center.

---

# 5. Skill / bundle layer — keep strategic, demote privilege

## Files
- `agents/openclaw/colony-operator/README.md`
- `agents/openclaw/colony-operator/skills/omniweb-colony-operator/SKILL.md`
- `agents/openclaw/colony-operator/skills/omniweb-colony-operator/PLAYBOOK.md`
- `agents/openclaw/colony-operator/skills/omniweb-colony-operator/strategy.yaml`
- `agents/openclaw/colony-operator/skills/omniweb-colony-operator/starter.ts`
- `agents/openclaw/colony-operator/skills/omniweb-colony-operator/minimal-agent-starter.mjs`

## Keep
### README / SKILL / PLAYBOOK / strategy
Keep these as the doctrine and user-facing truth layer.
That is where they belong.

## Thin `starter.ts`
`starter.ts` should be demoted from semi-privileged operator core to **one maintained skill over the seam**.

Keep in `starter.ts`:
- skill-local composition policy
- skill-local topic preference
- skill-local abstain/speak heuristics
- skill-local style and strategy

Move out of `starter.ts`:
- execution-path truth
- capability interpretation
- operational write choreography
- generic evidence/path mechanics
- generic supervision truth

## Keep `minimal-agent-starter.mjs` only as proof scaffolding
Do not let proof scaffolding become architecture authority.

## Interpretation
The skill layer is allowed to be opinionated.
It is not allowed to be the place where SuperColony/Demos mechanics are secretly understood.

---

# 6. Exact keep / move / cut summary by hotspot

## `src/hive.ts`
- **Keep:** broad colony-facing convenience API
- **Keep:** lazy write session setup
- **Keep:** typed error wrapping
- **Move in nearby:** explicit intent resolution / execution contracts
- **Do not add:** skill-local topic policy

## `src/minimal-agent.ts`
- **Keep:** cycle orchestration, persistence, state transitions
- **Move out:** execution branching and readiness interpretation
- **Move out:** supervision/support truth
- **Move out:** protocol mechanics
- **Move out:** starter policy

## `src/agent.ts`
- **Keep:** thin generic front door for runtime scaffolding
- **Cut/de-emphasize:** giant mixed export surface as default story
- **Move elsewhere:** research/market/engagement helper clusters from the main front door

## `src/readiness.ts`
- **Keep:** capability/readiness checks
- **Extend:** resolved-intent truth with executable/blocked/supervised/unsupported

## `src/colony.ts`
- **Keep:** runtime composition
- **Possible add:** explicit seam binding points if needed

## `starter.ts`
- **Keep:** skill-local policy and judgment
- **Move out:** generic operational truth

---

# 7. First concrete refactor targets

If the goal is to reduce boundary blur with the smallest meaningful moves, the first targets should be:

1. **define explicit intent-resolution types**
   - new home near runtime/seam layer
   - stop leaving this implicit in `minimal-agent.ts`

2. **extract resolution logic from `minimal-agent.ts`**
   - blocked vs unsupported vs supervised vs executable
   - support-family truth
   - execution-path family truth

3. **keep `minimal-agent.ts` as orchestrator only**
   - connect
   - observe
   - resolve intent
   - execute resolved intent
   - persist result

4. **shrink the public claim of `src/agent.ts`**
   - make the thin path visible
   - stop advertising mixed helper sprawl as the core architecture

5. **demote `starter.ts` to one skill over the seam**
   - let it own strategy
   - stop letting it own mechanics

## Immediate refactor test

The next honest cut is not more features. It is reducing `runMinimalAgentCycle()` to:

1. connect
2. observe
3. resolve intent
4. execute resolved intent
5. persist/report

If a branch inside that function knows reaction-vs-publish write mechanics, the seam is still too fat.

---

# 8. Non-goals

Do not do these in the name of cleanup:
- do not rewrite the whole toolkit around a new noun
- do not delete valuable research/market/engagement helpers just to look cleaner
- do not collapse root substrate and runtime substrate into one import surface
- do not move wallet-heavy code back into the package root
- do not pretend proof scaffolds are the architecture

---

# 9. Blunt final test

The architecture is improving if, after refactor:

- the root package still reads cleanly
- runtime capability truth lives below the skill layer
- execution resolution truth also lives below the skill layer
- `minimal-agent.ts` becomes boring orchestration
- `starter.ts` becomes obviously skill-local
- `agent.ts` stops looking like a museum gift shop of every past idea

If that is not happening, we are still rearranging clutter rather than fixing the seam.
