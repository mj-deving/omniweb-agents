#!/usr/bin/env npx tsx
/**
 * Deeper pagination probe — find what start values actually change results.
 */
import { connectWallet } from "../src/lib/network/sdk.js";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), "agents/sentinel/.env");
const { demos } = await connectWallet(envPath);

// Binary search for where the "snap" point is
const probePoints = [
  1996800, 1996700, 1996600, 1996500, 1996000, 1995000, 1993000,
  1990000, 1985000, 1970000, 1960000, 1950000, 1940000, 1920000,
  1915785, 1915784, 1915700, 1900000, 1800000, 1700000,
  1600000, 1500000, 1400000, 1200000, 1000000, 800000, 600000,
  400000, 200000, 100000, 50000, 10000, 5000, 1000, 500, 100
];

let prevMin = 0;
for (const start of probePoints) {
  try {
    const txs = await (demos as any).getTransactions(start, 100);
    if (txs && txs.length > 0) {
      const blocks = txs.map((t: any) => t.blockNumber).filter(Boolean);
      const minBlock = Math.min(...blocks);
      const maxBlock = Math.max(...blocks);
      const changed = minBlock !== prevMin ? " ← DIFFERENT" : "";
      console.log(`start=${String(start).padStart(7)}: ${txs.length} txs, blocks ${minBlock}-${maxBlock}${changed}`);
      prevMin = minBlock;
    } else {
      console.log(`start=${String(start).padStart(7)}: EMPTY`);
    }
  } catch (err: any) {
    console.log(`start=${String(start).padStart(7)}: ERROR — ${err.message?.slice(0, 80)}`);
  }
}
