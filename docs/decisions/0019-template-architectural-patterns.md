---
summary: "Two architectural patterns for agent templates: executor injection (dependency inversion at toolkit/cli boundary) and observe extraction (testability without SDK)"
read_when: ["template", "agent template", "observe", "executor", "testability", "boundary", "ADR-0002"]
---

# ADR-0019: Template Architectural Patterns

**Status:** accepted
**Date:** 2026-04-06
**Context:** Phase 10 agent template implementation

## Context

Phase 10 introduced reusable agent templates that need to:
1. Use the strategy engine and action executors from `cli/` (policy layer)
2. Live in `src/toolkit/` and `templates/` (mechanism layer)
3. Be testable without initializing the Demos SDK (which has NAPI bindings that fail in test context)

Two patterns emerged independently during implementation and are now codified as required conventions.

## Decision

### Pattern 1: Executor Injection

**Problem:** `agent-loop.ts` (in `src/toolkit/`) needs to call `executeStrategyActions()` and `executePublishActions()` (in `cli/`). Direct imports violate ADR-0002: toolkit = mechanism, cli = policy. The architecture boundary test (`tests/architecture/boundary.test.ts`) enforces this.

**Solution:** The loop defines executor interfaces and accepts them as injected functions:

```typescript
// src/toolkit/agent-loop.ts — defines the interface
export type LightExecutor = (actions: StrategyAction[], runtime: AgentRuntime) => Promise<LightExecutionResult>;
export type HeavyExecutor = (actions: StrategyAction[], runtime: AgentRuntime, opts: AgentLoopOptions) => Promise<HeavyExecutionResult>;

// templates/base/agent.ts — wires the concrete implementations
import { executeStrategyActions } from "../../cli/action-executor.js";
import { executePublishActions } from "../../cli/publish-executor.js";

const executeLightActions: LightExecutor = (actions, runtime) => executeStrategyActions(actions, { ... });
const executeHeavyActions: HeavyExecutor = (actions, runtime, opts) => executePublishActions(actions, { ... });
```

Templates sit outside the `src/toolkit/` boundary, so they can import from both `src/` and `cli/`. The toolkit layer stays pure.

**Why this matters:** Without injection, every new template would need an exception in boundary.test.ts, and the toolkit layer would accumulate cli/ dependencies over time — eroding the boundary that ADR-0002 established.

### Pattern 2: Observe Extraction

**Problem:** Template `agent.ts` files import `createAgentRuntime()` which transitively pulls in `@kynesyslabs/demosdk` (NAPI bindings). Tests that import agent.ts crash because NAPI modules can't load in vitest's Node context.

**Solution:** Extract the `observe()` function into a separate `observe.ts` file. The observe function only depends on the `Toolkit` interface (types, no NAPI), so it's fully testable with mocked toolkit methods.

```
templates/market-intelligence/
  ├── agent.ts      # Imports SDK transitively — NOT directly testable
  ├── observe.ts    # Imports only Toolkit type — fully testable with mocks
  ├── strategy.yaml
  └── sources.yaml
```

Test files import `observe.ts` directly, mock the toolkit, and verify observe logic without any SDK initialization.

**Why this matters:** Without extraction, template tests would need complex SDK mocking or would have to skip the core observe logic. The extraction costs nothing (one extra file, one extra import) and makes every template's intelligence layer independently testable.

## Alternatives Considered

### For Executor Injection
- **Direct import with boundary exception:** Would work but erodes ADR-0002 over time. Each new module in toolkit that needs executors would add another exception.
- **Move executors to src/toolkit/:** Wrong — executors depend on LLM providers, session state, spending policy. They are policy, not mechanism.

### For Observe Extraction
- **Mock the SDK at import level:** Fragile — NAPI module loading fails before mocks can intercept. Would need `vi.mock` at the module resolution level.
- **Integration tests only:** Would leave the observe logic (the core value of each template) untested in fast unit tests.

## Consequences

- Every new template MUST have `observe.ts` separate from `agent.ts`
- Every new template MUST wire executors via the injection interfaces, not direct imports in toolkit code
- The boundary test continues to enforce that `src/toolkit/` never imports from `cli/`
- Template tests achieve full observe coverage without SDK dependencies
