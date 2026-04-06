---
summary: "Phase 10 execution plan: agent templates, OpenClaw skills, fresh use cases. Sweep-ready."
read_when: ["next steps", "agent templates", "openclaw", "use cases", "what's next", "fresh agent", "template", "phase 10"]
---

# Phase 10: Agent Templates — Execution Plan

> Sweep-ready implementation spec. Updated 2026-04-06. Execute all sub-phases sequentially.

## Vision

Agent templates are built **bottom-up from `supercolony-agent-starter`** (official 130-line minimal agent), NOT top-down from our v3-loop. The v3-loop is sentinel's production harness — one specific, advanced instantiation. New agents start simple.

### Architecture (from FirstPrinciples decomposition)

The template system reduces to a **strategy pattern**: a fixed loop with a pluggable `observe()` function.

```
createAgentRuntime(envPath?)     ← NEW: encapsulates 6-step init sequence
  → { toolkit, sdkBridge, address, getToken }

runAgentLoop(runtime, observe, strategyPath, opts?)  ← NEW: generic loop
  → observe() → decideActions() → execute → sleep → repeat

Each template provides:
  → custom observe(toolkit): Promise<ObserveResult>
  → domain-specific strategy.yaml
  → optional sources.yaml
```

### Three-Layer Stack

```
src/toolkit/agent-runtime.ts     ← Shared init factory (replaces 30 lines of v3-loop boilerplate)
src/toolkit/agent-loop.ts        ← Shared observe-decide-act loop (~100 lines)
  + createToolkit() (15 domains) ← Existing typed primitives
  + strategy YAML (per template) ← Existing Zod-validated schema
  = Production agent in ~120 lines
```

### Key Interface: ObserveResult

```typescript
interface ObserveResult {
  colonyState: ColonyState;          // built from toolkit.feed.getRecent()
  evidence: AvailableEvidence[];     // domain-specific (market data, CVEs, etc.)
  context?: Partial<DecisionContext>; // optional enrichment for strategy engine
}
```

Base `observe()` builds ColonyState from feed. Each specialization adds domain evidence.

### Why not v3-loop as base?

The v3-loop has 521 lines of sentinel-specific ceremony — session numbering, extension hooks, audit calibration, quality scoring, subprocess management, proof ingestion, spending policy. A developer building a "Security Alert Agent" needs none of that. They need: connect, read, think, publish, repeat.

### ColonyPublisher alignment — RESOLVED

`ColonyPublisher` is docs-only. Not published anywhere. Our `createToolkit()` IS the reference implementation.

---

## Dependency Graph

```
Phase 10a-1: src/toolkit/agent-runtime.ts   (shared init factory)
Phase 10a-2: src/toolkit/agent-loop.ts      (shared loop)
     ↓
Phase 10a-3: templates/base/                (base template)
     ↓ (depends on 10a)
Phase 10b: templates/market-intelligence/   ─┐
Phase 10c: templates/security-sentinel/     ─┤ (parallel, both depend on base)
Phase 10d: docs/research/openclaw-*         ─┘ (independent)
     ↓
Phase 10e: templates/README.md + docs update (last)
```

---

## Phase 10a: Base Template

### Step 1: `src/toolkit/agent-runtime.ts` (NEW — ~60 lines)

**Purpose:** Encapsulate the 6-step SDK init sequence into a single factory. Mirrors v3-loop.ts lines 73-103 exactly.

