#!/usr/bin/env npx tsx
/**
 * Backfill vector embeddings for all colony posts.
 *
 * Usage: npx tsx cli/backfill-embeddings.ts [--batch-size 200] [--db-path ~/.sentinel/colony/cache.db]
 */

import { resolve } from "node:path";
import { homedir } from "node:os";
import { initColonyCache } from "../src/toolkit/colony/schema.js";
import { backfillEmbeddings } from "../src/toolkit/colony/search.js";

const args = process.argv.slice(2);
let batchSize = 200;
let dbPath = resolve(homedir(), ".sentinel/colony/cache.db");

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--batch-size" && args[i + 1]) {
    batchSize = Number.parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === "--db-path" && args[i + 1]) {
    dbPath = args[i + 1];
    i++;
  }
}

const observe = (type: string, msg: string, meta?: Record<string, unknown>) => {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [${type}] ${msg}`, meta ? JSON.stringify(meta) : "");
};

console.log(`Backfilling embeddings from ${dbPath} (batch size: ${batchSize})`);
const start = Date.now();

const db = initColonyCache(dbPath);
const result = await backfillEmbeddings(db, { batchSize, observe });

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`\nDone in ${elapsed}s: ${result.embedded} embedded, ${result.skipped} skipped, ${result.failed} failed`);

db.close();
