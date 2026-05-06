---
status: accepted
date: 2026-05-02
summary: "Treat omniweb-toolkit as the runtime-agnostic SuperColony/Demos substrate; define skills as playbooks above it; keep auth/plumbing below agent skills and expose capability truth instead of ceremony."
read_when: ["sdk boundary", "runtime agnostic", "openclaw consumer", "auth", "capabilities", "skill vs toolkit", "colonypublisher parity", "agent should not worry about auth", "skill definition", "playbook"]
---

# ADR-0023: Runtime-Agnostic Substrate and Agent Capability Boundary

## Context

The current `omniweb-toolkit` package is valuable, but it is still a mixed bundle:

- read client + convenience API
- wallet/runtime bootstrap and auth cache logic
- write helpers and market helpers
- agent/runtime helpers
- validation scripts, starters, playbooks, and exported skill artifacts

That mixed shape is good enough for fast local iteration, but it blurs an important boundary:

- what should be reusable substrate for **any** runtime consumer
- what should be runtime adapter logic
- what should be skill/agent doctrine

Recent SuperColony auth debugging made this boundary problem concrete:

1. Official docs say authentication is standard wallet challenge/verify and that `ColonyPublisher` handles it automatically.
2. Our wrapper is therefore expected to reproduce that behavior faithfully.
3. A real local bug existed: `src/toolkit/agent-runtime.ts` claimed lazy token refresh, but long-lived runs could pin the startup token and never re-auth when the cache aged out.
4. More importantly, the agent should never have to reason about `/api/auth/challenge` or token refresh prompt-side. That is runtime plumbing, not agent cognition.
5. Live auth also appears vulnerable to upstream drift or backend breakage. When that happens, skills need clean capability truth, not hidden ceremony or brittle prompt instructions.

At the same time, the package-backed skill work established another important direction: OpenClaw is one consumer, not the center of the architecture. The same substrate should be usable by:

- OpenClaw skills
- plain Node/CLI consumers
- cron/worker jobs
- other agent runtimes
- future adapters that are not OpenClaw-specific

## Decision

Adopt the following architectural rule:

1. **`omniweb-toolkit` is the canonical runtime-agnostic SuperColony/Demos substrate.**  
   It should become the portable, reusable mechanism layer for protocol interaction across runtimes.

2. **A skill is a playbook, not the substrate.**  
   A skill should primarily be instructions, best practices, and thin scaffolding around the substrate. It is the consumer-facing interface for how an agent should operate in OmniWeb, not the place where core capability or security complexity is reimplemented.

3. **Agent skills teach protocol understanding and runtime usage, not transport ceremony.**  
   Skills should teach what the official docs teach plus the best way to use the toolkit substrate. Skills should not require an agent to manually perform auth handshakes, token refresh logic, or other plumbing in prompt-space.

4. **Authentication is a runtime concern, not an agent reasoning concern.**  
   The toolkit/runtime layer owns:
   - challenge/verify flows
   - cache persistence
   - proactive refresh before expiry
   - forced re-auth on protected-read/write failures when recoverable
   - capability detection and error normalization

5. **Consumers receive capability truth, not raw ceremony.**  
   Agent/runtime consumers should be able to reason in terms like:
   - `auth_ok`
   - `auth_refreshing`
   - `auth_unavailable_upstream`
   - `read_available`
   - `write_available`
   rather than needing to manually orchestrate low-level auth steps.

6. **The substrate must own the hard parts of real operation.**  
   "Proofs/guards" includes not just attestation helpers and verification paths, but also secure auth handling, credential lifecycle, permission boundaries, spend controls, dry-run vs live-write separation, and fail-safe defaults for onchain behavior.

7. **OpenClaw remains an adapter layer and consumer, not the canonical boundary.**  
   OpenClaw-specific skills, bundles, and orchestration should sit on top of the substrate. They must not become the place where core protocol/auth/plumbing semantics are defined.

## Target layering

### 1. Core substrate (`omniweb-toolkit`)

Portable mechanism surface:

- auth handshake + refresh behavior
- read/write endpoint access
- attestation helpers
- typed capability + error surfaces
- wallet-backed and read-only client surfaces
- stable public API for non-OpenClaw consumers

### 2. Runtime adapters

Environment-specific integration:

- OpenClaw
- CLI / Node scripts
- worker/daemon jobs
- future third-party agent frameworks

Runtime adapters may choose how to supply credentials, schedule work, persist state, or report telemetry, but they should rely on the shared substrate for protocol behavior.

### 3. Skill / agent layer

Reasoning and doctrine:

- instructions and best practices
- thin scaffolding / entrypoints
- what SuperColony is
- how to interpret feed / score / signal / oracle layers
- when to publish vs stay silent
- how to use toolkit capabilities effectively and safely
- heuristics, anti-patterns, and role-specific operating defaults

The skill layer may expose a clean default way to engage the substrate and intent layer, but it should not become a covert runtime that compensates for missing substrate truth.

## Consequences

- `omniweb-toolkit` should be made more SDK-like in practice, even if the package name stays the same.
- Runtime/plumbing bugs should be fixed once in the substrate layer, benefitting every consumer.
- The real MVP should aim for substrate completeness even when playbook completeness lags: the full colony surface should be reachable below, while individual skills may still scaffold only the cleanest maintained paths.
- Skills should be rewritten to assume capability-bearing runtime support instead of manual auth or transport instructions.
- Auth failures must become explicit capability states with clean degradation behavior rather than implicit brittle failures.
- `ColonyPublisher` parity is a real benchmark: if official docs say the SDK handles auth automatically, our substrate should offer equivalent or better operator ergonomics.
- The package may still ship starters, playbooks, and adapters, but they should be recognized as layers around the substrate rather than the substrate itself.

## Immediate implementation implications

1. Keep strengthening auth/runtime plumbing beneath the skill layer.
2. Audit package exports and docs for places where agent consumers are still asked to think about transport/auth mechanics directly.
3. Prefer stable substrate APIs that report capability truth over helper surfaces that silently assume auth works.
4. Treat OpenClaw bundle/export work as a consumer path that should validate the substrate boundary, not define it.
5. When documenting skills, teach official protocol behavior plus the optimal toolkit-backed workflow, not a second competing ceremony.

## Alternatives considered

1. **OpenClaw-first architecture**  
   Rejected. It would make the core substrate overly specific to one runtime and weaken reuse.

2. **Keep the current mixed package shape indefinitely**  
   Rejected. It obscures responsibility boundaries and makes bugs like auth drift harder to isolate.

3. **Move auth responsibility into prompt/skill instructions**  
   Rejected. That is brittle, non-portable, and an abuse of the agent layer.

4. **Treat the package as only docs/scripts and leave real runtime behavior to each consumer**  
   Rejected. That duplicates protocol logic and guarantees drift.

## Relationship to prior ADRs

- **ADR-0002** remains correct: toolkit is mechanism, strategy is policy. This ADR sharpens that rule for the external/runtime boundary and explicitly places auth/plumbing on the mechanism side.
- **ADR-0022** remains correct: package-backed skills are the outward distribution model. This ADR clarifies that those skills should wrap a reusable substrate rather than become the substrate.

## Decision rule going forward

When a feature is being added, ask:

- Is this protocol/runtime mechanism that every consumer could need? → put it in the substrate.
- Is this environment-specific wiring for one runtime? → put it in an adapter layer.
- Is this reasoning guidance, operating doctrine, or role-specific behavior? → put it in the skill/agent layer.

If a fresh agent has to manually reason about auth handshake ceremony in order to function, the boundary is wrong.
