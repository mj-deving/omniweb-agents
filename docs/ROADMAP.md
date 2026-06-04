---
type: roadmap
status: active
updated: 2026-06-04
summary: "One-page active strategy surface. Current lane: post-convergence no-spend proof, adapter extraction, and gated live-packet refresh."
topic_hint: ["roadmap", "next steps", "active strategy", "post-convergence", "colony-operator", "no-spend proof", "research evidence"]
---

# Roadmap

> Active strategy only. Execution state lives in Beads and GitHub. Historical detail lives in [the archived pre-trim roadmap](archive/roadmaps/roadmap-2026-05-25-pre-trim.md), package references, and PR history.

## Current Truth

- `main` has completed the prior endpoint reconciliation, no-spend hardening, raw-transfer closeout, storage no-spend ergonomics, DemosWork/XM/Rubic import-boundary proof, worktree cleanup, and PR-sprawl repair lanes.
- Open PR count was zero at the 2026-06-04 reseed. Branch and remote-prune operations remain separate from product strategy.
- `colony-operator` is the single maintained user-facing operator path.
- `minimal-agent` is shared runtime substrate under colony-operator, not a second product story.
- Generic `minimal-agent starter` language is now considered parallel-path smell unless it is clearly framed as a colony-operator minimal starter or compatibility scaffold.
- `omniweb-toolkit` should provide callable knowledge, policy, checks, guardrails, execution primitives, and proof helpers. It should not force agents into a prompt harness or own their reasoning loop.
- Playbooks and policies own topic choice, thesis choice, tone, budgets, and action preference. The runtime owns capability truth, readiness, admissibility, execution, verification, and proof shape.
- The maintained proof posture remains read-first and no-spend by default. Any future live write needs a fresh explicit packet with budget, wallet/agent target, command, mutation evidence, product readback criteria, and stop rules.
- The colony-operator convergence band is complete on `main`: PR #601 proved the no-spend colony-operator route, PR #602 extracted callable research draft quality gates, and PR #603 extracted shared validation script helpers.
- The first research evidence helper split is complete on `main` via PR #591. Remaining research evidence work is an adapter extraction lane, not a continuation of the old convergence task list.

## Active Lane

**Post-convergence reseed.**

Keep the repo on the completed operator story while seeding only the next short-horizon work:

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

## Next Roadmap Lanes

1. **OpenClaw colony-operator no-spend runtime smoke proof**
   - Bead: `omniweb-agents-lng8.1`.
   - Run static/runtime contract checks for `colony-operator`.
   - Use `packages/omniweb-toolkit/scripts/check-openclaw-runtime.ts`.
   - Add OpenClaw CLI probes only on a configured runtime host.
   - If provider auth or runtime config is absent, record the exact blocker; do not fake completion.
   - No spend, no publish, no wallet mutation.

2. **Research evidence value/metric adapter extraction**
   - Bead: `omniweb-agents-lng8.2`.
   - Continue after PR #591's first slice.
   - Move source-specific `extract*Values` helpers from `research-evidence.ts` into package-local `src/research-evidence/` modules.
   - Preserve `fetchResearchEvidenceSummary` and `agent.ts` public behavior.
   - Do not change evidence semantics unless tests prove a bug.

3. **Live operator execution packet refresh**
   - Bead: `omniweb-agents-lng8.3`, blocked on `omniweb-agents-lng8.1`.
   - Planning/docs only unless explicit live-write authorization is later given.
   - Reconcile old `LIVE_COLONY_OPERATOR_EXECUTION_*` docs with the current no-spend proof and live boundary.
   - Mark live publish/reply as gated by explicit `--execute`, wallet readiness, lifecycle capture, product readback, and stop rules.
   - No live commands and no spend in the packet refresh PR.

4. **Optional root untracked artifact triage**
   - Only if the user explicitly wants local cleanup.
   - Treat pre-existing untracked artifacts as local state, not roadmap product work.

## Non-Negotiable Design Rules

- No second active operator path beside colony-operator.
- No hidden prompt harness as the default product route.
- No runtime-owned topic/thesis/action choice.
- No live write, wallet mutation, or mainnet spend without an explicit proof packet and operator authorization.
- No broad refactor without a bead, owner, proof gate, and closure condition.
- No roadmap-as-task-ledger: execution status belongs in Beads and GitHub.

## Current Beads

None from the old convergence lane remain active. The next short-horizon queue was reseeded in Beads under `omniweb-agents-lng8`; execution truth lives there, not in this roadmap.

## Pointers

- Runtime topology: [packages/omniweb-toolkit/references/runtime-topology.md](../packages/omniweb-toolkit/references/runtime-topology.md)
- Colony-operator baseline: [packages/omniweb-toolkit/references/colony-operator-baseline.md](../packages/omniweb-toolkit/references/colony-operator-baseline.md)
- Repo state and branch policy: [docs/REPO-STATE.md](REPO-STATE.md)
- Archived pre-trim roadmap: [docs/archive/roadmaps/roadmap-2026-05-25-pre-trim.md](archive/roadmaps/roadmap-2026-05-25-pre-trim.md)
- Package front door: [packages/omniweb-toolkit/README.md](../packages/omniweb-toolkit/README.md)
- Repo front door: [README.md](../README.md)
