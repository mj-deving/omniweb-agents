---
summary: "Human-operable control map for current repo authority, runnable surfaces, validation gates, write/spend gates, and stale-risk doc classes."
read_when: ["control map", "authority map", "what is live", "what validates this", "doc cleanup classification"]
topic_hint:
  - "You need the shortest current map of package authority, front doors, validation commands, and stale/noisy surfaces before deeper graph or cleanup work."
---

# Control Map

Use this as the control layer above Understand graphs.

Status:

- output: control map
- cleanup mode: classify first
- graph scope: scoped only
- whole-repo graph: deferred until `.understandignore`, docs, archive, generated, and local-artifact boundaries are proven
- current markdown inventory: 630 files in this worktree
- package markdown inventory: 272 files under `packages/omniweb-toolkit`
- existing package-source Understand graph: `packages/omniweb-toolkit/src/.understand-anything/knowledge-graph.json`, 475 nodes, 826 edges, 10 layers, 14 tour steps
- existing package-wide Understand graph: `packages/omniweb-toolkit/.understand-anything/knowledge-graph.json`, 690 nodes, 57 edges; useful as a broad inventory, not cleanup authority

## Authority Order

Operator rule:

- code and package checks beat docs
- package docs beat downstream repo docs for public package surface
- Beads beat chat for task state
- scoped graphs help find wiring, but commands prove claims

Live authorities:

- repo workflow: root `AGENTS.md`
- repo architecture: root `CLAUDE.md`
- current product front door: root `README.md`
- package public surface: `packages/omniweb-toolkit/package.json`, `src/index.ts`, `src/omniweb.ts`, `src/hive.ts`, `src/runtime.ts`, `src/write.ts`, `src/research-agent-minimal.ts`
- package activation and operator routing: `packages/omniweb-toolkit/SKILL.md`, `TOOLKIT.md`, `README.md`, `AGENTS.md`
- package proof state: `references/verification-matrix.md`, `references/read-surface-sweep.md`, `references/write-lifecycle.md`, `references/full-action-spectrum-testing-matrix.md`
- operator front door: `packages/omniweb-toolkit/agents/openclaw/colony-operator/`
- deterministic proof layer: `packages/omniweb-toolkit/scripts/`, `evals/`, `tests/packages/`
- generated distribution views: `agents/registry/`, older generated OpenClaw archetypes; provenance surfaces, not default authority

Archive/reference-only authorities:

- `docs/archive/`: historical decisions, old handoffs, old plans
- `docs/research/`: source research and platform discovery, not package truth by itself
- `.ai/guides/`: supplementary local guides
- `docs/primitives/`: redundant with package references per root `CLAUDE.md`

## Runnable Surfaces

Default no-spend checks:

- `bun run --cwd packages/omniweb-toolkit check:package`
- `bun run --cwd packages/omniweb-toolkit check:evals`
- `bun run --cwd packages/omniweb-toolkit check:frontdoor`
- `bun run --cwd packages/omniweb-toolkit check:openclaw`
- `bun run --cwd packages/omniweb-toolkit check:registry`
- `bun run --cwd packages/omniweb-toolkit check:verification-matrix`
- `bun run --cwd packages/omniweb-toolkit check:codebase-reachability`
- `bun run --cwd packages/omniweb-toolkit check:public-export-coverage`

Colony-operator control checks:

- `bun run --cwd packages/omniweb-toolkit check:colony-operator-primary`
- `bun run --cwd packages/omniweb-toolkit check:colony-operator-dry-run`
- `bun run --cwd packages/omniweb-toolkit check:colony-operator-entrypoint`
- `bun run --cwd packages/omniweb-toolkit check:colony-operator-decision-coverage`
- `bun run --cwd packages/omniweb-toolkit check:colony-operator-guardrails`
- `bun run --cwd packages/omniweb-toolkit check:colony-operator-consumer`
- `bun run --cwd packages/omniweb-toolkit run:colony-operator-cycle`

Read/proof sweeps:

- `bun run --cwd packages/omniweb-toolkit check:read-surface`
- `bun run --cwd packages/omniweb-toolkit check:live`
- `bun run --cwd packages/omniweb-toolkit check:live:detailed`
- `bun run --cwd packages/omniweb-toolkit check:responses`
- `bun run --cwd packages/omniweb-toolkit check:endpoints`
- `bun run --cwd packages/omniweb-toolkit check:categories`
- `bun run --cwd packages/omniweb-toolkit check:consumer-spectrum-tarball`

CLI/operator smoke:

- `bun run --cwd packages/omniweb-toolkit omniweb -- --help`
- `bun run --cwd packages/omniweb-toolkit omniweb -- colony feed --limit 1 --json`
- `bun run --cwd packages/omniweb-toolkit omniweb -- colony signals --json`
- `bun run --cwd packages/omniweb-toolkit omniweb -- colony leaderboard --limit 3 --json`

## Write And Spend Gates

Default stance:

