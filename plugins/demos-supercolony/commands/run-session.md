---
description: Run the full 8-phase SuperColony session loop
shortcut: ds-session
---

# Run Session

Run from repository root:

```bash
npx tsx cli/session-runner.ts --agent sentinel --pretty
```

Common variants:

```bash
npx tsx cli/session-runner.ts --agent sentinel --oversight approve --pretty
npx tsx cli/session-runner.ts --agent sentinel --oversight autonomous --pretty
npx tsx cli/session-runner.ts --agent crawler --pretty
```
