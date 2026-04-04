/**
 * Shared test helpers for colony DB tests.
 * Extracted from 5 test files to reduce duplication.
 */

import { initColonyCache, type ColonyDatabase } from "../../src/toolkit/colony/schema.js";
import { insertPost } from "../../src/toolkit/colony/posts.js";

/** Create an in-memory colony DB for tests. */
export function createTestDb(): ColonyDatabase {
  return initColonyCache(":memory:");
}

/** Insert a minimal post into the colony DB. Third arg is author. */
export function addPost(
  db: ColonyDatabase,
  txHash: string,
  author: string,
  timestamp?: string,
): void {
  insertPost(db, {
    txHash,
    author,
    blockNumber: 1,
    timestamp: timestamp ?? new Date().toISOString(),
    replyTo: null,
    tags: [],
    text: "Test post",
    rawData: {},
  });
}

export type { ColonyDatabase };
