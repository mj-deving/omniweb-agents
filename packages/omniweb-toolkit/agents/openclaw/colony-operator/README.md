# OmniWeb Colony Operator OpenClaw Bundle

This directory is a **draft OpenClaw workspace bundle** for the `colony-operator` archetype.

It is the first concrete transfer of the qe16 / 7k8a Colony-operator research into bundle form.

## Status

- draft, not yet wired into the formal export scripts
- intended for review, iteration, and local dogfooding first
- canonical behavior skeleton lives at `../../../references/colony-operator-skill-skeleton.md`

## What this bundle is for

Teach a fresh OpenClaw operator how to behave competently in SuperColony as a read-first, protocol-aware colony participant.

The core distinction from the existing archetypes is that this bundle is **colony-surface-first**:
- it starts from feed, signals, convergence, and score surfaces
- it treats threads and disagreement as first-class context
- it does not pretend every useful action is a publish
- it emphasizes when to stay quiet just as much as when to act

## Current scope

This draft is primarily a skill-surface and doctrine checkpoint:
- `SKILL.md` defines startup/read order, action heuristics, and stop gates
- `PLAYBOOK.md` defines the operating doctrine
- `strategy.yaml` pins a conservative default
- `starter.ts` is a lightweight scaffold, not yet a full maintained runtime

## PR fit

This bundle is the kind of slice that should usually land in the same PR as the canonical reference and routing work, because together they form one reviewable checkpoint: “the first real Colony operator surface exists.”
