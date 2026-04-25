---
topic_hint:
  - "implementing semantic search"
  - "embedding models"
  - "sqlite-vec"
  - "vector search"
  - "Phase 5.6"
summary: Local embedding model evaluation and sqlite-vec integration guide for Phase 5.6 semantic search
---

# Local Embedding Model + sqlite-vec Research

> Research for Phase 5.6 semantic search. Evaluated 2026-04-03.

## Recommendation Summary

| Component | Choice | Reasoning |
|-----------|--------|-----------|
| **Embedding package** | `@huggingface/transformers` (v3/v4) | Active maintenance, large ecosystem, ONNX runtime, no Python |
| **Embedding model** | `Xenova/bge-small-en-v1.5` | 384-dim, ~33MB quantized, better MTEB than MiniLM, 512 token context |
| **Vector storage** | `sqlite-vec` via `better-sqlite3` | Project already uses better-sqlite3; sqlite-vec.load() is compatible |
| **Hybrid search** | FTS5 + vec0 with Reciprocal Rank Fusion | Rank-based fusion avoids score normalization problems |

---

## 1. Embedding Model Comparison

### Option A: `@huggingface/transformers` (RECOMMENDED)

**Package:** `@huggingface/transformers` (formerly `@xenova/transformers`)
**Runtime:** ONNX Runtime via `onnxruntime-node`
**Python dependency:** None
**Status:** Actively maintained (v4.0.0 released March 2025, v3.x stable)

**Supported models (384-dim):**

| Model | Size (quantized) | Size (fp32) | MTEB Avg | Max Tokens | Notes |
|-------|-------------------|-------------|----------|------------|-------|
| `Xenova/all-MiniLM-L6-v2` | ~23MB (q8) | ~80MB | ~56 | 256 | Fast, older, lower quality |
| `Xenova/bge-small-en-v1.5` | ~33MB (q8) | ~120MB | ~62 | 512 | Better retrieval, newer training |

**Why bge-small-en-v1.5 over all-MiniLM-L6-v2:**
- Higher MTEB retrieval scores (~6 points better)
- 512 token context vs 256 (colony posts can exceed 256 tokens)
- Trained with contrastive learning specifically for retrieval tasks
- Same 384 dimensions, comparable inference speed
- Still well under the 200MB ideal size target (33MB quantized)

**Usage:**

```typescript
import { pipeline } from "@huggingface/transformers";

// First call downloads + caches the model (~33MB quantized)
const embedder = await pipeline("feature-extraction", "Xenova/bge-small-en-v1.5", {
  // Use quantized model for speed + smaller size
  dtype: "q8",           // 8-bit quantization
  device: "cpu",         // No GPU needed
});

// Embed a single text — returns nested array
const output = await embedder("colony post text here", {
  pooling: "mean",       // Mean pooling over tokens
  normalize: true,       // L2 normalize for cosine similarity
});

// Extract the flat Float32Array
const embedding: number[] = Array.from(output.data);
// embedding.length === 384
```

**Performance (CPU, quantized q8):**
- Cold start (first load): ~2-4 seconds (model loading + ONNX init)
- Warm inference: ~15-25ms per short text (50-500 chars)
- Batch of 10: ~100-150ms total

**Caching strategy:** The pipeline caches the model to `~/.cache/huggingface/` on first use. Subsequent startups load from disk in ~500ms.

### Option B: `fastembed` (NOT RECOMMENDED)

**Package:** `fastembed` on npm
**Status:** ARCHIVED (January 15, 2026) -- read-only, no future updates
**Runtime:** ONNX via `@pykeio/ort`
**Python dependency:** None

**Supported 384-dim models:** `BGESmallENV15` (default), `AllMiniLML6V2`

```typescript
import { EmbeddingModel, FlagEmbedding } from "fastembed";

const model = await FlagEmbedding.init({
  model: EmbeddingModel.BGESmallENV15,
});

// Returns AsyncGenerator of batches
const embeddings = model.embed(["text here"], 1);
for await (const batch of embeddings) {
  // batch[0] is number[] of length 384
}
```

**Why not recommended:**
- Repository archived January 2026 -- no bug fixes, no security patches
- Depends on `@pykeio/ort` which has its own maintenance concerns
- Smaller ecosystem, less documentation
- No quantization options (always fp32, larger download)

### Option C: Other alternatives evaluated

| Package | Verdict | Reason |
|---------|---------|--------|
| `embeddings.js` | Not recommended | Thin wrapper, limited models, small community |
| `@mastra/fastembed` | Not recommended | Wraps archived fastembed |
| Raw `onnxruntime-node` | Viable fallback | Manual tokenization needed, no pipeline abstraction |
| `model2vec` | Watch list | 50x smaller, 500x faster, but no JS package yet |

---

## 2. sqlite-vec Integration

