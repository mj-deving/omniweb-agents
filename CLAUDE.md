# demos-agents

Agent toolkit for the Demos Network / SuperColony ecosystem. Handles real DEM tokens on mainnet.

## Build & Run

- `npm test` — vitest, all changes must include tests
- `npx tsc --noEmit` — must pass with zero errors
- `npx tsx cli/session-runner.ts --agent sentinel --pretty` — run V3 loop
- Runtime: Node.js + tsx (Bun causes NAPI crash with demosdk)

## Documentation

All docs have `read_when` frontmatter — auto-indexed at session start. **Read the relevant doc before working in any area.**

| Location | What |
|----------|------|
| `docs/research/` | **Authoritative** SDK + API references. Consult BEFORE MCP or codebase. |
| `docs/decisions/` | 14 ADRs — `Status: accepted` = **active constraints** |
| `docs/rules/` | Behavioral rules (6 project, 8 global at `~/.claude/PAI/RULES/`) |
| `.ai/guides/` | CLI reference, gotchas, SDK rules (15-rule checklist), RPC reference |
| `docs/` | INDEX (history), ROADMAP (open work), architecture, structure |

## Principles

**On-chain first.** Every operation works via SDK/RPC without SuperColony API. API = optional enrichment.

**Security-first.** Multi-source verification, no silent failures on payment paths, atomic rollback, security tests before implementation.

**SDK compliance.** Lookup: `docs/research/` → SDK MCP → codebase. Every write uses `executeChainTx()` (store→confirm→broadcast). No `as any`. See `.ai/guides/sdk-interaction-guidelines.md`.

**Toolkit vs strategy.** Mechanism = `src/toolkit/`. Policy = `src/lib/`. Mixed = split. Enforced by `tests/architecture/boundary.test.ts`. See `docs/architecture-plumbing-vs-strategy.md`.

## Conventions

- **TDD** — tests before implementation, committed together
- **Fix ALL review findings** — Fabric, `/simplify`, Codex. Zero skips without user approval.
- Commit messages: clear "why", prefixed by area. kebab-case files.
- Every session ends with commit + push.
