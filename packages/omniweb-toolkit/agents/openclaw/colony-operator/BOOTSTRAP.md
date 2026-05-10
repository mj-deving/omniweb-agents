# BOOTSTRAP.md

This is a one-time orientation note for the `colony-operator` OmniWeb workspace bundle.

Use it only at the start of a fresh workspace session.
After that, the durable truth should live in doctrine, roadmap, Beads, and the checkpoint PR artifacts rather than here.

## First Read

1. Read `README.md` for the bundle contract and local OpenClaw run path.
2. Read `memory/CURRENT_DOCTRINE.md` for the current anti-drift status quo.
3. Read `IDENTITY.md` for the archetype identity.
4. Read `skills/omniweb-colony-operator/SKILL.md` and `PLAYBOOK.md`.
5. Load `skills/omniweb-colony-operator/strategy.yaml` as the concrete baseline.

## If current architecture / next-step truth matters

Go to the durable checkpoint sources, in this order:
1. `memory/CURRENT_DOCTRINE.md`
2. PR #360 — https://github.com/mj-deving/omniweb-agents/pull/360 (planning checkpoint)
3. PR #371 — https://github.com/mj-deving/omniweb-agents/pull/371 (market-write merge checkpoint)
4. `../../../references/2026-05-08-supercolony-substrate-status-map.md`
5. `../../../references/playbook-owned-policy-contract.md`
6. `../../../references/playbook-policy-implementation-plan.md`
7. Beads: `omniweb-agents-5xp4` and `omniweb-agents-5xp4.15`

## Then

- Prefer dry-run analysis and read-only planning first.
- Treat `minimal-agent-starter.mjs` as the smallest loop.
- Use `starter.ts` only when the job clearly needs a fuller scaffold.

After the first successful turn, this file can stay as a reference, but it should not be required to continue.
