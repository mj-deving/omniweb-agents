import type { ColonyDatabase } from "./schema.js";


export interface CachedPost {
  txHash: string;
  author: string;
  blockNumber: number;
  timestamp: string;
  replyTo: string | null;
  tags: string[];
  text: string;
  rawData: Record<string, unknown>;
  /** Global transaction index from SDK RawTransaction.id */
  txId?: number;
  /** Ed25519 address of the sender */
  fromEd25519?: string;
  /** Transaction nonce */
  nonce?: number;
  /** Transfer amount (DEM) */
  amount?: number;
  /** Network fee */
  networkFee?: number;
  /** RPC fee */
  rpcFee?: number;
  /** Additional fee */
  additionalFee?: number;
}

export interface PostRow {
  tx_hash: string;
  author: string;
  block_number: number;
  timestamp: string;
  reply_to: string | null;
  tags: string;
  text: string;
  raw_data: string;
  tx_id: number | null;
  from_ed25519: string | null;
  nonce: number | null;
  amount: number | null;
  network_fee: number | null;
  rpc_fee: number | null;
  additional_fee: number | null;
}

function mapPostRow(row: PostRow | undefined): CachedPost | null {
  if (!row) {
    return null;
  }

  return {
    txHash: row.tx_hash,
    author: row.author,
    blockNumber: row.block_number,
    timestamp: row.timestamp,
    replyTo: row.reply_to,
    tags: JSON.parse(row.tags) as string[],
    text: row.text,
    rawData: JSON.parse(row.raw_data) as Record<string, unknown>,
    txId: row.tx_id ?? undefined,
    fromEd25519: row.from_ed25519 ?? undefined,
    nonce: row.nonce ?? undefined,
    amount: row.amount ?? undefined,
    networkFee: row.network_fee ?? undefined,
    rpcFee: row.rpc_fee ?? undefined,
    additionalFee: row.additional_fee ?? undefined,
  };
}

export function mapPostRows(rows: PostRow[]): CachedPost[] {
  return rows.map((row) => mapPostRow(row)).filter((row): row is CachedPost => row !== null);
}

export function insertPost(db: ColonyDatabase, post: CachedPost): void {
  db.prepare(`
    INSERT INTO posts (
      tx_hash, author, block_number, timestamp, reply_to, tags, text, raw_data,
      tx_id, from_ed25519, nonce, amount, network_fee, rpc_fee, additional_fee
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(tx_hash) DO UPDATE SET
      author = excluded.author,
      block_number = excluded.block_number,
      timestamp = excluded.timestamp,
      reply_to = excluded.reply_to,
      tags = excluded.tags,
      text = excluded.text,
      raw_data = excluded.raw_data,
      tx_id = COALESCE(excluded.tx_id, posts.tx_id),
      from_ed25519 = COALESCE(excluded.from_ed25519, posts.from_ed25519),
      nonce = COALESCE(excluded.nonce, posts.nonce),
      amount = COALESCE(excluded.amount, posts.amount),
      network_fee = COALESCE(excluded.network_fee, posts.network_fee),
      rpc_fee = COALESCE(excluded.rpc_fee, posts.rpc_fee),
      additional_fee = COALESCE(excluded.additional_fee, posts.additional_fee)
  `).run(
    post.txHash,
    post.author,
    post.blockNumber,
    post.timestamp,
    post.replyTo,
    JSON.stringify(post.tags),
    post.text,
    JSON.stringify(post.rawData),
    post.txId ?? null,
    post.fromEd25519 ?? null,
    post.nonce ?? null,
    post.amount ?? null,
    post.networkFee ?? null,
    post.rpcFee ?? null,
    post.additionalFee ?? null,
  );
}

export function getPost(db: ColonyDatabase, txHash: string): CachedPost | null {
  const row = db.prepare(`
    SELECT tx_hash, author, block_number, timestamp, reply_to, tags, text, raw_data,
             tx_id, from_ed25519, nonce, amount, network_fee, rpc_fee, additional_fee
    FROM posts
    WHERE tx_hash = ?
  `).get(txHash) as PostRow | undefined;

  return mapPostRow(row);
}

export function getPostsByAuthor(db: ColonyDatabase, author: string, limit?: number): CachedPost[] {
  const query = limit === undefined
    ? `
      SELECT tx_hash, author, block_number, timestamp, reply_to, tags, text, raw_data,
             tx_id, from_ed25519, nonce, amount, network_fee, rpc_fee, additional_fee
      FROM posts
      WHERE author = ?
      ORDER BY block_number DESC, timestamp DESC
    `
    : `
      SELECT tx_hash, author, block_number, timestamp, reply_to, tags, text, raw_data,
             tx_id, from_ed25519, nonce, amount, network_fee, rpc_fee, additional_fee
      FROM posts
      WHERE author = ?
      ORDER BY block_number DESC, timestamp DESC
      LIMIT ?
    `;

  const rows = (limit === undefined
    ? db.prepare(query).all(author)
    : db.prepare(query).all(author, limit)) as PostRow[];

  return mapPostRows(rows);
}