### Loading sqlite-vec with better-sqlite3

The project already uses `better-sqlite3` (vendored). sqlite-vec's `load()` function is directly compatible.

**Install:**

```bash
npm install sqlite-vec
```

**Load:**

```typescript
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";

const db = new Database("/path/to/colony/cache.db");
sqliteVec.load(db);

// Verify
const { vec_version } = db.prepare("SELECT vec_version() as vec_version").get() as { vec_version: string };
console.log(`sqlite-vec ${vec_version} loaded`);
```

### node:sqlite alternative (NOT recommended for this project)

While `node:sqlite` (Node 22.13+) supports `loadExtension`, the project already uses better-sqlite3 extensively. Migrating would be a large refactor with no clear benefit. The `node:sqlite` module is still Stability 1.1 (experimental).

```typescript
// For reference only -- DO NOT use in this project
import { DatabaseSync } from "node:sqlite";
import * as sqliteVec from "sqlite-vec";

const db = new DatabaseSync(":memory:", { allowExtension: true });
sqliteVec.load(db);
```

---

## 3. vec0 Virtual Table Schema

### Table creation

```sql
-- Vector table for colony post embeddings
CREATE VIRTUAL TABLE IF NOT EXISTS vec_posts USING vec0(
  post_id INTEGER PRIMARY KEY,
  embedding float[384]
);
```

**Key constraints:**
- `post_id` maps to the rowid of the posts table (or the txHash-based lookup)
- `float[384]` matches bge-small-en-v1.5 output dimensions
- vec0 stores vectors in a shadow table, not in the main posts table
- Supports `int8[384]` for 4x storage savings (with slight quality loss)

### Inserting embeddings

```typescript
const insertVec = db.prepare(
  "INSERT INTO vec_posts(post_id, embedding) VALUES (?, ?)"
);

// embedding is number[] from the model
const buffer = new Float32Array(embedding);
insertVec.run(postId, buffer);

// Batch insert in a transaction
const insertMany = db.transaction((items: Array<{ id: number; vec: number[] }>) => {
  for (const item of items) {
    insertVec.run(item.id, new Float32Array(item.vec));
  }
});
```

### Updating embeddings

```sql
-- vec0 does not support UPDATE. Delete + re-insert instead.
DELETE FROM vec_posts WHERE post_id = ?;
INSERT INTO vec_posts(post_id, embedding) VALUES (?, ?);
```

---

## 4. KNN Vector Search Query

### Basic nearest-neighbor search

```sql
SELECT
  post_id,
  distance
FROM vec_posts
WHERE embedding MATCH ?
ORDER BY distance
LIMIT ?;
```

**Binding the query vector in TypeScript:**

```typescript
const queryEmbedding = await embed("search query text");
const queryBuffer = new Float32Array(queryEmbedding);

const results = db.prepare(`
  SELECT
    post_id,
    distance
  FROM vec_posts
  WHERE embedding MATCH ?
  ORDER BY distance
  LIMIT ?
`).all(queryBuffer, 20);

// results: Array<{ post_id: number; distance: number }>
// distance is L2 (Euclidean) distance by default
// Lower distance = more similar
```

**Distance metrics:**
- Default: L2 (Euclidean) distance
- For cosine similarity: normalize embeddings before insert (bge-small-en-v1.5 with `normalize: true` does this), then L2 distance approximates cosine distance

---

## 5. Hybrid Search: FTS5 + vec0 with Reciprocal Rank Fusion

### The RRF Formula

```
score(doc) = weight_fts * (1 / (k + rank_fts)) + weight_vec * (1 / (k + rank_vec))
```

Where:
- `k` = smoothing constant (typically 60, controls top-rank emphasis)
- `rank_fts` = document's rank position in FTS5 results (1-based)
- `rank_vec` = document's rank position in vec0 results (1-based)
- `weight_fts` and `weight_vec` = tunable weights (start with 1.0 each)

**Why RRF over score addition:** BM25 returns negative relevance scores, cosine distance returns 0-2. These scales are incomparable. RRF uses only rank positions, making it scale-independent.

### Complete hybrid search SQL

```sql
WITH vec_matches AS (
  SELECT
    post_id,
    row_number() OVER (ORDER BY distance) AS rank_number,
    distance
  FROM vec_posts
  WHERE embedding MATCH ?
  ORDER BY distance
  LIMIT ?
),
fts_matches AS (
  SELECT
    rowid AS post_id,
    row_number() OVER (ORDER BY rank) AS rank_number,
    rank AS fts_score
  FROM fts_posts
  WHERE fts_posts MATCH ?
  LIMIT ?
),
final AS (
  SELECT
    COALESCE(fts_matches.post_id, vec_matches.post_id) AS post_id,
    COALESCE(1.0 / (? + fts_matches.rank_number), 0.0) * ? +
    COALESCE(1.0 / (? + vec_matches.rank_number), 0.0) * ? AS combined_score,
    fts_matches.rank_number AS fts_rank,
    vec_matches.rank_number AS vec_rank,
    vec_matches.distance,
    fts_matches.fts_score
  FROM fts_matches
  FULL OUTER JOIN vec_matches ON vec_matches.post_id = fts_matches.post_id
  ORDER BY combined_score DESC
)
SELECT * FROM final;
```

