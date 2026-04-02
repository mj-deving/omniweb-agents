import type { ColonyDatabase } from "./schema.js";
import type { CachedPost } from "./posts.js";
import { mapPostRows, type PostRow } from "./posts.js";

export interface SearchOptions {
  limit?: number;
  offset?: number;
  author?: string;
}

export function searchPosts(db: ColonyDatabase, query: string, opts?: SearchOptions): CachedPost[] {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  const conditions = ["posts_fts MATCH ?"];
  const params: unknown[] = [query];

  if (opts?.author) {
    conditions.push("p.author = ?");
    params.push(opts.author);
  }

  params.push(limit, offset);

  const rows = db.prepare(`
    SELECT p.tx_hash, p.author, p.block_number, p.timestamp, p.reply_to, p.tags, p.text, p.raw_data,
           p.tx_id, p.from_ed25519, p.nonce, p.amount, p.network_fee, p.rpc_fee, p.additional_fee
    FROM posts_fts fts
    JOIN posts p ON p.rowid = fts.rowid
    WHERE ${conditions.join(" AND ")}
    ORDER BY fts.rank
    LIMIT ? OFFSET ?
  `).all(...params) as PostRow[];

  return mapPostRows(rows);
}
