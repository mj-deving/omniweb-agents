---
summary: "9st0.6 no-spend refresh of social react/tip target policy."
---

# 9st0.6 Social Target Policy Refresh

Status: `BLOCKED`

Bead: `omniweb-agents-9st0.6`

Checked at: `2026-05-23T19:36:42Z`

## Result

No eligible social react or tip target was found. No social mutation was
attempted.

The maintained policy floor is unchanged:

- score: `>=85`
- engagement: `>=5`

Top ranked candidate in both scans:

- tx: `7cf8a29601bb662a3c193a485532403a2f0e708034e2fd984d9a6504e9403754`
- category: `OBSERVATION`
- score: `80`
- engagement total: `0`
- reaction total: `0`
- reply count: `0`
- selection score: `86`

The top candidate is below both floors, so no `--execute`, `--include-tip`, tip,
react, reply, send, broadcast, upload, credential change, or profile mutation is
eligible from this bead.

## Evidence

- Combined social preview: [social-preview.json](./social-preview.json)
- Tip-specific preview: [social-tip-preview.json](./social-tip-preview.json)

Commands:

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-social-writes.ts --feed-limit 500 --reaction-timeout-ms 45000 --tip-timeout-ms 60000 --poll-ms 3000
node --import tsx packages/omniweb-toolkit/scripts/check-tip-visibility.ts --feed-limit 500 --tip-amount 1 --tip-timeout-ms 60000 --poll-ms 3000
```

Both preview commands printed Node's experimental SQLite warning on stderr, then
returned `ok: true`, `attempted: false`, and `skipped: true`.

## Reason Codes

- `NO_ELIGIBLE_SOCIAL_TARGET`: no candidate satisfied the maintained floor.
- `TOP_CANDIDATE_SCORE_BELOW_FLOOR`: top candidate score `80` is below `85`.
- `TOP_CANDIDATE_ENGAGEMENT_BELOW_FLOOR`: top candidate engagement `0` is below
  `5`.
- `FLOOR_UNCHANGED`: score and engagement floors were not lowered.
- `NO_EXECUTE_NO_MUTATION`: no command included `--execute`.
- `TIP_PATH_TARGET_THIN`: tip-specific scan also found no eligible untipped
  target.

## Stop Rules

- Do not run a social mutation from this bead.
- Do not lower the score or engagement floors to force a target.
- Do not run `--execute`, `--include-tip`, `--reply-text`, or any direct
  `react`, `tip`, or `reply` call unless a later reviewed packet authorizes a
  specific target and readback plan.
- A future fresh-target recheck may proceed only if the no-spend preview returns
  a target with score `>=85`, engagement `>=5`, attestation URLs, non-self
  authorship, and no existing wallet reaction or tip.
- A controlled-target plan remains separate work and must define the target,
  mutation class, explicit live flag, budget, and product readback before any
  mutation.

## Aggregation Note

For `omniweb-agents-9st0.9`, classify social as `BLOCKED` for successor live
inclusion. The blocker is target availability under the maintained policy, not
runtime failure.
