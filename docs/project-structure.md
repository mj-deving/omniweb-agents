# Project Structure

```
demos-agents/
├── CLAUDE.md                          # Project context for AI assistants
├── README.md                          # Public-facing docs
├── core/                              # Portable framework core (SDK-free)
│   ├── index.ts                       # Barrel exports for all portable modules
│   ├── types.ts                       # FrameworkPlugin, Action, EventPlugin, DataProvider, Evaluator
│   └── plugins/                       # 7 FrameworkPlugin implementations
├── platform/                          # SuperColony-specific barrel exports
├── connectors/                        # SDK isolation (@kynesyslabs/demosdk bridge)
├── packages/core/                     # Publishable npm package (@demos/agent-core)
├── agents/
│   ├── sentinel/                      # General-purpose verification agent
│   │   ├── AGENT.yaml                 # Identity, capabilities, constraints
│   │   ├── persona.yaml               # Config: topics, engagement rules, gate thresholds
│   │   ├── persona.md                 # Voice, tone, post guidelines
│   │   ├── strategy.yaml              # Self-improving loop config
│   │   └── sources-registry.yaml      # 50+ data sources
│   ├── crawler/                       # Deep research agent (100+ sources)
│   └── pioneer/                       # Novel content originator (signal-gated)
├── tools/
│   ├── session-runner.ts              # Cron loop orchestrator (SENSE→ACT→CONFIRM)
│   ├── event-runner.ts                # Event loop — long-lived reactive process (systemd/pm2)
│   ├── audit.ts, room-temp.ts, engage.ts, gate.ts, verify.ts  # Phase tools
│   ├── session-report.ts, improvements.ts, improve.ts         # Observation tools
│   ├── source-test.ts                 # Source health CLI
│   ├── source-lifecycle.ts            # Lifecycle CLI — check/apply transitions
│   ├── spec-consistency.ts            # Spec-catalog consistency checker
│   └── lib/
│       ├── sdk.ts                     # Wallet connection, API calls, 502 retry
│       ├── auth.ts                    # Challenge-response auth, token cache
│       ├── llm.ts + llm-provider.ts   # LLM generation + provider-agnostic adapters
│       ├── extensions.ts              # Extension dispatcher — typed hook system (session-scoped)
│       ├── event-loop.ts              # Event loop — poll-diff-dispatch orchestrator
│       ├── watermark-store.ts         # Event watermark persistence (file + memory)
│       ├── improvement-utils.ts       # Dedup, EMA calibration, age-out
│       ├── publish-pipeline.ts        # DAHR/TLSN attestation + HIVE publish
│       ├── attestation-policy.ts      # Attestation plan resolution, URL helpers
│       ├── signals.ts, predictions.ts # Consensus signals + prediction tracking
│       ├── tips.ts, mentions.ts       # Autonomous tipping + mention polling
│       ├── write-rate-limit.ts        # Persistent address-scoped publish rate limits
│       ├── spending-policy.ts         # DEM spending policy (caps, dry-run, audit)
│       ├── feed-filter.ts             # Feed filtering, topic search, quality indexing
│       ├── observe.ts                 # Observation logger — JSONL append
│       ├── state.ts                   # Session state machine
│       ├── event-sources/             # EventSource implementations (replies, mentions, tips, disagrees)
│       ├── event-handlers/            # EventHandler implementations (reply, mention, tip-thanks, disagree)
│       └── sources/
│           ├── catalog.ts             # Source catalog — V2 records, index, agent views
│           ├── policy.ts              # Source policy — preflight()
│           ├── matcher.ts             # Source matcher — LLM claims, diversity scoring
│           ├── health.ts              # Source health testing
│           ├── lifecycle.ts           # Lifecycle engine — transitions, ratings, sampling
│           ├── fetch.ts + rate-limit.ts  # Fetch with retry + token bucket
│           └── providers/             # 26 YAML provider specs + declarative engine
├── sources/
│   └── catalog.json                   # Unified source catalog (68 active + 3 quarantined + 67 archived)
├── skills/supercolony/                # SuperColony CLI skill (auth, post, feed, search, react)
├── scripts/                           # Cron wrapper + log rotation
├── tests/                             # vitest — 615 tests, 36 suites (run: npm test)
├── profiles/                          # Generated agent profiles
└── docs/                              # Architecture docs + this file
```
