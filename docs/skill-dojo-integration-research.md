# Skill Dojo Integration Research

> Research output from creative + science + council analysis session.
> Basis for future agent architecture planning.
>
> **Date:** 2026-03-19
> **Status:** Research complete — awaiting Codex review
> **Note:** Skill Dojo is testnet-only. API/skills may change before mainnet. Treat as directional, not authoritative.

---

## 1. Skill Dojo Inventory (15 Skills, 6 Categories, 11 Chains)

### API
- **Base URL:** `https://skillsdojo-production.up.railway.app`
- **Endpoints:** `GET /api/skills`, `GET /api/skills/{id}`, `POST /api/execute`, `GET /api/agent-spec`
- **Rate Limit:** 5 req/hr per IP on `/api/execute`
- **Response envelope:** `{ ok, skillId, executionTimeMs, result: { status, message, data, explorerUrl, timestamp } }`

### Skills by Category

| Category | Skill ID | Description | Chains | Our Agent Match |
|----------|----------|-------------|--------|----------------|
| **monitoring** | `address-monitoring-agent` | Wallet balance/tx patterns via nodeCall | demos, evm, solana, dahr, tlsn | infra-ops, nexus |
| **monitoring** | `network-monitor-agent` | Network health, mempool, on-chain events | demos, evm | infra-ops |
| **chain-ops** | `chain-operations-agent` | Unified balance/sign/transfer across 10+ chains | 9 chains | nexus (overlaps sdk.ts) |
| **chain-ops** | `multi-step-operations-agent` | DemosWork batch/conditional/cross-chain workflows | demos, evm, solana, ton | nexus (BLOCKED: ESM bug) |
| **chain-ops** | `solana-operations-agent` | SOL balance/sign/transfer | solana | nexus |
| **chain-ops** | `ton-operations-agent` | TON balance/sign/transfer | ton | nexus |
| **chain-ops** | `near-operations-agent` | NEAR balance/sign/transfer | near | nexus |
| **chain-ops** | `bitcoin-operations-agent` | BTC balance/sign/transfer | bitcoin | nexus |
| **chain-ops** | `cosmos-operations-agent` | ATOM balance/sign/transfer | cosmos | nexus |
| **defi** | `defi-agent` | Order book (Binance DAHR), liquidity, limit orders, bridge/swap (Rubic) | demos, evm, solana | **defi-markets** |
| **agents** | `prediction-market-agent` | Polymarket/Kalshi DAHR-attested data, conditional bets | demos, evm, dahr | **sentinel, pioneer** |
| **identity** | `identity-agent` | CCI profiles — create/resolve/link wallets | demos, evm, solana | all agents |
| **identity** | `tlsnotary-attestation-agent` | MPC-TLS cryptographic proofs of HTTPS | demos, tlsn | **crawler** |
| **identity** | `demos-wallet-agent` | Browser wallet integration, SIWD | demos, evm, solana | skip (browser-only) |
| **setup** | `00-sdk-setup` | SDK connectivity validation | demos, evm, solana | skip (setup-only) |

---

## 2. Creative Analysis: 12 Novel Agent + Skill Combinations

### Tier 1: Highest Value (direct score improvement)

**C1. "DeFi Agent Goes Live"** — `defi-agent` as DataProvider for defi-markets
- Wire `defi-agent` order-book mode as a DataProvider plugin
- Posts contain DAHR-attested Binance data (real numbers, not keyword matches)
- Expected: 30%+ score improvement over keyword-only skeleton

**C2. "Pioneer as Algorithmic Contrarian"** — `prediction-market` + `tlsnotary`
- Check Polymarket consensus → hunt for attested counter-evidence → TLSNotary proof
- Posts: "Market says X [DAHR], but [source] shows Y [TLSNotary]"
- Algorithmically generates highest-signal post type

**C3. "Self-Correcting via Market Feedback"** — `prediction-market` for calibration
- Compare agent's predicted_reactions against prediction market probabilities
- Dual-signal calibration: social (reactions) + market (outcomes)
- Makes agents epistemically honest — optimize for TRUTH not popularity

**C4. "Network Immune System"** — `network-monitor` + `tlsnotary` for infra-ops
- infra-ops detects degradation → TLSNotary attests status page → posts incident report
- Detection → verification → reporting as one automated flow

### Tier 2: High Value (new capabilities)

**C5. "Intelligence Cascade"** — Multi-agent data pipeline
- crawler detects whale movement → pioneer frames thesis → defi-markets adds data → sentinel synthesizes
- No single agent has the full picture; cascade creates emergent intelligence

**C6. "Executable Intelligence"** — Posts as DemosWork scripts
- nexus queries cross-chain prices → finds arbitrage → publishes WITH the DemosWork script
- Posts become runnable programs, not just observations

**C7. "Address Monitoring as Event Source"**
- Wire `address-monitoring` as a new EventSource in reactive system
- Track whale wallets, protocol treasuries, bridge hot wallets
- Creative twist: monitor OTHER SuperColony agents' DEM spending to predict activity

**C8. "TLSNotary Source Quality Layer"**
- High-value sources get TLSNotary proofs (not just DAHR)
- Sources with MPC-TLS proofs get higher reliability scores in source-health lifecycle
- Cryptographic source quality, not just availability checks

### Tier 3: Future Value (blocked or infrastructure)

**C9. "Cross-Chain Identity Mesh"** — `identity-agent` for CCI profiles
- Every agent creates CCI profiles linking Demos identity to chain identities
- Enables verifiable cross-chain reputation and trust graphs

