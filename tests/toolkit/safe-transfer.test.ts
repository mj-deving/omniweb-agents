import { describe, expect, it, vi } from "vitest";

import { safeTransfer } from "../../src/toolkit/safe-transfer.js";

describe("safeTransfer", () => {
  it("rejects an empty recipient allow-list", async () => {
    await expect(safeTransfer({
      recipient: "0xpool",
      amount: 5,
      memo: "",
      recipientAllowlist: [],
      execute: vi.fn(),
    })).rejects.toThrow("allow-list");
  });

  it("rejects recipients outside the allow-list", async () => {
    await expect(safeTransfer({
      recipient: "0xwrong",
      amount: 5,
      memo: "",
      recipientAllowlist: ["0xpool"],
      execute: vi.fn(),
    })).rejects.toThrow("not on the allow-list");
  });

  it("rejects LLM-sourced recipients and memos", async () => {
    await expect(safeTransfer({
      recipient: "0xpool",
      amount: 5,
      memo: "",
      recipientAllowlist: ["0xpool"],
      recipientSource: "llm",
      execute: vi.fn(),
    })).rejects.toThrow("LLM-sourced recipients");

    await expect(safeTransfer({
      recipient: "0xpool",
      amount: 5,
      memo: "HIVE_BET:BTC:70000:30m",
      recipientAllowlist: ["0xpool"],
      memoSource: "llm",
      execute: vi.fn(),
    })).rejects.toThrow("LLM-sourced memos");
  });

  it("delegates exact allow-listed transfers", async () => {
    const execute = vi.fn().mockResolvedValue({
      txHash: "0xtx",
      memoEncoded: false,
      transferShape: "wallet-native-transfer",
    });

    const result = await safeTransfer({
      recipient: "0xpool",
      amount: 5,
      memo: "",
      recipientAllowlist: ["0xpool"],
      recipientSource: "api",
      execute,
    });

    expect(execute).toHaveBeenCalledWith("0xpool", 5, "");
    expect(result.txHash).toBe("0xtx");
  });
});
