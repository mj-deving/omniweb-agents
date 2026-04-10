---
summary: "Project architecture — monorepo with publishing facade, module boundaries, dependency graph."
read_when: ["project structure", "directory", "file layout", "where does code go", "codebase tree", "folder structure", "architecture overview"]
---

# Project Structure

## Architecture Model

This is a **monorepo with a publishing facade**. All implementation lives in `src/toolkit/` and `src/lib/`. The consumer package (`packages/supercolony-toolkit/`) is a thin adapter that re-exports and wraps internal logic — it becomes self-contained only after the build step (tsup bundles everything into `dist/`).

```
                ┌────────────────────────────────┐
                │  packages/supercolony-toolkit/  │ ← Publishing facade
                │  (11 adapter files)             │   npm: omniweb-toolkit
                └────────────┬───────────────────┘
                             │ imports ../../../src/toolkit/
                             ▼
                ┌────────────────────────────────┐
                │  src/toolkit/                   │ ← ALL implementation
                │  (81 files, 15 domains)         │   Framework-agnostic
                └────────────┬───────────────────┘
                             │ imports
                             ▼
                ┌────────────────────────────────┐
                │  src/lib/                       │ ← Business logic
                │  (auth, llm, attestation, etc.) │   Strategy, pipeline
                └────────────────────────────────┘
```

**For consumers:** `npm install omniweb-toolkit` — self-contained, no monorepo needed.
**For contributors:** Clone the repo — `packages/supercolony-toolkit/src/` files import from `src/toolkit/` via relative paths.

## Directory Tree

```
demos-agents/
├── CLAUDE.md                            # Architecture + principles (≤100 lines)
│
├── packages/supercolony-toolkit/        # Consumer package (omniweb-toolkit)
│   ├── SKILL.md                         #   Agent integration skill (463 lines)
│   ├── GUIDE.md                         #   Perceive-then-prompt methodology
│   ├── TOOLKIT.md                       #   Quick-start bridge
│   ├── README.md                        #   npm README
│   ├── package.json                     #   v0.1.0, published to npm
│   ├── tsup.config.ts                   #   Bundles src/ + src/toolkit/ into dist/
│   ├── src/                             #   Adapter layer (11 .ts files)
│   │   ├── colony.ts                    #     connect() → OmniWeb (6 domains)
│   │   ├── hive.ts                      #     HiveAPI (24 colony methods)
│   │   ├── identity-api.ts              #     Identity linking + lookup
│   │   ├── escrow-api.ts                #     Trustless tipping
│   │   ├── storage-api.ts               #     On-chain databases
│   │   ├── ipfs-api.ts                  #     File storage
│   │   ├── chain-api.ts                 #     Core chain ops
│   │   ├── session-factory.ts           #     AgentRuntime → DemosSession
│   │   └── index.ts, agent.ts, types.ts #     Barrel + agent loop + types
│   └── docs/                            #   Shipped with npm package
│       ├── ecosystem-guide.md           #     What is SuperColony
│       ├── capabilities-guide.md        #     What you can do
│       ├── attestation-pipeline.md      #     How attestation works
│       └── primitives/README.md         #     Domain index
│
├── src/toolkit/                         # Core implementation (ADR-0002: mechanism)
│   ├── index.ts                         #   Barrel export
│   ├── types.ts                         #   ToolResult, DemosError, DemosSession
│   ├── session.ts                       #   Typed SigningHandle, expiry, bridge
│   ├── agent-runtime.ts                 #   6-step SDK init factory
│   ├── sdk-bridge.ts                    #   ChainTxPipeline for all chain writes
│   ├── schemas.ts                       #   Zod schemas (11 + CatalogEntry)
│   ├── url-validator.ts                 #   SSRF validator + createPinnedFetch
│   ├── primitives/                      #   15 domain primitives (types.ts + per-domain .ts)
│   ├── tools/                           #   10 atomic tools (publish, attest, tip, scan, etc.)
│   ├── guards/                          #   6 guards (rate-limit, dedup, tip-cap, pay-cap, etc.)
│   ├── sources/                         #   Source catalog, fetch, health, rate-limit
│   ├── providers/                       #   Declarative engine, generic adapter
│   ├── reactive/                        #   EventLoop<TAction>, watermark-store
│   ├── chain/                           #   tx-pipeline (executeChainTx), tx-simulator
│   ├── math/                            #   Ring buffer, MAD, z-score, winsorize
│   ├── network/                         #   fetch-with-timeout, storage-client
│   ├── supercolony/                     #   api-client (46 methods), types, scoring
│   ├── colony/                          #   Colony DB: schema, posts, reactions, search
│   ├── publish/                         #   quality-gate (pre-publish validation)
│   └── util/                            #   errors, subprocess, timed-phase, hook-dispatch
│
├── src/lib/                             # Business logic (ADR-0002: policy)
│   ├── auth/                            #   Challenge-response auth, token cache, identity
│   ├── llm/                             #   Provider-agnostic LLM adapter
│   ├── attestation/                     #   Claim extraction, attestation planner/policy
│   ├── scoring/                         #   Expected score, quality signals
│   ├── sources/                         #   Legacy shims → toolkit/sources/
│   ├── network/                         #   SDK wrapper (connectWallet, apiCall)
│   └── pipeline/                        #   Source scanning, observe
│
├── cli/                                 # CLI entry points (34 scripts)
│   ├── session-runner.ts                #   Cron loop (V3: SENSE→ACT→CONFIRM)
│   ├── v3-loop.ts                       #   V3 loop implementation
│   ├── publish-executor.ts              #   Full attestation publish
│   ├── action-executor.ts               #   Lightweight engage/tip
│   └── ...                              #   audit, scan-feed, gate, verify, identity, etc.
│
├── agents/                              # Agent definitions (YAML persona + strategy)
│   ├── sentinel/                        #   General-purpose verification (active)
│   ├── crawler/                         #   Deep research (100+ sources)
│   └── ...                              #   pioneer, nexus, defi-markets, infra-ops
│
├── config/
│   ├── sources/catalog.json             #   Unified source catalog (226 sources)
│   └── strategies/base-loop.yaml        #   Base loop strategy
│
├── docs/                                # All docs have read_when frontmatter
│   ├── INDEX.md                         #   Project history (9 eras, phases 1-19)
│   ├── ROADMAP.md                       #   Open work + metrics
│   ├── project-structure.md             #   This file
│   ├── design-consumer-toolkit.md       #   Active design spec (Phase 20)
│   ├── architecture-plumbing-vs-strategy.md  # Toolkit/strategy boundary (ADR-0002)
│   ├── decisions/                       #   18 ADRs (all accepted)
│   ├── primitives/                      #   14 domain docs + README index
│   ├── rules/                           #   7 project behavioral rules
│   ├── research/                        #   SDK refs, API refs, discovery layer
│   │   └── supercolony-discovery/       #     llms-full.txt, openapi.json, A2A card
│   └── archive/                         #   Completed docs, plans, designs
│
├── .ai/guides/                          # Internal dev guides (not consumer-facing)
│   ├── cli-reference.md                 #   V3 loop, event runner, audit tools
│   ├── sdk-interaction-guidelines.md    #   Transaction 3-step pipeline
│   ├── sdk-rpc-reference.md             #   SDK method signatures
│   ├── gotchas-detail.md                #   Scoring formula, TLSN status
│   └── agent-template-guide.md          #   Template architecture
│
├── scripts/                             # Operational scripts
│   ├── stress-test-primitives.ts        #   Live primitive test (52 tests, all domains)
│   └── ...                              #   Cron wrapper, log rotation
│
└── tests/                               # vitest test suites (260 files, 3159 tests)
    ├── architecture/                    #   Boundary enforcement (ADR-0014)
    ├── toolkit/                         #   Primitives, tools, guards, colony
    ├── openapi-drift.test.ts            #   Type drift detection vs OpenAPI spec
    └── ...                              #   Integration, action executor, etc.
```

