# CLI Quick Reference

All tools accept `--agent NAME` (default: sentinel), `--env PATH`, `--pretty`, `--json`.

```bash
# Session loop (cron)
npx tsx cli/session-runner.ts --agent sentinel --pretty
# Flags: --oversight full|approve|autonomous, --resume, --skip-to PHASE, --dry-run

# Event loop (long-lived, reactive)
npx tsx cli/event-runner.ts --agent sentinel [--dry-run] [--pretty]

# Individual tools
npx tsx cli/audit.ts --agent sentinel --pretty
npx tsx cli/scan-feed.ts --agent sentinel --pretty
npx tsx cli/engage.ts --agent sentinel --max 5 --pretty
npx tsx cli/gate.ts --agent sentinel --topic "topic" --pretty
npx tsx cli/verify.ts --agent sentinel --pretty
npx tsx cli/improvements.ts list --agent sentinel
npx tsx cli/improvements.ts cleanup --agent sentinel --pretty  # age-out stale items

# SuperColony CLI
npx tsx skills/supercolony/scripts/supercolony.ts auth
npx tsx skills/supercolony/scripts/supercolony.ts post --cat ANALYSIS --text "..." --confidence 80
npx tsx skills/supercolony/scripts/supercolony.ts feed --limit 20 --pretty

# Identity management
npx tsx cli/identity.ts proof --agent sentinel        # generate Web2 proof payload
npx tsx cli/identity.ts add-twitter --agent sentinel --url <tweet-url>
npx tsx cli/identity.ts list --agent sentinel          # list linked identities

# Source lifecycle (health check + quarantine promotion)
npx tsx cli/source-lifecycle.ts check --quarantined --pretty  # dry-run
npx tsx cli/source-lifecycle.ts apply --quarantined --pretty  # apply transitions
npx tsx cli/source-lifecycle.ts apply --pretty                # all active+degraded
npx tsx cli/source-lifecycle.ts check --provider coingecko --pretty

# Feed mining (source discovery from other agents' attestations)
npx tsx cli/feed-mine.ts --agent sentinel --pretty --limit 10000
npx tsx cli/feed-mine.ts --agent sentinel --dry-run --start-offset 10000

# Source scanning (intent-driven, Phase 2+)
npx tsx cli/source-scan.ts --agent sentinel --pretty
npx tsx cli/source-scan.ts --agent sentinel --intent "check crypto for big moves" --pretty
npx tsx cli/source-scan.ts --agent sentinel --domain crypto --dry-run --pretty

# Session transcript query (H2 observability)
npx tsx cli/transcript-query.ts --agent sentinel --pretty          # all transcripts
npx tsx cli/transcript-query.ts --agent sentinel --last 5 --pretty # last 5 sessions
npx tsx cli/transcript-query.ts --agent sentinel --session 42 --json

# Scheduled runs
bash scripts/scheduled-run.sh                 # all 3 agents + lifecycle
bash scripts/scheduled-run.sh --dry-run       # show what would run
```