```typescript
// src/toolkit/agent-runtime.ts

import { Demos } from "@kynesyslabs/demosdk/websdk";
import { connectWallet } from "../lib/network/sdk.js";
import { ensureAuth } from "../lib/auth/auth.js";
import { loadAuthCache } from "../lib/auth/auth.js";
import { createSdkBridge, AUTH_PENDING_TOKEN } from "./sdk-bridge.js";
import { SuperColonyApiClient } from "./supercolony/api-client.js";
import { ApiDataSource, ChainDataSource, AutoDataSource } from "./data-source.js";
import { createToolkit } from "./primitives/index.js";
import type { Toolkit } from "./primitives/types.js";
import type { SdkBridge } from "./sdk-bridge.js";

export interface AgentRuntime {
  toolkit: Toolkit;
  sdkBridge: SdkBridge;
  address: string;
  getToken: () => Promise<string | null>;
  demos: Demos;
}

export interface AgentRuntimeOptions {
  envPath?: string;
  agentName?: string;
  apiBaseUrl?: string;  // default: https://supercolony.ai
}

/**
 * Initialize a complete agent runtime — SDK, auth, toolkit.
 *
 * Encapsulates: connectWallet → createSdkBridge → ensureAuth →
 * SuperColonyApiClient → AutoDataSource → createToolkit
 *
 * Equivalent to v3-loop.ts lines 73-103 but as a reusable factory.
 */
export async function createAgentRuntime(opts?: AgentRuntimeOptions): Promise<AgentRuntime> {
  const envPath = opts?.envPath ?? ".env";

  // Step 1: Connect wallet (SDK + mnemonic)
  const { demos, address } = await connectWallet(envPath, opts?.agentName);

  // Step 2: Create SDK bridge
  const sdkBridge = createSdkBridge(demos, opts?.apiBaseUrl, AUTH_PENDING_TOKEN);

  // Step 3: Authenticate (graceful degradation — chain-only on failure)
  let authToken: string | null = null;
  try {
    authToken = await ensureAuth(demos, address);
  } catch {
    console.warn("[agent-runtime] Auth failed — continuing in chain-only mode");
  }

  // Step 4: Create API client with lazy token refresh
  const getToken = async () => authToken ?? loadAuthCache(address)?.token ?? null;
  const apiClient = new SuperColonyApiClient({ getToken });

  // Step 5: Create data source (API-first, chain fallback)
  const apiDataSource = new ApiDataSource(apiClient);
  const chainDataSource = new ChainDataSource(sdkBridge as any);
  const dataSource = new AutoDataSource(apiDataSource, chainDataSource);

  // Step 6: Create toolkit
  const toolkit = createToolkit({
    apiClient,
    dataSource,
    transferDem: (to, amount, memo) => sdkBridge.transferDem(to, amount, memo),
  });

  return { toolkit, sdkBridge, address, getToken, demos };
}
```

**Tests:** `tests/toolkit/agent-runtime.test.ts`
- Mock `connectWallet` to return fake Demos + address
- Mock `ensureAuth` to return token
- Verify createAgentRuntime returns complete AgentRuntime
- Verify graceful degradation when auth fails
- Verify toolkit has all 15 domains

### Step 2: `src/toolkit/agent-loop.ts` (NEW — ~100 lines)

**Purpose:** Generic observe-decide-act-sleep loop. Strategy pattern — pluggable `observe()`.

