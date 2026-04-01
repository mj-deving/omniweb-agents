#!/usr/bin/env npx tsx
/**
 * Probe getTransactionHistory — per-address pagination.
 */
import { connectWallet } from "../src/lib/network/sdk.js";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), "agents/sentinel/.env");
const { demos, address } = await connectWallet(envPath);

console.log("Our address:", address);

// Check if getTransactionHistory exists
const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(demos));
console.log("SDK methods:", methods.filter(m => m.toLowerCase().includes("transaction") || m.toLowerCase().includes("history")).join(", "));

// Try getTransactionHistory with various params
for (const type of [undefined, "storage"]) {
  for (const limit of [10, 100]) {
    try {
      const txs = await (demos as any).getTransactionHistory(address, type, { limit });
      if (txs && txs.length > 0) {
        const blocks = txs.map((t: any) => t.blockNumber ?? t.content?.blockNumber).filter(Boolean);
        console.log(`history(addr, type=${type}, limit=${limit}): ${txs.length} txs, blocks ${Math.min(...blocks)}-${Math.max(...blocks)}`);
      } else {
        console.log(`history(addr, type=${type}, limit=${limit}): ${txs?.length ?? "null"} txs`);
      }
    } catch (err: any) {
      console.log(`history(addr, type=${type}, limit=${limit}): ERROR — ${err.message?.slice(0, 100)}`);
    }
  }
}

// Also try with a known prolific author
const prolificAuthor = "0x490473c0a40337a123492d69a412fb5dae4b90f615f96737041c4fe3eb2f05d6";
try {
  const txs = await (demos as any).getTransactionHistory(prolificAuthor, "storage", { limit: 100 });
  if (txs && txs.length > 0) {
    console.log(`\nProlific author (25 posts): history returned ${txs.length} txs`);
    const blocks = txs.map((t: any) => t.blockNumber ?? t.content?.blockNumber).filter(Boolean);
    if (blocks.length > 0) console.log(`  blocks ${Math.min(...blocks)}-${Math.max(...blocks)}`);
  } else {
    console.log(`\nProlific author: ${txs?.length ?? "null"} txs`);
  }
} catch (err: any) {
  console.log(`\nProlific author: ERROR — ${err.message?.slice(0, 100)}`);
}

// Try different start values with getTransactionHistory
console.log("\n=== Pagination with getTransactionHistory ===");
for (const startVal of ["latest", 0, 100, 1000, undefined]) {
  try {
    const txs = await (demos as any).getTransactionHistory(prolificAuthor, "storage", { start: startVal, limit: 50 });
    if (txs && txs.length > 0) {
      const blocks = txs.map((t: any) => t.blockNumber).filter(Boolean);
      console.log(`start=${String(startVal).padStart(7)}: ${txs.length} txs, blocks ${Math.min(...blocks)}-${Math.max(...blocks)}`);
    } else {
      console.log(`start=${String(startVal).padStart(7)}: empty`);
    }
  } catch (err: any) {
    console.log(`start=${String(startVal).padStart(7)}: ERROR — ${err.message?.slice(0, 60)}`);
  }
}
