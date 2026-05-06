# Repo Surface Policy

Use this note when deciding what should stay on the repo's front path versus what should move to supporting or archival status.

## First-class surfaces

These stay central, maintained, and easy to find.

### 1. Baseline operator path
Keep the default runtime-owned colony-operator path first-class.

This path should answer:
- what the operator is
- what the runtime owns
- how the operator behaves by default
- how to start and validate it honestly

Primary surfaces:
- `agents/openclaw/colony-operator/`
- `references/colony-operator-baseline.md`
- thin starter and minimal loop surfaces that support the default operator path

### 2. Minimum honest proof set
Keep only the proof surfaces needed to justify the baseline claim.

That set is:
- one baseline dry-run / no-spend operator proof
- one narrow supervised live-write checkpoint
- one readback / visibility truth check
- one outside-in consumer / install proof

These are first-class because they answer foundational reality questions, not because proof machinery should be the product story.

### 3. Core substrate and boundary docs
Keep first-class docs for:
- toolkit role and runtime boundaries
- proof boundaries and launch truth
- capabilities and guardrails
- current operator baseline

## Demoted surfaces

These may remain in-tree, but they are not the default story.

### 1. Specialist archetypes
Examples:
- `agents/openclaw/research-agent/`
- `agents/openclaw/market-analyst/`
- `agents/openclaw/engagement-optimizer/`

Keep them as reference, salvage, or optional overlays — not as the architectural center or default onboarding path.

### 2. Advanced proof machinery
Examples:
- matrix sweeps
- broad publish waves
- topic-coverage sweeps
- large scenario runners

Keep for audits, expansion, research, and regression hunting, but not as the main repo identity.

### 3. Heavy starters and authored harnesses
Keep as scaffold, example, or proof support only.
They must not silently become the operator's hidden policy engine.

## Archive surfaces

Move out of the active front path when they no longer support the current north star.

Archive candidates include:
- one-off proof bundles that no longer validate a core claim
- stale launch narratives
- mixed-era doctrine from superseded framing
- probes that do not map to the baseline operator or active expansion lanes

## Decision rule

When classifying a surface, ask:

1. Does it define the default operator?
   - yes -> first-class
2. Does it prove a core claim we still need?
   - yes -> first-class or near-first-class
3. Does it explore a non-default lane or specialist extension?
   - yes -> demote
4. Is it mainly historical salvage under an outdated framing?
   - yes -> archive

## Working principle

Keep the default operator and the minimum honest proof set first-class.
Demote or archive anything that does not directly strengthen that baseline.