```typescript
// src/toolkit/agent-loop.ts

import { readFileSync } from "node:fs";
import { loadStrategyConfig } from "./strategy/config-loader.js";
import { decideActions } from "./strategy/engine.js";
import type { StrategyConfig, StrategyAction, DecisionContext } from "./strategy/types.js";
import type { ColonyState, AvailableEvidence } from "./colony/types.js";
import type { AgentRuntime } from "./agent-runtime.js";
import type { Toolkit } from "./primitives/types.js";

export interface ObserveResult {
  colonyState: ColonyState;
  evidence: AvailableEvidence[];
  context?: Partial<DecisionContext>;
}

export type ObserveFn = (toolkit: Toolkit) => Promise<ObserveResult>;

export interface AgentLoopOptions {
  intervalMs?: number;          // default: 300_000 (5 min)
  strategyPath: string;         // path to strategy.yaml
  maxIterations?: number;       // default: Infinity (run forever)
  onAction?: (action: StrategyAction, result: unknown) => void;
  onError?: (error: unknown) => void;
}

/**
 * Build a minimal ColonyState from toolkit.feed.getRecent().
 * Used as default observe() — specializations override this.
 */
export async function defaultObserve(toolkit: Toolkit): Promise<ObserveResult> {
  const feedResult = await toolkit.feed.getRecent({ limit: 100 });
  const posts = feedResult.ok ? feedResult.data.posts : [];

  const colonyState: ColonyState = {
    recentPosts: posts.map(p => ({
      txHash: p.txHash,
      author: p.author,
      timestamp: p.timestamp,
      text: String((p.payload as any)?.text ?? ""),
      category: String((p.payload as any)?.cat ?? ""),
      tags: [],
      reactions: { agree: 0, disagree: 0 },
      reactionsKnown: false,
    })),
    ourPosts: [],
    mentions: [],
  };

  return { colonyState, evidence: [] };
}

/**
 * Run the agent loop: observe → decide → act → sleep.
 *
 * Provide a custom observe() to specialize behavior.
 * Uses existing strategy engine (decideActions) for decision-making.
 */
export async function runAgentLoop(
  runtime: AgentRuntime,
  observe: ObserveFn,
  opts: AgentLoopOptions,
): Promise<void> {
  const strategyYaml = readFileSync(opts.strategyPath, "utf-8");
  const config = loadStrategyConfig(strategyYaml);
  const interval = opts.intervalMs ?? 300_000;
  let iteration = 0;
  let running = true;

  // Graceful shutdown
  const shutdown = () => { running = false; };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    while (running && iteration < (opts.maxIterations ?? Infinity)) {
      iteration++;
      console.log(`[loop] iteration ${iteration}`);

      // 1. Observe
      const observed = await observe(runtime.toolkit);

      // 2. Decide
      const decisionContext: DecisionContext = {
        ourAddress: runtime.address,
        sessionReactionsUsed: 0,
        postsToday: 0,
        postsThisHour: 0,
        ...observed.context,
      };
      const { actions } = decideActions(
        observed.colonyState,
        observed.evidence,
        config,
        decisionContext,
      );

      // 3. Act
      for (const action of actions) {
        try {
          let result: unknown;
          if (action.type === "TIP" && action.target) {
            result = await runtime.toolkit.actions.tip(action.target, action.metadata?.amount as number ?? 1);
          } else if (action.type === "PUBLISH") {
            // Publish via chain — sdkBridge.publishPost()
            result = await runtime.sdkBridge.publishPost(action.metadata as any);
          } else if (action.type === "ENGAGE" && action.target) {
            // Reactions via API (agree/disagree)
            // Templates can override onAction for custom handling
          }
          opts.onAction?.(action, result);
        } catch (err) {
          opts.onError?.(err);
        }
      }

      // 4. Sleep
      if (running) {
        await new Promise(r => setTimeout(r, interval));
      }
    }
  } finally {
    process.off("SIGINT", shutdown);
    process.off("SIGTERM", shutdown);
  }
}
```

**Tests:** `tests/toolkit/agent-loop.test.ts`
- Mock toolkit + runtime
- Verify observe() is called each iteration
- Verify decideActions() receives correct ColonyState + evidence
- Verify actions are executed (TIP, PUBLISH routed correctly)
- Verify SIGINT stops the loop
- Verify maxIterations respected

### Step 3: `templates/base/` directory

**`templates/base/agent.ts`** (~80 lines):

```typescript
#!/usr/bin/env npx tsx
/**
 * Base Agent Template — SuperColony agent using createToolkit().
 *
 * Usage:
 *   cp .env.example .env    # Add your DEMOS_MNEMONIC
 *   npx tsx agent.ts         # Run the agent
 *
 * Customize: override observe() to add domain-specific intelligence.
 */
import { resolve } from "node:path";
import { createAgentRuntime } from "../../src/toolkit/agent-runtime.js";
import { runAgentLoop, defaultObserve } from "../../src/toolkit/agent-loop.js";
import type { ObserveFn } from "../../src/toolkit/agent-loop.js";

// ── Configuration ──────────────────────────────
const STRATEGY_PATH = resolve(import.meta.dirname, "strategy.yaml");
const INTERVAL_MS = Number(process.env.LOOP_INTERVAL_MS ?? 300_000); // 5 min

// ── Observe (override this in specialized templates) ──
const observe: ObserveFn = defaultObserve;

// ── Main ───────────────────────────────────────
async function main() {
  console.log("[base-agent] Starting...");
  const runtime = await createAgentRuntime();
  console.log(`[base-agent] Connected as ${runtime.address}`);

  await runAgentLoop(runtime, observe, {
    strategyPath: STRATEGY_PATH,
    intervalMs: INTERVAL_MS,
    onAction: (action, result) => {
      console.log(`[base-agent] ${action.type}: ${action.reason}`);
    },
    onError: (err) => {
      console.error("[base-agent] Action failed:", err);
    },
  });
}

main().catch((err) => {
  console.error("[base-agent] Fatal:", err);
  process.exit(1);
});
```

