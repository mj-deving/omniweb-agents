# Roadmap: Local Skill Dojo Skills

> **Date:** 2026-03-20
> **Status:** Draft — pending Marius review
> **Approach:** Extract Skill Dojo skills as standalone local implementations in `/skills`.
> No runtime API calls. All skills run locally using our SDK (DAHR proxy, XM SDK, node calls).

---

## Course Correction

The original plan (API adapters in `src/adapters/skill-dojo/`) solved the wrong problem. Those adapters call the Skill Dojo HTTP API at runtime, subject to 5 req/hr rate limits. The correct approach:

1. **Study** each Skill Dojo skill's behavior (API responses, DAHR proxy patterns, SDK usage)
2. **Fork** source code where available (KyneSys repos are public on GitHub)
3. **Reimplement** locally where source isn't available, matching the observed behavior
4. **Place** in `/skills/{skill-name}/` as standalone, AI-invocable skills
5. **Wire** thin plugin wrappers in `src/plugins/` for automated session loop integration

**Rate limits become irrelevant** — we use our own SDK directly. No Skill Dojo API calls.

### What Happens to the API Adapter Layer

The `src/adapters/skill-dojo/` code (15 typed adapters, client, proof normalizer) stays as-is but is **deprioritized**. It serves as:
- A reference for skill behavior (typed params, response shapes, proof extraction)
- A fallback if local reimplementation proves harder than expected for specific skills
- Tests remain as documentation of the expected Skill Dojo API contract

---

## Architecture: Two Layers per Skill

```
skills/{skill-name}/              # Layer 1: AI-invocable skill (source of truth)
├── SKILL.md                      # What it does, when to use, examples
├── scripts/                      # TypeScript scripts using our SDK
│   ├── {mode-1}.ts               # e.g., order-book.ts
│   ├── {mode-2}.ts               # e.g., liquidity.ts
│   └── ...
└── references/                   # Optional: API docs, data schemas
    └── api-reference.md

src/plugins/{skill}-plugin.ts     # Layer 2: Thin plugin wrapper
  └── imports script logic from skills/
  └── exposes as DataProvider or Action
  └── registered via persona.yaml loop.extensions
```

**Layer 1 (skills/)** — AI reads SKILL.md, decides when to invoke, runs scripts. Human-readable. Like `skills/supercolony/` today.

**Layer 2 (src/plugins/)** — Session loop calls `DataProvider.fetch()` automatically at the right lifecycle point. Imports from Layer 1 so there's one implementation, two invocation paths.

---

## Skill Priority Tiers

### Tier 1: Highest Value (fill skeleton agents with real data)

| Skill | What It Does | SDK Components | Target Agent | Priority |
|-------|-------------|----------------|--------------|----------|
| **defi-agent** | Binance order book via DAHR proxy, Uniswap V3 pool data via XM SDK | DAHR `startProxy()`, XM SDK eth calls | defi-markets | P0 — first pilot |
| **prediction-market** | Polymarket/Kalshi market data via DAHR proxy | DAHR `startProxy()` | sentinel, pioneer | P0 |
| **network-monitor** | Demos node health, mempool state, on-chain events | Node RPC calls, `getLastBlock()`, `getPeerList()` | infra-ops | P0 |
| **address-monitoring** | Wallet balance tracking, tx history patterns | Node `nodeCall()`, XM SDK balance queries | infra-ops, nexus | P1 |

### Tier 2: Cross-Chain Operations (overlap with existing SDK usage)

| Skill | What It Does | SDK Components | Notes |
|-------|-------------|----------------|-------|
| **chain-operations** | Unified balance/sign/transfer across 10 chains | XM SDK | Overlaps our sdk.ts but broader chain coverage |
| **solana-operations** | SOL balance, sign, transfer | XM SDK Solana adapter | |
| **ton-operations** | TON balance, sign, transfer | XM SDK TON adapter | |
| **near-operations** | NEAR balance, sign, transfer | XM SDK NEAR adapter | |
| **bitcoin-operations** | BTC balance, sign, transfer | XM SDK Bitcoin adapter | |
| **cosmos-operations** | ATOM balance, sign, transfer | XM SDK Cosmos adapter | |

### Tier 3: Identity & Attestation

| Skill | What It Does | SDK Components | Notes |
|-------|-------------|----------------|-------|
| **identity-agent** | CCI profile create/resolve/link wallets | CCI SDK module | Deferred until CCI score benefit proven |
| **tlsnotary-attestation** | MPC-TLS HTTPS proofs | TLSNotary WASM prover | Evaluate vs existing Playwright bridge |
| **demos-wallet** | Browser extension integration | Wallet SDK | Browser-only — stub in Node agent runtime |

### Tier 4: Workflow & Setup

| Skill | What It Does | SDK Components | Notes |
|-------|-------------|----------------|-------|
| **multi-step-operations** | DemosWork batch/conditional workflows | DemosWork SDK | BLOCKED: ESM bug |
| **sdk-setup** | SDK connectivity validation | Core SDK | Utility, low priority |

---

## Big Roadmap (Months)

### Month 1: Foundation + First Pilots

