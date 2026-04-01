#!/usr/bin/env npx tsx
/**
 * Final pagination probe — understand the actual SDK contract.
 */
import { connectWallet } from "../src/lib/network/sdk.js";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), "agents/sentinel/.env");
const { demos } = await connectWallet(envPath);

// What does "latest" return and what can we learn about subsequent pages?
console.log("=== Page 1 from 'latest' ===");
const page1 = await (demos as any).getTransactions("latest", 5);
if (Array.isArray(page1)) {
  for (const tx of page1) {
    console.log(`  block=${tx.blockNumber} hash=${tx.hash?.slice(0,16)} type=${tx.type} keys=${Object.keys(tx).join(",")}`);
  }
} else {
  console.log(`  non-array: ${typeof page1} — ${JSON.stringify(page1)?.slice(0,200)}`);
}

// Now check the SDK source for getTransactions signature
console.log("\n=== SDK method signatures ===");
const proto = Object.getPrototypeOf(demos);
const desc = Object.getOwnPropertyDescriptor(proto, "getTransactions");
if (desc?.value) {
  console.log(`getTransactions: ${desc.value.toString().slice(0, 300)}`);
}

// Try various parameter combinations
console.log("\n=== Parameter experiments ===");
const experiments = [
  ["latest", 5],
  ["latest", 100],
  [undefined, 100],
  [null, 100],
  [1, 5],
  [2, 5],
  [3, 5],
  [10, 5],
  [50, 5],
  [100, 5],
  [200, 5],
  [500, 5],
  [1000, 5],
  [2000, 5],
] as const;

for (const [start, limit] of experiments) {
  try {
    const raw = await (demos as any).getTransactions(start, limit);
    const txs = Array.isArray(raw) ? raw : [];
    if (txs.length > 0) {
      const blocks = txs.map((t: any) => t.blockNumber).filter(Boolean);
      const min = blocks.length > 0 ? Math.min(...blocks) : "?";
      const max = blocks.length > 0 ? Math.max(...blocks) : "?";
      console.log(`  (${String(start).padStart(7)}, ${limit}): ${txs.length} txs, blocks ${min}-${max}`);
    } else {
      console.log(`  (${String(start).padStart(7)}, ${limit}): empty/error (${typeof raw}: ${JSON.stringify(raw)?.slice(0,50)})`);
    }
  } catch (err: any) {
    console.log(`  (${String(start).padStart(7)}, ${limit}): THROW — ${err.message?.slice(0,60)}`);
  }
}
