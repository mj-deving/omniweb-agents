# Plan: Integrate bird CLI as Twitter/X Research Channel

## Context

bird CLI (`/usr/local/bin/bird`, wraps `npx @steipete/bird`) is authenticated (@mj9006186721) and provides search, trending topics, user tweets, threads, and replies from Twitter/X. Currently unused in any skill. Marius wants it integrated into both the Research skill (new dedicated mode + woven into existing modes) and the SuperColony v4 SCAN phase (cross-platform signal edge for isidore). Value should be proven through metrics.

## Codex Review: Findings Addressed

Codex (GPT-5.3) reviewed this plan. 3 high, 4 medium, 1 low findings. Resolutions:

| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| 1 | HIGH | "automatic YES on unique data" weakens confidence gate | **Fixed.** Twitter is a lead signal only — still requires independent novelty check against SuperColony feed before gate passes |
| 2 | HIGH | No explicit handling for rate limits/outages/partial JSON | **Fixed.** All workflows report bird status (`ok`/`empty`/`auth_failed`/`error`) in synthesis output |
| 3 | HIGH | Trigger routing collisions untested | **Fixed.** Triggers use distinctive prefix "twitter research" / "bird research" — won't collide with "do research" (Standard) or "check feed" (Monitor). Verification step added |
| 4 | MED | Hardcoded preamble is brittle | **Accepted.** Preamble is 1 line, already works. A wrapper script would be premature — add if it breaks |
| 5 | MED | "URL verification not needed" too broad | **Fixed.** Clarified: tweet URLs from bird API are trusted, but external links within tweets and factual claims still require verification |
| 6 | MED | Metrics can't establish causality with n=5 | **Accepted.** This is a lightweight pilot. n=10 minimum before any conclusion, noted as directional not causal |
| 7 | MED | No data retention/compliance policy | **Not applicable.** This is a personal project, not a production system. No external users |
| 8 | LOW | Command examples inconsistent | **Fixed.** Canonical command table added below |

---

## bird CLI: Canonical Commands

Every bird command requires Node 22. Prefix all commands with:
```bash
export FNM_PATH="/home/mj/.local/share/fnm" && export PATH="$FNM_PATH:$PATH" \
  && eval "$(fnm env --shell bash)" && fnm use 22 2>/dev/null && bird <command>
```

| Command | Use | Flags |
|---------|-----|-------|
| `bird search "query" -n 15 --json --plain` | Topic search | `-n` count, `--json` structured, `--plain` no emoji |
| `bird news --json --plain` | AI-curated trending topics | No `-n` needed |
| `bird user-tweets <handle> -n 10 --json --plain` | User's recent posts | Requires handle |
| `bird thread <url> --json --plain` | Full conversation thread | Requires tweet URL |
| `bird read <url> --json --plain` | Single tweet | Requires tweet URL/ID |
| `bird replies <url> -n 20 --json --plain` | Replies to a tweet | Requires tweet URL |
| `bird check` | Verify auth credentials | Use when other commands fail |

**Failure handling pattern** (all workflows): Append `2>/dev/null || echo '{"bird_status":"error"}'` to commands. Synthesis must report bird status.

---

## Changes

### 1. NEW: `~/.claude/skills/Research/Workflows/TwitterResearch.md`

Dedicated Twitter research workflow. Follows StandardResearch.md pattern exactly.

- **Triggers:** "twitter research", "bird research", "what's twitter saying about"
- **Flow:** Determine search strategy → craft 2-4 queries → execute bird commands in parallel via Bash → synthesize twitter signal → return results
- **Speed target:** ~30-60s
- **Failure handling:** Report bird status in output. If auth fails, run `bird check` and inform user. If empty results, suggest Standard Research for broader coverage
- **URL verification:** Tweet URLs from bird API output are trusted (API-sourced, not hallucinated). External links embedded in tweets and factual claims within tweet text still require verification before citing

### 2. MODIFY: `~/.claude/skills/Research/SKILL.md`

**a) Trigger table (after line 15)** — add row:
```
| "twitter research" / "bird research" / "what's twitter saying" | → Twitter mode (bird CLI) |
```

**b) Workflow Routing → Research Modes section (after line 69)** — add entry:
```
- Twitter / social media research (bird CLI, real-time) -> `Workflows/TwitterResearch.md`
```

### 3. MODIFY: `~/.claude/skills/Research/QuickReference.md`

**Table (after line 9)** — add row:
```
| "twitter research", "bird research" | Twitter | 2-4 bird queries (parallel) | ~30-60s |
```

### 4. MODIFY: `~/.claude/skills/Research/Workflows/StandardResearch.md`

**After Step 2 (line 45), before Step 3** — add optional Step 2b:

> **Step 2b: Optional Twitter Enrichment (parallel with Step 2)**
>
> If the topic likely has active Twitter discourse (crypto, AI, tech, politics, current events), launch one bird search alongside the Claude + Gemini agents. Non-blocking — if bird fails or returns nothing, proceed without it. Report bird status (`ok`/`empty`/`error`) in synthesis. If results return, add a "Twitter Signal" subsection noting sentiment direction and notable claims. External links within tweets still require URL verification.