**`templates/base/strategy.yaml`**:

```yaml
apiVersion: strategy/v3

rules:
  - name: publish_to_gaps
    type: PUBLISH
    priority: 50
    conditions: [fresh rich evidence]
    enabled: true

  - name: engage_verified
    type: ENGAGE
    priority: 65
    conditions: [verified topic]
    enabled: true

  - name: tip_valuable
    type: TIP
    priority: 30
    conditions: [above median]
    enabled: true

rateLimits:
  postsPerDay: 10
  postsPerHour: 3
  reactionsPerSession: 5
  maxTipAmount: 5

performance:
  engagement: 40
  discussion: 25
  ageHalfLife: 48
```

**`templates/base/.env.example`**:

```bash
# Required: your Demos wallet mnemonic (12 or 24 words)
DEMOS_MNEMONIC=your twelve word mnemonic phrase goes here replace with yours

# Optional: SuperColony API URL (default: https://supercolony.ai)
# SC_API_URL=https://supercolony.ai

# Optional: loop interval in milliseconds (default: 300000 = 5 min)
# LOOP_INTERVAL_MS=300000
```

---

## Phase 10b: Market Intelligence Template

**`templates/market-intelligence/agent.ts`** (~120 lines):

```typescript
#!/usr/bin/env npx tsx
/**
 * Market Intelligence Agent — oracle analysis, price divergence, predictions.
 *
 * Observes: oracle consensus, price feeds, prediction markets, existing analysis.
 * Publishes: ANALYSIS (divergence detected), PREDICTION (price direction).
 */
import { resolve } from "node:path";
import { createAgentRuntime } from "../../src/toolkit/agent-runtime.js";
import { runAgentLoop, defaultObserve } from "../../src/toolkit/agent-loop.js";
import type { ObserveFn, ObserveResult } from "../../src/toolkit/agent-loop.js";
import type { Toolkit } from "../../src/toolkit/primitives/types.js";
import type { AvailableEvidence } from "../../src/toolkit/colony/types.js";

const STRATEGY_PATH = resolve(import.meta.dirname, "strategy.yaml");
const DIVERGENCE_THRESHOLD = Number(process.env.DIVERGENCE_THRESHOLD ?? 10); // %

const observe: ObserveFn = async (toolkit: Toolkit): Promise<ObserveResult> => {
  // Get base colony state
  const base = await defaultObserve(toolkit);

  // Fetch market data in parallel
  const [oracleResult, pricesResult, predictionsResult, feedResult] = await Promise.all([
    toolkit.oracle.get({ assets: ["BTC", "ETH", "DEM"], window: "1h" }),
    toolkit.prices.get(["BTC", "ETH", "DEM"]),
    toolkit.feed.search({ category: "PREDICTION", limit: 20 }),
    toolkit.feed.search({ category: "ANALYSIS", limit: 20 }),
  ]);

  // Build evidence from market data
  const evidence: AvailableEvidence[] = [];

  // Detect price divergence between oracle consensus and latest prices
  if (oracleResult.ok && pricesResult.ok) {
    for (const oracleAsset of oracleResult.data.assets ?? []) {
      const priceEntry = pricesResult.data.find(p => p.asset === oracleAsset.asset);
      if (priceEntry && oracleAsset.consensusPrice) {
        const divergence = Math.abs(
          (priceEntry.price - oracleAsset.consensusPrice) / oracleAsset.consensusPrice * 100
        );
        if (divergence > DIVERGENCE_THRESHOLD) {
          evidence.push({
            sourceId: `oracle-divergence-${oracleAsset.asset}`,
            topic: `${oracleAsset.asset.toLowerCase()}-divergence`,
            data: {
              asset: oracleAsset.asset,
              oraclePrice: oracleAsset.consensusPrice,
              marketPrice: priceEntry.price,
              divergencePct: divergence,
            },
            freshness: Date.now(),
            richness: divergence > 20 ? 1.0 : 0.7,
          });
        }
      }
    }
  }

  // Add prediction market context
  if (predictionsResult.ok) {
    evidence.push({
      sourceId: "prediction-feed",
      topic: "predictions",
      data: { count: predictionsResult.data.posts?.length ?? 0 },
      freshness: Date.now(),
      richness: 0.5,
    });
  }

  return {
    ...base,
    evidence: [...base.evidence, ...evidence],
    context: {
      apiEnrichment: {
        oracle: oracleResult.ok ? oracleResult.data : undefined,
        prices: pricesResult.ok ? pricesResult.data : undefined,
      },
    },
  };
};

async function main() {
  console.log("[market-intel] Starting market intelligence agent...");
  const runtime = await createAgentRuntime();
  console.log(`[market-intel] Connected as ${runtime.address}`);

  await runAgentLoop(runtime, observe, {
    strategyPath: STRATEGY_PATH,
    intervalMs: Number(process.env.LOOP_INTERVAL_MS ?? 300_000),
    onAction: (action, result) => {
      console.log(`[market-intel] ${action.type}: ${action.reason}`);
    },
    onError: (err) => {
      console.error("[market-intel] Action failed:", err);
    },
  });
}

main().catch((err) => {
  console.error("[market-intel] Fatal:", err);
  process.exit(1);
});
```

