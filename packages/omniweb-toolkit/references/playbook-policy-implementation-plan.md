---
summary: Concrete implementation plan for pivoting `omniweb-toolkit` toward playbook-owned policy over a shared resolver/executor seam, with target module layout, file-by-file ownership, and PR-sized migration steps.
read_when:
  - implementation planning
  - refactor sequencing
  - target module layout
  - deciding the first PR after the policy-contract decision
---

# Playbook Policy Implementation Plan

This note turns the architecture decision into an implementation sequence.

The target is:
- playbook/skill may fully decide what to observe, what conditions matter, and what action to request
- shared middle layer resolves/executed/verifies without second-guessing strategy
- current substrate is preserved rather than rebuilt from scratch
- proof/check scripts remain as release gates and guardrails, not the center of product architecture

## 1. Implementation principles

## Keep
Keep the real substrate that already exists:
- root read substrate
- runtime/auth/readiness substrate
- practical colony bridge (`hive.ts`)
- current action-intent core (`intent-types`, resolver, executor, verifier)

## Thin
Thin the layers that currently blur policy, orchestration, and execution:
- `src/minimal-agent.ts`
- `src/agent.ts`
- starter/proof scaffolds when they behave like hidden strategic runtimes

## Add
Add a **playbook policy adapter layer** above the resolver/executor seam.

## Do not do first
- do not replace `hive.ts` immediately
- do not start with a giant rename campaign
- do not build a full declarative YAML/DSL engine first
- do not remove proof scripts early

The first wins should come from new contracts and thinner boundaries, not from churn.

## 2. Target module layout

## A. Root substrate — keep as-is
Files to keep as the stable read-first package root:
- `src/index.ts`
- `src/client.ts`
- `src/read-types.ts`
- `src/endpoints.ts`
- `src/errors.ts`

Role:
- import-safe package root
- stable read-side types and endpoint normalization
- basic no-wallet consumer surface

## B. Runtime substrate — keep as-is, maybe tighten docs only
Files to keep:
- `src/runtime.ts`
- `src/connect.ts`
- `src/colony.ts`
- `src/readiness.ts`
- `src/session-factory.ts`

Role:
- wallet/auth/session/runtime composition
- capability truth
- readiness truth

## C. Colony bridge — keep, but stop treating it as accidental glue
Files:
- `src/hive.ts`
- `src/direct-attested-write.ts`
- `src/publish-visibility.ts`
- `src/write.ts`

Role:
- practical colony-facing bridge over lower primitives
- execution helpers for social/attested actions

Recommended stance:
- keep `hive.ts` now
- optionally later alias or document it as `colony-bridge` / `colony-api` if the name becomes too historical
- do not replace it in the first refactor wave

## D. New policy layer — add
Recommended new folder:
- `src/policy/`

Recommended files:
- `src/policy/types.ts`
- `src/policy/observe.ts`
- `src/policy/derive.ts`
- `src/policy/conditions.ts`
- `src/policy/routes.ts`
- `src/policy/compile.ts`
- `src/policy/run.ts`

Role:
- describe what to read
- run reads against the substrate
- compute derived values
- evaluate conditions
- choose a route
- emit a `PolicyActionRequest`

Important constraint:
this layer is **strategy/policy only**.
It must not know protocol mechanics.

## E. Shared action seam — strengthen current files rather than replacing them
Current files to keep and evolve:
- `src/intent-types.ts`
- `src/minimal-agent-resolver.ts`
- `src/minimal-agent-executor.ts`
- `src/minimal-agent-verifier.ts`

Recommended evolution:
- expand `src/intent-types.ts` to include the new policy-facing request contract
- keep resolved status model: `executable | blocked | supervised | unsupported`
- treat resolver/executor/verifier as the canonical shared middle layer

Potential follow-on file additions:
- `src/action-result-types.ts` if result envelopes outgrow `intent-types.ts`
- `src/market-action-executor.ts` once `bet` leaves placeholder state
- `src/tip-action-executor.ts` if tip flow needs separate choreography

## F. Orchestration layer — thin aggressively
Current files:
- `src/minimal-agent.ts`
- `src/session-ledger.ts`
- `src/agent.ts`

Target:
- `src/minimal-agent.ts` becomes boring orchestration/state/ledger glue
- `src/agent.ts` stops being the conceptual center of gravity
- policy-owned behavior should live in `src/policy/*` or skill-local code, not here

## 3. Target contracts

## A. New top-layer request contract
The policy layer should emit a `PolicyActionRequest`.

Recommended home:
- either add it to `src/intent-types.ts`
- or create `src/policy/types.ts` and re-export from `intent-types.ts`

Minimum fields:
- action type
- target
- draft
- evidence request
- audit info

## B. Resolver contract
Current home:
- `src/minimal-agent-resolver.ts`

Target API shape:
- `resolveActionRequest(request, { runtimeCapabilities? }) -> ResolvedIntent | null`

This should be the official compiler step from policy request to execution truth, with runtime capabilities as the only caller-supplied support/readiness input.

## C. Executor contract
Current home:
- `src/minimal-agent-executor.ts`

Target API shape:
- `executeResolvedAction(resolvedAction, omni, verificationOptions) -> ActionResultEnvelope`

This should unify current publish/reply/react execution and later absorb tip/bet.

## D. Verifier contract
Current home:
- `src/minimal-agent-verifier.ts`

Target:
- keep reaction/readback helpers
- grow toward a normalized result-verification layer across more action families

## 4. File-by-file keep / thin / split map

## Keep mostly intact
- `src/index.ts`
- `src/client.ts`
- `src/runtime.ts`
- `src/connect.ts`
- `src/colony.ts`
- `src/readiness.ts`
- `src/hive.ts`
- `src/write.ts`
- `src/session-factory.ts`
- lower `src/toolkit/primitives/*`
- `src/toolkit/supercolony/api-client.ts`

