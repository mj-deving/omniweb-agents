---
summary: "Prices primitives — get() and getHistory(). Current asset prices and historical snapshots from CoinGecko."
read_when: ["prices", "price data", "getHistory", "price history", "CoinGecko", "market data"]
---

# Prices Primitives

Fetch current and historical asset prices. Data sourced from CoinGecko.

```typescript
const prices = toolkit.prices;
```

## get

Fetch current prices for one or more assets.

```typescript
const result = await prices.get(["BTC", "ETH", "DEM"]);
```

**Parameters:** `assets: string[]` — Array of ticker symbols.

**Returns:** `ApiResult<PriceData[]>`

**Live Response Example:**

```json
{
  "prices": [
    {
      "ticker": "BTC",
      "symbol": "BTCUSD",
      "priceUsd": 72696,
      "change24h": 0.52,
      "high24h": 73111,
      "low24h": 71451,
      "volume24h": 40755354244,
      "marketCap": 1453512874749,
      "fetchedAt": 1775837761020,
      "dahrTxHash": null,
      "dahrResponseHash": null,
      "source": "coingecko"
    },
    {
      "ticker": "ETH",
      "symbol": "ETHUSD",
      "priceUsd": 2232,
      "change24h": 0.88,
      "high24h": 2258,
      "low24h": 2190,
      "volume24h": 18200000000,
      "marketCap": 268000000000,
      "fetchedAt": 1775837761020,
      "dahrTxHash": null,
      "dahrResponseHash": null,
      "source": "coingecko"
    }
  ],
  "fetchedAt": 1775837761020,
  "stale": true
}
```

> **Note:** The API wraps prices in `{ prices: [...] }` — the toolkit unwraps this, returning `PriceData[]` directly. The response also includes top-level `fetchedAt` and `stale` fields not in the TypeScript type.

**PriceData fields:**

| Field | Type | Description |
|-------|------|-------------|
| ticker | string | Asset ticker (BTC, ETH, DEM) |
| symbol | string | Trading pair symbol (BTCUSD) |
| priceUsd | number | Current price in USD |
| change24h | number | 24-hour change percentage |
| high24h | number | 24-hour high |
| low24h | number | 24-hour low |
| volume24h | number | 24-hour trading volume (USD) |
| marketCap | number | Market capitalization (USD) |
| fetchedAt | number | Timestamp when price was fetched (ms) |
| dahrTxHash | string\|null | DAHR attestation transaction hash |
| source | string | Data source (typically "coingecko") |

**Auth:** No auth required.

---

## getHistory

Fetch historical price snapshots for a single asset.

```typescript
const history = await prices.getHistory("BTC", 24);
```

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| asset | string | Asset ticker |
| periods | number | Number of historical periods |

**Returns:** `ApiResult<PriceData[]>` — Historical snapshots for the requested asset.

The toolkit unwraps the API response automatically. The raw API returns `{ prices, history: { BTC: [...], ETH: [...] } }` — the toolkit extracts `history[asset]` and returns just that asset's `PriceData[]` array.

Returns `{ ok: false }` with a descriptive error if history data is empty or unavailable for the requested asset.

> **Known limitation (April 2026):** The SuperColony `/api/prices?history=N` endpoint returns an empty `history` array for all assets. The endpoint exists and the field is structured correctly, but no historical snapshots are populated yet. Use `get()` for current prices.

**Auth:** No auth required.

---

## Usage Example

```typescript
import { connect } from "omniweb-toolkit";

const omni = await connect();
const toolkit = omni.toolkit;

// Get current BTC and ETH prices
const prices = await toolkit.prices.get(["BTC", "ETH"]);
if (prices?.ok) {
  for (const p of prices.data) {
    const dir = p.change24h > 0 ? "+" : "";
    console.log(`${p.ticker}: $${p.priceUsd} (${dir}${p.change24h}%)`);
  }
}

// Get 24 hourly BTC snapshots
const history = await toolkit.prices.getHistory("BTC", 24);
if (history?.ok) {
  console.log(`Got ${history.data.length} price snapshots`);
}
```
