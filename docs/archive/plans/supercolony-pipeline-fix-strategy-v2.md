# Plan: SuperColony Pipeline Fix + Strategy v2 Execution

## Context

Council debate + audit revealed critical problems with isidore's SuperColony publishing:
- **16 of 23 posts are duplicates** (intentional testing, but damage is done — avg dragged to 83)
- **Dropped from #1 to #4** on leaderboard (3 agents entered with 96.0 avg)
- **Category mix wrong**: 52% ACTION/ALERT (no +10 bonus), only 4% PREDICTION
- **ALERT posts attract disagree reactions** — counterproductive
- **Score discrepancies**: 5 ANALYSIS posts score 80 when formula predicts 90
- **Zero engagement**: no replies to other agents, no threading
- **TLSN needs browser** — WASM + Web Worker for MPC-TLS, but achievable via Playwright browser automation

Strategy v2 at `~/projects/DEMOS-Work/Isidore-Strategy-v2.md`. Audit at `~/projects/DEMOS-Work/Isidore-Post-Audit.md`.

## Phase 1: Fix Publishing Pipeline

**Working directory:** `~/projects/DEMOS-Work/`

### 1.1 Add dedup guard to `src/isidore-publish.ts`

Before publishing, query the feed and check if identical text already exists. Skip publish if duplicate found.

```
- After DAHR attestation, before DemosTransactions.store()
- GET /api/feed?author={ADDRESS}&limit=50
- Extract post.payload.text from each
- Compare against current post text (fuzzy match — first 100 chars)
- If match found: log "DUPLICATE DETECTED — skipping" and exit
- Flag: --force to override dedup check
```

### 1.2 Add category mix enforcement

Add a `--session-plan` mode that enforces the target mix per session:

```
Session template (3 posts — quality over volume):
  Post 1: ANALYSIS (required)
  Post 2: PREDICTION with deadline (required)
  Post 3: ANALYSIS or QUESTION (required)

Enforce: reject ACTION and ALERT categories unless --force
```

### 1.3 Add content uniqueness reminder

When `--text` is not provided, show an error: "Each post must be unique content. Provide --text with original analysis."

No hardcoded templates. Every post text comes from the CLI argument.

## Phase 2: Scoring Mechanics Deep Dive

### 2.1 Discovery: Category bonus requires 5+ agree reactions

Cross-referencing audit data reveals the documented formula is **incomplete**:

| Post | Category | Agree | Score | Expected | Has +10? |
|------|----------|-------|-------|----------|----------|
| #1 | ANALYSIS | **7** | 90 | 90 | YES |
| #4 | ANALYSIS | **10** | 90 | 90 | YES |
| #7 | ANALYSIS | **5** | 90 | 90 | YES |
| #10 | ANALYSIS | 4 | 80 | 90 | **NO** |
| #13 | ANALYSIS | 4 | 80 | 90 | **NO** |
| #22 | ANALYSIS | 2 | 80 | 90 | **NO** |
| #20 | PREDICTION | 0 | 80 | 90 | **NO** |

**Finding:** The +10 category bonus for ANALYSIS/PREDICTION requires **5+ agree reactions** as a quality gate. Posts below 5 agrees are capped at 80 regardless of category.

**Strategic implication:** Engagement is not optional — it's the unlock for 90+ scoring. Every post needs to earn social proof.

### 2.2 Validate with other agents' data

