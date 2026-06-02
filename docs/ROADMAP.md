---
type: roadmap
status: active
updated: 2026-06-02
summary: "One-page active strategy surface. Current lane: converge runtime/product story on colony-operator while keeping minimal-agent as shared substrate and agent policy as callable, opt-in knowledge."
topic_hint: ["roadmap", "next steps", "active strategy", "colony-operator", "minimal-agent", "callable policy"]
---

# Roadmap

> Active strategy only. Execution state lives in Beads and GitHub. Historical detail lives in [the archived pre-trim roadmap](archive/roadmaps/roadmap-2026-05-25-pre-trim.md), package references, and PR history.

## Current Truth

- `main` has completed the prior endpoint reconciliation, no-spend hardening, raw-transfer closeout, storage no-spend ergonomics, DemosWork/XM/Rubic import-boundary proof, worktree cleanup, and PR-sprawl repair lanes.
- Open PR count is currently zero after the stale Paperclip PR cleanup. Branch and remote-prune operations remain separate from product strategy.
- `colony-operator` is the single maintained user-facing operator path.
- `minimal-agent` is shared runtime substrate under colony-operator, not a second product story.
- Generic `minimal-agent starter` language is now considered parallel-path smell unless it is clearly framed as a colony-operator minimal starter or compatibility scaffold.
- `omniweb-toolkit` should provide callable knowledge, policy, checks, guardrails, execution primitives, and proof helpers. It should not force agents into a prompt harness or own their reasoning loop.
- Playbooks and policies own topic choice, thesis choice, tone, budgets, and action preference. The runtime owns capability truth, readiness, admissibility, execution, verification, and proof shape.
- The maintained proof posture remains read-first and no-spend by default. Any future live write needs a fresh explicit packet with budget, wallet/agent target, command, mutation evidence, product readback criteria, and stop rules.

## Active Lane

**Colony-operator convergence.**

Make the repo read as one operator product:

1. A user starts from the colony-operator bundle, package CLI, or colony-operator docs.
2. The operator calls `runColonyOperatorCycle()`.
3. `runColonyOperatorCycle()` uses the shared minimal cycle machinery internally.
4. The agent/playbook supplies observation and action preference.
5. Toolkit policy/admissibility/guardrail layers answer whether the request is executable.
6. Execution uses shared action primitives.
7. Readback/proof records what actually happened.

The desired public message:

- **default path:** colony-operator
- **substrate:** omniweb-toolkit runtime/capability/action/proof layers
- **internal cycle engine:** minimal-agent
- **strategy:** playbooks and agent policy
- **optional knowledge:** callable checks such as draft quality, guardrails, admissibility, readiness, and capability truth

## Next Steps

1. **Converge exported runtime guidance**
   - Make `omniweb-toolkit/agent` present colony-operator first.
   - Keep `runMinimalAgentCycle()` available as low-level substrate.
   - Demote `runMinimalAgentLoop()` to opt-in scaffold/compatibility language.
   - Do not break public exports without a deliberate deprecation path.

2. **Converge starters**
   - Rename/reword generic `minimal-agent-starter` surfaces as colony-operator minimal starters where they remain active.
   - Ensure OpenClaw colony-operator bundle routes through `runColonyOperatorCycle()` instead of a hand-rolled connect/prompt/publish lane.
   - Keep prompt-building examples skill/playbook-local, not package doctrine.

3. **Extract callable policy, not prompt harnesses**
   - Continue `omniweb-agents-2vk5`: extract research draft quality gates into callable modules.
   - The output should help agents inspect or validate drafts; it must not require agents to use a package-owned prompt harness.

4. **Reduce proof/tooling duplication**
   - Continue `omniweb-agents-y2vz`: extract shared validation script helpers.
   - Keep validation scripts as release/proof tooling, not runtime dependencies.

5. **Archive or relabel parallel-path docs**
   - Audit package docs, references, starter comments, OpenClaw bundle docs, and old guide text for standalone minimal-agent/product-route claims.
   - Archive stale root-runner or generic-agent-loop language rather than preserving it as an active option.

6. **Prove the converged route**
   - Run the smallest no-spend consumer proof showing colony-operator -> minimal substrate -> policy intent -> executor -> readback/proof.
   - Record proof tier honestly; do not claim maintained live-write authority from a dry-run.

## Non-Negotiable Design Rules

- No second active operator path beside colony-operator.
- No hidden prompt harness as the default product route.
- No runtime-owned topic/thesis/action choice.
- No live write, wallet mutation, or mainnet spend without an explicit proof packet and operator authorization.
- No broad refactor without a bead, owner, proof gate, and closure condition.
- No roadmap-as-task-ledger: execution status belongs in Beads and GitHub.

## Current Beads

- `omniweb-agents-2vk5`: extract research draft quality gates as callable policy.
- `omniweb-agents-y2vz`: extract shared validation script helpers.

Follow-up beads from this roadmap refresh should cover export guidance, starter convergence, parallel-path doc cleanup, and no-spend proof of the converged route.

## Pointers

- Runtime topology: [packages/omniweb-toolkit/references/runtime-topology.md](../packages/omniweb-toolkit/references/runtime-topology.md)
- Colony-operator baseline: [packages/omniweb-toolkit/references/colony-operator-baseline.md](../packages/omniweb-toolkit/references/colony-operator-baseline.md)
- Repo state and branch policy: [docs/REPO-STATE.md](REPO-STATE.md)
- Archived pre-trim roadmap: [docs/archive/roadmaps/roadmap-2026-05-25-pre-trim.md](archive/roadmaps/roadmap-2026-05-25-pre-trim.md)
- Package front door: [packages/omniweb-toolkit/README.md](../packages/omniweb-toolkit/README.md)
- Repo front door: [README.md](../README.md)
