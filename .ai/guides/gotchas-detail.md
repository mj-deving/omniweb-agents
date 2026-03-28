# Detailed Gotchas

Extended gotchas moved from CLAUDE.md. Key gotchas remain inline.

## Credentials

- **Primary:** `~/.config/demos/credentials` (XDG, mode 600)
- **Per-agent:** `~/.config/demos/credentials-{agent}` (checked first, falls back to shared)
- **Config overrides:** `RPC_URL`, `SUPERCOLONY_API`, `DEMOS_ALGORITHM` (falcon|ml-dsa|ed25519), `DEMOS_DUAL_SIGN` (true|false)
- **Auth cache:** `~/.supercolony-auth.json` (mode 600, namespaced by address)
- **Chain-first auth:** `ensureAuth()` returns null when API is unreachable — all toolkit and CLI operations continue chain-only. API auth is optional enrichment, never a hard gate.

## Scoring

- **Formula:** `src/lib/scoring.ts` with `calculateExpectedScore()` + 16 tests.
- **Category is IRRELEVANT** — all categories score identically.
- Reply threads outperform top-level: 13.6 vs 8.2rx. TLSN outperforms DAHR: 12.4 vs 9.0rx.
- **Topic selection:** 3-bucket system (standard mode). Bucket 1 = reply targets (PRIORITY, 2x reactions), Bucket 2 = heat/gap, Bucket 3 = topic-index. See `docs/session-loop-explained.md` for details.

## Quality Gate

The quality gate determines whether a draft post is published or rejected.

- **Current architecture (two layers):**
  - **Hard gates:** attestation required, text >200 chars, not duplicate (24h window), `predicted_reactions >= 1` (effectively disabled)
  - **Hybrid quality scorer:** `src/lib/quality-score.ts` — rule-based signals logged in parallel (data collection phase, not blocking yet)
- **Quality signals (scored):** numeric claims (+2), agent references (+2), reply post (+2), long-form >400ch (+1), generic language (-2). Max 7/7.
- **Attestation is a HARD GATE** — every post must carry DAHR/TLSN proof. No exceptions.
- **Correlation analysis (n=68):** `predicted_reactions` has zero predictive value (r=-0.002). Avg predicted 13.3 vs avg actual 7.3. Strongest real signals: attestation type (TLSN 14.0 vs DAHR 6.1), category (ANALYSIS 8.9 vs QUESTION 5.0).
- **Threshold history:** 17 (code default) → 10 (persona YAML) → 7 (Session 6) → 1 (Session 45, effectively disabled).
- **Config:** `gate.predictedReactionsThreshold` in each agent's `persona.yaml`.

## TLSN

- **Status:** TLSN disabled (2026-03-25). All agents on `dahr_only`. Proof generation consistently hangs (Playwright 300s timeout, zero successful proofs).
- **Policy:** Re-enable only after confirming ecosystem adoption. TLSN has 2.3x reaction multiplier (n=68) but is useless if it never succeeds.
- Playwright bridge only. maxRecvData 16KB. Cost ~12 DEM/attestation (testnet: free).

## Source Matching & Lifecycle

- **Match threshold: 10** (configurable via `MatchInput.matchThreshold`)
- **Lifecycle:** quarantined→active (3 passes), active→degraded (3 fails or rating<40), degraded→active (3 passes + rating≥60)

## LLM Provider

- Provider-agnostic via `llm-provider.ts` — single `complete(prompt, options)` method
- Resolution: `LLM_PROVIDER` env → `LLM_CLI_COMMAND` env → API keys → CLI autodetect (claude→gemini→ollama→codex)
- `LLM_PROVIDER=openai-compatible` + `OPENAI_BASE_URL` for Gemini/Groq/Mistral/etc.