**Week 1-2: defi-agent skill (P0)**
- Study Skill Dojo defi-agent behavior (contract-tested, response shapes known)
- Fork or rewrite: DAHR proxy → Binance order book, XM SDK → Uniswap V3
- `/skills/defi-agent/` with SKILL.md + scripts (order-book, liquidity, limit-order, bridge-quote)
- `src/plugins/defi-data-plugin.ts` thin wrapper as DataProvider
- Wire into defi-markets persona.yaml
- Run 10 sessions, measure H1 (score improvement)

**Week 2-3: prediction-market skill (P0)**
- DAHR proxy → Polymarket API + Kalshi API
- `/skills/prediction-market/` with SKILL.md + scripts (compare-markets, aggregate-oracle)
- `src/plugins/prediction-data-plugin.ts` thin wrapper
- Wire into sentinel (beforeSense hook) + pioneer
- Measure H2 (topic selection quality)

**Week 3-4: network-monitor + address-monitoring skills (P0/P1)**
- Node RPC calls for health/mempool/events
- XM SDK balance queries for address monitoring
- `/skills/network-monitor/` + `/skills/address-monitoring/`
- Plugin wrappers for infra-ops cron loop
- Measure H6 (incident report capability)

### Month 2: Cross-Chain + Evaluation

**Week 5-6: chain-operations skill**
- Unified XM SDK wrapper for 10 chains
- `/skills/chain-operations/` with per-chain scripts
- Evaluate: does this add value over our existing sdk.ts?

**Week 6-7: 5 chain-specific skills**
- Solana, TON, NEAR, Bitcoin, Cosmos — all follow same pattern
- Factory approach: shared base + chain-specific config
- `/skills/{chain}-operations/` for each

**Week 7-8: identity-agent evaluation**
- Study CCI SDK module
- Build `/skills/identity-agent/` (resolve, create, add-web3)
- Test: does CCI identity improve agent reputation/scoring?

### Month 3: Advanced + Unblocking

**Week 9-10: tlsnotary-attestation**
- Compare Skill Dojo's TLSNotary path vs our Playwright bridge
- If materially better: build `/skills/tlsnotary-attestation/`
- If not: document decision and skip

**Week 10-11: multi-step-operations (if ESM bug fixed)**
- DemosWork SDK for batch/conditional/cross-chain workflows
- `/skills/multi-step-operations/` with workflow templates
- nexus agent activation

**Week 11-12: demos-wallet + sdk-setup + polish**
- demos-wallet: browser stub (document limitation)
- sdk-setup: connectivity health check utility
- Cross-skill integration tests
- Update docs + README

---

## Small Roadmap (This Week)

| Day | Task | Deliverable |
|-----|------|-------------|
| **Today** | Decide on roadmap + discuss approach | This document, agreed plan |
| **Day 2** | Research KyneSys GitHub for defi-agent source | Fork or study notes |
| **Day 3** | Build `/skills/defi-agent/` — DAHR proxy → Binance | Working local skill |
| **Day 4** | Build `src/plugins/defi-data-plugin.ts` wrapper | DataProvider for session loop |
| **Day 5** | Wire into defi-markets, run first session | First post with local skill data |

---

## Source Research Plan

Before reimplementing, check if KyneSys published the Skill Dojo skill source code:

| Repo to Check | What to Look For |
|---------------|-----------------|
| `github.com/kynesyslabs/sdks` | SDK modules used by skills (DAHR, XM, CCI) |
| `github.com/kynesyslabs/node` | Node RPC endpoints for network-monitor |
| Skill Dojo platform source? | May be in a public repo — check kynesyslabs org |
| NPM `@kynesyslabs/demosdk` | v2.11.0 source — we already have this |
| Skill Dojo API responses | Already contract-tested — use as behavior spec |

---

## Open Questions

1. **Skill Dojo source availability** — Is the Skill Dojo platform open source? If so, we can fork skill implementations directly.
2. **DAHR proxy access** — Can we call `startProxy()` directly from our SDK without going through Skill Dojo? (Likely yes — sentinel already does this for attestation.)
3. **Agent skill bindings** — Should skills be bound in AGENT.yaml `capabilities.skills` array (like supercolony) or in persona.yaml `loop.extensions`? Or both?
4. **Skill versioning** — When Skill Dojo updates a skill, how do we track drift from our local version?

---

## What This Means for Existing Work

| Existing Code | Status | Action |
|--------------|--------|--------|
| `src/adapters/skill-dojo/` (15 adapters) | Deprioritized | Keep as API fallback + behavior reference |
| `src/lib/skill-dojo-client.ts` | Deprioritized | Keep for testing/comparison |
| `src/lib/skill-dojo-proof.ts` | **Reusable** | Proof normalization works for local DAHR results too |
| `src/adapters/eliza/` | Unchanged | Separate integration path |
| `src/plugins/defi-markets-plugin.ts` | **Replace** | Current keyword evaluator → real data plugin |
| `src/plugins/infra-ops-plugin.ts` | **Replace** | Current keyword evaluator → real data plugin |
| H7 rate profiling | **Irrelevant** | No API rate limits for local skills |
| H1 hypothesis | **Still valid** | Measure score improvement with local skill data |
