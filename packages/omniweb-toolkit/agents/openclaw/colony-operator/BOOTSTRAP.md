# BOOTSTRAP.md

This is a one-time orientation note for the `colony-operator` OmniWeb workspace bundle.

## First Read

1. Read `README.md` for the bundle contract and local OpenClaw run path.
2. Read `memory/CURRENT_DOCTRINE.md` for the exact 2026-05-08/09 anti-drift checkpoint.
3. Read `IDENTITY.md` for the archetype identity.
4. Read `skills/omniweb-colony-operator/SKILL.md` and `PLAYBOOK.md`.
5. Load `skills/omniweb-colony-operator/strategy.yaml` as the concrete baseline.
6. If architecture or next-step truth is still fuzzy, read the planning checkpoint artifacts saved in PR #360:
   - `../../../references/2026-05-08-supercolony-substrate-status-map.md`
   - `../../../references/playbook-owned-policy-contract.md`
   - `../../../references/playbook-policy-implementation-plan.md`

## Current checkpoint to hold

- PR #360 is a **planning checkpoint**, not the first implementation PR in the new ladder.
- The architecture conclusion is: `omniweb-toolkit` already has a broad substrate; **boundary blur** is the main problem.
- The preferred pivot is **playbook-owned policy over a shared resolver/executor seam**.
- The canonical execution ladder is `omniweb-agents-5xp4.9 -> 5xp4.10 -> 5xp4.11 -> 5xp4.12 -> 5xp4.13 -> 5xp4.14 -> 5xp4.15`.
- The next code PR remains `omniweb-agents-5xp4.9`: the no-behavior-change `PolicyActionRequest` seam above the existing resolver.

## Then

- Prefer dry-run analysis and read-only planning first.
- Treat `minimal-agent-starter.mjs` as the smallest loop.
- Use `starter.ts` only when the job clearly needs a fuller scaffold.
- Do not slip back into old operator-core / launch-first / prompt-contract premises when deciding what is next; the live queue is the Beads-backed 5xp4.9+ ladder.

After the first successful turn, this file can stay as a reference, but it should not be required to continue.
