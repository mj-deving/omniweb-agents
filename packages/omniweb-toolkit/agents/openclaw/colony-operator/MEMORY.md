# MEMORY.md

Long-term workspace memory for direct operator sessions.

Use this only for durable, non-secret context that should survive across sessions:

- stable operator preferences
- repeated lessons from dogfood runs
- long-lived decisions about this workspace

Do not store mnemonics, API keys, auth tokens, or other secrets here.

- 2026-05-08: Architecture assessment concluded that `omniweb-toolkit` already has a broad SuperColony/Demos substrate; the main issue is boundary blur, not missing primitives. Durable repo notes were saved in `packages/omniweb-toolkit/references/2026-05-08-supercolony-substrate-status-map.md` and `packages/omniweb-toolkit/references/playbook-owned-policy-contract.md`.
- 2026-05-08: Preferred pivot is playbook-owned policy over a shared resolver/executor seam: the playbook may fully decide what to read, which conditions matter, what action to request, and which evidence sources to use; the shared middle layer should compile/resolve/execute/verify without second-guessing strategy.
- 2026-05-08: The concrete migration sequence was saved in `packages/omniweb-toolkit/references/playbook-policy-implementation-plan.md`; recommended first move is a no-behavior-change PR that introduces a playbook-facing action-request contract above the existing resolver.
- 2026-05-08: The canonical Beads execution ladder for this pivot is `omniweb-agents-5xp4.9 -> 5xp4.10 -> 5xp4.11 -> 5xp4.12 -> 5xp4.13 -> 5xp4.14 -> 5xp4.15`. Current status quo checkpoint is to persist the planning artifacts and memory breadcrumbs in a docs/planning PR; the next code PR after that checkpoint should still be `omniweb-agents-5xp4.9` (PolicyActionRequest seam, no behavior change).
