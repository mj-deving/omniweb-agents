import { describe, it, expect } from "vitest";
import { matchByTxHash, fuzzyMatchByTimestamp, type QualityEntry, type SessionLogEntry } from "../scripts/backfill-quality-actuals.js";

describe("backfill-quality-actuals", () => {
  describe("matchByTxHash", () => {
    it("matches quality entry to session log by txHash", () => {
      const qualityEntries: QualityEntry[] = [
        {
          timestamp: "2026-03-25T10:00:00Z",
          agent: "sentinel",
          topic: "btc price",
          category: "ANALYSIS",
          quality_score: 5,
          quality_max: 7,
          quality_breakdown: {},
          predicted_reactions: 10,
          confidence: 80,
          text_length: 400,
          isReply: false,
          hasAttestation: true,
          txHash: "0xabc123",
        },
      ];

      const sessionLogs: SessionLogEntry[] = [
        {
          timestamp: "2026-03-25T10:01:00Z",
          txHash: "0xabc123",
          category: "ANALYSIS",
          topic: "btc price",
          actual_reactions: 12,
        },
      ];

      const results = matchByTxHash(qualityEntries, sessionLogs);
      expect(results).toHaveLength(1);
      expect(results[0].actual_reactions).toBe(12);
      expect(results[0].txHash).toBe("0xabc123");
    });

    it("leaves unmatched entries unchanged", () => {
      const qualityEntries: QualityEntry[] = [
        {
          timestamp: "2026-03-25T10:00:00Z",
          agent: "sentinel",
          topic: "btc price",
          category: "ANALYSIS",
          quality_score: 5,
          quality_max: 7,
          quality_breakdown: {},
          predicted_reactions: 10,
          confidence: 80,
          text_length: 400,
          isReply: false,
          hasAttestation: true,
          txHash: "0xabc123",
        },
      ];

      const sessionLogs: SessionLogEntry[] = [
        {
          timestamp: "2026-03-25T10:01:00Z",
          txHash: "0xDIFFERENT",
          category: "ANALYSIS",
          topic: "eth price",
          actual_reactions: 5,
        },
      ];

      const results = matchByTxHash(qualityEntries, sessionLogs);
      expect(results).toHaveLength(1);
      expect(results[0].actual_reactions).toBeUndefined();
    });
  });

  describe("fuzzyMatchByTimestamp", () => {
    it("matches entries within 60 second window by agent + topic", () => {
      const qualityEntries: QualityEntry[] = [
        {
          timestamp: "2026-03-25T10:00:00Z",
          agent: "sentinel",
          topic: "btc price",
          category: "ANALYSIS",
          quality_score: 5,
          quality_max: 7,
          quality_breakdown: {},
          predicted_reactions: 10,
          confidence: 80,
          text_length: 400,
          isReply: false,
          hasAttestation: true,
          // No txHash — old entry
        },
      ];

      const sessionLogs: SessionLogEntry[] = [
        {
          timestamp: "2026-03-25T10:00:45Z", // 45s later
          txHash: "0xmatched",
          category: "ANALYSIS",
          topic: "btc price",
          actual_reactions: 8,
        },
      ];

      const results = fuzzyMatchByTimestamp(qualityEntries, sessionLogs);
      expect(results).toHaveLength(1);
      expect(results[0].actual_reactions).toBe(8);
      expect(results[0].txHash).toBe("0xmatched");
    });

    it("does not match entries outside 60 second window", () => {
      const qualityEntries: QualityEntry[] = [
        {
          timestamp: "2026-03-25T10:00:00Z",
          agent: "sentinel",
          topic: "btc price",
          category: "ANALYSIS",
          quality_score: 5,
          quality_max: 7,
          quality_breakdown: {},
          predicted_reactions: 10,
          confidence: 80,
          text_length: 400,
          isReply: false,
          hasAttestation: true,
        },
      ];

      const sessionLogs: SessionLogEntry[] = [
        {
          timestamp: "2026-03-25T10:05:00Z", // 5 minutes later
          txHash: "0xtooFar",
          category: "ANALYSIS",
          topic: "btc price",
          actual_reactions: 8,
        },
      ];

      const results = fuzzyMatchByTimestamp(qualityEntries, sessionLogs);
      expect(results).toHaveLength(1);
      expect(results[0].actual_reactions).toBeUndefined();
    });

    it("does not match entries with different topics", () => {
      const qualityEntries: QualityEntry[] = [
        {
          timestamp: "2026-03-25T10:00:00Z",
          agent: "sentinel",
          topic: "btc price",
          category: "ANALYSIS",
          quality_score: 5,
          quality_max: 7,
          quality_breakdown: {},
          predicted_reactions: 10,
          confidence: 80,
          text_length: 400,
          isReply: false,
          hasAttestation: true,
        },
      ];

      const sessionLogs: SessionLogEntry[] = [
        {
          timestamp: "2026-03-25T10:00:30Z",
          txHash: "0xwrongTopic",
          category: "ANALYSIS",
          topic: "eth price",
          actual_reactions: 8,
        },
      ];

      const results = fuzzyMatchByTimestamp(qualityEntries, sessionLogs);
      expect(results).toHaveLength(1);
      expect(results[0].actual_reactions).toBeUndefined();
    });
  });
});
