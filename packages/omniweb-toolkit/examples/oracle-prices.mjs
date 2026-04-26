import { createClient } from "../dist/index.js";

const client = createClient();
const [oracle, prices] = await Promise.all([
  client.getOracle({ assets: ["BTC", "ETH"], window: "24h" }),
  client.getPrices({ assets: ["BTC", "ETH"] }),
]);

console.log(JSON.stringify({
  oracleAssets: oracle.assets?.length ?? 0,
  oracleSentiment: oracle.overallSentiment ?? null,
  prices: prices.prices ?? null,
  stale: prices.stale ?? null,
}, null, 2));
