# Analysis: defi-markets & infra-ops Agent Identity Crisis

## Executive Summary

The defi-markets and infra-ops agents have a fundamental identity contradiction. Every artifact created during WS3 — AGENT.yaml, persona.yaml, persona.md, hardRules, constraints — was written as if they are SuperColony publishing agents. But the user has explicitly stated they are NOT SuperColony publishers. The feedback memory file (`feedback_new_agents_no_supercolony.md`) confirms: "These Skill-Dojo agents were built as framework demonstrations / intelligence nodes, not as SuperColony publishing agents like sentinel."

This analysis answers the 6 questions posed and proposes what to do.

---

## Question 1: What are these agents FOR if not SuperColony?

Based on all evidence, these agents serve **two purposes**:

### Purpose A: Framework Plugin Demonstrations
The core plugins (`defi-markets-plugin.ts`, `infra-ops-plugin.ts`) are minimal keyword evaluators. They demonstrate how the `FrameworkPlugin` interface works — how to create evaluators, register them, use the `createKeywordEvaluator` factory. They are reference implementations for the plugin architecture built in WS2.

### Purpose B: Event-Driven Intelligence Nodes
The event sources and handlers are the real substance:
- `ProtocolEventSource` + `MarketAlertHandler` — polls for DeFi protocol events (TVL changes, rate changes, governance, exploits), classifies by severity, produces `log_only` actions
- `StatusMonitorSource` + `IncidentAlertHandler` — polls for infrastructure service health (healthy/degraded/down/maintenance), detects state transitions, classifies by severity

These are **monitoring/alerting pipelines**, not publishing pipelines. The handlers currently return `log_only` actions exclusively — they never produce `publish`, `reply`, or `react` actions.

### What they actually are
**Standalone intelligence services** that:
1. Poll external data sources for domain-specific events
2. Classify events by severity
3. Log/alert on significant changes
4. Could feed into downstream systems (dashboards, alerting, other agents)

They are NOT SuperColony participants. They don't need wallets, attestations, engagement strategies, or publication loops.

---

## Question 2: Do their AGENT.yaml files reference SuperColony skills?

**Yes, and this is a contradiction.**

Both AGENT.yaml files contain:
```yaml
capabilities:
  skills:
    - supercolony          # Agent Skills open standard (skills/supercolony/)
```

Both also contain:
- `displayName: "Demos SuperColony DeFi Markets Agent"` / `"Demos SuperColony Infrastructure Ops Agent"`
- hardRules about attestation ("Never publish without attestation")
- hardRules about post count ("Never exceed 3 posts per session")
- hardRules about reactions ("Max 8 reactions per session")
- selfImprovement with predictionTracking (predictions about post performance)
- oversightGate scoped to strategy.yaml, personas, SKILL.md

These are all sentinel's patterns copy-pasted onto agents that don't publish. **The AGENT.yaml files need to be rewritten** to reflect their actual intelligence-node identity.

---

## Question 3: Should strategy.yaml follow the 8-phase SuperColony loop?

**No.** The sentinel strategy.yaml defines an 8-phase loop: AUDIT -> SCAN -> ENGAGE -> GATE -> PUBLISH -> VERIFY -> REVIEW -> HARDEN. This is a publication-centric cycle:
- AUDIT checks how previous *posts* performed
- SCAN reads the *feed* for topics
- ENGAGE *reacts* to other agents' posts
- GATE decides whether to *publish*
- PUBLISH *posts* with attestation
- VERIFY checks posts appeared in *feed*
- REVIEW retrospects on *publishing* performance
- HARDEN applies fixes to the *publishing* strategy

None of this applies to a monitoring/alerting agent. A defi-markets or infra-ops agent needs:
1. **POLL** — fetch data from sources (DeFi APIs, infrastructure endpoints)
2. **EVALUATE** — run evaluators on incoming data (keyword relevance, severity classification)
3. **ACT** — execute actions (log, alert, forward to dashboard)
4. **REVIEW** — assess monitoring effectiveness (false positive rate, coverage gaps)

This maps naturally to the **event-runner.ts** loop (poll-diff-dispatch), NOT the session-runner.ts loop.

---

## Question 4: What SHOULD their strategy look like?

These agents should use the **event loop** (event-runner.ts), not the session loop (session-runner.ts). Their "strategy" is:

### For defi-markets:
```yaml
name: defi-markets-monitor
description: "DeFi protocol monitoring — event-driven intelligence pipeline"
mode: event-loop  # NOT session-loop

sources:
  - id: defi:protocol-events
    pollIntervalMs: 60000  # 1 min for fast-moving DeFi data
    config:
      # What to monitor: DeFi Llama TVL, lending rates, etc.
      endpoints:
        - defillama-tvl
        - defillama-yields
        - coingecko-trending

handlers:
  - name: market-alert
    # Severity thresholds for when to escalate vs log
    thresholds:
      tvl_change_pct: 5.0    # Alert on >5% TVL change
      rate_change_bps: 50    # Alert on >50bps rate change

actions:
  # What to do with events
  log: true
  alert:
    critical: true   # Exploits, >20% TVL drops
    warning: false    # Degradations logged but not alerted
```

### For infra-ops:
```yaml
name: infra-ops-monitor
description: "Infrastructure health monitoring — status change detection"
mode: event-loop

sources:
  - id: infra:status-monitor
    pollIntervalMs: 30000  # 30s for health checks
    config:
      services:
        - demosnode.discus.sh
        - node2.demos.sh
        # Could add: RPC endpoints, bridge contracts, validator sets

handlers:
  - name: incident-alert

actions:
  log: true
  alert:
    critical: true   # Outages
    warning: true     # Degradations
```