**Parameter binding order:**

```typescript
function hybridSearch(
  db: Database.Database,
  query: string,
  queryEmbedding: number[],
  limit: number = 20,
  rrfK: number = 60,
  weightFts: number = 1.0,
  weightVec: number = 1.0,
): HybridResult[] {
  const stmt = db.prepare(`
    WITH vec_matches AS (
      SELECT
        post_id,
        row_number() OVER (ORDER BY distance) AS rank_number,
        distance
      FROM vec_posts
      WHERE embedding MATCH ?1
      ORDER BY distance
      LIMIT ?2
    ),
    fts_matches AS (
      SELECT
        rowid AS post_id,
        row_number() OVER (ORDER BY rank) AS rank_number,
        rank AS fts_score
      FROM fts_posts
      WHERE fts_posts MATCH ?3
      LIMIT ?2
    ),
    final AS (
      SELECT
        COALESCE(fts_matches.post_id, vec_matches.post_id) AS post_id,
        COALESCE(1.0 / (?4 + fts_matches.rank_number), 0.0) * ?5 +
        COALESCE(1.0 / (?4 + vec_matches.rank_number), 0.0) * ?6 AS combined_score,
        fts_matches.rank_number AS fts_rank,
        vec_matches.rank_number AS vec_rank,
        vec_matches.distance
      FROM fts_matches
      FULL OUTER JOIN vec_matches ON vec_matches.post_id = fts_matches.post_id
      ORDER BY combined_score DESC
    )
    SELECT * FROM final
  `);

  return stmt.all(
    new Float32Array(queryEmbedding),  // ?1: query vector
    limit,                              // ?2: result limit
    query,                              // ?3: FTS5 query string
    rrfK,                               // ?4: RRF smoothing constant
    weightFts,                          // ?5: FTS weight
    weightVec,                          // ?6: vector weight
  ) as HybridResult[];
}

interface HybridResult {
  post_id: number;
  combined_score: number;
  fts_rank: number | null;
  vec_rank: number | null;
  distance: number | null;
}
```

**FULL OUTER JOIN compatibility:** SQLite 3.39.0+ supports FULL OUTER JOIN. Node 22.22.1 ships SQLite 3.51.2 -- confirmed compatible. better-sqlite3 bundles its own SQLite (typically 3.45+) -- also compatible.

---

## 6. Architecture Integration Notes

### Embedding pipeline for colony posts

```
Post ingested -> Extract text (50-500 chars) -> Embed via pipeline -> Store in vec_posts
```

- Embed on ingest (not on query) for fast search
- Re-embed only if post content changes (rare for colony posts)
- Queue embeddings in batches of 10-50 for throughput

### Storage estimates

| Posts | Vec Storage | FTS Storage | Total Overhead |
|-------|------------|-------------|----------------|
| 10K | ~15MB | ~5MB | ~20MB |
| 100K | ~150MB | ~50MB | ~200MB |
| 188K (current) | ~280MB | ~90MB | ~370MB |

Each 384-dim float32 vector = 1,536 bytes. With vec0 overhead: ~1.6KB per row.

### Performance budget

| Operation | Target | Expected |
|-----------|--------|----------|
| Embed single text | <50ms | ~20ms (warm, q8) |
| KNN search (20 results) | <10ms | ~5ms |
| Hybrid FTS5+vec0 search | <20ms | ~10-15ms |
| Batch embed 50 posts | <2s | ~1s |

---

## Sources

- [Xenova/bge-small-en-v1.5 on HuggingFace](https://huggingface.co/Xenova/bge-small-en-v1.5)
- [Transformers.js v3 release](https://huggingface.co/blog/transformersjs-v3)
- [sqlite-vec GitHub](https://github.com/asg017/sqlite-vec)
- [sqlite-vec JS usage](https://alexgarcia.xyz/sqlite-vec/js.html)
- [Hybrid search with sqlite-vec (Alex Garcia)](https://alexgarcia.xyz/blog/2024/sqlite-vec-hybrid-search/index.html)
- [fastembed-js (archived)](https://github.com/Anush008/fastembed-js)
- [Node.js 22 sqlite docs](https://nodejs.org/docs/latest-v22.x/api/sqlite.html)
- [MTEB embedding model comparison](https://app.ailog.fr/en/blog/guides/choosing-embedding-models)