**`templates/market-intelligence/strategy.yaml`**:

```yaml
apiVersion: strategy/v3

rules:
  - name: publish_on_divergence
    type: PUBLISH
    priority: 85
    conditions: [oracle divergence > threshold]
    enabled: true

  - name: publish_prediction
    type: PUBLISH
    priority: 80
    conditions: [prices available]
    enabled: true

  - name: publish_to_gaps
    type: PUBLISH
    priority: 50
    conditions: [fresh rich evidence]
    enabled: true

  - name: engage_verified
    type: ENGAGE
    priority: 65
    conditions: [verified topic]
    enabled: true

  - name: tip_valuable
    type: TIP
    priority: 30
    conditions: [above median]
    enabled: true

rateLimits:
  postsPerDay: 12
  postsPerHour: 4
  reactionsPerSession: 6
  maxTipAmount: 5

performance:
  engagement: 40
  discussion: 20
  ageHalfLife: 24

topicWeights:
  defi: 1.2
  crypto: 1.0
  macro: 0.8

enrichment:
  divergenceThreshold: 10
  minConfidence: 50
```

**`templates/market-intelligence/sources.yaml`**:

```yaml
# Market data sources for attestation
sources:
  - name: CoinGecko Simple Price
    url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd"
    dahr_safe: true
    topics: [crypto, defi]

  - name: CoinGecko Trending
    url: "https://api.coingecko.com/api/v3/search/trending"
    dahr_safe: true
    topics: [crypto]

  - name: DefiLlama TVL
    url: "https://api.llama.fi/protocols"
    dahr_safe: false  # Response too large for DAHR
    topics: [defi]

  - name: Crypto Fear & Greed
    url: "https://api.alternative.me/fng/?limit=1"
    dahr_safe: true
    topics: [crypto, macro]
```

---

## Phase 10c: Security Sentinel Template

**`templates/security-sentinel/agent.ts`** (~120 lines):

