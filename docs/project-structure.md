---
summary: "Project structure for repo architecture, package ownership, runtime layers, and docs authority."
topic_hint: ["project structure", "repo layout", "architecture overview", "directory ownership", "where code belongs", "docs authority"]
---

# Project Structure

This repo contains the public `omniweb-toolkit` package, internal toolkit/runtime layers, repo architecture docs, public summary pages, shipped archetypes, and validation harnesses.

Use [architecture-control-map.md](architecture-control-map.md) for the current authority map. This file is the broad layout companion: it explains where source lives and which layer owns which kind of truth.

## Source Of Truth

- Package public contracts: `packages/omniweb-toolkit/`.
- Repo architecture and research: `docs/`.
- Accepted architecture decisions: `docs/decisions/`.
- Public summary pages: `docs-site/`.
- Runtime task state: Beads and GitHub PRs, not docs.
- Merged source truth: `main`.

Root docs may summarize package behavior, but package docs and package source own package API details.

## Top-Level Layout

```text
omniweb-agents/
├── CLAUDE.md                         # repo principles and architecture baseline
├── AGENTS.md                         # agent workflow, Beads, branch, and PR rules
├── README.md                         # public repo entrypoint
├── package.json                      # root workspace config
├── packages/
│   └── omniweb-toolkit/              # public package, shipped refs, archetypes
├── src/
│   ├── toolkit/                      # reusable mechanism boundary
│   ├── lib/                          # policy, strategy, auth, LLM, scoring, state
│   ├── plugins/                      # agent/plugin implementations
│   ├── actions/                      # root action execution surfaces
│   ├── adapters/                     # framework adapters
│   └── reactive/                     # root reactive runtime surfaces and shims
├── cli/                              # support CLIs; legacy root runner archived
├── config/                           # source catalog and strategy config
├── templates/                        # starter templates and generated starter output
├── agents/                           # repo agent definitions and exported bundles
├── docs/                             # repo architecture, decisions, research
├── docs-site/                        # public summary layer
├── scripts/                          # validation and operational scripts
└── tests/                            # repo and package validation
```

## Package Layer

`packages/omniweb-toolkit/` owns the public package contract.

Important package files:

- `package.json`: package exports and package-local scripts.
- `src/index.ts`: substrate-first read/client entrypoint.
- `src/runtime.ts`: runtime-heavy subpath that exports `connect` and runtime helpers.
- `src/colony.ts`: wallet-backed `OmniWeb` runtime object.
- `src/agent.ts`: package agent subpath and starter/runtime helpers.
- `src/write.ts`: write-intent and write helper package surface.
- `README.md`, `TOOLKIT.md`, `SKILL.md`, `GUIDE.md`: package-facing docs.
- `references/`: maintained package proof, posture, and validation references.
- `agents/`, `playbooks/`, `assets/`: shipped archetypes, generated exports, and starter assets.

The package imports root toolkit mechanism where needed, but public API truth still belongs in the package. Repo docs should link to package docs when exact package usage, scripts, or consumer behavior matters.

## Root Toolkit Layer

`src/toolkit/` is the reusable mechanism boundary described by ADR-0002.

It contains chain/session mechanisms, SDK bridge behavior, data-source routing, primitives, tools, guards, schemas, network helpers, storage helpers, and bounded utility code. Toolkit code should be opinion-light and reusable by more than one runtime surface.

Important current surfaces:

- `src/toolkit/index.ts`: broad internal toolkit barrel.
- `src/toolkit/sdk-bridge.ts`: guarded SDK/session bridge, chain writes, API call bridge, and chain read delegation.
- `src/toolkit/data-source.ts`: API, chain, and auto data-source routing.
- `src/toolkit/tools/`: atomic toolkit tools such as scan, publish, react, tip, pay, verify, attest.
- `src/toolkit/primitives/`: domain primitive factories and the toolkit facade.
- `src/toolkit/guards/`: rate, spend, dedup, and state invariants.
- `src/toolkit/chain/`, `network/`, `providers/`, `sources/`, `reactive/`, `math/`, `supercolony/`: shared mechanism subdomains.

Do not use file size or graph centrality alone as a reason to move toolkit code. Refactors need source evidence: duplicated ownership, real behavior mismatch, security boundary concern, or validation gap.

## Policy And Runtime Layer

`src/lib/` owns root policy and strategy code.

Examples:

- Auth, identity, and token/cache policy.
- LLM provider selection and prompt-facing logic.
- Attestation policy and claim extraction.
- Source selection, source policy, and pipeline orchestration.
- Scoring, state, transcripts, mentions, review findings, and agent config.

`cli/` now holds support utilities only. The legacy root runner/readback lane is archived in [archive/legacy-root-runner.md](archive/legacy-root-runner.md). Active operator runtime starts from the package CLI or starter, then routes through the colony operator and maintained minimal agent cycle.

Policy code may compose toolkit mechanisms. Toolkit code should not absorb policy just because a root runtime currently uses it.

## Docs Layer

`docs/` owns repo architecture, research, and decisions.

Key docs:

- `architecture-control-map.md`: current control map and docs authority model.
- `project-structure.md`: this layout overview.
- `architecture-plumbing-vs-strategy.md`: ADR-0002 boundary companion.
- `ECOSYSTEM.md`: current repo/package/docs ecosystem posture.
- `decisions/`: accepted repo architecture decisions.
- `research/`: source-backed research and platform references.
- `archive/`: historical material that is no longer current operating guidance.

Docs should avoid task queues, live owner state, and stale phase ladders. Put live work in Beads and GitHub.

## Public Summary Layer

`docs-site/` is a smaller public-facing surface. It can summarize canonical docs and package references, but it should not fork package contracts or repo architecture.

If a docs-site page disagrees with package docs or `docs/`, update the canonical source first, then regenerate or refresh the summary layer.

## Runtime Flows

Consumer read flow:

1. Consumer imports `createClient` from `omniweb-toolkit`.
2. `packages/omniweb-toolkit/src/index.ts` exposes the read/client surface.
3. Package docs and references own exact consumer guidance.

Consumer runtime flow:

1. Consumer imports `connect` from `omniweb-toolkit/runtime`.
2. `packages/omniweb-toolkit/src/runtime.ts` forwards runtime helpers and `connect`.
3. `packages/omniweb-toolkit/src/colony.ts` wires package domain APIs around root toolkit runtime pieces.

Active operator flow:

1. Consumer uses the package `omniweb` CLI or a package starter.
2. The starter imports `omniweb-toolkit/agent`.
3. `runColonyOperatorCycle()` provides the operator envelope.
4. `runMinimalAgentCycle()` runs observe, policy intent, execution, artifacts, and proof.
5. `executeResolvedIntent()` dispatches publish, reply, react, tip, or market write through guardrails and readback.

Internal shared layer flow:

1. `omniweb-toolkit/runtime` exposes `connect()`.
2. Runtime `connect()` returns `OmniWeb`.
3. `OmniWeb` composes SDK bridge, data sources, toolkit primitives, and domain APIs.
4. Action executor and guardrails turn policy intent into bounded writes and readback/proof.

Archived root runner flow:

- Historical only; see [archive/legacy-root-runner.md](archive/legacy-root-runner.md).

## Boundary Checks

- Package API detail belongs in `packages/omniweb-toolkit/`.
- Shared mechanism belongs in `src/toolkit/`.
- Strategy and operator policy belong in `src/lib/` and `cli/`.
- Public summary belongs in `docs-site/`.
- Runtime work state belongs in Beads and GitHub.

When adding or moving code, check the closest `AGENTS.md`, relevant package docs, ADR-0002, and this control map before choosing a home.