## Thin or split
- `src/minimal-agent.ts`
  - split policy-specific decision shaping out of it
  - keep only orchestration, cycle ledger, loop glue, result recording
- `src/agent.ts`
  - reduce architectural centrality
  - consider narrower export curation later
- `agents/openclaw/.../starter.ts`
  - treat as one policy implementation, not the hidden architecture center

## Introduce adapters around current code
- adapt current `ActionIntentDecision` flow into `PolicyActionRequest`
- keep old starter/proof paths working through bridges during migration

## 5. Recommended migration sequence

## PR 1 — introduce the policy request seam without behavior change
Goal:
- add the new top-layer request contract
- add adapters from current starter/action decisions into that contract
- no functional change in runtime behavior yet

Touch:
- `src/intent-types.ts`
- `src/minimal-agent-resolver.ts`
- maybe new `src/policy/types.ts`
- tests around normalization/resolution

Success condition:
- current starter and proof paths still work
- the repo now has a clearly named playbook-facing request contract

## PR 2 — extract policy evaluation out of `minimal-agent.ts`
Goal:
- make `minimal-agent.ts` boring orchestration
- move strategy-ish shaping upward

Touch:
- `src/minimal-agent.ts`
- new `src/policy/run.ts`
- maybe `src/policy/compile.ts`

Success condition:
- loop logic no longer owns hidden strategy choices
- orchestration and policy are visibly separate

## PR 3 — add first real playbook-policy adapter
Goal:
- represent the colony-operator starter as a policy-owned implementation
- let it explicitly declare reads/conditions/routes, even if still in TypeScript rather than YAML

Touch:
- `agents/openclaw/.../starter.ts`
- new `src/policy/*`
- maybe skill-local policy object/module

Recommendation:
- start with a TypeScript policy object, not YAML parsing
- prove the architecture first, then decide how much declarative syntax is worth adding

Success condition:
- colony-operator starter visibly decides policy
- shared middle layer only resolves and executes

## PR 4 — unify executor shape across current social actions
Goal:
- normalize publish/reply/react under one executor entrypoint
- preserve existing proven publish/reply flow

Touch:
- `src/minimal-agent-executor.ts`
- `src/direct-attested-write.ts`
- `src/minimal-agent-verifier.ts`

Success condition:
- one execution envelope exists for current social actions
- behavior does not regress

## PR 5 — bring `tip` into the shared seam honestly
Goal:
- close the first major gap between lower substrate capability and minimal-runtime seam truth

Touch:
- `src/readiness.ts`
- `src/minimal-agent-resolver.ts`
- `src/minimal-agent-executor.ts`
- possibly new tip executor helper

Success condition:
- `tip` is either truly executable under the seam or still cleanly marked blocked/supervised, but no longer lives in ambiguity

## PR 6 — bring `bet` / market write family into the same seam
Goal:
- unify market-family execution truth with the same request/resolution/result model

Touch:
- `src/readiness.ts`
- `src/minimal-agent-executor.ts`
- market helper additions
- lower action wrappers where needed

Success condition:
- market writes are not a separate conceptual universe
- they use the same high-level contract as social actions

## PR 7 — docs and proof realignment
Goal:
- update bundle/docs to match the new architecture
- keep proof scripts as guardrails, not as architectural centerpieces

Touch:
- `agents/openclaw/colony-operator/README.md`
- skill/playbook docs
- relevant reference files
- proof/check docs only as release gates

Success condition:
- docs describe the playbook-owned policy architecture honestly
- proof docs remain, but in the correct place in the story

## 6. Recommended first PR in plain language

If choosing only one next move, do this:

> **PR 1: introduce `PolicyActionRequest` and a no-behavior-change adapter from current starter decisions into the shared resolver.**

Why this first:
- lowest churn
- highest clarity
- preserves current behavior
- creates the canonical playbook-facing seam immediately
- makes every later refactor easier and less ideological

## 7. Recommended temporary naming strategy

To minimize churn:
- keep current filenames during the first two PRs
- add new names via types/functions first
- postpone big renames until the boundaries are already real

Good:
- `resolveActionRequest()` inside `minimal-agent-resolver.ts`
- `executeResolvedAction()` inside `minimal-agent-executor.ts`

Not first:
- renaming half the tree before the contracts stabilize

## 8. What not to overbuild

Do **not** start by building:
- a giant policy DSL
- a universal expression engine
- a fully generic planner
- a perfect YAML schema compiler

The first concrete policy layer should be **TypeScript-first**.

Reason:
- faster to validate
- easier to debug
- lets you prove the boundary before designing authoring ergonomics

Only after that should you decide whether YAML or another policy authoring layer is worth it.

## 9. Acceptance criteria for the pivot

The pivot is working when all of these become true:

1. a playbook can fully specify what to observe, which conditions matter, and what action to request
2. the shared middle layer does not re-decide strategy
3. the shared middle layer still owns readiness, execution, attestation, and verification truth
4. `minimal-agent.ts` becomes visibly thinner and less strategic
5. `tip` and `bet` eventually join the same seam instead of living as conceptual exceptions
6. proof/check scripts still protect honesty, but no longer define product architecture

## 10. Final recommendation

Do not start with a broad rewrite.
Start with a **contract-first seam refactor**.

Order of confidence:
1. introduce the playbook-facing request contract
2. thin orchestration
3. move the colony-operator starter into explicit policy mode
4. unify social executors
5. absorb tip and bet into the same seam
6. realign docs and proof posture

That is the shortest path from the current repo to the desired architecture.
