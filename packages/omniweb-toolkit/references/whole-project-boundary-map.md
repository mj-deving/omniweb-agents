---
summary: "Boundary map for using the control map to inspect the whole repo without letting archives, generated outputs, or sessions dominate the graph."
read_when: ["whole project graph", "understandignore", "repo-wide control audit", "control boundary"]
topic_hint:
  - "You need to widen from package control-map work to a whole-project scan while preserving live authority signal."
---

# Whole-Project Boundary Map

Use this before any whole-repo Understand graph.

Status:

- source map: `references/control-map.md`
- graph mode: boundary first
- default stance: no spend, no live mutation
- whole-repo graph artifacts: local/untracked unless explicitly approved
- candidate files before boundary: 1973 tracked scan candidates
- ignored by boundary: 569 files
- included after boundary: 1404 files
- 2026-05-27 bounded Understand scan: 1404 included files, 569 ignored files, 984 code files, 20 tracked generated template files included

## Include

Live code and control surfaces:

- root `src/`, `cli/`, `scripts/`, `config/`, `tests/`
- root `agents/` hand-authored sources except generated/reference score artifacts
- root `templates/`, including tracked generated examples consumed by root generated-agent scripts
- root `README.md`, `CLAUDE.md`, `AGENTS.md`, `OPENCLAW.md`
- root `docs/decisions/`, `docs/goalmode/`, `docs/rules/`, `docs/specs/`, `docs/ROADMAP.md`, `docs/INDEX.md`
- package `packages/omniweb-toolkit/src/`, `scripts/`, `evals/`, `tests/packages/`, `playbooks/`, `config/`
- package `README.md`, `SKILL.md`, `TOOLKIT.md`, `GUIDE.md`, `AGENTS.md`
- package top-level `references/*.md`, including `control-map.md`
- package `agents/openclaw/colony-operator/`

## Exclude

Noise and provenance surfaces:

- `docs/archive/`, `docs/research/`, `docs/primitives/`, `docs/assets/`
- `.ai/guides/`, `Plans/`, `.sessions/`, root `sessions/`
- package sessions, eval captured examples, playbook runs, reference artifacts, dated proof directories
- package build output, generated registry agents, nested `.understand-anything/`
- dependency/build/tool state: `node_modules/`, `dist/`, `.git/`, `.beads/`, `.dolt/`, `.claude/`, `.codex/`
- root `.understand-anything/intermediate/`, `.understand-anything/tmp/`, and root graph/meta outputs
- generated graph/session/build artifacts, local scratch, and image/binary artifacts

## First Questions

Use the graph and inventory to answer:

- Which root runtime paths still matter beside `packages/omniweb-toolkit`?
- Which root CLI/operator surfaces duplicate or bypass package authority?
- Which docs are live control surfaces versus downstream duplicates?
- Which tests validate package-public, root-runtime, and operator-front-door paths?
- Which generated surfaces are still consumed by active code?

## First Scan Findings

Boundary result:

- included code/control mass: `packages/` 483 files, `tests/` 349, `src/` 351, `docs/` 80, `cli/` 42, `scripts/` 24, `templates/` 34
- excluded noise mass: `packages/` 397 files, `docs/` 292, root/package sessions 44, templates 10, `.ai` 6
- package authority still dominates current control; root runtime/CLI remains a legacy operator layer that needs classification before cleanup
- root `src/index.ts` is portable core export surface; root `src/toolkit/index.ts` is older Demos Toolkit API surface
- root `cli/` and `scripts/` remain active-looking operator tools; live shebangs/help text were normalized to Bun-facing invocation in the follow-up command-policy pass
- maintained package write/spend gates are concentrated behind explicit `--broadcast`, `--execute`, `--include-tip`, and identity-confirmation flags

Follow-up created:

- `omniweb-agents-vxza`: normalize live command examples and CLI shebangs to Bun-facing policy; keep historical PRD evidence separate from live operator docs

## Package/Root Ownership Decisions

Use this map before treating same-name root and package files as duplicates.
Most current overlaps are boundary adapters or distinct runtime layers, not
deletion candidates.

