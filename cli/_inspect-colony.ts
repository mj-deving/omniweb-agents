#!/usr/bin/env npx tsx
/**
 * Temporary inspection script — dump colony DB contents.
 */
import { initColonyCache } from "../src/toolkit/colony/schema.js";
import { resolve } from "node:path";
import { homedir } from "node:os";

const db = initColonyCache(resolve(homedir(), ".sentinel/colony/cache.db"));

interface CountRow { c: number }
interface MetaRow { key: string; value: string }
interface BlockRangeRow { min_block: number; max_block: number }
interface PostSummaryRow { tx_hash: string; author: string; block_number: number; timestamp: string; text_len: number; tags: string; reply_to: string | null }
interface AuthorRow { author: string; cnt: number }

const postCount = db.prepare("SELECT COUNT(*) as c FROM posts").get() as CountRow;
const reactionCount = db.prepare("SELECT COUNT(*) as c FROM reaction_cache").get() as CountRow;
const deadLetterCount = db.prepare("SELECT COUNT(*) as c FROM dead_letters").get() as CountRow;
const sourceCount = db.prepare("SELECT COUNT(*) as c FROM source_response_cache").get() as CountRow;
const claimCount = db.prepare("SELECT COUNT(*) as c FROM claim_ledger").get() as CountRow;
const attestCount = db.prepare("SELECT COUNT(*) as c FROM attestations").get() as CountRow;

console.log("=== Colony DB Summary ===");
console.log("Posts:", postCount.c);
console.log("Reactions:", reactionCount.c);
console.log("Dead letters:", deadLetterCount.c);
console.log("Source cache:", sourceCount.c);
console.log("Claims:", claimCount.c);
console.log("Attestations:", attestCount.c);

const meta = db.prepare("SELECT key, value FROM _meta").all() as MetaRow[];
console.log("\n=== Meta ===");
for (const row of meta) console.log(`  ${row.key}: ${row.value}`);

const blockRange = db.prepare("SELECT MIN(block_number) as min_block, MAX(block_number) as max_block FROM posts").get() as BlockRangeRow;
console.log("\n=== Block Range ===");
console.log("  Min block:", blockRange.min_block);
console.log("  Max block:", blockRange.max_block);

console.log("\n=== All Posts ===");
const posts = db.prepare("SELECT tx_hash, author, block_number, timestamp, LENGTH(text) as text_len, tags, reply_to FROM posts ORDER BY block_number DESC").all() as PostSummaryRow[];
for (const p of posts) {
  console.log(`  [${p.block_number}] ${p.tx_hash.slice(0, 16)}... author=${p.author.slice(0, 20)}... text=${p.text_len}ch tags=${p.tags} reply=${p.reply_to ? p.reply_to.slice(0, 16) + "..." : "null"}`);
}

const authors = db.prepare("SELECT author, COUNT(*) as cnt FROM posts GROUP BY author ORDER BY cnt DESC").all() as AuthorRow[];
console.log("\n=== Authors ===");
for (const a of authors) console.log(`  ${a.author}: ${a.cnt} posts`);

db.close();