```typescript
#!/usr/bin/env npx tsx
/**
 * Security Sentinel Agent — CVE monitoring, threat detection, security alerts.
 *
 * Observes: colony security posts, NVD feeds, GitHub advisories, HN security.
 * Publishes: ALERT (critical threats), OBSERVATION (patterns), ANALYSIS (assessments).
 */
import { resolve } from "node:path";
import { createAgentRuntime } from "../../src/toolkit/agent-runtime.js";
import { runAgentLoop, defaultObserve } from "../../src/toolkit/agent-loop.js";
import type { ObserveFn, ObserveResult } from "../../src/toolkit/agent-loop.js";
import type { Toolkit } from "../../src/toolkit/primitives/types.js";
import type { AvailableEvidence } from "../../src/toolkit/colony/types.js";

const STRATEGY_PATH = resolve(import.meta.dirname, "strategy.yaml");

/** Fetch recent CVEs from NVD API (last 24h, critical/high severity) */
async function fetchRecentCVEs(): Promise<Array<{ id: string; description: string; severity: string }>> {
  try {
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=${since}&cvssV3Severity=CRITICAL`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!resp.ok) return [];
    const data = await resp.json() as any;
    return (data.vulnerabilities ?? []).slice(0, 10).map((v: any) => ({
      id: v.cve?.id ?? "unknown",
      description: v.cve?.descriptions?.[0]?.value ?? "",
      severity: v.cve?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity ?? "UNKNOWN",
    }));
  } catch {
    return [];
  }
}

/** Fetch GitHub security advisories (last 24h) */
async function fetchGitHubAdvisories(): Promise<Array<{ id: string; summary: string; severity: string }>> {
  try {
    const url = "https://api.github.com/advisories?type=reviewed&severity=critical,high&per_page=10";
    const resp = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return [];
    const data = await resp.json() as any[];
    return data.map(a => ({
      id: a.ghsa_id ?? "unknown",
      summary: a.summary ?? "",
      severity: a.severity ?? "UNKNOWN",
    }));
  } catch {
    return [];
  }
}

const observe: ObserveFn = async (toolkit: Toolkit): Promise<ObserveResult> => {
  const base = await defaultObserve(toolkit);

  // Parallel: colony signals + external sources
  const [signalsResult, alertsResult, cves, advisories] = await Promise.all([
    toolkit.intelligence.getSignals(),
    toolkit.feed.search({ category: "ALERT", limit: 20 }),
    fetchRecentCVEs(),
    fetchGitHubAdvisories(),
  ]);

  const evidence: AvailableEvidence[] = [];

  // CVE evidence
  for (const cve of cves) {
    evidence.push({
      sourceId: `nvd-${cve.id}`,
      topic: "security-vulnerability",
      data: cve,
      freshness: Date.now(),
      richness: cve.severity === "CRITICAL" ? 1.0 : 0.7,
    });
  }

  // GitHub advisory evidence
  for (const advisory of advisories) {
    evidence.push({
      sourceId: `ghsa-${advisory.id}`,
      topic: "security-advisory",
      data: advisory,
      freshness: Date.now(),
      richness: advisory.severity === "critical" ? 1.0 : 0.7,
    });
  }

  // Colony threat signals
  if (signalsResult.ok) {
    for (const signal of signalsResult.data) {
      evidence.push({
        sourceId: `signal-${(signal as any).id ?? "unknown"}`,
        topic: "colony-threat",
        data: signal,
        freshness: Date.now(),
        richness: 0.6,
      });
    }
  }

  return {
    ...base,
    evidence: [...base.evidence, ...evidence],
  };
};

async function main() {
  console.log("[security] Starting security sentinel agent...");
  const runtime = await createAgentRuntime();
  console.log(`[security] Connected as ${runtime.address}`);

  await runAgentLoop(runtime, observe, {
    strategyPath: STRATEGY_PATH,
    intervalMs: Number(process.env.LOOP_INTERVAL_MS ?? 600_000), // 10 min
    onAction: (action) => {
      console.log(`[security] ${action.type}: ${action.reason}`);
    },
    onError: (err) => {
      console.error("[security] Action failed:", err);
    },
  });
}

main().catch((err) => {
  console.error("[security] Fatal:", err);
  process.exit(1);
});
```

**`templates/security-sentinel/strategy.yaml`**:

```yaml
apiVersion: strategy/v3

rules:
  - name: publish_signal_aligned
    type: PUBLISH
    priority: 90
    conditions: [trending signal, matching evidence]
    enabled: true

  - name: reply_with_evidence
    type: REPLY
    priority: 80
    conditions: [matching evidence]
    enabled: true

  - name: engage_verified
    type: ENGAGE
    priority: 65
    conditions: [verified topic]
    enabled: true

  - name: publish_to_gaps
    type: PUBLISH
    priority: 50
    conditions: [fresh rich evidence]
    enabled: true

  - name: tip_valuable
    type: TIP
    priority: 30
    conditions: [above median]
    enabled: true

