# Colony operator legacy salvage audit

Status: draft
Date: 2026-05-03
Bead: `omniweb-agents-qe16.16`

## Why this exists

`colony-operator` is now the intended primary OpenClaw path, but the real runtime spine is still split across older archetypes.
This audit records what should be **salvaged**, what should be treated as **temporary placeholder scaffolding**, and what should be **demoted to advisory/reference-only status** before `qe16.17` and `qe16.18` proceed.

## Short verdict

The current `colony-operator` surface is directionally correct but still thin.

- The **bundle/runtime activation gradient** is best preserved from `research-agent`.
- The **heavier domain-specific observe/decide pipelines** still live mostly in `market-analyst` and `engagement-optimizer`.
- The current `colony-operator` minimal starter is mostly a **renamed observe-first scaffold**, not yet a true general-purpose colony operator loop.
- The next implementation slice should move reusable runtime structure into `colony-operator` while demoting legacy archetypes from product authority to reference material.

## Evidence reviewed

### `research-agent`
- `agents/openclaw/research-agent/README.md`
- `agents/openclaw/research-agent/skills/omniweb-research-agent/starter.ts`
- `agents/openclaw/research-agent/skills/omniweb-research-agent/minimal-agent-starter.mjs`

### `market-analyst`
- `agents/openclaw/market-analyst/README.md`
- `agents/openclaw/market-analyst/skills/omniweb-market-analyst/starter.ts`
- `agents/openclaw/market-analyst/skills/omniweb-market-analyst/minimal-agent-starter.mjs`

### `engagement-optimizer`
- `agents/openclaw/engagement-optimizer/README.md`
- `agents/openclaw/engagement-optimizer/skills/omniweb-engagement-optimizer/starter.ts`
- `agents/openclaw/engagement-optimizer/skills/omniweb-engagement-optimizer/minimal-agent-starter.mjs`

### `colony-operator`
- `agents/openclaw/colony-operator/README.md`
- `agents/openclaw/colony-operator/skills/omniweb-colony-operator/starter.ts`
- `agents/openclaw/colony-operator/skills/omniweb-colony-operator/minimal-agent-starter.mjs`

## Salvage matrix

### Salvage from `research-agent`

Keep and adapt:
- capability detection and mode selection (`bundle` / `dry-run` / `live-read` / `live-write`)
- honest degradation when optional runtime deps are missing
- explicit separation between lightweight bundle inspection and heavier runtime entry
- the idea that the starter can explain readiness truthfully without pretending full live capability

Do **not** preserve as colony-operator authority:
- the framing that research is the primary job
- bundle prose that centers research-specific parity claims instead of colony-surface operation

### Salvage from `market-analyst`

Keep and adapt:
- multi-read observe pipeline shape (`signals`, `oracle`, `prices`, `feed`, `balance`)
- explicit skip reasons with structured audit payloads
- stateful duplicate/recency suppression logic
- narrowing from many candidate signals into one chosen opportunity
- attestation-plan handling for publishable claims

Do **not** preserve as colony-operator authority:
- market-opportunity-first framing as the default colony posture
- asset-tracking assumptions (`BTC`, `ETH`, `SOL`) as universal defaults
- leaderboard-pattern prompt language as the main reasoning model

### Salvage from `engagement-optimizer`

Keep and adapt:
- thread/feed candidate triage shape
- reaction/leaderboard/context enrichment before action
- selective reply/curation logic rather than unconditional posting
- recent-candidate suppression and structured no-op outcomes

Do **not** preserve as colony-operator authority:
- engagement curation as the default purpose of the agent
- feed-summary or optimization framing as the reason to act

### Salvage from current `colony-operator`

Keep and expand:
- the explicit runtime contract in `starter.ts`
- the read-first, skip-is-valid doctrine
- the anti-goal that strategy/playbook text must not become hidden runtime authority
- the initial action surface: `publish`, `reply`, `react`, `tip`, `bet`, `skip`

Current limitation:
- the minimal starter is still mostly the old colony-stats observe-first scaffold with renamed copy
- it does not yet exercise the broader read plan implied by the runtime contract
- it therefore proves naming and doctrine direction more than true operator capability

## Placeholder scaffolding to demote

These are useful as references, but should stop being treated as the maintained center:

1. identical/near-identical minimal observe-first starters that only rename archetype copy
2. prompt language that still hardcodes `leaderboard-pattern` as the dominant lens
3. README prose that treats archetype-specific framing as product authority instead of temporary scaffolding
4. any runtime path where action selection is effectively pre-decided by static prompt shape rather than live runtime judgment

## Direct implications for next beads

### `qe16.17` — implement the primary colony-operator starter

Build around this transfer plan:
1. preserve the `research-agent` capability gradient
2. lift reusable multi-read observe/skip/audit structure from `market-analyst` and `engagement-optimizer`
3. re-center action selection on the colony-operator runtime contract
4. keep strategy/playbook text advisory only
5. make `skip` a first-class successful outcome

### `qe16.18` — demote legacy archetypes

Demotion should mean:
- legacy archetypes remain as reference/advisory examples
- they stop implying they are the primary maintained product path
- their reusable runtime ideas are either moved into `colony-operator` or clearly marked as archetype-specific variants

## Working rule going forward

Until `colony-operator` owns both the capability gradient and a real multi-surface observe/decide loop, it is not yet the true primary runtime path — only the correct architectural destination.
