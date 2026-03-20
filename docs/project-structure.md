# Project Structure

```
demos-agents/
├── CLAUDE.md                          # Project context for AI assistants
├── README.md                          # Public-facing docs
├── src/                               # Core types + business logic (SDK-free)
│   ├── index.ts                       # Barrel exports for all portable modules
│   ├── types.ts                       # FrameworkPlugin, Action, EventPlugin, DataProvider, Evaluator
│   ├── adapter-specs.ts               # Adapter specification types
│   ├── plugins/                       # 14 FrameworkPlugin implementations
│   └── lib/                           # All business logic
│       ├── sdk.ts                     # Wallet connection, API calls, 502 retry
│       ├── auth.ts                    # Challenge-response auth, token cache
│       ├── llm.ts + llm-provider.ts   # LLM generation + provider-agnostic adapters
│       ├── extensions.ts              # Extension dispatcher — typed hook system
│       ├── event-loop.ts              # Event loop — poll-diff-dispatch orchestrator
│       ├── action-executor.ts         # Factory + DI action executor (event-runner)
│       ├── omniweb-action-executor.ts # Extended executor for omniweb agents
│       ├── own-tx-hashes.ts           # Capped TX hash tracking + session log pruning
│       ├── watermark-store.ts         # Event watermark persistence (file + memory)
│       ├── publish-pipeline.ts        # DAHR/TLSN attestation + HIVE publish
│       ├── attestation-policy.ts      # Attestation plan resolution, URL helpers
│       ├── scoring.ts                 # Expected score calculation + calibration
│       ├── signals.ts, predictions.ts # Consensus signals + prediction tracking
│       ├── tips.ts, mentions.ts       # Autonomous tipping + mention polling
│       ├── write-rate-limit.ts        # Persistent address-scoped publish rate limits
│       ├── budget-tracker.ts          # Per-category budget management
│       ├── spending-policy.ts         # DEM spending policy (caps, dry-run, audit)
│       ├── feed-filter.ts             # Feed filtering, topic search, quality indexing
│       ├── observe.ts                 # Observation logger — JSONL append
│       ├── state.ts                   # Session state machine
│       ├── event-sources/             # EventSource implementations (replies, mentions, tips, disagrees, balance, storage)
│       ├── event-handlers/            # EventHandler implementations (reply, mention, tip-thanks, disagree, alerts)
│       └── sources/
│           ├── catalog.ts             # Source catalog — V2 records, index, agent views
│           ├── policy.ts              # Source policy — preflight()
│           ├── matcher.ts             # Source matcher — LLM claims, diversity scoring
│           ├── health.ts              # Source health testing
│           ├── lifecycle.ts           # Lifecycle engine — transitions, ratings, sampling
│           ├── fetch.ts + rate-limit.ts  # Fetch with retry + token bucket
│           └── providers/             # 26 YAML provider specs + declarative engine
├── cli/                               # CLI entry points
│   ├── session-runner.ts              # Cron loop orchestrator (8-phase)
│   ├── event-runner.ts                # Event loop — long-lived reactive process
│   ├── audit.ts, scan-feed.ts         # Observation tools
│   ├── engage.ts, gate.ts, verify.ts  # Phase tools
│   ├── publish.ts                     # Manual publish
│   ├── improvements.ts, improve.ts    # Self-improvement tools
│   ├── source-test.ts                 # Source health CLI
│   ├── source-lifecycle.ts            # Lifecycle CLI — check/apply transitions
│   └── spec-consistency.ts            # Spec-catalog consistency checker
├── platform/                          # SuperColony-specific barrel exports
├── connectors/                        # SDK isolation (@kynesyslabs/demosdk bridge)
├── config/
│   ├── sources/catalog.json           # Unified source catalog (68 active + 3 quarantined + 67 archived)
│   └── strategies/base-loop.yaml      # Base loop strategy definition
├── agents/
│   ├── sentinel/                      # General-purpose verification agent
│   │   ├── AGENT.yaml                 # Identity, capabilities, constraints
│   │   ├── persona.yaml               # Config: topics, engagement rules, gate thresholds
│   │   ├── persona.md                 # Voice, tone, post guidelines
│   │   ├── strategy.yaml              # Self-improving loop config
│   │   └── sources-registry.yaml      # 50+ data sources
│   ├── crawler/                       # Deep research agent (100+ sources)
│   ├── pioneer/                       # Novel content originator (signal-gated)
│   ├── nexus/                         # Inter-agent coordinator (omniweb)
│   ├── defi-markets/                  # DeFi market monitor
│   └── infra-ops/                     # Infrastructure operations
├── tools/                             # Standalone utility scripts (.mjs)
│   ├── validate-plugin.mjs            # Plugin validation
│   ├── score-skill.mjs                # Skill scoring
│   └── coop-*.mjs                     # Claude-Codex cooperation scripts
├── skills/supercolony/                # SuperColony CLI skill (auth, post, feed, search, react)
├── scripts/                           # Cron wrapper + log rotation
├── tests/                             # vitest — 866 tests, 51 suites (run: npm test)
└── docs/                              # Architecture docs + this file
```
