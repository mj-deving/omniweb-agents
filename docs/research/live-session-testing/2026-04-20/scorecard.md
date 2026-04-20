# Live Session Scorecard — 2026-04-20

## Summary

The first live session arc after the attestation-first reset produced a **91.67 average** across three scored captures:

- `research-agent`: **100**
- `market-analyst`: **100**
- `engagement-optimizer`: **75**

That is close to the target posture, but not the uniform `90+` floor we want. The gap is concentrated in the engagement proof path, not in the research or market moat.

## Readiness Baseline

Before any live writes:

- `npm --prefix packages/omniweb-toolkit run check:playbook:research` passed
- `npm --prefix packages/omniweb-toolkit run check:playbook:market` passed
- `npm --prefix packages/omniweb-toolkit run check:playbook:engagement` passed
- auth token was present
- balance was above 2300 DEM
- all three archetypes cleared local publish/write readiness

## Live Results

### Research

- first live broadcast attempt exposed a real defect:
  - local readiness accepted `https://supercolony.ai/api/leaderboard?limit=10`
  - live DAHR publish canonicalized that to `/api/leaderboard`
  - the attestation source then returned `404`
- corrected live research publish succeeded on-chain:
  - publish tx: `bb8ec097da30c8dddc5f90a7538470fe9cb3a0c4cc7b34b5072fedabf0850fb5`
  - attestation tx: `fb8a507cd16df6dedf4daf4ad6d81f53fec7d679b473de8c5fba64c018e733ae`
- failure mode:
  - indexed visibility did not converge within the default 30s verification window
  - later direct `getPostDetail()` still returned `404`
- scored capture result:
  - `100`

Interpretation:

- the *action choice and publish shape* were moat-aligned
- the remaining issue is proof/readback reliability, not publish quality

### Market

- live higher-lower proof selected:
  - `SOL`
  - `30m`
  - direction `lower`
  - amount `5 DEM`
  - oracle sentiment `-51`
- live bet tx:
  - `7654ebd4cc28d5f5bcb46f7779a34794ad1b502a47b26e7f27ed6a96e9cfd2b7`
- readback converged on the first poll
- scored capture result:
  - `100`

Interpretation:

- the maintained market proof path is already aligned with the leaderboard-pattern moat
- this is the cleanest current live path

### Engagement

- maintained social proof selected an untouched external post with:
  - score `40`
  - zero reactions
  - zero tips
- live actions executed:
  - reaction succeeded and read back immediately
  - tip tx confirmed on-chain
  - reply tx reached indexed visibility
- failure mode:
  - `getTipStats()` stayed at zero even after tx confirmation and observed spend
- scored capture result:
  - `75`

Interpretation:

- the *proof harness executes*, but the *target selection logic is wrong for moat scoring*
- the current proof path optimizes for untouched posts, not high-value curation opportunities
- that is exactly why this archetype missed the `90+` floor

## What Is Actually Off

Three distinct gaps surfaced:

1. **DAHR/readiness parity bug**
   - readiness accepts a querystring URL that the live DAHR path later collapses into a non-working source
   - follow-up bead: `omniweb-agents-nkw.3`

2. **Publish visibility lag**
   - chain submission + attestation can succeed while indexed post visibility still fails the current default verification window
   - this affects proof confidence, not just UX

3. **Engagement proof-path misalignment**
   - the live social proof path currently chooses the wrong kind of post if the goal is leaderboard-quality scoring
   - this is the main reason the arc is not uniformly `90+`

## Recommendation

Priority order for the next testing pass:

1. fix `nkw.3` so readiness and DAHR agree on valid attestation targets
2. tighten publish visibility verification or extend the indexing window
3. replace the current engagement proof candidate selector with one that prefers:
   - attested posts
   - higher-score posts
   - under-engaged but actually high-value posts
4. rerun the same three-session arc unchanged otherwise

The moat itself is holding. The testing arc says the weak spot is the **engagement proof layer and readback parity**, not the compact research/market strategy.
