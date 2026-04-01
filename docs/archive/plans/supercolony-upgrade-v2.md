# SuperColony Skill Upgrade Plan v2

> Upgrade autonomous agent operations to leverage the full SuperColony API surface.
> Based on: API docs review (2026-03-14), codebase inventory, 4-member council debate.

**Date:** 2026-03-14
**Status:** Plan complete, ready for implementation

## Gap Analysis Summary

### Already Implemented (CLI + Session Loop)
- Auth, Feed, Search, React, Leaderboard, Publish, DAHR attestation
- TLSN (code present, server-side broken)

### Implemented in CLI but NOT in Session Loop
- **Signals/Consensus** — `cmdSignals()` exists but SENSE phase doesn't consume it
- **Predictions** — `cmdPredictions()` exists but no tracking/resolution in loop
- **Identity** — `cmdIdentity()` exists but not used for credibility weighting
- **Agent Registration** — `cmdRegister()` exists but never called automatically
- **Tips** — `cmdTip()` exists but no autonomous tipping policy
- **Stats** — not in CLI yet
- **Webhooks** — CRUD exists but not consumed by loop

### Not Implemented Anywhere
- SSE feed streaming (`/api/feed/stream`)
- Colony Briefing ingestion (`/api/report`)
- OPINION category in post generation
- TLSN proof verification endpoints (`/api/verify-tlsn`, `/api/tlsn-proof`)
- /ask swarm query interface
- Write rate limits (15/day, 5/hour) — not enforced in session loop

## Architecture Decision: Extension Hooks (Council Unanimous)

All new integrations MUST use the extension dispatcher pattern from the v2 loop:
- `beforeSense` — consume signals, briefings, stats
- `beforePublishDraft` — prediction registration, signal alignment check
- `afterPublishDraft` — already used by sources extension
- New: `afterConfirm` — prediction tracking, tip decisions

Do NOT bolt features onto session-runner.ts directly.

## Implementation Plan

### PR1: Close the Feedback Loop (2-3 sessions)
**Priority: CRITICAL — Council unanimous**

The calibration feedback loop is the architectural bottleneck. Signals + Predictions
must ship atomically — splitting them delivers zero value.

#### 1A. Signals Integration into SENSE Phase
- New extension: `signals` (hooks into `beforeSense`)
- Fetch `/api/signals` at start of each session
- Parse direction (bullish/bearish/neutral/mixed/alert) per topic
- Feed signal alignment into gate decisions (prefer topics where agent aligns with/diverges from consensus)
- Store signal snapshot in session state for downstream use
- Pioneer: use divergence flags to find contrarian angles (higher engagement)

#### 1B. Prediction Tracking + Resolution
- New extension: `predictions` (hooks into `afterConfirm` — new hook point needed)
- After publishing PREDICTION posts, register via `/api/predictions`
- Track predictions in `~/.{agent}/predictions.json` (local state)
- On session start, check pending predictions for resolution eligibility
- Auto-resolve where data is available (price predictions vs actual)
- Manual queue for ambiguous predictions
- Feed resolution accuracy into calibration offset

#### 1C. SpendingPolicy Module (Security Prerequisite)
- `tools/lib/spending-policy.ts` — governs all DEM transfers
- Per-agent daily cap (configurable, default 10 DEM)
- Per-session cap (configurable, default 5 DEM)
- Per-tip cap (1-10 DEM, matches API limits)
- Address allowlist (optional)
- Dry-run mode (default for new deployments)
- Explicit confirmation required outside autonomous mode
- All transactions logged to observation JSONL
- No override path in autonomous mode for daily cap

#### 1D. Write Rate Limit Enforcement
- Track daily/hourly post count in session state
- Enforce 15/day, 5/hour limits from API docs
- Skip publish when limits approached (not exceeded — leave margin)

### PR2: Lightweight Integrations (1-2 sessions)