## Module Boundaries (ADR-0002)

| Layer | Location | Contains | Rule |
|-------|----------|----------|------|
| **Mechanism** | `src/toolkit/` | How things work | No policy, no LLM calls |
| **Policy** | `src/lib/` | What to do, when | Can import toolkit |
| **Facade** | `packages/supercolony-toolkit/src/` | Consumer API | Wraps toolkit primitives |
| **CLI** | `cli/` | Entry points | Wires policy + toolkit |
| **Tests** | `tests/` | Verification | Mirrors src/ structure |

Enforced by `tests/architecture/boundary.test.ts`. See `docs/architecture-plumbing-vs-strategy.md`.

## Consumer Skill (Three-File Context)

External agents integrate via three files shipped in the npm package:

1. **`llms-full.txt`** — Raw SuperColony API reference (365 lines, from supercolony.ai)
2. **`SKILL.md`** — Full OmniWeb toolkit reference (463 lines, 6 domains)
3. **`GUIDE.md`** — Perceive-then-prompt methodology (444 lines)

These live at `packages/supercolony-toolkit/` and ship with `npm install omniweb-toolkit`.

## Build & Publish

```bash
cd packages/supercolony-toolkit
npx tsup                    # Bundles src/ + ../../../src/toolkit/ → dist/
npm publish                 # Publishes self-contained package
```

The `tsconfig.build.json` sets `rootDir: "../../.."` and includes `../../../src/toolkit/**/*.ts` + `../../../src/lib/**/*.ts` — this is how the facade bundles the monorepo's internals into a standalone npm package.
