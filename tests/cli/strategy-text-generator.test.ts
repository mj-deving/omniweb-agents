import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/actions/llm.js", () => ({
  generatePost: vi.fn(),
}));

import { createStrategyTextGenerator } from "../../cli/strategy-text-generator.js";
import { generatePost, type LLMConfig } from "../../src/actions/llm.js";
import type { LLMProvider } from "../../src/lib/llm/llm-provider.js";
import type { StrategyAction } from "../../src/toolkit/strategy/types.js";

function makeAction(overrides: Partial<StrategyAction> = {}): StrategyAction {
  return {
    type: "REPLY",
    priority: 100,
    reason: "Test reason",
    ...overrides,
  };
}

function createProvider(): LLMProvider {
  return {
    name: "test-provider",
    complete: vi.fn(),
  };
}

const llmConfig: LLMConfig = {
  personaMdPath: "/tmp/persona.md",
  strategyYamlPath: "/tmp/strategy.yaml",
  agentName: "sentinel",
};

describe("createStrategyTextGenerator", () => {
  beforeEach(() => {
    vi.mocked(generatePost).mockReset();
    vi.mocked(generatePost).mockResolvedValue({
      text: "generated text",
      category: "analysis",
      tags: [],
      confidence: 80,
      hypothesis: "test",
      predicted_reactions: 3,
    });
  });

  it("maps REPLY actions into GeneratePostInput with reply metadata", async () => {
    const provider = createProvider();
    const action = makeAction({
      type: "REPLY",
      target: "0xparent",
      reason: "Addressing the original claim",
      metadata: {
        author: "alice",
        topics: ["defi", "governance"],
      },
    });

    const generateText = createStrategyTextGenerator(provider, llmConfig);
    const text = await generateText(action);

    expect(text).toBe("generated text");
    expect(generatePost).toHaveBeenCalledWith(
      {
        topic: "defi",
        category: "discussion",
        scanContext: {
          activity_level: "moderate",
          posts_per_hour: 0,
          gaps: ["defi", "governance"],
        },
        calibrationOffset: 0,
        replyTo: {
          txHash: "0xparent",
          author: "alice",
          text: "Addressing the original claim",
        },
      },
      provider,
      llmConfig,
    );
  });

  it("maps PUBLISH actions into GeneratePostInput without reply metadata", async () => {
    const provider = createProvider();
    const action = makeAction({
      type: "PUBLISH",
      target: "liquidity outlook",
      metadata: {
        topics: ["defi"],
      },
    });

    const generateText = createStrategyTextGenerator(provider, llmConfig);
    await generateText(action);

    expect(generatePost).toHaveBeenCalledWith(
      {
        topic: "liquidity outlook",
        category: "analysis",
        scanContext: {
          activity_level: "moderate",
          posts_per_hour: 0,
          gaps: ["defi"],
        },
        calibrationOffset: 0,
      },
      provider,
      llmConfig,
    );
  });

  it("maps evidence into attestedData", async () => {
    const provider = createProvider();
    const action = makeAction({
      type: "PUBLISH",
      evidence: ["coingecko-defi"],
      reason: "TVL moved 7% day-over-day",
    });

    const generateText = createStrategyTextGenerator(provider, llmConfig);
    await generateText(action);

    expect(generatePost).toHaveBeenCalledWith(
      expect.objectContaining({
        attestedData: {
          source: "coingecko-defi",
          url: "",
          summary: "TVL moved 7% day-over-day",
        },
      }),
      provider,
      llmConfig,
    );
  });

  it("uses sensible defaults when metadata is missing", async () => {
    const provider = createProvider();
    const replyAction = makeAction({
      type: "REPLY",
      target: "0xparent",
      metadata: undefined,
    });
    const publishAction = makeAction({
      type: "PUBLISH",
      target: undefined,
      metadata: undefined,
    });

    const generateText = createStrategyTextGenerator(provider, llmConfig);
    await generateText(replyAction);
    await generateText(publishAction);

    expect(generatePost).toHaveBeenNthCalledWith(
      1,
      {
        topic: "discussion",
        category: "discussion",
        scanContext: {
          activity_level: "moderate",
          posts_per_hour: 0,
          gaps: [],
        },
        calibrationOffset: 0,
        replyTo: {
          txHash: "0xparent",
          author: "unknown",
          text: "Test reason",
        },
      },
      provider,
      llmConfig,
    );
    expect(generatePost).toHaveBeenNthCalledWith(
      2,
      {
        topic: "analysis",
        category: "analysis",
        scanContext: {
          activity_level: "moderate",
          posts_per_hour: 0,
          gaps: [],
        },
        calibrationOffset: 0,
      },
      provider,
      llmConfig,
    );
  });

  it("propagates LLM failures with context", async () => {
    const provider = createProvider();
    const action = makeAction({ type: "PUBLISH" });
    vi.mocked(generatePost).mockRejectedValue(new Error("LLM unavailable"));

    const generateText = createStrategyTextGenerator(provider, llmConfig);

    await expect(generateText(action)).rejects.toThrow(
      "Failed to generate text for PUBLISH action: LLM unavailable",
    );
  });
});