### 5. MODIFY: `~/.claude/skills/Research/Workflows/ExtensiveResearch.md`

**After Step 1 (line 55), before Step 2** — add optional Step 1b:

> **Step 1b: Twitter Signal Layer (parallel with Step 1)**
>
> Launch 2 bird queries in parallel with the 9 research agents:
> 1. `bird search "[topic]" -n 15 --json --plain` — direct topic search
> 2. `bird news --json --plain` — trending topics for overlap detection
>
> Non-blocking. Report bird status in synthesis. If results return, add "Social Signal (Twitter)" section to Step 3 synthesis with sentiment, key voices, engagement data, and delta vs research agents.

**Step 5 metrics** — update agent count line to `9 (3 types x 3 each) + optional Twitter signal`.

### 6. MODIFY: `~/projects/DEMOS-Work/Isidore-Strategy-v4.md`

**Phase 1: SCAN section (after line 136, after existing 3 commands)** — add commands 4-5:

```bash
# 4. (OPTIONAL) Twitter cross-platform signal scan
# If bird fails, continue with on-chain data only
[bird search "crypto DeFi AI" -n 15 --json --plain, with || true fallback]

# 5. (OPTIONAL) Twitter trending — gaps SuperColony hasn't covered
[bird news --json --plain, with || true fallback]
```

**After Room Temperature Assessment table (line 146)** — add 5th question:

```
| **TWITTER DELTA:** Trends on Twitter that SuperColony agents missed? | Compare Twitter trending with SuperColony feed topics | DELTA FOUND → use as lead signal for topic selection, then verify uniqueness independently |
```

**Guidance note:** Twitter identifies WHAT to look at; the actual data source provides attestable evidence. Twitter signal is a lead, not an automatic gate pass.

### 7. MODIFY: `~/.claude/skills/DEMOS/SuperColony/Workflows/Monitor.md`

**After "Synthesize Results" section (line 71)** — add:

> **Twitter Cross-Reference (Optional — v4 SCAN enrichment)**
>
> When running as part of v4 SCAN, optionally scan Twitter for cross-platform signals. Non-blocking — if bird fails, SCAN continues with on-chain data only. Report bird status in synthesis output.
>
> If data returns, add: **Twitter delta** — topics trending on Twitter but absent from SuperColony = potential unique signal opportunities (verify independently before acting).

### 8. MODIFY: `~/.claude/skills/DEMOS/SuperColony/OperationalPlaybook.md`

**After Log Rotation section (line 429)** — add subsection:

> **Cross-Platform Signal Integration (Twitter via bird CLI)**
>
> Optional v4 SCAN enrichment. bird failure never blocks the loop.
>
> - Purpose: detect Twitter trends SuperColony agents haven't covered → lead signal for topic selection
> - Canonical commands: reference table above
> - Integration with Confidence Gate: Twitter signal is a LEAD only — still requires independent check that the data is genuinely unique vs SuperColony feed before Gate #2 passes
> - Failure handling: report status (`ok`/`empty`/`auth_failed`/`error`), `bird check` for auth recovery
> - Metrics: tag `twitter-sourced` when a post topic was discovered via bird. After n≥10, compare engagement rates (directional, not causal)

### 9. MODIFY: `~/.claude/skills/DEMOS/SuperColony/SKILL.md`

**Monitor trigger row** — add "scan twitter" to trigger list.

---

## Files Summary

| Action | File | What |
|--------|------|------|
| CREATE | `~/.claude/skills/Research/Workflows/TwitterResearch.md` | Dedicated Twitter research workflow |
| EDIT | `~/.claude/skills/Research/SKILL.md` | Add trigger + routing entry |
| EDIT | `~/.claude/skills/Research/QuickReference.md` | Add Twitter mode to table |
| EDIT | `~/.claude/skills/Research/Workflows/StandardResearch.md` | Add optional bird step 2b |
| EDIT | `~/.claude/skills/Research/Workflows/ExtensiveResearch.md` | Add optional bird step 1b |
| EDIT | `~/projects/DEMOS-Work/Isidore-Strategy-v4.md` | Add bird to SCAN phase + Twitter Delta question |
| EDIT | `~/.claude/skills/DEMOS/SuperColony/Workflows/Monitor.md` | Add Twitter cross-reference section |
| EDIT | `~/.claude/skills/DEMOS/SuperColony/OperationalPlaybook.md` | Add cross-platform signal subsection |
| EDIT | `~/.claude/skills/DEMOS/SuperColony/SKILL.md` | Add "scan twitter" trigger |

## Verification

1. `bird whoami` — confirm auth works
2. `bird search "bitcoin" -n 5 --json --plain` — confirm search returns data
3. `bird news --json --plain` — confirm trending returns data
4. `bird check` — confirm credentials valid
5. Trigger "twitter research on crypto markets" — should route to TwitterResearch.md (not Standard)
6. Trigger "do research on AI agents" — should route to Standard (not Twitter)
7. Run a v4 SCAN phase — bird commands should run after feed/signals/leaderboard, with status reported
8. After n≥10 `twitter-sourced` tagged posts: compare engagement rates vs SuperColony-only posts
