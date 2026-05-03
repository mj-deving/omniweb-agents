---
status: draft
owner: Gregor
updated: 2026-05-02
related:
  - docs/decisions/0023-runtime-agnostic-substrate-and-agent-capability-boundary.md
  - docs/decisions/0002-toolkit-vs-strategy-boundary.md
  - docs/decisions/0022-package-backed-skill-distribution.md
summary: "Concrete refactor checklist for turning omniweb-toolkit into a runtime-agnostic SuperColony/Demos substrate with adapter and skill layers above it."
---

# ADR-0023 Refactor Checklist

This checklist turns ADR-0023 into concrete cuts.

## North-star test

A fresh consumer should be able to use `omniweb-toolkit` from:

- OpenClaw
- plain Node/CLI
- cron/worker jobs
- another agent runtime

without re-implementing protocol/auth/plumbing logic and without prompt-space auth ceremony.

If a fresh agent has to manually reason about `/api/auth/challenge`, token refresh, or transport-specific fallback logic, this checklist is not done.

---

## Phase 0 — lock the boundary in docs and package language

### 0.1 Reword package identity
- [ ] Rewrite `packages/omniweb-toolkit/README.md` intro so the package is described as the **runtime-agnostic SuperColony/Demos substrate**, not just a local toolkit bundle.
- [ ] Make the layering explicit in README:
  - core substrate
  - runtime adapters
  - skill/agent layers
- [ ] Add one short statement that OpenClaw is a consumer, not the architectural center.

### 0.2 Stop teaching auth ceremony to agent-facing consumers
- [ ] Audit `README.md`, `SKILL.md`, `GUIDE.md`, starter files, and exported OpenClaw bundles for places where agent-facing guidance implies manual challenge/verify work.
- [ ] Replace those instructions with capability-bearing runtime usage.
- [ ] Keep low-level auth details only in developer/API reference docs.

### 0.3 Document the supported consumer contracts
- [ ] Document the intended consumer classes:
  - read-only library consumer
  - wallet-backed runtime consumer
  - agent runtime adapter
  - skill layer
- [ ] For each class, state what is guaranteed and what remains optional.

---

## Phase 1 — fix auth and capability plumbing at the substrate layer

### 1.1 Consolidate auth lifecycle into a first-class substrate surface
Current evidence:
- `src/lib/auth/auth.ts` holds challenge/verify/cache logic.
- `src/toolkit/agent-runtime.ts` had a real lazy-refresh bug.
- runtime consumers currently rely on implicit token behavior instead of explicit capability state.

Checklist:
- [ ] Define one canonical auth lifecycle surface for all consumers.
- [ ] Ensure every wallet-backed consumer path uses the same refresh/cache behavior.
- [ ] Add explicit state model for:
  - `auth_ok`
  - `auth_refreshing`
  - `auth_unavailable_upstream`
  - `auth_missing_credentials`
  - `auth_failed_local`
- [ ] Normalize auth failures into typed results/errors instead of ad hoc strings and nulls.

### 1.2 Add forced re-auth retry at protected boundaries
- [ ] For protected reads/writes, retry once on 401 with forced refresh when credentials exist.
- [ ] Keep retries in substrate/runtime code, not in skills or prompts.
- [ ] Record whether failure is:
  - stale token
  - verify rejection
  - upstream unavailable
  - missing wallet/credentials

### 1.3 Match ColonyPublisher behavior as a benchmark
- [ ] Locate and inspect the real ColonyPublisher auth implementation.
- [ ] Diff it against our challenge/sign/verify path.
- [ ] Copy any missing normalization or host/payload behavior required for parity.
- [ ] Create a small parity probe script that proves whether our wrapper matches the documented ColonyPublisher flow.

### 1.4 Expose capability truth to consumers
Concrete need:
- today consumers often infer auth/readiness implicitly.
- skills should reason about capabilities, not handshake steps.

Checklist:
- [ ] Add a consumer-facing capability/readiness call that reports auth/read/write availability.
- [ ] Include reason codes that a runtime can surface without leaking transport ceremony.
- [ ] Use the same capability surface in OpenClaw adapters and non-OpenClaw consumers.

---

## Phase 2 — clarify package boundaries and exports

### 2.1 Separate substrate exports from adapter/agent exports
Current package exports mix:
- `.` read client + readiness + connect
- `./runtime`
- `./write`
- `./agent`
- `./research-agent-minimal`

Checklist:
- [ ] Define which exports are **substrate** and which are **adapter/agent**.
- [ ] Keep the main barrel clean and substrate-first.
- [ ] Move clearly adapter-like surfaces behind explicit subpaths.
- [ ] Confirm that `connect()` belongs to runtime/adapter surface, not the read-only core barrel.

### 2.2 Mark unstable or mixed surfaces honestly
- [ ] Identify exports that still mix mechanism and strategy.
- [ ] Mark them experimental/internal if needed until the split is real.
- [ ] Do not present mixed agent-loop helpers as if they are universal SDK primitives.

### 2.3 Decide whether naming needs to change
- [ ] Decide whether `omniweb-toolkit` stays the package name while becoming SDK-like.
- [ ] If the name stays, tighten docs so “toolkit” still clearly means canonical substrate.
- [ ] If a future rename is desired, document it as a separate migration rather than muddling this refactor.

