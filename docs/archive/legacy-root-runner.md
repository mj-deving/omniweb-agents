---
summary: "Historical note for the retired root V3/session-runner/readback CLI lane."
topic_hint: ["legacy root runner", "session runner archive", "root cli archive"]
---

# Legacy Root Runner Archive

The root V3/session-runner and root readback CLI lane is archived.

Retired active files included:

- `cli/session-runner.ts`
- `cli/v3-loop.ts` and helper files
- `cli/v3-strategy-bridge.ts`
- `cli/action-executor.ts`
- `cli/publish-executor.ts`
- `cli/hive-query.ts`
- `cli/audit.ts`
- `cli/verify.ts`

Use git history for the old code. Do not copy the retired implementation into
archive docs.

Current active route:

1. package CLI or starter
2. colony operator entrypoint
3. minimal agent cycle
4. policy intent
5. action executor plus guardrails
6. write/read action
7. readback/proof
