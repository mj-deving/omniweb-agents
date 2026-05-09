---
summary: Strict checklist for a substrate-first SuperColony/Demos architecture: what the substrate must absorb, what the intent seam must expose, what must never leak into skills, and how to tell whether the architecture is actually reducing protocol complexity.
read_when:
  - substrate architecture
  - intent boundary
  - SuperColony protocol complexity
  - skill vs substrate ownership
  - architecture reassessment
---

# Substrate + Intent Boundary Checklist

This note exists to prevent another round of noun-churn.

The question is not whether "operator" sounds right.
The question is whether the architecture actually removes SuperColony/Demos operational complexity from the skill layer.

If it does, the skill can stay lightweight and strategic.
If it does not, we are just moving complexity around.

## Context: what the target protocol actually is

SuperColony is not just a simple HTTP API.
It is a hybrid protocol surface built on top of Demos:

1. **Demos chain mechanics**
   - ed25519 wallet / mnemonic
   - address derivation
   - signing
   - storage transactions
   - confirm / broadcast lifecycle
   - DEM spend
   - transfer memos for some actions
   - DAHR attestation
   - TLSN attestation / storage in stronger-evidence cases

2. **SuperColony protocol semantics**
   - HIVE-encoded on-chain post format
   - categories / payload schema
   - replies, mentions, reactions
   - signals / consensus / leaderboard / oracle views
   - verification and score implications
   - action families like publish / react / tip / bet / register

3. **Indexed/API interaction surface**
   - bearer-token auth via wallet challenge-response
   - feed / search / thread / signals / agents / report endpoints
   - SSE stream
   - attestation verification endpoints
   - webhooks
   - some reaction / tip / betting flows

Because the target is hybrid, the substrate must absorb complexity across all three layers, not just publishing.

## Core architectural claim

The correct direction is:

- **strong substrate**
- **thin intent boundary**
- **lightweight skills above the seam**

A skill should not need to know how SuperColony or Demos work operationally.
It should only need to decide what it wants to do.

---

# 1. Required substrate modules

## A. Identity + auth substrate

Must own:
- wallet / mnemonic connect
- address derivation
- challenge fetch
- message signing
- bearer token acquisition
- token refresh / expiry handling
- token persistence

**Done means:** a skill never handles auth headers, challenge payloads, signed auth messages, or token refresh.

## B. Read normalization substrate

Must own stable wrappers for:
- feed
- search
- thread / post detail
- signals
- leaderboard
- agents
- oracle / prediction / pool / report surfaces
- SSE stream

Must normalize:
- endpoint drift
- category drift
- response-shape drift
- pagination / cursor quirks

**Done means:** skills consume one typed read contract, not raw API quirks.

## C. Capability / readiness substrate

Must answer:
- canRead
- canAuth
- canWrite
- supported action families
- blocked reasons
- missing credentials
- missing dependencies
- supervised-required cases

**Done means:** skills never infer operational readiness themselves.

## D. Attestation / proof substrate

Must own:
- DAHR flow
- TLSN flow
- proof selection policy
- privacy / cost / freshness checks
- verification / readback
- normalized evidence references

**Done means:** skills request evidence strength; substrate chooses the mechanism or refuses cleanly.

## E. Write execution substrate

Must own operational mechanics for:
- publish
- reply
- react
- tip
- bet / prediction-family actions
- register / profile actions where supported

Including:
- tx simulation where possible
- tx broadcast lifecycle
- memo encoding where required
- hybrid API + chain choreography where required

**Done means:** skills never know which write path uses direct chain write, API handshake, transfer memo, or mixed flow.

## F. Verification / result substrate

Must own:
- tx confirmation
- visibility / readback
- reaction confirmation
- indexer lag handling
- proof verification checks
- normalized failure classification

**Done means:** skills never decide whether something "probably worked."

---

# 2. Required intent seam

## Input contract

The skill should submit only:
- `skip`
- or one bounded `intent`

Intent may include:
- action type
- target
- draft
- evidence request
- audit / context
- nextState

The skill should not submit runtime-readiness guesses or protocol ceremony.

## Resolution contract

Before execution, the substrate must resolve the intent into one of:
- `executable`
- `blocked`
- `supervised`
- `unsupported`

This resolution should carry:
- capability info
- missing credentials / deps
- required target / evidence / context
- normalized target / draft

## Execution contract

If executed, the substrate should return normalized:
- tx / result
- proof refs
- verification / readback
- spend estimate
- error classification

**Done means:** the seam is operationally truthful before execution begins.

---

# 3. What is forbidden to leak into skills

Skills must **not** need to know:
- auth challenge flow
- bearer token lifecycle
- Demos tx confirm / broadcast mechanics
- HIVE encoding details
- DAHR / TLSN operational ceremony
- memo formats for bets / tips
- endpoint/version drift
- blocked vs unsupported vs supervised logic
- verification / readback semantics
- dependency / package checks

If any skill needs that knowledge, the boundary is broken.

---

# 4. What is allowed in skills

Skills should own:
- topic selection
- source preference
- timing heuristics
- whether to skip
- react vs reply vs publish judgment
- wording / composition
- persona / voice
- domain strategy
- confidence as judgment

This is the lightweight strategic layer.

---

# 5. Architecture acceptance criteria

We should only say the architecture is correct when all of the following are true.

## A. A new skill can be written without operational teaching

Meaning:
- no auth tutorial
- no tx lifecycle tutorial
- no attestation plumbing tutorial
- no endpoint quirks tutorial

## B. One skill can switch action families without new infra code

Example:
- the same skill can publish, reply, react, tip, or abstain
- by changing intent only
- not by learning a new operational protocol each time

## C. Raw protocol drift is absorbed below the seam

If docs / OpenAPI / integration guides drift, skills do not change.

## D. Blocked / supervised / unsupported are first-class truths

No more fake `failed` or fake `skip` when the real answer is infra truth.

## E. The runtime core gets thinner over time

If shared runtime code keeps absorbing strategy, the architecture is regressing.

---

# 6. Immediate red flags

If any of these happen, stop and reassess:

- starter files grow new operational branches
- skills choose attestation mechanics directly
- skills handle auth/session refresh
- new action families require bespoke top-layer code
- runtime orchestrator learns more policy instead of less
- convenience helpers expose raw protocol quirks upward

---

# 7. Blunt test question

Every architecture change should answer one question:

**Does this remove SuperColony/Demos protocol complexity from the skill layer, or just move it around?**

If it does not remove it, it is fake progress.

---

# 8. Notes from current official surfaces

The official SuperColony surfaces are useful but not perfectly self-consistent.
Observed drift includes examples like:
- category sets differing between docs / LLM reference / OpenAPI
- endpoint naming differences for post detail
- slightly different filter/pagination descriptions across surfaces

This is not a reason to expose the raw protocol upward.
It is an argument for a stronger substrate that normalizes drift and presents one stable contract to skills.

---

# 9. Current repo-level implication

For `omniweb-agents`, this means:
- do **not** let "operator-core" re-expand into a thick shared runtime layer
- keep protocol complexity in substrate modules
- make the seam truthful and explicit
- keep colony-facing skills lightweight and strategic
- judge progress by whether new skills become easier to write without operational teaching
