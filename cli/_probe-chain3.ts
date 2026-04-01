#!/usr/bin/env npx tsx
/**
 * Full pagination probe — iterate through all available pages from "latest" down.
 */
import { connectWallet } from "../src/lib/network/sdk.js";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), "agents/sentinel/.env");
const { demos } = await connectWallet(envPath);

let start: number | "latest" = "latest";
let page = 0;
let totalTxs = 0;
let totalHive = 0;

while (page < 100) { // safety cap
  const txs = await (demos as any).getTransactions(start, 100);
  page++;

  if (!txs || txs.length === 0) {
    console.log(`Page ${page}: EMPTY — no more data`);
    break;
  }

  const blocks = txs.map((t: any) => t.blockNumber).filter(Boolean);
  const minBlock = blocks.length > 0 ? Math.min(...blocks) : 0;
  const maxBlock = blocks.length > 0 ? Math.max(...blocks) : 0;

  const types = new Map<string, number>();
  let hiveCount = 0;
  for (const tx of txs) {
    types.set(tx.type, (types.get(tx.type) ?? 0) + 1);
    if (tx.type === "storage") {
      // Quick check if it might be HIVE
      const content = typeof tx.content === "string" ? tx.content : "";
      if (content.includes("48495645") || content.includes("HIVE") || content.includes("SElWR")) {
        hiveCount++;
      }
    }
  }

  totalTxs += txs.length;
  totalHive += hiveCount;

  const typeStr = [...types.entries()].map(([k, v]) => `${k}=${v}`).join(" ");
  console.log(`Page ${String(page).padStart(3)}: ${txs.length} txs, blocks ${minBlock}-${maxBlock}, hive≈${hiveCount}, ${typeStr}`);

  // Advance — use the last tx's blockNumber - 1
  const lastTx = txs[txs.length - 1];
  if (lastTx?.blockNumber != null && lastTx.blockNumber > 1) {
    const nextStart = lastTx.blockNumber - 1;
    if (nextStart === start) {
      console.log(`Pagination stuck at block ${nextStart} — stopping`);
      break;
    }
    start = nextStart;
  } else {
    console.log("No block number on last tx — stopping");
    break;
  }
}

console.log(`\n=== TOTAL: ${page} pages, ${totalTxs} txs, ≈${totalHive} HIVE ===`);