rateLimits:
  postsPerDay: 8
  postsPerHour: 3
  reactionsPerSession: 4
  maxTipAmount: 3

performance:
  engagement: 30
  discussion: 30
  ageHalfLife: 12  # Security alerts age fast

topicWeights:
  security: 1.5
  vulnerability: 1.3
  defi: 0.8

enrichment:
  minSignalAgents: 1
  minConfidence: 60
```

**`templates/security-sentinel/sources.yaml`**:

```yaml
sources:
  - name: NVD Recent CVEs
    url: "https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate={since}&cvssV3Severity=CRITICAL"
    dahr_safe: false  # Responses too large
    topics: [security, vulnerability]

  - name: GitHub Security Advisories
    url: "https://api.github.com/advisories?type=reviewed&severity=critical,high&per_page=10"
    dahr_safe: true
    topics: [security, vulnerability]

  - name: HackerNews Security
    url: "https://hn.algolia.com/api/v1/search_by_date?query=vulnerability+CVE&tags=story&hitsPerPage=5"
    dahr_safe: true
    topics: [security]
```

---

## Phase 10d: OpenClaw Research

**Finding from research:** OpenClaw uses SKILL.md files with YAML frontmatter. No native strategy-as-data concept — skills are instruction-based (markdown body IS the logic). Key gap: our structured strategy YAML has no equivalent.

**Write `docs/research/openclaw-skill-format.md`** documenting:

1. **Schema:** SKILL.md with YAML frontmatter (`name`, `description`, `metadata.openclaw.requires`, `metadata.openclaw.install`)
2. **Distribution:** ClawHub registry (13K+ skills), GitHub repos, local directories
3. **Template-to-skill mapping:**
   - Base template → meta-skill that loads strategy YAML and runs loop
   - Market Intelligence → skill with embedded market observe() instructions
   - Security Sentinel → skill with embedded security observe() instructions
4. **Feasibility:** Possible but requires adapter pattern. Strategy YAML would be a companion file alongside SKILL.md. The markdown body would contain loop orchestration instructions. Paradigm mismatch: our strategy-as-data vs OpenClaw's strategy-as-prose.
5. **Recommendation:** Defer OpenClaw packaging until templates are validated in production. The adapter cost is low but premature without user demand.

---

## Phase 10e: Documentation

**`templates/README.md`** — Architecture overview, quick-start per template, how to create new agents.

Structure:
```markdown
# Agent Templates

## Quick Start (any template)
1. `cp templates/{template}/ my-agent/`
2. `cp .env.example .env` and add your `DEMOS_MNEMONIC`
3. `npx tsx agent.ts`

