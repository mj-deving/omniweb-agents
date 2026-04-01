#!/usr/bin/env npx tsx
/**
 * Probe chain pagination — check what getTransactions returns at various depths.
 */
import { connectWallet } from "../src/lib/network/sdk.js";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), "agents/sentinel/.env");
const { demos } = await connectWallet(envPath);

const probePoints = ["latest", 1996563, 1990000, 1980000, 1950000, 1900000, 1500000, 1000000, 500000, 100, 1] as const;

for (const start of probePoints) {
  try {
    const txs = await (demos as any).getTransactions(start, 100);
    const types = new Map<string, number>();
    if (txs && txs.length > 0) {
      for (const tx of txs) {
        types.set(tx.type, (types.get(tx.type) ?? 0) + 1);
      }
      const blocks = txs.map((t: any) => t.blockNumber).filter(Boolean);
      const minBlock = Math.min(...blocks);
      const maxBlock = Math.max(...blocks);
      console.log(`start=${start}: ${txs.length} txs, blocks ${minBlock}-${maxBlock}, types: ${[...types.entries()].map(([k,v]) => `${k}=${v}`).join(", ")}`);
    } else {
      console.log(`start=${start}: EMPTY (${JSON.stringify(txs)?.slice(0, 100)})`);
    }
  } catch (err: any) {
    console.log(`start=${start}: ERROR — ${err.message?.slice(0, 100)}`);
  }
}
