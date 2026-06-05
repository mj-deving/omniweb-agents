---
type: roadmap
status: active
updated: 2026-06-05
summary: "One-page active strategy surface. Current lane: post-lng8 closeout and next read-only copied-bundle proof."
topic_hint: ["roadmap", "next steps", "active strategy", "post-lng8", "post-convergence", "colony-operator", "no-spend proof", "copied-bundle proof"]
---

# Roadmap

> Active strategy only. Execution state lives in Beads and GitHub. Historical detail lives in [the archived pre-trim roadmap](archive/roadmaps/roadmap-2026-05-25-pre-trim.md), package references, and PR history.

## Current Truth

- `main` has completed the prior endpoint reconciliation, no-spend hardening, raw-transfer closeout, storage no-spend ergonomics, DemosWork/XM/Rubic import-boundary proof, worktree cleanup, and PR-sprawl repair lanes.
- Open PR count and the ready/open/in-progress Beads queue were zero at the 2026-06-05 post-`lng8` reseed. After PRs #607, #608, #609, and #610 landed, the 2026-06-05 closeout check again showed no open GitHub PRs.
- `colony-operator` is the single maintained user-facing operator path.
- `minimal-agent` is shared runtime substrate under colony-operator, not a second product story.
- Generic `minimal-agent starter` language is now considered parallel-path smell unless it is clearly framed as a colony-operator minimal starter or compatibility scaffold.
- `omniweb-toolkit` should provide callable knowledge, policy, checks, guardrails, execution primitives, and proof helpers. It should not force agents into a prompt harness or own their reasoning loop.
- Playbooks and policies own topic choice, thesis choice, tone, budgets, and action preference. The runtime owns capability truth, readiness, admissibility, execution, verification, and proof shape.
- The maintained proof posture remains read-first and no-spend by default. Any future live write needs a fresh explicit packet with budget, wallet/agent target, command, mutation evidence, product readback criteria, and stop rules.
- The colony-operator convergence band is complete on `main`: PR #601 proved the no-spend colony-operator route, PR #602 extracted callable research draft quality gates, and PR #603 extracted shared validation script helpers.
- `omniweb-agents-lng8.1` is complete: the OpenClaw colony-operator boundary was proved as static/no-spend with `executionProven=false`; no OpenClaw probes, provider auth, wallet mutation, publish, reply, live command, or spend ran.
- `omniweb-agents-lng8.2` is complete on `main` via PR #605: research evidence value adapters were extracted while preserving public behavior.
- `omniweb-agents-lng8.3` is complete on `main` via PR #606: the old live execution packet now reads as historical/reference material instead of the next live task.
- `omniweb-agents-izeq` is complete on `main` via PRs #607, #608, and #609: the post-`lng8` roadmap reseed, local artifact hygiene, and colony-operator front-door audit all landed.
- `omniweb-agents-ns7m` is complete on `main` via PR #610: the colony-operator front-door drift guard now checks the package README, SKILL, TOOLKIT, and colony-operator README.

## Active Lane

**Post-`lng8` closeout and next no-spend proof.**

Keep the repo on the completed operator story while executing only the next short-horizon, no-spend work:

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

1. **OpenClaw colony-operator no-spend runtime smoke proof: complete**
   - Bead: `omniweb-agents-lng8.1`.
   - Static/runtime contract check passed for `colony-operator`.
   - Command: `bunx tsx packages/omniweb-toolkit/scripts/check-openclaw-runtime.ts --archetype colony-operator`.
   - Result: `ok=true`, `executionProven=false`.
   - No OpenClaw CLI probes, provider auth, wallet mutation, publish, reply, live command, or spend ran.

2. **Research evidence value/metric adapter extraction: complete**
   - Bead: `omniweb-agents-lng8.2`.
   - Merged on `main` in PR #605.
   - Source-specific value adapters moved into package-local `src/research-evidence/` modules.
   - Public behavior for `fetchResearchEvidenceSummary` and `agent.ts` was preserved.

3. **Live operator execution packet refresh: complete**
   - Bead: `omniweb-agents-lng8.3`.
   - Merged on `main` in PR #606.
   - Planning/docs only; no live-write authorization is currently active.
   - Old `LIVE_COLONY_OPERATOR_EXECUTION_*` docs were reconciled with the current no-spend proof and live boundary.
   - Live publish/reply remains gated by explicit `--execute`, wallet readiness, lifecycle capture, product readback, and stop rules.
   - No live commands and no spend ran in the packet refresh PR.

