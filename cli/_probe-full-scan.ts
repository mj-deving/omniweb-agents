#!/usr/bin/env npx tsx
/**
 * Full chain scan using correct offset pagination.
 * start = transaction index (1-based), increment by limit.
 */
import { connectWallet } from "../src/lib/network/sdk.js";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), "agents/sentinel/.env");
const { demos } = await connectWallet(envPath);

let start = 1;
const PAGE_SIZE = 100;
let totalTxs = 0;
let totalStorage = 0;
let totalHive = 0;
let page = 0;
let lastBlock = 0;

while (true) {
  const raw = await (demos as any).getTransactions(start, PAGE_SIZE);
  const txs = Array.isArray(raw) ? raw : [];
  page++;

  if (txs.length === 0) break;

  let pageHive = 0;
  let pageStorage = 0;
  for (const tx of txs) {
    if (tx.type === "storage") {
      pageStorage++;
      const c = typeof tx.content === "string" ? tx.content : "";
      if (c.includes("48495645") || c.includes("HIVE") || c.includes("SElWR")) pageHive++;
    }
    if (tx.blockNumber > lastBlock) lastBlock = tx.blockNumber;
  }

  totalTxs += txs.length;
  totalStorage += pageStorage;
  totalHive += pageHive;

  const blocks = txs.map((t: any) => t.blockNumber).filter(Boolean);
  const minB = Math.min(...blocks);
  const maxB = Math.max(...blocks);

  if (page % 10 === 0 || page <= 3) {
    console.log(`Page ${String(page).padStart(4)}: offset=${start}, ${txs.length} txs, blocks ${minB}-${maxB}, storage=${pageStorage}, hive≈${pageHive} (running: ${totalHive} hive / ${totalTxs} total)`);
  }

  start += txs.length;

  // Safety cap
  if (page >= 500) {
    console.log("Safety cap at 500 pages");
    break;
  }
}

console.log(`\n=== COMPLETE ===`);
console.log(`Pages: ${page}`);
console.log(`Total transactions: ${totalTxs}`);
console.log(`Storage transactions: ${totalStorage}`);
console.log(`HIVE posts (approx): ${totalHive}`);
console.log(`Latest block seen: ${lastBlock}`);
console.log(`Tx index range: 1 - ${start - 1}`);
