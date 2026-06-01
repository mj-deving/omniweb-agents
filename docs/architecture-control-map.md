---
summary: "Architecture control map for repo/package/runtime/docs authority boundaries and evidence-led refactor follow-up."
topic_hint: ["architecture control map", "repo architecture", "docs authority", "refactor queue", "runtime topology", "package boundary"]
---

# Architecture Control Map

This map keeps architecture truth separate from task truth.

- Execution truth: Beads for task state, GitHub PRs for in-flight code, `main` for merged code.
- Architecture truth: `docs/`, package references, and accepted ADRs.
- Package truth: `packages/omniweb-toolkit/` for public package contracts, shipped docs, references, scripts, and exported starter artifacts.
- Public summary truth: `docs-site/` only summarizes canonical docs; it is not a second architecture source.

## Evidence Snapshot

Checked on `origin/main` at `fd1f49e2`.

- `docs-list` shows the current docs authority set.
- Scoped import-edge scan covered `packages/omniweb-toolkit/src`, `src/toolkit`, `src/lib`, `cli`, `docs`, `docs-site`, package docs, and package references.
- Scan counts: package source 121 files, root toolkit 163 files, root lib 62 files, CLI 42 files, docs-site 5 files, package docs 7 files, package references 136 files.
- Import-edge leads: package source imports root toolkit heavily, package source imports root lib only in narrow cases, CLI imports both toolkit and lib, toolkit still has some `../lib` edges that must be source-checked before refactor claims.
- Prior Beads triage classified the root CLI/sdk bridge leads before this doc was written.

The graph-style scan is a lead generator only. Every claim below is tied back to source paths.

## Authority Layers

Package public surface:

- `packages/omniweb-toolkit/package.json` exports `.`, `./agent`, `./types`, `./runtime`, `./write`, and `./research-agent-minimal`.
- `packages/omniweb-toolkit/src/index.ts` is the substrate-first read/client entrypoint. It exports `createClient`, endpoint constants, transport/read/profile/chat/market consumer helpers, market write intent helpers, and read/client types.
- `packages/omniweb-toolkit/src/runtime.ts` is the runtime-heavy subpath. It exports `connect`, runtime readiness/capability helpers, capability/guardrail/action-admissibility manifests, official skill coverage helpers, and consumer-spectrum inventory helpers.
- `packages/omniweb-toolkit/src/colony.ts` defines the wallet-backed `OmniWeb` runtime returned by runtime `connect()` with `colony`, `identity`, `escrow`, `storage`, `ipfs`, `chain`, `toolkit`, `runtime`, and `address`.
- `packages/omniweb-toolkit/src/agent.ts` owns the package agent subpath. It promotes minimal-runtime helpers and keeps legacy `runAgentLoop` as a compatibility export.
- `packages/omniweb-toolkit/AGENTS.md`, `TOOLKIT.md`, `SKILL.md`, `GUIDE.md`, and `references/` are the package authority files. Repo docs should link or summarize; they should not fork package API truth.

Reusable toolkit mechanism:

- `src/toolkit/` is the mechanism boundary from ADR-0002.
- `src/toolkit/index.ts` is the broad internal toolkit barrel.
- `src/toolkit/sdk-bridge.ts` owns guarded SDK/session bridge behavior, chain writes, `apiCall`, and bridge-level chain read delegation.
- `src/toolkit/data-source.ts` owns `ApiDataSource`, `ChainDataSource`, and `AutoDataSource` read routing.
- `src/toolkit/tools/scan.ts` still uses `bridge.getHivePosts(limit)` as the primary scan path and optionally enriches reactions through API when authenticated.

Root policy and runtime:

- `src/lib/` is policy/strategy: auth, LLM, source policy, attestation policy, scoring, state, transcripts, and agent config.
- `cli/session-runner.ts` remains the operator entrypoint for the legacy V3 session-runner world.
- `cli/v3-loop.ts` owns V3 SENSE/ACT/CONFIRM orchestration, builds `AutoDataSource`, creates the toolkit facade used by the loop, and dispatches light/heavy actions.
- `cli/publish-executor.ts` owns heavy ACT publish/reply/vote/bet orchestration for the root runtime.

Docs:

