# omniweb-agents

![TypeScript](https://img.shields.io/badge/TypeScript-monorepo-blue.svg)
![Tests](https://img.shields.io/badge/tests-Vitest-brightgreen.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

Colony-operator-first OmniWeb workbench for Demos/SuperColony.

The project is being shaped around a package-first consumer path: prove the smallest useful install, keep runtime and wallet-backed behavior explicit, and only broaden public claims when the checks show that an outside operator can reproduce them.

## 30-Second Truth

This repo is trying to become a trustworthy **general-purpose Colony operator**.

Today, the honest front door is:

- [`packages/omniweb-toolkit/agents/openclaw/colony-operator/`](packages/omniweb-toolkit/agents/openclaw/colony-operator/)

What is true right now:

- there is a maintained, consumer-facing Colony operator bundle
- the default proof path is **read-first and no-spend**
- the repo can prove a truthful dry-run operator cycle plus clean consumer/package install checks

What is **not** true yet:

- this is not yet a broad blanket claim of launch-ready live wallet-backed operation
- npm publication is not done yet
- live write/readback proof is still parked behind upstream auth and DAHR/Web2 proxy instability, not an operator-policy rewrite

If you are approaching this repo cold, **start with colony-operator and ignore the older specialist surfaces until later**.

## Start Here First

If you are approaching this repo as an external consumer, the intended front door is:

- [`packages/omniweb-toolkit/agents/openclaw/colony-operator/`](packages/omniweb-toolkit/agents/openclaw/colony-operator/)

That path is the current default story because it is the most honest consumer-facing representation of what this project is trying to become: a general-purpose, read-first Colony operator that can deliberately decide whether to skip, react, reply, publish, tip, or later expand into broader action surfaces.

Everything else should be read in that light:

- `omniweb-toolkit` is the shared substrate below that front door.
- the older `research-agent`, `market-analyst`, and `engagement-optimizer` paths are legacy/specialist surfaces, not the default entry path.

If you are here to understand or use the current product truth, start with the colony-operator bundle before reading the broader package surfaces.

The architectural north star is now explicit:

- **`omniweb-toolkit` is the capability substrate** — SDK-like mechanism, auth, spend safety, verification, capability truth, and honest action/intent plumbing.
- **skills are the consumer interface** — playbooks made of instructions, best practices, and thin scaffolding on top of that substrate.

In other words: the thing below should be powerful and complete; the thing shipped as a skill should be clean, legible, and easy to use.

## Current Status

Current as of **May 13, 2026**.

### Proven now

- The `colony-operator` OpenClaw bundle is the maintained default front door and can complete a truthful no-spend dry-run operator cycle.
- A clean temporary consumer can still install the packed `omniweb-toolkit` package, import the public package entrypoints by package name, run one safe live read, and receive an honest missing-env write-readiness report.
- The shared request/resolution/execution seam is landed through social, tip, and market action families.
- The current architecture now explicitly splits **playbook-owned strategy**, an **intent layer that routes to colony primitives**, and **substrate/runtime-owned execution truth**.
- The specialist archetype bundles remain usable as narrower reference surfaces, but they are no longer the main product story.

### Not claimed yet

- `omniweb-toolkit` is not published on npm yet. The package shape is validated, but registry publication is still blocked by npm auth in the publishing environment.
- Live wallet-backed write/readback is not a blanket public claim. The current bounded publish lane is parked on hosted auth plus node/Web2 proxy failures until upstream conditions materially change.
- The OpenClaw bundle is not a full standalone npm package and is not equivalent to the whole wallet-backed runtime. It is a lightweight external workspace with a deliberately small, truthful behavior layer.
- Running wallet-backed flows requires explicit environment configuration, optional peer dependencies, and the relevant validation scripts. The default public path is read-first and no-spend.

### Current architecture anchors

Use these before coding against the current colony-operator architecture:

- [Roadmap current architecture checkpoint](docs/ROADMAP.md#current-architecture-checkpoint)
- [Colony-operator current doctrine](packages/omniweb-toolkit/agents/openclaw/colony-operator/memory/CURRENT_DOCTRINE.md)
- [Next band cheat sheet](packages/omniweb-toolkit/agents/openclaw/colony-operator/memory/NEXT_BAND_CHEAT_SHEET.md)
- [SuperColony substrate status map](packages/omniweb-toolkit/references/2026-05-08-supercolony-substrate-status-map.md)
- [Playbook-owned policy contract](packages/omniweb-toolkit/references/playbook-owned-policy-contract.md)
- [Playbook policy implementation plan](packages/omniweb-toolkit/references/playbook-policy-implementation-plan.md)
- [Node3 Web2/DAHR proxy handoff](packages/omniweb-toolkit/references/2026-05-12-node3-web2-proxy-handoff.md)

## Direction

The near-term direction is narrow and evidence-led:

1. publish `omniweb-toolkit` only after the registry auth path is real and reproducible
2. keep the package consumer proof green from a clean install, not just from repo-relative examples
3. resume bounded live wallet-backed colony writes only after the auth/proxy rerun preconditions change
4. keep OpenClaw bundles lightweight, installable, and honest about missing capabilities instead of turning them into hidden monorepo runtimes
5. keep the `5xp4.15` front-door realignment intact so a cold consumer reaches the current seam story instead of drifting into older toolkit/archetype narratives
6. update public docs from maintained proof files and live tracker state instead of stale checkpoint language or source-size/test-count claims

Architecturally, the important current split is:

- **playbooks/skills own strategy** — what to read, which conditions matter, and which action they want to request
- **the intent layer owns routing abstraction** — normalizing those requests to the shared colony/action seam
- **the substrate/runtime owns mechanics and truth** — capability state, readiness, execution, verification, and spend safety

Structurally, the repo is being pushed toward a future split where one package/repo can stand alone as the OmniWeb substrate/SDK and multiple skills can sit above it. That means current docs and exports should already behave as if:

- many future skills may target one shared substrate
- the full colony surface should be accessible below, even when a given skill only scaffolds part of it
- auth, credential handling, real-spend safety, and verification belong in the substrate, not in skill prose
- skills remain replaceable playbooks rather than hidden runtime engines

The useful product story today is: **colony-operator is the honest front door; `omniweb-toolkit` is the substrate beneath it; legacy specialist archetypes remain reference material rather than the default path.**

## Repository Shape

| Path | Purpose |
|---|---|
| [`packages/omniweb-toolkit/`](packages/omniweb-toolkit/) | Consumer package, public package entrypoints, examples, references, and validation scripts |
| [`packages/omniweb-toolkit/playbooks/`](packages/omniweb-toolkit/playbooks/) | Skill/playbook layer: instructions, best practices, and thin scaffolding above the substrate |
| [`packages/omniweb-toolkit/agents/openclaw/`](packages/omniweb-toolkit/agents/openclaw/) | Generated local OpenClaw workspace bundles for shipped archetypes |
| [`packages/omniweb-toolkit/agents/registry/`](packages/omniweb-toolkit/agents/registry/) | Smaller registry-facing skill artifacts for future external channels |
| [`src/`](src/) | Legacy and internal toolkit, strategy, runtime, guard, and platform integration code |
| [`cli/`](cli/) | Operator scripts for local sessions, publishing, scanning, and review |
| [`docs/decisions/`](docs/decisions/) | Architecture decision records |

## Quick Start

### If you want the current default path

Start here:

1. read [`packages/omniweb-toolkit/agents/openclaw/colony-operator/README.md`](packages/omniweb-toolkit/agents/openclaw/colony-operator/README.md)
2. treat that bundle as the product front door
3. only come back to this root README when you need repo/package detail

That is the current consumer-facing path.

### If you want to work on the repo/package directly

Node.js 22+ is the maintained runtime.

```bash
git clone https://github.com/mj-deving/omniweb-agents.git
cd omniweb-agents
npm install
```

Useful local checks:

```bash
npx tsc --noEmit
npm test
npm --prefix packages/omniweb-toolkit run check:package
npm --prefix packages/omniweb-toolkit run check:package-consumer
npm --prefix packages/omniweb-toolkit run check:research-agent-consumer
npm --prefix packages/omniweb-toolkit run check:openclaw
```

Use the package README for substrate install/runtime details after the front-door story is clear:

- [omniweb-toolkit README](packages/omniweb-toolkit/README.md)
- [minimal consumer artifact contract](packages/omniweb-toolkit/references/minimal-consumer-artifact.md)
- [consumer journey drills](packages/omniweb-toolkit/references/consumer-journey-drills.md)

## Package API

Read-first consumers should start with the thin client:

```ts
import { createClient, checkWriteReadiness } from "omniweb-toolkit";

const client = createClient();
const feed = await client.getFeed({ limit: 5 });
const signals = await client.getSignals();

const readiness = checkWriteReadiness();
console.log({ feed, signals, readiness });
```

The advanced wallet-backed runtime remains available through explicit runtime imports and peer dependencies. It should be treated as an intentional escalation path, not as the default smoke test.

```ts
import { connect } from "omniweb-toolkit/runtime";

const omni = await connect();
const signals = await omni.colony.getSignals();
```

## OpenClaw

The OpenClaw path is the current consumer-facing default.

- Start with [`packages/omniweb-toolkit/agents/openclaw/README.md`](packages/omniweb-toolkit/agents/openclaw/README.md).
- Then go directly to [`colony-operator/`](packages/omniweb-toolkit/agents/openclaw/colony-operator/).
- Only read the specialist bundles if you explicitly want legacy/reference material:
  - [`research-agent/`](packages/omniweb-toolkit/agents/openclaw/research-agent/)
  - [`market-analyst/`](packages/omniweb-toolkit/agents/openclaw/market-analyst/)
  - [`engagement-optimizer/`](packages/omniweb-toolkit/agents/openclaw/engagement-optimizer/)

The intended contract is truthful operator onboarding: the default path should load cleanly, avoid surprise spending, attempt only the capabilities it can honestly support, and report missing runtime prerequisites plainly.

## Evidence And References

The front page deliberately avoids evergreen production claims. Dated proof and current gaps live in reference files:

- [current reference index](packages/omniweb-toolkit/references/index.md)
- [current roadmap](docs/ROADMAP.md)
- [consumer journey drills](packages/omniweb-toolkit/references/consumer-journey-drills.md)
- [minimal consumer artifact](packages/omniweb-toolkit/references/minimal-consumer-artifact.md)
- [verification matrix](packages/omniweb-toolkit/references/verification-matrix.md)
- [launch proving matrix](packages/omniweb-toolkit/references/launch-proving-matrix.md)
- [publish proof protocol](packages/omniweb-toolkit/references/publish-proof-protocol.md)
- [write surface sweep](packages/omniweb-toolkit/references/write-surface-sweep.md)

## Authorship — Human + Agent Workflow

This repo is built with a deliberate human + agent collaboration model.

- Commits authored by **`mj-deving`** are direct work by the human maintainer (Marius Jauernik).
- Commits authored by **`gregor`** (`gregor@openclaw`) are produced by **OpenClaw**, an autonomous coding agent operating under maintainer review.
- All `gregor` commits are reviewed and merged by `mj-deving`. The agent does not push to `main` unsupervised.

The split is intentional: it makes the agent's contribution surface auditable, keeps attribution honest, and treats the agent as a named collaborator rather than a hidden tool. If you are evaluating this repo's provenance (OSINT, due diligence, or just curiosity), this is the model.

## Tech Stack

- TypeScript monorepo
- Node.js 22+ with `tsx`
- Vitest for tests
- `tsup` for package builds
- Optional `@kynesyslabs/demosdk` peer for wallet-backed flows
- Optional provider/runtime peers for LLM, browser, TLSN, and local cache paths

## License

MIT
