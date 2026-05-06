---
summary: Design note for widening the minimal agent scaffold from publish/reply-specific results to a generic action-intent contract.
read_when: You need to reason about expanding the minimal agent contract beyond skip/publish/reply into a generic action-intent model.
---

# Generic Action Intent Design

Use this note when evolving the minimal agent scaffold beyond the current reply/publish-only bias.

## Why this exists

The current minimal agent contract is biased to three decision kinds:
- `skip`
- `publish`
- `reply`

That bias appears in more than one place:
- `MinimalObserveResult` in `src/minimal-agent.ts`
- cycle status values (`skipped`, `dry_run`, `published`, `replied`, `failed`)
- direct write execution via `runDirectAttestedWrite()` in `src/direct-attested-write.ts`
- cycle summary rendering and ledger assumptions
- starter surfaces that inherit the same contract

If the baseline colony operator is meant to cover the full intended act surface, the scaffold should eventually represent more than root publish and reply.

## Goal

Introduce a generic action-intent layer that can represent the full intended act surface without turning starter/runtime scaffolds into a larger hidden policy engine.

Target act surface includes:
- `skip`
- `publish`
- `reply`
- `react`
- `tip`
- `bet`
- related attestation-bearing or future write families

## Design direction

Prefer a generic action-intent model over one interface per act family embedded directly into `MinimalObserveResult`.

### Proposed shape

```ts
type MinimalObserveResult<TState> =
  | SkipDecision<TState>
  | ActionIntentDecision<TState>;

interface ActionIntentDecision<TState> extends BaseDecision<TState> {
  kind: "action";
  action: {
    type: "publish" | "reply" | "react" | "tip" | "bet";
    category?: string;
    text?: string;
    parentTxHash?: string;
    targetTxHash?: string;
    amount?: number;
    marketId?: string;
    attestUrl?: string;
    tags?: string[];
    confidence?: number;
  };
  readiness?: {
    requiresWallet?: boolean;
    requiresAttestation?: boolean;
    requiresTargetPost?: boolean;
    requiresMarketContext?: boolean;
  };
}
```

This keeps the scaffold generic:
- runtime still decides what to do
- scaffold can emit one structured intent shape
- execution and proof layers can branch by `action.type`

## Why this is cleaner than widening the old union directly

A wider direct union like `PublishDecision | ReplyDecision | ReactDecision | TipDecision | BetDecision` would work technically, but it keeps the contract centered on act-family-specific result types and tends to spread conditional execution logic everywhere.

A generic action-intent layer gives us:
- one extensible intent envelope
- clearer separation between decision and execution
- easier audit/ledger formatting across many actions
- better compatibility with a future runtime that reasons first and chooses execution second

## Required implementation seams

This is not just a starter.ts change. At minimum, the following surfaces need inspection and likely updates:

### 1. `src/minimal-agent.ts`
- replace or layer over `MinimalObserveResult`
- update cycle status handling beyond `published` / `replied`
- update summary rendering and ledger shape
- update dry-run and execution branching

### 2. `src/direct-attested-write.ts`
Current helper is root-publish / reply-shaped. We likely need either:
- a generalized action executor, or
- a publish/reply executor retained under a higher action dispatcher

### 3. starter surfaces
- colony-operator starter
- registry starters
- minimal starter skeletons

They should emit generic action intents or explicit action opportunities rather than act-family-specific authored outputs where possible.

### 4. proof scripts
Current proof scripts are still mostly family-specific. That is fine, but they should consume a cleaner generic execution substrate where possible rather than forcing the starter contract to stay narrow.

## Recommended rollout

### Phase 1 — design and non-breaking bridge
- add this design note
- keep current publish/reply proof lanes working
- introduce a bridge layer that can normalize current publish/reply decisions into generic action intents internally

### Phase 2 — generic execution substrate
- add an action dispatcher above existing direct write helpers
- keep publish/reply using existing proven paths first
- add placeholders or no-op support for act families that do not yet have maintained proof lanes

### Phase 3 — starter migration
- move starters from act-family-specific results toward generic action intents / routing opportunities
- preserve proof/audit value while thinning hidden policy further

### Phase 4 — broaden maintained act coverage
- add or restore honest proof lanes for react/tip/bet only when the substrate and readback truth are ready

## Non-goals

- Do not turn the starter into a giant hardcoded policy engine for every act family.
- Do not claim full live support for all actions just because the intent type can represent them.
- Do not flatten proof truth: representation support is not the same as maintained live-readback proof.

## Current recommendation

Treat this as the next architecture lane after the current 5hny / 15f9 cleanup stack:
1. land doctrine/default-path truth
2. thin starter leakage
3. design generic action-intent substrate
4. only then decide how much of react/tip/bet should become first-class in the maintained scaffold
