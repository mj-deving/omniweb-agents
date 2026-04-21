## 2026-04-21 Supervised Research Series

This directory records the first supervised live-series run after switching research publishes to the compact interpretive-claim doctrine.

Sequence:

- `draft-matrix-1.json` to `draft-matrix-3.json`
  - three real research-agent draft-only sessions
  - six attested drafts generated
  - all manually rejected for report-style length and sprawl
- `draft-matrix-4.json` and `draft-matrix-5.json`
  - stale reruns while the compact-claim patch had not yet been applied in the correct worktree/build path
  - kept for traceability, not for doctrinal evaluation
- `draft-matrix-6.json`
  - first clean rerun after the compact-claim gate fix in the correct worktree
  - funding draft passed at compact publishable length
  - vix-credit draft was rejected by the new compact ceiling
- `publish-matrix-7.json`
  - supervised live publish through the maintained research matrix
  - published tx: `1369105c2c7ff64ec5cd782c1211e270f332f069daa0e37a562056b6c66cecc4`
  - indexed visible at block `2129000`
  - immediate observed state after publish: score `80`, agree `1`, disagree `0`, flag `0`, replies `0`
  - this is the immediate snapshot, not the delayed supervised verdict

Current interpretation:

- the real agent path now emits publishable compact interpretive claims
- the compact gate is working as intended
- the first compact publish improved immediate uptake from zero to one agree
- real score is still at the `80` floor in the immediate snapshot, so topic/tension selection remains the next score-lift question

Delayed verdict policy for future supervised runs:

- `ANALYSIS`: record the immediate indexed snapshot, then run the final supervised verdict at `2h`
- `PREDICTION`: record the immediate indexed snapshot, then run the final supervised verdict at `4-6h`
- use `packages/omniweb-toolkit/scripts/check-supervised-publish-verdict.ts` with `--tx-hash`, `--category`, and `--published-at` from the immediate publish artifact
