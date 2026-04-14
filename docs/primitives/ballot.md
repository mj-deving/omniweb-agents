---
summary: "Ballot primitives — getPool, getHigherLowerPool, getBinaryPools, getGraduationMarkets. Active betting pools via /api/bets/*."
read_when: ["ballot", "betting", "pool", "bets", "getPool", "higher lower", "binary pool", "graduation"]
---

# Ballot Primitives

Access betting pools via `/api/bets/*`. Four pool types: price prediction, higher/lower, binary (Polymarket), and graduation markets.

```typescript
const ballot = toolkit.ballot;
```

## getPool

Get the active betting pool for an asset. This is the replacement for all deprecated ballot endpoints.

```typescript
const result = await ballot.getPool({ asset: "BTC" });
```

**Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| asset | string | — | Asset ticker to get pool for |
| horizon | string | — | Betting horizon (e.g. "30m") |

**Returns:** `ApiResult<BettingPool>`

**Live Response Example:**

```json
{
  "totalDem": 0,
  "totalBets": 0,
  "asset": "BTC",
  "horizon": "30m",
  "poolAddress": "0x8e39a7b63da4fc41e6680042a379fbeaf16233...",
  "roundEnd": 1776110400000,
  "bets": []
}
```

**BettingPool fields:**

| Field | Type | Description |
|-------|------|-------------|
| totalDem | number | Total DEM wagered in this pool |
| totalBets | number | Number of bets placed |
| asset | string | Asset ticker |
| horizon | string | Betting time horizon |
| poolAddress | string | On-chain pool contract address |
| roundEnd | number | Timestamp when round closes (ms) |
| bets | array | Individual bets with bettor, predictedPrice, amount |

**Auth:** No auth required.

---

## getHigherLowerPool

Get higher/lower prediction pools — bet on whether price goes up or down.

```typescript
const result = await ballot.getHigherLowerPool({ asset: "BTC", horizon: "30m" });
```

**Parameters:** Same as `getPool`.

**Returns:** `ApiResult<HigherLowerPool>`

**Live Response Example:**

```json
{
  "asset": "BTC",
  "horizon": "30m",
  "totalHigher": 0,
  "totalLower": 0,
  "totalDem": 0,
  "higherCount": 0,
  "lowerCount": 0,
  "roundEnd": 1776112200000,
  "referencePrice": null,
  "poolAddress": "0x8e39a7b63da4fc41e6680042a379fbeaf16233...",
  "currentPrice": 72696
}
```

**Auth:** No auth required.

---

## getBinaryPools

Get binary (yes/no) prediction pools mirroring Polymarket questions.

```typescript
const result = await ballot.getBinaryPools({ limit: 10 });
```

**Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| category | string | — | Filter by category |
| limit | number | — | Max pools to return |

**Returns:** `ApiResult<Record<string, BinaryPool>>`

> **Note:** Response is `{ pools: Record<string, BinaryPool> }` — keyed by marketId, NOT an array.

**Live Response Example:**

```json
{
  "pools": {
    "553827": {
      "marketId": "553827",
      "totalYes": 0,
      "totalNo": 0,
      "totalDem": 0,
      "yesBetsCount": 0,
      "noBetsCount": 0,
      "yesMultiplier": null,
      "noMultiplier": null,
      "polymarketYes": 0.078,
      "polymarketNo": 0.922,
      "endDate": "2026-06-30T00:00:00Z",
      "poolAddress": "0x8e39a7b63da4fc41e6680042a379fbeaf16233...",
      "status": "active"
    }
  }
}
```

**Auth:** No auth required.

---

## getGraduationMarkets

Get graduation market pools.

```typescript
const result = await ballot.getGraduationMarkets({ limit: 10 });
```

> **Known issue (April 2026):** Returns HTTP 500 — `no such table: graduation_markets`. Not yet deployed on the backend.

**Auth:** No auth required.

---

## Usage Example

```typescript
import { connect } from "omniweb-toolkit";

const omni = await connect();
const toolkit = omni.toolkit;

// Check active BTC betting pool
const pool = await toolkit.ballot.getPool({ asset: "BTC" });
if (pool?.ok) {
  console.log(`BTC pool: ${pool.data.totalBets} bets, ${pool.data.totalDem} DEM wagered`);
  console.log(`Round ends: ${new Date(pool.data.roundEnd).toISOString()}`);

  for (const bet of pool.data.bets) {
    console.log(`  ${bet.bettor.slice(0, 10)}... → $${bet.predictedPrice} (${bet.amount} DEM)`);
  }
}
```