## Templates
- **base/** — Minimal agent (observe → decide → act loop)
- **market-intelligence/** — Oracle analysis, price divergence, predictions
- **security-sentinel/** — CVE monitoring, threat detection, security alerts

## Creating a New Agent
1. Copy `templates/base/`
2. Override `observe()` with your domain logic
3. Customize `strategy.yaml` rules and thresholds
4. Add `sources.yaml` for attestation sources (optional)

## Architecture
[Diagram of runtime → loop → observe → decide → act]
```

**Update `docs/next-steps-agent-templates.md`** — Mark Phase 10a-10e checkboxes as complete.

---

## Test Plan (TDD — tests written before/alongside implementation)

| Test File | Tests | ISC Coverage |
|-----------|-------|-------------|
| `tests/toolkit/agent-runtime.test.ts` | init, auth failure, all 15 domains present | ISC-2, ISC-3, ISC-16 |
| `tests/toolkit/agent-loop.test.ts` | observe called, decide called, actions routed, shutdown, maxIterations | ISC-7-11, ISC-17-18 |
| `tests/templates/base-template.test.ts` | strategy.yaml valid, base observe returns ColonyState | ISC-12-13, ISC-17 |
| `tests/templates/market-intelligence.test.ts` | divergence detection, oracle/prices called, evidence shape | ISC-21-24, ISC-28-29 |
| `tests/templates/security-sentinel.test.ts` | CVE fetch, advisory fetch, signals called, evidence shape | ISC-32-34, ISC-37 |

**Mocking strategy:** Mock at the SDK/network boundary. `connectWallet` → fake Demos + address. `fetch` → intercepted for NVD/GitHub. `SuperColonyApiClient` methods → return typed fixtures. Same patterns as existing toolkit tests.

---

## File Inventory (new files)

| File | Lines (est.) | Phase |
|------|-------------|-------|
| `src/toolkit/agent-runtime.ts` | ~60 | 10a-1 |
| `src/toolkit/agent-loop.ts` | ~100 | 10a-2 |
| `templates/base/agent.ts` | ~40 | 10a-3 |
| `templates/base/strategy.yaml` | ~30 | 10a-3 |
| `templates/base/.env.example` | ~8 | 10a-3 |
| `templates/market-intelligence/agent.ts` | ~100 | 10b |
| `templates/market-intelligence/strategy.yaml` | ~40 | 10b |
| `templates/market-intelligence/sources.yaml` | ~20 | 10b |
| `templates/security-sentinel/agent.ts` | ~110 | 10c |
| `templates/security-sentinel/strategy.yaml` | ~40 | 10c |
| `templates/security-sentinel/sources.yaml` | ~15 | 10c |
| `templates/README.md` | ~60 | 10e |
| `docs/research/openclaw-skill-format.md` | ~80 | 10d |
| `tests/toolkit/agent-runtime.test.ts` | ~80 | 10a-1 |
| `tests/toolkit/agent-loop.test.ts` | ~120 | 10a-2 |
| `tests/templates/base-template.test.ts` | ~60 | 10a-3 |
| `tests/templates/market-intelligence.test.ts` | ~80 | 10b |
| `tests/templates/security-sentinel.test.ts` | ~80 | 10c |
| **Total** | **~1,123** | |

---

## Execution Checklist

### Phase 10a: Base Template
- [ ] Write `tests/toolkit/agent-runtime.test.ts` (TDD)
- [ ] Implement `src/toolkit/agent-runtime.ts`
- [ ] Write `tests/toolkit/agent-loop.test.ts` (TDD)
- [ ] Implement `src/toolkit/agent-loop.ts`
- [ ] Create `templates/base/` with agent.ts, strategy.yaml, .env.example
- [ ] Write `tests/templates/base-template.test.ts`
- [ ] Verify: `npm test` passes, `npx tsc --noEmit` passes

### Phase 10b: Market Intelligence Template
- [ ] Write `tests/templates/market-intelligence.test.ts` (TDD)
- [ ] Create `templates/market-intelligence/` with agent.ts, strategy.yaml, sources.yaml
- [ ] Verify: `npm test` passes

### Phase 10c: Security Sentinel Template
- [ ] Write `tests/templates/security-sentinel.test.ts` (TDD)
- [ ] Create `templates/security-sentinel/` with agent.ts, strategy.yaml, sources.yaml
- [ ] Verify: `npm test` passes

### Phase 10d: OpenClaw Research
- [ ] Write `docs/research/openclaw-skill-format.md`

### Phase 10e: Documentation
- [ ] Write `templates/README.md`
- [ ] Update this file's status checkboxes
- [ ] Final: `npm test` + `npx tsc --noEmit` both pass

---

## Status

- [x] Toolkit primitives complete (Phase 9, 2026-04-06)
- [x] SuperColony agent taxonomy documented (6 use cases from docs)
- [x] ColonyPublisher investigated — docs-only, our toolkit is the real implementation
- [x] Architectural direction decided — bottom-up from agent-starter, not top-down from v3-loop
- [x] OpenClaw format researched — SKILL.md + YAML frontmatter, no native strategy schema
- [x] Full execution plan written (this document, 2026-04-06)
- [ ] Phase 10a: Base template (agent-runtime + agent-loop + templates/base/)
- [ ] Phase 10b: Market Intelligence template
- [ ] Phase 10c: Security Sentinel template
- [ ] Phase 10d: OpenClaw research doc
- [ ] Phase 10e: Documentation + README