- URL validation: `src/toolkit/url-validator.ts` is the canonical
  implementation. `packages/omniweb-toolkit/src/url-validator.ts` is the only
  package boundary wrapper, and package `src/` plus `scripts/` callers should
  import through that wrapper. Guard: `tests/packages/toolkit-guardrails.test.ts`
  checks that direct package imports of `../../../src/toolkit/url-validator.js`
  are limited to the wrapper.
- Action execution: root `src/toolkit/reactive/event-loop.ts` and
  `src/actions/action-executor.ts` remain active root event-loop execution
  surfaces. Package `packages/omniweb-toolkit/src/action-executor.ts` remains
  the resolved-intent executor for package minimal-agent/operator flows. Do not
  collapse these without proving event-loop behavior and package
  resolved-intent envelopes stay covered.
- Connect/runtime: root `src/toolkit/tools/connect.ts` remains the session
  lifecycle tool for root toolkit paths. Package `packages/omniweb-toolkit/src/connect.ts`
  and `src/colony.ts` remain the public runtime adapter and `connect()`
  surface. Keep both until a later task proves one call family is unused.
- Tip: root `src/toolkit/tools/tip.ts` and `src/actions/action-executor.ts`
  support root session/reactive flows. Package `packages/omniweb-toolkit/src/hive.ts`
  and `src/action-executor/tip.ts` support runtime and resolved-intent package
  flows. Treat tip overlap as separate execution ownership, not duplicate code.
- Observe: root `src/lib/pipeline/observe.ts` is the append-only telemetry
  logger. Package `packages/omniweb-toolkit/src/policy/observe.ts` is a policy
  delegate that calls consumer-owned `observe(ctx)`. Both are retained.
- Errors: package `packages/omniweb-toolkit/src/errors.ts` owns public package
  error classes. Root `src/toolkit/util/errors.ts` owns the shared
  `toErrorMessage()` utility shim for root internals. This is a low-priority
  cleanup candidate only if a future public-error contract or root/package
  utility boundary needs tightening.

Next cleanup target:

- `omniweb-agents-u36h` is a ranked helper-duplication audit only. It should
  decide keep/extract per helper and create a new small bead for any accepted
  extraction. It is not authority to delete or centralize helpers directly.

Validation for ownership-map changes:

- docs syntax and whitespace: `git diff --check`
- package markdown front matter: `bun scripts/normalize-doc-frontmatter.ts --check`
- URL boundary regression when the URL validator row changes:
  `bunx vitest run tests/packages/toolkit-guardrails.test.ts`

## Command Policy Cleanup

Normalized:

- live root `cli/*.ts` and `scripts/*.ts` TypeScript shebangs: `env npx tsx` -> `env -S bunx tsx`
- live root/package CLI help examples: `npx tsx` -> `bunx tsx`
- current package playbooks, OpenClaw skill/readme surfaces, script catalog entries, and generated OpenClaw export templates: `npm run` -> `bun run`
- current package-root examples: `npm --prefix packages/omniweb-toolkit run <script>` -> `bun run --cwd packages/omniweb-toolkit <script>`

Intentionally left:

- `packages/omniweb-toolkit/package.json` scripts that use `npm` internally for root test delegation, package packing, or consumer-fixture behavior
- dated proof reports, launch checkpoints, PRD validation logs, and OpenClaw memory notes where old `npm` / `npx` commands are historical evidence
- tracked root generated templates are active checked-in examples because root generated-agent scripts consume `templates/generated/<agent>/strategy.yaml`
- source generators were normalized where they feed live OpenClaw surfaces

Latest bounded scan:

- `.understand-anything/.understandignore` excludes root Understand intermediate/tmp/graph outputs so generated scan artifacts do not enter the graph
- deterministic boundary scan included 1404 files and filtered 569 files
- tracked `templates/generated/**` contributed 20 included files and is covered by `bun run check:generated-templates`
- latest import graph edge count remains a separate Understand follow-up because NodeNext `.js` to `.ts` resolution is tracked in `omniweb-agents-s0sb`

## Proof Rule

Graph edges can aim investigation, not prove truth.

When a whole-project graph suggests a mismatch, verify with:

- source file path
- package or root command
- no-spend CLI smoke where available
- Beads follow-up only after evidence

## Current Ignore File

Root boundary file:

- `.understand-anything/.understandignore`

It preserves live code, active docs, package references, checked-in generated templates, and the colony-operator front door while excluding archives, generated graph/session/build outputs, sessions, and nested graph artifacts.
