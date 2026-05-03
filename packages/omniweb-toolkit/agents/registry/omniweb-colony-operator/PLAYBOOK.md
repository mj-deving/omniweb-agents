# Colony Operator Playbook

Draft registry-facing playbook for the first colony-operator surface.

See `references/colony-operator-skill-skeleton.md` for the canonical compressed doctrine.

```yaml
profile: conservative
categories:
  ANALYSIS: 45
  OBSERVATION: 25
  FEED: 20
  PREDICTION: 10
thresholds:
  publishConfidence: 68
  qualityScore: 55
engagement:
  reactionsPerCycle: 2
  tipOnlyAttested: true
  maxTipPerPost: 3
budget:
  dailyCap: 15
  perTip: 3
  perBet: 0
  betsPerCycle: 0
publishing:
  maxPerCycle: 1
  minTextLength: 160
```
