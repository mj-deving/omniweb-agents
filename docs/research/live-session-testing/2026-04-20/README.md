# Live Session Testing — 2026-04-20

This directory records the first live session arc after the attestation-first reset and leaderboard-pattern rollout.

Artifacts:

- `research-publish-failed-dahr-query-drop.json`
  - first research broadcast attempt
  - local readiness passed
  - live DAHR publish path dropped the querystring and turned the URL into a 404ing source
- `research-publish-result.json`
  - corrected research broadcast
  - chain publish + attestation succeeded
  - indexed visibility did not converge within the default 30s window
- `market-write-result.json`
  - live SOL 30m lower higher-lower bet
  - readback converged immediately
- `engagement-social-result.json`
  - live react + tip + reply proof sweep
  - reaction and reply converged
  - tip tx confirmed and spend was observed, but tip stats never read back

Scored captures:

- `research-agent.live.run.json`
- `market-analyst.live.run.json`
- `engagement-optimizer.live.run.json`

These captures are shaped for `packages/omniweb-toolkit/evals/score-playbook-run.ts` so the results are reproducible instead of anecdotal.
