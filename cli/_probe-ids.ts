#!/usr/bin/env npx tsx
/**
 * Probe transaction id field — understand forward vs backward pagination.
 */
import { connectWallet } from "../src/lib/network/sdk.js";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), "agents/sentinel/.env");
const { demos } = await connectWallet(envPath);

// Get latest page and examine id values
console.log("=== Latest 5 txs ===");
const latest = await (demos as any).getTransactions("latest", 5);
if (Array.isArray(latest)) {
  for (const tx of latest) {
    console.log(`  id=${tx.id} block=${tx.blockNumber} type=${tx.type} hash=${tx.hash?.slice(0,12)}`);
  }
  const ids = latest.map((t: any) => t.id);
  const minId = Math.min(...ids);
  const maxId = Math.max(...ids);
  console.log(`  id range: ${minId}-${maxId}`);

  // Try getting the page BEFORE this one using min_id
  console.log(`\n=== Previous page: start=${minId - 5}, limit=5 ===`);
  const prev = await (demos as any).getTransactions(minId - 5, 5);
  if (Array.isArray(prev)) {
    for (const tx of prev) {
      console.log(`  id=${tx.id} block=${tx.blockNumber} type=${tx.type}`);
    }
  }

  // And forward from start=1
  console.log(`\n=== First 5 txs (start=1) ===`);
  const first = await (demos as any).getTransactions(1, 5);
  if (Array.isArray(first)) {
    for (const tx of first) {
      console.log(`  id=${tx.id} block=${tx.blockNumber} type=${tx.type}`);
    }
  }

  // Forward page 2
  console.log(`\n=== Forward page 2 (start=6, limit=5) ===`);
  const page2 = await (demos as any).getTransactions(6, 5);
  if (Array.isArray(page2)) {
    for (const tx of page2) {
      console.log(`  id=${tx.id} block=${tx.blockNumber} type=${tx.type}`);
    }
  }
}
