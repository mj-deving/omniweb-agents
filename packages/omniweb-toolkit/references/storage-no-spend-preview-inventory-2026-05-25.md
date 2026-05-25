---
summary: "No-spend StorageProgram preview inventory before adding an operator-facing preview command."
read_when: ["storage no-spend preview", "preview:storage", "StorageProgram dry run", "omniweb-agents-storage-no-spend"]
owner_bead: "omniweb-agents-storage-no-spend.1"
status: "inventory-only"
date: "2026-05-25"
---

# Storage No-Spend Preview Inventory - 2026-05-25

This artifact inventories the current StorageProgram dry-run path and source
boundary before adding a package script alias.

Scope exclusions:

- no storage create, set, delete, or broadcast
- no wallet mutation
- no npm publish or registry availability claim
- no launch, mainnet write, or live-readback upgrade claim
- no public API change

## Source Boundary

Official Demos docs are source context:

- `https://docs.kynesys.xyz/sdk/cookbook/storage-programs/overview`
- `https://docs.kynesys.xyz/sdk/storage-programs/overview`
- `packages/omniweb-toolkit/references/demos-official-docs-source-map-2026-05-25.md`
- `packages/omniweb-toolkit/references/storage-ipfs-escrow-docs-reconciliation-2026-05-25.md`

The official Storage Programs overview is preview-marked. It describes
deterministic `stor-` addresses, consensus-backed writes, RPC reads with no
transaction cost, 128KB payloads, 64 levels of nesting, and 256-character keys.

Local package behavior is the current execution truth:

- `packages/omniweb-toolkit/scripts/probe-storage.ts`

Do not promote official preview prose or older package history into a write
readiness claim. The package script is the behavior source for the no-spend
preview envelope and for the live `--broadcast` gate.

## Current Dry-Run Path

Current direct path from repo root:

```bash
bun --cwd packages/omniweb-toolkit run ./scripts/probe-storage.ts --program-name omniweb-storage-preview-test
```

Current script entrypoint:

```text
packages/omniweb-toolkit/scripts/probe-storage.ts
```

Default behavior is dry-run. `--broadcast` is the only flag that attempts the
live CREATE + SET_FIELD path.

## Current Dry-Run Output Fields

Source-inspected dry-run JSON fields:

- `attempted`
- `ok`
- `command`
- `address`
- `runtimeTarget`
- `programName`
- `storageAddress`
- `estimatedCreateFeeDem`
- `createPayload`
- `setPayload`
- `message`

Runtime target details come from `summarizeProbeRuntimeTarget()` and reflect the
selected `--env-path`, `--agent-name`, or `--state-dir` routing without exposing
secrets.

Expected no-spend invariants:

- `attempted: false`
- `ok: true`
- derived `storageAddress` present
- CREATE payload preview present
- SET_FIELD payload preview present
- estimated create fee present
- message states dry-run only and points to explicit `--broadcast`

## PR2 Target

Add one package script:

```json
"preview:storage": "node --import tsx ./scripts/probe-storage.ts"
```

Pass-through invocation:

```bash
bun --cwd packages/omniweb-toolkit run preview:storage -- --program-name omniweb-storage-preview-test
```

The alias must not include `--broadcast`. It should only wrap the existing
dry-run path so operator ergonomics improve without changing package behavior.