4. **Post-`lng8` roadmap state refresh: complete**
   - Bead: `omniweb-agents-rpmd`.
   - Parent: `omniweb-agents-izeq`.
   - Merged on `main` in PR #607.
   - Updated this roadmap from stale `lng8.3` active state to completed `lng8` history.
   - Recorded the current queue shape without turning the roadmap into the execution ledger.

5. **Local review artifact hygiene: complete**
   - Bead: `omniweb-agents-2lm6`.
   - Parent: `omniweb-agents-izeq`.
   - Merged on `main` in PR #608.
   - Quieted machine/runtime cache paths that polluted `git status` and local review bundles.
   - Kept April handoff drafts local-only; this lane did not delete or commit them.

6. **Colony-operator front-door audit: complete**
   - Bead: `omniweb-agents-7oxu`.
   - Parent: `omniweb-agents-izeq`.
   - Merged on `main` in PR #609.
   - Audited package front-door docs after the live packet refresh.
   - Preserved the default `colony-operator` path, read-first/no-spend posture, and explicit fresh-packet requirement for any future live write.

7. **Colony-operator front-door drift guard: complete**
   - Bead: `omniweb-agents-ns7m`.
   - Parent: `omniweb-agents-8x29`.
   - Merged on `main` in PR #610.
   - Extended `check-colony-operator-primary` so package front-door docs must keep colony-operator as the default, keep read-first/no-spend as the default posture, frame the May 2026 live packet as historical provenance only, require a fresh explicit packet for future wallet-backed writes, and keep older/specialist bundles out of the default front door.

8. **Post-`lng8` roadmap closeout: active docs-only lane**
   - Bead: `omniweb-agents-a8q1`.
   - Parent: `omniweb-agents-8x29`.
   - Update this roadmap from live PR and Beads truth after PR #610 landed.
   - Record the next no-spend proof bead without making the roadmap the execution ledger.

9. **Refresh read-only copied-bundle consumer proof: next**
   - Bead: `omniweb-agents-li6j`.
   - Parent: `omniweb-agents-a8q1`.
   - Refresh the copied-bundle consumer proof from current `main`.
   - Keep the lane read-only and no-spend: no live commands, no `--execute`, no wallet/provider setup, no provider auth, and no mutation.

## Non-Negotiable Design Rules

- No second active operator path beside colony-operator.
- No hidden prompt harness as the default product route.
- No runtime-owned topic/thesis/action choice.
- No live write, wallet mutation, or mainnet spend without an explicit proof packet and operator authorization.
- No broad refactor without a bead, owner, proof gate, and closure condition.
- No roadmap-as-task-ledger: execution status belongs in Beads and GitHub.

## Current Beads

The old convergence lane is closed. In the post-convergence queue,
`omniweb-agents-lng8.1`, `omniweb-agents-lng8.2`, and
`omniweb-agents-lng8.3` are closed on `main`. The post-`lng8` reseed parent
`omniweb-agents-izeq` is closed on `main` via PRs #607, #608, and #609:
`omniweb-agents-rpmd`, `omniweb-agents-2lm6`, and
`omniweb-agents-7oxu` are all complete. The follow-up closeout parent is
`omniweb-agents-8x29`: child `omniweb-agents-ns7m` is closed on `main` via PR
#610, child `omniweb-agents-a8q1` owns this docs-only closeout, and
`omniweb-agents-li6j` is seeded as the next read-only copied-bundle proof after
this closeout. At the 2026-06-05 closeout check, open GitHub PRs were empty.
Execution truth lives in Beads and GitHub, not in this roadmap.

## Pointers

- Runtime topology: [packages/omniweb-toolkit/references/runtime-topology.md](../packages/omniweb-toolkit/references/runtime-topology.md)
- Colony-operator baseline: [packages/omniweb-toolkit/references/colony-operator-baseline.md](../packages/omniweb-toolkit/references/colony-operator-baseline.md)
- Repo state and branch policy: [docs/REPO-STATE.md](REPO-STATE.md)
- Archived pre-trim roadmap: [docs/archive/roadmaps/roadmap-2026-05-25-pre-trim.md](archive/roadmaps/roadmap-2026-05-25-pre-trim.md)
- Package front door: [packages/omniweb-toolkit/README.md](../packages/omniweb-toolkit/README.md)
- Repo front door: [README.md](../README.md)