- `docs/decisions/` contains repo-level architectural decisions.
- `docs/project-structure.md` is the broad repo shape doc and currently contains stale counts/old package framing that should be refreshed after this map.
- `docs/architecture-plumbing-vs-strategy.md` is the ADR-0002 boundary companion and currently mixes historical migration notes with current state.
- `docs/ECOSYSTEM.md` is classified as repo ecosystem/source-of-truth routing and carries front matter.
- `docs-site/README.md` says canonical package truth lives in `packages/omniweb-toolkit/`, canonical repo architecture and research live in `docs/`, and `docs-site/` is the small public summary layer.
- `docs-site/source-of-truth.html` repeats the same public-facing source-of-truth model.

## Runtime Flows

Consumer package read flow:

1. Consumer imports `createClient` from `omniweb-toolkit`.
2. `packages/omniweb-toolkit/src/index.ts` exposes the substrate/read client surface and related read/transport helpers.
3. Package docs and references describe this public read surface. Root docs describe how the repo pieces fit.

Consumer package runtime flow:

1. Consumer imports `connect` from `omniweb-toolkit/runtime`.
2. `packages/omniweb-toolkit/src/runtime.ts` exports the runtime-heavy helpers and forwards `connect`.
3. `packages/omniweb-toolkit/src/colony.ts` calls `createAgentRuntime` from root toolkit.
4. The returned `OmniWeb` object wires package domain APIs around the runtime, SDK bridge, Demos instance, toolkit, and wallet address.

Package agent flow:

1. Consumers import `omniweb-toolkit/agent`.
2. `packages/omniweb-toolkit/src/agent.ts` exposes minimal runtime helpers, attestation planning helpers, archetype draft/opportunity helpers, starter source packs, and compatibility agent-loop exports.
3. `packages/omniweb-toolkit/references/runtime-topology.md` separates package minimal-runtime work from the older V3 session-runner world.

Root V3 session-runner flow:

1. `cli/session-runner.ts` starts a session, loads config/state/provider/hooks, then calls `runV3Loop`.
2. `cli/v3-loop.ts` connects the wallet, attempts auth, builds API and chain data sources, creates toolkit primitives, and runs SENSE/ACT/CONFIRM.
3. SENSE uses source/strategy work and stores results in session state.
4. ACT plans actions, executes light actions through `cli/action-executor.ts`, and executes heavy publish actions through `cli/publish-executor.ts`.
5. Writes flow through SDK bridge and toolkit chain transaction helpers; scoring/logging stays in root runtime policy.

Read routing:

- `src/toolkit/data-source.ts` expresses the intended API-first/chain-fallback read abstraction.
- `src/toolkit/tools/scan.ts` is still bridge-first for scan and has optional API enrichment.
- `cli/v3-loop-helpers.ts` notes that colony DB ingestion cannot advance a cursor until the read path supports cursor semantics.
- `src/toolkit/chain-reader.ts` paginates by transaction index, not block number, so any `sinceBlock` fix must be designed against real SDK semantics.

Write routing:

- Package domain APIs and root executors ultimately use toolkit/session/SDK bridge surfaces for chain writes.
- `src/toolkit/sdk-bridge.ts` uses the guarded store/confirm/broadcast pipeline for HIVE posts and DEM transfers.
- Any refactor touching write paths is security-sensitive because the project handles real DEM on mainnet.

## Control Rules

- Do not put live task state in docs. Use Beads and GitHub for status, owners, blockers, and current queues.
- Do not duplicate package API contracts in root docs. Link to package docs and references when the package is the authority.
- Do not treat line count or graph centrality as a refactor by itself. It becomes a refactor only after source evidence shows a behavior, ownership, or validation problem.
- Do not merge package minimal-runtime work into the root V3 session-runner world casually. Converge through a shared layer only when both runtimes need it.
- Do not change runtime behavior inside docs/control-map beads.

## Triage References

Live follow-up state belongs in Beads, not this document.

Architectural implications from the root CLI/sdk bridge triage:

- Size or graph centrality alone is not a refactor trigger.
- Root runtime work and package-runtime work are separate unless a shared boundary is deliberately extracted.
- Cursor semantics and API reaction enrichment belong to explicit code beads, not incidental docs cleanup.

## Docs Refresh Scope

Source context for docs refresh work:

- `docs/project-structure.md` is the broad repo shape document.
- `docs/architecture-plumbing-vs-strategy.md` is the ADR-0002 boundary companion.
- `docs/ECOSYSTEM.md` is indexed by `docs-list` as the repo ecosystem/source-of-truth routing doc.

## Validation Notes

Validation for this map is documentation-focused:

- `docs-list`
- scoped source grep and import-edge scan
- `git diff --check`

No runtime checks are required unless a later bead edits code, package exports, package scripts, or generated docs-site output.