### Key difference from sentinel's strategy:
- No phases (no AUDIT/SCAN/ENGAGE/GATE/PUBLISH/VERIFY/REVIEW/HARDEN)
- No attestation requirements
- No engagement model (no reactions, no replies)
- No publication constraints
- Event-driven, not cron-driven

---

## Question 5: What would sources-registry.yaml mean for a non-SuperColony agent?

For sentinel, `sources-registry.yaml` catalogs attestation-ready APIs — URLs that can be fed through DAHR or TLSN to produce verifiable attestations for posts. The registry tracks `tlsn_safe`, `dahr_safe`, `max_response_kb` because the attestation pipeline has strict size constraints.

For defi-markets and infra-ops, sources-registry.yaml would mean something different: **data feed configuration**. It would list:
- Which APIs to poll
- Poll frequency per source
- Response parsing configuration
- Severity thresholds for triggering events

However, this overlaps with the event source configuration. The `ProtocolEventSourceConfig` already takes a `fetchEvents` function — the data source is injected. A separate registry file might not be needed at all. Instead, the event source config (inside the strategy or a dedicated config) would specify where to get data.

**Recommendation:** Don't create sources-registry.yaml for these agents. The event source configs in the strategy file are sufficient. A sources-registry is an attestation-pipeline concept.

---

## Question 6: Are the persona.md files relevant if they don't post?

**Partially, but they need significant revision.**

What IS relevant:
- **Identity section** — the voice/tone/specialties define the agent's analytical lens (useful for LLM prompts that evaluate/classify events)
- **Anti-patterns** — what to avoid in analysis (speculation without data, vague qualifiers) applies even to internal logging
- **Severity levels** (infra-ops) — P0/P1/P2/P3 classification is core to the incident handler

What is NOT relevant:
- **Post format** (thesis-data-implication structure) — they don't post
- **Post guidelines by category** (OBSERVATION, ANALYSIS, PREDICTION, SIGNAL, ALERT) — these are SuperColony post categories
- **Tagging conventions** — SuperColony tags
- **Text length** ("Always exceed 200 characters for the long-text scoring bonus") — they don't get scored
- **Engagement philosophy** ("Score is a CONSTRAINT, not a goal") — they don't engage on SuperColony

The persona.md files should be rewritten to focus on:
- Event classification criteria
- Severity thresholds and escalation rules
- Domain-specific evaluation heuristics
- What constitutes a "signal" vs "noise" in their domain

---

## Recommended Actions

### 1. Rewrite AGENT.yaml for both agents
- Remove `skills: [supercolony]`
- Remove SuperColony-specific hardRules (attestation, post count, reactions)
- Remove predictionTracking (no posts to predict on)
- Update displayName (drop "SuperColony")
- Add event-loop specific configuration
- Change `strategy.ref` to point to an event-loop strategy, not a session-loop strategy

### 2. Create event-loop strategy files (NOT session-loop)
- Define poll sources, intervals, handlers, severity thresholds
- No 8-phase loop — these are continuous monitors
- Reference the existing event sources/handlers from WS3

### 3. Do NOT create sources-registry.yaml
- Attestation-pipeline concept that doesn't apply
- Data source configuration belongs in the event source config

### 4. Rewrite persona.md to focus on evaluation/classification
- Keep identity and domain expertise sections
- Replace post guidelines with event classification criteria
- Replace engagement philosophy with monitoring philosophy

### 5. Update persona.yaml
- Remove inheritance of SuperColony-specific base config fields (scan, engagement, tipping, gate, calibration, loop extensions)
- Keep topics (useful for keyword evaluation)
- Add event-loop-specific config (poll intervals, severity thresholds)

### 6. Consider: Do these agents even need their own persona-base.yaml inheritance?
- The current persona-base.yaml is entirely SuperColony-focused (scan modes, attestation, engagement, tipping, gate, calibration, loop extensions)
- These agents should either skip persona-base.yaml or have a separate event-agent-base.yaml

---

## Impact Assessment

### Files to modify:
| File | Action | Scope |
|------|--------|-------|
| `agents/defi-markets/AGENT.yaml` | Rewrite | Remove SC references, add event-loop config |
| `agents/defi-markets/persona.yaml` | Rewrite | Remove SC inheritance, add event config |
| `agents/defi-markets/persona.md` | Rewrite | Focus on evaluation/classification |
| `agents/infra-ops/AGENT.yaml` | Rewrite | Same as above |
| `agents/infra-ops/persona.yaml` | Rewrite | Same as above |
| `agents/infra-ops/persona.md` | Rewrite | Same as above |

### Files to NOT create:
| File | Reason |
|------|--------|
| `agents/defi-markets/strategy.yaml` (sentinel-style) | Wrong loop model |
| `agents/defi-markets/sources-registry.yaml` | Attestation concept, not applicable |
| `agents/infra-ops/strategy.yaml` (sentinel-style) | Wrong loop model |
| `agents/infra-ops/sources-registry.yaml` | Attestation concept, not applicable |

### Files to create:
| File | Purpose |
|------|---------|
| `agents/defi-markets/event-config.yaml` | Event source/handler configuration |
| `agents/infra-ops/event-config.yaml` | Event source/handler configuration |

### No code changes needed:
The TypeScript implementations (plugins, event sources, event handlers) are already correct — they are framework-agnostic intelligence components. The handlers already return `log_only` actions. The problem is purely in the YAML config/persona layer, which was written with SuperColony assumptions.
