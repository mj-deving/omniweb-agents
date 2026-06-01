---
summary: "ADR-0002 companion for the mechanism, policy, runtime, and docs boundaries."
topic_hint: ["architecture", "ADR-0002", "toolkit boundary", "strategy boundary", "code placement", "plumbing vs strategy"]
---

# Architecture: Plumbing vs Strategy

This is the current companion to [ADR-0002](decisions/0002-toolkit-vs-strategy-boundary.md). It describes placement rules. It is not a refactor queue.

For the current repo/package/docs authority map, see [architecture-control-map.md](architecture-control-map.md). For live work, use Beads and GitHub.

## Core Boundary

The toolkit boundary is a security and reuse boundary.

- Mechanism: reusable, bounded operations that can serve more than one runtime surface.
- Policy: choices about what to do, when to do it, and how to score or rank outcomes.
- Runtime: command-line or package wiring that composes mechanism and policy for an operator or consumer.
- Docs: architecture truth and stable source-of-truth rules, not live task state.

## Mechanism

Mechanism generally belongs in `src/toolkit/`.

Good toolkit candidates:

- Chain read/write helpers.
- SDK bridge and session primitives.
- Typed tools for publish, scan, react, tip, pay, verify, and attest.
- Guards for rate, spend, dedup, backoff, and state invariants.
- Data-source abstractions and network utilities.
- Domain primitive factories that are package/runtime reusable.
- Pure math and parsing helpers with no root strategy coupling.

Toolkit code should accept configuration through typed, bounded interfaces. It should enforce invariants that protect chain writes, wallet-backed actions, spend, persistence, and network access.

## Policy

Policy generally belongs in `src/lib/`.

Good policy candidates:

- LLM prompting and provider selection.
- Source selection and source ranking.
- Attestation policy and claim extraction strategy.
- Scoring thresholds, quality weights, and publish decisions.
- Agent state, transcripts, persona/config loading, and improvement findings.
- Runtime-specific auth/cache choices that are not yet package-general.

Policy code may call toolkit code. Toolkit code should not import policy code unless the dependency has been deliberately extracted into a reusable, bounded interface.

## Runtime Wiring

Runtime wiring generally belongs in `cli/`, package runtime entrypoints, or scripts.

Current root runtime:

- `cli/session-runner.ts`: root operator entrypoint.
- `cli/v3-loop.ts`: V3 SENSE/ACT/CONFIRM orchestration.
- `cli/action-executor.ts`: lighter action execution.
- `cli/publish-executor.ts`: heavier publish/reply/vote/bet execution.

Current package runtime:

- `packages/omniweb-toolkit/src/runtime.ts`: package runtime subpath.
- `packages/omniweb-toolkit/src/colony.ts`: wallet-backed `OmniWeb` runtime.
- `packages/omniweb-toolkit/src/agent.ts`: package agent subpath and starter/runtime helpers.

Do not casually merge package minimal-runtime work into the older root V3 session-runner world. Extract a shared layer only when both surfaces need the same behavior and validation can cover both.

## Placement Rules

Put code in `src/toolkit/` when:

- It is reusable mechanism.
- It can be described without naming a single agent persona or current launch posture.
- It has clear typed inputs and outputs.
- It enforces an invariant or provides a primitive used by multiple surfaces.

Keep code in `src/lib/` or `cli/` when:

- It chooses goals, sources, scores, prompts, budgets, or action timing.
- It depends on root agent state or operator workflow.
- It exists to support local validation, launch proof, or V3 runtime orchestration.
- It cannot be made reusable without smuggling policy into parameters.

Keep public package contract details in `packages/omniweb-toolkit/` when:

- The detail changes package import paths, exports, consumer install, starter assets, shipped references, or package scripts.
- The doc is meant for package consumers rather than repo maintainers.

Keep docs-site changes in `docs-site/` when:

- The page is a public summary of canonical package or repo docs.
- It does not introduce a new source of truth.

## Refactor Evidence Standard

A refactor lead is actionable only after source evidence confirms at least one of these:

- A mechanism/policy dependency crosses the intended boundary.
- Two runtime surfaces duplicate the same behavior with different guarantees.
- A package doc or package export conflicts with source.
- A write path, spend path, auth path, or network path lacks the expected invariant.
- A validation gap would allow a boundary regression.

The following are not enough by themselves:

- Large file size.
- High import count.
- Old phase notes.
- Generated graph centrality.
- A TODO without source confirmation.

When evidence is confirmed, create a small Bead with file/line evidence, acceptance criteria, and validation commands. Do not turn this doc into a task list.

## Write Path Caution

Writes are security-sensitive because the project can handle real DEM on mainnet.

Any refactor touching package domain writes, `src/toolkit/sdk-bridge.ts`, chain transaction helpers, `cli/publish-executor.ts`, or spend/tip guards needs a narrow proof plan. Prefer small PRs with explicit validation over broad cleanup.

## Related Docs

- [architecture-control-map.md](architecture-control-map.md)
- [project-structure.md](project-structure.md)
- [decisions/0002-toolkit-vs-strategy-boundary.md](decisions/0002-toolkit-vs-strategy-boundary.md)
- [decisions/0007-security-first-real-money.md](decisions/0007-security-first-real-money.md)
