---
summary: "Ranked helper duplication audit for package/root helper names before utility extraction."
read_when: "helper duplication, utility extraction, package root ownership"
topic_hint:
  - "helper duplication"
  - "utility extraction"
  - "package root ownership"
  - "You need to decide whether same-name helpers should be extracted or stay local."
---

# Helper Duplication Audit

Status:

- owner bead: `omniweb-agents-u36h`
- mode: audit only
- default decision: keep helpers local unless call sites share semantics and ownership
- extraction rule: any accepted extraction gets a new small bead, branch, and PR

## Ranked Decisions

1. `uniqueStrings`: extract package-local helper, low risk.
   - Current copies:
     - `packages/omniweb-toolkit/src/colony-operator-discovery.ts`
     - `packages/omniweb-toolkit/src/colony-operator-action-lifecycle.ts`
     - `packages/omniweb-toolkit/src/colony-operator-response-context.ts`
     - `packages/omniweb-toolkit/src/action-admissibility.ts`
     - `packages/omniweb-toolkit/src/market-write-intents.ts`
   - Decision: accepted for a follow-up extraction inside package `src/`, not
     root `src/`.
   - Why: all package copies dedupe short string lists for capability,
     lifecycle, admissibility, or reason-code output. Two variants filter empty
     strings first, so the helper should make non-empty filtering explicit
     rather than hiding it in callers.
   - Follow-up: create one package-private helper and migrate only these package
     source copies with focused tests. Do not widen into root
     `src/toolkit/publish/event-verifier.ts` in the same change.

2. `isRecord`: keep local for now.
   - Current shared-looking exports:
     - `packages/omniweb-toolkit/src/research-evidence/value-utils.ts`
     - `packages/omniweb-toolkit/scripts/openclaw-export/text.ts`
   - Current local copies include package runtime parsers, package scripts,
     storage/readback consumers, root source adapters, and test/probe scripts.
   - Decision: no extraction.
   - Why: name match is stronger than behavior coupling. The existing exported
     helpers are domain-owned by research evidence and OpenClaw export text.
     Importing those into unrelated runtime, script, storage, or root source
     boundaries would make ownership less readable. A generic helper is not
     justified until there is a broader parser-boundary refactor.

3. `sleep`: keep local by execution lane.
   - Existing shared roots:
     - `src/toolkit/guards/state-helpers.ts`
     - `packages/omniweb-toolkit/src/action-executor/readback-helpers.ts`
   - Current local copies live mostly in package probe/check scripts and root
     source fetch/SDK retry paths.
   - Decision: no extraction.
   - Why: script polling helpers are intentionally disposable and often
     parameterized by local proof loops. Root retry/backoff sleep and package
     resolved-intent readback sleep are separate execution lanes.

4. `normalizeTimestamp`: keep local.
   - Current copies:
     - `packages/omniweb-toolkit/src/reply-experiment.ts`
     - `packages/omniweb-toolkit/scripts/check-reply-parent-inventory.ts`
     - `src/lib/mentions.ts`
     - `src/lib/pipeline/feed-filter.ts`
   - Decision: no extraction.
   - Why: two package copies normalize seconds-or-milliseconds into nullable
     milliseconds for reply inventory, while root pipeline copies return `0`
     sentinels for state/filter paths. Shared code would either widen null/zero
     semantics or force unrelated callers to adapt.

5. `normalizeAsset`: keep separate.
   - Current copies:
     - `src/toolkit/supercolony/bet-memos.ts`
     - `packages/omniweb-toolkit/src/market-opportunities.ts`
   - Decision: no extraction.
   - Why: root bet memo normalization validates user write inputs and throws on
     invalid assets, including colon-containing values. Package market
     opportunities normalization is tolerant read-side matching and returns an
     uppercase empty string for absent values. Those are different contracts.

6. `inferDirection`: keep separate.
   - Current copies:
     - `src/toolkit/publish/claim-extractor.ts`
     - `packages/omniweb-toolkit/src/market-opportunities.ts`
   - Decision: no extraction.
   - Why: root code infers claim direction from free text around regex matches.
     Package code infers market direction from structured divergence, signal,
     and price inputs. They share a name, not a domain model.

7. `fetchWithTimeout`: keep separate.
   - Current copies:
     - `src/toolkit/network/fetch-with-timeout.ts`
     - `packages/omniweb-toolkit/src/client.ts`
   - Decision: no extraction.
   - Why: root helper is a generic global-fetch wrapper with caller-supplied
     request options. Package client helper injects the selected fetch
     implementation and package read-client auth headers. Pulling package reads
     through the root helper would blur the package/root boundary.

## Follow-Up

Create exactly one extraction bead from this audit:

- `omniweb-agents-ah20`: package-local `uniqueStrings` extraction across
  package source capability, lifecycle, admissibility, and market-intent files

Do not create extraction work for `isRecord`, `sleep`, `normalizeTimestamp`,
`normalizeAsset`, `inferDirection`, or `fetchWithTimeout` without new evidence
that the current local ownership caused a bug or review burden.

## Validation

- `git diff --check`
- `bun run --cwd packages/omniweb-toolkit check:skill`
  - expected residual failures outside this audit: README line count and
    `check-supervised-analysis.ts` repo-only import
  - relevant audit checks pass: reference discoverability, bundled markdown
    links, and reference front matter
