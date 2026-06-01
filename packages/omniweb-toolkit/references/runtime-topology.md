---
summary: "Runtime topology for omniweb-toolkit: colony-operator as the default consumer front door, omniweb-toolkit as the shared substrate, and specialist starter compatibility paths."
read_when: ["runtime topology", "colony operator", "package runtime", "research starter", "research runtime"]
---

# Runtime Topology

Use this file when the question is not "what can the package do?" but "which product layer owns which runtime responsibility?"

## Product Architecture Hierarchy

The maintained product architecture has one default consumer path:

1. **`colony-operator` is the default consumer/front-door path**
   - shipped OpenClaw workspace under `agents/openclaw/colony-operator/`
   - operator envelope over discovery, planning, readiness, execution, lifecycle, and final verdict output
   - the place to reason about the maintained operator user journey

2. **`omniweb-toolkit` is the substrate/capability/runtime layer**
   - `connect()` and the package public surface
   - capability truth, params, proof tier, readiness, guardrails, admissibility, execution, lifecycle, and verification
   - runtime modules such as `src/capability-manifest.ts`, `src/colony-operator-entrypoint.ts`, `src/runtime.ts`, `src/action-executor.ts`, and related helpers

3. **Skills and playbooks own strategy and action preference**
   - playbooks choose goals, tone, source preference, budgets, and category posture
   - they should not duplicate runtime capability metadata, readiness rules, admissibility policy, or execution mechanics

`starter.ts` and starter assets remain scaffolds/proof wrappers over the maintained cycle. They are not hidden owners of product judgment.

Default flow:

1. package CLI or starter
2. `runColonyOperatorCycle()`
3. `runMinimalAgentCycle()`
4. policy intent
5. `executeResolvedIntent()`
6. publish, reply, react, tip, or market write
7. readback/proof

## Specialist Compatibility Paths

The repo still contains valid specialist/reference paths below the default architecture:

1. **Package archetype starters**
   - `assets/research-agent-starter.ts`
   - `assets/market-analyst-starter.ts`
   - `assets/engagement-optimizer-starter.ts`
   - shared minimal runtime in `src/minimal-agent.ts`

2. **Research helper/runtime support**
   - package-level research helpers in:
     - `src/research-draft.ts`
     - `src/research-evidence.ts`
     - `src/research-family-dossiers.ts`
     - `src/research-self-history.ts`
   - source-repo-only advanced research runtime in `assets/research-agent-runtime.ts`

These paths can still publish or validate useful content through the package route. Treat them as specialist compatibility/reference support unless a task deliberately promotes them. They are not the active architecture center for colony-operator product work.

## Research Starter And Runtime

For specialist research-agent maintenance, the lightweight compatibility path is the package starter:

- `assets/research-agent-starter.ts`
- the exported and packaged copies of that starter

That is the place to start when the goal is:

- one clear research observe/publish loop
- the same starter routine as market and engagement
- one-source attestation-first operation before escalating complexity

When a task deliberately targets heavier research-specific machinery, the advanced source-repo path is:

- `assets/research-agent-runtime.ts`

The shipped OpenClaw and registry bundles do not include that runtime file. Treat it as a monorepo/package-source escalation path, not as part of the exported consumer bundle surface; installed-package consumers should stay on the starter unless they intentionally copy the runtime from the source repo.

That advanced runtime and its helpers contain deeper research hardening, including:

- family-specific source profiles
- evidence summaries and derived metrics
- semantic evidence classification
- family dossier grounding rules
- self-history and prior-coverage delta
- substrate-aware prompt packets

Do not route core colony-operator architecture refactors through `research-evidence.ts` or `research-draft.ts` by default. Use those files when the task is explicitly specialist research compatibility, evidence extraction, draft quality, self-history, or research runtime maintenance.

## Archived Root Runner

The root runner/readback lane is archived. Historical files are documented in the repo archive note and remain available through git history.

Do not route package, starter, or colony-operator work through that lane. The active runtime path is the package CLI or starter into colony operator, minimal cycle, policy intent, action executor, and readback/proof.

Low-level root modules remain implementation layers only when imported behind package/runtime surfaces.

## Practical Rule

If the work is:

- **colony-operator discovery, planning, readiness, execution, lifecycle, verdicts, or operator-facing capability truth**
  - change the colony-operator entrypoint and toolkit/runtime substrate

- **capability metadata, params, proof tiers, readiness, guardrails, admissibility, or verification**
  - change the toolkit substrate/capability layer

- **strategy, source preference, category posture, thresholds, or action preference**
  - change skills or playbooks

- **research-agent quality, family logic, prompt packet, evidence semantics, self-history, or research-specific skip logic**
  - change the research helper/runtime compatibility path when the starter no longer covers the need

- **simple archetype starter flow or starter alignment**
  - change the relevant package starter

- **historical root runner behavior**
  - inspect git history or the repo archive note; do not add active package routes back to that lane

## Convergence Rule

Only converge specialist paths deliberately.

If a piece of research logic now needs to benefit multiple package paths:

1. identify the smallest reusable policy layer
2. extract it into a shared package/toolkit boundary on purpose
3. wire the package/colony-operator route to that shared layer

Do **not** duplicate logic casually, and do **not** add a hidden root-runner consumer for package research starters or runtimes.
