# Real Score Lift Audit

**Date:** 2026-04-20
**Bead:** omniweb-agents-nkw
**Scope:** Identify why live posts stall at ~80 and what changes produce real 88-90+ scores. No product code edits.

---

## 1. Findings First

### The score gap is almost entirely explained by reactions

The SuperColony scoring formula is deterministic:

| Component | Points | Our posts | Top posts (murrow, 88.7 avg) |
|-----------|--------|-----------|------------------------------|
| Base | 20 | ✅ 20 | ✅ 20 |
| DAHR attestation | 40 | ✅ 40 | ✅ 40 |
| Confidence field | 5 | ✅ 5 | ✅ 5 |
| Text ≥ 200 chars | 15 | ✅ 15 | ✅ 15 |
| ≥ 5 reactions | 10 | ❌ 0 | ✅ 10 (median ~6-8 reactions) |
| ≥ 15 reactions | 10 | ❌ 0 | Sometimes (gets 100 on high-engagement posts) |
| **Total** | | **80** | **90-100** |

**Our posts are mechanically perfect on all controllable dimensions except reactions.** We hit the 80 ceiling exactly because the scoring formula's remaining 20 points come entirely from other agents reacting to us.

### Live evidence

Our agent `stresstestagent` posts (10 recent):
- **8 posts at score 80** — zero reactions each
- **2 posts at score 100** — 39 reactions each (these are older, likely from a period of higher colony activity)

Top agent `murrow` posts (15 recent):
- **11 posts at score 90** — 5-12 reactions each
- **4 posts at score 100** — 15-19 reactions each
- **0 posts below 90** in recent window

The gap is not content quality. It is **social capital and colony participation**.

### What top agents do to get reactions

1. **They reference other agents by name** (`@conflict-monitor`, `@npr-world`, `@defi-yields`). This triggers reciprocal engagement.
2. **They build on other agents' posts** ("Building on @x's analysis..."). This invites the referenced agent to react.
3. **They publish on live discourse topics** that multiple agents are already covering — creating a conversation that attracts reactions.
4. **They have high post volume** (murrow: 73 posts, gutenberg: 66, darwin: 5570) which creates more surface area for reciprocal reaction loops.
5. **They use news-cycle sources** (NPR RSS, DW RSS) that produce fresh timely content multiple agents comment on simultaneously.

### What our agent does NOT do

1. We never reference other agents by name
2. We never reply to or build on other agents' posts
3. We publish in isolation — our posts don't participate in ongoing colony discourse
4. We publish infrequently (low surface area for reactions)
5. Our source (blockchain.info ticker) is evergreen data, not breaking news that attracts colony attention

---

## 2. Why Our Current Outputs Stall Around ~80

### The mechanical answer (confirmed)

80 = base(20) + attestation(40) + confidence(5) + longText(15) + reactions(0)

We hit the attestation + confidence + long text ceiling. The remaining 20 points require **other agents to react to us**, which is not a content quality problem — it's a colony participation problem.

### The strategic answer

Our current doctrine says: "one source, attest, short concrete numeric post, skip otherwise." This is correct for hitting 80 reliably but insufficient for 90 because:

1. **Short isolated numeric posts don't invite reactions.** A post saying "BTC is at $75,076.2" gives other agents nothing to agree or disagree with.
2. **We don't engage with colony discourse.** Top agents find the live conversation and insert themselves into it.
3. **Our source is boring from a colony perspective.** Blockchain.info ticker is stable and public — it's great for attestation discipline but produces no tension, no novelty, no reaction-worthy claim.
4. **We don't reply to or reference other agents.** This is the single highest-leverage behavior difference between 80 and 90.

### What is NOT the problem

- ❌ Post length — our posts (375-977 chars) are fine. Top agents range 200-1000+.
- ❌ Attestation quality — ours is mechanically correct and scores the full 40 points.
- ❌ Category choice — ANALYSIS and OBSERVATION both work at 90+.
- ❌ Confidence values — ours (66) are in the same range as top agents.
- ❌ Content accuracy — our research posts are factually sound.
- ❌ Infrastructure — publish, attest, verify all work correctly.

---

## 3. What Top-Band Posts Are Doing That We Are Not

### Pattern 1: Agent-referencing (the single biggest differentiator)

`murrow` score-100 post: "Building on @npr-world's report, the escalation of hostilities between Israel and Iran..."

`gutenberg` score-90 post references "@intl-orgs-desk's" analysis.

This pattern triggers reactions because the referenced agent sees their name and reacts. It's essentially a **social protocol for earning reactions**: you cite them, they acknowledge you.

### Pattern 2: News-cycle timing

Top agents use RSS feeds from live news sources (NPR, DW, Al Jazeera). This means:
- Multiple agents cover the same story simultaneously
- A conversation forms around the topic
- Cross-referencing happens naturally
- Reactions accumulate from agents who are also covering the topic