- read first
- no spend by default
- no live publish, reply, react, tip, bet, transfer, upload, storage write, escrow send, identity mutation, webhook mutation, or hosted activation without explicit execution authority

Live authority markers:

- `--broadcast`: wallet-backed write/spend path
- `--execute`: operator live action path
- `--include-tip`: extra tip spend path
- `--agent-name` or `--env-path`: required targeting for identity/domain mutation probes where the maintained scripts demand explicit runtime identity

Known spendful or mutation-capable commands:

- `bun run --cwd packages/omniweb-toolkit check:write-surface -- --broadcast`
- `bun run --cwd packages/omniweb-toolkit run:colony-operator-cycle -- --execute`
- `bun run --cwd packages/omniweb-toolkit check:social-writes -- --execute`
- `bun run --cwd packages/omniweb-toolkit check:market-action -- --broadcast`
- `bun run --cwd packages/omniweb-toolkit check:chain-transfer -- --broadcast`
- `bun run --cwd packages/omniweb-toolkit preview:storage -- --program-name <name> --broadcast`

Proof rule:

- tx hash is not enough for product truth
- proof packets must separate chain acceptance, product/API readback, lifecycle state, cleanup, and degraded or unsupported status
- short readback timeout is lifecycle state, not automatic failure

## Unsupported Or Gated

Current non-default surfaces:

- whole-repo Understand graph: blocked by markdown/archive/generated noise
- IPFS upload path: excluded where quote still returns unsupported/unknown fee evidence
- escrow: degraded until readback wrappers prove claimable state
- raw transfer: integer DEM only until base-unit conversion is proven
- TLSN: exposed/experimental, still needs bounded runtime proof
- chat send and webhook receiver: excluded until controlled room/callback, owned id, cleanup, and readback lane exist
- DemosWork, XM, Rubic: inventory/import-boundary evidence only unless promoted by four-column proof
- older OpenClaw specialist bundles: archive/reference posture while `colony-operator` is primary

Mismatch bead rule:

- create a mismatch bead only when a graph/doc claim is checked against a command or source file
- mismatch classes: no validation, no public route, bypassed guardrail, stale doc claim, unsupported path described as ready

## Doc Classification

Inventory from this worktree:

- root markdown: 6
- `docs/`: 95 non-archive, non-research docs
- `docs/archive/`: 183 docs
- `docs/research/`: 32 docs
- `packages/omniweb-toolkit/references/`: 134 docs
- `packages/omniweb-toolkit/agents/`: 115 docs
- `packages/omniweb-toolkit/docs/`: 7 docs
- package other docs: 16
- other markdown: 42

Live authority:

- root `README.md`, `CLAUDE.md`, `AGENTS.md`
- `docs/ROADMAP.md`, `docs/decisions/`, `docs/INDEX.md` when they describe repo-level phase or accepted ADR truth
- `packages/omniweb-toolkit/README.md`, `SKILL.md`, `TOOLKIT.md`, `GUIDE.md`, `AGENTS.md`
- package `references/index.md`, `verification-matrix.md`, `write-lifecycle.md`, `read-surface-sweep.md`, `full-action-spectrum-testing-matrix.md`
- package scripts, eval specs, and tests that enforce the described behavior

Downstream duplicate:

- repo docs that restate package API or validation ladders instead of linking package references
- package compatibility stubs under `packages/omniweb-toolkit/docs/`
- `docs/primitives/`, already marked redundant by root `CLAUDE.md`
- older package reference files that describe an older proof run where a newer closeout/reference supersedes it

Historical handoff/archive:

- `docs/archive/**`
- old Claude/Codex cooperation reviews and old plan files
- dated proof packets that remain useful provenance but should not be the first routing surface

Stale or contradictory candidate:

- any doc that claims live support without a matching package script, current reference, or validation command
- any doc that treats older specialist archetypes as default onboarding over `colony-operator`
- any doc that promotes IPFS, escrow, chat, webhook, DemosWork, XM, Rubic, TLSN, or raw fractional transfer beyond the current gated status above
- any command examples that use the wrong runner for the current repo policy

Generated or local artifact:

- `.understand-anything/**`
- generated OpenClaw and registry artifacts when they are not the hand-maintained `colony-operator` source
- packaged eval examples and captured playbook runs
- local scorecards, handoff scratch files, and untracked worktree artifacts

## Scoped Graph Plan

Keep:

- `packages/omniweb-toolkit/src/.understand-anything/knowledge-graph.json` for package-source wiring

Add only scoped, untracked graph artifacts:

- scripts plus evals graph: validates proof-command wiring against `scripts/`, `evals/`, `package.json`, and `tests/packages`
- colony-operator graph: validates front-door wiring against `agents/openclaw/colony-operator`, `src/colony-operator-*`, and operator checks
- root `src + cli` graph: optional; only if a control-map mismatch points at active root runtime or CLI authority

Do not use graph existence as proof. Use graphs to aim command proof.
