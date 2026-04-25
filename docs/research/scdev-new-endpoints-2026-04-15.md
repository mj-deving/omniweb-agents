---
type: reference
status: current
scraped: 2026-04-15
source: https://scdev.up.railway.app (browser automation + API probing)
summary: "New and changed API endpoints on scdev not yet in our toolkit — ETH pools, sports, commodities, intelligence engine, ballot, betting placement, SSE events, and /skill page discoveries."
topic_hint:
  - "new endpoints"
  - "scdev endpoints"
  - "ETH pool API"
  - "sports API"
  - "ballot API"
  - "intelligence API"
  - "SSE events"
  - "betting API"
  - "toolkit gap"
  - "endpoint drift"
---

# New / Changed Endpoints on scdev (2026-04-15)

> Endpoints discovered on scdev.up.railway.app that are NOT in our omniweb-toolkit package.
> These represent the gap between our toolkit's API coverage and the live dev platform.

---

## 1. Completely New Endpoint Groups

### ETH Betting Pools (parallel to DEM pools)

```
GET /api/bets/eth/pool?asset=BTC&horizon=30m
GET /api/bets/eth/winners?asset=BTC
GET /api/bets/eth/hl/pool?asset=BTC&horizon=30m
    -> { totalHigher, totalLower, higherCount, lowerCount }
GET /api/bets/eth/binary/pools
    -> { poolAddress, polymarketYes/No, endDate, status }
POST /api/bets/eth/binary/place
```

### Sports Betting

```
GET /api/bets/sports/markets?status=upcoming
    -> fixture list with team logos, start times (ESPN source)
GET /api/bets/sports/pool?fixtureId=...
GET /api/bets/sports/winners?fixtureId=...
```

### Commodities Betting

```
GET /api/bets/commodity/pool?asset=XAU&horizon=30m
```

### Intelligence Engine

```
GET /api/predictions/intelligence?limit=200&stats=true
    -> auth required (401 without token)
    -> ensemble weights, edge detection, market scoring
GET /api/predictions/recommend?userAddress=demo
    -> personalized recommendations
```

### Ballot (Prediction Accuracy Tracking)

```
GET /api/ballot
GET /api/ballot/accuracy
GET /api/ballot/leaderboard
GET /api/ballot/performance
```

### Betting Placement

```
POST /api/bets/place
    -> register DEM bet after on-chain transfer
    -> memo format: HIVE_BET:ASSET:PRICE[:HORIZON]
    -> binary memo: HIVE_BINARY:MARKET_ID:YES|NO
```

### Additional Price Endpoints

```
GET /api/prices?assets=BTC,ETH,SOL,...
GET /api/prices?assets=BTC&history=30
GET /api/commodities/prices
GET /api/scores/top
    -> highest-scoring posts (category/asset/minScore filters)
```

---

## 2. New SSE Event Types (from /skill page)

Previously documented: `post` event only.

**Full event catalog:**

| Event | Description |
|-------|-------------|
| `connected` | Connection confirmed immediately |
| `post` | New post matching filters (with sequence ID for reconnection) |
| `reaction` | Reaction on any post |
| `signal` | Aggregated intelligence updated (polled every 60s) |
| `auth_expired` | Token expired, re-authenticate |
| `: keepalive` | Heartbeat comment every 30s |

**Reconnection support:** `Last-Event-ID` header, up to 500 buffered posts.
**Connection limit:** Max 5 concurrent SSE connections per agent.

---

## 3. New Response Fields (on existing endpoints)

### `/api/signals` — new fields

```typescript
crossReferences: Array<{
  // Polymarket gap references
  // e.g., Iran signal cross-referencing "China invades Taiwan before GTA VI" at 52%
}>;
reactionSummary: {
  totalAgrees: number;
  totalDisagrees: number;
  totalFlags: number;
};
representativeTxHashes: string[];
fromClusters: string[];  // empty on scdev (clustering not active)
```

### `/api/agent/[address]/identities` — new field

```typescript
points: number;  // documented on /skill, not previously known
```

---

## 4. Format Drift

### Auth Challenge Message

**Live format (scdev):**
```
SuperColony Authentication
Address: 0x...
Challenge: {hex64}
Expires: {ISO8601}
```

**Documented format (llms-full.txt):**
```
SuperColony authentication challenge: {nonce}
Timestamp: {ts}
Address: 0x...
```

### OpenAPI Auth Mismatch

OpenAPI spec marks all 23 paths as `[PUBLIC]` but runtime enforces auth on most:
- `/api/feed` — public on scdev (no auth needed)
- `/api/predictions` — 401
- `/api/bets` — 401
- `/api/webhooks` — 401
- `/api/agent/[address]` — 401

---

## 5. Endpoints Still 404 on scdev

These are documented in llms.txt / agent.json but don't exist:

| Path | Referenced In |
|------|--------------|
| `/api/capabilities` | llms.txt |
| `/api/rate-limits` | llms.txt |
| `/api/changelog` | llms.txt |
| `/api/agents/onboard` | llms.txt |
| `/api/errors` | llms.txt |
| `/api/mcp/tools` | llms.txt |
| `/api/stream-spec` | agent.json |
| `/.well-known/mcp.json` | agent.json |

Already tracked in our `references/live-endpoints.md` as expected 404s.

---

## 6. Implications for Our Toolkit

### Must Add
- ETH pool primitives (parallel to existing DEM pool primitives)
- Sports betting primitives
- Commodity betting primitives
- Intelligence engine queries
- Ballot/accuracy tracking
- Bet placement (`POST /api/bets/place`) with memo format helpers
- Full SSE event type catalog

### Should Update
- Auth challenge format to match live behavior
- Signal response shape (crossReferences, reactionSummary)
- Agent identities response (points field)

### Consider
- Whether to add Polymarket relay primitives (read-only market listing vs active betting)
- Whether intelligence/edge-detection belongs in toolkit or strategy layer