---

## Phase 3 — extract runtime adapters from core substrate

### 3.1 Identify adapter-specific code paths
High-probability adapter/runtime surfaces:
- `src/toolkit/agent-runtime.ts`
- `src/toolkit/tools/connect.ts`
- exported OpenClaw bundles under `packages/omniweb-toolkit/agents/openclaw/`
- research-agent minimal/export surfaces

Checklist:
- [ ] Mark which files are substrate, which are adapter, which are skill.
- [ ] Keep credential discovery, local persistence, OpenClaw-specific assumptions, and environment wiring in adapter layers.
- [ ] Keep protocol semantics and capability reporting in substrate layers.

### 3.2 Reduce OpenClaw-central assumptions
- [ ] Audit for docs/code that imply OpenClaw is the default architectural lens.
- [ ] Rewrite to “OpenClaw consumer” wording where appropriate.
- [ ] Ensure exported OpenClaw bundles consume the substrate rather than carrying hidden protocol behavior of their own.

### 3.3 Preserve plain Node consumer path
- [ ] Keep a minimal Node consumer path proving:
  - read-only install
  - wallet-backed install
  - capability check
  - authenticated read path
- [ ] Treat this as a first-class proof, not an afterthought.

---

## Phase 4 — move skill doctrine fully above the plumbing layer

### 4.1 Teach official docs + toolkit-optimal usage
- [ ] Update skill docs so they teach:
  - official SuperColony protocol behavior
  - correct layer separation (feed/score/signal/oracle/etc.)
  - optimal toolkit-backed usage
- [ ] Ensure skills do not teach a second, competing transport ceremony.

### 4.2 Remove prompt-space plumbing assumptions
- [ ] Audit starters/playbooks for any place where the agent is expected to manually manage auth or low-level endpoint details.
- [ ] Replace with capability-driven instructions.
- [ ] Keep only the reasoning-relevant parts in prompt-space.

### 4.3 Distinguish doctrine from runtime guarantees
- [ ] Make it explicit where a rule is protocol doctrine vs runtime guarantee.
- [ ] Example: “auth is automatic when credentials are configured” is runtime behavior, not agent strategy.

---

## Phase 5 — verification and regression proof

### 5.1 Add substrate-boundary checks
- [ ] Add a check that proves a long-lived runtime re-auths after cache staleness.
- [ ] Add a check that protected reads retry once on 401 with forced refresh.
- [ ] Add a check that read-only consumers do not pull in wallet-only peers unnecessarily.

### 5.2 Add cross-consumer proof paths
- [ ] One proof for plain Node read-only consumer.
- [ ] One proof for plain Node wallet-backed consumer.
- [ ] One proof for OpenClaw export consumer.
- [ ] Optional later: one proof for another non-OpenClaw adapter.

### 5.3 Record current known blocker truth
- [ ] Keep a small proof note for the live auth discrepancy until resolved.
- [ ] Separate local refactor success from upstream auth health claims.
- [ ] Do not mark the auth layer “done” just because internal refresh logic is cleaner.

---

## Concrete file/module audit targets

### Highest priority
- [ ] `src/lib/auth/auth.ts`
- [ ] `src/toolkit/agent-runtime.ts`
- [ ] `src/toolkit/tools/connect.ts`
- [ ] `src/toolkit/supercolony/api-client.ts`
- [ ] `packages/omniweb-toolkit/src/index.ts`
- [ ] `packages/omniweb-toolkit/README.md`
- [ ] `packages/omniweb-toolkit/SKILL.md`
- [ ] `packages/omniweb-toolkit/GUIDE.md`

### Next pass
- [ ] `packages/omniweb-toolkit/assets/*starter*`
- [ ] `packages/omniweb-toolkit/agents/openclaw/**`
- [ ] `packages/omniweb-toolkit/agents/registry/**`
- [ ] validation scripts that currently assume package/runtime/skill boundaries are the same thing

---

## Suggested work order

### Cut 1 — substrate auth hardening
- finish auth lifecycle cleanup
- add capability states
- add 401 forced-refresh retry
- prove long-run refresh behavior

### Cut 2 — package/export cleanup
- clarify main barrel vs runtime/agent subpaths
- rewrite README/install/usage language to reflect substrate-first architecture

### Cut 3 — adapter separation
- mark and isolate OpenClaw-specific adapter logic
- preserve plain Node proofs

### Cut 4 — skill/doc rewrite
- teach official docs + toolkit-backed usage
- remove prompt-space plumbing assumptions

### Cut 5 — parity and proof
- diff against ColonyPublisher auth behavior
- add consumer proof scripts
- close the auth discrepancy with evidence

---

## Done-when criteria

This refactor is done when all of the following are true:

- a fresh agent does not need manual auth reasoning to operate
- auth/plumbing is fixed once in the substrate and shared across consumers
- OpenClaw can be removed mentally from the center of the architecture without the package story collapsing
- plain Node and OpenClaw consumers both use the same core substrate behavior
- skills teach protocol understanding and toolkit usage, not transport ceremony
- package docs describe the real architecture honestly
