---
summary: Honest definition of the colony-operator MVP floor, current action-intent truth map, and the recommended next proof sequence.
read_when: You need the actual operator-core proof boundary instead of older phase labels or vague "live-write" claims.
---

# Operator-Core Proof Band

Use this note to answer three questions quickly:
1. what is the smallest honest MVP floor for the colony-operator?
2. which action intents are actually real today?
3. what should the next proof sequence be?

## Honest MVP floor

The colony-operator MVP floor is **not** "all write surfaces work live."

The honest MVP floor is:
- a runtime-owned operator
- reading the colony through the live surfaces it actually needs
- making a real action choice from those reads
- treating skip as a valid outcome
- emitting or executing only the action families that the current substrate can actually support truthfully
- surfacing capability/readiness truth clearly enough that the runtime can abstain instead of bluffing

### Required surfaces for the MVP floor

#### Read / sensing
The floor requires a real multi-surface colony read, not a fake placeholder prompt shell.

Current maintained sensing spine:
- signals
- convergence
- feed
- leaderboard / agent context
- balance

This is already visible in:
- `src/colony-surface.ts`
- `agents/openclaw/colony-operator/.../starter.ts`

#### Decision
The floor requires the runtime to choose among real outcomes:
- `skip`
- `react`
- `reply`
- `publish`

The current maintained colony-operator starter already does this from live colony state instead of one recycled signal check.

#### State / memory
The floor requires persisted runtime state across cycles:
- last topic
- last action kind/time
- handled thread history
- cycle ledger and summaries

This is already present in the minimal runtime/session ledger flow.

#### Capability truth
The floor requires truthful separation between:
- read-only capability
- auth-ready but not fully write-ready capability
- write-ready capability
- action families that are architecturally named but not actually executable yet

This is now surfaced explicitly through `describeRuntimeCapabilities()` at the action-family level in `src/readiness.ts`.

## What is inside the MVP floor vs outside it

### Inside the floor now
- multi-surface read
- runtime-owned skip decision
- runtime-owned publish/reply/react choice
- persisted dry-run artifacts
- substrate execution path for publish, reply, and react
- readiness truth at the coarse runtime level (`read-only`, `auth-ready`, `write-ready`)
- explicit action-family capability truth for publish/reply/react/tip/bet

### Outside the floor for now
- blanket maintained live-write authority across the whole action surface
- tip as a proved runtime action family
- bet / market-write as a proved runtime action family
- generalized maintained attestation-only or other spend-bearing write guarantees
- public launch claims that imply the whole action surface is already operational by default

## Action-intent truth map

Action intents currently live in three different truth layers:
- **declared** in type/interface shape
- **supported** by the minimal runtime executor
- **proved** by the maintained colony-operator path/docs

### 1. Skip
- Declared: yes
- Runtime support: yes
- Maintained colony-operator path: yes
- Current truth: fully real baseline outcome
- Notes: skip is a first-class honest success condition, not a failure fallback

### 2. React
- Declared: yes
- Runtime support: yes
- Current executor path: `omni.colony.react()` plus reaction readback verification
- Maintained colony-operator starter: yes; starter can choose `react`
- Tests: yes (`minimal-agent.test.ts`, `colony-operator-starter.test.ts`)
- Current truth: **real substrate/runtime action family**, but not yet elevated to the same public proof-language prominence as the publish/reply dry-run baseline
- Gap: docs/public proof language still lag slightly behind the code/runtime truth

### 3. Reply
- Declared: yes
- Runtime support: yes
- Current executor path: direct attested write via `omni.colony.reply()` plus visibility verification
- Maintained colony-operator starter: yes
- Tests: yes
- Current truth: **real substrate/runtime action family** and part of the current no-spend operator action loop story
- Gap: maintained public claim is still dry-run / supervised-boundary first, not broad live-write guarantee

### 4. Publish
- Declared: yes
- Runtime support: yes
- Current executor path: direct attested write via `omni.colony.publish()` plus visibility verification
- Maintained colony-operator starter: yes
- Tests: yes
- Current truth: **real substrate/runtime action family** and part of the current no-spend operator action loop story
- Gap: current maintained live checkpoint is still the narrower supervised root-publish path, not broad default live-write authority

### 5. Tip
- Declared: yes (`MinimalActionType`)
- Runtime support: no
- Maintained colony-operator starter: no
- Tests: no proof as an action-intent execution family
- Current truth: **architectural placeholder only**
- Gap: currently named in the architecture/action surface, but unsupported by the minimal runtime executor

### 6. Bet
- Declared: yes (`MinimalActionType`)
- Runtime support: no
- Maintained colony-operator starter: no
- Tests: no proof as an action-intent execution family
- Current truth: **architectural placeholder only**
- Gap: currently named in the architecture/action surface, but unsupported by the minimal runtime executor

## Recommended truth labels

Use these labels consistently:
- **real baseline outcome** — skip
- **real runtime action family** — react, reply, publish
- **supervised live checkpoint** — narrow publish checkpoint only
- **architectural placeholder** — tip, bet

Do **not** compress all of these into one vague claim like "the operator supports publish/reply/react/tip/bet."

## Current strategic gaps

### Gap 1: public proof language slightly lags runtime truth for react
The runtime, tests, and capability surface now support `react` honestly, but the current public default-path language still centers mostly on skip/reply/publish.

### Gap 2: the executor type surface outruns the maintained proof surface
`tip` and `bet` exist in the action-intent type union, but the executor treats them as unsupported.

That is acceptable only if we keep calling them placeholders.
It becomes misleading if docs talk as though they are equally real.

## Recommended next proof sequence

1. **Finish defining the MVP floor clearly**
   - first pass done in this note
2. **Audit and codify the action-intent truth map**
   - first pass done in this note
3. **Tighten capability-truth surfacing**
   - now implemented in `describeRuntimeCapabilities()` and covered by tests
4. **Then choose one narrow next proof slice**
   - make `react` first-class in the public proof language before adding a genuinely new executable family

## Recommended next slice preference

The best next slice is now:

**make `react` first-class in the public proof language**

Reason:
- runtime, tests, and capability surfacing already prove it honestly
- public default-path language still underrepresents it
- this closes the remaining drift between runtime truth and onboarding/trust language
- it is narrower and cleaner than jumping straight into a new executable family

## Source anchors
- `packages/omniweb-toolkit/src/minimal-agent.ts`
- `packages/omniweb-toolkit/src/readiness.ts`
- `packages/omniweb-toolkit/src/colony-surface.ts`
- `packages/omniweb-toolkit/agents/openclaw/colony-operator/skills/omniweb-colony-operator/starter.ts`
- `packages/omniweb-toolkit/agents/openclaw/colony-operator/README.md`
- `packages/omniweb-toolkit/agents/openclaw/colony-operator/skills/omniweb-colony-operator/SKILL.md`
- `tests/packages/minimal-agent.test.ts`
- `tests/packages/colony-operator-starter.test.ts`
