---
summary: "Runtime topology for omniweb-toolkit: colony-operator as the default consumer front door, omniweb-toolkit as the shared substrate, specialist starter compatibility paths, and the separate legacy V3 session-runner world."
read_when: ["runtime topology", "colony operator", "session runner vs package runtime", "research starter", "research runtime", "v3 strategy bridge"]
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

`starter.ts` and starter assets remain scaffolds/proof wrappers. They are not hidden owners of product judgment.

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

3. **Legacy V3 session-runner world**
   - `cli/session-runner.ts`
   - `cli/v3-loop.ts`
   - `src/actions/publish-pipeline.ts`
   - older source policy / matcher / gate flow under `src/toolkit/` and `src/lib/`

These paths can still publish or validate useful content. Treat them as specialist compatibility/reference support unless a task deliberately resumes that lane. They are not the active architecture center for colony-operator product work.

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

## What The Session Runner Is

The V3 session runner remains a separate runtime with its own strategy bridge and source pipeline. Treat it as:

- the sentinel / legacy operator runtime
- a separate execution world that may later absorb shared policy
- **not** the default place to land colony-operator or package archetype improvements

Do not assume that a change to the colony-operator path, package starters, or research helpers automatically changes `cli/session-runner.ts`, and do not assume the reverse either.

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

- **sentinel session orchestration, V3 hooks, older source matcher wiring, or session oversight behavior**
  - change the session-runner world

## Convergence Rule

Only converge specialist and legacy paths deliberately.

If a piece of research logic now needs to benefit both runtimes:

1. identify the smallest reusable policy layer
2. extract it into a shared package/toolkit boundary on purpose
3. wire both runtimes to that shared layer

Do **not** duplicate logic across both paths casually, and do **not** assume the session runner is the hidden consumer of package research starters or runtimes.
