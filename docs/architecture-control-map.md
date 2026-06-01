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
- Scoped import-edge scan covered `packages/omniweb-toolkit/src`, `src/toolkit`, `src/lib`, active `cli`, `docs`, `docs-site`, package docs, and package references.
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

Root policy and internal layers:

- `src/lib/` is policy/strategy: auth, LLM, source policy, attestation policy, scoring, state, transcripts, and agent config.
- The root runner/readback CLI lane is archived. See `docs/archive/legacy-root-runner.md`.
- Active root CLI files are support utilities only. They are not an alternate colony-operator user route.

Docs:

- `docs/decisions/` contains repo-level architectural decisions.
- `docs/project-structure.md` is the broad repo shape doc for current source ownership, runtime layers, and docs authority.
- `docs/architecture-plumbing-vs-strategy.md` is the ADR-0002 boundary companion for current mechanism/policy/runtime placement rules.
- `docs/ECOSYSTEM.md` is classified as repo ecosystem/source-of-truth routing and carries front matter.
- `docs-site/README.md` says canonical package truth lives in `packages/omniweb-toolkit/`, canonical repo architecture and research live in `docs/`, and `docs-site/` is the small public summary layer.
- `docs-site/source-of-truth.html` repeats the same public-facing source-of-truth model.

## Runtime Flows

Active consumer read flow:

1. Consumer imports `createClient` from `omniweb-toolkit`.
2. `packages/omniweb-toolkit/src/index.ts` exposes the substrate/read client surface and related read/transport helpers.
3. Package docs and references describe this public read surface. Root docs describe how the repo pieces fit.

Active operator flow:

1. Consumer uses the `omniweb` package CLI or a package starter asset.
2. The starter routes to `omniweb-toolkit/agent`.
3. `runColonyOperatorCycle()` wraps the maintained operator envelope.
4. The envelope delegates to `runMinimalAgentCycle()`.
5. The cycle turns observation into policy intent.
6. `executeResolvedIntent()` runs the selected action through guardrails and admissibility.
7. Publish, reply, react, tip, or market write paths finish with readback/proof.

Runtime connection flow:

1. Wallet-backed work imports `connect` from `omniweb-toolkit/runtime`.
2. `packages/omniweb-toolkit/src/runtime.ts` exports runtime helpers and forwards `connect`.
3. `packages/omniweb-toolkit/src/colony.ts` calls `createAgentRuntime` from root toolkit.
4. The returned `OmniWeb` object wires package domain APIs around runtime, SDK bridge, Demos instance, toolkit, and wallet address.

Internal shared layers:

- SDK Bridge: low-level wallet/Demos SDK adapter behind runtime.
- Data Sources: read-only API-first/chain-fallback layer.
- Toolkit primitives: domain facade over data source plus bridge.
- Action Executor plus Guardrails: intent execution for publish, reply, react, tip, and market write.
- Attestation: proof/precondition inside execution, not a destination layer.

Read routing:

- `src/toolkit/data-source.ts` expresses the intended API-first/chain-fallback read abstraction.
- `src/toolkit/tools/scan.ts` is still bridge-first for scan and has optional API enrichment.
- `src/toolkit/chain-reader.ts` paginates by transaction index, not block number, so any `sinceBlock` fix must be designed against real SDK semantics.

Write routing:

- Package domain APIs and package action executors ultimately use toolkit/session/SDK bridge surfaces for chain writes.
- `src/toolkit/sdk-bridge.ts` uses the guarded store/confirm/broadcast pipeline for HIVE posts and DEM transfers.
- Any refactor touching write paths is security-sensitive because the project handles real DEM on mainnet.

## Control Rules

- Do not put live task state in docs. Use Beads and GitHub for status, owners, blockers, and current queues.
- Do not duplicate package API contracts in root docs. Link to package docs and references when the package is the authority.
- Do not treat line count or graph centrality as a refactor by itself. It becomes a refactor only after source evidence shows a behavior, ownership, or validation problem.
- Do not rediscover the archived root runner as an active runtime. Converge through the package/colony-operator path unless a future bead explicitly designs a new route.
- Do not change runtime behavior inside docs/control-map beads.

## Triage References

Live follow-up state belongs in Beads, not this document.

Architectural implications from the root CLI/sdk bridge triage:

- Size or graph centrality alone is not a refactor trigger.
- Root runner cleanup is complete when active docs, scripts, tests, and package guidance can no longer route users into the retired lane.
- Shared internal layers remain useful only as implementation layers behind the active operator route.

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
