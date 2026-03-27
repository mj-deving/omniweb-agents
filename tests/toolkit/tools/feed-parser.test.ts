import { describe, it, expect } from "vitest";
import { parseFeedPosts } from "../../../src/toolkit/tools/feed-parser.js";

describe("parseFeedPosts", () => {
  const fullPost = {
    txHash: "abc123",
    sender: "demos1sender",
    timestamp: 1700000000000,
    payload: {
      text: "Hello world",
      cat: "ANALYSIS",
      tags: ["crypto", "btc"],
    },
    reactions: { agree: 5, disagree: 2 },
  };

  it("parses { posts: [...] } shape", () => {
    const result = parseFeedPosts({ posts: [fullPost] });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      txHash: "abc123",
      text: "Hello world",
      category: "ANALYSIS",
      author: "demos1sender",
      timestamp: 1700000000000,
      reactions: { agree: 5, disagree: 2 },
      tags: ["crypto", "btc"],
    });
  });

  it("parses { results: [...] } shape", () => {
    const result = parseFeedPosts({ results: [fullPost] });
    expect(result).toHaveLength(1);
    expect(result[0].txHash).toBe("abc123");
  });

  it("parses { items: [...] } shape", () => {
    const result = parseFeedPosts({ items: [fullPost] });
    expect(result).toHaveLength(1);
    expect(result[0].txHash).toBe("abc123");
  });

  it("parses { data: [...] } shape", () => {
    const result = parseFeedPosts({ data: [fullPost] });
    expect(result).toHaveLength(1);
    expect(result[0].txHash).toBe("abc123");
  });

  it("parses raw array shape", () => {
    const result = parseFeedPosts([fullPost]);
    expect(result).toHaveLength(1);
    expect(result[0].txHash).toBe("abc123");
  });

  it("returns empty array for non-array data", () => {
    expect(parseFeedPosts({ message: "not found" })).toEqual([]);
    expect(parseFeedPosts(null)).toEqual([]);
    expect(parseFeedPosts(undefined)).toEqual([]);
    expect(parseFeedPosts("string")).toEqual([]);
  });

  it("falls back to post-level fields when no payload wrapper", () => {
    const flat = {
      txHash: "flat1",
      text: "Flat post",
      category: "QUESTION",
      author: "demos1flat",
      timestamp: 1700000000000,
      reactions: { agree: 1, disagree: 0 },
    };
    const result = parseFeedPosts({ posts: [flat] });
    expect(result[0].text).toBe("Flat post");
    expect(result[0].category).toBe("QUESTION");
    expect(result[0].author).toBe("demos1flat");
  });

  it("prefers sender over author field", () => {
    const post = { ...fullPost, sender: "preferred", author: "fallback" };
    const result = parseFeedPosts({ posts: [post] });
    expect(result[0].author).toBe("preferred");
  });

  it("prefers payload.cat over payload.category", () => {
    const post = {
      ...fullPost,
      payload: { text: "test", cat: "ANALYSIS", category: "OTHER" },
    };
    const result = parseFeedPosts({ posts: [post] });
    expect(result[0].category).toBe("ANALYSIS");
  });

  it("handles missing reactions gracefully", () => {
    const post = { txHash: "noreact", payload: { text: "hi" } };
    const result = parseFeedPosts({ posts: [post] });
    expect(result[0].reactions).toEqual({ agree: 0, disagree: 0 });
  });

  it("handles missing tags gracefully", () => {
    const post = { txHash: "notags", payload: { text: "hi" } };
    const result = parseFeedPosts({ posts: [post] });
    expect(result[0].tags).toEqual([]);
  });

  it("coerces tag values to strings", () => {
    const post = {
      txHash: "tagtypes",
      payload: { text: "hi", tags: [1, true, "normal"] },
    };
    const result = parseFeedPosts({ posts: [post] });
    expect(result[0].tags).toEqual(["1", "true", "normal"]);
  });

  it("priority order: posts > results > items > data > raw", () => {
    // When 'posts' key exists, it wins even if other keys are present
    const data = {
      posts: [{ txHash: "from-posts" }],
      results: [{ txHash: "from-results" }],
    };
    const result = parseFeedPosts(data);
    expect(result[0].txHash).toBe("from-posts");
  });
});
