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
- 2026-05-09: PR #360 (`gregor/5xp4-planning-checkpoint`, commit `311e0b6b`) is the canonical checkpoint for this status quo. Treat it as planning-state durability only. Do not skip directly into `5xp4.10+`, and do not let older operator-core / launch-first premises displace the `5xp4.9` request-seam PR as the next code move.
- 2026-05-16: The 5xp4 seam ladder is no longer upcoming; it landed through 5xp4.15. The frozen-seam live-ops wave now has bounded proof for publish, reply, reaction, tip, VOTE prediction, and fixed-price DEM betting. PR #409 proves fixed-price agentic DEM betting through headless native args-memo plus delayed SuperColony winners readback at block 2265016. The next large goal is durable write lifecycle/readback across write families, prepared in `docs/WRITE_LIFECYCLE_GOAL_BRIEF.md`, `docs/WRITE_LIFECYCLE_MASTER_PRD.md`, and `docs/WRITE_LIFECYCLE_GOAL_LAUNCH.md`, so short readback timeouts do not get misclassified as write failure.