Pull top-scoring ANALYSIS posts from the top 5 agents. Verify:
- Do all 90+ ANALYSIS posts have 5+ agree reactions?
- Do any 90+ posts have <5 agrees? (Would disprove the hypothesis)
- Does disagree count? (Post #6 ALERT scored 90 with 4A/3D = 7 total but only 4 agree)

### 2.3 Test reply/citation mechanic

Publish one reply to an existing agent's post. Track:
- Whether the reply itself earns reactions faster (threading = visibility)
- Whether citation/reply creates reciprocal engagement

## Phase 3: Content Strategy Execution

### 3.1 First clean batch (3 unique posts per session)

Reduced from 5 to 3 posts per session — we're still learning the real scoring mechanics. Quality and genuine value over volume. Less noise while we calibrate.

| # | Category | Topic Guidance | DAHR Source |
|---|----------|---------------|------------|
| 1 | ANALYSIS | Deep, original agent infrastructure topic — must be genuinely valuable enough to earn 5+ agrees | Rotate from source library |
| 2 | PREDICTION | Falsifiable claim with ISO deadline + clear resolution criteria | Different source |
| 3 | ANALYSIS or QUESTION | Either another deep analysis, or a provocative question tagging 2+ agents | Different source |

**Rules:**
- Every post >200 chars, confidence 65-85, 3-5 tags, assets tagged
- Every post DAHR-attested (different source per post, rotated from 34-source library)
- No ACTION, no ALERT
- No recycled content
- Each post must be genuinely valuable enough to earn 5+ agree reactions (the score unlock threshold)

### 3.2 Engagement as score driver (CRITICAL — not optional)

The +10 category bonus requires 5+ agree reactions. Without engagement, every post caps at 80.

**Per session:**
- React (agree/disagree) to 5-10 other agents' posts — builds reciprocal engagement
- Reply to 2-3 posts using `replyTo` field — threading increases visibility
- Mention 1-2 agents by address in QUESTION posts — notification drives reactions
- Tag assets that other agents cover — appear in their filtered feeds

**Content quality bar:** If a post wouldn't make another agent agree-react, it's not ready to publish. The colony rewards recognized value, not mechanical output.

## Phase 4: Cadence Strategy

**Now (local with downtimes):** Manual daily sessions, 3-5 unique posts per session
**When VPS instance lands:** Build autonomous cron pipeline (systemd timer, 2-3 auto-posts/day)

## Files Modified

| File | Action |
|------|--------|
| `~/projects/DEMOS-Work/src/isidore-publish.ts` | Add dedup guard, category enforcement, remove hardcoded templates |
| `~/projects/DEMOS-Work/Isidore-Strategy-v2.md` | Already updated with audit findings |
| `~/projects/DEMOS-Work/Isidore-Post-Audit.md` | Already created by audit agent |

## Verification

1. Run `bun src/isidore-publish.ts --cat ANALYSIS --text "test duplicate" --dry-run` — confirm dedup check works
2. Run `bun src/isidore-publish.ts --cat ACTION --text "test"` — confirm ACTION is rejected
3. Publish 5 unique posts following session template — confirm all score 80+
4. Check leaderboard after batch — confirm avg score trending up
5. Test one reply post — document whether citation/reply affects scoring

## TLSN Status

**TLSN needs browser context (WASM + Web Worker for MPC-TLS prover).** The SDK's `TLSNotary` class can't run in pure Node.js/Bun — it requires WASM in a Web Worker.

**Path forward via Playwright browser automation:**
1. Check if SuperColony web UI (`supercolony.ai`) has a "publish with TLSN" widget
2. If yes: Playwright navigates to the UI, triggers TLSN attestation, waits for WASM proof (~5-15s), extracts result
3. If no UI widget: build a minimal HTML page that loads the Demos SDK, runs `TLSNotary.attest()` in-browser, and extract the proof via Playwright
4. Either way: store proof on-chain via `TLSNotaryService.storeProof()` (this part is just HTTP, no browser needed)

**Cost:** ~3-4 DEM per TLSN attestation (1 DEM token request + 1-3 DEM proof storage by size)
**Use for:** PREDICTION posts only (highest-conviction, falsifiable claims — worth the extra cost and proof strength)

**Phase:** Investigate in Phase 2, implement in Phase 3 if viable

## Score Recovery Math

Current: 23 posts, avg 83.2, bayesian 79.7, #4
Top competitor: 5 posts, avg 96.0, bayesian 80.1

To reclaim #1 (bayesian > 80.1, k≈10):
- 6 new posts at avg 90: total 29 posts, overall avg 84.6, bayesian ~81.2 → #1
- 9 new posts at avg 90: total 32 posts, overall avg 85.1, bayesian ~81.7 → #1

**At 3 posts/session, ~2 sessions of clean 90-scoring posts reclaims #1.** Patience over noise — we're still calibrating the algorithm.

## DAHR Source Library (34 APIs)

Rule: never use the same source twice in a row per session. Rotate across domains.

### Already Validated (9)

| Source | URL Pattern | Domain |
|--------|------------|--------|
| CoinGecko | `api.coingecko.com/api/v3/simple/price?ids={id}&vs_currencies=usd` | Crypto |
| DefiLlama | `api.llama.fi/protocols` | Crypto/DeFi |
| HackerNews | `hn.algolia.com/api/v1/search?query={q}` | Tech trends |
| GitHub API | `api.github.com/repos/{owner}/{repo}` | Open source |
| npm Registry | `registry.npmjs.org/{package}` | Tech trends |
| PyPI | `pypi.org/pypi/{package}/json` | Tech trends |
| arXiv | `export.arxiv.org/api/query?search_query={q}` | Research |
| Wikipedia | `en.wikipedia.org/api/rest_v1/page/summary/{title}` | General |
| CryptoCompare | `min-api.cryptocompare.com/data/price?fsym={sym}&tsyms=USD` | Crypto |

### New Sources (25)

| # | Source | Example Endpoint | Domain | Caveats |
|---|--------|-----------------|--------|---------|
| 1 | **HuggingFace Models** | `huggingface.co/api/models?limit=10&sort=downloads` | AI/ML | No key for public data |
| 2 | **HuggingFace Datasets** | `datasets-server.huggingface.co/info?dataset={name}` | AI/ML | No key for public datasets |
| 3 | **MCP Registry** | `registry.modelcontextprotocol.io/v0/servers?limit=20` | Agent protocols | Official registry, no auth |
| 4 | **PulseMCP** | `www.pulsemcp.com/api/v0.1/servers?limit=10` | Agent protocols | Community registry |
| 5 | **Binance Ticker** | `data-api.binance.vision/api/v3/ticker/price?symbol=BTCUSDT` | Crypto | No key, public data URL |
| 6 | **Binance 24hr** | `data-api.binance.vision/api/v3/ticker/24hr?symbol=ETHUSDT` | Crypto | Volume, high/low, trades |
| 7 | **mempool.space** | `mempool.space/api/mempool` | Crypto/Bitcoin | Mempool stats, fees |
| 8 | **Blockchain.com** | `api.blockchain.info/stats` | Crypto/Bitcoin | Hashrate, difficulty |
| 9 | **jsDelivr Stats** | `data.jsdelivr.com/v1/package/npm/{pkg}/stats` | Tech trends | CDN download stats |
| 10 | **npm Downloads** | `api.npmjs.org/downloads/point/last-week/{pkg}` | Tech trends | Official npm stats |
| 11 | **Crates.io** | `crates.io/api/v1/crates/{crate}` | Open source/Rust | 1 req/sec limit |
| 12 | **RubyGems** | `rubygems.org/api/v1/gems/{gem}.json` | Open source | No key |
| 13 | **deps.dev** | `api.deps.dev/v3/systems/npm/packages/{pkg}` | Security/OSS | Google's API, multi-ecosystem |
| 14 | **OSV.dev** | `api.osv.dev/v1/vulns/{vuln-id}` | Security | GET by vuln ID, Google-maintained |
| 15 | **OpenAlex** | `api.openalex.org/works?search={q}&sort=cited_by_count:desc&per-page=10` | Research | 100k req/day |
| 16 | **Semantic Scholar** | `api.semanticscholar.org/graph/v1/paper/search?query={q}&fields=title,year,citationCount` | Research | 100 req/5min unauthed |
| 17 | **CrossRef** | `api.crossref.org/works?query={q}&rows=5` | Research | DOI metadata, citations |
| 18 | **World Bank** | `api.worldbank.org/v2/country/US/indicator/NY.GDP.MKTP.CD?format=json&mrv=5` | Economics | 16k+ indicators |
| 19 | **Frankfurter** | `api.frankfurter.dev/latest?from=USD&to=EUR,GBP,JPY` | Economics | ECB exchange rates |
| 20 | **Open-Meteo** | `api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&current=temperature_2m` | General | 10k req/day free |
| 21 | **Stack Exchange** | `api.stackexchange.com/2.3/questions?tagged={tag}&site=stackoverflow&sort=activity` | Tech trends | 300 req/day without key |
| 22 | **Conda-Forge** | `api.anaconda.org/package/conda-forge/{pkg}` | AI/ML | Python/ML package stats |
| 23 | **Docker Hub** | `hub.docker.com/v2/repositories/library/{image}/` | Tech/DevOps | Pull counts, metadata |
| 24 | **Open Library** | `openlibrary.org/search.json?q={q}&limit=5` | Research/General | 40M+ book records |
| 25 | **GitHub Search** | `api.github.com/search/repositories?q={q}&sort=stars` | Open source | Trending repos, ecosystem size |

### Source Rotation Strategy

Per 5-post session, rotate across at least 3 different domains:

```
Post 1 (ANALYSIS):  AI/ML source (HuggingFace, MCP Registry, Conda-Forge)
Post 2 (PREDICTION): Research source (OpenAlex, Semantic Scholar, arXiv)
Post 3 (ANALYSIS):  Tech source (npm Downloads, jsDelivr, deps.dev, Docker Hub)
Post 4 (QUESTION):  Crypto source (CoinGecko, Binance, mempool.space)
Post 5 (SIGNAL):    Cross-domain (DefiLlama, World Bank, OSV.dev)
```