**C10. "Agent Playbooks via DemosWork"** — `multi-step-operations` (blocked)
- Declarative agent behavior: parameterized workflow templates stored in StorageProgram
- Deferred until DemosWork ESM bug is fixed

**C11. "Demos Weather Report"** — Multi-skill synthesis post
- Every 6h: network health + cross-chain state + market pulse + wallet movements + market sentiment
- One post, five skill calls, five attestation proofs — maximum information density

**C12. "Multi-Source Attested Posts"**
- Posts citing 4-5 DAHR-attested data points score significantly higher
- Requires orchestrating multiple Skill Dojo calls per session

---

## 3. Scientific Hypotheses

| ID | Hypothesis | Metric | Test Design | Effort |
|----|-----------|--------|-------------|--------|
| H1 | DAHR-attested DeFi data increases defi-markets scores by 30%+ | Average post score | 10 sessions keyword-only vs 10 with defi-agent DataProvider | Medium |
| H2 | Prediction market data reduces calibration error by >15% | abs(predicted - actual) | 20 sessions: 10 self-calibration vs 10 with market prior | Low |
| H3 | Address-monitoring EventSource generates 5x more publishable events | Events/hour | Run both source sets in parallel for 48h | Medium |
| H4 | Multi-source attested posts score 40%+ higher | Post score | 10 single-source vs 10 multi-source posts | High |
| H5 | Contrarian + prediction-market posts score 2x average | Reactions | 5 consensus vs 5 contrarian posts from pioneer | Medium |
| H6 | Network-monitor enables sub-minute incident detection | Time-to-detection | Simulate 5 known events with/without source | Low |
| H7 | 5 req/hr sufficient for cron, bottleneck for reactive | 429 hit rate | Profile call patterns per agent type over 24h | Zero |

---

## 4. Council Recommendation: Architecture

### Integration Pattern
**Thin Shared Module** (`src/lib/skill-dojo-client.ts`, ~120 lines):
- HTTP wrapper for `POST /api/execute`
- Rate-budget coordination (extends existing write-rate-limit pattern)
- Attestation routing (DAHR today, TLSN when unblocked)
- NOT a platform, NOT a registry, NOT a plugin system

### Implementation Waves

| Wave | Skill | Integration Type | Target Agent | Est. Effort |
|------|-------|-----------------|--------------|-------------|
| **0** | `skill-dojo-client.ts` | Shared module | all | 1 day |
| **1a** | `defi-agent` | DataProvider | defi-markets | 2 days |
| **1b** | `prediction-market` | DataProvider + beforePublishDraft hook | sentinel, pioneer | 2 days |
| **1c** | `network-monitor` + `address-monitoring` | EventSource | infra-ops | 3 days |
| **2a** | `identity-agent` | Action (CCI profile creation) | all agents | 2 days |
| **2b** | `tlsnotary-attestation` | Source quality enrichment | crawler | 2 days |
| **Deferred** | `multi-step-operations` | Action (DemosWork scripts) | nexus | Post-ESM-fix |
| **Skip** | Chain-specific ops (5 skills) | — | — | Overlaps sdk.ts |
| **Skip** | `demos-wallet`, `sdk-setup` | — | — | Browser/setup only |

### Wave 1 Deliverables (Week 1-2)
1. `src/lib/skill-dojo-client.ts` — shared HTTP + rate-budget module
2. `src/plugins/skill-dojo-defi-provider.ts` — DataProvider wrapping defi-agent
3. `src/plugins/skill-dojo-prediction-provider.ts` — DataProvider + calibration hook
4. `src/reactive/event-sources/network-health.ts` — EventSource wrapping network-monitor
5. `src/reactive/event-sources/address-watcher.ts` — EventSource wrapping address-monitoring
6. Tests for all above

### Wave 2 Deliverables (Week 3-4)
7. CCI identity action for all agents via identity-agent
8. TLSNotary source quality enrichment for crawler's source lifecycle
9. Tests for all above

---

## 5. Agent-to-Skill Binding Map

| Agent | Wave 1 Skills | Wave 2 Skills | Rationale |
|-------|--------------|--------------|-----------|
| **sentinel** | prediction-market | identity-agent | Calibration oracle + CCI identity |
| **crawler** | — | tlsnotary-attestation, identity-agent | Source quality proofs + CCI |
| **pioneer** | prediction-market | identity-agent | Contrarian thesis fuel + CCI |
| **defi-markets** | defi-agent | identity-agent | Real DAHR-attested market data + CCI |
| **infra-ops** | network-monitor, address-monitoring | identity-agent | Live chain health data + CCI |
| **nexus** | — | identity-agent, (multi-step-ops deferred) | Cross-chain identity mesh |

---

## 6. Key Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Skill Dojo API changes on mainnet | High | Thin client isolates changes to one file |
| 5 req/hr rate limit constrains reactive agents | Medium | Centralized rate budgeting + H7 profiling |
| DAHR-attested data quality varies | Medium | Response validator + source health tracking |
| Testnet data ≠ mainnet data quality | Medium | Instrument everything, don't hardcode thresholds |
| DemosWork ESM bug persists | Low (accepted) | Deferred to Wave 3+, not blocking |

---

## 7. Next Actions

1. **Build `skill-dojo-client.ts`** — thin shared module
2. **Implement Wave 1** — defi-agent provider, prediction-market provider, network-monitor + address-monitoring event sources
3. **Test H1 first** — defi-markets with real data vs keyword-only (highest expected ROI)
4. **Instrument scoring** — track per-skill contribution to post scores
5. **Profile rate limits** — run H7 analysis before Wave 2
