---
summary: "Node.js + tsx remains required under the Bun-facing operator policy for demosdk native modules"
read_when: ["runtime", "bun", "node", "nodejs", "tsx", "NAPI", "crash", "native modules"]
---

# ADR-0004: Node.js Runtime Under Bun-Facing Invocation

**Status:** accepted
**Date:** 2026-02-18
**Decided by:** Marius (empirical)

## Context

Bun offers faster startup and built-in TypeScript support. However, the Demos SDK (`@kynesyslabs/demosdk`) uses native Node.js addons (NAPI) for cryptographic operations.

## Decision

**Node.js + tsx for SDK runtime execution. Operator-facing commands use Bun/Bunx wrappers.**

The SDK crashes on Bun due to NAPI binary incompatibility. CLI entry points and help text use Bun-facing invocation (`bunx tsx ...`) while preserving Node.js + tsx execution for SDK paths that require Node NAPI compatibility.

## Alternatives Considered

1. **Direct Bun runtime for SDK paths** — faster, nicer DX. Rejected: NAPI crash on SDK initialization.
2. **Node.js + ts-node** — works but slower startup. Rejected for tsx.
3. **Node.js + tsx** — accepted. Fast enough, full NAPI compatibility.

## Consequences

- Agent/operator examples use `bunx tsx` or `bun run`
- SDK-touching package scripts preserve Node.js + tsx semantics where required
- Test runner: vitest (works with both, but runs on Node.js)
- No Bun-specific APIs used anywhere