export function getRecentPosts(db: ColonyDatabase, since: string, limit?: number): CachedPost[] {
  const query = limit === undefined
    ? `
      SELECT tx_hash, author, block_number, timestamp, reply_to, tags, text, raw_data,
             tx_id, from_ed25519, nonce, amount, network_fee, rpc_fee, additional_fee
      FROM posts
      WHERE timestamp >= ?
      ORDER BY timestamp DESC, block_number DESC
    `
    : `
      SELECT tx_hash, author, block_number, timestamp, reply_to, tags, text, raw_data,
             tx_id, from_ed25519, nonce, amount, network_fee, rpc_fee, additional_fee
      FROM posts
      WHERE timestamp >= ?
      ORDER BY timestamp DESC, block_number DESC
      LIMIT ?
    `;

  const rows = (limit === undefined
    ? db.prepare(query).all(since)
    : db.prepare(query).all(since, limit)) as PostRow[];

  return mapPostRows(rows);
}

export function getRepliesTo(db: ColonyDatabase, parentTxHash: string): CachedPost[] {
  const rows = db.prepare(`
    SELECT tx_hash, author, block_number, timestamp, reply_to, tags, text, raw_data,
             tx_id, from_ed25519, nonce, amount, network_fee, rpc_fee, additional_fee
    FROM posts
    WHERE reply_to = ?
    ORDER BY block_number ASC, timestamp ASC
  `).all(parentTxHash) as PostRow[];

  return mapPostRows(rows);
}

export function countPosts(db: ColonyDatabase): number {
  return Number(db.prepare("SELECT COUNT(*) FROM posts").pluck().get());
}

/**
 * Prune old posts that are not referenced by any other table.
 * Preserves posts referenced by claim_ledger, attestations, interactions,
 * hive_reactions (target_tx_hash), bet_tracking, or other posts (as parent).
 */
export function prunePosts(
  db: ColonyDatabase,
  options: { retentionDays: number; dryRun?: boolean },
): { pruned: number; preserved: number } {
  const cutoff = new Date(Date.now() - options.retentionDays * 86_400_000).toISOString();

  // Find old posts not referenced anywhere (includes our_tx_hash from interactions)
  const orphanRows = db.prepare(`
    SELECT p.rowid AS rid, p.tx_hash
    FROM posts p
    WHERE p.timestamp < ?
      AND p.tx_hash NOT IN (SELECT post_tx_hash FROM claim_ledger)
      AND p.tx_hash NOT IN (SELECT post_tx_hash FROM attestations)
      AND p.tx_hash NOT IN (SELECT our_tx_hash FROM interactions)
      AND p.tx_hash NOT IN (SELECT COALESCE(their_tx_hash, '') FROM interactions)
      AND p.tx_hash NOT IN (SELECT target_tx_hash FROM hive_reactions)
      AND p.tx_hash NOT IN (SELECT post_tx_hash FROM bet_tracking)
      AND p.tx_hash NOT IN (SELECT reply_to FROM posts WHERE reply_to IS NOT NULL)
  `).all(cutoff) as Array<{ rid: number; tx_hash: string }>;

  const total = Number(
    db.prepare("SELECT COUNT(*) FROM posts WHERE timestamp < ?").pluck().get(cutoff),
  );

  if (options.dryRun) {
    return { pruned: orphanRows.length, preserved: total - orphanRows.length };
  }

  if (orphanRows.length === 0) {
    return { pruned: 0, preserved: total };
  }

  // Use a temp table to avoid SQLite parameter limit (SQLITE_MAX_VARIABLE_NUMBER)
  const doPrune = db.transaction(() => {
    db.exec(`CREATE TEMP TABLE IF NOT EXISTS _prune_targets (rid INTEGER, tx_hash TEXT)`);
    db.exec(`DELETE FROM _prune_targets`);
    const ins = db.prepare(`INSERT INTO _prune_targets VALUES (?, ?)`);
    for (const r of orphanRows) ins.run(r.rid, r.tx_hash);

    // Delete embeddings for pruned posts
    db.exec(`DELETE FROM post_embeddings WHERE post_rowid IN (SELECT rid FROM _prune_targets)`);

    // Try to delete from vec_posts (may not be loaded)
    try {
      db.exec(`DELETE FROM vec_posts WHERE rowid IN (SELECT rid FROM _prune_targets)`);
    } catch {
      // vec0 extension not loaded — skip
    }

    // Delete orphaned reaction_cache entries
    db.exec(`DELETE FROM reaction_cache WHERE post_tx_hash IN (SELECT tx_hash FROM _prune_targets)`);

    // Delete the posts (FTS5 triggers auto-clean)
    db.exec(`DELETE FROM posts WHERE tx_hash IN (SELECT tx_hash FROM _prune_targets)`);

    db.exec(`DROP TABLE _prune_targets`);
  });
  doPrune();

  return { pruned: orphanRows.length, preserved: total - orphanRows.length };
}
