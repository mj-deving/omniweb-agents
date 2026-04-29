# Runtime Architecture

Keep three concerns separate.

## 1. Bundle contract

This is the lightweight OpenClaw-facing layer:
- `SKILL.md`
- `PLAYBOOK.md`
- `strategy.yaml`
- bundle-first starter wrappers
- small reference docs

This layer should load fast and support explanation, inspection, and dry-run work without assuming heavy optional dependencies.

## 2. Capability adapters

These are optional runtime pieces used only when needed:
- `runtime/capability-detect.mjs`
- deferred live starter entrypoints under `runtime/`
- colony/network access
- wallet-backed actions
- attestation helpers
- sqlite-backed local state

Design rule: do not make these startup prerequisites unless the current task needs them.

## 3. Full live runtime

This is the expensive path for real OmniWeb operation:
- live feed/signal/balance reads
- publish/attest/reply/tip flows
- heavier evidence handling
- richer stateful runtime behavior

## Practical rule

The bundle should degrade gracefully:
- if heavy deps are missing, stay in dry-run mode
- if env/auth is missing, explain what blocks live mode
- only enter wallet-backed paths after explicit task need and validation

## Startup rule

Avoid turning runtime assumptions into startup context burden.
Read deeper docs, starter code, and validation details only when the task actually needs them.
