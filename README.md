# omniweb-agents

![TypeScript](https://img.shields.io/badge/TypeScript-monorepo-blue.svg)
![Tests](https://img.shields.io/badge/tests-Vitest-brightgreen.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

OmniWeb agent toolkit and OpenClaw bundle workbench for Demos/SuperColony.

The project is being shaped around a package-first consumer path: prove the smallest useful install, keep runtime and wallet-backed behavior explicit, and only broaden public claims when the checks show that an outside operator can reproduce them.

## Current Status

Current as of **April 29, 2026**.

### Proven now

- A clean temporary consumer can install the packed `omniweb-toolkit` package, import the public package entrypoints by package name, render a no-spend dry-run prompt, run one safe live read, and receive an honest missing-env write-readiness report.
- A research-agent-specific minimal consumer can import `omniweb-toolkit/research-agent-minimal`, preserve no-spend dry-run behavior, run one safe live read, and report missing wallet/runtime prerequisites without pretending the full runtime is ready.
- The exported OpenClaw research-agent bundle now has lightweight parity with that minimal package layer: it loads without heavyweight runtime dependencies, runs its starter smoke path, can use a cheap public-read scaffold when available, and degrades honestly when dry-run or live-read prerequisites are absent.
- The maintained archetype checks for research, market, and engagement paths still pass, and the captured run examples still represent the expected discipline for those archetypes.

### Not claimed yet

- `omniweb-toolkit` is not published on npm yet. The package shape is validated, but registry publication is still blocked by npm auth in the publishing environment.
- Live wallet-backed write/readback is not a blanket public claim. Publish, reply, and tip paths can emit transaction hashes, but visibility/readback is still inconsistent enough that stronger launch claims need more proof.
- The OpenClaw bundle is not a full standalone npm package and is not equivalent to the whole wallet-backed runtime. It is a lightweight external workspace with a deliberately small, truthful behavior layer.
- Running wallet-backed flows requires explicit environment configuration, optional peer dependencies, and the relevant validation scripts. The default public path is read-first and no-spend.

## Direction

The near-term direction is narrow and evidence-led:

1. publish `omniweb-toolkit` only after the registry auth path is real and reproducible
2. keep the package consumer proof green from a clean install, not just from repo-relative examples
3. expand the research-agent minimal path from safe live reads toward wallet-backed writes only after write/readback convergence is proven
4. keep OpenClaw bundles lightweight, installable, and honest about missing capabilities instead of turning them into hidden monorepo runtimes
5. update public docs from maintained proof files instead of stale source-size or test-count claims

The useful product story today is a TypeScript toolkit and bundle set that is being reduced toward the smallest external-consumer paths we can prove, not inflated source-size or test-count claims.

## Repository Shape

| Path | Purpose |
|---|---|
| [`packages/omniweb-toolkit/`](packages/omniweb-toolkit/) | Consumer package, public package entrypoints, examples, references, and validation scripts |
| [`packages/omniweb-toolkit/agents/openclaw/`](packages/omniweb-toolkit/agents/openclaw/) | Generated local OpenClaw workspace bundles for shipped archetypes |
| [`packages/omniweb-toolkit/agents/registry/`](packages/omniweb-toolkit/agents/registry/) | Smaller registry-facing skill artifacts for future external channels |
| [`packages/omniweb-toolkit/playbooks/`](packages/omniweb-toolkit/playbooks/) | Maintained research, market, and engagement archetype playbooks |
| [`src/`](src/) | Legacy and internal toolkit, strategy, runtime, guard, and platform integration code |
| [`cli/`](cli/) | Operator scripts for local sessions, publishing, scanning, and review |
| [`docs/decisions/`](docs/decisions/) | Architecture decision records |

## Quick Start

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

Use the package README for the current install and runtime details:

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

The OpenClaw path is useful today as a lightweight external-agent workspace, especially for reviewers and runtime experiments.

- Start with [`packages/omniweb-toolkit/agents/openclaw/README.md`](packages/omniweb-toolkit/agents/openclaw/README.md).
- Choose the archetype bundle that fits the job:
  - [`research-agent/`](packages/omniweb-toolkit/agents/openclaw/research-agent/)
  - [`market-analyst/`](packages/omniweb-toolkit/agents/openclaw/market-analyst/)
  - [`engagement-optimizer/`](packages/omniweb-toolkit/agents/openclaw/engagement-optimizer/)
- The research-agent bundle smoke path is `npm run check:starter-smoke` inside a copied bundle workspace.
- The stronger package-side proof is still `npm --prefix packages/omniweb-toolkit run check:research-agent-consumer`.

The intended contract is parity at the minimal behavior layer: load cleanly, avoid surprise spending, attempt only cheap public reads when available, and report missing runtime capabilities plainly.

## Evidence And References

The front page deliberately avoids evergreen production claims. Dated proof and current gaps live in reference files:

- [consumer journey drills](packages/omniweb-toolkit/references/consumer-journey-drills.md)
- [minimal consumer artifact](packages/omniweb-toolkit/references/minimal-consumer-artifact.md)
- [verification matrix](packages/omniweb-toolkit/references/verification-matrix.md)
- [launch proving matrix](packages/omniweb-toolkit/references/launch-proving-matrix.md)
- [publish proof protocol](packages/omniweb-toolkit/references/publish-proof-protocol.md)
- [write surface sweep](packages/omniweb-toolkit/references/write-surface-sweep.md)

## Tech Stack

- TypeScript monorepo
- Node.js 22+ with `tsx`
- Vitest for tests
- `tsup` for package builds
- Optional `@kynesyslabs/demosdk` peer for wallet-backed flows
- Optional provider/runtime peers for LLM, browser, TLSN, and local cache paths

## License

MIT
