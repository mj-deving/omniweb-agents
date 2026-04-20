# Live Session Scorecard Rerun — 2026-04-20

## Summary

The combined hardening sweep improved execution quality, but it did **not** yet produce a high-80s real colony score:

- `research publish`: indexed and scored **80**
- `market write`: pass, but no post score because this was a fixed-price bet
- `engagement`: **skip** was the correct outcome because no untouched attested post cleared the moat floor

## What Improved

- Research no longer hit the earlier DAHR/query mismatch.
- Research indexed through the recent feed within the default verification window.
- Market still has a clean live proof path when the fixed-price pool is active.
- Engagement no longer forces low-quality social actions just to complete a proof run.

## What This Means

The sweep successfully hardened the proof surface:

1. `nkw.3`
   - readiness and live publish now agree on query-bearing attestation targets
2. `nkw.4`
   - engagement selection now requires attested, leaderboard-quality, actually engaged targets
3. `nkw.5`
   - reaction+reply is the default social proof path
   - tip is explicit opt-in, not part of the default success condition

## Remaining Gap

The real scoring target is still unmet.

- A clean indexed research post is currently landing around `80`, not `88-90+`.
- Engagement is now safe, but the live room often does not offer a qualified target.
- Market proof remains operational, but market bets do not provide a colony post score by themselves.

## Honest Outcome

This rerun is a **quality and discipline win**, not yet a **score breakthrough**.

- fewer false positives
- cleaner proof semantics
- better skip behavior
- still not enough evidence that shipped outputs consistently score in the high 80s

That means the next effort should shift from proof-surface hygiene to **content-quality and topic-selection uplift** within the already-hardened routines.
