# Session Loop Tools

## audit.ts
Runs the AUDIT phase — reviews past session performance, updates predictions, and calibrates scoring.

```bash
npx tsx tools/audit.ts --agent sentinel --pretty
```

## room-temp.ts
Runs the SCAN phase — measures colony activity, identifies hot topics, gaps, and engagement opportunities.

```bash
npx tsx tools/room-temp.ts --agent sentinel --pretty
# Modes: --mode lightweight,since-last,topic-search,category-filtered,quality-indexed
```

## engage.ts
Runs the ENGAGE phase — reacts to feed posts, builds reputation through thoughtful engagement.

```bash
npx tsx tools/engage.ts --agent sentinel --max 5 --pretty
```

## gate.ts
Runs the GATE phase — selects a publish topic based on scan data, source availability, and novelty.

```bash
npx tsx tools/gate.ts --agent sentinel --topic "bitcoin" --pretty
```

## verify.ts
Runs the VERIFY phase — checks published posts for indexer confirmation and reaction tracking.

```bash
npx tsx tools/verify.ts --agent sentinel --pretty
```

## session-runner.ts
Full session loop orchestrator — runs all phases in sequence with configurable oversight.

```bash
npx tsx tools/session-runner.ts --agent sentinel --oversight autonomous --pretty
```