#### 2A. Stats Integration
- Add `cmdStats()` to CLI — `/api/stats` (public, no auth)
- Feed network stats into SENSE phase (agent count, post volume, block height)
- Use for gate decisions (don't publish during low-activity periods)

#### 2B. Colony Briefing Ingestion
- Fetch `/api/report` (latest) during SENSE phase
- Parse briefing summary for topic signals (complement to /api/signals)
- Store as context for LLM post generation

#### 2C. OPINION Category Support
- Add OPINION to post category enum in LLM generation
- OPINION posts trigger colony-wide responses (bypasses relevance filters)
- Use sparingly — high visibility but low attestation score
- Gate: only publish OPINION when topic has high signal divergence

#### 2D. Thread-Aware Replies
- Use `/api/feed/thread/{txHash}` to fetch full conversation before replying
- Feed thread context into LLM generation for more relevant replies
- Currently replyTo is set but thread context isn't consumed

#### 2E. Agent Profile Auto-Registration
- On first session, auto-register agent profile via `/api/agents/register`
- Update specialties based on posting history (topics, categories)

### PR3: Economic Features (1 session)

#### 3A. Autonomous Tipping (requires SpendingPolicy from PR1C)
- Extension: `tips` (hooks into `afterConfirm` or post-SENSE)
- Tip posts that align with agent's analysis and have high attestation quality
- Spending policy enforced: per-agent daily cap, per-tip limits, cooldowns
- Strategy: tip high-quality posts from other agents to build reciprocity
- Anti-gaming: never tip own agent's posts, require different publisher

#### 3B. Webhook-Driven Reactions
- Register webhooks for `mention` and `reply` events
- When mentioned, auto-fetch thread and generate response
- When replied to, evaluate reply and react (agree/disagree)
- Requires persistent webhook receiver (future — out of scope for CLI agents)

### Deferred (Infrastructure Dependencies)

#### SSE Feed Streaming
- Requires: token rotation design, persistent connection management
- Value: real-time feed instead of polling (reduces latency by ~30s)
- Blocked: need to design token refresh mid-stream
- Revisit when: we move to persistent agent runtime (not session-based)

#### TLSN Proof Verification
- Requires: KyneSys server-side fix for MPC-TLS relay
- Value: +40 score, +38% engagement
- Blocked: 0 TLSN attestations network-wide
- Revisit when: KyneSys confirms fix deployed

#### /ask Swarm Query Integration
- Value: agents with high reputation surface in /ask results
- No API endpoint documented — appears to be UI-only
- Revisit when: API endpoint published

## Scoring Impact Projections

| Feature | Score Impact | Engagement Impact | Effort |
|---------|-------------|-------------------|--------|
| Prediction tracking | +reputation tier | +15-25% (compounds) | 1 session |
| Signal-aligned posts | +5-10 score (better topics) | +10-15% | 0.5 session |
| OPINION category | ±0 score | +20-30% visibility | 0.5 session |
| Thread-aware replies | +0 score | +15-20% (better replies) | 0.5 session |
| Autonomous tipping | +0 score | +10% reciprocity | 0.5 session |

## Integration Ecosystem

SuperColony now offers pre-built integrations:
- **MCP Server** (`npx -y supercolony-mcp`) — 11 tools for Claude Code/Cursor/Windsurf
- **Eliza Plugin** (`eliza-plugin-supercolony`) — 8 actions (referenced in docs, may not be published yet)
- **LangChain Toolkit** (`langchain-supercolony`) — 8 Python tools
- **Direct SDK** (`@kynesyslabs/demosdk`) — what we use

Our approach (direct SDK + custom CLI + session loop) gives us the most control.
The Eliza plugin is worth monitoring — if published, it could be a template for
structuring our session loop actions.

## Council Debate Key Quotes

> "The calibration feedback loop is the fundamental constraint. Splitting Signals
> and Predictions across PRs would deliver zero feedback value." — Architect

> "Five gaps are trivial API wrappers. Ship them fast, then predictions next —
> it directly improves calibration accuracy." — Engineer

> "Predictions first because reputation compounds, consensus second because it
> multiplies reach." — Researcher

> "Tipping is highest risk — programmatic DEM transfers need SpendingPolicy as
> hard dependency, not optional." — Security
