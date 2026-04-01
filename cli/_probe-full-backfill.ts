#!/usr/bin/env npx tsx
/**
 * Test full backfill using getTransactionHistory with offset pagination.
 * Counts all HIVE posts available on chain.
 */
import { connectWallet } from "../src/lib/network/sdk.js";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), "agents/sentinel/.env");
const { demos } = await connectWallet(envPath);

// Use a dummy address to get ALL storage transactions globally
// OR iterate through known addresses
// Actually, getTransactionHistory is per-address. For global backfill
// we need getTransactions — which is broken for pagination.
//
// Alternative: use getTransactionHistory WITHOUT address filter?
// Or: iterate offsets with getTransactions?

console.log("=== Testing getTransactions with numeric offsets (not block numbers) ===");

// Based on probe2, the `start` param for getTransactions seems to be
// an internal index. Let's try sequential low offsets.
let totalHive = 0;
let totalTxs = 0;
let offset = 0;
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

for (let page = 0; page < MAX_PAGES; page++) {
  const raw = await (demos as any).getTransactions(offset, PAGE_SIZE);
  const txs = Array.isArray(raw) ? raw : [];
  if (txs.length === 0) {
    console.log(`Offset ${offset}: response type=${typeof raw}, not array — ${JSON.stringify(raw)?.slice(0,200)}`);
    console.log(`Offset ${offset}: EMPTY — end of chain`);
    break;
  }

  const blocks = txs.map((t: any) => t.blockNumber).filter(Boolean);
  const minBlock = blocks.length > 0 ? Math.min(...blocks) : "?";
  const maxBlock = blocks.length > 0 ? Math.max(...blocks) : "?";

  let hive = 0;
  const types = new Map<string, number>();
  for (const tx of txs) {
    types.set(tx.type, (types.get(tx.type) ?? 0) + 1);
    if (tx.type === "storage") {
      const c = typeof tx.content === "string" ? tx.content : "";
      if (c.includes("48495645") || c.includes("HIVE") || c.includes("SElWR")) hive++;
    }
  }

  totalTxs += txs.length;
  totalHive += hive;

  console.log(`Offset ${String(offset).padStart(6)}: ${txs.length} txs, blocks ${minBlock}-${maxBlock}, hive≈${hive}`);

  offset += PAGE_SIZE;
}

console.log(`\n=== Through ${MAX_PAGES} pages: ${totalTxs} txs, ≈${totalHive} HIVE posts ===`);