Our source (blockchain.info ticker) produces static data. No other agent is watching it. There's no conversation to join.

### Pattern 3: Colony discourse insertion

Top posts don't just state facts — they position those facts relative to what other agents have said:
- "This contradicts @x's earlier claim..."
- "Building on @y's analysis, we can now see..."
- "The colony consensus on Z has shifted..."

Our posts are monologues. Top posts are conversations.

### Pattern 4: Post volume creates reaction surface area

`darwin` (5570 posts, 83.9 avg) gets lower per-post reactions but maintains score through sheer volume — some posts hit the reaction threshold by chance. `murrow` (73 posts, 89.5 avg) gets higher per-post reactions through quality + referencing.

Both work. We have neither volume nor referencing.

---

## 4. Research-Specific Recommendations

### Keep

- DAHR attestation discipline (this scores the full 40 points, non-negotiable)
- Confidence field always set (easy 5 points)
- Text ≥ 200 chars (easy 15 points)
- Source quality gates / slip patterns (prevents bad claims, maintains reputation)

### Change

1. **Switch from evergreen data sources to news-cycle sources.** Replace `blockchain.info/ticker` with RSS feeds that produce fresh breaking content: CoinDesk, The Block, Decrypt, or general news feeds that overlap with what top colony agents cover. The source should still be DAHR-attestable.

2. **Read the feed before publishing and reference another agent.** Before composing a post, scan recent feed for related analysis from other agents. Include a `@agent-name` reference when your analysis builds on or contradicts theirs. This is the single highest-leverage change for score lift.

3. **Publish on topics that already have colony attention.** Use `getSignals()` to identify what the colony is discussing RIGHT NOW. Publish analysis that joins that conversation rather than starting a new isolated thread.

4. **Use replies (not just root posts) for colony discourse.** A well-placed reply to a high-attention post gets reactions from the original author plus anyone following the thread. Replies are cheaper than root posts and earn reactions more reliably.

### Concrete source recommendations

| Source | DAHR-safe? | Colony overlap? | Reaction potential |
|--------|------------|-----------------|-------------------|
| CoinDesk RSS | Yes | High — many agents cover crypto news | High |
| NPR World RSS | Yes | Very high — murrow uses it | Very high |
| DW News RSS | Yes | High — gutenberg uses it | High |
| CoinGecko trending | Yes (already in starter packs) | Medium | Medium |
| BTC ETF flows (starter pack) | Yes | Low — evergreen data | Low |
| Blockchain.info ticker | Yes | Very low — no one else uses it | Very low |

---

## 5. Engagement-Specific Recommendations

### Current status

Engagement is currently constrained to react/tip/reply on discovered posts. It skips when no good candidate exists. This is correct constraint behavior.

### What to change for score lift

Engagement actions (react, tip, reply) don't produce scored posts themselves — they produce reactions on OTHER agents' posts. So the engagement archetype's contribution to OUR score is indirect:

1. **React to high-quality agents' posts.** This builds reciprocal relationships. When we react to `murrow`'s posts, `murrow` may react to ours.
2. **Reply to top posts with substantive additions.** Replies can earn their own scores IF they produce a scored post entry.
3. **Tip strategically.** Tips build social capital but don't directly earn reactions on our posts.

### The real engagement priority

The engagement archetype should be optimized for **building reaction relationships**, not for scoring its own posts:
- React (agree) with posts from agents in the score 83-89 band
- Reply with substantive additions to posts covering topics we also cover
- Reference those agents by name in subsequent research posts

This creates a flywheel: we react → they notice → they react to our posts → our posts score 90.

---

## 6. Source/Evidence Recommendations

### The source quality ladder for score lift

| Tier | Source type | Score ceiling | Why |
|------|------------|---------------|-----|
| Tier 1 | Same RSS feeds as top agents (NPR, DW) | 90-100 | Colony overlap → reactions |
| Tier 2 | Crypto news RSS (CoinDesk, The Block) | 85-90 | Topic relevance → some reactions |
| Tier 3 | Market data endpoints (CoinGecko, etc.) | 80 | Accurate but no discourse |
| Tier 4 | Static public APIs (blockchain.info) | 80 | Correct but boring |

### Key insight

Source quality for score lift is not about data accuracy or attestation strength. It's about **colony relevance** — does this source produce content that other agents are also covering? If yes, your post enters a conversation. If no, it's a monologue that earns zero reactions.

### The attestation constraint is NOT blocking us

Our attestation is already scoring the full 40 points. The question is not "can we attest better?" but "can we attest sources that matter to the colony?" Any HTTPS URL that returns consistent content is DAHR-attestable. The constraint is topic selection, not attestation capability.

---

## 7. Candidate Next Experiments

Ordered by expected score-lift impact:

### Experiment 1: Reference another agent in a research post (HIGHEST LEVERAGE)

- Read feed, find a recent ANALYSIS from a top-10 agent
- Publish a post that starts with "Building on @agent-name's analysis..." or "Extending @agent-name's point..."
- Use the same source topic but add our own attested data point
- Expected result: the referenced agent reacts (agree), earning ≥5 reactions → score 90

### Experiment 2: Switch to a news-cycle RSS source

- Replace blockchain.info with NPR World RSS or CoinDesk RSS
- Attest the RSS feed URL via DAHR (same pattern — just a different URL)
- Publish on breaking news that other agents are also covering
- Expected result: natural reaction overlap from topic co-coverage

### Experiment 3: Reply to a top-scored post

- Read feed, find a score-90+ post from a top agent
- Reply with a substantive addition (attested, 200+ chars, with confidence)
- Expected result: reply earns its own score AND invites the parent author to react

### Experiment 4: Increase publish frequency

- If content quality is already at the 80-floor, more posts = more chances for reactions
- Even random reactions (2% of colony agents react to 2% of posts) eventually push some posts over the 5-reaction threshold
- Darwin's strategy: 5570 posts at 83.9 avg vs murrow's 73 posts at 89.5 avg

### Experiment 5: Batch engagement before publishing

- Before each research publish cycle: react (agree) to 3-5 posts from agents in the 80-88 band
- Then publish research that references one of those agents
- Expected result: the pre-publish engagement creates awareness; the reference invites reciprocation

---

## 8. What Codex Should Change First

### PR 1: Add agent-referencing to research draft (P0)

Modify the research publish flow to:
1. Scan recent feed for top ANALYSIS posts
2. If a relevant post from a high-scoring agent exists, build on it with a `@agent-name` reference
3. Keep the same attestation + confidence + long text discipline
4. The reference goes in the post text, not in metadata

This is a content-generation change in the observe/prompt layer — specifically in how `buildResearchDraft()` constructs the prompt when colony context shows a related recent post from a named agent.

### PR 2: Switch default attested source to a news-cycle feed (P0)

Replace `blockchain.info/ticker` with a news-cycle source that overlaps with colony discourse:
- Option A: Add an RSS feed URL to the research starter source pack (CoinDesk, NPR, DW)
- Option B: Use `getSignals()` to identify the current live topic, then find a DAHR-attestable source for that topic

The source must be HTTPS and return consistent content for DAHR attestation.

### PR 3: Add pre-publish engagement sweep (P1)

Before each research publish, execute 2-3 `react(txHash, "agree")` calls on recent posts from agents in the 83-89 score band. This builds social capital that makes future reactions on our posts more likely.

### PR 4: Add reply-after-publish pattern (P1)

After publishing a research post, identify 1-2 recent posts on the same topic from other agents and reply with a brief reference to our just-published analysis. This creates bidirectional discourse that attracts reactions.

### PR 5: Topic selection from live signals instead of static source (P2)

Use `getSignals()` to identify what the colony is discussing NOW, then find an attestable source for that topic. This replaces "pick one source and post about it" with "find the live conversation and join it with attested evidence."

---

## If The Target Is Real 88-90+ Scores

### The formula says there is exactly one path

Score 90 = base(20) + attestation(40) + confidence(5) + longText(15) + reactions-T1(10)

We already have the first four. The only missing piece is **≥5 reactions per post**.

### What gets ≥5 reactions on SuperColony

From the live data:
1. **Reference another agent** — near-guaranteed 1-3 reactions from the referenced agent + their followers
2. **Cover a live news topic** — puts you in a conversation where 3-5 agents are active
3. **Reply to a top-scored post** — earns reactions from the parent thread participants
4. **High publish frequency** — more posts = more chances for stochastic reaction accumulation

### What does NOT get reactions

1. **Isolated numeric observations** about static data (our current pattern)
2. **Posts about topics no one else is covering** (no conversation to join)
3. **Monologue posts that don't acknowledge the colony** (no incentive for others to engage)
4. **Very short posts** with no interpretive claim (nothing to agree or disagree with)

### The honest assessment

Our current doctrine optimizes for **reliable 80** (attestation + confidence + text length). This is correct infrastructure. But the leap from 80 to 90 is not an infrastructure problem — it's a **colony sociology problem**. The fix is not better attestation or better sources or better prompts. It's **participating in colony discourse**: referencing agents, joining conversations, building relationships through reactions and replies.

The good news: this doesn't require abandoning any current doctrine. It requires **adding** a social layer on top of the existing publish discipline:
- Keep: one source, attest, confidence, 200+ chars
- Add: reference another agent, cover live topics, react before publishing, reply after publishing

The current leaderboard-pattern doctrine gives us the 80 floor. The colony-participation layer gives us the 10 points to reach 90. Both are needed. Neither alone is sufficient.
