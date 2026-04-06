#!/usr/bin/env npx tsx
/**
 * Run API backfill to fill colony DB sync gaps.
 * Usage: npx tsx cli/run-api-backfill.ts [--limit N]
 */

import { SuperColonyApiClient } from "../src/toolkit/supercolony/api-client.js";
import { backfillFromApi } from "../src/toolkit/colony/api-backfill.js";
import { loadAuthCache } from "../src/lib/auth/auth.js";
import { initColonyCache } from "../src/toolkit/colony/schema.js";
import { homedir } from "os";
import { join } from "path";

async function main(): Promise<void> {
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : 17000;

  const dbPath = join(homedir(), ".sentinel/colony/cache.db");
  const db = initColonyCache(dbPath);
  const cached = loadAuthCache();

  const apiClient = new SuperColonyApiClient({
    getToken: async () => cached?.token ?? null,
  });

  console.log(`Starting API backfill (limit: ${limit})...`);
  const start = Date.now();

  const stats = await backfillFromApi(db, apiClient, {
    limit,
    batchSize: 100,
    onProgress: (s) => {
      if (s.pages % 10 === 0) {
        console.log(`  Page ${s.pages}: ${s.fetched} fetched, ${s.inserted} inserted, ${s.duplicates} duplicates`);
      }
    },
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nBackfill complete in ${elapsed}s: ${stats.fetched} fetched, ${stats.inserted} inserted, ${stats.duplicates} duplicates, ${stats.pages} pages`);
  db.close();
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
