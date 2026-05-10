---
summary: Audit of the remaining intent-boundary leaks after PRs #374 and #375, focused on where policy-facing request/decision surfaces still carry runtime-owned truth.
read_when:
  - intent-boundary cleanup
  - PR #376 planning
  - resolver contract tightening
  - playbook vs runtime ownership audit
---

# Intent Boundary Gap Map — 2026-05-10

## Why this note exists

The repo’s stated contract is now clear in multiple places:

- playbooks/skills own strategy and request actions
- the substrate/runtime owns capability truth, readiness, resolution, execution, and verification

But the current code still had a few places where policy-facing surfaces could carry runtime-owned truth. This note freezes those leaks before the implementation pass changed them.

Update — 2026-05-10:
- The seam fixes described below landed in commit `63cd0f1f`.
- Keep this note as the pre-change audit trail for PR #376, not as the current contract description.

## Current contract to preserve

Target contract sources:

- `references/playbook-owned-policy-contract.md`
- `references/playbook-policy-implementation-plan.md`
- `references/substrate-intent-boundary-checklist.md`
- `references/current-toolkit-architecture-map.md`

Shared line across those docs:

> policy may choose the action, target, wording, and evidence preference; runtime must remain the single owner of support, readiness, feasibility classification, execution path, and verification truth.

## Remaining seam leaks

### 1. Policy-facing decisions can still inject runtime readiness requirements

Relevant code:

- `src/intent-types.ts`
- `src/minimal-agent.ts`
- `src/minimal-agent-resolver.ts`
- `src/minimal-agent-executor.ts`

Current shape:

- `ActionIntentDecision` still exposes `readiness?: MinimalActionReadiness`
- `resolveActionRequest(..., options)` still accepts `readiness?`
- `normalizeDecisionToResolvedIntent(...)` forwards `decision.readiness`
- resolver logic merges that override into request-derived readiness before producing `ResolvedIntent`

Why this is a leak:

- readiness is supposed to be runtime truth, not policy truth
- a playbook should not have to know or declare `requiresWallet`, `requiresAttestation`, `requiresTargetPost`, or `requiresMarketContext`
- even when the current callers use this field honestly, the contract still says policy-side code may participate in readiness interpretation

Concrete evidence:

- `src/minimal-agent-resolver.ts` derives default readiness from the request, then merges an external override before resolution
- `src/minimal-agent-executor.ts` passes `actionDecision.readiness` back into resolution during execution

Preferred fix:

- remove policy-authored readiness from the playbook-facing decision/request contract
- keep request-implied requirements as resolver-owned interpretation
- if an internal caller needs to bypass file-based discovery, inject runtime capability state as runtime input, not as policy readiness metadata

### 2. Runtime capability truth is being manufactured inside the `policy/` namespace

Relevant code:

- `src/policy/run.ts`
- `src/minimal-agent.ts`
- `src/minimal-agent-executor.ts`

Current shape at audit time:

- `buildInjectedPolicyRuntimeCapabilities()` lived in `src/policy/run.ts`
- runtime/executor/orchestration code imported that helper from the policy layer
- the helper constructed action-family readiness, proof levels, and runtime write state

Resolved state:

- injected runtime capability truth now lives in `src/injected-runtime-capabilities.ts`
- runtime/executor/orchestration imports the helper from the runtime-owned module instead of `src/policy/`

Why this is a leak:

- capability/readiness truth belongs to the runtime substrate, not the policy adapter layer
- even if the helper is used only for injected `OmniWeb` sessions, its current home makes the dependency direction backwards
- it teaches future contributors that policy code may own or fabricate runtime capability truth

Preferred fix:

- move the helper to a runtime-owned module near `readiness.ts` or another runtime seam file
- rename it to describe what it really is: injected runtime capability truth for an already-live `OmniWeb` session
- make policy code depend on the resolver contract, not the capability-construction details

### 3. The resolver API still implies callers may supplement runtime truth directly

Relevant code:

- `src/minimal-agent-resolver.ts`
- `references/playbook-owned-policy-contract.md`

Current shape at audit time:

- `resolveActionRequest(request, options)` took both `runtimeCapabilities?` and `readiness?`
- the docs said the resolver should accept a policy request and resolve it into honest runtime truth

Resolved state:

- `resolveActionRequest(request, options)` now accepts only runtime-owned capability input (`runtimeCapabilities?`)
- readiness is derived inside the resolver from the request plus runtime capability truth

Why this is a leak:

- `runtimeCapabilities` is a valid runtime input
- `readiness` as a separate caller-provided overlay suggests readiness is partially external to the runtime substrate
- this widens the contract beyond the documented model and makes boundary discipline harder to explain

Preferred fix:

- collapse readiness ownership into runtime capability inputs
- keep one official runtime-facing input path for support/readiness truth
- let the resolver compute request-implied missing fields itself without a policy-provided readiness shim

## What is *not* a leak

These are still consistent with the intended contract:

- `PolicyActionRequest.evidenceRequest` carrying evidence preference (`none` / `inherit` / `dahr` / `tlsn`)
- resolver-owned translation from request to `ResolvedEvidencePlan`
- resolver-owned validation that publish/reply require text, evidence, and reply parent context
- resolver-owned classification into `executable | blocked | supervised | unsupported`

The cleanup target is not “make the resolver dumb.”
It is “stop letting policy-shaped inputs speak in runtime-owned vocabulary.”

## Recommended execution order for PR #376

1. **Tighten the contract types first**
   - remove policy-facing readiness overrides from the action-decision / request path
   - preserve current behavior by deriving requirements from action type inside the resolver

2. **Move injected runtime capability helpers out of `policy/`**
   - runtime-owned module
   - same behavior, cleaner ownership line

3. **Refresh docs/tests after the seam is actually tightened**
   - architecture/proof surfaces should say one thing
   - focused tests should prove that policy requests no longer carry readiness truth

## Expected result after cleanup

After this pass, a playbook should still be able to say:

- publish this text with this category and evidence preference
- reply to this post with this draft
- tip this post
- place this market action

But it should no longer be able, or need, to say:

- this action requires a wallet
- this action requires attestation
- this action is write-ready
- this action family is supported

That truth should come from the runtime substrate alone.
